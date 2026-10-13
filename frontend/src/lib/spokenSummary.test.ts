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

  it("summarises the result, the arteries, the main factors and what to do next", () => {
    const lines = spokenSummary(prediction("not elevated"), features, {});
    expect(lines).toEqual([
      "This 66-year-old patient has a 67 percent chance of significant coronary artery disease.",
      "That is below the alert level of 69 percent.",
      "No artery is flagged, although the left anterior descending artery is fairly high at 67 percent.",
      "The model is unsure about the left circumflex artery.",
      "The two main factors raising the risk are age 66 and LDL cholesterol of 160 milligrams per decilitre.",
      "A doctor will weigh this with the symptoms and any other tests.",
      "This is decision support, not a diagnosis.",
    ]);
  });

  it("names the flagged arteries, the readings out of range and suggests next steps", () => {
    const withRange = features.map((feature) =>
      feature.name === "LDL" ? { ...feature, reference_range: { high: 100 } } : feature,
    );
    const lines = spokenSummary(prediction("elevated"), withRange, { Sex: "Male" });
    expect(lines[0]).toBe("This patient, a 66-year-old man, has a 67 percent chance of significant coronary artery disease.");
    expect(lines).toContain("The artery most likely to be narrowed is the left anterior descending artery at 67 percent.");
    expect(lines).toContain("High readings: LDL cholesterol 160.");
    expect(lines).toContain("Further tests, such as an angiogram, may be worth discussing with a cardiologist.");
  });
});
