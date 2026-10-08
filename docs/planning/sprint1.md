# Sprint 1 Plan — Foundation (Oct 5 → Oct 7, 2026)

Status legend: ⬜ not started · 🔄 in progress · ✅ self-check passed · 🔒 human gate approved

**Closed 2026-10-08:** All phase human gates are approved, including Gate 4 (D-022). Baseline PR #1 is open from `frontend` into `dev`; H deferred its merge until after discussions. S2 Phase 0 is authorised after `/compact` tonight (D-023), with no delivery work started.

**Resumed 2026-10-08:** The original sprint dates have elapsed. Finish the remaining asset spike and retrospective before starting Sprint 2; revise the remaining calendar at the retrospective without skipping gates or increasing the credit cap.

**Sprint goal:** De-risk the project. Repo + docs system live, frontend scaffold runs, API contract agreed with a working mock, and the 3D heart asset question is answered (D-012).

**Sprint cap:** 1500 credits (D-008). **Exit criterion:** every phase 🔒, `frontend` PR'd to `dev`.

## Budget

| Phase | Owner | Estimate | Actual | Notes |
|---|---|---|---|---|
| 0 Discussion & research | O+H | 300 | 380 | 15x orchestrator model; doc-writing calls 10-30 each |
| 1 Scaffold | X | 250 | 13 (X) + ~280 (O review) | X on 1x model is ~0.15/call; O review dominated -> D-014 |
| 2 API contract + mock | X | 350 | 21 (X) + ~370 (O) | O cost dominated by cache-miss calls after long pasted reports (~100 each); X halt on auto-fixable lint → D-015 |
| 3 3D asset spike | X | 400 | 26.8 (X) | Reported closeout delta from the refreshed kickoff snapshot; O review is included in the combined snapshots below, not this phase figure. |
| 4 Retro & cleanup | O+H | 100 | Included in final aggregate; not separately attributed | |
| **Total** | | **1400** | See deduplicated aggregate below; do not sum phase estimates | cap 1500 → 100 slack |

**Measured snapshot (2026-10-08 19:29 UTC):** 1228.1 credits across the local O and X sessions since Oct 5 (O 1193.6, X 34.5). Remaining project budget: 5771.9; remaining S1 cap: 271.9, before subsequent calls. The historical Phase 3 estimate is not an additional allocation: Phase 3 plus Phase 4, including O reviews, must fit the remaining S1 envelope. X's Phase 3 spend limit is 120 additional credits; report earlier if the overall S1 cap is at risk. No cap increase is approved.

The Python credits command is blocked by Windows application control in both O's and X's shells. The snapshots below were obtained through the read-only local session-store tool, using the script's event-deduplication fields. Do not work around the application-control policy or retry the script; local telemetry is not a reconciliation against account billing.

**Phase 3 kickoff refresh (2026-10-08):** 1258.9 credits total (O 1221.5, X 37.4), leaving 241.1 under the Sprint 1 cap. **Phase 3 closeout snapshot (2026-10-08 20:00 UTC):** 1298.8 total (O 1237.1, X 61.7); X's delta from kickoff is 24.3, within the 120-credit limit. Remaining Sprint 1 cap at this snapshot: 201.2 for the pending review and retrospective.

**Updated reported closeout:** 1301.3 total (O 1237.1, X 64.2), making X's Phase 3 delta 26.8. **Gate 3 review snapshot (latest recorded event 2026-10-08 20:14 UTC):** 1320.3 total (O 1255.2, X 65.1), leaving 179.7 under the Sprint 1 cap and 5679.7 overall, before subsequent calls. These are successive snapshots, not additional allocations. Phase-level O estimates above remain approximate; reconcile the sprint from the deduplicated aggregate, not their sum.

