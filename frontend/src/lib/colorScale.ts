export type TargetId = "cad" | "LAD" | "LCX" | "RCA";

/**
 * One fixed, distinct colour per artery, used on the heart, the legend, the artery cards and the charts so each
 * artery is recognisable everywhere. Validated for colour-vision-deficiency separation and bright enough to read
 * against the dark heart; always shown next to the artery's name (the dot on each 3D tag keeps it). On the heart
 * itself the artery is coloured by risk instead (riskColor below).
 */
export const ARTERY_COLORS: Record<Exclude<TargetId, "cad">, string> = {
  LAD: "#3b82f6",
  LCX: "#f59e0b",
  RCA: "#14b8a6",
};

/** Overall CAD is not an artery, so it uses the neutral brand colour. */
export const CAD_IDENTITY_COLOR = "#236b56";

/** Neutral track for legends: position, not colour, shows how far a chance is from its threshold. */
export const NEUTRAL_TRACK_GRADIENT =
  "linear-gradient(90deg, #e2e8f0 0%, #94a3b8 100%)";

/** Colour that identifies a target. */
export function targetColor(target: TargetId): string {
  return target === "cad" ? CAD_IDENTITY_COLOR : ARTERY_COLORS[target];
}

/**
 * Position on a legend track (0-1) relative to a target's own decision threshold: 0..threshold maps to 0..0.5 and
 * threshold..1 maps to 0.5..1, so the middle of the track is always "at this target's threshold".
 */
export function thresholdPosition(
  probability: number,
  threshold = 0.5,
): number {
  if (!Number.isFinite(probability) || !Number.isFinite(threshold)) {
    throw new RangeError("Probability and threshold must be finite numbers.");
  }
  const p = Math.min(1, Math.max(0, probability));
  const t = Math.min(0.999, Math.max(0.001, threshold));
  return p < t ? (p / t) * 0.5 : 0.5 + ((p - t) / (1 - t)) * 0.5;
}

// ------------------------------------------------------------------------------------------- artery risk scale
/**
 * Colour of an artery on the 3D heart by its chance of narrowing, as a position on the threshold-centred track
 * (thresholdPosition): cool blue well below the artery's own threshold, amber at it, hot red-magenta well above.
 * Checked for colour-vision deficiency (worst neighbouring stops ΔE 15 for deuteranopia); risk is also carried by
 * thickness, glow and the percentage on each tag, never by colour alone.
 */
export const RISK_STOPS: readonly { at: number; color: string }[] = [
  { at: 0, color: "#3b7dd8" },
  // still clearly blue at half the threshold, so low-risk arteries never look grey
  { at: 0.25, color: "#4b8be0" },
  { at: 0.5, color: "#f5a524" },
  { at: 1, color: "#ff2d6a" },
];

type Lab = [number, number, number];

function hexToLinear(hex: string): Lab {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Lab;
}

function linearToOklab([r, g, b]: Lab): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToHex([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${linear
    .map((c) => {
      const v = Math.min(1, Math.max(0, c));
      const srgb = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

const RISK_LAB = RISK_STOPS.map((stop) => ({ at: stop.at, lab: linearToOklab(hexToLinear(stop.color)) }));

/** Risk colour at a track position (0 low, 0.5 at the threshold, 1 high), blended in OKLab so it never turns muddy. */
export function riskColorAt(position: number): string {
  const t = Math.min(1, Math.max(0, Number.isFinite(position) ? position : 0));
  const upper = RISK_LAB.findIndex((stop) => stop.at >= t);
  if (upper <= 0) {
    return RISK_STOPS[0].color;
  }
  const lo = RISK_LAB[upper - 1];
  const hi = RISK_LAB[upper];
  const k = (t - lo.at) / (hi.at - lo.at);
  return oklabToHex(lo.lab.map((value, i) => value + (hi.lab[i] - value) * k) as Lab);
}

/** Risk colour of an artery from its probability and its own decision threshold. */
export function riskColor(probability: number, threshold: number): string {
  return riskColorAt(thresholdPosition(probability, threshold));
}

/**
 * How "hot" an artery looks, 0-1, from its track position: 0 up to well below the threshold (thin, matte), rising
 * smoothly through the threshold (about 0.35 there) to 1 well above it. Thickness, glow and pulse scale with it, so
 * the look changes continuously with the probability rather than switching at the threshold.
 */
export function riskHeat(position: number): number {
  const t = Math.min(1, Math.max(0, ((Number.isFinite(position) ? position : 0) - 0.3) / 0.5));
  return t * t * (3 - 2 * t);
}

/** The risk scale as a CSS gradient (for the legend under the heart), sampled from the same colours. */
export const RISK_GRADIENT_CSS = `linear-gradient(90deg, ${Array.from({ length: 11 }, (_, i) => `${riskColorAt(i / 10)} ${i * 10}%`).join(", ")})`;

/**
 * Readable text colour on a given background: near-black on every colour of the risk scale (at least 4.5:1, from
 * the darkest blue up), white only on genuinely dark colours.
 */
export function inkOn(background: string): string {
  const [r, g, b] = hexToLinear(background);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.12 ? "#0b1020" : "#ffffff";
}
