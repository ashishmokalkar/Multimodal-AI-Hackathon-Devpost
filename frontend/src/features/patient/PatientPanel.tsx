import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useFeatures, usePredict, useSamples } from "../../api/hooks";
import { FeatureValueSchema } from "../../api/types";
import type {
  FeatureDefinition,
  FeatureValue,
} from "../../api/types";
import { usePatientStore } from "../../store/patientStore";

function createFeatureValidationSchema(features: FeatureDefinition[]) {
  const featureNames = new Set(features.map((feature) => feature.name));

  return z
    .record(z.string(), FeatureValueSchema)
    .superRefine((values, context) => {
      for (const feature of features) {
        const value = values[feature.name];
        if (value === undefined) {
          context.addIssue({
            code: "custom",
            path: [feature.name],
            message: "This field is required.",
          });
          continue;
        }

        if (feature.type === "number") {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            context.addIssue({
              code: "custom",
              path: [feature.name],
              message: "Enter a valid number.",
            });
            continue;
          }
          if (feature.min !== undefined && value < feature.min) {
            context.addIssue({
              code: "custom",
              path: [feature.name],
              message: `Enter a value of at least ${feature.min}.`,
            });
          }
          if (feature.max !== undefined && value > feature.max) {
            context.addIssue({
              code: "custom",
              path: [feature.name],
              message: `Enter a value no greater than ${feature.max}.`,
            });
          }
        } else if (feature.type === "boolean" && typeof value !== "boolean") {
          context.addIssue({
            code: "custom",
            path: [feature.name],
            message: "Choose yes or no.",
          });
        } else if (
          feature.type === "categorical" &&
          feature.options &&
          !feature.options.some((option) => Object.is(option, value))
        ) {
          context.addIssue({
            code: "custom",
            path: [feature.name],
            message: "Choose one of the listed options.",
          });
        }
      }

      for (const name of Object.keys(values)) {
        if (!featureNames.has(name)) {
          context.addIssue({
            code: "custom",
            path: [name],
            message: "This field is not supported by the API.",
          });
        }
      }
    });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The prediction request failed.";
}

