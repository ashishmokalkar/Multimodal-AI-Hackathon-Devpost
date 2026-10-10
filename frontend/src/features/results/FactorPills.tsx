import type { ReactNode } from "react";
import { LOWER_COLOR, RAISE_COLOR } from "../../lib/insights";
import { driverPillText, type Driver } from "../../lib/summary";
import { useUiStore } from "../../store/uiStore";

/** One simple line icon per input group, so the kind of factor is recognisable at a glance. */
const GROUP_ICONS: Record<string, { title: string; path: ReactNode }> = {
  Demographics: {
    title: "Patient and history",
    path: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c0-3.9 3.1-6.2 7-6.2s7 2.3 7 6.2" />
      </>
    ),
  },
  "Symptoms/Exam": {
    title: "Symptom or examination",
    path: (
      <>
        <path d="M6 3v5.5a5 5 0 0 0 10 0V3" />
        <path d="M11 13.5V16a4 4 0 0 0 8 0v-1.5" />
        <circle cx="19" cy="12.5" r="2" />
      </>
    ),
  },
  ECG: {
    title: "ECG finding",
    path: <path d="M2 12h4.5l2-5 4 10 2.5-6 1.5 1H22" />,
  },
  Lab: {
    title: "Blood test",
    path: <path d="M12 3.5s6 6.6 6 10.6a6 6 0 0 1-12 0c0-4 6-10.6 6-10.6z" />,
  },
  Echo: {
    title: "Heart ultrasound (echo)",
    path: (
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />
    ),
  },
};

function GroupIcon({ group }: { group: string }) {
  const icon = GROUP_ICONS[group];
  return (
    <svg aria-hidden="true" className="factor-pill-icon" viewBox="0 0 24 24">
      {icon?.path ?? <circle cx="12" cy="12" r="4" />}
    </svg>
  );
}

interface FactorPillsProps {
  raising: Driver[];
  lowering: Driver[];
}

/** The headline drivers as pills: what pushes the estimate up, what pulls it down, each with its points. */
export function FactorPills({ raising, lowering }: FactorPillsProps) {
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);

  const row = (kind: "raise" | "lower", drivers: Driver[]) => {
    const color = kind === "raise" ? RAISE_COLOR : LOWER_COLOR;
    return (
      <div className={`factor-pills-row factor-pills-${kind}`}>
        <span className="factor-pills-label" style={{ color }}>
          <span aria-hidden="true">{kind === "raise" ? "▲" : "▼"}</span>
          {kind === "raise" ? "Raises risk" : "Lowers risk"}
        </span>
        <ul className="factor-pills-list">
          {drivers.map((driver) => (
            <li
              aria-label={`${driverPillText(driver)}: ${kind === "raise" ? "raises" : "lowers"} the estimate by ${Math.abs(
                Math.round(driver.points),
              )} points`}
              className={`factor-pill ${hoveredFactor && hoveredFactor !== driver.feature ? "factor-pill-dim" : ""}`}
              key={driver.feature}
              tabIndex={0}
              title={GROUP_ICONS[driver.group]?.title}
              onBlur={() => setHoveredFactor(null)}
              onFocus={() => setHoveredFactor(driver.feature)}
              onMouseEnter={() => setHoveredFactor(driver.feature)}
              onMouseLeave={() => setHoveredFactor(null)}
            >
              <span
                className="factor-pill-badge"
                style={{ color, backgroundColor: `${color}1a` }}
              >
                <GroupIcon group={driver.group} />
              </span>
              <span className="factor-pill-text">{driverPillText(driver)}</span>
              <span className="factor-pill-points" style={{ color }}>
                {kind === "raise" ? "+" : "−"}
                {Math.abs(Math.round(driver.points))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (raising.length === 0 && lowering.length === 0) {
    return (
      <p className="factor-pills-empty">
        No single input moves this estimate much from a typical patient&apos;s.
      </p>
    );
  }
  return (
    <div className="factor-pills">
      {raising.length > 0 && row("raise", raising)}
      {lowering.length > 0 && row("lower", lowering)}
    </div>
  );
}
