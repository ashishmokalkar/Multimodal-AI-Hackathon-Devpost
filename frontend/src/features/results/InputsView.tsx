import type {
  FeatureDefinition,
  FeatureValue,
  PredictionResponse,
} from "../../api/types";
import {
  formatContributionInput,
  formatContributionValue,
  groupPredictionInputs,
} from "../../lib/explanations";
import type { VesselId } from "../viewer/vesselMap";

interface InputsViewProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  predictionInputs: Readonly<Record<string, FeatureValue>> | null;
  selectedVessel: VesselId | null;
}

export function InputsView({
  prediction,
  features,
  predictionInputs,
  selectedVessel,
}: InputsViewProps) {
  const target = selectedVessel ?? "CAD";
  const explanation = prediction.explanations[selectedVessel ?? "cad"];
  const groups = groupPredictionInputs(
    features,
    predictionInputs,
    explanation.contributions,
  );

  return (
    <section aria-labelledby="inputs-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="text-sm font-semibold text-slate-800"
          id="inputs-heading"
        >
          Inputs for {target}
        </h3>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">
          {prediction.mock
            ? "Mock · illustrative · scale unconfirmed"
            : "Model scale unconfirmed"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-600">
        Values come from the accepted prediction snapshot or the selected
        response contribution. Missing input values are unavailable; missing
        contributions are not returned. No clinical range classification is
        applied.
      </p>

      {groups.length === 0 ? (
        <p
          className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600"
          role="status"
        >
          No input metadata or returned input values are available for this
          prediction.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map(({ group, rows }, groupIndex) => {
            const headingId = `input-group-heading-${groupIndex}`;
            return (
              <section
                aria-labelledby={headingId}
                className="overflow-hidden rounded-lg border border-slate-200"
                key={group}
              >
                <h4
                  className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                  id={headingId}
                >
                  {group}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 font-semibold" scope="col">
                          Patient input
                        </th>
                        <th className="px-3 py-2 font-semibold" scope="col">
                          Value
                        </th>
                        <th className="px-3 py-2 font-semibold" scope="col">
                          {target} contribution
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={row.feature}
                        >
                          <th
                            className="px-3 py-2 font-medium text-slate-800"
                            scope="row"
                          >
                            {row.label}
                          </th>
                          <td className="px-3 py-2 text-slate-700">
                            {row.value === null
                              ? "Unavailable"
                              : formatContributionInput(row.value, row.unit)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">
                            {row.contribution === null
                              ? "Not returned"
                              : formatContributionValue(row.contribution)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
