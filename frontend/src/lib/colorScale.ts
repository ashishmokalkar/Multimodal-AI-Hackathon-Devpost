export type TargetId = "cad" | "LAD" | "LCX" | "RCA";

/**
 * One fixed, distinct colour per artery, used on the heart, the legend, the artery cards and the charts so each
 * artery is recognisable everywhere. Validated for colour-vision-deficiency separation and bright enough to read
 * against the dark heart; always shown next to the artery's name. Risk is shown by numbers, threshold marks,
 * "Flagged" labels, and on the heart by tags, thickness and glow, not by hue.
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
