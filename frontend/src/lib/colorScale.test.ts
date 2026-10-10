import { describe, expect, it } from "vitest";
import {
  ARTERY_COLORS,
  CAD_IDENTITY_COLOR,
  targetColor,
  thresholdPosition,
} from "./colorScale";

describe("artery colours", () => {
  it("gives each artery its own fixed, distinct colour and CAD the neutral brand colour", () => {
    expect(targetColor("LAD")).toBe(ARTERY_COLORS.LAD);
    expect(targetColor("LCX")).toBe(ARTERY_COLORS.LCX);
    expect(targetColor("RCA")).toBe(ARTERY_COLORS.RCA);
    expect(new Set(Object.values(ARTERY_COLORS)).size).toBe(3);
    expect(targetColor("cad")).toBe(CAD_IDENTITY_COLOR);
  });
});

describe("thresholdPosition", () => {
  it("puts every target's own threshold in the middle of the legend track", () => {
    expect(thresholdPosition(0.32, 0.32)).toBeCloseTo(0.5);
    expect(thresholdPosition(0.55, 0.55)).toBeCloseTo(0.5);
    expect(thresholdPosition(0, 0.32)).toBe(0);
    expect(thresholdPosition(1, 0.32)).toBe(1);
  });

  it("places chances above the threshold to the right and below it to the left", () => {
    expect(thresholdPosition(0.4, 0.32)).toBeGreaterThan(0.5);
    expect(thresholdPosition(0.52, 0.55)).toBeLessThan(0.5);
    // the same chance sits further right against a lower threshold
    expect(thresholdPosition(0.6, 0.32)).toBeGreaterThan(
      thresholdPosition(0.6, 0.55),
    );
  });

  it("clamps out-of-range values and rejects non-finite input", () => {
    expect(thresholdPosition(-1, 0.4)).toBe(0);
    expect(thresholdPosition(2, 0.4)).toBe(1);
    expect(() => thresholdPosition(0.5, Number.NaN)).toThrow(RangeError);
  });
});
