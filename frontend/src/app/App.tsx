import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import { HeartbeatLoader } from "../features/loading/HeartbeatLoader";
import { PatientPicker } from "../features/start/PatientPicker";
import {
  useApiProfile,
  useFeatures,
  useImportance,
  useMetrics,
} from "../api/hooks";
import { useUiStore } from "../store/uiStore";

// The 3D viewer carries three.js, react-three-fiber and drei; load it in its own chunk.
const ViewerPanel = lazy(() =>
  import("../features/viewer/ViewerPanel").then((module) => ({
    default: module.ViewerPanel,
  })),
);

// The printable patient report (with its own 3D snapshots) loads when it is opened.
const PatientReport = lazy(() => import("../features/report/PatientReport"));

// Studio is a separate full-screen interface; load it (and its effects library) only when it is chosen.
const StudioApp = lazy(() => import("../features/studio/StudioApp"));

const DISCLAIMER_STORAGE_KEY = "cardioclarity-disclaimer-acknowledged";

function AppContent() {
  const queryClient = useQueryClient();
  const profileQuery = useApiProfile();
  const profile = profileQuery.isSuccess ? profileQuery.data : null;
  const metricsQuery = useMetrics();
  const importanceQuery = useImportance();
  const featuresQuery = useFeatures();
  const featureLabels = new Map(
    (featuresQuery.data ?? []).map((feature) => [feature.name, feature.label]),
  );
  const prediction = usePatientStore((state) => state.prediction);
  const uiVersion = useUiStore((state) => state.uiVersion);
  const reportOpen = useUiStore((state) => state.reportOpen);
  const patientChosen = useUiStore((state) => state.patientChosen);
  const setUiVersion = useUiStore((state) => state.setUiVersion);
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

  // every visit starts by choosing a patient; the workspace opens on that patient
  if (!patientChosen) {
    return (
      <>
        <PatientPicker />
        {!isDisclaimerAcknowledged && (
          <DisclaimerModal onAcknowledge={acknowledgeDisclaimer} />
        )}
      </>
    );
  }

  if (uiVersion === "studio") {
    return (
      <>
        <Suspense
          fallback={
            <div className="studio-boot">
              <HeartbeatLoader
                steps={["Loading CardioClarity Studio"]}
                title="Preparing the studio"
                variant="stage"
              />
            </div>
          }
        >
          <StudioApp />
        </Suspense>
        {reportOpen && (
          <Suspense fallback={null}>
            <PatientReport />
          </Suspense>
        )}
        {!isDisclaimerAcknowledged && (
          <DisclaimerModal onAcknowledge={acknowledgeDisclaimer} />
        )}
      </>
    );
  }

  return (
    <div className="app-shell mx-auto w-full max-w-screen-2xl">
      <a className="skip-link" href="#results-panel-heading">
        Skip to results
      </a>
      <header className="app-header">
        <div className="masthead">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              CC
            </div>
            <div className="brand-copy">
              <h1>CardioClarity</h1>
              <p>Clinical decision-support prototype</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="metrics-button"
              title="Back to the patient list"
              type="button"
              onClick={() => useUiStore.getState().setPatientChosen(false)}
            >
              All patients
            </button>
            <button
              className="studio-switch"
              title="Open the immersive Studio interface"
              type="button"
              onClick={() => setUiVersion("studio")}
            >
              ✦ Studio
            </button>
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
          <p
            className="prediction-status prediction-status-pending"
            role="status"
          >
            Checking API health and contract profile…
          </p>
        )}
        {profileQuery.isError && (
          <div
            className="prediction-status prediction-status-error"
            role="alert"
          >
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
        <Suspense
          fallback={
            <section
              aria-label="3D heart loading"
              className="panel viewer-panel"
            >
              <HeartbeatLoader
                steps={["Loading the 3D viewer"]}
                title="Preparing the 3D heart"
                variant="stage"
              />
            </section>
          }
        >
          <ViewerPanel />
        </Suspense>
        <ResultsPanel
          key={`results-${profile?.id ?? "api-profile-unavailable"}`}
        />
      </main>

      <footer className="app-footer">
        <p>{DISCLAIMER_TEXT}</p>
        <div className="footer-credits">
          <div>
            {profile?.mode === "real"
              ? "Dataset: Z-Alizadeh Sani extension (UCI #411; source-reported CC BY 4.0)."
              : profile?.mode === "mock"
                ? "Dataset: project-generated synthetic sample records."
                : "Dataset attribution appears after the API profile is checked."}
          </div>
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
        importance={importanceQuery.data ?? null}
        featureLabels={featureLabels}
        onClose={closeMetrics}
        open={isMetricsOpen}
        predictionVersion={prediction?.model_version ?? null}
        predictionMock={prediction?.mock ?? null}
        predictionSource={
          prediction?.mock === false ? prediction.prediction_source : null
        }
        returnFocusRef={metricsButtonRef}
      />

      {reportOpen && (
        <Suspense fallback={null}>
          <PatientReport />
        </Suspense>
      )}

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
