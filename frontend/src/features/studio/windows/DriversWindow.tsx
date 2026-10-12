import { useMemo, useState, type PointerEvent } from "react";
import { riskColor, targetColor } from "../../../lib/colorScale";
import { buildMeasurementGroups, type InsightTarget } from "../../../lib/insights";
import { buildDrivers } from "../../../lib/summary";
import { usePatientStore } from "../../../store/patientStore";
import { useUiStore } from "../../../store/uiStore";
import { useWhatIfStore } from "../../../store/whatIfStore";
import { HeartbeatLoader } from "../../loading/HeartbeatLoader";
import { FactorPeek, type PeekAnchor } from "../FactorPeek";
import { FloatingWindow } from "../FloatingWindow";
import { IconBars } from "../icons";
import { BandChip, EmptyState, ShapBadge, TargetChips } from "../parts";
import { selectTarget } from "../selection";
import { probabilityOf, useStudioData } from "../studioData";
import { targetHeadline, whyRows } from "../studioModel";
import { useStudioStore } from "../studioStore";

/**
 * The one place for explanations, for the overall result or the artery picked on the heart. Each row is one input:
 * its value against the typical range, and a bar pushing right (raises) or left (lowers) from a typical patient's
 * score. Hovering a row lights up the arteries it moves on the 3D heart and opens a small card beside the row with
 * its points for every target.
 */
export function DriversWindow() {
  const { shown, features, predictionInputs, scenario } = useStudioData();
  const whatIfValues = useWhatIfStore((state) => state.values);
  const whyFlash = useStudioStore((state) => state.whyFlash);
  const predictionError = usePatientStore((state) => state.predictionError);
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);
  const pinned = useStudioStore((state) => state.pinnedFactor);
  const [peek, setPeek] = useState<PeekAnchor | null>(null);
  const target: InsightTarget = selectedVessel ?? "cad";
  const summary = useMemo(() => {
    if (!shown || shown.mock) {
      return null;
    }
    const explanation = shown.explanations[target];
    const drivers = buildDrivers(explanation, features, probabilityOf(shown, target), 7);
    const cards = buildMeasurementGroups(
      features,
      scenario ? whatIfValues : predictionInputs,
      explanation,
    ).flatMap((group) => group.cards);
    return { ...drivers, rows: whyRows(drivers.drivers, cards) };
  }, [features, predictionInputs, scenario, shown, target, whatIfValues]);
  const maxAbs = summary
    ? Math.max(1, ...summary.rows.map((row) => Math.abs(row.points)))
    : 1;
  const headline = shown ? targetHeadline(shown, target) : null;
  const flashed = whyFlash && shown ? shown.vessels[whyFlash.vessel] : null;

  const enterRow = (feature: string, event: PointerEvent<HTMLLIElement>) => {
    setHoveredFactor(feature);
    const root = event.currentTarget.closest<HTMLElement>(".studio");
    const { top, left, bottom, height } = event.currentTarget.getBoundingClientRect();
    setPeek(root ? { feature, rect: { top, left, bottom, height }, root } : null);
  };
  const leaveRow = () => {
    setHoveredFactor(pinned);
    setPeek(null);
  };

  // the chips switch the explanation and the camera without the border flash (the eye is already here)
  const choose = (next: InsightTarget) =>
    selectTarget(next === "cad" ? null : next, { flash: false });

  return (
    <FloatingWindow
      accent={targetColor(target)}
      actions={<ShapBadge detail="Bars are Shapley values (SHAP) of the calibrated probability" />}
      flash={
        whyFlash
          ? {
              sequence: whyFlash.sequence,
              color: flashed
                ? riskColor(flashed.probability, flashed.threshold)
                : targetColor(whyFlash.vessel),
            }
          : null
      }
      icon={<IconBars />}
      id="drivers"
      title="Why"
    >
      <TargetChips onChange={choose} value={target} />
      {headline && (
        <p className="why-head">
          <b>{headline.name}</b>
          <span aria-hidden="true">·</span>
          <span className="why-head-pct">{headline.percent}%</span>
          {headline.band && <BandChip band={headline.band} small />}
          {headline.region && (
            <>
              <span aria-hidden="true">·</span>
              <span className="why-head-region">{headline.region}</span>
            </>
          )}
        </p>
      )}
      {!shown ? (
        // no prediction yet: it is being scored (or failed)
        <EmptyState>
          {predictionError ? (
            <span className="text-flag">{predictionError}</span>
          ) : (
            <HeartbeatLoader steps={["Scoring"]} variant="inline" />
          )}
        </EmptyState>
      ) : !summary ? (
        // the mock API returns no explanations
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
          {summary.rows.length === 0 && (
            <EmptyState>Matches a typical patient: no input moves it.</EmptyState>
          )}
          <ul className="sl-drivers">
            {summary.rows.map((driver) => {
              const width = (Math.abs(driver.points) / maxAbs) * 38;
              const raise = driver.points > 0;
              return (
                <li
                  className={`sl-driver${hoveredFactor === driver.feature ? " is-hot" : ""}`}
                  key={driver.feature}
                  onPointerEnter={(event) => enterRow(driver.feature, event)}
                  onPointerLeave={leaveRow}
                  title={`${driver.label}: ${driver.valueText}${driver.rangeText ? ` (typical ${driver.rangeText})` : ""}`}
                >
                  <span className="sl-driver-info">
                    <span className="sl-driver-line">
                      <span className="sl-driver-label">{driver.label}</span>
                      <span className="sl-driver-value">{driver.valueText}</span>
                      {driver.status === "high" && <em className="sl-tile-flag">High</em>}
                      {driver.status === "low" && <em className="sl-tile-flag">Low</em>}
                    </span>
                    {driver.bar && (
                      <span className="sl-tile-bar sl-driver-range" aria-hidden="true">
                        <i
                          className="sl-tile-band"
                          style={{
                            left: `${driver.bar.bandStart}%`,
                            width: `${driver.bar.bandEnd - driver.bar.bandStart}%`,
                          }}
                        />
                        <i
                          className="sl-tile-marker"
                          style={{ left: `${Math.min(100, Math.max(0, driver.bar.marker))}%` }}
                        />
                      </span>
                    )}
                  </span>
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
          {peek && hoveredFactor === peek.feature && (
            <FactorPeek anchor={peek} current={target} features={features} prediction={shown} />
          )}
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
