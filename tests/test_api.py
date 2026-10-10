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
    assert h["status"] == "ok"
    assert h["mock"] is False and h["contract_version"] == "1.1.0"
    assert h["model_version"] == "cardiotwin-v2.0.0"
    feats = client.get("/features").json()
    names = {f["name"] for f in feats}
    assert len(feats) == len(names) == 49
    assert not names & {"LAD", "LCX", "RCA", "Cath", "Exertional CP", "BMI", "Obesity"}       # leakage / derived / constant
    assert all(None not in f.values() for f in feats)                                          # optional keys omitted, never null
    bbb = next(f for f in feats if f["name"] == "BBB")
    assert bbb["type"] == "categorical" and bbb["options"] == ["None", "LBBB", "RBBB"]
    assert next(f for f in feats if f["name"] == "VHD")["options"] == ["None", "Mild", "Moderate", "Severe"]
    assert next(f for f in feats if f["name"] == "Function Class")["options"] == [0, 1, 2, 3]
    assert next(f for f in feats if f["name"] == "Chest Pain")["options"] == ["None", "Typical", "Atypical", "Non-anginal"]
    assert next(f for f in feats if f["name"] == "Smoking")["options"] == ["Never", "Former", "Current"]
    assert next(f for f in feats if f["name"] == "WBC")["unit"] == "x10^3/uL"
    samples = client.get("/patients/samples").json()
    assert len(samples) == len({s["id"] for s in samples}) == 8
    assert not any(s["synthetic"] for s in samples)
    assert all(len(s["features"]) == 49 for s in samples)
    patterns = {(s["ground_truth"]["vessels"]["LAD"], s["ground_truth"]["vessels"]["LCX"],
                 s["ground_truth"]["vessels"]["RCA"]) for s in samples}
    assert len(patterns) == 8                                                                  # every vessel pattern once


def test_all_final_and_demo_models_load(client):
    from api.main import state

    models = state()
    assert set(models["models"]) == {"cad", "lad", "lcx", "rca"}
    assert set(models["demo_models"]) == {"cad", "lad", "lcx", "rca"}


def test_predict_is_consistent_additive_and_uses_holdout_models_for_samples(client):
    samples = client.get("/patients/samples").json()
    responses = []
    observed_uncertainty = set()

    for sample in samples:
        r = client.post(
            "/predict",
            json={"features": sample["features"], "sample_id": sample["id"]},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "trained without this patient" in body["prediction_source"]
        assert body["mock"] is False
        responses.append(body)

    sample = samples[0]
    original = responses[0]
    options = ["None", "Typical", "Atypical", "Non-anginal"]
    edited_features = dict(sample["features"])
    edited_features["Chest Pain"] = next(
        option for option in options if option != sample["features"]["Chest Pain"]
    )
    edited = client.post(
        "/predict",
        json={"features": edited_features, "sample_id": sample["id"]},
    )
    assert edited.status_code == 200, edited.text
    edited_body = edited.json()
    assert edited_body["request_id"] != original["request_id"]
    assert edited_body["prediction_source"] == original["prediction_source"]
    assert any(
        edited_body["cad"]["probability"] != original["cad"]["probability"]
        or edited_body["vessels"][vessel]["probability"]
        != original["vessels"][vessel]["probability"]
        for vessel in ("LAD", "LCX", "RCA")
    )
    responses.append(edited_body)

    for body in responses:
        cad = body["cad"]["probability"]
        for key, target in [("cad", body["cad"])] + list(body["vessels"].items()):
            assert target["label"] in ("elevated", "not elevated")
            assert isinstance(target["uncertain"], bool)
            observed_uncertainty.add(target["uncertain"])
            if key != "cad":
                assert target["probability"] <= cad + 1e-9
            explanation = body["explanations"][key]
            assert explanation["scale"] == "probability"
            total = explanation["base_value"] + sum(
                item["contribution"] for item in explanation["contributions"]
            )
            assert abs(total - target["probability"]) < 3e-3  # API rounds to 4 dp

    assert observed_uncertainty == {False, True}

    # Without the sample origin, an edited scenario is scored by final models.
    final_body = client.post(
        "/predict",
        json={"features": edited_features},
    ).json()
    assert "all 303 patients" in final_body["prediction_source"]
    assert any(target["threshold"] != 0.5 for target in [
        final_body["cad"],
        *final_body["vessels"].values(),
    ])


def test_predict_rejects_bad_input(client):
    good = {f["name"]: f["default"] for f in client.get("/features").json()}
    assert client.post("/predict", json={"features": good}).status_code == 200
    for bad in ({**good, "LAD": True}, {k: v for k, v in good.items() if k != "Age"}, {**good, "Age": 150},
                {**good, "BBB": True}, {**good, "VHD": "mild"}):
        r = client.post("/predict", json={"features": bad})
        assert r.status_code == 422 and r.json()["detail"]


def test_warnings_derived_values_and_no_warning_response(client):
    features = {
        feature["name"]: feature["default"]
        for feature in client.get("/features").json()
    }
    response = client.post("/predict", json={"features": features})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["warnings"] == []
    expected_bmi = features["Weight"] / (features["Length"] / 100) ** 2
    assert body["derived"]["BMI"] == round(expected_bmi, 1)
    assert body["derived"]["Obesity"] is (expected_bmi > 25)

    warning_features = dict(features, Age=100, Lymph=75, Neut=50)
    warned = client.post("/predict", json={"features": warning_features})
    assert warned.status_code == 200, warned.text
    warnings = warned.json()["warnings"]
    assert warnings
    assert any("outside the range seen in the training data" in item for item in warnings)
    assert any("65 or over" in item for item in warnings)
    assert any("add up to more than 100%" in item for item in warnings)


def test_metrics(client):
    m = client.get("/model/metrics").json()
    assert m["n_samples"] == 303 and m["trained_at"].endswith("Z") and m["mock"] is False
    assert set(m["targets"]) == {"cad", "LAD", "LCX", "RCA"}
    assert 0.9 < m["targets"]["cad"]["roc_auc"] < 1
    for target in m["targets"].values():
        assert len(target["roc_auc_ci95"]) == 2
        assert target["roc_auc_ci95"][0] <= target["roc_auc_ci95"][1]
        assert target["model"]
        assert target["threshold"] != 0.5


def test_reference_ranges_capping_flag_and_global_importance(client):
    feats = {f["name"]: f for f in client.get("/features").json()}
    assert feats["LDL"]["reference_range"] == {"high": 100} and feats["LDL"]["modifiable"] is True
    assert "reference_range" not in feats["Age"] and "modifiable" not in feats["Age"]     # omitted, never null
    body = client.post("/predict", json={"features": {n: f["default"] for n, f in feats.items()}}).json()
    assert "capped" not in body["cad"] and all(isinstance(v["capped"], bool) for v in body["vessels"].values())
    imp = client.get("/model/importance").json()
    assert set(imp["targets"]) == {"cad", "LAD", "LCX", "RCA"} and imp["n_patients"] == 303
    assert len(imp["targets"]["cad"]) == len(feats)
