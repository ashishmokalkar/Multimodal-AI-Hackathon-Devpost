# Decision Log

Append-only. Format: ID · date · decision · rationale · status. Supersede, never delete.

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 2026-10-05 | **4 sprints × ~2 days**: S1 Oct 5–7, S2 Oct 8–9, S3 Oct 10–11, S4 Oct 12–14 (Oct 14 = submission buffer). | ~9 days remain; short sprints give 3 retro/re-plan points before the deadline. H preference over 3×3. | Active |
| D-002 | 2026-10-05 | Frontend stack: **Vite + React 18 + TypeScript + React Three Fiber + drei + Tailwind CSS**. State via Zustand; server state via TanStack Query; charts via Recharts. | R3F is named in the brief; best GLTF/picking/camera ecosystem; Vite is fastest to scaffold; no SSR needed for a local demo. | Active |
| D-003 | 2026-10-05 | Planning docs (`docs/`) are **committed to the repo on the `frontend` branch**. | Survives machine/session changes; executor reads them from the checkout; colleague can see them after merge to `dev`. | Active |
| D-004 | 2026-10-05 | **Frontend team owns the API contract** (`docs/api-contract.md`) and a mock server. Colleague signs off, then implements against it. | Unblocks frontend immediately; 15 % of the score is integration — a written contract is the cheapest insurance. | Active |
| D-005 | 2026-10-05 | Mock server is a **FastAPI stub in `mock-api/`** with pydantic schemas that mirror the contract. Colleague's real server lives in `backend/` on the `ml` branch and can lift the schemas verbatim. | Same framework as the real backend → swap is a base-URL change; schemas become the single source of truth. | Active |
| D-006 | 2026-10-05 | **No public deployment.** Demo runs locally (`pnpm dev` + `uvicorn`). | Saves time and credits; judges evaluate via video + repo. Revisit only if S3 finishes early. | Active |
| D-007 | 2026-10-05 | This workspace folder **is** the repo checkout. Branches `main` → `dev` → `frontend` created and pushed 2026-10-05. We commit only to `frontend`. | Single tree for H, O and X; no path confusion in handovers. | Active |
| D-008 | 2026-10-05 | Budget **7000 credits shared** by O and X. Caps: S1 1500 · S2 1800 · S3 1800 · S4 1200 · reserve 700. O tracks spend from Copilot local usage data (`assistant_usage_events.total_nano_aiu`) at every gate. | H request. Caps front-load risk work and leave buffer for the submission sprint. | Active |
| D-009 | 2026-10-05 | Repo layout: `frontend/` (ours), `mock-api/` (ours), `backend/` (colleague), `docs/` (shared), `assets/` (3D meshes + licenses). | Clear ownership → no merge conflicts between `frontend` and `ml` branches. | Active |
| D-010 | 2026-10-05 | The patient-feature form is **data-driven from `GET /features`** (name, label, type, unit, range, default, group). No feature names hard-coded in UI. | Brief requires adding clinical features without redesign. | Active |
| D-011 | 2026-10-05 | Credit discipline: large self-contained handovers; fresh orchestrator session per sprint; no sub-agents without H approval; X batches tool calls. | First planning session measured ~4 credits/tool call and ~70 credits for a cold start. | Active |
| D-012 | 2026-10-05 | 3D asset strategy: **spike in S1** to source an open-licensed heart mesh with separately addressable LAD/LCX/RCA (BodyParts3D first). **Fallback**: generic heart mesh + procedural tube/sphere "vessel nodes" placed on hand-authored splines. Decision locked at S1 Phase 3 gate. | Highest technical risk for 25 % of the score; must be de-risked before S2 viewer work. | Active |
