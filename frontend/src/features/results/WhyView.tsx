import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import {
  explanationForSelection,
  contributionAxis,
  formatContributionAxisTick,
  formatContributionInput,
  formatExplanationContribution,
  leadingContributions,
} from "../../lib/explanations";
import { formatProbability } from "../../lib/format";
import type { VesselId } from "../viewer/vesselMap";

interface WhyViewProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  selectedVessel: VesselId | null;
}

function contributionColor(value: number): string {
  if (value > 0) {
    return "#a2423b";
  }
  if (value < 0) {
    return "#2e5e85";
  }
  return "#64748b";
}

export function WhyView({
  prediction,
  features,
  selectedVessel,
}: WhyViewProps) {
  const target = selectedVessel ?? "CAD";
  const explanation = explanationForSelection(
    prediction.explanations,
    selectedVessel,
  );
  const contributions = leadingContributions(
    explanation.contributions,
    features,
    10,
  );
  const probabilityScale =
    !prediction.mock && explanation.scale === "probability";
  const chartValues = contributions.map(({ contribution }) =>
    probabilityScale ? contribution * 100 : contribution,
  );
  const axis = contributionAxis(chartValues);
  const chartContributions = contributions.map((item) => ({
    ...item,
    contribution: probabilityScale
      ? item.contribution * 100
      : item.contribution,
    chartLabel:
      item.label.length > 19 ? `${item.label.slice(0, 18)}…` : item.label,
  }));

  return (
    <section aria-labelledby="why-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800" id="why-heading">
          Why {target}?
        </h3>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
          {prediction.mock
            ? "Mock · illustrative · scale unconfirmed"
            : probabilityScale
              ? "Probability scale · percentage points"
              : "Model scale unconfirmed"}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-slate-600">
        {probabilityScale
          ? `Bars show how much each input moved this patient's probability, in percentage points from the reference patient's ${formatProbability(explanation.base_value)} (Shapley values, as in SHAP). Top 10 shown.`
          : "Bars show each input's signed contribution to this estimate (Shapley values, as in SHAP). Top 10 shown."}
      </p>

      {contributions.length === 0 ? (
        <p
          className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600"
          role="status"
        >
          No model contributions were returned for {target}; no drivers are
          available.
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="mt-2 min-h-48"
            style={{ height: Math.max(190, contributions.length * 45 + 48) }}
          >
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={chartContributions}
                layout="vertical"
                margin={{ top: 6, right: 6, bottom: 23, left: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="#e2e8f0" vertical />
                <XAxis
                  domain={axis.domain}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(value: number) =>
                    formatContributionAxisTick(value, axis.maxAbs)
                  }
                  tickLine={false}
                  ticks={axis.ticks}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="chartLabel"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  tickLine={false}
                  type="category"
                  width={114}
                />
                <ReferenceLine stroke="#64748b" strokeDasharray="3 3" x={0} />
                <Bar dataKey="contribution" maxBarSize={18}>
                  {contributions.map((item, index) => (
                    <Cell
                      fill={contributionColor(item.contribution)}
                      key={`${item.feature}-${index}`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[11px] font-medium text-slate-600">
            Model contribution
            {probabilityScale ? " (percentage points)" : ""}
          </p>
          <ol
            aria-label={`${target} contribution values and input values`}
            className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            tabIndex={0}
          >
            {contributions.map((item, index) => (
              <li
                className="flex items-start justify-between gap-3 px-3 py-2 text-xs"
                key={`${item.feature}-${index}`}
              >
                <span className="min-w-0">
                  <span className="block font-medium text-slate-800">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Input value:{" "}
                    {formatContributionInput(item.value, item.unit)}
                  </span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-slate-800">
                  <span className="sr-only">Model contribution: </span>
                  {formatExplanationContribution(
                    item.contribution,
                    probabilityScale ? "probability" : undefined,
                  )}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      <details className="contribution-method-details mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-700">
        <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          Method and reference details
        </summary>
        <div className="mt-2 space-y-1">
          {probabilityScale ? (
            <>
              <p>
                Reference model risk:{" "}
                {formatProbability(explanation.base_value)}.
              </p>
              <p>Method: {explanation.method ?? "Not returned."}</p>
              <p>
                The chart shows the ten largest absolute contributions, a subset
                of the full response, not a complete waterfall. Attribution is
                not causation and does not indicate clinical benefit or harm.
              </p>
            </>
          ) : (
            <>
              <p>
                {prediction.mock
                  ? "Mock contributions are illustrative signed model units; their scale and reference-risk interpretation are unconfirmed."
                  : "Real-model contributions are signed, but their scale and reference-risk interpretation are unconfirmed."}
              </p>
              <p>
                Method:{" "}
                {explanation.method ??
                  (prediction.mock
                    ? "Not returned by mock v1.0."
                    : "Not returned.")}
              </p>
              <p>
                The chart shows up to ten returned contributions, a subset
                rather than an additive waterfall. Signs do not indicate
                causation, clinical benefit, or harm.
              </p>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
