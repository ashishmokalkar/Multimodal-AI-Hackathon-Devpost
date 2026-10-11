import { describe, expect, it } from "vitest";
import type { CohortPatient, CohortResponse } from "../api/types";
import {
  compareWithCohort,
  comparisonSentence,
  ownCohortRow,
  percentileBands,
  percentileOf,
} from "./cohort";

function row(patient: number, age: number, sex: CohortPatient["sex"], cad: number): CohortPatient {
  return { patient, age, sex, cad, LAD: cad / 2, LCX: cad / 3, RCA: cad / 4 };
}

const cohort: CohortResponse = {
  model_version: "test",
  n_patients: 0,
  population: "test",
  patients: [
    ...Array.from({ length: 30 }, (_, i) => row(i + 1, 60 + (i % 5), "Female", i / 30)),
    ...Array.from({ length: 30 }, (_, i) => row(i + 31, 60, "Male", 0.99)),
    row(61, 40, "Female", 0.01),
  ],
};

describe("cohort comparison", () => {
  it("counts lower estimates, with ties as half", () => {
    expect(percentileOf(0.5, [0.1, 0.5, 0.9, 0.2])).toBe(62.5);
    expect(percentileOf(0.5, [])).toBe(0);
  });

  it("compares with same-sex patients of similar age only, leaving out the patient's own row", () => {
    const comparison = compareWithCohort(
      cohort,
      { age: 62, sex: "Female", ownRow: 30 },
      "cad",
      0.5,
    );
    expect(comparison.n).toBe(29);
    expect(comparison.group.every((item) => item.sex === "Female" && item.patient !== 30)).toBe(true);
    expect(comparison.ageLow).toBe(57);
    expect(comparison.percentile).toBeCloseTo((15.5 / 29) * 100, 5);
    expect(comparisonSentence(comparison)).toBe(
      "Higher than 53% of 29 women aged 57–67 in the study",
    );
  });

  it("widens the age window until the group is large enough", () => {
    const comparison = compareWithCohort(
      cohort,
      { age: 48, sex: "Female", ownRow: null },
      "cad",
      0.5,
    );
    expect(comparison.ageHigh - comparison.ageLow).toBe(30);
    // ±15 years: 24 women aged 60-63 and the 40-year-old
    expect(comparison.n).toBe(25);
  });

  it("recognises exact and edited dataset patients but not near neighbours", () => {
    expect(ownCohortRow("Dataset patient 20: scored by …")).toBe(20);
    expect(ownCohortRow("Edited dataset patient 7: scored by …")).toBe(7);
    expect(ownCohortRow("Close to dataset patient 7: scored mostly …")).toBeNull();
    expect(ownCohortRow(null)).toBeNull();
  });

  it("gives ordered percentile bands", () => {
    const bands = percentileBands(cohort.patients.filter((item) => item.sex === "Female"), "cad");
    expect(bands.length).toBeGreaterThan(0);
    expect(bands.every((band) => band.p25 <= band.p50 && band.p50 <= band.p75)).toBe(true);
  });
});
