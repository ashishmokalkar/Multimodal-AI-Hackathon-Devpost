import { RawResult } from "./RawResult";
import { useFeatures } from "../../api/hooks";
import { predictionStatusCopy } from "../../lib/predictionStatus";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";

export function ResultsPanel() {
  const featuresQuery = useFeatures();
  const prediction = usePatientStore((state) => state.prediction);
  const predictionInputs = usePatientStore((state) => state.predictionInputs);
  const predictionError = usePatientStore((state) => state.predictionError);
  const isPredicting = usePatientStore((state) => state.isPredicting);
  const predictionStatus = usePatientStore((state) => state.predictionStatus);
  const currentStatus = prediction
    ? "ready"
    : isPredicting
      ? "pending"
      : predictionError
        ? "error"
        : predictionStatus;
  const statusCopy = predictionStatusCopy(currentStatus, predictionError);
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
        {featuresQuery.isError && (
          <p
            className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"
            role="alert"
          >
            Feature labels and units could not be loaded:{" "}
            {featuresQuery.error.message}
          </p>
        )}
        {prediction ? (
          <RawResult
            prediction={prediction}
            features={featuresQuery.data ?? []}
            predictionInputs={predictionInputs}
            selectedVessel={selectedVessel}
            onSelectVessel={setSelectedVessel}
          />
        ) : (
          statusCopy && (
            <div
              className={`prediction-status prediction-status-${currentStatus}`}
              role={statusCopy.role}
            >
              <strong>{statusCopy.label}</strong>
              <p>{statusCopy.message}</p>
              <p className="prediction-status-neutral">
                Vessel colours remain neutral until a current prediction is
                available.
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
