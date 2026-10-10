# Sprint 4 Plan - Feedback and code completion

**Status:** Human Gates 0, 1 and 2 are approved. Phase 3 retrospective and
documentation-only closeout are complete; Human Gate 3 remains pending. The
accepted code-freeze source baseline is
`39ffab1c8adecd707c0f40ce826c12a568c41267`; this later documentation-only
closeout is a separate commit and does not change that baseline. D-044's
remaining warning captures, keyboard checks and settled canvas pairs were
completed and accepted using `docs/evidence/s4p2-*`. S4-F01/F04/F06/F08/F09
are verified; deferred/no-change feedback remains recorded. S4 uses one shared
hard 700-credit O+X budget (D-049); preserve historical overruns. S5 Phase 0
is staged but unstarted and gated on Human Gate 3.

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

**Current budget authority (D-049):** S4 has one shared hard 700-credit budget
for O and X. The phase/executor/corrective/publication figures below are
historical allocations and planning estimates, not independent stop limits.
X may use the remaining shared sprint budget for already-approved scope
without repeated micro-allowance requests. Count all O/X usage, retain every
historical overrun, and stop/re-plan if the shared S4 or project cap is reached.
Scope, human gates and repeated-failure rules remain mandatory.

| Phase | Combined estimate | Historical X allocation | Status |
|---|---:|---:|---|
| 0 - Discussion and research | 100 | 0 | Gate 0 approved |
| 1 - Summary-first results and explanations | 275 (was 350) | 120 | Accepted; unused 75 reallocated by D-048 |
| 2 - Bounded feedback, release-candidate hardening and carryover | 225 (was 150) | 100; historical corrective/publication sublimits | Accepted at Gate 2, D-050 |
| 3 - Retrospective and code-freeze cleanup | 50 | Shared remaining S4 budget applies | Closeout published; Human Gate 3 pending |
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
D-047 extended that historical corrective limit from 40 to 60 for carried
warning evidence only, overlapping Phase 2's 100 X ceiling. D-048 adds a
publication-only extension to 65 after a recorded overrun. No historical
actual is reset. Phase 1 density work is not corrective warning work;
an unrestricted time slice from D-041 through Phase 1 would wrongly charge
it to the repair allowance. X must record separate start/end cutoffs for
the carried warning block and its related reporting in Phase 2.

**Gate 1 closing snapshot:** through **2026-10-10T16:44:45.686Z**, final
recorded Phase 1 is **116.6821095** (O **77.943840**, X **38.7382695**),
S4 **153.3116395** and project **3107.098418**. Remaining: **233.3178905**
under Phase 1, **81.2617305** under its X ceiling, **546.6883605** under S4
and **3892.901582** overall. These are deduplicated local telemetry, not
billing; later calls are excluded. Phase 2 accounting starts at the recorded
post-approval boundary **2026-10-10T16:44:46.230Z**; prior events remain Phase
1, events at/after it are Phase 2. X takes a fresh execution baseline.

X execution kickoff: **2026-10-10T16:48:20.983Z** (2026-10-10
18:48:20.983 CEST). Fresh deduplicated local snapshot through
**2026-10-10T16:49:20.971Z**: Phase 2 **18.982270** (O **15.183870**,
X **3.798400**); S4 **172.2939095**; project **3126.080688**. These are
local telemetry, not billing; later calls are excluded. The carried-warning
block has not started at this snapshot; its separate interval must include
capture and related reporting. Historical corrective use remains **36.7557225**
of the cumulative 60 limit, leaving **23.2442775**. No prior actual or ceiling
is reset.

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

**Allocation:** Originally 350 O+X; current ceiling 275 under D-048 after
75 unused credits were transferred to Phase 2. X ceiling remains 120.
Prerequisite: Gate 0, approved.
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

**Human Gate 1: approved (D-047).** H selected "Approve Gate 1 and the bounded
Phase 2 batch (Recommended)" after O's evidence review and feedback triage.
Approves Phase 2's closed batch, 150 combined/100 X, and 20 further corrective
X credits (60 cumulative) overlapping that X ceiling. No other changes,
cleanup, PR operation, agents or later phases are authorised.

**O review (2026-10-10):** The settled release captures, row bounds and
independent keyboard trace support the self-check. Three full chart rows are
visible at 1280x800, text is 11 CSS px, overflow is zero and canvas dimensions
are unchanged. Source/probabilities/thresholds/warnings/uncertainty remain
visible; methods and ten-row numeric/input detail are reachable. The scoped
source changes preserve model/store/viewer behavior. Accept the reported
frontend checks without rerunning them; the discarded loading-race captures
are not gate evidence. Human approval and D-044 carryover remain separate.

