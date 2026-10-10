import type { PredictionResponse } from "../../api/types";
import { thresholdPosition } from "../../lib/colorScale";
import { vesselDisplay, vesselIds, type VesselId } from "./vesselMap";

export interface Pin {
  vessel: VesselId;
  probability: number;
  /** Position on the legend (0-1), relative to this artery's own threshold, matching its colour. */
  position: number;
  color: string;
  uncertain: boolean;
  lane: number;
}

/** Labels closer than this (in percentage points of the scale) go to separate lanes so they never overlap. */
const MIN_LABEL_GAP = 13;
/** Pins this close to either end hang their label inwards, so it reaches further towards its neighbour. */
export const EDGE = 0.05;
const EDGE_LABEL_GAP = 20;

export function placePins(prediction: PredictionResponse): Pin[] {
  const lastInLane: number[] = [];
  return vesselIds
    .map((vessel) => {
      const display = vesselDisplay(prediction, vessel);
      return {
        vessel,
        probability: display.target?.probability ?? 0,
        position: display.target
          ? thresholdPosition(
              display.target.probability,
              display.target.threshold,
            )
          : 0,
        color: display.color,
        uncertain: display.target?.uncertain === true,
        lane: 0,
      };
    })
    .sort((a, b) => a.position - b.position)
    .map((pin) => {
      const x = pin.position * 100;
      const gap = pin.position > 1 - EDGE ? EDGE_LABEL_GAP : MIN_LABEL_GAP;
      let lane = lastInLane.findIndex((previous) => x - previous >= gap);
      if (lane === -1) {
        lane = lastInLane.length;
      }
      lastInLane[lane] = x;
      return { ...pin, lane };
    });
}
