import { useEffect, useMemo } from "react";
import {
  useApiProfile,
  useFeatures,
  usePredict,
  useSamples,
} from "../../api/hooks";
import { createFeatureValidationSchema } from "../../lib/featureValidation";
import {
  requestPredictionForRevision,
  schedulePrediction,
} from "../../lib/predictionRequests";
import { usePatientStore } from "../../store/patientStore";

/**
 * Studio keeps the model in step with the inputs at all times: it starts from the first dataset sample and asks
 * for a new prediction 500 ms after every valid change (the same contract and debounce as the Classic panel).
 */
export function usePredictionDriver() {
  const profileQuery = useApiProfile();
  const profile = profileQuery.isSuccess ? profileQuery.data : null;
  const featuresQuery = useFeatures();
  const samplesQuery = useSamples();
  const mutatePrediction = usePredict().mutateAsync;
  const features = usePatientStore((state) => state.features);
  const inputRevision = usePatientStore((state) => state.inputRevision);
  const prediction = usePatientStore((state) => state.prediction);
  const isPredicting = usePatientStore((state) => state.isPredicting);
  const predictionError = usePatientStore((state) => state.predictionError);

  const schema = useMemo(
    () =>
      featuresQuery.data
        ? createFeatureValidationSchema(featuresQuery.data)
        : null,
    [featuresQuery.data],
  );
  const valid = useMemo(
    () => (schema ? schema.safeParse(features).success : false),
    [features, schema],
  );

  // defaults first, then the first sample (or keep the defaults when there are no samples)
  useEffect(() => {
    if (!featuresQuery.data || Object.keys(features).length > 0) {
      return;
    }
    usePatientStore
      .getState()
      .setFeatures(
        Object.fromEntries(
          featuresQuery.data.map((feature) => [feature.name, feature.default]),
        ),
      );
  }, [featuresQuery.data, features]);

  const firstSample = samplesQuery.data?.[0];
  useEffect(() => {
    const state = usePatientStore.getState();
    if (
      firstSample &&
      state.selectedSampleId === null &&
      state.prediction === null &&
      state.latestPredictionRequestId === 0 &&
      Object.keys(state.features).length > 0
    ) {
      state.setFromSample(firstSample);
    }
  }, [firstSample, features]);

  useEffect(() => {
    // wait until the samples request settles, so the first sample (not the defaults) is scored first
    const samplesSettled = !samplesQuery.isPending || samplesQuery.isError;
    if (
      !schema ||
      !profile ||
      !samplesSettled ||
      Object.keys(features).length === 0
    ) {
      return;
    }
    if (!valid) {
      usePatientStore.getState().setPredictionStatus("invalid");
      return;
    }
    if (prediction || isPredicting || predictionError) {
      return;
    }
    usePatientStore.getState().setPredictionStatus("auto-updating");
    const scheduledRevision = inputRevision;
    const scheduledFeatures = features;
    return schedulePrediction(() => {
      const parsed = schema.safeParse(scheduledFeatures);
      if (!parsed.success) {
        return;
      }
      void requestPredictionForRevision(
        scheduledRevision,
        parsed.data,
        (validFeatures, sampleId) =>
          mutatePrediction({
            features: validFeatures,
            ...(profile.mode === "real" && sampleId
              ? { sample_id: sampleId }
              : {}),
          }),
      );
    });
  }, [
    features,
    inputRevision,
    isPredicting,
    mutatePrediction,
    prediction,
    predictionError,
    profile,
    samplesQuery.isError,
    samplesQuery.isPending,
    schema,
    valid,
  ]);

  return { valid };
}
