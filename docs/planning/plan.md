# Sprint 2 Plan — 3D viewer integration

**Calendar:** Phase 0 started Oct 8 after `/compact`, per H (D-023). H approved Gate 0 and authorised Phase 1 tonight, Oct 8 (D-025); S2 completion remains targeted for Oct 9. S3 remains Oct 10-11, S4 Oct 12-13, and Oct 14 submission-only buffer.

**Status:** Gates 0 and 1 are approved (D-025, D-028). Phase 1 implementation and its technical self-check evidence are complete; the WSL mock-hosting route is verified (D-027). Phase 2's mock-based implementation and technical self-check evidence are delivered; Gate 2 awaits H/O review. M's contract response/API delivery-date follow-up remains open and was deferred to Gate 2, not completed. Phase 3 remains gated. The baseline PR remains unmerged until H separately authorises merge.

**Sprint cap:** 1800 credits (D-008). S2 accounting starts **2026-10-08 20:43:11.531 UTC** (22:43 CEST), at H's start instruction. Deduplicated project events before that boundary total **1407.9373** credits: O **1331.0196**, X **76.9177**. This includes the remaining S1 transition/compaction work and leaves **92.0627** under S1's 1500 cap and **5592.0627** under the project cap at S2 start. These are local telemetry figures, not account-billing reconciliation.

First S2 snapshot (latest recorded event **2026-10-08 20:43:48.832 UTC**): **10.6094** S2 credits; **1418.5467** cumulative project credits. Later calls are not included. The same O/X sessions are reused: count deduplicated events at or after the boundary as S2 spend, not their whole-session totals. Query/filter/de-duplication follows `scripts/credits.py` through the permitted read-only local session-store interface; do not retry the blocked Python interpreter.

Planning snapshot (latest recorded event **2026-10-08 20:52:00.495 UTC**): **28.3358** S2 credits; **1436.2731** cumulative; **5563.7269** project credits remaining, before subsequent calls. Phase actuals will be recorded at their gates; do not invent an O/X phase partition.

Gate 0 snapshot (latest recorded event **2026-10-08 20:56:54.963 UTC**): O **1373.8175**, X **76.9177**, cumulative **1450.7352**; S2 planning so far **42.7979**, with **1757.2021** left under the S2 cap and **5549.2648** overall, before subsequent gate-recording/handover calls. X has not started S2. Record a fresh X phase-start boundary at actual kickoff; do not use X's whole-session total as Phase 1 spend.

Phase 1 kickoff: **2026-10-08 20:59:33 UTC**, with **50.7951** S2 credits recorded before that boundary. X's report snapshot through **2026-10-08 21:10:35.334 UTC** records **10.0098** X/combined Phase 1 credits and **60.8049** S2 credits. O's first review snapshot through **2026-10-08 21:16:00.058 UTC** records **16.7765** combined Phase 1 credits, **67.5716** S2 credits, **1475.5089** cumulative project credits, and **5524.4911** remaining overall, before later review calls. These snapshots include no Gate 1 approval.

Recovery snapshot (latest deduplicated event **2026-10-09 19:09:22.576 UTC**):
Phase 1 totals are **83.623823** credits (planning session **54.005670**;
executor session **29.618153**). The executor's recovery delta since
**2026-10-09 18:50:38.568 UTC** is **16.639161** credits; the executor remains
within its 120-credit Phase 1 ceiling with **90.381847** credits left. S2 totals
**134.418893** credits across the two project sessions. Values are local
session-store telemetry, deduplicated with `scripts/credits.py`'s project
filter and event fields; not account billing.

O's Gate 1 review snapshot (latest recorded event **2026-10-09 19:12:53.762 UTC**):
Phase 1 **114.7094** credits (O **83.3350**, X **31.3744**);
S2 **165.5045**, leaving **1634.4955** under its cap.
Cumulative project credits **1573.4417**, leaving **5426.5583** overall.
This newer local-telemetry snapshot includes recorded usage after X's report;
it is not a discrepancy with that earlier report or a final gate balance.
Later review/approval/handover calls are not included.

