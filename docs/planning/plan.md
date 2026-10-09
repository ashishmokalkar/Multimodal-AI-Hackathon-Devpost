# Sprint 3 Plan — Phase 0 only

**Status:** Unstarted. S2 Human Gate 3 is a prerequisite and remains pending H.
No S3 Phase 0 discussion or delivery work has begun. The Oct 10-11 integration
window is provisional, not an assumed extension; S3 Gate 0 cannot close until
M's contract response/requested changes and concrete serving API delivery date
are recorded.

**Calendar:** Reconfirm the remaining Oct 10-14 calendar with H. D-019 retains
Oct 12-13 for S4 and Oct 14 as submission-only buffer; do not silently move
delivery into that buffer. S3's planned Oct 10-11 integration window remains
at risk until M confirms readiness and date.

**Budget context:** D-008 assigns S3 a combined cap of 1800 credits within the
7000-credit project budget. The S2 closeout snapshot in `sprint2.md` records
the latest deduplicated O+X totals and remaining project budget. No S3 phase
allocation or actual is approved; establish a fresh baseline only when Phase 0
is authorised after S2 Gate 3.

## Prerequisite — S2 Human Gate 3 (pending)

H must approve S2 closeout before S3 Phase 0 starts. This prerequisite does not
authorise S3 implementation, PR changes, or merge.

## Phase 0 — Discussion and readiness (unstarted)

**Goal:** Agree S3 judging priorities, scope, external dependencies, budget,
remaining calendar, measurable delivery criteria, and human gates before any
implementation.

**Credit allocation:** Not set; discuss the remaining project budget and
propose a bounded S3 allocation for H approval. No Phase 0 spend baseline has
been recorded.

### Tasks

- [ ] After S2 Gate 3 approval, review `docs/spec.md`, `docs/decisions.md`,
  `docs/retro/sprint2.md`, archived `docs/planning/sprint2.md`, and the latest
  deduplicated project/sprint budget.
- [ ] Discuss with H judging priorities, remaining budget, backend readiness,
  dashboard/metrics/explanations scope, and the remaining calendar. Explicitly
  decide whether the provisional Oct 10-11 integration window is feasible;
  do not assume it or silently extend it.
- [ ] Through H, obtain M's acknowledgement or requested changes to
  `docs/api-contract.md` and a concrete API delivery date. Record confirmed
  endpoints, serving feature names/encodings/units/ranges, target thresholds,
  explanation availability/scale, runtime requirements, and any requested
  contract amendments. Open items stay open; no compatibility is inferred
  from the mock or matching feature counts.
- [ ] Through H, assign accountable owners for the demo video and shared
  six-page document, with deliverables and dates before S3 Gate 0 closes.
- [ ] Define objective acceptance criteria, evidence paths, bounded phase
  allocations, explicit self-checks and human gates for any S3 delivery that H
  chooses to authorise. Keep real-backend integration, dashboard, metrics and
  explanations within the approved scope; do not begin them during Phase 0.
- [ ] Update `plan.md`, `spec.md`, and `decisions.md` together for any
  approved scope/architecture change, then stop for H's Phase 0 gate decision.

### Objective self-check — Phase 0

- The review includes the current spec, decisions, S2 retrospective/archive,
  and a fresh deduplicated budget snapshot.
- H's judging priorities, selected dashboard/metrics/explanations scope,
  calendar decision, and bounded budget proposal are recorded; no delivery
  allocation or timing is invented.
- M's contract acknowledgement/requested changes and concrete API delivery
  date are recorded before S3 Gate 0 closes. If absent, Gate 0 remains blocked;
  real-backend integration is not authorised.
- Video and shared-document owners, deliverables, and dates are assigned
  before S3 Gate 0 closes.
- Each proposed S3 delivery phase has objective evidence criteria and an
  explicit human gate; plan/spec/decisions agree, and no implementation has
  started.

### Human gates

- **S2 Gate 3 (prerequisite, pending):** H approves S2 closeout and authorises
  S3 Phase 0 to begin. Without this approval, Phase 0 remains unstarted.
- **S3 Gate 0 (pending):** After the Phase 0 self-check, H approves the
  priorities, scope, remaining calendar, budget/phase allocations, acceptance
  evidence, M's contract response and concrete API date, video/document
  owners, and proposed delivery gates. If any required external answer is
  missing, H must explicitly re-plan scope/timing; the gate does not close by
  default. Approval of Gate 0 may authorise only the next explicitly named
  phase, not the full sprint or a PR merge.
