# Sprint 4 Plan - Feedback and code completion

**Status:** Human Gate 0 is approved; Phase 1 is authorised (D-045).
H approved S3 Gate 4 with explicit evidence carryover and closed S3 (D-044).
H manually confirmed keyboard opening/closing of patient 20's warning and the
qualified empty-warning status after selecting Custom patient. The settled
1280x800 closed/open canvas pair and missing saved empty-state captures remain
open for S4 release-candidate verification, before code freeze. Human
observations do not prove both exact viewports or replace the missing captures.

**Direction:** H approved five sprints: S4 completes the code and S5 completes
the submission. Phase 1 is the bounded results-density fix, not broader
redesign. Later S4 phases and all S5 work require their human gates.

**Approved calendar:** Phase 1 starts now, Oct 10; S4 code completion and
freeze by the end of Oct 11. S5 document/video/finalisation Oct 12-13, with
only separately approved blocking fixes after code freeze. Oct 12 drafts,
Oct 13 finals and Oct 14 submission-only remain protected.

## Budget and transition

S4 accounting begins at the recorded gate-transition boundary
**2026-10-10T15:42:22.433Z**, after H's explicit Gate 4 approval. Events before
it remain S3; events at/after it are S4, including planning/review/publication.
Do not reset actuals or count a boundary event in both sprints.

The last recorded pre-transition snapshot, through
**2026-10-10T15:42:21.815Z**, is S3 **1181.182461** and project
**2953.7867785**, leaving **618.817539** under S3's 1800 cap and
**4046.2132215** under the hard 7000 project cap. These are deduplicated local
telemetry, not billing; later calls are excluded.

H approved splitting D-008's existing 1200 final-sprint allocation into S4
**700** and S5 **500**, retaining the separate **700 reserve**. No overall
increase, overrun reset, reserve use or transfer of earlier underspend is
authorised.

| Phase | Combined ceiling | X ceiling | Status |
|---|---:|---:|---|
| 0 - Discussion and research | 100 | 0 | Gate 0 approved |
| 1 - Summary-first results and explanations | 350 | 120 | Authorised now |
| 2 - Release-candidate hardening and carryover verification | 150 | Requires H approval at Gate 1 | Not authorised |
| 3 - Retrospective and code-freeze cleanup | 50 | Requires H approval at Gate 2 | Not authorised |
| Contingency | 50 | Requires separate H approval | Unused |
| **S4 total** | **700** | | |
| **S5 total, separately gated** | **500** | Detailed plan at S5 Gate 0 | Unstarted |

Gate 0 snapshot through **2026-10-10T15:50:58.565Z**: S4/P0 **36.629530**
(O **36.629530**, X **0**); project **2990.4163085**, leaving
**663.370470** under S4 and **4009.5836915** overall. These are deduplicated
local telemetry, not billing; later calls are excluded.
Phase 1 accounting starts at the recorded post-approval boundary
**2026-10-10T15:50:59.185Z**. Events before it are Phase 0; events at/after it
are Phase 1, including O handover/review. X execution kickoff:
**2026-10-10T15:55:53.999Z** (2026-10-10 17:55:53.999 CEST).
Fresh deduplicated local snapshot through **2026-10-10T15:58:37.469Z**:
Phase 1 **19.722209** (O **15.843140**, X **3.879069**); S4 **56.351739**;
project **3010.1385175**. These figures are local telemetry, not billing.
No ceiling or prior actual is reset.

D-041/D-043's historical corrective X usage remains **36.7557225** of 40
at S3 closeout. D-044's carried warning evidence remains open in Phase 2.
Gate 1 must explicitly address its residual funding and Phase 2 X ceiling;
do not silently reset or evade that historical guard. New density-fix
regressions are Phase 1 work; do not misclassify old carryover work to spend
outside its approved allowance.

## Phase 0 - Discussion and readiness planning (approved)

**Goal:** Select a closed, ranked feedback/fix list, carryover verification and
release-candidate scope, with owners, budget and code-freeze date before any
implementation.

