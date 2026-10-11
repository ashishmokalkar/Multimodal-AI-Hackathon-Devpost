import { z } from "zod";
import { FeatureValueSchema } from "../api/types";
import type { FeatureDefinition } from "../api/types";

/** Validates a full input record against the API feature contract (required, range, type and option checks). */
export function createFeatureValidationSchema(features: FeatureDefinition[]) {
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
