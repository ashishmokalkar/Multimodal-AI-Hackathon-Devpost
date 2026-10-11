import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PredictionResponse } from "../../api/types";
import { ArteryList } from "./ArteryList";

const explanation = { base_value: 0.4, contributions: [] };
// labels as the API sets them: an artery is "elevated" only when it is above its threshold and CAD is elevated
function prediction(cad: number, lad: number): PredictionResponse {
  const label = (flag: boolean) => (flag ? "elevated" : "not elevated");
  const cadFlag = cad >= 0.69;
  return {
    request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
    model_version: "fixture",
    cad: { probability: cad, label: label(cadFlag), threshold: 0.69 },
    vessels: {
      LAD: {
        probability: lad,
        label: label(lad >= 0.55 && cadFlag),
        threshold: 0.55,
      },
      LCX: { probability: 0.2, label: label(false), threshold: 0.32 },
      RCA: { probability: 0.2, label: label(false), threshold: 0.36 },
    },
    explanations: {
      cad: explanation,
      LAD: explanation,
      LCX: explanation,
      RCA: explanation,
    },
    risk_summary: "fixture",
    mock: true,
  };
}

function render(response: PredictionResponse) {
  return renderToStaticMarkup(
    createElement(ArteryList, {
      prediction: response,
      baseline: null,
      features: [],
      selected: null,
      onSelect: () => undefined,
    }),
  );
}

describe("ArteryList", () => {
  it("explains when an artery is above its own threshold but overall CAD is not", () => {
    const markup = render(prediction(0.6, 0.58));
    expect(markup).toContain("artery-disagreement");
    expect(markup).toContain("LAD");
    expect(markup).toContain("is");
    expect(markup).toContain("above its own threshold but not flagged");
    expect(markup).not.toContain("risk-status-flagged");
  });

  it("shows no note when CAD is flagged too, or when no artery is", () => {
    expect(render(prediction(0.75, 0.58))).not.toContain("artery-disagreement");
    expect(render(prediction(0.6, 0.3))).not.toContain("artery-disagreement");
  });
});
