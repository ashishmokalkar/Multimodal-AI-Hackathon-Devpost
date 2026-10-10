# Sprint 5 Plan - Submission readiness

**Status:** H approved S5 Human Gate 1 with explicit draft-review/form-check
carryover and three document corrections (D-054). Phase 1 is accepted with
those open items; Phase 2 is authorised, with its manual handover pending.
Human Gate 2 is pending; Phase 3/submission is not authorised.
S4 remains closed under D-051 after documentation-only closeout
`e5117844e07db7196bed8636992627a551b59cdd`.
The frozen code remains `39ffab1c8adecd707c0f40ce826c12a568c41267`.

**Accounting transition:** S5 starts at the recorded post-approval boundary
**2026-10-10T19:14:10.661Z**. Recorded events before it remain S4; events
at/after it are S5, including planning and review. The last recorded
pre-transition snapshot through **2026-10-10T19:14:10.157Z** is S4
**530.509874** (169.490126 under its shared 700 cap) and project
**3484.2966525** (3515.7033475 under 7000). These are deduplicated local
telemetry, not account billing; later calls are excluded. S5's allocation
remains 500; no automatic transfer of earlier underspend or reserve use.

## Scope, owners and production approach

S5 uses the approved **500-credit** allocation from D-045; the project cap
remains 7000 and the separate 700-credit reserve is unchanged. Gate 0/D-053
approved using this as one shared hard O+X sprint ceiling, with phase amounts
as estimates rather than independent executor/publication stop guards.
No earlier underspend or reserve is automatically transferred.

S5 is submission readiness, not new product features. The accepted
code-freeze source baseline remains
`39ffab1c8adecd707c0f40ce826c12a568c41267`; only a separately H-approved
blocking fix may change frozen code. No deployment, retraining, new anatomy,
import workflow, asset optimisation or profile redesign is in scope.

**Confirmed production choices (D-052):**

- Faizan has **2-3 hours total** across Oct 11-13 and asks to automate as much
  production as practical. He remains accountable for review, uploads,
  access checks and final submission.
- E prepares the document/PDF, video script and captions, captures genuine
  prototype interactions, assembles the captioned video and drafts the
  Devpost description. Handovers and reviews still pass manually through H;
  no new agents or direct colleague messages are authorised.
- The video has **no narration**. Target 4-5 minutes within the brief's
  3-10-minute range; use readable on-screen captions, with no music required.
- E drafts ML sections from the frozen reports after Gate 0. Ashish verifies
  or replaces them on Oct 12 and must sign off before finalisation. His
  delivery hour and full section coverage remain unconfirmed, but drafting
  does not wait for them. Missing sign-off is a finalisation blocker, not
  permission to invent claims.

Edge and FFmpeg/FFprobe are present in this checkout's host environment.
The accepted S4 native-CDP capture approach is prior art; end-to-end video
recording and PDF export have not been tested. E performs one bounded media
preflight after Gate 0 using existing tools, not a new automation framework.
Prefer Edge print-to-PDF and FFmpeg assembly if they work. Do not install
dependencies speculatively or alter frontend/API dependencies.

**Automation fallback:** Spend at most 45 minutes on media setup/preflight;
stop sooner after two genuine failures for the same root cause. Report the
blocked step and switch to a short H-recorded real walkthrough or browser
PDF export rather than repeat the failed harness. E still supplies captions,
document content and video assembly. Keep this inside H's time reserve; if
it cannot fit, bring the schedule/scope tradeoff to H. A screenshot slideshow
is not a substitute for demonstrating working interactions.

## Deliverables and evidence

| Deliverable | Required content / acceptance | Owner |
|---|---|---|
| Project document | Exported PDF of **at most 6 pages**, including references; dataset/preprocessing and leakage exclusion, model architecture and evaluation, 3D pipeline, dashboard/integration, usage instructions, limitations and attribution. Verify the exported page count and visual readability. | E drafts/exports; Ashish verifies ML; H accepts |
| Demo video | Actual **3-10-minute** video, targeting 4-5 minutes; genuine real-profile input/prediction, orbit/zoom/selection, probabilities, Why?/Inputs, edit/freshness, uncertainty/warnings and technical implementation. Captions remain readable without hiding essential UI. No fabricated UI/results or clinical-validation claims. | E scripts/captures/assembles; H reviews/uploads |
| Submission text and links | Concise Devpost draft aligned with the document/video; repository/source instructions, document and YouTube links work without the owner's login. Verify the actual submission form's requirements manually. | E drafts/checks what is accessible; H verifies form/access |
| Reproducible prototype/pipeline | Preserve frozen code and model artifacts; link repo-relative setup and accepted local integration evidence. Clearly distinguish existing-environment verification from a fresh-install claim, and reported CV from independent/clinical validation. | E checks package/references; H accepts |

