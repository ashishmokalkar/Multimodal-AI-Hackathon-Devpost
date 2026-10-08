# Sprint 2 Plan — 3D viewer integration

**Calendar:** Oct 9, after Gate 4 approval (D-019). Oct 14 remains submission-only buffer.

**Status:** Planning skeleton only. Gate 4 is awaiting H approval; Phase 0 has not started, and no Sprint 2 delivery work is authorised yet.

**Sprint cap:** 1800 credits (D-008). Latest S1 closeout telemetry: 1354.6 local credits used, 5645.4 remaining under the 7000-credit project budget. This is local telemetry, not account-billing reconciliation.

**Tentative theme:** Live prediction-to-vessel colour mapping, vessel selection synchronisation with results, camera presets, legend, selected-vessel callout, and viewer polish. Confirm or amend scope and acceptance criteria during Phase 0; no delivery tasks are defined here.

## Phase 0 — Discussion & Research ⬜ (not started)

**Goal:** Confirm S2 scope, acceptance criteria, integration dependencies, self-checks, and human gates before delivery is planned.

**Credit estimate:** Set with H during Phase 0 budget review; no Phase 0 or delivery work has started.

Tasks

- [ ] Review `docs/spec.md`, `docs/decisions.md`, `docs/retro/sprint1.md`, and current deduplicated budget.
- [ ] Confirm viewer scope and measurable acceptance criteria with H; retain the current orchestrator for S2 (D-020).
- [ ] Via H, obtain M's acknowledgement or requested changes to `docs/api-contract.md`, plus a concrete API delivery date.
- [ ] Via H, assign ownership for the demo video and shared six-page document.
- [ ] Define delivery-phase self-check evidence and human gates with H.
- [ ] Update this plan with approved scope, dependencies, estimates, and delivery phases; do not begin implementation before the Phase 0 human gate.

### Integration questions carried forward

- The mock API is a contract fixture, not an agreed serving interface. No backend contract acknowledgement, FastAPI serving app, or real-model integration is established; do not treat the frontend as a base-URL-only swap.
- ML-dev documents 55 cleaned inputs (21 continuous, 3 ordinal, 31 binary), but serving names, units, allowed ranges/defaults, and final per-target pipeline inputs remain unconfirmed. Define an explicit map for raw identifiers including `EX-Smoker`, `Airway disease`, `St Elevation`, `St Depression`, and `Tinversion`.
- Raw `BBB` is categorical (`N`, `LBBB`, `RBBB`) and expands to two binary inputs, while the mock uses a boolean. Raw `VHD` has four levels (`N`, `mild`, `Moderate`, `Severe`) mapped to 0–3, while the mock uses a boolean. `Function Class` is 0–3 in the data versus 1–4 in the mock.
- ML WBC values are 3700–18000; the form uses thousands per microlitre (default 7.5). Confirm the serving unit and perform any factor-of-1000 conversion exactly once. `Exertional CP` is constant and dropped by ML; matching feature counts alone do not establish compatibility.
- Evaluation currently uses threshold 0.5, but final per-target thresholds are not confirmed. Final model export, calibration, explanation methods, and serving are not implemented in the reviewed ML-dev snapshot; do not assume TreeExplainer availability or combine unlike explanation scales.
- Confirm whether all five contract endpoints, including `/model/metrics`, will be served or whether metrics will be delivered as a static artifact. Experimental metrics must not be presented as final deployed-model metrics.
- Samples remain synthetic; no real-model integration or backend sign-off is claimed. Carry the remaining parts of Q1–Q3 in `docs/spec.md` §12.

**Human gate:** H approves the Phase 0 scope, acceptance criteria, dependencies, estimates, and delivery gates before any S2 implementation begins. Gate 4 must be approved before Phase 0 starts.
