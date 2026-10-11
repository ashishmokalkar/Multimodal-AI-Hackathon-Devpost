"""TabPFN through the same pipeline as every other model (phases 1-5), for a like-for-like comparison.

Run:  python -m ml.run_tabpfn [--stages 1 2 3 4 5 6] [--targets cad lad] [--n-jobs 6 --threads 3] [--trials 20]

T1 (P1) untuned on raw F0, all 10 repeats; vs the P1 baselines (LR / RF / XGB) on the same folds.
T2 (P2) F0 vs F1 vs F2[target] on r5-r9. F2 is the per-target set chosen in phase 2, as for every model.
T3 (P3) default -> Optuna TPE on r0-r2 -> tuned on r5-r9 (kept only if not worse) -> 5-seed bag (kept if better);
        leaderboard rank among the phase-3 models.
T4 (P4) vessels: S1 hierarchical / S2 CAD-stacked / S3 stacked binary relevance, with the same P(CAD) lookup and
        upstream models as phase 4. Single seed, compared with the single-seed TabPFN S0 to isolate the strategy.
T5 (P5) UCI: E1 transfer feature; E2 pooled training (weight chosen on r0-r4; TabPFN subsamples UCI rows by weight).
T6 (preview of P7) OOF correlation with the best phase-3 model, and fixed equal-weight blends (no weights are fitted,
        so nothing is selected on the scored folds).
Every comparison is paired on identical folds with the corrected-SE rule. Outputs: reports/tabpfn/.
Runs resume from the OOF store (data/processed/oof); --force recomputes.
"""

from __future__ import annotations

import argparse
import json
import os
import time

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from ml.cv import OOF_DIR, CVResult, load_folds, run_cv
from ml.data import FEATURES, ROOT, TARGETS, VESSELS, load_clean
from ml.evaluate import bootstrap_ci, paired_compare
from ml.external import load_uci, shared_view
from ml.features import build
from ml.models import REGISTRY, make
from ml.run_external import EXTRAS, TRANSFER, WEIGHTS, ext_models
from ml.run_models import tune
from ml.strategies import Hierarchical, Pooled, Stacked, Upstream, logit, oof_lookup, split_key

OUT = ROOT / "reports" / "tabpfn"
P3 = ROOT / "reports" / "phase3"
F2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"]
SCREEN, TUNE, EVAL = [f"r{i}" for i in range(5)], [f"r{i}" for i in range(3)], [f"r{i}" for i in range(5, 10)]
P1_BASELINES = ["logreg", "random_forest", "xgboost"]


class Runner:
    def __init__(self, args):
        self.args = args
        self.df = load_clean()
        self.folds = load_folds(self.df)
        self.y = {t: self.df[t].values for t in TARGETS}
        self.X2 = {t: build(self.df, **F2[t]) for t in TARGETS}
        self.boards = {t: pd.read_csv(P3 / t / "leaderboard.csv") for t in TARGETS}
        self.state_path = OUT / "state.json"
        self.state = json.loads(self.state_path.read_text()) if self.state_path.exists() else {}

    def save_state(self):
        self.state_path.write_text(json.dumps(self.state, indent=2, default=float))

    def cv(self, model, X, t, name, folds, n_jobs=None, **meta) -> CVResult:
        if not self.args.force and (OOF_DIR / t / f"{name}.npz").exists():
            return CVResult.load(t, name)
        t0 = time.time()
        res = run_cv(model, X, self.y[t], folds=folds, name=name, target=t, n_jobs=n_jobs or self.args.n_jobs,
                     algo="tabpfn", **meta)
        print(f"  [{t}] {name}: auc {res.summary['auc_mean']:.4f} ({time.time() - t0:.0f}s)", flush=True)
        return res

    def best_s0(self, t) -> CVResult:
        return CVResult.load(t, self.boards[t].iloc[0].run)

    def tabpfn_best(self, t) -> tuple[CVResult, dict, int]:
        """Best TabPFN configuration from T3: (result, params, n_seeds)."""
        s = self.state["t3"][t]
        return CVResult.load(t, s["run"]), s["params"], s["n_seeds"]


def last5(res: CVResult) -> CVResult:
    """Restrict a 10-repeat result to repeats r5-r9, renumbered 0-4 like runs scored on folds[EVAL]."""
    fm = res.fold_metrics[res.fold_metrics.repeat >= 5].assign(repeat=lambda d: d.repeat - 5).reset_index(drop=True)
    return CVResult(res.name, res.target, res.oof[5:], fm, res.y)


