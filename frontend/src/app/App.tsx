import { useState } from "react";
import { PatientPanel } from "../features/patient/PatientPanel";
import { ResultsPanel } from "../features/results/ResultsPanel";
import { DisclaimerBanner } from "../features/safety/DisclaimerBanner";
import { DisclaimerModal } from "../features/safety/DisclaimerModal";
import { DISCLAIMER_TEXT } from "../features/safety/disclaimer";
import { ViewerPanel } from "../features/viewer/ViewerPanel";

const DISCLAIMER_STORAGE_KEY = "cad-risk-visualizer-disclaimer-acknowledged";

export function App() {
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
              Model version: <strong>not connected</strong>
            </span>
            <button
              className="metrics-button"
              type="button"
              disabled
              title="Model metrics are planned for a later phase."
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
          <div>Asset licences: pending</div>
        </div>
      </footer>

      {!isDisclaimerAcknowledged && (
        <DisclaimerModal onAcknowledge={acknowledgeDisclaimer} />
      )}
    </div>
  );
}

export default App;
