# CAD Risk Visualizer API Contract

**Profiles:** mock `1.0.0`; H-approved real serving `1.1.0` (D-038).

**Base URL (one selected local service at a time):** `http://localhost:8000`

**OpenAPI:** `3.1.0`

This document is the frontend/backend boundary. The mock server's Pydantic
models remain the source for the v1.0 examples below. Real serving schemas
come from `api/schemas.py` at the approved ML source pin; their generated
OpenAPI must agree with the real-profile section. Feature names identify
input values and are case-sensitive. The four dataset targets (`Cath`, `LAD`,
`LCX`, and `RCA`) are never accepted as model inputs.

All probabilities, labels, thresholds, and explanations are model outputs for
decision support only. A probability is not a diagnosis. Responses from the
local stub set `mock` to `true`.

## Endpoints

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /health` | No request body. | `HealthResponse`, including the contract version. |
| `GET /features` | No request body. | An array of `FeatureSchema` objects used to construct the patient form. |
| `GET /patients/samples` | No request body. | An array of sample patients; `synthetic` identifies generated examples. |
| `POST /predict` | `PredictRequest` containing a `features` object. | `PredictionResponse` with CAD and per-vessel targets and signed contributions. |
| `GET /model/metrics` | No request body. | `MetricsResponse` with validation metrics for CAD and each vessel. |

Feature values are JSON booleans for boolean features, numbers for numeric
features, and strings (or numbers when listed in `options`) for categorical
features. The `name` property is the stable feature key. `min`, `max`, `unit`,
`options`, and `description` are omitted when they do not apply.

`POST /predict` returns HTTP 422 with FastAPI's `{ "detail": ... }` error shape
when a feature is missing, unknown, or outside its declared domain. Additional
unknown feature keys are rejected to prevent accidental target leakage.

## Versioning & change process

M proposes a contract change → H approves → both sides update their
implementation and this document. Every response from `GET /health` includes
the `contract_version` string, which changes when a backwards-incompatible
contract change is approved. The frontend and backend must not silently
interpret different contract versions.

## Approved real serving profile v1.1.0 (D-038)

Source pin: `6d3e403ffae65857124929335bbc534e8fd116c4` on `ML-dev`.
Read `handover_docs/ML_ANSWERS_FOR_FRONTEND.md`, `api/README.md`,
`api/schemas.py`, `api/main.py` and `models/manifest.json` at that pin.
H approved adopting this profile at Gate R. At approval, frontend/runtime
implementation and real-output verification remained Phase 3 work.

All five endpoint paths and existing required response fields are retained.
The input feature vocabulary/domains differ from mock v1.0 even though the
metadata container shape is unchanged: do not interpret this as a base-URL-only
semantic swap. Health must identify a supported profile/mode; real responses
require the new fields below rather than silently defaulting or stripping them.
Legacy mock responses may omit them and retain explicit mock qualifications.
Do not reuse cached mock form/sample/result data across profiles or fall back
to mock after real validation/network failures.

### Input metadata

`GET /features` returns 49 unique frontend-facing inputs with names, types,
options, units, defaults and plausibility bounds. It is the form's authority.
The backend converts inputs to model encodings exactly once.

| Input | Real profile |
| --- | --- |
| BBB | `None`, `LBBB`, `RBBB` |
| VHD | `None`, `Mild`, `Moderate`, `Severe` |
| Function Class | Categorical numeric options `0`, `1`, `2`, `3` |
| Chest Pain | One choice: `None`, `Typical`, `Atypical`, `Non-anginal` |
| Smoking | One choice: `Never`, `Former`, `Current` |
| WBC | x10^3/uL; no frontend multiplication/conversion |
| BMI, Obesity | Not inputs; returned read-only in `derived` |
| Exertional CP | Removed constant, not an input |

All 49 inputs are required. Unknown/missing keys, leakage targets and invalid
types/categories/plausibility bounds return 422 with `{detail: [...]}`.
Plausible values outside training ranges may succeed with warnings.
Reference defaults are median/No/none demonstration values, not patient
measurements or permission to fill missing imported data silently.

### Requests and sample provenance

Real `PredictRequest` is `{features, sample_id?: string}`; omit absent IDs
rather than sending a real-only field to the strict v1.0 mock.
A valid ID from the eight `synthetic: false` real samples selects demo models
refitted without those eight patients, including for changed feature values.
Unchanged feature matches are also detected automatically by the backend.
Changed samples without `sample_id` use final models; unknown IDs return 422.

For paired what-if comparisons the frontend retains the real sample origin
through edits and snapshots `sample_id` together with features at request
start. Reset/custom start clears origin and another sample replaces it.
Display an edited scenario and its response-provided model provenance; original
sample ground truth is not ground truth for edited inputs.

### Required real response additions

| Object | Field | Meaning/validation |
| --- | --- | --- |
| Target | `uncertain: boolean` | Model prediction-set uncertainty; display text/static non-colour cue, not an error or fabricated interval |
| Explanation | `scale: "probability"` | Signed probability-scale attribution |
| Explanation | `method: string` | Baseline Shapley method on served probability, 32 orderings |
| PredictionResponse | `warnings: string[]` | Explicit training-range/reliability/input-consistency cautions |
| PredictionResponse | `derived: {BMI: number, Obesity: boolean}` | Returned derived values; Obesity is dataset BMI >25 coding, not a clinical diagnosis |
| PredictionResponse | `prediction_source: string` | Actual final/demo fitting-set provenance; keep visible alongside model version |
| TargetMetrics | `roc_auc_ci95: number[2]` | Ordered finite 95% AUC interval in 0-1 |
| TargetMetrics | `balanced_accuracy`, `brier`, `ece` | Finite returned validation metrics; probability metrics in their valid domains |
| TargetMetrics | `threshold: number`, `model: string` | Reported validation threshold and estimator name; threshold in 0-1 |

The response retains a UUID `request_id` and `mock: false`.
`/health` reports `contract_version: "1.1.0"` and the initial model version
`cardiotwin-v2.0.0`. Model version alone does not identify the final/demo fitting
set. Unsupported/inconsistent profile or missing/invalid required real fields
is a visible validation failure, not a success-shaped fallback.

Use returned target probabilities, labels and thresholds. Initial manifest
thresholds are approximately CAD 0.689, LAD 0.550, LCX 0.324, RCA 0.357;
do not hard-code these or assume 0.5. Vessel probabilities are capped at CAD.
The chance of significant stenosis is not its percentage narrowing/severity.

**Warning presentation (D-041):** For an accepted real response, show warning
existence/count beside the probability/source summary without panel scrolling
at both approved desktop viewports. Keep non-empty response cautions in native,
keyboard-operable disclosure details. An empty list is explicitly “none
returned,” not clinical reassurance; mock v1.0 displays that real-model warning
assessment is unavailable. Clear all warning UI with prediction invalidation.

### Attribution display and rounding

The explained quantity is the served calibrated probability, including vessel
capping. `base_value` is the model risk for the reference inputs, not a measured
population prevalence. `0.12` means `+12 percentage points`, not a 12% relative
change or causal treatment effect.

Validate real scale/method and the complete returned list before claiming
additivity: for each target,
`abs(base_value + sum(contributions) - probability) < 0.003`.
This allows four-decimal API rounding; it is not permission to fabricate
residuals. The top-ten chart is explicitly a subset, not an additive waterfall.
Mock/unconfirmed scale remains in qualified model units.

### Metrics provenance

Metrics are reported cross-validation results from the manifest, not newly
measured frontend accuracy, in-sample fit or clinical validation. Display model,
validation method, cohort size/date, CI and available metrics as returned.
`TargetMetrics.threshold` is a CV-summary validation threshold and may differ
from `Target.threshold` for the current prediction. Label them distinctly.
Shared version strings do not prove that demo refits have separately matching
validation. Preserve the report's prior-selection/ensemble-optimism caveats;
do not conflate headline AUC with pooled calibrated AUC or substitute in-sample
AUC. Existing mismatch/mock/loading/error qualifications still apply.

### Phase 3 local implementation status (2026-10-10; Human Gate 3 pending)

The frontend now validates the supported mock `1.0.0` and real `1.1.0` health
profiles and their required response additions; it does not fall back between
services or reuse patient/result data across profiles. The pinned runtime and
all five endpoints were verified in Ubuntu 24.04 WSL 2 with Python 3.11.9,
including Windows localhost/CORS. Live workflow, provenance, warning,
uncertainty, metrics, viewport and active-orbit evidence is under
`docs/evidence/s3p3-*`. This records local integration only: matching version
strings do not independently validate demo refits, and no clinical validity
or deployment claim is made. Human Gate 3 remains for H's review.

## OpenAPI 3.1 - preserved mock v1.0.0 profile

The examples below are canonical JSON examples. GET operations have no JSON
request body. The mock dataset marks all five generated patients as synthetic.

```yaml
openapi: 3.1.0
info:
  title: CAD Risk Visualizer API
  version: 1.0.0
  description: Clinical decision-support API contract; mock responses are illustrative.
