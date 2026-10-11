import { useMetrics } from "../../../api/hooks";
import { targetColor } from "../../../lib/colorScale";
import { INSIGHT_TARGETS } from "../../../lib/insights";
import { FloatingWindow } from "../FloatingWindow";
import { IconChart } from "../icons";
import { EmptyState } from "../parts";

/** Position of an AUC on a 0.5 (chance) to 1.0 (perfect) track. */
function aucPosition(value: number): number {
  return Math.min(100, Math.max(0, ((value - 0.5) / 0.5) * 100));
}

/** How well each model separates patients with and without disease on held-out data, with its 95% interval. */
export function ModelWindow() {
  const metrics = useMetrics();
  const data = metrics.data;

  return (
    <FloatingWindow icon={<IconChart />} id="model" title="Model accuracy">
      {!data ? (
        <EmptyState>
          {metrics.isError ? "Metrics unavailable." : "Loading metrics…"}
        </EmptyState>
      ) : (
        <div className="sl-model">
          <div className="sl-model-scale" aria-hidden="true">
            <span>0.5 chance</span>
            <span>ROC-AUC</span>
            <span>1.0 perfect</span>
          </div>
          {INSIGHT_TARGETS.map((target) => {
            const row = data.targets[target];
            const ci = "roc_auc_ci95" in row ? row.roc_auc_ci95 : null;
            const threshold = "threshold" in row ? row.threshold : null;
            return (
              <div className="sl-model-row" key={target}>
                <span className="sl-model-name" style={{ color: targetColor(target) }}>
                  {target === "cad" ? "CAD" : target}
                </span>
                <span className="sl-model-track">
                  {ci && (
                    <i
                      className="sl-model-ci"
                      style={{
                        left: `${aucPosition(ci[0])}%`,
                        width: `${aucPosition(ci[1]) - aucPosition(ci[0])}%`,
                      }}
                    />
                  )}
                  <i
                    className="sl-model-dot"
                    style={{
                      left: `${aucPosition(row.roc_auc)}%`,
                      background: targetColor(target),
                    }}
                  />
                </span>
                <span className="sl-model-value">{row.roc_auc.toFixed(2)}</span>
                <span className="sl-model-sub">
                  Finds {Math.round(row.recall * 100)}% of cases
                  {threshold !== null && ` · flag ≥ ${Math.round(threshold * 100)}%`}
                </span>
              </div>
            );
          })}
          <p className="muted-xs" title={data.validation}>
            Held-out cross-validation · {data.n_samples} patients
          </p>
        </div>
      )}
    </FloatingWindow>
  );
}
