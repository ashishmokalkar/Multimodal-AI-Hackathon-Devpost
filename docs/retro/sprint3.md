# Sprint 3 Retrospective - Real integration and warning evidence

**Status:** Human Gate 4 is pending. The Phase 4 package is published with
explicit warning-evidence carryover; Sprint 3 is not closed.

## What worked

- One accepted response continued to drive prediction probabilities, selected
  vessel, explanations and inputs. Freshness protection and invalidation kept
  stale patient output from surviving edits, pending requests, errors or profile
  changes.
- Mock, real, synthetic, source, schematic and clinical-safety labels remained
  distinct. Warning copy states only what the API returned; an empty real list
  is not clinical reassurance.
- Keyboard-operable viewer, dashboard and drawer controls were delivered and
  focused regressions cover warning rendering and clearing. The warning
  disclosure itself still lacks live keyboard activation evidence.
- Rendering was measured during active orbit rather than inferred from
  demand-mode idle. Earlier S3 evidence records the 1920x1080/1280x800 layout
  and active-orbit result; Phase 4 did not repeat that accepted performance
  suite.
- WSL kept API hosting within the verified Linux environment without weakening
  Windows launcher protections. Phase 2's WSL mock hosting fix was separate
  from Phase 3's later local integration of the pinned real v1.1 API and model.

## What went wrong

- Patient 20's real age-related reliability warning was initially below the
  chart/input table and risk summary, so the S3 desktop captures did not reveal
  it. The bounded correction moved a warning count beside probabilities and
  placed full text in native disclosure details.
- Windows launcher trust enforcement interrupted earlier live verification.
  WSL resolved the mock hosting problem without disabling protections; a
  separate, pinned WSL environment subsequently verified local real-backend
  serving and frontend compatibility. This does not prove a public/deployed
  backend or external environment compatibility.
- The original CDP capture harness timed out on canvas sizing and did not save
  the required evidence. The changed headed-Edge route captured patient 20 at
  both viewport sizes, but Windows OS `SendKeys` did not activate the focused
  disclosure, selecting Custom patient did not change the live profile, and
  the 1280x800 closed canvas measurement was taken before resize settling.
  Consequently, no live empty-warning capture or stable 1280x800
  closed/open canvas pair exists. This is an evidence blocker, not proof of a
  UI defect. H must manually observe the remaining checks before Gate 4.
- The original Phase 3 executor ceiling was exceeded by 78.047665 credits.
  D-039/D-041 closeout allowances and D-043's bounded additional warning
  allowance are recorded separately; none reset the S3 or project caps.
- The accounting discrepancy was traced to an inclusive boundary event:
  the 13:54:35.093Z snapshot already contained 9.600860 credits. The correct
  increment through 14:07:55.511Z is 20.724179, with historical S3 at
  864.3505245 and project usage at 2636.954842. The duplicate was not charged
  again or added to later totals.

## Still risky

- Live keyboard disclosure activation, empty real-warning presentation at both
  viewports, and a settled 1280x800 closed/open canvas pair remain unverified.
- The pinned real API/profile and its contract-compatible frontend path were
  verified locally. This does not establish public deployment, independently
  validated demo-refit metrics or clinical validity.
- The final integrated dashboard must be remeasured on the intended demo
  machine in S4. No final visual, accessibility or performance conclusion
  should be inferred from idle demand rendering.
- Video and shared-document deadlines remain tight. M's local contract handoff
  and the supplied input encodings/units/explanation scale were used under the
  approved v1.1 profile; they should not be conflated with unresolved deployed
  service readiness or validation claims.

## Actions

| Action | Owner | When |
|---|---|---|
| Manually verify the warning disclosure with keyboard input; capture its open/closed state and the real Custom-patient empty-warning response at both settled viewports. | H | Before Gate 4 |
| Retain the verified Windows-frontend/WSL real-API startup and shutdown instructions; keep local integration distinct from deployment status. | H/X | S4 |
| Keep reviews concise and evidence-driven; do not rerun accepted suites without a concrete regression. | O/H | Ongoing |
| Remeasure the final integrated dashboard's accessibility, reproducibility and active-orbit performance on the intended demo setup. | X | S4, after its human gates |
| Prepare the video and shared six-page document: Faizan owns both; request Ashish's ML sections. Deliver drafts Oct 12 and finals Oct 13. | Faizan/Ashish | S4; Oct 12/13 |
| Protect Oct 14 as submission-only buffer; do not silently extend S4 work into it. | H | Oct 14 |

## Budget

All values below are deduplicated local session telemetry, not account billing.
S3 accounting began at **2026-10-10T07:25:25.736Z**. The D-042 transition
snapshot through **2026-10-10T14:55:23.678Z** recorded S3 at **1096.1514545**
and project usage at **2868.755772**. Phase 4 begins at
**2026-10-10T14:54:54.705Z**; the boundaries are distinct and earlier S3
snapshots remain historical.

Executor kickoff was **2026-10-10T14:59:36.260Z**. After D-043, the fresh
deduplicated baseline through **2026-10-10T15:07:04.106Z** recorded Phase 4
usage of **35.963296** (O **28.769100**, X **7.194196**), S3 **1132.1147505**
and project **2904.719068**.

At the verification cutoff **2026-10-10T15:11:22.888Z**, Phase 4 usage was
**38.3879145** (O **28.7691000**, X **9.6188145**), S3 **1134.539369**
(O **744.985390**, X **389.553979**) and project **2907.1436865**
(O **2346.452015**, X **560.6916715**). Remaining at that snapshot: **61.6120855**
of Phase 4's 100 combined credits, **20.3811855** of its X ceiling,
**665.460631** under the S3 cap and **4092.8563135** under the project cap.

D-041's cumulative corrective X use at that cutoff is **32.3154805**. The
original 30-credit allowance had **1.3967645** remaining at the pre-approval
snapshot through **2026-10-10T15:04:17.831Z**; H then added 10 X credits under
D-043, for a 40-credit corrective limit and **7.6845195** remaining at the
verification cutoff. This corrective limit overlaps Phase 4's 30-X ceiling;
it is not additive to it. Later retrospective, documentation and publication
calls are excluded from this dated snapshot. Preserve all prior actuals and
overruns; no ceiling was reset.
