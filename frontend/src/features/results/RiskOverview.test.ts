import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MetricsResponse, PredictionResponse } from "../../api/types";
import { ModelPerformanceChart } from "./ModelPerformanceChart";
import { RiskOverview } from "./RiskOverview";

const explanation = {
  base_value: 0.4,
  scale: "probability" as const,
  method: "fixture",
  contributions: [],
};
const prediction: PredictionResponse = {
  request_id: "095e7b1f-22f0-4ef0-9d30-310f769c2847",
  model_version: "cardiotwin-v2.0.0",
  cad: {
    probability: 0.85,
    label: "elevated",
    threshold: 0.69,
    uncertain: false,
  },
  vessels: {
    LAD: {
      probability: 0.7,
      label: "elevated",
      threshold: 0.55,
      uncertain: false,
      capped: true,
    },
    LCX: {
      probability: 0.29,
      label: "not elevated",
      threshold: 0.32,
      uncertain: false,
    },
    RCA: {
      probability: 0.46,
      label: "elevated",
      threshold: 0.36,
      uncertain: true,
    },
  },
  explanations: {
    cad: explanation,
    LAD: explanation,
    LCX: explanation,
    RCA: explanation,
  },
  risk_summary: "fixture",
  warnings: [],
  derived: { BMI: 25, Obesity: false },
  prediction_source: "fixture",
  mock: false,
};

function render(scenario: PredictionResponse | null = null) {
  return renderToStaticMarkup(
    createElement(RiskOverview, {
      prediction,
      scenario,
      selectedVessel: "LAD",
      onSelectVessel: () => undefined,
    }),
  );
}

describe("RiskOverview", () => {
  it("draws every target against its threshold with status and uncertainty chips", () => {
    const markup = render();

    expect(markup).toContain("Risk at a glance");
    expect(markup.match(/class="risk-threshold"/g)).toHaveLength(4);
    expect(markup).toContain("left:69%");
    expect(markup).toContain("16 pts above the 69% threshold");
    expect(markup).toContain("3 pts below the 32% threshold");
    expect(markup.match(/ above the /g)).toHaveLength(3);
    expect(markup).toContain("var(--risk-flag-zone) 69%");
    expect(markup).toContain("chosen in validation");
    expect(markup.match(/risk-chip-uncertain/g)).toHaveLength(1);
    expect(markup).toContain("Capped at CAD");
    expect(markup).toContain(
      'aria-label="Select LAD. Predicted probability 70.0%',
    );
    expect(markup).toMatch(/aria-pressed="true"[^>]*risk-row-selected/);
    expect(markup).not.toContain("risk-ghost");
  });

  it("shows the what-if values with ghost markers and point changes from the accepted prediction", () => {
    const markup = render({
      ...prediction,
      cad: { ...prediction.cad, probability: 0.9 },
    });

    expect(markup).toContain("what-if");
    expect(markup).toContain("90.0%");
    expect(markup).toContain("+5 pts");
    expect(markup).toContain('class="risk-ghost" style="left:85%"');
  });
});

describe("ModelPerformanceChart", () => {
  it("plots ROC-AUC with its confidence interval plus sensitivity and precision", () => {
    const target = {
      accuracy: 0.8,
      precision: 0.9,
      recall: 0.75,
      f1: 0.8,
      roc_auc: 0.9,
      roc_auc_ci95: [0.85, 0.95] as [number, number],
      balanced_accuracy: 0.8,
      brier: 0.1,
      ece: 0.04,
      threshold: 0.6,
      model: "Fixture boosting",
    };
    const data = {
      model_version: "cardiotwin-v2.0.0",
      validation: "fixture",
      n_samples: 303,
      trained_at: "2026-10-10T00:00:00Z",
      targets: { cad: target, LAD: target, LCX: target, RCA: target },
      mock: false,
    } as MetricsResponse;
    const markup = renderToStaticMarkup(
      createElement(ModelPerformanceChart, { data }),
    );

    expect(markup).toContain("How well each model performs");
    expect(markup.match(/perf-auc-dot/g)).toHaveLength(4);
    expect(markup.match(/perf-auc-ci/g)).toHaveLength(4);
    expect(markup).toContain("left:80%");
    expect(markup).toContain("0.90");
    expect(markup).toContain("75%");
    expect(markup).toContain("Fixture boosting");
  });
});
