# Sprint 3 Plan - Dashboard, UI/UX and gated real integration

**Status:** Gates 0, 1, 2 and R are approved. H accepted the delivered desktop
UI/UX at Gate 2 (D-037), then approved the pinned ML handoff and runtime-first
integration at Gate R (D-038). Core real integration and the D-041 warning
UI/regressions are published. On Oct 10 H explicitly approved closing Phase 3
with its remaining warning live evidence carried into Phase 4 (D-042).
Human Gate 3 is approved with that carryover, not an unconditional self-check
pass: saved exact-viewport captures, live keyboard disclosure activation and
closed/open canvas measurements were initially unverified. Phase 4 captured
partial patient-20 evidence. H subsequently manually confirmed keyboard
activation and the qualified empty-warning state, then approved Gate 4 with
the remaining viewport evidence carried to S4 (D-044). S3 is closed with that
explicit exception, not a complete original self-check pass. X's verification
services were stopped; H later started the local services for manual checks.
Original overruns and allocations remain recorded; no ceiling is reset.
The completed Opus review and UI/UX phase do not authorise a broader redesign,
CSV/document import or additional agents. H retains the current orchestrator
and manual handover workflow (D-031).

**Calendar:** S3 remains Oct 10-11, S4 Oct 12-13, and Oct 14 submission-only;
deadline Oct 14 at 20:45 CEST. Independent UI work can proceed after Gate 0.
M's written handoff declares the real API available now. H approved an Oct 10-11
integration attempt against the pinned source, with WSL verification first.
Retain the Oct 10 18:00 CEST checkpoint for an actual integration status or
blocker, rather than another request for initial API delivery. If runtime setup
exceeds 45 minutes or 60 X credits, or the same root cause fails twice after
genuine fixes, stop and report through H. If completion by Oct 11 is threatened,
explicitly re-plan scope/timing; do not consume the submission buffer silently.
The UI/UX phase is accepted; the 800 integration allocation remains intact.

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
overall. Later gate-documentation/handover calls are excluded. This historical
snapshot predates X's Phase 2 kickoff; do not treat whole-session usage as a
phase delta.

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
| 2 - Desktop UI/UX and demo visibility | 250 (new) | 100 | Accepted at Gate 2, D-037 |
| 3 - Real integration, runtime verification first | 800 | 200 original; D-039 closeout exception; D-041 adds a 30-credit corrective limit | Closed at Human Gate 3 with explicit warning-evidence carryover, D-042 |
| 4 - Warning-evidence carryover, retrospective and cleanup | 100 | 30 total; D-043 adds 10 X credits for carried warning work within this same ceiling | Partial evidence and closeout published; Gate 4 pending |
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
- Mock/synthetic/schematic labels and clinical disclaimers remain visible.
  Mock explanations retain their unconfirmed-scale wording. Phase 3 may label
  real contributions as percentage points only under the approved v1.1 profile
  and successful full-response additivity checks. Probability is not percentage
  artery narrowing; attribution is not causation.
- Freeze the broad layout/geometry/camera design during integration. Heart
  framing and concise explanatory copy are candidates for separately approved
  post-integration polish. A schema-driven CSV import with preview/confirmation
  is only a future candidate; XLSX/Word/PDF/OCR/extraction, FHIR, beating-heart
  animation, nearest-flip scenarios and global heart tint are not authorised.
  M's UI research is inspiration, not additional implementation scope.

## External dependencies and submission accountability

| Item | Owner/action | Boundary |
|---|---|---|
| Contract response and API delivery | M's written reply and implemented API are available at the source pin below. H approved v1.1 handling under D-038. | Gate R approved; initial delivery is no longer a blocker. Oct 10 18:00 remains an integration-status checkpoint. |
| Serving metadata, thresholds, explanations and metrics | `/features`, `api/schemas.py`, API implementation and manifest supply the reviewed boundary. | Implement only the approved profile below; parsing old required keys alone is insufficient. |
| Runtime and artifacts | Separate Python 3.11.9 WSL environment, all model artifacts/endpoints, CORS and Windows localhost are verified in X's delivered evidence. Setup took 4m39s / 1.902883 X credits, within both limits. | Initial runtime blocker is resolved. Preserve the environment and source pin; local verification does not establish clinical validation or public deployment. |
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

## Phase 2 - Desktop UI/UX and demo visibility (accepted at Gate 2)

**Goal:** Make the core patient -> probability -> heart -> explanation story
usable in the actual desktop demo viewport without changing model behavior.

**Allocation:** 250 O+X; X ceiling 100.
Prerequisites: Human Gate 1 and explicit re-plan/reallocation approval
(both approved under D-036). Accounting begins at
**2026-10-10T09:26:56.101Z**; X's execution kickoff and fresh baseline are
recorded below. Do not reset Phase 1's actual usage.

Atomic tasks

- [x] Reproduce the reported canvas growth/cropping before changing layout.
  Establish a viewport-bounded desktop workspace with independent patient/
  results scrolling and stable canvas dimensions across Why?/Inputs and
  prediction states. Keep Predict/auto-predict actions, viewer focus/reset,
  legend and selected-target callout visible. Fix sizing at the layout root;
  do not reset the camera on tab/target changes to mask cropping.
