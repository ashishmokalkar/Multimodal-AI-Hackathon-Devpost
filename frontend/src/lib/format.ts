export function formatProbability(probability: number | null): string {
  return probability === null
    ? "Unavailable"
    : `${(probability * 100).toFixed(1)}%`;
}
