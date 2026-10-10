import { RawResult } from "./RawResult";
import { useFeatures } from "../../api/hooks";
import { predictionStatusCopy } from "../../lib/predictionStatus";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import {
  isAwaitingPrediction,
  usePatientStore,
} from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";

export function ResultsPanel() {
  const featuresQuery = useFeatures();
  const prediction = usePatientStore((state) => state.prediction);
  const predictionInputs = usePatientStore((state) => state.predictionInputs);
  const selectedSampleId = usePatientStore((state) => state.selectedSampleId);
  const sampleOriginFeatures = usePatientStore(
    (state) => state.sampleOriginFeatures,
  );
  const predictionError = usePatientStore((state) => state.predictionError);
  const isPredicting = usePatientStore((state) => state.isPredicting);
  const predictionStatus = usePatientStore((state) => state.predictionStatus);
  const awaitingPrediction = usePatientStore(isAwaitingPrediction);
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
  const isEditedScenario =
    prediction?.mock === false &&
    selectedSampleId !== null &&
    sampleOriginFeatures !== null &&
    predictionInputs !== null &&
    (Object.keys(sampleOriginFeatures).length !==
      Object.keys(predictionInputs).length ||
      Object.entries(sampleOriginFeatures).some(
        ([feature, value]) =>
          !Object.prototype.hasOwnProperty.call(predictionInputs, feature) ||
          !Object.is(predictionInputs[feature], value),
      ));

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
            isEditedScenario={isEditedScenario}
            sampleId={selectedSampleId}
            selectedVessel={selectedVessel}
            onSelectVessel={setSelectedVessel}
          />
        ) : awaitingPrediction ? (
          <HeartbeatLoader title="Preparing the explanation" />
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
