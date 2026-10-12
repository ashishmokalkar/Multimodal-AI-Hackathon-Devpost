import { useMemo, useRef, useState } from "react";
import { useApiProfile, useDataset, useFeatures, useSamples } from "../../api/hooks";
import type { FeatureDefinition, FeatureValue, SamplePatient } from "../../api/types";
import { formatFeatureValue, rangeStatus } from "../../lib/insights";
import { displayNumber } from "../../lib/units";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import { DISCLAIMER_LINE } from "../safety/disclaimer";
import { PatientAvatar } from "../patient/PatientAvatar";
import { AddPatientPanel } from "./AddPatientPanel";
import { IconHeart, IconShield } from "../studio/icons";
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

interface MetricReading {
  feature: string;
  short: string;
  label: string;
  text: string;
  full: string;
  out: "high" | "low" | null;
}

/** The headline measurements, as short text and in full (with unit) for the tooltip and screen readers. */
function readMetrics(sample: SamplePatient, definitions: Map<string, FeatureDefinition>): MetricReading[] {
  return METRICS.filter(({ name }) => definitions.has(name)).map(({ name, short }) => {
    const definition = definitions.get(name);
    const value = sample.features[name];
    const status = rangeStatus(value, definition?.reference_range);
    return {
      feature: name,
      short,
      label: definition?.label ?? name,
      text: `${typeof value === "number" ? displayNumber(value, definition) : String(value ?? "–")}${
        definition?.unit === "%" ? "%" : ""
      }`,
      full: formatFeatureValue(value, definition),
      out: status === "high" || status === "low" ? status : null,
    };
  });
}

