import { useMemo, useState } from "react";
import { buildMeasurementGroups } from "../../../lib/insights";
import { useUiStore } from "../../../store/uiStore";
import { useWhatIfStore } from "../../../store/whatIfStore";
import { FloatingWindow } from "../FloatingWindow";
import { IconFlask } from "../icons";
import { EmptyState } from "../parts";
import { useStudioData } from "../studioData";
import { useStudioStore } from "../studioStore";

/** Every input as a tile: value, typical range and how much it moves the estimate. Filter to what needs attention. */
export function MeasuresWindow() {
  const { shown, features, predictionInputs, scenario } = useStudioData();
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);
  const pinned = useStudioStore((state) => state.pinnedFactor);
  const whatIfValues = useWhatIfStore((state) => state.values);
  const [attentionOnly, setAttentionOnly] = useState(true);
  const target = selectedVessel ?? "cad";
  const cards = useMemo(() => {
    if (!shown || shown.mock) {
      return [];
    }
    return buildMeasurementGroups(
      features,
      scenario ? whatIfValues : predictionInputs,
      shown.explanations[target],
    )
      .flatMap((group) => group.cards)
      .sort((left, right) => Math.abs(right.points) - Math.abs(left.points));
  }, [features, predictionInputs, scenario, shown, target, whatIfValues]);
  const visible = attentionOnly ? cards.filter((card) => card.attention) : cards;

  return (
    <FloatingWindow
      focusableBody
      actions={
        <div className="sl-segmented sl-segmented-sm" role="group" aria-label="Filter">
          <button
            aria-pressed={attentionOnly}
            onClick={() => setAttentionOnly(true)}
            type="button"
          >
            Needs attention
          </button>
          <button
            aria-pressed={!attentionOnly}
            onClick={() => setAttentionOnly(false)}
            type="button"
          >
            All
          </button>
        </div>
      }
      icon={<IconFlask />}
      id="measures"
      title="Measurements"
    >
      {cards.length === 0 ? (
        <EmptyState>Available with the real model.</EmptyState>
      ) : (
        <div className="sl-tiles">
          {visible.map((card) => (
            <div
              className={`sl-tile${card.attention ? " is-attention" : ""}${hoveredFactor === card.feature ? " is-hot" : ""}`}
              key={card.feature}
              onPointerEnter={() => setHoveredFactor(card.feature)}
              onPointerLeave={() => setHoveredFactor(pinned)}
              title={card.description}
            >
              <span className="sl-tile-label">{card.label}</span>
              <span className="sl-tile-value">
                {card.valueText}
                {card.status === "high" && <em className="sl-tile-flag">High</em>}
                {card.status === "low" && <em className="sl-tile-flag">Low</em>}
              </span>
              {card.bar && (
                <span className="sl-tile-bar" aria-hidden="true">
                  <i
                    className="sl-tile-band"
                    style={{
                      left: `${card.bar.bandStart}%`,
                      width: `${card.bar.bandEnd - card.bar.bandStart}%`,
                    }}
                  />
                  <i
                    className="sl-tile-marker"
                    style={{ left: `${Math.min(100, Math.max(0, card.bar.marker))}%` }}
                  />
                </span>
              )}
              {Math.abs(card.points) >= 0.5 && (
                <span className={`sl-tile-pts ${card.points > 0 ? "sl-raise" : "sl-lower"}`}>
                  {card.points > 0 ? "+" : "−"}
                  {Math.abs(card.points).toFixed(0)} pts
                </span>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <EmptyState>Nothing out of range or strongly moving the estimate.</EmptyState>
          )}
        </div>
      )}
    </FloatingWindow>
  );
}
