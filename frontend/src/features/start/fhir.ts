import type { FeatureDefinition, FeatureValue } from "../../api/types";

/**
 * Maps a FHIR R4 bundle (the format records arrive in through ABDM, India's health-record network) to the model's
 * inputs. Coded data is matched by code: LOINC for measurements, SNOMED CT for diagnoses. ECG and echo impressions,
 * which records usually hold as text, are read with a few plain rules. Each input keeps the record it came from.
 */

export interface MappedValue {
  name: string;
  value: FeatureValue;
  /** The record it came from, e.g. "Observation · LOINC 1558-6 Fasting glucose". */
  source: string;
  /** Which kind of record: shown grouped in the import window. */
  kind: "Patient" | "Diagnoses" | "Vital signs" | "Lab report" | "ECG" | "Echo";
}

interface Quantity {
  value?: number;
  code?: string;
  unit?: string;
}
interface Coding {
  system?: string;
  code?: string;
  display?: string;
}
interface Resource {
  resourceType: string;
  code?: { coding?: Coding[]; text?: string };
  valueQuantity?: Quantity;
  valueString?: string;
  component?: { code: { coding?: Coding[] }; valueQuantity?: Quantity }[];
  gender?: string;
  birthDate?: string;
  clinicalStatus?: { coding?: Coding[] };
}
export interface FhirBundle {
  resourceType: "Bundle";
  timestamp?: string;
  entry?: { resource: Resource }[];
}

const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";

/** LOINC code -> input, with the unit conversions to the input's unit that records commonly need. */
const MEASURES: Record<string, { name: string; kind: MappedValue["kind"]; convert?: Record<string, number> }> = {
  "29463-7": { name: "Weight", kind: "Vital signs", convert: { "[lb_av]": 0.4536 } },
  "8302-2": { name: "Length", kind: "Vital signs", convert: { "[in_i]": 2.54 } },
  "8867-4": { name: "PR", kind: "Vital signs" },
  "8480-6": { name: "BP", kind: "Vital signs" },
  "1558-6": { name: "FBS", kind: "Lab report", convert: { "mmol/L": 18.016 } },
  "3094-0": { name: "BUN", kind: "Lab report", convert: { "mmol/L": 2.801 } },
  "2160-0": { name: "CR", kind: "Lab report", convert: { "umol/L": 1 / 88.4 } },
  "2951-2": { name: "Na", kind: "Lab report" },
  "2823-3": { name: "K", kind: "Lab report" },
  "2571-8": { name: "TG", kind: "Lab report", convert: { "mmol/L": 88.57 } },
  "2085-9": { name: "HDL", kind: "Lab report", convert: { "mmol/L": 38.67 } },
  "18262-6": { name: "LDL", kind: "Lab report", convert: { "mmol/L": 38.67 } },
  "13457-7": { name: "LDL", kind: "Lab report", convert: { "mmol/L": 38.67 } },
  "718-7": { name: "HB", kind: "Lab report", convert: { "g/L": 0.1 } },
  "6690-2": { name: "WBC", kind: "Lab report" },
  "770-8": { name: "Neut", kind: "Lab report" },
  "736-9": { name: "Lymph", kind: "Lab report" },
  "777-3": { name: "PLT", kind: "Lab report" },
  "4537-7": { name: "ESR", kind: "Lab report" },
  "10230-1": { name: "EF-TTE", kind: "Echo" },
};

/** SNOMED CT diagnosis (or any of its listed equivalents) -> a yes/no input. */
const CONDITIONS: Record<string, string> = {
  "44054006": "DM", // type 2 diabetes
  "73211009": "DM", // diabetes mellitus
  "46635009": "DM", // type 1 diabetes
  "38341003": "HTN", // hypertensive disorder
  "59621000": "HTN", // essential hypertension
  "55822004": "DLP", // hyperlipidaemia
  "370992007": "DLP", // dyslipidaemia
  "13645005": "Airway", // chronic obstructive lung disease
  "195967001": "Airway", // asthma
  "709044004": "CRF", // chronic kidney disease
  "230690007": "CVA", // stroke
  "42343007": "CHF", // congestive heart failure
  "84444000": "CHF", // heart failure
  "14304000": "Thyroid Disease", // thyroid disorder
};

function coding(resource: Resource, system: string): Coding | undefined {
  return resource.code?.coding?.find((item) => item.system === system);
}

function age(birthDate: string, on: Date): number {
  const born = new Date(birthDate);
  let years = on.getFullYear() - born.getFullYear();
  if (on.getMonth() < born.getMonth() || (on.getMonth() === born.getMonth() && on.getDate() < born.getDate())) {
    years -= 1;
  }
  return years;
}

