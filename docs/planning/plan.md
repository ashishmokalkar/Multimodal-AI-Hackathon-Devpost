# Sprint 3 Plan - Dashboard and separately gated real integration

**Status:** Gate 0 is approved and Phase 1 is delivered by X; its self-check
evidence is submitted and Human Gate 1 is pending H. H approved S2 Gate 3
and continuation in this session (D-031), then approved re-planning for
independent mock-dashboard work while M's reply is pending (D-032).
H approved the detailed delivery scope, allocations and dates below.
Only independent mock-dashboard Phase 1 is authorised; real integration
remains blocked behind Gates 1 and R.

**Calendar:** S3 remains Oct 10-11, S4 Oct 12-13, and Oct 14 submission-only;
deadline Oct 14 at 20:45 CEST. Independent UI work can proceed after Gate 0.
Real integration in Oct 10-11 is provisional until M confirms an API date and
supplies the serving/runtime handoff. H reviews that dependency by Oct 10
18:00 CEST and again at Gate 1; these are approved follow-up checkpoints, not
promises from M. If readiness threatens Oct 11 completion, explicitly re-plan
scope/timing with H; do not silently consume the submission buffer.

## Budget and boundaries

**S3 cap:** 1800 combined O+X credits within the hard 7000 project cap (D-008).
S3 starts **2026-10-10T07:25:25.736Z**. Recorded deduplicated events before
that boundary total **1772.6043175** project credits:
O **1601.466625**, X **171.1376925**. Final S2 recorded usage is
**364.6670425**, within its 1800 cap; **5227.3956825** project credits remain
at transition. Count events at/after the boundary as S3, not whole-session
usage. A snapshot through **2026-10-10T07:26:20.309Z** records **2.949630**
S3 credits, before later planning calls. Figures are local telemetry, not billing.

Gate 0 planning snapshot through **2026-10-10T07:30:27.738Z**:
S3 **24.950380** credits; project **1797.5546975**, with **5202.4453025**
remaining overall. Later gate-recording/handover calls are excluded.
X's Phase 1 kickoff snapshot through **2026-10-10T08:18:26.168Z** records
cumulative S3 usage of **72.488575** credits (O **71.455220**, X **1.033355**)
and project usage of **1845.0928925**, leaving **5154.9071075** under the
project cap. This is the Phase 1 baseline; S3 cumulative usage includes
Phase 0 and handover activity before this boundary. Phase 1 allocation and
X ceiling remain 650 and 160. Figures are deduplicated local telemetry, not billing.

Phase 1 delivery snapshot through **2026-10-10T08:51:50.334Z**:
Phase 1 actual **30.4126855** credits (O **0**, X **30.4126855**);
cumulative S3 **102.9012605** (O **71.455220**, X **31.4460405**);
project total **1875.5055785**, with **5124.4944215** remaining under the
7000 cap. Phase 1 has **619.5873145** combined allocation and **129.5873145**
of X's ceiling remaining. These are deduplicated local telemetry totals through
the stated snapshot, not billing; later review/publication calls are excluded.

Allocations approved at Gate 0 (D-034):

| Phase | Combined allocation | X ceiling | State |
|---|---:|---:|---|
| 0 - Discussion and readiness planning | 200 | 0 | Approved |
| 1 - Independent explanation/input/metrics dashboard | 650 | 160 | Authorised; kickoff pending |
| 2 - Real integration, only after readiness approval | 800 | 200 | Blocked on M handoff |
| 3 - Retrospective and cleanup | 100 | 30 | Not started |
| Contingency, separate H approval required | 50 | Unassigned | Unused |
| **Total** | **1800** | | |

These are ceilings, not targets or inferred model prices. X records fresh
phase kickoff timestamps/baselines. O accepts complete evidence without
rerunning checks unless a concrete concern requires it. No automatic
reallocation of unused S1/S2 budgets or contingency spending.

## Approved scope

