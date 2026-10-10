import { useEffect, useState } from "react";

/** What the backend is doing while a prediction is on its way (validate -> score -> calibrate -> explain). */
const PREDICTION_STEPS = [
  "Checking the patient's inputs",
  "Scoring CAD, LAD, LCX and RCA",
  "Calibrating the probabilities",
  "Explaining every factor",
] as const;

type Variant = "stage" | "panel" | "inline";

interface HeartbeatLoaderProps {
  variant?: Variant;
  title?: string;
  /** Rotating captions; a single entry stays fixed. */
  steps?: readonly string[];
  className?: string;
}

// One ECG beat (P wave, QRS complex, T wave) twice across the trace; pathLength normalises the dash animation.
const ECG_PATH =
  "M0 34 H34 q4 -7 8 0 H58 l4 6 l6 -28 l6 32 l4 -10 H96 q9 -13 18 0 H128 q4 -7 8 0 H152 l4 6 l6 -28 l6 32 l4 -10 H190 q9 -13 18 0 H240";
const HEART_PATH =
  "M12 21.2s-7.6-4.7-9.7-9.3C.8 8.4 2.9 4.4 6.6 4.4c2.1 0 3.6 1.1 4.5 2.6.9-1.5 2.4-2.6 4.5-2.6 3.7 0 5.8 4 4.3 7.5-2.1 4.6-9.9 9.3-9.9 9.3z";
// Schematic coronary branches, matching the 3D view's LAD / LCX / RCA order.
const BRANCHES = [
  { id: "LAD", d: "M12 7.4c.3 3.6 1 7.2.2 11.4" },
  { id: "LCX", d: "M12.3 7.5c2.3.4 4.6 1.6 5.8 4" },
  { id: "RCA", d: "M11.7 7.5c-2.1.4-4.4 1.8-5.6 4.4" },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) {
      return;
    }
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function EcgTrace({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`hb-ecg ${className ?? ""}`} viewBox="0 0 240 48">
      <defs>
        <linearGradient id="hb-ecg-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#3a7bbf" />
          <stop offset="55%" stopColor="#c98400" />
          <stop offset="100%" stopColor="#b0127a" />
        </linearGradient>
      </defs>
      <path className="hb-ecg-grid" d={ECG_PATH} pathLength={100} />
      <path className="hb-ecg-trace" d={ECG_PATH} pathLength={100} stroke="url(#hb-ecg-gradient)" />
    </svg>
  );
}

/**
 * Project-themed loading state: a heart whose three coronary arteries light up in turn over a live ECG trace,
 * with captions describing the real work in progress. Used only where the user waits for something meaningful.
 */
export function HeartbeatLoader({
  variant = "panel",
  title = "Reading the heart",
  steps = PREDICTION_STEPS,
  className = "",
}: HeartbeatLoaderProps) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (steps.length < 2 || reduced) {
      return;
    }
    const timer = setInterval(() => setStep((current) => (current + 1) % steps.length), 1100);
    return () => clearInterval(timer);
  }, [steps.length, reduced]);

  if (variant === "inline") {
    return (
      <span className={`hb-inline ${className}`} role="status">
        <EcgTrace className="hb-ecg-inline" />
        <span>{steps[0] ?? title}</span>
      </span>
    );
  }

  return (
    <div aria-live="polite" className={`hb-loader hb-${variant} ${reduced ? "hb-reduced" : ""} ${className}`} role="status">
      <svg aria-hidden="true" className="hb-heart" viewBox="0 0 24 24">
        <defs>
          <linearGradient id={`hb-heart-${variant}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d6336c" />
            <stop offset="100%" stopColor="#8c1d55" />
          </linearGradient>
        </defs>
        <path d={HEART_PATH} fill={`url(#hb-heart-${variant})`} />
        {BRANCHES.map((branch, index) => (
          <path
            className="hb-branch"
            d={branch.d}
            key={branch.id}
            pathLength={100}
            style={{ animationDelay: `${index * 0.33}s` }}
          />
        ))}
      </svg>
      <EcgTrace />
      <p className="hb-title">{title}</p>
      <p className="hb-step" key={step}>
        {steps[step] ?? ""}
        <span aria-hidden="true" className="hb-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </div>
  );
}
