# CardioClarity Studio

Multimodal AI Hackathon 2026, Track A.

Your heart tests, explained simply: see which artery is at risk, the main reasons why, and what to do
next, on an interactive 3D heart, with a spoken summary in English or Hindi.

- **Live demo:** [cardioclarity-962866578386.us-central1.run.app](https://cardioclarity-962866578386.us-central1.run.app)
  (API documentation at [`/docs`](https://cardioclarity-962866578386.us-central1.run.app/docs))
- **Project documentation (six pages):** [PDF](docs/submission/DOCUMENTATION.pdf) / [HTML](docs/submission/DOCUMENTATION.html)

> For decision support and education only. Not a substitute for diagnostic imaging or clinical judgement.

## What it does

From the tests a patient already has (history, examination, ECG, blood tests and echo; 49 inputs), CardioClarity
estimates the chance of coronary artery disease (CAD) and of narrowing in each main artery (LAD, LCX, RCA).

- **See it:** each artery on a 3D heart takes the colour, thickness and glow of its own risk.
- **Understand it:** SHAP shows how much each test result raised or lowered each risk, on the heart and in the *Why* panel.
- **Act on it:** what-if sliders re-score the patient in about a second; a three-page plain-language report.
- **Hear it:** a spoken summary in English, or in Hindi (recorded with Sarvam AI) for the four featured patients.
- **Honest:** calibrated percentages, and the model says "unsure" when it cannot decide.

## Results

ROC-AUC of the served pipeline on the held-out cross-validation repeats (r5–r9), 303 patients:

| Target | Model | ROC-AUC | 95% CI |
|---|---|:---:|:---:|
| CAD | Explainable Boosting Machine | 0.939 | 0.903–0.960 |
| LAD | CatBoost | 0.869 | 0.822–0.906 |
| LCX | XGBoost | 0.782 | 0.722–0.820 |
| RCA | Logistic stack of 8 models | 0.770 | 0.714–0.813 |

Full results, calibration and subgroups: [`reports/BEST_MODELS.md`](reports/BEST_MODELS.md). How everything was
validated and what was tried: [`ml/README.md`](ml/README.md).

## Repository layout

| Path | Contents |
|---|---|
| [`frontend/`](frontend) | React + TypeScript app with the React Three Fiber heart |
| [`api/`](api/README.md) | FastAPI service that scores and explains with the real models |
| [`models/`](models) | Exported cross-fitted models and their manifest |
| [`ml/`](ml/README.md) | Data preparation, feature engineering, model search and validation |
| [`reports/`](reports) | Experiment write-ups and result tables |
| [`data/`](data/README.md) | Source datasets (public, credited) |
| [`tests/`](tests) | Python tests for the pipeline and the API |
| [`scripts/`](scripts) | Data download, Cloud Run deploy, credits |
| [`docs/submission/`](docs/submission) | Project documentation |
| [`assets/heart/`](assets/heart/LICENSE.md) | Heart model licence and attribution |

## Run it

**One container** (app and API together):

```bash
docker build -t cardioclarity .
docker run -p 8080:8080 cardioclarity
```

Then open `http://localhost:8080`.

**Separately**, for development. The API needs **Python 3.11** (the models are pickled with 3.11 and the pinned
libraries); the app needs Node.js 24.19.0 or newer and pnpm 12.9.1 through Corepack.

```bash
pip install -r requirements.txt
uvicorn api.main:app --port 8000          # from the repository root

cd frontend
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev                          # http://localhost:5173
```

Checks: `python -m pytest` from the root; `corepack pnpm lint`, `typecheck`, `test` and `build` from `frontend/`.

## Rebuild the models

```bash
python scripts/download_data.py            # verifies SHA-256 checksums
python -m ml.export                        # CPU only
```

## Hindi audio

The Hindi summaries are recorded once and shipped as audio files in `frontend/public/audio/hi/`, so the app makes
no speech-API calls at run time. To re-record them, put `SARVAM_API_KEY=...` in a `.env` file at the repository
root (git-ignored), start the API on port 8000, and run `node scripts/record-hindi.mjs` from `frontend/`.

## Deploy

The root [`Dockerfile`](Dockerfile) builds the app and serves it from the API, so one Cloud Run service runs
everything (CPU only, 2 vCPU, 2 GiB):

```bash
gcloud auth login
PROJECT=<your-project-id> scripts/deploy_cloudrun.sh
```

[`.github/workflows/keep-demo-awake.yml`](.github/workflows/keep-demo-awake.yml) pings the health check every
15 minutes.

## Limitations

The models learned from 303 patients at one hospital in Iran and have not been tested on other hospitals'
patients. They are weaker for patients over 65 and for the LCX and RCA arteries. The 3D arteries are schematic,
not the patient's own anatomy, and SHAP points describe the model, not cause and effect.

## Credits

- Dataset: Extension of Z-Alizadeh Sani, [UCI #411](https://archive.ics.uci.edu/dataset/411/extention+of+z+alizadeh+sani+dataset)
  (Alizadehsani, Roshanzamir and Sani, 2013; CC BY 4.0).
- Heart model: *Realistic Human Heart* by neshallads ([Sketchfab](https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089), CC BY 4.0).
- Hindi voice: [Sarvam AI](https://www.sarvam.ai/).
- Team: Ashish Mokalkar, Faizan Shaikh.

Licensed under [Apache 2.0](LICENSE).
