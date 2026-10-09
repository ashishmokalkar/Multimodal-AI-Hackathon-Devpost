# Sprint 2 Retrospective — Coherent prediction and visual mapping

**Status:** S2 delivery and its Phase 3 documentation package are prepared for
H's Human Gate 3 review. Gates 0-2 are approved; Gate 3 remains pending, so
Sprint 2 is not formally closed. S3 Phase 0 is prepared but unstarted and
requires Gate 3 approval. The delivered frontend remains mock-based and uses
synthetic samples and schematic vessels.

## What worked

- A single accepted prediction response drives CAD/vessel probabilities,
  selected-vessel correspondence, schematic colours and explanations. Stale
  request protection prevents older successes or errors replacing current
  state.
- Mock/synthetic/schematic labels and the unconfirmed explanation-scale
  qualification keep the interpretation honest; keyboard controls complement
  3D selection and camera controls.
- Active rendering was measured rather than inferred from idle demand mode.
  The evidence records the demo machine, WebGL renderer, 1920x1080 browser
  viewport, actual canvas dimensions/DPR, active-orbit FPS, and idle settling.
  This was not a full-screen 1080p canvas benchmark.
- WSL 2 with a Linux-native environment provided a verified route for the
  mock API while keeping the frontend and Git workflow on Windows.

## What went wrong

- Windows launcher trust enforcement interrupted live mock verification.
  WSL resolved hosting for the mock API without disabling Windows protections
  or reusing the Windows virtual environment in Linux.
- This hosting recovery does not establish that the real ML backend can run
  in WSL or that its serving contract is compatible.
- The remaining integration window was at risk because M's contract response
  and API delivery date were not available at Gate 2; H therefore made
  Oct 10-11 provisional and required M's response before S3 Gate 0 can close.

## Still risky

- M's acknowledgement or requested changes to `docs/api-contract.md`, plus a
  concrete API delivery date, remain unresolved. Feature names, encodings,
  units/ranges, target thresholds, endpoint availability, runtime/model
  artifacts, and explanation scale are not signed off.
- The WSL setup proves Windows-to-WSL localhost access for the mock only.
- Demo video and shared six-page document owners remain unassigned.
- The S2 evidence measures the actual canvas at 616.734 x 894.25 CSS pixels
  and DPR 1.0 within a 1920 x 1080 browser viewport. Recheck the final
  dashboard on the intended demo setup in S4.

## Actions

| Action | Owner | When |
|---|---|---|
| Retain the verified Windows-frontend/WSL-mock-API setup and startup/shutdown instructions. | X/H | S3/S4 |
| Obtain M's contract response/requested changes and concrete API delivery date; resolve compatibility questions through H before S3 Gate 0 closes. | H/M | Before S3 Gate 0 |
| Revisit S3 scope/calendar if M's readiness or date does not support the provisional Oct 10-11 window. | H | S3 Phase 0 |
| Assign the demo video and shared six-page document owners, deliverables, and dates. | H/M | Before S3 Gate 0 closes |
| Keep reviews concise and evidence-driven; do not rerun checks accepted from complete evidence without a specific reason. | O/H | Ongoing |
| Remeasure the final dashboard's active rendering and idle settling on the intended demo machine. | X | S4 |

## Budget

S2 accounting began at **2026-10-08T20:43:11.531Z**. O's latest review
snapshot through **2026-10-09T20:04:12.683Z** recorded **296.5000015** S2
credits and **1704.4372765** project credits. It is retained as a historical
snapshot and excludes later calls.

The fresh Phase 3 kickoff boundary is **2026-10-09T20:08:58.660Z**. Immediately
before it, the latest deduplicated project event was **20:08:57.531Z**:

| Session | All-time credits | S2 credits |
|---|---:|---:|
| O — Hackathon frontend planning | 1568.134345 | 237.114770 |
| X — Frontend scaffold | 167.4868085 | 90.5691085 |
| **Combined** | **1735.6211535** | **327.6838785** |

The Phase 3 closeout snapshot, through latest deduplicated event
**2026-10-09T20:12:46.984Z** and before publication calls, records:

| Session | Phase 3 delta | All-time credits | S2 credits |
|---|---:|---:|---:|
| O — Hackathon frontend planning | 0 | 1568.134345 | 237.114770 |
| X — Frontend scaffold | 2.988014 | 170.4748225 | 93.5571225 |
| **Combined** | **2.988014** | **1738.6091675** | **330.6718925** |

Since O's 20:04:12.683Z review snapshot, recorded project usage increased
**34.171891** credits. Remaining at this snapshot: **147.011986** of the
Phase 3 combined allocation, **27.011986** of X's Phase 3 ceiling,
**1469.3281075** under the S2 cap, and **5261.3908325** under the project
cap. Later documentation publication calls are excluded. Phase 3 deltas are
measured only from the kickoff boundary above; the **150 O+X / 30 X** ceilings
are not reset. All figures use the repository-path filter and event
de-duplication fields from `scripts/credits.py` through the permitted
read-only local session store. They are local telemetry, not account-billing
totals.
