from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
)

FeatureValue = StrictBool | StrictFloat | StrictInt | StrictStr
FeatureType = Literal["number", "boolean", "categorical"]
Direction = Literal["positive", "negative"]
Probability = Annotated[float, Field(ge=0, le=1)]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(ContractModel):
    status: Literal["ok", "degraded"]
    model_version: str
    contract_version: str
    mock: bool


class FeatureSchema(ContractModel):
    name: str = Field(min_length=1)
    label: str
    group: str
    type: FeatureType
    unit: str | None = None
    min: float | None = None
    max: float | None = None
    default: FeatureValue
    options: list[FeatureValue] | None = None
    description: str | None = None


class VesselGroundTruth(ContractModel):
    LAD: bool
    LCX: bool
    RCA: bool


class GroundTruth(ContractModel):
    cad: bool
    vessels: VesselGroundTruth


class SamplePatient(ContractModel):
    id: str
    label: str
    features: dict[str, FeatureValue]
    ground_truth: GroundTruth | None = None
    synthetic: bool


class PredictRequest(ContractModel):
    features: dict[str, FeatureValue] = Field(
        description="Exactly the input features returned by GET /features."
    )


class Target(ContractModel):
    probability: Probability
    label: str
    threshold: Probability


class Contribution(ContractModel):
    feature: str
    value: FeatureValue
    contribution: float
    direction: Direction


class Explanation(ContractModel):
    base_value: Probability
    contributions: list[Contribution]


class VesselTargets(ContractModel):
    LAD: Target
    LCX: Target
    RCA: Target


class TargetExplanations(ContractModel):
    cad: Explanation
    LAD: Explanation
    LCX: Explanation
    RCA: Explanation


class PredictionResponse(ContractModel):
    request_id: UUID
    model_version: str
    cad: Target
    vessels: VesselTargets
    explanations: TargetExplanations
    risk_summary: str
    mock: bool


class TargetMetrics(ContractModel):
    accuracy: Probability
    precision: Probability
    recall: Probability
    f1: Probability
    roc_auc: Probability


class TargetMetricsMap(ContractModel):
    cad: TargetMetrics
    LAD: TargetMetrics
    LCX: TargetMetrics
    RCA: TargetMetrics


class MetricsResponse(ContractModel):
    model_version: str
    validation: str
    n_samples: int = Field(ge=1)
    trained_at: datetime
    targets: TargetMetricsMap
    mock: bool


class ValidationErrorItem(ContractModel):
    loc: list[str | int]
    msg: str
    type: str
