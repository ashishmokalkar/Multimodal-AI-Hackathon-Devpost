import numpy as np
import pandas as pd

from ml.data import load_clean
from ml.features import build
from ml.models import make
from ml.selection import CorrFilter, TopKImportance, with_selector


def test_corr_filter_keeps_strong_columns_and_falls_back():
    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 200)
    X = pd.DataFrame({"signal": y + rng.normal(0, 0.5, 200), "noise": rng.normal(size=200), "const": 1.0})
    f = CorrFilter(0.2, min_features=1).fit(X, y)
    assert f.columns_ == ["signal"] and list(f.transform(X).columns) == ["signal"]
    assert len(CorrFilter(0.99, min_features=2).fit(X, y).columns_) == 2  # nothing passes -> top-2 fallback


def test_selector_is_fitted_on_training_rows_only():
    df = load_clean()
    X, y = build(df), df.cad.values
    half = CorrFilter(0.2).fit(X.iloc[:150], y[:150]).columns_
    pipe = with_selector(CorrFilter(0.2), make("logreg")).fit(X.iloc[:150], y[:150])
    assert pipe.named_steps["select"].columns_ == half
    assert pipe.predict_proba(X.iloc[150:]).shape == (153, 2)


def test_topk_importance_keeps_k_columns_led_by_the_signal():
    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 300)
    X = pd.DataFrame({"signal": y + rng.normal(0, 0.5, 300), **{f"noise{i}": rng.normal(size=300) for i in range(6)}})
    for method in ("rf", "l1"):
        sel = TopKImportance(3, method).fit(X, y)
        assert len(sel.columns_) == 3 and sel.columns_[0] == "signal"
        assert list(sel.transform(X).columns) == sel.columns_
