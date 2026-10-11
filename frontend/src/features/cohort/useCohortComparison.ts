import { useMemo } from "react";
import { useCohort } from "../../api/hooks";
import type { CohortResponse, FeatureValue, PredictionResponse } from "../../api/types";
import {
  compareWithCohort,
  ownCohortRow,
  type CohortComparison,
} from "../../lib/cohort";
import type { InsightTarget } from "../../lib/insights";

function probabilityFor(prediction: PredictionResponse, target: InsightTarget): number {
  return target === "cad" ? prediction.cad.probability : prediction.vessels[target].probability;
}

/** Pure form of the hook, for the report (which compares every target at once). */
export function comparisonFor(
  cohort: CohortResponse | null | undefined,
  prediction: PredictionResponse | null,
  inputs: Readonly<Record<string, FeatureValue>> | null,
  target: InsightTarget,
): CohortComparison | null {
  if (!cohort || !prediction || prediction.mock || !inputs) {
    return null;
  }
  const age = inputs.Age;
  const sex = inputs.Sex;
  if (typeof age !== "number" || (sex !== "Female" && sex !== "Male")) {
    return null;
  }
  return compareWithCohort(
    cohort,
    { age, sex, ownRow: ownCohortRow(prediction.prediction_source) },
    target,
    probabilityFor(prediction, target),
  );
}

/**
 * How this patient's estimate compares with same-sex patients of similar age in the study cohort. Null for the
 * mock profile, while the cohort loads, or when age or sex is missing.
 */
export function useCohortComparison(
  prediction: PredictionResponse | null,
  inputs: Readonly<Record<string, FeatureValue>> | null,
  target: InsightTarget,
) {
  const cohortQuery = useCohort();
  const cohort = cohortQuery.data;
  const comparison = useMemo(
    () => comparisonFor(cohort, prediction, inputs, target),
    [cohort, prediction, inputs, target],
  );
  return { comparison, cohort: cohort ?? null, isPending: cohortQuery.isPending };
}
