import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression

from ml.data import load_clean
from ml.external import SHARED, load_uci, shared_view
from ml.features import build
from ml.models import fit_weighted, make
from ml.strategies import Pooled


@pytest.fixture(scope="module")
def uci():
    return load_uci()


def test_uci_record_counts(uci):
    assert uci.source.value_counts().to_dict() == {"hungarian": 294, "cleveland": 282, "va": 200, "switzerland": 123}


def test_vessel_labels_are_plausible(uci):
    v = uci[uci[["lad", "lcx", "rca"]].notna().all(axis=1)]
    assert len(v) >= 600
    assert set(v.source) == {"cleveland", "va", "switzerland"}  # Hungarian vessel data excluded (positives-only)
    for c in ["lad", "lcx", "rca"]:
        assert 0.2 < v[c].mean() < 0.8
    assert ((v.cad == 1) == (v[["lad", "lcx", "rca"]].max(axis=1) == 1)).mean() > 0.98


def test_chest_pain_is_not_transferred(uci):
    assert uci.chest_pain_type.isna().all() and uci.pretest_prob.isna().all()


def test_shared_view_matches_schema():
    z = shared_view(load_clean())
    assert list(z.columns) == SHARED and not z.isna().any().any()


def test_fit_weighted_routes_weights_to_innermost_estimator():
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    received = {}

    class Spy(LogisticRegression):
        def fit(self, X, y, sample_weight=None):
            received["w"] = sample_weight
            return super().fit(X, y, sample_weight=sample_weight)

    df = load_clean()
    X, y = build(df), df.cad.values
    w = np.linspace(0.1, 1.0, len(y))
    nested = Pipeline([("outer_scale", StandardScaler()), ("inner", Pipeline([("model", Spy(max_iter=5000))]))])
    fit_weighted(nested, X, y, w)
    assert np.array_equal(received["w"], w)
    fit_weighted(make("random_forest", {"n_estimators": 10}, n_seeds=2), X, y, w)  # SeedBag passes weights on


def test_pooled_predicts_only_test_rows_and_never_trains_on_them():
    df = load_clean()
    X, y = build(df), df.lcx.values
    seen = []

    class Spy(LogisticRegression):
        def fit(self, X, y, sample_weight=None):
            seen.append(X.copy())
            return super().fit(X.fillna(0), y, sample_weight=sample_weight)

        def predict_proba(self, X):
            return super().predict_proba(X.fillna(0))

    ext = pd.DataFrame({"age": [50.0, 60.0, 70.0, 65.0], "bp": [120.0, 140.0, 130.0, 150.0]})
    tr, te = np.arange(200), np.arange(200, 303)
    p = Pooled(Spy(max_iter=5000), ext, np.array([0, 1, 1, 0]), 0.5)(X.iloc[tr], y[tr], X.iloc[te], tr, te)
    assert p.shape == (len(te),)
    fitted = seen[0]
    assert len(fitted) == len(tr) + len(ext) and fitted.source_uci.sum() == len(ext)
    za_rows = fitted[fitted.source_uci == 0].drop(columns="source_uci").reset_index(drop=True)
    pd.testing.assert_frame_equal(za_rows, X.iloc[tr].reset_index(drop=True), check_dtype=False)
