import { useMemo, useState } from "react";
import type { RawResultProps } from "./RawResult";
import { buildDrivers, ARTERY_INFO } from "../../lib/summary";
import { useUiStore } from "../../store/uiStore";
import { useActiveScenario, useWhatIfStore } from "../../store/whatIfStore";
import { ExplainHub } from "../insights/ExplainHub";
import { WhatIfPanel } from "../insights/WhatIfPanel";
import { ArteryList } from "./ArteryList";
import { DriversChart } from "./DriversChart";
import { RiskHero } from "./RiskHero";
import { CohortCompare } from "../cohort/CohortCompare";
import { useCohortComparison } from "../cohort/useCohortComparison";
import { SpeakButton } from "../speech/SpeakButton";
import { useSpokenResult } from "../speech/useSpokenResult";

/**
 * Real-model result, laid out to answer three questions upfront in plain language: how high is the risk, which
 * arteries, and what is driving it. The full attribution detail sits in one clearly labelled section below.
 */
export function RealResult({
  prediction,
  features,
  predictionInputs,
  isEditedScenario,
  sampleId,
  selectedVessel,
  onSelectVessel,
}: RawResultProps) {
  const scenario = useActiveScenario();
  const resetScenario = useWhatIfStore((state) => state.reset);
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const shown = scenario ?? prediction;
  const baseline = scenario ? prediction : null;
  const warnings = shown.mock ? [] : shown.warnings;
  // the backend works out from the values whether this is a dataset patient, an edit of one, or a new patient
  const predictionSourceText = prediction.mock
    ? "mock"
    : prediction.prediction_source;

  const cadDrivers = useMemo(
    () => buildDrivers(shown.explanations.cad, features, shown.cad.probability),
    [shown, features],
  );
  const target = selectedVessel ? shown.vessels[selectedVessel] : shown.cad;
  const drivers = useMemo(
    () =>
      selectedVessel
        ? buildDrivers(
            shown.explanations[selectedVessel],
            features,
            target.probability,
          )
        : cadDrivers,
    [selectedVessel, shown, features, target, cadDrivers],
  );
  const spoken = useSpokenResult();
  const setReportOpen = useUiStore((state) => state.setReportOpen);
  const { comparison, cohort } = useCohortComparison(
    shown,
    predictionInputs,
    selectedVessel ?? "cad",
  );
  const subject = selectedVessel
    ? `${selectedVessel} (${ARTERY_INFO[selectedVessel].name})`
    : "overall";

  return (
    <div className="real-result">
      {scenario && (
        <div className="scenario-banner" role="status">
          <span>
            <strong>What-if scenario</strong> · results below use the changed
            values
          </span>
          <button type="button" onClick={resetScenario}>
            Back to real values
          </button>
        </div>
      )}

      <div className="result-actions" role="group" aria-label="Share this result">
        <SpeakButton resultKey={spoken.resultKey} sentences={spoken.sentences} />
        <button
          className="result-button result-report"
          type="button"
          onClick={() => setReportOpen(true)}
        >
          Patient report
        </button>
      </div>
      <RiskHero
        baseline={baseline?.cad ?? null}
        selected={selectedVessel === null}
        drivers={cadDrivers}
        target={shown.cad}
        onSelect={() => onSelectVessel(null)}
      />

      {warnings.length > 0 && (
        <section aria-label="Reliability notes" className="reliability-notes">
          <p className="reliability-title">
            <span aria-hidden="true">⚠</span> Please note
          </p>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <ArteryList
        baseline={baseline}
        features={features}
        prediction={shown}
        selected={selectedVessel}
        onSelect={onSelectVessel}
      />

      <DriversChart
        activeFactor={hoveredFactor}
        subject={subject}
        summary={drivers}
        targetId={selectedVessel ?? "cad"}
        onBack={selectedVessel ? () => onSelectVessel(null) : undefined}
        onHoverFactor={setHoveredFactor}
      />

      {comparison && cohort && (
        <section aria-labelledby="compare-heading" className="result-section">
          <h3 className="result-section-title" id="compare-heading">
            Compared with similar patients
            {selectedVessel ? ` · ${selectedVessel}` : ""}
          </h3>
          <p className="result-section-lead">
            Where this estimate sits among patients of the same sex and similar
            age in the study.
          </p>
          <div className="mt-3">
            <CohortCompare comparison={comparison} population={cohort.population} />
          </div>
        </section>
      )}
      <section aria-labelledby="whatif-heading" className="result-section">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="result-section-title" id="whatif-heading">
              What if risk factors changed?
            </h3>
            <p className="result-section-lead">
              Adjust smoking, blood pressure, cholesterol and more to see how
              the estimate responds.
            </p>
          </div>
          <button
            aria-expanded={whatIfOpen || scenario !== null}
            className="result-button"
            type="button"
            onClick={() => setWhatIfOpen((open) => !open)}
          >
            {whatIfOpen || scenario ? "Hide" : "Try it"}
          </button>
        </div>
        {(whatIfOpen || scenario) &&
          (predictionInputs ? (
            <div className="mt-3">
              <WhatIfPanel
                baseInputs={predictionInputs}
                basePrediction={prediction}
                features={features}
                sampleId={sampleId}
              />
            </div>
          ) : (
            <p className="result-section-lead" role="status">
              The accepted inputs are unavailable, so no scenario can be built.
            </p>
          ))}
      </section>

      <details className="result-details">
        <summary>
          <span>
            <strong>Detailed breakdown</strong>
            <span className="result-details-hint">
              Step-by-step chart, every factor per artery, measurements, model
              source
            </span>
          </span>
        </summary>
        <div className="result-details-body">
          <ExplainHub
            features={features}
            prediction={prediction}
            predictionInputs={predictionInputs}
            selectedVessel={selectedVessel}
            onSelectVessel={onSelectVessel}
          />
          <dl className="result-definitions">
            <div>
              <dt>Threshold</dt>
              <dd>
                The cut-off above which the model flags a result. Each artery
                has its own, chosen in validation to balance missed cases
                against false alarms.
              </dd>
            </div>
            <div>
              <dt>Unsure</dt>
              <dd>
                The model&apos;s 90% prediction set contains both answers, so it
                cannot confidently rule disease in or out.
              </dd>
            </div>
          </dl>
          <div
            aria-label="Prediction source and version"
            className="prediction-source-badge"
          >
            <span className="prediction-source-line">
              <strong>Real-model prediction</strong>
              <span className="prediction-source-scenario">
                {isEditedScenario
                  ? "Edited dataset-sample scenario"
                  : sampleId
                    ? "Original dataset-sample scenario"
                    : "Custom input scenario"}
              </span>
            </span>
            <span className="prediction-source-detail">
              Model version {prediction.model_version} · Prediction source:{" "}
              {predictionSourceText}
            </span>
          </div>
        </div>
      </details>

      <p className="result-disclaimer">
        These are model estimates to support a clinician, not a diagnosis.
        Percentages are chances, not the amount of narrowing.
      </p>
    </div>
  );
}
