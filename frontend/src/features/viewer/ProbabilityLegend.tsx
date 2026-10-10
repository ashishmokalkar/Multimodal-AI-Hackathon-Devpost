import type { PredictionResponse } from "../../api/types";
import { formatProbability, formatTargetUncertaintyShort } from "../../lib/format";
import {
  vesselDisplay,
  vesselIds,
  type VesselId,
} from "./vesselMap";
import {
  selectedPredictionTarget,
  thresholdMarkerStyle,
} from "./probabilityLegendHelpers";

interface ProbabilityLegendProps {
  prediction: PredictionResponse | null;
  selectedVessel: VesselId | null;
}

export function ProbabilityLegend({
  prediction,
  selectedVessel,
}: ProbabilityLegendProps) {
  const { name: selectedTargetName, target: selectedTarget } =
    selectedPredictionTarget(prediction, selectedVessel);

  return (
    <div
      aria-label="Predicted probability colour legend and selected-target decision threshold"
      className="viewer-legend"
      role="group"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-slate-600">
          Predicted probability (not narrowing) · 90% set status
        </p>
        <div
          className="relative h-2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #2e7d32 0%, #f9a825 50%, #c62828 100%)",
          }}
        >
          {selectedTarget && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 bg-slate-950 ring-1 ring-white"
              data-threshold-marker="true"
              style={thresholdMarkerStyle(selectedTarget.threshold)}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] tabular-nums text-slate-500">
          <span>0%</span>
          <span>50% colour midpoint</span>
          <span>100%</span>
        </div>
        {selectedTarget && (
          <p className="flex flex-wrap items-center gap-x-1 text-[10px] leading-4 text-slate-600">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-0.5 bg-slate-950 ring-1 ring-white"
            />
            <span>
              Selected-target decision threshold for {selectedTargetName}:{" "}
              {formatProbability(selectedTarget.threshold)}. The 50% colour
              midpoint is not a decision threshold; uncertainty is shown
              separately.
            </span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {vesselIds.map((vessel) => {
          const display = vesselDisplay(prediction, vessel);
          return (
            <span className="inline-flex items-center gap-1.5" key={vessel}>
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: display.color }}
              />
              <span className="whitespace-nowrap">
                {vessel} {display.percentage} ·{" "}
                {formatTargetUncertaintyShort(display.target?.uncertain)}
              </span>
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: "#94a3b8" }}
          />
          <span>Unavailable</span>
        </span>
      </div>
    </div>
  );
}
