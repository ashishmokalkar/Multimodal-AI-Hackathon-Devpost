# Multimodal AI Hackathon

A clinical decision-support and educational prototype for exploring coronary
artery disease risk, interpreting model outputs, and visualizing per-vessel
results in an interactive 3D heart.

## Repository layout

- `frontend/` — clinician-facing application and 3D visualization (frontend
  team).
- `mock-api/` — contract-compatible mock service (frontend team).
- `backend/` — production ML API and model implementation (ML colleague).
- `docs/` — shared product specification, workflow, planning, and API contract.
- `assets/` — 3D meshes and their licence records.

## Run frontend

Requires Node.js **24.19.0** (LTS, pinned in `frontend/.nvmrc`) and pnpm
**12.9.1** through Corepack.

```powershell
cd frontend
corepack enable
corepack prepare pnpm@12.9.1 --activate
pnpm install
pnpm dev
```

The frontend is available at `http://localhost:5173`. From `frontend/`, run
`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for quality checks.

Installed toolchain: Node.js 24.19.0, pnpm 12.9.1, Vite 8.3.2, React 18.3.1,
TypeScript 6.0.3, and Tailwind CSS 3.4.19.

## Run the real model API in WSL

The approved real serving bundle is pinned to ML commit
`6d3e403ffae65857124929335bbc534e8fd116c4` and is included in this checkout.
It reports contract `1.1.0` and model version `cardiotwin-v2.0.0`. The eight
sample patients are non-synthetic holdout demonstrations scored by models
refitted without those patients; edited sample scenarios must retain their
sample origin to use the same demo-model set.

The verified runtime is Ubuntu 24.04.5 on WSL 2, Python **3.11.9**, and uv
**0.12.24**. Keep this environment separate from the mock API's Python 3.12
environment. The real environment lives in Ubuntu's home directory:

```powershell
wsl -d Ubuntu-24.04 --exec bash -lc '
export PATH="$HOME/.local/bin:$PATH"
uv python install 3.11.9
VENV="$HOME/.venvs/multimodal-ai-hack-real-api"
if [ ! -x "$VENV/bin/python" ]; then
  uv venv --python 3.11.9 "$VENV"
fi
"$VENV/bin/python" --version
uv pip install --python "$VENV/bin/python" -r /mnt/c/Users/faiza/workspace/MultimodalAIHack/requirements.txt
'
```

LightGBM requires the Ubuntu OpenMP runtime. If
`ldconfig -p | grep libgomp.so.1` returns no result, install this single system
package once from Ubuntu with
`sudo apt-get install -y --no-install-recommends --no-upgrade libgomp1`; no
Python dependency pins need to change.

Start the real API in its own PowerShell window. It binds to WSL loopback and
WSL 2 forwards it to Windows localhost:

```powershell
wsl -d Ubuntu-24.04 --exec bash -lc 'export PATH="$HOME/.local/bin:$PATH"; cd /mnt/c/Users/faiza/workspace/MultimodalAIHack; exec "$HOME/.venvs/multimodal-ai-hack-real-api/bin/uvicorn" api.main:app --host 127.0.0.1 --port 8000'
```

In another PowerShell window, start the frontend using the Windows instructions
above. Verify from Ubuntu with
`curl -fsS http://127.0.0.1:8000/health` and from Windows with
`Invoke-RestMethod http://localhost:8000/health`. The real API permits the
frontend origins on ports 5173 and 5174. Stop both foreground processes with
`Ctrl+C` in their respective windows.

Run the pinned API checks from Windows against the same Linux environment:

```powershell
wsl -d Ubuntu-24.04 --exec bash -lc 'exec "$HOME/.venvs/multimodal-ai-hack-real-api/bin/python" -m pytest /mnt/c/Users/faiza/workspace/MultimodalAIHack/tests/test_api.py -q -ra'
```

The service requires the pinned `requirements.txt`, model manifest, final and
demo model files, the original dataset workbook, and the subgroup report at
their repository-relative paths. Do not run training/export commands to start
the service. The dataset is the Z-Alizadeh Sani extension (UCI #411), credited
by M under CC BY 4.0. Citation: Alizadehsani, Roshanzamir and Sani (2013).
The app footer and `docs/spec.md` retain its attribution.
Imported source blob IDs and SHA-256 hashes are recorded in
`docs/evidence/s3p3-source-hashes.txt`. Validation metrics are cross-validation
report results, not clinical validation or independently validated demo-refit
metrics; see `reports/BEST_MODELS.md`.

## Run the mock API in WSL

The verified local setup runs the Windows frontend and the mock API in Ubuntu
24.04 on WSL 2. Keep this repository checkout and all Git operations on Windows;
WSL runs the API from the same checkout mounted at `/mnt/c`.
Verified with Ubuntu's Python 3.12.3 and uv 0.12.24; the project environment
lives at `~/.venvs/multimodal-ai-hack-mock-api` and dependencies come from
`mock-api/uv.lock`.

Check that `wsl --list --verbose` reports Ubuntu 24.04 with version `2`. In
Ubuntu, install `uv` once if needed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Sync the existing lockfile into a Linux-only environment in Ubuntu's home
directory. This uses the system Python 3.12 and does not update the lockfile:

```powershell
wsl -d Ubuntu-24.04 --exec bash -lc 'export PATH="$HOME/.local/bin:$PATH"; export UV_PROJECT_ENVIRONMENT="$HOME/.venvs/multimodal-ai-hack-mock-api"; uv sync --project /mnt/c/Users/faiza/workspace/MultimodalAIHack/mock-api --frozen --extra dev --python /usr/bin/python3'
```

Start the API in its own PowerShell window. It listens on WSL loopback; WSL 2
forwards it to Windows at `http://localhost:8000`.

```powershell
wsl -d Ubuntu-24.04 --exec bash -lc 'export PATH="$HOME/.local/bin:$PATH"; export UV_PROJECT_ENVIRONMENT="$HOME/.venvs/multimodal-ai-hack-mock-api"; cd /mnt/c/Users/faiza/workspace/MultimodalAIHack/mock-api; exec uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000'
```

In a second PowerShell window, start the frontend:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:LOCALAPPDATA\node\corepack;$env:Path"
Set-Location C:\Users\faiza\workspace\MultimodalAIHack\frontend
corepack pnpm dev -- --host 127.0.0.1
```

Check API readiness from Ubuntu with
`curl -fsS http://127.0.0.1:8000/health` and from Windows with
`Invoke-RestMethod http://localhost:8000/health`. The frontend origin
`http://localhost:5173` is allowed by the mock API. Stop each foreground
process with `Ctrl+C` in its respective PowerShell window.