- [x] Compact CAD/vessel readouts and expose one prominent prediction-source/
  version badge beside them: "Mock prediction" for mock responses and a truthful
  model-output label otherwise. Provide distinct initial, edited/manual,
  auto-debounce/updating, pending, invalid and error guidance using existing
  state or minimal shared UI state. Never retain old probabilities to fill space.
- [x] Improve the signed chart's scale/labels: explicit zero-aligned tick with
  symmetric ticks/domain, readable feature/tick text and one axis title.
  Preserve exact accessible numeric values, full feature names in the numeric
  alternative, signed/missing/zero semantics and unconfirmed-scale wording.
- [x] Preserve keyboard view/target selection, modal focus/Escape/restoration,
  safety/source/asset labels, 55-input editing and request freshness. Keep
  diagnostic FPS HUD off the ordinary demo view while allowing intentional
  measurement. No geometry/default-camera redesign or permanent vessel-label
  overlay work is required in this phase.
- [x] Run focused regression checks and capture actual-viewport mock evidence,
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

**Self-check gate 2 (X evidence reviewed and accepted under D-037):**

1. **Passed:** Reproduction captures `s3p2-before-1920x1080.png` and
   `s3p2-before-1280x800.png` show the original document growth/canvas cropping.
   Final exact-viewport captures are `s3p2-1920x1080.png` and
   `s3p2-1280x800.png`. Document dimensions are exactly the viewport at both
   sizes. At 1920 x 1080, patient/results scrollports are 730/818 CSS px high
   with content heights 923/1402 px. At 1280 x 800, they are 452/540 px high
   with content heights 923/1422 px. The complete heart, legend, selected-target
   callout, viewer controls, Predict actions and probabilities remain in view.
   The canvas is 620.77 x 591.86 CSS px at 1080p and 505.73 x 313.55 CSS px at
   800p, DPR 1.
2. **Passed:** `s3p2-live-measurements.json` records identical canvas bounds
   through default CAD, LAD selection, Why?/Inputs, edit invalidation, pending
   and fresh-response states at each fixed viewport (0 CSS px measured change).
   `s3p2-camera-cad.png` and `s3p2-camera-lad.png` show the same overview after
   ordinary target selection; only explicit focus/reset controls affect the view.
3. **Passed:** A fresh synthetic Sample patient 1 response with Typical Chest
   Pain true returned CAD/LAD/LCX/RCA probabilities 88.2/89.0/86.9/87.8%.
   Toggling it false produced a new accepted response of 75.2/76.7/72.9/74.5%.
   The 1920 screenshot shows all four readouts, “Mock prediction”/version,
   Why?/Inputs and ten visible chart rows. At 1280 x 800 all probabilities,
   source/version and view controls remain visible; chart content scrolls
   internally. Values were read from the live mock flow, not reused from older
   screenshot evidence.
4. **Passed:** The 0.00 tick centre aligns with its zero reference line within
   0.03 CSS px. Chart and feature labels are 11 CSS px; full accessible numeric
   alternatives retain feature names and signed values. Existing tests cover
   mixed signs, all-zero and small nonzero ticks without zero-rounding.
5. **Passed:** `s3p2-live-measurements.json` records Enter/Space target and
   view selection, keyboard Reset/focus, plus drawer focus containment,
   Escape and restoration at both viewports. `s3p2-unavailable-states.json`
   records immediate clearing/neutral vessels for invalid input and a rejected
   live request, explicit alerts and successful sample recovery.
6. **Passed:** On the HP Victus demo laptop, Edge 155 used the AMD Radeon 760M
   WebGL2 renderer at a 1920 x 1080 viewport, DPR 1 and 620 x 591 drawing
   buffer. Active orbit measured **144.3 rendered clears/second**; the demand
   renderer produced zero further frames over each 1.5-second idle check,
   including after damping settled. Diagnostic FPS HUD is absent from ordinary
   screenshots. Frontend lint, typecheck, build passed; Vitest passed 12 files
   and 38 tests. The build retains its non-blocking >500 kB chunk advisory.

Final deduplicated local telemetry through **2026-10-10T10:20:43.447Z**:
Phase 2 **130.311761** credits (O **72.291720**, X **58.020041**), leaving
**119.688239** of the combined allocation and **41.979959** of X's ceiling.
Relative to X's 09:29 kickoff baseline, the measured increment is
**112.7922235** (O **57.753620**, X **55.0386035**). Cumulative S3 is
**511.7655335** (O **418.571940**, X **93.1935935**); project total is
**2284.369851** (O **2020.038565**, X **264.331286**). This leaves
**1288.2344665** under the S3 cap and **4715.630149** under the project cap.
The read-only local
session-store query uses the project's checkout-path filter and distinct
deduplication fields from `scripts/credits.py`; these are telemetry, not
billing. Events after the stated snapshot are excluded.

