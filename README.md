# Multimodal AI Hackathon

A clinical decision-support and educational prototype for exploring coronary
artery disease risk, interpreting model outputs, and visualizing per-vessel
results in an interactive 3D heart.

## Repository layout

- `frontend/` — React application, patient inputs, results, and 3D viewer.
- `api/` — real FastAPI serving application.
- `models/` — pinned model manifest and exported final/demo estimators served by
  `api/`.
- `mock-api/` — separate contract-compatible synthetic stub for local UI work.
- `docs/` — product specification, workflow, planning, evidence, and API
  contract.
- `assets/` — heart asset and licence records.
- `data/` — source data used by the pinned real serving bundle.
- `ml/`, `reports/`, `tests/` — model research/training material, validation
  reports, and real API tests.

## Run the frontend

The required Node.js version is **24.19.0** or newer (`frontend/.nvmrc` pins
24.19.0, which CI uses, and `package.json` `engines` matches). The pinned
package manager is pnpm **12.9.1** through Corepack.

From a repository checkout with Node.js installed:

```bash
cd /path/to/Multimodal-AI-Hackathon-Devpost/frontend
corepack enable
corepack prepare pnpm@12.9.1 --activate
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:5173`. Run `corepack pnpm lint`,
`corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build`
from `frontend/`. Tested frontend toolchain: Node.js 24.19.0, pnpm 12.9.1,
Vite 8.3.2, React 18.3.1, TypeScript 6.0.3, and Tailwind CSS 3.4.19.

## Run the real model API

The pinned real serving bundle reports contract `1.1.0` and model version
`cardiotwin-v2.0.0`. Its tested Linux runtime is Ubuntu 24.04.5 on WSL 2 with
Python **3.11.9** and uv **0.12.24**. Run these commands in an Ubuntu/Linux
shell from the repository root. The virtual environment and uv-managed Python
live outside the checkout; the pinned dependencies come from
`requirements.txt`.

For a first-time setup only (skip it when this environment is already
prepared):

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

Check readiness with `curl -fsS http://127.0.0.1:8000/health`; the real
profile reports `mock: false`. API tests use the same pinned environment:

```bash
"$HOME/.venvs/multimodal-ai-hack-real-api/bin/python" -m pytest tests/test_api.py -q -ra
```

On Windows, the verified adaptation keeps Git and the Node frontend on
Windows and runs the API in Ubuntu on WSL 2. Open Ubuntu, change to the checkout
mounted under `/mnt/<drive>/...`, then use the same Linux setup/start commands
above. WSL 2 forwards the API on port 8000 to Windows localhost; check it there
with `Invoke-RestMethod http://localhost:8000/health`. Start the frontend in a
separate Windows terminal using the frontend commands above. The real API
accepts localhost frontend origins on ports 5173 and 5174.

The service requires the pinned `requirements.txt`, model manifest, final and
demo model files, original dataset workbook, and subgroup report at their
repository-relative paths. Do not run training/export commands to start it.
LightGBM requires Ubuntu's `libgomp1` runtime if it is not already installed.
The dataset is the Z-Alizadeh Sani extension (UCI #411), credited by M under
CC BY 4.0; citation: Alizadehsani, Roshanzamir and Sani (2013). Attribution is
also retained in the app footer and `docs/spec.md`.

The eight sample patients are non-synthetic holdout demonstrations scored by
models refitted without those patients. Keep a selected sample's `sample_id`
when editing its inputs to keep the same demo-model origin for a paired
what-if comparison; the UI identifies the edited scenario. Requests without
that sample origin use the final models. The pinned real API profile currently
requires exactly 49 unique inputs and eight unique non-synthetic samples, with
specific feature metadata and units. These guards validate this approved
contract; they are not a promise that arbitrary schema additions work. Schema
evolution requires coordinated API, contract, and frontend-profile work.

The model uses independent target thresholds, so CAD and vessel labels can
differ even when probabilities are equal. In the real API profile, each
**served** vessel probability is capped at the served CAD probability. Equal
probabilities alone do not establish that the cap changed a value; the
frontend presents returned outputs without recomputing them. Validation
metrics are cross-validation results, not clinical validation or independently
validated demo-refit metrics; see `reports/BEST_MODELS.md`.

## Run the mock API

The mock service is a deterministic synthetic stub, not a clinical model. Its
five bundled patients are synthetic. It requires Python 3.11 or later and uses
the committed `mock-api/uv.lock`.

From an Ubuntu/Linux shell:

```bash
cd /path/to/Multimodal-AI-Hackathon-Devpost/mock-api
uv sync --frozen --extra dev
uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API and interactive docs are available at `http://localhost:8000` and
`http://localhost:8000/docs`. Its health response reports `mock: true`.
`uv run --frozen pytest` and `uv run --frozen ruff check .` run the mock API
checks from `mock-api/`. To use this API in WSL, run these same commands in the
Ubuntu shell and run the frontend on Windows as described above.
