import { describe, expect, it } from "vitest";
import {
  MetricsResponseSchema,
  PredictionResponseSchema,
} from "./types";

const mockTarget = { probability: 0.6, label: "elevated", threshold: 0.5 };
const mockExplanation = { base_value: 0.4, contributions: [] };

const mockPrediction = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "mock-1.0.0",
  cad: mockTarget,
  vessels: { LAD: mockTarget, LCX: mockTarget, RCA: mockTarget },
  explanations: {
    cad: mockExplanation,
    LAD: mockExplanation,
    LCX: mockExplanation,
    RCA: mockExplanation,
  },
  risk_summary: "Illustrative mock result.",
  mock: true,
};

const realTarget = {
  ...mockTarget,
  uncertain: false,
};
const realExplanation = {
  base_value: 0.4,
  scale: "probability",
  method: "Baseline Shapley on served probability (32 orderings).",
  contributions: [
    { feature: "Age", value: 60, contribution: 0.2, direction: "positive" },
  ],
};
const realPrediction = {
  ...mockPrediction,
  model_version: "cardiotwin-v2.0.0",
  cad: realTarget,
  vessels: { LAD: realTarget, LCX: realTarget, RCA: realTarget },
  explanations: {
    cad: realExplanation,
    LAD: realExplanation,
    LCX: realExplanation,
    RCA: realExplanation,
  },
  mock: false,
  warnings: [],
  derived: { BMI: 24.2, Obesity: false },
  prediction_source: "Final models trained on all 303 patients",
};

const realTargetMetrics = {
  accuracy: 0.8,
  precision: 0.8,
  recall: 0.8,
  f1: 0.8,
  roc_auc: 0.9,
  roc_auc_ci95: [0.85, 0.95],
  balanced_accuracy: 0.8,
  brier: 0.1,
  ece: 0.03,
  threshold: 0.68,
  model: "Fixture estimator",
};

const realMetrics = {
  model_version: "cardiotwin-v2.0.0",
  validation: "Fixed-fold cross-validation",
  n_samples: 303,
  trained_at: "2026-10-10T10:22:44Z",
  targets: {
    cad: realTargetMetrics,
    LAD: realTargetMetrics,
    LCX: realTargetMetrics,
    RCA: realTargetMetrics,
  },
  mock: false,
};

describe("profile-specific API response schemas", () => {
  it("preserves backward-compatible mock v1.0 responses", () => {
    expect(PredictionResponseSchema.parse(mockPrediction)).toMatchObject({
      mock: true,
      model_version: "mock-1.0.0",
    });
  });

  it("requires all real prediction additions instead of stripping them", () => {
    expect(PredictionResponseSchema.parse(realPrediction)).toMatchObject({
      mock: false,
      warnings: [],
      derived: { BMI: 24.2, Obesity: false },
      prediction_source: "Final models trained on all 303 patients",
      cad: { uncertain: false },
      explanations: { cad: { scale: "probability" } },
    });

    const missingWarnings = { ...realPrediction };
    Reflect.deleteProperty(missingWarnings, "warnings");
    expect(PredictionResponseSchema.safeParse(missingWarnings).success).toBe(
      false,
    );
    expect(
      PredictionResponseSchema.safeParse({
        ...realPrediction,
        explanations: {
          ...realPrediction.explanations,
          cad: { ...realExplanation, scale: "logit" },
        },
      }).success,
    ).toBe(false);
  });

  it("requires all real metrics provenance and estimator fields", () => {
    expect(MetricsResponseSchema.parse(realMetrics)).toMatchObject({
      mock: false,
      targets: { cad: { model: "Fixture estimator", threshold: 0.68 } },
    });

    expect(
      MetricsResponseSchema.safeParse({
        ...realMetrics,
        targets: {
          ...realMetrics.targets,
          cad: { accuracy: 0.8 },
        },
      }).success,
    ).toBe(false);

    expect(
      MetricsResponseSchema.safeParse({
        ...realMetrics,
        targets: {
          ...realMetrics.targets,
          cad: { ...realTargetMetrics, roc_auc_ci95: [0.95, 0.85] },
        },
      }).success,
    ).toBe(false);
  });
});
