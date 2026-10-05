import {
  FeatureSchema,
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

export function fetchFeatures(): Promise<FeatureDefinition[]> {
  return requestJson("/features", FeatureSchema.array());
}

export function fetchSamples(): Promise<SamplePatient[]> {
  return requestJson("/patients/samples", SamplePatientSchema.array());
}

export function postPredict(
  request: PredictRequest,
): Promise<PredictionResponse> {
  const payload = PredictRequestSchema.parse(request);
  return requestJson("/predict", PredictionResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchMetrics(): Promise<MetricsResponse> {
  return requestJson("/model/metrics", MetricsResponseSchema);
}
