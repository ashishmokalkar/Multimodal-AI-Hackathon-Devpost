import { z } from "zod";
import { FeatureValueSchema } from "../api/types";
import type { FeatureDefinition } from "../api/types";
import { displayNumber, displayUnit } from "./units";

/** A limit in the unit shown on screen, so the message matches what the user typed. */
function limit(value: number, feature: FeatureDefinition): string {
  const unit = displayUnit(feature);
  return `${displayNumber(value, feature)}${unit ? ` ${unit}` : ""}`;
}

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
              message: `Enter a value of at least ${limit(feature.min, feature)}.`,
            });
          }
          if (feature.max !== undefined && value > feature.max) {
            context.addIssue({
              code: "custom",
              path: [feature.name],
              message: `Enter a value no greater than ${limit(feature.max, feature)}.`,
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