**Human gate 2 (approved, 2026-10-10):** H selected "Approve Gate 2
(Recommended)" after O's evidence review and UX discussion (D-037). The bounded
layout is accepted; small-heart framing and input-entry effort are not silently
added to the completed phase. Gate R was subsequently approved separately.

Transition reconciliation through **2026-10-10T10:30:50.850Z**: final Phase 2
events before the Phase 3 boundary total **195.743877** (O **129.029930**,
X **66.713947**), including review/readiness discussion and publication calls.
This leaves **54.256123** under its 250 allocation and **33.286053** under
X's 100 ceiling. Pre-Phase-3 project usage is **2349.801967**, S3
**577.1976495**, leaving **4650.198033** overall and **1222.8023505** under
S3. These supersede earlier dated current totals, not their historical evidence.
Usage is deduplicated local telemetry, not account billing.

## Gate R - Real-integration readiness (approved, D-038)

**Source pin:** `ML-dev` commit
`6d3e403ffae65857124929335bbc534e8fd116c4`. The API/model implementation is
`9ddb96b`; `2f28ab7` adds the written handoff; `6d3e403` relocates it and adds
UI research without changing the reviewed API/model code. Do not follow a
moving branch head during execution.

Read first at the pin: `handover_docs/ML_ANSWERS_FOR_FRONTEND.md`,
`api/README.md`, `api/schemas.py`, `api/main.py`, `api/explain.py`,
`models/manifest.json` and `reports/BEST_MODELS.md`.

**Readiness self-check (source handoff complete):**

- M declares available now; all five existing endpoints have implementation.
  Contract v1.1 has 49 frontend-facing inputs, with conversion/feature
  engineering owned by the backend. BBB/VHD are categorical, Function Class
  is 0-3, WBC remains x10^3/uL, Chest Pain/Smoking are single choices, and
  BMI/Obesity/constant Exertional CP are not entered.
- Final/demo models, manifest, Python 3.11.9 and pinned requirements exist.
  The API also requires the original primary XLSX and subgroup CSV at runtime;
  importing only `api/` and `models/` would be incomplete.
- CAD/LAD/LCX/RCA return per-target decision thresholds and uncertainty.
  Explanations are baseline Shapley on the served, capped probability.
  Four-decimal JSON rounding requires a measured tolerance, not exact equality.
  Metrics come from the manifest's cross-validation report, not a new frontend
  measurement or clinical validation.
- Source resolves the sample-edit ambiguity: a valid `sample_id` keeps edited
  scenarios on demo models; without it, changed samples use final models.
  This is implemented in `api/main.py` despite less explicit API README wording.
- O has inspected the handoff/source, not run the models or API. WSL feasibility
  is not proven. H explicitly approves verifying it first in Phase 3, with
  bounded stop limits and no downgrade, retraining or mock fallback.

**Human Gate R (approved, 2026-10-10):** H selected "Approve Gate R and
authorise Phase 3 (Recommended)", approving the source pin, scoped import,
v1.1 changes, holdout provenance across sample edits, separate WSL environment
and runtime-first stop limits. This approves an integration attempt, not
runtime success, deployed metric equivalence or clinical validity.

**Approved ingestion:** Keep Git/frontend on Windows and branch `frontend`.
Fetch the source ref only if needed, then import the allowlisted files from the
exact pin after checking for collisions; preserve source bytes and record hashes.
No branch switch, merge, cherry-pick, new worktree or clone is authorised.

- `api/`; `models/manifest.json`, four final and four demo `.joblib` files;
  root `requirements.txt`; `tests/test_api.py`.
- Runtime support: `ml/__init__.py`, `data.py`, `export.py`, `features.py`,
  `models.py`, `preprocess.py`, `v2.py`, `cv.py`, `evaluate.py`, `risk_scores.py`,
  `selection.py`, `v2_fe.py`. Do not execute export/training/CV entry points.
- `data/raw/z_alizadeh_sani_ext/z_alizadeh_sani_ext.xlsx`;
  `reports/v2/s9/s9_subgroups.csv`; `reports/BEST_MODELS.md`;
  `handover_docs/ML_ANSWERS_FOR_FRONTEND.md`.

Do not import the UI research DOCX, unrelated datasets, experiment outputs or
training runners. Do not overwrite conflicting existing files; report collisions
or a missing support module through H. All individual reviewed artifacts are
below the workflow's 10 MB binary limit. Preserve dataset citation/licence.
The imported serving/model/preprocessing implementation is unchanged;
directly related regression additions to `tests/test_api.py` are permitted.

## Phase 3 - Real-backend integration (closed with evidence carryover, D-042)

**Goal:** Run the agreed model-serving interface locally and prove the same
patient-to-prediction-to-vessel-to-explanation story using real model outputs.

**Allocation:** 800 O+X; X ceiling 200.
Prerequisites: Human Gates 2 and R (both approved).
Accounting begins **2026-10-10T10:30:42.653Z** after Gate R approval, including
O's subsequent documentation/handover/review. X records its separate actual
kickoff timestamp and fresh baseline; do not reset ceilings. At the transition
snapshot above, Phase 3 has **2.363880** O credits and **0** X credits recorded;
later documentation/handover calls are excluded.

