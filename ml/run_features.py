"""Plan phase 2: feature cleaning and engineered-feature ablation.

Run:  python -m ml.run_features

Protocol (to limit selection bias from choosing features on the same folds we score on):
  * screening uses CV repeats r0-r4; confirmation uses the untouched repeats r5-r9;
  * A: F0 vs F1 (cleaning), B: robust linear preprocessing vs plain scaling,
  * C: each engineered candidate added to F1 (and 'replace' variants), per target x model,
  * D: per-target keep rule -> F2[target],
  * E: confirm F2[target] vs F0 and F1 on r5-r9 (logged to reports/experiments.csv).

Keep rule for a candidate on a target: mean ΔAUC over models > 0, at least one model passes
the corrected-SE decision rule, and no model is hurt by more than one corrected SE.
"""

from __future__ import annotations

import json

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier

from ml.cv import load_folds, run_cv
from ml.data import ROOT, TARGETS, load_clean
from ml.evaluate import paired_compare
from ml.features import CANDIDATES, build
from ml.preprocess import linear_pipeline

SEED = 42
OUT = ROOT / "reports" / "phase2"
SCREEN, CONFIRM = [f"r{i}" for i in range(5)], [f"r{i}" for i in range(5, 10)]
REPLACE_VARIANTS = ["nlr", "comorbidity_count"]


def models(robust_linear: bool) -> dict:
    return {
        "logreg": linear_pipeline(LogisticRegression(C=0.1, max_iter=5000), robust=robust_linear),
        "random_forest": RandomForestClassifier(n_estimators=300, min_samples_leaf=2, n_jobs=1, random_state=SEED),
        "xgboost": XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8,
                                 colsample_bytree=0.7, eval_metric="logloss", random_state=SEED, n_jobs=1,
                                 verbosity=0),
    }


def cv(model, X, y, folds, **kw):
    return run_cv(model, X, y, folds=folds, save=False, log=False, **kw).fold_metrics


def compare(base, new) -> dict:
    c = paired_compare(base, new)
    return {"delta": c["diff_mean"], "se": c["diff_se"], "keep": c["keep"], "auc": new.auc.mean()}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df = load_clean()
    folds = load_folds(df)
    screen, confirm = folds[SCREEN], folds[CONFIRM]
    X0, X1 = build(df, base="F0"), build(df)

    # A + B: cleaning and linear preprocessing
    rows, base_folds = [], {}
    for t in TARGETS:
        y = df[t].values
        for name, m in models(robust_linear=False).items():
            f0 = cv(m, X0, y, screen, name="p2", target=t)
            f1 = cv(m, X1, y, screen, name="p2", target=t)
            rows.append({"target": t, "experiment": "F0->F1", "model": name, "auc_base": f0.auc.mean(), **compare(f0, f1)})
            if name == "logreg":
                f1r = cv(models(True)["logreg"], X1, y, screen, name="p2", target=t)
                rows.append({"target": t, "experiment": "logreg plain->robust", "model": name,
                             "auc_base": f1.auc.mean(), **compare(f1, f1r)})
                base_folds[(t, "logreg_plain")] = f1
                base_folds[(t, "logreg_robust")] = f1r
            else:
                base_folds[(t, name)] = f1
    ab = pd.DataFrame(rows)
    print("\n=== A/B: cleaning (F0->F1) and robust linear preprocessing\n", ab.round(4).to_string(index=False))

    # Use robust preprocessing for logreg if it is not worse on average.
    robust = ab.loc[ab.experiment == "logreg plain->robust", "delta"].mean() >= 0
    lr_key = "logreg_robust" if robust else "logreg_plain"
    print(f"\nLinear preprocessing used from here on: {'robust (winsor+log+scale)' if robust else 'plain scaling'}")
    zoo = models(robust)

    # C: candidate ablation on F1
    rows = []
    variants = [(c, "add") for c in CANDIDATES] + [(c, "replace") for c in REPLACE_VARIANTS]
    for t in TARGETS:
        y = df[t].values
        for cand, mode in variants:
            X = build(df, add=[cand]) if mode == "add" else build(df, replace=[cand])
            for name, m in zoo.items():
                base = base_folds[(t, lr_key if name == "logreg" else name)]
                new = cv(m, X, y, screen, name="p2", target=t)
                rows.append({"target": t, "candidate": cand, "mode": mode, "model": name, **compare(base, new)})
        print(f"screened {t}")
    abl = pd.DataFrame(rows)
    abl.to_csv(OUT / "candidate_ablation.csv", index=False, float_format="%.4f")

    # D: per-target keep rule
    agg = (abl.assign(hurt=abl["delta"] < -abl["se"])
           .groupby(["target", "candidate", "mode"])
           .agg(mean_delta=("delta", "mean"), min_delta=("delta", "min"), any_keep=("keep", "any"),
                hurts_a_model=("hurt", "any"))
           .reset_index())
    agg["selected"] = (agg.mean_delta > 0) & agg.any_keep & ~agg.hurts_a_model
    agg.to_csv(OUT / "candidate_summary.csv", index=False, float_format="%.4f")
    print("\n=== C/D: candidate summary (screening repeats r0-r4)")
    print(agg.sort_values(["target", "mean_delta"], ascending=[True, False]).round(4).to_string(index=False))

    f2 = {}
    for t in TARGETS:
        sel = agg[(agg.target == t) & agg.selected].sort_values("mean_delta", ascending=False)
        add, replace = [], []
        for cand in sel.candidate.unique():  # if both add and replace pass, take the better one
            best = sel[sel.candidate == cand].iloc[0]
            (replace if best["mode"] == "replace" else add).append(cand)
        f2[t] = {"add": add, "replace": replace}
    print("\nF2 per target:", json.dumps(f2, indent=1))

    # E: confirm on untouched repeats r5-r9, logged
    rows = []
    for t in TARGETS:
        y = df[t].values
        X2 = build(df, add=f2[t]["add"], replace=f2[t]["replace"])
        for name, m in zoo.items():
            res = {fs: run_cv(m, X, y, folds=confirm, name=f"p2_{name}_{fs}", target=t, algo=name,
                              feature_set=fs, strategy="S0", repeats="r5-r9",
                              **({"f2": f2[t]} if fs == "F2" else {}))
                   for fs, X in (("F0", X0), ("F1", X1), ("F2", X2))}
            c20, c21 = paired_compare(res["F0"].fold_metrics, res["F2"].fold_metrics), \
                paired_compare(res["F1"].fold_metrics, res["F2"].fold_metrics)
            rows.append({"target": t, "model": name, "n_feat_F2": X2.shape[1],
                         "auc_F0": res["F0"].summary["auc_mean"], "auc_F1": res["F1"].summary["auc_mean"],
                         "auc_F2": res["F2"].summary["auc_mean"],
                         "F2_vs_F0": c20["diff_mean"], "F2_vs_F0_se": c20["diff_se"], "F2_vs_F0_keep": c20["keep"],
                         "F2_vs_F1": c21["diff_mean"], "F2_vs_F1_keep": c21["keep"]})
    conf = pd.DataFrame(rows)
    conf.to_csv(OUT / "confirmation.csv", index=False, float_format="%.4f")
    (OUT / "f2_feature_sets.json").write_text(json.dumps({"linear_preprocessing": "robust" if robust else "plain",
                                                          "f2": f2}, indent=2))
    print("\n=== E: confirmation on untouched repeats r5-r9\n", conf.round(4).to_string(index=False))


if __name__ == "__main__":
    main()
