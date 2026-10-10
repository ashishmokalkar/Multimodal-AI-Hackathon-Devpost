import { useState } from "react";
import type {
  FeatureValue,
  FeatureDefinition,
  PredictionResponse,
  Target,
} from "../../api/types";
import { formatProbability } from "../../lib/format";
import type { VesselId } from "../viewer/vesselMap";
import { InputsView } from "./InputsView";
import { WhyView } from "./WhyView";

interface RawResultProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  predictionInputs: Readonly<Record<string, FeatureValue>> | null;
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
}

function ProbabilityReadout({
  label,
  target,
  selected,
  onClick,
}: {
  label: string;
  target: Target;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Select ${label}. Predicted probability ${formatProbability(target.probability)}. Model label ${target.label}. Threshold ${formatProbability(target.threshold)}.`}
      aria-pressed={selected}
      className={`rounded-xl border bg-white p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
        selected
          ? "border-emerald-700 ring-2 ring-emerald-700/20"
          : "border-slate-200 hover:border-emerald-400"
      }`}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
          Model output
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {formatProbability(target.probability)}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Predicted {target.label} · model threshold{" "}
        {formatProbability(target.threshold)}
      </p>
    </button>
  );
}

export function RawResult({
  prediction,
  features,
  predictionInputs,
  selectedVessel,
  onSelectVessel,
}: RawResultProps) {
  const [activeView, setActiveView] = useState<"why" | "inputs">("why");
  const targetName = selectedVessel ?? "CAD";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <ProbabilityReadout
          label="CAD"
          target={prediction.cad}
          selected={selectedVessel === null}
          onClick={() => onSelectVessel(null)}
        />
        {(["LAD", "LCX", "RCA"] as const).map((vessel) => (
          <ProbabilityReadout
            key={vessel}
            label={vessel}
            target={prediction.vessels[vessel]}
            selected={selectedVessel === vessel}
            onClick={() => onSelectVessel(vessel)}
          />
        ))}
      </div>
      <p className="text-[11px] leading-4 text-slate-500">
        Predicted probabilities are model outputs, not diagnoses or percentage
        artery narrowing.
      </p>

      <p className="text-xs font-semibold text-slate-700">
        Selected explanation target: {targetName}
      </p>
      <div
        aria-label="Result detail view"
        className="grid grid-cols-2 gap-2"
        role="group"
      >
        <button
          aria-pressed={activeView === "why"}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
            activeView === "why"
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
          }`}
          type="button"
          onClick={() => setActiveView("why")}
        >
          Why?
        </button>
        <button
          aria-pressed={activeView === "inputs"}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
            activeView === "inputs"
              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
          }`}
          type="button"
          onClick={() => setActiveView("inputs")}
        >
          Inputs
        </button>
      </div>
      {activeView === "why" ? (
        <WhyView
          features={features}
          prediction={prediction}
          selectedVessel={selectedVessel}
        />
      ) : (
        <InputsView
          features={features}
          prediction={prediction}
          predictionInputs={predictionInputs}
          selectedVessel={selectedVessel}
        />
      )}

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {prediction.risk_summary}
      </p>
      <p className="text-[10px] text-slate-500">
        Model: {prediction.model_version}
        {prediction.mock ? " · Mock prediction" : ""}
      </p>
    </div>
  );
}
