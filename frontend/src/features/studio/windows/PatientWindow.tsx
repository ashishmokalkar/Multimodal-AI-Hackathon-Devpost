import { useMemo, useState } from "react";
import { useSamples } from "../../../api/hooks";
import type { FeatureDefinition, FeatureValue } from "../../../api/types";
import { formatFeatureValue, rangeStatus } from "../../../lib/insights";
import { usePatientStore } from "../../../store/patientStore";
import { FloatingWindow } from "../FloatingWindow";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconHeart,
  IconUser,
} from "../icons";
import { useStudioData } from "../studioData";
import { pulseRate } from "../studioModel";

/** History items shown as lit or unlit tiles: present conditions light up. */
const CONDITIONS: { name: string; short: string }[] = [
  { name: "DM", short: "Diabetes" },
  { name: "HTN", short: "High BP" },
  { name: "DLP", short: "Cholesterol" },
  { name: "Smoking", short: "Smoker" },
  { name: "FH", short: "Family hx" },
  { name: "CRF", short: "Kidney" },
  { name: "CVA", short: "Stroke" },
  { name: "CHF", short: "Heart failure" },
];

/** Measurements worth seeing without opening the editor. */
const KEY_METRICS = ["BP", "LDL", "FBS", "EF-TTE"];

function present(name: string, value: FeatureValue | undefined): boolean {
  if (name === "Smoking") {
    return value === "Current" || value === "Former";
  }
  return value === true;
}

/** "Dataset patient 20: 65-year-old woman" -> ["Patient 20", "65-year-old woman"]. */
function splitLabel(label: string): [string, string] {
  const [head, tail] = label.split(":");
  return [head.replace("Dataset patient", "Patient").trim(), (tail ?? "").trim()];
}

function FeatureControl({
  feature,
  value,
}: {
  feature: FeatureDefinition;
  value: FeatureValue;
}) {
  const update = usePatientStore((state) => state.updateFeature);
  const id = `studio-feature-${feature.name}`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {feature.label}
        {feature.unit && <small> {feature.unit}</small>}
      </span>
      {feature.type === "boolean" ? (
        <span className="sl-switch">
          <input
            checked={value === true}
            id={id}
            onChange={(event) => update(feature.name, event.target.checked)}
            type="checkbox"
          />
          <i aria-hidden="true" />
        </span>
      ) : feature.type === "categorical" ? (
        <select
          id={id}
          onChange={(event) =>
            update(
              feature.name,
              feature.options?.find(
                (option) => String(option) === event.target.value,
              ) ?? event.target.value,
            )
          }
          value={String(value)}
        >
          {feature.options?.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          inputMode="decimal"
          max={feature.max}
          min={feature.min}
          onChange={(event) =>
            update(
              feature.name,
              event.target.value === "" ? "" : event.target.valueAsNumber,
            )
          }
          step="any"
          type="number"
          value={typeof value === "number" && Number.isFinite(value) ? value : ""}
        />
      )}
    </label>
  );
}

