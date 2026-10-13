import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFeatures } from "../../api/hooks";
import type {
  FeatureDefinition,
  FeatureValue,
  PredictionResponse,
  Target,
} from "../../api/types";
import { targetColor } from "../../lib/colorScale";
import { isFlagged, isHeldBack } from "../../lib/flags";
import {
  formatFeatureValue,
  formatRange,
  LOWER_COLOR,
  RAISE_COLOR,
  rangeStatus,
} from "../../lib/insights";
import { ARTERY_PLAIN, plainFinding, plainName, plainWarnings } from "../../lib/plainLanguage";
import { spokenSummary } from "../../lib/spokenSummary";
import { spokenSummaryHindi } from "../../lib/spokenSummaryHindi";
import { buildDrivers, type DriverSummary } from "../../lib/summary";
import { UNIT_SYSTEM_LABEL } from "../../lib/units";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { useActiveScenario, useWhatIfStore } from "../../store/whatIfStore";
import { DISCLAIMER_LINE } from "../safety/disclaimer";
import { SpeakButton } from "../speech/SpeakButton";
import { HeartSnapshot } from "./HeartSnapshot";
import "./report.css";

type Artery = "LAD" | "LCX" | "RCA";
const ARTERIES: readonly Artery[] = ["LAD", "LCX", "RCA"];
const PAGE_WIDTH_PX = 794; // 210 mm at 96 dpi
const CAD_ACCENT = "#c2255c";

/** Numbers a patient can track or act on, shown on the take-home page when present. */
const TAKE_HOME = ["BP", "LDL", "HDL", "TG", "FBS", "PR", "Weight", "Smoking"];

const QUESTIONS = [
  "Do I need more tests, such as a heart scan or an exercise test?",
  "Which of my risk factors matter most, and what should I aim for?",
  "How often should my blood pressure, cholesterol and sugar be checked?",
  "Which symptoms mean I should get help straight away?",
];

function pct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

// ------------------------------------------------------------------------------------------- visuals
/** Three-quarter ring with the chance filled in and the alert level ticked. */
function Gauge({
  target,
  color,
  size = 170,
}: {
  target: Target;
  color: string;
  size?: number;
}) {
  const r = 70;
  const sweep = 270;
  const start = 135;
  const circumference = 2 * Math.PI * r;
  const arc = (circumference * sweep) / 360;
  const filled = arc * Math.min(1, Math.max(0, target.probability));
  const angle = ((start + sweep * target.threshold) * Math.PI) / 180;
  const tick = (radius: number) => [100 + radius * Math.cos(angle), 100 + radius * Math.sin(angle)];
  const [x1, y1] = tick(r - 13);
  const [x2, y2] = tick(r + 13);
  const [lx, ly] = tick(r + 27);
  return (
    <svg
      aria-label={`${pct(target.probability)} chance; alert level ${pct(target.threshold)}`}
      className="rp-gauge"
      height={size}
      role="img"
      viewBox="0 0 200 200"
      width={size}
    >
      <circle
        className="rp-gauge-track"
        cx="100"
        cy="100"
        r={r}
        strokeDasharray={`${arc} ${circumference}`}
        transform={`rotate(${start} 100 100)`}
      />
      <circle
        cx="100"
        cy="100"
        fill="none"
        r={r}
        stroke={color}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        strokeWidth="14"
        transform={`rotate(${start} 100 100)`}
      />
      <line className="rp-gauge-tick" x1={x1} x2={x2} y1={y1} y2={y2} />
      <text className="rp-gauge-ticklabel" textAnchor="middle" x={lx} y={ly + 3}>
        alert
      </text>
      <text className="rp-gauge-value" textAnchor="middle" x="100" y="108">
        {Math.round(target.probability * 100)}
        <tspan className="rp-gauge-unit">%</tspan>
      </text>
      <text className="rp-gauge-caption" textAnchor="middle" x="100" y="132">
        chance
      </text>
    </svg>
  );
}

function ReasonList({ title, items, raise }: { title: string; items: string[]; raise: boolean }) {
  return (
    <div className="rp-reason-list">
      <p className="rp-reason-title" style={{ color: raise ? RAISE_COLOR : LOWER_COLOR }}>
        <span aria-hidden="true">{raise ? "▲" : "▼"}</span> {title}
      </p>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="rp-muted rp-small">Nothing in your records moved it much this way.</p>
      )}
    </div>
  );
}

