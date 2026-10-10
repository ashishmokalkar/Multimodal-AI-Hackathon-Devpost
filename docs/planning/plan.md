# Sprint 3 Plan - Dashboard, UI/UX and gated real integration

**Status:** Gates 0 and 1 are approved; Phase 1 functional delivery is accepted
with presentation gaps explicitly carried into mandatory UI/UX Phase 2 (D-036).
H approved S2 Gate 3
and continuation in this session (D-031), then approved re-planning for
independent mock-dashboard work while M's reply is pending (D-032).
H approved the detailed delivery scope, allocations and dates below.
H requested one
Opus 5.5 extra-high read-only UI/UX review and a revised plan for the next phase.
The review is complete; H approved Phase 2 UI/UX and the budget reallocation
below. X recorded its execution kickoff and fresh usage baseline at
**2026-10-10T09:29:01.027Z**. Real integration is
Phase 3 and remains blocked behind the UI/UX gate and Gate R.

**Calendar:** S3 remains Oct 10-11, S4 Oct 12-13, and Oct 14 submission-only;
deadline Oct 14 at 20:45 CEST. Independent UI work can proceed after Gate 0.
Real integration in Oct 10-11 is provisional until M confirms an API date and
supplies the serving/runtime handoff. H reviews that dependency by Oct 10
18:00 CEST and again at Gate 1; these are approved follow-up checkpoints, not
promises from M. If readiness threatens Oct 11 completion, explicitly re-plan
scope/timing with H; do not silently consume the submission buffer.
The approved UI/UX phase targets Oct 10 completion and must not displace the
18:00 backend follow-up or reduce the reserved real-integration allocation.

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

Post-publication reconciliation through **2026-10-10T08:53:41.268Z**:
Phase 1 actual **32.928544** (O **0**, X **32.928544**); cumulative S3
**105.417119** (O **71.455220**, X **33.961899**); project total
**1878.0214365**, leaving **5121.9785635** under the 7000 cap. Phase 1
remaining is **617.071456** combined and **127.071456** on X's ceiling.
This supersedes the 08:51:50.334Z snapshot for current totals; that earlier
dated snapshot remains historical. Usage is local deduplicated telemetry,
not billing; final confirmation/report calls after this timestamp are excluded.

UI/UX review snapshot through **2026-10-10T09:21:21.565Z**:
project **2131.906220**, S3 **359.3019025**, Phase 1 including review
**286.8133275** (O including reviewer **252.673130**, X **34.1401975**).
The single H-requested Opus 5.5 review accounts for **182.234600** credits,
recorded under O's local session with model `claude-opus-5.5`; it is included
once in these totals, not added again. Remaining at this snapshot:
**4868.093780** overall and **1440.6980975** under S3. Later planning/gate
calls are excluded; this is local telemetry, not billing.

Reallocation approved by H (D-036): reduce Phase 1's combined ceiling from
650 to 400 and assign the released 250 to a mandatory UI/UX phase. Phase 1
including the review remains below 400 at this snapshot, with **113.1866725**
left. Its X ceiling stays 160. Preserve the 800 real-integration allocation,
100 cleanup allocation and 50 contingency; the S3 cap remains 1800.
This supersedes D-034's phase numbering and affected allocations, not its
total cap, submission dates or real-integration dependency.

UI/UX Phase 2 accounting starts **2026-10-10T09:26:56.101Z** after H's
approval. Count O's subsequent planning/handover/review activity in Phase 2;
X records its actual execution kickoff and baseline separately. Reconcile
Phase 1 using recorded events before this boundary; do not reset actuals or
count the Opus review again.

Reconciliation through **2026-10-10T09:27:30.923Z**: final Phase 1 recorded
usage before the UI/UX boundary is **308.9651975** (O including reviewer
**274.825000**, X **34.1401975**), leaving **91.0348025** under the revised
400 ceiling and **125.8598025** under X's unchanged 160 ceiling.
The pre-Phase-2 baseline is **2154.058090** project / **381.4537725** S3.
Phase 2 recorded O planning usage is **6.870500**, X **0**; cumulative
project is **2160.928590**, S3 **388.3242725**, leaving **4839.071410**
overall. Later gate-documentation/handover calls are excluded. X has not
started Phase 2 at this earlier snapshot; do not treat its whole-session usage
as a phase delta.

