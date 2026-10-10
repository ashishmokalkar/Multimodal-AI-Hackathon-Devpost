import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MetricsResponse } from "../../api/types";
import { ModelMetricsDrawer } from "./ModelMetricsDrawer";

const metrics: MetricsResponse = {
  model_version: "metrics-v2",
  validation: "Held-out synthetic fixture",
  n_samples: 1234,
  trained_at: "2026-10-01T00:00:00Z",
  targets: {
    cad: {
      accuracy: 0.81,
      precision: 0.82,
      recall: 0.83,
      f1: 0.84,
      roc_auc: 0.85,
    },
    LAD: {
      accuracy: 0.91,
      precision: 0.92,
      recall: 0.93,
      f1: 0.94,
      roc_auc: 0.95,
    },
    LCX: {
      accuracy: 0.71,
      precision: 0.72,
      recall: 0.73,
      f1: 0.74,
      roc_auc: 0.75,
    },
    RCA: {
      accuracy: 0.61,
      precision: 0.62,
      recall: 0.63,
      f1: 0.64,
      roc_auc: 0.65,
    },
  },
  mock: true,
};

const returnFocusRef = createRef<HTMLButtonElement>();
const realTargetMetrics = {
  accuracy: 0.81,
  precision: 0.82,
  recall: 0.83,
  f1: 0.84,
  roc_auc: 0.85,
  roc_auc_ci95: [0.8, 0.9] as [number, number],
  balanced_accuracy: 0.86,
  brier: 0.123,
  ece: 0.045,
  threshold: 0.68,
  model: "Explainable Boosting Machine (EBM)",
};
const realMetrics: MetricsResponse = {
  model_version: "cardiotwin-v2.0.0",
  validation: "Fixed-fold repeated stratified cross-validation",
  n_samples: 303,
  trained_at: "2026-10-10T10:22:44Z",
  targets: {
    cad: realTargetMetrics,
    LAD: { ...realTargetMetrics, model: "CatBoost" },
    LCX: { ...realTargetMetrics, model: "XGBoost" },
    RCA: { ...realTargetMetrics, model: "Stacked ensemble of 8 models" },
  },
  mock: false,
};

function render(
  query: {
    data: MetricsResponse | undefined;
    isError: boolean;
    isFetching: boolean;
    isPending: boolean;
    error: Error | null;
    refetch: () => Promise<unknown>;
  },
  predictionVersion: string | null = null,
  predictionMock: boolean | null = null,
  predictionSource: string | null = null,
) {
  return renderToStaticMarkup(
    createElement(ModelMetricsDrawer, {
      open: true,
      onClose: () => undefined,
      predictionVersion,
      predictionMock,
      predictionSource,
      returnFocusRef,
      metricsQuery: query,
    }),
  );
}

describe("ModelMetricsDrawer", () => {
  it("renders all target metrics and metadata with an explicit version mismatch", () => {
    const markup = render(
      {
        data: metrics,
        isError: false,
        isFetching: false,
        isPending: false,
        error: null,
        refetch: async () => undefined,
      },
      "prediction-v1",
    );

    expect(markup).toContain(
      "Mock metrics — illustrative only, not deployed-model evidence.",
    );
    expect(markup).toContain("Version mismatch");
    expect(markup).toContain(
      "do not validate the currently displayed prediction",
    );
    expect(markup).toContain("metrics-v2");
    expect(markup).toContain("prediction-v1");
    expect(markup).toContain("Held-out synthetic fixture");
    expect(markup).toContain("1,234");
    expect(markup).toContain("2026-10-01T00:00:00Z");
    expect(markup).toContain("Accuracy");
    expect(markup).toContain("Precision");
    expect(markup).toContain("Recall");
    expect(markup).toContain("F1");
    expect(markup).toContain("ROC-AUC");
    expect(markup).toContain("Each target has its own decision threshold");
    expect(markup).toContain(
      "each artery probability is capped at the CAD probability",
    );
    expect(markup).toContain("81.0%");
    expect(markup).toContain("91.0%");
    expect(markup).toContain("71.0%");
    expect(markup).toContain("61.0%");
    for (const target of Object.values(metrics.targets)) {
      for (const value of Object.values(target)) {
        expect(markup).toContain(`${(value * 100).toFixed(1)}%`);
      }
    }
  });

  it("shows explicit loading, error/retry, and unavailable states without fabricated values", () => {
    const loading = render({
      data: undefined,
      isError: false,
      isFetching: true,
      isPending: true,
      error: null,
      refetch: async () => undefined,
    });
    expect(loading).toContain("Loading model metrics");
    expect(loading).not.toContain("Accuracy");

    const error = render({
      data: undefined,
      isError: true,
      isFetching: false,
      isPending: false,
      error: new Error("offline"),
      refetch: vi.fn(async () => undefined),
    });
    expect(error).toContain("Model metrics could not be loaded: offline");
    expect(error).toContain("Retry metrics");
    expect(error).not.toContain("81.0%");

    const unavailable = render({
      data: undefined,
      isError: false,
      isFetching: false,
      isPending: false,
      error: null,
      refetch: async () => undefined,
    });
    expect(unavailable).toContain(
      "Model metrics are unavailable; no values are being substituted.",
    );
    expect(unavailable).not.toContain("Accuracy");
  });

  it("shows real estimator and validation metrics with fitting-set caveats", () => {
    const markup = render(
      {
        data: realMetrics,
        isError: false,
        isFetching: false,
        isPending: false,
        error: null,
        refetch: async () => undefined,
      },
      "cardiotwin-v2.0.0",
      false,
      "Dataset patient 20: scored by models trained without this patient",
    );

    expect(markup).toContain("ROC-AUC 95% CI");
    expect(markup).toContain("80.0%–90.0%");
    expect(markup).toContain("Balanced accuracy");
    expect(markup).toContain("Brier score");
    expect(markup).toContain("0.123");
    expect(markup).toContain("0.045");
    expect(markup).toContain("CV-summary threshold");
    expect(markup).toContain("Explainable Boosting Machine (EBM)");
    expect(markup).toContain("demo-model refit");
    expect(markup).toContain("pooled calibrated AUC");
    expect(markup).toContain("Dataset patient 20");
    expect(markup).toContain("not clinical validation");
  });

  it("does not pair real metrics with a mock prediction of the same version", () => {
    const markup = render(
      {
        data: realMetrics,
        isError: false,
        isFetching: false,
        isPending: false,
        error: null,
        refetch: async () => undefined,
      },
      "cardiotwin-v2.0.0",
      true,
    );

    expect(markup).toContain("Source mismatch");
    expect(markup).not.toContain(
      "Metrics and the accepted prediction identify version",
    );
  });
});