/** The findings that raise and lower the result, in everyday words (several ECG items read the same, so once). */
function Reasons({
  summary,
  features,
  inputs,
}: {
  summary: DriverSummary;
  features: FeatureDefinition[];
  inputs: Readonly<Record<string, FeatureValue>>;
}) {
  const definitions = new Map(features.map((feature) => [feature.name, feature]));
  const findings = (keep: (points: number) => boolean, limit: number) =>
    [
      ...new Set(
        summary.drivers
          .filter((driver) => keep(driver.points))
          .map((driver) => plainFinding(driver.feature, inputs[driver.feature] ?? "", definitions.get(driver.feature))),
      ),
    ].slice(0, limit);
  return (
    <div className="rp-reasons">
      <ReasonList items={findings((points) => points > 0, 4)} raise title="Raising your chance" />
      <ReasonList items={findings((points) => points < 0, 3)} raise={false} title="Lowering your chance" />
    </div>
  );
}

function StatusPill({ target, artery }: { target: Target; artery: boolean }) {
  if (isFlagged(target)) {
    return <span className="rp-pill rp-pill-flag">▲ Above the alert level</span>;
  }
  if (artery && isHeldBack(target)) {
    return <span className="rp-pill rp-pill-held">Fairly high · not alerted</span>;
  }
  return <span className="rp-pill rp-pill-clear">Below the alert level</span>;
}

function Page({
  number,
  total,
  accent,
  children,
  label,
}: {
  number: number;
  total: number;
  accent: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <section aria-label={label} className="rp-page" style={{ ["--rp-accent" as string]: accent }}>
      {children}
      <footer className="rp-foot">
        <span>{DISCLAIMER_LINE}</span>
        <span>
          Page {number} of {total}
        </span>
      </footer>
    </section>
  );
}

// ------------------------------------------------------------------------------------------- report
interface ReportData {
  prediction: PredictionResponse;
  inputs: Readonly<Record<string, FeatureValue>>;
  features: FeatureDefinition[];
  scenario: boolean;
}

function patientLine(data: ReportData): string {
  const age = data.inputs.Age;
  const sex = data.inputs.Sex;
  const who = sex === "Female" ? "woman" : sex === "Male" ? "man" : "patient";
  return `${typeof age === "number" ? `${age}-year-old ` : ""}${who}`;
}

