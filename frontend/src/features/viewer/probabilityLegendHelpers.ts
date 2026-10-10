import type { CSSProperties } from "react";
import type { PredictionResponse, Target } from "../../api/types";
import type { VesselId } from "./vesselMap";

interface SelectedPredictionTarget {
  name: string;
  target: Target | undefined;
}

export function selectedPredictionTarget(
  prediction: PredictionResponse | null,
  selectedVessel: VesselId | null,
): SelectedPredictionTarget {
  return {
    name: selectedVessel ?? "CAD",
    target: selectedVessel
      ? prediction?.vessels[selectedVessel]
      : prediction?.cad,
  };
}

export function thresholdMarkerStyle(threshold: number): CSSProperties {
  return {
    left: `${threshold * 100}%`,
    transform:
      threshold === 0
        ? "translateX(0)"
        : threshold === 1
          ? "translateX(-100%)"
          : "translateX(-50%)",
  };
}
