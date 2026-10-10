import type { ReactNode } from "react";
import type { MetricsResponse } from "../../api/types";

interface ModelPerformanceChartProps {
  data: MetricsResponse;
}

const TARGETS = [
  { key: "cad", label: "CAD", name: "Coronary artery disease" },
  { key: "LAD", label: "LAD", name: "Left anterior descending" },
  { key: "LCX", label: "LCX", name: "Left circumflex" },
  { key: "RCA", label: "RCA", name: "Right coronary artery" },
] as const;

// ROC-AUC axis: 0.5 is chance, so the useful range starts there. Positions are percentages so the header
// ticks, row gridlines and marks share one scale at any column width.
const AUC_MIN = 0.5;
const AUC_TICKS = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
const ax = (value: number) =>
  `${((Math.min(1, Math.max(AUC_MIN, value)) - AUC_MIN) / (1 - AUC_MIN)) * 100}%`;

function AucScale({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="perf-auc">{children}</div>
      <span className="w-9 shrink-0" />
    </div>
  );
}

function AucAxis() {
  return (
    <AucScale>
      {AUC_TICKS.map((tick) => (
        <span className="perf-auc-tick" key={tick} style={{ left: ax(tick) }}>
          {tick.toFixed(1)}
        </span>
      ))}
    </AucScale>
  );
}

function AucMark({
  auc,
  ci,
}: {
  auc: number;
  ci: readonly [number, number] | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <div aria-hidden="true" className="perf-auc perf-auc-plot">
        {AUC_TICKS.map((tick) => (
          <span
            className={`perf-auc-grid ${tick === AUC_MIN ? "perf-auc-chance" : ""}`}
            key={tick}
            style={{ left: ax(tick) }}
          />
        ))}
        {ci && (
          <span
            className="perf-auc-ci"
            style={{ left: ax(ci[0]), right: `calc(100% - ${ax(ci[1])})` }}
          />
        )}
        <span className="perf-auc-dot" style={{ left: ax(auc) }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-900">
        {auc.toFixed(2)}
      </span>
    </div>
  );
}

function MiniBar({ value }: { value: number }) {
  return (
    <span className="perf-mini">
      <span aria-hidden="true" className="perf-mini-track">
        <span
          className="perf-mini-fill"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </span>
      <span className="w-8 text-right">{Math.round(value * 100)}%</span>
    </span>
  );
}

/** At-a-glance validation performance per target: discrimination (ROC-AUC with CI), sensitivity and precision. */
export function ModelPerformanceChart({ data }: ModelPerformanceChartProps) {
  return (
    <section aria-labelledby="perf-chart-heading" className="perf-chart">
      <h3
        className="text-sm font-semibold text-slate-900"
        id="perf-chart-heading"
      >
        How well each model performs
      </h3>
      <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
        Measured on held-out patients ({data.n_samples} in the dataset).{" "}
        {data.mock
          ? "Mock values, for illustration only."
          : "Bars show the 95% confidence interval."}
      </p>

      <div
        className="mt-3"
        role="table"
        aria-label="Validation performance by target"
      >
        <div className="perf-grid perf-head" role="row">
          <span role="columnheader">Target</span>
          <span role="columnheader">
            ROC-AUC
            <AucAxis />
          </span>
          <span className="perf-hide-sm" role="columnheader">
            Sensitivity
          </span>
          <span className="perf-hide-sm" role="columnheader">
            Precision
          </span>
        </div>
        {TARGETS.map((target) => {
          const metrics = data.targets[target.key];
          const ci = "roc_auc_ci95" in metrics ? metrics.roc_auc_ci95 : null;
          const model = "model" in metrics ? metrics.model : null;
          return (
            <div
              className="perf-grid perf-row"
              key={target.key}
              role="row"
              title={`${target.name}: ROC-AUC ${metrics.roc_auc.toFixed(3)}${ci ? ` (95% CI ${ci[0].toFixed(3)}–${ci[1].toFixed(3)})` : ""}`}
            >
              <span className="min-w-0" role="rowheader">
                <strong className="block text-xs text-slate-900">
                  {target.label}
                </strong>
                <span className="block truncate text-[10px] text-slate-500">
                  {model ?? target.name}
                </span>
              </span>
              <span role="cell">
                <AucMark auc={metrics.roc_auc} ci={ci} />
              </span>
              <span className="perf-hide-sm" role="cell">
                <MiniBar value={metrics.recall} />
              </span>
              <span className="perf-hide-sm" role="cell">
                <MiniBar value={metrics.precision} />
              </span>
            </div>
          );
        })}
      </div>

      <dl className="mt-2 grid gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[10px] leading-4 text-slate-500 sm:grid-cols-3">
        <div>
          <dt className="inline font-semibold text-slate-700">ROC-AUC</dt>{" "}
          <dd className="inline">
            ranks patients with disease above those without (0.5 = chance, 1 =
            perfect).
          </dd>
        </div>
        <div className="perf-hide-sm">
          <dt className="inline font-semibold text-slate-700">Sensitivity</dt>{" "}
          <dd className="inline">
            share of patients with disease that the model flags.
          </dd>
        </div>
        <div className="perf-hide-sm">
          <dt className="inline font-semibold text-slate-700">Precision</dt>{" "}
          <dd className="inline">
            share of flagged patients who truly had disease.
          </dd>
        </div>
      </dl>
    </section>
  );
}