**H's approved first priority:** "Results and explanations are too dense".
Implement Phase 1's summary-first view while preserving source, probabilities,
uncertainty, warning status and complete accessible methods/input detail.
Do not add unsupported causal or treatment summaries.

**Prerequisite:** Human Gate 4 approval, S3 closure and S4 planning start,
explicitly approved in D-044. H subsequently approved Gate 0 under D-045.

### Discussion agenda

- Rank the judging criteria and choose the shortest truthful demo story:
  patient inputs, real model flow/source, probability-to-vessel correspondence,
  explanations/inputs, model metrics, safety and provenance.
- Reconcile remaining project/S4/S5 budget, including S3 actuals, the original
  executor overrun, D-043's allowance and the proposed 700/500 split. Keep
  discussion/execution ceilings explicit; do not assume earlier underspend
  or contingency is available.
- Confirm backend readiness for the actual demo environment. Separate the
  pinned API/model's verified local WSL integration from any deployed service,
  external environment, clinical validation or independently validated
  demo-refit metrics.
- Walk one complete patient scenario with H and rank demonstrated problems.
  Prioritise functional defects, explanation readability and demo reliability.
  Broad redesign, CSV/document import, new assets and animation are excluded
  from the recommended scope; any proposed addition needs an explicit
  tradeoff and Gate 0 approval, not automatic carry-in.
- Complete D-044's remaining exact-viewport warning evidence in the final
  release-candidate check before code freeze. Do not repeat accepted full
  suites without a concrete regression or restart the failed input harness.
- Confirm owners and exact handoff timing: Faizan owns the 3-10 minute video
  and shared maximum-six-page document; request Ashish's ML sections and confirm
  when they will be available.
- Define S5's submission-only scope, preparing document/video outlines
  alongside S4 rather than starting them from scratch in S5. Preserve drafts
  Oct 12, finals Oct 13 and Oct 14 submission-only; drop optional code work
  instead of moving those dates.

### Phase 0 outcome

- [x] Review the rubric/current live feedback and select dense results/
  explanations as the first bounded implementation priority.
- [x] Reconcile dated usage and approve the 700/500 S4/S5 split without resets.
- [x] Keep the verified local backend distinct from deployment/clinical
  validation; no new backend work or public deployment is needed for Phase 1.
- [x] Bound presentation work, D-044 carryover and code-freeze exit criteria.
- [x] Retain Faizan's video/document ownership and Oct 12/13 deadlines.
  Ashish's ML-section timing remains explicitly unconfirmed; H approved
  confirmation before S5 Gate 0 rather than blocking independent UI work.
- [x] Prepare the approved plan/spec/workflow/decision update for X to publish
  with Phase 1. No O commit/push, agent spawn or PR operation.

**Objective self-check:** The proposed plan names the judging priorities,
actual remaining budget and its source, local-versus-deployed backend status,
ranked code/presentation scope, D-044's open verification, explicit exclusions,
named video/document owners, Ashish's ML handoff timing, a code-freeze exit,
the S4/S5 budget split and Oct 12/13 deadlines with Oct 14 protected. Every
task has a measurable output and owner; unresolved external dependencies are
explicit and no implementation is silently authorised.

**Human Gate 0: approved (D-045).** H selected "Approve Gate 0 and authorise
Phase 1 (Recommended)" after reviewing the exact scope, measured acceptance,
allocations, five-sprint calendar and explicit ML-document timing deferral.

## Phase 1 - Summary-first results and explanations (authorised)

**Goal:** Make the selected-target explanation visible and understandable
without removing source/safety detail or changing prediction semantics.

**Allocation:** 350 O+X; X ceiling 120. Prerequisite: Gate 0, approved.
Start now; target human review Oct 10 evening or Oct 11, preserving the end
Oct 11 code freeze. X publishes the pending O documentation, records actual
kickoff/credits and implements only this phase.

Atomic tasks

- [x] Capture the current real patient-20 CAD Why? view at exact CSS
  1920x1080/1280x800 before editing. Reuse healthy H-owned local services if
  available; do not stop/restart processes owned by H.
