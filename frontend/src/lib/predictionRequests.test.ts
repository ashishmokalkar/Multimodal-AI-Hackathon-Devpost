import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PredictionResponseSchema,
  type FeatureValue,
  type PredictionResponse,
} from "../api/types";
import { usePatientStore } from "../store/patientStore";
import {
  PREDICTION_DEBOUNCE_MS,
  requestPredictionForRevision,
  schedulePrediction,
} from "./predictionRequests";

function prediction(requestId: string): PredictionResponse {
  const target = {
    probability: 0.6,
    label: "fixture label",
    threshold: 0.5,
  };
  const explanation = { base_value: 0.5, contributions: [] };

  return {
    request_id: requestId,
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
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  usePatientStore.setState({
    features: { Age: 60 },
    selectedSampleId: null,
    inputRevision: 0,
    prediction: null,
    predictionInputs: null,
    predictionError: null,
    isPredicting: false,
    predictionStatus: "initial",
    latestPredictionRequestId: 0,
  });
});

describe("fresh prediction requests", () => {
  it("ignores an old success during the 500 ms debounce and accepts the next response", async () => {
    vi.useFakeTimers();
    try {
      const old = deferred<PredictionResponse>();
      const oldRequest = requestPredictionForRevision(
        0,
        { Age: 60 },
        () => old.promise,
      );
      usePatientStore.getState().updateFeature("Age", 61);
      const revision = usePatientStore.getState().inputRevision;
      const fresh = prediction("095e7b1f-22f0-4ef0-9d30-310f769c2848");
      const startFresh = vi.fn(() =>
        requestPredictionForRevision(
          revision,
          usePatientStore.getState().features,
          async () => fresh,
        ),
      );
      schedulePrediction(() => void startFresh());

      old.resolve(prediction("095e7b1f-22f0-4ef0-9d30-310f769c2847"));
      await oldRequest;
      expect(usePatientStore.getState()).toMatchObject({
        prediction: null,
        predictionError: null,
        isPredicting: false,
      });

      await vi.advanceTimersByTimeAsync(PREDICTION_DEBOUNCE_MS - 1);
      expect(startFresh).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(startFresh).toHaveBeenCalledOnce();
      expect(usePatientStore.getState().prediction).toBe(fresh);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stores the exact request input snapshot with the accepted prediction", async () => {
    const input = { Age: 60 };
    let sentInput: Record<string, FeatureValue> | undefined;
    const response = prediction("095e7b1f-22f0-4ef0-9d30-310f769c2847");
    const request = requestPredictionForRevision(0, input, async (features) => {
      sentInput = features;
      return response;
    });

    input.Age = 99;
    await request;

    expect(sentInput).toEqual({ Age: 60 });
    expect(usePatientStore.getState()).toMatchObject({
      prediction: response,
      predictionInputs: { Age: 60 },
    });
  });

  it("ignores a stale rejection after an edit when auto-predict is off", async () => {
    const old = deferred<PredictionResponse>();
    const oldRequest = requestPredictionForRevision(
      0,
      { Age: 60 },
      () => old.promise,
    );
    usePatientStore.getState().updateFeature("Age", 62);
    old.reject(new Error("stale request failed"));
    await oldRequest;

    expect(usePatientStore.getState()).toMatchObject({
      prediction: null,
      predictionError: null,
      isPredicting: false,
    });

    const fresh = prediction("095e7b1f-22f0-4ef0-9d30-310f769c2848");
    await requestPredictionForRevision(
      usePatientStore.getState().inputRevision,
      usePatientStore.getState().features,
      async () => fresh,
    );
    expect(usePatientStore.getState().prediction).toBe(fresh);
  });

  it("does not publish a prior success after an invalid input edit", async () => {
    const old = deferred<PredictionResponse>();
    const oldRequest = requestPredictionForRevision(
      0,
      { Age: 60 },
      () => old.promise,
    );
    usePatientStore.getState().updateFeature("Age", "");
    old.resolve(prediction("095e7b1f-22f0-4ef0-9d30-310f769c2847"));
    await oldRequest;

    expect(usePatientStore.getState()).toMatchObject({
      features: { Age: "" },
      prediction: null,
      predictionError: null,
      isPredicting: false,
    });
  });

  it("prevents older successes and errors from replacing the current request", async () => {
    const oldSuccess = deferred<PredictionResponse>();
    const current = deferred<PredictionResponse>();
    const oldSuccessRequest = requestPredictionForRevision(
      0,
      { Age: 60 },
      () => oldSuccess.promise,
    );
    const currentPrediction = prediction(
      "095e7b1f-22f0-4ef0-9d30-310f769c2848",
    );
    const currentRequest = requestPredictionForRevision(
      0,
      { Age: 60 },
      () => current.promise,
    );

    oldSuccess.resolve(prediction("095e7b1f-22f0-4ef0-9d30-310f769c2847"));
    await oldSuccessRequest;
    expect(usePatientStore.getState()).toMatchObject({
      prediction: null,
      predictionError: null,
      isPredicting: true,
    });

    current.resolve(currentPrediction);
    await currentRequest;
    expect(usePatientStore.getState().prediction).toBe(currentPrediction);

    const oldError = deferred<PredictionResponse>();
    const latest = deferred<PredictionResponse>();
    const oldErrorRequest = requestPredictionForRevision(
      0,
      { Age: 60 },
      () => oldError.promise,
    );
    const latestPrediction = prediction("095e7b1f-22f0-4ef0-9d30-310f769c2849");
    const latestRequest = requestPredictionForRevision(
      0,
      { Age: 60 },
      () => latest.promise,
    );

    oldError.reject(new Error("obsolete rejection"));
    await oldErrorRequest;
    expect(usePatientStore.getState()).toMatchObject({
      prediction: null,
      predictionError: null,
      isPredicting: true,
    });

    latest.resolve(latestPrediction);
    await latestRequest;
    expect(usePatientStore.getState().prediction).toBe(latestPrediction);
  });

  it("surfaces invalid response-schema and request failures", async () => {
    await requestPredictionForRevision(0, { Age: 60 }, async () =>
      PredictionResponseSchema.parse({}),
    );
    expect(usePatientStore.getState()).toMatchObject({
      prediction: null,
      isPredicting: false,
    });
    expect(usePatientStore.getState().predictionError).toContain("request_id");

    usePatientStore.getState().updateFeature("Age", 61);
    await requestPredictionForRevision(
      usePatientStore.getState().inputRevision,
      usePatientStore.getState().features,
      async () => {
        throw new Error("Request failed");
      },
    );
    expect(usePatientStore.getState()).toMatchObject({
      prediction: null,
      predictionInputs: null,
      predictionError: "Request failed",
    });
  });
});