X execution kickoff and fresh deduplicated baseline: **2026-10-10T09:29:01.027Z**.
At that boundary Phase 2 usage is **17.5195375** (O **14.5381000**, X
**2.9814375**), leaving **232.4804625** combined and **97.0185625** under X's
ceiling. Cumulative S3 usage is **398.9733100** and project usage is
**2171.5776275**, leaving **1401.0266900** under the S3 cap and
**4828.4223725** under the project cap. This local-telemetry snapshot deduplicates
`assistant_usage_events` by `session_id`, `created_at`, `model`, `input_tokens`,
`output_tokens`, `cache_read_tokens`, and `total_nano_aiu`, after filtering
sessions by the project checkout path; it is not account billing. Later calls
are excluded.

| Phase | Combined allocation | X ceiling | State |
|---|---:|---:|---|
| 0 - Discussion and readiness planning | 200 | 0 | Approved |
| 1 - Independent explanation/input/metrics dashboard | 400 (was 650) | 160 | Approved with mandatory presentation carryover |
| 2 - Desktop UI/UX and demo visibility | 250 (new) | 100 | Authorised; X kickoff pending |
| 3 - Real integration, only after readiness approval | 800 | 200 | Blocked on M handoff and preceding gates |
| 4 - Retrospective and cleanup | 100 | 30 | Not started |
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

H authorised exactly one read-only Opus 5.5 extra-high reviewer for this UI/UX
feedback (D-035); it completed without edits/services/tests. No further agents
or direct M/X messages are authorised. All execution handovers pass through H.
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

## Phase 1 - Independent explanation/input/metrics dashboard (approved with presentation carryover)

**Goal:** Make the existing mock prediction interpretable through selected-target
charts, physiological inputs and transparent metrics without new backend assumptions.

**Allocation:** 400 O+X under D-036 (previously 650); X ceiling 160.
Prerequisite: Human Gate 0 (approved).
**Kickoff:** X began at **2026-10-10T08:18:26.168Z**; the cumulative
pre-kickoff baseline is recorded above. Events at or after this boundary count
toward Phase 1.

Atomic tasks

- [x] Add keyboard-operable Why?/Inputs views while keeping CAD/vessel
  probabilities and shared target selection accessible. CAD/clear restores CAD;
  ordinary target selection never moves the camera.
- [x] Render up to ten returned contributions as non-additive horizontal signed
  bars, ordered by absolute magnitude with deterministic ties. Reuse/extend
  existing helpers rather than duplicating ordering, target or unit logic.
  Include readable labels, response values/units and signed numeric text.
- [x] Label the chart's axis as model contribution, with mock/illustrative and
  unconfirmed-scale qualifications. No probability-point axis, causal language,
  clinical protective/harmful claims or additive base-to-probability waterfall.
- [x] Show metadata-grouped patient inputs/measurements and the selected target's
  returned contributions. Values correspond to the accepted prediction revision,
  not a later draft; response values take precedence for attributed inputs.
  Missing attributions say "Not returned", not zero effect. Missing inputs are
  unavailable, not filled with defaults. No reference-range classification.
- [x] Enable an accessible Model metrics drawer using existing typed `/model/metrics`
  data: all five metrics per CAD/LAD/LCX/RCA, model version, validation, sample count
  and training date. Mock values are prominently illustrative. Loading, error,
  retry and empty/unavailable states are explicit; distinguish mismatched metrics/
  prediction versions rather than claiming validation of another model.
- [x] Preserve immediate clearing of prediction-dependent charts/tables on
  edit/sample/reset/pending/error, existing freshness guards, synthetic labels,
  attribution and safety disclaimers. Model-level metrics may remain visible but
  must not appear to be patient predictions.
- [x] Add focused tests and fresh live mock evidence, run existing frontend
  checks, commit/push in-scope work and stop for Gate 1.

**Self-check gate 1 (X functional evidence submitted; presentation gaps identified):**

1. **Passed:** Distinct CAD/LAD/LCX/RCA fixtures verify target switching, top-ten cap,
   stable absolute ordering, positive/negative/zero values, labels/units and
   explicit empty output. Numeric accessible output matches plotted values.
2. **Passed:** Input/table fixtures distinguish missing attribution from returned zero,
   preserve response input values and units, and clear patient prediction detail
   after edits/pending/error. Existing race tests still pass.
3. **Passed:** Metrics fixtures cover all targets/metadata, mock labels, loading/error/retry,
   version mismatch and no fabricated metric fallback.
4. **X reports passed; presentation carryover approved:** Live screenshots show the sample -> selected vessel -> Why?/Inputs story,
   a changed fresh prediction and cleared stale output, plus the metrics drawer.
   Keyboard view navigation and drawer open/close/Escape/focus restoration work;
   focus cannot escape an open modal. ARIA tab semantics, if used, are complete.
5. **X reports passed; presentation carryover approved:** The 3D viewer, probability/selection correspondence, orbit/zoom and safety/
   mock/synthetic/schematic qualifications remain intact. No schema/backend/
   dependency changes or unconfirmed clinical/explanation claims are introduced.