Gate 1 approval snapshot (latest recorded event **2026-10-09 19:20:59.959 UTC**):
S2 **181.3086**, Phase 1 through this snapshot **130.5136**, and project
**1589.2459** credits, leaving **1618.6914** under the S2 cap and
**5410.7541** overall. This includes recorded gate-review calls, not later
documentation/handover calls. Phase 2 has not started; X must record its fresh
kickoff timestamp and baseline so handover overhead is not misattributed to
execution. These remain deduplicated local telemetry, not billing totals.

Phase 2 kickoff boundary **2026-10-09 19:27:22.028 UTC**: immediately before
the boundary, O/planning had **1493.209565** all-time and **162.189990** S2
credits; X/executor had **111.1197645** all-time and **34.2020645** S2 credits.
Combined kickoff totals were **1604.3293295** all-time and **196.3920545** S2.
All later deduplicated events in the same two project sessions count toward
Phase 2; this is local session-store telemetry, not account billing.

Phase 2 usage snapshot (latest project event **2026-10-09 19:58:07.752 UTC**):
O/planning **31.679840**, X/executor **36.627854**, combined **68.307694**
credits since kickoff. S2 total **264.6997485**; cumulative project total
**1672.6370235**. Phase 2 remains within its 650 allocation with
**581.692306** credits left; X remains within its 160 ceiling with
**123.372146** left. Later documentation, commit, and push events are not
included in this snapshot.


## Scope and allocation

**Scored demo story:** enter/load patient -> receive prediction -> see CAD and vessel probabilities -> select a vessel -> inspect that target's leading model inputs. This advances dynamic 3D mapping (25%), interpretability (20%), and integration (15%). It does not certify predictive performance (30%) or real-backend integration.

- S2 uses the current mock contract. Keep mock predictions, synthetic samples, and schematic anatomy explicitly labelled.
- Bring a selected-target contribution/value list forward from S3. S3 retains real-backend integration, final explanation charts/scale agreement, metrics, and the fuller physiological dashboard.
- Reuse the licensed heart, procedural vessel paths, existing stores/client, Zod schemas, and colour helper. No asset search, Blender, backend feature engineering, new framework, or speculative dependency.
- Basic camera focus/reset supports inspection; elaborate camera animation, decorative gauges, and redesigned tabs are not S2 work.
- Input bounds are validation limits, not clinical normal ranges. Probability is not percentage artery narrowing.

O+X allocations approved at Gate 0 (D-025):

| Phase | Combined allocation | X ceiling | Actual |
|---|---:|---:|---|
| 0 - Discussion and research | 200 | 0 | 50.7951 before Phase 1 kickoff, including handover overhead |
| 1 - Coherent prediction and visual mapping | 650 | 120 | 130.5136 through the Gate 1 approval snapshot; later handover overhead excluded |
| 2 - Minimum interpretation and supporting controls | 650 | 160 | 68.307694 through the 2026-10-09 19:58:07.752 UTC snapshot (O 31.679840, X 36.627854); later events excluded |
| 3 - Retrospective and cleanup | 150 | 30 | Not started |
| Contingency, only with H approval | 150 | Unassigned | Unused |
| **Total** | **1800** | | |

These are spending ceilings/allocations, not measured model-price forecasts or a requirement to spend them. X records a fresh per-phase baseline; O reviews concise evidence without rerunning X's checks. If a phase cannot finish within its allocation, report before exceeding it; H must approve any contingency use or reallocation. The 7000-credit project cap remains unchanged.

## Phase 0 - Discussion and research (approved)

**Goal:** Agree the evaluation-led S2 scope, acceptance criteria, external dependencies, credit allocations, and gates before implementation.

**Credit allocation:** 200 O+X. Actuals use the S2 boundary above.

Tasks

