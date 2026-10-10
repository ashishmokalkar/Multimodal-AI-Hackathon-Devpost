import { describe, expect, it } from "vitest";
import type { PredictionResponse } from "../../api/types";
import { placePins } from "./arteryPins";

function prediction(lad: number, lcx: number, rca: number) {
  const target = (probability: number) => ({
    probability,
    label: "x",
    threshold: 0.5,
    uncertain: false,
  });
  return {
    vessels: { LAD: target(lad), LCX: target(lcx), RCA: target(rca) },
  } as unknown as PredictionResponse;
}

describe("placePins", () => {
  it("keeps well-separated arteries on one lane, ordered by probability", () => {
    const pins = placePins(prediction(0.76, 0.2, 0.5));

    expect(pins.map((pin) => pin.vessel)).toEqual(["LCX", "RCA", "LAD"]);
    expect(pins.every((pin) => pin.lane === 0)).toBe(true);
  });

  it("moves labels that would overlap onto separate lanes", () => {
    const pins = placePins(prediction(0.912, 0.758, 0.461));
    const close = placePins(prediction(0.76, 0.705, 0.597));

    expect(pins.every((pin) => pin.lane === 0)).toBe(true);
    expect(close.find((pin) => pin.vessel === "RCA")?.lane).toBe(0);
    expect(close.find((pin) => pin.vessel === "LCX")?.lane).toBe(1);
    expect(close.find((pin) => pin.vessel === "LAD")?.lane).toBe(0);
    // an edge label hangs inwards, so it needs more room from its neighbour
    expect(
      placePins(prediction(0.97, 0.8, 0.2)).find((pin) => pin.vessel === "LAD")
        ?.lane,
    ).toBe(1);
  });

  it("places each artery relative to its own threshold, matching its colour", () => {
    const fixture = {
      vessels: {
        LAD: {
          probability: 0.55,
          label: "x",
          threshold: 0.55,
          uncertain: false,
        },
        LCX: {
          probability: 0.55,
          label: "x",
          threshold: 0.32,
          uncertain: false,
        },
        RCA: {
          probability: 0.2,
          label: "x",
          threshold: 0.36,
          uncertain: false,
        },
      },
    } as unknown as PredictionResponse;
    const pins = placePins(fixture);
    const at = (vessel: string) => pins.find((pin) => pin.vessel === vessel);

    expect(at("LAD")?.position).toBeCloseTo(0.5);
    // same probability, lower threshold: further towards "above threshold"
    expect(at("LCX")?.position).toBeGreaterThan(0.5);
    expect(at("RCA")?.position).toBeLessThan(0.5);
    expect(at("LCX")?.probability).toBe(0.55);
  });
});
