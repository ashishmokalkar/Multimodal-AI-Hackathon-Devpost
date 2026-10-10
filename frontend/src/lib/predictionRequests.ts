import type { PredictionResponse, FeatureValue } from "../api/types";
import { usePatientStore } from "../store/patientStore";

export const PREDICTION_DEBOUNCE_MS = 500;

export function schedulePrediction(
  callback: () => void,
  delay = PREDICTION_DEBOUNCE_MS,
): () => void {
  const timer = globalThis.setTimeout(callback, delay);
  return () => globalThis.clearTimeout(timer);
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The prediction request failed.";
}

export async function requestPredictionForRevision(
  expectedRevision: number,
  features: Record<string, FeatureValue>,
  request: (
    features: Record<string, FeatureValue>,
    sampleId: string | null,
  ) => Promise<PredictionResponse>,
): Promise<void> {
  const store = usePatientStore.getState();
  if (store.inputRevision !== expectedRevision) {
    return;
  }

  const requestId = store.beginPrediction(expectedRevision);
  if (requestId === null) {
    return;
  }
  const inputSnapshot = { ...features };
  const sampleIdSnapshot = store.selectedSampleId;

  try {
    const prediction = await request({ ...inputSnapshot }, sampleIdSnapshot);
    usePatientStore
      .getState()
      .resolvePrediction(
        requestId,
        expectedRevision,
        prediction,
        inputSnapshot,
      );
  } catch (error) {
    usePatientStore
      .getState()
      .rejectPrediction(requestId, expectedRevision, errorMessage(error));
  }
}