- [x] Review `docs/spec.md`, `docs/decisions.md`, `docs/retro/sprint1.md`, and current deduplicated budget. Remote `ML-dev` remains at `d09ebda7317a94f9d23f5c5b8706c6222a531b5e` at S2 start; the previous ML findings remain applicable, not backend sign-off.
- [x] Confirm evaluation-led scope with H (D-024), detailed criteria/allocations at Gate 0 (D-025), and retain the current orchestrator (D-020).
- [ ] Via H, obtain M's acknowledgement or requested changes to `docs/api-contract.md`, plus a concrete API delivery date. Initially deferred to Gate 1 (D-025); H approved Gate 1 with this response deferred to Gate 2 (D-028), not completed.
- [ ] Via H, assign ownership for the demo video and shared six-page document. Response deferred to S3 Phase 0 by H (D-025), not completed.
- [x] Draft delivery phases, atomic tasks, acceptance criteria, evidence, and both gates; synchronise the affected spec and record H's scope decision.
- [x] Obtain Gate 0 approval, including allocations, external follow-up deferrals, and Phase 1 tonight (D-025). Issue only the Phase 1 handover through H.

### External follow-ups and approved deferrals

| Unanswered item | Owner and next action | Follow-up deadline | Blocking boundary |
|---|---|---|---|
| M's contract acknowledgement/requested changes and concrete serving API delivery date | H obtains M's response to `docs/api-contract.md` and the integration questions below; O records it. | Before S2 Gate 2 (D-028), following H's explicit extension from Gate 1. This is our follow-up boundary, not a promised API delivery date from M. | Does not block independent Phase 2 work. The Oct 10-11 real-integration window remains at risk until confirmed. If still unanswered at Gate 2, H explicitly revisits integration timing before S3 proceeds; mock-only work cannot certify compatibility. |
| Demo video and shared six-page document owners | H and M assign accountable owners; O records them in the next planning discussion. | Before S3 Phase 0 closes, targeted Oct 10. | Does not block viewer work; submission preparation cannot remain ownerless into S4. |

These remain unanswered, not completed or signed off. H explicitly approved the initial deferrals at Gate 0 (D-025) and the contract/date extension at Gate 1 (D-028). All contact still goes through H; no agents are spawned or directly messaged.

### Integration questions carried forward

- The mock API is a contract fixture, not an agreed serving interface. No backend contract acknowledgement, FastAPI serving app, or real-model integration is established; do not treat the frontend as a base-URL-only swap.
- ML-dev documents 55 cleaned inputs (21 continuous, 3 ordinal, 31 binary), but serving names, units, allowed ranges/defaults, and final per-target pipeline inputs remain unconfirmed. Define an explicit map for raw identifiers including `EX-Smoker`, `Airway disease`, `St Elevation`, `St Depression`, and `Tinversion`.
- Raw `BBB` is categorical (`N`, `LBBB`, `RBBB`) and expands to two binary inputs, while the mock uses a boolean. Raw `VHD` has four levels (`N`, `mild`, `Moderate`, `Severe`) mapped to 0–3, while the mock uses a boolean. `Function Class` is 0–3 in the data versus 1–4 in the mock.
- ML WBC values are 3700–18000; the form uses thousands per microlitre (default 7.5). Confirm the serving unit and perform any factor-of-1000 conversion exactly once. `Exertional CP` is constant and dropped by ML; matching feature counts alone do not establish compatibility.
- Evaluation currently uses threshold 0.5, but final per-target thresholds are not confirmed. Final model export, calibration, explanation methods, and serving are not implemented in the reviewed ML-dev snapshot; do not assume TreeExplainer availability or combine unlike explanation scales.
- Confirm whether all five contract endpoints, including `/model/metrics`, will be served or whether metrics will be delivered as a static artifact. Experimental metrics must not be presented as final deployed-model metrics.
- Samples remain synthetic; no real-model integration or backend sign-off is claimed. Carry the remaining parts of Q1–Q3 in `docs/spec.md` §12.

**Self-check gate (passed; planning evidence, not implementation):**

