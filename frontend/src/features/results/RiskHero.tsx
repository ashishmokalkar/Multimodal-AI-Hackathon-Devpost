import type { Target } from "../../api/types";
import { targetColor } from "../../lib/colorScale";
import {
  driverSentence,
  headlineDrivers,
  type DriverSummary,
} from "../../lib/summary";
import { FactorPills } from "./FactorPills";
import { isFlagged } from "../../lib/flags";

interface RiskHeroProps {
  target: Target;
  /** Accepted CAD target while a what-if scenario is shown; null otherwise. */
  baseline: Target | null;
  /** Drivers of the CAD estimate; the strongest are shown as pills under the gauge. */
  drivers: DriverSummary;
  selected: boolean;
  onSelect: () => void;
}

const CX = 100;
const CY = 100;
const R = 78;

function point(probability: number, radius = R) {
  const angle = Math.PI * (1 - Math.min(1, Math.max(0, probability)));
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

const ARC = `M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY}`;

/** Semicircle gauge: fill = probability, dark tick = decision threshold. */
function Gauge({
  target,
  baseline,
}: {
  target: Target;
  baseline: Target | null;
}) {
  const value = target.probability;
  const tickIn = point(target.threshold, R - 13);
  const tickOut = point(target.threshold, R + 13);
  const tickLabel = point(target.threshold, R + 24);
  const ghost = baseline ? point(baseline.probability) : null;
  return (
    <svg aria-hidden="true" className="risk-gauge" viewBox="0 0 200 116">
      <path className="risk-gauge-track" d={ARC} pathLength={100} />
      <path
        className="risk-gauge-fill"
        d={ARC}
        pathLength={100}
        stroke={targetColor("cad")}
        strokeDasharray={`${value * 100} 100`}
      />
      {ghost && (
        <circle className="risk-gauge-ghost" cx={ghost.x} cy={ghost.y} r={5} />
      )}
      <line
        className="risk-gauge-tick"
        x1={tickIn.x}
        x2={tickOut.x}
        y1={tickIn.y}
        y2={tickOut.y}
      />
      <text
        className="risk-gauge-tick-label"
        textAnchor="middle"
        x={tickLabel.x}
        y={tickLabel.y + 3}
      >
        {Math.round(target.threshold * 100)}%
      </text>
      <text className="risk-gauge-value" textAnchor="middle" x={CX} y={CY - 8}>
        {Math.round(value * 100)}%
      </text>
      <text
        className="risk-gauge-caption"
        textAnchor="middle"
        x={CX}
        y={CY + 10}
      >
        chance
      </text>
    </svg>
  );
}

/** The headline result: overall CAD chance, whether it crosses the threshold, and what raises or lowers it. */
export function RiskHero({
  target,
  baseline,
  drivers,
  selected,
  onSelect,
}: RiskHeroProps) {
  const flagged = isFlagged(target);
  const above = target.probability >= target.threshold;
  const threshold = Math.round(target.threshold * 100);
  return (
    <section
      aria-labelledby="risk-hero-heading"
      className={`risk-hero ${selected ? "risk-hero-selected" : ""}`}
    >
      <button
        aria-pressed={selected}
        className="risk-hero-main"
        type="button"
        onClick={onSelect}
      >
        <Gauge baseline={baseline} target={target} />
        {/* the gauge is drawn, so its number is given to screen readers here; the visible text names the button */}
        <span className="sr-only">
          {Math.round(target.probability * 100)}% chance.{" "}
        </span>
        <span className="risk-hero-text">
          <span className="risk-hero-eyebrow">Overall result</span>
          <span className="risk-hero-title" id="risk-hero-heading">
            Coronary artery disease
          </span>
          <span
            className={`risk-status ${flagged ? "risk-status-flagged" : ""}`}
          >
            <span aria-hidden="true">{flagged ? "▲" : "▽"}</span>
            {flagged ? "Flagged" : "Not flagged"}
          </span>
          <span className="risk-hero-threshold">
            {above ? "Above" : "Below"} the {threshold}% decision threshold
          </span>
          {baseline && (
            <span className="risk-hero-was">
              Before the what-if: {Math.round(baseline.probability * 100)}%
            </span>
          )}
        </span>
      </button>
      <p className="sr-only">{driverSentence(drivers)}</p>
      <FactorPills {...headlineDrivers(drivers)} />
      {target.uncertain && (
        <p className="risk-unsure">
          <span aria-hidden="true">?</span>
          The model is unsure about this result: it cannot confidently rule
          disease in or out.
        </p>
      )}
    </section>
  );
}
