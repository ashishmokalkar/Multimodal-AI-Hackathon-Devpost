# Sprint 1 Plan — Foundation (Oct 5 → Oct 7, 2026)

Status legend: ⬜ not started · 🔄 in progress · ✅ self-check passed · 🔒 human gate approved

**Sprint goal:** De-risk the project. Repo + docs system live, frontend scaffold runs, API contract agreed with a working mock, and the 3D heart asset question is answered (D-012).

**Sprint cap:** 1500 credits (D-008). **Exit criterion:** every phase 🔒, `frontend` PR'd to `dev`.

## Budget

| Phase | Owner | Estimate | Actual | Notes |
|---|---|---|---|---|
| 0 Discussion & research | O+H | 300 | ~365 (at gate request) | cold start 70; doc-writing calls cost 10–30 each as context grew → **over estimate by ~20 %**, see retro action |
| 1 Scaffold | X | 250 | | |
| 2 API contract + mock | X | 350 | | |
| 3 3D asset spike | X | 400 | | |
| 4 Retro & cleanup | O+H | 100 | | |
| **Total** | | **1400** | | cap 1500 → 100 slack |

---

## Phase 0 — Discussion & Research 🔒 (approved 2026-10-05 22:27)

**Goal:** Agree constraints, stack, ownership, sprint cadence; stand up the docs system and branches.

Tasks
- [x] Read brief, Devpost page (deadline 14 Oct 20:45 CEST), repo state (only `main`)
- [x] Decisions D-001 … D-012 logged
- [x] `docs/workflow.md`, `docs/decisions.md`, `docs/spec.md`, `docs/planning/plan.md`, `docs/retro/` created
- [x] Workspace initialised as repo; `dev` and `frontend` branches pushed
- [x] Docs committed on `frontend` (31a6ba7)
- [ ] Open questions Q1–Q3 (spec §12) sent to M by H

Self-check gate
- `git branch -r` shows `origin/dev`, `origin/frontend`; `git log frontend` has the docs commit
- `plan.md` phases each have tasks, both gates and a credit estimate
- `spec.md §5` is sufficient for X to write `api-contract.md` without further questions

Human gate — H says "GATE 0 APPROVED" after reading `workflow.md`, `decisions.md`, this plan.

---

## Phase 1 — Frontend scaffold 🔄

**Goal:** A running Vite + React + TS + R3F + Tailwind shell with the three-panel layout and disclaimers, CI green.

Tasks
1. [ ] `frontend/`: `pnpm create vite` (react-ts); add deps `three @react-three/fiber @react-three/drei zustand @tanstack/react-query recharts zod`; dev deps `tailwindcss postcss autoprefixer eslint prettier vitest @types/three`
2. [ ] Tailwind configured; `src/` tree exactly as `spec.md §4`, placeholder components exporting empty panels
3. [ ] App shell: header (title, model-version slot, "Model metrics" button), 3-column grid, footer; `DisclaimerModal` (acknowledge → localStorage) + `DisclaimerBanner` with text from `spec.md §8`
4. [ ] Empty R3F `<Canvas>` in the centre column with `OrbitControls` and a placeholder sphere; `frameloop="demand"`, `dpr={[1,1.5]}`
5. [ ] Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`; `.nvmrc` (20), `.editorconfig`, root `.gitignore` (node, python, `.env*`, `dist`)
6. [ ] `.github/workflows/frontend-ci.yml`: on push/PR to `frontend`, `dev`, `main` → pnpm install, lint, typecheck, build
7. [ ] Root `README.md`: one-paragraph overview, repo layout (D-009), "Run frontend" section; leave a "Run backend" placeholder for M
8. [ ] One Vitest test (e.g. `lib/colorScale.test.ts` with a stub `colorScale(p)` returning hex) to prove the test runner works

Constraints: touch only `frontend/`, `.github/`, root `README.md`, `.gitignore`, `.editorconfig`. No 3D model files yet.

Self-check gate (evidence required)
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0 (paste tail of output)
- `pnpm dev` → screenshot of `localhost:5173` showing modal, banner, 3 columns, rotating placeholder sphere
- `frontend-ci.yml` passes `actionlint` or at least `yamllint`/visual check; CI run green on GitHub after push
- Commit(s) on `frontend` with conventional messages

Human gate — H confirms screenshot + CI green → "GATE 1 APPROVED".

---

## Phase 2 — API contract + mock server + typed client ⬜

**Goal:** `docs/api-contract.md` written, `mock-api/` serves it, frontend form is data-driven and calls `/predict`.

Tasks
1. [ ] `docs/api-contract.md`: prose + OpenAPI 3.1 YAML for the 5 endpoints in `spec.md §5`; include JSON examples; "Versioning & change process" section (M proposes change → H approves → both update)
2. [ ] `mock-api/` (Python 3.11, FastAPI, pydantic v2, `uv` or `pip` + `requirements.txt`): `schemas.py` (single source of truth), `features.py` (≈55 features of the Z-Alizadeh Sani extension, grouped per `spec.md §5`, with types/units/ranges/defaults), `predictor_mock.py` (deterministic: seeded by hashed features; monotone sensitivity to a few key features so what-if visibly works), `samples.json` (5 patients — try downloading the UCI/Kaggle xlsx and extracting real rows; if not possible, synthetic rows flagged `"synthetic": true`), `metrics_mock.json` (`"mock": true`), `main.py` with CORS for `http://localhost:5173`
3. [ ] `mock-api/README.md`: run with `uvicorn app.main:app --reload --port 8000`; `ruff`; 3 pytest tests (schema roundtrip, determinism, feature-change sensitivity)
4. [ ] Frontend `src/api/`: `types.ts` mirroring schemas, `client.ts` (`VITE_API_BASE_URL`, default `http://localhost:8000`), hooks `useFeatures / useSamples / usePredict / useMetrics`
5. [ ] `features/patient/`: data-driven form grouped by `group` (accordion), inputs by `type`, zod validation built from schema, sample-patient picker that fills the form, "Predict" button + 500 ms debounced auto-predict toggle
6. [ ] `features/results/`: temporary `RawResult` panel rendering CAD + vessel probabilities and top-5 contributions as text (3D & charts come in S2/S3)
7. [ ] `.env.example` in `frontend/`

