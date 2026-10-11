import type { CohortPatient, CohortResponse } from "../api/types";
import type { InsightTarget } from "./insights";

/** The smallest comparison group worth a percentile; narrower age windows widen until they reach it. */
export const MIN_GROUP = 25;
const AGE_WINDOWS = [5, 7, 10, 15, 25] as const;
/** Age window for the nomogram's percentile bands. */
const BAND_WINDOW = 7;

export type Sex = CohortPatient["sex"];

export interface CohortComparison {
  target: InsightTarget;
  probability: number;
  /** Share of the comparison group with a lower estimate (ties count half), 0-100. */
  percentile: number;
  /** Same against every patient in the cohort, regardless of age and sex. */
  overallPercentile: number;
  n: number;
  /** Everyone the overall percentile is taken over. */
  total: number;
  age: number;
  sex: Sex;
  ageLow: number;
  ageHigh: number;
  /** The comparison group, for the nomogram. */
  group: CohortPatient[];
  /** Everyone of the same sex, for the nomogram background. */
  sameSex: CohortPatient[];
}

export interface PercentileBand {
  age: number;
  p25: number;
  p50: number;
  p75: number;
}

/** The dataset row this prediction belongs to, when the API says it is a dataset patient (exact or edited). */
export function ownCohortRow(predictionSource: string | null): number | null {
  const match = /^(?:Edited )?[Dd]ataset patient (\d+)/.exec(predictionSource ?? "");
  return match ? Number(match[1]) : null;
}

export function percentileOf(value: number, others: readonly number[]): number {
  if (!others.length) {
    return 0;
  }
  let below = 0;
  let ties = 0;
  for (const other of others) {
    if (other < value - 1e-9) {
      below += 1;
    } else if (Math.abs(other - value) <= 1e-9) {
      ties += 1;
    }
  }
  return ((below + ties / 2) / others.length) * 100;
}

function quantile(sorted: readonly number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/**
 * Where this patient's estimate sits among same-sex patients of similar age in the study cohort (the narrowest
 * age window, ±5 years upwards, with at least MIN_GROUP patients), like a nomogram. The patient's own dataset row
 * is left out, so a dataset patient is not compared with themself.
 */
export function compareWithCohort(
  cohort: CohortResponse,
  patient: { age: number; sex: Sex; ownRow: number | null },
  target: InsightTarget,
  probability: number,
): CohortComparison {
  const others = cohort.patients.filter((row) => row.patient !== patient.ownRow);
  const sameSex = others.filter((row) => row.sex === patient.sex);
  let window: number = AGE_WINDOWS[AGE_WINDOWS.length - 1];
  for (const candidate of AGE_WINDOWS) {
    const size = sameSex.filter(
      (row) => Math.abs(row.age - patient.age) <= candidate,
    ).length;
    if (size >= MIN_GROUP) {
      window = candidate;
      break;
    }
  }
  const group = sameSex.filter((row) => Math.abs(row.age - patient.age) <= window);
  return {
    target,
    probability,
    percentile: percentileOf(
      probability,
      group.map((row) => row[target]),
    ),
    overallPercentile: percentileOf(
      probability,
      others.map((row) => row[target]),
    ),
    n: group.length,
    total: others.length,
    age: patient.age,
    sex: patient.sex,
    ageLow: Math.round(patient.age - window),
    ageHigh: Math.round(patient.age + window),
    group,
    sameSex,
  };
}

/** 25th, 50th and 75th percentile of the estimate by age, for one sex (rolling ±7-year window). */
export function percentileBands(
  rows: readonly CohortPatient[],
  target: InsightTarget,
): PercentileBand[] {
  if (!rows.length) {
    return [];
  }
  const ages = rows.map((row) => row.age);
  const first = Math.min(...ages);
  const last = Math.max(...ages);
  const bands: PercentileBand[] = [];
  for (let age = first; age <= last; age += 1) {
    const values = rows
      .filter((row) => Math.abs(row.age - age) <= BAND_WINDOW)
      .map((row) => row[target])
      .sort((a, b) => a - b);
    if (values.length >= 8) {
      bands.push({
        age,
        p25: quantile(values, 0.25),
        p50: quantile(values, 0.5),
        p75: quantile(values, 0.75),
      });
    }
  }
  return bands;
}

const NOUN: Record<Sex, [string, string]> = {
  Female: ["woman", "women"],
  Male: ["man", "men"],
};

/** "41 women aged 60-70" */
export function groupPhrase(comparison: CohortComparison): string {
  const [, plural] = NOUN[comparison.sex];
  return `${comparison.n} ${plural} aged ${comparison.ageLow}–${comparison.ageHigh}`;
}

/** "Higher than 72% of 41 women aged 60–70 in the study" */
export function comparisonSentence(comparison: CohortComparison): string {
  return `Higher than ${Math.round(comparison.percentile)}% of ${groupPhrase(comparison)} in the study`;
}

/** A plain word for where the patient sits in their group. */
export function percentileWord(percentile: number): string {
  if (percentile >= 90) {
    return "Among the highest";
  }
  if (percentile >= 67) {
    return "Higher than most";
  }
  if (percentile > 33) {
    return "Around the middle";
  }
  if (percentile > 10) {
    return "Lower than most";
  }
  return "Among the lowest";
}
