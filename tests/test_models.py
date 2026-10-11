import numpy as np
import optuna
import pytest

from ml.data import load_clean
from ml.features import build
from ml.models import REGISTRY, SeedBag, available, make

SLOW = {"ebm", "tabpfn", "tabpfn_ft"}


@pytest.fixture(scope="module")
def data():
    df = load_clean().sample(frac=1, random_state=0)
    return build(df), df.cad.values


@pytest.mark.parametrize("name", [n for n in REGISTRY if n not in SLOW])
def test_model_fits_and_returns_probabilities(name, data):
    X, y = data
    p = make(name).fit(X.iloc[:200], y[:200]).predict_proba(X.iloc[200:])[:, 1]
    assert p.shape == (len(X) - 200,) and np.all((p >= 0) & (p <= 1))


@pytest.mark.parametrize("name", [n for n in REGISTRY if REGISTRY[n].space is not None])
def test_search_space_produces_buildable_params(name, data):
    X, y = data
    study = optuna.create_study(sampler=optuna.samplers.RandomSampler(seed=0))
    for _ in range(3):
        params = REGISTRY[name].space(study.ask())
        if name not in SLOW:
            make(name, params).fit(X.iloc[:150], y[:150])
        else:
            make(name, params)


def test_seedbag_averages_seeds(data):
    X, y = data
    bag = make("random_forest", {"n_estimators": 20}, n_seeds=3)
    assert isinstance(bag, SeedBag)
    p = bag.fit(X.iloc[:200], y[:200]).predict_proba(X.iloc[200:])
    singles = [m.predict_proba(X.iloc[200:]) for m in bag.models_]
    assert len(bag.models_) == 3 and np.allclose(p, np.mean(singles, axis=0))


def test_tabpfn_availability_is_reported_not_raised():
    assert available("tabpfn") in (True, False)


def test_weight_mask_keeps_full_weight_rows_and_samples_the_rest():
    from ml.models import weight_mask

    w = np.r_[np.ones(100), np.full(4000, 0.25)]
    keep = weight_mask(w, seed=0)
    assert keep[:100].all() and abs(keep[100:].mean() - 0.25) < 0.03
    assert np.array_equal(keep, weight_mask(w, seed=0))  # seeded


@pytest.mark.skipif(not available("tabpfn"), reason="TabPFN licence not accepted on this machine")
def test_tabpfn_wrapper_fits_with_weights_and_tuned_options(data):
    X, y = data
    params = {**REGISTRY["tabpfn"].defaults, "n_estimators": 2, "polynomial_features": 25, "outlier_removal_std": None}
    w = np.r_[np.ones(100), np.full(50, 0.5)]
    p = make("tabpfn", params).fit(X.iloc[:150], y[:150], sample_weight=w).predict_proba(X.iloc[150:180])[:, 1]
    assert p.shape == (30,) and np.all((p >= 0) & (p <= 1))
