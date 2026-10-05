import { describe, expect, it } from "vitest";
import { colorScale } from "./colorScale";

function hueFromHex(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const [red, green, blue] = channels;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;

  if (delta === 0) return 0;

  const hue =
    maximum === red
      ? ((green - blue) / delta) % 6
      : maximum === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;

  return hue * 60;
}

describe("colorScale", () => {
  it("maps the probability endpoints and midpoint to the specified colors", () => {
    expect(colorScale(0)).toBe("#2e7d32");
    expect(colorScale(0.5)).toBe("#f9a825");
    expect(colorScale(1)).toBe("#c62828");
  });

  it("interpolates with a monotone hue from green through amber to red", () => {
    const hues = Array.from({ length: 11 }, (_, index) =>
      hueFromHex(colorScale(index / 10)),
    );

    for (let index = 1; index < hues.length; index += 1) {
      expect(hues[index]).toBeLessThanOrEqual(hues[index - 1]);
    }
  });

  it("clamps values outside the probability interval", () => {
    expect(colorScale(-1)).toBe("#2e7d32");
    expect(colorScale(2)).toBe("#c62828");
  });
});
