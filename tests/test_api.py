import pytest

from ml.export import MODELS

pytestmark = pytest.mark.skipif(not (MODELS / "demo" / "rca.joblib").exists(), reason="run python -m ml.export first")


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from api.main import app

    return TestClient(app)


def test_health_features_and_samples(client):
    h = client.get("/health").json()
    assert h["mock"] is False and h["contract_version"] == "1.1.0"
    feats = client.get("/features").json()
    names = {f["name"] for f in feats}
    assert not names & {"LAD", "LCX", "RCA", "Cath", "Exertional CP", "BMI", "Obesity"}       # leakage / derived / constant
    assert all(None not in f.values() for f in feats)                                          # optional keys omitted, never null
    bbb = next(f for f in feats if f["name"] == "BBB")
    assert bbb["type"] == "categorical" and bbb["options"] == ["None", "LBBB", "RBBB"]
    samples = client.get("/patients/samples").json()
    assert len(samples) == 8 and not any(s["synthetic"] for s in samples)
    patterns = {(s["ground_truth"]["vessels"]["LAD"], s["ground_truth"]["vessels"]["LCX"],
                 s["ground_truth"]["vessels"]["RCA"]) for s in samples}
    assert len(patterns) == 8                                                                  # every vessel pattern once


def test_predict_is_consistent_additive_and_uses_holdout_models_for_samples(client):
    sample = client.get("/patients/samples").json()[0]
    r = client.post("/predict", json={"features": sample["features"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "trained without this patient" in body["prediction_source"]
    cad = body["cad"]["probability"]
    for key, target in [("cad", body["cad"])] + list(body["vessels"].items()):
        assert target["label"] in ("elevated", "not elevated") and isinstance(target["uncertain"], bool)
        if key != "cad":
            assert target["probability"] <= cad + 1e-9
        e = body["explanations"][key]
        total = e["base_value"] + sum(c["contribution"] for c in e["contributions"])
        assert abs(total - target["probability"]) < 3e-3                                      # exact up to 4-dp rounding
    # editing a value makes it a new patient -> final models
    edited = dict(sample["features"], Age=sample["features"]["Age"] + 1)
    assert "all 303" in client.post("/predict", json={"features": edited}).json()["prediction_source"]


def test_predict_rejects_bad_input(client):
    good = {f["name"]: f["default"] for f in client.get("/features").json()}
    assert client.post("/predict", json={"features": good}).status_code == 200
    for bad in ({**good, "LAD": True}, {k: v for k, v in good.items() if k != "Age"}, {**good, "Age": 150},
                {**good, "BBB": True}, {**good, "VHD": "mild"}):
        r = client.post("/predict", json={"features": bad})
        assert r.status_code == 422 and r.json()["detail"]


def test_metrics(client):
    m = client.get("/model/metrics").json()
    assert m["n_samples"] == 303 and m["trained_at"].endswith("Z") and m["mock"] is False
    assert set(m["targets"]) == {"cad", "LAD", "LCX", "RCA"}
    assert 0.9 < m["targets"]["cad"]["roc_auc"] < 1