/** ECG and echo impressions as text -> findings; only what the text states (a finding, or its explicit absence). */
function readImpression(text: string, kind: "ECG" | "Echo", source: string): MappedValue[] {
  const t = text.toLowerCase();
  const out: MappedValue[] = [];
  const add = (name: string, value: FeatureValue) => out.push({ name, value, source, kind });
  if (kind === "ECG") {
    if (/poor r[- ]wave progression/.test(t)) add("Poor R Progression", true);
    if (/no (acute )?st[- ]t changes/.test(t)) {
      add("ST Elevation", false);
      add("ST Depression", false);
      add("T inversion", false);
    } else {
      if (/st elevation/.test(t)) add("ST Elevation", !/no st elevation/.test(t));
      if (/st depression/.test(t)) add("ST Depression", !/no st depression/.test(t));
      if (/t[- ]wave inversion/.test(t)) add("T inversion", !/no t[- ]wave inversion/.test(t));
    }
    if (/q waves?/.test(t)) add("Q Wave", !/no (pathological )?q waves?/.test(t));
    if (/lvh|left ventricular hypertrophy/.test(t)) add("LVH", !/no (lvh|left ventricular hypertrophy)/.test(t));
    if (/\blbbb\b|left bundle branch block/.test(t)) add("BBB", "LBBB");
    else if (/\brbbb\b|right bundle branch block/.test(t)) add("BBB", "RBBB");
    else if (/no bundle branch block/.test(t)) add("BBB", "None");
  } else {
    if (/no (regional wall motion abnormality|rwma)/.test(t)) add("Region RWMA", 0);
    const valve = /(mild|moderate|severe) valv/.exec(t);
    if (valve) add("VHD", valve[1][0].toUpperCase() + valve[1].slice(1));
    else if (/no (significant )?valv/.test(t)) add("VHD", "None");
  }
  return out;
}

/**
 * Every input the bundle provides, checked against the input definitions (unknown inputs and values outside the
 * input's range are left out). The first value found for an input wins.
 */
export function mapFhirBundle(bundle: FhirBundle, features: FeatureDefinition[]): MappedValue[] {
  const byName = new Map(features.map((feature) => [feature.name, feature]));
  const found = new Map<string, MappedValue>();
  const keep = (item: MappedValue) => {
    const feature = byName.get(item.name);
    if (!feature || found.has(item.name)) {
      return;
    }
    if (typeof item.value === "number") {
      if ((feature.min !== undefined && item.value < feature.min) || (feature.max !== undefined && item.value > feature.max)) {
        return;
      }
    }
    found.set(item.name, item);
  };
  const on = bundle.timestamp ? new Date(bundle.timestamp) : new Date();
  const measure = (code: string, quantity: Quantity | undefined, label: string) => {
    const rule = MEASURES[code];
    if (!rule || quantity?.value === undefined) {
      return;
    }
    const factor = quantity.code ? (rule.convert?.[quantity.code] ?? 1) : 1;
    keep({
      name: rule.name,
      value: Math.round(quantity.value * factor * 100) / 100,
      source: `Observation · LOINC ${code} ${label}`,
      kind: rule.kind,
    });
  };

  for (const { resource } of bundle.entry ?? []) {
    if (resource.resourceType === "Patient") {
      if (resource.gender === "female" || resource.gender === "male") {
        keep({ name: "Sex", value: resource.gender === "female" ? "Female" : "Male", source: "Patient · gender", kind: "Patient" });
      }
      if (resource.birthDate) {
        keep({ name: "Age", value: age(resource.birthDate, on), source: "Patient · birth date", kind: "Patient" });
      }
    } else if (resource.resourceType === "Condition") {
      const active = resource.clinicalStatus?.coding?.some((item) => item.code === "active") ?? true;
      const snomed = coding(resource, SNOMED);
      const name = snomed?.code ? CONDITIONS[snomed.code] : undefined;
      if (active && name) {
        keep({
          name,
          value: true,
          source: `Condition · SNOMED ${snomed!.code} ${snomed!.display ?? resource.code?.text ?? ""}`.trim(),
          kind: "Diagnoses",
        });
      }
    } else if (resource.resourceType === "Observation") {
      const loinc = coding(resource, LOINC);
      if (loinc?.code) {
        measure(loinc.code, resource.valueQuantity, loinc.display ?? "");
        for (const part of resource.component ?? []) {
          const code = part.code.coding?.find((item) => item.system === LOINC);
          if (code?.code) {
            measure(code.code, part.valueQuantity, code.display ?? "");
          }
        }
      }
      const label = `${loinc?.display ?? ""} ${resource.code?.text ?? ""}`.toLowerCase();
      if (resource.valueString && (loinc?.code === "18844-1" || /ecg|ekg/.test(label))) {
        readImpression(resource.valueString, "ECG", `Observation · ${resource.code?.text ?? "ECG impression"}`).forEach(keep);
      } else if (resource.valueString && /echo/.test(label)) {
        readImpression(resource.valueString, "Echo", `Observation · ${resource.code?.text ?? "Echo impression"}`).forEach(keep);
      }
    }
  }
  return [...found.values()];
}
