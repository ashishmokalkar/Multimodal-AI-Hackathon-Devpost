import type {
  DisplayConversion,
  FeatureDefinition,
  ReferenceRange,
} from "../api/types";

/** Lab units shown on screen. The API always receives the conventional units in its feature contract. */
export type UnitSystem = "conventional" | "si";

export const UNIT_SYSTEM_LABEL: Record<UnitSystem, string> = {
  conventional: "mg/dL",
  si: "mmol/L",
};

/**
 * SI conversions for the conventional lab units of the contract (multiply the conventional value by `factor`).
 * Glucose 18.016 mg/dL per mmol/L; cholesterol 38.67; triglycerides 88.57; creatinine 88.42 µmol/L per mg/dL;
 * urea nitrogen 0.357 mmol/L urea per mg/dL; haemoglobin 10 g/L per g/dL. Potassium and sodium are already mmol/L.
 */
export const SI_CONVERSIONS: Readonly<Record<string, DisplayConversion>> = {
  FBS: { unit: "mmol/L", factor: 1 / 18.016, digits: 1 },
  TG: { unit: "mmol/L", factor: 1 / 88.57, digits: 2 },
  LDL: { unit: "mmol/L", factor: 1 / 38.67, digits: 2 },
  HDL: { unit: "mmol/L", factor: 1 / 38.67, digits: 2 },
  CR: { unit: "µmol/L", factor: 88.42, digits: 0 },
  BUN: { unit: "mmol/L", factor: 0.357, digits: 1 },
  HB: { unit: "g/L", factor: 10, digits: 0 },
};

/**
 * Feature definitions as shown in the chosen unit system: convertible labs get a `display` conversion. The
 * contract fields (unit, min, max, reference range) are left in API units, because the stored and sent values are
 * in API units; only what is shown is converted.
 */
export function localiseFeatures(
  definitions: readonly FeatureDefinition[],
  system: UnitSystem,
): FeatureDefinition[] {
  return definitions.map((definition) => {
    const conversion =
      system === "si" && definition.type === "number"
        ? SI_CONVERSIONS[definition.name]
        : undefined;
    // the API's definitions never carry `display`, so conventional units need no copy
    return conversion ? { ...definition, display: conversion } : definition;
  });
}

/** API value -> value shown on screen. */
export function toDisplay(
  value: number,
  definition: FeatureDefinition | undefined,
): number {
  return definition?.display ? value * definition.display.factor : value;
}

/** Value typed on screen -> API value. */
export function fromDisplay(
  value: number,
  definition: FeatureDefinition | undefined,
): number {
  return definition?.display ? value / definition.display.factor : value;
}

/** The unit shown on screen (the API unit unless a conversion applies). */
export function displayUnit(definition: FeatureDefinition | undefined): string {
  return definition?.display?.unit ?? definition?.unit ?? "";
}

/** Rounds a shown value to the precision that makes sense for its unit. */
export function roundForDisplay(
  value: number,
  definition: FeatureDefinition | undefined,
): number {
  const digits = definition?.display?.digits;
  if (digits === undefined) {
    return value;
  }
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/** Shown value as text, without the unit. API values keep their own formatting (integers stay integers). */
export function displayNumber(
  value: number,
  definition: FeatureDefinition | undefined,
): string {
  if (definition?.display) {
    return toDisplay(value, definition).toFixed(definition.display.digits);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Step for a number field in the shown unit. */
export function displayStep(definition: FeatureDefinition | undefined): number | "any" {
  const digits = definition?.display?.digits;
  return digits === undefined ? "any" : 10 ** -digits;
}

/** A reference range converted to the shown unit. */
export function displayRange(
  range: ReferenceRange,
  definition: FeatureDefinition | undefined,
): ReferenceRange {
  const convert = (value: number | undefined) =>
    value === undefined
      ? undefined
      : roundForDisplay(toDisplay(value, definition), definition);
  return { low: convert(range.low), high: convert(range.high) };
}

/** A raw table value in the shown unit: numbers with a conversion are converted and rounded; others are unchanged. */
export function displayValue<T>(
  value: T,
  definition: FeatureDefinition | undefined,
): T | number {
  return typeof value === "number" && definition?.display
    ? roundForDisplay(toDisplay(value, definition), definition)
    : value;
}
