import { RawResult } from "./RawResult";
import { usePatientStore } from "../../store/patientStore";

export function ResultsPanel() {
  const prediction = usePatientStore((state) => state.prediction);
  const predictionError = usePatientStore((state) => state.predictionError);
  const isPredicting = usePatientStore((state) => state.isPredicting);

  return (
    <section
      className="panel results-panel min-h-0"
      aria-labelledby="results-panel-heading"
    >
      <header className="panel-header">
        <div>
          <p className="eyebrow">Prediction summary</p>
          <h2 id="results-panel-heading">Results panel</h2>
        </div>
      </header>
      <div className="panel-body !justify-start overflow-y-auto">
        {isPredicting && (
          <p className="mb-4 text-xs text-slate-600" role="status">
            Calculating predicted probabilities…
          </p>
        )}
        {predictionError && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800" role="alert">
            Prediction failed: {predictionError}
          </p>
        )}
        {prediction ? (
          <RawResult
            cad={prediction.cad}
            vessels={prediction.vessels}
            contributions={prediction.explanations.cad.contributions}
            riskSummary={prediction.risk_summary}
            modelVersion={prediction.model_version}
            isMock={prediction.mock}
          />
        ) : (
          !isPredicting &&
          !predictionError && (
            <div className="empty-state">
              <div className="empty-state-mark" aria-hidden="true">
                %
              </div>
              <h3>Predicted outcomes</h3>
              <p>
                Choose a sample patient or enter clinical features to see
                predicted CAD and vessel probabilities.
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
