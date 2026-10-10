import type { PredictionResponse, Target } from "../../api/types";
import { colorScale } from "../../lib/colorScale";
import { formatProbability, formatTargetUncertainty } from "../../lib/format";
import { formatPoints, toPoints } from "../../lib/insights";
import { useUiStore } from "../../store/uiStore";
import { vesselMap, vesselIds, type VesselId } from "../viewer/vesselMap";

interface RiskOverviewProps {
  prediction: PredictionResponse;
  /** Active what-if scenario; when present its values are drawn and the accepted values become ghost markers. */
  scenario: PredictionResponse | null;
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
}

interface RowProps {
  id: "CAD" | VesselId;
  name: string;
  target: Target;
  baseline: Target | null;
  hero?: boolean;
  selected: boolean;
  onSelect: () => void;
}

const pct = (probability: number) =>
  `${Math.min(100, Math.max(0, probability * 100))}%`;

/** States the threshold value and the margin to it, so the tick on the bar never has to be decoded alone. */
function StatusChip({ target }: { target: Target }) {
  const above = target.probability >= target.threshold;
  const margin = Math.round(
    Math.abs(toPoints(target.probability - target.threshold)),
  );
  const threshold = `${Math.round(target.threshold * 100)}%`;
  return (
    <span className={`risk-chip ${above ? "risk-chip-above" : ""}`}>
      <span aria-hidden="true">{above ? "▲" : "▽"}</span>
      {margin === 0
        ? `At the ${threshold} threshold`
        : `${margin} pts ${above ? "above" : "below"} the ${threshold} threshold`}
    </span>
  );
}

function RiskRow({
  id,
  name,
  target,
  baseline,
  hero = false,
  selected,
  onSelect,
}: RowProps) {
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const vessel = id === "CAD" ? null : id;
  const delta = baseline
    ? toPoints(target.probability - baseline.probability)
    : 0;
  const showDelta = baseline !== null && Math.abs(delta) >= 0.5;

  return (
    <button
      aria-label={`Select ${id}. Predicted probability ${formatProbability(target.probability)}. Model label ${target.label}. Threshold ${formatProbability(target.threshold)}. ${formatTargetUncertainty(target.uncertain)}`}
      aria-pressed={selected}
      className={`risk-row ${hero ? "risk-row-hero" : ""} ${selected ? "risk-row-selected" : ""}`}
      title={`${name}: ${formatProbability(target.probability)} (decision threshold ${formatProbability(target.threshold)})`}
      type="button"
      onBlur={vessel ? () => setHoveredVessel(null) : undefined}
      onClick={onSelect}
      onFocus={vessel ? () => setHoveredVessel(vessel) : undefined}
      onMouseEnter={vessel ? () => setHoveredVessel(vessel) : undefined}
      onMouseLeave={vessel ? () => setHoveredVessel(null) : undefined}
    >
      <span className="risk-row-head">
        <span className="risk-row-name">
          <strong>{id}</strong>
          <span>{name}</span>
        </span>
        <span className="risk-row-value">
          {showDelta && (
            <span
              className={`risk-delta ${delta > 0 ? "risk-delta-up" : "risk-delta-down"}`}
            >
              {formatPoints(delta, 0)}
            </span>
          )}
          {formatProbability(target.probability)}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="risk-track"
        style={{
          background: `linear-gradient(90deg, var(--risk-track) ${pct(target.threshold)}, var(--risk-flag-zone) ${pct(target.threshold)})`,
        }}
      >
        <span
          className="risk-fill"
          style={{
            width: pct(target.probability),
            background: colorScale(target.probability),
          }}
        />
        {baseline && (
          <span
            className="risk-ghost"
            style={{ left: pct(baseline.probability) }}
          />
        )}
        <span
          className="risk-threshold"
          style={{ left: pct(target.threshold) }}
        />
      </span>

      <span className="risk-row-foot">
        <StatusChip target={target} />
        {target.uncertain === true && (
          <span className="risk-chip risk-chip-uncertain">
            <span aria-hidden="true">?</span>
            Uncertain
          </span>
        )}
        {target.capped === true && (
          <span className="risk-chip">Capped at CAD</span>
        )}
      </span>
    </button>
  );
}

/**
 * Bullet-chart overview of all four estimates: fill = probability (risk colour scale), tick = decision threshold,
 * chips = threshold status and the 90% prediction-set state. Hovering an artery row highlights it on the 3D heart.
 */
export function RiskOverview({
  prediction,
  scenario,
  selectedVessel,
  onSelectVessel,
}: RiskOverviewProps) {
  const shown = scenario ?? prediction;
  const baseline = scenario ? prediction : null;
  const hasUncertainty = [
    shown.cad,
    ...vesselIds.map((v) => shown.vessels[v]),
  ].some((t) => t.uncertain !== undefined);

  return (
    <section aria-labelledby="risk-overview-heading" className="risk-overview">
      <div className="risk-overview-head">
        <h3 id="risk-overview-heading">
          Risk at a glance
          {scenario && <span className="risk-scenario-tag">what-if</span>}
        </h3>
        <div aria-hidden="true" className="risk-legend">
          <span>
            <i className="risk-legend-tick" /> Threshold
          </span>
          <span>
            <i className="risk-legend-zone" /> Flagged range
          </span>
          {baseline && (
            <span>
              <i className="risk-legend-ghost" /> Before what-if
            </span>
          )}
        </div>
      </div>

      <RiskRow
        baseline={baseline?.cad ?? null}
        hero
        id="CAD"
        name="Coronary artery disease"
        selected={selectedVessel === null}
        target={shown.cad}
        onSelect={() => onSelectVessel(null)}
      />
      <p className="risk-group-label">Which arteries · ≥50% narrowing</p>
      {vesselIds.map((vessel) => (
        <RiskRow
          baseline={baseline?.vessels[vessel] ?? null}
          id={vessel}
          key={vessel}
          name={vesselMap[vessel].label}
          selected={selectedVessel === vessel}
          target={shown.vessels[vessel]}
          onSelect={() => onSelectVessel(vessel)}
        />
      ))}
      <dl className="risk-footnote">
        <div>
          <dt>Threshold</dt>
          <dd>
            the cut-off above which the model flags a target. Each target has
            its own, chosen in validation to balance missed cases against false
            alarms.
          </dd>
        </div>
        {hasUncertainty && (
          <div>
            <dt className="risk-footnote-uncertain">Uncertain</dt>
            <dd>
              the 90% prediction set contains both answers, so the model cannot
              rule this one in or out with confidence. That is a property of the
              estimate, not an error.
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
