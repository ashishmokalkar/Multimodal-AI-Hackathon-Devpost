import { RawResult } from "./RawResult";
import { useFeatures } from "../../api/hooks";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";

export function ResultsPanel() {
  const featuresQuery = useFeatures();
  const prediction = usePatientStore((state) => state.prediction);
  const predictionError = usePatientStore((state) => state.predictionError);
  const isPredicting = usePatientStore((state) => state.isPredicting);
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);

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
          <p
            className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800"
            role="alert"
          >
            Prediction failed: {predictionError}
          </p>
        )}
        {featuresQuery.isError && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900" role="alert">
            Feature labels and units could not be loaded:{" "}
            {featuresQuery.error.message}
          </p>
        )}
        {prediction ? (
          <RawResult
            prediction={prediction}
            features={featuresQuery.data ?? []}
            selectedVessel={selectedVessel}
            onSelectVessel={setSelectedVessel}
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
              <p className="text-xs text-slate-500">
                Vessel colours are neutral until a current prediction is
                available.
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
