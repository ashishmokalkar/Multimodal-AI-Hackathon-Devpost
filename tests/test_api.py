import pytest

from api.main import FEATURED
from ml.export import MODELS

pytestmark = pytest.mark.skipif(not (MODELS / "rca.joblib").exists(), reason="run python -m ml.export first")


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
    assert [s["id"] for s in samples] == [f"patient-{n}" for n in FEATURED]
    assert not any(s["synthetic"] for s in samples)
    dataset = client.get("/patients/dataset").json()
    assert [s["id"] for s in dataset] == [f"patient-{n}" for n in range(1, 304)]
    assert all(s in dataset for s in samples)                                                  # featured = dataset rows
    assert sum(s["ground_truth"]["cad"] for s in dataset) > 0 and not any(s["synthetic"] for s in dataset)
    # any dataset patient can be sent as sample_id
    last = dataset[-1]
    assert client.post("/predict", json={"features": last["features"], "sample_id": last["id"]}).status_code == 200


def test_predict_is_consistent_additive_and_uses_holdout_models_for_dataset_patients(client):
    sample = client.get("/patients/samples").json()[0]
    r = client.post("/predict", json={"features": sample["features"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "never saw this patient" in body["prediction_source"]
    cad = body["cad"]["probability"]
    for key, target in [("cad", body["cad"])] + list(body["vessels"].items()):
        assert target["label"] in ("elevated", "not elevated") and isinstance(target["uncertain"], bool)
        if key != "cad":
            assert target["probability"] <= cad + 1e-9
        e = body["explanations"][key]
        total = e["base_value"] + sum(c["contribution"] for c in e["contributions"])
        assert abs(total - target["probability"]) < 3e-3                                      # exact up to 4-dp rounding
    # a small edit is still scored by the model that never saw that patient (no memorised answer), and the
    # response says it was edited even when the client still sends the sample id
    edited = dict(sample["features"], Age=sample["features"]["Age"] + 1)
    e = client.post("/predict", json={"features": edited, "sample_id": sample["id"]}).json()
    assert e["prediction_source"].startswith("Edited dataset patient")
    for key in ("LAD", "LCX", "RCA"):
        assert abs(e["vessels"][key]["probability"] - body["vessels"][key]["probability"]) < 0.1


def test_number_formatting_does_not_change_the_model(client):
    sample = client.get("/patients/samples").json()[0]
    numbers = {f["name"] for f in client.get("/features").json() if f["type"] == "number"}
    as_float = {k: float(v) if k in numbers else v for k, v in sample["features"].items()}       # 72 -> 72.0
    a = client.post("/predict", json={"features": sample["features"]}).json()
    b = client.post("/predict", json={"features": as_float}).json()
    assert "prediction_source" in b, b
    assert a["prediction_source"] == b["prediction_source"]
    assert a["vessels"]["LAD"]["probability"] == b["vessels"]["LAD"]["probability"]


def test_served_models_do_not_memorise_dataset_patients():
    from sklearn.metrics import roc_auc_score

    from ml.data import TARGETS, load_clean
    from ml.export import load_models, predict_all

    df = load_clean()
    p = predict_all(load_models(), df)
    for t in TARGETS:
        assert roc_auc_score(df[t], p[t]) < 0.97, t                    # memorising models score ~1.0 here


def test_artery_is_never_flagged_without_cad_and_uncertainty_uses_served_probability():
    import numpy as np

    from ml.data import TARGETS, VESSELS, load_clean
    from ml.export import decide, load_models, predict_all

    models, df = load_models(), load_clean()
    rng = np.random.default_rng(0)
    rows = df.sample(300, replace=True, random_state=0).reset_index(drop=True)
    for c in ("age", "bp", "fbs", "tg", "ldl", "hdl"):
        rows[c] = rows[c] * rng.uniform(0.7, 1.3, len(rows))
    p = predict_all(models, rows)
    flags = decide(p, {t: models[t].threshold for t in TARGETS})
    for v in VESSELS:
        assert not (flags[v] & ~flags["cad"]).any()
        assert (p[v] <= p["cad"] + 1e-12).all()


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


def test_reference_ranges_capping_flag_and_global_importance(client):
    feats = {f["name"]: f for f in client.get("/features").json()}
    assert feats["LDL"]["reference_range"] == {"high": 100} and feats["LDL"]["modifiable"] is True
    assert "reference_range" not in feats["Age"] and "modifiable" not in feats["Age"]     # omitted, never null
    body = client.post("/predict", json={"features": {n: f["default"] for n, f in feats.items()}}).json()
    assert "capped" not in body["cad"] and all(isinstance(v["capped"], bool) for v in body["vessels"].values())
    imp = client.get("/model/importance").json()
    assert set(imp["targets"]) == {"cad", "LAD", "LCX", "RCA"} and imp["n_patients"] == 303
    assert len(imp["targets"]["cad"]) == len(feats)


def test_cohort_matches_what_predict_serves_for_dataset_patients(client):
    cohort = client.get("/cohort").json()
    assert cohort["n_patients"] == len(cohort["patients"]) == 303
    assert cohort["model_version"] == client.get("/health").json()["model_version"]
    by_row = {p["patient"]: p for p in cohort["patients"]}
    for sample in client.get("/patients/samples").json()[:3]:
        row = by_row[int(sample["id"].split("-")[1])]
        body = client.post("/predict", json={"features": sample["features"]}).json()
        assert (row["age"], row["sex"]) == (sample["features"]["Age"], sample["features"]["Sex"])
        assert abs(row["cad"] - body["cad"]["probability"]) < 1e-3
        assert all(abs(row[v] - body["vessels"][v]["probability"]) < 1e-3 for v in ("LAD", "LCX", "RCA"))
