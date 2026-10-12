import { useEffect, useState } from "react";
import type { PredictionResponse, Target } from "../../../api/types";
import {
  RISK_GRADIENT_CSS,
  riskColorAt,
  targetColor,
  thresholdPosition,
} from "../../../lib/colorScale";
import { isFlagged } from "../../../lib/flags";
import { usePatientStore } from "../../../store/patientStore";
import { useUiStore } from "../../../store/uiStore";
import { HeartbeatLoader } from "../../loading/HeartbeatLoader";
import { vesselIds, type VesselId } from "../../viewer/vesselMap";
import { FloatingWindow } from "../FloatingWindow";
import { IconGauge } from "../icons";
import { BandChip, Delta, EmptyState, UnsureChip } from "../parts";
import { toggleArtery } from "../selection";
import { useStudioData } from "../studioData";
import { percent, riskBand, type RiskBand } from "../studioModel";
import { useStudioStore, type RiskView } from "../studioStore";

const VIEWS: { id: RiskView; label: string }[] = [
  { id: "bars", label: "Bars" },
  { id: "tiles", label: "Tiles" },
];

function bandOfTarget(target: Target): RiskBand {
  return riskBand(target.probability, target.threshold, isFlagged(target));
}

function describe(name: string, target: Target): string {
  const band = bandOfTarget(target);
  return `${name} ${percent(target.probability)}%, threshold ${percent(target.threshold)}%, ${band} risk${
    target.uncertain ? ", model unsure" : ""
  }`;
}

/**
 * One chance on the same threshold-centred scale as the artery colours on the heart: the left half runs from 0% to
 * the target's own threshold, the right half from the threshold to 100%. The filled part carries the risk colours, a
 * dot marks the chance and, during a what-if, a hollow ring marks where it was.
 */
function RiskScale({
  target,
  ghost = null,
  label,
  size = "md",
  decorative = false,
}: {
  target: Target;
  ghost?: number | null;
  label: string;
  size?: "md" | "sm";
  /** Inside a button whose own text says the same: hidden from screen readers. */
  decorative?: boolean;
}) {
  const position = thresholdPosition(target.probability, target.threshold) * 100;
  const before =
    ghost === null ? null : thresholdPosition(ghost, target.threshold) * 100;
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={`rk-scale rk-scale-${size}`}
      role={decorative ? undefined : "img"}
    >
      <span className="rk-scale-track" style={{ background: RISK_GRADIENT_CSS }} />
      <span
        className="rk-scale-fill"
        style={{
          width: `${position}%`,
          background: RISK_GRADIENT_CSS,
          backgroundSize: `${position > 0 ? 10000 / position : 100}% 100%`,
        }}
      />
      <span className="rk-scale-threshold" />
      {before !== null && Math.abs(before - position) >= 1 && (
        <span className="rk-scale-ghost" style={{ left: `${before}%` }} />
      )}
      <span
        className="rk-scale-dot"
        style={{ left: `${position}%`, backgroundColor: riskColorAt(position / 100) }}
      />
    </span>
  );
}

function UnsureMark() {
  return (
    <>
      <em aria-hidden="true" className="rk-unsure" title="Model unsure: its 90% prediction set includes both answers">
        ?
      </em>
      <span className="sr-only"> (model unsure)</span>
    </>
  );
}

/** Spoken after an artery's visible text: its threshold and what clicking does. */
function ArteryHint({ target }: { target: Target }) {
  return (
    <span className="sr-only">
      , threshold {percent(target.threshold)}%. Explain in the Why window.
    </span>
  );
}

/** What-if change in points, shown only when the chance actually moved (no "±0" on every target). */
function Change({
  target,
  accepted,
  scenario,
}: {
  target: Target;
  accepted: Target | undefined;
  scenario: boolean;
}) {
  if (!scenario || !accepted) {
    return null;
  }
  const points = (target.probability - accepted.probability) * 100;
  return Math.abs(points) < 0.5 ? null : <Delta points={points} />;
}

interface ViewProps {
  shown: PredictionResponse;
  accepted: PredictionResponse | null;
  scenario: boolean;
  selected: VesselId | null;
}

/** Option 1: the overall chance as a large number over one bar, then the arteries as aligned bars. */
function BarsView({ shown, accepted, scenario, selected }: ViewProps) {
  const cad = shown.cad;
  return (
    <div className="rk-bars">
      <div className="rk-bars-hero">
        <span className="rk-eyebrow">Overall heart disease</span>
        <div className="rk-bars-headline">
          <span className="rk-big">
            {percent(cad.probability)}
            <small>%</small>
          </span>
          <BandChip band={bandOfTarget(cad)} />
          {cad.uncertain && <UnsureChip />}
          <Change accepted={accepted?.cad} scenario={scenario} target={cad} />
        </div>
        <RiskScale
          ghost={scenario && accepted ? accepted.cad.probability : null}
          label={describe("Overall chance of coronary artery disease", cad)}
          target={cad}
        />
        <span aria-hidden="true" className="rk-scale-ticks">
          <span>0%</span>
          <span>Threshold {percent(cad.threshold)}%</span>
          <span>100%</span>
        </span>
      </div>
      <div className="rk-bars-rows">
        {vesselIds.map((vessel) => {
          const target = shown.vessels[vessel];
          const band = bandOfTarget(target);
          return (
            <button
              aria-pressed={selected === vessel}
              className="rk-row"
              key={vessel}
              onClick={() => toggleArtery(vessel)}
              style={{ ["--artery" as string]: targetColor(vessel) }}
              type="button"
            >
              <span className="rk-row-name">
                <i />
                {vessel}
                {target.uncertain && <UnsureMark />}
              </span>
              <RiskScale
                ghost={scenario && accepted ? accepted.vessels[vessel].probability : null}
                decorative
                label={describe(vessel, target)}
                size="sm"
                target={target}
              />
              <span className="rk-row-pct">{percent(target.probability)}%</span>
              <span className={`rk-row-band sl-band-${band}`}>
                {band === "high" ? "▲ High" : band === "moderate" ? "Mod" : "Low"}
              </span>
              <ArteryHint target={target} />
            </button>
          );
        })}
        <span aria-hidden="true" className="rk-rows-caption">
          Arteries · centre line = each one&apos;s own threshold
        </span>
      </div>
    </div>
  );
}

