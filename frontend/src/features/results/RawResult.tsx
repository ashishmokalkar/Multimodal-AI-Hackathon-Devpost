import type {
  FeatureDefinition,
  PredictionResponse,
  Target,
} from "../../api/types";
import {
  explanationForSelection,
  formatContributionInput,
  leadingContributions,
} from "../../lib/explanations";
import { formatProbability } from "../../lib/format";
import type { VesselId } from "../viewer/vesselMap";

interface RawResultProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
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

export function RawResult({
  prediction,
  features,
  selectedVessel,
  onSelectVessel,
}: RawResultProps) {
  const targetName = selectedVessel ?? "cad";
  const targetExplanation = explanationForSelection(
    prediction.explanations,
    selectedVessel,
  );
  const contributions = leadingContributions(
    targetExplanation.contributions,
    features,
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <ProbabilityReadout
          label="CAD"
          target={prediction.cad}
          selected={selectedVessel === null}
          onClick={() => onSelectVessel(null)}
        />
        {(["LAD", "LCX", "RCA"] as const).map((vessel) => (
          <ProbabilityReadout
            key={vessel}
            label={vessel}
            target={prediction.vessels[vessel]}
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
            Leading {targetName.toUpperCase()} model contributions
          </h3>
          <span className="text-right text-[10px] text-slate-500">
            {prediction.mock
              ? "Mock · illustrative · scale unconfirmed"
              : "Model scale unconfirmed"}
          </span>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          Signed values are on an unconfirmed model scale, not probability-point
          changes or evidence of causation.
        </p>
        {contributions.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {contributions.map((contribution, index) => (
              <li
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                key={`${contribution.feature}-${index}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {contribution.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Input value:{" "}
                    {formatContributionInput(
                      contribution.value,
                      contribution.unit,
                    )}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-semibold tabular-nums ${
                    contribution.contribution > 0
                      ? "text-rose-700"
                      : contribution.contribution < 0
                        ? "text-blue-700"
                        : "text-slate-600"
                  }`}
                >
                  {contribution.contribution > 0 ? "+" : ""}
                  {contribution.contribution.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600"
            role="status"
          >
            No model contributions were returned for {targetName.toUpperCase()};
            no leading drivers are available.
          </p>
        )}
      </section>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {prediction.risk_summary}
      </p>
      <p className="text-[10px] text-slate-500">
        Model: {prediction.model_version}
        {prediction.mock ? " · Mock prediction" : ""}
      </p>
    </div>
  );
}
