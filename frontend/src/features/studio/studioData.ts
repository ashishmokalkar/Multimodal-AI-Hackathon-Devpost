import { useFeatures } from "../../api/hooks";
import type { PredictionResponse } from "../../api/types";
import type { InsightTarget } from "../../lib/insights";
import { usePatientStore } from "../../store/patientStore";
import { useActiveScenario } from "../../store/whatIfStore";
import { riskBand, type RiskBand } from "./studioModel";

/** The prediction on screen (a what-if scenario when one is active) and what it was built from. */
export function useStudioData() {
  const accepted = usePatientStore((state) => state.prediction);
  const scenario = useActiveScenario();
  const features = useFeatures().data ?? [];
  const predictionInputs = usePatientStore((state) => state.predictionInputs);
  const sampleId = usePatientStore((state) => state.selectedSampleId);
  return {
    accepted,
    scenario,
    shown: scenario ?? accepted,
    features,
    predictionInputs,
    sampleId,
  };
}

export function probabilityOf(
  prediction: PredictionResponse,
  target: InsightTarget,
): number {
  return target === "cad"
    ? prediction.cad.probability
    : prediction.vessels[target].probability;
}

export function bandOf(
  prediction: PredictionResponse,
  target: InsightTarget,
): RiskBand {
  const value = target === "cad" ? prediction.cad : prediction.vessels[target];
  return riskBand(value.probability, value.threshold);
}