Use a compact document layout: problem/system overview; dataset/preprocessing;
models/evaluation; 3D/dashboard/explanations; integration/setup; limitations
and references. Six pages is a maximum, not a reason to shrink text or omit
qualifications. Source ML claims from `models/manifest.json`,
`reports/BEST_MODELS.md`, `handover_docs/ML_ANSWERS_FOR_FRONTEND.md` and the
accepted API contract; retain validation/model-selection caveats.

Suggested demo sequence: problem/disclaimer -> dataset patient and real
prediction -> heart orbit/zoom and vessel selection -> Why?/accepted Inputs
-> edited-input clearing and fresh response -> metrics/limitations ->
architecture and attribution. Do not force a particular output change or
present probability as narrowing/severity, contributions as causal benefit,
or schematic vessels as patient-specific lesions.

Reuse `docs/evidence/s4p2-*` for document illustrations and accepted checks.
Capture new video to distinct S5 paths; never rerun or overwrite accepted
evidence merely to produce submission assets. Keep large raw clips and the
MP4 in session artifacts or an H-designated output folder, not Git; no
binary over 10 MB may enter the repository without separate H approval.
Commit only small submission sources/exports and directly related docs.

## Calendar and H time reserve

The following CEST milestones were approved at Gate 0:

| Date | Milestone / dependency |
|---|---|
| Oct 11 | E produces document outline/draft, captioned storyboard and media preflight; drafting uses frozen ML evidence. |
| Oct 12, 16:00 | E delivers reviewable document/PDF, rough-cut video and submission-text drafts. Ashish's sections/sign-off are due Oct 12, but their hour is not assumed; track unverified ML content explicitly. |
| Oct 12 evening | H reviews drafts and forwards one consolidated feedback batch; obtain Human Gate 1 before finalisation. |
| Oct 13, 18:00 | Integrate Ashish's sign-off and approved feedback; final PDF/video ready, uploads/access checks and Human Gate 2 complete. No unconfirmed ML claim is silently treated as approved. |
| Oct 14 | Submission only: H completes the form before the recorded **20:45 CEST** deadline and verifies confirmation; final phase records submission/retro/cleanup, not new asset or feature production. |

Reserve H's 2-3 hours approximately as: 30-40 minutes draft review,
20-30 minutes ML/form coordination, 30-40 minutes final review,
20-30 minutes upload/access checks, and remaining time for a minimal
recording/export fallback. This is a time reserve, not a claim of availability at
every clock time; H accepted the milestones at Gate 0.

The saved brief/workflow supplies the deadline and requirements. A fresh
Devpost fetch on Oct 10 returned HTTP 403, so current form fields, attachment
mechanics and external-rule changes are **not independently reconfirmed**.
H checks them by the draft review, not for the first time on submission day.
Public deployment is not a requirement in the saved Track A brief; if the
live form adds one, report it as a scope blocker rather than improvise hosting.
PR approval/merge remains a separate H decision. Link the actual frozen
source and do not assume the default branch contains it.

## Budget plan (approved at Gate 0)

| Phase | Combined O+X estimate | Actual |
|---|---:|---|
| 0 - Planning | 150 | 90.225900 through the recorded pre-Phase-1 cutoff below |
| 1 - Automated draft package | 220 | 128.215259 through the recorded pre-Phase-2 cutoff below |
| 2 - Finalisation and access checks | 90 | Authorised; O handover work accruing |
| 3 - Submission, retrospective and cleanup | 40 | Not started |
| **S5 total** | **500 hard sprint ceiling** | Includes all planning/review/publication |

