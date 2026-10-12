import { describe, expect, it } from "vitest";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import { checkAngiogram, summarisePatient } from "./patientSummary";

const features: FeatureDefinition[] = [
  { name: "DM", label: "Diabetes", group: "Demographics", type: "boolean", default: false },
  { name: "HTN", label: "High blood pressure", group: "Demographics", type: "boolean", default: false },
  { name: "Smoking", label: "Smoking", group: "Demographics", type: "categorical", default: "Never", options: ["Never", "Former", "Current"] },
  { name: "Chest Pain", label: "Chest pain type", group: "Symptoms/Exam", type: "categorical", default: "None", options: ["None", "Typical", "Atypical", "Non-anginal"] },
  { name: "Dyspnea", label: "Shortness of breath", group: "Symptoms/Exam", type: "boolean", default: false },
  { name: "Region RWMA", label: "Regional wall-motion abnormality", group: "Echo", type: "categorical", default: 0, options: [0, 1, 2, 3, 4] },
  { name: "BP", label: "Blood pressure (systolic)", group: "Symptoms/Exam", type: "number", default: 120, unit: "mmHg", reference_range: { low: 90, high: 120 } },
  { name: "TG", label: "Triglycerides", group: "Lab", type: "number", default: 120, unit: "mg/dL", reference_range: { high: 150 } },
  { name: "LDL", label: "LDL cholesterol", group: "Lab", type: "number", default: 90, unit: "mg/dL", reference_range: { high: 100 } },
  { name: "EF-TTE", label: "Ejection fraction", group: "Echo", type: "number", default: 55, unit: "%", reference_range: { low: 50 } },
] as FeatureDefinition[];

describe("patient summary", () => {
  const patient97 = {
    DM: false,
    HTN: false,
    Smoking: "Never",
    "Chest Pain": "Typical",
    Dyspnea: true,
    "Region RWMA": 1,
    BP: 110,
    TG: 210,
    LDL: 144,
    "EF-TTE": 50,
  };

  it("lists what the patient came in with and what the tests found, in words", () => {
    const summary = summarisePatient(patient97, features);
    expect(summary.presenting).toEqual(["Typical chest pain", "Short of breath"]);
    expect(summary.findings).toEqual(["Wall-motion abnormality (1 region)"]);
  });

  it("shows only the history that is present, and says how much was checked when none is", () => {
    const none = summarisePatient(patient97, features);
    expect(none.history).toEqual([]);
    expect(none.historyChecked).toBe(3);
    const some = summarisePatient({ ...patient97, DM: true, Smoking: "Former" }, features);
    expect(some.history).toEqual(["Diabetes", "Former smoker"]);
  });

  it("puts the measurements furthest outside their range first, with units", () => {
    const summary = summarisePatient(patient97, features);
    expect(summary.outOfRange.map((item) => [item.label, item.valueText, item.status])).toEqual([
      ["LDL", "144 mg/dL", "high"],
      ["Triglycerides", "210 mg/dL", "high"],
    ]);
    // the routine values in range are kept, quietly
    expect(summary.normal.map((item) => item.label)).toEqual(["BP (systolic)", "EF"]);
  });

  it("never states what the model makes of the facts", () => {
    const summary = summarisePatient(patient97, features);
    const text = JSON.stringify(summary);
    expect(text).not.toMatch(/pts|points|raises|lowers/);
  });
});

describe("angiogram check", () => {
  const target = (probability: number, threshold: number) => ({ probability, threshold, label: "", uncertain: false });
  const prediction = {
    cad: target(0.9, 0.69),
    vessels: { LAD: target(0.9, 0.55), LCX: target(0.2, 0.32), RCA: target(0.42, 0.39) },
  } as PredictionResponse;

  it("counts the targets where the model agreed with the angiogram", () => {
    const result = checkAngiogram(
      { cad: true, vessels: { LAD: true, LCX: true, RCA: false } },
      prediction,
    );
    expect(result.matched).toBe(2);
    expect(result.items.filter((item) => !item.matched).map((item) => [item.target, item.narrowed, item.flagged])).toEqual([
      ["LCX", true, false],
      ["RCA", false, true],
    ]);
  });
});
