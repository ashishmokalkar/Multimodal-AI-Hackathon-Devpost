import { useEffect, useRef, useState } from "react";
import { postPredict, postSheet } from "../../api/client";
import type { ApiProfile } from "../../api/profile";
import type { FeatureDefinition, FeatureValue, PredictionResponse, Target } from "../../api/types";
import { isFlagged } from "../../lib/flags";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import { riskBand, RISK_WORD } from "../studio/studioModel";
import { readSheet, type SheetResult } from "./sheet";

const DEMO = `${import.meta.env.BASE_URL}demo/sheet/`;
const SAMPLE = "screening-camp-sample.xlsx";
const PARALLEL = 3;

interface Scored {
  id: string;
  values: Record<string, FeatureValue>;
  problems: string[];
  prediction: PredictionResponse | null;
  error?: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function band(target: Target) {
  return riskBand(target.probability, target.threshold, isFlagged(target));
}

/**
 * "Excel / CSV" for screening camps: the sample list (10 study patients) or the user's own file is read on the server,
 * matched to the inputs here, and every patient is scored, highest risk first. A row opens that patient.
 */
export function SheetImport({
  features,
  profile,
  onClose,
  onOpen,
}: {
  features: FeatureDefinition[];
  profile: ApiProfile;
  onClose: () => void;
  onOpen: (values: Record<string, FeatureValue>) => void;
}) {
  const [stage, setStage] = useState<"choose" | "scoring" | "result">("choose");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [sheet, setSheet] = useState<SheetResult | null>(null);
  const [scored, setScored] = useState<Scored[]>([]);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
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

  const score = async (name: string, buffer: ArrayBuffer) => {
    setFileName(name);
    setError(null);
    setStage("scoring");
    setProgress(0);
    try {
      const table = await postSheet(name, toBase64(buffer));
      const result = readSheet(table.columns, table.rows, features);
      if (result.missing.length === features.length) {
        throw new Error("None of the columns match the inputs. Start from the template.");
      }
      setSheet(result);
      const out: Scored[] = result.patients.map((patient) => ({ ...patient, prediction: null }));
      let done = 0;
      for (let i = 0; i < out.length; i += PARALLEL) {
        await Promise.all(
          out.slice(i, i + PARALLEL).map(async (row) => {
            try {
              row.prediction = await postPredict({ features: row.values }, profile);
            } catch {
              row.error = "Could not be scored";
            }
            done += 1;
            setProgress(done);
          }),
        );
      }
      out.sort((a, b) => (b.prediction?.cad.probability ?? -1) - (a.prediction?.cad.probability ?? -1));
      setScored(out);
      setStage("result");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The file could not be read.");
      setStage("choose");
    }
  };

  const scoreSample = async () => {
    const response = await fetch(DEMO + SAMPLE);
    await score(SAMPLE, await response.arrayBuffer());
  };

  const total = sheet?.patients.length ?? 0;
  const referred = scored.filter((row) => row.prediction && isFlagged(row.prediction.cad)).length;

  return (
    <div className="ru-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        aria-labelledby="sheet-title"
        aria-modal="true"
        className={`ru-dialog${stage === "result" ? " is-wide" : ""}`}
        ref={dialog}
        role="dialog"
        tabIndex={-1}
      >
        <header className="ru-head">
          <div>
            <h2 id="sheet-title">Excel / CSV</h2>
            <p>Score a whole screening-camp list at once, highest risk first, so the right people are referred.</p>
          </div>
          <button aria-label="Close" className="ru-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {stage === "choose" && (
          <>
            <div className="sh-choices">
              <button className="sh-choice" onClick={() => void scoreSample()} type="button">
                <b>Use the sample list</b>
                <span>10 study patients in an Excel workbook</span>
                <em>Score them now →</em>
              </button>
              <button className="sh-choice" onClick={() => input.current?.click()} type="button">
                <b>Upload your own</b>
                <span>A CSV file or an Excel workbook (.xlsx), one patient per row</span>
                <em>Choose a file →</em>
              </button>
            </div>
            <input
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  void file.arrayBuffer().then((buffer) => score(file.name, buffer));
                }
              }}
              ref={input}
              type="file"
            />
            <p className="ru-note">
              Start from the <a href={DEMO + "template.csv"}>template</a> (one column per input; Yes/No for conditions)
              or look at the sample as <a href={DEMO + SAMPLE}>Excel</a> or{" "}
              <a href={DEMO + "screening-camp-sample.csv"}>CSV</a>. Missing columns use typical values. Nothing is
              stored.
            </p>
          </>
        )}

        {stage === "scoring" && (
          <div className="ru-busy">
            <HeartbeatLoader
              steps={[total ? `Scoring ${progress} of ${total} patients` : `Reading ${fileName}`]}
              variant="inline"
            />
          </div>
        )}

        {stage === "result" && sheet && (
          <div className="ru-result">
            <p className="ru-summary">
              <b>{scored.length} patients scored</b> from {fileName}: <b>{referred} above the alert level</b> for heart
              disease. Highest risk first; open a patient to see why.
            </p>
            <div className="ru-list sh-table-wrap">
              <table className="sh-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Age · sex</th>
                    <th>Heart disease</th>
                    <th>Highest artery</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {scored.map((row, index) => {
                    const p = row.prediction;
                    const artery = p
                      ? (["LAD", "LCX", "RCA"] as const)
                          .map((name) => ({ name, target: p.vessels[name] }))
                          .sort((a, b) => b.target.probability - a.target.probability)[0]
                      : null;
                    const cadBand = p ? band(p.cad) : null;
                    return (
                      <tr key={`${row.id}-${index}`}>
                        <td>{index + 1}</td>
                        <td>
                          <b>{row.id}</b>
                          {row.problems.length > 0 && (
                            <span className="sh-warn" title={row.problems.join("\n")}>
                              {" "}
                              ⚠ {row.problems.length}
                            </span>
                          )}
                        </td>
                        <td>
                          {String(row.values.Age)} · {String(row.values.Sex)}
                        </td>
                        <td>
                          {p && cadBand ? (
                            <span className={`sh-band sh-${cadBand}`}>
                              {Math.round(p.cad.probability * 100)}% {cadBand === "high" ? "▲ " : ""}
                              {RISK_WORD[cadBand]}
                            </span>
                          ) : (
                            row.error
                          )}
                        </td>
                        <td>{artery ? `${artery.name} ${Math.round(artery.target.probability * 100)}%` : ""}</td>
                        <td>
                          <button className="sh-open" onClick={() => onOpen(row.values)} type="button">
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="ru-note">
              {sheet.missing.length > 0 && `No column for ${sheet.missing.length} inputs (typical values used). `}
              {sheet.ignored.length > 0 && `Ignored columns: ${sheet.ignored.join(", ")}. `}
              ⚠ marks cells that could not be used; hover to see them. Decision support only.
            </p>
            <div className="ru-actions">
              <button className="ru-secondary" onClick={() => setStage("choose")} type="button">
                Back
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
