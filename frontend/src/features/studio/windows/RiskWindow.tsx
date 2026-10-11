import { targetColor } from "../../../lib/colorScale";
import { usePatientStore } from "../../../store/patientStore";
import { useUiStore } from "../../../store/uiStore";
import { HeartbeatLoader } from "../../loading/HeartbeatLoader";
import { vesselIds, type VesselId } from "../../viewer/vesselMap";
import { FloatingWindow } from "../FloatingWindow";
import { IconGauge } from "../icons";
import { BandChip, Delta, EmptyState, Ring, UnsureChip } from "../parts";
import { bandOf, useStudioData } from "../studioData";
import { percent, riskBand } from "../studioModel";
import { useStudioStore } from "../studioStore";

const FLAG_COLOR = "var(--s-flag)";

/** Risk at a glance: the overall chance as a large gauge, then each artery as a small ring. */
export function RiskWindow() {
  const { accepted, scenario, shown } = useStudioData();
  const predictionError = usePatientStore((state) => state.predictionError);
  const selectedVessel = useUiStore((state) => state.selectedVessel);

  const pick = (vessel: VesselId) => {
    const next = selectedVessel === vessel ? null : vessel;
    useUiStore.getState().setSelectedVessel(next);
    const studio = useStudioStore.getState();
    studio.focus(next);
    if (next) {
      studio.openWindow("vessel");
    } else {
      studio.closeWindow("vessel");
    }
  };

  return (
    <FloatingWindow
      actions={scenario ? <span className="pill-whatif">What-if</span> : null}
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
      ) : (
        <div className="risk">
          <div className="sl-risk-hero">
            <Ring
              color={
                shown.cad.probability >= shown.cad.threshold
                  ? FLAG_COLOR
                  : "var(--s-accent)"
              }
              ghost={scenario && accepted ? accepted.cad.probability : null}
              label={`Overall chance of coronary artery disease ${percent(shown.cad.probability)}%, threshold ${percent(shown.cad.threshold)}%`}
              probability={shown.cad.probability}
              size={148}
              stroke={11}
              threshold={shown.cad.threshold}
            >
              <span className="sl-ring-value">
                {percent(shown.cad.probability)}
                <small>%</small>
              </span>
              <span className="sl-ring-caption">CAD chance</span>
            </Ring>
            <div className="sl-risk-hero-side">
              <BandChip band={bandOf(shown, "cad")} />
              {shown.cad.uncertain && <UnsureChip />}
              {scenario && accepted && (
                <Delta
                  points={
                    (shown.cad.probability - accepted.cad.probability) * 100
                  }
                />
              )}
              <span className="muted-xs">
                Threshold <b>{percent(shown.cad.threshold)}%</b>
              </span>
            </div>
          </div>
          <div className="risk-arteries">
            {vesselIds.map((vessel) => {
              const target = shown.vessels[vessel];
              const band = riskBand(target.probability, target.threshold);
              return (
                <button
                  aria-pressed={selectedVessel === vessel}
                  className="risk-artery"
                  key={vessel}
                  onClick={() => pick(vessel)}
                  style={{ ["--artery" as string]: targetColor(vessel) }}
                  type="button"
                >
                  <Ring
                    color={targetColor(vessel)}
                    ghost={
                      scenario && accepted
                        ? accepted.vessels[vessel].probability
                        : null
                    }
                    label={`${vessel} ${percent(target.probability)}%, threshold ${percent(target.threshold)}%`}
                    probability={target.probability}
                    size={62}
                    stroke={6}
                    threshold={target.threshold}
                  >
                    <span className="sl-ring-value-sm">
                      {percent(target.probability)}
                    </span>
                  </Ring>
                  <span className="risk-artery-name">
                    {vessel}
                    {target.uncertain && (
                      <em title="Model unsure: its 90% prediction set includes both answers">
                        ?
                      </em>
                    )}
                  </span>
                  <BandChip band={band} small />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </FloatingWindow>
  );
}
