import { describe, expect, it } from "vitest";
import type { Explanation, FeatureDefinition, PredictionResponse } from "../api/types";
import { speakable, spokenSummary } from "./spokenSummary";

const features: FeatureDefinition[] = [
  { name: "Age", label: "Age", group: "Demographics", type: "number", unit: "years", default: 58 },
  { name: "LDL", label: "LDL cholesterol", group: "Lab", type: "number", unit: "mg/dL", default: 100 },
];
const explanation: Explanation & { scale: "probability"; method: string } = {
  base_value: 0.2,
  scale: "probability",
  method: "test",
  contributions: [
    { feature: "Age", value: 66, contribution: 0.2, direction: "positive" },
    { feature: "LDL", value: 160, contribution: 0.1, direction: "positive" },
  ],
};
const target = (probability: number, threshold: number, label: string, uncertain = false) => ({
  probability,
  threshold,
  label,
  uncertain,
});

function prediction(cadLabel: string): PredictionResponse {
  return {
    request_id: "00000000-0000-4000-8000-000000000000",
    model_version: "test",
    risk_summary: "",
    cad: target(0.67, 0.69, cadLabel),
    vessels: {
      LAD: { ...target(0.67, 0.43, cadLabel === "elevated" ? "elevated" : "not elevated"), capped: true },
      LCX: { ...target(0.1, 0.32, "not elevated", true), capped: false },
      RCA: { ...target(0.1, 0.39, "not elevated"), capped: false },
    },
    explanations: { cad: explanation, LAD: explanation, LCX: explanation, RCA: explanation },
    mock: false,
    warnings: [],
    derived: { BMI: 25, Obesity: false },
    prediction_source: "New patient",
  };
}

describe("spoken summary", () => {
  it("says units and abbreviations as words", () => {
    expect(speakable("LDL cholesterol (160 mg/dL), 12%, 4–11")).toBe(
      "LDL cholesterol (160 milligrams per decilitre), 12 percent, 4 to 11",
    );
  });

  it("explains a held-back artery and the uncertainty, and ends with the disclaimer", () => {
    const lines = spokenSummary(prediction("not elevated"), features);
    expect(lines[0]).toBe(
      "The estimated chance of significant coronary artery disease is 67 percent.",
    );
    expect(lines[1]).toContain("below the 69 percent decision threshold");
    expect(lines[2]).toContain("left anterior descending artery is above its own threshold");
    expect(lines[3]).toContain("not confident about the left circumflex artery");
    expect(lines.join(" ")).toContain("160 milligrams per decilitre");
    expect(lines[lines.length - 1]).toContain("not a diagnosis");
  });

  it("names flagged arteries", () => {
    const lines = spokenSummary(prediction("elevated"), features);
    expect(lines[2]).toBe(
      "Arteries flagged: the left anterior descending artery at 67 percent.",
    );
  });
});