These are planning estimates, not overlapping warning/media/publication or
executor micro-caps. E may use the available shared balance for the approved
active phase, but not advance past its human gate. Scope expansion, sprint
overrun and reserve use need a separate H decision. Measure at gates or a
meaningful budget risk, not through repeated accounting-only exchanges.

Deduplicated local telemetry through **2026-10-10T19:21:14.774Z** records S5
**65.799120** (X 0), project **3550.0957725**, leaving **434.200880** under
S5 500 and **3449.9042275** under project 7000. This is a historical
snapshot, not billing.

**Phase 1 execution kickoff and fresh baseline:** execution began at
**2026-10-10T19:29:02.337Z** (21:29:02.337 CEST), separately from the
Phase 1 accounting boundary. The refreshed deduplicated local snapshot through
**2026-10-10T19:30:54.536Z** records Phase 1 **14.351153**, S5
**104.577053**, and project **3588.873706**. Ten Phase 1 usage events were
recorded from **19:26:59.480Z** through the cutoff; this includes O handover/
review and executor kickoff work, not only production. The snapshot is local
telemetry, not billing; later calls are excluded. Neither accounting boundary
nor prior actuals were reset.

**Phase 1 Gate 1 snapshot:** through **2026-10-10T20:16:09.417Z**,
deduplicated local telemetry records Phase 1 **83.292451**, S5
**173.518351**, and project **3657.815003**. This includes 130 Phase 1 usage
events from **19:26:59.480Z** through the cutoff. It leaves **326.481649**
under the shared S5 ceiling and **3342.184997** under the project cap. These
are local telemetry, not billing; later accounting-record publication calls
are excluded. Accounting boundaries and prior actuals remain unchanged.

**Gate 0 accounting boundary:** Phase 1 begins
**2026-10-10T19:26:20.967Z**, after H's approval. Events before it remain
Phase 0; events at/after it are Phase 1, including O handover/review work.
The last recorded pre-boundary snapshot through
**2026-10-10T19:26:20.924Z** is Phase 0/S5 **90.225900**, project
**3574.5225525**, leaving **409.774100** under S5 500 and
**3425.4774475** under project 7000. Later calls are excluded; actuals and
the S5 start boundary are not reset.

**Gate 1 accounting boundary:** Phase 2 begins
**2026-10-10T20:23:07.549Z**, after H's approval with carryover. The last
recorded pre-boundary snapshot through **2026-10-10T20:23:07.478Z** is
Phase 1 **128.215259**, S5 **218.441159**, project **3702.7378115**,
leaving **281.558841** under S5 500 and **3297.2621885** under project
7000. Events before the boundary remain Phase 1; events at/after it are
Phase 2, including O handover/review. These are local telemetry, not billing;
later calls are excluded and no prior actual or boundary is reset.

## Phase 0 - Discussion and research (complete)

**Goal:** Agree a feasible, evidence-based submission plan and owners that
protect the Oct 12 draft, Oct 13 final, and Oct 14 submission-only dates.

**Prerequisite:** S4 Human Gate 3, approved under D-051. The current
orchestrator continues planning through H's manual workflow; no agents,
production, PR operations or renewed O commit/push are authorised.

**Planning tasks:**

- [x] Re-read the saved Track A brief and define document/video/repository
  requirements above; keep fresh Devpost-form verification explicitly open.
- [x] Confirm Faizan's availability and production approach: 2-3 hours total,
  automation-first preparation, captioned video without narration.
- [x] Confirm Ashish's ML-section delivery date: H reports Oct 12.
- [x] Agree the dependency fallback: draft from frozen evidence, with
  Ashish's sign-off required before finalisation. Hour/coverage remain open
  for H/M coordination rather than blocking initial drafting.
- [x] Propose review/integration/sign-off milestones and H time reserve,
  leaving Oct 14 for submission only.
- [x] Confirm documentation-only S4 closeout, accepted evidence and frozen
  source baseline; retain resolved/deferred feedback without reopening it.
- [x] Define reuse of accepted S4 evidence, a bounded media preflight and
  genuine submission blockers; do not reopen accepted feature/test gates.
- [x] H reviews the proposed milestones, shared budget and phase gates and
  explicitly approves Gate 0.