6. **Passed:** Lint/typecheck/test/build pass. Evidence is under `docs/evidence/s3p1-*`;
   passing changes are committed/pushed, branch status and dated phase/sprint/project credits are reported.
   CI remains informational, with no waiting/debugging.

**O/reviewer assessment (2026-10-10):** Local and `origin/frontend` matched
`4e8508613143106d1f6860adfa535758a6353545`, with a clean working tree.
X records 34 passing tests and lint/typecheck/build, target/state/metrics
fixtures and live keyboard/drawer evidence. The read-only reviewer found no
new blocking data-flow defect, but identified demo presentation gaps:
cropped/enlarged heart captures, controls and prediction-source labels below
the fold, generic empty-state copy after edits, and weak chart zero/label
readability. The reviewer examined six 1920 x 1600 PNG captures; PNG dimensions
alone do not establish the browser viewport. The exact resize mechanism and
behavior at 1920 x 1080/1280 x 800 need live reproduction. No independent
browser checks or tests were run by O/reviewer.

**Human gate 1 (approved, 2026-10-10):** H selected "Approve Gate 1 carryover
and authorise UI/UX Phase 2 (Recommended)" (D-036). H explicitly accepts Phase 1's
functional delivery with presentation/visibility gaps from criteria 4-5 carried
into mandatory Phase 2, approves the revised allocations and authorises UI/UX
work only. Real integration remains unauthorised; missing M handoff cannot be
treated as sign-off or a silent Oct 14 delivery extension.

## Phase 2 - Desktop UI/UX and demo visibility (authorised; X kickoff recorded)

**Goal:** Make the core patient -> probability -> heart -> explanation story
usable in the actual desktop demo viewport without changing model behavior.

**Allocation:** 250 O+X; X ceiling 100.
Prerequisites: Human Gate 1 and explicit re-plan/reallocation approval
(both approved under D-036). Accounting begins at
**2026-10-10T09:26:56.101Z**; X records its fresh execution kickoff and
baseline. Do not reset Phase 1's actual usage.

Atomic tasks

- [ ] Reproduce the reported canvas growth/cropping before changing layout.
  Establish a viewport-bounded desktop workspace with independent patient/
  results scrolling and stable canvas dimensions across Why?/Inputs and
  prediction states. Keep Predict/auto-predict actions, viewer focus/reset,
  legend and selected-target callout visible. Fix sizing at the layout root;
  do not reset the camera on tab/target changes to mask cropping.
- [ ] Compact CAD/vessel readouts and expose one prominent prediction-source/
  version badge beside them: "Mock prediction" for mock responses and a truthful
  model-output label otherwise. Provide distinct initial, edited/manual,
  auto-debounce/updating, pending, invalid and error guidance using existing
  state or minimal shared UI state. Never retain old probabilities to fill space.
- [ ] Improve the signed chart's scale/labels: explicit zero-aligned tick with
  symmetric ticks/domain, readable feature/tick text and one axis title.
  Preserve exact accessible numeric values, full feature names in the numeric
  alternative, signed/missing/zero semantics and unconfirmed-scale wording.
- [ ] Preserve keyboard view/target selection, modal focus/Escape/restoration,
  safety/source/asset labels, 55-input editing and request freshness. Keep
  diagnostic FPS HUD off the ordinary demo view while allowing intentional
  measurement. No geometry/default-camera redesign or permanent vessel-label
  overlay work is required in this phase.
- [ ] Run focused regression checks and capture actual-viewport mock evidence,
  canvas stability and active-orbit performance; commit/push passing changes
  and stop for Gate 2. No ML/schema/dependency/asset changes.

**Self-check gate 2:**

1. At actual browser viewports **1920 x 1080** and **1280 x 800**, document
   scroll width/height do not exceed the viewport (allow 2 CSS px rounding).
   The default overview shows the whole heart; controls, legend/callout,
   Predict/auto-predict and the four probability readouts are visible without
   page scrolling. Long input/result lists scroll within their panels.
   Canvas height is at least **480 CSS px** at 1080 and **300 CSS px** at 800;
   record actual dimensions/DPR. These bounded targets reserve room for
   controls and disclaimers rather than maximising canvas height alone.
2. Across initial/no-result, Why?, Inputs, Inputs -> Why?, edit invalidation,
   pending and fresh-response states, canvas width/height vary by at most
   **2 CSS px** at a fixed viewport. Ordinary target/tab changes do not move
   the camera. Orbit, zoom, focus and reset remain usable.
