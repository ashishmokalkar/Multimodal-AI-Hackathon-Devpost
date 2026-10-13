import type { FeatureDefinition, FeatureValue, PredictionResponse } from "../api/types";
import { isFlagged, isHeldBack } from "./flags";
import { formatFeatureValue, rangeStatus } from "./insights";
import { buildDrivers } from "./summary";
import { displayNumber } from "./units";

export const ARTERY_SPOKEN = {
  LAD: "left anterior descending artery",
  LCX: "left circumflex artery",
  RCA: "right coronary artery",
} as const;
export type Artery = keyof typeof ARTERY_SPOKEN;
const ARTERIES: readonly Artery[] = ["LAD", "LCX", "RCA"];

/** Readings worth saying aloud when they are outside the healthy range. */
const KEY_READINGS = ["BP", "FBS", "LDL", "HDL", "TG", "CR", "HB", "EF-TTE"];

const COUNT_WORDS = ["", "one", "two", "three", "four"];

/** Units and symbols as words, so a speech engine does not spell them out ("mg slash d L"). */
const SPOKEN_UNITS: readonly [RegExp, string][] = [
  [/×10³\/µL/g, " thousand per microlitre"],
  [/mg\/dL/g, "milligrams per decilitre"],
  [/µmol\/L/g, "micromoles per litre"],
  [/mmol\/L/g, "millimoles per litre"],
  [/g\/dL/g, "grams per decilitre"],
  [/g\/L/g, "grams per litre"],
  [/mmHg/g, "millimetres of mercury"],
  [/beats\/min/g, "beats per minute"],
  [/mm\/h/g, "millimetres per hour"],
  [/(\d)%/g, "$1 percent"],
  [/(\d)–(\d)/g, "$1 to $2"],
  [/\bLVH\b/g, "L V H"],
  [/\bCAD\b/g, "coronary artery disease"],
  [/\bLAD\b/g, "L A D"],
  [/\bLCX\b/g, "L C X"],
  [/\bRCA\b/g, "R C A"],
];

export function speakable(text: string): string {
  return SPOKEN_UNITS.reduce((out, [pattern, words]) => out.replace(pattern, words), text);
}

/** Spoken names where the label reads badly aloud ("blood pressure (systolic)"). */
export const SPOKEN_NAMES: Record<string, string> = { BP: "systolic blood pressure" };

/** Lower-cases the first letter mid-sentence ("Diabetes" → "diabetes") but leaves "LDL", "ST" and "T-wave" alone. */
export function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** One input that moves the result, with what a sentence needs to name it. */
export interface SpokenFinding {
  feature: string;
  /** The input's label, as said aloud ("systolic blood pressure", "diabetes"). */
  name: string;
  value: FeatureValue | undefined;
  /** A number with its unit, as shown ("235 mg/dL", "55%"). */
  formatted: string;
}

/** A reading outside the healthy range: its spoken name and the number alone ("fasting blood sugar", "360"). */
export interface SpokenReading {
  name: string;
  number: string;
  percent: boolean;
}

/** Everything the spoken summary says, before it is worded in a language. */
export interface SummaryFacts {
  age: number | null;
  sex: "Female" | "Male" | null;
  /** Rounded percentages. */
  cad: number;
  threshold: number;
  flagged: boolean;
  uncertain: boolean;
  /** Flagged arteries, most likely first. */
  arteries: { artery: Artery; percent: number }[];
  /** When none is flagged: the most likely artery that is above its own threshold. */
  held: { artery: Artery; percent: number } | null;
  unsure: Artery[];
  raising: SpokenFinding[];
  lowering: SpokenFinding[];
  high: SpokenReading[];
  low: SpokenReading[];
  outsideTraining: boolean;
}

function percent(probability: number): number {
  return Math.round(probability * 100);
}

export function summaryFacts(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
  inputs: Readonly<Record<string, FeatureValue>>,
): SummaryFacts {
  const cad = prediction.cad;
  const definitions = new Map(features.map((feature) => [feature.name, feature]));
  // the inputs behind this result, with the explanation's values as a fallback
  const values: Record<string, FeatureValue> = {
    ...Object.fromEntries(prediction.explanations.cad.contributions.map((item) => [item.feature, item.value])),
    ...inputs,
  };

  const byChance = [...ARTERIES].sort(
    (left, right) => prediction.vessels[right].probability - prediction.vessels[left].probability,
  );
  const at = (artery: Artery) => ({ artery, percent: percent(prediction.vessels[artery].probability) });
  const held = byChance.find((artery) => isHeldBack(prediction.vessels[artery]));

  const { drivers } = buildDrivers(prediction.explanations.cad, features, cad.probability, 12);
  const finding = (feature: string, label: string): SpokenFinding => {
    const value = values[feature];
    return {
      feature,
      name: SPOKEN_NAMES[feature] ?? lowerFirst(label),
      value,
      formatted: formatFeatureValue(value, definitions.get(feature)),
    };
  };

  const high: SpokenReading[] = [];
  const low: SpokenReading[] = [];
  for (const name of KEY_READINGS) {
    const definition = definitions.get(name);
    const value = values[name];
    const status = rangeStatus(value, definition?.reference_range);
    if (typeof value === "number" && definition && (status === "high" || status === "low")) {
      (status === "high" ? high : low).push({
        name: SPOKEN_NAMES[name] ?? lowerFirst(definition.label),
        number: displayNumber(value, definition),
        percent: definition.unit === "%",
      });
    }
  }

  return {
    age: typeof values.Age === "number" ? values.Age : null,
    sex: values.Sex === "Female" || values.Sex === "Male" ? values.Sex : null,
    cad: percent(cad.probability),
    threshold: percent(cad.threshold),
    flagged: isFlagged(cad),
    uncertain: cad.uncertain === true,
    arteries: byChance.filter((artery) => isFlagged(prediction.vessels[artery])).map(at),
    held: held ? at(held) : null,
    unsure: ARTERIES.filter((artery) => prediction.vessels[artery].uncertain),
    raising: drivers.filter((driver) => driver.points > 0).slice(0, 4).map((d) => finding(d.feature, d.label)),
    lowering: drivers.filter((driver) => driver.points < 0).slice(0, 2).map((d) => finding(d.feature, d.label)),
    high,
    low,
    outsideTraining: !prediction.mock && prediction.warnings.some((warning) => warning.includes("outside the range")),
  };
}

