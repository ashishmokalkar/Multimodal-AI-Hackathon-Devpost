# Team Workflow — Frontend Track

> Read this first in every new session. It is the contract between the human, the orchestrator agent and the executor agent.

## 1. Roles

| Role | Who | Responsibilities |
|---|---|---|
| **Human (H)** | Faizan | Owns product direction, approves human gates, forwards handovers to the executor, reports blockers from the ML colleague. |
| **Orchestrator (O)** | Copilot agent in planning session | Research, brainstorming, sprint/phase planning, writing `plan.md`/`spec.md`/`decisions.md`, drafting executor handovers, reviewing executor output against gates, retros, budget tracking. **Does not implement features.** |
| **Executor (X)** | Copilot agent in implementation session | Implements atomic tasks from a handover, runs lint/build/tests, commits to `frontend`, reports back with evidence against the self-check criteria. |
| **ML colleague (M)** | Ashish | Owns dataset, models, FastAPI backend on `ml` branch. Signs off on the API contract. |

All handovers O → X and X → O pass **through H in chat**. No agent spawns sub-agents without H's explicit approval.

## 2. Hard constraints

- **Deadline:** 14 Oct 2026, 20:45 CEST (Devpost: 15 Oct 00:15 IST). Oct 14 is submission-only buffer.
- **Budget:** 7000 Copilot credits for O + X combined. Per-sprint caps live in `plan.md`. Exceeding a sprint cap requires an explicit H decision logged in `decisions.md`.
- **Branches:** `main` ← `dev` ← `frontend` (ours) / `ml` (colleague). We only commit to `frontend`. Merges to `dev` happen at sprint end via PR after H approval.

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

Four sprints of ~2 days (D-001). Every sprint has the same shape:

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

No phase starts until the previous phase's human gate is approved. If a self-check fails twice **for the same root cause after a genuine fix attempt**, X stops and reports; O re-plans rather than X looping. Auto-fixable lint/format errors never count as failures — X runs the fixer (`ruff check --fix && ruff format`, `pnpm format`, `pnpm lint --fix`) and re-checks (D-015). Before stopping for any reason, X commits and pushes all work that passes typecheck/tests, so nothing is left only in the working tree.

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
Deviations from handover: ...
Open questions / blockers: ...
Estimated credits used: <from Copilot usage if visible>
```

## 8. Credit discipline (see D-008, D-011, D-014)

- **Measure, don't guess:** `python scripts/credits.py` (all-time, per session) · `--since <sprint start>` for a sprint · `--by-day`. Both O and X run it at every gate and paste the TOTAL line in their report.
- **Model economics (measured S1):** orchestrator on a 15× model ≈ 11 credits/call; executor on a 1× model ≈ 0.15 credits/call. **Orchestrator calls are the scarce resource.** Therefore:
  - O verifies through X's evidence, not by re-running checks itself. If something needs checking, X does it (70 executor calls ≈ 1 orchestrator call).
  - O keeps the chat planning-only; no exploratory file reads unless gating a decision.
  - Prefer **few, large, self-contained handovers** over many small ones.
  - Context size drives per-call cost; H triggers `/compact` on O when context gets heavy; start a fresh O session at each sprint's Phase 0.
  - X batches tool calls and avoids narration.
- Model choice: X uses the default (1×) model. O model is H's call per sprint (D-014); whichever model, O keeps its call count low.

## 9. Engineering conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), small and frequent, on `frontend` only.
- Every commit must pass `pnpm lint && pnpm build` (frontend) and `ruff check` (mock-api) once those exist. GitHub Actions CI exists but is **non-blocking** (D-013): check it passively with `gh run list`, never spend agent time debugging runner/queue issues.
- Gate evidence (screenshots, command logs) lives in `docs/evidence/sNpM-*.png|txt`.
- No secrets in the repo. No large binaries >10 MB without H approval (3D meshes go through `git lfs` or are downloaded by script).
- Licenses of every third-party asset (meshes, icons, datasets) recorded in `docs/spec.md §Assets`.

## 10. Definition of Done (project)

All items in `docs/problem_statement.md §Expected Deliverables` that touch the frontend are demonstrable locally, documented in the 6-page doc, and shown in the demo video. Clinical disclaimer visible on every screen.
