import { afterEach, describe, expect, it, vi } from "vitest";
import { postPredict } from "./client";
import { parseApiProfile } from "./profile";

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

const target = { probability: 0.6, label: "elevated", threshold: 0.5 };
const explanation = { base_value: 0.4, contributions: [] };
const mockPrediction = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "mock-1.0.0",
  cad: target,
  vessels: { LAD: target, LCX: target, RCA: target },
  explanations: {
    cad: explanation,
    LAD: explanation,
    LCX: explanation,
    RCA: explanation,
  },
  risk_summary: "Mock fixture.",
  mock: true,
};
const realPrediction = {
  ...mockPrediction,
  model_version: "cardiotwin-v2.0.0",
  cad: { ...target, uncertain: false },
  vessels: {
    LAD: { ...target, uncertain: false },
    LCX: { ...target, uncertain: true },
    RCA: { ...target, uncertain: false },
  },
  explanations: {
    cad: {
      ...explanation,
      scale: "probability",
      method: "Baseline Shapley on served probability.",
    },
    LAD: {
      ...explanation,
      scale: "probability",
      method: "Baseline Shapley on served probability.",
    },
    LCX: {
      ...explanation,
      scale: "probability",
      method: "Baseline Shapley on served probability.",
    },
    RCA: {
      ...explanation,
      scale: "probability",
      method: "Baseline Shapley on served probability.",
    },
  },
  mock: false,
  warnings: [],
  derived: { BMI: 24.2, Obesity: false },
  prediction_source: "Dataset patient 1: scored by models trained without this patient",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response: unknown) {
  const requests: Array<{ url: string; body: string }> = [];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        url: input.toString(),
        body: String(init?.body),
      });
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return requests;
}

describe("predict API profile requests", () => {
  it("omits real-only sample provenance from mock v1.0 requests", async () => {
    const requests = mockFetch(mockPrediction);

    await postPredict(
      { features: { Age: 60 }, sample_id: "patient-1" },
      mockProfile,
    );

    expect(JSON.parse(String(requests[0]?.body))).toEqual({
      features: { Age: 60 },
    });
  });

  it("sends sample_id to the approved real v1.1 profile", async () => {
    const requests = mockFetch(realPrediction);

    await postPredict(
      { features: { Age: 60 }, sample_id: "patient-1" },
      realProfile,
    );

    expect(JSON.parse(String(requests[0]?.body))).toEqual({
      features: { Age: 60 },
      sample_id: "patient-1",
    });
  });

  it("fails visibly instead of falling back when response mode changes", async () => {
    mockFetch(mockPrediction);

    await expect(
      postPredict({ features: { Age: 60 } }, realProfile),
    ).rejects.toThrow("API response mode changed");
  });
});