- S2 boundary and deduplicated O+X baseline are recorded; allocations sum to 1800 and fit the remaining project budget.
- This plan specifies measurable prediction mapping, bidirectional selection, minimum interpretation, camera/legend, and empty/loading/error/stale behaviour.
- Unanswered external items have named follow-up owners, actions, deadlines, and blocking boundaries. Missing answers are not sign-off; H approved the explicit deferrals (D-025).
- Plan/spec/decisions agree on scope, phases, atomic tasks, evidence and both gates, including final retrospective/cleanup. No implementation occurs during Phase 0.

**Human gate 0 (approved):** H selected "Approve Gate 0 and authorise Phase 1 tonight (Recommended)", approving the detailed plan, allocations, external deferrals, and earlier Phase 1 start (D-025). PR merge remains a separate decision.

## Phase 1 - Coherent prediction and visual mapping (approved)

**Goal:** One fresh prediction response drives readable CAD/vessel results, schematic vessel colours, and synchronised vessel selection.

**Credit allocation:** 650 O+X; X ceiling 120. Prerequisite: human Gate 0.

Atomic tasks

- [x] Replace static vessel probabilities in runtime rendering with accepted `patientStore.prediction` targets. Keep geometry/IDs separate from response values and reuse `colorScale`; no fallback sample probabilities.
- [x] Render readable CAD and LAD/LCX/RCA probability summaries from the same response, using one consistent percentage formatter. Show response-provided labels/thresholds as model outputs, not invented clinical risk categories.
- [x] Make each vessel summary keyboard-operable. Use `uiStore.selectedVessel` for bidirectional selection; a CAD/clear action restores the default CAD target. Selection does not automatically reposition the camera. Implementation reviewed; live interaction evidence is recorded below.
- [x] Show the selected vessel's name and current probability in the viewer callout; keep labels/numeric values as a secondary encoding alongside colour. Add a continuous 0-100% probability legend with a distinct neutral/unavailable state, not clinical low/medium/high cutoffs.
- [x] Derive viewer and results availability from the same prediction state. Preserve the current clear-on-edit/sample-change behaviour: neutral vessels and no prior probability/contribution values until a fresh response arrives. The selected anatomical target may persist, but its prediction detail must clear.
- [x] Check request freshness at the current input revision/latest request. Earlier success or error responses must not overwrite a newer input/prediction, including during the debounce interval, with auto-predict off, after invalid input, or on sample/reset changes. Clear old results while retrying; show latest request errors explicitly.
- [x] Preserve Zod response validation, the 500 ms debounce, manual Predict, data-driven form validation, synthetic/mock labels, asset attribution, schematic warning, and clinical disclaimers.
- [x] Add focused tests and capture the gate evidence below. Do not implement Phase 2 explanation presentation or camera presets yet.

**O review, Oct 8 (historical, before WSL recovery):** `d7130c4`, `2d7debb`, and `7ee2b32` were present; local/remote `frontend` matched `7ee2b3290a56e159e886e50cf279aed2e7cf55ef`. Focused source/test review supported the probability mapping, neutral-state handling, shared selection, and revision/request freshness design; no blocking implementation defect was identified. X's recorded local checks passed (5 files / 15 tests). The live browser/API flow was still unverified at that review.

**Historical blocker:** Windows Application Control denied `mock-api\.venv\Scripts\uvicorn.exe`; it was not retried or bypassed. See `docs/evidence/s2p1-live-flow-blocker.txt` and `s2p1-hosting-diagnosis.txt`. The authorized WSL route below has now completed the mock-based live verification.

**H direction and hosting diagnosis:** H chose WSL rather than deferring verification (D-026). Read-only inspection found Windows 11 Home with Smart App Control enabled, unsigned local venv launchers, and Code Integrity events rejecting this project's `uvicorn.exe` before server startup. No protection settings were changed and no blocked process was retried. WSL 2 now serves the mock through Windows localhost; this does not certify the real backend.

### Gate 1 completion - user-approved WSL hosting setup (D-026)

