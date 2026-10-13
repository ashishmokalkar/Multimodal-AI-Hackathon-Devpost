import type { FeatureDefinition, FeatureValue, PredictionResponse } from "../api/types";
import { isFlagged, isHeldBack } from "./flags";
import { formatFeatureValue, rangeStatus } from "./insights";
import { buildDrivers, type Driver } from "./summary";
import { displayNumber } from "./units";

const ARTERY_SPOKEN = {
  LAD: "left anterior descending artery",
  LCX: "left circumflex artery",
  RCA: "right coronary artery",
} as const;
type Artery = keyof typeof ARTERY_SPOKEN;
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

function pct(probability: number): string {
  return `${Math.round(probability * 100)} percent`;
}

/** "a 67 percent", "an 85 percent", "an 11 percent". */
function aPct(probability: number): string {
  const n = Math.round(probability * 100);
  return `${/^8/.test(String(n)) || n === 11 || n === 18 ? "an" : "a"} ${pct(probability)}`;
}

/** Spoken names where the label reads badly aloud ("blood pressure (systolic)"). */
const SPOKEN_NAMES: Record<string, string> = { BP: "systolic blood pressure" };

function list(items: string[]): string {
  return items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Lower-cases the first letter mid-sentence ("Diabetes" → "diabetes") but leaves "LDL", "ST" and "T-wave" alone. */
function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** A finding as a short spoken phrase: "typical chest pain", "diabetes", "triglycerides of 235 mg/dL". */
function spokenFinding(driver: Driver, value: FeatureValue | undefined, definition?: FeatureDefinition): string {
  const label = SPOKEN_NAMES[driver.feature] ?? lowerFirst(driver.label);
  if (driver.feature === "Chest Pain") {
    return value === "None" ? "no chest pain" : `${String(value).toLowerCase()} chest pain`;
  }
  if (driver.feature === "Sex") {
    return value === "Female" ? "being female" : "being male";
  }
  if (driver.feature === "Age") {
    return `age ${String(value)}`;
  }
  if (driver.feature === "Smoking") {
    return value === "Current" ? "current smoking" : value === "Former" ? "past smoking" : "never having smoked";
  }
  if (driver.feature === "Region RWMA" && typeof value === "number") {
    return value === 0 ? "normal heart wall movement" : `reduced wall movement in ${value} ${value === 1 ? "region" : "regions"}`;
  }
  if (typeof value === "boolean") {
    return value ? label : `no ${label}`;
  }
  if (typeof value === "number") {
    return `${label} of ${formatFeatureValue(value, definition)}`;
  }
  return value === "None" ? `no ${label}` : `${label}: ${lowerFirst(String(value))}`;
}

/** "High readings: fasting blood sugar 360 and triglycerides 235." Units are left out to keep it short. */
function readingsSentences(values: Record<string, FeatureValue>, definitions: Map<string, FeatureDefinition>): string[] {
  const high: string[] = [];
  const low: string[] = [];
  for (const name of KEY_READINGS) {
    const definition = definitions.get(name);
    const value = values[name];
    const status = rangeStatus(value, definition?.reference_range);
    if (typeof value !== "number" || !definition || (status !== "high" && status !== "low")) {
      continue;
    }
    const reading = `${SPOKEN_NAMES[name] ?? lowerFirst(definition.label)} ${displayNumber(value, definition)}${definition.unit === "%" ? " percent" : ""}`;
    (status === "high" ? high : low).push(reading);
  }
  return [
    ...(high.length ? [`High readings: ${list(high)}.`] : []),
    ...(low.length ? [`Low readings: ${list(low)}.`] : []),
  ];
}

/**
 * The result read aloud for a patient or clinician, one sentence per entry (each is spoken and captioned
 * separately): who the patient is and their overall chance, which arteries are most likely narrowed, the main
 * factors raising and lowering it, readings outside the healthy range, what to do next, and the reminder.
 */
export function spokenSummary(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
  inputs: Readonly<Record<string, FeatureValue>>,
): string[] {
  const cad = prediction.cad;
  const definitions = new Map(features.map((feature) => [feature.name, feature]));
  // the inputs behind this result, with the explanation's values as a fallback
  const values: Record<string, FeatureValue> = {
    ...Object.fromEntries(prediction.explanations.cad.contributions.map((item) => [item.feature, item.value])),
    ...inputs,
  };

  const age = typeof values.Age === "number" ? `${values.Age}-year-old` : null;
  const sex = values.Sex === "Female" ? "woman" : values.Sex === "Male" ? "man" : null;
  const patient = age && sex ? `This patient, a ${age} ${sex},` : age ? `This ${age} patient` : "This patient";
  const sentences = [
    `${patient} has ${aPct(cad.probability)} chance of significant coronary artery disease.`,
    isFlagged(cad)
      ? `That is above the alert level of ${pct(cad.threshold)}.`
      : `That is below the alert level of ${pct(cad.threshold)}.`,
  ];
  if (cad.uncertain) {
    sentences.push("It is close to the alert level, so the result could go either way.");
  }

  const byChance = [...ARTERIES].sort(
    (left, right) => prediction.vessels[right].probability - prediction.vessels[left].probability,
  );
  const at = (artery: Artery) => `the ${ARTERY_SPOKEN[artery]} at ${pct(prediction.vessels[artery].probability)}`;
  const flagged = byChance.filter((artery) => isFlagged(prediction.vessels[artery]));
  if (flagged.length) {
    sentences.push(
      flagged.length === 1
        ? `The artery most likely to be narrowed is ${at(flagged[0])}.`
        : `The arteries most likely to be narrowed are ${list(flagged.map(at))}.`,
    );
  } else {
    const held = byChance.filter((artery) => isHeldBack(prediction.vessels[artery]));
    sentences.push(
      held.length
        ? `No artery is flagged, although the ${ARTERY_SPOKEN[held[0]]} is fairly high at ${pct(prediction.vessels[held[0]].probability)}.`
        : "No artery is flagged.",
    );
  }
  const unsure = ARTERIES.filter((artery) => prediction.vessels[artery].uncertain);
  if (!cad.uncertain && unsure.length) {
    sentences.push(`The model is unsure about the ${list(unsure.map((artery) => ARTERY_SPOKEN[artery]))}.`);
  }

  const { drivers } = buildDrivers(prediction.explanations.cad, features, cad.probability, 12);
  const say = (driver: Driver) => spokenFinding(driver, values[driver.feature], definitions.get(driver.feature));
  const raising = drivers.filter((driver) => driver.points > 0).slice(0, 4).map(say);
  const lowering = drivers.filter((driver) => driver.points < 0).slice(0, 2).map(say);
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
  sentences.push(...readingsSentences(values, definitions));

  sentences.push(
    isFlagged(cad)
      ? "Further tests, such as an angiogram, may be worth discussing with a cardiologist."
      : "A doctor will weigh this with the symptoms and any other tests.",
  );
  if (!prediction.mock && prediction.warnings.some((warning) => warning.includes("outside the range"))) {
    sentences.push("Some values are outside the range the model was trained on, so this estimate is less reliable.");
  }
  sentences.push("This is decision support, not a diagnosis.");
  return sentences.map(speakable);
}