3. At 1920 x 1080, all probabilities, source/version badge, view toggle and
   at least five chart bars are visible at the top of the results panel.
   At 1280 x 800, all probabilities, badge and toggle are visible without
   scrolling; the chart may scroll within the results panel. Mock/non-mock
   fixtures verify truthful badges. Edited/manual, auto-update and invalid/
   failure states explain the next action and expose no stale risk values.
4. Chart zero tick aligns with its zero reference line within **1 CSS px**.
   Axis/feature labels are at least **11 CSS px**; dense labels wrap to at
   most two lines or use an accessible truncation with full names in the
   numeric alternative. Cover mixed-sign, all-zero and small nonzero values;
   rounding must not mislabel a nonzero tick as zero. Keep one axis title.
5. Keyboard tab/target/action navigation and drawer focus/Escape/restoration
   still work at both viewports. Live edit/sample/pending/error checks retain
   neutral vessels and cleared patient detail. Capture non-full-page PNGs
   with exact viewport dimensions plus a text log of viewport/canvas/scroll
   measurements under `docs/evidence/s3p2-*`.
6. Active orbit remains **at least 50 FPS** at the measured 1920 x 1080
   viewport, with actual canvas/DPR/device/method recorded; demand rendering
   settles when idle. Lint/typecheck/test/build pass; report committed/pushed
   hashes, clean status and dated Phase 2/S3/project credits.

**Human gate 2:** H approves the measured demo layout, truthful states and
readability after O review, then revisits M's readiness. Real integration
still requires Gate R; if the handoff is absent or the calendar is threatened,
bring a scope/timing decision to H rather than starting speculative backend work.

## Gate R - Real-integration readiness (blocked on M)

**Readiness self-check:** Record M's contract acknowledgement/requested changes
and concrete API date; implemented serving commit and runtime/artifact handoff;
complete serving feature metadata and mapping of known names, BBB/VHD/Function
Class/WBC/Exertional CP differences; final target labels/thresholds; explanation
method/scale/availability; and final-model metrics with validation/version/source.
If an endpoint or attribution is unavailable, the proposed handling must be
explicit and approved, not silently substituted with mock output.

**Human readiness gate:** H approves the handoff, any contract amendments and
the achievable remaining calendar. Under the approved re-plan, required after
UI/UX Gate 2 and before real-integration Phase 3.
Neither M's reply alone nor a matching feature count closes this gate.

## Phase 3 - Real-backend integration (blocked; not authorised)

**Goal:** Run the agreed model-serving interface locally and prove the same
patient-to-prediction-to-vessel-to-explanation story using real model outputs.

**Allocation:** 800 O+X; X ceiling 200.
Prerequisites: Human Gates 2 and R. Issue a separate bounded handover at readiness.

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
  commit/push approved work, report credits and stop for Gate 3.

**Self-check gate 3:** Agreed serving schema/metadata/runtime work on the intended
machine; a non-sensitive real sample and a modified input produce accepted
responses reflected consistently in probabilities, vessel colours and explanations;
actual outputs/labels/methods/metrics/versions are evidenced; unavailable/
failed responses clear patient detail without mock fallback; local checks pass;
setup, artifacts, evidence and passing changes are documented/committed/pushed.
Refine the handover's exact fixtures/thresholds from M's confirmed contract, not guesses.

**Human gate 3:** H approves real-integration evidence after O review and
authorises retrospective/cleanup. If integration is blocked or cannot fit the
calendar, H must explicitly approve a revised closeout/scope; it cannot be
marked complete from mock evidence.

## Phase 4 - Retrospective and cleanup (not started)

**Goal:** Close S3 with accurate delivery status, budget and an S4 hardening/
documentation/video plan that preserves the submission buffer.

**Allocation:** 100 O+X; X ceiling 30.
Prerequisite: Human Gate 3 or an explicit H-approved revised closeout route.

Atomic tasks

- [ ] Review/write the S3 retrospective and reconcile dated O+X credits.
- [ ] Synchronise spec/decisions with actual integration/explanation/metrics status;
  retain every unresolved dependency without promoting mock work to real delivery.
- [ ] Archive S3 and prepare only unstarted S4 Phase 0, including final integrated
  performance/accessibility/reproducibility and video/document deadlines.
- [ ] Commit/push approved cleanup; report evidence/credits/status. No automatic
  PR changes, merge or S4 implementation.

**Self-check gate 4:** Required gates or explicit revised route are recorded;
retro/archive/spec/decisions/budget agree; actual model versus mock status and
remaining submission risks are truthful; S4 entry point includes both gates;
approved cleanup is published and the branch is clean.

**Human gate 4:** H approves S3 closeout and authorises S4 planning only.
