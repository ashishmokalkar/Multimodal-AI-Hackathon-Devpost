import type {
  FeatureDefinition,
  FeatureValue,
  PredictionResponse,
} from "../../api/types";
import {
  formatContributionInput,
  formatExplanationContribution,
  groupPredictionInputs,
} from "../../lib/explanations";
import { formatProbability } from "../../lib/format";
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
  const probabilityScale =
    !prediction.mock && explanation.scale === "probability";
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
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
          {prediction.mock
            ? "Mock · illustrative · scale unconfirmed"
            : probabilityScale
              ? "Probability scale · model attribution"
              : "Model scale unconfirmed"}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-5 text-slate-600">
        Each input used for this prediction, with its model contribution.
      </p>
      <details className="contribution-method-details mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-700">
        <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          Method and reference details
        </summary>
        <div className="mt-2 space-y-1">
          <p>
            Values use the accepted prediction snapshot unless the response
            returns an attributed input value. Missing values are unavailable;
            missing contributions were not returned. No clinical ranges are
            applied.
          </p>
          {probabilityScale ? (
            <>
              <p>
                Reference model risk:{" "}
                {formatProbability(explanation.base_value)}.
              </p>
              <p>Method: {explanation.method ?? "Not returned."}</p>
              <p>
                Returned contributions are in percentage points. Attribution is
                not causation.
              </p>
            </>
          ) : (
            <>
              <p>
                {prediction.mock
                  ? "Mock contributions are illustrative; their scale and reference-risk interpretation are unconfirmed."
                  : "Real-model contributions are returned, but their scale and reference-risk interpretation are unconfirmed."}
              </p>
              <p>
                Method:{" "}
                {explanation.method ??
                  (prediction.mock
                    ? "Not returned by mock v1.0."
                    : "Not returned.")}
              </p>
              <p>
                Attribution is not causation or a clinical benefit/harm claim.
              </p>
            </>
          )}
        </div>
      </details>

      {!prediction.mock && (
        <section
          aria-label="API-derived patient values"
          className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
        >
          <h4 className="font-semibold text-slate-800">
            API-derived values · read-only
          </h4>
          <p className="mt-1">BMI: {String(prediction.derived.BMI)}</p>
          <p>
            Obesity dataset flag: {prediction.derived.Obesity ? "Yes" : "No"}.
            The dataset codes this as BMI &gt;25; it is not a clinical obesity
            diagnosis.
          </p>
        </section>
      )}

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
                <div
                  aria-label={`${group} patient inputs and contributions`}
                  className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  role="region"
                  tabIndex={0}
                >
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
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
                              : formatExplanationContribution(
                                  row.contribution,
                                  probabilityScale ? "probability" : undefined,
                                )}
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
