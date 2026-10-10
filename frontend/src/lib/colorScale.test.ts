import { describe, expect, it } from "vitest";
import { colorScale } from "./colorScale";

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

describe("colorScale", () => {
  it("maps the probability endpoints and midpoint to the specified colors", () => {
    expect(colorScale(0)).toBe("#3a7bbf");
    expect(colorScale(0.5)).toBe("#c98400");
    expect(colorScale(1)).toBe("#b0127a");
  });

  it("interpolates continuously, so neighbouring probabilities get neighbouring colours", () => {
    for (let index = 1; index <= 100; index += 1) {
      const [r0, g0, b0] = rgb(colorScale((index - 1) / 100));
      const [r1, g1, b1] = rgb(colorScale(index / 100));
      expect(Math.max(Math.abs(r1 - r0), Math.abs(g1 - g0), Math.abs(b1 - b0))).toBeLessThanOrEqual(8);
    }
  });

  it("clamps values outside the probability interval", () => {
    expect(colorScale(-1)).toBe("#3a7bbf");
    expect(colorScale(2)).toBe("#b0127a");
  });
});
