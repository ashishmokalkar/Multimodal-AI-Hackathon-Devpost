import numpy as np
import optuna
import pytest

from ml.data import load_clean
from ml.features import build
from ml.models import REGISTRY, SeedBag, available, make

SLOW = {"ebm", "tabpfn"}


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
