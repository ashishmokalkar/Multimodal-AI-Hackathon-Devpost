import type {
  Explanation,
  FeatureDefinition,
  FeatureValue,
  ReferenceRange,
  Target,
  TargetExplanations,
} from "../api/types";
import { displayNumber, displayRange, displayUnit } from "./units";

/** Colour-blind-safe pair used for every attribution: magenta raises the estimate, blue lowers it. */
export const RAISE_COLOR = "#c2255c";
export const LOWER_COLOR = "#1971c2";
export const NEUTRAL_COLOR = "#868e96";

export type InsightTarget = keyof TargetExplanations;
export const INSIGHT_TARGETS: readonly InsightTarget[] = ["cad", "LAD", "LCX", "RCA"];
export const TARGET_SHORT: Record<InsightTarget, string> = {
  cad: "CAD",
  LAD: "LAD",
  LCX: "LCX",
  RCA: "RCA",
};
const TARGET_OUTCOME: Record<InsightTarget, string> = {
  cad: "significant coronary artery disease (at least 50% narrowing)",
  LAD: "at least 50% narrowing of the left anterior descending artery (LAD)",
  LCX: "at least 50% narrowing of the left circumflex artery (LCX)",
  RCA: "at least 50% narrowing of the right coronary artery (RCA)",
};

/** Contributions are probability units; the UI speaks in percentage points. */
export function toPoints(contribution: number): number {
  return contribution * 100;
}

