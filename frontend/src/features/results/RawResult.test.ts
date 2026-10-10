import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import { RawResult } from "./RawResult";

const target = {
  probability: 0.7,
  label: "fixture label",
  threshold: 0.5,
};
const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "fixture",
  cad: target,
  vessels: { LAD: target, LCX: target, RCA: target },
  explanations: {
    cad: {
      base_value: 0.5,
      contributions: [
        { feature: "Age", value: 67, contribution: 0.2, direction: "positive" },
      ],
    },
    LAD: {
      base_value: 0.5,
      contributions: [
        {
          feature: "EF-TTE",
          value: 45,
          contribution: -0.3,
          direction: "negative",
        },
      ],
    },
    LCX: {
      base_value: 0.5,
      contributions: [
        {
          feature: "Typical Chest Pain",
          value: true,
          contribution: 0.45,
          direction: "positive",
        },
        {
          feature: "DM",
          value: false,
          contribution: 0,
          direction: "positive",
        },
      ],
    },
    RCA: { base_value: 0.5, contributions: [] },
  },
  risk_summary: "Mock summary.",
  mock: true,
};
const realTarget = { ...target, uncertain: true };
const realExplanation = {
  base_value: 0.42,
  scale: "probability" as const,
  method: "Baseline Shapley on served probability (32 orderings).",
  contributions: [
    { feature: "Age", value: 67, contribution: 0.12, direction: "positive" as const },
  ],
};
const realPrediction: PredictionResponse = {
  ...prediction,
  model_version: "cardiotwin-v2.0.0",
  cad: realTarget,
  vessels: {
    LAD: realTarget,
    LCX: { ...realTarget, uncertain: false },
    RCA: realTarget,
  },
  explanations: {
    cad: realExplanation,
    LAD: {
      ...realExplanation,
      contributions: [
        { feature: "EF-TTE", value: 45, contribution: -0.3, direction: "negative" },
      ],
    },
    LCX: {
      ...realExplanation,
      contributions: [
        { feature: "Typical Chest Pain", value: "Typical", contribution: 0.45, direction: "positive" },
      ],
    },
    RCA: { ...realExplanation, contributions: [] },
  },
  mock: false,
  warnings: ["An input was outside the training range."],
  derived: { BMI: 27.5, Obesity: true },
  prediction_source: "Final models trained on all 303 patients",
};
const features: FeatureDefinition[] = [
  {
    name: "Age",
    label: "Age",
    group: "Demographics",
    type: "number",
    unit: "years",
    default: 0,
  },
  {
    name: "EF-TTE",
    label: "Ejection fraction",
    group: "Echo",
    type: "number",
    unit: "%",
    default: 0,
  },
  {
    name: "Typical Chest Pain",
    label: "Typical chest pain",
    group: "Symptoms",
    type: "boolean",
    default: false,
  },
  {
    name: "DM",
    label: "Diabetes",
    group: "Demographics",
    type: "boolean",
    default: false,
  },
];

function renderResult(
  selectedVessel: "LAD" | "LCX" | "RCA" | null,
  response = prediction,
  isEditedScenario = false,
  sampleId: string | null = null,
) {
  return renderToStaticMarkup(
    createElement(RawResult, {
      prediction: response,
      features,
      predictionInputs: { Age: 60, "EF-TTE": 50 },
      isEditedScenario,
      sampleId,
      selectedVessel,
      onSelectVessel: () => undefined,
    }),
  );
}

describe("RawResult explanation rendering", () => {
  it("uses the selected response values and feature metadata", () => {
    const markup = renderResult("LAD");

    expect(markup).toContain("Why LAD?");
    expect(markup).toContain("Ejection fraction");
    expect(markup).toContain("Input value: 45%");
    expect(markup).toContain("-0.300");
    expect(markup).toContain("scale unconfirmed");
    expect(markup).toContain("Model contribution");
    expect(markup).toContain('aria-label="Result detail view"');
    expect(markup).not.toContain("Input value: 67 years");
    expect(markup).toContain("scale is unconfirmed");
    expect(markup).not.toContain("verified SHAP");
  });

  it("keeps CAD and vessel target selection reflected in the explanation content", () => {
    const cad = renderResult(null);
    const lcx = renderResult("LCX");

    expect(cad).toContain("Why CAD?");
    expect(cad).toContain("Input value: 67 years");
    expect(lcx).toContain("Why LCX?");
    expect(lcx).toContain("Typical chest pain");
    expect(lcx).toContain("Input value: Yes");
    expect(lcx).toContain("+0.450");
    expect(lcx).toContain("0.000");
  });

  it("prominently identifies mock prediction source and model version", () => {
    const markup = renderResult(null);

    expect(markup).toContain("Mock prediction");
    expect(markup).toContain("Model version fixture");
    expect(markup).not.toContain("Model output</span>");
  });

  it("does not label non-mock responses as mock predictions", () => {
    const markup = renderResult(null, realPrediction);

    expect(markup).toContain("Real-model prediction");
    expect(markup).not.toContain("Mock prediction");
  });

  it("uses confirmed probability-scale units and displays real prediction provenance", () => {
    const markup = renderResult(null, realPrediction);

    expect(markup).toContain("+12 pts");
    expect(markup).toContain("Typical patient");
    expect(markup).toContain("42%");
    expect(markup).toContain(
      "Baseline Shapley on served probability (32 orderings).",
    );
    expect(markup).toContain("Final models trained on all 303 patients");
    expect(markup).toContain("<details");
    expect(markup).toContain("Please note");
    expect(markup).toContain("Coronary artery disease");
    expect(markup).toContain("Which arteries may be narrowed");
    expect(markup).toContain("What is driving the overall result");
    expect(markup).toContain("An input was outside the training range.");
    expect(markup).not.toContain("scale unconfirmed");
  });

  it("distinguishes an empty real warning list from unavailable mock assessment", () => {
    const emptyRealWarnings = renderResult(null, {
      ...realPrediction,
      warnings: [],
    });
    const mock = renderResult(null, prediction);

    expect(emptyRealWarnings).not.toContain("Please note");
    expect(mock).toContain(
      "Real-model warning assessment is unavailable in mock v1.0.",
    );
    expect(mock).not.toContain("Response warnings: none returned");
  });

  it("labels a changed real sample as an edited scenario", () => {
    const markup = renderResult(
      null,
      {
        ...realPrediction,
        prediction_source:
          "Dataset patient 20: scored by models trained without this patient",
      },
      true,
      "patient-20",
    );

    expect(markup).toContain("Edited dataset-sample scenario");
    expect(markup).toContain("Prediction source:");
    expect(markup).toContain("trained without this patient");
  });

  it("shows an explicit unavailable message when the selected explanation is empty", () => {
    const markup = renderResult("RCA");

    expect(markup).toContain("Why RCA?");
    expect(markup).toContain(
      "No model contributions were returned for RCA; no drivers are available.",
    );
  });
});
