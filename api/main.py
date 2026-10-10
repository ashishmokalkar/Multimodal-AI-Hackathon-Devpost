"""CardioTwin real-model API (contract v1.1.0).

Run from the repository root:  uvicorn api.main:app --port 8000
CORS origins: env CARDIOTWIN_CORS_ORIGINS (comma-separated); defaults to the Vite dev server on ports 5173 and 5174.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.explain import explain, predict
from api.features import NAMES, SPECS, from_model_row, public_schema, training_ranges, validate
from api.schemas import (FeatureSchema, HealthResponse, ImportanceResponse, MetricsResponse, PredictionResponse,
                         PredictRequest, SamplePatient)
from ml.data import ROOT, TARGETS, VESSELS

CONTRACT_VERSION = "1.1.0"
DISCLAIMER = ("Decision support only, not a diagnosis; confirm with clinical assessment and diagnostic imaging.")
METHOD = ("Baseline Shapley values on the served probability: each input's average change in probability when it is "
          "switched from the reference patient's value to this patient's value (32 orderings). Contributions add up "
          "exactly to probability minus base_value.")
MODEL_NAMES = {"phase3:ebm": "Explainable Boosting Machine (EBM)",
               "classical:catboost": "CatBoost (gradient-boosted trees)",
               "classical:xgboost": "XGBoost (gradient-boosted trees)",
               "ensemble:lr_stack": "Stacked ensemble of 8 models (logistic regression on their outputs)"}
API_KEYS = {"cad": "cad", "lad": "LAD", "lcx": "LCX", "rca": "RCA"}

app = FastAPI(title="CardioTwin API", version=CONTRACT_VERSION,
              description="Real-model clinical decision-support API. " + DISCLAIMER)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CARDIOTWIN_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,"
                                 "http://localhost:5174,http://127.0.0.1:5174").split(","),
    allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["*"],
)


# ------------------------------------------------------------------------------------------- state (loaded once)
@lru_cache
def state() -> dict:
    from ml.data import load_clean
    from ml.export import MODELS, load_models

    manifest = json.loads((MODELS / "manifest.json").read_text())
    df = load_clean()
    samples = []
    for row in manifest["demo_patients"]["rows"]:
        r = df.iloc[row]
        samples.append({"id": f"patient-{row + 1}",
                        "label": f"Dataset patient {row + 1}: {int(r.age)}-year-old {'man' if r.sex_male else 'woman'}",
                        "features": from_model_row(r),
                        "ground_truth": {"cad": bool(r.cad), "vessels": {"LAD": bool(r.lad), "LCX": bool(r.lcx),
                                                                         "RCA": bool(r.rca)}},
                        "synthetic": False})
    sub = pd.read_csv(ROOT / "reports" / "v2" / "s9" / "s9_subgroups.csv")
    return {"models": load_models(), "demo_models": load_models(demo=True), "manifest": manifest,
            "samples": samples, "sample_ids": {s["id"] for s in samples},
            "sample_keys": {json.dumps(s["features"], sort_keys=True): s["id"] for s in samples},
            "ranges": training_ranges(),
            "auc_65": sub[sub.group == "age>=65"].set_index("target").auc.to_dict()}


# ------------------------------------------------------------------------------------------- endpoints
@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "model_version": state()["manifest"]["model_version"],
            "contract_version": CONTRACT_VERSION, "mock": False}


@app.get("/features", response_model=list[FeatureSchema], response_model_exclude_none=True)
def features():
    return public_schema()


@app.get("/patients/samples", response_model=list[SamplePatient], response_model_exclude_none=True)
def samples():
    return state()["samples"]


@app.post("/predict", response_model=PredictionResponse, response_model_exclude_none=True)
def predict_endpoint(request: PredictRequest):
    s = state()
    errors = validate(request.features)
    if request.sample_id is not None and request.sample_id not in s["sample_ids"]:
        errors.append({"loc": ["body", "sample_id"], "msg": "Unknown sample id", "type": "value_error"})
    if errors:
        return JSONResponse(status_code=422, content={"detail": errors})
    patient = {n: request.features[n] for n in NAMES}
    sample = request.sample_id or s["sample_keys"].get(json.dumps(patient, sort_keys=True))
    models = s["demo_models"] if sample else s["models"]
    probs = {t: float(v[0]) for t, v in predict(models, [patient]).items()}
    uncapped = _uncapped(models, patient)
    expl = explain(models, patient)
    targets = {t: _target(models[t], probs[t], capped=uncapped[t] > uncapped["cad"] if t != "cad" else None)
               for t in TARGETS}
    return {
        "request_id": str(uuid.uuid4()),
        "model_version": s["manifest"]["model_version"],
        "cad": targets["cad"],
        "vessels": {API_KEYS[v]: targets[v] for v in VESSELS},
        "explanations": {API_KEYS[t]: _explanation(expl[t], patient) for t in TARGETS},
        "risk_summary": _summary(targets),
        "mock": False,
        "warnings": _warnings(patient, s),
        "derived": _derived(patient),
        "prediction_source": (f"Dataset patient {sample.split('-')[1]}: scored by models trained without this patient"
                              if sample else "Final models trained on all 303 patients"),
    }


@app.get("/model/metrics", response_model=MetricsResponse)
def metrics():
    m = state()["manifest"]
    out = {}
    for t in TARGETS:
        v = m["targets"][t]["validation"]
        thr, cal = v["threshold_rule_r5r9"], v["calibrated_r5r9"]
        out[API_KEYS[t]] = {"accuracy": thr["accuracy"], "precision": thr["precision"], "recall": thr["recall"],
                            "f1": thr["f1"], "roc_auc": v["auc_r5r9"], "roc_auc_ci95": v["auc_r5r9_ci95"],
                            "balanced_accuracy": thr["balanced_acc"], "brier": cal["brier"], "ece": cal["ece"],
                            "threshold": thr["threshold"], "model": MODEL_NAMES.get(m["targets"][t]["option"],
                                                                                    m["targets"][t]["option"])}
    trained = datetime.fromisoformat(m["created"]).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"model_version": m["model_version"],
            "validation": (m["validation"] + ". Accuracy, precision, recall and F1 at each target's threshold "
                           "(maximum balanced accuracy, Platt-calibrated). ROC-AUC with 95% patient-bootstrap CI."),
            "n_samples": m["n_patients"], "trained_at": trained, "targets": out, "mock": False}


@app.get("/model/importance", response_model=ImportanceResponse)
def importance():
    """What each model generally relies on: average contribution size over the 303 dataset patients
    (precomputed by `python -m api.importance`)."""
    from ml.export import MODELS

    data = json.loads((MODELS / "importance.json").read_text())
    return {**data, "targets": {API_KEYS[t]: rows for t, rows in data["targets"].items()}}


# ------------------------------------------------------------------------------------------- helpers
def _target(model, p: float, capped: bool | None = None) -> dict:
    return {"probability": round(p, 4), "label": "elevated" if p >= model.threshold else "not elevated",
            "threshold": round(model.threshold, 4), "uncertain": len(model.conformal_set([p])[0]) != 1,
            "capped": capped}


def _uncapped(models: dict, patient: dict) -> dict:
    from api.features import to_model_frame

    X = to_model_frame([patient])
    return {t: float(models[t].predict_proba(X)[0]) for t in TARGETS}


def _explanation(e: dict, patient: dict) -> dict:
    items = sorted(((n, c) for n, c in e["contributions"].items() if abs(c) >= 1e-6), key=lambda x: -abs(x[1]))
    return {"base_value": round(e["base_value"], 4), "scale": "probability", "method": METHOD,
            "contributions": [{"feature": n, "value": patient[n], "contribution": round(c, 4),
                               "direction": "positive" if c > 0 else "negative"} for n, c in items]}


def _summary(targets: dict) -> str:
    cad = targets["cad"]
    side = "above" if cad["label"] == "elevated" else "below"
    text = (f"Estimated chance of significant coronary artery disease (at least 50% narrowing): "
            f"{cad['probability']:.0%}, {side} the {cad['threshold']:.0%} decision threshold.")
    high = sorted((v for v in VESSELS if targets[v]["label"] == "elevated"), key=lambda v: -targets[v]["probability"])
    if high:
        text += " Arteries flagged: " + ", ".join(f"{API_KEYS[v]} {targets[v]['probability']:.0%}" for v in high) + "."
    else:
        text += " No individual artery is above its threshold."
    unsure = [API_KEYS[t] for t in TARGETS if targets[t]["uncertain"]]
    if unsure:
        text += " The model cannot call these confidently: " + ", ".join(unsure) + "."
    return text + " " + DISCLAIMER


def _warnings(patient: dict, s: dict) -> list[str]:
    out = []
    for name, (lo, hi) in s["ranges"].items():
        v, f = patient[name], SPECS[name]
        if not lo <= v <= hi:
            out.append(f"{f['label']} {v:g} {f['unit']} is outside the range seen in the training data "
                       f"({lo:g}-{hi:g} {f['unit']}); this estimate is less reliable.")
    if patient["Age"] >= 65:
        auc = s["auc_65"]
        out.append("Validated accuracy is lower for patients aged 65 or over (ROC-AUC CAD "
                   f"{auc['cad']:.2f}, LAD {auc['lad']:.2f}, LCX {auc['lcx']:.2f}, RCA {auc['rca']:.2f}).")
    if patient["Lymph"] + patient["Neut"] > 100:
        out.append("Lymphocyte and neutrophil percentages add up to more than 100%; please check these values.")
    return out


def _derived(patient: dict) -> dict:
    bmi = patient["Weight"] / (patient["Length"] / 100) ** 2
    return {"BMI": round(bmi, 1), "Obesity": bool(bmi > 25)}
