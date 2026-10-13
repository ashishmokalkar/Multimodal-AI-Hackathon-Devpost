import type { FeatureDefinition, FeatureValue } from "../api/types";
import { formatFeatureValue } from "./insights";

interface Plain {
  /** What the measurement is, in everyday words. */
  name: string;
  /** Wording when a yes/no item is present or absent. */
  yes?: string;
  no?: string;
  /** Wording for each option of a choice. */
  options?: Record<string, string>;
}

/** Patient-facing names for every model input. */
const PLAIN: Record<string, Plain> = {
  Age: { name: "Age" },
  Weight: { name: "Weight" },
  Length: { name: "Height" },
  Sex: { name: "Sex", options: { Female: "Being a woman", Male: "Being a man" } },
  DM: { name: "Diabetes", yes: "Having diabetes", no: "No diabetes" },
  HTN: { name: "High blood pressure", yes: "Having high blood pressure", no: "No high blood pressure" },
  Smoking: {
    name: "Smoking",
    options: { Never: "Never smoked", Former: "Used to smoke", Current: "Smoking now" },
  },
  FH: { name: "Family history", yes: "Heart disease in the family", no: "No heart disease in the family" },
  CRF: { name: "Kidney disease", yes: "Long-term kidney disease", no: "No kidney disease" },
  CVA: { name: "Stroke", yes: "A previous stroke", no: "No previous stroke" },
  Airway: { name: "Asthma or COPD", yes: "Asthma or COPD", no: "No asthma or COPD" },
  "Thyroid Disease": { name: "Thyroid disease", yes: "Thyroid disease", no: "No thyroid disease" },
  CHF: { name: "Heart failure", yes: "Heart failure", no: "No heart failure" },
  DLP: { name: "High cholesterol", yes: "Diagnosed high cholesterol", no: "No diagnosed high cholesterol" },
  BP: { name: "Blood pressure (top number)" },
  PR: { name: "Resting heart rate" },
  "Chest Pain": {
    name: "Chest pain",
    options: {
      None: "No chest pain",
      Typical: "Chest pain that sounds like it comes from the heart",
      Atypical: "Chest pain that may come from the heart",
      "Non-anginal": "Chest pain that is unlikely to come from the heart",
    },
  },
  Dyspnea: { name: "Breathlessness", yes: "Getting short of breath", no: "No breathlessness" },
  "Function Class": { name: "Limits on daily activity (grade 0–3)" },
  "LowTH Ang": { name: "Chest pain on light effort", yes: "Chest pain on light effort", no: "No chest pain on light effort" },
  Edema: { name: "Swollen legs", yes: "Swollen ankles or legs", no: "No swollen legs" },
  "Weak Peripheral Pulse": { name: "Weak pulses", yes: "Weak pulse in the arms or legs", no: "Normal pulses in the arms and legs" },
  "Lung rales": { name: "Crackles in the lungs", yes: "Crackles heard in the lungs", no: "Clear lungs" },
  "Systolic Murmur": { name: "Heart murmur", yes: "A heart murmur", no: "No heart murmur" },
  "Diastolic Murmur": { name: "Heart murmur", yes: "A heart murmur", no: "No heart murmur" },
  "Q Wave": { name: "Heart tracing (ECG)", yes: "A sign of old damage on the heart tracing (ECG)", no: "No sign of old damage on the ECG" },
  "ST Elevation": { name: "Heart tracing (ECG)", yes: "A change on the heart tracing (ECG)", no: "No change of this kind on the ECG" },
  "ST Depression": { name: "Heart tracing (ECG)", yes: "A change on the heart tracing (ECG)", no: "No change of this kind on the ECG" },
  "T inversion": { name: "Heart tracing (ECG)", yes: "A change on the heart tracing (ECG)", no: "No change of this kind on the ECG" },
  LVH: { name: "Thick heart muscle", yes: "Thickened heart muscle on the ECG", no: "No thickened heart muscle" },
  "Poor R Progression": { name: "Heart tracing (ECG)", yes: "A change on the heart tracing (ECG)", no: "No change of this kind on the ECG" },
  BBB: {
    name: "Heart rhythm wiring",
    options: {
      None: "Normal electrical wiring on the ECG",
      LBBB: "A delay in the heart's electrical wiring (ECG)",
      RBBB: "A delay in the heart's electrical wiring (ECG)",
    },
  },
  FBS: { name: "Blood sugar (fasting)" },
  CR: { name: "Kidney blood test (creatinine)" },
  TG: { name: "Triglycerides (a blood fat)" },
  LDL: { name: "LDL (“bad”) cholesterol" },
  HDL: { name: "HDL (“good”) cholesterol" },
  BUN: { name: "Kidney blood test (urea)" },
  ESR: { name: "Inflammation blood test (ESR)" },
  HB: { name: "Haemoglobin (red blood cells)" },
  K: { name: "Potassium" },
  Na: { name: "Sodium" },
  WBC: { name: "White blood cells" },
  Lymph: { name: "Lymphocytes (white blood cells)" },
  Neut: { name: "Neutrophils (white blood cells)" },
  PLT: { name: "Platelets" },
  "EF-TTE": { name: "Heart pumping strength" },
  "Region RWMA": { name: "Heart wall movement on the scan" },
  VHD: {
    name: "Heart valves",
    options: {
      None: "Healthy heart valves",
      Mild: "Mild heart valve disease",
      Moderate: "Moderate heart valve disease",
      Severe: "Severe heart valve disease",
    },
  },
};