Constraints: touch only `docs/api-contract.md`, `mock-api/`, `frontend/src/api`, `frontend/src/features/patient`, `frontend/src/features/results`, `frontend/.env.example`.

Self-check gate
- `curl localhost:8000/features | jq length` ≥ 50; `curl -X POST /predict` with a sample returns 200 and validates against the OpenAPI schema (use `schemathesis` or pydantic `model_validate`)
- Changing `Typical Chest Pain` from 0→1 on a sample changes `cad.probability` by ≥0.05
- Frontend screenshot: form groups rendered from API, sample loaded, probabilities shown
- `pytest`, `ruff check`, `pnpm typecheck`, `pnpm lint` exit 0
- `api-contract.md` reviewed by O; sent to M by H

Human gate — H confirms + M acknowledges contract (or logs objections) → "GATE 2 APPROVED".

---

## Phase 3 — 3D heart asset spike (timebox ½ day) ⬜

**Goal:** Lock D-012: a licensed GLB with addressable `Heart`, `LAD`, `LCX`, `RCA` nodes loads in R3F and recolours per vessel — or the fallback is implemented.

Tasks
1. [ ] Research (≤45 min): BodyParts3D (FMA IDs for heart, LAD = anterior interventricular branch, LCX = circumflex branch, RCA), **Z-Anatomy** (CC-BY-SA, derived from BodyParts3D, named parts, GLB/Blender exports), NIH 3D Print Exchange, Sketchfab CC0/CC-BY "heart coronary arteries". Record URL, licence, format, triangle count for each in `assets/heart/CANDIDATES.md`
2. [ ] Acquire best candidate; build one GLB with named nodes using `@gltf-transform/cli` (merge, rename, `dedup`, `weld`, `simplify` to ≤150k tris, `draco`) — Blender CLI only if already installed
3. [ ] `assets/heart/LICENSE.md` (source, author, licence, modifications); copy GLB to `frontend/public/models/heart.glb`; fill `spec.md §10`
4. [ ] `features/viewer/`: `HeartModel.tsx` (`useGLTF` + Draco), `vesselMap.ts` (`{ LAD: 'LAD', LCX: 'LCX', RCA: 'RCA' }` node names), `VesselMesh` applying colour from `lib/colorScale.ts` given a static map `{LAD: .8, LCX: .3, RCA: .55}`, hover → emissive + `<Html>` tooltip, click → `uiStore.selectedVessel`, drei `<Bounds fit>`, `<Stats>` (dev only)
5. [ ] If nothing suitable by timebox: fallback — generic CC0 heart mesh + `TubeGeometry` on `CatmullRomCurve3` splines per vessel; same component API
6. [ ] Update `decisions.md` D-012 with the outcome (chosen asset or fallback)

Constraints: touch only `assets/`, `frontend/public/models`, `frontend/src/features/viewer`, `frontend/src/lib`, `frontend/src/store`, `docs/spec.md §10`, `docs/decisions.md` D-012 row.

Self-check gate
- GLB ≤8 MB, ≤150k triangles (`gltf-transform inspect` output pasted); loads in <2 s on `pnpm dev`
- Screenshot: three vessels in visibly different colours on the heart; second screenshot after rotating/zooming
- Hover shows vessel name tooltip; click logs/sets selected vessel
- `<Stats>` fps ≥50 on the dev machine; triangle count recorded
- `LICENSE.md` present; licence is CC0/CC-BY/CC-BY-SA or equivalent permitting redistribution
- `pnpm lint && pnpm typecheck && pnpm build` exit 0

Human gate — H views the 3D model and approves asset + licence → "GATE 3 APPROVED".

---

## Phase 4 — Retro & cleanup ⬜

**Goal:** Learn, archive, hand a clean baseline to Sprint 2.

Tasks
- [ ] `docs/retro/sprint1.md`: what went well / wrong / actions; credit actuals vs estimates
- [ ] `plan.md` → `planning/sprint1.md`; new `plan.md` skeleton for Sprint 2 (Phase 0 only)
- [ ] `spec.md`: resolve `[TBD-S1]` markers; record M's answers to Q1–Q3
- [ ] Budget table reconciled from Copilot usage data
- [ ] PR `frontend` → `dev` (title "Sprint 1: foundation"), H merges after CI green

Self-check gate: all four files updated and committed; PR open.
Human gate — "GATE 4 APPROVED" closes the sprint.

---

## Tentative horizon (re-planned in each Phase 0)

| Sprint | Dates | Theme | Cap |
|---|---|---|---|
| S2 | Oct 8–9 | **3D viewer**: live prediction → colour; vessel select ⇄ results sync; camera presets; legend; selected-vessel callout; polish materials/lighting | 1800 |
| S3 | Oct 10–11 | **Dashboard**: CAD gauge, vessel cards, SHAP waterfall ("Why?"), Vitals table, Model-metrics drawer, plain-language summary; swap to M's real backend; error/loading states | 1800 |
| S4 | Oct 12–14 | **Ship**: hardening, a11y pass, perf check, frontend sections of 6-page doc, demo-video script + recording support, Devpost submission; Oct 14 buffer | 1200 |
| Reserve | | | 700 |
