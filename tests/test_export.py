import numpy as np
import pytest

from ml.export import MODELS, load_models, predict_all

pytestmark = pytest.mark.skipif(not (MODELS / "manifest.json").exists(), reason="run python -m ml.export first")


def test_exported_models_predict_consistent_calibrated_probabilities():
    from ml.data import TARGETS, VESSELS, load_clean

    df = load_clean().head(20)
    models = load_models()
    p = predict_all(models, df)
    for t in TARGETS:
        assert p[t].shape == (20,) and ((p[t] > 0) & (p[t] < 1)).all()
        assert 0 < models[t].threshold < 1 and 0 < models[t].conformal_q <= 1
    for v in VESSELS:
        assert (p[v] <= p["cad"] + 1e-12).all()
    # a single patient scores exactly as in the batch, and leakage columns are never needed
    one = predict_all(models, df.iloc[[3]].drop(columns=TARGETS))
    assert all(np.isclose(one[t][0], p[t][3]) for t in TARGETS)
    sets = models["cad"].conformal_set(p["cad"])
    assert all(set(s) <= {0, 1} for s in sets)
