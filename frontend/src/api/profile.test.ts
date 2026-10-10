import { describe, expect, it } from "vitest";
import type { FeatureDefinition, SamplePatient } from "./types";
import {
  REQUIRED_REAL_FEATURES,
  parseApiProfile,
  validateFeaturesForProfile,
  validateSamplesForProfile,
} from "./profile";

const mockProfile = parseApiProfile({
  status: "ok",
  model_version: "mock-1.0.0",
  contract_version: "1.0.0",
  mock: true,
});
const realProfile = parseApiProfile({
  status: "ok",
  model_version: "cardiotwin-v2.0.0",
  contract_version: "1.1.0",
  mock: false,
});

function feature(
  name: string,
  type: FeatureDefinition["type"] = "number",
  options?: FeatureDefinition["options"],
  unit?: string,
): FeatureDefinition {
  return {
    name,
    label: name,
    group: "Fixture",
    type,
    default: type === "number" ? 1 : false,
    ...(options ? { options } : {}),
    ...(unit ? { unit } : {}),
  };
}

const SPECIAL: Record<string, FeatureDefinition> = {
  BBB: feature("BBB", "categorical", ["None", "LBBB", "RBBB"]),
  VHD: feature("VHD", "categorical", ["None", "Mild", "Moderate", "Severe"]),
  "Function Class": feature("Function Class", "categorical", [0, 1, 2, 3]),
  "Chest Pain": feature("Chest Pain", "categorical", [
    "None",
    "Typical",
    "Atypical",
    "Non-anginal",
  ]),
  Smoking: feature("Smoking", "categorical", ["Never", "Former", "Current"]),
  WBC: feature("WBC", "number", undefined, "x10^3/uL"),
};

function realFeatures(): FeatureDefinition[] {
  return REQUIRED_REAL_FEATURES.map((name) => SPECIAL[name] ?? feature(name));
}

function realSamples(): SamplePatient[] {
  const features = Object.fromEntries(
    realFeatures().map(({ name, default: value }) => [name, value]),
  );
  return Array.from({ length: 8 }, (_, index) => ({
    id: `patient-${index + 1}`,
    label: `Dataset patient ${index + 1}`,
    features,
    synthetic: false,
  }));
}

describe("API profile validation", () => {
  it("accepts only the supported health mode and contract-version pairs", () => {
    expect(mockProfile).toMatchObject({ mode: "mock" });
    expect(realProfile).toMatchObject({
      mode: "real",
      id: "real:1.1.0:cardiotwin-v2.0.0",
    });
    expect(() =>
      parseApiProfile({
        status: "ok",
        model_version: "mock-1.0.0",
        contract_version: "1.1.0",
        mock: true,
      }),
    ).toThrow("Unsupported API profile");
    expect(() =>
      parseApiProfile({
        status: "degraded",
        model_version: "cardiotwin-v2.0.0",
        contract_version: "1.1.0",
        mock: false,
      }),
    ).toThrow("degraded status");
  });

  it("validates the real 49-input profile and its categorical and unit metadata", () => {
    expect(
      validateFeaturesForProfile(realProfile, realFeatures()),
    ).toHaveLength(49);
    expect(
      validateFeaturesForProfile(mockProfile, [feature("Mock-only field")]),
    ).toHaveLength(1);

    const duplicate = [...realFeatures(), feature("WBC")];
    expect(() => validateFeaturesForProfile(realProfile, duplicate)).toThrow(
      "unique",
    );

    // new inputs can be added without a frontend change; required ones cannot disappear
    expect(
      validateFeaturesForProfile(realProfile, [
        ...realFeatures(),
        feature("New biomarker"),
      ]),
    ).toHaveLength(50);
    expect(() =>
      validateFeaturesForProfile(
        realProfile,
        realFeatures().filter((item) => item.name !== "LDL"),
      ),
    ).toThrow("missing required inputs LDL");

    const wrongUnit = realFeatures().map((item) =>
      item.name === "WBC" ? { ...item, unit: "uL" } : item,
    );
    expect(() => validateFeaturesForProfile(realProfile, wrongUnit)).toThrow(
      "WBC unit",
    );
  });

  it("requires unique, non-synthetic real sample patients whose inputs match the features", () => {
    expect(validateSamplesForProfile(realProfile, realSamples())).toHaveLength(
      8,
    );
    expect(
      validateSamplesForProfile(mockProfile, [
        { id: "synthetic", label: "Mock", features: {}, synthetic: true },
      ]),
    ).toHaveLength(1);

    const syntheticSample = realSamples();
    syntheticSample[0] = { ...syntheticSample[0], synthetic: true };
    expect(() =>
      validateSamplesForProfile(realProfile, syntheticSample),
    ).toThrow("unique, non-synthetic");

    const names = realFeatures().map((item) => item.name);
    expect(
      validateSamplesForProfile(realProfile, realSamples().slice(0, 3), names),
    ).toHaveLength(3);
    expect(() => validateSamplesForProfile(realProfile, [], names)).toThrow(
      "at least one",
    );
    expect(() =>
      validateSamplesForProfile(realProfile, realSamples(), [
        ...names,
        "New biomarker",
      ]),
    ).toThrow("match the feature list");
  });
});
