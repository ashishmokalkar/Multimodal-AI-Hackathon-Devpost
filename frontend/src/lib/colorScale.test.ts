import { describe, expect, it } from "vitest";
import {
  ARTERY_COLORS,
  CAD_IDENTITY_COLOR,
  inkOn,
  RISK_STOPS,
  riskColor,
  riskColorAt,
  riskHeat,
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

describe("artery risk colour", () => {
  it("is cool blue well below, amber at, and hot red-magenta well above each artery's own threshold", () => {
    expect(riskColor(0, 0.32)).toBe(RISK_STOPS[0].color);
    expect(riskColor(0.32, 0.32)).toBe("#f5a524");
    expect(riskColor(0.55, 0.55)).toBe("#f5a524");
    expect(riskColor(1, 0.32)).toBe(RISK_STOPS[RISK_STOPS.length - 1].color);
  });

  it("changes continuously and stays a valid colour for any input", () => {
    const samples = Array.from({ length: 101 }, (_, i) => riskColorAt(i / 100));
    samples.forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/));
    expect(new Set(samples).size).toBeGreaterThan(60);
    expect(riskColorAt(Number.NaN)).toBe(RISK_STOPS[0].color);
  });

  it("heats up monotonically from matte to glowing", () => {
    expect(riskHeat(0)).toBe(0);
    expect(riskHeat(0.25)).toBe(0);
    expect(riskHeat(1)).toBe(1);
    expect(riskHeat(0.5)).toBeGreaterThan(0.2);
    expect(riskHeat(0.5)).toBeLessThan(0.45);
    expect(riskHeat(0.8)).toBeGreaterThan(riskHeat(0.6));
  });

  it("picks text that reads at 4.5:1 or better on every colour of the scale", () => {
    const luminance = (hex: string) => {
      const value = Number.parseInt(hex.slice(1), 16);
      const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (let i = 0; i <= 20; i += 1) {
      const background = riskColorAt(i / 20);
      const [hi, lo] = [luminance(background), luminance(inkOn(background))].sort((x, y) => y - x);
      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
    expect(inkOn("#1e3a8a")).toBe("#ffffff");
  });
});