H chose WSL rather than deferring verification. Ubuntu 24.04 runs as WSL 2;
the existing Windows checkout is mounted in Linux, with Git remaining on Windows.
The Linux-only environment is `/home/jalfaizy/.venvs/multimodal-ai-hack-mock-api`
(Python 3.12.3, uv 0.12.24), synced from `uv.lock` without changing it. The API
is bound to WSL loopback and is reachable from both Ubuntu and the Windows
frontend at `http://localhost:8000`. No administrator/reboot action remained;
no firewall or host-protection setting was changed.

- [x] H's WSL/Ubuntu setup and Linux first login are complete; verified Ubuntu 24.04 is WSL 2.
- [x] X created the Linux-native Python/uv environment in Ubuntu's home, separate from `mock-api\.venv`; reused the manifest/lockfile without upgrades and kept Git operations on Windows.
- [x] X started the mock on loopback and verified `/health` inside Linux and from Windows localhost; Windows-origin CORS and the frontend's API-backed flow returned successfully.
- [x] X captured the sample/chest-pain comparison, bidirectional viewer/results selection, Enter/Space, CAD/clear, stable camera frame, and live edit invalidation/neutral state.
- [x] X documented verified Windows-frontend/WSL-API setup/start/stop instructions in `README.md` and saved the evidence under `docs/evidence/s2p1-*`. The in-scope planning edits and hosting diagnosis are included for publication.

No feature redesign, API contract change, public deployment, Docker setup, or
real-model integration is authorised here. Maintain the existing Phase 1 combined
allocation of 650 and total X ceiling of 120, including the prior 10.0098 credits;
the fresh recovery boundary and delta are recorded above without resetting the
ceiling. All usage remains within the approved limits. Credits continue through
the permitted read-only Windows session-store interface.
H/M's contract response/API-date follow-up remains open; H extended its boundary
to Gate 2 when approving Gate 1 (D-028).

**Self-check gate 1:**

1. With two distinct deterministic response fixtures, each viewer vessel colour equals `colorScale(response.vessels[id].probability)` and displayed percentages equal the same target value rounded consistently. A changed response replaces all prior values; zero probability is valid, not unavailable. Existing pure colour boundary tests cover 0, 0.5, and 1.
2. Using the running mock, load a sample, then toggle Typical Chest Pain and obtain a new response. Capture response values and a screenshot showing matching viewer legend/callout and CAD/vessel summaries; do not rely on S1's old numeric values.
3. Selecting each of LAD/LCX/RCA in either the viewer or results updates the other surface. Enter/Space activates result controls, selected state is exposed accessibly, and CAD/clear restores the default target. No camera jumps on selection.
4. Tests cover initial no-result, edit/sample/reset invalidation, pending/retry, rejected request, and invalid response. In each unavailable state there are no fixed test probabilities, no old risk values, and no success-coloured default vessels; errors have a visible alert.
5. Deferred-promise tests prove an old success and an old rejection cannot replace a newer input/current request state, including the 500 ms debounce interval and auto-predict-off/invalid-input cases. The current response succeeds normally afterward.
6. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass. Record concise output and screenshots/state evidence under `docs/evidence/s2p1-*`; commit and push passing in-scope work, report hashes and actual credits. CI is informational, not a waiting/debugging task.

**Evidence completion, Oct 9:** Current response values, DOM legend colours/callouts,
and screenshots are recorded in `docs/evidence/s2p1-live-flow.txt`,
`s2p1-live-before.png`, `s2p1-live-after.png`, `s2p1-selection-results.png`,
`s2p1-selection-viewer.png`, and `s2p1-neutral-after-edit.png`. The same sample-1
features produced CAD probabilities **0.7523** with Typical Chest Pain false and
**0.8821** with it true (delta **0.1298**); the after-edit UI labels the modified
sample as custom. Live result selection via Enter (LAD/RCA), Space (LCX), and
CAD reset updated the viewer callout and `aria-pressed`; pointer picking each
schematic vessel updated the corresponding result control. Canvas viewport
bounds remained unchanged during selection. Editing Age 67→68 with auto-predict
off cleared all prior outputs and contributions, rendered every vessel neutral,
and retained RCA selection with unavailable risk detail. These close the
executor's evidence tasks only: Gate 1 still awaits H's approval, and M's
contract acknowledgement/API delivery date remain open. The existing mapping,
zero-boundary, invalidation, deferred-race, and frontend quality evidence remains
in `docs/evidence/s2p1-validation.txt`; frontend source/dependencies were not
changed during this hosting recovery.

