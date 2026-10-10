import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { usePatientStore } from "../store/patientStore";
import { PatientPanel } from "../features/patient/PatientPanel";
import { ModelMetricsDrawer } from "../features/results/ModelMetricsDrawer";
import { ResultsPanel } from "../features/results/ResultsPanel";
import { DisclaimerBanner } from "../features/safety/DisclaimerBanner";
import { DisclaimerModal } from "../features/safety/DisclaimerModal";
import { DISCLAIMER_TEXT } from "../features/safety/disclaimer";
import { ViewerPanel } from "../features/viewer/ViewerPanel";
import { useApiProfile, useMetrics } from "../api/hooks";
import { useUiStore } from "../store/uiStore";

const DISCLAIMER_STORAGE_KEY = "cad-risk-visualizer-disclaimer-acknowledged";

function AppContent() {
  const queryClient = useQueryClient();
  const profileQuery = useApiProfile();
  const profile = profileQuery.isSuccess ? profileQuery.data : null;
  const metricsQuery = useMetrics();
  const prediction = usePatientStore((state) => state.prediction);
  const previousProfileId = useRef<string | null>(null);
  const metricsButtonRef = useRef<HTMLButtonElement>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const closeMetrics = useCallback(() => setIsMetricsOpen(false), []);
  const [isDisclaimerAcknowledged, setIsDisclaimerAcknowledged] = useState(
    () => window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true",
  );

  useLayoutEffect(() => {
    const nextProfileId = profile?.id ?? null;
    if (previousProfileId.current !== nextProfileId) {
      if (previousProfileId.current !== null) {
        usePatientStore.getState().resetForProfileChange();
        useUiStore.getState().setSelectedVessel(null);
        setIsMetricsOpen(false);
      }
      previousProfileId.current = nextProfileId;
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "api-profile-data" &&
          query.queryKey[1] !== nextProfileId,
      });
    }
  }, [profile?.id, queryClient]);

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
            <span aria-live="polite" className="model-version">
              API profile:{" "}
              <strong>
                {profile
                  ? `${profile.mode === "mock" ? "Mock v1.0.0" : "Real v1.1.0"} · ${profile.health.model_version}`
                  : profileQuery.isPending
                    ? "checking"
                    : "unavailable"}
              </strong>
            </span>
            <button
              className="metrics-button"
              aria-controls="model-metrics-dialog"
              aria-expanded={isMetricsOpen}
              aria-haspopup="dialog"
              disabled={!profile}
              ref={metricsButtonRef}
              type="button"
              onClick={() => setIsMetricsOpen(true)}
            >
              Model metrics
            </button>
          </div>
        </div>
        <DisclaimerBanner />
        {profileQuery.isPending && (
          <p className="prediction-status prediction-status-pending" role="status">
            Checking API health and contract profile…
          </p>
        )}
        {profileQuery.isError && (
          <div className="prediction-status prediction-status-error" role="alert">
            <p>
              The configured API is unavailable or unsupported:{" "}
              {profileQuery.error.message} No mock fallback is used.
            </p>
            <button
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
              disabled={profileQuery.isFetching}
              type="button"
              onClick={() => void profileQuery.refetch()}
            >
              {profileQuery.isFetching ? "Checking…" : "Retry API profile"}
            </button>
          </div>
        )}
      </header>

      <main
        className="workspace-grid"
        aria-label="Clinical visualization workspace"
      >
        <PatientPanel
          key={`patient-${profile?.id ?? "api-profile-unavailable"}`}
        />
        <ViewerPanel />
        <ResultsPanel
          key={`results-${profile?.id ?? "api-profile-unavailable"}`}
        />
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
        predictionMock={prediction?.mock ?? null}
        predictionSource={
          prediction?.mock === false ? prediction.prediction_source : null
        }
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
