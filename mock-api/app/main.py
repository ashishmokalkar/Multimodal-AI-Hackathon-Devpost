from __future__ import annotations

import json
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.features import FEATURES, default_feature_values
from app.predictor_mock import MODEL_VERSION, predict
from app.schemas import (
    FeatureSchema,
    FeatureValue,
    HealthResponse,
    MetricsResponse,
    PredictionResponse,
    PredictRequest,
    SamplePatient,
)

CONTRACT_VERSION = "1.0.0"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

app = FastAPI(
    title="CardioClarity API",
    version=CONTRACT_VERSION,
    description=(
        "Clinical decision-support API contract; mock responses are illustrative."
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def load_samples() -> list[SamplePatient]:
    sample_data = json.loads((DATA_DIR / "samples.json").read_text(encoding="utf-8"))
    defaults = default_feature_values()
    patients = []
    for patient in sample_data:
        features = defaults | patient["features"]
        patients.append(SamplePatient.model_validate(patient | {"features": features}))
    return patients


PREDICT_BODY = Body(
    openapi_examples={
        "samplePatient": {
            "summary": "Complete patient feature set",
            "value": {"features": load_samples()[0].features},
        }
    }
)


def validate_features(features: dict[str, FeatureValue]) -> None:
    feature_by_name = {feature.name: feature for feature in FEATURES}
    expected_names = set(feature_by_name)
    missing = sorted(expected_names - features.keys())
    unknown = sorted(features.keys() - expected_names)
    errors: list[dict[str, object]] = []

    for name in missing:
        errors.append(
            {
                "loc": ["body", "features", name],
                "msg": "Field required",
                "type": "missing",
            }
        )
    for name in unknown:
        errors.append(
            {
                "loc": ["body", "features", name],
                "msg": "Extra inputs are not permitted",
                "type": "extra_forbidden",
            }
        )

    for name, value in features.items():
        feature = feature_by_name.get(name)
        if feature is None:
            continue

        invalid_message = None
        if feature.type == "number":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                invalid_message = "Input should be a valid number"
            elif feature.min is not None and value < feature.min:
                invalid_message = (
                    f"Input should be greater than or equal to {feature.min}"
                )
            elif feature.max is not None and value > feature.max:
                invalid_message = f"Input should be less than or equal to {feature.max}"
        elif feature.type == "boolean":
            if not isinstance(value, bool):
                invalid_message = "Input should be a valid boolean"
        elif feature.options is not None and value not in feature.options:
            invalid_message = f"Input should be one of {feature.options}"

        if invalid_message is not None:
            errors.append(
                {
                    "loc": ["body", "features", name],
                    "msg": invalid_message,
                    "type": "value_error",
                }
            )

    if errors:
        raise HTTPException(status_code=422, detail=errors)


@app.get(
    "/health",
    response_model=HealthResponse,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "model_version": MODEL_VERSION,
                        "contract_version": CONTRACT_VERSION,
                        "mock": True,
                    }
                }
            }
        }
    },
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_version=MODEL_VERSION,
        contract_version=CONTRACT_VERSION,
        mock=True,
    )


@app.get(
    "/features",
    response_model=list[FeatureSchema],
    response_model_exclude_none=True,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": [
                        FEATURES[0].model_dump(exclude_none=True),
                        FEATURES[24].model_dump(exclude_none=True),
                    ]
                }
            }
        }
    },
)
def get_features() -> list[FeatureSchema]:
    return FEATURES


@app.get(
    "/patients/samples",
    response_model=list[SamplePatient],
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": load_samples()[:1][0].model_dump(mode="json")
                }
            }
        }
    },
)
def get_samples() -> list[SamplePatient]:
    return load_samples()


@app.get("/patients/dataset", response_model=list[SamplePatient])
def get_dataset() -> list[SamplePatient]:
    """The mock has no dataset: its full list is the same synthetic samples."""
    return load_samples()


@app.post(
    "/predict",
    response_model=PredictionResponse,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "request_id": "095e7b1f-22f0-4ef0-9d30-310f769c2847",
                        "model_version": MODEL_VERSION,
                        "cad": {
                            "probability": 0.82,
                            "label": "elevated",
                            "threshold": 0.5,
                        },
                        "vessels": {
                            vessel: {
                                "probability": probability,
                                "label": "elevated",
                                "threshold": 0.5,
                            }
                            for vessel, probability in [
                                ("LAD", 0.74),
                                ("LCX", 0.63),
                                ("RCA", 0.58),
                            ]
                        },
                        "explanations": {
                            "cad": {
                                "base_value": 0.38,
                                "contributions": [
                                    {
                                        "feature": "Typical Chest Pain",
                                        "value": True,
                                        "contribution": 0.21,
                                        "direction": "positive",
                                    }
                                ],
                            },
                            **{
                                vessel: {"base_value": 0.3, "contributions": []}
                                for vessel in ("LAD", "LCX", "RCA")
                            },
                        },
                        "risk_summary": (
                            "Mock elevated CAD risk; this is not a diagnosis."
                        ),
                        "mock": True,
                    }
                }
            }
        }
    },
)
def post_predict(
    request: PredictRequest = PREDICT_BODY,
) -> PredictionResponse:
    validate_features(request.features)
    return predict(request.features)


@app.get(
    "/model/metrics",
    response_model=MetricsResponse,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": json.loads(
                        (DATA_DIR / "metrics_mock.json").read_text(encoding="utf-8")
                    )
                }
            }
        }
    },
)
def get_metrics() -> MetricsResponse:
    metric_data = json.loads(
        (DATA_DIR / "metrics_mock.json").read_text(encoding="utf-8")
    )
    return MetricsResponse.model_validate(metric_data)
