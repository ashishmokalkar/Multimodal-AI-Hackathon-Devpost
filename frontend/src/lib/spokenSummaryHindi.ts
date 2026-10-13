import type { FeatureDefinition, FeatureValue, PredictionResponse } from "../api/types";
import { ARTERY_SPOKEN, speakable, summaryFacts, type Artery, type SpokenFinding, type SpokenReading } from "./spokenSummary";

/**
 * The spoken summary in Hindi, worded the way Indian clinicians talk: Hindi sentences with the medical terms in
 * English (CAD, LAD, ECG, ejection fraction, angiogram). Same facts and order as the English summary.
 */

const COUNT_WORDS = ["", "एक", "दो", "तीन", "चार"];

/** Everyday Hindi for the few inputs that read better in Hindi; the rest keep their English (medical) name. */
const HINDI_NAMES: Record<string, string> = {
  FH: "परिवार में heart disease का इतिहास",
  Dyspnea: "साँस फूलना",
  CVA: "पहले stroke",
  CRF: "kidney की पुरानी बीमारी",
};

function list(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} और ${items[items.length - 1]}`;
}

/** "45%" → "45 प्रतिशत"; other units as English words ("235 milligrams per decilitre"). */
function hindiUnits(text: string): string {
  return speakable(text.replace(/(\d)%/g, "$1 प्रतिशत"));
}

function hindiFinding({ feature, name, value, formatted }: SpokenFinding): string {
  const label = HINDI_NAMES[feature] ?? name;
  if (feature === "Chest Pain") {
    return value === "None" ? "chest pain न होना" : `${String(value).toLowerCase()} chest pain`;
  }
  if (feature === "Sex") {
    return value === "Female" ? "महिला होना" : "पुरुष होना";
  }
  if (feature === "Age") {
    return `${String(value)} साल की उम्र`;
  }
  if (feature === "Smoking") {
    return value === "Current" ? "अभी smoking करना" : value === "Former" ? "पहले smoking करना" : "कभी smoking न करना";
  }
  if (feature === "Region RWMA" && typeof value === "number") {
    return value === 0 ? "सामान्य wall motion" : `${value} ${value === 1 ? "region" : "regions"} में wall motion abnormality`;
  }
  if (typeof value === "boolean") {
    return value ? label : `${label} न होना`;
  }
  if (typeof value === "number") {
    return hindiUnits(`${label} ${formatted}`);
  }
  return value === "None" ? `${label} न होना` : `${label} ${String(value)}`;
}

function hindiReading(reading: SpokenReading): string {
  return `${reading.name} ${reading.number}${reading.percent ? " प्रतिशत" : ""}`;
}

export function spokenSummaryHindi(
  prediction: PredictionResponse,
  features: readonly FeatureDefinition[],
  inputs: Readonly<Record<string, FeatureValue>>,
): string[] {
  const facts = summaryFacts(prediction, features, inputs);
  const who =
    facts.age === null
      ? "इस मरीज़"
      : facts.sex === "Female"
        ? `${facts.age} साल की इस महिला मरीज़`
        : facts.sex === "Male"
          ? `${facts.age} साल के इस पुरुष मरीज़`
          : `${facts.age} साल के इस मरीज़`;
  const sentences = [
    "नमस्ते।",
    `${who} में significant coronary artery disease की संभावना ${facts.cad} प्रतिशत है।`,
    `यह ${facts.threshold} प्रतिशत के alert level से ${facts.flagged ? "ऊपर" : "नीचे"} है।`,
  ];
  if (facts.uncertain) {
    sentences.push("यह alert level के बहुत क़रीब है, इसलिए नतीजा किसी भी तरफ़ जा सकता है।");
  }

  const at = ({ artery, percent }: { artery: Artery; percent: number }) => `${ARTERY_SPOKEN[artery]} में ${percent} प्रतिशत`;
  if (facts.arteries.length > 1) {
    sentences.push(`सबसे ज़्यादा narrowing की संभावना इन arteries में है: ${list(facts.arteries.map(at))}।`);
  } else if (facts.arteries.length === 1) {
    const [only] = facts.arteries;
    sentences.push(`सबसे ज़्यादा narrowing की संभावना ${ARTERY_SPOKEN[only.artery]} में है, ${only.percent} प्रतिशत।`);
  } else {
    sentences.push(
      facts.held
        ? `कोई artery flag नहीं हुई है, हालाँकि ${ARTERY_SPOKEN[facts.held.artery]} में संभावना ${facts.held.percent} प्रतिशत है, जो काफ़ी ज़्यादा है।`
        : "कोई artery flag नहीं हुई है।",
    );
  }
  if (!facts.uncertain && facts.unsure.length) {
    sentences.push(`${list(facts.unsure.map((artery) => ARTERY_SPOKEN[artery]))} के बारे में model पक्का नहीं है।`);
  }

  const raising = facts.raising.map(hindiFinding);
  const lowering = facts.lowering.map(hindiFinding);
  if (raising.length) {
    sentences.push(
      raising.length === 1
        ? `Risk बढ़ाने वाला मुख्य factor है: ${raising[0]}।`
        : `Risk बढ़ाने वाले ${COUNT_WORDS[raising.length]} मुख्य factors हैं: ${list(raising)}।`,
    );
  }
  if (lowering.length) {
    sentences.push(
      lowering.length === 1
        ? `Risk कम करने वाला factor है: ${lowering[0]}।`
        : `Risk कम करने वाले factors हैं: ${list(lowering)}।`,
    );
  }
  if (facts.high.length) {
    sentences.push(`सामान्य से ज़्यादा readings: ${list(facts.high.map(hindiReading))}।`);
  }
  if (facts.low.length) {
    sentences.push(`सामान्य से कम readings: ${list(facts.low.map(hindiReading))}।`);
  }

  sentences.push(
    facts.flagged
      ? "Angiogram जैसे और tests के बारे में cardiologist से बात करना ठीक रहेगा।"
      : "डॉक्टर इसे लक्षणों और बाक़ी tests के साथ मिलाकर देखेंगे।",
  );
  if (facts.outsideTraining) {
    sentences.push("कुछ values model की training range से बाहर हैं, इसलिए यह अनुमान कम भरोसेमंद है।");
  }
  sentences.push("यह सिर्फ़ decision support है, diagnosis नहीं।");
  return sentences.map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1));
}

/** Short, stable id for a summary's text (FNV-1a), so a recorded clip is only played for exactly that text. */
export function clipKey(sentences: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const char of sentences.join(" ")) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
