type RGB = readonly [red: number, green: number, blue: number];

const GREEN: RGB = [0x2e, 0x7d, 0x32];
const AMBER: RGB = [0xf9, 0xa8, 0x25];
const RED: RGB = [0xc6, 0x28, 0x28];

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
      ? blend(GREEN, AMBER, position * 2)
      : blend(AMBER, RED, (position - 0.5) * 2);

  return `#${color
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}
