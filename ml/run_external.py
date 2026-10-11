"""Plan phase 5: external UCI Heart Disease data.

Run:  python -m ml.run_external [--n-jobs 25]

E0 transfer check: a model trained ONLY on UCI, scored on all 303 Z-Alizadeh patients
   (an honest external validation of how compatible the cohorts are).
E1 transfer feature: logit of that UCI-only model's prediction added as one feature to F2[target].
   The UCI model never sees Z-Alizadeh labels, so it is fitted once, outside the CV loop.
E2 pooled training: each Z-Alizadeh training fold is augmented with UCI patients (source flag,
   weight w). w in {0.25, 0.5, 1} is chosen on repeats r0-r4; the choice is scored on r5-r9.
All comparisons are paired against the phase-3 models on the untouched repeats r5-r9.
"""

from __future__ import annotations

import argparse
import json

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import Pipeline

from ml.cv import CVResult, load_folds, run_cv
from ml.data import ROOT, TARGETS, load_clean
from ml.evaluate import paired_compare
from ml.external import SHARED, load_uci, shared_view
from ml.features import build
from ml.models import REGISTRY, make
from ml.preprocess import linear_pipeline
from ml.strategies import Pooled, logit

P3 = ROOT / "reports" / "phase3"
OUT = ROOT / "reports" / "phase5"
F2 = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"]
SCREEN, EVAL = [f"r{i}" for i in range(5)], [f"r{i}" for i in range(5, 10)]
TRANSFER = [c for c in SHARED if c not in ("chest_pain_type", "pretest_prob")]  # not transferable (see external.py)
EXTRAS = ["fbs_gt120", "st_t_abnormal"]  # harmonised columns not already in F2
WEIGHTS = [0.25, 0.5, 1.0]
TOP_K = 3


def ext_models() -> dict:
    lr = Pipeline([("impute", SimpleImputer(strategy="median", add_indicator=True).set_output(transform="pandas")),
                   ("lr", linear_pipeline(LogisticRegression(C=0.1, max_iter=5000)))])
    return {"logreg": lr, "lightgbm": make("lightgbm", {"n_estimators": 200, "num_leaves": 6, "min_child_samples": 20})}


def phase3_model(target: str, model: str, run: str):
    params = json.loads((P3 / target / "best_params.json").read_text())[model]
    return make(model, params, n_seeds=5 if run.endswith("seedbag5") else 1)