servers:
  - url: http://localhost:8000
paths:
  /health:
    get:
      operationId: getHealth
      summary: Check API and contract version
      responses:
        "200":
          description: API health and model mode
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthResponse"
              example:
                status: ok
                model_version: mock-1.0.0
                contract_version: 1.0.0
                mock: true
  /features:
    get:
      operationId: getFeatures
      summary: Return features available to the prediction model
      responses:
        "200":
          description: Data-driven patient form schema
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/FeatureSchema"
              example:
                - name: Age
                  label: Age
                  group: Demographics
                  type: number
                  unit: years
                  min: 18
                  max: 100
                  default: 55
                  description: Patient age in completed years.
                - name: Typical Chest Pain
                  label: Typical Chest Pain
                  group: Symptoms/Exam
                  type: boolean
                  default: false
                  description: Typical anginal chest pain reported by the patient.
  /patients/samples:
    get:
      operationId: getSamplePatients
      summary: Return example patients for the demo
      responses:
        "200":
          description: Sample patients and optional known ground truth
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/SamplePatient"
              example:
                - id: sample-1
                  label: Sample patient 1
                  synthetic: true
                  features:
                    Age: 67
                    Weight: 75
                    Length: 165
                    Sex: Female
                    BMI: 29
                    DM: true
                    HTN: true
                    Current Smoker: false
                    Ex-Smoker: false
                    FH: true
                    Obesity: false
                    CRF: false
                    CVA: false
                    Airway: false
                    Thyroid Disease: false
                    CHF: false
                    DLP: false
                    BP: 148
                    PR: 80
                    Edema: false
                    Weak Peripheral Pulse: false
                    Lung rales: false
                    Systolic Murmur: false
                    Diastolic Murmur: false
                    Typical Chest Pain: true
                    Dyspnea: true
                    Function Class: 2
                    Atypical: false
                    Nonanginal: false
                    Exertional CP: false
                    LowTH Ang: false
                    Q Wave: false
                    ST Elevation: false
                    ST Depression: true
                    T inversion: false
                    LVH: false
                    Poor R Progression: false
                    BBB: false
                    FBS: 155
                    CR: 1
                    TG: 150
                    LDL: 142
                    HDL: 45
                    BUN: 18
                    ESR: 12
                    HB: 14
                    K: 4.2
                    Na: 140
                    WBC: 7.5
                    Lymph: 30
                    Neut: 60
                    PLT: 250
                    EF-TTE: 48
                    Region RWMA: 1
                    VHD: false
                  ground_truth:
                    cad: true
                    vessels:
                      LAD: true
                      LCX: false
                      RCA: false
  /predict:
    post:
      operationId: predict
      summary: Predict CAD and per-vessel risk from patient features
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PredictRequest"
            example:
              features:
                Age: 67
                Sex: Female
                Typical Chest Pain: true
                DM: true
                HTN: true
                Weight: 75
                Length: 165
                BMI: 29
                Current Smoker: false
                Ex-Smoker: false
                FH: true
                Obesity: false
                CRF: false
                CVA: false
                Airway: false
                Thyroid Disease: false
                CHF: false
                DLP: false
                BP: 148
                PR: 80
                Edema: false
                Weak Peripheral Pulse: false
                Lung rales: false
                Systolic Murmur: false
                Diastolic Murmur: false
                Dyspnea: true
                Function Class: 2
                Atypical: false
                Nonanginal: false
                Exertional CP: false
                LowTH Ang: false
                Q Wave: false
                ST Elevation: false
                ST Depression: true
                T inversion: false
                LVH: false
                Poor R Progression: false
                BBB: false
                FBS: 155
                CR: 1
                TG: 150
                LDL: 142
                HDL: 45
                BUN: 18
                ESR: 12
                HB: 14
                K: 4.2
                Na: 140
                WBC: 7.5
                Lymph: 30
                Neut: 60
                PLT: 250
                EF-TTE: 48
                Region RWMA: 1
                VHD: false
      responses:
        "200":
          description: Predicted probabilities and mock feature contributions
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PredictionResponse"
              example:
                request_id: 095e7b1f-22f0-4ef0-9d30-310f769c2847
                model_version: mock-1.0.0
                cad:
                  probability: 0.82
                  label: elevated
                  threshold: 0.5
                vessels:
                  LAD:
                    probability: 0.74
                    label: elevated
                    threshold: 0.5
                  LCX:
                    probability: 0.63
                    label: elevated
                    threshold: 0.5
                  RCA:
                    probability: 0.58
                    label: elevated
                    threshold: 0.5
                explanations:
                  cad:
                    base_value: 0.38
                    contributions:
                      - feature: Typical Chest Pain
                        value: true
                        contribution: 0.21
                        direction: positive
                      - feature: Age
                        value: 67
                        contribution: 0.09
                        direction: positive
                  LAD:
                    base_value: 0.34
                    contributions: []
                  LCX:
                    base_value: 0.31
                    contributions: []
                  RCA:
                    base_value: 0.29
                    contributions: []
                risk_summary: Mock elevated CAD risk; this is not a diagnosis.
                mock: true
        "422":
          description: Invalid or incomplete feature values
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HTTPValidationError"
              example:
                detail:
                  - loc: [body, features, Age]
                    msg: Input should be less than or equal to 100
                    type: less_than_equal
  /model/metrics:
    get:
      operationId: getModelMetrics
      summary: Return validation metrics for each prediction target
      responses:
        "200":
          description: Mock model validation metrics
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MetricsResponse"
              example:
                model_version: mock-1.0.0
                validation: stratified 5-fold cross-validation
                n_samples: 303
                trained_at: "2026-10-05T00:00:00Z"
                targets:
                  cad:
                    accuracy: 0.84
                    precision: 0.82
                    recall: 0.86
                    f1: 0.84
                    roc_auc: 0.89
                  LAD:
                    accuracy: 0.81
                    precision: 0.79
                    recall: 0.83
                    f1: 0.81
                    roc_auc: 0.86
                  LCX:
                    accuracy: 0.78
                    precision: 0.76
                    recall: 0.80
                    f1: 0.78
                    roc_auc: 0.82
                  RCA:
                    accuracy: 0.80
                    precision: 0.78
                    recall: 0.82
                    f1: 0.80
                    roc_auc: 0.85
                mock: true
