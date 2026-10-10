import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import type { PredictionResponse } from "../../api/types";
import { vesselDisplay } from "./vesselMap";
import { VesselLabel } from "./VesselMesh";

vi.mock("@react-three/drei", async () => {
  const { createElement: createMockElement } = await import("react");
  return {
    Html: ({ children }: { children: ReactNode }) =>
      createMockElement("span", { "data-vessel-label": "true" }, children),
  };
});

const target = {
  probability: 0.764,
  label: "High probability",
  threshold: 0.5,
};
const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "vessel-label-fixture",
  cad: target,
  vessels: { LAD: target, LCX: target, RCA: target },
  explanations: {
    cad: { base_value: 0.5, contributions: [] },
    LAD: { base_value: 0.5, contributions: [] },
    LCX: { base_value: 0.5, contributions: [] },
    RCA: { base_value: 0.5, contributions: [] },
  },
  risk_summary: "Fixture only.",
  mock: true,
};

function renderLabel(
  isSelected: boolean,
  isHovered: boolean,
  currentPrediction: PredictionResponse | null = prediction,
) {
  return renderToStaticMarkup(
    createElement(VesselLabel, {
      vessel: "LAD",
      position: new Vector3(),
      display: vesselDisplay(currentPrediction, "LAD"),
      isHovered,
      isSelected,
    }),
  );
}

describe("VesselMesh selected label", () => {
  it("keeps the selected label visible and avoids duplicating it on hover", () => {
    const selected = renderLabel(true, false);
    expect(selected).toContain("Selected: LAD · Left anterior descending");
    expect(selected).toContain("76.4% · High probability");

    const selectedAndHovered = renderLabel(true, true);
    expect(selectedAndHovered).toContain("Selected: LAD");
    expect(selectedAndHovered).not.toContain("Hover: LAD");
  });

  it("clears selected overlay for CAD and removes stale risk text on invalidation", () => {
    expect(renderLabel(false, false)).toBe("");

    const unavailable = renderLabel(true, false, null);
    expect(unavailable).toContain("Selected: LAD");
    expect(unavailable).toContain("Unavailable");
    expect(unavailable).not.toContain("76.4%");
    expect(unavailable).not.toContain("High probability");
  });
});
