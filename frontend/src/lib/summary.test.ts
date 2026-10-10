import { describe, expect, it } from "vitest";
import type { Explanation, FeatureDefinition } from "../api/types";
import { buildDrivers, driverPhrase, driverSentence } from "./summary";

const features: FeatureDefinition[] = [
  {
    name: "Chest Pain",
    label: "Chest pain type",
    group: "Symptoms",
    type: "categorical",
    default: "None",
    options: ["None", "Atypical"],
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
    default: 50,
  },
  {
    name: "Age",
    label: "Age",
    group: "Demographics",
    type: "number",
    unit: "years",
    default: 58,
  },
];
const contribution = (
  feature: string,
  value: string | number | boolean,
  points: number,
) => ({
  feature,
  value,
  contribution: points / 100,
  direction: points >= 0 ? ("positive" as const) : ("negative" as const),
});
const explanation: Explanation = {
  base_value: 0.18,
  scale: "probability",
  method: "test",
  contributions: [
    contribution("Age", 62, 0.4),
    contribution("EF-TTE", 55, -15),
    contribution("Chest Pain", "Atypical", 26),
    contribution("DM", true, 17),
  ],
};

describe("buildDrivers", () => {
  it("orders inputs by effect size, drops sub-point effects into the rest and keeps the totals", () => {
    const summary = buildDrivers(explanation, features, 0.282);

    expect(summary.basePercent).toBeCloseTo(18);
    expect(summary.finalPercent).toBeCloseTo(28.2);
    expect(summary.drivers.map((driver) => driver.feature)).toEqual([
      "Chest Pain",
      "DM",
      "EF-TTE",
    ]);
    expect(summary.drivers[2]).toMatchObject({
      label: "Ejection fraction",
      valueText: "55%",
    });
    expect(summary.rest?.count).toBe(1);
    expect(summary.rest?.points).toBeCloseTo(0.4);
  });

  it("limits the rows and combines everything else", () => {
    const summary = buildDrivers(explanation, features, 0.282, 2);

    expect(summary.drivers).toHaveLength(2);
    expect(summary.rest?.count).toBe(2);
    expect(summary.rest?.points).toBeCloseTo(-14.6);
  });
});

describe("driverSentence", () => {
  it("names what raises and what lowers the estimate in plain words", () => {
    expect(driverSentence(buildDrivers(explanation, features, 0.282))).toBe(
      "Mainly raised by chest pain type (atypical) and diabetes. Ejection fraction (55%) lowers it.",
    );
    expect(driverPhrase({ label: "Diabetes", valueText: "No" })).toBe(
      "no diabetes",
    );
  });

  it("says so when nothing moves the estimate", () => {
    expect(
      driverSentence(
        buildDrivers({ ...explanation, contributions: [] }, features, 0.18),
      ),
    ).toBe(
      "No single input moves this estimate much from a typical patient's.",
    );
  });
});
