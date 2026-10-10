import {
  HealthResponseSchema,
  type FeatureDefinition,
  type HealthResponse,
  type SamplePatient,
} from "./types";

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

  const features = new Map(definitions.map((feature) => [feature.name, feature]));
  if (definitions.length !== 49 || features.size !== 49) {
    throw new Error(
      `Unsupported real API feature schema: expected 49 unique inputs, received ${definitions.length}.`,
    );
  }

  for (const forbidden of ["LAD", "LCX", "RCA", "Cath", "BMI", "Obesity", "Exertional CP"]) {
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

export function validateSamplesForProfile(
  profile: ApiProfile,
  samples: SamplePatient[],
): SamplePatient[] {
  if (profile.mode !== "real") {
    return samples;
  }

  const ids = new Set(samples.map((sample) => sample.id));
  if (
    samples.length !== 8 ||
    ids.size !== 8 ||
    samples.some(
      (sample) =>
        sample.synthetic ||
        Object.keys(sample.features).length !== 49,
    )
  ) {
    throw new Error(
      "Unsupported real API sample set: expected eight unique, non-synthetic patients with 49 inputs each.",
    );
  }

  return samples;
}