**Phase 0 self-check / Gate 0:** Passed: the reviewed S5 plan identifies
deliverables, owners, evidence, dependencies, dates and the use of the
500-credit cap. Unconfirmed ML timing/coverage and live-form verification
have explicit owners/fallbacks rather than being represented as verified.

**Human Gate 0:** Approved, D-053. H selected "Approve Gate 0 and authorise
Phase 1 (Recommended)". Only Phase 1 is authorised; no later gate, frozen-code
change, agent, PR operation or final submission is implied.

## Phase 1 - Automated draft package (accepted with carryover, D-054)

**Goal:** Deliver reviewable document, captioned demo and submission-text
drafts with minimal H production time.

**Prerequisite:** Human Gate 0. **Estimate:** 220 combined O+X; no independent
executor/media/publication ceiling within the approved shared sprint budget.

**Atomic tasks:**

- [x] Publish the pending O approval/planning documentation on `frontend`
  through the H-forwarded handover; preserve all existing edits and source
  freeze. No renewed O Git authority or PR operation is implied.
- [x] Draft the six-page-maximum document from pinned sources and accepted
  screenshots; identify ML statements awaiting Ashish's verification.
- [x] Prepare captioned storyboard/script and submission-text draft,
  including accurate method, safety, provenance, licence and limitation copy.
- [x] Complete the bounded media preflight with existing Edge/FFmpeg; produce
  a real interactive rough cut and readable PDF, or report the exact fallback.
- [x] Check exported page count, actual video duration/playback, readable
  captions and source/claim consistency; provide file paths and pending items.
- [ ] H checks the current Devpost form and requests Ashish's ML verification;
  incorporate confirmed requirements without assuming extra scope.

**Executor self-check gate 1 report:** E reported passed for the delivered artifacts. The
exported PDF is 5 pages; the playable real-demo rough cut is 4:21 with 22
burned-in captions and a VTT sidecar. Live response, warning, selection,
explanation, input-edit/freshness and metrics-limitations interactions are
shown at 1920x1080. Document, captions and Devpost text retain
provenance, licence and safety qualifications. See
`docs/evidence/s5p1-package-verification.txt`. No unsupported clinical,
deployment, image-import or patient-specific lesion claim is made.

**O review:** Local/origin hashes match at
`8e64e069dc2330463758aea0022aee62e230bbd4`; the tree is clean and changes
since the frozen source are documentation/evidence only. O confirmed the
PDF's five-page text extraction and the video's 261-second H.264/no-audio
metadata; reviewed source drafts, the first-page preview and five retained
video frames. O did not watch the full video or visually inspect all PDF
pages. Three document corrections below are required; E's reported artifact
pass does not establish fully verified content or human acceptance.

**Human Gate 1:** Approved with explicit carryover under D-054. H selected
"Approve Gate 1 with the three document corrections; carry my full draft
review and Devpost-form check into Phase 2 before final acceptance".
This accepts the draft package for finalisation, not a completed human
playback/page/form check. Ashish's ML sign-off, H's full PDF/video review and
the current-form/access checks remain blockers to Gate 2. The planning fetch
returned 403; do not convert that uncertainty into verified current rules.

### Gate 1 correction and carryover ledger

| ID | Disposition / owner | Required correction or evidence |
|---|---|---|
| S5-F01 | Approved; E, ML verification by Ashish | Document section 2 incorrectly says every request without a sample ID uses final models. `api/main.py` also detects an exact feature match to a public sample. State: a valid ID or exact public-sample match selects demo models; otherwise final models. Preserve retained-origin what-if behavior. |
| S5-F02 | Approved; E, ML verification by Ashish | Label headline ROC-AUC as the reported mean per-fold result; distinguish its aggregation from pooled calibrated AUC and the calibrated, threshold-rule classification metrics. Source `reports/BEST_MODELS.md` sections Champions/Post-processing and `models/manifest.json`; keep approved numbers/caveats, do not recalculate or claim validation of the final served/demo capped outputs. |
| S5-F03 | Approved; E, ML verification by Ashish | Name the real API baseline Shapley attribution method with 32 orderings on served calibrated/capped probability. Explain that reference risk is for reference inputs, not observed population prevalence; keep signed probability-point, top-ten-subset and noncausal qualifications. |
| H full draft review | Carried to Phase 2; H | Read every exported PDF page and watch the full captioned video; forward one consolidated feedback batch. O's sampled frame/text review is not this human check. |
| Current Devpost form | Carried to Phase 2; H | Verify deadline, required fields/assets, upload/link mechanics and judge access against the live form. Report any new requirement needing a scope decision. |
| ML sign-off | Open; Ashish via H, due Oct 12 | Verify/replace data, preprocessing, estimators, CV/aggregation, subgroup and demo-model statements; H forwards confirmation/corrections. Hour/coverage remain unconfirmed. |

