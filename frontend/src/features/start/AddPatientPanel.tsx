import { useState, type ReactNode } from "react";
import { IconEdit, IconMic, IconQr, IconSheet, IconUpload } from "../studio/icons";

interface Method {
  id: string;
  title: string;
  detail: string;
  icon: ReactNode;
  /** Shown when a method that is not built yet is chosen: what it will do. */
  plan?: string;
}

/**
 * The ways to add a patient, most automatic first. Each fills different inputs (the record systems hold labs and
 * diagnoses but rarely symptoms; a report photo holds the ECG and echo; speech holds the history and symptoms), and
 * all of them end at one review before anything is scored.
 */
const METHODS: Method[] = [
  {
    id: "abha",
    title: "Import via ABHA",
    detail: "Scan & Share with the patient's ABHA app",
    icon: <IconQr size={20} />,
    plan: "Coming next: the patient scans the clinic's QR code with their ABHA app and approves the consent request; their lab reports, diagnoses and vitals then arrive through the Ayushman Bharat Digital Mission and fill the form.",
  },
  {
    id: "upload",
    title: "Upload reports",
    detail: "Lab, ECG, echo, notes",
    icon: <IconUpload size={18} />,
    plan: "Coming soon: one slot each for the lab report, ECG printout, echo report and clinic note (photo, PDF or WhatsApp forward), read by a vision model that shows where every value came from.",
  },
  {
    id: "speak",
    title: "Speak it",
    detail: "Hindi or English · Sarvam AI",
    icon: <IconMic size={18} />,
    plan: "Coming soon: describe the patient in English or Hindi, and Sarvam AI's speech recognition turns it into the form.",
  },
  {
    id: "sheet",
    title: "Excel / CSV",
    detail: "Screening-camp lists",
    icon: <IconSheet size={18} />,
    plan: "Coming soon: fill in the template for a screening camp, and every patient is scored, highest risk first.",
  },
  {
    id: "manual",
    title: "Fill in manually",
    detail: "Type in the values",
    icon: <IconEdit size={18} />,
  },
];

/** A decorative QR code with a scanning line, for the ABHA tile. */
function QrArt() {
  // a fixed 9 x 9 pattern with the three finder squares, so it reads as a QR code at a glance
  const cells = [
    "111100111",
    "100101001",
    "101100111",
    "111001010",
    "001110100",
    "110010111",
    "111101001",
    "100100101",
    "111110111",
  ];
  return (
    <span aria-hidden="true" className="pk-qr">
      <svg viewBox="0 0 9 9">
        {cells.flatMap((row, y) =>
          [...row].map((cell, x) => (cell === "1" ? <rect height="1" key={`${x}-${y}`} width="1" x={x} y={y} /> : null)),
        )}
      </svg>
      <i className="pk-qr-scan" />
    </span>
  );
}

/**
 * The "Add a new patient" door on the start screen: ABHA first as the largest tile, then report upload, speech,
 * a spreadsheet and the manual form. Methods not built yet say what they will do instead of opening.
 */
export function AddPatientPanel({ onManual, manualReady }: { onManual: () => void; manualReady: boolean }) {
  const [notice, setNotice] = useState<string | null>(null);
  const choose = (method: Method) => {
    if (method.plan) {
      setNotice(method.plan);
    } else {
      onManual();
    }
  };
  const [abha, ...rest] = METHODS;
  return (
    <section aria-labelledby="pk-add-title" className="pk-door pk-door-add">
      <h2 className="pk-door-title" id="pk-add-title">
        Add a new patient
      </h2>
      {/* the panel starts level with the search box opposite, as both door titles sit above their content */}
      <div className="pk-add-box">
        <button className="pk-method pk-method-hero" onClick={() => choose(abha)} type="button">
          <QrArt />
          <span className="pk-method-text">
            <strong>{abha.title}</strong>
            <span className="pk-method-detail">{abha.detail}</span>
          </span>
        </button>
        <div className="pk-methods">
          {rest.map((method) => (
            <button
              className="pk-method"
              disabled={!method.plan && !manualReady}
              key={method.id}
              onClick={() => choose(method)}
              type="button"
            >
              <span aria-hidden="true" className="pk-method-icon">
                {method.icon}
              </span>
              <span className="pk-method-text">
                <strong>{method.title}</strong>
                <span className="pk-method-detail">{method.detail}</span>
              </span>
            </button>
          ))}
        </div>
        <p aria-live="polite" className="pk-notice">
          {notice}
        </p>
      </div>
    </section>
  );
}
