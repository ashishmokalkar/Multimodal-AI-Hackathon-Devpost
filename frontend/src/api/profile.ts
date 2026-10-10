import {
  HealthResponseSchema,
  type FeatureDefinition,
  type HealthResponse,
  type SamplePatient,
} from "./types";

/**
 * Inputs the real v1.1.0 model needs. The API may add more inputs without breaking the frontend; these must be
 * present.
 */
export const REQUIRED_REAL_FEATURES: readonly string[] = [
  "Age",
  "Weight",
  "Length",
  "Sex",
  "DM",
  "HTN",
  "Smoking",
  "FH",
  "CRF",
  "CVA",
  "Airway",
  "Thyroid Disease",
  "CHF",
  "DLP",
  "BP",
  "PR",
  "Chest Pain",
  "Dyspnea",
  "Function Class",
  "LowTH Ang",
  "Edema",
  "Weak Peripheral Pulse",
  "Lung rales",
  "Systolic Murmur",
  "Diastolic Murmur",
  "Q Wave",
  "ST Elevation",
  "ST Depression",
  "T inversion",
  "LVH",
  "Poor R Progression",
  "BBB",
  "FBS",
  "CR",
  "TG",
  "LDL",
  "HDL",
  "BUN",
  "ESR",
  "HB",
  "K",
  "Na",
  "WBC",
  "Lymph",
  "Neut",
  "PLT",
  "EF-TTE",
  "Region RWMA",
  "VHD",
];

export interface ApiProfile {
  id: string;
  mode: "mock" | "real";
  health: HealthResponse;
}

export function parseApiProfile(value: unknown): ApiProfile {
  const health = HealthResponseSchema.parse(value);

  if (health.status !== "ok") {
    throw new Error(`The configured API reports ${health.status} status.`);
  }

  const mode =
    health.mock && health.contract_version === "1.0.0"
      ? "mock"
      : !health.mock && health.contract_version === "1.1.0"
        ? "real"
        : null;

  if (mode === null) {
    throw new Error(
      `Unsupported API profile: mock=${health.mock}, contract ${health.contract_version}. Supported profiles are mock v1.0.0 and real v1.1.0.`,
    );
  }

  return {
    id: `${mode}:${health.contract_version}:${health.model_version}`,
    mode,
    health,
  };
}

function requireFeature(
  features: ReadonlyMap<string, FeatureDefinition>,
  name: string,
  type: FeatureDefinition["type"],
  options?: readonly (string | number)[],
): FeatureDefinition {
  const feature = features.get(name);
  if (
    !feature ||
    feature.type !== type ||
    (options !== undefined &&
      JSON.stringify(feature.options) !== JSON.stringify(options))
  ) {
    throw new Error(
      `Unsupported real API feature metadata for ${name}; reload only after the API implements the approved v1.1.0 profile.`,
    );
  }
  return feature;
}

export function validateFeaturesForProfile(
  profile: ApiProfile,
  definitions: FeatureDefinition[],
): FeatureDefinition[] {
  if (profile.mode !== "real") {
    return definitions;
  }

  const features = new Map(
    definitions.map((feature) => [feature.name, feature]),
  );
  if (features.size !== definitions.length) {
    throw new Error(
      "Unsupported real API feature schema: input names must be unique.",
    );
  }
  const missing = REQUIRED_REAL_FEATURES.filter((name) => !features.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Unsupported real API feature schema: missing required inputs ${missing.join(", ")}.`,
    );
  }

  for (const forbidden of [
    "LAD",
    "LCX",
    "RCA",
    "Cath",
    "BMI",
    "Obesity",
    "Exertional CP",
  ]) {
    if (features.has(forbidden)) {
      throw new Error(
        `Unsupported real API feature schema: ${forbidden} must not be an input.`,
      );
    }
  }

  requireFeature(features, "BBB", "categorical", ["None", "LBBB", "RBBB"]);
  requireFeature(features, "VHD", "categorical", [
    "None",
    "Mild",
    "Moderate",
    "Severe",
  ]);
  requireFeature(features, "Function Class", "categorical", [0, 1, 2, 3]);
  requireFeature(features, "Chest Pain", "categorical", [
    "None",
    "Typical",
    "Atypical",
    "Non-anginal",
  ]);
  requireFeature(features, "Smoking", "categorical", [
    "Never",
    "Former",
    "Current",
  ]);
  if (requireFeature(features, "WBC", "number").unit !== "x10^3/uL") {
    throw new Error(
      "Unsupported real API WBC unit; the frontend must send x10^3/uL without conversion.",
    );
  }

  return definitions;
}

/**
 * Real-profile samples: at least one, unique ids, real (non-synthetic) patients, and each sample's inputs must
 * match the /features names (or, when those are not known yet, include every required input).
 */
export function validateSamplesForProfile(
  profile: ApiProfile,
  samples: SamplePatient[],
  featureNames?: readonly string[],
): SamplePatient[] {
  if (profile.mode !== "real") {
    return samples;
  }

  const ids = new Set(samples.map((sample) => sample.id));
  const expected = featureNames ? new Set(featureNames) : null;
  const inputsMatch = (sample: SamplePatient) => {
    const keys = Object.keys(sample.features);
    return expected
      ? keys.length === expected.size && keys.every((key) => expected.has(key))
      : REQUIRED_REAL_FEATURES.every((name) => name in sample.features);
  };
  if (
    samples.length < 1 ||
    ids.size !== samples.length ||
    samples.some((sample) => sample.synthetic || !inputsMatch(sample))
  ) {
    throw new Error(
      "Unsupported real API sample set: expected at least one unique, non-synthetic patient whose inputs match the feature list.",
    );
  }

  return samples;
}
