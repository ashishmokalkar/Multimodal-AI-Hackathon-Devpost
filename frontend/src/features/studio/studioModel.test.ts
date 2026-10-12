import { describe, expect, it } from "vitest";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import {
  ANCHORED_WINDOWS,
  beatPulse,
  buildTour,
  clampRect,
  DEFAULT_OPEN,
  defaultLayout,
  EXPLAIN_SPACE,
  factorBreakdown,
  MIN_WINDOW_SIZE,
  pulseRate,
  riskBand,
  targetHeadline,
  TOP_BAR_HEIGHT,
  whyRows,
  WINDOW_IDS,
  type Rect,
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

  const SCREENS: [number, number][] = [
    [900, 600],
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1536, 864],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ];

  it.each(SCREENS)("fits patient, risk and why on a %ix%i screen without overlap", (vw, vh) => {
    const layout = defaultLayout(vw, vh);
    const core = ANCHORED_WINDOWS.map((id) => layout[id]);
    for (const [index, rect] of core.entries()) {
      const id = ANCHORED_WINDOWS[index];
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(TOP_BAR_HEIGHT);
      expect(rect.x + rect.w).toBeLessThanOrEqual(vw);
      expect(rect.y + rect.h).toBeLessThanOrEqual(vh);
      expect(rect.w).toBeGreaterThanOrEqual(MIN_WINDOW_SIZE[id].w);
      expect(rect.h).toBeGreaterThanOrEqual(MIN_WINDOW_SIZE[id].h);
    }
    const overlaps = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    expect(overlaps(layout.patient, layout.risk)).toBe(false);
    expect(overlaps(layout.patient, layout.drivers)).toBe(false);
    expect(overlaps(layout.risk, layout.drivers)).toBe(false);
    // the right column stays clear of the model credit in the corner, the patient window of the dock
    if (vh >= 720) {
      expect(layout.drivers.y + layout.drivers.h).toBeLessThanOrEqual(vh - 30);
    }
    expect(layout.patient.y + layout.patient.h).toBeLessThanOrEqual(vh - 80);
    // and leaves the middle third for the heart
    expect(layout.patient.x + layout.patient.w).toBeLessThan(vw / 3);
    expect(layout.risk.x).toBeGreaterThan((2 * vw) / 3 - 40);
  });

  it("gives larger screens wider windows", () => {
    expect(defaultLayout(1920, 1080).risk.w).toBeGreaterThan(defaultLayout(1280, 720).risk.w);
    expect(defaultLayout(1920, 1080).drivers.h).toBeGreaterThan(defaultLayout(1280, 720).drivers.h);
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

describe("why window", () => {
  const target = (probability: number, threshold: number) => ({
    probability,
    threshold,
    label: "",
    uncertain: false,
  });
  const empty = { base_value: 0.3, scale: "probability" as const, method: "test", contributions: [] };
  const prediction = {
    request_id: "00000000-0000-4000-8000-000000000000",
    model_version: "test",
    risk_summary: "",
    mock: false,
    warnings: [],
    derived: { BMI: 25, Obesity: false },
    prediction_source: "test",
    cad: target(0.61, 0.69),
    vessels: { LAD: target(0.88, 0.55), LCX: target(0.25, 0.32), RCA: target(0.09, 0.39) },
    explanations: { cad: empty, LAD: empty, LCX: empty, RCA: empty },
  } as PredictionResponse;

  it("names the artery, its chance, its risk word and the part of the heart it supplies", () => {
    expect(targetHeadline(prediction, "LAD").text).toBe("LAD · 88% ▲ High · Front of the heart");
    expect(targetHeadline(prediction, "LCX").text).toBe(
      "LCX · 25% Moderate · Side and back of the heart",
    );
    expect(targetHeadline(prediction, "RCA").text).toBe(
      "RCA · 9% Low · Right side and bottom of the heart",
    );
  });

  it("shows only the chance for the overall result", () => {
    const line = targetHeadline(prediction, "cad");
    expect(line.text).toBe("Overall heart disease · 61%");
    expect(line.band).toBeNull();
    expect(line.region).toBeNull();
  });

  it("joins each reason with its measured value and typical range, in the reasons' order", () => {
    const drivers = [
      { feature: "LDL", label: "LDL", valueText: "190 mg/dL", group: "Lab", points: 9 },
      { feature: "DM", label: "Diabetes", valueText: "Yes", group: "History", points: 4 },
    ];
    const card = {
      feature: "LDL",
      label: "LDL",
      value: 190,
      valueText: "190 mg/dL",
      points: 9,
      sameAsReference: false,
      status: "high" as const,
      rangeText: "< 130 mg/dL",
      bar: { bandStart: 0, bandEnd: 60, marker: 85 },
      attention: true,
    };
    const rows = whyRows(drivers, [card]);
    expect(rows.map((row) => row.feature)).toEqual(["LDL", "DM"]);
    expect(rows[0]).toMatchObject({ points: 9, status: "high", rangeText: "< 130 mg/dL", bar: card.bar });
    // a yes/no answer has no range: no chip and no bar
    expect(rows[1]).toMatchObject({ status: null, rangeText: null, bar: null });
  });

  it("has no separate artery window: clicking an artery explains it in Why", () => {
    expect(WINDOW_IDS).not.toContain("vessel");
    expect(Object.keys(defaultLayout(1920, 1080)).sort()).toEqual([...WINDOW_IDS].sort());
  });
});

describe("factor breakdown", () => {
  const features: FeatureDefinition[] = [
    { name: "CP", label: "Chest pain type", group: "Symptoms", type: "categorical", default: "None", options: ["None", "Typical"] },
    { name: "RWMA", label: "Regional wall-motion abnormality", group: "Echo", type: "number", default: 0 },
  ];
  const explanation = (points: number) => ({
    base_value: 0.2,
    scale: "probability" as const,
    method: "test",
    contributions: points
      ? [{ feature: "CP", value: "Typical", contribution: points / 100, direction: "positive" as const }]
      : [],
  });
  const target = (probability: number) => ({ probability, threshold: 0.5, label: "", uncertain: false });
  const prediction = {
    request_id: "00000000-0000-4000-8000-000000000000",
    model_version: "test",
    risk_summary: "",
    mock: false,
    warnings: [],
    derived: { BMI: 25, Obesity: false },
    prediction_source: "test",
    cad: target(0.9),
    vessels: { LAD: target(0.9), LCX: target(0.7), RCA: target(0.4) },
    explanations: { cad: explanation(56), LAD: explanation(57), LCX: explanation(0.4), RCA: explanation(20) },
  } as PredictionResponse;

  it("lists the input's points for every target, in text", () => {
    const breakdown = factorBreakdown(prediction, features, "CP");
    expect(breakdown.label).toBe("Chest pain type");
    expect(breakdown.valueText).toBe("Typical");
    expect(breakdown.items.map((item) => [item.target, Math.round(item.points), item.moves])).toEqual([
      ["cad", 56, true],
      ["LAD", 57, true],
      // under one point: the heart hides this artery rather than fading it
      ["LCX", 0, false],
      ["RCA", 20, true],
    ]);
  });

  it("moves nothing when the input matches a typical patient", () => {
    const breakdown = factorBreakdown(prediction, features, "RWMA");
    expect(breakdown.valueText).toBeNull();
    expect(breakdown.items.every((item) => !item.moves && item.points === 0)).toBe(true);
  });
});

describe("explain on demand", () => {
  it("starts with Why closed, so the first screen is the patient and the risk", () => {
    expect(DEFAULT_OPEN.patient).toBe(true);
    expect(DEFAULT_OPEN.risk).toBe(true);
    expect(DEFAULT_OPEN.drivers).toBe(false);
  });

  it.each([
    [1280, 720],
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
  ])("centres Risk, with room for its button, in the right column of a %ix%i screen", (vw, vh) => {
    const open = defaultLayout(vw, vh, { whyOpen: true });
    const closed = defaultLayout(vw, vh, { whyOpen: false });
    expect(closed.risk.h).toBe(open.risk.h + EXPLAIN_SPACE);
    expect(closed.risk.x).toBe(open.risk.x);
    expect(closed.risk.y).toBeGreaterThan(open.risk.y);
    // equal space above and below, within the column between the top bar and the watermark
    const above = closed.risk.y - open.risk.y;
    const below = vh - 32 - (closed.risk.y + closed.risk.h);
    expect(Math.abs(above - below)).toBeLessThanOrEqual(1);
    expect(closed.risk.y + closed.risk.h).toBeLessThanOrEqual(vh - 30);
  });
});

