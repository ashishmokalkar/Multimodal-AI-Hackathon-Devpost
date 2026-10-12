import { useMemo, useState } from "react";
import { useApiProfile, useFeatures, useSamples } from "../../api/hooks";
import type { FeatureDefinition, FeatureValue, SamplePatient } from "../../api/types";
import { formatFeatureValue, rangeStatus } from "../../lib/insights";
import { displayNumber } from "../../lib/units";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import { DISCLAIMER_LINE } from "../safety/disclaimer";
import { PatientAvatar } from "../patient/PatientAvatar";
import { useStudioStore } from "../studio/studioStore";
import "./picker.css";

/** History shown on a patient card, in the order a clinician scans for it. */
const CONDITIONS: { name: string; label: string; present: (value: FeatureValue | undefined) => boolean }[] = [
  { name: "DM", label: "Diabetes", present: (value) => value === true },
  { name: "HTN", label: "High BP", present: (value) => value === true },
  { name: "DLP", label: "High cholesterol", present: (value) => value === true },
  { name: "Smoking", label: "Smoker", present: (value) => value === "Current" },
  { name: "Smoking", label: "Ex-smoker", present: (value) => value === "Former" },
  { name: "FH", label: "Family history", present: (value) => value === true },
  { name: "CRF", label: "Kidney disease", present: (value) => value === true },
  { name: "CVA", label: "Previous stroke", present: (value) => value === true },
  { name: "CHF", label: "Heart failure", present: (value) => value === true },
];
const METRICS: { name: string; short: string }[] = [
  { name: "BP", short: "BP" },
  { name: "LDL", short: "LDL" },
  { name: "FBS", short: "Sugar" },
  { name: "EF-TTE", short: "EF" },
];

function splitLabel(label: string): [string, string] {
  const [head, tail] = label.split(":");
  return [head.replace("Dataset patient", "Patient").trim(), (tail ?? "").trim()];
}

function chestPain(value: FeatureValue | undefined): string {
  return value === "None" || value === undefined ? "No chest pain" : `${String(value)} chest pain`;
}

function PatientCard({
  sample,
  definitions,
  onOpen,
  index,
}: {
  sample: SamplePatient;
  definitions: Map<string, FeatureDefinition>;
  onOpen: (sample: SamplePatient) => void;
  index: number;
}) {
  const [name, who] = splitLabel(sample.label);
  const sex = sample.features.Sex;
  const conditions = CONDITIONS.filter(({ name: feature, present }) => present(sample.features[feature]));
  return (
    <li style={{ ["--i" as string]: index }}>
      <button className="pk-card" onClick={() => onOpen(sample)} type="button">
        <span className="pk-card-top">
          <PatientAvatar
            className="pk-avatar"
            sex={sex === "Female" || sex === "Male" ? sex : null}
            size={46}
          />
          <span className="pk-card-name">
            <strong>{name}</strong>
            <span>{who}</span>
          </span>
          <span aria-hidden="true" className="pk-open">
            Open →
          </span>
        </span>
        <span className="pk-symptom">{chestPain(sample.features["Chest Pain"])}</span>
        <span className="pk-chips">
          {conditions.length ? (
            conditions.map((condition) => (
              <span className="pk-chip" key={condition.label}>
                {condition.label}
              </span>
            ))
          ) : (
            <span className="pk-chip pk-chip-none">No listed conditions</span>
          )}
        </span>
        <span className="pk-metrics">
          {METRICS.filter(({ name: feature }) => definitions.has(feature)).map(({ name: feature, short }) => {
            const definition = definitions.get(feature);
            const value = sample.features[feature];
            const status = rangeStatus(value, definition?.reference_range);
            return (
              <span
                className={`pk-metric${status === "high" || status === "low" ? " is-out" : ""}`}
                key={feature}
                title={`${definition?.label ?? feature}: ${formatFeatureValue(value, definition)}`}
              >
                <small>{short}</small>
                {/* the number alone fits the card; the full value with its unit is in the tooltip and read aloud */}
                <b aria-hidden="true">
                  {typeof value === "number" ? displayNumber(value, definition) : String(value ?? "–")}
                  {definition?.unit === "%" ? "%" : ""}
                  {status === "high" ? " ↑" : status === "low" ? " ↓" : ""}
                </b>
                <span className="pk-sr">
                  {formatFeatureValue(value, definition)}
                  {status === "high" ? ", high" : status === "low" ? ", low" : ""}
                </span>
              </span>
            );
          })}
        </span>
      </button>
    </li>
  );
}

