import type {
  FeatureDefinition,
  PredictionResponse,
  Target,
} from "../../api/types";
import { ARTERY_INFO, buildDrivers, MIN_DRIVER_POINTS, type Driver } from "../../lib/summary";
import {
  factorImpact,
  formatFeatureValue,
  type InsightTarget,
  type MeasurementCard,
  type RangeBar,
  type RangeStatus,
} from "../../lib/insights";
import type { VesselId } from "../viewer/vesselMap";
import { isFlagged } from "../../lib/flags";

// ------------------------------------------------------------------------------------------- risk words
export type RiskBand = "low" | "moderate" | "high";

/**
 * Plain risk word relative to the target's own decision threshold: at or above it is "high" (the model flags it),
 * within 40% below it is "moderate", anything lower is "low".
 */
export function riskBand(
  probability: number,
  threshold: number,
  flagged = probability >= threshold,
): RiskBand {
  if (flagged) {
    return "high";
  }
  return probability >= threshold * 0.6 ? "moderate" : "low";
}

export const RISK_WORD: Record<RiskBand, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export function targetOf(
  prediction: PredictionResponse,
  target: InsightTarget,
): Target {
  return target === "cad" ? prediction.cad : prediction.vessels[target];
}

export function percent(probability: number): number {
  return Math.round(probability * 100);
}

// ------------------------------------------------------------------------------------------- why window
export interface TargetHeadline {
  name: string;
  percent: number;
  /** Arteries only: the overall line shows just the chance. */
  band: RiskBand | null;
  region: string | null;
  /** The whole line as text, for screen readers and tests. */
  text: string;
}

/** Where an artery's blood goes, as a short phrase: "Front of the heart". */
export function arteryRegion(artery: VesselId): string {
  const region = ARTERY_INFO[artery].region.replace(/^Supplies the /, "");
  return region.charAt(0).toUpperCase() + region.slice(1);
}

/**
 * The line under the target chips naming what the Why window explains: "LAD · 88% ▲ High · Front of the heart",
 * or "Overall heart disease · 61%".
 */
export function targetHeadline(
  prediction: PredictionResponse,
  target: InsightTarget,
): TargetHeadline {
  const value = targetOf(prediction, target);
  const chance = percent(value.probability);
  if (target === "cad") {
    return {
      name: "Overall heart disease",
      percent: chance,
      band: null,
      region: null,
      text: `Overall heart disease · ${chance}%`,
    };
  }
  const band = riskBand(value.probability, value.threshold, isFlagged(value));
  const region = arteryRegion(target);
  return {
    name: target,
    percent: chance,
    band,
    region,
    text: `${target} · ${chance}% ${band === "high" ? "▲ " : ""}${RISK_WORD[band]} · ${region}`,
  };
}

export interface FactorBreakdown {
  label: string;
  /** Null when the input matches the typical patient for every target (it then moves nothing). */
  valueText: string | null;
  items: { target: InsightTarget; points: number; moves: boolean }[];
}

/**
 * What one input does to each target, in points from a typical patient: the text version of the factor highlight
 * on the heart. "moves" is false below one point, where the heart hides that artery.
 */
export function factorBreakdown(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
  feature: string,
): FactorBreakdown {
  const definition = features.find((item) => item.name === feature);
  const impact = factorImpact(prediction.explanations, feature);
  const targets: InsightTarget[] = ["cad", "LAD", "LCX", "RCA"];
  const measured = targets
    .map((target) =>
      prediction.explanations[target].contributions.find((item) => item.feature === feature),
    )
    .find((item) => item !== undefined);
  return {
    label: definition?.label ?? feature,
    valueText: measured ? formatFeatureValue(measured.value, definition) : null,
    items: targets.map((target) => ({
      target,
      points: impact[target],
      moves: Math.abs(impact[target]) >= MIN_DRIVER_POINTS,
    })),
  };
}

