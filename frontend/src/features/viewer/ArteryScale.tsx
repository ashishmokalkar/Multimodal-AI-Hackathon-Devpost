import type { PredictionResponse } from "../../api/types";
import { COLOR_SCALE_GRADIENT } from "../../lib/colorScale";
import { formatProbability, formatTargetUncertainty } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";
import { UNAVAILABLE_VESSEL_COLOR, vesselMap } from "./vesselMap";
import { EDGE, placePins } from "./arteryPins";
import {
  selectedPredictionTarget,
  thresholdMarkerStyle,
} from "./probabilityLegendHelpers";

interface ArteryScaleProps {
  prediction: PredictionResponse | null;
}

const LANE_H = 20;

/** Labels near either end of the scale hang inwards so they stay inside the panel. */
function pinAlign(probability: number): string {
  return probability < EDGE
    ? "artery-pin-start"
    : probability > 1 - EDGE
      ? "artery-pin-end"
      : "";
}

/**
 * The 3D colour legend as a chart: the probability colour scale with each artery pinned where its estimate sits,
 * so colour on the heart can be read back to a number. Pins mirror the heart's hover and selection.
 */
export function ArteryScale({ prediction }: ArteryScaleProps) {
  const hoveredVessel = useUiStore((state) => state.hoveredVessel);
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);
  const pins = prediction ? placePins(prediction) : [];
  const lanes = Math.max(1, ...pins.map((pin) => pin.lane + 1));
  // The selected target's own decision threshold; the 50% colour midpoint is not one.
  const { name: thresholdName, target: thresholdTarget } =
    selectedPredictionTarget(prediction, selectedVessel);

  return (
    <div
      aria-label="Predicted probability colour legend"
      className="artery-scale"
      role="group"
    >
      <div className="artery-scale-head">
        <p>
          Artery colour = predicted probability <span>(not % narrowing)</span>
        </p>
        <span className="artery-scale-note">
          <i aria-hidden="true" className="artery-scale-pulse" /> pulsing =
          uncertain
          {selectedVessel && (
            <button
              className="artery-scale-back"
              type="button"
              onClick={() => setSelectedVessel(null)}
            >
              Back to CAD
            </button>
          )}
        </span>
      </div>

      {prediction ? (
        <div
          className="artery-scale-pins"
          style={{ height: lanes * LANE_H + 6 }}
        >
          {pins.map((pin) => {
            const active =
              hoveredVessel === pin.vessel || selectedVessel === pin.vessel;
            return (
              <div
                className={`artery-pin ${pinAlign(pin.probability)} ${active ? "artery-pin-active" : ""}`}
                key={pin.vessel}
                style={{
                  left: `${pin.probability * 100}%`,
                  height: (lanes - pin.lane) * LANE_H + 6,
                }}
              >
                <span aria-hidden="true" className="artery-pin-stem" />
                <button
                  aria-label={`${pin.vessel} (${vesselMap[pin.vessel].label}) ${formatProbability(pin.probability)}. ${formatTargetUncertainty(pin.uncertain)} Select on the heart.`}
                  aria-pressed={selectedVessel === pin.vessel}
                  className="artery-pin-label"
                  type="button"
                  onBlur={() => setHoveredVessel(null)}
                  onClick={() => setSelectedVessel(pin.vessel)}
                  onFocus={() => setHoveredVessel(pin.vessel)}
                  onMouseEnter={() => setHoveredVessel(pin.vessel)}
                  onMouseLeave={() => setHoveredVessel(null)}
                >
                  <i
                    aria-hidden="true"
                    className={
                      pin.uncertain
                        ? "artery-pin-dot artery-pin-dot-uncertain"
                        : "artery-pin-dot"
                    }
                    style={{ backgroundColor: pin.color }}
                  />
                  {pin.vessel} {Math.round(pin.probability * 100)}%
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="artery-scale-empty">
          <i
            aria-hidden="true"
            style={{ backgroundColor: UNAVAILABLE_VESSEL_COLOR }}
          />
          Arteries stay grey until a current prediction is available.
        </p>
      )}

      <div
        aria-hidden="true"
        className="artery-scale-bar"
        style={{ background: COLOR_SCALE_GRADIENT }}
      >
        {thresholdTarget && (
          <span
            className="artery-scale-threshold"
            data-threshold-marker="true"
            style={thresholdMarkerStyle(thresholdTarget.threshold)}
          />
        )}
      </div>
      <div aria-hidden="true" className="artery-scale-ticks">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
      {thresholdTarget && (
        <p className="artery-scale-threshold-note">
          <i aria-hidden="true" />
          {thresholdName} decision threshold:{" "}
          {formatProbability(thresholdTarget.threshold)}. The 50% colour
          midpoint is not a threshold.
        </p>
      )}
    </div>
  );
}