**Final S1 closeout snapshot (latest recorded event 2026-10-08 20:28:30 UTC):** O 1282.1 credits; X 74.6 credits; combined 1356.7. This leaves 143.3 under the 1500-credit S1 cap and 5643.3 under the 7000-credit project budget. Since the handover's 20:20 UTC checkpoint, X's deduplicated local session delta was 9.5 credits, within the 30-credit closeout target. Read-only local telemetry was deduplicated using the fields and repository-path filter in `scripts/credits.py`; it is not account-billing reconciliation. Historical snapshots above are retained, and Phase 4 is not assigned an invented per-phase O cost.

**Gate 4 transition snapshot (latest recorded event 2026-10-08 20:36:50 UTC):** O 1305.7; X 75.5; combined 1381.2. Remaining S1 cap: 118.8; remaining project budget: 5618.8, before subsequent documentation/compaction-handoff calls. At the actual S2 start after `/compact`, refresh the cumulative total and record a timestamp/baseline so reused-session totals are not mistaken for S2 spend.

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

## Phase 1 — Frontend scaffold 🔒 (approved 2026-10-05 23:20; CI informational per D-013)

**Goal:** A running Vite + React + TS + R3F + Tailwind shell with the three-panel layout and disclaimers, CI green.

Tasks
0. [ ] Toolchain: Node is **not installed** on this machine. `winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements`, then `corepack enable && corepack prepare pnpm@latest --activate`; verify `node -v`, `pnpm -v` in a fresh shell. Record versions in root README
1. [ ] `frontend/`: `pnpm create vite` (react-ts); add deps `three @react-three/fiber @react-three/drei zustand @tanstack/react-query recharts zod`; dev deps `tailwindcss postcss autoprefixer eslint prettier vitest @types/three`
2. [ ] Tailwind configured; `src/` tree exactly as `spec.md §4`, placeholder components exporting empty panels
3. [ ] App shell: header (title, model-version slot, "Model metrics" button), 3-column grid, footer; `DisclaimerModal` (acknowledge → localStorage) + `DisclaimerBanner` with text from `spec.md §8`
4. [ ] Empty R3F `<Canvas>` in the centre column with `OrbitControls` and a placeholder sphere; `frameloop="demand"`, `dpr={[1,1.5]}`
5. [ ] Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`; `.nvmrc` (installed LTS major), `.editorconfig`, root `.gitignore` (node, python, `.env*`, `dist`)
6. [ ] `.github/workflows/frontend-ci.yml`: on push/PR to `frontend`, `dev`, `main` → pnpm install, lint, typecheck, build
7. [ ] Root `README.md`: one-paragraph overview, repo layout (D-009), "Run frontend" section; leave a "Run backend" placeholder for M
8. [ ] One Vitest test (e.g. `lib/colorScale.test.ts` with a stub `colorScale(p)` returning hex) to prove the test runner works

Constraints: touch only `frontend/`, `.github/`, root `README.md`, `.gitignore`, `.editorconfig`. No 3D model files yet.

Self-check gate (evidence required)
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0 (paste tail of output)
- `pnpm dev` → screenshot of `localhost:5173` showing modal, banner, 3 columns, rotating placeholder sphere
- `frontend-ci.yml` is valid YAML and committed; CI status is informational only (D-013) — do not wait for or debug the GitHub run
- Commit(s) on `frontend` with conventional messages

Human gate — H confirms screenshot + CI green → "GATE 1 APPROVED".

---

## Phase 2 — API contract + mock server + typed client 🔒 (approved 2026-10-08; backend sign-off deferred, D-016)

> **Status 2026-10-08:** Mock implementation closed out in `4669abb`, `30082a5`, `9d9b5c2`, `0d1037e` (after 6 earlier commits `57308f4`…`c28a198`); self-check evidence was reviewed on Oct 5. H explicitly approved Gate 2 on Oct 8 with backend contract sign-off deferred (D-016). `origin/ML-dev` at `d09ebda` answers Q1 partially but does not acknowledge the contract or provide an API. Record integration differences in `spec.md §12`; do not treat the real backend as a base-URL-only swap yet. Samples remain **synthetic**. Carry-over to S2: agree raw-input names, categorical encodings, WBC units, explanation scale and final thresholds with M; retain varied mock vessel probabilities and signed contributions as chart/viewer test fixtures.

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

Human gate — **Approved by H on 2026-10-08**, with the explicit D-016 exception deferring M's contract acknowledgement. This permits Phase 3 only; it does not certify real-backend compatibility.

---

## Phase 3 — 3D heart asset spike (timebox ½ day) 🔒 (approved 2026-10-08)

**Goal:** Lock D-012: a licensed GLB with addressable `Heart`, `LAD`, `LCX`, `RCA` nodes loads in R3F and recolours per vessel — or the fallback is implemented.

**Kickoff 2026-10-08:** Research remains capped at 45 minutes, followed by the existing fallback if needed. No backend integration or dashboard expansion in this phase. Preserve the combined remaining S1 budget above.

**Outcome 2026-10-08:** Selected the redistributable CC BY 4.0 *Realistic Human Heart* by neshallads; the source GLB has one heart mesh and no coronary branch nodes. Implemented D-012's approved fallback with separately addressable schematic LAD/LCX/RCA tube meshes. O reviewed the evidence, original-source licence metadata, embedded asset provenance, and clean pushed state at `1b605f8`. H approved the asset, licence, and fallback and authorised Phase 4.

Tasks
1. [x] Research (≤45 min): BodyParts3D (FMA IDs for heart, LAD = anterior interventricular branch, LCX = circumflex branch, RCA), **Z-Anatomy** (CC-BY-SA, derived from BodyParts3D, named parts, GLB/Blender exports), NIH 3D Print Exchange, Sketchfab CC0/CC-BY "heart coronary arteries". Record URL, licence, format, triangle count for each in `assets/heart/CANDIDATES.md`
2. [x] Acquire best usable candidate. The selected source GLB is already under 8 MB and requires no Draco/compression or Blender conversion; runtime supplies the required `Heart` group and separate vessel meshes. No runtime CDN dependency.
3. [x] Add `assets/heart/LICENSE.md` (source, author, licence, modifications); distribute GLB at `frontend/public/models/heart.glb` with adjacent attribution; fill `spec.md §10`
4. [x] Implement `HeartModel.tsx` (`useGLTF`), `vesselMap.ts`, independent `VesselMesh` geometry/materials using `lib/colorScale.ts` at `{LAD: .8, LCX: .3, RCA: .55}`, hover → emissive + `<Html>` tooltip, click → typed `uiStore.selectedVessel`, drei `<Bounds fit>`, `<Stats>` (dev only)
5. [x] Implement the approved fallback: generic licensed heart mesh + `TubeGeometry` on hand-authored `CatmullRomCurve3` paths; label them schematic, not patient-specific lesion maps
6. [x] Append the outcome decision referencing D-012 in `decisions.md`

Constraints: touch only `assets/`, `frontend/public/models`, `frontend/src/features/viewer`, `frontend/src/lib`, `frontend/src/store`, directly related `docs/spec.md §6/§10`, and append an asset decision to `docs/decisions.md` without deleting D-012. Minimal package-manifest/lockfile changes are allowed only for required asset tooling; update `frontend/README.md` only if asset setup needs instructions. Include O's known planning/documentation changes in the phase's documentation commit; preserve other work.

Self-check gate
- GLB 3,255,284 bytes; 22,562 heart triangles + 2,304 tube triangles = 24,866 total. Full inspect output and counts: `docs/evidence/s1p3-gltf-transform-inspect.txt`, `docs/evidence/s1p3-measurements.txt`.
- Cold cache-disabled load from navigation to first 3D draw: 489 ms in local Edge; conditions in `docs/evidence/s1p3-measurements.txt`.
- Screenshots: `docs/evidence/s1p3-colours.png`, `docs/evidence/s1p3-rotated-zoomed.png`, `docs/evidence/s1p3-selection.png`, `docs/evidence/s1p3-hover-selection.png`.
- Hover showed the vessel tooltip; click selected LAD and showed its illustrative test value. Screenshots above.
- Active drag: 121.3 rendered frames/s at a 1920×1080 viewport on the AMD Radeon 760M; idle demand rendering produced 0 draw calls in a 1 s sample. Full conditions in `docs/evidence/s1p3-measurements.txt`.
- `assets/heart/LICENSE.md` and adjacent `frontend/public/models/ATTRIBUTION.md` document the CC BY 4.0 model and attribution.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` exit 0; test/build evidence recorded at closeout.