/** A reason in the Why window: how much it moves the estimate, with the measured value against its typical range. */
export interface WhyRow extends Driver {
  status: RangeStatus | null;
  rangeText: string | null;
  bar: RangeBar | null;
}

/** Joins the biggest drivers with their measurement (High/Low and the range bar), keeping the drivers' order. */
export function whyRows(
  drivers: readonly Driver[],
  cards: readonly MeasurementCard[],
): WhyRow[] {
  const byFeature = new Map(cards.map((card) => [card.feature, card]));
  return drivers.map((driver) => {
    const card = byFeature.get(driver.feature);
    return {
      ...driver,
      status: card?.status ?? null,
      rangeText: card?.rangeText ?? null,
      bar: card?.bar ?? null,
    };
  });
}

// ------------------------------------------------------------------------------------------- windows
export const WINDOW_IDS = [
  "patient",
  "risk",
  "drivers",
  "whatif",
  "factors",
  "people",
  "compare",
  "measures",
  "model",
] as const;
export type WindowId = (typeof WINDOW_IDS)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TOP_BAR_HEIGHT = 56;
const GAP = 14;

export const MIN_WINDOW_SIZE: Record<WindowId, { w: number; h: number }> = {
  patient: { w: 250, h: 220 },
  risk: { w: 280, h: 200 },
  drivers: { w: 280, h: 200 },
  whatif: { w: 360, h: 150 },
  factors: { w: 300, h: 220 },
  people: { w: 240, h: 240 },
  compare: { w: 300, h: 300 },
  measures: { w: 300, h: 220 },
  model: { w: 300, h: 200 },
};

/** Windows open on first visit; the rest wait in the dock. */
export const DEFAULT_OPEN: Record<WindowId, boolean> = {
  patient: true,
  risk: true,
  drivers: true,
  whatif: false,
  factors: false,
  people: false,
  compare: false,
  measures: false,
  model: false,
};

/**
 * The windows every session starts with, laid out from the viewport rather than restored from a saved layout, so
 * they fit whatever screen the app opens on and re-flow when the window is resized (until the user moves them).
 */
export const ANCHORED_WINDOWS: readonly WindowId[] = ["patient", "risk", "drivers"];

/** Height kept free at the bottom left for the dock. */
const DOCK_SPACE = 80;
/** Height kept free at the bottom right for the "decision support only" watermark. */
const WATERMARK_SPACE = 48;

function clamp(value: number, low: number, high: number): number {
  return Math.round(Math.min(high, Math.max(low, value)));
}

/**
 * Starting layout for a viewport: inputs on the left, results on the right, the heart in the middle. Column widths
 * grow with the screen width; the right column (Risk above Why) fills the height, and the patient window is centred
 * between the top bar and the dock.
 */
export function defaultLayout(
  viewportWidth: number,
  viewportHeight: number,
): Record<WindowId, Rect> {
  const vw = Math.max(viewportWidth, 900);
  const vh = Math.max(viewportHeight, 560);
  const top = TOP_BAR_HEIGHT + GAP;
  const sideW = clamp(vw * 0.23, 290, 460);
  const patientW = clamp(vw * 0.21, 270, 400);
  const rightX = vw - GAP - sideW;
  const column = vh - top - WATERMARK_SPACE;
  const riskH = clamp(column * 0.5, 260, 360);
  const driversY = top + riskH + 12;
  const driversH = clamp(column - riskH - 12, MIN_WINDOW_SIZE.drivers.h, 520);
  const whatIfW = Math.min(680, vw - 2 * (sideW + GAP) - 40);
  const whatIfH = 196;
  const centreX = patientW + GAP + 20;
  const dockTop = vh - DOCK_SPACE;
  const patientH = clamp(dockTop - top - GAP, MIN_WINDOW_SIZE.patient.h, 440);
  const patientY = Math.max(top, Math.round(top + (dockTop - top - patientH) / 2));
  return {
    // patient on the left, centred in the height between the top bar and the dock
    patient: { x: GAP, y: patientY, w: patientW, h: patientH },
    risk: { x: rightX, y: top, w: sideW, h: riskH },
    drivers: { x: rightX, y: driversY, w: sideW, h: driversH },
    whatif: {
      x: Math.round((vw - whatIfW) / 2),
      y: vh - GAP - whatIfH,
      w: whatIfW,
      h: whatIfH,
    },
    factors: { x: centreX, y: top + 50, w: 400, h: 360 },
    people: { x: rightX - 12 - 300, y: top + 40, w: 300, h: 470 },
    compare: { x: rightX - 12 - 380, y: top + 20, w: 380, h: 560 },
    measures: { x: centreX, y: top + 30, w: 540, h: 440 },
    model: { x: Math.round(vw / 2 - 200), y: top + 70, w: 400, h: 330 },
  };
}

