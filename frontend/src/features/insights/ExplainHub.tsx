import { useEffect, useMemo } from "react";
import type {
  FeatureDefinition,
  FeatureValue,
  PredictionResponse,
} from "../../api/types";
import {
  buildArteryFlow,
  buildHeatmap,
  buildMeasurementGroups,
  buildWaterfall,
  TARGET_SHORT,
  type InsightTarget,
} from "../../lib/insights";
import { useUiStore, type ExplainView } from "../../store/uiStore";
import { useActiveScenario, useWhatIfStore } from "../../store/whatIfStore";
import type { VesselId } from "../viewer/vesselMap";
import { ArteryFlow } from "./ArteryFlow";
import { FactorHeatmap } from "./FactorHeatmap";
import { MeasurementCards } from "./MeasurementCards";
import { Waterfall } from "./Waterfall";

type HubView = ExplainView;

const VIEWS: { id: HubView; label: string; hint: string }[] = [
  {
    id: "why",
    label: "Step by step",
    hint: "Step-by-step from a typical patient to this patient",
  },
  {
    id: "arteries",
    label: "Factor × artery",
    hint: "Each factor's effect on CAD and every artery",
  },
  {
    id: "body",
    label: "Measurements",
    hint: "Measurements with healthy ranges and their effect",
  },
];

interface ExplainHubProps {
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  predictionInputs: Readonly<Record<string, FeatureValue>> | null;
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
}

/**
 * Detailed breakdown for clinicians, below the upfront summary: the full step-by-step attribution, every factor
 * against every artery, and measurements against healthy ranges. Linked to the 3D heart through the hovered factor.
 */
export function ExplainHub({
  prediction,
  features,
  predictionInputs,
  selectedVessel,
  onSelectVessel,
}: ExplainHubProps) {
  const view = useUiStore((s) => s.explainView);
  const setView = useUiStore((s) => s.setExplainView);
  const arteryMode = useUiStore((s) => s.arteryMode);
  const setArteryMode = useUiStore((s) => s.setArteryMode);
  const hoveredFactor = useUiStore((s) => s.hoveredFactor);
  const setHoveredFactor = useUiStore((s) => s.setHoveredFactor);
  const scenario = useActiveScenario();
  const scenarioValues = useWhatIfStore((s) => s.values);
  const shown = scenario ?? prediction;
  const target: InsightTarget = selectedVessel ?? "cad";
  const targetData = target === "cad" ? shown.cad : shown.vessels[target];
  const explanation = shown.explanations[target];
  const label = TARGET_SHORT[target];

  useEffect(() => () => setHoveredFactor(null), [setHoveredFactor]);

  const waterfall = useMemo(
    () => buildWaterfall(explanation, targetData, features),
    [explanation, targetData, features],
  );
  const heatmap = useMemo(
    () => buildHeatmap(shown.explanations, features),
    [shown, features],
  );
  const flow = useMemo(
    () => buildArteryFlow(shown.explanations, features),
    [shown, features],
  );
  const groups = useMemo(
    () =>
      buildMeasurementGroups(
        features,
        scenario ? scenarioValues : predictionInputs,
        explanation,
      ),
    [features, predictionInputs, explanation, scenario, scenarioValues],
  );
  const selectTarget = (next: InsightTarget) =>
    onSelectVessel(next === "cad" ? null : next);

  return (
    <section aria-labelledby="explain-hub-heading" className="insight-hub">
      <h3 className="sr-only" id="explain-hub-heading">
        Detailed breakdown for {label}
      </h3>
      {scenario && (
        <p className="insight-hub-scenario">Showing the what-if scenario</p>
      )}

      <div
        aria-label="Explanation views"
        className="insight-tabs"
        role="tablist"
      >
        {VIEWS.map((item) => (
          <button
            aria-selected={view === item.id}
            className={`insight-tab ${view === item.id ? "insight-tab-active" : ""}`}
            key={item.id}
            role="tab"
            title={item.hint}
            type="button"
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="insight-view" key={`${view}-${target}`} role="tabpanel">
        {view === "why" && (
          <>
            <p className="mb-1 text-[11px] leading-4 text-slate-600">
              Starting from a typical patient, each bar adds or subtracts
              percentage points until it reaches this patient&apos;s estimate.
              Hover a bar to see it on the heart.
            </p>
            <Waterfall
              activeFactor={hoveredFactor}
              data={waterfall}
              targetLabel={label}
              onHoverFactor={setHoveredFactor}
            />
          </>
        )}
        {view === "arteries" && (
          <>
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-[11px] leading-4 text-slate-600">
                {arteryMode === "flow"
                  ? "Which factors drive which artery. Hover a factor or an artery to trace it here and on the heart; click an artery to select it."
                  : "Exact points for every factor and target. Hover a row to light it up on the heart; click a column to select that target."}
              </p>
              <div
                aria-label="Arteries view"
                className="insight-segmented"
                role="group"
              >
                {(["flow", "table"] as const).map((mode) => (
                  <button
                    aria-pressed={arteryMode === mode}
                    key={mode}
                    type="button"
                    onClick={() => setArteryMode(mode)}
                  >
                    {mode === "flow" ? "Flow" : "Table"}
                  </button>
                ))}
              </div>
            </div>
            {arteryMode === "flow" ? (
              <ArteryFlow
                activeFactor={hoveredFactor}
                arteries={shown.vessels}
                flow={flow}
                selected={target}
                onHoverFactor={setHoveredFactor}
                onSelectTarget={selectTarget}
              />
            ) : (
              <FactorHeatmap
                activeFactor={hoveredFactor}
                rows={heatmap}
                selected={target}
                onHoverFactor={setHoveredFactor}
                onSelectTarget={selectTarget}
              />
            )}
          </>
        )}
        {view === "body" && (
          <MeasurementCards
            activeFactor={hoveredFactor}
            groups={groups}
            targetLabel={label}
            onHoverFactor={setHoveredFactor}
          />
        )}
      </div>

      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        Method: {explanation.method ?? "not returned"} Compared with a typical
        patient (median measurements, no risk factors); contributions add up
        exactly to the estimate and describe the model&apos;s reasoning, not
        causes.
      </p>
    </section>
  );
}
