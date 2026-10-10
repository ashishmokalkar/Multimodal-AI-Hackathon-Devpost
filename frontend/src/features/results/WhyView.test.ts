import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  Contribution,
  FeatureDefinition,
  PredictionResponse,
} from "../../api/types";
import { WhyView } from "./WhyView";

const target = { probability: 0.7, label: "mock label", threshold: 0.5 };
const baseContributions: Contribution[] = [
  { feature: "F0", value: 67, contribution: -0.9, direction: "negative" },
  { feature: "F1", value: 1, contribution: 0.9, direction: "positive" },
  { feature: "F2", value: 2, contribution: -0.8, direction: "negative" },
  { feature: "F3", value: 3, contribution: 0.7, direction: "positive" },
  { feature: "F4", value: 4, contribution: -0.6, direction: "negative" },
  { feature: "F5", value: 5, contribution: 0.5, direction: "positive" },
  { feature: "F6", value: 6, contribution: -0.4, direction: "negative" },
  { feature: "F7", value: 7, contribution: 0.3, direction: "positive" },
  { feature: "F8", value: 8, contribution: -0.2, direction: "negative" },
  { feature: "F9", value: 9, contribution: 0, direction: "positive" },
  { feature: "F10", value: 10, contribution: 0.05, direction: "positive" },
];

const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "mock-fixture",
  cad: target,
  vessels: { LAD: target, LCX: target, RCA: target },
  explanations: {
    cad: { base_value: 0.5, contributions: baseContributions },
    LAD: {
      base_value: 0.5,
      contributions: [
        {
          feature: "LAD feature",
          value: 4,
          contribution: -0.25,
          direction: "negative",
        },
      ],
    },
    LCX: {
      base_value: 0.5,
      contributions: [
        {
          feature: "LCX feature",
          value: true,
          contribution: 0.125,
          direction: "positive",
        },
      ],
    },
    RCA: {
      base_value: 0.5,
      contributions: [
        {
          feature: "RCA feature",
          value: "No",
          contribution: 0,
          direction: "positive",
        },
      ],
    },
  },
  risk_summary: "Mock-only fixture.",
  mock: true,
};

const features: FeatureDefinition[] = [
  ...baseContributions.map(({ feature }) => ({
    name: feature,
    label: `Label ${feature}`,
    group: "Fixture",
    type: "number" as const,
    unit: "years",
    default: 0,
  })),
  {
    name: "LAD feature",
    label: "LAD label",
    group: "Fixture",
    type: "number",
    default: 0,
  },
  {
    name: "LCX feature",
    label: "LCX label",
    group: "Fixture",
    type: "boolean",
    default: false,
  },
  {
    name: "RCA feature",
    label: "RCA label",
    group: "Fixture",
    type: "categorical",
    default: "No",
  },
];

function render(selectedVessel: "LAD" | "LCX" | "RCA" | null) {
  return renderToStaticMarkup(
    createElement(WhyView, {
      prediction,
      features,
      selectedVessel,
    }),
  );
}

describe("WhyView", () => {
  it("renders the selected CAD or vessel response, including zero as a returned value", () => {
    for (const [selectedVessel, heading, label, value] of [
      [null, "Why CAD?", "Label F0", "-0.900"],
      ["LAD", "Why LAD?", "LAD label", "-0.250"],
      ["LCX", "Why LCX?", "LCX label", "+0.125"],
      ["RCA", "Why RCA?", "RCA label", "0.000"],
    ] as const) {
      const markup = render(selectedVessel);
      expect(markup).toContain(heading);
      expect(markup).toContain(label);
      expect(markup).toContain(value);
      expect(markup).toContain("scale unconfirmed");
    }
  });

  it("caps at ten, sorts by absolute value with stable ties, and exposes numeric text", () => {
    const markup = render(null);
    const listItems = markup.match(/<li\b/g) ?? [];

    expect(listItems).toHaveLength(10);
    expect(markup).toContain("Model contribution");
    expect(markup).toContain(
      'aria-label="CAD contribution values and input values"',
    );
    expect(markup).toContain("Input value: 67 years");
    expect(markup).toContain("-0.900");
    expect(markup).toContain("+0.900");
    expect(markup).not.toContain("Label F9");
    expect(markup).toContain("Label F10");
    expect(markup.indexOf("Label F0")).toBeLessThan(markup.indexOf("Label F1"));
  });
});
