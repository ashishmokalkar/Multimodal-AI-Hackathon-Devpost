import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { MetricsResponse } from "../../api/types";
import { formatProbability } from "../../lib/format";

interface MetricsQueryState {
  data: MetricsResponse | undefined;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

interface ModelMetricsDrawerProps {
  open: boolean;
  onClose: () => void;
  predictionVersion: string | null;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  metricsQuery: MetricsQueryState;
}

const targets = [
  { key: "cad", label: "CAD" },
  { key: "LAD", label: "LAD" },
  { key: "LCX", label: "LCX" },
  { key: "RCA", label: "RCA" },
] as const;

const metrics = [
  { key: "accuracy", label: "Accuracy" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
  { key: "f1", label: "F1" },
  { key: "roc_auc", label: "ROC-AUC" },
] as const;

export function ModelMetricsDrawer({
  open,
  onClose,
  predictionVersion,
  returnFocusRef,
  metricsQuery,
}: ModelMetricsDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const returnFocusElement = returnFocusRef.current;
    closeButtonRef.current?.focus();
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!dialog || !focusable?.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialog.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      returnFocusElement?.focus();
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) {
    return null;
  }

  const data = metricsQuery.data;
  const hasVersionMismatch =
    data !== undefined &&
    predictionVersion !== null &&
    data.model_version !== predictionVersion;

  return (
    <div
      className="metrics-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-describedby="model-metrics-description"
        aria-labelledby="model-metrics-heading"
        aria-modal="true"
        className="metrics-drawer"
        id="model-metrics-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="metrics-drawer-header">
          <div>
            <p className="eyebrow">Model transparency</p>
            <h2 id="model-metrics-heading">Model metrics</h2>
          </div>
          <button
            aria-label="Close model metrics"
            className="metrics-drawer-close"
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="metrics-drawer-content">
          <p
            className="text-xs leading-5 text-slate-600"
            id="model-metrics-description"
          >
            These are model-level validation metrics, not patient predictions.
          </p>

          {metricsQuery.isPending && !data && (
            <p className="metrics-state" role="status">
              Loading model metrics…
            </p>
          )}

          {metricsQuery.isError && !data && (
            <div className="metrics-state metrics-state-error" role="alert">
              <p>
                Model metrics could not be loaded
                {metricsQuery.error ? `: ${metricsQuery.error.message}` : "."}
              </p>
              <button
                className="metrics-retry"
                disabled={metricsQuery.isFetching}
                type="button"
                onClick={() => void metricsQuery.refetch()}
              >
                {metricsQuery.isFetching ? "Retrying…" : "Retry metrics"}
              </button>
            </div>
          )}

          {!data && !metricsQuery.isPending && !metricsQuery.isError && (
            <p className="metrics-state" role="status">
              Model metrics are unavailable; no values are being substituted.
            </p>
          )}

          {metricsQuery.isError && data && (
            <p className="metrics-state metrics-state-error" role="alert">
              The latest metrics request failed
              {metricsQuery.error ? `: ${metricsQuery.error.message}` : ""}.
              Previously loaded API metrics are shown below.
              <button
                className="metrics-retry"
                disabled={metricsQuery.isFetching}
                type="button"
                onClick={() => void metricsQuery.refetch()}
              >
                {metricsQuery.isFetching ? "Retrying…" : "Retry metrics"}
              </button>
            </p>
          )}

          {data && (
            <>
              {data.mock ? (
                <p className="metrics-source-warning" role="note">
                  Mock metrics — illustrative only, not deployed-model evidence.
                </p>
              ) : (
                <p className="metrics-source-note" role="note">
                  Metrics supplied by the configured API; they are not
                  independently verified here.
                </p>
              )}

              {hasVersionMismatch ? (
                <p className="metrics-version-warning" role="alert">
                  Version mismatch: these metrics describe {data.model_version},
                  while the accepted prediction uses {predictionVersion}. They
                  do not validate the currently displayed prediction.
                </p>
              ) : predictionVersion ? (
                <p className="metrics-state" role="status">
                  Metrics and the accepted prediction both identify model
                  version {predictionVersion}. Model-level metrics do not
                  describe this individual prediction.
                </p>
              ) : (
                <p className="metrics-state" role="status">
                  No current accepted prediction is available for version
                  comparison.
                </p>
              )}

              <dl className="metrics-metadata">
                <div>
                  <dt>Metrics model version</dt>
                  <dd>{data.model_version}</dd>
                </div>
                <div>
                  <dt>Validation</dt>
                  <dd>{data.validation}</dd>
                </div>
                <div>
                  <dt>Sample count</dt>
                  <dd>{data.n_samples.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Training date</dt>
                  <dd>
                    <time dateTime={data.trained_at}>{data.trained_at}</time>
                  </dd>
                </div>
              </dl>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[570px] border-collapse text-left text-xs">
                  <caption className="sr-only">
                    Model validation metrics by prediction target
                  </caption>
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-3 font-semibold" scope="col">
                        Metric
                      </th>
                      {targets.map((target) => (
                        <th
                          className="px-3 py-3 font-semibold"
                          key={target.key}
                          scope="col"
                        >
                          {target.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr
                        className="border-t border-slate-100"
                        key={metric.key}
                      >
                        <th
                          className="px-3 py-3 font-medium text-slate-700"
                          scope="row"
                        >
                          {metric.label}
                        </th>
                        {targets.map((target) => (
                          <td
                            className="px-3 py-3 tabular-nums text-slate-800"
                            key={target.key}
                          >
                            {formatProbability(
                              data.targets[target.key][metric.key],
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