Handover-preparation snapshot through **2026-10-10T10:33:46.430Z**: Phase 3
**22.139820** (O **22.139820**, X **0**), leaving **777.860180** combined
and X's full **200** ceiling. Project total **2371.941787**, S3
**599.3374695**, leaving **4628.058213** overall and **1200.6625305** under
S3. This is local deduplicated telemetry, not billing; later editing/publication/
handover calls are excluded and X must take a fresh actual kickoff snapshot.

X actual execution kickoff and fresh baseline: **2026-10-10T10:35:23.548Z**.
Through kickoff, Phase 3 was **33.668890** (O **33.668890**, X **0**);
cumulative S3 was **610.8665395** (O **508.979040**, X **101.8874995**);
project total was **2383.470857** (O **2110.445665**, X **273.025192**).
Remaining: **766.331110** under Phase 3, **200** on X's ceiling,
**1189.1334605** under S3 and **4616.529143** under the project cap. The
read-only local telemetry was deduplicated by `session_id`, `created_at`,
`model`, `input_tokens`, `output_tokens`, `cache_read_tokens` and
`total_nano_aiu`, after filtering to the project checkout path; it is not
billing. Later events are excluded from this kickoff baseline.

**Historical snapshot through `2026-10-10T13:54:35.093Z` (superseded, retained):**
Phase 3 **266.428696** (O **33.668890**, X **232.759806**); S3 **843.6263455**;
project **2616.230663**. It recorded X **32.759806** over the original 200
ceiling.

**Final closeout accounting snapshot — deduplicated local telemetry, not billing:**
through **2026-10-10T14:07:55.511Z**, Phase 3 actual was **287.152875**
(O **33.668890**, X **253.483985**). This is **512.847125** under the
800 combined allocation; X is **53.483985** over the original 200 ceiling.
S3 cumulative usage was **864.3505245** (O **508.979040**, X **355.3714845**)
and project usage **2636.954842** (O **2110.445665**, X **526.509177**),
leaving **935.6494755** under the S3 cap and **4363.045158** under the project
cap. The calculation deduplicates `assistant_usage_events` on session, event
time, model, token counts and `total_nano_aiu`, scoped to the exact project
checkout; Phase 3 starts at the approved `2026-10-10T10:30:42.653Z` boundary.
D-039 authorizes closeout after the X ceiling overage; neither budget nor
actuals are reset.

The aggregate increase from the previous recorded snapshot
(`2026-10-10T13:54:35.093Z`) is **20.724179** credits for Phase 3, S3 and the
project. O resolved the previously reported **9.600860** interval mismatch:
the earlier snapshot already includes the event exactly at its cutoff.
An inclusive `>=` slice counts that boundary event again, giving **30.325039**.
The correct incremental interval is strictly after the earlier cutoff and
through the final cutoff, giving **20.724179**. Do not add 9.600860 to the
project total. X's chat report also understated S3 as 860.269583; the recomputed
864.3505245 above is the current total for that historical cutoff. Preserve
the older snapshots with this correction. The accounting-only update,
push/status checks and reporting calls after the cutoff remain excluded.

**O Gate 3 review and H-approved correction (D-041):** Core real integration,
source integrity, response correspondence and runtime evidence are supported.
Warning visibility is not complete: `RawResult.tsx` renders warnings after the
selected-target chart/input table and risk summary. Patient 20's age-related
reliability warning is absent from the initial 1920x1080 and 1280x800 captures.
It is not sufficient that the warning exists far below the fold.

H selected "Approve bounded correction (Recommended)". Corrective accounting
begins **2026-10-10T14:12:15.540Z**; X records its actual repair kickoff and
fresh baseline. Allow at most **30 additional X credits** for the warning UI,
focused regression/live evidence and related documentation/publication. This
does not reset the original 200 ceiling, past overrun or the 800 combined
allocation. Stop for H if the new allowance is exhausted; D-039's closeout-only
permission does not authorise unlimited corrective implementation.

Snapshot through **2026-10-10T14:12:14.882Z**: project **2697.263846**
(O **2168.887655**, X **528.376191**); S3 **924.6595285**
(O **567.421030**, X **357.2384985**); P3 **347.461879**
(O **92.110880**, X **255.350999**). Remaining: **4302.736154** overall,
**875.3404715** under S3 and **452.538121** under P3. These are deduplicated
local telemetry, not billing; later correction planning/handover calls are
excluded. Take an actual execution snapshot rather than resetting actuals.

**X corrective execution kickoff and fresh baseline:** kickoff
`2026-10-10T14:13:49.730Z`; deduplicated local telemetry through that cutoff
(not billing) was project **2713.040056** (O **2184.663865**, X **528.376191**),
S3 **940.4357385** (O **583.197240**, X **357.2384985**) and P3 **363.238089**
(O **107.887090**, X **255.350999**). The corrective interval already contained
O **15.776210** and X **0** credits at kickoff; this is included in the
baseline, not added again. The script's exact checkout filter and deduplication
fields match `scripts/credits.py`; the cutoff excludes later execution calls.

