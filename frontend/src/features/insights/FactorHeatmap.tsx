import type { HeatmapRow, InsightTarget } from "../../lib/insights";
import {
  formatPoints,
  INSIGHT_TARGETS,
  LOWER_COLOR,
  RAISE_COLOR,
  TARGET_SHORT,
} from "../../lib/insights";

interface FactorHeatmapProps {
  rows: HeatmapRow[];
  selected: InsightTarget;
  activeFactor: string | null;
  onSelectTarget: (target: InsightTarget) => void;
  onHoverFactor: (feature: string | null) => void;
}

function cellStyle(points: number, maxAbs: number) {
  const strength = maxAbs === 0 ? 0 : Math.min(1, Math.abs(points) / maxAbs);
  const color = points >= 0 ? RAISE_COLOR : LOWER_COLOR;
  const alpha = Math.round((0.08 + 0.82 * strength) * 255)
    .toString(16)
    .padStart(2, "0");
  return {
    backgroundColor: Math.abs(points) < 0.05 ? "#f8fafc" : `${color}${alpha}`,
    color: strength > 0.55 ? "#ffffff" : "#1f2937",
  };
}

/**
 * Factor x artery map: how much each of the patient's inputs moves the estimate for CAD and for each artery.
 * Hovering a row lights the same factor on the 3D heart.
 */
export function FactorHeatmap({
  rows,
  selected,
  activeFactor,
  onSelectTarget,
  onHoverFactor,
}: FactorHeatmapProps) {
  const maxAbs = rows.reduce(
    (max, row) =>
      Math.max(max, ...INSIGHT_TARGETS.map((t) => Math.abs(row.cells[t]))),
    0,
  );
  if (rows.length === 0) {
    return (
      <p
        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
        role="status"
      >
        Every input equals the typical patient&apos;s value, so no factor moves
        the estimate.
      </p>
    );
  }
  return (
    <div className="insight-heatmap">
      <table className="w-full table-fixed border-separate border-spacing-[3px] text-[11px]">
        <caption className="sr-only">
          Contribution of each input to each target, in percentage points
        </caption>
        <thead>
          <tr>
            <th
              className="w-[38%] text-left text-[11px] font-semibold text-slate-500"
              scope="col"
            >
              Factor
            </th>
            {INSIGHT_TARGETS.map((target) => (
              <th key={target} scope="col">
                <button
                  aria-pressed={selected === target}
                  className={`w-full rounded-md px-1 py-1 text-[11px] font-bold transition ${
                    selected === target
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  type="button"
                  onClick={() => onSelectTarget(target)}
                >
                  {TARGET_SHORT[target]}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              className={`insight-heatmap-row cursor-pointer ${
                activeFactor !== null && activeFactor !== row.feature
                  ? "opacity-40"
                  : ""
              }`}
              key={row.feature}
              style={{ animationDelay: `${index * 40}ms` }}
              tabIndex={0}
              onBlur={() => onHoverFactor(null)}
              onFocus={() => onHoverFactor(row.feature)}
              onMouseEnter={() => onHoverFactor(row.feature)}
              onMouseLeave={() => onHoverFactor(null)}
            >
              <th
                className="truncate pr-1 text-left font-semibold text-slate-800"
                scope="row"
                title={`${row.label}: ${row.valueText}`}
              >
                {row.label}
                <span className="block truncate text-[11px] font-normal text-slate-500">
                  {row.valueText}
                </span>
              </th>
              {INSIGHT_TARGETS.map((target) => (
                <td
                  className={`rounded-md py-1.5 text-center font-semibold tabular-nums ${
                    selected === target ? "ring-2 ring-slate-900/70" : ""
                  }`}
                  key={target}
                  style={cellStyle(row.cells[target], maxAbs)}
                  title={`${row.label} → ${TARGET_SHORT[target]}: ${formatPoints(row.cells[target])}`}
                >
                  {Math.abs(row.cells[target]) < 0.5
                    ? "·"
                    : formatPoints(row.cells[target], 0).replace(" pts", "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: LOWER_COLOR }}
          />{" "}
          lowers
        </span>
        <span>cells = percentage points vs a typical patient</span>
        <span className="inline-flex items-center gap-1">
          raises{" "}
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: RAISE_COLOR }}
          />
        </span>
      </div>
    </div>
  );
}