## Feedback ledger - current review intake

Source: H forwarded a Track A frontend review of `cbb9d95` after Phase 1 was
published at `fe652ed12f99d47238556f03b9371d81ffb8dfb4`. O checked current
source, approved semantics and published evidence. Review severity/order are
suggestions, not automatically accepted defects. The workflow in
`docs/workflow.md` applies; H approved only the listed batch under D-047.

| ID | Review claim | Assessment and evidence | Disposition / owner |
|---|---|---|---|
| S4-F01 | Colours ignore different target thresholds | `colorScale.ts` and the legend encode absolute probability, as required by spec section 6; labels use returned thresholds. Equal probabilities intentionally have equal colours. Threshold-relative colours would change the shared legend meaning, not repair a broken mapping. The potential confusion is valid. | Verified at Gate 2, D-050: response-driven selected-target threshold marker published in `39ffab1`, with unchanged absolute colours; marker/boundary/invalidation tests and `s4p2-*` evidence. |
| S4-F02 | Edits must clear `sample_id` | `api/main.py` selects demo models whenever a valid ID is supplied. D-038 and the contract intentionally retain origin across edits for same-model paired what-if comparisons; the UI labels edited scenarios. Clearing it would confound input and fitting-set changes. | No request/store/backend change. Preserve origin and accepted snapshots. Explain the policy in portable usage documentation; any different policy needs H/M agreement. |
| S4-F03 | Tubes are schematic/front-facing, no left main or torso | `vesselMap.ts` is the D-012 schematic fallback; the GLB has no artery nodes. The brief permits a heart without a torso. Anatomical fidelity remains a real rubric limitation, but unverified repositioning is not a validated correction. | Deferred: new assets, left-main geometry and anatomical rework need separate scope and reviewed orientation/asset evidence. Keep schematic/non-lesion wording; H/M for future scope. |
| S4-F04 | Selection changes only radius | `VesselMesh.tsx` already increases radius and selected emissive intensity (0.45); hover adds intensity/tooltip. A selected in-scene label is still a reasonable clarity improvement. | Verified at Gate 2, D-050: persistent selected label in `39ffab1`; no duplicate hover label, current-only risk text and unchanged camera handlers; tests/selected-LAD live capture. |
| S4-F05 | Exact 49-input/8-sample guards prevent extension | `profile.ts` really enforces the pinned v1.1 handoff counts. This is an acknowledged extensibility constraint, not proof that arbitrary extra features will be served correctly: the pinned API validates its fixed feature set and models. Counts alone are also not a general schema-evolution strategy. | Deferred coordinated API/profile-extension work. Preserve duplicate/leakage/type/unit/profile guards; do not loosen frontend counts alone or claim arbitrary runtime extensibility. Document the current boundary; H/M for contract evolution. |
| S4-F06 | Capped vessels can be elevated while CAD is not | `ml/export.py` caps probabilities, not labels. Different per-target decision thresholds can legitimately yield different binary labels even when P(vessel) <= P(CAD); equality alone does not prove capping occurred. | Verified at Gate 2, D-050: qualified drawer/usage explanation in `39ffab1`, with regression/live detail capture; outputs and backend unchanged. |
| S4-F07 | Large bundle/GLB requires splitting/compression | Existing large-chunk advisory and asset size are known; accepted interaction evidence shows no demonstrated new performance regression. The old review's precise bundle size is not a current gate measurement. Compression/decoders and lazy loading alter loading paths. | Deferred unless a measured demo startup/performance blocker justifies a separate bounded change. No new decoder/dependency or full performance rerun merely for this suggestion. |
| S4-F08 | Personal README paths obstruct reproduction | Confirmed absolute user paths and a stale `backend/` layout description in README. Local instructions are useful but cannot be the only judge-facing route. | Verified at Gate 2, D-050: generic root-relative Linux/WSL setup and corrected layout in `39ffab1`; existing-environment verification, not a claim of fresh installs on all hosts. |
| S4-F09 | Node pin conflicts with engines minimum | `.nvmrc` pins 24.19.0; `engines` declares >=20.19.0. A tested/recommended version and a compatibility lower bound need not be equal; do not claim every eligible version was tested. README's "requires" wording is imprecise. | Verified at Gate 2, D-050: README distinguishes tested/recommended versions and declared compatibility in `39ffab1`; pins and engines unchanged. |
| S4-F10 | Disclaimer modal appears once | Persistent banner/footer meet the visible-disclaimer requirement; first-visit acknowledgement is intentional. | No change. Retain always-visible banner/footer and current acknowledgement behavior. |

