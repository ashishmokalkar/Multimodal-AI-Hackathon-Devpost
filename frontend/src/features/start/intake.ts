import type { FeatureValue } from "../../api/types";

/** What reports rarely say but the model needs most: asked before scoring when the report did not give them. */
export const ASK_FIRST = ["Age", "Sex", "Chest Pain", "DM", "HTN", "BP", "Smoking", "FH", "DLP", "Dyspnea", "Airway"];

export function show(value: FeatureValue, unit?: string): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return unit ? `${value} ${unit}` : String(value);
}
