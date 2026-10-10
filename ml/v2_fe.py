"""Plan v2 feature constructors that must be fitted inside the training fold (FE3, FE5).

Both are sklearn transformers whose `fit_transform` on the training fold differs from `transform` on new rows
where needed, so they can sit in a Pipeline in front of any model without leaking test labels.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.feature_selection import mutual_info_classif
from sklearn.model_selection import StratifiedKFold


class PairwiseProducts(BaseEstimator, TransformerMixin):
    """FE3: add pairwise products of the k most informative non-binary-or-binary columns (mutual information on the
    training fold), standardised with training-fold statistics."""

    def __init__(self, k: int = 10, seed: int = 0):
        self.k = k
        self.seed = seed

    def fit(self, X: pd.DataFrame, y):
        mi = mutual_info_classif(X.astype(float), y, random_state=self.seed)
        top = list(X.columns[np.argsort(-mi)[: self.k]])
        self.pairs_ = [(a, b) for i, a in enumerate(top) for b in top[i + 1:]]
        P = self._raw(X)
        self.mean_, self.std_ = P.mean(), P.std().replace(0, 1)
        return self

    def _raw(self, X):
        return pd.DataFrame({f"{a}*{b}": X[a].astype(float) * X[b].astype(float) for a, b in self.pairs_}, index=X.index)

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        return X.join((self._raw(X) - self.mean_) / self.std_)


class TabPFNEmbedding(BaseEstimator, TransformerMixin):
    """FE5: append PCA components of TabPFN embeddings.

    Training rows get *out-of-fold* embeddings (inner k-fold, test-token embeddings), because a training row's own
    in-context embedding has seen its label. New rows get embeddings from TabPFN fitted on the whole training fold.
    """

    def __init__(self, n_components: int = 8, inner_splits: int = 5, n_estimators: int = 4, seed: int = 0):
        self.n_components = n_components
        self.inner_splits = inner_splits
        self.n_estimators = n_estimators
        self.seed = seed

    def _tabpfn(self):
        from tabpfn import TabPFNClassifier

        from ml.models import _tabpfn_device

        return TabPFNClassifier(n_estimators=self.n_estimators, device=_tabpfn_device(), random_state=self.seed)

    @staticmethod
    def _embed(model, X) -> np.ndarray:
        return np.asarray(model.get_embeddings(X, data_source="test")).mean(axis=0)   # average over ensemble members

    def fit(self, X, y):
        self.fit_transform(X, y)
        return self

    def fit_transform(self, X: pd.DataFrame, y=None, **_):
        from sklearn.decomposition import PCA

        y = np.asarray(y)
        oof = None
        for tr, va in StratifiedKFold(self.inner_splits, shuffle=True, random_state=self.seed).split(X, y):
            e = self._embed(self._tabpfn().fit(X.iloc[tr], y[tr]), X.iloc[va])
            oof = np.zeros((len(X), e.shape[1])) if oof is None else oof
            oof[va] = e
        self.pca_ = PCA(self.n_components, random_state=self.seed).fit(oof)
        self.full_ = self._tabpfn().fit(X, y)
        return self._append(X, self.pca_.transform(oof))

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        return self._append(X, self.pca_.transform(self._embed(self.full_, X)))

    def _append(self, X, Z):
        return X.join(pd.DataFrame(Z, index=X.index, columns=[f"pfn_emb{i}" for i in range(Z.shape[1])]))