/** The measurement's everyday name ("Blood sugar (fasting)"). */
export function plainName(feature: string, definition?: FeatureDefinition): string {
  return PLAIN[feature]?.name ?? definition?.label ?? feature;
}

/**
 * One finding as a short phrase a patient understands: "Having diabetes", "No kidney disease", "Chest pain that
 * sounds like it comes from the heart", "Blood sugar (fasting): 227 mg/dL", "2 areas of heart wall moving less
 * well on the scan".
 */
export function plainFinding(
  feature: string,
  value: FeatureValue,
  definition?: FeatureDefinition,
): string {
  const plain = PLAIN[feature];
  if (feature === "Region RWMA" && typeof value === "number") {
    return value === 0
      ? "Heart wall moving normally on the scan"
      : `${value} ${value === 1 ? "area" : "areas"} of heart wall moving less well on the scan`;
  }
  if (feature === "Age" && typeof value === "number") {
    return `Age (${value})`;
  }
  if (typeof value === "boolean") {
    if (plain) {
      return value ? (plain.yes ?? plain.name) : (plain.no ?? `No ${plain.name.toLowerCase()}`);
    }
    return value ? (definition?.label ?? feature) : `No ${(definition?.label ?? feature).toLowerCase()}`;
  }
  const option = plain?.options?.[String(value)];
  if (option) {
    return option;
  }
  return `${plainName(feature, definition)}: ${formatFeatureValue(value, definition)}`;
}

/** Everyday names for the three arteries, with the medical name kept alongside. */
export const ARTERY_PLAIN = {
  LAD: { name: "Front artery", medical: "Left anterior descending artery (LAD)", supplies: "the front of your heart" },
  LCX: { name: "Side artery", medical: "Left circumflex artery (LCX)", supplies: "the side and back of your heart" },
  RCA: { name: "Right artery", medical: "Right coronary artery (RCA)", supplies: "the right side and bottom of your heart" },
} as const;

/** Reliability notes from the API, said plainly for a patient (technical figures left out). */
export function plainWarnings(warnings: readonly string[]): string[] {
  const out = new Set<string>();
  for (const warning of warnings) {
    if (warning.includes("outside the range")) {
      out.add(
        "Some of your results are unusual for the people this tool learned from, so treat this estimate with extra caution.",
      );
    } else if (warning.includes("65 or over")) {
      out.add("The tool is a little less accurate for people aged 65 and over.");
    } else if (warning.includes("add up to more than 100")) {
      out.add("Two of your blood test results may need checking again.");
    }
  }
  return [...out];
}
