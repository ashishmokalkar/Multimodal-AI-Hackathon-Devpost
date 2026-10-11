import { useEffect } from "react";
import { postPredict } from "../../api/client";
import { useApiProfile } from "../../api/hooks";
import type { FeatureValue, PredictionResponse } from "../../api/types";
import { hasChanges, useWhatIfStore } from "../../store/whatIfStore";

const DEBOUNCE_MS = 300;

/**
 * Keeps the what-if scenario in step with its sliders: opens a scenario on the accepted prediction and sends each
 * change (debounced) to the same API as a separate request. The accepted prediction is never changed.
 */
export function useWhatIfRunner(
  baseInputs: Readonly<Record<string, FeatureValue>>,
  basePrediction: PredictionResponse,
  sampleId: string | null,
) {
  const profileQuery = useApiProfile();
  const profile = profileQuery.isSuccess ? profileQuery.data : null;
  const open = useWhatIfStore((s) => s.open);
  const values = useWhatIfStore((s) => s.values);
  const baseValues = useWhatIfStore((s) => s.baseValues);
  const pending = useWhatIfStore((s) => s.pending);
  const revision = useWhatIfStore((s) => s.revision);
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
        {
          features: { ...values },
          ...(profile.mode === "real" && sampleId
            ? { sample_id: sampleId }
            : {}),
        },
        profile,
      )
        .then((prediction) =>
          useWhatIfStore.getState().resolve(sent, prediction),
        )
        .catch((reason: unknown) =>
          useWhatIfStore
            .getState()
            .fail(
              sent,
              reason instanceof Error
                ? reason.message
                : "The scenario request failed.",
            ),
        );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [changed, pending, profile, revision, sampleId, values]);

  return { changed };
}
