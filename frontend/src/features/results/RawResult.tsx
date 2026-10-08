import type { Contribution, Target } from "../../api/types";
import { formatProbability } from "../../lib/format";
import type { VesselId } from "../viewer/vesselMap";

interface RawResultProps {
  cad: Target;
  vessels: Record<"LAD" | "LCX" | "RCA", Target>;
  contributions: Contribution[];
  riskSummary: string;
  modelVersion: string;
  isMock: boolean;
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
}

function ProbabilityReadout({
  label,
  target,
  selected,
  onClick,
}: {
  label: string;
  target: Target;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Select ${label}. Predicted probability ${formatProbability(target.probability)}. Model label ${target.label}. Threshold ${formatProbability(target.threshold)}.`}
      aria-pressed={selected}
      className={`rounded-xl border bg-white p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
        selected
          ? "border-emerald-700 ring-2 ring-emerald-700/20"
          : "border-slate-200 hover:border-emerald-400"
      }`}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
          Model output
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {formatProbability(target.probability)}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Predicted {target.label} · model threshold{" "}
        {formatProbability(target.threshold)}
      </p>
    </button>
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
  selectedVessel,
  onSelectVessel,
}: RawResultProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <ProbabilityReadout
          label="CAD"
          target={cad}
          selected={selectedVessel === null}
          onClick={() => onSelectVessel(null)}
        />
        {(["LAD", "LCX", "RCA"] as const).map((vessel) => (
          <ProbabilityReadout
            key={vessel}
            label={vessel}
            target={vessels[vessel]}
            selected={selectedVessel === vessel}
            onClick={() => onSelectVessel(vessel)}
          />
        ))}
      </div>
      <p className="text-[11px] leading-4 text-slate-500">
        Predicted probabilities are model outputs, not diagnoses or percentage
        artery narrowing.
      </p>

      <section aria-labelledby="contributions-heading">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wide text-slate-700"
            id="contributions-heading"
          >
            Top CAD contributions
          </h3>
          <span className="text-[10px] text-slate-500">Mock attribution</span>
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
        {isMock ? " · Mock prediction" : ""}
      </p>
    </div>
  );
}
