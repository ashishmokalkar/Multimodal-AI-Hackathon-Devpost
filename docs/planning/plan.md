# Sprint 4 Plan - Phase 0 only

**Status:** Unstarted and gated. Sprint 3 Human Gate 4 is still pending because
live keyboard disclosure activation, a real empty-warning UI case and a
settled 1280x800 closed/open canvas pair are missing. Do not begin this Phase 0
until H approves Gate 4 and closes S3. No S4 implementation is authorized.

**Calendar:** Oct 12 draft video/shared document; Oct 13 final video/shared
document; Oct 14 submission-only buffer. Do not extend work into the buffer or
silently change these dates.

## Phase 0 - Discussion and readiness planning (unstarted)

**Goal:** Agree on judging priorities, the genuinely remaining budget, backend
readiness, final-dashboard scope and the remaining calendar before authorizing
any S4 implementation.

**Prerequisite:** Human Gate 4 approval and S3 closure. Phase 0 itself also
requires H's separate start authorization after that prerequisite. Existing
S3/project caps and recorded overruns remain unchanged; determine remaining
credits from the published dated telemetry, not by resetting ceilings.

### Discussion agenda

- Rank the judging criteria and choose the shortest truthful demo story:
  patient inputs, real model flow/source, probability-to-vessel correspondence,
  explanations/inputs, model metrics, safety and provenance.
- Reconcile remaining project and S4 budget, including the already-used S3/P4
  totals, original executor overrun and D-043's bounded warning allowance.
  Do not assume contingency or unused earlier allocations are available.
- Confirm backend readiness for the actual demo environment. Separate the
  pinned API/model's verified local WSL integration from any deployed service,
  external environment, clinical validation or independently validated
  demo-refit metrics.
- Decide whether existing dashboard, metrics and explanation views need any
  bounded changes for judging. Consider small-heart framing/copy polish or
  schema-driven CSV only as separate candidates; neither is carried in
  automatically, and document import remains out of scope absent approval.
- Confirm owners and exact handoff timing: Faizan owns the 3-10 minute video
  and shared maximum-six-page document; request Ashish's ML sections and confirm
  when they will be available.
- Protect the deliverable dates: drafts Oct 12, finals Oct 13, and Oct 14
  submission-only. Identify any work that must be dropped rather than moving
  those dates.

### Phase 0 tasks (discussion only)

- [ ] Review the judging rubric and select explicit demo/document priorities.
- [ ] Reconcile the remaining credit budget and record any requested changes
  for H approval without resetting S3 or project actuals.
- [ ] Classify backend/runtime readiness for the intended demo environment and
  list any external dependency or evidence still outstanding.
- [ ] Bound any dashboard, metrics or explanation changes and state what is
  explicitly deferred.
- [ ] Confirm video/document owners, Ashish's ML contribution, and Oct 12/13
  deliverable times; preserve Oct 14 as submission-only.
- [ ] Publish a reviewed S4 plan with objective self-checks, owners, deadlines,
  budget and evidence needs; no implementation or PR work in Phase 0.

**Objective self-check:** The proposed plan names the judging priorities,
actual remaining budget and its source, local-versus-deployed backend status,
bounded dashboard/metrics/explanation scope, explicit exclusions, named video
and document owners, Ashish's ML handoff timing, and Oct 12/13 deadlines with
Oct 14 protected. Every task has a measurable output and owner; unresolved
external dependencies are explicit and no S4 work is silently authorized.

**Human Gate 0:** H reviews and approves the S4 discussion outcome, budget,
scope, calendar and owners. Without approval, no S4 phase proceeds.

**Human Gate 1:** A separate H decision is required to authorize any scoped
S4 implementation after Phase 0. This plan authorizes no implementation.