function conditionsOf(sample: SamplePatient) {
  return CONDITIONS.filter(({ name, present }) => present(sample.features[name]));
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
  const conditions = conditionsOf(sample);
  return (
    <li style={{ ["--i" as string]: index }}>
      <button className="pk-card" onClick={() => onOpen(sample)} type="button">
        <span className="pk-card-top">
          <PatientAvatar
            age={typeof sample.features.Age === "number" ? sample.features.Age : null}
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
          {readMetrics(sample, definitions).map((metric) => (
            <span
              className={`pk-metric${metric.out ? " is-out" : ""}`}
              key={metric.feature}
              title={`${metric.label}: ${metric.full}`}
            >
              <small>{metric.short}</small>
              {/* the number alone fits the card; the full value with its unit is in the tooltip and read aloud */}
              <b aria-hidden="true">
                {metric.text}
                {metric.out === "high" ? " ↑" : metric.out === "low" ? " ↓" : ""}
              </b>
              <span className="pk-sr">
                {metric.full}
                {metric.out ? `, ${metric.out}` : ""}
              </span>
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}

/** One line of the full patient list: who, why they came in, history, and only the measurements out of range. */
function PatientRow({
  sample,
  definitions,
  onOpen,
}: {
  sample: SamplePatient;
  definitions: Map<string, FeatureDefinition>;
  onOpen: (sample: SamplePatient) => void;
}) {
  const [name, who] = splitLabel(sample.label);
  const sex = sample.features.Sex;
  const conditions = conditionsOf(sample);
  const abnormal = readMetrics(sample, definitions).filter((metric) => metric.out);
  return (
    <li>
      <button className="pk-row" onClick={() => onOpen(sample)} type="button">
        <PatientAvatar
          age={typeof sample.features.Age === "number" ? sample.features.Age : null}
          className="pk-avatar"
          sex={sex === "Female" || sex === "Male" ? sex : null}
          size={32}
        />
        <span className="pk-row-name">
          <strong>{name}</strong>
          <span>{who}</span>
        </span>
        <span className="pk-row-pain">{chestPain(sample.features["Chest Pain"])}</span>
        <span className={`pk-row-history${conditions.length ? "" : " is-none"}`}>
          {conditions.length ? conditions.map((condition) => condition.label).join(" · ") : "No listed conditions"}
        </span>
        <span className="pk-row-out">
          {abnormal.map((metric) => (
            <span key={metric.feature} title={`${metric.label}: ${metric.full}`}>
              <span aria-hidden="true">
                {metric.short} <b>{metric.text}{metric.out === "high" ? "↑" : "↓"}</b>
              </span>
              <span className="pk-sr">
                {metric.label} {metric.full}, {metric.out}
              </span>
            </span>
          ))}
        </span>
        <span aria-hidden="true" className="pk-open">
          Open →
        </span>
      </button>
    </li>
  );
}

/**
 * The first screen, as two doors: open a patient (four featured, or search all of them) or add a new one (ABHA,
 * reports, speech, a spreadsheet or the form). Uses the Studio theme in Studio and the light look in Classic.
 */
export function PatientPicker() {
  const profileQuery = useApiProfile();
  const featuresQuery = useFeatures();
  const samplesQuery = useSamples();
  const uiVersion = useUiStore((state) => state.uiVersion);
  const setPatientChosen = useUiStore((state) => state.setPatientChosen);
  const theme = useStudioStore((state) => state.theme);
  const [query, setQuery] = useState("");
  // the featured patients first; every dataset patient (fetched on request) behind "View all patients"
  const [showAll, setShowAll] = useState(false);
  // the full list is fetched once the search box is used (or "View all" pressed), so results appear at once
  const [wantDataset, setWantDataset] = useState(false);
  const datasetQuery = useDataset(showAll || wantDataset);
  const searchInput = useRef<HTMLInputElement>(null);
  const features = featuresQuery.data;
  const definitions = useMemo(
    () => new Map((features ?? []).map((feature) => [feature.name, feature])),
    [features],
  );
  const samples = samplesQuery.data ?? [];
  const everyone = datasetQuery.data ?? [];
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = everyone.filter((sample) => {
    if (!words.length) {
      return true;
    }
    const haystack = [
      sample.label,
      chestPain(sample.features["Chest Pain"]),
      ...conditionsOf(sample).map((c) => c.label),
    ]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  const footnote = samples.some((sample) => !sample.synthetic) && (
    <p className="pk-foot">
      Patients from the study dataset, shown for demonstration. Each is scored by a model that never saw them.
    </p>
  );

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
      </div>
      <header className="pk-head">
        <span className="pk-brand">
          <span aria-hidden="true" className="pk-glyph">
            <IconHeart size={21} />
          </span>
          <span>
            CardioClarity{uiVersion === "studio" && <> <em>Studio</em></>}
          </span>
        </span>
        <span className="pk-safety">
          <IconShield size={14} />
          <span>{DISCLAIMER_LINE}</span>
        </span>
      </header>
      <main aria-labelledby="pk-title" className={`pk-main${showAll ? "" : " is-featured"}`}>
        <div className="pk-intro">
          <div>
            <h1 id="pk-title">Choose a patient</h1>
            <p>Open a study patient, or bring in your own. You can switch patients at any time.</p>
          </div>
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
            <div className={`pk-doors${showAll ? " is-list" : ""}`}>
              <section aria-labelledby="pk-open-title" className="pk-door pk-door-open">
                <h2 className="pk-door-title" id="pk-open-title">
                  {showAll ? "All patients" : "Open a patient"}
                </h2>
                {/* one search box for both views (it stays mounted, so typing carries on): typing on the featured view
                    opens the full list with the matches */}
                <div className="pk-tools">
                  {showAll && (
                    <button
                      className="pk-back"
                      onClick={() => {
                        setShowAll(false);
                        setQuery("");
                      }}
                      type="button"
                    >
                      <span aria-hidden="true">←</span> Featured patients
                    </button>
                  )}
                  <label className="pk-search">
                    <span className="pk-sr">Search all patients</span>
                    <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      onChange={(event) => {
                        setQuery(event.target.value);
                        if (event.target.value.trim()) {
                          setShowAll(true);
                        }
                      }}
                      onFocus={() => setWantDataset(true)}
                      placeholder="Search all patients: number, age, woman, diabetes…"
                      ref={searchInput}
                      type="search"
                      value={query}
                    />
                  </label>
                  {showAll && (
                    <span aria-live="polite" className="pk-count">
                      {datasetQuery.data ? `${shown.length} of ${everyone.length} patients` : ""}
                    </span>
                  )}
                </div>
                {showAll ? (
                  <>
                    {datasetQuery.isError ? (
                      <div className="pk-state pk-state-small pk-error" role="alert">
                        <p>The full list could not be loaded: {datasetQuery.error.message}</p>
                        <button className="pk-btn" onClick={() => void datasetQuery.refetch()} type="button">
                          Try again
                        </button>
                      </div>
                    ) : !datasetQuery.data ? (
                      <div className="pk-state pk-state-small">
                        <HeartbeatLoader steps={["Loading every patient"]} title="Loading patients" />
                      </div>
                    ) : shown.length ? (
                      <ul aria-label="All patients" className="pk-list">
                        {shown.map((sample) => (
                          <PatientRow definitions={definitions} key={sample.id} onOpen={open} sample={sample} />
                        ))}
                      </ul>
                    ) : (
                      <p className="pk-empty">No patient matches “{query.trim()}”.</p>
                    )}
                  </>
                ) : (
                  <>
                    <ul aria-label="Featured patients" className="pk-grid">
                      {samples.map((sample, index) => (
                        <PatientCard definitions={definitions} index={index} key={sample.id} onOpen={open} sample={sample} />
                      ))}
                    </ul>
                    <div className="pk-after">
                      <button
                        className="pk-all"
                        onClick={() => {
                          setShowAll(true);
                          searchInput.current?.focus();
                        }}
                        type="button"
                      >
                        View all patients <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </>
                )}
              </section>
              {!showAll && <AddPatientPanel manualReady={Boolean(features)} onManual={openNew} />}
            </div>
            {footnote}
            {!showAll && (
              // the heartbeat trace runs edge to edge just under the content, so it never crosses the text
              <svg aria-hidden="true" className="pk-ecg" preserveAspectRatio="none" viewBox="0 0 1200 100">
                <path d="M0 60h300l18-40 24 80 20-56 14 16h250l18-40 24 80 20-56 14 16h498" />
              </svg>
            )}
          </>
        )}
      </main>
    </div>
  );
}
