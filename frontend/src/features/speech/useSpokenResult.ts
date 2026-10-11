import { useFeatures } from "../../api/hooks";
import { spokenSummary } from "../../lib/spokenSummary";
import { usePatientStore } from "../../store/patientStore";
import { useActiveScenario } from "../../store/whatIfStore";
import { useCohortComparison } from "../cohort/useCohortComparison";

/** The result on screen (a what-if scenario when one is active), ready to be read aloud. */
export function useSpokenResult() {
  const accepted = usePatientStore((state) => state.prediction);
  const inputs = usePatientStore((state) => state.predictionInputs);
  const scenario = useActiveScenario();
  const shown = scenario ?? accepted;
  const features = useFeatures().data ?? [];
  const { comparison } = useCohortComparison(shown, inputs, "cad");
  return {
    resultKey: shown?.request_id ?? null,
    sentences: () => (shown ? spokenSummary(shown, features, comparison) : []),
  };
}
