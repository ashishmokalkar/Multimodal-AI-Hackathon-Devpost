import { create } from "zustand";
import type {
  FeatureValue,
  PredictionResponse,
  SamplePatient,
} from "../api/types";

interface PatientState {
  features: Record<string, FeatureValue>;
  selectedSampleId: string | null;
  prediction: PredictionResponse | null;
  predictionError: string | null;
  isPredicting: boolean;
  setFeatures: (
    features: Record<string, FeatureValue>,
    sampleId?: string | null,
  ) => void;
  setFromSample: (sample: SamplePatient) => void;
  updateFeature: (name: string, value: FeatureValue) => void;
  setPredicting: (isPredicting: boolean) => void;
  setPrediction: (prediction: PredictionResponse) => void;
  setPredictionError: (message: string) => void;
}

export const usePatientStore = create<PatientState>((set) => ({
  features: {},
  selectedSampleId: null,
  prediction: null,
  predictionError: null,
  isPredicting: false,
  setFeatures: (features, sampleId = null) =>
    set({
      features,
      selectedSampleId: sampleId,
      prediction: null,
      predictionError: null,
      isPredicting: false,
    }),
  setFromSample: (sample) =>
    set({
      features: sample.features,
      selectedSampleId: sample.id,
      prediction: null,
      predictionError: null,
      isPredicting: false,
    }),
  updateFeature: (name, value) =>
    set((state) => ({
      features: { ...state.features, [name]: value },
      selectedSampleId: null,
      prediction: null,
      predictionError: null,
      isPredicting: false,
    })),
  setPredicting: (isPredicting) => set({ isPredicting }),
  setPrediction: (prediction) =>
    set({ prediction, predictionError: null, isPredicting: false }),
  setPredictionError: (predictionError) =>
    set({ predictionError, isPredicting: false }),
}));
