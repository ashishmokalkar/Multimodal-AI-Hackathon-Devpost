import { useState } from "react";
import { targetColor } from "../../../lib/colorScale";
import type { InsightTarget } from "../../../lib/insights";
import { useUiStore } from "../../../store/uiStore";
import { FloatingWindow } from "../FloatingWindow";
import { IconPeople } from "../icons";
import { EmptyState, TargetChips } from "../parts";
import { probabilityOf, useStudioData } from "../studioData";
import { WINDOW_TITLES } from "../windowTitles";

const PERSON =
  "M12 4.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm-4.2 16v-5.4c0-2.5 1.8-4.2 4.2-4.2s4.2 1.7 4.2 4.2v5.4Z";

const OUTCOME: Record<InsightTarget, string> = {
  cad: "significant narrowing in at least one heart artery",
  LAD: "significant narrowing of the LAD",
  LCX: "significant narrowing of the LCX",
  RCA: "significant narrowing of the RCA",
};

/**
 * The estimate as an icon array: out of 100 patients with exactly these results, how many would have significant
 * narrowing on an angiogram. Patients read a chance more accurately as "67 of 100" than as "67%".
 */
export function PeopleWindow() {
  const { shown } = useStudioData();
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const [own, setOwn] = useState<InsightTarget | null>(null);
  const target: InsightTarget = own ?? selectedVessel ?? "cad";
  const count = shown ? Math.round(probabilityOf(shown, target) * 100) : 0;
  const color = target === "cad" ? "var(--s-flag)" : targetColor(target);

  return (
    <FloatingWindow icon={<IconPeople />} id="people" title={WINDOW_TITLES.people}>
      <TargetChips onChange={setOwn} value={target} />
      {!shown ? (
        <EmptyState>Waiting for a prediction.</EmptyState>
      ) : (
        <div className="people">
          <p className="people-head">
            <b style={{ color }}>
              {count}
              <small> of 100</small>
            </b>
            <span>
              patients with these exact results would have {OUTCOME[target]}
            </span>
          </p>
          <svg
            aria-label={`${count} of 100 patient icons filled: with narrowing; ${100 - count} empty: without`}
            className="people-grid"
            role="img"
            viewBox="0 0 240 240"
          >
            {Array.from({ length: 100 }, (_, index) => {
              const row = Math.floor(index / 10);
              const col = index % 10;
              const on = index < count;
              return (
                <path
                  className={on ? "on" : "off"}
                  d={PERSON}
                  key={index}
                  style={{
                    fill: on ? color : undefined,
                    transitionDelay: `${index * 6}ms`,
                  }}
                  transform={`translate(${col * 24} ${row * 24})`}
                />
              );
            })}
          </svg>
          <ul className="people-legend">
            <li>
              <i style={{ background: color }} />
              <b>{count}</b> with narrowing
            </li>
            <li>
              <i className="is-off" />
              <b>{100 - count}</b> without
            </li>
          </ul>
          <p className="muted-xs">
            A picture of the model&apos;s {count}% estimate: a chance for this patient, not a count of real people.
          </p>
        </div>
      )}
    </FloatingWindow>
  );
}