/**
 * The first screen: the clinician picks whose results to open (or starts a new patient) before the workspace
 * appears. Uses the Studio theme in Studio and the light look in Classic.
 */
export function PatientPicker() {
  const profileQuery = useApiProfile();
  const featuresQuery = useFeatures();
  const samplesQuery = useSamples();
  const uiVersion = useUiStore((state) => state.uiVersion);
  const setPatientChosen = useUiStore((state) => state.setPatientChosen);
  const theme = useStudioStore((state) => state.theme);
  const [query, setQuery] = useState("");
  const features = featuresQuery.data;
  const definitions = useMemo(
    () => new Map((features ?? []).map((feature) => [feature.name, feature])),
    [features],
  );
  const samples = samplesQuery.data ?? [];
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = samples.filter((sample) => {
    if (!words.length) {
      return true;
    }
    const haystack = [
      sample.label,
      chestPain(sample.features["Chest Pain"]),
      ...CONDITIONS.filter(({ name, present }) => present(sample.features[name])).map((c) => c.label),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  const open = (sample: SamplePatient) => {
    usePatientStore.getState().setFromSample(sample);
    setPatientChosen(true);
  };
  const openNew = () => {
    if (!features) {
      return;
    }
    usePatientStore
      .getState()
      .setFeatures(Object.fromEntries(features.map((feature) => [feature.name, feature.default])));
    setPatientChosen(true);
  };

  const loading = profileQuery.isPending || (profileQuery.isSuccess && (featuresQuery.isPending || samplesQuery.isPending));
  const error = profileQuery.isError
    ? profileQuery.error.message
    : featuresQuery.isError
      ? featuresQuery.error.message
      : samplesQuery.isError
        ? samplesQuery.error.message
        : null;

  return (
    <div className={`picker picker-${uiVersion}`} data-theme={uiVersion === "studio" ? theme : "classic"}>
      <div aria-hidden="true" className="pk-backdrop">
        <i className="pk-orb pk-orb-a" />
        <i className="pk-orb pk-orb-b" />
        <svg className="pk-ecg" preserveAspectRatio="none" viewBox="0 0 1200 100">
          <path d="M0 60h300l18-40 24 80 20-56 14 16h250l18-40 24 80 20-56 14 16h498" />
        </svg>
      </div>
      <header className="pk-head">
        <span className="pk-brand">
          <span aria-hidden="true" className="pk-glyph">
            ♥
          </span>
          {uiVersion === "studio" ? (
            <>
              CardioClarity <em>Studio</em>
            </>
          ) : (
            "CardioClarity"
          )}
        </span>
        <span className="pk-safety">{DISCLAIMER_LINE}</span>
      </header>
      <main aria-labelledby="pk-title" className="pk-main">
        <div className="pk-intro">
          <div>
            <h1 id="pk-title">Choose a patient</h1>
            <p>Select whose heart-risk results to open. You can switch patients at any time.</p>
          </div>
          <button
            className="pk-new"
            disabled={!features}
            onClick={openNew}
            title="Start from typical values and enter the patient's own details"
            type="button"
          >
            <span aria-hidden="true" className="pk-new-plus">
              +
            </span>
            <span className="pk-new-text">
              <strong>New patient</strong>
              <small>Enter details from scratch</small>
            </span>
          </button>
        </div>
        {loading ? (
          <div className="pk-state">
            <HeartbeatLoader steps={["Connecting to the model", "Loading patients"]} title="Loading patients" />
          </div>
        ) : error ? (
          <div className="pk-state pk-error" role="alert">
            <p>The patient list could not be loaded: {error}</p>
            <button className="pk-btn" onClick={() => void profileQuery.refetch()} type="button">
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="pk-tools">
              <label className="pk-search">
                <span className="pk-sr">Search patients</span>
                <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search: age, woman, diabetes, typical…"
                  type="search"
                  value={query}
                />
              </label>
              <span aria-live="polite" className="pk-count">
                {shown.length} of {samples.length} patients
              </span>
            </div>
            <ul aria-label="Patients" className="pk-grid">
              {shown.map((sample, index) => (
                <PatientCard definitions={definitions} index={index} key={sample.id} onOpen={open} sample={sample} />
              ))}
            </ul>
            {samples.some((sample) => !sample.synthetic) && (
              <p className="pk-foot">
                Patients from the study dataset, shown for demonstration. Each is scored by a model that never saw them.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
