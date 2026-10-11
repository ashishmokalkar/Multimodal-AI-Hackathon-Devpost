import type { FeatureDefinition, PredictionResponse } from "../api/types";
import { comparisonSentence, type CohortComparison } from "./cohort";
import { isFlagged, isHeldBack } from "./flags";
import { buildDrivers, driverSentence } from "./summary";

const ARTERY_SPOKEN = {
  LAD: "left anterior descending artery",
  LCX: "left circumflex artery",
  RCA: "right coronary artery",
} as const;
type Artery = keyof typeof ARTERY_SPOKEN;
const ARTERIES: readonly Artery[] = ["LAD", "LCX", "RCA"];

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

function list(items: string[]): string {
  return items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * A short spoken version of the result, one sentence per entry (each is spoken and captioned separately): the
 * overall chance against its threshold, which arteries are flagged, what the model is unsure about, the main
 * drivers, how the patient compares with similar patients, and the decision-support reminder.
 */
export function spokenSummary(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
  comparison: CohortComparison | null = null,
): string[] {
  const cad = prediction.cad;
  const sentences = [
    `The estimated chance of significant coronary artery disease is ${pct(cad.probability)}.`,
    isFlagged(cad)
      ? `That is above the ${pct(cad.threshold)} decision threshold, so it is flagged.`
      : `That is below the ${pct(cad.threshold)} decision threshold, so it is not flagged.`,
  ];

  const flagged = ARTERIES.filter((artery) => isFlagged(prediction.vessels[artery]));
  const held = ARTERIES.filter((artery) => isHeldBack(prediction.vessels[artery]));
  if (flagged.length) {
    sentences.push(
      `Arteries flagged: ${list(
        flagged.map(
          (artery) =>
            `the ${ARTERY_SPOKEN[artery]} at ${pct(prediction.vessels[artery].probability)}`,
        ),
      )}.`,
    );
  } else if (held.length) {
    sentences.push(
      `The ${list(held.map((artery) => ARTERY_SPOKEN[artery]))} ${held.length > 1 ? "are above their own thresholds" : "is above its own threshold"}, but an artery is only flagged when the overall result is.`,
    );
  } else {
    sentences.push("No individual artery is flagged.");
  }

  const unsure = ARTERIES.filter((artery) => prediction.vessels[artery].uncertain);
  if (cad.uncertain) {
    sentences.push("The model cannot call the overall result confidently.");
  } else if (unsure.length) {
    sentences.push(
      `The model is not confident about the ${list(unsure.map((artery) => ARTERY_SPOKEN[artery]))}.`,
    );
  }

  const drivers = driverSentence(buildDrivers(prediction.explanations.cad, features, cad.probability));
  sentences.push(...drivers.split(/(?<=\.)\s+/).filter(Boolean).map(speakable));

  if (comparison) {
    sentences.push(`${speakable(comparisonSentence(comparison))}.`);
  }
  if (!prediction.mock && prediction.warnings.some((warning) => warning.includes("outside the range"))) {
    sentences.push("Some values are outside the range the model was trained on, so this estimate is less reliable.");
  }
  sentences.push("This is decision support, not a diagnosis. Please discuss it with a doctor.");
  return sentences;
}