export function formatPoints(points: number, digits = 1): string {
  const rounded = Number(points.toFixed(digits));
  if (rounded === 0) {
    return `0 pts`;
  }
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)} pts`;
}

export function attributionColor(points: number, minimum = 0.05): string {
  if (points >= minimum) {
    return RAISE_COLOR;
  }
  if (points <= -minimum) {
    return LOWER_COLOR;
  }
  return NEUTRAL_COLOR;
}

export function prettyUnit(unit?: string): string {
  if (!unit) {
    return "";
  }
  return unit.replace("x10^3/uL", "×10³/µL").replace("uL", "µL");
}

export function formatFeatureValue(
  value: FeatureValue | null | undefined,
  definition?: FeatureDefinition,
): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    const unit = prettyUnit(displayUnit(definition));
    const text = displayNumber(value, definition);
    if (!unit || definition?.type !== "number") {
      return text;
    }
    return unit === "%" ? `${text}%` : `${text} ${unit}`;
  }
  return value;
}

function definitionsByName(features: readonly FeatureDefinition[]) {
  return new Map(features.map((feature) => [feature.name, feature]));
}

function sortedContributions(explanation: Explanation) {
  return explanation.contributions
    .map((item, order) => ({ item, order }))
    .sort(
      (left, right) =>
        Math.abs(right.item.contribution) - Math.abs(left.item.contribution) ||
        left.order - right.order,
    )
    .map(({ item }) => item);
}

// ------------------------------------------------------------------------------------------- waterfall
export interface WaterfallStep {
  feature: string;
  label: string;
  valueText: string;
  points: number;
  /** Bar start and end on the 0-100 probability axis. */
  start: number;
  end: number;
}

export interface Waterfall {
  basePercent: number;
  finalPercent: number;
  thresholdPercent: number;
  steps: WaterfallStep[];
  other: { count: number; points: number; start: number; end: number } | null;
}

/**
 * Additive walk from the reference patient's probability to this patient's probability: the largest
 * contributions one by one, then the remainder as a single "other factors" step.
 */
export function buildWaterfall(
  explanation: Explanation,
  target: Target,
  features: readonly FeatureDefinition[],
  limit = 7,
): Waterfall {
  const definitions = definitionsByName(features);
  const ordered = sortedContributions(explanation);
  const shown = ordered.slice(0, Math.max(0, limit));
  const rest = ordered.slice(shown.length);
  let cursor = explanation.base_value * 100;
  const steps = shown.map((item) => {
    const points = toPoints(item.contribution);
    const definition = definitions.get(item.feature);
    const step = {
      feature: item.feature,
      label: definition?.label ?? item.feature,
      valueText: formatFeatureValue(item.value, definition),
      points,
      start: cursor,
      end: cursor + points,
    };
    cursor += points;
    return step;
  });
  let other: Waterfall["other"] = null;
  if (rest.length > 0) {
    const points = rest.reduce((sum, item) => sum + toPoints(item.contribution), 0);
    other = { count: rest.length, points, start: cursor, end: cursor + points };
  }
  return {
    basePercent: explanation.base_value * 100,
    finalPercent: target.probability * 100,
    thresholdPercent: target.threshold * 100,
    steps,
    other,
  };
}

// ------------------------------------------------------------------------------------------- factor x artery
export interface HeatmapRow {
  feature: string;
  label: string;
  valueText: string;
  cells: Record<InsightTarget, number>;
  strongest: number;
}

/** The factors that matter most for any target, with their contribution (points) to every target. */
export function buildHeatmap(
  explanations: TargetExplanations,
  features: readonly FeatureDefinition[],
  limit = 10,
): HeatmapRow[] {
  const definitions = definitionsByName(features);
  const rows = new Map<string, HeatmapRow>();
  for (const target of INSIGHT_TARGETS) {
    for (const item of explanations[target].contributions) {
      const definition = definitions.get(item.feature);
      const row = rows.get(item.feature) ?? {
        feature: item.feature,
        label: definition?.label ?? item.feature,
        valueText: formatFeatureValue(item.value, definition),
        cells: { cad: 0, LAD: 0, LCX: 0, RCA: 0 },
        strongest: 0,
      };
      row.cells[target] = toPoints(item.contribution);
      row.strongest = Math.max(row.strongest, Math.abs(row.cells[target]));
      rows.set(item.feature, row);
    }
  }
  return Array.from(rows.values())
    .sort((left, right) => right.strongest - left.strongest)
    .slice(0, Math.max(0, limit));
}

// ------------------------------------------------------------------------------------------- factor -> artery flow
export type ArteryId = Exclude<InsightTarget, "cad">;
export const FLOW_ARTERIES: readonly ArteryId[] = ["LAD", "LCX", "RCA"];

export interface FlowFactor {
  feature: string;
  label: string;
  valueText: string;
  /** Signed contribution in points to each artery. */
  links: Record<ArteryId, number>;
  /** Total movement across the three arteries (sum of absolute points), used for ranking. */
  total: number;
}

export interface ArteryFlow {
  factors: FlowFactor[];
  /** Everything outside the top factors, combined (net points per artery); null when nothing is left over. */
  other: { count: number; links: Record<ArteryId, number> } | null;
  /** Share of all movement across the arteries that the top factors explain (0-1). */
  coverage: number;
}

/**
 * Top factors by total movement across LAD, LCX and RCA, with their signed effect on each artery. The rest are
 * combined so the diagram stays readable while every point is still accounted for.
 */
export function buildArteryFlow(
  explanations: TargetExplanations,
  features: readonly FeatureDefinition[],
  top = 5,
): ArteryFlow {
  const definitions = definitionsByName(features);
  const rows = new Map<string, FlowFactor>();
  for (const artery of FLOW_ARTERIES) {
    for (const item of explanations[artery].contributions) {
      const definition = definitions.get(item.feature);
      const row = rows.get(item.feature) ?? {
        feature: item.feature,
        label: definition?.label ?? item.feature,
        valueText: formatFeatureValue(item.value, definition),
        links: { LAD: 0, LCX: 0, RCA: 0 },
        total: 0,
      };
      row.links[artery] = toPoints(item.contribution);
      row.total += Math.abs(row.links[artery]);
      rows.set(item.feature, row);
    }
  }
  const ranked = Array.from(rows.values())
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total);
  const factors = ranked.slice(0, Math.max(0, top));
  const rest = ranked.slice(factors.length);
  const all = ranked.reduce((sum, row) => sum + row.total, 0);
  const shown = factors.reduce((sum, row) => sum + row.total, 0);
  const other =
    rest.length === 0
      ? null
      : {
          count: rest.length,
          links: Object.fromEntries(
            FLOW_ARTERIES.map((artery) => [artery, rest.reduce((sum, row) => sum + row.links[artery], 0)]),
          ) as Record<ArteryId, number>,
        };
  return { factors, other, coverage: all === 0 ? 0 : shown / all };
}

/** Contribution (points) of one input to each target; 0 where the input equals the reference value. */
export function factorImpact(
  explanations: TargetExplanations,
  feature: string,
): Record<InsightTarget, number> {
  const impact = { cad: 0, LAD: 0, LCX: 0, RCA: 0 } as Record<InsightTarget, number>;
  for (const target of INSIGHT_TARGETS) {
    const item = explanations[target].contributions.find(
      (contribution) => contribution.feature === feature,
    );
    impact[target] = item ? toPoints(item.contribution) : 0;
  }
  return impact;
}

// ------------------------------------------------------------------------------------------- measurements
export type RangeStatus = "low" | "high" | "normal";

export function rangeStatus(
  value: FeatureValue | null | undefined,
  range?: ReferenceRange,
): RangeStatus | null {
  if (typeof value !== "number" || !range) {
    return null;
  }
  if (range.low !== undefined && value < range.low) {
    return "low";
  }
  if (range.high !== undefined && value > range.high) {
    return "high";
  }
  return "normal";
}

/** A reference range as text, in the shown unit of the feature it belongs to. */
export function formatRange(
  apiRange: ReferenceRange,
  definition?: FeatureDefinition,
): string {
  const range = displayRange(apiRange, definition);
  const suffix = prettyUnit(displayUnit(definition));
  const join = (text: string) => (suffix ? `${text} ${suffix}` : text);
  if (range.low !== undefined && range.high !== undefined) {
    return join(`${range.low}–${range.high}`);
  }
  if (range.high !== undefined) {
    return join(`< ${range.high}`);
  }
  return join(`≥ ${range.low}`);
}

export interface RangeBar {
  /** All positions are 0-100 percentages of the drawn track. */
  bandStart: number;
  bandEnd: number;
  marker: number;
}

export function rangeBar(value: number, range: ReferenceRange): RangeBar {
  const low = range.low ?? 0;
  const high = range.high ?? (range.low ?? value) * 1.6;
  const lo = Math.min(low, value);
  const hi = Math.max(high, value);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.15;
  const min = Math.max(0, lo - pad);
  const max = hi + pad;
  const at = (x: number) => ((x - min) / (max - min)) * 100;
  return { bandStart: at(low), bandEnd: at(high), marker: at(value) };
}

export interface MeasurementCard {
  feature: string;
  label: string;
  description?: string;
  value: FeatureValue | null;
  valueText: string;
  /** Points for the selected target; 0 when the value equals the reference patient's. */
  points: number;
  sameAsReference: boolean;
  status: RangeStatus | null;
  rangeText: string | null;
  bar: RangeBar | null;
  attention: boolean;
}

export interface MeasurementGroup {
  group: string;
  cards: MeasurementCard[];
}

export const ATTENTION_POINTS = 2;

export function buildMeasurementGroups(
  features: readonly FeatureDefinition[],
  inputs: Readonly<Record<string, FeatureValue>> | null,
  explanation: Explanation,
): MeasurementGroup[] {
  const contributions = new Map(
    explanation.contributions.map((item) => [item.feature, item]),
  );
  const groups = new Map<string, MeasurementCard[]>();
  for (const feature of features) {
    const item = contributions.get(feature.name);
    const value =
      item?.value ??
      (inputs && Object.prototype.hasOwnProperty.call(inputs, feature.name)
        ? inputs[feature.name]
        : null);
    const points = item ? toPoints(item.contribution) : 0;
    const status = rangeStatus(value, feature.reference_range);
    const card: MeasurementCard = {
      feature: feature.name,
      label: feature.label,
      ...(feature.description ? { description: feature.description } : {}),
      value,
      valueText: formatFeatureValue(value, feature),
      points,
      sameAsReference: !item,
      status,
      rangeText: feature.reference_range
        ? formatRange(feature.reference_range, feature)
        : null,
      bar:
        typeof value === "number" && feature.reference_range
          ? rangeBar(value, feature.reference_range)
          : null,
      attention:
        status === "low" || status === "high" || Math.abs(points) >= ATTENTION_POINTS,
    };
    const cards = groups.get(feature.group) ?? [];
    cards.push(card);
    groups.set(feature.group, cards);
  }
  return Array.from(groups, ([group, cards]) => ({
    group,
    cards: [...cards].sort(
      (left, right) => Math.abs(right.points) - Math.abs(left.points),
    ),
  }));
}

// ------------------------------------------------------------------------------------------- plain language
export interface PlainStory {
  headline: string;
  baseline: string;
  raising: string[];
  lowering: string[];
  notes: string[];
}

function phrase(label: string, value: FeatureValue, definition?: FeatureDefinition): string {
  if (typeof value === "boolean") {
    return value ? label : `no ${label.toLowerCase()}`;
  }
  if (definition?.type === "categorical") {
    return `${label.toLowerCase()}: ${String(value).toLowerCase()}`;
  }
  return `${label} ${formatFeatureValue(value, definition)}`;
}

export function plainStory(
  targetKey: InsightTarget,
  target: Target,
  explanation: Explanation,
  features: readonly FeatureDefinition[],
): PlainStory {
  const definitions = definitionsByName(features);
  const percent = Math.round(target.probability * 100);
  const threshold = Math.round(target.threshold * 100);
  const ordered = sortedContributions(explanation);
  const describe = (item: (typeof ordered)[number]) => {
    const definition = definitions.get(item.feature);
    const text = phrase(definition?.label ?? item.feature, item.value, definition);
    return `${text.charAt(0).toUpperCase()}${text.slice(1)} (${formatPoints(toPoints(item.contribution), 0)})`;
  };
  const notes: string[] = [];
  if (target.uncertain) {
    notes.push(
      "The model is not confident here: its 90% prediction set contains both answers.",
    );
  }
  if (target.capped) {
    notes.push(
      "This artery's estimate was capped at the overall CAD estimate, because one artery cannot be more likely than any disease at all.",
    );
  }
  return {
    headline: `${percent}% estimated chance of ${TARGET_OUTCOME[targetKey]}, ${
      target.probability >= target.threshold ? "above" : "below"
    } the ${threshold}% decision threshold.`,
    baseline: `A typical patient (median measurements, no risk factors or findings) scores ${Math.round(
      explanation.base_value * 100,
    )}%. This patient's inputs move it to ${percent}%:`,
    raising: ordered
      .filter((item) => toPoints(item.contribution) >= 1)
      .slice(0, 3)
      .map(describe),
    lowering: ordered
      .filter((item) => toPoints(item.contribution) <= -1)
      .slice(0, 2)
      .map(describe),
    notes,
  };
}