**Approved batch (D-047):** S4-F01/F04/F06/F08/F09 plus existing Phase 2
release-candidate/carryover tasks. Original Phase 2 was 150 combined/100 X;
D-048 revises only its combined ceiling to 225 using 75 unused Phase 1
credits, with a publication-only corrective extension from 60 to 65.
Limits overlap, not add. Original actuals/overruns, S4 700,
S5 500, reserve 700, project 7000 and end Oct 11 code freeze remain intact.
F02/F03/F05/F07/F10 stay outside the implementation batch.

## Phase 2 - Bounded feedback and release-candidate verification (accepted at Gate 2)

**Goal:** Improve threshold/selection clarity and portable setup, then prove
the final integrated workflow and D-044 carryover before code freeze.

**Allocation:** Current ceiling 225 O+X (was 150); X ceiling 100. D-048
transfers 75 unused Phase 1 credits without increasing S4's 700 allocation.
D-047 originally extended the cumulative corrective limit to 60; historical
use at S3 closeout was 36.7557225. X reported 23.823690 further carried-warning
credits, reaching 60.5794125, or 0.5794125 over that limit. Preserve this
overrun. D-048 permits at most 5 further X credits for publication only,
also subject to the new cumulative corrective ceiling of 65: at that report,
4.4205875 remained under 65. Use the tighter applicable guard.
Limits overlap, not add. Record a separate warning-work interval; do not
charge unrelated Phase 1/2 tasks to it or exclude related verification/report
calls. Prerequisite: Human Gate 1, approved in D-047.

The preceding sublimits are historical: **D-049 supersedes them as hard
guards**, including the corrective/publication limits. Use the shared S4
700 cap for current execution; retain those estimates and overruns for the
retrospective rather than resetting or rewriting history.

Atomic tasks

- [x] Publish O's approved workflow/ledger/plan/spec/decisions and take an
  actual X execution kickoff/baseline. Map each report item to its feedback
  ID and evidence; approval is not verification.
- [x] S4-F01: add a selected-target decision-threshold marker to the existing
  absolute 0-100% probability legend, positioned from the current response.
  Include CAD when selected, use clear text distinguishing decision threshold
  from colour midpoint/uncertainty, and hide the marker when no accepted
  target is available. Check 0/1 endpoints and narrow layout. Keep colourScale
  and swatches probability-only, with no changed thresholds or labels.
- [x] S4-F04: extend the existing Html/tooltip pattern for a persistent
  selected-vessel label. Keep one label per vessel when hovered/selected,
  current-only risk text, neutral unavailable state, pointer interaction
  and ordinary-selection camera position unchanged. Clear selected overlay
  when CAD is selected; no new glow/decoder/package or geometry rework.
- [x] S4-F06: explain independently tuned target thresholds and the served
  CAD cap in the existing model detail view and usage docs. Different labels
  are not necessarily contradictory. Do not infer a per-patient capping event
  from equal values, recompute labels/probabilities or claim clinical coherence.
- [x] S4-F08/F09: make setup/check/start instructions usable from a generic
  repo checkout in the tested Ubuntu/Linux environment, with optional WSL
  adaptation and accurate root API/models layout. Distinguish Node's tested/
  recommended pin from declared compatibility; keep all existing pins and
  the mock route. Verify commands in the existing environment, without
  unnecessary reinstall/new environment/host protection changes.
  Describe paired what-if origin and pinned schema limits truthfully.
- [x] Add targeted marker/label/detail regressions and preserve Phase 1's
  three-row visibility, thresholds, probability hues, accessible numeric/
  input detail and accepted-response clearing. Run the appropriate frontend
  lint/typecheck/test/build checks; no API/model change or repeated suite
  merely because old feedback suggested one.
- [x] Confirm intended demo machine and rehearse the final patient ->
  prediction -> vessel -> explanation -> edit/fresh-response story using
  the same demo-model origin; keep custom/final source distinct.
- [x] Complete missing real empty-state captures at both exact viewports and
  settled 1280x800 warning closed/open measurements; check remaining
  viewport-specific keyboard proof after Phase 1. Preserve overflow <=2 CSS
  px, canvas minima 480/300 and <=2 CSS px closed/open variation.
  Use working headed readiness/real input or H observation; do not resurrect
  the failed threshold-wait/SendKeys loop.
