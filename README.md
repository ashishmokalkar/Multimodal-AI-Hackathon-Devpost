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

## Run backend

Backend setup and run instructions are pending the ML colleague's API
implementation and handoff.
