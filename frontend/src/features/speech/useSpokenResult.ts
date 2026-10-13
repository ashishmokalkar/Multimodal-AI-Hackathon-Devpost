import { useFeatures } from "../../api/hooks";
import { spokenSummary } from "../../lib/spokenSummary";
import { usePatientStore } from "../../store/patientStore";
import { useActiveScenario, useWhatIfStore } from "../../store/whatIfStore";

/** The result on screen (a what-if scenario when one is active), ready to be read aloud. */
export function useSpokenResult() {
  const accepted = usePatientStore((state) => state.prediction);
  const acceptedInputs = usePatientStore((state) => state.predictionInputs);
  const scenario = useActiveScenario();
  const scenarioValues = useWhatIfStore((state) => state.values);
  const shown = scenario ?? accepted;
  const inputs = (scenario ? scenarioValues : acceptedInputs) ?? {};
  const features = useFeatures().data ?? [];
  return {
    resultKey: shown?.request_id ?? null,
    sentences: () => (shown ? spokenSummary(shown, features, inputs) : []),
  };
}
