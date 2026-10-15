import { useEffect, useRef, useState } from "react";
import type { ExtractedValue, FeatureDefinition, FeatureValue } from "../../api/types";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import { mapFhirBundle, type FhirBundle, type MappedValue } from "./fhir";
import { ASK_FIRST, show } from "./intake";
import { Answer } from "./ReportUpload";

/**
 * "Import via ABHA": the clinic shows a QR code, the patient scans it with their ABHA app and approves, and their
 * records arrive through ABDM as a FHIR R4 bundle, which mapFhirBundle turns into the model's inputs. The live
 * connection needs ABDM registration, so the demo stands in for the phone ("simulate approval") and loads a sample
 * bundle made from study patient 174's values; the mapping from FHIR to the inputs is the real code.
 */
const DEMO = `${import.meta.env.BASE_URL}demo/abha/`;
const RECEIVE_MS = 2400;
const KIND_ORDER: MappedValue["kind"][] = ["Patient", "Diagnoses", "Vital signs", "Lab report", "ECG", "Echo"];
const KIND_COLOUR: Record<MappedValue["kind"], string> = {
  Patient: "#60a5fa",
  Diagnoses: "#a78bfa",
  "Vital signs": "#fb923c",
  "Lab report": "#2dd4bf",
  ECG: "#f472b6",
  Echo: "#fbbf24",
};

interface Received {
  values: MappedValue[];
  records: number;
  counts: Record<string, number>;
}

