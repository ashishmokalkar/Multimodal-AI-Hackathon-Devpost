"""Model registry (plan.md §4): factories, defaults and Optuna search spaces.

Every entry builds a fresh sklearn-compatible classifier from a params dict. Linear-family
models are wrapped in the fold-fitted `linear_pipeline`; tree models take raw features.
All models are single-threaded: parallelism happens across CV folds.

Add a model by adding one `ModelSpec` to `REGISTRY`.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Callable

import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
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

    def fit(self, X, y, sample_weight=None):
        spec = REGISTRY[self.name]
        seeds = range(self.n_seeds) if spec.stochastic else [0]
        self.models_ = [fit_weighted(spec.build(self.params, SEED + s), X, y, sample_weight) for s in seeds]
        self.classes_ = np.unique(y)
        return self

    def predict_proba(self, X):
        return np.mean([m.predict_proba(X) for m in self.models_], axis=0)


def fit_weighted(model, X, y, sample_weight=None):
    """Fit with per-row weights, routing them to the final estimator of (nested) Pipelines."""
    if sample_weight is None:
        return model.fit(X, y)
    path, inner = [], model
    while isinstance(inner, Pipeline):
        name, inner = inner.steps[-1]
        path.append(name)
    key = "__".join(path + ["sample_weight"]) if path else "sample_weight"
    return model.fit(X, y, **{key: sample_weight})


def make(name: str, params: dict | None = None, n_seeds: int = 1):
    """Build a model by registry name; `n_seeds > 1` wraps it in a SeedBag."""
    spec = REGISTRY[name]
    p = {**spec.defaults, **(params or {})}
    return SeedBag(name, p, n_seeds) if n_seeds > 1 else spec.build(p, SEED)


# ----------------------------------------------------------------------------- builders
def _logreg(p, seed):
    # sklearn >= 1.8: elastic-net is selected by l1_ratio alone (0 = L2, 1 = L1).
    return _lin(p, LogisticRegression(solver="saga", C=p["C"], l1_ratio=p["l1_ratio"],
                                              class_weight=p["class_weight"], max_iter=20000, random_state=seed))


def _lin(p, estimator):
    """Linear-family preprocessing; plan v2 passes the per-label S1 choice as params "scaling" / "onehot"."""
    return linear_pipeline(estimator, scaling=p.get("scaling", "robust"), onehot=p.get("onehot", True))


def _svm(p, seed):
    svc = SVC(C=p["C"], gamma=p["gamma"], class_weight=p["class_weight"], random_state=seed)
    # Platt scaling averaged over 5 internal splits: a single Platt fit on ~200 rows can collapse
    # (seen on LAD: one fold's probabilities all ~0.1), which breaks pooled AUC and calibration.
    return _lin(p, CalibratedClassifierCV(svc, method="sigmoid", cv=5, ensemble=True))


def _knn(p, seed):
    return _lin(p, KNeighborsClassifier(n_neighbors=p["n_neighbors"], weights=p["weights"]))


def _gnb(p, seed):
    return _lin(p, GaussianNB(var_smoothing=p["var_smoothing"]))


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
    import warnings

    from interpret.glassbox import ExplainableBoostingClassifier
    # Pooled external data has NaNs by design; EBM handles them but warns on every fit.
    warnings.filterwarnings("ignore", message="Missing values detected", module="interpret")
    return ExplainableBoostingClassifier(**p, random_state=seed, n_jobs=1)


_UNTHROTTLED = False


def _disable_power_throttling() -> None:
    """Windows 11 runs background processes in 'efficiency mode' (EcoQoS: E-cores, no turbo), which made TabPFN
    ~5x slower in long background runs. Opt this process out once (no-op elsewhere)."""
    global _UNTHROTTLED
    if _UNTHROTTLED or os.name != "nt":
        return
    import ctypes

    class _State(ctypes.Structure):
        _fields_ = [("Version", ctypes.c_ulong), ("ControlMask", ctypes.c_ulong), ("StateMask", ctypes.c_ulong)]

    state = _State(1, 0x1, 0)  # PROCESS_POWER_THROTTLING_EXECUTION_SPEED controlled, and switched off
    kernel32 = ctypes.windll.kernel32
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    kernel32.SetProcessInformation(ctypes.c_void_p(kernel32.GetCurrentProcess()), 4,  # ProcessPowerThrottling
                                   ctypes.byref(state), ctypes.sizeof(state))
    _UNTHROTTLED = True


def weight_mask(sample_weight: np.ndarray, seed: int) -> np.ndarray:
    """Rows to keep for a model without sample weights: all rows with w >= 1, a seeded fraction w of the rest."""
    w = np.asarray(sample_weight, dtype=float)
    return (w >= 1) | (np.random.default_rng(seed).random(len(w)) < w)


class TabPFN(ClassifierMixin, BaseEstimator):
    """TabPFN v3.5 (GPU when available, else CPU), with its inference options exposed as flat params for tuning.

    TabPFN learns in context, so `fit` only stores the training rows; the network (~1.5 GB per instance) is
    built in `predict_proba` and freed afterwards. A SeedBag of TabPFNs therefore holds one network at a time.
    TabPFN has no sample weights: `fit(..., sample_weight=w)` subsamples instead (see `weight_mask`).
    Torch threads per process: `n_threads`, else the TABPFN_THREADS environment variable (CV folds already run
    in parallel, so few processes with several threads beat many single-threaded ones).
    """

    def __init__(self, n_estimators=8, softmax_temperature=0.9, average_before_softmax=False,
                 balance_probabilities=False, polynomial_features="no", fingerprint_feature=True,
                 outlier_removal_std="auto", preprocess=None, categorical_encoding=None, explicit_categoricals=False,
                 feature_shift="shuffle", class_shift="shuffle", subsample_samples=None, version=None, random_state=0,
                 n_threads=None):
        self.n_estimators = n_estimators
        self.softmax_temperature = softmax_temperature
        self.average_before_softmax = average_before_softmax
        self.balance_probabilities = balance_probabilities
        self.polynomial_features = polynomial_features
        self.fingerprint_feature = fingerprint_feature
        self.outlier_removal_std = outlier_removal_std
        self.preprocess = preprocess
        self.categorical_encoding = categorical_encoding
        self.explicit_categoricals = explicit_categoricals
        self.feature_shift = feature_shift
        self.class_shift = class_shift
        self.subsample_samples = subsample_samples
        self.version = version
        self.random_state = random_state
        self.n_threads = n_threads

    def fit(self, X, y, sample_weight=None):
        if sample_weight is not None:
            keep = weight_mask(sample_weight, self.random_state)
            X, y = X[keep], np.asarray(y)[keep]
        self.X_, self.y_ = X, np.asarray(y)
        self.classes_ = np.unique(self.y_)
        return self

    def predict_proba(self, X):
        import torch
        from tabpfn import TabPFNClassifier

        _disable_power_throttling()
        threads = self.n_threads or int(os.environ.get("TABPFN_THREADS", 0))
        if threads:
            torch.set_num_threads(threads)
        config = {"POLYNOMIAL_FEATURES": self.polynomial_features, "FINGERPRINT_FEATURE": self.fingerprint_feature,
                  "OUTLIER_REMOVAL_STD": self.outlier_removal_std, "FEATURE_SHIFT_METHOD": self.feature_shift,
                  "CLASS_SHIFT_METHOD": self.class_shift, "SUBSAMPLE_SAMPLES": self.subsample_samples}
        if self.preprocess is not None or self.categorical_encoding is not None:
            config["PREPROCESS_TRANSFORMS"] = _tabpfn_transforms(self.preprocess, self.categorical_encoding)
        cats = None
        if self.explicit_categoricals and hasattr(self.X_, "columns"):
            cats = [i for i, c in enumerate(self.X_.columns) if c in TABPFN_CATEGORICALS]
        kwargs = dict(n_estimators=self.n_estimators, softmax_temperature=self.softmax_temperature,
                      average_before_softmax=self.average_before_softmax, balance_probabilities=self.balance_probabilities,
                      categorical_features_indices=cats or None, inference_config=config, device=_tabpfn_device(),
                      random_state=self.random_state)
        if self.version is None:   # default checkpoint (v3.5)
            model = TabPFNClassifier(**kwargs)
        else:                      # e.g. "v2.5", "v2.6", "v3": that checkpoint with its own default settings
            from tabpfn.constants import ModelVersion

            model = TabPFNClassifier.create_default_for_version(ModelVersion(self.version), **kwargs)
        return model.fit(self.X_, self.y_).predict_proba(X)


class FinetunedTabPFN(ClassifierMixin, BaseEstimator):
    """TabPFN fine-tuned on the training fold (GPU). Early stopping uses an inner validation split of the training
    fold only; like `TabPFN`, the network is built at predict time and freed afterwards."""

    def __init__(self, epochs=30, learning_rate=1e-5, weight_decay=0.01, validation_split_ratio=0.2,
                 n_estimators_final_inference=8, version=None, random_state=0):
        self.epochs = epochs
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.validation_split_ratio = validation_split_ratio
        self.n_estimators_final_inference = n_estimators_final_inference
        self.version = version
        self.random_state = random_state

    def fit(self, X, y):
        self.X_, self.y_ = X, np.asarray(y)
        self.classes_ = np.unique(self.y_)
        return self

    def predict_proba(self, X):
        from tabpfn.finetuning.finetuned_classifier import FinetunedTabPFNClassifier

        version = None
        if self.version is not None:
            from tabpfn.constants import ModelVersion

            version = ModelVersion(self.version)
        model = FinetunedTabPFNClassifier(
            device=_tabpfn_device(), epochs=self.epochs, learning_rate=self.learning_rate,
            weight_decay=self.weight_decay, validation_split_ratio=self.validation_split_ratio,
            n_estimators_final_inference=self.n_estimators_final_inference, eval_metric="roc_auc",
            save_checkpoint_interval=None, random_state=self.random_state, model_version=version)
        return model.fit(self.X_, self.y_).predict_proba(X)


def _tabpfn_device() -> str:
    """TABPFN_DEVICE if set, else the GPU when one is visible to torch."""
    import torch

    return os.environ.get("TABPFN_DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")


# Multi-level categoricals in our data (binary columns are detected as categorical by TabPFN anyway).
TABPFN_CATEGORICALS = ["chest_pain_type", "smoking", "vhd", "region_rwma", "function_class"]
# Feature transforms per ensemble member: v3.5's default is "none"; "mix" alternates raw and power-transformed members.
_TABPFN_PREPROCESS = {"none": ["none"], "safepower": ["safepower"], "quantile": ["quantile_uni_coarse"],
                      "squash": ["squashing_scaler_default"], "robust": ["robust"], "mix": ["none", "safepower"]}


def _tabpfn_transforms(preprocess, categorical_encoding):
    from tabpfn.preprocessing import PreprocessorConfig

    return [PreprocessorConfig(name, categorical_name=categorical_encoding or "ordinal_shuffled",
                               max_features_per_estimator=768)
            for name in _TABPFN_PREPROCESS[preprocess or "none"]]


def _tabpfn_ft(p, seed):
    return FinetunedTabPFN(**p, random_state=seed)


_TABPFN_DEFAULTS = {"n_estimators": 8, "softmax_temperature": 0.9, "average_before_softmax": False,
                    "balance_probabilities": False, "polynomial_features": "no", "fingerprint_feature": True,
                    "outlier_removal_std": "auto"}


def _tabpfn(p, seed):
    return TabPFN(**p, random_state=seed)


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
    "tabpfn": ModelSpec(
        "other", _tabpfn, _TABPFN_DEFAULTS,
        lambda t: {"n_estimators": t.suggest_categorical("n_estimators", [4, 8, 16]),
                   "softmax_temperature": t.suggest_float("softmax_temperature", 0.5, 1.2),
                   "average_before_softmax": t.suggest_categorical("average_before_softmax", [False, True]),
                   "balance_probabilities": t.suggest_categorical("balance_probabilities", [False, True]),
                   "polynomial_features": t.suggest_categorical("polynomial_features", ["no", 25]),
                   "fingerprint_feature": t.suggest_categorical("fingerprint_feature", [True, False]),
                   "outlier_removal_std": t.suggest_categorical("outlier_removal_std", ["auto", 6.0, None])}),
    "tabpfn_ft": ModelSpec("other", _tabpfn_ft, {"epochs": 30, "learning_rate": 1e-5}, None),
}


def available(name: str) -> bool:
    """True if the model's backend can be built and fitted here (TabPFN needs an accepted licence)."""
    try:
        if name.startswith("tabpfn"):
            from tabpfn.browser_auth import get_cached_token
            return get_cached_token() is not None
        make(name)
        return True
    except Exception:
        return False

