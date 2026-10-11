# CardioTwin API (real models, contract v1.1.0)

This FastAPI service serves the exported per-label models in `models/` through the five endpoints of the
frontend contract (`docs/api-contract.md` on the `frontend` branch).
- **Backwards compatibility:** it is a drop-in replacement for `mock-api/`. Every response parses with the frontend's current zod schemas in `frontend/src/api/types.ts`.
- **Contract version:** this API reports `1.1.0`, which is v1.0.0 plus the changes listed below.

## Run

The tested serving runtime is Ubuntu 24.04.5 on WSL 2, Python 3.11.9, and uv
0.12.24. **Use Python 3.11**: the models are pickled with 3.11.9 and the pinned
library versions; on another version the API starts with a warning and may fail
to load or predict. Run from the repository root; the serving environment lives outside
the checkout, and dependencies are pinned in `requirements.txt`. For a
first-time setup only (skip when the environment is already prepared):

```bash
export PATH="$HOME/.local/bin:$PATH"
uv python install 3.11.9
VENV="$HOME/.venvs/multimodal-ai-hack-real-api"
if [ ! -x "$VENV/bin/python" ]; then
  uv venv --python 3.11.9 "$VENV"
fi
uv pip install --python "$VENV/bin/python" -r requirements.txt
```

Start the API from the repository root:

```bash
VENV="$HOME/.venvs/multimodal-ai-hack-real-api"
exec "$VENV/bin/uvicorn" api.main:app --host 127.0.0.1 --port 8000
```

For Windows/WSL, keep the checkout and Git operations on Windows, open the
Ubuntu shell, and change to the checkout mounted under `/mnt/<drive>/...`
before using these same commands. WSL 2 forwards port 8000 to Windows
localhost.

- **Docs:** <http://localhost:8000/docs>.
- **CORS:** the API accepts `http://localhost:5173` and `:5174` (and the `127.0.0.1` equivalents). To change this, set `CARDIOTWIN_CORS_ORIGINS` to a comma-separated list.
- **Tests:** `"$HOME/.venvs/multimodal-ai-hack-real-api/bin/python" -m pytest tests/test_api.py -q -ra`, from the repository root.

## What the API serves
| Endpoint | Source |
|---|---|
| `GET /health` | `models/manifest.json` → `model_version` (`cardiotwin-v2.1.0`), `mock: false` |
| `GET /features` | `api/features.py` (49 inputs: the 55 dataset columns, minus Exertional CP, BMI and Obesity, with chest pain and smoking merged) |
| `GET /patients/samples` | 8 real dataset patients, one per vessel pattern, with their angiography ground truth |
| `POST /predict` | `models/*.joblib`: cross-fitted models, so no dataset patient is scored by a model that trained on them (see below) |
| `GET /model/metrics` | Validated metrics from `models/manifest.json` (repeats r5–r9, see `reports/BEST_MODELS.md`) |

## Changes from contract v1.0.0

All the additions are new keys, so the frontend's current zod schemas ignore them until it uses them.

**Inputs (`/features`):** the backend does every conversion to the model encoding, exactly once.

| Field | v1.0.0 (mock) | v1.1.0 | Why |
|---|---|---|---|
| `BBB` | boolean | categorical `None` / `LBBB` / `RBBB` | The models use left and right bundle branch block separately |
| `VHD` | boolean | categorical `None` / `Mild` / `Moderate` / `Severe` | The models use the 4-level severity |
| `Function Class` | 1–4 | 0–3 | The dataset's own coding |
| `WBC` | 10³/µL | 10³/µL (unchanged) | As printed on lab reports. The backend multiplies by 1000 for the models |
| `Typical Chest Pain`, `Atypical`, `Nonanginal` | 3 booleans | one categorical `Chest Pain`: `None` / `Typical` / `Atypical` / `Non-anginal` | They are mutually exclusive in the data. One clinical question is clearer and can't be contradictory |
| `Current Smoker`, `Ex-Smoker` | 2 booleans | one categorical `Smoking`: `Never` / `Former` / `Current` | They are mutually exclusive. This is how health records store smoking status |
| `BMI`, `Obesity` | inputs | removed; calculated by the backend and returned in `derived` | BMI = weight / height² exactly in the data, and Obesity is the dataset's BMI > 25 flag |
| `Exertional CP` | input | removed | It is `N` for all 303 patients, so it has no effect |

- **Bounds:** `min`/`max` are plausibility limits; a value outside them returns HTTP 422. A value inside them but outside the range seen in training is accepted, with a message in `warnings`.
- **Labels:** labels and descriptions are in plain language.
- **Defaults:**
  - numbers default to the dataset median;
  - yes/no fields default to "No";
  - choices default to their "none" option.

