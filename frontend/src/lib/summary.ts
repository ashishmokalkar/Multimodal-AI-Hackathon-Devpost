import type { Explanation, FeatureDefinition } from "../api/types";
import { formatFeatureValue, toPoints, type ArteryId } from "./insights";

/** Plain-language anatomy for the three arteries, for patients as much as clinicians. */
export const ARTERY_INFO: Record<ArteryId, { name: string; region: string }> = {
  LAD: {
    name: "Left anterior descending",
    region: "Supplies the front of the heart",
  },
  LCX: {
    name: "Left circumflex",
    region: "Supplies the side and back of the heart",
  },
  RCA: {
    name: "Right coronary artery",
    region: "Supplies the right side and bottom of the heart",
  },
};

export interface Driver {
  feature: string;
  label: string;
  valueText: string;
  /** Input group from the feature contract (Demographics, Symptoms/Exam, ECG, Lab, Echo). */
  group: string;
  /** Signed percentage points this input moves the estimate, compared with a typical patient. */
  points: number;
}

export interface DriverSummary {
  basePercent: number;
  finalPercent: number;
  drivers: Driver[];
  /** Everything below the shown drivers, combined. */
  rest: { count: number; points: number } | null;
}

/** Below this an input is not worth a row: it moves the estimate by less than one percentage point. */
export const MIN_DRIVER_POINTS = 1;

function toDriver(
  item: Explanation["contributions"][number],
  definitions: Map<string, FeatureDefinition>,
): Driver {
  const definition = definitions.get(item.feature);
  return {
    feature: item.feature,
    label: definition?.label ?? item.feature,
    valueText: formatFeatureValue(item.value, definition),
    group: definition?.group ?? "",
    points: toPoints(item.contribution),
  };
}

/** The few inputs that move the estimate most, largest first; the rest are combined into one line. */
export function buildDrivers(
  explanation: Explanation,
  features: readonly FeatureDefinition[],
  finalProbability: number,
  limit = 6,
): DriverSummary {
  const definitions = new Map(
    features.map((feature) => [feature.name, feature]),
  );
  const ordered = explanation.contributions
    .map((item) => toDriver(item, definitions))
    .filter((driver) => driver.points !== 0)
    .sort((left, right) => Math.abs(right.points) - Math.abs(left.points));
  const drivers = ordered
    .filter((driver) => Math.abs(driver.points) >= MIN_DRIVER_POINTS)
    .slice(0, limit);
  const rest = ordered.slice(drivers.length);
  return {
    basePercent: explanation.base_value * 100,
    finalPercent: finalProbability * 100,
    drivers,
    rest: rest.length
      ? {
          count: rest.length,
          points: rest.reduce((sum, driver) => sum + driver.points, 0),
        }
      : null,
  };
}

/** Short, lower-case phrase for a sentence: "diabetes", "no diabetes", "chest pain: atypical", "ejection fraction 55%". */
export function driverPhrase(
  driver: Pick<Driver, "label" | "valueText">,
): string {
  const label = lowerFirst(driver.label);
  if (driver.valueText === "Yes") {
    return label;
  }
  if (driver.valueText === "No") {
    return `no ${label}`;
  }
  // measurements keep their units' case ("160 mg/dL"); option names read as words ("typical")
  const value = /^[\d.−-]/.test(driver.valueText)
    ? driver.valueText
    : driver.valueText.toLowerCase();
  return `${label} (${value})`;
}

/** Lower-cases the first letter for use mid-sentence, but leaves acronyms ("LDL", "ST elevation") alone. */
function lowerFirst(text: string): string {
  return /^[A-Z][A-Z]/.test(text)
    ? text
    : text.charAt(0).toLowerCase() + text.slice(1);
}

function joinPhrases(parts: string[]): string {
  if (parts.length <= 1) {
    return parts.join("");
  }
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The inputs named in the headline: up to three that raise the estimate and two that lower it. */
export function headlineDrivers(summary: DriverSummary): {
  raising: Driver[];
  lowering: Driver[];
} {
  return {
    raising: summary.drivers
      .filter((driver) => driver.points >= MIN_DRIVER_POINTS)
      .slice(0, 3),
    lowering: summary.drivers
      .filter((driver) => driver.points <= -MIN_DRIVER_POINTS)
      .slice(0, 2),
  };
}

/** Short label for a pill: "Diabetes", "No diabetes", "Chest pain type · Typical". */
export function driverPillText(
  driver: Pick<Driver, "label" | "valueText">,
): string {
  if (driver.valueText === "Yes") {
    return driver.label;
  }
  if (driver.valueText === "No") {
    return `No ${lowerFirst(driver.label)}`;
  }
  return `${driver.label} · ${driver.valueText}`;
}

/** One or two plain sentences naming what raises and what lowers the estimate. */
export function driverSentence(summary: DriverSummary): string {
  const { raising, lowering } = headlineDrivers(summary);
  const sentences: string[] = [];
  if (raising.length) {
    sentences.push(
      `Mainly raised by ${joinPhrases(raising.map((driver) => driverPhrase(driver)))}.`,
    );
  }
  if (lowering.length) {
    const phrase = joinPhrases(lowering.map((driver) => driverPhrase(driver)));
    sentences.push(
      `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} ${lowering.length > 1 ? "lower" : "lowers"} it.`,
    );
  }
  return sentences.length
    ? sentences.join(" ")
    : "No single input moves this estimate much from a typical patient's.";
}

/** The strongest inputs for one artery, for the compact "main drivers" line. */
export function topArteryDrivers(
  explanation: Explanation,
  features: readonly FeatureDefinition[],
  limit = 2,
): Driver[] {
  return buildDrivers(explanation, features, 0, limit).drivers;
}