function SummaryPage({ data, total }: { data: ReportData; total: number }) {
  const { prediction, features } = data;
  const cad = prediction.cad;
  const drivers = useMemo(
    () => buildDrivers(prediction.explanations.cad, features, cad.probability, 12),
    [prediction, features, cad.probability],
  );
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const flagged = isFlagged(cad);
  return (
    <Page accent={CAD_ACCENT} label="Summary" number={1} total={total}>
      <header className="rp-hero">
        <svg aria-hidden="true" className="rp-hero-ecg" preserveAspectRatio="none" viewBox="0 0 600 60">
          <path d="M0 34h170l10-22 14 44 12-30 8 8h120l10-22 14 44 12-30 8 8h222" />
        </svg>
        <div className="rp-brand">
          <span className="rp-logo" aria-hidden="true">
            ♥
          </span>
          CardioClarity
        </div>
        <h1>Your heart report</h1>
        <p className="rp-hero-sub">Your heart artery results, explained · {patientLine(data)}</p>
        <dl className="rp-hero-meta">
          <div>
            <dt>Date</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd>{prediction.request_id.slice(0, 8).toUpperCase()}</dd>
          </div>
        </dl>
      </header>
      {data.scenario && (
        <p className="rp-banner">
          This report shows a &ldquo;what if&rdquo; example with changed values, not your actual results.
        </p>
      )}

      <div className="rp-grid-hero">
        <div className="rp-card rp-card-main">
          <h2 className="rp-h">Your result</h2>
          <div className="rp-headline">
            <Gauge color={CAD_ACCENT} size={190} target={cad} />
            <div>
              <StatusPill artery={false} target={cad} />
              <p className="rp-lead">
                The chance that one or more of the arteries feeding your heart is badly narrowed is{" "}
                <strong>{pct(cad.probability)}</strong>.
              </p>
              <p className="rp-muted">
                {flagged
                  ? `This is above the ${pct(cad.threshold)} level at which we alert your doctor, so they may suggest more tests.`
                  : `This is below the ${pct(cad.threshold)} level at which we alert your doctor. They will look at it together with your symptoms and other tests.`}
                {cad.uncertain ? " Your result is close to the line, so it could go either way." : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="rp-card rp-card-heart">
          <h2 className="rp-h">Your heart&apos;s arteries</h2>
          <HeartSnapshot
            alt="Picture of a heart with its three main arteries coloured: front artery blue, side artery amber, right artery teal"
            focus={null}
            prediction={prediction}
          />
          <ul className="rp-artery-keys">
            {ARTERIES.map((artery) => {
              const target = prediction.vessels[artery];
              return (
                <li key={artery}>
                  <i style={{ background: targetColor(artery) }} />
                  <span>
                    <b>{ARTERY_PLAIN[artery].name}</b> ({artery})
                  </span>
                  <strong>{pct(target.probability)}</strong>
                  {isFlagged(target) && <em>▲</em>}
                </li>
              );
            })}
            <li className="rp-artery-lm">
              <i />
              <span>Main left artery (LM): not checked by this tool</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rp-card">
        <h2 className="rp-h">The main reasons</h2>
        <Reasons features={features} inputs={data.inputs} summary={drivers} />
      </div>
    </Page>
  );
}

/** One page for the three arteries: each lit up on the heart, with its chance and what it means. */
function ArteriesPage({ data, number, total }: { data: ReportData; number: number; total: number }) {
  const { prediction } = data;
  return (
    <Page accent={CAD_ACCENT} label="Your three heart arteries" number={number} total={total}>
      <header className="rp-artery-head">
        <span aria-hidden="true" className="rp-artery-tag">
          ♥
        </span>
        <div>
          <h1>Your three heart arteries</h1>
          <p>The chance that each main artery is badly narrowed</p>
        </div>
      </header>
      <div className="rp-artery-rows">
        {ARTERIES.map((artery) => {
          const target = prediction.vessels[artery];
          const plain = ARTERY_PLAIN[artery];
          const color = targetColor(artery);
          return (
            <section aria-label={plain.name} className="rp-card rp-artery-row" key={artery}>
              <HeartSnapshot
                alt={`Picture of the heart, see-through, with the ${plain.name.toLowerCase()} lit up`}
                focus={artery}
                prediction={prediction}
              />
              <div>
                <h2 className="rp-artery-name">
                  <i style={{ background: color }} />
                  {plain.name}
                  <span>
                    {plain.medical} · supplies {plain.supplies}
                  </span>
                </h2>
                <div className="rp-headline">
                  <Gauge color={color} size={112} target={target} />
                  <div>
                    <StatusPill artery target={target} />
                    <p className="rp-lead">
                      The chance this artery is badly narrowed is <strong>{pct(target.probability)}</strong>.
                    </p>
                    <p className="rp-muted">
                      {isFlagged(target)
                        ? "Your doctor may want to look at this artery more closely."
                        : isHeldBack(target)
                          ? "Fairly high, but an artery is only alerted when your overall result is too."
                          : "Below the alert level for this artery."}
                      {target.uncertain ? " It is close to the line, so it could go either way." : ""}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div className="rp-note">
        <b>Good to know.</b> This is the chance that an artery is narrowed, not how narrow it is. Only a scan or an
        angiogram can show how narrow an artery is.
      </div>
    </Page>
  );
}

function TakeHomePage({ data, number, total }: { data: ReportData; number: number; total: number }) {
  const unitSystem = useUiStore((state) => state.unitSystem);
  const definitions = new Map(data.features.map((feature) => [feature.name, feature]));
  const rows = TAKE_HOME.flatMap((name) => {
    const definition = definitions.get(name);
    const value = data.inputs[name];
    if (!definition || value === undefined) {
      return [];
    }
    return [{ definition, value, status: rangeStatus(value, definition.reference_range) }];
  });
  const bmi = !data.prediction.mock ? data.prediction.derived.BMI : null;
  const notes = data.prediction.mock ? [] : plainWarnings(data.prediction.warnings);
  return (
    <Page accent="#0f766e" label="Take-home notes" number={number} total={total}>
      <header className="rp-artery-head rp-take-head">
        <span className="rp-artery-tag">✓</span>
        <div>
          <h1>Take-home notes</h1>
          <p>Your numbers, questions for your doctor, and when to get help</p>
        </div>
      </header>
      <div className="rp-grid-two rp-grid-take">
        <div className="rp-card">
          <h2 className="rp-h">Your numbers</h2>
          <table className="rp-table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Yours</th>
                <th scope="col">Healthy range</th>
                <th scope="col">
                  <span className="rp-sr">How it looks</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ definition, value, status }) => (
                <tr key={definition.name}>
                  <th scope="row">{plainName(definition.name, definition)}</th>
                  <td>
                    {definition.name === "Smoking"
                      ? plainFinding("Smoking", value, definition)
                      : formatFeatureValue(value, definition)}
                  </td>
                  <td>{definition.reference_range ? formatRange(definition.reference_range, definition) : "–"}</td>
                  <td>
                    {status === "high" ? (
                      <span className="rp-flag rp-flag-high">Above range</span>
                    ) : status === "low" ? (
                      <span className="rp-flag rp-flag-low">Below range</span>
                    ) : status === "normal" ? (
                      <span className="rp-flag rp-flag-ok">In range</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {bmi !== null && (
                <tr>
                  <th scope="row">Body mass index (BMI)</th>
                  <td>{bmi.toFixed(1)}</td>
                  <td>18.5–25</td>
                  <td>
                    {bmi > 25 ? (
                      <span className="rp-flag rp-flag-high">Above range</span>
                    ) : bmi < 18.5 ? (
                      <span className="rp-flag rp-flag-low">Below range</span>
                    ) : (
                      <span className="rp-flag rp-flag-ok">In range</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="rp-muted rp-small">
            Blood tests in {UNIT_SYSTEM_LABEL[unitSystem]}. Healthy ranges are general guides; your doctor may set
            different targets for you.
          </p>
        </div>
        <div className="rp-stack">
          <div className="rp-card">
            <h2 className="rp-h">Questions to ask your doctor</h2>
            <ol className="rp-questions">
              {QUESTIONS.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </div>
          <div className="rp-card rp-urgent">
            <h2 className="rp-h">Get help straight away</h2>
            <p>
              Call your local emergency number if you have chest pain or pressure that lasts more than a few
              minutes, spreads to your arm, jaw, neck or back, or comes with breathlessness, sweating or feeling
              sick. Do not wait for an appointment.
            </p>
          </div>
        </div>
      </div>
      <div className="rp-card rp-about">
        <h2 className="rp-h">How this was worked out</h2>
        <p>
          A computer tool compared your health details (your history, symptoms, heart tracing, blood tests and
          heart scan) with those of 303 people who had their heart arteries checked. It gets most results right,
          but not all, so it helps your doctor but does not replace their judgement or further tests.
        </p>
        {notes.length > 0 && (
          <ul className="rp-warnings">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}

/** Scales the A4 preview to the window; print is always full size. */
function useZoom() {
  const [zoom, setZoom] = useState(() => Math.min(1, (window.innerWidth - 32) / PAGE_WIDTH_PX));
  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 32) / PAGE_WIDTH_PX));
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return zoom;
}

/**
 * The take-home patient report, written for the patient: a summary page (their chance, the colour-coded 3D heart
 * and the main reasons), a page for the three arteries, and a take-home page (their numbers, questions for the
 * doctor, when to get help). Saved as a PDF with the browser's print dialog.
 */
export function PatientReport() {
  const setReportOpen = useUiStore((state) => state.setReportOpen);
  const accepted = usePatientStore((state) => state.prediction);
  const acceptedInputs = usePatientStore((state) => state.predictionInputs);
  const scenario = useActiveScenario();
  const scenarioValues = useWhatIfStore((state) => state.values);
  const features = useFeatures().data;
  const zoom = useZoom();
  const dialog = useRef<HTMLDivElement>(null);
  const prediction = scenario ?? accepted;
  const inputs = scenario ? scenarioValues : acceptedInputs;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReportOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("report-open");
    // the app behind the report is unreachable while it is open, so focus and screen readers stay in the dialog
    const app = document.getElementById("root");
    app?.setAttribute("inert", "");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("report-open");
      app?.removeAttribute("inert");
      opener?.focus?.();
    };
  }, [setReportOpen]);

  const data = useMemo<ReportData | null>(() => {
    if (!prediction || !inputs || !features) {
      return null;
    }
    return { prediction, inputs, features, scenario: scenario !== null };
  }, [prediction, inputs, features, scenario]);

  const print = () => {
    const title = document.title;
    document.title = `CardioClarity-report-${new Date().toISOString().slice(0, 10)}`;
    const restore = () => {
      document.title = title;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const total = 3;
  return createPortal(
    <div
      aria-labelledby="report-title"
      aria-modal="true"
      className="report-root"
      ref={dialog}
      role="dialog"
      tabIndex={-1}
    >
      <div className="rp-toolbar">
        <h2 id="report-title">Patient report</h2>
        <span className="rp-toolbar-hint">
          {data ? `${total} pages · A4 · written for the patient` : "Waiting for a result"}
        </span>
        {data && (
          <SpeakButton
            captions={false}
            className="rp-speak"
            hindi={() => spokenSummaryHindi(data.prediction, data.features, data.inputs)}
            resultKey={data.prediction.request_id}
            sentences={() => spokenSummary(data.prediction, data.features, data.inputs)}
          />
        )}
        <button className="rp-btn rp-btn-primary" disabled={!data} onClick={print} type="button">
          Save as PDF
        </button>
        <button className="rp-btn" onClick={() => setReportOpen(false)} type="button">
          Close
        </button>
      </div>
      {data ? (
        <div className="rp-pages" style={{ zoom }}>
          <SummaryPage data={data} total={total} />
          <ArteriesPage data={data} number={2} total={total} />
          <TakeHomePage data={data} number={3} total={total} />
        </div>
      ) : (
        <p className="rp-empty">Open a patient first; the report is built from the result on screen.</p>
      )}
    </div>,
    document.body,
  );
}

export default PatientReport;
