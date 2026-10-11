import { describe, expect, it } from "vitest";
import type { FeatureDefinition } from "../api/types";
import { formatFeatureValue, formatRange } from "./insights";
import {
  displayValue,
  fromDisplay,
  localiseFeatures,
  toDisplay,
} from "./units";

const lab = (name: string, unit: string): FeatureDefinition => ({
  name,
  label: name,
  group: "Lab",
  type: "number",
  unit,
  default: 0,
});
const RAW = [
  lab("FBS", "mg/dL"),
  lab("LDL", "mg/dL"),
  lab("CR", "mg/dL"),
  lab("K", "mmol/L"),
];

describe("lab units", () => {
  it("leaves the API's definitions untouched in conventional units", () => {
    const shown = localiseFeatures(RAW, "conventional");
    expect(shown.every((definition, index) => definition === RAW[index])).toBe(
      true,
    );
    expect(formatFeatureValue(98, shown[0])).toBe("98 mg/dL");
  });

  it("shows SI values but keeps the API value and range in API units", () => {
    const [fbs, ldl, cr, k] = localiseFeatures(RAW, "si");
    expect(fbs.unit).toBe("mg/dL");
    expect(formatFeatureValue(99, fbs)).toBe("5.5 mmol/L");
    expect(formatFeatureValue(100, ldl)).toBe("2.59 mmol/L");
    expect(formatFeatureValue(1, cr)).toBe("88 µmol/L");
    expect(formatFeatureValue(4.2, k)).toBe("4.2 mmol/L");
    expect(formatRange({ high: 100 }, ldl)).toBe("< 2.59 mmol/L");
    expect(displayValue(true, ldl)).toBe(true);
  });

  it("round-trips a typed SI value back to the API unit", () => {
    const [fbs] = localiseFeatures(RAW, "si");
    expect(fromDisplay(toDisplay(126, fbs), fbs)).toBeCloseTo(126, 10);
    expect(fromDisplay(7, fbs)).toBeCloseTo(126.1, 1);
  });
});
