import { useState } from "react";
import type {
  FeatureValue,
  FeatureDefinition,
  PredictionResponse,
  Target,
} from "../../api/types";
import { formatProbability, formatTargetUncertainty } from "../../lib/format";
import type { VesselId } from "../viewer/vesselMap";
import { InputsView } from "./InputsView";
import { WhyView } from "./WhyView";

interface RawResultProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  predictionInputs: Readonly<Record<string, FeatureValue>> | null;
  isEditedScenario: boolean;
  sampleId: string | null;
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
      aria-label={`Select ${label}. Predicted probability ${formatProbability(target.probability)}. Model label ${target.label}. Threshold ${formatProbability(target.threshold)}. ${formatTargetUncertainty(target.uncertain)}`}
      aria-pressed={selected}
      className={`probability-readout rounded-xl border bg-white p-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
        selected
          ? "border-emerald-700 ring-2 ring-emerald-700/20"
          : "border-slate-200 hover:border-emerald-400"
      }`}
      type="button"
      onClick={onClick}
    >
      <div className="flex flex-col items-start gap-0">
        <h3 className="text-[10px] font-semibold text-slate-800">{label}</h3>
        <span className="text-[15px] font-semibold tabular-nums text-slate-900">
          {formatProbability(target.probability)}
        </span>
        <span className="text-[9px] leading-3 text-slate-600">
          {target.label} · threshold {formatProbability(target.threshold)}
        </span>
      </div>
    </button>
  );
}

export function RawResult({
  prediction,
  features,
  predictionInputs,
  isEditedScenario,
  sampleId,
  selectedVessel,
  onSelectVessel,
}: RawResultProps) {
  const [activeView, setActiveView] = useState<"why" | "inputs">("why");
  const targets = [
    ["CAD", prediction.cad],
    ...(["LAD", "LCX", "RCA"] as const).map(
      (vessel) => [vessel, prediction.vessels[vessel]] as const,
    ),
  ] as const;

  return (
    <div className="space-y-1">
      <div
        aria-label="Prediction source and version"
        className={`prediction-source-badge ${
          prediction.mock ? "prediction-source-mock" : ""
        }`}
      >
        <strong>
          {prediction.mock ? "Mock prediction" : "Real-model prediction"}
        </strong>
        <span aria-label={`Model version ${prediction.model_version}`}>
          Model {prediction.model_version}
        </span>
      </div>
      {!prediction.mock && (
        <p className="scenario-provenance text-[10px] leading-4 text-slate-600">
          <strong className="mr-1 font-semibold text-slate-800">
            {isEditedScenario
              ? "Edited dataset sample"
              : sampleId
                ? "Original dataset sample"
                : "Custom input"}
          </strong>
          <span aria-hidden="true"> · </span>
          <span>Source: {prediction.prediction_source}</span>
        </p>
      )}
      <div className="grid grid-cols-4 gap-1.5">
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
      {prediction.mock ? (
        <p
          className="response-warning-status rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] leading-4 text-slate-700"
          role="status"
        >
          Real-model warning assessment is unavailable in mock v1.0.
        </p>
      ) : prediction.warnings.length > 0 ? (
        <details className="response-warning-disclosure rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] leading-4 text-amber-950">
          <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">
            Model warnings ({prediction.warnings.length}) - Show details
          </summary>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {prediction.warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p
          className="response-warning-status rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] leading-4 text-slate-700"
          role="status"
        >
          Response warnings: none returned; this is not clinical reassurance.
        </p>
      )}
      <p className="text-[10px] leading-4 text-slate-600">
        {prediction.mock
          ? "Model-set uncertainty is not returned by mock v1.0."
          : `90% sets (not an error): ${targets
              .map(
                ([label, target]) =>
                  `${label} ${target.uncertain ? "uncertain" : "single answer"}`,
              )
              .join(" · ")}`}
      </p>
      <p className="text-[10px] leading-4 text-slate-500">
        Predicted probabilities are model outputs, not diagnoses or percentage
        artery narrowing.
      </p>

      <div
        aria-label="Result detail view"
        className="result-view-toggle grid grid-cols-2 gap-2"
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
    </div>
  );
}