- The score-led story is patient -> probabilities/3D correspondence ->
  selected-target explanation -> physiological inputs -> model transparency.
  Independent dashboard work advances interpretability (20%) and technical
  implementation (10%); it does not satisfy real integration (15%) or certify
  predictive performance (30%).
- Reuse the current contract, client/hooks, stores, Recharts and formatting/
  selection helpers. Freeze backend/schema changes during Phase 1.
- Deliver a signed top-ten chart, input/contribution table and metrics drawer.
  No decorative gauge, new asset search, public deployment, clinical reference
  classifier, new framework or package is needed.
- Mock/synthetic/schematic/unconfirmed-scale labels and clinical disclaimers
  remain visible. Probability is not artery narrowing; signed contributions
  are not causal effects or confirmed probability-point changes.

## External dependencies and submission accountability

| Item | Owner/action | Boundary |
|---|---|---|
| Contract response/requested changes and concrete API delivery date | H obtains M's response through the existing question list; O records it. Response remains pending. | Does not block independent UI Gate 0 under D-032. Required at real-integration readiness Gate R. Approved status checkpoints: Oct 10 18:00 CEST and Gate 1 (D-034). |
| Serving names/types/categories/units/defaults/bounds, thresholds, explanations and metrics source | M provides the serving payload/metadata and final-model details; H approves requested contract changes before X implements them. | Gate R; matching counts or mock compatibility are not sign-off. |
| Runtime and artifacts | M provides a serving commit, Python/dependency requirements, model artifacts/manifest and exact startup instructions compatible with the intended environment. | Gate R; verified WSL mock hosting does not prove real-backend readiness. |
| Demo video | Faizan is accountable (D-033): record/upload a 3-10 minute YouTube demo of inputs, live model flow, 3D selection and technical implementation. | Approved rough cut Oct 12, final recording/link Oct 13 (D-034). |
| Shared document | Faizan assembles the maximum-six-page document (D-033); request dataset/preprocessing/model/validation sections from Ashish. M's contribution timing remains unconfirmed. | Approved draft Oct 12, final Oct 13 (D-034). |

No agents or direct M/X messages are authorised. All handovers pass through H.
PR #1 remains unmerged; S3 approval does not authorise PR operations.

## Phase 0 - Discussion and readiness planning (approved)

**Goal:** Agree bounded independent work and a separate integration-readiness
boundary, with scope, evidence, calendar, owners and budget before implementation.

**Allocation:** 200 O+X; no X work.

Atomic tasks

- [x] Review S2 closeout/retro, current spec/decisions, dashboard/API/store
  surfaces and fresh deduplicated budget; record the S3 boundary.
- [x] Discuss M's pending response with H and record the explicit split under
  D-032. Preserve compatibility questions and the provisional integration window.
- [x] Assign accountable video/document owners (D-033); propose draft/final dates.
- [x] Draft scope, atomic tasks, allocations and objective/human gates below;
  synchronise spec and decisions without implementing features.
- [x] H approves calendar/checkpoints, submission dates, allocations and
  acceptance criteria at Gate 0, authorising only Phase 1 (D-034).
- [x] Issue the approved Phase 1 handover through H.

**Self-check gate 0 (passed):** S2 is closed; start/budget boundaries are measured;
allocations total 1800; plan/spec/decisions agree on the independent scope;
M's pending response has an explicit owner, checkpoint and blocking gate;
submission owners and approved deliverables/dates are recorded; every delivery
phase and final cleanup has objective and human gates; no implementation started.
M's response is not required to approve independent Phase 1 under D-032.

**Human gate 0 (approved, 2026-10-10):** H selected "Approve Gate 0 and authorise
independent dashboard Phase 1 (Recommended)", approving the detailed plan,
allocations, calendar/checkpoints and submission dates (D-034).
Gate R and Phase 2 are not implicitly approved.

## Phase 1 - Independent explanation/input/metrics dashboard (delivered; Gate 1 pending)

