import { LOWER_COLOR, RAISE_COLOR } from "../../lib/insights";
import type { DriverSummary } from "../../lib/summary";
import { targetColor, type TargetId } from "../../lib/colorScale";

interface DriversChartProps {
  summary: DriverSummary;
  /** Target shown ("cad" or an artery), for its colour. */
  targetId: TargetId;
  /** "coronary artery disease" or an artery name, used in the title. */
  subject: string;
  activeFactor: string | null;
  onHoverFactor: (feature: string | null) => void;
  /** Shown when an artery is selected, to go back to the overall result. */
  onBack?: () => void;
}

const signed = (points: number) =>
  `${points >= 0 ? "+" : "−"}${Math.abs(Math.round(points))}`;

/**
 * What moves this estimate: bars to the right raise it, bars to the left lower it, all measured from a typical
 * patient. Hovering a row lights the same input up on the 3D heart.
 */
export function DriversChart({
  summary,
  targetId,
  subject,
  activeFactor,
  onHoverFactor,
  onBack,
}: DriversChartProps) {
  const rest =
    summary.rest && Math.abs(summary.rest.points) >= 0.5 ? summary.rest : null;
  const scale = Math.max(
    10,
    ...summary.drivers.map((driver) => Math.abs(driver.points)),
    rest ? Math.abs(rest.points) : 0,
  );
  const base = Math.round(summary.basePercent);
  const final = Math.round(summary.finalPercent);

  return (
    <section aria-labelledby="drivers-heading" className="result-section">
      <div className="flex items-start justify-between gap-2">
        <h3 className="result-section-title" id="drivers-heading">
          What is driving the {subject} result
        </h3>
        {onBack && (
          <button className="result-link" type="button" onClick={onBack}>
            Back to overall
          </button>
        )}
      </div>

      <div
        aria-label={`A typical patient scores ${base}%. This patient scores ${final}%.`}
        className="drivers-journey"
        role="img"
      >
        <span className="drivers-journey-stop">
          <span className="drivers-journey-value" style={{ color: "#475569" }}>
            {base}%
          </span>
          <span className="drivers-journey-label">Typical patient</span>
        </span>
        <span aria-hidden="true" className="drivers-journey-arrow">
          <span>this patient&apos;s factors</span>
        </span>
        <span className="drivers-journey-stop">
          <span
            className="drivers-journey-value"
            style={{
              color: targetColor(targetId),
            }}
          >
            {final}%
          </span>
          <span className="drivers-journey-label">This patient</span>
        </span>
      </div>

      {summary.drivers.length === 0 ? (
        <p className="result-section-lead">
          No single input moves this result by more than one point.
        </p>
      ) : (
        <ul className="drivers-list">
          {summary.drivers.map((driver) => {
            const raises = driver.points >= 0;
            const width = `${(Math.abs(driver.points) / scale) * 100}%`;
            const color = raises ? RAISE_COLOR : LOWER_COLOR;
            return (
              <li
                aria-label={`${driver.label}, ${driver.valueText}: ${raises ? "raises" : "lowers"} the result by ${Math.abs(
                  Math.round(driver.points),
                )} points`}
                className={`drivers-row ${activeFactor && activeFactor !== driver.feature ? "drivers-row-dim" : ""}`}
                key={driver.feature}
                tabIndex={0}
                onBlur={() => onHoverFactor(null)}
                onFocus={() => onHoverFactor(driver.feature)}
                onMouseEnter={() => onHoverFactor(driver.feature)}
                onMouseLeave={() => onHoverFactor(null)}
              >
                <span className="drivers-label">
                  <span className="drivers-name">{driver.label}</span>
                  <span className="drivers-value">{driver.valueText}</span>
                </span>
                <span aria-hidden="true" className="drivers-track">
                  <span className="drivers-half drivers-half-lower">
                    {!raises && (
                      <span
                        className="drivers-bar"
                        style={{ width, background: color }}
                      />
                    )}
                  </span>
                  <span className="drivers-axis" />
                  <span className="drivers-half">
                    {raises && (
                      <span
                        className="drivers-bar"
                        style={{ width, background: color }}
                      />
                    )}
                  </span>
                </span>
                <span className="drivers-points" style={{ color }}>
                  {signed(driver.points)}
                </span>
              </li>
            );
          })}
          {rest && (
            <li
              aria-label={`${rest.count} other inputs together ${rest.points >= 0 ? "raise" : "lower"} the result by ${Math.abs(Math.round(rest.points))} points`}
              className="drivers-row drivers-row-rest"
            >
              <span className="drivers-label">
                <span className="drivers-name">All other inputs</span>
                <span className="drivers-value">
                  {rest.count} smaller effects combined
                </span>
              </span>
              <span aria-hidden="true" className="drivers-track">
                <span className="drivers-half drivers-half-lower">
                  {rest.points < 0 && (
                    <span
                      className="drivers-bar drivers-bar-rest"
                      style={{
                        width: `${(Math.abs(rest.points) / scale) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span className="drivers-axis" />
                <span className="drivers-half">
                  {rest.points >= 0 && (
                    <span
                      className="drivers-bar drivers-bar-rest"
                      style={{
                        width: `${(Math.abs(rest.points) / scale) * 100}%`,
                      }}
                    />
                  )}
                </span>
              </span>
              <span className="drivers-points drivers-points-rest">
                {signed(rest.points)}
              </span>
            </li>
          )}
        </ul>
      )}

      <div aria-hidden="true" className="drivers-foot">
        <span className="drivers-foot-scale">
          <span>
            <span className="drivers-key" style={{ background: LOWER_COLOR }} />
            lowers risk
          </span>
          <span>
            raises risk
            <span className="drivers-key" style={{ background: RAISE_COLOR }} />
          </span>
        </span>
      </div>
      <p className="drivers-note">
        Numbers are percentage points added to or taken away from the typical
        patient&apos;s {base}%. They add up to this patient&apos;s {final}% and
        show how the model reasons, not proven causes.
      </p>
    </section>
  );
}
