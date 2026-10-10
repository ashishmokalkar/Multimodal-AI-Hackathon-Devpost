"""TabPFN, the remaining levers (after ml.run_tabpfn): its own feature view, a wider search space, and a
post-hoc ensemble of TabPFN configurations (the AutoTabPFN idea, built on our folds).

Run:  python -m ml.run_tabpfn_extra [--stages 7 8 9 10] [--targets ...] [--n-jobs 6 --threads 3] [--trials 30]

T7  feature view, screened on r0-r4 with the T3-tuned params: F0 raw / F1 cleaned / F2 (phase 2) / Fall (F1 + all 12
    engineered candidates) / Fall + in-fold top-k selection (random-forest or L1-logistic importance, k = 10/20/30,
    fitted on each training fold only). A view replaces F2 only if it beats F2 by > 1 corrected SE on r0-r4;
    the choice is then confirmed on r5-r9.
T8  wider Optuna search on the chosen view (r0-r2, warm-started from the T3 params and the defaults): adds feature
    transforms (none / safepower / quantile / squashing / mixed), categorical encoding, explicit multi-level
    categoricals, feature/class shift, row subsampling. Scored on r5-r9.
T9  post-hoc ensemble: a portfolio of up to 8 configurations (top distinct T8 trials, the T3 config, defaults on raw
    F0 for diversity) scored on r0-r4; greedy ensemble selection (Caruana, with replacement) picks weights on r0-r4;
    the fixed-weight blend is scored on r5-r9.
T10 summary per target: every TabPFN variant vs the best phase-3 model, hierarchical S1 for the vessels with the
    T8 config, and an equal-weight blend of the T9 ensemble with the best phase-3 model.
Outputs: reports/tabpfn/t7_* ... t10_*; state in reports/tabpfn/state.json.
"""

from __future__ import annotations

import argparse
import json
import os
import time

import numpy as np
import optuna
import pandas as pd
from sklearn.metrics import roc_auc_score

from ml.cv import CVResult, run_cv
from ml.data import FEATURES, TARGETS, VESSELS
from ml.evaluate import paired_compare
from ml.features import CANDIDATES, build
from ml.models import REGISTRY, make
from ml.run_tabpfn import EVAL, OUT, SCREEN, TUNE, Runner, cmp
from ml.selection import TopKImportance, with_selector
from ml.strategies import Hierarchical, oof_lookup, split_key

optuna.logging.set_verbosity(optuna.logging.WARNING)
SELECTORS = [(m, k) for m in ("rf", "l1") for k in (10, 20, 30)]
VIEWS = ["F0", "F1", "F2", "Fall"] + [f"Fall_{m}{k}" for m, k in SELECTORS]
NEW_DEFAULTS = {"preprocess": None, "categorical_encoding": None, "explicit_categoricals": False,
                "feature_shift": "shuffle", "class_shift": "shuffle", "subsample_samples": None}


def wide_space(t) -> dict:
    return {**REGISTRY["tabpfn"].space(t),
            "preprocess": t.suggest_categorical("preprocess", [None, "safepower", "quantile", "squash", "mix"]),
            "categorical_encoding": t.suggest_categorical("categorical_encoding", [None, "onehot", "numeric"]),
            "explicit_categoricals": t.suggest_categorical("explicit_categoricals", [False, True]),
            "feature_shift": t.suggest_categorical("feature_shift", ["shuffle", "rotate", None]),
            "class_shift": t.suggest_categorical("class_shift", ["shuffle", "rotate"]),
            "subsample_samples": t.suggest_categorical("subsample_samples", [None, 0.8])}


def view(R: Runner, t: str, name: str) -> tuple[pd.DataFrame, object]:
    """Feature matrix and a function wrapping a model with the view's in-fold selector (if any)."""
    base, _, sel = name.partition("_")
    X = {"F0": lambda: R.df[FEATURES], "F1": lambda: build(R.df), "F2": lambda: R.X2[t],
         "Fall": lambda: build(R.df, add=list(CANDIDATES))}[base]()
    if not sel:
        return X, lambda m: m
    method, k = sel[:2], int(sel[2:])
    return X, lambda m: with_selector(TopKImportance(k, method), m)


