import { useMemo } from "react";
import { displayUnit } from "../../../lib/units";
import type {
  FeatureDefinition,
  FeatureValue,
  PredictionResponse,
} from "../../../api/types";
import { targetColor } from "../../../lib/colorScale";
import {
  formatFeatureValue,
  INSIGHT_TARGETS,
  prettyUnit,
} from "../../../lib/insights";
import { useWhatIfStore } from "../../../store/whatIfStore";
import { useWhatIfRunner } from "../../insights/useWhatIfRunner";
import { FloatingWindow } from "../FloatingWindow";
import { IconReset, IconSliders } from "../icons";
import { Delta, EmptyState } from "../parts";
import { probabilityOf, useStudioData } from "../studioData";

function step(feature: FeatureDefinition): number {
  const span = (feature.max ?? 100) - (feature.min ?? 0);
  return span > 300 ? 5 : span > 20 ? 1 : 0.1;
}

/** Short slider names so a row of sliders stays readable in a narrow dock. */
const SHORT: Record<string, string> = {
  BP: "Blood pressure",
  FBS: "Fasting sugar",
  TG: "Triglycerides",
  LDL: "LDL",
  HDL: "HDL",
};

function Scenario({
  features,
  baseInputs,
  basePrediction,
}: {
  features: readonly FeatureDefinition[];
  baseInputs: Readonly<Record<string, FeatureValue>>;
  basePrediction: PredictionResponse;
}) {
  const values = useWhatIfStore((s) => s.values);
  const baseValues = useWhatIfStore((s) => s.baseValues);
  const scenario = useWhatIfStore((s) => s.prediction);
  const pending = useWhatIfStore((s) => s.pending);
  const error = useWhatIfStore((s) => s.error);
  const setValue = useWhatIfStore((s) => s.setValue);
  const reset = useWhatIfStore((s) => s.reset);
  const modifiable = useMemo(
    () => features.filter((feature) => feature.modifiable),
    [features],
  );
  const { changed } = useWhatIfRunner(baseInputs, basePrediction);
  const shown = changed && scenario ? scenario : basePrediction;

  if (modifiable.length === 0) {
    return <EmptyState>No adjustable risk factors in this model.</EmptyState>;
  }

  return (
    <div className="whatif">
      <div className="sl-whatif-tiles">
        {INSIGHT_TARGETS.map((target) => {
          const before = probabilityOf(basePrediction, target);
          const after = probabilityOf(shown, target);
          return (
            <div
              className="sl-whatif-tile"
              key={target}
              style={{ ["--artery" as string]: targetColor(target) }}
            >
              <span className="sl-whatif-tile-name">
                {target === "cad" ? "CAD" : target}
              </span>
              <span className="sl-whatif-tile-value">{Math.round(after * 100)}%</span>
              <Delta points={(after - before) * 100} />
            </div>
          );
        })}
        <button
          aria-label="Reset what-if changes"
          className="whatif-reset"
          disabled={!changed}
          onClick={reset}
          title="Back to the patient's own values"
          type="button"
        >
          <IconReset size={15} />
        </button>
      </div>
      <p aria-live="polite" className="whatif-status">
        {changed && pending
          ? "Updating…"
          : changed && error
            ? `Failed: ${error}`
            : changed
              ? "Showing the what-if on the heart"
              : "Move a slider to test a change"}
      </p>
      <div className="whatif-controls">
        {modifiable.map((feature) => {
          const value = values[feature.name];
          const base = baseValues[feature.name];
          const moved = !Object.is(value, base);
          const label = SHORT[feature.name] ?? feature.label;
          if (feature.type === "number" && typeof value === "number") {
            const min = feature.min ?? 0;
            const max = feature.max ?? 100;
            const range = feature.reference_range;
            const pct = (x: number) => ((x - min) / (max - min)) * 100;
            const bandStart = pct(range?.low ?? min);
            const bandEnd = pct(range?.high ?? max);
            const basePos = typeof base === "number" ? pct(base) : null;
            return (
              <label className={`sl-slider${moved ? " is-moved" : ""}`} key={feature.name}>
                <span className="sl-slider-head">
                  <span>{label}</span>
                  <b>{formatFeatureValue(value, feature)}</b>
                </span>
                <span className="sl-slider-rail">
                  {range && (
                    <i
                      className="sl-slider-band"
                      style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
                      title="Typical adult range"
                    />
                  )}
                  {moved && basePos !== null && (
                    <i className="sl-slider-was" style={{ left: `${basePos}%` }} />
                  )}
                  <input
                    aria-label={`${feature.label} (${prettyUnit(displayUnit(feature))})`}
                  aria-valuetext={formatFeatureValue(value, feature)}
                    max={max}
                    min={min}
                    onChange={(event) =>
                      setValue(feature.name, Number(event.target.value))
                    }
                    step={step(feature)}
                    type="range"
                    value={value}
                  />
                </span>
              </label>
            );
          }
          if (feature.type === "categorical" && feature.options) {
            return (
              <div className={`sl-slider${moved ? " is-moved" : ""}`} key={feature.name}>
                <span className="sl-slider-head">
                  <span>{label}</span>
                </span>
                <div className="sl-segmented sl-segmented-sm" role="group" aria-label={feature.label}>
                  {feature.options.map((option) => (
                    <button
                      aria-pressed={Object.is(option, value)}
                      key={String(option)}
                      onClick={() => setValue(feature.name, option)}
                      type="button"
                    >
                      {String(option)}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

/** Try changes a patient could make (weight, smoking, blood pressure, lipids) and watch the arteries respond. */
export function WhatIfWindow() {
  const { accepted, features, predictionInputs } = useStudioData();
  return (
    <FloatingWindow icon={<IconSliders />} id="whatif" title="What if">
      {accepted && predictionInputs ? (
        <Scenario
          basePrediction={accepted}
          baseInputs={predictionInputs}
          features={features}
        />
      ) : (
        <EmptyState>Available once the patient is scored.</EmptyState>
      )}
    </FloatingWindow>
  );
}
