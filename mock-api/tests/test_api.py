import json
from pathlib import Path

from app.features import FEATURES
from app.main import load_samples
from app.predictor_mock import predict
from app.schemas import (
    FeatureSchema,
    HealthResponse,
    MetricsResponse,
    PredictionResponse,
    SamplePatient,
)

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def test_schema_round_trip_examples() -> None:
    health = HealthResponse.model_validate(
        {
            "status": "ok",
            "model_version": "mock-1.0.0",
            "contract_version": "1.0.0",
            "mock": True,
        }
    )
    feature = FeatureSchema.model_validate(FEATURES[0].model_dump())
    sample = SamplePatient.model_validate(load_samples()[0].model_dump())
    prediction = PredictionResponse.model_validate(
        predict(sample.features).model_dump()
    )
    metrics = MetricsResponse.model_validate(
        json.loads((DATA_DIR / "metrics_mock.json").read_text(encoding="utf-8"))
    )

    assert health.contract_version == "1.0.0"
    assert feature.name == "Age"
    assert sample.synthetic
    assert prediction.mock
    assert metrics.mock


def test_prediction_is_deterministic_for_identical_features() -> None:
    features = load_samples()[0].features

    first = predict(features).model_dump(mode="json")
    second = predict(features).model_dump(mode="json")

    assert first == second


def test_typical_chest_pain_increases_cad_probability() -> None:
    features_without_pain = load_samples()[0].features
    features_without_pain["Typical Chest Pain"] = False
    features_with_pain = features_without_pain | {"Typical Chest Pain": True}

    without_pain = predict(features_without_pain).cad.probability
    with_pain = predict(features_with_pain).cad.probability

    assert with_pain - without_pain >= 0.05

    monotone_cases = [
        ("Age", features_with_pain["Age"] + 1),
        ("DM", True),
        ("HTN", True),
        ("EF-TTE", features_with_pain["EF-TTE"] - 1),
        ("Region RWMA", features_with_pain["Region RWMA"] + 1),
    ]
    for feature, higher_risk_value in monotone_cases:
        baseline = dict(features_without_pain)
        baseline[feature] = (
            False if feature in {"DM", "HTN"} else features_with_pain[feature]
        )
        higher_risk = baseline | {feature: higher_risk_value}
        assert predict(higher_risk).cad.probability > predict(baseline).cad.probability