/** Keeps a window on screen: its title bar always stays reachable, and it is never smaller than its minimum. */
export function clampRect(
  rect: Rect,
  viewportWidth: number,
  viewportHeight: number,
  min: { w: number; h: number },
): Rect {
  const w = Math.max(
    min.w,
    Math.min(rect.w, Math.max(min.w, viewportWidth - 16)),
  );
  const h = Math.max(
    min.h,
    Math.min(rect.h, Math.max(min.h, viewportHeight - TOP_BAR_HEIGHT - 8)),
  );
  const x = Math.min(Math.max(rect.x, 8 - w + 120), viewportWidth - 120);
  const y = Math.min(Math.max(rect.y, TOP_BAR_HEIGHT), viewportHeight - 44);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

// ------------------------------------------------------------------------------------------- guided tour
export interface TourStep {
  target: InsightTarget;
  vessel: VesselId | null;
  title: string;
  subtitle: string;
  probability: number;
  threshold: number;
  band: RiskBand;
  uncertain: boolean;
  raising: Driver[];
  lowering: Driver[];
}

const TOUR_TEXT: Record<InsightTarget, { title: string; subtitle: string }> = {
  cad: { title: "Overall", subtitle: "Any major coronary artery narrowed" },
  LAD: { title: "LAD", subtitle: "Front of the heart" },
  LCX: { title: "LCX", subtitle: "Side and back of the heart" },
  RCA: { title: "RCA", subtitle: "Right side and bottom of the heart" },
};

/** Overview first, then each artery: the stops of the guided tour, with the main reasons at each stop. */
export function buildTour(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
): TourStep[] {
  const targets: InsightTarget[] = ["cad", "LAD", "LCX", "RCA"];
  return targets.map((target) => {
    const value = targetOf(prediction, target);
    const drivers = buildDrivers(
      prediction.explanations[target],
      features,
      value.probability,
    ).drivers;
    return {
      target,
      vessel: target === "cad" ? null : target,
      ...TOUR_TEXT[target],
      probability: value.probability,
      threshold: value.threshold,
      band: riskBand(value.probability, value.threshold, isFlagged(value)),
      uncertain: value.uncertain === true,
      raising: drivers.filter((driver) => driver.points > 0).slice(0, 3),
      lowering: drivers.filter((driver) => driver.points < 0).slice(0, 2),
    };
  });
}

// ------------------------------------------------------------------------------------------- heartbeat
/**
 * Heart wall movement for one beat (0-1 phase): a sharp contraction followed by a smaller second pulse, so the
 * model reads as "lub-dub" rather than a sine wave.
 */
export function beatPulse(phase: number): number {
  const p = phase - Math.floor(phase);
  const lub = Math.exp(-(((p - 0.08) / 0.055) ** 2));
  const dub = 0.55 * Math.exp(-(((p - 0.3) / 0.06) ** 2));
  return lub + dub;
}

/** Resting pulse from the patient inputs, kept in a plausible range; 70 when it is missing. */
export function pulseRate(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(160, Math.max(40, value))
    : 70;
}
