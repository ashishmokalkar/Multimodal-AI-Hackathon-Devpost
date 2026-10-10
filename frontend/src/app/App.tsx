import { useCallback, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePatientStore } from "../store/patientStore";
import { PatientPanel } from "../features/patient/PatientPanel";
import { ModelMetricsDrawer } from "../features/results/ModelMetricsDrawer";
import { ResultsPanel } from "../features/results/ResultsPanel";
import { DisclaimerBanner } from "../features/safety/DisclaimerBanner";
import { DisclaimerModal } from "../features/safety/DisclaimerModal";
import { DISCLAIMER_TEXT } from "../features/safety/disclaimer";
import { ViewerPanel } from "../features/viewer/ViewerPanel";
import { useMetrics } from "../api/hooks";

const DISCLAIMER_STORAGE_KEY = "cad-risk-visualizer-disclaimer-acknowledged";

function AppContent() {
  const metricsQuery = useMetrics();
  const prediction = usePatientStore((state) => state.prediction);
  const metricsButtonRef = useRef<HTMLButtonElement>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const closeMetrics = useCallback(() => setIsMetricsOpen(false), []);
  const [isDisclaimerAcknowledged, setIsDisclaimerAcknowledged] = useState(
    () => window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true",
  );

  const acknowledgeDisclaimer = () => {
    window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
    setIsDisclaimerAcknowledged(true);
  };

  return (
    <div className="app-shell mx-auto w-full max-w-screen-2xl">
      <header className="app-header">
        <div className="masthead">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              CAD
            </div>
            <div className="brand-copy">
              <h1>CAD Risk 3D Visualizer</h1>
              <p>Clinical decision-support prototype</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="model-version">
              Metrics version:{" "}
              <strong>
                {metricsQuery.data?.model_version ??
                  (metricsQuery.isPending ? "loading" : "unavailable")}
              </strong>
            </span>
            <button
              className="metrics-button"
              aria-controls="model-metrics-dialog"
              aria-expanded={isMetricsOpen}
              aria-haspopup="dialog"
              ref={metricsButtonRef}
              type="button"
              onClick={() => setIsMetricsOpen(true)}
            >
              Model metrics
            </button>
          </div>
        </div>
        <DisclaimerBanner />
      </header>

      <main
        className="workspace-grid"
        aria-label="Clinical visualization workspace"
      >
        <PatientPanel />
        <ViewerPanel />
        <ResultsPanel />
      </main>

      <footer className="app-footer">
        <p>{DISCLAIMER_TEXT}</p>
        <div className="footer-credits">
          <div>Dataset credit: pending</div>
          <div>
            Heart asset:{" "}
            <a href="/models/ATTRIBUTION.md" rel="noreferrer" target="_blank">
              Realistic Human Heart by neshallads (CC BY 4.0)
            </a>
          </div>
        </div>
      </footer>

      <ModelMetricsDrawer
        metricsQuery={metricsQuery}
        onClose={closeMetrics}
        open={isMetricsOpen}
        predictionVersion={prediction?.model_version ?? null}
        returnFocusRef={metricsButtonRef}
      />

      {!isDisclaimerAcknowledged && (
        <DisclaimerModal onAcknowledge={acknowledgeDisclaimer} />
      )}
    </div>
  );
}

export function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