**Intermediate corrective snapshot through `2026-10-10T14:29:06.590Z`:** P3
**378.2348025** (O **107.887090**, X **270.3477125**); S3 **955.432452**
(O **583.197240**, X **372.235212**); project **2728.0367695**
(O **2184.663865**, X **543.3729045**). Corrective X usage since its fresh
baseline is **14.9967135**, leaving **15.0032865** of D-041's 30-credit X
allowance. The unchanged 800-credit combined P3 has **421.7651975** remaining;
S3 and project totals remain below their unchanged caps. These are local
telemetry, not billing; calls after the last recorded event are excluded.

**Publication snapshot through the last recorded event at
`2026-10-10T14:33:51.041Z`:** P3 **384.1292785** (O **107.887090**, X
**276.2421885**); S3 **961.326928** (O **583.197240**, X **378.129688**);
project **2733.9312455** (O **2184.663865**, X **549.2673805**). Corrective X
usage from the fresh kickoff baseline is **20.8911895**, leaving **9.1088105**
of the additional 30-credit X allowance. The unchanged P3 combined allocation
has **415.8707215** remaining; the original X overrun is not reset. This is
deduplicated local telemetry, not billing; later documentation/push/reporting
calls are excluded.

Corrective tasks and acceptance (remaining evidence carried to Phase 4 by D-042):

- [x] Implement real-response warning existence/count beside the probability/
  source summary, with full warning text in native disclosure details.
  Live visibility and keyboard acceptance remain separate open items below;
  no new modal/package, warning suppression or broad copy/layout redesign.
- [x] Verify warning-bearing accepted results clear on edit, pending/error,
  sample/reset and profile changes, and reappear only from an accepted fresh
  response. A real empty list
  must not masquerade as unavailable output or clinical reassurance; mock
  responses must not claim real warning assessment.
- [x] Add focused warning rendering/clearing tests.
- [ ] Capture a warning-bearing patient (patient 20) and an empty-warning case
  at actual 1920x1080/1280x800, including live keyboard access to the full
  warning. Preserve visible essential controls/probabilities/source, overflow
  <=2 CSS px and canvas heights >=480/300 CSS px with <=2 CSS px variation
  between disclosure states. Carried to Phase 4, not waived or already proven.
- [x] Publish the related accounting/documentation corrections and passing UI
  changes, run relevant frontend checks, stop verification services and report
  source hashes, dated repair/P3/S3/project credits and evidence. Do not repeat
  accepted model/API/additivity/performance suites or redo the full evidence
  package without a specific regression. H subsequently approved Gate 3 with
  evidence carryover under D-042.

**Historical execution update before D-042:** `RawResult.tsx` now places a compact status immediately
after the probabilities. A non-empty real warning list uses native
`details`/`summary`; an empty real list says “none returned” and disclaims
reassurance; mock v1.0 says real-model warning assessment is unavailable.
Focused rendering and warning-bearing store invalidation regressions pass.
`pnpm lint`, `pnpm typecheck`, `pnpm test` (57 tests / 15 files) and
`pnpm build` pass. Verification services were stopped and ports 8000, 5173 and
9222 have no listeners. The exact-viewport evidence criterion is not accepted: a transient
1920x1080 capture showed the warning count, source and four probabilities, but
the run stopped before completing keyboard/layout checks and that temporary
capture was not retained. Subsequent CDP runs repeatedly timed out waiting for
the canvas to meet its viewport minimum after resizing/reload; a separate
diagnostic did measure a 596.01px canvas at 1920x1080, but did not produce
reproducible closed/open measurements or the required 1280x800 captures.
CDP-generated keyboard events were not delivered to the focused summary; its
accessibility tree did expose the native summary as a focusable disclosure
control. Per the workflow repeated-failure rule, X stopped further live
capture attempts. No warning PNGs were saved; see
`docs/evidence/s3p3-warning-verification.txt`. Gate 3 was pending at that report;
D-042 subsequently authorises the explicit carryover, not a full evidence pass.

**Phase 3 close and Phase 4 boundary (D-042):** H said "lets bundle the remaining
of gate 3 with phase 4 and wrap up phase 3". Close Phase 3 at
**2026-10-10T14:54:54.705Z**, the user-directed transition. Recorded events
before that boundary are Phase 3; events at/after it are Phase 4, including
O's planning/handover/review. X records a separate execution kickoff and fresh
baseline. This is an approved revised closeout route under the workflow, not
an inferred waiver of missing warning evidence.

Deduplicated local telemetry through **2026-10-10T14:55:23.678Z** (not billing):
final recorded Phase 3 **507.059745** (O **229.012080**, X **278.047665**),
leaving **292.940255** under its 800 combined allocation. X's original
200-credit ceiling overage is **78.047665**; retain D-039/D-041's scope and
history. Phase 4 planning is **11.894060** (O **11.894060**, X **0**), leaving
**88.105940** combined and **30** X credits. S3 is **1096.1514545**
(O **716.216290**, X **379.9351645**), leaving **703.8485455**; project is
**2868.755772** (O **2317.682915**, X **551.072857**), leaving **4131.244228**.
Later calls are excluded. D-041's cumulative corrective X usage is
**22.696666**, leaving **7.303334** of its additional 30-credit allowance.
Carryover warning work counts against both that remaining limit and Phase 4's
30-credit total X ceiling; these are overlapping guards, not additive funds.
Do not transfer unused Phase 3 allocation, reset the repair limit, or spend
contingency without a new H decision.

