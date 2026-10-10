import { useState } from "react";
import type {
  FeatureValue,
  FeatureDefinition,
  PredictionResponse,
} from "../../api/types";
import type { VesselId } from "../viewer/vesselMap";
import { RealResult } from "./RealResult";
import { InputsView } from "./InputsView";
import { RiskOverview } from "./RiskOverview";
import { WhyView } from "./WhyView";

export interface RawResultProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  predictionInputs: Readonly<Record<string, FeatureValue>> | null;
  isEditedScenario: boolean;
  sampleId: string | null;
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
}

function MockResult({
  prediction,
  features,
  predictionInputs,
  isEditedScenario,
  sampleId,
  selectedVessel,
  onSelectVessel,
}: RawResultProps) {
  const [activeView, setActiveView] = useState<"why" | "inputs">("why");

  return (
    <div className="space-y-3">
      <div
        aria-label="Prediction source and version"
        className={`prediction-source-badge ${
          prediction.mock ? "prediction-source-mock" : ""
        }`}
      >
        <span className="prediction-source-line">
          <strong>
            {prediction.mock ? "Mock prediction" : "Real-model prediction"}
          </strong>
          {prediction.mock && (
            <span className="ml-auto">
              Model version {prediction.model_version}
            </span>
          )}
          {!prediction.mock && (
            <span className="prediction-source-scenario">
              {isEditedScenario
                ? "Edited dataset-sample scenario"
                : sampleId
                  ? "Original dataset-sample scenario"
                  : "Custom input scenario"}
            </span>
          )}
        </span>
        {!prediction.mock && (
          <span className="prediction-source-detail">
            Model version {prediction.model_version} · Prediction source:{" "}
            {prediction.prediction_source}
          </span>
        )}
      </div>
      <RiskOverview
        prediction={prediction}
        scenario={null}
        selectedVessel={selectedVessel}
        onSelectVessel={onSelectVessel}
      />
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

      {
        <>
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
        </>
      }

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {prediction.risk_summary}
      </p>
      {prediction.mock && (
        <p className="text-[10px] leading-4 text-slate-600">
          Model-set uncertainty is not returned by mock v1.0.
        </p>
      )}
      <p className="text-[10px] leading-4 text-slate-500">
        Predicted probabilities are model outputs, not diagnoses or percentage
        artery narrowing.
      </p>
    </div>
  );
}

export function RawResult(props: RawResultProps) {
  return props.prediction.mock ? (
    <MockResult {...props} />
  ) : (
    <RealResult {...props} />
  );
}
