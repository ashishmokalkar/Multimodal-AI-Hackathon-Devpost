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

## Run backend

Backend setup and run instructions are pending the ML colleague's API
implementation and handoff.
