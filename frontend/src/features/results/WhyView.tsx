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
  formatContributionInput,
  formatContributionValue,
  leadingContributions,
} from "../../lib/explanations";
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
  const magnitude = Math.max(
    0,
    ...contributions.map(({ contribution }) => Math.abs(contribution)),
  );
  const domain: [number, number] = [
    -Math.max(magnitude, 0.001),
    Math.max(magnitude, 0.001),
  ];

  return (
    <section aria-labelledby="why-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800" id="why-heading">
          Why {target}?
        </h3>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">
          {prediction.mock
            ? "Mock · illustrative · scale unconfirmed"
            : "Model scale unconfirmed"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-600">
        Signed model contributions are shown separately from predicted
        probability. The scale is unconfirmed; values are not probability-point
        changes, and signs are not clinical benefit or harm assessments.
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
            className="mt-3 min-h-48"
            style={{ height: Math.max(190, contributions.length * 45 + 58) }}
          >
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={contributions}
                layout="vertical"
                margin={{ top: 6, right: 6, bottom: 23, left: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="#e2e8f0" vertical />
                <XAxis
                  domain={domain}
                  label={{
                    value: "Model contribution",
                    position: "insideBottom",
                    offset: -15,
                    fontSize: 10,
                    fill: "#475569",
                  }}
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickFormatter={(value: number) => value.toFixed(2)}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "#334155" }}
                  tickLine={false}
                  type="category"
                  width={108}
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
          <p className="text-center text-[10px] font-medium text-slate-600">
            Horizontal axis: Model contribution
          </p>

          <ol
            aria-label={`${target} contribution values and input values`}
            className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200"
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
                  <span className="text-[10px] text-slate-500">
                    Input value:{" "}
                    {formatContributionInput(item.value, item.unit)}
                  </span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-slate-800">
                  <span className="sr-only">Model contribution: </span>
                  {formatContributionValue(item.contribution)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
