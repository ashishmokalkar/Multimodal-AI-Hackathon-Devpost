import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureDefinition, FeatureValue } from "../../api/types";
import { Answer } from "./ReportUpload";

const GROUP_NAME: Record<string, string> = {
  Demographics: "Patient details",
  "Symptoms/Exam": "Symptoms & exam",
  ECG: "ECG",
  Lab: "Blood tests",
  Echo: "Echo",
};

function hint(feature: FeatureDefinition): string {
  const range = feature.reference_range;
  const low = range?.low;
  const high = range?.high;
  const normal =
    low !== undefined && high !== undefined
      ? `normal ${low}–${high}`
      : low !== undefined
        ? `normal ≥${low}`
        : high !== undefined
          ? `normal ≤${high}`
          : "";
  return [feature.unit, normal].filter(Boolean).join(" · ");
}

/**
 * "Fill in manually": every input on one simple form, a tab per group, starting at typical values. Numbers show their
 * unit and normal range; yes/no and options are buttons. "Open patient and score" opens the heart with these values.
 */
export function ManualEntry({
  features,
  onClose,
  onOpen,
}: {
  features: FeatureDefinition[];
  onClose: () => void;
  onOpen: (values: Record<string, FeatureValue>) => void;
}) {
  const groups = useMemo(() => Array.from(new Set(features.map((feature) => feature.group))), [features]);
  const [group, setGroup] = useState(groups[0]);
  const [values, setValues] = useState<Record<string, FeatureValue>>(() =>
    Object.fromEntries(features.map((feature) => [feature.name, feature.default])),
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialog.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const set = (name: string, value: FeatureValue) => {
    setValues({ ...values, [name]: value });
    setTouched(new Set(touched).add(name));
  };
  const outOfRange = features.filter(
    (feature) =>
      feature.type === "number" &&
      ((feature.min !== undefined && Number(values[feature.name]) < feature.min) ||
        (feature.max !== undefined && Number(values[feature.name]) > feature.max)),
  );
  const index = groups.indexOf(group);

  return (
    <div className="ru-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div aria-labelledby="manual-title" aria-modal="true" className="ru-dialog is-wide" ref={dialog} role="dialog" tabIndex={-1}>
        <header className="ru-head">
          <div>
            <h2 id="manual-title">Fill in manually</h2>
            <p>Every input starts at a typical value. Change what you know; you can edit again later.</p>
          </div>
          <button aria-label="Close" className="ru-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div aria-label="Input group" className="me-tabs" role="tablist">
          {groups.map((item) => {
            const changed = features.filter((feature) => feature.group === item && touched.has(feature.name)).length;
            return (
              <button aria-selected={item === group} key={item} onClick={() => setGroup(item)} role="tab" type="button">
                {GROUP_NAME[item] ?? item}
                {changed > 0 && <span className="me-count">{changed}</span>}
              </button>
            );
          })}
        </div>
        <div className="me-fields" role="tabpanel">
          {features
            .filter((feature) => feature.group === group)
            .map((feature) => {
              const value = values[feature.name];
              const bad = outOfRange.includes(feature);
              return (
                <div className={`me-field${touched.has(feature.name) ? " is-set" : ""}`} key={feature.name}>
                  <div className="me-label">
                    <b>{feature.label}</b>
                    <span className={bad ? "me-bad" : undefined}>
                      {bad ? `allowed ${feature.min}–${feature.max}` : hint(feature)}
                    </span>
                  </div>
                  <Answer feature={feature} onChange={(next) => set(feature.name, next)} value={value} />
                </div>
              );
            })}
        </div>
        <div className="ru-actions">
          <button
            className="ru-secondary"
            disabled={index === 0}
            onClick={() => setGroup(groups[index - 1])}
            type="button"
          >
            Back
          </button>
          {index < groups.length - 1 ? (
            <button className="ru-secondary me-next" onClick={() => setGroup(groups[index + 1])} type="button">
              Next: {GROUP_NAME[groups[index + 1]] ?? groups[index + 1]}
            </button>
          ) : null}
          <button className="ru-primary" disabled={outOfRange.length > 0} onClick={() => onOpen(values)} type="button">
            Open patient and score
          </button>
        </div>
        <p className="ru-note">
          {touched.size} of {features.length} inputs changed. Decision support only; check the values before relying on
          the result.
        </p>
      </div>
    </div>
  );
}
