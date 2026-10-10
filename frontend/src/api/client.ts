import {
  FeatureSchema,
  ImportanceResponseSchema,
  type ImportanceResponse,
  MetricsResponseSchema,
  PredictRequestSchema,
  PredictionResponseSchema,
  SamplePatientSchema,
  type FeatureDefinition,
  type MetricsResponse,
  type PredictRequest,
  type PredictionResponse,
  type SamplePatient,
} from "./types";
import {
  parseApiProfile,
  validateFeaturesForProfile,
  validateSamplesForProfile,
  type ApiProfile,
} from "./profile";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function requestJson<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `API ${init?.method ?? "GET"} ${path} failed (${response.status}): ${body}`,
    );
  }

  const body: unknown = await response.json();
  return schema.parse(body);
}

export function fetchHealth(): Promise<ApiProfile> {
  return requestJson("/health", { parse: parseApiProfile });
}

export async function fetchFeatures(
  profile: ApiProfile,
): Promise<FeatureDefinition[]> {
  const definitions = await requestJson("/features", FeatureSchema.array());
  return validateFeaturesForProfile(profile, definitions);
}

export async function fetchSamples(
  profile: ApiProfile,
): Promise<SamplePatient[]> {
  const samples = await requestJson("/patients/samples", SamplePatientSchema.array());
  return validateSamplesForProfile(profile, samples);
}

export function postPredict(
  request: PredictRequest,
  profile: ApiProfile,
): Promise<PredictionResponse> {
  const payload = PredictRequestSchema.parse(request);
  const profileRequest =
    profile.mode === "real"
      ? payload
      : { features: payload.features };
  return requestJson("/predict", PredictionResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileRequest),
  }).then((prediction) => {
    if (prediction.mock !== (profile.mode === "mock")) {
      throw new Error(
        `The API response mode changed during the request; expected ${profile.mode}.`,
      );
    }
    return prediction;
  });
}

export function fetchMetrics(
  profile: ApiProfile,
): Promise<MetricsResponse> {
  return requestJson("/model/metrics", MetricsResponseSchema).then((metrics) => {
    if (metrics.mock !== (profile.mode === "mock")) {
      throw new Error(
        `The API metrics mode changed during the request; expected ${profile.mode}.`,
      );
    }
    return metrics;
  });
}

export function fetchImportance(
  profile: ApiProfile,
): Promise<ImportanceResponse | null> {
  // Global importance is a real-model (v1.1.0) endpoint; the mock contract has no equivalent.
  if (profile.mode !== "real") {
    return Promise.resolve(null);
  }
  return requestJson("/model/importance", ImportanceResponseSchema);
}
