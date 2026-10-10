type RGB = readonly [red: number, green: number, blue: number];

// Colour-blind-safe risk ramp (blue -> amber -> magenta), checked for CVD separation and >= 3:1 contrast on the
// light canvas. Red-green is avoided because about 1 in 12 men cannot tell those apart.
const LOW: RGB = [0x3a, 0x7b, 0xbf];
const MID: RGB = [0xc9, 0x84, 0x00];
const HIGH: RGB = [0xb0, 0x12, 0x7a];

export const COLOR_SCALE_GRADIENT =
  "linear-gradient(90deg, #3a7bbf 0%, #c98400 50%, #b0127a 100%)";

function blend(start: RGB, end: RGB, amount: number): RGB {
  return [
    start[0] + (end[0] - start[0]) * amount,
    start[1] + (end[1] - start[1]) * amount,
    start[2] + (end[2] - start[2]) * amount,
  ];
}

export function colorScale(probability: number): string {
  if (!Number.isFinite(probability)) {
    throw new RangeError("Probability must be a finite number.");
  }

  const position = Math.min(1, Math.max(0, probability));
  const color =
    position <= 0.5
      ? blend(LOW, MID, position * 2)
      : blend(MID, HIGH, (position - 0.5) * 2);

  return `#${color
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}
