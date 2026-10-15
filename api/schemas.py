"""Pydantic models for contract v1.1.0 (v1.0.0 plus the additions listed in api/README.md)."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictFloat, StrictInt, StrictStr

FeatureValue = StrictBool | StrictInt | StrictFloat | StrictStr
Probability = Annotated[float, Field(ge=0, le=1)]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(ContractModel):
    status: Literal["ok", "degraded"]
    model_version: str
    contract_version: str
    mock: bool


class ReferenceRange(ContractModel):
    low: float | None = None
    high: float | None = None


class FeatureSchema(ContractModel):
    name: str = Field(min_length=1)
    label: str
    group: str
    type: Literal["number", "boolean", "categorical"]
    unit: str | None = None
    min: float | None = None
    max: float | None = None
    default: FeatureValue
    options: list[FeatureValue] | None = None
    description: str | None = None
    reference_range: ReferenceRange | None = Field(None, description="Typical adult reference interval (labs differ).")
    modifiable: bool | None = Field(None, description="A risk factor a patient can change (what-if sliders).")


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
    features: dict[str, FeatureValue]
    sample_id: str | None = Field(None, description="Optional id from GET /patients/samples: the patient is scored by "
                                                    "models that never saw them (also detected automatically when the "
                                                    "features match a sample exactly).")


class Target(ContractModel):
    probability: Probability
    label: str
    threshold: Probability
    uncertain: bool = Field(description="True when the model's 90% prediction set contains both answers.")
    capped: bool | None = Field(None, description="Vessels only: the model's vessel estimate exceeded P(CAD) and "
                                                  "was lowered to it.")


class VesselTargets(ContractModel):
    LAD: Target
    LCX: Target
    RCA: Target


class Contribution(ContractModel):
    feature: str
    value: FeatureValue
    contribution: float = Field(description="Change in probability (0.12 = +12 percentage points).")
    direction: Literal["positive", "negative"]


class Explanation(ContractModel):
    base_value: Probability = Field(description="Probability for the reference patient (median measurements, no risk "
                                                "factors or findings).")
    contributions: list[Contribution]
    scale: Literal["probability"] = "probability"
    method: str


class TargetExplanations(ContractModel):
    cad: Explanation
    LAD: Explanation
    LCX: Explanation
    RCA: Explanation


class PredictionResponse(ContractModel):
    request_id: str
    model_version: str
    cad: Target
    vessels: VesselTargets
    explanations: TargetExplanations
    risk_summary: str
    mock: bool
    warnings: list[str]
    derived: dict[str, float | bool]
    prediction_source: str


class TargetMetrics(ContractModel):
    accuracy: Probability
    precision: Probability
    recall: Probability
    f1: Probability
    roc_auc: Probability
    roc_auc_ci95: list[float]
    balanced_accuracy: Probability
    brier: float
    ece: float
    threshold: Probability
    model: str


class TargetMetricsMap(ContractModel):
    cad: TargetMetrics
    LAD: TargetMetrics
    LCX: TargetMetrics
    RCA: TargetMetrics


class MetricsResponse(ContractModel):
    model_version: str
    validation: str
    n_samples: int = Field(ge=1)
    trained_at: str
    targets: TargetMetricsMap
    mock: bool


class FeatureImportance(ContractModel):
    feature: str
    mean_abs_contribution: float = Field(description="Average size of the input's contribution (probability units).")
    share_raising: Probability = Field(description="Share of patients for whom the input raised the probability.")


class ImportanceResponse(ContractModel):
    model_version: str
    n_patients: int
    description: str
    targets: dict[str, list[FeatureImportance]]


class CohortPatient(ContractModel):
    patient: int = Field(ge=1, description="Row number in the dataset (1-based), as in prediction_source.")
    age: int
    sex: Literal["Female", "Male"]
    cad: Probability
    LAD: Probability
    LCX: Probability
    RCA: Probability


class CohortResponse(ContractModel):
    model_version: str
    n_patients: int = Field(ge=1)
    population: str = Field(description="Who the comparison group is (a referral cohort, not the general population).")
    patients: list[CohortPatient]


class ReportFile(ContractModel):
    name: StrictStr = Field(min_length=1, max_length=200)
    media_type: StrictStr
    data: StrictStr = Field(description="The file's bytes, base64-encoded.")


class ExtractRequest(ContractModel):
    files: list[ReportFile] = Field(min_length=1, max_length=4)


class ReportDocument(ContractModel):
    file: str
    kind: str


class ExtractedValue(ContractModel):
    name: str
    label: str
    group: str
    value: FeatureValue
    unit: str | None = None
    as_written: str
    evidence: str
    document: str


class SkippedValue(ContractModel):
    name: str
    label: str
    reason: str
    evidence: str
    document: str


class ExtractResponse(ContractModel):
    documents: list[ReportDocument]
    values: list[ExtractedValue]
    skipped: list[SkippedValue]
    model: str


class SheetRequest(ContractModel):
    name: StrictStr = Field(min_length=1, max_length=200)
    data: StrictStr = Field(description="The file's bytes, base64-encoded.")


class SheetResponse(ContractModel):
    columns: list[str]
    rows: list[list[str]]
