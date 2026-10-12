import type {
  FeatureDefinition,
  FeatureValue,
  GroundTruth,
  PredictionResponse,
} from "../../api/types";
import { isFlagged } from "../../lib/flags";
import { formatFeatureValue, rangeStatus, type RangeStatus } from "../../lib/insights";
import type { InsightTarget } from "../../lib/insights";

/**
 * The Patient window states facts about the patient, in a clinician's reading order, and never what the model makes
 * of them (that is the Why window's job): what they came in with, what the tests found, their history, and the
 * measurements outside the normal range.
 */
export interface PatientSummary {
  /** Symptoms and examination findings that are present. */
  presenting: string[];
  /** ECG and echo findings that are present. */
  findings: string[];
  /** Conditions in the history that are present. */
  history: string[];
  /** How many history items were recorded, so "none" can say "none of N". */
  historyChecked: number;
  /** Measurements outside their normal range, most out of range first. */
  outOfRange: Measurement[];
  /** The usual vitals and labs when they are within range, shown quietly after the out-of-range ones. */
  normal: Measurement[];
}

export interface Measurement {
  feature: string;
  label: string;
  valueText: string;
  status: RangeStatus;
}

/** Short wording for present yes/no inputs, by feature. */
const PRESENT_TEXT: Record<string, string> = {
  // symptoms and examination
  Dyspnea: "Short of breath",
  "LowTH Ang": "Low-threshold angina",
  Edema: "Leg swelling",
  "Weak Peripheral Pulse": "Weak limb pulses",
  "Lung rales": "Lung crackles",
  "Systolic Murmur": "Systolic murmur",
  "Diastolic Murmur": "Diastolic murmur",
  // ECG
  "Q Wave": "Q waves",
  "ST Elevation": "ST elevation",
  "ST Depression": "ST depression",
  "T inversion": "T-wave inversion",
  LVH: "LVH",
  "Poor R Progression": "Poor R-wave progression",
  // history
  DM: "Diabetes",
  HTN: "High blood pressure",
  DLP: "High cholesterol",
  FH: "Family history",
  CRF: "Kidney failure",
  CVA: "Previous stroke",
  Airway: "Airway disease",
  "Thyroid Disease": "Thyroid disease",
  CHF: "Heart failure",
};

const HISTORY = ["DM", "HTN", "DLP", "Smoking", "FH", "CRF", "CVA", "CHF", "Airway", "Thyroid Disease"];

/** Shorter names for measurement labels that are long in the feature contract. */
const SHORT_LABEL: Record<string, string> = {
  BP: "BP (systolic)",
  PR: "Pulse",
  FBS: "Fasting sugar",
  CR: "Creatinine",
  TG: "Triglycerides",
  LDL: "LDL",
  HDL: "HDL",
  BUN: "BUN",
  HB: "Haemoglobin",
  K: "Potassium",
  Na: "Sodium",
  WBC: "White cells",
  Lymph: "Lymphocytes",
  Neut: "Neutrophils",
  PLT: "Platelets",
  "EF-TTE": "EF",
};

/** Shown even when normal, so the window always gives a basic picture. */
const ROUTINE = ["BP", "EF-TTE", "LDL", "FBS"];

function presentSymptoms(values: Readonly<Record<string, FeatureValue>>): string[] {
  const out: string[] = [];
  const pain = values["Chest Pain"];
  if (typeof pain === "string" && pain !== "None") {
    out.push(`${pain} chest pain`);
  }
  for (const name of [
    "Dyspnea",
    "LowTH Ang",
    "Edema",
    "Weak Peripheral Pulse",
    "Lung rales",
    "Systolic Murmur",
    "Diastolic Murmur",
  ]) {
    if (values[name] === true) {
      out.push(PRESENT_TEXT[name]);
    }
  }
  const functionClass = Number(values["Function Class"]);
  if (functionClass > 0) {
    out.push(`Functional class ${functionClass}`);
  }
  return out;
}

function presentFindings(values: Readonly<Record<string, FeatureValue>>): string[] {
  const out: string[] = [];
  for (const name of ["Q Wave", "ST Elevation", "ST Depression", "T inversion", "LVH", "Poor R Progression"]) {
    if (values[name] === true) {
      out.push(PRESENT_TEXT[name]);
    }
  }
  const bbb = values.BBB;
  if (typeof bbb === "string" && bbb !== "None") {
    out.push(bbb);
  }
  const rwma = Number(values["Region RWMA"]);
  if (rwma > 0) {
    out.push(`Wall-motion abnormality (${rwma} ${rwma === 1 ? "region" : "regions"})`);
  }
  const vhd = values.VHD;
  if (typeof vhd === "string" && vhd !== "None") {
    out.push(`${vhd} valve disease`);
  }
  return out;
}

function presentHistory(values: Readonly<Record<string, FeatureValue>>, known: Set<string>): string[] {
  const out: string[] = [];
  for (const name of HISTORY) {
    if (!known.has(name)) {
      continue;
    }
    if (name === "Smoking") {
      if (values.Smoking === "Current" || values.Smoking === "Former") {
        out.push(`${values.Smoking} smoker`);
      }
    } else if (values[name] === true) {
      out.push(PRESENT_TEXT[name]);
    }
  }
  return out;
}

