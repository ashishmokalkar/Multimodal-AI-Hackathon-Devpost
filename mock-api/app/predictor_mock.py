from __future__ import annotations

import hashlib
import json
import math
from uuid import NAMESPACE_URL, uuid5

from app.schemas import (
    Contribution,
    Explanation,
    FeatureValue,
    PredictionResponse,
    Target,
    TargetExplanations,
    VesselTargets,
)

MODEL_VERSION = "mock-1.0.0"
THRESHOLD = 0.5

_CONTRIBUTION_WEIGHTS: dict[str, float] = {
    "Typical Chest Pain": 0.16,
    "Age": 0.11,
    "DM": 0.09,
    "HTN": 0.065,
    "EF-TTE": 0.085,
    "Region RWMA": 0.045,
    "Current Smoker": 0.04,
    "FH": 0.035,
    "FBS": 0.025,
    "ST Depression": 0.035,
    "Dyspnea": 0.03,
}


def _canonical_features(features: dict[str, FeatureValue]) -> str:
    return json.dumps(
        features,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )


def _logit_noise(features: dict[str, FeatureValue]) -> float:
    digest = hashlib.sha256(_canonical_features(features).encode("utf-8")).digest()
    integer = int.from_bytes(digest[:4], "big")
    return (integer / 0xFFFFFFFF - 0.5) * 0.002


def _sigmoid(value: float) -> float:
    if value >= 0:
        return 1 / (1 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1 + exp_value)


def _feature_contribution(name: str, value: FeatureValue) -> float:
    weight = _CONTRIBUTION_WEIGHTS.get(name, 0)
    if name == "Age":
        return weight * (float(value) - 55) / 45
    if name == "EF-TTE":
        return weight * (55 - float(value)) / 45
    if name == "Region RWMA":
        return weight * float(value) / 4
    if name == "FBS":
        return weight * (float(value) - 100) / 200
    return weight if bool(value) else 0.0


def _target(probability: float) -> Target:
    return Target(
        probability=round(probability, 4),
        label="elevated" if probability >= THRESHOLD else "not elevated",
        threshold=THRESHOLD,
    )


def _explanation(
    features: dict[str, FeatureValue],
    probability: float,
    scale: float = 1.0,
) -> Explanation:
    contributions = [
        Contribution(
            feature=name,
            value=value,
            contribution=round(_feature_contribution(name, value) * scale, 4),
            direction=(
                "positive"
                if _feature_contribution(name, value) * scale >= 0
                else "negative"
            ),
        )
        for name, value in features.items()
        if name in _CONTRIBUTION_WEIGHTS
    ]
    contributions.sort(key=lambda item: abs(item.contribution), reverse=True)
    return Explanation(
        base_value=round(
            max(
                0.0,
                min(1.0, probability - sum(c.contribution for c in contributions)),
            ),
            4,
        ),
        contributions=contributions[:10],
    )


def predict(features: dict[str, FeatureValue]) -> PredictionResponse:
    age = float(features["Age"])
    typical_chest_pain = bool(features["Typical Chest Pain"])
    diabetes = bool(features["DM"])
    hypertension = bool(features["HTN"])
    ejection_fraction = float(features["EF-TTE"])
    rwma_regions = float(features["Region RWMA"])

    score = (
        -0.15
        + (age - 55) * 0.018
        + typical_chest_pain * 0.9
        + diabetes * 0.4
        + hypertension * 0.3
        + (55 - ejection_fraction) * 0.018
        + rwma_regions * 0.22
        + _logit_noise(features)
    )
    cad_probability = _sigmoid(score)
    cad_target = _target(cad_probability)

    vessel_offsets = {"LAD": 0.08, "LCX": -0.12, "RCA": -0.04}
    vessel_targets = {
        vessel: _target(_sigmoid(score + offset))
        for vessel, offset in vessel_offsets.items()
    }

    explanations = {
        target: _explanation(features, probability, scale)
        for target, probability, scale in [
            ("cad", cad_probability, 1.0),
            ("LAD", vessel_targets["LAD"].probability, 0.9),
            ("LCX", vessel_targets["LCX"].probability, 0.8),
            ("RCA", vessel_targets["RCA"].probability, 0.85),
        ]
    }
    stable_request_id = uuid5(NAMESPACE_URL, _canonical_features(features))

    return PredictionResponse(
        request_id=stable_request_id,
        model_version=MODEL_VERSION,
        cad=cad_target,
        vessels=VesselTargets(**vessel_targets),
        explanations=TargetExplanations(**explanations),
        risk_summary=(
            "Mock elevated CAD risk; this is not a diagnosis."
            if cad_probability >= THRESHOLD
            else "Mock lower CAD risk; this is not a diagnosis."
        ),
        mock=True,
    )
