"""Fold-fitted feature selection (plan.md §3.3). Selectors are sklearn transformers that keep
DataFrame columns, so they can sit in front of any registry model inside a CV fold."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin, clone
from sklearn.pipeline import Pipeline


class CorrFilter(BaseEstimator, TransformerMixin):
    """Keep columns whose |Pearson correlation| with the target exceeds `threshold`
    (computed on the training fold only). Falls back to the `min_features` strongest columns."""

    def __init__(self, threshold: float = 0.2, min_features: int = 3):
        self.threshold = threshold
        self.min_features = min_features

    def fit(self, X: pd.DataFrame, y):
        y = np.asarray(y, dtype=float)
        corr = X.apply(lambda c: np.corrcoef(c.astype(float), y)[0, 1] if c.std() > 0 else 0.0).abs().fillna(0)
        keep = corr[corr > self.threshold].index.tolist()
        if len(keep) < self.min_features:
            keep = corr.sort_values(ascending=False).index[: self.min_features].tolist()
        self.columns_ = keep
        self.scores_ = corr
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        return X[self.columns_]


class TopKImportance(BaseEstimator, TransformerMixin):
    """Keep the `k` most important columns by a multivariate model fitted on the training fold only.

    method="rf": random-forest impurity importance (captures interactions);
    method="l1": |coefficient| of an L1 logistic regression on standardised, median-imputed columns.
    """

    def __init__(self, k: int = 20, method: str = "rf", seed: int = 0):
        self.k = k
        self.method = method
        self.seed = seed

    def fit(self, X: pd.DataFrame, y):
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.linear_model import LogisticRegression

        Xf = X.astype(float).fillna(X.median(numeric_only=True))
        if self.method == "rf":
            rf = RandomForestClassifier(n_estimators=300, min_samples_leaf=2, n_jobs=1, random_state=self.seed)
            score = rf.fit(Xf, y).feature_importances_
        elif self.method == "l1":
            Z = (Xf - Xf.mean()) / Xf.std().replace(0, 1)
            lr = LogisticRegression(l1_ratio=1.0, C=0.1, solver="saga", max_iter=5000, random_state=self.seed)
            score = np.abs(lr.fit(Z, y).coef_).max(axis=0)   # binary: one row; multiclass: max over classes
        else:
            raise ValueError(f"unknown method {self.method!r}")
        self.scores_ = pd.Series(score, index=X.columns)
        self.columns_ = self.scores_.sort_values(ascending=False, kind="stable").index[: self.k].tolist()
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        return X[self.columns_]


class TopKMutualInfo(BaseEstimator, TransformerMixin):
    """Keep the k columns with the highest mutual information with the label (training fold only)."""

    def __init__(self, k: int = 20, seed: int = 0):
        self.k = k
        self.seed = seed

    def fit(self, X: pd.DataFrame, y):
        from sklearn.feature_selection import mutual_info_classif

        self.scores_ = pd.Series(mutual_info_classif(X.astype(float), y, random_state=self.seed), index=X.columns)
        self.columns_ = self.scores_.sort_values(ascending=False, kind="stable").index[: self.k].tolist()
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        return X[self.columns_]


class StabilitySelection(BaseEstimator, TransformerMixin):
    """Keep columns selected by an L1 logistic regression in >= `threshold` of bootstrap half-samples of the
    training fold (Meinshausen & Buehlmann 2010); falls back to the `min_features` most frequent."""

    def __init__(self, threshold: float = 0.6, n_boot: int = 50, C: float = 0.1, min_features: int = 5, seed: int = 0):
        self.threshold = threshold
        self.n_boot = n_boot
        self.C = C
        self.min_features = min_features
        self.seed = seed

    def fit(self, X: pd.DataFrame, y):
        from sklearn.linear_model import LogisticRegression

        y = np.asarray(y)
        Xf = X.astype(float).fillna(X.median(numeric_only=True))
        Z = ((Xf - Xf.mean()) / Xf.std().replace(0, 1)).to_numpy()
        rng = np.random.default_rng(self.seed)
        freq = np.zeros(X.shape[1])
        for _ in range(self.n_boot):
            idx = rng.choice(len(y), len(y) // 2, replace=False)
            if len(np.unique(y[idx])) < 2:
                continue
            lr = LogisticRegression(l1_ratio=1.0, C=self.C, solver="saga", max_iter=5000)
            freq += np.abs(lr.fit(Z[idx], y[idx]).coef_[0]) > 1e-8
        self.scores_ = pd.Series(freq / self.n_boot, index=X.columns)
        keep = self.scores_[self.scores_ >= self.threshold].index.tolist()
        if len(keep) < self.min_features:
            keep = self.scores_.sort_values(ascending=False, kind="stable").index[: self.min_features].tolist()
        self.columns_ = keep
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        return X[self.columns_]


def with_selector(selector, model) -> Pipeline:
    return Pipeline([("select", clone(selector)), ("model", model)])
