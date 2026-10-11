import { describe, expect, it } from "vitest";
import type {
  Explanation,
  FeatureDefinition,
  Target,
  TargetExplanations,
} from "../api/types";
import {
  buildArteryFlow,
  buildHeatmap,
  buildMeasurementGroups,
  buildWaterfall,
  factorImpact,
  formatPoints,
  formatRange,
  plainStory,
  rangeStatus,
} from "./insights";

const features: FeatureDefinition[] = [
  {
    name: "Chest Pain",
    label: "Chest pain type",
    group: "Symptoms/Exam",
    type: "categorical",
    default: "None",
    options: ["None", "Typical"],
  },
  {
    name: "LDL",
    label: "LDL cholesterol",
    group: "Lab",
    type: "number",
    unit: "mg/dL",
    default: 100,
    reference_range: { high: 100 },
    modifiable: true,
  },
  {
    name: "HDL",
    label: "HDL cholesterol",
    group: "Lab",
    type: "number",
    unit: "mg/dL",
    default: 39,
    reference_range: { low: 40 },
  },
  {
    name: "DM",
    label: "Diabetes",
    group: "Demographics",
    type: "boolean",
    default: false,
  },
  {
    name: "Dyspnea",
    label: "Shortness of breath",
    group: "Symptoms/Exam",
    type: "boolean",
    default: false,
  },
];

const explanation: Explanation = {
  base_value: 0.2,
  scale: "probability",
  method: "test",
  contributions: [
    {
      feature: "Chest Pain",
      value: "Typical",
      contribution: 0.45,
      direction: "positive",
    },
    {
      feature: "Dyspnea",
      value: true,
      contribution: -0.05,
      direction: "negative",
    },
    { feature: "LDL", value: 160, contribution: 0.08, direction: "positive" },
    { feature: "DM", value: true, contribution: 0.004, direction: "positive" },
  ],
};
const target: Target = {
  probability: 0.684,
  label: "elevated",
  threshold: 0.6,
  uncertain: true,
  capped: true,
};

describe("buildWaterfall", () => {
  it("walks additively from the reference patient to the returned probability", () => {
    const w = buildWaterfall(explanation, target, features, 2);
    expect(w.basePercent).toBeCloseTo(20);
    expect(w.steps.map((s) => s.feature)).toEqual(["Chest Pain", "LDL"]);
    expect(w.steps[0].start).toBeCloseTo(20);
    expect(w.steps[1].start).toBeCloseTo(w.steps[0].end);
    expect(w.other?.count).toBe(2);
    expect(w.other?.end).toBeCloseTo(68.4);
    expect(w.finalPercent).toBeCloseTo(68.4);
    expect(w.steps[1].valueText).toBe("160 mg/dL");
  });
});

describe("factor maps", () => {
  const explanations: TargetExplanations = {
    cad: explanation,
    LAD: {
      ...explanation,
      contributions: [
        {
          feature: "LDL",
          value: 160,
          contribution: 0.3,
          direction: "positive",
        },
      ],
    },
    LCX: { ...explanation, contributions: [] },
    RCA: {
      ...explanation,
      contributions: [
        {
          feature: "LDL",
          value: 160,
          contribution: -0.02,
          direction: "negative",
        },
      ],
    },
  };

  it("ranks factors by their strongest effect on any target and fills every target", () => {
    const rows = buildHeatmap(explanations, features, 3);
    expect(rows.map((r) => r.feature)).toEqual([
      "Chest Pain",
      "LDL",
      "Dyspnea",
    ]);
    expect(rows[1].cells).toEqual({ cad: 8, LAD: 30, LCX: 0, RCA: -2 });
  });

  it("reports a factor's points per target for the 3D highlight", () => {
    expect(factorImpact(explanations, "LDL")).toEqual({
      cad: 8,
      LAD: 30,
      LCX: 0,
      RCA: -2,
    });
  });
});

