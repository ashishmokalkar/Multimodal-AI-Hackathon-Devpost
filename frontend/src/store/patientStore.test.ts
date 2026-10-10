import { beforeEach, describe, expect, it } from "vitest";
import type { PredictionResponse, SamplePatient } from "../api/types";
import { usePatientStore } from "./patientStore";

const sample: SamplePatient = {
  id: "sample-1",
  label: "Sample patient",
  features: { Age: 67 },
  synthetic: true,
};

const target = { probability: 0.5, label: "fixture", threshold: 0.5 };
const explanation = { base_value: 0.5, contributions: [] };
const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "fixture",
  cad: target,
  vessels: { LAD: target, LCX: target, RCA: target },
  explanations: {
    cad: explanation,
    LAD: explanation,
    LCX: explanation,
    RCA: explanation,
  },
  risk_summary: "Fixture response.",
  mock: true,
};
const realTarget = { ...target, uncertain: false };
const realExplanation = {
  base_value: 0.5,
  contributions: [],
  scale: "probability" as const,
  method: "Fixture attribution",
};
const warningPrediction: PredictionResponse = {
  ...prediction,
  cad: realTarget,
  vessels: { LAD: realTarget, LCX: realTarget, RCA: realTarget },
  explanations: {
    cad: realExplanation,
    LAD: realExplanation,
    LCX: realExplanation,
    RCA: realExplanation,
  },
  mock: false,
  warnings: ["Fixture reliability warning."],
  derived: { BMI: 24.2, Obesity: false },
  prediction_source: "Fixture source",
};

function acceptWarningPrediction() {
  const state = usePatientStore.getState();
  const requestId = state.beginPrediction(state.inputRevision);
  if (requestId === null) {
    throw new Error("Fixture prediction request could not start.");
  }
  const accepted = usePatientStore
    .getState()
    .resolvePrediction(requestId, state.inputRevision, warningPrediction, {
      Age: 67,
    });
  if (!accepted) {
    throw new Error("Fixture warning prediction was not accepted.");
  }
}

beforeEach(() => {
  usePatientStore.setState({
    features: {},
    selectedSampleId: null,
    sampleOriginFeatures: null,
    inputRevision: 0,
    prediction: null,
    predictionInputs: null,
    predictionError: null,
    isPredicting: false,
    predictionStatus: "initial",
    latestPredictionRequestId: 0,
  });
});

describe("patientStore prediction invalidation", () => {
  it("increments the input revision and clears results for edits, samples, and reset", () => {
    const store = usePatientStore.getState();

    store.updateFeature("Age", 60);
    expect(usePatientStore.getState().inputRevision).toBe(1);
    usePatientStore.setState({
      prediction,
      predictionInputs: { Age: 67 },
    });
    usePatientStore.getState().updateFeature("Age", 61);
    expect(usePatientStore.getState()).toMatchObject({
      inputRevision: 2,
      selectedSampleId: null,
      sampleOriginFeatures: null,
      prediction: null,
      predictionInputs: null,
    });

    usePatientStore.setState({
      prediction,
      predictionInputs: { Age: 60 },
      predictionError: "old error",
      isPredicting: true,
    });
    usePatientStore.getState().setFromSample(sample);
    expect(usePatientStore.getState()).toMatchObject({
      inputRevision: 3,
      selectedSampleId: "sample-1",
      sampleOriginFeatures: { Age: 67 },
      prediction: null,
      predictionInputs: null,
      predictionError: null,
      isPredicting: false,
      predictionStatus: "edited",
    });
    usePatientStore.getState().updateFeature("Age", 68);
    expect(usePatientStore.getState()).toMatchObject({
      inputRevision: 4,
      selectedSampleId: "sample-1",
      sampleOriginFeatures: { Age: 67 },
      prediction: null,
      predictionInputs: null,
    });

    usePatientStore.setState({
      prediction,
      predictionInputs: { Age: 60 },
      predictionError: "old error",
      isPredicting: true,
    });
    usePatientStore.getState().setFeatures({ Age: 55 });
    expect(usePatientStore.getState()).toMatchObject({
      inputRevision: 5,
      selectedSampleId: null,
      sampleOriginFeatures: null,
      prediction: null,
      predictionInputs: null,
      predictionError: null,
      isPredicting: false,
      predictionStatus: "edited",
    });
  });

  it("invalidates in-flight predictions and sample provenance when the API profile changes", () => {
    usePatientStore.getState().setFromSample(sample);
    usePatientStore
      .getState()
      .beginPrediction(usePatientStore.getState().inputRevision);
    const previousRequestId =
      usePatientStore.getState().latestPredictionRequestId;

    usePatientStore.getState().resetForProfileChange();

    expect(usePatientStore.getState()).toMatchObject({
      features: {},
      selectedSampleId: null,
      sampleOriginFeatures: null,
      prediction: null,
      predictionInputs: null,
      predictionError: null,
      isPredicting: false,
      predictionStatus: "initial",
      latestPredictionRequestId: previousRequestId + 1,
    });
  });

  it("clears the accepted input snapshot as soon as a replacement request starts", () => {
    usePatientStore.setState({
      prediction,
      predictionInputs: { Age: 67 },
    });

    const requestId = usePatientStore
      .getState()
      .beginPrediction(usePatientStore.getState().inputRevision);

    expect(requestId).not.toBeNull();
    expect(usePatientStore.getState()).toMatchObject({
      prediction: null,
      predictionInputs: null,
      isPredicting: true,
      predictionStatus: "pending",
    });
  });

  it("clears accepted warning-bearing results on edits, sample/reset changes, replacement requests, errors, and profile changes", () => {
    usePatientStore.getState().setFeatures({ Age: 67 });
    acceptWarningPrediction();
    expect(usePatientStore.getState().prediction).toMatchObject({
      mock: false,
      warnings: ["Fixture reliability warning."],
    });

    usePatientStore.getState().updateFeature("Age", 68);
    expect(usePatientStore.getState().prediction).toBeNull();

    acceptWarningPrediction();
    usePatientStore.getState().setFromSample(sample);
    expect(usePatientStore.getState().prediction).toBeNull();

    usePatientStore.getState().setFeatures({ Age: 55 });
    expect(usePatientStore.getState().prediction).toBeNull();

    acceptWarningPrediction();
    const revision = usePatientStore.getState().inputRevision;
    const requestId = usePatientStore.getState().beginPrediction(revision);
    expect(usePatientStore.getState().prediction).toBeNull();
    if (requestId === null) {
      throw new Error("Replacement prediction request could not start.");
    }
    usePatientStore
      .getState()
      .rejectPrediction(requestId, revision, "Fixture request failed.");
    expect(usePatientStore.getState().prediction).toBeNull();

    acceptWarningPrediction();
    usePatientStore.getState().resetForProfileChange();
    expect(usePatientStore.getState().prediction).toBeNull();
  });
});
