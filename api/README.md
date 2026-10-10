# CardioTwin API (real models, contract v1.1.0)

This FastAPI service serves the exported per-label models in `models/` through the five endpoints of the
frontend contract (`docs/api-contract.md` on the `frontend` branch).
- **Backwards compatibility:** it is a drop-in replacement for `mock-api/`. Every response parses with the frontend's current zod schemas in `frontend/src/api/types.ts`.
- **Contract version:** this API reports `1.1.0`, which is v1.0.0 plus the changes listed below.

## Run

The tested serving runtime is Ubuntu 24.04.5 on WSL 2, Python 3.11.9, and uv
0.12.24. Run from the repository root; the serving environment lives outside
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
| `GET /health` | `models/manifest.json` → `model_version` (`cardiotwin-v2.0.0`), `mock: false` |
| `GET /features` | `api/features.py` (49 inputs: the 55 dataset columns, minus Exertional CP, BMI and Obesity, with chest pain and smoking merged) |
| `GET /patients/samples` | 8 real dataset patients, one per vessel pattern, with their angiography ground truth |
| `POST /predict` | `models/*.joblib`, or `models/demo/*.joblib` for the sample patients (see below) |
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
- An optional `sample_id`, taken from `/patients/samples`, is accepted.
- The backend also recognises a sample automatically when its features are sent unchanged.
- A valid `sample_id` keeps the request on **`models/demo/`**, including edited
  inputs, so sample what-if comparisons use the same pipelines refitted without
  the eight sample patients. The frontend retains and labels this sample
  origin after edits.
- Requests without a recognized sample origin use the final models. Exact
  sample features are recognized automatically; edited values require the
  retained `sample_id` to preserve the demo-model origin.

**Responses (`POST /predict`):**
- `Target.uncertain` (bool) is true when the model's 90% prediction set contains both answers. In validation this happened for about 46% of LCX/RCA patients, 24% for LAD and 3% for CAD.
- `label` is `elevated` when probability ≥ `threshold`.
- The thresholds are per target and were validated out of fold to maximise balanced accuracy: CAD 0.689, LAD 0.550, LCX 0.324, RCA 0.357.
- Each vessel's probability is capped at the CAD probability.
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
- `prediction_source`: whether the final models or the hold-out demo models answered.
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
