import numpy as np
import pandas as pd
import pytest
from sklearn.dummy import DummyClassifier
from sklearn.metrics import roc_auc_score

from ml.cv import iter_splits, make_folds, run_cv
from ml.data import FEATURES, LEAKAGE_RAW, TARGETS, load_clean
from ml.evaluate import bootstrap_ci, metrics, paired_compare


@pytest.fixture(scope="module")
def df():
    return load_clean()


@pytest.fixture(scope="module")
def folds(df):
    return make_folds(df, n_repeats=3)


def test_no_leakage_columns_in_features():
    lowered = {c.lower() for c in LEAKAGE_RAW} | {"cath", *TARGETS}
    assert not lowered & set(FEATURES)


def test_each_patient_tested_once_per_repeat(folds):
    seen = {}
    for r, _, tr, te in iter_splits(folds):
        assert not set(tr) & set(te)
        seen.setdefault(r, []).extend(te)
    for idx in seen.values():
        assert sorted(idx) == list(range(len(folds)))


def test_folds_are_stratified_for_every_target(df, folds):
    for t in TARGETS:
        prev = df[t].mean()
        for _, _, _, te in iter_splits(folds):
            assert abs(df[t].values[te].mean() - prev) < 0.06


def test_folds_are_deterministic(df):
    pd.testing.assert_frame_equal(make_folds(df, n_repeats=2), make_folds(df, n_repeats=2))


def test_metrics_match_sklearn():
    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 200)
    p = np.clip(y * 0.3 + rng.random(200) * 0.7, 0, 1)
    m = metrics(y, p)
    assert m["auc"] == pytest.approx(roc_auc_score(y, p))
    assert 0 <= m["brier"] <= 1


def test_bootstrap_point_estimate_matches_sklearn_metrics():
    rng = np.random.default_rng(1)
    y = rng.integers(0, 2, 150)
    oof = np.clip(y * 0.4 + rng.random((3, 150)) * 0.6, 0, 1)
    ci = bootstrap_ci(y, oof, n_boot=50)
    slow = pd.DataFrame([metrics(y, row) for row in oof]).mean()
    for m in ["auc", "logloss", "brier", "accuracy", "balanced_acc", "precision", "recall", "specificity", "f1"]:
        assert ci.loc[m, "estimate"] == pytest.approx(slow[m]), m
        assert ci.loc[m, "ci_low"] <= ci.loc[m, "estimate"] <= ci.loc[m, "ci_high"]


def test_run_cv_and_paired_compare(df, folds):
    X, y = df[FEATURES], df["cad"].values
    dummy = run_cv(DummyClassifier(strategy="prior"), X, y, name="t_dummy", target="test", folds=folds,
                   save=False, log=False, n_jobs=1)
    assert not np.isnan(dummy.oof).any()
    assert dummy.summary["auc_mean"] == pytest.approx(0.5)

    def age_score(X_tr, y_tr, X_te, tr, te):
        return (X_te["age"].values - 30) / 60

    age = run_cv(age_score, X, y, name="t_age", target="test", folds=folds, save=False, log=False, n_jobs=1)
    cmp = paired_compare(dummy.fold_metrics, age.fold_metrics)
    assert cmp["diff_mean"] > 0.1 and cmp["keep"]
