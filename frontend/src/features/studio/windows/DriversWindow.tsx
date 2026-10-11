import { useMemo } from "react";
import { targetColor } from "../../../lib/colorScale";
import type { InsightTarget } from "../../../lib/insights";
import { buildDrivers, driverPillText } from "../../../lib/summary";
import { useUiStore } from "../../../store/uiStore";
import { FloatingWindow } from "../FloatingWindow";
import { IconBars } from "../icons";
import { EmptyState, ShapBadge, TargetChips } from "../parts";
import { probabilityOf, useStudioData } from "../studioData";
import { useStudioStore } from "../studioStore";

/**
 * What moves the estimate: each bar is one input, pushing right (raises) or left (lowers) from a typical patient's
 * score. Hovering a bar lights up the arteries it moves on the 3D heart.
 */
export function DriversWindow() {
  const { shown, features } = useStudioData();
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);
  const pinned = useStudioStore((state) => state.pinnedFactor);
  const target: InsightTarget = selectedVessel ?? "cad";
  const summary = useMemo(
    () =>
      shown && !shown.mock
        ? buildDrivers(
            shown.explanations[target],
            features,
            probabilityOf(shown, target),
            7,
          )
        : null,
    [features, shown, target],
  );
  const maxAbs = summary
    ? Math.max(1, ...summary.drivers.map((driver) => Math.abs(driver.points)))
    : 1;

  const choose = (next: InsightTarget) => {
    const vessel = next === "cad" ? null : next;
    useUiStore.getState().setSelectedVessel(vessel);
    useStudioStore.getState().focus(vessel);
  };

  return (
    <FloatingWindow
      accent={targetColor(target)}
      actions={<ShapBadge detail="Bars are Shapley values (SHAP) of the calibrated probability" />}
      icon={<IconBars />}
      id="drivers"
      title="Why"
    >
      <TargetChips onChange={choose} value={target} />
      {!summary ? (
        <EmptyState>Explanations appear with the real model.</EmptyState>
      ) : (
        <>
          <div className="sl-drivers-journey" aria-label="From a typical patient to this patient">
            <span>
              <small>Typical</small>
              {Math.round(summary.basePercent)}%
            </span>
            <svg aria-hidden="true" height="10" viewBox="0 0 60 10" width="60">
              <path d="M0 5h54M50 1l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="sl-drivers-journey-now">
              <small>This patient</small>
              {Math.round(summary.finalPercent)}%
            </span>
          </div>
          <div className="sl-drivers-legend" aria-hidden="true">
            <span className="sl-lower">◀ lowers</span>
            <span className="sl-raise">raises ▶</span>
          </div>
          {summary.drivers.length === 0 && (
            <EmptyState>Matches a typical patient: no input moves it.</EmptyState>
          )}
          <ul className="sl-drivers">
            {summary.drivers.map((driver) => {
              const width = (Math.abs(driver.points) / maxAbs) * 38;
              const raise = driver.points > 0;
              return (
                <li
                  className={`sl-driver${hoveredFactor === driver.feature ? " is-hot" : ""}`}
                  key={driver.feature}
                  onPointerEnter={() => setHoveredFactor(driver.feature)}
                  onPointerLeave={() => setHoveredFactor(pinned)}
                  title={`${driver.label}: ${driver.valueText}`}
                >
                  <span className="sl-driver-label">{driverPillText(driver)}</span>
                  <span className="sl-driver-track">
                    <span
                      className={`sl-driver-bar ${raise ? "sl-raise" : "sl-lower"}`}
                      style={
                        raise
                          ? { left: "50%", width: `${width}%` }
                          : { right: "50%", width: `${width}%` }
                      }
                    />
                    <span
                      className={`sl-driver-pts ${raise ? "sl-raise" : "sl-lower"}`}
                      style={
                        raise
                          ? { left: `calc(${50 + width}% + 4px)` }
                          : { right: `calc(${50 + width}% + 4px)` }
                      }
                    >
                      {raise ? "+" : "−"}
                      {Math.abs(Math.round(driver.points))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {summary.rest && (
            <p className="muted-xs sl-drivers-rest">
              +{summary.rest.count} smaller inputs ({summary.rest.points > 0 ? "+" : "−"}
              {Math.abs(Math.round(summary.rest.points))} pts)
            </p>
          )}
          <p className="muted-xs sl-method">
            Method: Shapley values (SHAP) of the calibrated probability, in percentage points from a typical
            patient. They add up exactly to this patient&apos;s estimate.
          </p>
        </>
      )}
    </FloatingWindow>
  );
}
