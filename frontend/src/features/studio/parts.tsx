import type { ReactNode } from "react";
import { targetColor } from "../../lib/colorScale";
import { INSIGHT_TARGETS, type InsightTarget } from "../../lib/insights";
import { RISK_WORD, type RiskBand } from "./studioModel";

interface RingProps {
  size: number;
  stroke: number;
  probability: number;
  threshold: number;
  color: string;
  /** Faint second arc: where the value was before a what-if change. */
  ghost?: number | null;
  children?: ReactNode;
  label: string;
}

/** Probability arc with a tick at the decision threshold; the arc animates when the value changes. */
export function Ring({
  size,
  stroke,
  probability,
  threshold,
  color,
  ghost = null,
  children,
  label,
}: RingProps) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const centre = size / 2;
  const angle = (threshold * 360 - 90) * (Math.PI / 180);
  const inner = r - stroke / 2 - 3;
  const outer = r + stroke / 2 + 3;
  return (
    <div className="sl-ring" role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle className="sl-ring-track" cx={centre} cy={centre} fill="none" r={r} strokeWidth={stroke} />
        {ghost !== null && (
          <circle
            className="sl-ring-ghost"
            cx={centre}
            cy={centre}
            fill="none"
            r={r}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - ghost)}
            strokeWidth={stroke}
            transform={`rotate(-90 ${centre} ${centre})`}
          />
        )}
        <circle
          className="sl-ring-arc"
          cx={centre}
          cy={centre}
          fill="none"
          r={r}
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - probability)}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{ filter: `drop-shadow(0 0 ${stroke * 0.9}px ${color}88)` }}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
        <line
          className="sl-ring-tick"
          x1={centre + inner * Math.cos(angle)}
          x2={centre + outer * Math.cos(angle)}
          y1={centre + inner * Math.sin(angle)}
          y2={centre + outer * Math.sin(angle)}
        />
      </svg>
      <div className="sl-ring-centre">{children}</div>
    </div>
  );
}

export function BandChip({ band, small }: { band: RiskBand; small?: boolean }) {
  return (
    <span className={`sl-band sl-band-${band}${small ? " sl-band-sm" : ""}`}>
      {band === "high" ? "▲ " : ""}
      {RISK_WORD[band]}
    </span>
  );
}

export function UnsureChip() {
  return (
    <span
      className="sl-band sl-band-unsure sl-band-sm"
      title="The model is not confident: its 90% prediction set includes both answers."
    >
      ? Unsure
    </span>
  );
}

/** CAD / LAD / LCX / RCA switcher; each chip carries its artery colour. */
export function TargetChips({
  value,
  onChange,
}: {
  value: InsightTarget;
  onChange: (target: InsightTarget) => void;
}) {
  return (
    <div className="sl-chips" role="group" aria-label="Choose what to explain">
      {INSIGHT_TARGETS.map((target) => (
        <button
          aria-pressed={value === target}
          className="sl-chip"
          key={target}
          onClick={() => onChange(target)}
          style={{ ["--chip" as string]: targetColor(target) }}
          type="button"
        >
          <i />
          {target === "cad" ? "Overall" : target}
        </button>
      ))}
    </div>
  );
}

export function Delta({ points }: { points: number }) {
  if (Math.abs(points) < 0.5) {
    return <span className="sl-delta sl-delta-none">±0</span>;
  }
  return (
    <span className={`sl-delta ${points > 0 ? "sl-delta-up" : "sl-delta-down"}`}>
      {points > 0 ? "▲" : "▼"} {Math.abs(Math.round(points))}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="sl-empty">{children}</div>;
}