**Requests (`POST /predict`):**
- An optional `sample_id`, taken from `/patients/samples`, is accepted and checked, but it does not decide how the request is scored; the values do. The frontend sends it only while the inputs are the sample's own.
- **Cross-fitted serving.** Each label has five fold models (folds of the fixed repeat r0; each trained on 4/5 of the 303 patients). A request is scored by the fold models that never trained on a dataset patient close to it (Gower distance on the inputs: excluded within 0.03, faded out by 0.05; the two closest distinct dataset patients are 0.025 apart):
  - any of the 303 dataset patients, typed in exactly, with `72.0` instead of `72`, or with small edits (what-if), is scored by the fold model that never saw them;
  - a new patient far from every dataset patient is scored by the average of the five fold models.
- No model trained on all 303 patients is served: it memorises them (in-sample AUC ~1.0), so near-matches would have returned their recorded labels.

**Responses (`POST /predict`):**
- `Target.uncertain` (bool) is true when the model's 90% prediction set contains both answers. It is computed on the returned (capped) probability, with the conformal quantile fitted on capped scores. In validation this happened for about 46% of LCX, 45% of RCA, 25% of LAD and 4% of CAD patients.
- Each vessel's probability is capped at the CAD probability.
- `label` is `elevated` for CAD when probability ≥ `threshold`. A vessel is `elevated` only when its probability ≥ its `threshold` **and** CAD is elevated (a narrowed artery is CAD, so a vessel flag without a CAD flag would contradict itself). A vessel can therefore be above its own threshold yet `not elevated`; `risk_summary` says so.
- The thresholds maximise balanced accuracy on the capped, calibrated out-of-fold scores (vessel thresholds under the rule above): CAD 0.689, LAD 0.430, LCX 0.320, RCA 0.394.
- On repeats r5–r9 this rule never flags a vessel without CAD, keeps CAD unchanged, and gives slightly higher mean balanced accuracy than independent per-target flags (`reports/v2/s9/s9_served.csv`).
- `Explanation` gains two fields:
  - `scale: "probability"`;
  - `method` (text describing the method).
- `contributions` are in **probability units** (0.12 = +12 percentage points), relative to `base_value`.
  - `base_value` is the probability for a reference patient: median measurements, no risk factors or findings, so the form defaults.
  - **Additive exactly:** `base_value + Σ contribution = probability`.
  - The method is baseline Shapley, and is the same for every model.
- `warnings` (list of strings) covers:
  - values outside the training range;
  - lower validated accuracy at age 65 or over;
  - lymphocyte plus neutrophil percentages above 100%.
- `derived`: `{"BMI": 27.2, "Obesity": true}`.
- `prediction_source`: which models answered: `Dataset patient N: …never saw this patient`, `Edited dataset patient N: …`, `Close to dataset patient N: …` or `New patient: average of 5 cross-validation models…`.
- `risk_summary` is a plain-language sentence, including the disclaimer.

**Metrics (`GET /model/metrics`):**
- The v1.0.0 fields per target are kept: accuracy, precision, recall, F1, ROC-AUC.
- Added per target:
  - `roc_auc_ci95`;
  - `balanced_accuracy`;
  - `brier`;
  - `ece`;
  - `threshold`;
  - `model`.
- `trained_at` is UTC with a `Z` suffix, which is what the frontend's `z.string().datetime()` requires.

## Additions for the explanation dashboard (still contract `1.1.0`; all optional keys, omitted when not applicable)

| Where | Field | Meaning |
|---|---|---|
| `FeatureSchema` | `reference_range: {low?, high?}` | Typical adult reference interval for a measurement (labs differ). It is shown to orient the reader; it is never used by the model |
| `FeatureSchema` | `modifiable: true` | A risk factor a patient can change (weight, smoking, BP, fasting glucose, TG, LDL, HDL). Drives the what-if sliders |
| `Target` (vessels only) | `capped: bool` | `true` when the vessel model's estimate was above P(CAD) and was lowered to it |
| new `GET /model/importance` | `{model_version, n_patients, description, targets: {cad, LAD, LCX, RCA: [{feature, mean_abs_contribution, share_raising}]}}` | What each model generally relies on: the average size of every input's contribution over the 303 dataset patients, using the same explanations as `/predict`. Precomputed by `python -m api.importance` into `models/importance.json` |
| new `GET /cohort` | `{model_version, n_patients, population, patients: [{patient, age, sex, cad, LAD, LCX, RCA}]}` | The comparison cohort for "higher than X% of same-sex, similar-age patients": every dataset patient's age, sex and served probabilities, each scored by the cross-validation model that never saw them (the same numbers `/predict` returns for them). The 303 were referred for angiography, so it is a comparison with that referral group, not the general population. Precomputed by `python -m api.cohort` into `models/cohort.json` |