- [x] Run targeted checks for actual changes and record release-candidate
  evidence. Repeat broader performance/API work only for a real regression.
- [x] Publish results/credits and stop for Gate 2 before cleanup/code freeze.

**Self-check gate 2:** The approved residual list is resolved or explicitly
deferred by H; D-044's remaining warning evidence is complete; the final
local demo is reproducible and truthful; relevant checks/evidence/source/
dated credits agree. No implied public deployment or clinical validation.

Specifically prove F01's marker position from returned thresholds (including
boundary fixtures), unchanged absolute colours and disappearance on
invalidation; F04's persistent label from result/viewer selection without
camera movement or stale risk; F06's qualified explanation without altered
outputs; F08/F09's generic commands and accurate tested/pinned wording.
At both desktop viewports keep visible source/probabilities/warning status,
the bounded viewer and 1280x800 three-row Why? criterion from Gate 1.
Preserve the full metadata/inputs/model detail and warning keyboard routes.
Publish a feedback-ID -> commit/evidence mapping, marking implemented items
as awaiting human verification until Gate 2. Deferred/no-change IDs stay
visible. Stop on the applicable combined/X/corrective guards or genuine
repeated failure; no CI debugging, PR work or later phase start.

**Human Gate 2: approved (D-050).** After O confirmed publication and matching
clean local/remote hashes at `39ffab1`, H replied "approved". The release
candidate and D-044 carryover evidence are accepted; Phase 3 cleanup is
authorised. No new code, PR operations or S5 work is implied.

### Historical local delivery and publication-only completion (D-048/D-049)

The approved planning update is published at
`61d39a59d3414daa8c936a3a03bc541865129d42`. New Phase 2 implementation,
README changes and `docs/evidence/s4p2-*` remain uncommitted and unpushed.
X reports frontend lint/typecheck, 64 tests and build passing, plus six
existing-environment API tests; do not rerun these solely for publication.

O reviewed the local source/evidence: the selected-target threshold marker
uses the accepted threshold without changing probability colours, and the
label preserves existing picking/emissive/camera handlers. Warning-bearing
closed/open pairs at 1920x1080 and 1280x800 show zero document overflow and
zero canvas-height variation, with heights 576.0138/318.3858 CSS px.
The 1280 closed-warning capture retains three full chart rows. Keyboard
traversal/activation and qualified empty-warning captures exist at both
viewports. The warning pairs use an edited patient-20 scenario with retained
demo-model origin; the earlier original-patient capture is separate.
The 2.78% canvas pixel difference after selection is not by itself proof of
camera position; unchanged camera handlers and supported selection evidence
are the relevant basis. Existing-environment startup evidence does not
certify a fresh installation on every Linux/Windows host.

Feedback IDs S4-F01/F04/F06/F08/F09 are implemented locally and await
publication/Human Gate 2 verification. D-044's previously missing evidence
is now present locally, not yet a published gate pass. Keep all deferred/
no-change IDs and their rationales.

**Budget stop and H approval:** X stopped after the cumulative corrective
limit reached 60.5794125. H selected "Approve the bounded publication-only
allowance (Recommended)", adding up to 5 X credits with a cumulative ceiling
of 65, while leaving the combined Phase 2 cap unchanged at that decision.
O's later fresh snapshot through **2026-10-10T17:44:22.172Z** showed Phase 2
**178.1378245** (O **134.219630**, X **43.9181945**), or **28.1378245** over
the original 150 combined cap. S4 was **331.449464** and project
**3285.2362425**. O's review/approval conversation caused that combined
overrun; do not attribute it to X or erase it retrospectively.
H then selected "Approve the reallocation for publication-only closeout
(Recommended)", transferring 75 unused Phase 1 credits (350 -> 275) to Phase
2 (150 -> 225). Original actuals/overruns remain recorded; S4/S5/reserve/
project caps remain unchanged. At that historical snapshot the revised
combined headroom was **46.8621755**; later calls are excluded.
Figures are deduplicated local telemetry, not billing.

