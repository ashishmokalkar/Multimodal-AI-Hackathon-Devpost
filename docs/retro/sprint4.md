# Sprint 4 Retrospective - Feedback, release clarity and code freeze

**Status:** The accepted release candidate and D-044 warning carryover were
accepted at Human Gate 2. The documentation-only retrospective/plan cleanup
is published for Human Gate 3 review. Gate 3 remains pending; S5 Phase 0 is
staged but unstarted.

## What worked

- The summary-first results layout made the signed selected-target chart
  reachable sooner while keeping the provenance, four probabilities,
  thresholds, uncertainty and warning status together. At 1280x800 the
  closed-warning view retained three complete chart rows at the existing
  readable text size.
- Threshold clarity was improved without changing absolute probability
  colours or returned outputs. The selected-target decision threshold is
  distinct from the colour midpoint and uncertainty. Persistent vessel
  selection labels made selection clearer without replacing picking or
  moving the camera.
- The model explanation documents independent target thresholds and the
  served CAD probability cap without recomputing outputs or inferring a
  capping event from equal probabilities.
- D-044's warning evidence was completed with the headed, readiness-aware
  browser route. Patient 20's full reliability warning was keyboard-reachable
  from the disclosure at exact 1920x1080 and 1280x800 CSS viewports. The
  closed/open pairs had zero document overflow and zero canvas-height
  variation; canvas heights were 576.01 and 318.39 CSS px respectively.
  Source, four probabilities and warning status remained visible without
  results-panel scrolling. Qualified empty-warning captures exist at both
  viewports and do not imply clinical reassurance.
- The edit rehearsal changed Chest Pain from Typical to None, cleared stale
  results, then accepted a fresh response with the same demo-model origin.
  Existing freshness, target mappings, warning clearing, mock/real and
  keyboard regressions remained intact.
- Generic repository-relative Linux setup guidance, optional WSL adaptation,
  tested-versus-compatible Node wording, sample-origin semantics and pinned
  profile limits are now documented. Verification used the existing
  environment; it does not claim fresh-install support on every host.
- Frontend lint, typecheck, all 64 tests and build passed; the six existing
  API tests passed. The live service reported `mock=false`. The Vite chunk
  size advisory was non-blocking. Accepted evidence is retained under
  `docs/evidence/s4p2-*`; checks and captures were not repeated for closeout.

## Feedback triage

| Feedback | Disposition at Gate 2 | Outcome |
|---|---|---|
| S4-F01 | Verified | Response-driven selected-target threshold marker; absolute probability colours unchanged. |
| S4-F04 | Verified | Persistent selected-vessel label; duplicate hover text suppressed; camera and picking behavior preserved. |
| S4-F06 | Verified | Qualified independent-threshold/CAD-cap explanation; outputs unchanged. |
| S4-F08/F09 | Verified | Portable setup and accurate tested/recommended Node versus declared compatibility. |
| S4-F02/F10 | No change | Preserve paired what-if sample origin; retain first-visit acknowledgement with persistent safety banner/footer. |
| S4-F03/F05/F07 | Deferred | Anatomy/assets, coordinated profile evolution, and bundle/asset optimisation need separate evidence and approval; no measured blocker justified reopening them. |

Verified items were accepted at Gate 2, not inferred from code alone.
Deferred/no-change feedback remains visible in the archived ledger and does
not silently disappear or reopen under S5.

## What went wrong

- The warning visibility miss was real: patient 20's reliability warning
  initially sat below the chart and input table and was absent from the first
  desktop captures. The initial canvas-sizing/capture harness also failed to
  save the required views. The failed wait/input loop was not repeated; a
  changed headed-browser approach produced the accepted patient-20 pairs,
  keyboard interaction and empty-warning evidence.
- Publication was delayed by overlapping, narrow micro-allowances. The
  carried-warning corrective usage reached **60.5794125**, exceeding its
  former 60-credit limit by **0.5794125** before publication; H later approved
  a bounded extension to 65. The remaining publication headroom at the
  reported X snapshot was only **0.072725**, so work stopped rather than
  risking an unauthorized commit.
- O's review/approval conversation itself caused the documented Phase 2
  overrun of **28.1378245** above the original 150 combined limit: at
  `2026-10-10T17:44:22.172Z`, Phase 2 was **178.1378245** (O **134.219630**,
  X **43.9181945**). H then transferred 75 unused Phase 1 credits, raising
  the Phase 2 planning ceiling to 225 without resetting actuals. A later O
  snapshot at `18:36:30.498Z` recorded Phase 2 at **311.878097** (X
  **49.349427**), above that revised planning ceiling; the final recorded
  Phase 2 total before the Phase 3 boundary was **342.502622**. These dated
  observations and overruns are retained rather than reconciled away.
- D-049 corrected the process: the S4 phase, executor, corrective and
  publication amounts became estimates under one shared hard **700-credit
  O+X S4 budget**. The proposed extra 150-credit transfer was not approved.
  This made approved work possible without repeated micro-allowance requests;
  it did not reset S4/project actuals, erase the historical overruns, or
  waive scope and human gates.

## Remaining dependencies and actions

| Action | Owner | Dependency / timing |
|---|---|---|
| Review this closeout and explicitly approve S4 Human Gate 3. | H | Pending |
| Begin only S5 Phase 0 after Gate 3; obtain a detailed plan and separate S5 Gate 0 approval before delivery work. | H/O | Gated on Gate 3 |
| Confirm Ashish's ML-section scope and delivery timing; keep the uncertainty open until confirmed. | Faizan/Ashish | S5 Phase 0 |
| Deliver document/video drafts Oct 12 and finals Oct 13; reserve Oct 14 for submission only. | Faizan; Ashish for ML sections | S5, subject to gates |
| Keep PR approval/merge separate; no merge or automatic code work is implied. | H | Separate approval |

## Code-freeze baseline

The accepted source release candidate and code-freeze baseline is
`39ffab1c8adecd707c0f40ce826c12a568c41267`. The S4 archive and this
retrospective are a later documentation-only closeout; their commit is
reported separately and is not a new source baseline. No tag or branch was
created. Human Gate 3 remains pending, and S5 has not started.

## Budget

S4 accounting began at **2026-10-10T15:42:22.433Z**; Phase 3 began at
**2026-10-10T18:47:03.450Z**. X's execution kickoff was
**2026-10-10T18:49:31.651Z**, separate from both boundaries.

Fresh deduplicated local telemetry through **2026-10-10T18:54:20.769Z**
records Phase 3 at **20.601055**, S4 at **516.4153165** (remaining
**183.5846835** under the shared 700 cap), and project usage at
**3470.202095** (remaining **3529.797905** under the 7000 cap). This is
local session-store telemetry, not account billing; later calls are excluded
from this dated snapshot. Historical phase actuals, corrective overrun and
reallocations above remain unchanged.