describe("measurements", () => {
  it("flags reference-range status and formats ranges for people", () => {
    expect(rangeStatus(160, { high: 100 })).toBe("high");
    expect(rangeStatus(35, { low: 40 })).toBe("low");
    expect(rangeStatus(50, { low: 40 })).toBe("normal");
    expect(rangeStatus(true, { low: 40 })).toBeNull();
    const lab = (name: string, unit: string) => ({
      name,
      label: name,
      group: "Lab",
      type: "number" as const,
      unit,
      default: 0,
    });
    expect(formatRange({ high: 100 }, lab("LDL", "mg/dL"))).toBe("< 100 mg/dL");
    expect(formatRange({ low: 4, high: 11 }, lab("WBC", "x10^3/uL"))).toBe(
      "4–11 ×10³/µL",
    );
  });

  it("groups cards by body system, marks attention and inputs equal to the reference", () => {
    const groups = buildMeasurementGroups(
      features,
      { HDL: 39, LDL: 160 },
      explanation,
    );
    const lab = groups.find((g) => g.group === "Lab");
    expect(lab?.cards.map((c) => c.feature)).toEqual(["LDL", "HDL"]);
    const [ldl, hdl] = lab?.cards ?? [];
    expect(ldl.attention && ldl.status === "high" && ldl.points === 8).toBe(
      true,
    );
    expect(hdl.sameAsReference && hdl.status === "low" && hdl.attention).toBe(
      true,
    );
    expect(
      groups.find((g) => g.group === "Demographics")?.cards[0].attention,
    ).toBe(false); // 0.4 pts
  });
});

describe("plainStory", () => {
  it("states the estimate, the reasons in points and the caveats", () => {
    const story = plainStory("LAD", target, explanation, features);
    expect(story.headline).toContain("68% estimated chance");
    expect(story.headline).toContain("above the 60% decision threshold");
    expect(story.baseline).toContain("20%");
    expect(story.raising[0]).toBe("Chest pain type: typical (+45 pts)");
    expect(story.lowering).toEqual(["Shortness of breath (−5 pts)"]);
    expect(story.notes).toHaveLength(2);
  });

  it("formats points with a sign", () => {
    expect(formatPoints(12.34)).toBe("+12.3 pts");
    expect(formatPoints(-0.04)).toBe("0 pts");
    expect(formatPoints(-5, 0)).toBe("−5 pts");
  });
});

describe("buildArteryFlow", () => {
  const contribution = (feature: string, points: number) => ({
    feature,
    value: true,
    contribution: points / 100,
    direction: points >= 0 ? ("positive" as const) : ("negative" as const),
  });
  const explanations: TargetExplanations = {
    cad: { ...explanation, contributions: [contribution("DM", 90)] },
    LAD: {
      ...explanation,
      contributions: [
        contribution("Chest Pain", 58),
        contribution("Dyspnea", -4),
        contribution("LDL", 2),
      ],
    },
    LCX: {
      ...explanation,
      contributions: [contribution("Chest Pain", 51), contribution("HDL", 3)],
    },
    RCA: {
      ...explanation,
      contributions: [
        contribution("Chest Pain", 21),
        contribution("Dyspnea", -6),
        contribution("LDL", -1),
      ],
    },
  };

  it("ranks factors by total movement across the arteries only, keeping signed links per artery", () => {
    const flow = buildArteryFlow(explanations, features, 2);

    expect(flow.factors.map((factor) => factor.feature)).toEqual([
      "Chest Pain",
      "Dyspnea",
    ]);
    expect(flow.factors[0].links.LAD).toBeCloseTo(58);
    expect(flow.factors[0].links.LCX).toBeCloseTo(51);
    expect(flow.factors[0].links.RCA).toBeCloseTo(21);
    expect(flow.factors[0].label).toBe("Chest pain type");
    expect(flow.factors[1].links.LAD).toBeCloseTo(-4);
    expect(flow.factors[1].links.LCX).toBe(0);
    expect(flow.factors[1].links.RCA).toBeCloseTo(-6);
    // CAD-only factors are not artery drivers
    expect(flow.factors.some((factor) => factor.feature === "DM")).toBe(false);
  });

  it("combines the rest as net points per artery and reports how much the top factors explain", () => {
    const flow = buildArteryFlow(explanations, features, 2);

    expect(flow.other?.count).toBe(2);
    expect(flow.other?.links.LAD).toBeCloseTo(2);
    expect(flow.other?.links.LCX).toBeCloseTo(3);
    expect(flow.other?.links.RCA).toBeCloseTo(-1);
    expect(flow.coverage).toBeCloseTo(140 / 146);
    expect(buildArteryFlow(explanations, features, 10).other).toBeNull();
  });
});
