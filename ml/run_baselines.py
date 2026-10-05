"""Reproduce the EDA baselines on the fixed folds (plan P1 exit check).

Run:  python -m ml.run_baselines
"""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from ml.cv import load_folds, run_cv
from ml.data import FEATURES, TARGETS, load_clean
from ml.evaluate import bootstrap_ci

SEED = 42

BASELINES = {
    "logreg": make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=5000)),
    "random_forest": RandomForestClassifier(n_estimators=300, min_samples_leaf=2, n_jobs=1, random_state=SEED),
    "xgboost": XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8,
                             colsample_bytree=0.7, eval_metric="logloss", random_state=SEED, n_jobs=1,
                             verbosity=0),
}


def main() -> None:
    df = load_clean()
    folds = load_folds(df)
    X = df[FEATURES]
    rows = []
    for target in TARGETS:
        y = df[target].values
        for name, model in BASELINES.items():
            res = run_cv(model, X, y, name=f"baseline_{name}_F0", target=target, folds=folds,
                         algo=name, feature_set="F0", strategy="S0")
            s = res.summary
            ci = bootstrap_ci(y, res.oof, n_boot=300).loc["auc"]
            rows.append({"target": target, "model": name, "auc": s["auc_mean"], "auc_se": s["auc_se"],
                         "auc_ci": f"[{ci.ci_low:.3f}, {ci.ci_high:.3f}]", "accuracy": s["accuracy_mean"],
                         "f1": s["f1_mean"], "brier": s["brier_mean"], "ece": s["ece"]})
    print(pd.DataFrame(rows).set_index(["target", "model"]).round(3).to_string())


if __name__ == "__main__":
    main()
