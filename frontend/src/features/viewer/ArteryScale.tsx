import type { PredictionResponse } from "../../api/types";
import { NEUTRAL_TRACK_GRADIENT } from "../../lib/colorScale";
import { formatProbability, formatTargetUncertainty } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";
import { UNAVAILABLE_VESSEL_COLOR, vesselMap } from "./vesselMap";
import { EDGE, placePins } from "./arteryPins";

interface ArteryScaleProps {
  prediction: PredictionResponse | null;
}

const LANE_H = 20;

/** Labels near either end of the scale hang inwards so they stay inside the panel. */
function pinAlign(position: number): string {
  return position < EDGE
    ? "artery-pin-start"
    : position > 1 - EDGE
      ? "artery-pin-end"
      : "";
}

/**
 * Legend under the heart: each artery, in its own colour, is pinned on a neutral track by how its chance compares
 * with its own decision threshold (the middle of the track), labelled with its actual probability. Pins mirror the
 * heart's hover and selection.
 */
export function ArteryScale({ prediction }: ArteryScaleProps) {
  const hoveredVessel = useUiStore((state) => state.hoveredVessel);
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);
  const pins = prediction ? placePins(prediction) : [];
  const lanes = Math.max(1, ...pins.map((pin) => pin.lane + 1));

  return (
    <div
      aria-label="Colour legend: probability relative to each artery's own decision threshold"
      className="artery-scale"
      role="group"
    >
      <div className="artery-scale-head">
        <p>
          Each artery against its own threshold{" "}
          <span>(chance, not % narrowing)</span>
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
                className={`artery-pin ${pinAlign(pin.position)} ${active ? "artery-pin-active" : ""}`}
                key={pin.vessel}
                style={{
                  left: `${pin.position * 100}%`,
                  height: (lanes - pin.lane) * LANE_H + 6,
                }}
              >
                <span aria-hidden="true" className="artery-pin-stem" />
                <button
                  aria-label={`${pin.vessel} ${Math.round(pin.probability * 100)}%: ${vesselMap[pin.vessel].label}, ${formatProbability(pin.probability)}. ${formatTargetUncertainty(pin.uncertain)} Select on the heart.`}
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
        style={{ background: NEUTRAL_TRACK_GRADIENT }}
      >
        <span className="artery-scale-threshold" />
      </div>
      <div aria-hidden="true" className="artery-scale-ticks">
        <span>0%</span>
        <span>below threshold</span>
        <span className="artery-scale-ticks-mid">threshold</span>
        <span>above threshold</span>
        <span>100%</span>
      </div>
    </div>
  );
}
