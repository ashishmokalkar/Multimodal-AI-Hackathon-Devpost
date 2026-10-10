import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import { InputsView } from "./InputsView";

const target = { probability: 0.7, label: "mock label", threshold: 0.5 };
const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "mock-fixture",
  cad: target,
  vessels: { LAD: target, LCX: target, RCA: target },
  explanations: {
    cad: {
      base_value: 0.5,
      contributions: [
        {
          feature: "Age",
          value: 67,
          contribution: -0.2,
          direction: "negative",
        },
        { feature: "EF-TTE", value: 0, contribution: 0, direction: "positive" },
      ],
    },
    LAD: {
      base_value: 0.5,
      contributions: [
        {
          feature: "Age",
          value: 42,
          contribution: -0.25,
          direction: "negative",
        },
      ],
    },
    LCX: { base_value: 0.5, contributions: [] },
    RCA: { base_value: 0.5, contributions: [] },
  },
  risk_summary: "Mock-only fixture.",
  mock: true,
};
const realExplanation = {
  ...prediction.explanations.cad,
  scale: "probability" as const,
  method: "Baseline Shapley on served probability (32 orderings).",
};
const realPrediction: PredictionResponse = {
  ...prediction,
  cad: { ...prediction.cad, uncertain: false },
  vessels: {
    LAD: { ...prediction.vessels.LAD, uncertain: false },
    LCX: { ...prediction.vessels.LCX, uncertain: false },
    RCA: { ...prediction.vessels.RCA, uncertain: false },
  },
  mock: false,
  warnings: [],
  derived: { BMI: 27.5, Obesity: true },
  prediction_source: "Final models trained on all 303 patients",
  explanations: {
    cad: realExplanation,
    LAD: { ...realExplanation, contributions: [] },
    LCX: { ...realExplanation, contributions: [] },
    RCA: { ...realExplanation, contributions: [] },
  },
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
    name: "Smoking",
    label: "Smoking status",
    group: "Symptoms",
    type: "boolean",
    default: false,
  },
  {
    name: "EF-TTE",
    label: "Ejection fraction",
    group: "Measurements",
    type: "number",
    unit: "%",
    default: 0,
  },
  {
    name: "Unrecorded",
    label: "Unrecorded value",
    group: "Measurements",
    type: "number",
    default: 0,
  },
];

describe("InputsView", () => {
  it("shows metadata groups, response values, zero attribution, and unavailable details", () => {
    const markup = renderToStaticMarkup(
      createElement(InputsView, {
        prediction,
        features,
        predictionInputs: { Age: 51, Smoking: false },
        selectedVessel: null,
      }),
    );

    expect(markup).toContain("Demographics");
    expect(markup).toContain("Measurements");
    expect(markup).toContain('aria-labelledby="input-group-heading-0"');
    expect(markup).toContain("67 years");
    expect(markup).not.toContain(">51 years<");
    expect(markup).toContain("Smoking status");
    expect(markup).toContain("Not returned");
    expect(markup).toContain("0.000");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain(
      'aria-label="Demographics patient inputs and contributions"',
    );
    expect(markup).toContain('role="region" tabindex="0"');
    expect(markup).toContain("Method and reference details");
    expect(markup).toContain("Not returned by mock v1.0.");
    expect(markup).toContain("Missing values are unavailable");
    expect(markup).not.toContain(
      '<details class="contribution-method-details" open',
    );
  });

  it("does not invent any input values when there is no accepted snapshot", () => {
    const markup = renderToStaticMarkup(
      createElement(InputsView, {
        prediction,
        features,
        predictionInputs: null,
        selectedVessel: "LAD",
      }),
    );

    expect(markup).toContain("Inputs for LAD");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Not returned");
  });

  it("uses the selected target's own returned input values and attribution", () => {
    const markup = renderToStaticMarkup(
      createElement(InputsView, {
        prediction,
        features,
        predictionInputs: { Age: 51 },
        selectedVessel: "LAD",
      }),
    );

    expect(markup).toContain("Inputs for LAD");
    expect(markup).toContain("42 years");
    expect(markup).toContain("-0.250");
    expect(markup).not.toContain("67 years");
    expect(markup).not.toContain("-0.200");
  });

  it("shows real reference-risk units and returned derived values without clinical classification", () => {
    const markup = renderToStaticMarkup(
      createElement(InputsView, {
        prediction: realPrediction,
        features,
        predictionInputs: { Age: 51 },
        selectedVessel: null,
      }),
    );

    expect(markup).toContain("Probability scale");
    expect(markup).toContain("Reference model risk: 50.0%");
    expect(markup).toContain(
      "Baseline Shapley on served probability (32 orderings).",
    );
    expect(markup).toContain("-20.00 percentage points");
    expect(markup).toContain("BMI: 27.5");
    expect(markup).toContain("Obesity dataset flag: Yes");
    expect(markup).toContain("not a clinical obesity diagnosis");
  });
});
