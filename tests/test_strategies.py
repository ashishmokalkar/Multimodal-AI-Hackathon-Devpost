import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from ml.cv import iter_splits, make_folds
from ml.data import TARGETS, load_clean
from ml.features import build
from ml.strategies import Hierarchical, Stacked, Upstream, oof_lookup, split_key

FIT_ROWS: list[set] = []  # module-level so it survives sklearn.clone


class SpyClassifier(ClassifierMixin, BaseEstimator):
    """Records which DataFrame rows every fit() saw."""

    def fit(self, X, y):
        FIT_ROWS.append(set(X.index))
        self.inner_ = make_pipeline(StandardScaler(), LogisticRegression()).fit(X.values, y)
        self.classes_ = self.inner_.classes_
        return self

    def predict_proba(self, X):
        return self.inner_.predict_proba(X.values)


def setup():
    df = load_clean()
    return df, make_folds(df, n_repeats=1), {t: build(df) for t in TARGETS}


def test_oof_lookup_maps_each_split_to_its_predictions():
    df, folds, _ = setup()
    oof = np.random.default_rng(0).random((1, len(df)))
    table = oof_lookup(folds, oof)
    for _, _, _, te in iter_splits(folds):
        assert np.allclose(table[split_key(te)], oof[0, te])


def test_stacked_upstream_never_fits_on_test_rows():
    df, folds, X = setup()
    FIT_ROWS.clear()
    up = Upstream("cad", SpyClassifier(), X["cad"], df.cad.values)
    strat = Stacked(make_pipeline(StandardScaler(), LogisticRegression()), [up])
    _, _, tr, te = next(iter_splits(folds))
    p = strat(X["lcx"].iloc[tr], df.lcx.values[tr], X["lcx"].iloc[te], tr, te)
    test_rows = set(X["lcx"].index[te])
    assert len(FIT_ROWS) == 6  # 5 inner-CV fits + 1 refit on the whole training fold
    assert all(not (rows & test_rows) for rows in FIT_ROWS)
    assert p.shape == (len(te),) and np.all((p >= 0) & (p <= 1))


def test_hierarchical_conditional_model_trains_on_diseased_only_and_bounds_by_cad():
    df, folds, X = setup()
    FIT_ROWS.clear()
    diseased = df[["lad", "lcx", "rca"]].max(axis=1).values
    _, _, tr, te = next(iter_splits(folds))
    cad_p = np.full(len(te), 0.4)
    strat = Hierarchical(SpyClassifier(), diseased, cad_lookup={split_key(te): cad_p})
    p = strat(X["rca"].iloc[tr], df.rca.values[tr], X["rca"].iloc[te], tr, te)
    assert FIT_ROWS[0] == set(X["rca"].index[tr][diseased[tr] == 1])
    assert np.all(p <= 0.4 + 1e-12)