// ------------------------------------------------------------------------------------------- English
function pct(value: number): string {
  return `${value} percent`;
}

/** "a 67 percent", "an 85 percent", "an 11 percent". */
function aPct(value: number): string {
  return `${/^8/.test(String(value)) || value === 11 || value === 18 ? "an" : "a"} ${pct(value)}`;
}

function list(items: string[]): string {
  return items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A finding as a short spoken phrase: "typical chest pain", "diabetes", "triglycerides of 235 mg/dL". */
function englishFinding({ feature, name, value, formatted }: SpokenFinding): string {
  if (feature === "Chest Pain") {
    return value === "None" ? "no chest pain" : `${String(value).toLowerCase()} chest pain`;
  }
  if (feature === "Sex") {
    return value === "Female" ? "being female" : "being male";
  }
  if (feature === "Age") {
    return `age ${String(value)}`;
  }
  if (feature === "Smoking") {
    return value === "Current" ? "current smoking" : value === "Former" ? "past smoking" : "never having smoked";
  }
  if (feature === "Region RWMA" && typeof value === "number") {
    return value === 0 ? "normal heart wall movement" : `reduced wall movement in ${value} ${value === 1 ? "region" : "regions"}`;
  }
  if (typeof value === "boolean") {
    return value ? name : `no ${name}`;
  }
  if (typeof value === "number") {
    return `${name} of ${formatted}`;
  }
  return value === "None" ? `no ${name}` : `${name}: ${lowerFirst(String(value))}`;
}

/** "fasting blood sugar 360", "ejection fraction 45 percent". Units are left out to keep it short. */
function englishReading(reading: SpokenReading): string {
  return `${reading.name} ${reading.number}${reading.percent ? " percent" : ""}`;
}

/**
 * The result read aloud for a patient or clinician, one sentence per entry (each is spoken and captioned
 * separately): a greeting, who the patient is and their overall chance, which arteries are most likely narrowed,
 * the main factors raising and lowering it, readings outside the healthy range, what to do next, and the reminder.
 */
export function spokenSummary(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
  inputs: Readonly<Record<string, FeatureValue>>,
): string[] {
  const facts = summaryFacts(prediction, features, inputs);
  const age = facts.age !== null ? `${facts.age}-year-old` : null;
  const sex = facts.sex === "Female" ? "woman" : facts.sex === "Male" ? "man" : null;
  const patient = age && sex ? `This patient, a ${age} ${sex},` : age ? `This ${age} patient` : "This patient";
  const sentences = [
    "Hi.",
    `${patient} has ${aPct(facts.cad)} chance of significant coronary artery disease.`,
    `That is ${facts.flagged ? "above" : "below"} the alert level of ${pct(facts.threshold)}.`,
  ];
  if (facts.uncertain) {
    sentences.push("It is close to the alert level, so the result could go either way.");
  }

  const at = ({ artery, percent }: { artery: Artery; percent: number }) => `the ${ARTERY_SPOKEN[artery]} at ${pct(percent)}`;
  if (facts.arteries.length) {
    sentences.push(
      facts.arteries.length === 1
        ? `The artery most likely to be narrowed is ${at(facts.arteries[0])}.`
        : `The arteries most likely to be narrowed are ${list(facts.arteries.map(at))}.`,
    );
  } else {
    sentences.push(
      facts.held
        ? `No artery is flagged, although the ${ARTERY_SPOKEN[facts.held.artery]} is fairly high at ${pct(facts.held.percent)}.`
        : "No artery is flagged.",
    );
  }
  if (!facts.uncertain && facts.unsure.length) {
    sentences.push(`The model is unsure about the ${list(facts.unsure.map((artery) => ARTERY_SPOKEN[artery]))}.`);
  }

  const raising = facts.raising.map(englishFinding);
  const lowering = facts.lowering.map(englishFinding);
  if (raising.length) {
    sentences.push(
      raising.length === 1
        ? `The main factor raising the risk is ${raising[0]}.`
        : `The ${COUNT_WORDS[raising.length]} main factors raising the risk are ${list(raising)}.`,
    );
  }
  if (lowering.length) {
    const lowers = list(lowering);
    sentences.push(`${lowers.charAt(0).toUpperCase()}${lowers.slice(1)} ${lowering.length === 1 ? "lowers" : "lower"} it.`);
  }
  if (facts.high.length) {
    sentences.push(`High readings: ${list(facts.high.map(englishReading))}.`);
  }
  if (facts.low.length) {
    sentences.push(`Low readings: ${list(facts.low.map(englishReading))}.`);
  }

  sentences.push(
    facts.flagged
      ? "Further tests, such as an angiogram, may be worth discussing with a cardiologist."
      : "A doctor will weigh this with the symptoms and any other tests.",
  );
  if (facts.outsideTraining) {
    sentences.push("Some values are outside the range the model was trained on, so this estimate is less reliable.");
  }
  sentences.push("This is decision support, not a diagnosis.");
  return sentences.map(speakable);
}
