import type {
  Contribution,
  Explanation,
  FeatureDefinition,
  FeatureValue,
  TargetExplanations,
} from "../api/types";
import type { VesselId } from "../features/viewer/vesselMap";

export type ExplanationTarget = keyof TargetExplanations;

export interface DisplayContribution extends Contribution {
  label: string;
  unit?: string;
}

export interface PredictionInputRow {
  feature: string;
  label: string;
  group: string;
  value: FeatureValue | null;
  contribution: number | null;
  unit?: string;
}

export interface PredictionInputGroup {
  group: string;
  rows: PredictionInputRow[];
}

export function explanationTargetFor(
  selectedVessel: VesselId | null,
): ExplanationTarget {
  return selectedVessel ?? "cad";
}

export function explanationForSelection(
  explanations: TargetExplanations,
  selectedVessel: VesselId | null,
): Explanation {
  return explanations[explanationTargetFor(selectedVessel)];
}

export function leadingContributions(
  contributions: readonly Contribution[],
  features: readonly FeatureDefinition[],
  limit = 5,
): DisplayContribution[] {
  const featureDefinitions = new Map(
    features.map((feature) => [
      feature.name,
      { label: feature.label, unit: feature.unit },
    ]),
  );

  return contributions
    .map((contribution, responseOrder) => ({
      contribution,
      responseOrder,
      metadata: featureDefinitions.get(contribution.feature),
    }))
    .sort(
      (left, right) =>
        Math.abs(right.contribution.contribution) -
          Math.abs(left.contribution.contribution) ||
        left.responseOrder - right.responseOrder,
    )
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ contribution, metadata }) => ({
      ...contribution,
      label: metadata?.label ?? contribution.feature,
      ...(metadata?.unit ? { unit: metadata.unit } : {}),
    }));
}

export function groupPredictionInputs(
  features: readonly FeatureDefinition[],
  predictionInputs: Readonly<Record<string, FeatureValue>> | null,
  contributions: readonly Contribution[],
): PredictionInputGroup[] {
  const contributionsByFeature = new Map<string, Contribution>();
  for (const contribution of contributions) {
    if (!contributionsByFeature.has(contribution.feature)) {
      contributionsByFeature.set(contribution.feature, contribution);
    }
  }

  const groups = new Map<string, PredictionInputRow[]>();
  const includedFeatures = new Set<string>();
  const addRow = (group: string, row: PredictionInputRow) => {
    const rows = groups.get(group) ?? [];
    rows.push(row);
    groups.set(group, rows);
    includedFeatures.add(row.feature);
  };

  for (const feature of features) {
    const attributed = contributionsByFeature.get(feature.name);
    const hasSnapshotValue =
      predictionInputs !== null &&
      Object.prototype.hasOwnProperty.call(predictionInputs, feature.name);
    addRow(feature.group, {
      feature: feature.name,
      label: feature.label,
      group: feature.group,
      value: attributed
        ? attributed.value
        : hasSnapshotValue
          ? predictionInputs[feature.name]
          : null,
      contribution: attributed?.contribution ?? null,
      ...(feature.unit ? { unit: feature.unit } : {}),
    });
  }

  for (const [feature, value] of Object.entries(predictionInputs ?? {})) {
    if (!includedFeatures.has(feature)) {
      const attributed = contributionsByFeature.get(feature);
      addRow("Other inputs", {
        feature,
        label: feature,
        group: "Other inputs",
        value: attributed ? attributed.value : value,
        contribution: attributed?.contribution ?? null,
      });
    }
  }

  for (const contribution of contributions) {
    if (!includedFeatures.has(contribution.feature)) {
      addRow("Other returned features", {
        feature: contribution.feature,
        label: contribution.feature,
        group: "Other returned features",
        value: contribution.value,
        contribution: contribution.contribution,
      });
    }
  }

  return Array.from(groups, ([group, rows]) => ({ group, rows }));
}

export function formatContributionInput(
  value: Contribution["value"],
  unit?: string,
): string {
  const formattedValue =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (!unit || typeof value !== "number") {
    return formattedValue;
  }
  return unit === "%" ? `${formattedValue}%` : `${formattedValue} ${unit}`;
}

export function formatContributionValue(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
}