Atomic tasks

- [x] Publish the approved planning changes, record kickoff/credits and import
  only the pinned serving bundle above. Verify source hashes and dataset
  attribution. Keep model/preprocessing/API code unchanged.
- [x] First prove runtime in a separate Linux-native Python 3.11.9 environment,
  e.g. `/home/jalfaizy/.venvs/multimodal-ai-hack-real-api`, using M's pinned
  requirements. Leave the mock environment intact. Verify loading of all eight
  models, all five endpoints, CORS and Windows localhost access; run only
  `tests/test_api.py`, with zero skips. Do not retrain/export/run ML experiments.
  Stop if setup exceeds 45 minutes or 60 X credits, or one root cause fails
  twice after genuine fixes. No speculative UI implementation before this passes.
- [x] Adopt `docs/api-contract.md`'s approved v1.1 real profile while preserving
  v1.0 mock behavior. Validate health/version/mode and every added field rather
  than stripping them. Unknown/inconsistent profiles show an explicit error;
  never reuse stale mock metadata/samples/predictions as real data.
- [x] Render the 49-input metadata with its declared types/options/units. Keep
  raw conversion in M's backend. Label custom-form defaults as reference/demo
  values, not recorded patient measurements; reset preserves that distinction.
  Show returned BMI and the dataset-defined Obesity flag read-only, identifying
  its BMI >25 rule as model/dataset coding, not a clinical obesity diagnosis.
- [x] Retain a real sample's origin ID across what-if edits and send `sample_id`
  so both sides of the comparison use demo models. Show edited-scenario
  provenance; never present original ground truth as the outcome of edited
  inputs. Reset/custom start clears origin; another sample replaces it.
  Synthetic mock requests omit `sample_id`. Snapshot origin together with
  features at request start; preserve all revision/latest-request guards.
- [x] Show truthful real/mock source/version plus response `prediction_source`.
  Surface warnings and per-target uncertainty in text and a static, non-colour
  cue in results and viewer legend/callout/accessible details. Uncertainty is a
  normal model state, not failure and not derivable from probability alone.
  Preserve response probabilities and per-target label/threshold; no 0.5 rule,
  unsupported severity categories, lesion coordinates or animated effects.
- [x] For confirmed real `scale: probability`, format signed contributions as
  percentage points, expose the reference risk and method, and distinguish
  model attribution from causation. Keep the top-ten signed chart, not a
  waterfall; identify it as a subset of all returned contributions. Mock or
  unconfirmed scales retain qualified model-unit wording. Check additivity
  using the complete returned list, including capped vessel outputs.
- [x] Extend the existing metrics drawer for returned model names, ROC-AUC CI,
  balanced accuracy, Brier, ECE and validation threshold. Distinguish the
  cross-validation-summary threshold from the current prediction threshold,
  and reported validation from in-sample scores or a separately validated demo
  refit. Keep version/source warnings and report caveats visible; do not claim
  exact deployed/demo validation from matching version strings.
- [x] Add focused schema/mapping/provenance/formatting/freshness/uncertainty/
  warning/metrics tests and fresh real live evidence. Preserve the accepted
  bounded layout and keyboard behavior at both desktop viewports, including
  long source/warning text and uncertainty; no general redesign.
- [x] Run targeted API/frontend checks, document reproducible setup/provenance,
  commit/push approved implementation, publish the related closeout docs/evidence,
  stop verification services and reconcile dated credits. Stop for Human Gate 3;
  no CI debugging or PR operation.

**Original self-check gate 3 (warning live evidence remains open under D-042):**

1. Source pin/hashes and complete import bundle are documented. Python is
   3.11.9; pinned dependencies load final/demo artifacts in WSL. Health reports
   `mock: false`, contract 1.1.0 and `cardiotwin-v2.0.0`; all five endpoints,
   CORS and Windows localhost work. API tests pass without skipped model tests.
2. Real metadata has exactly 49 unique inputs and eight non-synthetic samples.
   BBB/VHD/Chest Pain/Smoking options and Function Class 0-3 are evidenced;
   WBC has no frontend conversion. Leakage keys, missing inputs and invalid
   categories/bounds are rejected. Defaults and derived BMI/Obesity are truthful.
3. A dataset sample and a changed input produce fresh, differing accepted
   responses using the same demo model set via `sample_id`. Reset/custom input
   uses final-model provenance. UI predictions, colours, labels, thresholds,
   selected-target explanations and accepted input snapshots match all four
   response targets; do not hard-code the change direction or expected values.
