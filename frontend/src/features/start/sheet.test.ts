import { describe, expect, it } from "vitest";
import type { FeatureDefinition } from "../../api/types";
import { readSheet } from "./sheet";

const FEATURES = [
  { name: "Age", label: "Age", group: "Demographics", type: "number", unit: "years", min: 18, max: 100, default: 58, description: "" },
  { name: "FBS", label: "Fasting blood sugar", group: "Lab", type: "number", unit: "mg/dL", min: 40, max: 600, default: 98, description: "" },
  { name: "DM", label: "Diabetes", group: "Demographics", type: "boolean", default: false, description: "" },
  { name: "Sex", label: "Sex", group: "Demographics", type: "categorical", options: ["Female", "Male"], default: "Male", description: "" },
] as FeatureDefinition[];

describe("readSheet", () => {
  it("matches columns by name or label, with or without a unit, and reads each cell", () => {
    const result = readSheet(
      ["Patient", "AGE", "Fasting blood sugar (mg/dL)", "Diabetes", "Notes"],
      [
        ["P-01", "68", "360", "Yes", "x"],
        ["P-02", "sixty", "", "no", ""],
      ],
      FEATURES,
    );
    expect(result.patients[0]).toEqual({ id: "P-01", values: { Age: 68, FBS: 360, DM: true, Sex: "Male" }, problems: [] });
    expect(result.patients[1].values).toEqual({ Age: 58, FBS: 98, DM: false, Sex: "Male" });
    expect(result.patients[1].problems).toHaveLength(2);
    expect(result.missing).toEqual(["Sex"]);
    expect(result.ignored).toEqual(["Notes"]);
  });

  it("rejects values outside an input's range and unknown options", () => {
    const result = readSheet(["Age", "Sex"], [["150", "other"]], FEATURES);
    expect(result.patients[0].id).toBe("Row 1");
    expect(result.patients[0].values).toMatchObject({ Age: 58, Sex: "Male" });
    expect(result.patients[0].problems).toHaveLength(2);
  });
});