**Goal:** Make the existing mock prediction interpretable through selected-target
charts, physiological inputs and transparent metrics without new backend assumptions.

**Allocation:** 650 O+X; X ceiling 160. Prerequisite: Human Gate 0 (approved).
**Kickoff:** X began at **2026-10-10T08:18:26.168Z**; the cumulative
pre-kickoff baseline is recorded above. Events at or after this boundary count
toward Phase 1.

Atomic tasks

- [ ] Add keyboard-operable Why?/Inputs views while keeping CAD/vessel
  probabilities and shared target selection accessible. CAD/clear restores CAD;
  ordinary target selection never moves the camera.
- [ ] Render up to ten returned contributions as non-additive horizontal signed
  bars, ordered by absolute magnitude with deterministic ties. Reuse/extend
  existing helpers rather than duplicating ordering, target or unit logic.
  Include readable labels, response values/units and signed numeric text.
- [ ] Label the chart's axis as model contribution, with mock/illustrative and
  unconfirmed-scale qualifications. No probability-point axis, causal language,
  clinical protective/harmful claims or additive base-to-probability waterfall.
- [ ] Show metadata-grouped patient inputs/measurements and the selected target's
  returned contributions. Values correspond to the accepted prediction revision,
  not a later draft; response values take precedence for attributed inputs.
  Missing attributions say "Not returned", not zero effect. Missing inputs are
  unavailable, not filled with defaults. No reference-range classification.
- [ ] Enable an accessible Model metrics drawer using existing typed `/model/metrics`
  data: all five metrics per CAD/LAD/LCX/RCA, model version, validation, sample count
  and training date. Mock values are prominently illustrative. Loading, error,
  retry and empty/unavailable states are explicit; distinguish mismatched metrics/
  prediction versions rather than claiming validation of another model.
- [ ] Preserve immediate clearing of prediction-dependent charts/tables on
  edit/sample/reset/pending/error, existing freshness guards, synthetic labels,
  attribution and safety disclaimers. Model-level metrics may remain visible but
  must not appear to be patient predictions.
- [ ] Add focused tests and fresh live mock evidence, run existing frontend
  checks, commit/push in-scope work and stop for Gate 1.

**Self-check gate 1 (X evidence submitted; awaiting H approval):**

1. **Passed:** Distinct CAD/LAD/LCX/RCA fixtures verify target switching, top-ten cap,
   stable absolute ordering, positive/negative/zero values, labels/units and
   explicit empty output. Numeric accessible output matches plotted values.
2. **Passed:** Input/table fixtures distinguish missing attribution from returned zero,
   preserve response input values and units, and clear patient prediction detail
   after edits/pending/error. Existing race tests still pass.
3. **Passed:** Metrics fixtures cover all targets/metadata, mock labels, loading/error/retry,
   version mismatch and no fabricated metric fallback.
4. **Passed:** Live screenshots show the sample -> selected vessel -> Why?/Inputs story,
   a changed fresh prediction and cleared stale output, plus the metrics drawer.
   Keyboard view navigation and drawer open/close/Escape/focus restoration work;
   focus cannot escape an open modal. ARIA tab semantics, if used, are complete.
5. **Passed:** The 3D viewer, probability/selection correspondence, orbit/zoom and safety/
   mock/synthetic/schematic qualifications remain intact. No schema/backend/
   dependency changes or unconfirmed clinical/explanation claims are introduced.
6. **Passed:** Lint/typecheck/test/build pass. Evidence is under `docs/evidence/s3p1-*`;
   passing changes are committed/pushed, branch status and dated phase/sprint/project credits are reported.
   CI remains informational, with no waiting/debugging.

**Human gate 1 (pending):** H approves the independent dashboard after O review and
revisits M's readiness/calendar. Approval alone does not authorise Phase 2;
Gate R must also pass. Missing handoff triggers explicit re-planning, not an
automatic real-backend claim or a silent Oct 14 delivery extension.