**Human gate 1 (approved):** H said "we can approve gate 1" after O accepted the
technical evidence and proposed proceeding with the contract/date follow-up
explicitly deferred to Gate 2 (D-028). H also requested a fresh ML-branch check.
Phase 2 is authorised; real-backend compatibility and PR merge are not.

**O review, Oct 9:** The technical self-check is accepted from the existing
source/test review plus X's new WSL/browser evidence. Fresh response values in
`s2p1-live-flow.txt` match the before/after result percentages, vessel legend,
and callout screenshots. The selection/reset screenshots support X's recorded
pointer/keyboard checks; the neutral-edit screenshot shows cleared results and
neutral vessel geometry. README records the verified Linux-native environment,
Windows-localhost startup and foreground shutdown commands. The recovery changes
no frontend source/dependencies. Both branch refs matched
`11d9cc1c46685fe993935855e9920d425b09c898` and the delivered tree was clean.

The technical hosting blocker is closed for the mock, not for the unimplemented
real backend. M's contract response/delivery date remain open; H subsequently
approved Gate 1 with their follow-up deferred to Gate 2. Full-page screenshots and idle demand-mode
FPS counters do not establish active-orbit performance. Phase 2 must measure
the current canvas at a 1920x1080 viewport (X recorded 616.734375x936.25 CSS
pixels during the selection sequence), rather than inherit S1's smaller-canvas
benchmark.

**Fresh ML check at H's request, Oct 9:** GitHub's comparison of
`d09ebda7317a94f9d23f5c5b8706c6222a531b5e...ML-dev` returned `identical`,
zero ahead/behind commits, and no changed files. The remote branch remains at
the reviewed commit; no new serving API, exports, explanation serving, contract
response, or delivery-date evidence appeared there. This is branch evidence,
not a claim about M's unpushed/local work or an acknowledgement on M's behalf.

## Phase 2 - Minimum interpretation and supporting controls (implementation delivered; Gate 2 pending H review)

**Goal:** Make the selected target's drivers understandable and its schematic vessel easy to inspect without pretending the mock is a validated clinical model.

**Credit allocation:** 650 O+X; X ceiling 160. Prerequisite: human Gate 1.

Atomic tasks

- [x] Show CAD explanations by default; vessel selection switches to exactly `prediction.explanations[selectedVessel]`. Use the shared selection state, not a second target store.
- [x] Present up to five contributions sorted by absolute magnitude, with deterministic tie handling, readable feature labels, input values, units when supplied, and signed contribution values. Read values from the accepted response/submitted snapshot, not a subsequently edited form.
- [x] Include positive, negative, and zero/empty-list states. Describe model contributions, not clinical causation; do not calculate a probability endpoint by summing unconfirmed-scale contributions.
- [x] Keep mock attribution visibly illustrative. For any scale not established by the contract, label it unconfirmed/model scale; do not claim probability-point changes, genuine SHAP, or a mathematically additive waterfall. Real explanation-scale/schema changes remain M/S3 work.
- [x] Add basic Reset and LAD/LCX/RCA focus controls only after the interpretation tasks pass. Use existing controls/geometry to frame the named schematic vessel; do not introduce unverified anterior/lateral/inferior anatomical labels or elaborate flight animation.
- [x] Keep all inspection controls keyboard-operable, give the canvas a useful accessible summary, and maintain numeric/label encodings so meaning is not colour-only.
- [x] Capture the gate evidence and verify the integrated viewer still uses demand rendering and the existing local assets. No dashboard tabs, metrics drawer, reference-range classifier, or backend swap in this phase.

