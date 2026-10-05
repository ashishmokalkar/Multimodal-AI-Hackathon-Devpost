#!/usr/bin/env python
"""Report GitHub Copilot credit (AIU) usage for this project's agent sessions.

Reads the local Copilot session store (read-only) and sums `total_nano_aiu`
for every session whose working directory is this repository. Both the
orchestrator and executor sessions are included automatically.

Usage (from repo root):
    python scripts/credits.py                       # all time, per session + total
    python scripts/credits.py --since 2026-10-08    # spend since a date (sprint start)
    python scripts/credits.py --since "2026-10-05T20:27" --until "2026-10-05T22:53"
    python scripts/credits.py --by-day              # add a per-day table
    python scripts/credits.py --json                # machine-readable

Notes:
  * --since/--until are interpreted as LOCAL time unless a timezone is given;
    output timestamps are UTC (as stored by Copilot).
  * Rows are de-duplicated: the store sometimes logs the same event twice.
  * Budget defaults to 7000 (decisions.md D-008); override with --budget.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB = Path.home() / ".copilot" / "session-store.db"
DEFAULT_BUDGET = 7000
REPO_ROOT = Path(__file__).resolve().parent.parent

DEDUP_CTE = """
WITH ev AS (
    SELECT DISTINCT u.session_id, u.created_at, u.model, u.input_tokens,
           u.output_tokens, u.cache_read_tokens, u.total_nano_aiu
    FROM assistant_usage_events u
    JOIN sessions s ON s.id = u.session_id
    WHERE lower(replace(s.cwd, '/', '\\')) LIKE lower(?)
      AND (? IS NULL OR u.created_at >= ?)
      AND (? IS NULL OR u.created_at <= ?)
)
"""


def normalise_ts(value: str | None) -> str | None:
    """Accept YYYY-MM-DD or ISO datetime (local or UTC) and return an ISO UTC string."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        sys.exit(f"Invalid timestamp: {value!r} (use YYYY-MM-DD or ISO 8601)")
    if dt.tzinfo is None:
        dt = dt.astimezone()  # interpret naive input as local time
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def query(conn: sqlite3.Connection, cwd_pattern: str, since: str | None, until: str | None, by_day: bool):
    params = (cwd_pattern, since, since, until, until)
    per_session = conn.execute(
        DEDUP_CTE
        + """
        SELECT ev.session_id, s.summary, count(*) AS calls,
               sum(ev.input_tokens) AS input_tokens,
               sum(ev.output_tokens) AS output_tokens,
               sum(ev.cache_read_tokens) AS cache_read_tokens,
               sum(ev.total_nano_aiu) / 1e9 AS credits,
               min(ev.created_at) AS first_call, max(ev.created_at) AS last_call
        FROM ev JOIN sessions s ON s.id = ev.session_id
        GROUP BY ev.session_id ORDER BY first_call
        """,
        params,
    ).fetchall()

    per_day = []
    if by_day:
        per_day = conn.execute(
            DEDUP_CTE
            + """
            SELECT substr(ev.created_at, 1, 10) AS day, count(*) AS calls,
                   sum(ev.total_nano_aiu) / 1e9 AS credits
            FROM ev GROUP BY day ORDER BY day
            """,
            params,
        ).fetchall()
    return per_session, per_day


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB, help=f"session store path (default {DEFAULT_DB})")
    ap.add_argument("--cwd", default=str(REPO_ROOT), help="session working directory to match (default: repo root)")
    ap.add_argument("--since", help="only events at/after this time (YYYY-MM-DD or ISO)")
    ap.add_argument("--until", help="only events at/before this time")
    ap.add_argument("--budget", type=float, default=DEFAULT_BUDGET, help="total budget for 'remaining' line")
    ap.add_argument("--by-day", action="store_true", help="add per-day breakdown")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    args = ap.parse_args()

    if not args.db.exists():
        sys.exit(f"Session store not found: {args.db}")

    cwd_pattern = os.path.normpath(args.cwd).replace("/", "\\") + "%"
    since, until = normalise_ts(args.since), normalise_ts(args.until)

    conn = sqlite3.connect(f"file:{args.db.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    sessions, days = query(conn, cwd_pattern, since, until, args.by_day)

    total = sum(r["credits"] for r in sessions)
    if args.json:
        print(json.dumps({
            "since": since, "until": until, "budget": args.budget,
            "total_credits": round(total, 1), "remaining": round(args.budget - total, 1),
            "sessions": [dict(r) for r in sessions],
            "days": [dict(r) for r in days],
        }, indent=2))
        return

    window = f"{since or 'start'} -> {until or 'now'} (UTC)"
    print(f"Copilot credits for {args.cwd}\nWindow: {window}\n")
    print(f"{'Session':<36} {'Summary':<32} {'Calls':>5} {'In tok':>10} {'Out tok':>8} {'Credits':>8}  Last call (UTC)")
    print("-" * 125)
    for r in sessions:
        print(f"{r['session_id']:<36} {(r['summary'] or '')[:32]:<32} {r['calls']:>5} "
              f"{r['input_tokens'] or 0:>10,} {r['output_tokens'] or 0:>8,} {r['credits']:>8.1f}  {r['last_call'][:16]}")
    print("-" * 125)
    print(f"{'TOTAL':<36} {'':<32} {sum(r['calls'] for r in sessions):>5} {'':>10} {'':>8} {total:>8.1f}")
    if not since and not until:
        print(f"\nBudget {args.budget:,.0f} -> remaining {args.budget - total:,.1f} ({100 * total / args.budget:.1f}% used)")

    if days:
        print("\nPer day (UTC)")
        for d in days:
            print(f"  {d['day']}  {d['calls']:>5} calls  {d['credits']:>8.1f} credits")


if __name__ == "__main__":
    main()