/** Who the patient is, at a glance; every input is one click away in the editor. */
export function PatientWindow() {
  const samples = useSamples().data ?? [];
  const { features } = useStudioData();
  const values = usePatientStore((state) => state.features);
  const sampleId = usePatientStore((state) => state.selectedSampleId);
  const status = usePatientStore((state) => state.predictionStatus);
  const setFromSample = usePatientStore((state) => state.setFromSample);
  const [editing, setEditing] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const definitions = useMemo(
    () => new Map(features.map((feature) => [feature.name, feature])),
    [features],
  );
  const groups = useMemo(
    () => Array.from(new Set(features.map((feature) => feature.group))),
    [features],
  );
  const activeGroup = group ?? groups[0] ?? null;
  const index = samples.findIndex((sample) => sample.id === sampleId);
  const sample = index >= 0 ? samples[index] : null;
  const [name, description] = sample
    ? splitLabel(sample.label)
    : ["Custom patient", "Edited inputs"];

  const step = (by: number) => {
    if (!samples.length) {
      return;
    }
    const next = samples[(Math.max(index, 0) + by + samples.length) % samples.length];
    setFromSample(next);
  };

  const truth = sample?.ground_truth;

  return (
    <FloatingWindow
      actions={
        <>
          <button
            aria-label="Previous patient"
            className="sw-btn"
            onClick={() => step(-1)}
            type="button"
          >
            <IconChevronLeft size={14} />
          </button>
          <button
            aria-label="Next patient"
            className="sw-btn"
            onClick={() => step(1)}
            type="button"
          >
            <IconChevronRight size={14} />
          </button>
        </>
      }
      icon={<IconUser />}
      id="patient"
      title="Patient"
    >
      <div className="patient">
        <div className="patient-id">
          <div className="avatar" aria-hidden="true">
            {values.Sex === "Female" ? "F" : values.Sex === "Male" ? "M" : "?"}
          </div>
          <div className="patient-name">
            <select
              aria-label="Choose a patient"
              className="patient-select"
              onChange={(event) => {
                const next = samples.find((item) => item.id === event.target.value);
                if (next) {
                  setFromSample(next);
                }
              }}
              value={sampleId ?? ""}
            >
              {!sample && <option value="">Custom patient</option>}
              {samples.map((item) => (
                <option key={item.id} value={item.id}>
                  {splitLabel(item.label)[0]}
                </option>
              ))}
            </select>
            <span className="muted-xs">{description || name}</span>
          </div>
          <div
            className="pulse-badge"
            title="Resting pulse; the 3D heart beats at this rate"
          >
            <IconHeart size={13} />
            {Math.round(pulseRate(values.PR))}
          </div>
        </div>

        {!editing ? (
          <>
            <div className="conditions" aria-label="Medical history">
              {CONDITIONS.filter(({ name: feature }) => definitions.has(feature)).map(
                ({ name: feature, short }) => {
                  const on = present(feature, values[feature]);
                  return (
                    <span
                      className={`condition${on ? " is-on" : ""}`}
                      key={feature}
                      title={`${definitions.get(feature)?.label}: ${formatFeatureValue(values[feature], definitions.get(feature))}`}
                    >
                      {short}
                    </span>
                  );
                },
              )}
            </div>
            <div className="metrics">
              {KEY_METRICS.filter((feature) => definitions.has(feature)).map(
                (feature) => {
                  const definition = definitions.get(feature);
                  const value = values[feature];
                  const state = rangeStatus(value, definition?.reference_range);
                  return (
                    <div
                      className={`metric${state === "high" || state === "low" ? " is-out" : ""}`}
                      key={feature}
                      title={definition?.description}
                    >
                      <span className="metric-label">
                        {feature === "EF-TTE" ? "EF" : feature}
                      </span>
                      <span className="metric-value">
                        {typeof value === "number" ? value : "–"}
                        {state === "high" ? " ↑" : state === "low" ? " ↓" : ""}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
            {truth && (
              <div className="truth" title="What the angiogram actually showed for this dataset patient">
                <span className="muted-xs">Angiogram</span>
                {(["cad", "LAD", "LCX", "RCA"] as const).map((key) => {
                  const positive =
                    key === "cad" ? truth.cad : truth.vessels[key];
                  return (
                    <span className={`truth-chip${positive ? " is-pos" : ""}`} key={key}>
                      {key === "cad" ? "CAD" : key}
                      {positive ? " ✓" : " –"}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="editor">
            <div className="sl-segmented" role="tablist" aria-label="Input group">
              {groups.map((item) => (
                <button
                  aria-selected={item === activeGroup}
                  key={item}
                  onClick={() => setGroup(item)}
                  role="tab"
                  type="button"
                >
                  {item === "Symptoms/Exam" ? "Exam" : item === "Demographics" ? "History" : item}
                </button>
              ))}
            </div>
            <div className="editor-fields">
              {features
                .filter((feature) => feature.group === activeGroup)
                .map((feature) => (
                  <FeatureControl
                    feature={feature}
                    key={feature.name}
                    value={values[feature.name] ?? feature.default}
                  />
                ))}
            </div>
          </div>
        )}

        <div className="patient-foot">
          <button
            aria-pressed={editing}
            className="btn-ghost"
            onClick={() => setEditing(!editing)}
            type="button"
          >
            <IconEdit size={13} />
            {editing ? "Done" : "Edit inputs"}
          </button>
          <span className={`sl-status sl-status-${status}`}>
            {status === "pending" || status === "auto-updating"
              ? "Scoring…"
              : status === "invalid"
                ? "Check inputs"
                : status === "error"
                  ? "Failed"
                  : status === "ready"
                    ? "Up to date"
                    : ""}
          </span>
        </div>
      </div>
    </FloatingWindow>
  );
}