## Gate R - Real-integration readiness (blocked on M)

**Readiness self-check:** Record M's contract acknowledgement/requested changes
and concrete API date; implemented serving commit and runtime/artifact handoff;
complete serving feature metadata and mapping of known names, BBB/VHD/Function
Class/WBC/Exertional CP differences; final target labels/thresholds; explanation
method/scale/availability; and final-model metrics with validation/version/source.
If an endpoint or attribution is unavailable, the proposed handling must be
explicit and approved, not silently substituted with mock output.

**Human readiness gate:** H approves the handoff, any contract amendments and
the achievable remaining calendar. Required after Gate 1 and before Phase 2.
Neither M's reply alone nor a matching feature count closes this gate.

## Phase 2 - Real-backend integration (blocked; not authorised)

**Goal:** Run the agreed model-serving interface locally and prove the same
patient-to-prediction-to-vessel-to-explanation story using real model outputs.

**Allocation:** 800 O+X; X ceiling 200.
Prerequisites: Human Gates 1 and R. Issue a separate bounded handover at readiness.

Atomic tasks

- [ ] Apply only H-approved contract/client changes; keep raw preprocessing and
  unit conversions in M's backend, once. Do not implement or retrain M's models.
- [ ] Follow M's runtime/artifact instructions in the intended WSL environment;
  verify health, CORS, metadata, samples, prediction and the approved metrics source.
- [ ] Reconcile input identifiers/categories/units and per-target thresholds/
  explanation scales with M's manifest. No base-URL-only compatibility claim.
- [ ] Validate real responses at runtime and retain request freshness and explicit
  unavailable/error states. Never fall back to mock predictions on real failures.
- [ ] Capture fresh real-response/UI evidence for all targets, selection, input
  changes and error recovery. Label metrics and attribution by their actual source/
  method/version; no experiment-to-deployed metric relabelling.
- [ ] Run targeted existing checks, document reproducible startup/artifact steps,
  commit/push approved work, report credits and stop for Gate 2.

**Self-check gate 2:** Agreed serving schema/metadata/runtime work on the intended
machine; a non-sensitive real sample and a modified input produce accepted
responses reflected consistently in probabilities, vessel colours and explanations;
actual outputs/labels/methods/metrics/versions are evidenced; unavailable/
failed responses clear patient detail without mock fallback; local checks pass;
setup, artifacts, evidence and passing changes are documented/committed/pushed.
Refine the handover's exact fixtures/thresholds from M's confirmed contract, not guesses.

**Human gate 2:** H approves real-integration evidence after O review and
authorises retrospective/cleanup. If integration is blocked or cannot fit the
calendar, H must explicitly approve a revised closeout/scope; it cannot be
marked complete from mock evidence.

## Phase 3 - Retrospective and cleanup (not started)

**Goal:** Close S3 with accurate delivery status, budget and an S4 hardening/
documentation/video plan that preserves the submission buffer.

**Allocation:** 100 O+X; X ceiling 30.
Prerequisite: Human Gate 2 or an explicit H-approved revised closeout route.

Atomic tasks

- [ ] Review/write the S3 retrospective and reconcile dated O+X credits.
- [ ] Synchronise spec/decisions with actual integration/explanation/metrics status;
  retain every unresolved dependency without promoting mock work to real delivery.
- [ ] Archive S3 and prepare only unstarted S4 Phase 0, including final integrated
  performance/accessibility/reproducibility and video/document deadlines.
- [ ] Commit/push approved cleanup; report evidence/credits/status. No automatic
  PR changes, merge or S4 implementation.

**Self-check gate 3:** Required gates or explicit revised route are recorded;
retro/archive/spec/decisions/budget agree; actual model versus mock status and
remaining submission risks are truthful; S4 entry point includes both gates;
approved cleanup is published and the branch is clean.

**Human gate 3:** H approves S3 closeout and authorises S4 planning only.
