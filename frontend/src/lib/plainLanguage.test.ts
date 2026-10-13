import { describe, expect, it } from "vitest";
import type { FeatureDefinition } from "../api/types";
import { plainFinding, plainWarnings } from "./plainLanguage";

const fbs: FeatureDefinition = {
  name: "FBS",
  label: "Fasting blood sugar",
  group: "Lab",
  type: "number",
  unit: "mg/dL",
  default: 98,
};

describe("plain language for patients", () => {
  it("words findings without jargon", () => {
    expect(plainFinding("DM", true)).toBe("Having diabetes");
    expect(plainFinding("CRF", false)).toBe("No kidney disease");
    expect(plainFinding("Chest Pain", "Typical")).toBe(
      "Chest pain that sounds like it comes from the heart",
    );
    expect(plainFinding("Region RWMA", 2)).toBe(
      "2 areas of heart wall moving less well on the scan",
    );
    expect(plainFinding("FBS", 227, fbs)).toBe("Blood sugar (fasting): 227 mg/dL");
  });

  it("drops technical figures from reliability notes", () => {
    const notes = plainWarnings([
      "Validated accuracy is lower for patients aged 65 or over (ROC-AUC CAD 0.85, LAD 0.81).",
    ]);
    expect(notes).toEqual(["The tool is a little less accurate for people aged 65 and over."]);
    expect(notes.join(" ")).not.toMatch(/ROC|AUC/);
  });
});
