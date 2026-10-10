"""Fold-fitted preprocessing pipelines per model family (plan.md §2.2).

Column lists are resolved at fit time, so the same pipeline works on any feature set.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Right-skewed positive features (EDA §4) plus engineered ratios; log1p for linear models.
SKEWED = ["tg", "fbs", "esr", "bun", "wbc", "plt", "hdl", "cr", "nlr", "tg_hdl_ratio", "ldl_hdl_ratio",
          "plr", "anc"]


class Winsorizer(BaseEstimator, TransformerMixin):
    """Clip non-binary columns to percentiles learned on the training fold."""

    def __init__(self, lower: float = 0.01, upper: float = 0.99):
        self.lower = lower
        self.upper = upper

    def fit(self, X: pd.DataFrame, y=None):
        cont = [c for c in X.columns if X[c].nunique() > 5]
        self.bounds_ = {c: (X[c].quantile(self.lower), X[c].quantile(self.upper)) for c in cont}
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        for c, (lo, hi) in self.bounds_.items():
            X[c] = X[c].clip(lo, hi)
        return X


class LogSkewed(BaseEstimator, TransformerMixin):
    def __init__(self, columns: list[str] = tuple(SKEWED)):
        self.columns = columns

    def fit(self, X: pd.DataFrame, y=None):
        self.cols_ = [c for c in self.columns if c in X.columns]
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        X[self.cols_] = np.log1p(X[self.cols_].clip(lower=0))
        return X


# Nominal / unevenly spaced categoricals created in F1/F2; levels are fixed by construction.
CATEGORICAL_LEVELS = {"chest_pain_type": [0, 1, 2, 3], "smoking": [0, 1, 2]}


class OneHotCategoricals(BaseEstimator, TransformerMixin):
    """One-hot encode known categoricals (drop first level) so linear models get one weight per level."""

    def fit(self, X: pd.DataFrame, y=None):
        self.cols_ = [c for c in CATEGORICAL_LEVELS if c in X.columns]
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        for c in self.cols_:
            for level in CATEGORICAL_LEVELS[c][1:]:
                X[f"{c}_{level}"] = (X[c] == level).astype(int)
        return X.drop(columns=self.cols_)


def linear_pipeline(estimator, robust: bool = True, scaling: str | None = None, onehot: bool = True) -> Pipeline:
    """[one-hot categoricals] -> scaling -> estimator (LR / SVM / kNN).

    scaling: "robust" (winsorise P1/P99 -> log1p skewed -> standardise; the default via robust=True),
    "standard" (standardise only), "quantile" (rank -> normal scores, fitted on the training fold).
    """
    from sklearn.preprocessing import QuantileTransformer

    scaling = scaling or ("robust" if robust else "standard")
    steps = [("onehot", OneHotCategoricals())] if onehot else []
    if scaling == "robust":
        steps += [("winsor", Winsorizer()), ("log", LogSkewed()), ("scale", StandardScaler())]
    elif scaling == "standard":
        steps += [("scale", StandardScaler())]
    elif scaling == "quantile":
        steps += [("scale", QuantileTransformer(n_quantiles=100, output_distribution="normal"))]
    else:
        raise ValueError(f"unknown scaling {scaling!r}")
    return Pipeline(steps + [("model", estimator)])
