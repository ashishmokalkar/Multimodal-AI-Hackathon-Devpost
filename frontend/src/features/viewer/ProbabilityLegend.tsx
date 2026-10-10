import type { PredictionResponse } from "../../api/types";
import { formatTargetUncertaintyShort } from "../../lib/format";
import { vesselDisplay, vesselIds, type VesselId } from "./vesselMap";

interface ProbabilityLegendProps {
  prediction: PredictionResponse | null;
  /** Kept for API compatibility; not used. */
  selectedVessel?: VesselId | null;
}

/** Colour legend: each artery's fixed colour, with its probability and 90% prediction-set status. */
export function ProbabilityLegend({ prediction }: ProbabilityLegendProps) {
  return (
    <div
      aria-label="Artery colour legend"
      className="viewer-legend"
      role="group"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-slate-600">
          Artery colours · probability and 90% set status
        </p>
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
