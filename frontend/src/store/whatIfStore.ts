import { create } from "zustand";
import type { FeatureValue, PredictionResponse } from "../api/types";
import { usePatientStore } from "./patientStore";

/**
 * A what-if scenario derived from the accepted prediction: the patient's inputs with some modifiable risk
 * factors changed, and the model's answer for that scenario. The accepted prediction itself is never changed.
 */
interface WhatIfState {
  baseKey: string | null;
  baseValues: Record<string, FeatureValue>;
  values: Record<string, FeatureValue>;
  prediction: PredictionResponse | null;
  pending: boolean;
  error: string | null;
  revision: number;
  open: (baseKey: string, values: Record<string, FeatureValue>) => void;
  setValue: (name: string, value: FeatureValue) => void;
  resolve: (revision: number, prediction: PredictionResponse) => void;
  fail: (revision: number, message: string) => void;
  reset: () => void;
}

export function hasChanges(
  base: Readonly<Record<string, FeatureValue>>,
  values: Readonly<Record<string, FeatureValue>>,
): boolean {
  return Object.keys(values).some(
    (name) => !Object.is(base[name], values[name]),
  );
}

export const useWhatIfStore = create<WhatIfState>((set) => ({
  baseKey: null,
  baseValues: {},
  values: {},
  prediction: null,
  pending: false,
  error: null,
  revision: 0,
  open: (baseKey, values) =>
    set((state) =>
      state.baseKey === baseKey
        ? state
        : {
            baseKey,
            baseValues: { ...values },
            values: { ...values },
            prediction: null,
            pending: false,
            error: null,
            revision: state.revision + 1,
          },
    ),
  setValue: (name, value) =>
    set((state) => ({
      values: { ...state.values, [name]: value },
      pending: true,
      error: null,
      revision: state.revision + 1,
    })),
  resolve: (revision, prediction) =>
    set((state) =>
      state.revision === revision ? { prediction, pending: false } : state,
    ),
  fail: (revision, error) =>
    set((state) =>
      state.revision === revision ? { error, pending: false } : state,
    ),
  reset: () =>
    set((state) => ({
      values: { ...state.baseValues },
      prediction: null,
      pending: false,
      error: null,
      revision: state.revision + 1,
    })),
}));

/**
 * The scenario prediction to display instead of the accepted one, or null when no scenario is active. A scenario
 * only applies to the accepted prediction it was built from, so switching patients never shows a stale one.
 */
export function useActiveScenario(): PredictionResponse | null {
  const acceptedId = usePatientStore(
    (state) => state.prediction?.request_id ?? null,
  );
  return useWhatIfStore((state) =>
    state.prediction &&
    state.baseKey !== null &&
    state.baseKey === acceptedId &&
    hasChanges(state.baseValues, state.values)
      ? state.prediction
      : null,
  );
}
