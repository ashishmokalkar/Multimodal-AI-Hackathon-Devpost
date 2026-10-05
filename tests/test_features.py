import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression

from ml.data import TARGETS, load_clean
from ml.features import CANDIDATES, F1_DROP, build, chest_pain_type, pretest_prob
from ml.preprocess import LogSkewed, Winsorizer, linear_pipeline


@pytest.fixture(scope="module")
def df():
    return load_clean()


def test_no_target_columns_in_any_feature_set(df):
    X = build(df, add=list(CANDIDATES))
    assert not set(TARGETS) & set(X.columns)


def test_features_do_not_depend_on_targets(df):
    shuffled = df.copy()
    shuffled[TARGETS] = shuffled[TARGETS].sample(frac=1, random_state=0).values
    pd.testing.assert_frame_equal(build(df, add=list(CANDIDATES)), build(shuffled, add=list(CANDIDATES)))


def test_f1_merges_redundant_columns(df):
    X = build(df)
    assert not set(F1_DROP) & set(X.columns)
    assert set(X.chest_pain_type.unique()) == {0, 1, 2, 3}
    assert (X.chest_pain_type == 3).sum() == df.typical_chest_pain.sum()
    assert (X.smoking == 2).sum() == df.current_smoker.sum()


def test_replace_mode_drops_summarised_columns(df):
    X = build(df, replace=["nlr"])
    assert "nlr" in X and "neut" not in X and "lymph" not in X


def test_engineered_values_are_finite(df):
    X = build(df, add=list(CANDIDATES))
    assert np.isfinite(X.values).all()


def test_pretest_probability_table_lookup():
    rows = pd.DataFrame({"age": [55, 25, 75], "sex_male": [1, 0, 0], "typical_chest_pain": [1, 0, 0],
                         "atypical": [0, 1, 0], "nonanginal": [0, 0, 0]})
    assert list(chest_pain_type(rows)) == [3, 2, 0]
    assert pretest_prob(rows).pretest_prob.tolist() == pytest.approx([0.920, 0.042, 0.075])


def test_linear_preprocessing_is_fitted_on_training_data_only(df):
    X = build(df, add=["nlr"])
    w = Winsorizer().fit(X.iloc[:100])
    lo, hi = w.bounds_["tg"]
    out = w.transform(X)
    assert out.tg.min() >= lo and out.tg.max() <= hi
    assert LogSkewed().fit(X).transform(X).tg.max() == pytest.approx(np.log1p(X.tg.max()))
    p = linear_pipeline(LogisticRegression())
    assert p.fit(X, df.cad).predict_proba(X).shape == (len(X), 2)


def test_onehot_categoricals_for_linear_models(df):
    from ml.preprocess import OneHotCategoricals
    X = build(df)
    out = OneHotCategoricals().fit(X).transform(X)
    assert "chest_pain_type" not in out and {"chest_pain_type_1", "chest_pain_type_3", "smoking_2"} <= set(out)
    assert out.chest_pain_type_3.sum() == df.typical_chest_pain.sum()