def cmp(a: CVResult, b: CVResult, prefix: str) -> dict:
    c = paired_compare(a.fold_metrics, b.fold_metrics)
    return {f"{prefix}": c["diff_mean"], f"{prefix}_se": c["diff_se"], f"{prefix}_keep": c["keep"]}


# ------------------------------------------------------------------------------------------- T1 (phase 1)
def t1(R: Runner):
    print("\n=== T1 untuned TabPFN on raw F0, all 10 repeats (vs P1 baselines)", flush=True)
    rows = []
    for t in R.args.targets:
        res = R.cv(make("tabpfn"), R.df[FEATURES], t, "tp1_tabpfn_F0", R.folds, feature_set="F0", strategy="S0")
        row = {"target": t, "auc_tabpfn": res.summary["auc_mean"], "acc_tabpfn": res.summary["accuracy_mean"]}
        base = {m: CVResult.load(t, f"baseline_{m}_F0") for m in P1_BASELINES}
        for m, b in base.items():
            row[f"auc_{m}"] = b.summary["auc_mean"]
        best = max(base, key=lambda m: base[m].summary["auc_mean"])
        rows.append({**row, "best_baseline": best, **cmp(base[best], res, "tabpfn_vs_best")})
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t1_baseline.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T2 (phase 2)
def t2(R: Runner):
    print("\n=== T2 feature sets F0 / F1 / F2 on r5-r9", flush=True)
    rows = []
    for t in R.args.targets:
        res = {"F0": last5(CVResult.load(t, "tp1_tabpfn_F0")),
               "F1": R.cv(make("tabpfn"), build(R.df), t, "tp2_tabpfn_F1", R.folds[EVAL], feature_set="F1",
                          strategy="S0", repeats="r5-r9"),
               "F2": R.cv(make("tabpfn"), R.X2[t], t, "tp2_tabpfn_F2", R.folds[EVAL], feature_set="F2", strategy="S0",
                          repeats="r5-r9", f2=F2[t])}
        row = {"target": t, **{f"auc_{k}": v.summary["auc_mean"] for k, v in res.items()},
               **cmp(res["F0"], res["F2"], "F2_vs_F0"), **cmp(res["F1"], res["F2"], "F2_vs_F1")}
        # Same comparison for the phase-2 reference models, for context
        for m in P1_BASELINES:
            a, b = CVResult.load(t, f"p2_{m}_F0"), CVResult.load(t, f"p2_{m}_F2")
            row[f"{m}_F2_vs_F0"] = b.summary["auc_mean"] - a.summary["auc_mean"]
        rows.append(row)
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t2_features.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T3 (phase 3)
def t3(R: Runner):
    print("\n=== T3 default -> tuned -> seed bag on F2 (tune r0-r2, score r5-r9)", flush=True)
    R.state.setdefault("t3", {})
    rows, boards = [], []
    for t in R.args.targets:
        X = R.X2[t]
        default = CVResult.load(t, "tp2_tabpfn_F2")
        tuning = R.state.setdefault("tuning", {}).get(t)
        if tuning is None or R.args.force:
            t0 = time.time()
            best, tune_auc = tune("tabpfn", X, R.y[t], R.folds[TUNE], R.args.trials, R.args.n_jobs)
            tuning = R.state["tuning"][t] = {"params": best, "auc_r0r2": tune_auc, "seconds": round(time.time() - t0)}
            R.save_state()
            print(f"  [{t}] tuned params {best} (r0-r2 auc {tune_auc:.4f}, {tuning['seconds']}s)", flush=True)
        tuned = R.cv(make("tabpfn", tuning["params"]), X, t, "tp3_tabpfn_tuned", R.folds[EVAL], feature_set="F2",
                     strategy="S0", stage="tuned", repeats="r5-r9", params=tuning["params"])
        c = paired_compare(default.fold_metrics, tuned.fold_metrics)
        params, chosen = (tuning["params"], tuned) if c["diff_mean"] >= 0 else (REGISTRY["tabpfn"].defaults, default)
        bag = R.cv(make("tabpfn", params, n_seeds=5), X, t, "tp3_tabpfn_seedbag5", R.folds[EVAL], feature_set="F2",
                   strategy="S0", stage="seedbag5", repeats="r5-r9", params=params)
        cb = paired_compare(chosen.fold_metrics, bag.fold_metrics)
        final, n_seeds = (bag, 5) if cb["diff_mean"] > 0 else (chosen, 1)
        R.state["t3"][t] = {"run": final.name, "params": params, "n_seeds": n_seeds, "single_seed_run": chosen.name}
        R.save_state()

        best = R.best_s0(t)
        rows.append({"target": t, "auc_default": default.summary["auc_mean"], "auc_tune_r0r2": tuning["auc_r0r2"],
                     "auc_tuned": tuned.summary["auc_mean"], "tuned_vs_default": c["diff_mean"],
                     "tuned_vs_default_se": c["diff_se"], "auc_seedbag5": bag.summary["auc_mean"],
                     "seedbag_vs_single": cb["diff_mean"], "final_run": final.name, "auc_final": final.summary["auc_mean"],
                     "best_phase3": R.boards[t].iloc[0].model, "auc_best_phase3": best.summary["auc_mean"],
                     **cmp(best, final, "tabpfn_vs_best_phase3")})
        # Leaderboard: phase-3 board + TabPFN, same columns
        s, ci = final.summary, bootstrap_ci(final.y, final.oof, n_boot=1000)
        row = {"model": "tabpfn", "run": final.name, "auc": s["auc_mean"], "auc_pooled": ci.loc["auc", "estimate"],
               "unstable": s["auc_mean"] - ci.loc["auc", "estimate"] > 0.03, "auc_ci_low": ci.loc["auc", "ci_low"],
               "auc_ci_high": ci.loc["auc", "ci_high"], "accuracy": s["accuracy_mean"],
               "balanced_acc": s["balanced_acc_mean"], "f1": s["f1_mean"], "brier": s["brier_mean"], "ece": s["ece"]}
        board = pd.concat([R.boards[t], pd.DataFrame([row])]).sort_values("auc", ascending=False).reset_index(drop=True)
        board.insert(0, "rank", np.arange(1, len(board) + 1))
        board.to_csv(OUT / f"t3_leaderboard_{t}.csv", index=False, float_format="%.4f")
        boards.append({"target": t, "tabpfn_rank": int(board.loc[board.model == "tabpfn", "rank"].iloc[0]),
                       "n_models": len(board)})
        print(f"  [{t}] leaderboard\n{board.head(6).round(4).to_string(index=False)}", flush=True)
    out = pd.DataFrame(rows).merge(pd.DataFrame(boards), on="target")
    out.to_csv(OUT / "t3_models.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T4 (phase 4)
def t4(R: Runner):
    print("\n=== T4 multi-label strategies for the vessels (single-seed TabPFN)", flush=True)
    folds = R.folds[EVAL]
    diseased = R.df[VESSELS].max(axis=1).values
    cad_lookup = oof_lookup(folds, R.best_s0("cad").oof)
    upstream = {t: Upstream(t, make("logreg", json.loads((P3 / t / "best_params.json").read_text())["logreg"]),
                            R.X2[t], R.y[t]) for t in TARGETS}
    rows = []
    for v in [t for t in R.args.targets if t in VESSELS]:
        s = R.state["t3"][v]
        own = CVResult.load(v, s["single_seed_run"])
        model = make("tabpfn", s["params"])
        strategies = {"S1": Hierarchical(model, diseased, cad_lookup=cad_lookup),
                      "S2": Stacked(model, [upstream["cad"]]),
                      "S3": Stacked(model, [upstream[t] for t in TARGETS if t != v])}
        for sname, fp in strategies.items():
            res = R.cv(fp, R.X2[v], v, f"tp4_tabpfn_{sname}", folds, feature_set="F2", strategy=sname, repeats="r5-r9")
            m = R.y["cad"] == 1
            loc = float(np.mean([roc_auc_score(res.y[m], row[m]) for row in res.oof]))
            rows.append({"vessel": v, "strategy": sname, "auc": res.summary["auc_mean"], "loc_auc": loc,
                         "brier": res.summary["brier_mean"], "ece": res.summary["ece"],
                         **cmp(own, res, "vs_tabpfn_S0"), **cmp(R.best_s0(v), res, "vs_best_S0")})
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t4_strategies.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T5 (phase 5)
def t5(R: Runner):
    print("\n=== T5 UCI external data (single-seed TabPFN)", flush=True)
    uci, za_shared = load_uci(), shared_view(R.df)
    rows = []
    for t in R.args.targets:
        ext = uci[uci[t].notna()]
        # Same transfer score as phase 5: the better of the UCI-only LR / LightGBM models
        best_auc, ext_score = -1, None
        for m in ext_models().values():
            p = m.fit(ext[TRANSFER], ext[t].values).predict_proba(za_shared[TRANSFER])[:, 1]
            if (a := roc_auc_score(R.y[t], p)) > best_auc:
                best_auc, ext_score = a, p
        s = R.state["t3"][t]
        own, model = CVResult.load(t, s["single_seed_run"]), make("tabpfn", s["params"])
        e1 = R.cv(model, R.X2[t].assign(ext_score=logit(ext_score)), t, "tp5_tabpfn_E1", R.folds[EVAL],
                  feature_set="F2+ext_score", strategy="E1", repeats="r5-r9")
        X_za = R.X2[t].join(za_shared[EXTRAS])
        X_ext = ext.reindex(columns=X_za.columns)
        key = f"t5_weight_{t}"
        if key not in R.state or R.args.force:
            screen = {w: run_cv(Pooled(model, X_ext, ext[t].values, w), X_za, R.y[t], folds=R.folds[SCREEN], name="screen",
                                target=t, n_jobs=R.args.n_jobs, save=False, log=False).fold_metrics.auc.mean()
                      for w in WEIGHTS}
            R.state[key] = {"screen": {str(w): a for w, a in screen.items()}, "weight": max(screen, key=screen.get)}
            R.save_state()
        w = R.state[key]["weight"]
        e2 = R.cv(Pooled(model, X_ext, ext[t].values, w), X_za, t, "tp5_tabpfn_E2", R.folds[EVAL],
                  feature_set="F2+shared", strategy="E2", repeats="r5-r9", uci_weight=w, n_uci=len(ext))
        for name, res in (("E1", e1), ("E2", e2)):
            rows.append({"target": t, "experiment": name, "weight": w if name == "E2" else np.nan,
                         "auc": res.summary["auc_mean"], "brier": res.summary["brier_mean"],
                         **cmp(own, res, "vs_tabpfn_S0"), **cmp(R.best_s0(t), res, "vs_best_S0")})
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t5_external.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


# ------------------------------------------------------------------------------------------- T6 (diversity)
def t6(R: Runner):
    print("\n=== T6 diversity and fixed equal-weight blends (r5-r9)", flush=True)
    folds = R.folds[EVAL]
    rows = []
    for t in R.args.targets:
        tab = R.tabpfn_best(t)[0]
        top = [CVResult.load(t, r) for r in R.boards[t].run.head(3)]
        corr = float(np.mean([np.corrcoef(a, b)[0, 1] for a, b in zip(tab.oof, top[0].oof)]))
        blends = {"best+tabpfn": [top[0], tab], "top3": top, "top3+tabpfn": top + [tab]}
        res = {}
        for name, members in blends.items():
            looks = [oof_lookup(folds, m.oof) for m in members]

            def fp(X_tr, y_tr, X_te, tr, te, looks=looks):
                return np.mean([lk[split_key(te)] for lk in looks], axis=0)

            res[name] = run_cv(fp, R.X2[t], R.y[t], folds=folds, name=f"tp6_blend_{name.replace('+', '_')}", target=t,
                               n_jobs=1, algo="blend", members=[m.name for m in members], repeats="r5-r9")
        rows.append({"target": t, "best_phase3": R.boards[t].iloc[0].model, "corr_tabpfn_best": corr,
                     "auc_best": top[0].summary["auc_mean"], "auc_tabpfn": tab.summary["auc_mean"],
                     **{f"auc_{k}": v.summary["auc_mean"] for k, v in res.items()},
                     **cmp(top[0], res["best+tabpfn"], "best+tabpfn_vs_best"),
                     **cmp(res["top3"], res["top3+tabpfn"], "adding_tabpfn_to_top3")})
    out = pd.DataFrame(rows)
    out.to_csv(OUT / "t6_blend.csv", index=False, float_format="%.4f")
    print(out.round(4).to_string(index=False), flush=True)


STAGES = {1: t1, 2: t2, 3: t3, 4: t4, 5: t5, 6: t6}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stages", nargs="*", type=int, default=list(STAGES))
    ap.add_argument("--targets", nargs="*", default=TARGETS, choices=TARGETS)
    ap.add_argument("--n-jobs", type=int, default=6, help="parallel folds (each TabPFN process holds ~1.6 GB)")
    ap.add_argument("--threads", type=int, default=3, help="torch threads per TabPFN process")
    ap.add_argument("--trials", type=int, default=20)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    os.environ["TABPFN_THREADS"] = str(args.threads)  # inherited by the joblib worker processes
    R = Runner(args)
    for s in args.stages:
        t0 = time.time()
        STAGES[s](R)
        print(f"--- T{s} done in {(time.time() - t0) / 60:.1f} min", flush=True)


if __name__ == "__main__":
    main()
