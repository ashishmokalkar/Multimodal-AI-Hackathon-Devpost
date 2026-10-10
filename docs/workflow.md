# Team Workflow — Frontend Track

> Read this first in every new session. It is the contract between the human, the orchestrator agent and the executor agent.

## 1. Roles

| Role | Who | Responsibilities |
|---|---|---|
| **Human (H)** | Faizan | Owns product direction, approves human gates, forwards handovers to the executor, reports blockers from the ML colleague. |
| **Orchestrator (O)** | Copilot agent in planning session | Research, brainstorming, sprint/phase planning, writing `plan.md`/`spec.md`/`decisions.md`, drafting executor handovers, reviewing executor output against gates, retros, budget tracking. **Does not implement features.** |
| **Executor (X)** | Copilot agent in implementation session | Implements atomic tasks from a handover, runs lint/build/tests, commits to `frontend`, reports back with evidence against the self-check criteria. |
| **ML colleague (M)** | Ashish | Owns dataset, models, FastAPI backend on `ML-dev` (the actual branch name verified Oct 8). Signs off on the API contract. |

All handovers O → X and X → O pass **through H in chat**. No agent spawns sub-agents without H's explicit approval.

## 2. Hard constraints

- **Deadline:** 14 Oct 2026, 20:45 CEST (Devpost: 15 Oct 00:15 IST). Oct 14 is submission-only buffer.
- **Budget:** 7000 Copilot credits for O + X combined. Per-sprint caps live in `plan.md`. Exceeding a sprint cap requires an explicit H decision logged in `decisions.md`.
- **S4 budget simplification (D-049):** one shared hard ceiling of 700 for O
  and X. Phase, executor, warning and publication allocations are planning
  estimates, not separate stop limits. X may use the remaining shared sprint
  budget for approved scope without micro-allowance requests. Preserve dated
  actuals and historical overruns; S5 500, reserve 700 and project 7000 stay
  unchanged. Human gates, scope approvals and repeated-failure rules still
  apply; this does not authorise later phases automatically.
- **S5 shared budget (D-053):** the existing 500-credit O+X allocation is one
  shared hard sprint ceiling. Phase/executor/media/publication figures are
  estimates, not independent stop guards. Include planning, review and Git
  publication in actuals; no reset, reserve use or automatic underspend
  transfer. Human gates and frozen-code scope remain mandatory.
- **Branches:** `main` ← `dev` ← `frontend` (ours) / `ML-dev` (colleague). We only commit to `frontend`. Merges to `dev` happen at sprint end via PR after H approval.

## 3. Artefacts

```
docs/
  problem_statement.md   # the brief (read-only)
  workflow.md            # this file
  spec.md                # living product + technical spec; plan.md must stay in sync with it
  decisions.md           # append-only decision log (D-xxx)
  api-contract.md        # frontend <-> backend contract (created in S1)
  planning/
    plan.md              # CURRENT sprint plan only
    sprint1.md ...       # archived plans (plan.md is renamed here at sprint end)
  retro/
    sprint1.md ...       # what went wrong / right per sprint, with actions
```

Rule: **if a change to `plan.md` affects scope or architecture, update `spec.md` in the same commit** and log the decision.

## 4. Sprint lifecycle

Five sprints under D-045, superseding D-001's four-sprint structure without
extending the deadline: S1/S2 are archived; S3 closed Oct 10 with explicit
evidence carryover; S4 finishes feedback/code work and freezes code by end
Oct 11; S5 finalises documentation/video/submission readiness Oct 12-13.
Oct 14 remains submission-only. S4/S5 split the former final sprint's 1200
credits into 700/500; reserve 700 and project cap 7000 stay unchanged.
Only separately approved blocking fixes may change code after freeze.
S5 uses automation-first document/video preparation to fit H's 2-3 hours of
review/upload availability: a captioned demo without narration, ML drafting
from pinned evidence followed by Ashish's sign-off, and a bounded existing-
tool media preflight with a minimal manual fallback. Required exported
page/duration limits must still be measured. No new agents or automatic
submission/PR merge follows from automation; each phase is separately gated.
Every sprint keeps the same shape:

1. **Phase 0 — Discussion & Research** (O + H). Re-read `spec.md`, `decisions.md`, last retro. Confirm or amend the tentative plan for this sprint. Output: `plan.md` for this sprint.
2. **Phases 1..n — Delivery** (X, reviewed by O). Sizeable chunks of work, each with atomic tasks.
3. **Final phase — Retro & Cleanup** (O + H). Write `retro/sprintN.md`, archive `plan.md` → `planning/sprintN.md`, reconcile budget, update `spec.md`, PR `frontend` → `dev` if stable.

## 5. Phase lifecycle and gates

Each phase in `plan.md` declares:

- **Goal** (one sentence)
- **Atomic tasks** (checkbox list; each independently verifiable)
- **Self-check gate** — objective success criteria X must prove with evidence (command output, screenshot, file path). X may not declare a phase done without all criteria met.
- **Human gate** — H reviews O's assessment + X's evidence and explicitly approves ("GATE APPROVED") before the next phase begins.
- **Credit estimate** and **actual** (filled at gate time).

Deferring a particular gate item requires H's explicit approval and a logged decision. Keep the deferred item open; approval of independent work does not certify the missing evidence. D-016 is the Gate 2 exception for backend contract sign-off.

