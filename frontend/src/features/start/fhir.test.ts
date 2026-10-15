import { describe, expect, it } from "vitest";
import type { FeatureDefinition } from "../../api/types";
import { mapFhirBundle, type FhirBundle } from "./fhir";

const bundles = import.meta.glob<FhirBundle>("../../../public/demo/abha/patient-174-bundle.json", {
  eager: true,
  import: "default",
});
const demo = Object.values(bundles)[0];

function numeric(name: string, min = 0, max = 1000): FeatureDefinition {
  return { name, label: name, group: "Lab", type: "number", min, max, default: 0, description: "" } as FeatureDefinition;
}
function flag(name: string): FeatureDefinition {
  return { name, label: name, group: "Demographics", type: "boolean", default: false, description: "" } as FeatureDefinition;
}
const FEATURES = [
  ...["Age", "Weight", "Length", "PR", "BP", "FBS", "BUN", "CR", "Na", "K", "TG", "HDL", "LDL", "HB", "WBC", "Neut",
    "Lymph", "PLT", "ESR", "EF-TTE", "Region RWMA"].map((name) => numeric(name)),
  ...["DM", "HTN", "Airway", "Poor R Progression", "ST Elevation", "ST Depression", "T inversion", "Q Wave", "LVH"].map(
    flag,
  ),
  { name: "Sex", label: "Sex", group: "Demographics", type: "categorical", options: ["Female", "Male"], default: "Male", description: "" },
  { name: "BBB", label: "BBB", group: "ECG", type: "categorical", options: ["None", "LBBB", "RBBB"], default: "None", description: "" },
  { name: "VHD", label: "VHD", group: "Echo", type: "categorical", options: ["None", "Mild", "Moderate", "Severe"], default: "None", description: "" },
] as FeatureDefinition[];

describe("mapFhirBundle", () => {
  it("maps the demo ABHA record to patient 174's inputs", () => {
    const values = Object.fromEntries(mapFhirBundle(demo, FEATURES).map((item) => [item.name, item.value]));
    expect(values).toMatchObject({
      Age: 68, Sex: "Female", Weight: 60, Length: 150, PR: 80, BP: 130,
      FBS: 360, BUN: 52, CR: 1.3, Na: 150, K: 3.9, TG: 235, HDL: 30, LDL: 70, HB: 11, WBC: 8.6, Neut: 70, Lymph: 28,
      PLT: 190, ESR: 55, "EF-TTE": 55,
      DM: true, HTN: true, Airway: true,
      "Poor R Progression": true, "ST Elevation": false, "ST Depression": false, "T inversion": false,
      "Q Wave": false, LVH: false, BBB: "None", "Region RWMA": 0, VHD: "Mild",
    });
  });

  it("converts units, skips values out of range and ignores inactive diagnoses", () => {
    const bundle: FhirBundle = {
      resourceType: "Bundle",
      entry: [
        { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "1558-6" }] }, valueQuantity: { value: 7, code: "mmol/L" } } },
        { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "718-7" }] }, valueQuantity: { value: 110, code: "g/L" } } },
        { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "2085-9" }] }, valueQuantity: { value: 5000, code: "mg/dL" } } },
        { resource: { resourceType: "Condition", clinicalStatus: { coding: [{ code: "resolved" }] }, code: { coding: [{ system: "http://snomed.info/sct", code: "38341003" }] } } },
      ],
    };
    const values = Object.fromEntries(mapFhirBundle(bundle, FEATURES).map((item) => [item.name, item.value]));
    expect(values.FBS).toBeCloseTo(126.11, 1);
    expect(values.HB).toBe(11);
    expect(values).not.toHaveProperty("HDL");
    expect(values).not.toHaveProperty("HTN");
  });
});