components:
  schemas:
    HealthResponse:
      type: object
      additionalProperties: false
      required: [status, model_version, contract_version, mock]
      properties:
        status:
          type: string
          enum: [ok, degraded]
        model_version:
          type: string
        contract_version:
          type: string
        mock:
          type: boolean
    FeatureSchema:
      type: object
      additionalProperties: false
      required: [name, label, group, type, default]
      properties:
        name:
          type: string
          minLength: 1
        label:
          type: string
        group:
          type: string
        type:
          type: string
          enum: [number, boolean, categorical]
        unit:
          anyOf:
            - type: string
            - type: "null"
        min:
          anyOf:
            - type: number
            - type: "null"
        max:
          anyOf:
            - type: number
            - type: "null"
        default:
          anyOf:
            - type: boolean
            - type: number
            - type: integer
            - type: string
        options:
          anyOf:
            - type: array
              items:
                anyOf:
                  - type: boolean
                  - type: number
                  - type: integer
                  - type: string
            - type: "null"
        description:
          anyOf:
            - type: string
            - type: "null"
    SamplePatient:
      type: object
      additionalProperties: false
      required: [id, label, features, synthetic]
      properties:
        id:
          type: string
        label:
          type: string
        features:
          type: object
          additionalProperties:
            anyOf:
              - type: boolean
              - type: number
              - type: integer
              - type: string
        ground_truth:
          anyOf:
            - $ref: "#/components/schemas/GroundTruth"
            - type: "null"
        synthetic:
          type: boolean
    GroundTruth:
      type: object
      additionalProperties: false
      required: [cad, vessels]
      properties:
        cad:
          type: boolean
        vessels:
          $ref: "#/components/schemas/VesselGroundTruth"
    PredictRequest:
      type: object
      additionalProperties: false
      required: [features]
      properties:
        features:
          type: object
          description: Exactly the input features returned by GET /features.
          additionalProperties:
            anyOf:
              - type: boolean
              - type: number
              - type: integer
              - type: string
    Target:
      type: object
      additionalProperties: false
      required: [probability, label, threshold]
      properties:
        probability:
          type: number
          minimum: 0
          maximum: 1
        label:
          type: string
        threshold:
          type: number
          minimum: 0
          maximum: 1
    Contribution:
      type: object
      additionalProperties: false
      required: [feature, value, contribution, direction]
      properties:
        feature:
          type: string
        value:
          anyOf:
            - type: boolean
            - type: number
            - type: integer
            - type: string
        contribution:
          type: number
        direction:
          type: string
          enum: [positive, negative]
    Explanation:
      type: object
      additionalProperties: false
      required: [base_value, contributions]
      properties:
        base_value:
          type: number
          minimum: 0
          maximum: 1
        contributions:
          type: array
          items:
            $ref: "#/components/schemas/Contribution"
    VesselTargets:
      type: object
      additionalProperties: false
      required: [LAD, LCX, RCA]
      properties:
        LAD:
          $ref: "#/components/schemas/Target"
        LCX:
          $ref: "#/components/schemas/Target"
        RCA:
          $ref: "#/components/schemas/Target"
    TargetExplanations:
      type: object
      additionalProperties: false
      required: [cad, LAD, LCX, RCA]
      properties:
        cad:
          $ref: "#/components/schemas/Explanation"
        LAD:
          $ref: "#/components/schemas/Explanation"
        LCX:
          $ref: "#/components/schemas/Explanation"
        RCA:
          $ref: "#/components/schemas/Explanation"
    PredictionResponse:
      type: object
      additionalProperties: false
      required: [request_id, model_version, cad, vessels, explanations, risk_summary, mock]
      properties:
        request_id:
          type: string
          format: uuid
        model_version:
          type: string
        cad:
          $ref: "#/components/schemas/Target"
        vessels:
          $ref: "#/components/schemas/VesselTargets"
        explanations:
          $ref: "#/components/schemas/TargetExplanations"
        risk_summary:
          type: string
        mock:
          type: boolean
    TargetMetrics:
      type: object
      additionalProperties: false
      required: [accuracy, precision, recall, f1, roc_auc]
      properties:
        accuracy:
          type: number
          minimum: 0
          maximum: 1
        precision:
          type: number
          minimum: 0
          maximum: 1
        recall:
          type: number
          minimum: 0
          maximum: 1
        f1:
          type: number
          minimum: 0
          maximum: 1
        roc_auc:
          type: number
          minimum: 0
          maximum: 1
    MetricsResponse:
      type: object
      additionalProperties: false
      required: [model_version, validation, n_samples, trained_at, targets, mock]
      properties:
        model_version:
          type: string
        validation:
          type: string
        n_samples:
          type: integer
          minimum: 1
        trained_at:
          type: string
          format: date-time
        targets:
          $ref: "#/components/schemas/TargetMetricsMap"
        mock:
          type: boolean
    TargetMetricsMap:
      type: object
      additionalProperties: false
      required: [cad, LAD, LCX, RCA]
      properties:
        cad:
          $ref: "#/components/schemas/TargetMetrics"
        LAD:
          $ref: "#/components/schemas/TargetMetrics"
        LCX:
          $ref: "#/components/schemas/TargetMetrics"
        RCA:
          $ref: "#/components/schemas/TargetMetrics"
    VesselGroundTruth:
      type: object
      additionalProperties: false
      required: [LAD, LCX, RCA]
      properties:
        LAD:
          type: boolean
        LCX:
          type: boolean
        RCA:
          type: boolean
    ValidationError:
      type: object
      properties:
        loc:
          type: array
          items:
            anyOf:
              - type: string
              - type: integer
        msg:
          type: string
        type:
          type: string
        input: {}
        ctx:
          type: object
      required: [loc, msg, type]
    HTTPValidationError:
      type: object
      properties:
        detail:
          type: array
          items:
            $ref: "#/components/schemas/ValidationError"
```
