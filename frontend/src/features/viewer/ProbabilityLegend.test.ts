import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PredictionResponse } from "../../api/types";
import { ProbabilityLegend } from "./ProbabilityLegend";
import {
  selectedPredictionTarget,
  thresholdMarkerStyle,
} from "./probabilityLegendHelpers";

const target = (threshold: number) => ({
  probability: 0.6,
  label: "positive",
  threshold,
});

const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "threshold-fixture",
  cad: target(0),
  vessels: {
    LAD: target(1),
    LCX: target(0.5),
    RCA: target(0.75),
  },
  explanations: {
    cad: { base_value: 0.5, contributions: [] },
    LAD: { base_value: 0.5, contributions: [] },
    LCX: { base_value: 0.5, contributions: [] },
    RCA: { base_value: 0.5, contributions: [] },
  },
  risk_summary: "Fixture only.",
  mock: true,
};

function render(selectedVessel: "LAD" | "LCX" | "RCA" | null) {
  return renderToStaticMarkup(
    createElement(ProbabilityLegend, { prediction, selectedVessel }),
  );
}

describe("ProbabilityLegend", () => {
  it("marks the selected target threshold, including CAD and endpoint thresholds", () => {
    const cad = render(null);
    expect(cad).toContain("Selected-target decision threshold for CAD:");
    expect(cad).toContain("0.0%");
    expect(cad).toContain('data-threshold-marker="true"');
    expect(cad).toContain("left:0%;transform:translateX(0)");

    const lad = render("LAD");
    expect(lad).toContain("Selected-target decision threshold for LAD:");
    expect(lad).toContain("100.0%");
    expect(lad).toContain("left:100%;transform:translateX(-100%)");

    const lcx = render("LCX");
    expect(lcx).toContain("Selected-target decision threshold for LCX:");
    expect(lcx).toContain("50.0%");
    expect(lcx).toContain("left:50%;transform:translateX(-50%)");
    expect(lcx).toContain("50% colour midpoint");
    expect(lcx).toContain(
      "The 50% colour midpoint is not a decision threshold",
    );
  });

  it("keeps absolute probability colours equal and hides the marker without a prediction", () => {
    const markup = render("RCA");
    const swatchColors = [
      ...markup.matchAll(/background-color: ?([^;"]+)/g),
    ].map((match) => match[1]);
    expect(swatchColors).toHaveLength(4);
    expect(new Set(swatchColors.slice(0, 3)).size).toBe(1);

    const unavailable = renderToStaticMarkup(
      createElement(ProbabilityLegend, {
        prediction: null,
        selectedVessel: "LAD",
      }),
    );
    expect(unavailable).not.toContain('data-threshold-marker="true"');
    expect(unavailable).not.toContain("Selected-target decision threshold for");
    expect(unavailable).toContain("Unavailable");
  });

  it("keeps endpoint markers within the legend bounds", () => {
    expect(thresholdMarkerStyle(0)).toEqual({
      left: "0%",
      transform: "translateX(0)",
    });
    expect(thresholdMarkerStyle(1)).toEqual({
      left: "100%",
      transform: "translateX(-100%)",
    });
  });

  it("uses the selected vessel threshold and restores CAD when unselected", () => {
    expect(selectedPredictionTarget(prediction, "RCA")).toEqual({
      name: "RCA",
      target: prediction.vessels.RCA,
    });
    expect(selectedPredictionTarget(prediction, null)).toEqual({
      name: "CAD",
      target: prediction.cad,
    });
    expect(selectedPredictionTarget(null, "RCA")).toEqual({
      name: "RCA",
      target: undefined,
    });
  });
});
