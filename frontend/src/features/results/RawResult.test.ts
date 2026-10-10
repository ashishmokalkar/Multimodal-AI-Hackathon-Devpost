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

function renderResult(selectedVessel: "LAD" | "LCX" | "RCA" | null) {
  return renderToStaticMarkup(
    createElement(RawResult, {
      prediction,
      features,
      predictionInputs: { Age: 60, "EF-TTE": 50 },
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
    expect(markup).toContain("Horizontal axis: Model contribution");
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

  it("shows an explicit unavailable message when the selected explanation is empty", () => {
    const markup = renderResult("RCA");

    expect(markup).toContain("Why RCA?");
    expect(markup).toContain(
      "No model contributions were returned for RCA; no drivers are available.",
    );
  });
});