def model_for(R: Runner, t: str, view_name: str, params: dict):
    X, wrap = view(R, t, view_name)
    return X, wrap(make("tabpfn", params))


# ------------------------------------------------------------------------------------------- T7 feature view
def t7(R: Runner):
    print("\n=== T7 TabPFN-specific feature view (screen r0-r4, confirm r5-r9)", flush=True)
    R.state.setdefault("t7", {})
    rows = []
    for t in R.args.targets:
        params = R.state["tuning"][t]["params"]
        res = {}
        for v in VIEWS:
            X, m = model_for(R, t, v, params)
            res[v] = R.cv(m, X, t, f"tp7_{v}_screen", R.folds[SCREEN], log=False, view=v, repeats="r0-r4")
        base = res["F2"]
        scored = {v: {"auc": r.summary["auc_mean"], **cmp(base, r, "vs_F2")} for v, r in res.items()}
        best = max(VIEWS, key=lambda v: scored[v]["auc"])
        chosen = best if best != "F2" and scored[best]["vs_F2_keep"] else "F2"
        for v in VIEWS:
            rows.append({"target": t, "view": v, "n_features": view(R, t, v)[0].shape[1], **scored[v],
                         "chosen": v == chosen})
        row = {"target": t, "chosen": chosen}
        if chosen != "F2":
            X, m = model_for(R, t, chosen, params)
            conf = R.cv(m, X, t, f"tp7_{chosen}_eval", R.folds[EVAL], feature_set=chosen, strategy="S0", repeats="r5-r9")
            row.update({"auc_eval": conf.summary["auc_mean"],
                        **cmp(CVResult.load(t, "tp3_tabpfn_tuned"), conf, "vs_F2_eval")})
        R.state["t7"][t] = row
        R.save_state()
        print(f"  [{t}] view chosen: {chosen} (best on r0-r4: {best} {scored[best]['auc']:.4f}, "
              f"F2 {scored['F2']['auc']:.4f})", flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t7_views.csv", index=False, float_format="%.4f")
    print(out.pivot(index="view", columns="target", values="auc").round(4).to_string(), flush=True)
    print(json.dumps({t: R.state["t7"][t] for t in R.args.targets}, indent=1, default=float), flush=True)


# ------------------------------------------------------------------------------------------- T8 wider tuning
def t8(R: Runner):
    print("\n=== T8 wider TabPFN search on the chosen view (tune r0-r2, score r5-r9)", flush=True)
    R.state.setdefault("t8", {})
    rows = []
    for t in R.args.targets:
        v = R.state["t7"][t]["chosen"]
        X, wrap = view(R, t, v)
        if t not in R.state["t8"] or R.args.force:
            t0 = time.time()

            def objective(trial):
                fm = run_cv(wrap(make("tabpfn", wide_space(trial))), X, R.y[t], folds=R.folds[TUNE], name="tune",
                            target="tune", save=False, log=False, n_jobs=R.args.n_jobs).fold_metrics
                return fm.auc.mean()

            study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=1))
            study.enqueue_trial({**R.state["tuning"][t]["params"], **NEW_DEFAULTS})   # the T3 optimum
            study.enqueue_trial({**REGISTRY["tabpfn"].defaults, **NEW_DEFAULTS})       # TabPFN defaults
            study.optimize(objective, n_trials=R.args.trials, catch=(Exception,))  # an invalid combination fails one trial
            trials = study.trials_dataframe(attrs=("number", "value", "params")).sort_values("value", ascending=False)
            trials.to_csv(OUT / f"t8_trials_{t}.csv", index=False, float_format="%.4f")
            top = []
            done = [tr for tr in study.trials if tr.state == optuna.trial.TrialState.COMPLETE]
            for tr in sorted(done, key=lambda tr: tr.value, reverse=True):
                p = wide_space(optuna.trial.FixedTrial(tr.params))
                if p not in [q["params"] for q in top]:
                    top.append({"params": p, "auc_r0r2": tr.value})
            R.state["t8"][t] = {"view": v, "top": top[:6], "seconds": round(time.time() - t0)}
            R.save_state()
        s = R.state["t8"][t]
        best = s["top"][0]
        tuned = R.cv(wrap(make("tabpfn", best["params"])), X, t, "tp8_tabpfn_tuned", R.folds[EVAL], feature_set=v,
                     strategy="S0", stage="tuned_wide", repeats="r5-r9", params=best["params"])
        rows.append({"target": t, "view": v, "auc_r0r2_T3": R.state["tuning"][t]["auc_r0r2"],
                     "auc_r0r2_T8": best["auc_r0r2"], "auc_eval": tuned.summary["auc_mean"],
                     **cmp(CVResult.load(t, "tp3_tabpfn_tuned"), tuned, "vs_T3"), **cmp(R.best_s0(t), tuned, "vs_best"),
                     "params": json.dumps(best["params"], default=str)})
        print(f"  [{t}] T8 best r0-r2 {best['auc_r0r2']:.4f} (T3 {R.state['tuning'][t]['auc_r0r2']:.4f}); "
              f"r5-r9 {tuned.summary['auc_mean']:.4f}; params {best['params']}", flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t8_tuning.csv", index=False, float_format="%.4f")
    print(out.drop(columns="params").round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T9 post-hoc ensemble
def ges(oofs: list[np.ndarray], y: np.ndarray, iters: int = 25) -> np.ndarray:
    """Greedy ensemble selection with replacement (Caruana 2004), maximising the mean per-repeat AUC."""
    def score(p):
        return np.mean([roc_auc_score(y, row) for row in p])

    counts, total = np.zeros(len(oofs)), np.zeros_like(oofs[0])
    for _ in range(iters):
        gains = [score((total + o) / (counts.sum() + 1)) for o in oofs]
        best = int(np.argmax(gains))
        counts[best] += 1
        total += oofs[best]
    return counts / counts.sum()


def t9(R: Runner):
    print("\n=== T9 post-hoc ensemble of TabPFN configurations (weights on r0-r4, scored on r5-r9)", flush=True)
    R.state.setdefault("t9", {})
    rows = []
    for t in R.args.targets:
        v = R.state["t8"][t]["view"]
        portfolio = [(v, c["params"]) for c in R.state["t8"][t]["top"]]
        portfolio += [("F2", {**R.state["tuning"][t]["params"], **NEW_DEFAULTS}),
                      ("F0", {**REGISTRY["tabpfn"].defaults, **NEW_DEFAULTS})]
        screen, names = [], []
        for i, (vi, p) in enumerate(portfolio):
            X, m = model_for(R, t, vi, p)
            screen.append(R.cv(m, X, t, f"tp9_c{i}_screen", R.folds[SCREEN], log=False, view=vi, params=p))
            names.append(f"c{i}:{vi}")
        y = R.y[t]
        w = ges([r.oof for r in screen], y)
        single = max(range(len(screen)), key=lambda i: screen[i].summary["auc_mean"])
        members = [i for i in range(len(portfolio)) if w[i] > 0]
        evals = {}
        for i in members:
            vi, p = portfolio[i]
            X, m = model_for(R, t, vi, p)
            evals[i] = R.cv(m, X, t, f"tp9_c{i}_eval", R.folds[EVAL], feature_set=vi, strategy="S0", repeats="r5-r9",
                            params=p)
        looks = {i: oof_lookup(R.folds[EVAL], evals[i].oof) for i in members}

        def blend(X_tr, y_tr, X_te, tr, te):
            return sum(w[i] * looks[i][split_key(te)] for i in members)

        ens = run_cv(blend, R.X2[t], y, folds=R.folds[EVAL], name="tp9_tabpfn_ges", target=t, n_jobs=1, algo="tabpfn",
                     strategy="S0", stage="posthoc_ensemble", repeats="r5-r9",
                     members={names[i]: round(float(w[i]), 3) for i in members})
        R.state["t9"][t] = {"weights": {names[i]: float(w[i]) for i in members},
                            "screen_auc": {names[i]: screen[i].summary["auc_mean"] for i in range(len(portfolio))}}
        R.save_state()
        rows.append({"target": t, "n_portfolio": len(portfolio), "n_members": len(members),
                     "best_single_r0r4": names[single], "auc_best_single_r0r4": screen[single].summary["auc_mean"],
                     "auc_ges_r5r9": ens.summary["auc_mean"], "ece_ges": ens.summary["ece"],
                     **cmp(CVResult.load(t, "tp3_tabpfn_tuned"), ens, "vs_T3"), **cmp(R.best_s0(t), ens, "vs_best"),
                     "weights": json.dumps(R.state["t9"][t]["weights"])})
        print(f"  [{t}] GES weights {R.state['t9'][t]['weights']} -> r5-r9 auc {ens.summary['auc_mean']:.4f}", flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t9_posthoc.csv", index=False, float_format="%.4f")
    print(out.drop(columns="weights").round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T10 summary
def t10(R: Runner):
    print("\n=== T10 every TabPFN variant vs the best phase-3 model (r5-r9)", flush=True)
    folds = R.folds[EVAL]
    diseased = R.df[VESSELS].max(axis=1).values
    cad_lookup = oof_lookup(folds, R.best_s0("cad").oof)
    rows = []
    for t in R.args.targets:
        best = R.best_s0(t)
        variants = {"T3 tuned (F2)": CVResult.load(t, "tp3_tabpfn_tuned"),
                    "T8 wide-tuned": CVResult.load(t, "tp8_tabpfn_tuned"),
                    "T9 post-hoc ensemble": CVResult.load(t, "tp9_tabpfn_ges")}
        if R.state["t7"][t]["chosen"] != "F2":
            variants["T7 view"] = CVResult.load(t, f"tp7_{R.state['t7'][t]['chosen']}_eval")
        if t in VESSELS:
            v = R.state["t8"][t]["view"]
            X, m = model_for(R, t, v, R.state["t8"][t]["top"][0]["params"])
            variants["T8 + S1 hierarchical"] = R.cv(Hierarchical(m, diseased, cad_lookup=cad_lookup), X, t,
                                                    "tp10_tabpfn_S1", folds, feature_set=v, strategy="S1",
                                                    repeats="r5-r9")
        ens_look, best_look = oof_lookup(folds, variants["T9 post-hoc ensemble"].oof), oof_lookup(folds, best.oof)

        def blend(X_tr, y_tr, X_te, tr, te):
            return (ens_look[split_key(te)] + best_look[split_key(te)]) / 2

        variants["T9 ensemble + best phase-3 (equal)"] = run_cv(blend, R.X2[t], R.y[t], folds=folds,
                                                                name="tp10_blend_best_ges", target=t, n_jobs=1,
                                                                algo="blend", repeats="r5-r9")
        for name, res in variants.items():
            c = paired_compare(best.fold_metrics, res.fold_metrics)
            rows.append({"target": t, "variant": name, "auc": res.summary["auc_mean"], "brier": res.summary["brier_mean"],
                         "ece": res.summary["ece"], "accuracy": res.summary["accuracy_mean"],
                         "best_phase3": R.boards[t].iloc[0].model, "auc_best_phase3": best.summary["auc_mean"],
                         "vs_best": c["diff_mean"], "vs_best_se": c["diff_se"], "beats_best": c["keep"],
                         "worse_than_best": c["diff_mean"] < -c["diff_se"]})
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t10_summary.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


STAGES = {7: t7, 8: t8, 9: t9, 10: t10}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stages", nargs="*", type=int, default=list(STAGES))
    ap.add_argument("--targets", nargs="*", default=TARGETS, choices=TARGETS)
    ap.add_argument("--n-jobs", type=int, default=6)
    ap.add_argument("--threads", type=int, default=3)
    ap.add_argument("--trials", type=int, default=30)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    os.environ["TABPFN_THREADS"] = str(args.threads)
    R = Runner(args)
    for s in args.stages:
        t0 = time.time()
        STAGES[s](R)
        print(f"--- T{s} done in {(time.time() - t0) / 60:.1f} min", flush=True)


if __name__ == "__main__":
    main()
