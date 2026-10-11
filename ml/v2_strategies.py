"""Plan v2 S6 strategies (fit_predict callables for ml.cv.run_cv; see ml/strategies.py for the phase-4 ones).

JointPattern        M4: one multiclass model over the 8 vessel patterns (LAD x LCX x RCA); the label's probability is a
                    marginal (P(CAD) = 1 - P(no stenotic vessel)).
PooledHierarchical  E3: M2 hierarchy whose conditional P(vessel | diseased) model is trained on the diseased patients
                    of the Z-Alizadeh training fold plus diseased AngioCAD patients (weight w; columns AngioCAD lacks
                    are missing). P(CAD) comes from an out-of-fold lookup of the best CAD model on the same folds.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.base import clone

from ml.data import VESSELS
from ml.models import fit_weighted
from ml.strategies import split_key


@dataclass
class JointPattern:
    model: object
    patterns: np.ndarray            # (n_patients,) pattern id 0..7 = 4*LAD + 2*LCX + RCA
    target: str                     # "cad" or a vessel

    def __call__(self, X_tr, y_tr, X_te, tr, te) -> np.ndarray:
        m = clone(self.model).fit(X_tr, self.patterns[tr])
        proba = pd.DataFrame(m.predict_proba(X_te), columns=m.classes_)
        if self.target == "cad":
            return 1 - proba.get(0, pd.Series(0.0, index=proba.index)).to_numpy()
        bit = {"lad": 4, "lcx": 2, "rca": 1}[self.target]
        return proba[[c for c in proba.columns if c & bit]].sum(axis=1).to_numpy()


def patterns(df: pd.DataFrame) -> np.ndarray:
    return (4 * df.lad + 2 * df.lcx + df.rca).to_numpy()


@dataclass
class PooledHierarchical:
    model: object
    diseased: np.ndarray                         # any stenotic vessel, Z-Alizadeh patients
    cad_lookup: dict                             # split key -> OOF P(CAD) on that split's test rows
    X_ext: pd.DataFrame | None = None            # external diseased patients on the same columns (NaN where absent)
    y_ext: np.ndarray | None = None
    weight: float = 0.5

    def __call__(self, X_tr, y_tr, X_te, tr, te) -> np.ndarray:
        mask = self.diseased[tr] == 1
        X_fit, y_fit, w = X_tr[mask], y_tr[mask], None
        if self.X_ext is not None:
            X_fit = pd.concat([X_fit, self.X_ext[X_tr.columns]], ignore_index=True)
            y_fit = np.concatenate([y_fit, self.y_ext])
            w = np.concatenate([np.ones(mask.sum()), np.full(len(self.y_ext), self.weight)])
        p_cond = fit_weighted(clone(self.model), X_fit, y_fit, w).predict_proba(X_te)[:, 1]
        return self.cad_lookup[split_key(te)] * p_cond


__all__ = ["JointPattern", "PooledHierarchical", "patterns", "VESSELS"]