**Implementation and evidence status (2026-10-09):** The current accepted mock
response drives the selected-target explanation and the 3D camera controls.
Self-check evidence is recorded in `docs/evidence/s2p2-validation.txt` and the
screenshots beside it. No contract, API, prediction schema, or backend code was
changed. Gate 2 remains pending H/O review; this work does not certify real
backend integration or resolve M's contract/API-date follow-up.

**Self-check gate 2:**

1. A fixture with distinct CAD/LAD/LCX/RCA contributions proves selection chooses the correct target, top-five ordering and signs are correct, and displayed feature values/units match that response and metadata. CAD/clear returns to CAD.
2. An empty contribution list yields an explicit unavailable message, not invented drivers; pending/error/input changes clear the explanation with the prediction. Include mixed-sign and tied-magnitude fixtures.
3. Screenshots show the complete patient -> probabilities -> vessel selection -> driver/value story with visible mock/synthetic/schematic disclaimers. No contribution is presented as a confirmed probability-point change, lesion severity, clinical normal-range flag, or causal claim.
4. Reset restores the overview; each focus control visibly frames its named schematic vessel without losing orbit/zoom. Keyboard operation works, and ordinary vessel selection still does not move the camera.
5. During active orbit on the intended demo machine, measure at least 50 FPS with a 1920x1080 viewport and record actual canvas CSS dimensions/DPR/device. Retain demand rendering and verify it settles when idle. This is not a full-screen 1080p benchmark; S4 will recheck the final integrated dashboard.
6. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass. Record concise evidence under `docs/evidence/s2p2-*`, commit/push and report credits/hashes. No CI troubleshooting.

**Executor self-check (2026-10-09):** All six technical criteria are
documented in `docs/evidence/s2p2-validation.txt`. The fixture tests cover all
four explanation targets, stable top-five sorting, signs, response values,
units and empty explanations. Live mock screenshots show the synthetic sample,
selected LAD values, neutral invalidation and the fresh chest-pain-toggle
response. Viewer picking and result controls select the same LAD/LCX/RCA/CAD
state; pointer and keyboard focus/reset controls frame the schematic geometry.
The active-orbit measurement uses the actual 1920x1080 browser viewport and
records canvas size/DPR and the WebGL renderer. Lint, typecheck, all 21 tests,
and build pass; Vite retains its non-blocking large-chunk advisory.

**Human gate 2:** H approves the minimum explanation experience, truthful labels, supporting controls, measured responsiveness, and X's evidence after O review. H/M also records the contract response/API delivery date deferred from Gate 1, or H explicitly revisits the threatened S3 integration window before proceeding; missing answers cannot silently carry over.

## Phase 3 - Retrospective and cleanup (not started)

**Goal:** Close S2 with reconciled evidence/budget and a dependency-aware S3 planning entry point.

**Credit allocation:** 150 O+X; X ceiling 30. Prerequisite: human Gate 2.

Atomic tasks

- [ ] O/H review what went right/wrong and write `docs/retro/sprint2.md`, including interpretation/integration risks and budget lessons.
- [ ] Reconcile S2 O+X spend from the recorded boundary, retain dated snapshots, and update remaining project credits without treating session totals as S2 spend.
- [ ] Update spec/decisions to distinguish implemented mock wiring from uncompleted real integration and explanation sign-off. Retain all unresolved M questions and submission-owner follow-ups.
- [ ] Archive the completed plan as `docs/planning/sprint2.md`; prepare only unstarted S3 Phase 0. Record M's status and escalate any threatened Oct 10-11 integration window to H.
- [ ] Commit/push only approved passing closeout changes and report clean branch status. Ask H before opening/updating another PR or merging anything; do not automatically mutate PR #1.

**Self-check gate 3:** Gates 0-2 are explicitly approved; evidence and actuals are recorded; retrospective/archive/spec/decisions agree; no mock-only work is labelled real-model integrated; S3 Phase 0 retains open dependencies/owners and both gates; approved cleanup is pushed and the working tree is clean.

**Human gate 3:** H approves S2 closeout and authorises S3 Phase 0. This does not automatically authorise a merge, another PR, or S3 implementation.
