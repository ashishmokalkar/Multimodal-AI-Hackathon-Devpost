# CAD Risk Visualizer API Contract

**Contract version:** `1.0.0`  
**Base URL (local mock):** `http://localhost:8000`  
**OpenAPI:** `3.1.0`

This document is the frontend/backend boundary. The mock server's Pydantic
models are the runtime source of truth for JSON shapes; its generated OpenAPI
document must remain equivalent to the schema below. Feature names identify
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

## OpenAPI 3.1

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
                $ref: "#/components/schemas/ValidationError"
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
          type: string
        min:
          type: number
        max:
          type: number
        default:
          oneOf:
            - type: number
            - type: boolean
            - type: string
        options:
          type: array
          items:
            oneOf:
              - type: number
              - type: boolean
              - type: string
        description:
          type: string
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
            oneOf:
              - type: number
              - type: boolean
              - type: string
        ground_truth:
          $ref: "#/components/schemas/GroundTruth"
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
    PredictRequest:
      type: object
      additionalProperties: false
      required: [features]
      properties:
        features:
          type: object
          additionalProperties:
            oneOf:
              - type: number
              - type: boolean
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
          oneOf:
            - type: number
            - type: boolean
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
        explanations:
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
        mock:
          type: boolean
    ValidationError:
      type: object
      properties:
        detail:
          type: array
          items:
            type: object
            properties:
              loc:
                type: array
                items:
                  oneOf:
                    - type: string
                    - type: integer
              msg:
                type: string
              type:
                type: string
```