## Phase 2 - Finalisation and access checks (authorised; handover pending)

**Goal:** Produce the accepted final document/video and a submission-ready
set of links by Oct 13.

**Prerequisite:** Human Gate 1. **Estimate:** 90 combined O+X.

**Atomic tasks:**

- [ ] E publishes pending O Gate 1/plan/spec/decision updates through H's
  manual handover, preserving existing changes and the frozen source.
- [ ] Implement S5-F01/F02/F03 in document source and regenerated PDF;
  reconcile corresponding submission-text/storyboard wording where needed.
  The existing footage need not be re-recorded for these document corrections.
- [ ] H reads all PDF pages and watches the full captioned cut, then forwards
  consolidated feedback; complete the carried current Devpost-form check.
- [ ] Integrate Ashish's verified ML sections/sign-off and H's approved
  feedback; reconcile document, captions and submission claims.
- [ ] Export/check the final at-most-six-page PDF and 3-10-minute captioned
  video; verify no stale draft labels, unreadable text or missing attribution.
- [ ] H uploads the video to YouTube and document via the accepted mechanism;
  verify judge-accessible links without relying on authenticated access.
- [ ] Check repository/source branch or commit links, complete model assets
  and repo-relative setup instructions. Reuse accepted tests/evidence unless
  a genuine regression or missing claim-specific check requires more.
- [ ] Resolve current-form requirements and all finalisation blockers.
  Escalate any frozen-code or deployment requirement for separate H approval;
  do not autonomously merge, publish to a cloud host or retrain.

Prepare corrected review candidates now. Until H's review/form results and
Ashish's sign-off arrive, retain explicit pending-review status; do not strip
draft qualifications, invent confirmation or claim final readiness. Publish
completed work and report the precise outstanding inputs rather than polling
or keeping helpers running. Resume this same phase when H forwards them;
there is no new subphase budget or automatic approval.

**Self-check gate 2:** Final exported assets meet measured page/duration
limits; S5-F01/F02/F03, Ashish's ML sign-off, H's full draft review and feedback
are recorded as completed; document, YouTube
and source links are accessible as intended for judges; form requirements,
attributions, reproducibility qualifications and safety claims are checked.
No unresolved submission blocker is silently carried as a pass.

**Human Gate 2:** H accepts the final assets/links and authorises final
submission. E/O do not submit or merge on H's behalf without explicit authority.

## Phase 3 - Submission, retrospective and cleanup (not started)

**Goal:** Record confirmed submission and close the final sprint without
new production on Oct 14.

**Prerequisite:** Human Gate 2. **Estimate:** 40 combined O+X.

**Atomic tasks:**

- [ ] H completes the Devpost submission before the verified deadline and
  checks receipt/project status; record confirmation without claiming
  submission from uploaded assets alone.
- [ ] Reconcile dated S5/project credits and final artifact/source links,
  retaining historical actuals and limitations.
- [ ] Write `docs/retro/sprint5.md`, archive the final plan as
  `docs/planning/sprint5.md`, and synchronize spec/decisions to actual status.
- [ ] Stop only phase-owned verification helpers, retain H-owned processes
  and useful artifacts, and publish authorised closeout docs via H's handover.

**Self-check gate 3:** H-reported submission confirmation is recorded;
archive/retro/spec/decisions and dated accounting agree; final assets remain
accessible, source freeze is unchanged absent separate approval, and no
phase-owned helper remains. No automatic PR merge or project-success claim.

**Human Gate 3:** H reviews submission confirmation and closeout and explicitly
closes S5/project work.