- [x] Simplify `RawResult`, `WhyView` and `InputsView` presentation using
  existing formatting/data helpers and native disclosure patterns.
  Compact duplicate source/version/method copy; keep real/mock, custom/
  dataset/edited and final/demo provenance truthful and visible. Keep the
  complete returned source/method available through clearly named details.
  Preserve all four probabilities, labels/thresholds, uncertainty and
  warning status near the top. Never put reliability warning existence
  inside the methodological disclosure.
- [x] Move the signed top-ten contribution chart ahead of lengthy methods.
  Keep a concise visible unit/reference/subset/non-causation explanation,
  full source/method wording and numeric feature/input/contribution detail
  accessible by keyboard. Do not shrink existing 11 CSS px chart text,
  remove rows, change ranking/units or invent a generated clinical summary.
  Preserve mock/unconfirmed-scale and empty/missing/zero distinctions.
- [x] Remove repeated introductory method text from Inputs without changing
  accepted snapshots, grouping, actual values/units, missing contributions
  or read-only BMI/dataset Obesity qualifications. Keep full methodology
  reachable; no live-draft values substituted for accepted inputs.
- [x] Add focused presentation/disclosure/selection regressions. Reuse
  accepted freshness/mapping tests; do not alter backend/model/API/store
  behavior or introduce packages/global abstractions.
- [x] Record live before/after clarity and preserved behavior at both
  viewports, run frontend lint/typecheck/test/build, publish source/evidence/
  docs and dated credits, stop only verification helpers started by X,
  and stop for Human Gate 1.

**Self-check gate 1:**

1. At actual CSS 1280x800, real patient 20, selected CAD, Why? active,
   warning/method disclosures collapsed and results scroll at zero, at least
   **three complete chart rows** (labels and bars) are visible within the
   panel. Record row bounds/count and screenshot, not merely a chart heading.
   Existing chart text remains at least 11 CSS px. Capture 1920x1080 too.
2. Real/mock/version and scenario/source remain truthful and initially
   visible; all four probabilities/labels/thresholds, warning status and
   uncertainty are retained. Full returned source/method and accessible
   signed numeric/input values remain reachable by keyboard. Do not claim
   probability is narrowing, attribution is causation or a reference is
   measured population prevalence.
3. CAD/LAD/LCX/RCA selection and Why?/Inputs show the correct target/snapshot
   and unchanged zero/tie/missing/unit behavior. Empty/mock/warning-bearing
   responses retain distinct status; edits/pending/errors clear old data.
   Ordinary selection does not reposition the camera.
4. At both viewports retain document overflow <=2 CSS px and the stable
   viewer/essential controls, with no global grid/camera/geometry redesign.
   Details are focusable and operable with visible focus; long text wraps or
   scrolls inside results rather than changing the workspace. D-044's full
   remaining warning capture/canvas-pair acceptance stays in Phase 2, not
   silently marked passed here.
5. Existing frontend checks pass and evidence/commits/dated P1/S4/project
   credits are published. No API/model/additivity/performance rerun without
   a concrete regression, no CI troubleshooting and no PR operation.
   Report H-owned services separately from X's stopped helpers.

**Phase 1 delivery evidence — awaiting Human Gate 1:** Approved planning
updates were published in `6b5ad78bbef9562cb89451d49aeff3bedc968202`;
implementation and settled before/after evidence are in
`d8a4b572b9512367dd350879cf54f29eca767fb1`. At 1280x800 the three complete
visible chart rows are Chest pain type (label y=633.746, bar y=632.781),
High blood pressure (label y=672.146, bar y=676.681), and Diabetes (label
y=721.546, bar y=720.581). Both screenshots use DPR 1 and exact matching CSS/
PNG viewport dimensions; document overflow is 0 px at both sizes. Canvas
dimensions are unchanged before/after: 620.766x591.859 at 1920x1080 and
509.734x362.547 at 1280x800. Chart labels remain 11 px. The 1280 capture has
warning/method disclosures closed and results scrollTop 0.

