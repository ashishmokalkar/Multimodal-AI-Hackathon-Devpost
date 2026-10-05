import { z } from "zod";

export const FeatureValueSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
]);

export const FeatureSchema = z.object({
  name: z.string().min(1),
  label: z.string(),
  group: z.string(),
  type: z.enum(["number", "boolean", "categorical"]),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  default: FeatureValueSchema,
  options: z.array(FeatureValueSchema).optional(),
  description: z.string().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  model_version: z.string(),
  contract_version: z.string(),
  mock: z.boolean(),
});

export const VesselGroundTruthSchema = z.object({
  LAD: z.boolean(),
  LCX: z.boolean(),
  RCA: z.boolean(),
});

export const GroundTruthSchema = z.object({
  cad: z.boolean(),
  vessels: VesselGroundTruthSchema,
});

export const SamplePatientSchema = z.object({
  id: z.string(),
  label: z.string(),
  features: z.record(z.string(), FeatureValueSchema),
  ground_truth: GroundTruthSchema.optional(),
  synthetic: z.boolean(),
});

export const TargetSchema = z.object({
  probability: z.number().min(0).max(1),
  label: z.string(),
  threshold: z.number().min(0).max(1),
});

export const ContributionSchema = z.object({
  feature: z.string(),
  value: FeatureValueSchema,
  contribution: z.number(),
  direction: z.enum(["positive", "negative"]),
});

export const ExplanationSchema = z.object({
  base_value: z.number().min(0).max(1),
  contributions: z.array(ContributionSchema),
});

export const VesselTargetsSchema = z.object({
  LAD: TargetSchema,
  LCX: TargetSchema,
  RCA: TargetSchema,
});

export const TargetExplanationsSchema = z.object({
  cad: ExplanationSchema,
  LAD: ExplanationSchema,
  LCX: ExplanationSchema,
  RCA: ExplanationSchema,
});

export const PredictionResponseSchema = z.object({
  request_id: z.string().uuid(),
  model_version: z.string(),
  cad: TargetSchema,
  vessels: VesselTargetsSchema,
  explanations: TargetExplanationsSchema,
  risk_summary: z.string(),
  mock: z.boolean(),
});

export const TargetMetricsSchema = z.object({
  accuracy: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1: z.number().min(0).max(1),
  roc_auc: z.number().min(0).max(1),
});

export const MetricsResponseSchema = z.object({
  model_version: z.string(),
  validation: z.string(),
  n_samples: z.number().int().min(1),
  trained_at: z.string().datetime(),
  targets: z.object({
    cad: TargetMetricsSchema,
    LAD: TargetMetricsSchema,
    LCX: TargetMetricsSchema,
    RCA: TargetMetricsSchema,
  }),
  mock: z.boolean(),
});

export const PredictRequestSchema = z.object({
  features: z.record(z.string(), FeatureValueSchema),
});

export const ValidationErrorItemSchema = z.object({
  loc: z.array(z.union([z.string(), z.number().int()])),
  msg: z.string(),
  type: z.string(),
});

export const ValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorItemSchema),
});

export type FeatureValue = z.infer<typeof FeatureValueSchema>;
export type FeatureDefinition = z.infer<typeof FeatureSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type VesselGroundTruth = z.infer<typeof VesselGroundTruthSchema>;
export type GroundTruth = z.infer<typeof GroundTruthSchema>;
export type SamplePatient = z.infer<typeof SamplePatientSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type Contribution = z.infer<typeof ContributionSchema>;
export type Explanation = z.infer<typeof ExplanationSchema>;
export type VesselTargets = z.infer<typeof VesselTargetsSchema>;
export type TargetExplanations = z.infer<typeof TargetExplanationsSchema>;
export type PredictionResponse = z.infer<typeof PredictionResponseSchema>;
export type TargetMetrics = z.infer<typeof TargetMetricsSchema>;
export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;
export type PredictRequest = z.infer<typeof PredictRequestSchema>;
export type ValidationErrorItem = z.infer<typeof ValidationErrorItemSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
