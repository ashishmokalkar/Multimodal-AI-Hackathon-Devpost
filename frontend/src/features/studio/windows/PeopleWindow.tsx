import { useState } from "react";
import { targetColor } from "../../../lib/colorScale";
import type { InsightTarget } from "../../../lib/insights";
import { useUiStore } from "../../../store/uiStore";
import { FloatingWindow } from "../FloatingWindow";
import { IconPeople } from "../icons";
import { EmptyState, TargetChips } from "../parts";
import { probabilityOf, useStudioData } from "../studioData";

const PERSON =
  "M12 4.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm-4.2 16v-5.4c0-2.5 1.8-4.2 4.2-4.2s4.2 1.7 4.2 4.2v5.4Z";

/**
 * "Out of 100 people like this": the model's chance as an icon array, which patients read more accurately than a
 * bare percentage.
 */
export function PeopleWindow() {
  const { shown } = useStudioData();
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const [own, setOwn] = useState<InsightTarget | null>(null);
  const target: InsightTarget = own ?? selectedVessel ?? "cad";
  const count = shown ? Math.round(probabilityOf(shown, target) * 100) : 0;
  const color = target === "cad" ? "var(--s-flag)" : targetColor(target);

  return (
    <FloatingWindow icon={<IconPeople />} id="people" title="100 people like this">
      <TargetChips onChange={setOwn} value={target} />
      {!shown ? (
        <EmptyState>Waiting for a prediction.</EmptyState>
      ) : (
        <div className="people">
          <p className="people-head">
            <b style={{ color }}>{count}</b>
            <span>
              in 100 would have
              <br />
              {target === "cad" ? "significant CAD" : `a narrowed ${target}`}
            </span>
          </p>
          <svg
            aria-label={`${count} of 100 people highlighted`}
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
          <p className="muted-xs">Model estimate for people with the same readings.</p>
        </div>
      )}
    </FloatingWindow>
  );
}
