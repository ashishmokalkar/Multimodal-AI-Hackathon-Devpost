# ML answers to the frontend integration questions

**From:** Ashish (ML). **For:** the frontend branch.

This replies to the six questions about the [API contract](https://github.com/ashishmokalkar/Multimodal-AI-Hackathon-Devpost/blob/frontend/docs/api-contract.md) (v1.0.0).

**The real-model API is ready now.** It runs the final models and implements **contract v1.1.0**: v1.0.0 plus additions. Every v1.1.0 response
already parses with your current zod schemas (`frontend/src/api/types.ts`). The frontend works against it **without code changes**. The changes below
are about using the new information well, not about fixing breakage.

- **Code:** branch `ML-dev`, folder `api/`. Full API docs: [`api/README.md`](../api/README.md).
- **Validation results:** [`reports/BEST_MODELS.md`](../reports/BEST_MODELS.md).

---

## 1. Delivery timing: **Confirmed: available now**

- **Commit:** integrate against the head of `ML-dev`; the commit hash is at the end of this document.
- **Models and API:** the final models are in `models/`, and the API is in `api/`.
- **Done and verified on Windows:**
  - all 5 endpoints;
  - explanations;
  - real sample patients;
  - validated metrics;
  - 4 API tests;
  - a check that every live response parses with your zod schemas.
- **Not yet verified:** Ubuntu/WSL (see item 5). This is the only remaining risk for Oct 10–11.

## 2. Serving contract: **Confirmed, as v1.1.0**

All five endpoints are implemented with the same paths and the same required fields:
- `/health`
- `/features`
- `/patients/samples`
- `/predict`
- `/model/metrics`

Metrics are served by `/model/metrics`, so you don't need a static file. The v1.1.0 additions are new keys, so your schemas ignore them until you use them:

| Where | Addition | What it gives you |
|---|---|---|
| `Target` | `uncertain: boolean` | `true` when the model can't call this target confidently (its 90% prediction set contains both answers). Show it as an "uncertain" state on the vessel |
| `Explanation` | `scale: "probability"`, `method: string` | How to read the contributions (see item 4) |
| `PredictionResponse` | `warnings: string[]` | Plain-language cautions, for example a value outside the training range, or age 65+ where accuracy is lower |
| `PredictionResponse` | `derived: {BMI, Obesity}` | BMI calculated from weight and height. Show it read-only |
| `PredictionResponse` | `prediction_source: string` | Whether the final models or the hold-out demo models answered |
| `PredictRequest` | optional `sample_id` | Ties what-if edits of a sample patient to the hold-out models. Without it, an edited sample counts as a new patient. Your `PredictRequestSchema` would strip it today, so add it there if you want it |
| `TargetMetrics` | `roc_auc_ci95`, `balanced_accuracy`, `brier`, `ece`, `threshold`, `model` | Validation detail for the metrics page |

## 3. Frontend-facing inputs: **Confirmed: 49 inputs, all conversion in the backend**

`GET /features` is the source of truth: names, labels, groups, types, units, options, defaults, bounds and descriptions.
- **Labels and descriptions** are written in plain language for clinicians and patients.
- **The backend converts** everything to the model's encoding, exactly once.
- **The frontend** sends values in the units `/features` declares and never converts them itself.

| Your question | Decision | Why |
|---|---|---|
| Spellings `Ex-Smoker`, `Airway`, `ST Elevation`, `ST Depression`, `T inversion` | Your names are kept, and the backend maps them | No reason to churn the frontend |
| `BBB` | Categorical: `None` / `LBBB` / `RBBB` | The models use left and right block separately; a yes/no loses that |
| `VHD` | Categorical: `None` / `Mild` / `Moderate` / `Severe` | The models use the 4-level severity, and severity words are what an echo report says |
| `Function Class` | `0, 1, 2, 3` | The dataset's own coding |
| WBC | **×10³/µL** (for example 7.1). The backend multiplies by 1000 once | This is how lab reports print it, and it is the same number as ×10⁹/L, the SI unit. Platelets use the same unit |
| `Exertional CP` | Removed | It is "No" for all 303 patients, so it has no effect |
| BMI / Obesity | **Removed as inputs.** Calculated from weight and height and returned in `derived` | Clinical software calculates BMI, so users never type it. In the data, BMI = weight / height² exactly, so the user can't enter inconsistent values (mock sample 1 had BMI 29 at 75 kg / 165 cm, which is really 27.5) |
| Chest pain (`Typical Chest Pain`, `Atypical`, `Nonanginal`) | One choice, `Chest Pain`: `None` / `Typical` / `Atypical` / `Non-anginal` | They are mutually exclusive in the data. One clinical question is clearer, and it can't be answered in a contradictory way |
| Smoking (`Current Smoker`, `Ex-Smoker`) | One choice, `Smoking`: `Never` / `Former` / `Current` | They are mutually exclusive, and this is how health records store smoking status |
| Validation bounds | `min`/`max` = plausibility limits; a value outside them returns HTTP 422. A plausible value outside the **training** range is accepted, with a `warnings` message | Real patients can fall outside what the model saw (for example age 25 or EF 65%). Rejecting them would block clinicians; flagging them is honest |
| Defaults | Numbers default to the dataset median; yes/no to "No"; choices to their "none" option | A neutral starting form. It is also the reference patient for explanations (item 4) |

Your form is data-driven, and I checked that nothing in `frontend/src` hard-codes a changed name. So the new dropdowns appear without code changes.

## 4. Predictions and explanations: **Confirmed**

### Models (version `cardiotwin-v2.0.0`)

| Target | Model | Threshold | Validated ROC-AUC (95% CI) |
|---|---|:---:|:---:|
| CAD | Explainable Boosting Machine (EBM) | 0.689 | 0.939 (0.908–0.962) |
| LAD | CatBoost | 0.550 | 0.866 (0.824–0.905) |
| LCX | XGBoost | 0.324 | 0.784 (0.727–0.824) |
| RCA | Stacked ensemble of 8 models | 0.357 | 0.767 (0.715–0.811) |

- **Probabilities** are calibrated (Platt scaling). Each vessel's probability is capped at the CAD probability.
- **`label`** is `elevated` when probability ≥ threshold.
- **Thresholds** maximise balanced accuracy and were validated out of fold, so they are not 0.5.

### Explanations: how to read them

- **Scale:** probability. A contribution of `0.12` means this input raised the probability by **12 percentage points**.
- **Baseline (`base_value`):** the probability for a **reference patient**, meaning median measurements and no risk factors, symptoms or findings (the form defaults).
- **Additive, exactly:** `base_value + Σ contributions = probability`. This holds for every target and every model, including when a vessel is capped at CAD.
- **Order:** contributions are sorted by size. Inputs equal to the reference value contribute 0 and are left out.
- **Method:** baseline Shapley values, the same for every model.
  - Each input is switched from the reference value to the patient's value in 32 random orders, and its average effect is recorded.
  - Engineered features (risk scores, BMI) are credited back to the inputs they come from.
  - The same input always gives the same explanation.
- **Suggested wording:** "Compared with a typical patient (15%), typical chest pain adds +47 points…". Today `RawResult.tsx` prints `toFixed(3)`, so showing `×100` as percentage points would read better.

### Example: a real response for dataset patient 117

The patient's true result is LAD-only disease. They were scored by the hold-out models, and only the top 3 contributions are shown:

```json
{ "model_version": "cardiotwin-v2.0.0",
  "cad": { "probability": 0.9786, "label": "elevated", "threshold": 0.689, "uncertain": false },
  "vessels": {
    "LAD": { "probability": 0.9353, "label": "elevated",     "threshold": 0.5505, "uncertain": false },
    "LCX": { "probability": 0.7522, "label": "elevated",     "threshold": 0.3244, "uncertain": false },
    "RCA": { "probability": 0.2439, "label": "not elevated", "threshold": 0.357,  "uncertain": false } },
  "explanations": {
    "cad": { "base_value": 0.1824, "scale": "probability", "contributions": [
      { "feature": "Chest Pain",  "value": "Typical", "contribution": 0.4747, "direction": "positive" },
      { "feature": "T inversion", "value": true,      "contribution": 0.0948, "direction": "positive" },
      { "feature": "HTN",         "value": true,      "contribution": 0.0884, "direction": "positive" } ] },
    "LAD": { "base_value": 0.1242, "scale": "probability", "contributions": [
      { "feature": "Chest Pain",  "value": "Typical", "contribution": 0.4930, "direction": "positive" },
      { "feature": "Region RWMA", "value": 1,         "contribution": 0.1815, "direction": "positive" },
      { "feature": "T inversion", "value": true,      "contribution": 0.0653, "direction": "positive" } ] } },
  "risk_summary": "Estimated chance of significant coronary artery disease (at least 50% narrowing): 98%, above the 69% decision threshold. Arteries flagged: LAD 94%, LCX 75%. Decision support only, not a diagnosis; confirm with clinical assessment and diagnostic imaging.",
  "mock": false, "warnings": [], "derived": { "BMI": 18.4, "Obesity": false },
  "prediction_source": "Dataset patient 117: scored by models trained without this patient" }
```

A prediction including explanations takes about 0.4 s.

### Uncertainty (added because it matters for judging)

The brief scores "risk estimation quality". A model that says when it isn't sure is safer and more credible.
- `uncertain: true` came up for about 46% of LCX/RCA patients, 24% for LAD and 3% for CAD in validation.
- **Display:** a distinct look on the vessel (hatched or pulsing) plus the word "uncertain", so it is never conveyed by colour alone. Treat it as a normal state, not an error.

### Sample patients

`/patients/samples` returns 8 **real** dataset patients (UCI #411, CC BY 4.0), one per vessel pattern. Each comes with its angiography ground truth and `synthetic: false`.
- **No memorised answers.** They are scored by models refitted **without** these 8 patients, so the demo shows honest predictions.
- **Mixed results, as in real use.** For example, patient 287 (no disease) gets low risk everywhere, while patient 54 (RCA only) is under-called. That matches the validated accuracy.
- **Good for the video:** patient 117 (LAD), patient 97 (all three arteries) and patient 287 (healthy).

## 5. Reproducibility and metrics: **Confirmed on Windows; WSL pending**

- **Python:** 3.11.9.
- **Dependencies:** pinned in `requirements.txt`. The models must be loaded with exactly these versions:
  - scikit-learn 1.9.1, pandas 3.0.6, numpy 2.4.6;
  - xgboost 3.2.0, catboost 1.2.10, lightgbm 4.7.0;
  - interpret-core 0.7.8;
  - fastapi 0.143.0, uvicorn 0.54.0, pydantic 2.13.5.
- **Model files:**
  - `models/{cad,lad,lcx,rca}.joblib` for the final models;
  - `models/demo/*.joblib` for the hold-out copies used by the sample patients;
  - `models/manifest.json` for the version, thresholds and validated metrics.
- **Start, from the repository root:**
  ```bash
  python -m pip install -r requirements.txt
  python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
  ```
  For WSL, use the same commands with a Python 3.11 venv. Your mock setup uses Ubuntu's Python 3.12; loading the models under 3.12 hasn't been tested.
- **CORS:** the API allows ports 5173 and 5174. Override with `CARDIOTWIN_CORS_ORIGINS`.
- **Model version:** `cardiotwin-v2.0.0`. `/model/metrics` reports `trained_at` in UTC.

### Validation (matches the served models exactly)

- **Data:** 303 patients (Z-Alizadeh Sani extension, UCI #411).
- **Method:** 10 repeats × 5-fold stratified cross-validation on fixed, saved folds.
  - Every choice (features, tuning, model selection, ensemble weights, calibration) was made on repeats 0–4.
  - Metrics are reported on repeats 5–9 only, which no decision used.
  - Calibration and thresholds were fitted per outer fold on that fold's training patients only.
- **Leakage safeguards:**
  - LAD, LCX, RCA and Cath are never inputs; the API also rejects them (HTTP 422).
  - Every data-dependent step is fitted inside the training folds.
  - The constant Exertional CP is dropped.
- **Caveat:** the CAD model was first picked in an earlier phase by its repeats 5–9 score, so its figure is slightly optimistic.

| Target | ROC-AUC (95% CI) | Accuracy | Precision | Recall | F1 | Balanced accuracy | Brier | ECE |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| CAD | 0.939 (0.908–0.962) | 0.867 | 0.944 | 0.867 | 0.903 | 0.868 | 0.088 | 0.040 |
| LAD | 0.866 (0.824–0.905) | 0.781 | 0.811 | 0.820 | 0.813 | 0.773 | 0.146 | 0.047 |
| LCX | 0.784 (0.727–0.824) | 0.683 | 0.577 | 0.746 | 0.646 | 0.695 | 0.191 | 0.053 |
| RCA | 0.767 (0.715–0.811) | 0.669 | 0.546 | 0.736 | 0.625 | 0.682 | 0.191 | 0.047 |

The threshold metrics are at each target's threshold, after calibration, and before the vessel cap.

## 6. Submission ownership: **Confirmed**

**Ashish and the frontend colleague jointly own** the 3–10 minute demo video and the six-page document.

**Proposed split** (to agree between you):

| Who | Writes |
|---|---|
| Ashish | Dataset and preprocessing, models, validation and evaluation results |
| Frontend colleague | 3D pipeline, dashboard and usage instructions |
| Both | Introduction, architecture, the demo script for the video |

---

## Decisions taken for the ML side, and why

These follow the Track A brief:
- explain risk so clinicians **and patients** understand it;
- score "risk estimation quality" and "clinical interpretability";
- support adding features "without a complete redesign".

1. **Units as printed on lab reports.** WBC and platelets are in ×10³/µL; the other labs are in mg/dL, mmol/L and g/dL.
2. **Calculated values are never typed.** BMI and Obesity come from height and weight.
3. **One question per clinical concept.** Chest pain type, smoking status, bundle branch block and valve disease severity are each a single choice.
4. **Explanations in percentage points against a typical patient.** People understand "+12 points"; log-odds would need statistical training.
5. **An "uncertain" state is shown, not hidden.** It is honest, and it fits the "risk estimation quality" criterion.
6. **Real sample patients are scored by hold-out models,** so the demo doesn't show memorised answers.
7. **Plausible-but-unusual values are accepted with a warning,** not rejected.

---

## Add-on (separate from the contract): automating new-patient data entry

Typing 49 fields takes a clinician several minutes, and it's where errors creep in. In practice the values already exist somewhere. Each needs bringing in from where it lives, then checking by a person.

| Where the values live in the real world | Fields |
|---|---|
| Electronic health record (EHR) | Age, sex, height, weight, diagnoses (diabetes, hypertension, kidney failure, stroke, heart failure, thyroid, airway disease, dyslipidaemia), smoking status, vitals (BP, pulse) |
| Lab report (lab system, PDF or paper) | Fasting glucose, creatinine, lipids, BUN, ESR, haemoglobin, potassium, sodium, WBC, differential, platelets |
| ECG (cart printout or PDF with interpretation statements, or HL7 aECG / DICOM-ECG files) | Q waves, ST elevation/depression, T inversion, LVH, poor R progression, bundle branch block |
| Echo report (text report or DICOM Structured Report) | Ejection fraction, wall-motion abnormality, valve disease severity |
| The patient, in conversation | Chest pain character, breathlessness, family history, smoking |

### Options, best first for a real deployment

1. **Import from the EHR (SMART on FHIR).** A clinician opens CardioTwin from inside the hospital record, and the patient's data loads with one click.
   - **How it works:** the app reads FHIR resources.
     - `Patient` gives age and sex.
     - `Observation` gives vitals and labs, matched by LOINC code: systolic BP 8480-6, heart rate 8867-4, height 8302-2, weight 29463-7, fasting glucose 1558-6, creatinine 2160-0, triglycerides 2571-8, LDL 13457-7, HDL 2085-9, BUN 3094-0, ESR 4537-7, haemoglobin 718-7, potassium 2823-3, sodium 2951-2, WBC 6690-2, lymphocytes % 736-9, neutrophils % 770-8, platelets 777-3, LVEF 10230-1, smoking status 72166-2.
     - `Condition` gives the diagnoses (SNOMED CT / ICD-10).
   - **Why it's first:** it fills most fields with no typing.
   - **Limits:** each hospital must approve the integration, and ECG and echo findings often sit only in free-text reports.
   - **For the hackathon:** demo it with the public SMART Health IT sandbox or Synthea synthetic patients.
2. **Upload a document and let AI read it.** This is the best fit for the "Multimodal AI" theme and the easiest to demo. The user photographs or uploads a lab report, ECG printout or echo report.
   - **How it works:**
     1. OCR plus a vision-language model extracts each value with its unit, a confidence score and the exact text it came from.
     2. The backend converts units into `/features` units.
     3. A review screen highlights low-confidence or missing fields.
   - **This also works for patients** who carry paper reports between clinics.
   - **Safety:** strip identifiers before any external call, or run the model locally, and never auto-submit.
3. **A plain-language patient questionnaire, before the visit, on a phone or tablet** (for example via a QR code in the waiting room). It covers symptoms, smoking, family history and breathlessness.
   - **Chest pain type is calculated, not asked.** The patient answers 3 yes/no questions, using the standard Diamond–Forrester criteria:
     1. Is it a pressure-like discomfort behind the breastbone?
     2. Is it brought on by exertion or emotional stress?
     3. Does it ease with rest or nitroglycerin?

     Three yeses means `Typical`, two means `Atypical`, and one or none means `Non-anginal`. Patients can't be expected to know those terms.
4. **Connected devices.** BP cuffs, scales and pulse readings via Bluetooth, Apple HealthKit or Google Health Connect fill in BP, pulse and weight.
5. **Voice dictation or an ambient scribe.** The clinician speaks the history, and speech-to-text plus extraction fills the same draft.
6. **A faster manual form,** which is always the fallback:
   - group fields by source document ("from the lab report", "from the ECG", "from the echo");
   - make it keyboard-first;
   - carry values forward from the last visit;
   - show the expected unit next to each box.

### One shared design for all options

**The draft.** Every source produces the same **draft patient** in the `/features` format. Each field records its value, where it came from and how confident the source was.

**The review screen.** It shows the draft with each field's source, colour-codes what needs checking, and requires a person to confirm before `/predict` is called. For example, the WBC field would be labelled "from lab report p.1: 'WBC 7.1 ×10³/µL'".

**The backend endpoint for the add-on.** This is a proposal, not in v1.1.0: `POST /extract` (multipart file) returns:
```json
{ "fields": { "WBC": { "value": 7.1, "unit_found": "10^3/uL", "confidence": 0.97, "source_text": "WBC 7.1" } },
  "unrecognised": [], "warnings": [] }
```

**Missing values.** The API currently requires all 49 inputs. If an automated source can't find a value, the review screen must ask for it. Alternatively, a later API version could fill it with the median and warn; that isn't implemented.

**Recommendation for the hackathon:**
1. **Document upload** (option 2) for labs, ECG and echo: highly visible in the video, and on theme.
2. **The 3-question chest-pain helper** (option 3): small, clinically sound, and easy for patients.
3. **FHIR import** (option 1) as the roadmap, or demonstrated with a Synthea patient if time allows.

---

**Integration commit:** `9ddb96b` on `ML-dev` (any later `ML-dev` commit also works). Start the API from that checkout as in item 5.
