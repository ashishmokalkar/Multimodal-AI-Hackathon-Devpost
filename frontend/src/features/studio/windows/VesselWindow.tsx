import { useMemo } from "react";
import { targetColor } from "../../../lib/colorScale";
import { ARTERY_INFO, buildDrivers, driverPillText } from "../../../lib/summary";
import { useUiStore } from "../../../store/uiStore";
import { FloatingWindow } from "../FloatingWindow";
import { IconVessel } from "../icons";
import { BandChip, Delta, Ring, UnsureChip } from "../parts";
import { useStudioData } from "../studioData";
import { percent, riskBand } from "../studioModel";
import { useStudioStore } from "../studioStore";
import { isFlagged } from "../../../lib/flags";

/** Opens when an artery is clicked: its chance, what it supplies, and the three biggest reasons. */
export function VesselWindow() {
  const vessel = useUiStore((state) => state.selectedVessel);
  const setHoveredFactor = useUiStore((state) => state.setHoveredFactor);
  const pinned = useStudioStore((state) => state.pinnedFactor);
  const { shown, accepted, scenario, features } = useStudioData();
  const reasons = useMemo(
    () =>
      vessel && shown && !shown.mock
        ? buildDrivers(
            shown.explanations[vessel],
            features,
            shown.vessels[vessel].probability,
            3,
          ).drivers
        : [],
    [features, shown, vessel],
  );

  if (!vessel || !shown) {
    return null;
  }
  const target = shown.vessels[vessel];
  const color = targetColor(vessel);

  return (
    <FloatingWindow
      accent={color}
      icon={<IconVessel />}
      id="vessel"
      title={`${vessel} · ${ARTERY_INFO[vessel].name}`}
    >
      <div className="vessel">
        <div className="vessel-top">
          <Ring
            color={color}
            ghost={scenario && accepted ? accepted.vessels[vessel].probability : null}
            label={`${vessel} ${percent(target.probability)}%, threshold ${percent(target.threshold)}%`}
            probability={target.probability}
            size={104}
            stroke={9}
            threshold={target.threshold}
          >
            <span className="sl-ring-value">
              {percent(target.probability)}
              <small>%</small>
            </span>
          </Ring>
          <div className="vessel-side">
            <BandChip
              band={riskBand(
                target.probability,
                target.threshold,
                isFlagged(target),
              )}
            />
            {target.uncertain && <UnsureChip />}
            {scenario && accepted && (
              <Delta
                points={
                  (target.probability - accepted.vessels[vessel].probability) * 100
                }
              />
            )}
            <span className="muted-xs">
              Threshold <b>{percent(target.threshold)}%</b>
            </span>
            <span className="muted-xs">{ARTERY_INFO[vessel].region}</span>
          </div>
        </div>
        {reasons.length > 0 && (
          <ul className="reasons" aria-label="Main reasons">
            {reasons.map((reason) => (
              <li
                className={reason.points > 0 ? "sl-raise" : "sl-lower"}
                key={reason.feature}
                onPointerEnter={() => setHoveredFactor(reason.feature)}
                onPointerLeave={() => setHoveredFactor(pinned)}
              >
                <span>{driverPillText(reason)}</span>
                <b>
                  {reason.points > 0 ? "+" : "−"}
                  {Math.abs(Math.round(reason.points))}
                </b>
              </li>
            ))}
          </ul>
        )}
        {target.capped && (
          <p className="muted-xs">Capped at the overall CAD chance.</p>
        )}
      </div>
    </FloatingWindow>
  );
}
