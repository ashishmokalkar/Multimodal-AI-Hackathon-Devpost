export function formatProbability(probability: number | null): string {
  return probability === null
    ? "Unavailable"
    : `${(probability * 100).toFixed(1)}%`;
}

export function formatTargetUncertainty(uncertain: boolean | undefined): string {
  if (uncertain === true) {
    return "Uncertain; the 90% prediction set includes both answers.";
  }
  if (uncertain === false) {
    return "Single-answer 90% prediction set.";
  }
  return "Uncertainty not returned by this API profile.";
}

export function formatTargetUncertaintyShort(
  uncertain: boolean | undefined,
): string {
  if (uncertain === true) {
    return "Uncertain";
  }
  if (uncertain === false) {
    return "One-answer set";
  }
  return "Not returned";
}
