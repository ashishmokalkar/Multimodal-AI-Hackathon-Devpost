# Sprint 1 Retrospective - Foundation

**Status:** Sprint 1 retrospective and executor closeout are complete, 2026-10-08. Gate 3 and the remaining calendar/S2 model choice are approved. The authorised baseline PR is open; Gate 4 remains pending H approval.

## What went well

- The scaffold, data-driven patient form, typed API client, and deterministic mock provide an independent frontend baseline.
- The timeboxed asset spike resolved the main 3D uncertainty without Blender or new dependencies. The approved CC BY 4.0 heart and independent schematic vessels meet the size, geometry, and local-load targets.
- Asset provenance, attribution, error handling, interaction screenshots, and measured performance are recorded. The arteries and static probabilities are explicitly illustrative.
- Manual handovers and human gates kept backend sign-off, synthetic samples, and remaining integration work visible rather than claiming the prototype was already real-model integrated.

## What went wrong

- Phase 1 spent unnecessary time waiting for GitHub Actions. D-013 now makes CI informational; local checks remain mandatory.
- Phase 2 stopped on auto-fixable import ordering and left pending work. D-015 now distinguishes formatter fixes from substantive repeated failures.
- The original Oct 5-7 calendar elapsed before asset closeout. Remaining work must use the actual deadline, not slide the whole schedule.
- O dominated credit usage. Historic phase estimates do not reconcile exactly with aggregate telemetry, and long reports/context increased review cost.
- Both mock and ML schemas have 55 inputs, but names, categories, and WBC units differ. No backend acknowledgement or serving API was present in the reviewed `ML-dev` snapshot.
- Python credit reporting was blocked by application control. The permitted read-only session-store interface supplied snapshots without bypassing the policy.

## Budget

Gate-review snapshot, latest recorded event 2026-10-08 20:14 UTC:

| Owner | Deduplicated local credits |
|---|---:|
| O | 1255.2 |
| X | 65.1 |
| Combined | 1320.3 |

This leaves **179.7** under the 1500-credit Sprint 1 cap and **5679.7** under the 7000-credit project budget, before subsequent calls. O accounts for approximately 95% of this snapshot. Local telemetry is not reconciled against account billing.

X's reported Phase 3 closeout delta was **26.8**, below its 120-credit limit. Earlier per-phase O figures are estimates, not an exact partition of sprint spend. Do not invent phase actuals or infer the current model's pricing from historical multipliers.

**Final S1 closeout snapshot (latest recorded event 2026-10-08 20:28:30 UTC):**

| Session | Deduplicated local credits |
|---|---:|
| O — Hackathon frontend planning | 1282.1 |
| X — Frontend scaffold | 74.6 |
| **Combined** | **1356.7** |

The refreshed aggregate leaves **143.3** under the 1500-credit S1 cap and **5643.3** under the 7000-credit project budget. Since the handover's 20:20 UTC checkpoint, X's deduplicated local session delta was **9.5** credits, within the 30-credit closeout target. The read-only local query followed `scripts/credits.py`'s repository-path filter and event de-duplication fields. This is local telemetry, not account-billing reconciliation. Historical snapshots above and in `docs/planning/sprint1.md` are retained; Phase 4 has no separately attributed O actual.

## Actions

| Action | Owner | When |
|---|---|---|
| Replace the stale app-footer asset-licence placeholder with the existing attribution/link | X | S1 cleanup (done) |
| Retain the current orchestrator for S2 (D-020); use a fresh planning session and keep reports concise and reviews evidence-driven | H/O | S2 planning |
| Archive the S1 plan, prepare only S2 Phase 0, and reconcile final credits | O/X | Before Gate 4 (done) |
| Open the stable `frontend` to `dev` PR authorised by H (D-021); no automatic merge | X/H | S1 closeout (done; no automatic merge) |
| Obtain M's serving-contract acknowledgement and a concrete API delivery date | H/M | S2 Phase 0 |
| Resolve serving names, BBB/VHD/Function Class encodings, WBC units, thresholds, and explanation scale at the backend boundary | H/M, coordinated by O | Before real-backend integration |
| Assign video and shared six-page document ownership | H/M | S2 Phase 0 |
| Repeat performance checks after live results and dashboard integration on the intended demo setup | X | S4 hardening |

## Approved remaining calendar

Approved by H on 2026-10-08 (D-019): preserve all phase gates and existing sprint caps; Oct 14 remains submission buffer.

| Window | Work |
|---|---|
| Oct 8 evening / Oct 9 morning | Finish S1 retrospective, minimal cleanup, archival, and baseline PR; obtain Gate 4 |
| Oct 9, after Gate 4 | S2 discussion/research, then live prediction-to-vessel colours, viewer/results selection sync, camera presets and legend; finish S2 retrospective |
| Oct 10-11 | S3 dashboard and explanations, metrics, physiological breakdown, and real-backend integration once the contract and API are ready |
| Oct 12-13 | S4 hardening, accessibility, reproducibility, documentation and demo recording |
| Oct 14 | Submission buffer only; deadline 20:45 CEST |

Do not add another asset search or expand the feature scope. M's delivery timing is not yet confirmed: if the integration window is at risk, bring the scope/timing decision to H immediately. A mock-only demo is not the required real-model integrated deliverable.

## Decisions and remaining closeout

- H approved the remaining calendar (D-019).
- H retained the current orchestrator for S2 (D-020); no automatic model change.
- H authorised X to open the baseline PR after cleanup (D-021), not to merge it.
- H/M: agree backend delivery timing and submission owners.
- H: approve Gate 4 only after closeout evidence and the baseline PR exist.

## Final closeout state

- The footer retains the clinical disclaimer and now links to the local attribution for *Realistic Human Heart* by neshallads (CC BY 4.0).
- The S1 plan is archived at `docs/planning/sprint1.md`. `docs/planning/plan.md` contains the unstarted Sprint 2 Phase 0 skeleton only; it does not authorize Phase 0 or delivery.
- `docs/spec.md` contains no remaining `[TBD-S1]` markers. Its unresolved backend sign-off, feature-name/encoding/unit, threshold, explanation-scale, metrics-serving, and submission-ownership questions remain open; synthetic samples and the mock-only state are not described as real-model integration.
- The stable baseline PR is open from `frontend` to `dev`, titled **Sprint 1: foundation**. H must approve Gate 4 before S2 Phase 0.
