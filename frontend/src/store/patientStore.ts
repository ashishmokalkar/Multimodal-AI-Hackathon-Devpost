import { create } from "zustand";
import type {
  FeatureValue,
  PredictionResponse,
  SamplePatient,
} from "../api/types";
import type { PredictionStatus } from "../lib/predictionStatus";

interface PatientState {
  features: Record<string, FeatureValue>;
  selectedSampleId: string | null;
  inputRevision: number;
  prediction: PredictionResponse | null;
  predictionInputs: Record<string, FeatureValue> | null;
  predictionError: string | null;
  isPredicting: boolean;
  predictionStatus: PredictionStatus;
  latestPredictionRequestId: number;
  setPredictionStatus: (status: PredictionStatus) => void;
  setFeatures: (
    features: Record<string, FeatureValue>,
    sampleId?: string | null,
  ) => void;
  setFromSample: (sample: SamplePatient) => void;
  updateFeature: (name: string, value: FeatureValue) => void;
  beginPrediction: (expectedRevision: number) => number | null;
  resolvePrediction: (
    requestId: number,
    expectedRevision: number,
    prediction: PredictionResponse,
    inputSnapshot: Record<string, FeatureValue>,
  ) => boolean;
  rejectPrediction: (
    requestId: number,
    expectedRevision: number,
    message: string,
  ) => boolean;
}

export const usePatientStore = create<PatientState>((set) => ({
  features: {},
  selectedSampleId: null,
  inputRevision: 0,
  prediction: null,
  predictionInputs: null,
  predictionError: null,
  isPredicting: false,
  predictionStatus: "initial",
  latestPredictionRequestId: 0,
  setPredictionStatus: (predictionStatus) => set({ predictionStatus }),
  setFeatures: (features, sampleId = null) =>
    set((state) => ({
      features,
      selectedSampleId: sampleId,
      inputRevision: state.inputRevision + 1,
      prediction: null,
      predictionInputs: null,
      predictionError: null,
      isPredicting: false,
      predictionStatus:
        state.inputRevision > 0 || state.latestPredictionRequestId > 0
          ? "edited"
          : "initial",
    })),
  setFromSample: (sample) =>
    set((state) => ({
      features: sample.features,
      selectedSampleId: sample.id,
      inputRevision: state.inputRevision + 1,
      prediction: null,
      predictionInputs: null,
      predictionError: null,
      isPredicting: false,
      predictionStatus: "edited",
    })),
  updateFeature: (name, value) =>
    set((state) => ({
      features: { ...state.features, [name]: value },
      selectedSampleId: null,
      inputRevision: state.inputRevision + 1,
      prediction: null,
      predictionInputs: null,
      predictionError: null,
      isPredicting: false,
      predictionStatus: "edited",
    })),
  beginPrediction: (expectedRevision) => {
    let requestId: number | null = null;
    set((state) => {
      if (state.inputRevision !== expectedRevision) {
        return state;
      }
      requestId = state.latestPredictionRequestId + 1;
      return {
        latestPredictionRequestId: requestId,
        prediction: null,
        predictionInputs: null,
        predictionError: null,
        isPredicting: true,
        predictionStatus: "pending",
      };
    });
    return requestId;
  },
  resolvePrediction: (
    requestId,
    expectedRevision,
    prediction,
    inputSnapshot,
  ) => {
    let accepted = false;
    set((state) => {
      if (
        state.inputRevision !== expectedRevision ||
        state.latestPredictionRequestId !== requestId
      ) {
        return state;
      }
      accepted = true;
      return {
        prediction,
        predictionInputs: { ...inputSnapshot },
        predictionError: null,
        isPredicting: false,
        predictionStatus: "ready",
      };
    });
    return accepted;
  },
  rejectPrediction: (requestId, expectedRevision, predictionError) => {
    let accepted = false;
    set((state) => {
      if (
        state.inputRevision !== expectedRevision ||
        state.latestPredictionRequestId !== requestId
      ) {
        return state;
      }
      accepted = true;
      return {
        prediction: null,
        predictionInputs: null,
        predictionError,
        isPredicting: false,
        predictionStatus: "error",
      };
    });
    return accepted;
  },
}));