No phase starts until the previous phase's human gate is approved. If a self-check fails twice **for the same root cause after a genuine fix attempt**, X stops and reports; O re-plans rather than X looping. Auto-fixable lint/format errors never count as failures — X runs the fixer (`ruff check --fix && ruff format`, `pnpm format`, `pnpm lint --fix`) and re-checks (D-015). Before stopping for any reason, X commits and pushes all work that passes typecheck/tests, so nothing is left only in the working tree.

### Feedback intake and incorporation

Feedback is evidence to assess, not automatic implementation authority. O keeps
one compact ledger in the current `plan.md`, archived with the sprint; no
separate feedback sprint or agent is implied.

1. **Capture:** assign a stable sprint feedback ID; record the source/reviewed
   commit, claim, expected behavior and relevant rubric or requirement.
2. **Verify:** compare against current code/evidence and approved decisions.
   Separate reproduced defects, usability/rubric improvements, intentional
   behavior, outdated findings and unverified claims. Record evidence or the
   specific missing check; do not accept the reviewer's severity as fact.
3. **Triage:** record disposition (`proposed`, `approved`, `implemented`,
   `verified`, `deferred`, or `no change`), owner, rationale and dependency.
   Reconcile conflicting advice against the contract/model semantics; changes
   to either need H approval and M's relevant agreement, not a frontend guess.
4. **Approve a batch:** H approves the closed scope, exclusions, acceptance,
   credit ceilings and calendar at a human gate. Incorporate approved changes
   into plan/spec/decisions before a single manual handover to X. New feedback
   during execution is queued unless H explicitly changes the active batch.
5. **Implement and prove:** X reports each approved ID, change/commit and
   measurable evidence, preserving existing behavior. Reuse accepted checks;
   an automation failure is not a product defect or a live pass. Stop at the
   phase gate or applicable credit/repeated-failure limit.
6. **Close:** O checks the evidence; H approves the human gate. Only then mark
   the item verified. Retain deferred/no-change items with reasons rather
   than silently dropping them. After code freeze, only H-approved blocking
   fixes may enter S5; suggestions do not reopen development.

## 6. Handover format (O → X)

O produces a single chat block that H pastes into the executor session. It must be **self-contained** (X has no memory of previous phases beyond what is in the repo):

```
## Handover: Sprint N / Phase M — <title>
Repo: C:\Users\faiza\workspace\MultimodalAIHack  Branch: frontend
Read first: docs/workflow.md, docs/planning/plan.md (Phase M), docs/spec.md §<sections>
Goal: ...
Tasks:
  1. ...
Constraints: ...
Self-check gate (prove each with evidence): ...
Deliver back: commit hash(es), evidence per criterion, deviations, open questions,
  output of `python scripts/credits.py`.
Commit as you go; do not touch files outside: <paths>.
```

## 7. Report format (X → O)

```
## Report: Sprint N / Phase M
Commits: <hashes>
Gate evidence: criterion -> evidence
Feedback batch (if applicable): ID -> change/commit -> evidence -> unresolved status
Deviations from handover: ...
Open questions / blockers: ...
Estimated credits used: <from Copilot usage if visible>
```

## 8. Credit discipline (see D-008, D-011, D-014)

- **Measure, don't guess:** `python scripts/credits.py` (all-time, per session) · `--since <sprint start>` for a sprint · `--by-day`. Both O and X run it at every gate and paste the TOTAL line in their report.
- **Historical model economics (early S1, not current pricing):** orchestrator on a 15× model ≈ 11 credits/call; executor on a 1× model ≈ 0.15 credits/call. O accounts for approximately 95% of the Oct 8 gate-review snapshot; do not infer current model multipliers or call costs from those earlier measurements. **Orchestrator calls are the scarce resource.** Therefore:
  - O verifies through X's evidence, not by re-running checks itself. If something needs checking, X does it (70 executor calls ≈ 1 orchestrator call).
  - O keeps the chat planning-only; no exploratory file reads unless gating a decision.
  - Prefer **few, large, self-contained handovers** over many small ones.
  - Context size drives per-call cost; H triggers `/compact` on O when context gets heavy; start a fresh O session at each sprint's Phase 0 unless H explicitly chooses a compacted continuation. D-023 authorises continuing this session for S2 after `/compact`.
  - X batches tool calls and avoids narration.
- Model choice: X uses its configured default; the earlier 1× rate is historical. O model is H's call per sprint (D-014, D-020); H retained the current orchestrator for S2. Whichever model, O keeps its call count low and does not switch models automatically.
- If application control blocks the Python credits command, use the permitted read-only local session-store interface with the script's deduplication fields and project filter. Do not retry the blocked interpreter or work around the policy. Report the snapshot timestamp and distinguish local telemetry from account billing.

## 9. Engineering conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), small and frequent, on `frontend` only.
- Every commit must pass `pnpm lint && pnpm build` (frontend) and `ruff check` (mock-api) once those exist. GitHub Actions CI exists but is **non-blocking** (D-013): check it passively with `gh run list`, never spend agent time debugging runner/queue issues.
- Gate evidence (screenshots, command logs) lives in `docs/evidence/sNpM-*.png|txt`.
- No secrets in the repo. No large binaries >10 MB without H approval (3D meshes go through `git lfs` or are downloaded by script).
- Licenses of every third-party asset (meshes, icons, datasets) recorded in `docs/spec.md §Assets`.

## 10. Definition of Done (project)

All items in `docs/problem_statement.md §Expected Deliverables` that touch the frontend are demonstrable locally, documented in the 6-page doc, and shown in the demo video. Clinical disclaimer visible on every screen.