/** How far outside its range a value is, relative to the range, so the worst comes first. */
function distance(value: number, feature: FeatureDefinition): number {
  const range = feature.reference_range;
  if (!range) {
    return 0;
  }
  if (range.high !== undefined && value > range.high) {
    return (value - range.high) / Math.max(1, Math.abs(range.high));
  }
  if (range.low !== undefined && value < range.low) {
    return (range.low - value) / Math.max(1, Math.abs(range.low));
  }
  return 0;
}

export function summarisePatient(
  values: Readonly<Record<string, FeatureValue>>,
  features: readonly FeatureDefinition[],
): PatientSummary {
  const known = new Set(features.map((feature) => feature.name));
  const measured = features
    .filter((feature) => feature.type === "number" && feature.reference_range)
    .flatMap((feature) => {
      const value = values[feature.name];
      const status = rangeStatus(value, feature.reference_range);
      return typeof value === "number" && status
        ? [
            {
              measurement: {
                feature: feature.name,
                label: SHORT_LABEL[feature.name] ?? feature.label,
                valueText: formatFeatureValue(value, feature),
                status,
              },
              distance: distance(value, feature),
            },
          ]
        : [];
    });
  const outOfRange = measured
    .filter((item) => item.measurement.status !== "normal")
    .sort((left, right) => right.distance - left.distance)
    .map((item) => item.measurement);
  const normal = ROUTINE.flatMap((name) => {
    const item = measured.find((entry) => entry.measurement.feature === name);
    return item && item.measurement.status === "normal" ? [item.measurement] : [];
  });
  return {
    presenting: presentSymptoms(values),
    findings: presentFindings(values),
    history: presentHistory(values, known),
    historyChecked: HISTORY.filter((name) => known.has(name)).length,
    outOfRange,
    normal,
  };
}

// ------------------------------------------------------------------------------------------- summary lines
/** What the patient came in with, as one sentence-case line: "Typical chest pain, short of breath". */
export function complaintLine(summary: PatientSummary): string {
  if (!summary.presenting.length) {
    return "No symptoms recorded";
  }
  return summary.presenting
    .map((item, index) => (index === 0 ? item : item.charAt(0).toLowerCase() + item.slice(1)))
    .join(", ");
}

/** The out-of-range measurements as one line, values without units: "LDL 144↑ · Triglycerides 210↑". */
export function abnormalLine(summary: PatientSummary): string {
  if (!summary.outOfRange.length) {
    return "None: all measured values in range";
  }
  return summary.outOfRange
    .map((item) => `${item.label} ${item.valueText.split(" ")[0]}${item.status === "high" ? "↑" : "↓"}`)
    .join(" · ");
}

// ------------------------------------------------------------------------------------------- angiogram
export interface AngiogramCheck {
  target: InsightTarget;
  /** What the angiogram showed. */
  narrowed: boolean;
  /** Whether the model flagged it. */
  flagged: boolean;
  matched: boolean;
}

/**
 * The real angiogram result next to the model's call for each target: how many it got right, and which it missed
 * or flagged without cause. Compares the prediction for the patient's own inputs (not a what-if).
 */
export function checkAngiogram(
  truth: GroundTruth,
  prediction: PredictionResponse,
): { items: AngiogramCheck[]; matched: number } {
  const targets: InsightTarget[] = ["cad", "LAD", "LCX", "RCA"];
  const items = targets.map((target) => {
    const narrowed = target === "cad" ? truth.cad : truth.vessels[target];
    const flagged = isFlagged(target === "cad" ? prediction.cad : prediction.vessels[target]);
    return { target, narrowed, flagged, matched: narrowed === flagged };
  });
  return { items, matched: items.filter((item) => item.matched).length };
}

/**
 * The angiogram on one line: which arteries were narrowed, and (when compared) how many targets the model got
 * right, naming every miss so the summary never hides one: "LAD, LCX, RCA narrowed" + "✔ 4/4" or "3/4 · RCA missed".
 */
export function angiogramLine(
  truth: GroundTruth,
  check: { items: AngiogramCheck[]; matched: number } | null,
): { text: string; score: string | null; allMatched: boolean } {
  const narrowed = (["LAD", "LCX", "RCA"] as const).filter((artery) => truth.vessels[artery]);
  const text = narrowed.length
    ? `${narrowed.join(", ")} narrowed`
    : truth.cad
      ? "Disease, no single artery narrowed"
      : "No artery narrowed";
  if (!check) {
    return { text, score: null, allMatched: false };
  }
  const misses = check.items
    .filter((item) => !item.matched)
    .map((item) => `${item.target === "cad" ? "CAD" : item.target} ${item.narrowed ? "missed" : "flagged"}`);
  const allMatched = check.matched === check.items.length;
  return {
    text,
    score: allMatched
      ? `✔ ${check.matched}/${check.items.length}`
      : `${check.matched}/${check.items.length} · ${misses.join(", ")}`,
    allMatched,
  };
}
