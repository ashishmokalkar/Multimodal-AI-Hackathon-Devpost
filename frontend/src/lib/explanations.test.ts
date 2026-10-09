import { describe, expect, it } from "vitest";
import type {
  Contribution,
  FeatureDefinition,
  TargetExplanations,
} from "../api/types";
import {
  explanationForSelection,
  explanationTargetFor,
  formatContributionInput,
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
    expect(explanationForSelection(explanations, "LAD")).toBe(
      explanations.LAD,
    );
    expect(explanationForSelection(explanations, "LCX")).toBe(
      explanations.LCX,
    );
    expect(explanationForSelection(explanations, "RCA")).toBe(
      explanations.RCA,
    );
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
      -0.4,
      0.4,
      0.3,
      -0.2,
      0,
    ]);
    expect(first[0]).toMatchObject({ value: 67, unit: "years" });
    expect(first[1]).toMatchObject({ value: true });
    expect(formatContributionInput(first[0].value, first[0].unit)).toBe(
      "67 years",
    );
    expect(formatContributionInput(first[1].value, first[1].unit)).toBe("Yes");
    expect(formatContributionInput(55, "%")).toBe("55%");
  });

  it("returns no invented drivers when the selected target has none", () => {
    expect(leadingContributions([], metadata)).toEqual([]);
  });
});
