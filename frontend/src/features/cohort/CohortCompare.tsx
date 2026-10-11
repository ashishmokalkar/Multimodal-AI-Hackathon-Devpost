import { useMemo } from "react";
import {
  comparisonSentence,
  groupPhrase,
  percentileBands,
  percentileWord,
  type CohortComparison,
} from "../../lib/cohort";
import { targetColor } from "../../lib/colorScale";
import { TARGET_SHORT } from "../../lib/insights";

const W = 340;
const H = 200;
const M = { l: 34, r: 12, t: 10, b: 28 };

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) {
    return `${n}th`;
  }
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Target colour for markers; overall CAD uses the theme's flag colour so it reads on dark and light backgrounds. */
function markerColor(comparison: CohortComparison): string {
  return comparison.target === "cad" ? "var(--cc-cad, #c2255c)" : targetColor(comparison.target);
}

/**
 * Nomogram in the spirit of HeartFlow's plaque nomogram: the model's estimate against age for every same-sex
 * patient in the study, with the middle half (25th-75th percentile) shaded, the median drawn, and this patient
 * marked. The comparison group (similar age) is drawn stronger.
 */
export function CohortNomogram({
  comparison,
  label,
}: {
  comparison: CohortComparison;
  label?: string;
}) {
  const target = comparison.target;
  const bands = useMemo(
    () => percentileBands(comparison.sameSex, target),
    [comparison.sameSex, target],
  );
  const ages = comparison.sameSex.map((row) => row.age);
  const ageMin = Math.floor((Math.min(...ages, comparison.ageLow) - 2) / 5) * 5;
  const ageMax = Math.ceil((Math.max(...ages, comparison.ageHigh) + 2) / 5) * 5;
  const patientAge = comparison.age;
  const x = (age: number) =>
    M.l + ((age - ageMin) / (ageMax - ageMin || 1)) * (W - M.l - M.r);
  const y = (p: number) => M.t + (1 - p) * (H - M.t - M.b);
  const inGroup = new Set(comparison.group.map((row) => row.patient));
  const band = bands.length
    ? `M${bands.map((b) => `${x(b.age)},${y(b.p75)}`).join("L")}L${[...bands]
        .reverse()
        .map((b) => `${x(b.age)},${y(b.p25)}`)
        .join("L")}Z`
    : "";
  const median = bands.length
    ? `M${bands.map((b) => `${x(b.age)},${y(b.p50)}`).join("L")}`
    : "";
  const ticks: number[] = [];
  for (let age = ageMin; age <= ageMax; age += 10) {
    ticks.push(age);
  }
  const color = markerColor(comparison);
  const px = x(patientAge);
  const py = y(comparison.probability);
  const labelRight = px < W - 110;

  return (
    <svg
      aria-label={
        label ??
        `${TARGET_SHORT[target]} estimate against age for ${comparison.sameSex.length} ${comparison.sex === "Female" ? "women" : "men"} in the study. ${comparisonSentence(comparison)}.`
      }
      className="cc-nomogram"
      role="img"
      viewBox={`0 0 ${W} ${H}`}
    >
      <rect
        className="cc-window"
        height={H - M.t - M.b}
        width={Math.max(0, x(comparison.ageHigh) - x(comparison.ageLow))}
        x={x(Math.max(ageMin, comparison.ageLow))}
        y={M.t}
      />
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line className="cc-grid" x1={M.l} x2={W - M.r} y1={y(p)} y2={y(p)} />
          <text className="cc-axis" textAnchor="end" x={M.l - 5} y={y(p) + 3}>
            {p * 100}%
          </text>
        </g>
      ))}
      {ticks.map((age) => (
        <text className="cc-axis" key={age} textAnchor="middle" x={x(age)} y={H - M.b + 13}>
          {age}
        </text>
      ))}
      <text className="cc-axis cc-axis-title" textAnchor="middle" x={(M.l + W - M.r) / 2} y={H - 3}>
        Age (years)
      </text>
      {band && <path className="cc-band" d={band} />}
      {median && <path className="cc-median" d={median} />}
      {comparison.sameSex.map((row) => (
        <circle
          className={inGroup.has(row.patient) ? "cc-dot cc-dot-group" : "cc-dot"}
          cx={x(row.age)}
          cy={y(row[target])}
          key={row.patient}
          r={inGroup.has(row.patient) ? 2.6 : 2}
        />
      ))}
      <circle className="cc-you-halo" cx={px} cy={py} r={9} style={{ stroke: color }} />
      <circle className="cc-you" cx={px} cy={py} r={5} style={{ fill: color }}>
        <title>
          This patient: {Math.round(comparison.probability * 100)}%, {ordinal(Math.round(comparison.percentile))} percentile
        </title>
      </circle>
      <text
        className="cc-you-label"
        textAnchor={labelRight ? "start" : "end"}
        x={labelRight ? px + 13 : px - 13}
        y={py + 4}
      >
        This patient {Math.round(comparison.probability * 100)}%
      </text>
    </svg>
  );
}

/** Percentile track: where the patient falls in the comparison group, 0 (lowest) to 100 (highest). */
export function PercentileTrack({ comparison }: { comparison: CohortComparison }) {
  const at = Math.round(comparison.percentile);
  const sorted = comparison.group.map((row) => row[comparison.target]).sort((a, b) => a - b);
  return (
    <div className="cc-track" aria-hidden="true">
      <div className="cc-track-rail">
        {sorted.map((value, index) => (
          <i
            className="cc-track-tick"
            key={index}
            style={{ left: `${((index + 0.5) / sorted.length) * 100}%`, opacity: 0.25 + value * 0.6 }}
          />
        ))}
        <b className="cc-track-marker" style={{ left: `${at}%`, background: markerColor(comparison) }} />
      </div>
      <div className="cc-track-scale">
        <span>Lowest</span>
        <span>Median</span>
        <span>Highest</span>
      </div>
    </div>
  );
}

/** The headline number, the plain sentence, the nomogram and the caveat, for one target. */
export function CohortCompare({
  comparison,
  population,
}: {
  comparison: CohortComparison;
  population: string;
}) {
  const at = Math.round(comparison.percentile);
  return (
    <div className="cc">
      <div className="cc-head">
        <div className="cc-figure" style={{ color: markerColor(comparison) }}>
          <b>{ordinal(at)}</b>
          <span>percentile</span>
        </div>
        <div className="cc-copy">
          <p className="cc-word">{percentileWord(comparison.percentile)}</p>
          <p className="cc-sentence">
            {TARGET_SHORT[comparison.target]} estimate {Math.round(comparison.probability * 100)}%:{" "}
            higher than <strong>{at}%</strong> of {groupPhrase(comparison)} in the study.
          </p>
          <p className="cc-sub">
            Against all {comparison.total} study patients: higher than{" "}
            {Math.round(comparison.overallPercentile)}%.
          </p>
        </div>
      </div>
      <PercentileTrack comparison={comparison} />
      <CohortNomogram comparison={comparison} />
      <p className="cc-legend">
        <span>
          <i className="cc-key-dot" /> same-sex patients
        </span>
        <span>
          <i className="cc-key-dot cc-key-group" /> similar age
        </span>
        <span>
          <i className="cc-key-band" /> middle half
        </span>
        <span>
          <i className="cc-key-line" /> median
        </span>
      </p>
      {comparison.n < 15 && (
        <p className="cc-caution">Few similar patients in the study, so this comparison is rough.</p>
      )}
      <p className="cc-note" title={population}>
        Compared with patients referred for angiography in the study, not the general population.
      </p>
    </div>
  );
}
