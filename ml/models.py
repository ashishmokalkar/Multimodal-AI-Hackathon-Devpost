"""Model registry (plan.md §4): factories, defaults and Optuna search spaces.

Every entry builds a fresh sklearn-compatible classifier from a params dict. Linear-family
models are wrapped in the fold-fitted `linear_pipeline`; tree models take raw features.
All models are single-threaded: parallelism happens across CV folds.

Add a model by adding one `ModelSpec` to `REGISTRY`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC

from ml.preprocess import linear_pipeline

SEED = 42


@dataclass(frozen=True)
class ModelSpec:
    family: str                               # "linear" | "tree" | "other"
    build: Callable[[dict, int], object]      # (params, seed) -> estimator
    defaults: dict
    space: Callable[[object], dict] | None    # optuna trial -> params
    stochastic: bool = True                   # benefits from seed bagging


class SeedBag(ClassifierMixin, BaseEstimator):
    """Average predicted probabilities of the same model trained with different seeds."""

    def __init__(self, name: str, params: dict, n_seeds: int = 5):
        self.name = name
        self.params = params
        self.n_seeds = n_seeds

    def fit(self, X, y):
        spec = REGISTRY[self.name]
        seeds = range(self.n_seeds) if spec.stochastic else [0]
        self.models_ = [spec.build(self.params, SEED + s).fit(X, y) for s in seeds]
        self.classes_ = np.array([0, 1])
        return self

    def predict_proba(self, X):
        return np.mean([m.predict_proba(X) for m in self.models_], axis=0)


def make(name: str, params: dict | None = None, n_seeds: int = 1):
    """Build a model by registry name; `n_seeds > 1` wraps it in a SeedBag."""
    spec = REGISTRY[name]
    p = {**spec.defaults, **(params or {})}
    return SeedBag(name, p, n_seeds) if n_seeds > 1 else spec.build(p, SEED)


# ----------------------------------------------------------------------------- builders
def _logreg(p, seed):
    # sklearn >= 1.8: elastic-net is selected by l1_ratio alone (0 = L2, 1 = L1).
    return linear_pipeline(LogisticRegression(solver="saga", C=p["C"], l1_ratio=p["l1_ratio"],
                                              class_weight=p["class_weight"], max_iter=20000, random_state=seed))


def _svm(p, seed):
    svc = SVC(C=p["C"], gamma=p["gamma"], class_weight=p["class_weight"], random_state=seed)
    # Platt scaling averaged over 5 internal splits: a single Platt fit on ~200 rows can collapse
    # (seen on LAD: one fold's probabilities all ~0.1), which breaks pooled AUC and calibration.
    return linear_pipeline(CalibratedClassifierCV(svc, method="sigmoid", cv=5, ensemble=True))


def _knn(p, seed):
    return linear_pipeline(KNeighborsClassifier(n_neighbors=p["n_neighbors"], weights=p["weights"]))


def _gnb(p, seed):
    return linear_pipeline(GaussianNB(var_smoothing=p["var_smoothing"]))


def _forest(cls):
    def build(p, seed):
        return cls(n_estimators=p["n_estimators"], max_depth=p["max_depth"], min_samples_leaf=p["min_samples_leaf"],
                   max_features=p["max_features"], class_weight=p["class_weight"], n_jobs=1, random_state=seed)
    return build


def _xgb(p, seed):
    from xgboost import XGBClassifier
    return XGBClassifier(**p, eval_metric="logloss", random_state=seed, n_jobs=1, verbosity=0)


def _lgbm(p, seed):
    from lightgbm import LGBMClassifier
    return LGBMClassifier(**p, random_state=seed, n_jobs=1, verbose=-1)


def _catboost(p, seed):
    from catboost import CatBoostClassifier
    return CatBoostClassifier(**p, random_seed=seed, thread_count=1, verbose=0, allow_writing_files=False)


def _ebm(p, seed):
    from interpret.glassbox import ExplainableBoostingClassifier
    return ExplainableBoostingClassifier(**p, random_state=seed, n_jobs=1)


def _tabpfn(p, seed):
    from tabpfn import TabPFNClassifier
    return TabPFNClassifier(n_estimators=p["n_estimators"], device="cpu", random_state=seed)


# ----------------------------------------------------------------------------- search spaces
def _cw(trial):
    return trial.suggest_categorical("class_weight", [None, "balanced"])


def _forest_space(t):
    return {"n_estimators": 500, "max_depth": t.suggest_categorical("max_depth", [3, 4, 5, 6, 8, None]),
            "min_samples_leaf": t.suggest_int("min_samples_leaf", 1, 10),
            "max_features": t.suggest_categorical("max_features", ["sqrt", 0.2, 0.35, 0.5]), "class_weight": _cw(t)}


_FOREST_DEFAULTS = {"n_estimators": 500, "max_depth": None, "min_samples_leaf": 2, "max_features": "sqrt",
                    "class_weight": None}

REGISTRY: dict[str, ModelSpec] = {
    "logreg": ModelSpec(
        "linear", _logreg, {"C": 0.1, "l1_ratio": 0.0, "class_weight": None},
        lambda t: {"C": t.suggest_float("C", 1e-3, 10, log=True), "l1_ratio": t.suggest_float("l1_ratio", 0, 1),
                   "class_weight": _cw(t)},
        stochastic=False),
    "svm_rbf": ModelSpec(
        "linear", _svm, {"C": 1.0, "gamma": "scale", "class_weight": None},
        lambda t: {"C": t.suggest_float("C", 1e-2, 100, log=True), "gamma": t.suggest_float("gamma", 1e-3, 1, log=True),
                   "class_weight": _cw(t)},
        stochastic=False),  # SVC + CV calibration is deterministic: seed bagging adds nothing
    "knn": ModelSpec(
        "linear", _knn, {"n_neighbors": 25, "weights": "distance"},
        lambda t: {"n_neighbors": t.suggest_int("n_neighbors", 5, 60),
                   "weights": t.suggest_categorical("weights", ["uniform", "distance"])},
        stochastic=False),
    "gnb": ModelSpec("linear", _gnb, {"var_smoothing": 1e-9},
                     lambda t: {"var_smoothing": t.suggest_float("var_smoothing", 1e-10, 1, log=True)},
                     stochastic=False),
    "random_forest": ModelSpec("tree", _forest(RandomForestClassifier), _FOREST_DEFAULTS, _forest_space),
    "extra_trees": ModelSpec("tree", _forest(ExtraTreesClassifier), _FOREST_DEFAULTS, _forest_space),
    "xgboost": ModelSpec(
        "tree", _xgb,
        {"n_estimators": 300, "max_depth": 3, "learning_rate": 0.05, "subsample": 0.8, "colsample_bytree": 0.7,
         "min_child_weight": 1, "reg_lambda": 1.0, "reg_alpha": 0.0},
        lambda t: {"n_estimators": t.suggest_int("n_estimators", 100, 800, step=50),
                   "max_depth": t.suggest_int("max_depth", 2, 4),
                   "learning_rate": t.suggest_float("learning_rate", 0.01, 0.1, log=True),
                   "subsample": t.suggest_float("subsample", 0.5, 1.0),
                   "colsample_bytree": t.suggest_float("colsample_bytree", 0.3, 1.0),
                   "min_child_weight": t.suggest_float("min_child_weight", 1, 10, log=True),
                   "reg_lambda": t.suggest_float("reg_lambda", 1e-3, 10, log=True),
                   "reg_alpha": t.suggest_float("reg_alpha", 1e-3, 10, log=True)}),
    "lightgbm": ModelSpec(
        "tree", _lgbm,
        {"n_estimators": 300, "num_leaves": 8, "learning_rate": 0.05, "min_child_samples": 20, "subsample": 0.8,
         "subsample_freq": 1, "colsample_bytree": 0.7, "reg_lambda": 1.0, "reg_alpha": 0.0},
        lambda t: {"n_estimators": t.suggest_int("n_estimators", 100, 800, step=50),
                   "num_leaves": t.suggest_int("num_leaves", 4, 15),
                   "learning_rate": t.suggest_float("learning_rate", 0.01, 0.1, log=True),
                   "min_child_samples": t.suggest_int("min_child_samples", 10, 40),
                   "subsample": t.suggest_float("subsample", 0.5, 1.0), "subsample_freq": 1,
                   "colsample_bytree": t.suggest_float("colsample_bytree", 0.3, 1.0),
                   "reg_lambda": t.suggest_float("reg_lambda", 1e-3, 10, log=True),
                   "reg_alpha": t.suggest_float("reg_alpha", 1e-3, 10, log=True)}),
    "catboost": ModelSpec(
        "tree", _catboost, {"iterations": 500, "depth": 4, "learning_rate": 0.03, "l2_leaf_reg": 5.0},
        lambda t: {"iterations": t.suggest_int("iterations", 200, 1000, step=100),
                   "depth": t.suggest_int("depth", 3, 6),
                   "learning_rate": t.suggest_float("learning_rate", 0.01, 0.1, log=True),
                   "l2_leaf_reg": t.suggest_float("l2_leaf_reg", 1, 20, log=True),
                   "random_strength": t.suggest_float("random_strength", 0.1, 10, log=True),
                   "bagging_temperature": t.suggest_float("bagging_temperature", 0, 1)}),
    "ebm": ModelSpec(
        "tree", _ebm, {"interactions": 5, "learning_rate": 0.01, "max_bins": 64, "outer_bags": 8},
        lambda t: {"interactions": t.suggest_int("interactions", 0, 10),
                   "learning_rate": t.suggest_float("learning_rate", 0.005, 0.05, log=True),
                   "max_bins": t.suggest_categorical("max_bins", [16, 32, 64, 128]), "outer_bags": 8}),
    "tabpfn": ModelSpec("other", _tabpfn, {"n_estimators": 8}, None),
}


def available(name: str) -> bool:
    """True if the model's backend can be built and fitted here (TabPFN needs an accepted licence)."""
    try:
        if name == "tabpfn":
            from tabpfn.browser_auth import get_cached_token
            return get_cached_token() is not None
        make(name)
        return True
    except Exception:
        return False