4. All eight sample responses plus an edited sample have finite probability
   scale explanations; for each CAD/LAD/LCX/RCA target, full-list
   `abs(base_value + sum(contributions) - probability) < 0.003` (0.3 percentage
   points, allowing the API's four-decimal rounding). `0.12` renders as
   `+12 percentage points`, not 12% relative change. Top-ten sorting/subset
   wording, signed/zero/missing cases and mock/unconfirmed wording pass.
5. Live examples/fixtures prove uncertain and confident targets, warnings and
   no-warning responses, derived fields, final/demo source and non-0.5
   thresholds. Required real fields are not silently ignored/defaulted;
   invalid/missing schema and unsupported health profiles fail explicitly.
   Metrics match the served response and preserve validation/source/threshold
   qualifications; no in-sample AUC replaces reported validation.
6. Edit/debounce/pending/error/retry/reset/overlap tests and live request failure
   retain neutral vessels and clear stale risk, attribution, warnings and
   derived output. No real failure falls back to mock. A deliberate v1.0 mock
   smoke check still works with qualified mock labels and no real-only request
   fields; switching service profiles does not retain old form/result data.
7. Actual 1920 x 1080 and 1280 x 800 captures retain document overflow <=2 CSS
   px, minimum canvas heights 480/300 CSS px, <=2 CSS px canvas size variation
   across states and visible essential controls/source/probabilities. Keyboard
   selection/tabs/focus/reset/drawer work without ordinary selection moving
   the camera. A measured 1080p active orbit remains >=50 FPS and settles idle.
8. Existing frontend lint/typecheck/test/build and targeted API tests pass;
   reproducible startup/shutdown, source/data/model provenance, evidence,
   commits, clean local/remote hashes and dated P3/S3/project credits are
   reported. Services are stopped; record Human Gate 3's D-042 carryover
   explicitly rather than claiming the original self-check fully passed.

**Delivered verification evidence:** The pinned API suite passed **6 tests,
0 skipped**; frontend `lint`, `typecheck`, `test` (**55 tests across 15 files**)
and `build` passed. The production build retains its existing non-blocking
large-chunk advisory. The API report covers all eight holdout samples and an
edited scenario; complete-list additivity error was at most **0.0004**,
below **0.003**, and ten direct prediction calls measured **225-279 ms**
(median **236 ms**). `s3p3-live-measurements.json` records the exact viewport,
overflow, canvas, chart, focus, stale-clearing, profile-switch, and rendering
results; active orbit measured **151.0 FPS** with **zero idle frames** before
and after damping. `s3p3-runtime-setup.txt` records the Python 3.11.9 Linux
environment, pinned dependencies, WSL/Windows localhost checks and test
results. `s3p3-source-hashes.txt` records the pin and imported source integrity.
Fresh captures are `s3p3-real-1920x1080.png` and
`s3p3-real-1280x800.png`, with dedicated selected-target, Inputs, metrics,
error/recovery, camera and mock-profile-switch evidence alongside them.
The final source/license footer is captured at
`s3p3-real-attribution-1920x1080.png` and
`s3p3-real-attribution-1280x800.png`, with reproducible capture script and
measurements in `s3p3-final-attribution-captures.mjs` and
`s3p3-live-flow.txt`. The integration implementation is published as
`fe25cfbe1db0754fcf0bdd3f5af2b92f330a1daf`, with the final source-attribution
footer in `48bfb64`; the documentation/evidence closeout is published
separately. WSL mock/API and Windows frontend/browser verification processes
are stopped.

**Human gate 3: approved with carryover (D-042).** H accepts the supported core
real integration and published warning correction for Phase 3 closeout, and
explicitly moves the unverified warning live evidence into Phase 4. The
original self-check is not fully passed. Do not claim complete warning
verification or Sprint 3 closure until Gate 4; this is not mock-only approval,
clinical validation, deployment approval or permission for broader features.

## Phase 4 - Warning-evidence carryover, retrospective and cleanup (partial; Gate 4 pending)

**Goal:** Complete the deferred warning live evidence and prepare an accurate
S3 closeout package plus an unstarted S4 Phase 0 without consuming the
submission-only buffer.

**Allocation:** 100 O+X; X ceiling 30. D-042 starts accounting at
**2026-10-10T14:54:54.705Z**. D-041's corrective X allowance had 7.303334
remaining at the D-042 snapshot through 14:55:23.678Z. At the fresh
pre-approval snapshot through **2026-10-10T15:04:17.831Z**, Phase 4 was
34.6756695 (O 28.7691000, X 5.9065695), leaving 1.3967645 under D-041's
original 30-credit corrective limit. H then authorized an additional 10 X
credits under D-043, extending that corrective limit to 40 without increasing
Phase 4's existing 30-X ceiling.

**Execution kickoff:** **2026-10-10T14:59:36.260Z**. Fresh deduplicated
baseline after D-043, through **2026-10-10T15:07:04.106Z**: Phase 4
35.963296 (O 28.769100, X 7.194196); S3 1132.1147505; project
2904.719068. At this baseline, D-041 corrective use was 29.890862 of the
extended 40-credit limit, leaving 10.109138. These are local telemetry, not
billing.

Verification snapshot through **2026-10-10T15:11:22.888Z**: Phase 4
38.3879145 (O 28.7691000, X 9.6188145); S3 1134.539369; project
2907.1436865. S3 consists of O 744.985390 and X 389.553979. D-041 corrective
use is 32.3154805, leaving 7.6845195 of the D-043-extended 40-credit limit.
Phase 4 has 61.6120855 combined and 20.3811855 X credits remaining; S3 has
665.460631 and the project has 4092.8563135 remaining. These snapshots
deduplicate local `assistant_usage_events` by session, timestamp, model,
input/output/cache-read tokens and total nano-AIU, filtered by this checkout's
path. Later closeout calls are excluded. The D-041 and Phase 4 X limits
overlap; there is no allocation reset or transfer.

Atomic tasks and actual result

- [x] Publish O's approved D-042 plan/spec/contract/decision edits and add the
  separately authorized D-043 allowance without resetting earlier actuals.
- [ ] Complete all carried warning evidence. Headed Edge saved patient-20
  closed/open captures at both CSS viewports. At 1920x1080 the closed/open
  canvas heights were 590.859/591.859 px (1 px variation), with 0 px document
  overflow. At 1280x800 the screenshots and warning status are present, but
  the initial closed measurement was taken before resize settling (591.859 px)
  and the later open measurement was 362.546 px; this is not a valid stable
  pair. Do not treat it as an implementation defect or a pass.
- [ ] Verify keyboard activation and the real empty-warning UI live. Windows
  OS `SendKeys` did not change the disclosure state when the summary was
  focused, and the attempted Custom-patient selection stayed on patient 20.
  No live empty-warning screenshots were produced. Ask H to use real keyboard
  input and observe the Custom-patient reference-default prediction; do not
  claim native semantics or existing tests prove live activation/output.
- [x] Publish partial captures and the measurement/failure log under
  `docs/evidence/s3p4-warning-*`, linking the earlier harness failure in
  `docs/evidence/s3p3-warning-verification.txt`. The existing warning clearing
  regressions and frontend checks remain the accepted S3 evidence; no full
  suites were repeated.
- [x] Write the S3 retrospective, reconcile dated telemetry and preserve the
  historical inclusive-boundary correction and original X overrun.
- [x] Synchronize spec/API-contract/decision status with the locally integrated
  real v1.1 profile, mock-only v1.0 behavior and incomplete warning evidence.
- [x] Archive S3 and stage only an unstarted, Gate-4-dependent S4 Phase 0;
  preserve Oct 12 draft, Oct 13 final and Oct 14 submission-only dates.
- [x] Stop the WSL API, Windows frontend and headed Edge process. No PR action,
  merge, S4 implementation or backend/model/dependency changes were made.
- [x] Publish the truthful partial closeout; keep the incomplete evidence and
  Human Gate 4 open rather than marking S3 closed.

**Self-check gate 4 result: NOT PASSED.** The saved patient-20 images visibly
show the real model/version, CAD/LAD/LCX/RCA probabilities, warning count and
expanded age-related reliability text without results-panel scrolling.
1920x1080 document overflow and canvas variation meet their limits. The
1280x800 canvas pair is inconclusive; live OS keyboard activation and live
empty-warning captures are missing. Existing rendering/store tests are not
live evidence. No third attempt at the failed input route was made. H must
manually observe the disclosure open/close via keyboard and the real
Custom-patient empty-warning state, then review settled 1280x800 measurements.

**Human Gate 4: approved with carryover (D-044).** The original self-check
result above remains historical. H selected "Both Enter and Space open and
close it" for the physical-keyboard warning check and confirmed that Custom
patient clears the old warning and shows the qualified "none returned"
status. No exact viewport dimensions or new screenshots accompanied those
observations. H then selected "Approve Gate 4 with carryover and begin S4
planning (Recommended)". S3 is closed; S4 planning only is authorised.
The settled 1280x800 canvas pair, missing saved empty-state captures and
remaining viewport-specific proof stay open until S4 release-candidate
verification before code freeze. See `docs/evidence/s3p4-warning-human-check.txt`.

**Closeout accounting correction:** E's 15:15:33.327Z report correctly recorded
P4 at 42.447956, but its derived S3/project totals included the initial
11.894060 P4 credits twice. Direct deduplicated totals at that cutoff are
S3 **1126.7053505** and project **2899.309668**. Preserve the earlier reported
snapshots with this correction; P4/X actuals and the repair limit are unchanged.

**Final recorded S3 snapshot:** through **2026-10-10T15:42:21.815Z**, P4 is
**96.9250665** (O **82.866010**, X **14.0590565**), below its 100 combined/
30 X limits. S3 is **1181.182461** and project **2953.7867785**, leaving
**618.817539** under S3 and **4046.2132215** overall. D-041/D-043 corrective
X use is **36.7557225** of 40; no limit is reset. These are deduplicated
local telemetry, not billing. S4 accounting starts at the recorded transition
**2026-10-10T15:42:22.433Z**; later planning/publication is S4, not S3.
