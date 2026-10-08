import { describe, expect, it } from "vitest";
import type { PredictionResponse } from "../../api/types";
import { colorScale } from "../../lib/colorScale";
import { formatProbability } from "../../lib/format";
import {
  PROCEDURAL_VESSEL_TRIANGLES,
  UNAVAILABLE_VESSEL_COLOR,
  vesselDisplay,
  vesselIds,
  vesselMap,
  type VesselId,
} from "./vesselMap";

function predictionFixture(
  probabilities: Record<VesselId, number>,
): PredictionResponse {
  const target = (probability: number) => ({
    probability,
    label: "mock label",
    threshold: 0.5,
  });
  const explanation = { base_value: 0.5, contributions: [] };

  return {
    request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
    model_version: "fixture",
    cad: target(0.5),
    vessels: {
      LAD: target(probabilities.LAD),
      LCX: target(probabilities.LCX),
      RCA: target(probabilities.RCA),
    },
    explanations: {
      cad: explanation,
      LAD: explanation,
      LCX: explanation,
      RCA: explanation,
    },
    risk_summary: "Fixture response.",
    mock: true,
  };
}

describe("vesselMap", () => {
  it("keeps all three separately addressable vessel definitions", () => {
    expect(vesselIds).toEqual(["LAD", "LCX", "RCA"]);
    expect(vesselMap.LAD).toMatchObject({
      nodeName: "LAD",
    });
    expect(vesselMap.LCX).toMatchObject({
      nodeName: "LCX",
    });
    expect(vesselMap.RCA).toMatchObject({
      nodeName: "RCA",
    });
    expect(vesselIds.every((vessel) => vesselMap[vessel].path.length > 1)).toBe(
      true,
    );
  });

  it("maps two distinct prediction responses to matching mesh colours and percentages", () => {
    const fixtures = [
      predictionFixture({ LAD: 0, LCX: 0.5, RCA: 1 }),
      predictionFixture({ LAD: 0.25, LCX: 0.75, RCA: 0.1 }),
    ];

    for (const fixture of fixtures) {
      for (const vessel of vesselIds) {
        const display = vesselDisplay(fixture, vessel);
        const probability = fixture.vessels[vessel].probability;

        expect(display.target).toBe(fixture.vessels[vessel]);
        expect(display.probability).toBe(probability);
        expect(display.color).toBe(colorScale(probability));
        expect(display.percentage).toBe(formatProbability(probability));
      }
    }
    expect(vesselDisplay(fixtures[0], "LAD")).toMatchObject({
      probability: 0,
      percentage: "0.0%",
      color: colorScale(0),
    });
  });

  it("uses a distinct neutral colour when no current prediction exists", () => {
    for (const vessel of vesselIds) {
      expect(vesselDisplay(null, vessel)).toMatchObject({
        target: null,
        probability: null,
        percentage: "Unavailable",
        color: UNAVAILABLE_VESSEL_COLOR,
      });
    }
  });

  it("keeps procedural tube geometry below the total triangle budget", () => {
    expect(PROCEDURAL_VESSEL_TRIANGLES).toBe(2304);
    expect(22_562 + PROCEDURAL_VESSEL_TRIANGLES).toBeLessThanOrEqual(150_000);
  });
});
