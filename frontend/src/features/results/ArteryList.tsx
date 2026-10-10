import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import { colorScale } from "../../lib/colorScale";
import {
  FLOW_ARTERIES,
  formatPoints,
  LOWER_COLOR,
  RAISE_COLOR,
  type ArteryId,
} from "../../lib/insights";
import { ARTERY_INFO, topArteryDrivers } from "../../lib/summary";
import { useUiStore } from "../../store/uiStore";

interface ArteryListProps {
  prediction: PredictionResponse;
  /** Accepted prediction while a what-if scenario is shown; null otherwise. */
  baseline: PredictionResponse | null;
  features: readonly FeatureDefinition[];
  selected: ArteryId | null;
  onSelect: (artery: ArteryId | null) => void;
}

const pct = (probability: number) =>
  `${Math.min(100, Math.max(0, probability * 100))}%`;

/** One row per artery: chance, threshold, flagged or not, and the two inputs that move it most. */
export function ArteryList({
  prediction,
  baseline,
  features,
  selected,
  onSelect,
}: ArteryListProps) {
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);

  return (
    <section aria-labelledby="artery-list-heading" className="result-section">
      <h3 className="result-section-title" id="artery-list-heading">
        Which arteries may be narrowed
      </h3>
      <p className="result-section-lead">
        Chance of at least 50% narrowing in each main artery.
      </p>
      <ul className="artery-list">
        {FLOW_ARTERIES.map((artery) => {
          const target = prediction.vessels[artery];
          const before = baseline?.vessels[artery] ?? null;
          const flagged = target.probability >= target.threshold;
          const threshold = Math.round(target.threshold * 100);
          const drivers = prediction.mock
            ? []
            : topArteryDrivers(prediction.explanations[artery], features);
          const isSelected = selected === artery;
          return (
            <li key={artery}>
              <button
                aria-label={`${artery}, ${ARTERY_INFO[artery].name}: ${Math.round(target.probability * 100)}% chance, ${
                  flagged ? "above" : "below"
                } the ${threshold}% threshold.${target.uncertain ? " The model is unsure." : ""} Show ${artery} details.`}
                aria-pressed={isSelected}
                className={`artery-item ${isSelected ? "artery-item-selected" : ""}`}
                type="button"
                onBlur={() => setHoveredVessel(null)}
                onClick={() => onSelect(isSelected ? null : artery)}
                onFocus={() => setHoveredVessel(artery)}
                onMouseEnter={() => setHoveredVessel(artery)}
                onMouseLeave={() => setHoveredVessel(null)}
              >
                <span className="artery-item-head">
                  <span>
                    <strong>{artery}</strong>{" "}
                    <span className="artery-item-name">
                      {ARTERY_INFO[artery].name}
                    </span>
                    <span className="artery-item-region">
                      {ARTERY_INFO[artery].region}
                    </span>
                  </span>
                  <span className="artery-item-value">
                    {Math.round(target.probability * 100)}%
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="artery-bar"
                  style={{
                    background: `linear-gradient(90deg, var(--risk-track) ${pct(target.threshold)}, var(--risk-flag-zone) ${pct(target.threshold)})`,
                  }}
                >
                  <span
                    className="artery-bar-fill"
                    style={{
                      width: pct(target.probability),
                      background: colorScale(target.probability),
                    }}
                  />
                  {before && (
                    <span
                      className="artery-bar-ghost"
                      style={{ left: pct(before.probability) }}
                    />
                  )}
                  <span
                    className="artery-bar-threshold"
                    style={{ left: pct(target.threshold) }}
                  />
                </span>
                <span className="artery-item-foot">
                  <span
                    className={`risk-status risk-status-small ${flagged ? "risk-status-flagged" : ""}`}
                  >
                    <span aria-hidden="true">{flagged ? "▲" : "▽"}</span>
                    {flagged ? "Flagged" : "Not flagged"}
                  </span>
                  <span className="artery-threshold-text">
                    threshold {threshold}%
                  </span>
                  {target.uncertain && (
                    <span className="risk-unsure-chip">
                      <span aria-hidden="true">?</span> Unsure
                    </span>
                  )}
                </span>
                {drivers.length > 0 && (
                  <span className="artery-drivers">
                    <span className="artery-drivers-label">Main drivers</span>
                    {drivers.map((driver) => (
                      <span
                        className="artery-driver"
                        key={driver.feature}
                        onMouseEnter={() => setHoveredFactor(driver.feature)}
                        onMouseLeave={() => setHoveredFactor(null)}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            color:
                              driver.points >= 0 ? RAISE_COLOR : LOWER_COLOR,
                          }}
                        >
                          {driver.points >= 0 ? "▲" : "▼"}
                        </span>
                        {driver.label}
                        <span
                          className="artery-driver-points"
                          style={{
                            color:
                              driver.points >= 0 ? RAISE_COLOR : LOWER_COLOR,
                          }}
                        >
                          {formatPoints(driver.points, 0).replace(" pts", "")}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
