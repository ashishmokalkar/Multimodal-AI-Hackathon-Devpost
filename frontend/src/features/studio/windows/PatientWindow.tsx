import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDataset, useSamples } from "../../../api/hooks";
import type { FeatureDefinition, FeatureValue } from "../../../api/types";
import { prettyUnit } from "../../../lib/insights";
import { displayUnit } from "../../../lib/units";
import { usePatientStore } from "../../../store/patientStore";
import { PatientAvatar } from "../../patient/PatientAvatar";
import { UnitNumberInput } from "../../units/UnitNumberInput";
import { UnitToggle } from "../../units/UnitToggle";
import { FloatingWindow } from "../FloatingWindow";
import { useReportStore } from "../../start/reportStore";
import { IconChevronLeft, IconChevronRight, IconClose, IconEdit, IconHeart, IconUser } from "../icons";
import {
  angiogramLine,
  checkAngiogram,
  complaintLine,
  summarisePatient,
  type Measurement,
} from "../patientSummary";
import { useStudioData } from "../studioData";
import { pulseRate } from "../studioModel";
import { useStudioStore } from "../studioStore";
import { useCompact } from "../useCompact";

/** "Dataset patient 20: 65-year-old woman" -> ["Patient 20", "65-year-old woman"]. */
function splitLabel(label: string): [string, string] {
  const [head, tail] = label.split(":");
  return [head.replace("Dataset patient", "Patient").trim(), (tail ?? "").trim()];
}

const GROUP_LABEL: Record<string, string> = {
  Demographics: "History",
  "Symptoms/Exam": "Exam",
};

const TARGET_LABEL = { cad: "CAD", LAD: "LAD", LCX: "LCX", RCA: "RCA" } as const;

function FeatureControl({ feature, value }: { feature: FeatureDefinition; value: FeatureValue }) {
  const update = usePatientStore((state) => state.updateFeature);
  const id = `studio-feature-${feature.name}`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {feature.label}
        {displayUnit(feature) && <small> {prettyUnit(displayUnit(feature))}</small>}
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
              feature.options?.find((option) => String(option) === event.target.value) ??
                event.target.value,
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
        <UnitNumberInput
          definition={feature}
          id={id}
          onValueChange={(next) => update(feature.name, next)}
          value={value}
        />
      )}
    </label>
  );
}

/** Every input, by group, with the scoring status: in a wide panel beside the window (inline on phones). */
function InputEditor({ onClose }: { onClose: () => void }) {
  const { features } = useStudioData();
  const values = usePatientStore((state) => state.features);
  const status = usePatientStore((state) => state.predictionStatus);
  const fromReports = useReportStore((state) => state.fromReports);
  const [group, setGroup] = useState<string | null>(null);
  const groups = useMemo(
    () => Array.from(new Set(features.map((feature) => feature.group))),
    [features],
  );
  const activeGroup = group ?? groups[0] ?? null;
  return (
    <div className="editor">
      <div aria-label="Input group" className="sl-segmented" role="tablist">
        {groups.map((item) => (
          <button
            aria-selected={item === activeGroup}
            key={item}
            onClick={() => setGroup(item)}
            role="tab"
            type="button"
          >
            {GROUP_LABEL[item] ?? item}
          </button>
        ))}
      </div>
      {activeGroup === "Lab" && <UnitToggle className="studio-units" />}
      <div className="editor-fields">
        {features
          .filter((feature) => feature.group === activeGroup)
          .map((feature) => {
            const read = fromReports?.[feature.name];
            const value = values[feature.name] ?? feature.default;
            return (
              <div className="editor-field" key={feature.name}>
                <FeatureControl feature={feature} value={value} />
                {read && read.value === value && (
                  <p className="from-report" title={read.evidence}>
                    Read from {read.document}
                  </p>
                )}
              </div>
            );
          })}
      </div>
      <div className="editor-foot">
        <span aria-live="polite" className={`sl-status sl-status-${status}`}>
          {status === "pending" || status === "auto-updating" || status === "edited"
            ? "Scoring…"
            : status === "invalid"
              ? "Check the inputs"
              : status === "error"
                ? "Scoring failed"
                : status === "ready"
                  ? "Result up to date"
                  : ""}
        </span>
        <button className="btn-ghost" onClick={onClose} type="button">
          Done
        </button>
      </div>
    </div>
  );
}

/** The editor as a panel floating to the right of the Patient window, so the inputs have room. */
function EditorPanel({ root, onClose }: { root: HTMLElement; onClose: () => void }) {
  const rect = useStudioStore((state) => state.rects.patient);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  return createPortal(
    <section
      aria-label="Edit patient inputs"
      className="patient-editor"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      ref={panel}
      style={{ left: rect.x + rect.w + 12, top: rect.y }}
      tabIndex={-1}
    >
      <header className="patient-editor-head">
        <IconEdit size={14} />
        <h2>Edit inputs</h2>
        <button aria-label="Close the editor" className="sw-btn" onClick={onClose} type="button">
          <IconClose size={14} />
        </button>
      </header>
      <InputEditor onClose={onClose} />
    </section>,
    root,
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="pt-chips">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="pt-none">{empty}</p>
  );
}