export function AbhaImport({
  features,
  onClose,
  onOpen,
}: {
  features: FeatureDefinition[];
  onClose: () => void;
  onOpen: (values: Record<string, FeatureValue>, read: ExtractedValue[]) => void;
}) {
  const [stage, setStage] = useState<"qr" | "receiving" | "result">("qr");
  const [received, setReceived] = useState<Received | null>(null);
  const [answers, setAnswers] = useState<Record<string, FeatureValue>>({});
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const byName = new Map(features.map((feature) => [feature.name, feature]));

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

  const approve = async () => {
    setStage("receiving");
    setError(null);
    try {
      const [response] = await Promise.all([
        fetch(DEMO + "patient-174-bundle.json"),
        new Promise((resolve) => window.setTimeout(resolve, RECEIVE_MS)),
      ]);
      const bundle = (await response.json()) as FhirBundle;
      const values = mapFhirBundle(bundle, features);
      const counts: Record<string, number> = {};
      for (const entry of bundle.entry ?? []) {
        counts[entry.resource.resourceType] = (counts[entry.resource.resourceType] ?? 0) + 1;
      }
      const known = new Set(values.map((value) => value.name));
      setAnswers(
        Object.fromEntries(
          ASK_FIRST.filter((name) => !known.has(name) && byName.has(name)).map((name) => [
            name,
            byName.get(name)!.default,
          ]),
        ),
      );
      setReceived({ values, records: bundle.entry?.length ?? 0, counts });
      setStage("result");
    } catch {
      setError("The sample ABHA record could not be loaded.");
      setStage("qr");
    }
  };

  const open = () => {
    if (!received) {
      return;
    }
    const values: Record<string, FeatureValue> = Object.fromEntries(
      features.map((feature) => [feature.name, feature.default]),
    );
    const read: ExtractedValue[] = [];
    for (const item of received.values) {
      values[item.name] = item.value;
      const feature = byName.get(item.name);
      read.push({
        name: item.name,
        label: feature?.label ?? item.name,
        group: feature?.group ?? "",
        value: item.value,
        unit: feature?.unit,
        as_written: String(item.value),
        evidence: item.source,
        document: "ABHA",
      });
    }
    Object.assign(values, answers);
    onOpen(values, read);
  };

  return (
    <div className="ru-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        aria-labelledby="abha-title"
        aria-modal="true"
        className={`ru-dialog${stage === "result" ? " is-wide" : ""}`}
        ref={dialog}
        role="dialog"
        tabIndex={-1}
      >
        <header className="ru-head">
          <div>
            <h2 id="abha-title">Import via ABHA</h2>
            <p>The patient shares their health records from the Ayushman Bharat (ABHA) app, with their consent.</p>
          </div>
          <button aria-label="Close" className="ru-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {stage !== "result" && (
          <>
            <div className="abha-scan">
              <div className="abha-qr">
                <img alt="QR code to scan with the ABHA app" src={DEMO + "qr.svg"} />
              </div>
              <ol className="abha-steps">
                <li className={stage === "receiving" ? "is-done" : undefined}>
                  <b>Scan with the ABHA app</b>
                  <span>The patient opens their ABHA app and scans this code.</span>
                </li>
                <li className={stage === "receiving" ? "is-done" : undefined}>
                  <b>Approve sharing</b>
                  <span>Lab reports, vital signs, diagnoses, ECG and echo, for this visit only.</span>
                </li>
                <li className={stage === "receiving" ? "is-active" : undefined}>
                  <b>Records arrive here</b>
                  <span>Through ABDM, in the standard FHIR format, mapped to the inputs automatically.</span>
                </li>
              </ol>
            </div>
            {stage === "receiving" ? (
              <div className="ru-busy">
                <HeartbeatLoader
                  steps={["Consent approved", "Fetching records via ABDM", "Mapping FHIR records to the inputs"]}
                  variant="inline"
                />
              </div>
            ) : (
              <>
                <p className="abha-waiting">
                  <span aria-hidden="true" className="abha-pulse" /> Waiting for the patient&apos;s consent…
                </p>
                <button className="ru-primary" onClick={() => void approve()} type="button">
                  Simulate the patient&apos;s approval (demo)
                </button>
              </>
            )}
            <p className="ru-demo-note">
              Demo: a sample ABHA record made from study patient 174&apos;s values is used. The live connection to
              Ayushman Bharat needs ABDM registration, our next step. Scan the code with a phone to see the consent
              request.
            </p>
          </>
        )}

        {stage === "result" && received && (
          <div className="ru-result">
            <p className="ru-summary">
              <b>Received {received.records} records</b> from Sample Hospital (demo):{" "}
              {received.counts.Condition ?? 0} diagnoses, {received.counts.Observation ?? 0} observations and{" "}
              {received.counts.DiagnosticReport ?? 0} lab report. They filled <b>{received.values.length} inputs</b>.
            </p>
            <div className="ru-split">
              <div className="ru-list">
                {KIND_ORDER.map((kind) => {
                  const items = received.values.filter((item) => item.kind === kind);
                  return items.length === 0 ? null : (
                    <section className="ru-group" key={kind}>
                      <h3 style={{ ["--box" as string]: KIND_COLOUR[kind] }}>
                        <i aria-hidden="true" />
                        {kind}
                      </h3>
                      <table>
                        <tbody>
                          {items.map((item) => {
                            const feature = byName.get(item.name);
                            return (
                              <tr key={item.name}>
                                <th scope="row">{feature?.label ?? item.name}</th>
                                <td className="ru-value">{show(item.value, feature?.unit)}</td>
                                <td className="ru-evidence">{item.source}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                  );
                })}
              </div>
              <div className="ru-list">
                {Object.keys(answers).length > 0 && (
                  <section className="ru-group ru-ask">
                    <h3>Records rarely say these. Please add them</h3>
                    {Object.entries(answers).map(([name, value]) => {
                      const feature = byName.get(name)!;
                      return (
                        <div className="ru-ask-row" key={name}>
                          <span>{feature.label}</span>
                          <Answer
                            feature={feature}
                            onChange={(next) => setAnswers({ ...answers, [name]: next })}
                            value={value}
                          />
                        </div>
                      );
                    })}
                  </section>
                )}
                <p className="ru-note">
                  Every value shows the FHIR record it came from (LOINC codes for measurements, SNOMED CT for
                  diagnoses). Check everything in the patient&apos;s Edit panel before relying on the result. Nothing is
                  stored.
                </p>
              </div>
            </div>
            <div className="ru-actions">
              <button className="ru-secondary" onClick={() => setStage("qr")} type="button">
                Back
              </button>
              <button className="ru-primary" onClick={open} type="button">
                Open patient and score
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="ru-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
