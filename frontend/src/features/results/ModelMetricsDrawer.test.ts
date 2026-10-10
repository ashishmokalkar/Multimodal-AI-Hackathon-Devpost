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
) {
  return renderToStaticMarkup(
    createElement(ModelMetricsDrawer, {
      open: true,
      onClose: () => undefined,
      predictionVersion,
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
});
