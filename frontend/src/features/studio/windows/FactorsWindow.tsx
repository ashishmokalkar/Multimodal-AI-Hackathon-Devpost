import { useMemo } from "react";
import { targetColor } from "../../../lib/colorScale";
import { buildHeatmap, INSIGHT_TARGETS } from "../../../lib/insights";
import { useUiStore } from "../../../store/uiStore";
import { FloatingWindow } from "../FloatingWindow";
import { IconGrid } from "../icons";
import { EmptyState } from "../parts";
import { useStudioData } from "../studioData";
import { useStudioStore } from "../studioStore";

/**
 * Factor map: the strongest inputs (rows) against the overall result and each artery (columns). Bubble size is how
 * much the input moves that result; magenta raises it, blue lowers it. Hover a row to see it on the heart, click to
 * keep it lit.
 */
export function FactorsWindow() {
  const { shown, features } = useStudioData();
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);
  const pinned = useStudioStore((state) => state.pinnedFactor);
  const setPinned = useStudioStore((state) => state.setPinnedFactor);
  const rows = useMemo(
    () =>
      shown && !shown.mock ? buildHeatmap(shown.explanations, features, 8) : [],
    [features, shown],
  );
  const max = Math.max(1, ...rows.map((row) => row.strongest));

  const togglePin = (feature: string) => {
    const next = pinned === feature ? null : feature;
    setPinned(next);
    setHoveredFactor(next);
  };

  return (
    <FloatingWindow
      actions={
        pinned ? (
          <button
            className="pill-pinned"
            onClick={() => togglePin(pinned)}
            title="Stop showing this factor on the heart"
            type="button"
          >
            Pinned ✕
          </button>
        ) : null
      }
      icon={<IconGrid />}
      id="factors"
      title="Factor map"
    >
      {rows.length === 0 ? (
        <EmptyState>Available with the real model.</EmptyState>
      ) : (
        <div className="fmap" role="table" aria-label="Factor by artery">
          <div className="fmap-row fmap-headrow" role="row">
            <span role="columnheader">
              <span className="sr-only">Input</span>
            </span>
            {INSIGHT_TARGETS.map((target) => (
              <span
                className="fmap-col"
                key={target}
                role="columnheader"
                style={{ color: targetColor(target) }}
              >
                {target === "cad" ? "CAD" : target}
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <div
              className={`fmap-row${hoveredFactor === row.feature ? " is-hot" : ""}${pinned === row.feature ? " is-pinned" : ""}`}
              key={row.feature}
              onClick={() => togglePin(row.feature)}
              onPointerEnter={() => setHoveredFactor(row.feature)}
              onPointerLeave={() => setHoveredFactor(pinned)}
              role="row"
            >
              <span className="fmap-label" role="rowheader">
                <button
                  aria-pressed={pinned === row.feature}
                  className="fmap-pin"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePin(row.feature);
                  }}
                  onBlur={() => setHoveredFactor(pinned)}
                  onFocus={() => setHoveredFactor(row.feature)}
                  type="button"
                >
                  {row.label}
                  <small>{row.valueText}</small>
                </button>
              </span>
              {INSIGHT_TARGETS.map((target) => {
                const points = row.cells[target];
                const size = 6 + 22 * Math.sqrt(Math.abs(points) / max);
                return (
                  <span className="fmap-cell" key={target} role="cell">
                    {Math.abs(points) >= 0.5 ? (
                      <i
                        className={points > 0 ? "sl-raise" : "sl-lower"}
                        style={{ width: size, height: size }}
                        title={`${points > 0 ? "+" : "−"}${Math.abs(points).toFixed(1)} pts`}
                      >
                        {Math.abs(points) >= 4 ? Math.round(Math.abs(points)) : ""}
                      </i>
                    ) : (
                      <i className="sl-none" />
                    )}
                  </span>
                );
              })}
            </div>
          ))}
          <div className="fmap-legend" aria-hidden="true">
            <span><i className="sl-raise" /> raises</span>
            <span><i className="sl-lower" /> lowers</span>
            <span className="muted-xs">size = strength</span>
          </div>
        </div>
      )}
    </FloatingWindow>
  );
}