**Subsequent publication stop and simplification (D-049):** X reported no
edits/commit/push during its final publication attempt. Through
`2026-10-10T18:28:34.655Z`, its report recorded P2 201.002967 (X 48.266057),
publication X 4.3478625 and only 0.072725 corrective headroom. O's subsequent
read-only snapshot through `2026-10-10T18:36:30.498Z` recorded P2
311.878097 (X 49.349427), above D-048's revised 225 ceiling. Preserve both
dated observations; do not silently reconcile them into one cutoff.
No commit or staging happened before H's further decision.
H explicitly authorised O to commit/push the already-reviewed work, then
selected "Approve shared sprint budgeting and publish now (Recommended)".
S4 now has one shared 700 hard cap; all sublimits are estimates. No requested
150-credit transfer was approved or applied. No code changes, executor retry,
cleanup, freeze, PR operation or Gate 2 approval is implied.

Publication-only tasks:

- [x] Publish already-passing Phase 2 implementation, README and evidence,
  plus O's D-048 plan/spec/decision updates. Update feedback status to
  implemented/published awaiting Human Gate 2, not already verified.
- [x] Reconcile the separate carried-warning/publication interval and dated
  P2/S4/project credits, retaining both overruns and both approvals. No
  repeated accounting-only commit loop or reset.
- [x] Verify clean matching local/remote hashes and return a concise report.
  No feature/content expansion, new captures, test-suite reruns, Phase 3,
  code freeze, PR operation or merge. O is explicitly authorised for this
  scoped commit/push only; stop on the shared S4/project hard budget.

## Phase 3 - Retrospective and code-freeze cleanup (completed; Gate 3 pending)

**Goal:** Freeze the accepted code and hand a stable, documented baseline to S5.

**Estimate:** 50 O+X; D-049's shared remaining S4 budget is the only sprint
hard guard, not a separate executor/publication limit. Prerequisite: Human
Gate 2, approved under D-050. No implementation changes in this phase.
Accounting starts **2026-10-10T18:47:03.450Z**, H's approval timestamp.
X records its separate actual kickoff without resetting usage.

Snapshot through **2026-10-10T18:47:18.753Z**: final recorded Phase 2 usage
before the transition is **342.502622**. Phase 3 usage at this initial
snapshot is **3.322320**; S4 is **499.1365815**, leaving **200.8634185**
under its shared 700 cap. Project usage is **3452.923360**, leaving
**3547.076640** overall. These are deduplicated local telemetry, not billing;
later calls are excluded. Preserve the preceding budgets/overruns with
D-049's explicit simplification.

**X execution kickoff:** **2026-10-10T18:49:31.651Z**
(2026-10-10 20:49:31.651 CEST), recorded separately from H's accounting
boundary. Fresh deduplicated local snapshot through
**2026-10-10T18:54:20.769Z**: Phase 3 usage is **20.601055**; S4 is
**516.4153165**, leaving **183.5846835** under its shared 700 cap; project
usage is **3470.202095**, leaving **3529.797905** under the 7000 cap.
These are local session-store telemetry, not account billing; later calls
are excluded from this dated snapshot. No actuals or allocations were reset.

Publication and acceptance supersede the historical unchecked task statuses
above: approved Phase 2 work/evidence and O's approval documents are published
at `39ffab1`. The closeout should consolidate actual outcomes and feedback
status, not rerun the accepted checks or historical accounting conversation.

Atomic tasks

- [x] Write S4 retrospective and reconcile boundaries/actuals without resets.
- [x] Publish the pending D-050 plan/spec/decision status update. Include
  feedback triage, improved clarity, completed warning evidence, publication
  delays caused by micro-budgets and O review cost, and the shared-budget
  corrective action. Retain deferred items and limits honestly.
- [x] Synchronise spec/decisions, archive S4 and stage only unstarted S5
  Phase 0 with document/video owners, ML-section timing and Oct 12/13 outputs.
- [x] Publish the accepted release-candidate/code-freeze hash by end Oct 11.
  Record `39ffab1c8adecd707c0f40ce826c12a568c41267` as the accepted source
  release candidate and the later documentation-only closeout commit
  separately. Do not create tags/branches or imply a later code change.
  Preserve separate PR approval and gate S5; no automatic merge or new work.

**Self-check gate 3:** Code/evidence/retro/archive/spec/budget agree; carryover
is resolved or explicitly approved; freeze hash is published; S5 has a
discussion/research entry point and its own gates; submission buffer intact.

**Human Gate 3:** H closes S4 and authorises S5 planning. S5's 500 cap covers
document/video/reproducibility/submission readiness; only separately approved
blocking fixes may change frozen code. No automatic S5 implementation.

**Closeout:** The Phase 3 checklist and retrospective are published in this
documentation-only closeout. The accepted source baseline above remains the
code-freeze reference; Human Gate 3 is not inferred from publication, and
S5 Phase 0 remains unstarted until H approves Gate 3.