Evidence: `docs/evidence/s4p1-before-*`,
`docs/evidence/s4p1-release-*`, and `docs/evidence/s4p1-keyboard.txt`.
The headed real profile reports mock=false and model `cardiotwin-v2.0.0`.
Keyboard focus reaches the full ten-row CAD numeric alternative, method
disclosures, and metadata-grouped input table regions. Existing target,
freshness, mock, empty-warning and warning regressions remain covered by the
frontend suite. `pnpm lint`, `pnpm typecheck`, `pnpm test` (58 passed), and
`pnpm build` passed; Vite reported only its non-blocking large-chunk advisory.
The separate D-044 empty-warning captures and settled warning canvas pair
remain Phase 2 work; they are not claimed passed here.

Latest deduplicated local telemetry snapshot through
**2026-10-10T16:25:31.778Z**: Phase 1 **48.6943595** (O **15.843140**,
X **32.8512195**); S4 **85.3238895**; project **3039.110668** credits. These
are local telemetry, not billing; later calls are excluded. Phase 1 remains
within 350 combined / 120 X, S4 within 700, and the project within 7000; no
ceiling or prior actual was reset.

**Human Gate 1:** H reviews O's assessment and authorises Phase 2 only after
accepting clarity/behavior evidence and explicitly setting its X ceiling and
any needed carryover-verification allowance. No automatic Phase 2 start.

## Phase 2 - Release-candidate hardening and carryover verification (unstarted)

**Goal:** Prove the final integrated workflow and complete D-044's remaining
warning evidence before code freeze.

**Allocation:** 150 O+X. X ceiling/carryover allowance need H approval at Gate 1.
Prerequisite: Human Gate 1.

Atomic tasks

- [ ] Confirm only demonstrated residual defects, intended demo machine,
  startup/reproducibility and final patient -> prediction -> vessel ->
  explanation -> edit/fresh-response story; no new feature expansion.
- [ ] Complete missing real empty-state captures at both exact viewports and
  settled 1280x800 warning closed/open measurements; check remaining
  viewport-specific keyboard proof after Phase 1. Preserve overflow <=2 CSS
  px, canvas minima 480/300 and <=2 CSS px closed/open variation.
  Use working headed readiness/real input or H observation; do not resurrect
  the failed threshold-wait/SendKeys loop.
- [ ] Run targeted checks for actual changes and record release-candidate
  evidence. Repeat broader performance/API work only for a real regression.
- [ ] Publish results/credits and stop for Gate 2 before cleanup/code freeze.

**Self-check gate 2:** The approved residual list is resolved or explicitly
deferred by H; D-044's remaining warning evidence is complete; the final
local demo is reproducible and truthful; relevant checks/evidence/source/
dated credits agree. No implied public deployment or clinical validation.

**Human Gate 2:** H accepts the release candidate and authorises cleanup.
Incomplete evidence requires an explicit decision, not another silent carry.

## Phase 3 - Retrospective and code-freeze cleanup (unstarted)

**Goal:** Freeze the accepted code and hand a stable, documented baseline to S5.

**Allocation:** 50 O+X; X ceiling requires H approval at Gate 2.
Prerequisite: Human Gate 2.

Atomic tasks

- [ ] Write S4 retrospective and reconcile boundaries/actuals without resets.
- [ ] Synchronise spec/decisions, archive S4 and stage only unstarted S5
  Phase 0 with document/video owners, ML-section timing and Oct 12/13 outputs.
- [ ] Publish the accepted release-candidate/code-freeze hash by end Oct 11.
  Preserve separate PR approval and gate S5; no automatic merge or new work.

**Self-check gate 3:** Code/evidence/retro/archive/spec/budget agree; carryover
is resolved or explicitly approved; freeze hash is published; S5 has a
discussion/research entry point and its own gates; submission buffer intact.

**Human Gate 3:** H closes S4 and authorises S5 planning. S5's 500 cap covers
document/video/reproducibility/submission readiness; only separately approved
blocking fixes may change frozen code. No automatic S5 implementation.
