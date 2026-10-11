import { describe, expect, it } from "vitest";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import {
  beatPulse,
  buildTour,
  clampRect,
  defaultLayout,
  MIN_WINDOW_SIZE,
  pulseRate,
  riskBand,
  TOP_BAR_HEIGHT,
  WINDOW_IDS,
} from "./studioModel";

describe("riskBand", () => {
  it("is high at or above the target's own threshold", () => {
    expect(riskBand(0.69, 0.69)).toBe("high");
    expect(riskBand(0.9, 0.32)).toBe("high");
  });

  it("is moderate within 40% below the threshold and low further down", () => {
    expect(riskBand(0.5, 0.69)).toBe("moderate");
    expect(riskBand(0.2, 0.32)).toBe("moderate");
    expect(riskBand(0.15, 0.32)).toBe("low");
  });
});

describe("window layout", () => {
  it("places every window inside a laptop viewport", () => {
    const layout = defaultLayout(1440, 900);
    for (const id of WINDOW_IDS) {
      const rect = layout[id];
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(TOP_BAR_HEIGHT);
      expect(rect.x + rect.w).toBeLessThanOrEqual(1440);
      expect(rect.y + rect.h).toBeLessThanOrEqual(900);
    }
  });

  it("keeps the inputs on the left and the results on the right", () => {
    const layout = defaultLayout(1440, 900);
    expect(layout.patient.x).toBeLessThan(720);
    expect(layout.risk.x).toBeGreaterThan(720);
    expect(layout.drivers.y).toBeGreaterThan(layout.risk.y + layout.risk.h);
  });

  it("pulls a window back so its title bar stays reachable", () => {
    const rect = clampRect(
      { x: 5000, y: -200, w: 300, h: 300 },
      1280,
      800,
      MIN_WINDOW_SIZE.risk,
    );
    expect(rect.x).toBeLessThanOrEqual(1280 - 120);
    expect(rect.y).toBe(TOP_BAR_HEIGHT);
  });

  it("never shrinks a window below its minimum size", () => {
    const rect = clampRect(
      { x: 10, y: 80, w: 50, h: 40 },
      1280,
      800,
      MIN_WINDOW_SIZE.drivers,
    );
    expect(rect.w).toBe(MIN_WINDOW_SIZE.drivers.w);
    expect(rect.h).toBe(MIN_WINDOW_SIZE.drivers.h);
  });
});

describe("heartbeat", () => {
  it("peaks early in the beat with a smaller second pulse", () => {
    const lub = beatPulse(0.08);
    const dub = beatPulse(0.3);
    const rest = beatPulse(0.7);
    expect(lub).toBeGreaterThan(dub);
    expect(dub).toBeGreaterThan(rest);
    expect(rest).toBeLessThan(0.01);
    expect(beatPulse(1.08)).toBeCloseTo(lub);
  });

  it("uses the patient's pulse within a plausible range", () => {
    expect(pulseRate(72)).toBe(72);
    expect(pulseRate(250)).toBe(160);
    expect(pulseRate("")).toBe(70);
    expect(pulseRate(undefined)).toBe(70);
  });
});

describe("guided tour", () => {
  const features: FeatureDefinition[] = [
    { name: "DM", label: "Diabetes", group: "History", type: "boolean", default: false },
    { name: "Sex", label: "Sex", group: "History", type: "categorical", default: "Male", options: ["Female", "Male"] },
  ];
  const explanation = (raise: number, lower: number) => ({
    base_value: 0.3,
    scale: "probability" as const,
    method: "test",
    contributions: [
      { feature: "DM", value: true, contribution: raise, direction: "positive" as const },
      { feature: "Sex", value: "Female", contribution: lower, direction: "negative" as const },
    ],
  });
  const target = (probability: number, threshold: number) => ({
    probability,
    threshold,
    label: "",
    uncertain: false,
  });
  const prediction = {
    request_id: "00000000-0000-4000-8000-000000000000",
    model_version: "test",
    risk_summary: "",
    mock: false,
    warnings: [],
    derived: { BMI: 25, Obesity: false },
    prediction_source: "test",
    cad: target(0.8, 0.69),
    vessels: {
      LAD: target(0.6, 0.55),
      LCX: target(0.2, 0.32),
      RCA: { ...target(0.4, 0.36), uncertain: true },
    },
    explanations: {
      cad: explanation(0.2, -0.05),
      LAD: explanation(0.1, -0.02),
      LCX: explanation(0.05, -0.1),
      RCA: explanation(0.08, -0.03),
    },
  } as PredictionResponse;

  it("visits the overview, then each artery in order", () => {
    const steps = buildTour(prediction, features);
    expect(steps.map((step) => step.vessel)).toEqual([null, "LAD", "LCX", "RCA"]);
    expect(steps.map((step) => step.band)).toEqual(["high", "high", "moderate", "high"]);
    expect(steps[3].uncertain).toBe(true);
  });

  it("names what raises and what lowers each estimate", () => {
    const [overall] = buildTour(prediction, features);
    expect(overall.raising.map((driver) => driver.feature)).toEqual(["DM"]);
    expect(overall.lowering.map((driver) => driver.feature)).toEqual(["Sex"]);
  });
});