/** Option 2: one tile per target, the overall chance as a wide tile on top. */
function TilesView({ shown, accepted, scenario, selected }: ViewProps) {
  const cad = shown.cad;
  return (
    <div className="rk-tiles">
      <div className="rk-tile rk-tile-hero">
        <span className="rk-eyebrow">Overall heart disease</span>
        <div className="rk-bars-headline">
          <span className="rk-big">
            {percent(cad.probability)}
            <small>%</small>
          </span>
          <BandChip band={bandOfTarget(cad)} />
          {cad.uncertain && <UnsureChip />}
          <Change accepted={accepted?.cad} scenario={scenario} target={cad} />
          <span className="rk-tile-threshold">Threshold {percent(cad.threshold)}%</span>
        </div>
        <RiskScale
          ghost={scenario && accepted ? accepted.cad.probability : null}
          label={describe("Overall chance of coronary artery disease", cad)}
          size="sm"
          target={cad}
        />
      </div>
      {vesselIds.map((vessel) => {
        const target = shown.vessels[vessel];
        return (
          <button
            aria-pressed={selected === vessel}
            className="rk-tile rk-tile-artery"
            key={vessel}
            onClick={() => toggleArtery(vessel)}
            style={{ ["--artery" as string]: targetColor(vessel) }}
            type="button"
          >
            <span className="rk-row-name">
              <i />
              {vessel}
              {target.uncertain && <UnsureMark />}
            </span>
            <span className="rk-tile-pct">
              {percent(target.probability)}
              <small>%</small>
            </span>
            <BandChip band={bandOfTarget(target)} small />
            <Change accepted={accepted?.vessels[vessel]} scenario={scenario} target={target} />
            <RiskScale
              ghost={scenario && accepted ? accepted.vessels[vessel].probability : null}
              decorative
              label={describe(vessel, target)}
              size="sm"
              target={target}
            />
            <ArteryHint target={target} />
          </button>
        );
      })}
    </div>
  );
}

const HINT_KEY = "cardioclarity-explain-hint-seen";

function hintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "true";
  } catch {
    return true;
  }
}

/**
 * The way into the Why window while it is closed: a bold button at the foot of Risk. On the very first visit it
 * pulses gently twice so it is noticed; after that it stays still.
 */
function ExplainButton() {
  const [hint] = useState(() => !hintSeen());
  useEffect(() => {
    try {
      window.localStorage.setItem(HINT_KEY, "true");
    } catch {
      // the hint may show again next visit
    }
  }, []);
  return (
    <div className="rk-explain-wrap">
      <button
        className={`rk-explain${hint ? " is-hint" : ""}`}
        onClick={() => useStudioStore.getState().openWindow("drivers")}
        type="button"
      >
        Explain this prediction
        <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 14 14" width="16">
          <path
            d="M7 2v10M2.5 7.5 7 12l4.5-4.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>
    </div>
  );
}

/** Risk at a glance: the overall chance first, then each artery, all against their own thresholds. */
export function RiskWindow() {
  const { accepted, scenario, shown } = useStudioData();
  const predictionError = usePatientStore((state) => state.predictionError);
  const selected = useUiStore((state) => state.selectedVessel);
  const view = useStudioStore((state) => state.riskView);
  const setView = useStudioStore((state) => state.setRiskView);
  const whyOpen = useStudioStore((state) => state.open.drivers);

  return (
    <FloatingWindow
      actions={
        <>
          {scenario && <span className="pill-whatif">What-if</span>}
          <div aria-label="Risk view" className="sl-segmented sl-segmented-sm" role="group">
            {VIEWS.map((option) => (
              <button
                aria-pressed={view === option.id}
                key={option.id}
                onClick={() => setView(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      }
      icon={<IconGauge />}
      id="risk"
      title="Risk"
    >
      {!shown ? (
        <EmptyState>
          {predictionError ? (
            <span className="text-flag">{predictionError}</span>
          ) : (
            <HeartbeatLoader steps={["Scoring"]} variant="inline" />
          )}
        </EmptyState>
      ) : view === "tiles" ? (
        <TilesView
          accepted={accepted}
          scenario={Boolean(scenario)}
          selected={selected}
          shown={shown}
        />
      ) : (
        <BarsView
          accepted={accepted}
          scenario={Boolean(scenario)}
          selected={selected}
          shown={shown}
        />
      )}
      {shown && !whyOpen && <ExplainButton />}
    </FloatingWindow>
  );
}
