import { describe, expect, it } from "vitest";
import type {
  Contribution,
  FeatureDefinition,
  TargetExplanations,
} from "../api/types";
import {
  explanationForSelection,
  explanationTargetFor,
  formatContributionValue,
  formatContributionInput,
  groupPredictionInputs,
  leadingContributions,
} from "./explanations";

const feature = (
  name: string,
  value: Contribution["value"],
  contribution: number,
): Contribution => ({
  feature: name,
  value,
  contribution,
  direction: contribution < 0 ? "negative" : "positive",
});

const explanation = (featureName: string) => ({
  base_value: 0.5,
  contributions: [feature(featureName, 1, 0.1)],
});

const explanations: TargetExplanations = {
  cad: explanation("CAD driver"),
  LAD: explanation("LAD driver"),
  LCX: explanation("LCX driver"),
  RCA: explanation("RCA driver"),
};

const metadata: FeatureDefinition[] = [
  {
    name: "Age",
    label: "Age",
    group: "Demographics",
    type: "number",
    unit: "years",
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
  {
    name: "EF-TTE",
    label: "Ejection fraction",
    group: "Echo",
    type: "number",
    unit: "%",
    default: 0,
  },
  {
    name: "Region RWMA",
    label: "Regional wall motion abnormality",
    group: "Echo",
    type: "categorical",
    default: "No",
  },
  {
    name: "Smoker",
    label: "Smoking status",
    group: "Demographics",
    type: "boolean",
    default: false,
  },
];

describe("explanation selection and presentation", () => {
  it("selects the exact response explanation for CAD and each vessel", () => {
    expect(explanationTargetFor(null)).toBe("cad");
    expect(explanationForSelection(explanations, null)).toBe(explanations.cad);
    expect(explanationForSelection(explanations, "LAD")).toBe(explanations.LAD);
    expect(explanationForSelection(explanations, "LCX")).toBe(explanations.LCX);
    expect(explanationForSelection(explanations, "RCA")).toBe(explanations.RCA);
  });

  it("sorts by absolute contribution with stable response-order ties and metadata", () => {
    const contributions = [
      feature("Age", 67, -0.4),
      feature("Typical Chest Pain", true, 0.4),
      feature("DM", false, 0.3),
      feature("EF-TTE", 55, -0.2),
      feature("Region RWMA", "Inferior", 0),
      feature("Smoker", true, 0),
    ];

    const first = leadingContributions(contributions, metadata);
    const second = leadingContributions(contributions, metadata);

    expect(first).toEqual(second);
    expect(first.map(({ feature: name }) => name)).toEqual([
      "Age",
      "Typical Chest Pain",
      "DM",
      "EF-TTE",
      "Region RWMA",
    ]);
    expect(first.map(({ label }) => label)).toEqual([
      "Age",
      "Typical chest pain",
      "Diabetes",
      "Ejection fraction",
      "Regional wall motion abnormality",
    ]);
    expect(first.map(({ contribution }) => contribution)).toEqual([
      -0.4, 0.4, 0.3, -0.2, 0,
    ]);
    expect(first[0]).toMatchObject({ value: 67, unit: "years" });
    expect(first[1]).toMatchObject({ value: true });
    expect(formatContributionInput(first[0].value, first[0].unit)).toBe(
      "67 years",
    );
    expect(formatContributionInput(first[1].value, first[1].unit)).toBe("Yes");
    expect(formatContributionInput(55, "%")).toBe("55%");
  });

  it("supports a top-ten limit without changing its default top-five behavior", () => {
    const contributions = [
      feature("F0", 0, -0.9),
      feature("F1", 1, 0.9),
      feature("F2", 2, -0.8),
      feature("F3", 3, 0.7),
      feature("F4", 4, -0.6),
      feature("F5", 5, 0.5),
      feature("F6", 6, -0.4),
      feature("F7", 7, 0.3),
      feature("F8", 8, -0.2),
      feature("F9", 9, 0.1),
      feature("F10", 10, 0),
    ];

    expect(leadingContributions(contributions, [])).toHaveLength(5);
    const topTen = leadingContributions(contributions, [], 10);
    expect(topTen).toHaveLength(10);
    expect(topTen.map(({ feature: name }) => name)).toEqual([
      "F0",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "F6",
      "F7",
      "F8",
      "F9",
    ]);
    expect(topTen[0].contribution).toBe(-0.9);
    expect(topTen[1].contribution).toBe(0.9);
    expect(formatContributionValue(0)).toBe("0.000");
    expect(formatContributionValue(0.1)).toBe("+0.100");
    expect(formatContributionValue(-0.2)).toBe("-0.200");
  });

  it("groups accepted input snapshots and preserves missing versus zero attribution", () => {
    const groups = groupPredictionInputs(
      metadata,
      {
        Age: 51,
        "Typical Chest Pain": false,
        DM: false,
        "EF-TTE": 60,
        Smoker: true,
      },
      [
        feature("Age", 67, -0.2),
        feature("EF-TTE", 0, 0),
        feature("Smoker", false, 0.3),
      ],
    );
    const rows = new Map(
      groups.flatMap(({ rows: groupRows }) =>
        groupRows.map((row) => [row.feature, row]),
      ),
    );

    expect(rows.get("Age")).toMatchObject({
      value: 67,
      contribution: -0.2,
      unit: "years",
    });
    expect(rows.get("Typical Chest Pain")).toMatchObject({
      value: false,
      contribution: null,
    });
    expect(rows.get("EF-TTE")).toMatchObject({
      value: 0,
      contribution: 0,
      unit: "%",
    });
    expect(rows.get("Smoker")).toMatchObject({
      value: false,
      contribution: 0.3,
    });
    expect(rows.get("DM")).toMatchObject({
      value: false,
      contribution: null,
    });
  });

  it("marks absent input values unavailable and preserves returned values without a snapshot", () => {
    const groups = groupPredictionInputs(metadata, null, [
      feature("EF-TTE", 0, 0),
      feature("Unlisted feature", "returned", -0.1),
    ]);
    const rows = new Map(
      groups.flatMap(({ rows: groupRows }) =>
        groupRows.map((row) => [row.feature, row]),
      ),
    );

    expect(rows.get("Age")).toMatchObject({
      value: null,
      contribution: null,
    });
    expect(rows.get("EF-TTE")).toMatchObject({ value: 0, contribution: 0 });
    expect(rows.get("Unlisted feature")).toMatchObject({
      value: "returned",
      contribution: -0.1,
      group: "Other returned features",
    });
  });

  it("returns no invented drivers when the selected target has none", () => {
    expect(leadingContributions([], metadata)).toEqual([]);
  });
});
