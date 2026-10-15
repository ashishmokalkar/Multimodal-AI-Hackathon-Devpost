import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ExtractResponseSchema, type ExtractResponse, type FeatureDefinition, type FeatureValue } from "../../api/types";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import { IconUpload } from "../studio/icons";
import { ASK_FIRST, show } from "./intake";

/**
 * The public demo reads one sample report: a 3-page PDF (lab report, ECG, echo) made from study patient 174's values.
 * It was read once by the vision model through POST /extract (api/extract.py), and that recorded answer is replayed
 * here, with where each value sits on the page (each quoted text located on the page), so the demo is free and
 * instant. The same endpoint reads any upload when the server has OPENAI_API_KEY.
 */
const DEMO = `${import.meta.env.BASE_URL}demo/report/`;
const BoxSchema = z.object({ page: z.number(), x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const DemoSchema = ExtractResponseSchema.extend({
  values: z.array(ExtractResponseSchema.shape.values.element.extend({ box: BoxSchema })),
  file: z.string(),
  pages: z.array(z.string()),
  seconds: z.number(),
  recorded_at: z.string(),
});
type Demo = z.infer<typeof DemoSchema>;

const GROUP_ORDER = ["Demographics", "Symptoms/Exam", "ECG", "Lab", "Echo"];
const GROUP_NAME: Record<string, string> = { Demographics: "Patient details", "Symptoms/Exam": "Examination" };
/** One colour per kind of finding, the same on the page and in the list. */
const GROUP_COLOUR: Record<string, string> = {
  Demographics: "#60a5fa",
  "Symptoms/Exam": "#a78bfa",
  ECG: "#f472b6",
  Lab: "#2dd4bf",
  Echo: "#fbbf24",
};
const READ_MS = 2600;


export function Answer({
  feature,
  value,
  onChange,
}: {
  feature: FeatureDefinition;
  value: FeatureValue;
  onChange: (value: FeatureValue) => void;
}) {
  if (feature.type === "number") {
    return (
      <input
        aria-label={feature.label}
        className="ru-number"
        max={feature.max}
        min={feature.min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={Number(value)}
      />
    );
  }
  const options = feature.type === "boolean" ? [true, false] : (feature.options ?? []);
  return (
    <div aria-label={feature.label} className="ru-seg" role="group">
      {options.map((option) => (
        <button aria-pressed={value === option} key={String(option)} onClick={() => onChange(option)} type="button">
          {typeof option === "boolean" ? (option ? "Yes" : "No") : String(option)}
        </button>
      ))}
    </div>
  );
}

/** The report's pages with a coloured outline on every value the model read. */
function Pages({
  demo,
  active,
  onHover,
}: {
  demo: Demo;
  active: string | null;
  onHover: (name: string | null) => void;
}) {
  return (
    <div className="ru-pages">
      {demo.pages.map((src, index) => (
        <div className="ru-page" key={src}>
          <img alt={`Page ${index + 1} of the sample report`} src={DEMO + src} />
          {demo.values
            .filter((value) => value.box.page === index + 1)
            .map((value) => (
              <span
                aria-hidden="true"
                className={`ru-box${active === value.name ? " is-active" : ""}`}
                key={value.name}
                onMouseEnter={() => onHover(value.name)}
                onMouseLeave={() => onHover(null)}
                style={{
                  left: `${value.box.x * 100}%`,
                  top: `${value.box.y * 100}%`,
                  width: `${value.box.w * 100}%`,
                  height: `${value.box.h * 100}%`,
                  ["--box" as string]: GROUP_COLOUR[value.group] ?? "#5eead4",
                }}
                title={`${value.label}: ${show(value.value, value.unit)}`}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

/**
 * "Upload reports": the sample report is read by the vision model (a recorded run, see above). Each value found is
 * outlined on the page in its group's colour and listed beside it; what reports rarely contain (symptoms, history) is
 * asked here; then the patient opens with everything filled in, ready to check and score.
 */
export function ReportUpload({
  features,
  onClose,
  onOpen,
}: {
  features: FeatureDefinition[];
  onClose: () => void;
  onOpen: (values: Record<string, FeatureValue>, result: ExtractResponse) => void;
}) {
  const [stage, setStage] = useState<"select" | "reading" | "result">("select");
  const [demo, setDemo] = useState<Demo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, FeatureValue>>({});
  const [active, setActive] = useState<string | null>(null);
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

  const read = async () => {
    setStage("reading");
    setError(null);
    try {
      const [response] = await Promise.all([
        fetch(DEMO + "result.json"),
        new Promise((resolve) => window.setTimeout(resolve, READ_MS)),
      ]);
      const found = DemoSchema.parse(await response.json());
      const known = new Set(found.values.map((value) => value.name));
      setAnswers(
        Object.fromEntries(
          ASK_FIRST.filter((name) => !known.has(name) && byName.has(name)).map((name) => [
            name,
            byName.get(name)!.default,
          ]),
        ),
      );
      setDemo(found);
      setStage("result");
    } catch {
      setError("The sample report could not be loaded.");
      setStage("select");
    }
  };

  const open = () => {
    if (!demo) {
      return;
    }
    const values: Record<string, FeatureValue> = Object.fromEntries(
      features.map((feature) => [feature.name, feature.default]),
    );
    for (const found of demo.values) {
      values[found.name] = found.value;
    }
    Object.assign(values, answers);
    onOpen(values, demo);
  };

  const groups = demo
    ? GROUP_ORDER.map((group) => ({ group, values: demo.values.filter((value) => value.group === group) })).filter(
        (entry) => entry.values.length > 0,
      )
    : [];
  const notFound = demo ? features.length - demo.values.length - Object.keys(answers).length : 0;

  return (
    <div className="ru-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        aria-labelledby="ru-title"
        aria-modal="true"
        className={`ru-dialog${stage === "result" ? " is-wide" : ""}`}
        ref={dialog}
        role="dialog"
        tabIndex={-1}
      >
        <header className="ru-head">
          <div>
            <h2 id="ru-title">Upload reports</h2>
            <p>Lab reports, ECG printouts and echo reports, as photos or PDFs. Our multimodal AI reads them for you.</p>
          </div>
          <button aria-label="Close" className="ru-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {stage !== "result" && (
          <>
            <div className={`ru-sample${stage === "reading" ? " is-reading" : ""}`}>
              <div className="ru-thumb">
                <img alt="" src={DEMO + "page-1.png"} />
                {stage === "reading" && <span aria-hidden="true" className="ru-scan" />}
              </div>
              <div className="ru-sample-text">
                <span className="ru-selected">✓ Selected</span>
                <b>patient-174-reports.pdf</b>
                <span>3 pages · lab report, ECG, echo report</span>
                <a href={DEMO + "patient-174-reports.pdf"} rel="noreferrer" target="_blank">
                  Open the PDF
                </a>
              </div>
            </div>
            <p className="ru-demo-note">
              <IconUpload size={14} /> Public demo: a sample report (made from study patient 174&apos;s values) is used,
              so it is free and instant. Uploading your own reports is switched off here.
            </p>
            {stage === "reading" ? (
              <div className="ru-busy">
                <HeartbeatLoader
                  steps={["Reading 3 pages", "Finding the values", "Checking units and ranges"]}
                  variant="inline"
                />
              </div>
            ) : (
              <button className="ru-primary" onClick={() => void read()} type="button">
                Read the report with AI
              </button>
            )}
          </>
        )}

        {stage === "result" && demo && (
          <div className="ru-result">
            <p className="ru-summary">
              <b>Found {demo.values.length} values</b> on {demo.pages.length} pages:{" "}
              {demo.documents.map((document) => document.kind).join(", ")}. Each one is outlined where it was read.
            </p>
            <div className="ru-split">
              <Pages active={active} demo={demo} onHover={setActive} />
              <div className="ru-list">
                {groups.map(({ group, values }) => (
                  <section className="ru-group" key={group}>
                    <h3 style={{ ["--box" as string]: GROUP_COLOUR[group] }}>
                      <i aria-hidden="true" />
                      {GROUP_NAME[group] ?? group}
                    </h3>
                    <table>
                      <tbody>
                        {values.map((value) => (
                          <tr
                            className={active === value.name ? "is-active" : undefined}
                            key={value.name}
                            onMouseEnter={() => setActive(value.name)}
                            onMouseLeave={() => setActive(null)}
                            title={`Read from: “${value.evidence}”`}
                          >
                            <th scope="row">{value.label}</th>
                            <td className="ru-value">{show(value.value, value.unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
                {Object.keys(answers).length > 0 && (
                  <section className="ru-group ru-ask">
                    <h3>Reports rarely say these. Please add them</h3>
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
              </div>
            </div>
            <p className="ru-note">
              Read by OpenAI {demo.model} (vision) in {demo.seconds} s; this demo replays that recorded reading.{" "}
              {notFound > 0 && `The other ${notFound} inputs start at typical values. `}
              Check everything in the patient&apos;s Edit panel before relying on the result. Nothing is stored.
            </p>
            <div className="ru-actions">
              <button className="ru-secondary" onClick={() => setStage("select")} type="button">
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
