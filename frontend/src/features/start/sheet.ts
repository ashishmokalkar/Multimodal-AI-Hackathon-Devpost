import type { FeatureDefinition, FeatureValue } from "../../api/types";

/**
 * A screening-camp list (header row + one row per patient) as model inputs. Columns match an input by its name or its
 * label, with or without a trailing unit in brackets ("Fasting blood sugar (mg/dL)"). A missing or unreadable cell
 * keeps the input's typical value and is reported, so nothing is silently guessed.
 */

export interface SheetPatient {
  id: string;
  values: Record<string, FeatureValue>;
  /** Cells that could not be used, e.g. "Age: 'sixty' is not a number". */
  problems: string[];
}

export interface SheetResult {
  patients: SheetPatient[];
  /** Inputs with no column: every patient uses the typical value for them. */
  missing: string[];
  /** Columns that match no input (ignored). */
  ignored: string[];
}

const ID_COLUMNS = ["patient", "id", "name", "patient id"];

function key(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function withoutUnit(text: string): string {
  return text.replace(/\s*\([^()]*\)\s*$/, "");
}

function parseCell(feature: FeatureDefinition, raw: string): { value?: FeatureValue; problem?: string } {
  const text = raw.trim();
  if (feature.type === "number") {
    const number = Number(text.replace(",", "."));
    if (!Number.isFinite(number)) {
      return { problem: `'${text}' is not a number` };
    }
    if ((feature.min !== undefined && number < feature.min) || (feature.max !== undefined && number > feature.max)) {
      return { problem: `${number} is outside ${feature.min}-${feature.max}` };
    }
    return { value: number };
  }
  if (feature.type === "boolean") {
    const word = text.toLowerCase();
    if (["yes", "y", "true", "1"].includes(word)) return { value: true };
    if (["no", "n", "false", "0"].includes(word)) return { value: false };
    return { problem: `'${text}' is not yes or no` };
  }
  const option = (feature.options ?? []).find((item) => key(String(item)) === key(text));
  return option === undefined
    ? { problem: `'${text}' is not one of ${(feature.options ?? []).join(", ")}` }
    : { value: option };
}

export function readSheet(columns: string[], rows: string[][], features: FeatureDefinition[]): SheetResult {
  const lookup = new Map<string, FeatureDefinition>();
  for (const feature of features) {
    lookup.set(key(feature.name), feature);
    lookup.set(key(feature.label), feature);
  }
  const matched = columns.map((column) => lookup.get(key(column)) ?? lookup.get(key(withoutUnit(column))) ?? null);
  const idColumn = columns.findIndex((column, index) => !matched[index] && ID_COLUMNS.includes(key(column)));
  const used = new Set(matched.filter(Boolean).map((feature) => feature!.name));
  const patients = rows.map((row, rowIndex) => {
    const values: Record<string, FeatureValue> = Object.fromEntries(
      features.map((feature) => [feature.name, feature.default]),
    );
    const problems: string[] = [];
    row.forEach((cell, index) => {
      const feature = matched[index];
      if (!feature) {
        return;
      }
      if (cell.trim() === "") {
        problems.push(`${feature.label}: empty, typical value used`);
        return;
      }
      const { value, problem } = parseCell(feature, cell);
      if (value !== undefined) {
        values[feature.name] = value;
      } else {
        problems.push(`${feature.label}: ${problem}, typical value used`);
      }
    });
    const id = idColumn >= 0 && row[idColumn]?.trim() ? row[idColumn].trim() : `Row ${rowIndex + 1}`;
    return { id, values, problems };
  });
  return {
    patients,
    missing: features.filter((feature) => !used.has(feature.name)).map((feature) => feature.label),
    ignored: columns.filter((_, index) => !matched[index] && index !== idColumn),
  };
}
