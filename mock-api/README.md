# Mock API

This FastAPI service implements the versioned contract in
[`../docs/api-contract.md`](../docs/api-contract.md). It is a deterministic
synthetic stub, not a clinical model. It uses Python 3.11+ and Pydantic v2.

The five bundled patients are synthetic. Downloading the UCI archive URL tried
for this dataset returned 404, and the public Kaggle download endpoint returned
403 without Kaggle authentication. No downloaded patient data is included.

## Install

From `mock-api/`, install `uv` and sync the app and development tools:

```powershell
uv sync --extra dev
```

`uv` creates an isolated `.venv` using an installed Python 3.11 or later. To
request a specific interpreter, use `uv sync --python 3.11 --extra dev`.

## Run

```powershell
uv run uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`; interactive docs are at
`http://localhost:8000/docs`. CORS permits the frontend origin
`http://localhost:5173`.

## Test and lint

```powershell
uv run pytest
uv run ruff check .
```
