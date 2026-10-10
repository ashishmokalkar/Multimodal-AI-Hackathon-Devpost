import { useState } from "react";
import type { ImportanceResponse } from "../../api/types";
import { INSIGHT_TARGETS, LOWER_COLOR, RAISE_COLOR, TARGET_SHORT, type InsightTarget } from "../../lib/insights";

interface GlobalImportanceProps {
  data: ImportanceResponse;
  labels: ReadonlyMap<string, string>;
}

/** What each model generally relies on: average contribution size over the dataset patients. */
export function GlobalImportance({ data, labels }: GlobalImportanceProps) {
  const [target, setTarget] = useState<InsightTarget>("cad");
  const rows = data.targets[target].slice(0, 10);
  const max = rows[0]?.mean_abs_contribution || 1;

  return (
    <section aria-labelledby="global-importance-heading" className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900" id="global-importance-heading">
          What the model generally relies on
        </h3>
        <div className="flex gap-1" role="group" aria-label="Target">
          {INSIGHT_TARGETS.map((t) => (
            <button
              aria-pressed={t === target}
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                t === target ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
              key={t}
              type="button"
              onClick={() => setTarget(t)}
            >
              {TARGET_SHORT[t]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-600">
        Average size of each input&apos;s effect across all {data.n_patients} dataset patients, using the same explanations
        as individual predictions. The bar split shows how often the input raised (magenta) or lowered (blue) the
        estimate.
      </p>
      <ol className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <li className="grid grid-cols-[38%_1fr_auto] items-center gap-2 text-[11px]" key={row.feature}>
            <span className="truncate font-semibold text-slate-800">{labels.get(row.feature) ?? row.feature}</span>
            <span className="h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span
                className="flex h-full"
                style={{ width: `${(row.mean_abs_contribution / max) * 100}%` }}
              >
                <span style={{ width: `${row.share_raising * 100}%`, background: RAISE_COLOR }} />
                <span style={{ width: `${(1 - row.share_raising) * 100}%`, background: LOWER_COLOR }} />
              </span>
            </span>
            <span className="tabular-nums text-slate-600">
              {(row.mean_abs_contribution * 100).toFixed(1)} pts
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
