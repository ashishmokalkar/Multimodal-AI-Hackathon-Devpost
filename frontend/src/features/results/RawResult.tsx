import type { Contribution, Target } from "../../api/types";

interface RawResultProps {
  cad: Target;
  vessels: Record<"LAD" | "LCX" | "RCA", Target>;
  contributions: Contribution[];
  riskSummary: string;
  modelVersion: string;
  isMock: boolean;
}

function ProbabilityReadout({
  label,
  target,
}: {
  label: string;
  target: Target;
}) {
  const isAboveThreshold = target.probability >= target.threshold;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
            isAboveThreshold
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {isAboveThreshold ? "At/above" : "Below"} threshold
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {(target.probability * 100).toFixed(1)}%
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Predicted {target.label} · threshold{" "}
        {(target.threshold * 100).toFixed(0)}%
      </p>
    </article>
  );
}

function formatFeatureValue(value: Contribution["value"]): string {
  return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
}

export function RawResult({
  cad,
  vessels,
  contributions,
  riskSummary,
  modelVersion,
  isMock,
}: RawResultProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <ProbabilityReadout label="CAD" target={cad} />
        {(["LAD", "LCX", "RCA"] as const).map((vessel) => (
          <ProbabilityReadout
            key={vessel}
            label={vessel}
            target={vessels[vessel]}
          />
        ))}
      </div>

      <section aria-labelledby="contributions-heading">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wide text-slate-700"
            id="contributions-heading"
          >
            Top CAD contributions
          </h3>
          <span className="text-[10px] text-slate-500">Mock SHAP</span>
        </div>
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {contributions.slice(0, 5).map((contribution, index) => (
            <li
              className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              key={`${contribution.feature}-${index}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-800">
                  {contribution.feature}
                </span>
                <span className="text-[10px] text-slate-500">
                  Value: {formatFeatureValue(contribution.value)}
                </span>
              </span>
              <span
                className={`shrink-0 font-semibold tabular-nums ${
                  contribution.contribution >= 0
                    ? "text-rose-700"
                    : "text-blue-700"
                }`}
              >
                {contribution.contribution >= 0 ? "+" : ""}
                {contribution.contribution.toFixed(3)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {riskSummary}
      </p>
      <p className="text-[10px] text-slate-500">
        Model: {modelVersion}
        {isMock ? " · Mock data" : ""}
      </p>
    </div>
  );
}
