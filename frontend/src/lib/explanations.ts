import type {
  Contribution,
  Explanation,
  FeatureDefinition,
  TargetExplanations,
} from "../api/types";
import type { VesselId } from "../features/viewer/vesselMap";

export type ExplanationTarget = keyof TargetExplanations;

export interface DisplayContribution extends Contribution {
  label: string;
  unit?: string;
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
    .slice(0, 5)
    .map(({ contribution, metadata }) => ({
      ...contribution,
      label: metadata?.label ?? contribution.feature,
      ...(metadata?.unit ? { unit: metadata.unit } : {}),
    }));
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