export function PatientPanel() {
  const featuresQuery = useFeatures();
  const samplesQuery = useSamples();
  const predictionMutation = usePredict();
  const mutatePrediction = predictionMutation.mutateAsync;
  const patientFeatures = usePatientStore((state) => state.features);
  const selectedSampleId = usePatientStore((state) => state.selectedSampleId);
  const isPredicting = usePatientStore((state) => state.isPredicting);
  const setFeatures = usePatientStore((state) => state.setFeatures);
  const setFromSample = usePatientStore((state) => state.setFromSample);
  const updateFeature = usePatientStore((state) => state.updateFeature);
  const setPredicting = usePatientStore((state) => state.setPredicting);
  const setPrediction = usePatientStore((state) => state.setPrediction);
  const setPredictionError = usePatientStore(
    (state) => state.setPredictionError,
  );
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [autoPredict, setAutoPredict] = useState(true);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const requestSequence = useRef(0);
  const autoPredictTimer = useRef<number | null>(null);
  const initializedFromSamples = useRef(false);

  const defaultFeatures = useMemo(() => {
    if (!featuresQuery.data) {
      return null;
    }
    return Object.fromEntries(
      featuresQuery.data.map((feature) => [feature.name, feature.default]),
    );
  }, [featuresQuery.data]);

  const validationSchema = useMemo(
    () =>
      featuresQuery.data
        ? createFeatureValidationSchema(featuresQuery.data)
        : null,
    [featuresQuery.data],
  );
  const validation = useMemo(
    () => validationSchema?.safeParse(patientFeatures),
    [patientFeatures, validationSchema],
  );
  const fieldErrors = useMemo(() => {
    if (!showValidationErrors || !validation || validation.success) {
      return {};
    }
    return Object.fromEntries(
      validation.error.issues.map((issue) => [
        String(issue.path[0] ?? "form"),
        issue.message,
      ]),
    );
  }, [showValidationErrors, validation]);
  const groups = useMemo(() => {
    const grouped = new Map<string, FeatureDefinition[]>();
    for (const feature of featuresQuery.data ?? []) {
      const group = grouped.get(feature.group) ?? [];
      group.push(feature);
      grouped.set(feature.group, group);
    }
    return Array.from(grouped.entries());
  }, [featuresQuery.data]);

  useEffect(() => {
    if (defaultFeatures && Object.keys(patientFeatures).length === 0) {
      setFeatures(defaultFeatures);
    }
  }, [defaultFeatures, patientFeatures, setFeatures]);

  useEffect(() => {
    if (
      !initializedFromSamples.current &&
      samplesQuery.data &&
      samplesQuery.data.length > 0 &&
      Object.keys(patientFeatures).length > 0
    ) {
      initializedFromSamples.current = true;
      setFromSample(samplesQuery.data[0]);
    }
  }, [patientFeatures, samplesQuery.data, setFromSample]);

  const requestPrediction = useCallback(
    async (features: Record<string, FeatureValue>) => {
      if (!validationSchema) {
        return;
      }
      const parsed = validationSchema.safeParse(features);
      if (!parsed.success) {
        setShowValidationErrors(true);
        return;
      }

      const sequence = ++requestSequence.current;
      setPredicting(true);
      try {
        const response = await mutatePrediction({
          features: parsed.data,
        });
        if (requestSequence.current === sequence) {
          setPrediction(response);
        }
      } catch (error) {
        if (requestSequence.current === sequence) {
          setPredictionError(errorMessage(error));
        }
      }
    },
    [
      mutatePrediction,
      setPrediction,
      setPredictionError,
      setPredicting,
      validationSchema,
    ],
  );

  useEffect(() => {
    if (autoPredictTimer.current !== null) {
      window.clearTimeout(autoPredictTimer.current);
      autoPredictTimer.current = null;
    }
    requestSequence.current += 1;

    if (autoPredict && validation?.success) {
      autoPredictTimer.current = window.setTimeout(() => {
        autoPredictTimer.current = null;
        void requestPrediction(patientFeatures);
      }, 500);
    }

    return () => {
      if (autoPredictTimer.current !== null) {
        window.clearTimeout(autoPredictTimer.current);
        autoPredictTimer.current = null;
      }
      requestSequence.current += 1;
    };
  }, [
    autoPredict,
    patientFeatures,
    requestPrediction,
    validation?.success,
  ]);

  const handlePredict = () => {
    setShowValidationErrors(true);
    if (autoPredictTimer.current !== null) {
      window.clearTimeout(autoPredictTimer.current);
      autoPredictTimer.current = null;
    }
    void requestPrediction(patientFeatures);
  };

  const handleFeatureChange = (feature: FeatureDefinition, value: FeatureValue) => {
    setShowValidationErrors(false);
    updateFeature(feature.name, value);
  };

  return (
    <section
      className="panel min-h-0"
      aria-labelledby="patient-panel-heading"
    >
      <header className="panel-header">
        <div>
          <p className="eyebrow">Input workspace</p>
          <h2 id="patient-panel-heading">Patient panel</h2>
        </div>
      </header>
      <div className="panel-body !justify-start gap-4 overflow-y-auto">
        <div className="space-y-2">
          <label
            className="block text-xs font-semibold text-slate-700"
            htmlFor="sample-patient"
          >
            Sample patient
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            id="sample-patient"
            disabled={samplesQuery.isPending || !samplesQuery.data?.length}
            value={selectedSampleId ?? ""}
            onChange={(event) => {
              const sample = samplesQuery.data?.find(
                (item) => item.id === event.target.value,
              );
              if (sample) {
                setShowValidationErrors(false);
                setFromSample(sample);
              } else if (event.target.value === "" && defaultFeatures) {
                setShowValidationErrors(false);
                setFeatures(defaultFeatures);
              }
            }}
          >
            <option value="">Custom patient</option>
            {samplesQuery.data?.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.label}
                {sample.synthetic ? " (synthetic)" : ""}
              </option>
            ))}
          </select>
          {samplesQuery.isError && (
            <p className="text-xs text-red-700" role="alert">
              Sample patients could not be loaded: {errorMessage(samplesQuery.error)}
            </p>
          )}
          {featuresQuery.isError && (
            <p className="text-xs text-red-700" role="alert">
              Feature definitions could not be loaded:{" "}
              {errorMessage(featuresQuery.error)}
            </p>
          )}
          {featuresQuery.isPending && (
            <p className="text-xs text-slate-500" role="status">
              Loading feature definitions…
            </p>
          )}
        </div>

        {groups.map(([group, features]) => {
        const isOpen =
          openGroup === null
            ? groups[0]?.[0] === group
            : openGroup === group;
          return (
            <section
              className="overflow-hidden rounded-xl border border-slate-200"
              key={group}
            >
              <h3>
                <button
                  aria-controls={`feature-group-${group}`}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-800"
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? "" : group)}
                >
                  <span>{group}</span>
                  <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
              </h3>
              {isOpen && (
                <div
                  className="space-y-3 p-3"
                  id={`feature-group-${group}`}
                >
                  {features.map((feature) => {
                    const value =
                      patientFeatures[feature.name] ?? feature.default;
                    const error = fieldErrors[feature.name];
                    const controlId = `feature-${feature.name}`;
                    return (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_minmax(96px,0.9fr)] items-center gap-x-3 gap-y-1"
                        key={feature.name}
                      >
                        <label
                          className="text-xs font-medium leading-5 text-slate-700"
                          htmlFor={controlId}
                        >
                          {feature.label}
                          {feature.unit && (
                            <span className="ml-1 font-normal text-slate-500">
                              ({feature.unit})
                            </span>
                          )}
                        </label>
                        {feature.type === "boolean" ? (
                          <input
                            checked={value === true}
                            className="h-4 w-4 justify-self-start accent-emerald-700"
                            id={controlId}
                            type="checkbox"
                            aria-invalid={Boolean(error)}
                            onChange={(event) =>
                              handleFeatureChange(feature, event.target.checked)
                            }
                          />
                        ) : feature.type === "categorical" ? (
                          <select
                            className="min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                            id={controlId}
                            value={String(value)}
                            aria-invalid={Boolean(error)}
                            onChange={(event) => {
                              const option = feature.options?.find(
                                (item) => String(item) === event.target.value,
                              );
                              handleFeatureChange(
                                feature,
                                option ?? event.target.value,
                              );
                            }}
                          >
                            {feature.options?.map((option) => (
                              <option key={String(option)} value={String(option)}>
                                {String(option)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                            id={controlId}
                            type="number"
                            inputMode="decimal"
                            min={feature.min}
                            max={feature.max}
                            step="any"
                            value={
                              typeof value === "number" && Number.isFinite(value)
                                ? value
                                : ""
                            }
                            aria-invalid={Boolean(error)}
                            onChange={(event) =>
                              handleFeatureChange(
                                feature,
                                event.target.value === ""
                                  ? ""
                                  : event.target.valueAsNumber,
                              )
                            }
                          />
                        )}
                        {error && (
                          <p
                            className="col-span-2 text-xs text-red-700"
                            id={`${controlId}-error`}
                            role="alert"
                          >
                            {error}
                          </p>
                        )}
                        {feature.description && (
                          <p className="col-span-2 text-[11px] leading-4 text-slate-500">
                            {feature.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {showValidationErrors && validation && !validation.success && (
          <p className="text-xs text-red-700" role="alert">
            Correct the highlighted values before requesting a prediction.
          </p>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            checked={autoPredict}
            className="h-4 w-4 accent-emerald-700"
            type="checkbox"
            onChange={(event) => setAutoPredict(event.target.checked)}
          />
          Auto-predict after 500 ms
        </label>
        <button
          className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={isPredicting || featuresQuery.isPending || !validationSchema}
          onClick={handlePredict}
        >
          {isPredicting ? "Predicting…" : "Predict"}
        </button>
      </div>
    </section>
  );
}
