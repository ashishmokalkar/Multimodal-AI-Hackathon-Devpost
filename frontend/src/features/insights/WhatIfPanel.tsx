import { useEffect, useMemo } from "react";
import { postPredict } from "../../api/client";
import { useApiProfile } from "../../api/hooks";
import type { FeatureDefinition, FeatureValue, PredictionResponse } from "../../api/types";
import { colorScale } from "../../lib/colorScale";
import {
  formatFeatureValue,
  formatPoints,
  INSIGHT_TARGETS,
  prettyUnit,
  TARGET_SHORT,
  type InsightTarget,
} from "../../lib/insights";
import { hasChanges, useWhatIfStore } from "../../store/whatIfStore";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";

interface WhatIfPanelProps {
  features: readonly FeatureDefinition[];
  baseInputs: Readonly<Record<string, FeatureValue>>;
  basePrediction: PredictionResponse;
  sampleId: string | null;
}

const DEBOUNCE_MS = 300;

function probabilityOf(prediction: PredictionResponse, target: InsightTarget): number {
  return target === "cad" ? prediction.cad.probability : prediction.vessels[target].probability;
}

function step(feature: FeatureDefinition): number {
  const span = (feature.max ?? 100) - (feature.min ?? 0);
  return span > 300 ? 5 : span > 20 ? 1 : 0.1;
}

/**
 * Model sensitivity for modifiable risk factors: changes are sent to the same API as a separate scenario, the 3D
 * heart shows the scenario, and the accepted prediction is left untouched.
 */
export function WhatIfPanel({ features, baseInputs, basePrediction, sampleId }: WhatIfPanelProps) {
  const profileQuery = useApiProfile();
  const profile = profileQuery.isSuccess ? profileQuery.data : null;
  const open = useWhatIfStore((s) => s.open);
  const values = useWhatIfStore((s) => s.values);
  const baseValues = useWhatIfStore((s) => s.baseValues);
  const scenario = useWhatIfStore((s) => s.prediction);
  const pending = useWhatIfStore((s) => s.pending);
  const error = useWhatIfStore((s) => s.error);
  const revision = useWhatIfStore((s) => s.revision);
  const setValue = useWhatIfStore((s) => s.setValue);
  const reset = useWhatIfStore((s) => s.reset);
  const modifiable = useMemo(() => features.filter((f) => f.modifiable), [features]);
  const changed = hasChanges(baseValues, values);

  useEffect(() => {
    open(basePrediction.request_id, { ...baseInputs });
  }, [open, basePrediction.request_id, baseInputs]);

  useEffect(() => {
    if (!changed || !profile || !pending) {
      return;
    }
    const sent = revision;
    const timer = setTimeout(() => {
      postPredict(
        { features: { ...values }, ...(profile.mode === "real" && sampleId ? { sample_id: sampleId } : {}) },
        profile,
      )
        .then((prediction) => useWhatIfStore.getState().resolve(sent, prediction))
        .catch((reason: unknown) =>
          useWhatIfStore
            .getState()
            .fail(sent, reason instanceof Error ? reason.message : "The scenario request failed."),
        );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [changed, pending, profile, revision, sampleId, values]);

  if (modifiable.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600" role="status">
        This API profile does not mark any modifiable risk factors.
      </p>
    );
  }

  const shown = changed && scenario ? scenario : basePrediction;

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-4 text-slate-600">
        Move a risk factor that a patient can change and watch the arteries respond. This shows how the{" "}
        <strong>model&apos;s estimate</strong> changes, not a treatment effect.
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {INSIGHT_TARGETS.map((target) => {
          const before = probabilityOf(basePrediction, target);
          const after = probabilityOf(shown, target);
          const delta = (after - before) * 100;
          return (
            <div className="insight-whatif-tile" key={target} style={{ borderTopColor: colorScale(after) }}>
              <span className="text-[10px] font-bold text-slate-600">{TARGET_SHORT[target]}</span>
              <span className="text-[15px] font-bold tabular-nums text-slate-900">{(after * 100).toFixed(0)}%</span>
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  Math.abs(delta) < 0.5 ? "text-slate-400" : delta > 0 ? "text-[#c2255c]" : "text-[#1971c2]"
                }`}
              >
                {Math.abs(delta) < 0.5 ? "no change" : `${delta > 0 ? "▲" : "▼"} ${formatPoints(delta, 0)}`}
              </span>
            </div>
          );
        })}
      </div>
      <p aria-live="polite" className="h-4 text-[10px] text-slate-500">
        {changed && pending ? (
          <HeartbeatLoader steps={["Updating scenario"]} variant="inline" />
        ) : changed && error ? `Scenario failed: ${error}` : changed ? "Scenario shown on the 3D heart." : "Baseline: the accepted prediction."}
      </p>

      <div className="space-y-2.5">
        {modifiable.map((feature) => {
          const value = values[feature.name];
          const base = baseValues[feature.name];
          const moved = !Object.is(value, base);
          if (feature.type === "number" && typeof value === "number") {
            const min = feature.min ?? 0;
            const max = feature.max ?? 100;
            const range = feature.reference_range;
            const pct = (x: number) => ((x - min) / (max - min)) * 100;
            const bandStart = pct(range?.low ?? min);
            const bandEnd = pct(range?.high ?? max);
            return (
              <label className="block" key={feature.name}>
                <span className="flex items-baseline justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">{feature.label}</span>
                  <span className={`tabular-nums ${moved ? "font-bold text-slate-900" : "text-slate-600"}`}>
                    {formatFeatureValue(value, feature)}
                    {moved && <span className="ml-1 text-[9.5px] text-slate-400">was {formatFeatureValue(base, feature)}</span>}
                  </span>
                </span>
                <input
                  aria-label={`${feature.label} (${prettyUnit(feature.unit)})`}
                  className="insight-slider w-full"
                  max={max}
                  min={min}
                  step={step(feature)}
                  style={{
                    background: range
                      ? `linear-gradient(90deg, #e2e8f0 ${bandStart}%, #b2f2bb ${bandStart}%, #b2f2bb ${bandEnd}%, #e2e8f0 ${bandEnd}%)`
                      : "#e2e8f0",
                  }}
                  type="range"
                  value={value}
                  onChange={(event) => setValue(feature.name, Number(event.target.value))}
                />
              </label>
            );
          }
          if (feature.type === "categorical" && feature.options) {
            return (
              <div key={feature.name}>
                <span className="text-[11px] font-semibold text-slate-700">{feature.label}</span>
                <div className="mt-1 grid grid-cols-3 gap-1" role="group" aria-label={feature.label}>
                  {feature.options.map((option) => (
                    <button
                      aria-pressed={Object.is(option, value)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                        Object.is(option, value)
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                      }`}
                      key={String(option)}
                      type="button"
                      onClick={() => setValue(feature.name, option)}
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">Green band on a slider = typical adult range.</span>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:opacity-40"
          disabled={!changed}
          type="button"
          onClick={reset}
        >
          Reset scenario
        </button>
      </div>
    </div>
  );
}