Human gate — **Approved by H on 2026-10-08:** "Approve Gate 3 and proceed to retrospective (Recommended)". The active-rendering benchmark applies to the actual three-panel canvas at a 1920×1080 viewport, not a full-screen 1080p canvas. Replace the stale app-footer licence placeholder during cleanup; attribution already exists beside the model and in the viewer.

---

## Phase 4 — Retro & cleanup 🔒 (approved 2026-10-08)

**Goal:** Learn, archive, hand a clean baseline to Sprint 2.

Tasks
- [x] Finalise `docs/retro/sprint1.md`, recording what went well / wrong / actions and final aggregate credit actuals vs estimates
- [x] Review the retrospective draft with H, including the remaining calendar and orchestrator model choice: H approved the calendar (D-019) and retained the current orchestrator for S2 (D-020); do not start Sprint 2 delivery
- [x] Replace the app-footer asset placeholder with the selected heart attribution and existing local attribution link
- [x] Archive this plan as `planning/sprint1.md`; create `planning/plan.md` for Sprint 2 with Phase 0 only
- [x] Check `spec.md` for completed `[TBD-S1]` markers; none remain. Carry Q1–Q3 and the documented input/serving mismatches forward without claiming M sign-off
- [x] Reconcile the S1 budget from deduplicated local Copilot usage data; preserve historical snapshots and do not allocate an exact Phase 4 O cost
- [x] Record the approved remaining calendar without rolling the expired S1 schedule forward
- [x] Open the H-authorised `frontend` → `dev` PR (D-021; title "Sprint 1: foundation"); H merges after Gate 4. Local quality checks are the gate; CI remains informational per D-013