function MeasurementRow({ item }: { item: Measurement }) {
  return (
    <li className={`pt-measure is-${item.status}`}>
      <span>{item.label}</span>
      <b>
        {item.valueText}
        {item.status === "high" && <em aria-label="above normal"> ↑</em>}
        {item.status === "low" && <em aria-label="below normal"> ↓</em>}
      </b>
    </li>
  );
}

/**
 * Who the patient is: first a short summary (complaint, abnormal results, angiogram), then on request the full profile
 * in a clinician's reading order: what they came in with, what the tests found, their history,
 * the measurements outside the normal range, and what the angiogram really showed. Facts only: what the model makes
 * of them is the Why window's job.
 */
export function PatientWindow() {
  const featured = useSamples().data ?? [];
  const { features, accepted } = useStudioData();
  const values = usePatientStore((state) => state.features);
  const sampleId = usePatientStore((state) => state.selectedSampleId);
  // a patient opened from the full list is looked up there (fetched if needed), and stepping walks that list
  const isFeatured = featured.some((sample) => sample.id === sampleId);
  const dataset = useDataset(sampleId !== null && !isFeatured).data;
  const samples = isFeatured || !dataset ? featured : dataset;
  const setFromSample = usePatientStore((state) => state.setFromSample);
  const compact = useCompact();
  const [editorRoot, setEditorRoot] = useState<HTMLElement | null>(null);
  const [editingInline, setEditingInline] = useState(false);
  const editing = editorRoot !== null || editingInline;
  const index = samples.findIndex((sample) => sample.id === sampleId);
  const sample = index >= 0 ? samples[index] : null;
  const fromReports = useReportStore((state) => state.fromReports);
  const reportFiles = useReportStore((state) => state.documents);
  const [name, description] = sample
    ? splitLabel(sample.label)
    : fromReports
      ? [
          "Patient from reports",
          `${Object.keys(fromReports).length} values read from ${reportFiles.length} report${reportFiles.length === 1 ? "" : "s"}`,
        ]
      : ["Custom patient", "Edited inputs"];
  const summary = useMemo(() => summarisePatient(values, features), [features, values]);
  const age = typeof values.Age === "number" ? values.Age : null;
  const sex = values.Sex === "Female" || values.Sex === "Male" ? values.Sex : null;
  // the angiogram is compared with the model only for the dataset patient's own, unedited inputs
  const edited =
    sample !== null &&
    Object.entries(sample.features).some(([feature, value]) => values[feature] !== value);
  const truth = sample?.ground_truth ?? null;
  const check = truth && accepted && !edited ? checkAngiogram(truth, accepted) : null;
  const full = useStudioStore((state) => state.patientFull);
  const setFull = useStudioStore((state) => state.setPatientFull);
  const angio = truth ? angiogramLine(truth, check) : null;

  const step = (by: number) => {
    if (!samples.length) {
      return;
    }
    useReportStore.getState().clear();
    setFromSample(samples[(Math.max(index, 0) + by + samples.length) % samples.length]);
  };
  const closeEditor = () => {
    setEditorRoot(null);
    setEditingInline(false);
  };
  const toggleEditor = (button: HTMLElement) => {
    if (editing) {
      closeEditor();
    } else if (compact) {
      setEditingInline(true);
    } else {
      setEditorRoot(button.closest<HTMLElement>(".studio"));
    }
  };

  return (
    <FloatingWindow
      actions={
        <>
          <button aria-label="Previous patient" className="sw-btn" onClick={() => step(-1)} type="button">
            <IconChevronLeft size={14} />
          </button>
          <button aria-label="Next patient" className="sw-btn" onClick={() => step(1)} type="button">
            <IconChevronRight size={14} />
          </button>
        </>
      }
      focusableBody
      icon={<IconUser />}
      id="patient"
      title="Patient"
    >
      <div className="patient">
        <div className="patient-id">
          <PatientAvatar age={age} className="avatar" sex={sex} size={52} />
          <div className="patient-name">
            <select
              aria-label="Choose a patient"
              className="patient-select"
              onChange={(event) => {
                const next = featured.find((item) => item.id === event.target.value);
                if (next) {
                  setFromSample(next);
                }
              }}
              value={sampleId ?? ""}
            >
              {!sample && <option value="">Custom patient</option>}
              {sample && !isFeatured && <option value={sample.id}>{name}</option>}
              {featured.map((item) => (
                <option key={item.id} value={item.id}>
                  {splitLabel(item.label)[0]}
                </option>
              ))}
            </select>
            <span className="muted-xs">
              {description || name}
              {accepted && !accepted.mock ? ` · BMI ${accepted.derived.BMI.toFixed(1)}` : ""}
            </span>
          </div>
          <div className="pulse-badge" title="Resting pulse: the 3D heart beats at this rate">
            <IconHeart size={13} />
            {Math.round(pulseRate(values.PR))}
            <small>bpm</small>
          </div>
        </div>

        {editingInline ? (
          <InputEditor onClose={closeEditor} />
        ) : !full ? (
          // the summary a clinician scans first: why they came in, what is abnormal, what the angiogram showed
          <dl className="pt-summary">
            <div>
              <dt>Complaint</dt>
              <dd>{complaintLine(summary)}</dd>
            </div>
            <div>
              <dt>Abnormal</dt>
              <dd>
                {summary.outOfRange.length
                  ? summary.outOfRange.map((item, i) => (
                      <span className="pt-abnormal" key={item.feature}>
                        {i > 0 && <span aria-hidden="true"> · </span>}
                        {item.label} <b>{item.valueText.split(" ")[0]}</b>
                        <em aria-label={item.status === "high" ? "above normal" : "below normal"}>
                          {item.status === "high" ? "↑" : "↓"}
                        </em>
                      </span>
                    ))
                  : "None: all measured values in range"}
              </dd>
            </div>
            {angio && (
              <div>
                <dt>Angiogram</dt>
                <dd>
                  {angio.text}
                  {angio.score && (
                    <span className={`pt-score${angio.allMatched ? " is-all" : ""}`}>{angio.score}</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <>
            <Section title="Presenting with">
              <Chips empty="No symptoms recorded" items={summary.presenting} />
            </Section>
            {summary.findings.length > 0 && (
              <Section title="ECG and echo">
                <Chips empty="" items={summary.findings} />
              </Section>
            )}
            <Section title="History">
              <Chips
                empty={`None of the ${summary.historyChecked} recorded conditions`}
                items={summary.history}
              />
            </Section>
            <Section title="Measurements">
              {summary.outOfRange.length > 0 && (
                <ul aria-label="Outside the normal range" className="pt-measures">
                  {summary.outOfRange.map((item) => (
                    <MeasurementRow item={item} key={item.feature} />
                  ))}
                </ul>
              )}
              {summary.normal.length > 0 && (
                <p className="pt-normal">
                  <span>In range:</span>{" "}
                  {summary.normal.map((item) => `${item.label} ${item.valueText}`).join(" · ")}
                </p>
              )}
            </Section>
            {truth && (
              <Section title="Actual angiogram">
                {check ? (
                  <p className={`pt-match${check.matched === 4 ? " is-all" : ""}`}>
                    {check.matched === 4 ? "✔ " : ""}Model matched {check.matched} of 4
                  </p>
                ) : (
                  <p className="pt-none">
                    {edited ? "Inputs edited: shown for the original patient" : "Waiting for the result"}
                  </p>
                )}
                <ul className="pt-angio">
                  {(check?.items ??
                    (["cad", "LAD", "LCX", "RCA"] as const).map((target) => ({
                      target,
                      narrowed: target === "cad" ? truth.cad : truth.vessels[target],
                      flagged: false,
                      matched: true,
                    }))
                  ).map((item) => (
                    <li className={item.narrowed ? "is-narrowed" : "is-clear"} key={item.target}>
                      <i aria-hidden="true" />
                      <b>{TARGET_LABEL[item.target]}</b>
                      <span>{item.narrowed ? "Narrowed" : "Clear"}</span>
                      {check && !item.matched && (
                        <em>{item.narrowed ? "model missed" : "model flagged"}</em>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        <div className="patient-foot">
          {!editingInline && (
            <button
              aria-expanded={full}
              className="pt-more"
              onClick={() => setFull(!full)}
              type="button"
            >
              {full ? "Show less" : "Show full profile"}
              <svg aria-hidden="true" fill="none" height="13" viewBox="0 0 14 14" width="13">
                <path
                  d={full ? "M7 12V2M2.5 6.5 7 2l4.5 4.5" : "M7 2v10M2.5 7.5 7 12l4.5-4.5"}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          )}
          <button
            aria-expanded={editing}
            aria-label={editing ? "Close editor" : "Edit inputs"}
            className="btn-ghost"
            onClick={(event) => toggleEditor(event.currentTarget)}
            type="button"
          >
            <IconEdit size={13} />
            {editing ? "Close editor" : "Edit"}
          </button>
        </div>
      </div>
      {editorRoot && <EditorPanel onClose={closeEditor} root={editorRoot} />}
    </FloatingWindow>
  );
}
