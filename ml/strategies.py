"""Multi-label strategies for vessel prediction (plan.md §5).

Each strategy is a `fit_predict(X_train, y_train, X_test, train_idx, test_idx) -> p_test`
callable for `ml.cv.run_cv`, so it is evaluated on the same fixed folds as everything else.

S1 Hierarchical: P(v) = P(CAD) * P(v | diseased), the conditional model trained on patients
   with >= 1 stenotic vessel. P(CAD) comes from an out-of-fold lookup of the best CAD model
   on the same folds, or from a CAD model fitted in the fold.
S2/S3 Stacked:   upstream targets' probabilities (logit) are added as features. On training rows
   they are inner-CV out-of-fold predictions (never in-sample), on test rows they come from the
   upstream model refitted on the whole training fold. S2 = upstream CAD only;
   S3 = stacked binary relevance, i.e. all other targets.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import StratifiedKFold

EPS = 1e-4


def logit(p: np.ndarray) -> np.ndarray:
    p = np.clip(p, EPS, 1 - EPS)
    return np.log(p / (1 - p))


def split_key(test_idx: np.ndarray) -> bytes:
    return np.sort(test_idx).astype(np.int64).tobytes()


def oof_lookup(folds: pd.DataFrame, oof: np.ndarray) -> dict[bytes, np.ndarray]:
    """Map each split's test indices -> saved OOF probabilities (oof rows align with folds columns)."""
    table = {}
    for r, col in enumerate(folds.columns):
        for f in np.unique(folds[col]):
            te = np.where(folds[col].values == f)[0]
            table[split_key(te)] = oof[r, te]
    return table


@dataclass
class Upstream:
    """A model for another target whose predictions become a feature."""
    name: str
    model: object
    X: pd.DataFrame          # full feature matrix for that target (all patients)
    y: np.ndarray            # that target's labels (all patients)


def _inner_oof(model, X: pd.DataFrame, y: np.ndarray, n_splits: int, seed: int) -> np.ndarray:
    oof = np.zeros(len(y))
    for tr, va in StratifiedKFold(n_splits, shuffle=True, random_state=seed).split(X, y):
        oof[va] = clone(model).fit(X.iloc[tr], y[tr]).predict_proba(X.iloc[va])[:, 1]
    return oof


@dataclass
class Stacked:
    vessel_model: object
    upstream: list[Upstream]
    inner_splits: int = 5
    seed: int = 0

    def __call__(self, X_tr, y_tr, X_te, tr, te) -> np.ndarray:
        X_tr, X_te = X_tr.copy(), X_te.copy()
        for u in self.upstream:
            Xu_tr, yu_tr = u.X.iloc[tr], u.y[tr]
            X_tr[f"p_{u.name}"] = logit(_inner_oof(u.model, Xu_tr, yu_tr, self.inner_splits, self.seed))
            X_te[f"p_{u.name}"] = logit(clone(u.model).fit(Xu_tr, yu_tr).predict_proba(u.X.iloc[te])[:, 1])
        return clone(self.vessel_model).fit(X_tr, y_tr).predict_proba(X_te)[:, 1]


@dataclass
class Hierarchical:
    vessel_model: object
    diseased: np.ndarray                                  # any stenotic vessel, all patients
    cad_lookup: dict[bytes, np.ndarray] | None = None      # OOF P(CAD) per split (fast path)
    cad: Upstream | None = None                            # or fit a CAD model in-fold
    min_cases: int = field(default=20, repr=False)

    def __call__(self, X_tr, y_tr, X_te, tr, te) -> np.ndarray:
        mask = self.diseased[tr] == 1
        if mask.sum() < self.min_cases or len(np.unique(y_tr[mask])) < 2:
            raise ValueError("Too few diseased training patients for the conditional model")
        p_cond = clone(self.vessel_model).fit(X_tr[mask], y_tr[mask]).predict_proba(X_te)[:, 1]
        if self.cad_lookup is not None:
            p_cad = self.cad_lookup[split_key(te)]
        else:
            p_cad = clone(self.cad.model).fit(self.cad.X.iloc[tr], self.cad.y[tr]).predict_proba(self.cad.X.iloc[te])[:, 1]
        return p_cad * p_cond


@dataclass
class Pooled:
    """Train on the Z-Alizadeh training fold plus external (UCI) patients; test on Z-Alizadeh only.

    External rows are aligned to the training columns (NaN where they have no equivalent), flagged
    with `source_uci = 1` and down-weighted by `weight`. Linear-family models get a median imputer
    with missing-value indicators in front; tree models handle NaN natively.
    """
    model: object
    X_ext: pd.DataFrame
    y_ext: np.ndarray
    weight: float = 0.5
    impute: bool = False

    def _with_source(self, X: pd.DataFrame, flag: int) -> pd.DataFrame:
        return X.assign(source_uci=flag)

    def __call__(self, X_tr, y_tr, X_te, tr, te) -> np.ndarray:
        from sklearn.impute import SimpleImputer
        from sklearn.pipeline import Pipeline

        from ml.models import fit_weighted

        ext = self.X_ext.reindex(columns=X_tr.columns)
        X_fit = pd.concat([self._with_source(X_tr, 0), self._with_source(ext, 1)], ignore_index=True)
        y_fit = np.concatenate([y_tr, self.y_ext])
        w = np.concatenate([np.ones(len(y_tr)), np.full(len(self.y_ext), self.weight)])
        model = clone(self.model)
        if self.impute:
            imputer = SimpleImputer(strategy="median", add_indicator=True, keep_empty_features=True)
            model = Pipeline([("impute", imputer.set_output(transform="pandas")), ("est", model)])
        fit_weighted(model, X_fit, y_fit, w)
        return model.predict_proba(self._with_source(X_te, 0))[:, 1]