Self-check gate: closeout documentation and footer are committed and pushed; local frontend checks pass; the authorised PR is open.
Human gate — **Approved by H on 2026-10-08:** "Approve Gate 4 and record/push the transition" (D-022). No Sprint 2 Phase 0 or delivery work has started; Phase 0 begins after `/compact` per H (D-023).

**Closeout outcome:** The retrospective, footer attribution, archived plan, and Phase 0-only Sprint 2 plan are complete. O added and pushed the missing Phase 0 self-check definition in `1eb9917`. Deduplicated local telemetry snapshots are recorded above and in `docs/retro/sprint1.md`. [Baseline PR #1](https://github.com/ashishmokalkar/Multimodal-AI-Hackathon-Devpost/pull/1) is open; Gate 4 is approved, but H deferred merge until after discussions. O's known planning/documentation edits were preserved in the closeout commit.

---

## Tentative horizon (re-planned in each Phase 0)

| Sprint | Dates | Theme | Cap |
|---|---|---|---|
| S2 | Oct 9, after Gate 4 | **3D viewer**: live prediction → colour; vessel select ⇄ results sync; camera presets; legend; selected-vessel callout; polish materials/lighting | 1800 |
| S3 | Oct 10–11 | **Dashboard**: CAD gauge, vessel cards, SHAP waterfall ("Why?"), Vitals table, Model-metrics drawer, plain-language summary; swap to M's real backend; error/loading states | 1800 |
| S4 | Oct 12–13; Oct 14 buffer | **Ship**: hardening, a11y pass, perf check, frontend sections of 6-page doc, demo-video script + recording support; Oct 14 submission-only buffer | 1200 |
| Reserve | | | 700 |

H approved these remaining dates on 2026-10-08 (D-019), with S1 closeout by Oct 9 morning. Keep the scope and caps unchanged; M's backend delivery timing is not yet confirmed. Retain the current orchestrator for S2 per D-020, with a fresh planning session per D-011.
