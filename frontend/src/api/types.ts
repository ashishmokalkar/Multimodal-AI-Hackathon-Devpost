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
  reference_range: z
    .object({ low: z.number().optional(), high: z.number().optional() })
    .strict()
    .optional(),
  modifiable: z.boolean().optional(),
}).strict();

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  model_version: z.string().min(1),
  contract_version: z.string().min(1),
  mock: z.boolean(),
}).strict();

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
  uncertain: z.boolean().optional(),
  capped: z.boolean().optional(),
});

const RealTargetSchema = TargetSchema.extend({
  uncertain: z.boolean(),
}).strict();

export const ContributionSchema = z.object({
  feature: z.string(),
  value: FeatureValueSchema,
  contribution: z.number(),
  direction: z.enum(["positive", "negative"]),
});

export const ExplanationSchema = z.object({
  base_value: z.number().min(0).max(1),
  contributions: z.array(ContributionSchema),
  scale: z.literal("probability").optional(),
  method: z.string().optional(),
});

const RealExplanationSchema = ExplanationSchema.extend({
  scale: z.literal("probability"),
  method: z.string().min(1),
}).strict();

export const VesselTargetsSchema = z.object({
  LAD: TargetSchema,
  LCX: TargetSchema,
  RCA: TargetSchema,
});

const RealVesselTargetsSchema = z.object({
  LAD: RealTargetSchema,
  LCX: RealTargetSchema,
  RCA: RealTargetSchema,
}).strict();

export const TargetExplanationsSchema = z.object({
  cad: ExplanationSchema,
  LAD: ExplanationSchema,
  LCX: ExplanationSchema,
  RCA: ExplanationSchema,
});

const RealTargetExplanationsSchema = z.object({
  cad: RealExplanationSchema,
  LAD: RealExplanationSchema,
  LCX: RealExplanationSchema,
  RCA: RealExplanationSchema,
}).strict();

const PredictionResponseBaseSchema = z.object({
  request_id: z.string().uuid(),
  model_version: z.string().min(1),
  risk_summary: z.string(),
});

const MockPredictionResponseSchema = PredictionResponseBaseSchema.extend({
  cad: TargetSchema,
  vessels: VesselTargetsSchema,
  explanations: TargetExplanationsSchema,
  mock: z.literal(true),
});

const RealPredictionResponseSchema = PredictionResponseBaseSchema.extend({
  cad: RealTargetSchema,
  vessels: RealVesselTargetsSchema,
  explanations: RealTargetExplanationsSchema,
  warnings: z.array(z.string()),
  derived: z.object({
    BMI: z.number().finite(),
    Obesity: z.boolean(),
  }).strict(),
  prediction_source: z.string().min(1),
  mock: z.literal(false),
}).strict();

export const PredictionResponseSchema = z.discriminatedUnion("mock", [
  MockPredictionResponseSchema,
  RealPredictionResponseSchema,
]);

export const TargetMetricsSchema = z.object({
  accuracy: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1: z.number().min(0).max(1),
  roc_auc: z.number().min(0).max(1),
});

const RealTargetMetricsSchema = TargetMetricsSchema.extend({
  roc_auc_ci95: z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
  ]).refine(([lower, upper]) => lower <= upper, {
    message: "ROC-AUC confidence interval must be ordered.",
  }),
  balanced_accuracy: z.number().min(0).max(1),
  brier: z.number().finite().min(0).max(1),
  ece: z.number().finite().min(0).max(1),
  threshold: z.number().min(0).max(1),
  model: z.string().min(1),
}).strict();

const MetricsResponseBaseSchema = z.object({
  model_version: z.string().min(1),
  validation: z.string(),
  n_samples: z.number().int().min(1),
  trained_at: z.string().datetime(),
});

const MockMetricsResponseSchema = MetricsResponseBaseSchema.extend({
  targets: z.object({
    cad: TargetMetricsSchema,
    LAD: TargetMetricsSchema,
    LCX: TargetMetricsSchema,
    RCA: TargetMetricsSchema,
  }),
  mock: z.literal(true),
});

const RealMetricsResponseSchema = MetricsResponseBaseSchema.extend({
  targets: z.object({
    cad: RealTargetMetricsSchema,
    LAD: RealTargetMetricsSchema,
    LCX: RealTargetMetricsSchema,
    RCA: RealTargetMetricsSchema,
  }).strict(),
  mock: z.literal(false),
}).strict();

export const MetricsResponseSchema = z.discriminatedUnion("mock", [
  MockMetricsResponseSchema,
  RealMetricsResponseSchema,
]);

export const FeatureImportanceSchema = z.object({
  feature: z.string(),
  mean_abs_contribution: z.number().finite().min(0),
  share_raising: z.number().min(0).max(1),
}).strict();

export const ImportanceResponseSchema = z.object({
  model_version: z.string().min(1),
  n_patients: z.number().int().min(1),
  description: z.string(),
  targets: z.object({
    cad: z.array(FeatureImportanceSchema),
    LAD: z.array(FeatureImportanceSchema),
    LCX: z.array(FeatureImportanceSchema),
    RCA: z.array(FeatureImportanceSchema),
  }).strict(),
}).strict();

export const PredictRequestSchema = z.object({
  features: z.record(z.string(), FeatureValueSchema),
  sample_id: z.string().min(1).optional(),
}).strict();

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
export type FeatureImportance = z.infer<typeof FeatureImportanceSchema>;
export type ImportanceResponse = z.infer<typeof ImportanceResponseSchema>;
export type ReferenceRange = NonNullable<FeatureDefinition["reference_range"]>;