def compare(row: dict, res: CVResult, own: CVResult, best: CVResult) -> dict:
    c_own, c_best = paired_compare(own.fold_metrics, res.fold_metrics), paired_compare(best.fold_metrics, res.fold_metrics)
    return {**row, "auc": res.summary["auc_mean"], "brier": res.summary["brier_mean"], "ece": res.summary["ece"],
            "vs_own_S0": c_own["diff_mean"], "vs_best_S0": c_best["diff_mean"], "se": c_best["diff_se"],
            "keep": c_best["keep"]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-jobs", type=int, default=-1)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    df, uci = load_clean(), load_uci()
    folds = load_folds(df)
    za_shared = shared_view(df)
    boards = {t: pd.read_csv(P3 / t / "leaderboard.csv") for t in TARGETS}

    # ---------------------------------------------------------------- E0: transfer check
    e0, ext_scores = [], {}
    for t in TARGETS:
        ext = uci[uci[t].notna()]
        best_auc = -1
        for name, m in ext_models().items():
            m.fit(ext[TRANSFER], ext[t].values)
            p = m.predict_proba(za_shared[TRANSFER])[:, 1]
            auc = roc_auc_score(df[t], p)
            e0.append({"target": t, "ext_model": name, "n_uci": len(ext), "uci_prevalence": ext[t].mean(), "transfer_auc": auc})
            if auc > best_auc:
                best_auc, ext_scores[t] = auc, p
        # Reference: the same transferable features, trained within Z-Alizadeh (CV on r5-r9)
        ref = run_cv(linear_pipeline(LogisticRegression(C=0.1, max_iter=5000)), za_shared[TRANSFER], df[t].values,
                     folds=folds[EVAL], name="p5_ref_transfer_feats", target=t, n_jobs=args.n_jobs, save=False, log=False)
        e0.append({"target": t, "ext_model": "within_zalizadeh_cv", "n_uci": 0, "uci_prevalence": np.nan,
                   "transfer_auc": ref.summary["auc_mean"]})
    e0 = pd.DataFrame(e0)
    e0.to_csv(OUT / "e0_transfer.csv", index=False, float_format="%.4f")
    print("=== E0 transfer AUC (UCI-trained, scored on Z-Alizadeh)\n", e0.round(3).to_string(index=False), flush=True)

    rows, choice = [], {}
    for t in TARGETS:
        board, y = boards[t], df[t].values
        best_s0 = CVResult.load(t, board.iloc[0].run)
        X2 = build(df, **F2[t])
        ext = uci[uci[t].notna()]
        for _, m in board.head(TOP_K).iterrows():
            model, own = phase3_model(t, m.model, m.run), CVResult.load(t, m.run)
            base = {"target": t, "model": m.model}

            # ------------------------------------------------ E1: transfer feature
            X_e1 = X2.assign(ext_score=logit(ext_scores[t]))
            res = run_cv(model, X_e1, y, folds=folds[EVAL], name=f"p5_{m.model}_E1", target=t, n_jobs=args.n_jobs,
                         algo=m.model, feature_set="F2+ext_score", strategy="E1", repeats="r5-r9")
            rows.append(compare({**base, "experiment": "E1", "weight": np.nan}, res, own, best_s0))

            # ------------------------------------------------ E2: pooled training
            X_za = X2.join(za_shared[EXTRAS])
            X_ext = ext.reindex(columns=X_za.columns)
            impute = REGISTRY[m.model].family == "linear"
            screen = {}
            for w in WEIGHTS:
                fm = run_cv(Pooled(model, X_ext, ext[t].values, w, impute), X_za, y, folds=folds[SCREEN], name="screen",
                            target=t, n_jobs=args.n_jobs, save=False, log=False).fold_metrics
                screen[w] = fm.auc.mean()
            w_best = max(screen, key=screen.get)
            res = run_cv(Pooled(model, X_ext, ext[t].values, w_best, impute), X_za, y, folds=folds[EVAL],
                         name=f"p5_{m.model}_E2", target=t, n_jobs=args.n_jobs, algo=m.model, feature_set="F2+shared",
                         strategy="E2", repeats="r5-r9", uci_weight=w_best, n_uci=len(ext))
            rows.append(compare({**base, "experiment": "E2", "weight": w_best,
                                 **{f"screen_w{w}": a for w, a in screen.items()}}, res, own, best_s0))
            for r in rows[-2:]:
                print(f"[{t}] {m.model:13s} {r['experiment']} w={r['weight']}: auc {r['auc']:.4f} "
                      f"vs own {r['vs_own_S0']:+.4f} vs best {r['vs_best_S0']:+.4f} (se {r['se']:.4f}) keep={r['keep']}",
                      flush=True)
        kept = [r for r in rows if r["target"] == t and r["keep"]]
        win = max(kept, key=lambda r: r["auc"]) if kept else None
        choice[t] = ({"experiment": win["experiment"], "model": win["model"], "weight": win["weight"], "auc": win["auc"]}
                     if win else {"experiment": "none", "model": board.iloc[0].model, "auc": board.iloc[0].auc})

    res_df = pd.DataFrame(rows)
    res_df.to_csv(OUT / "external_results.csv", index=False, float_format="%.4f")
    (OUT / "external_choice.json").write_text(json.dumps(choice, indent=2, default=float))
    cols = ["target", "model", "experiment", "weight", "auc", "brier", "ece", "vs_own_S0", "vs_best_S0", "se", "keep"]
    print("\n" + res_df[cols].round(4).to_string(index=False))
    print("\nChoice:", json.dumps(choice, indent=1, default=float))


if __name__ == "__main__":
    main()
