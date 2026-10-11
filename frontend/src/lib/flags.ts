import type { Target } from "../api/types";

/**
 * Whether the API flags a target. The real API flags an artery only when overall CAD is flagged too, so an artery
 * can sit above its own threshold without being flagged; the label is the API's decision. Both API profiles label
 * targets "elevated" / "not elevated"; anything else falls back to comparing with the threshold.
 */
export function isFlagged(
  target: Pick<Target, "label" | "probability" | "threshold">,
): boolean {
  if (target.label === "elevated") {
    return true;
  }
  if (target.label === "not elevated") {
    return false;
  }
  return target.probability >= target.threshold;
}

/** Above its own threshold but not flagged, because overall CAD is below its threshold. */
export function isHeldBack(
  target: Pick<Target, "label" | "probability" | "threshold">,
): boolean {
  return !isFlagged(target) && target.probability >= target.threshold;
}
