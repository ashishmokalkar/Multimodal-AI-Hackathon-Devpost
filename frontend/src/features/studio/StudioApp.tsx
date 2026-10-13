import { useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { Dock, HeartBar, Toasts, TopBar, Watermark } from "./StudioChrome";
import { StudioScene } from "./StudioScene";
import { TourOverlay } from "./TourOverlay";
import { usePredictionDriver } from "./usePredictionDriver";
import { clearSelection } from "./selection";
import { useStudioStore } from "./studioStore";
import { useStudioData } from "./studioData";
import { isFlagged } from "../../lib/flags";
import { vesselIds } from "../viewer/vesselMap";
import { useCompact } from "./useCompact";
import { CompareWindow } from "./windows/CompareWindow";
import { DriversWindow } from "./windows/DriversWindow";
import { FactorsWindow } from "./windows/FactorsWindow";
import { MeasuresWindow } from "./windows/MeasuresWindow";
import { ModelWindow } from "./windows/ModelWindow";
import { PatientWindow } from "./windows/PatientWindow";
import { PeopleWindow } from "./windows/PeopleWindow";
import { RiskWindow } from "./windows/RiskWindow";
import { WhatIfWindow } from "./windows/WhatIfWindow";
import "./studio.css";

/** The window dock (bottom left) is hidden for now: the windows stay reachable from Ctrl+K and the Risk window. */
const SHOW_DOCK = false;

/**
 * Studio: the heart fills the screen and every result floats over it in a glass window that can be moved, resized,
 * hidden to the dock or found with the command bar.
 */
/** Tells screen-reader users when a new result is on screen (the windows update silently). */
function ResultAnnouncer() {
  const { shown, scenario } = useStudioData();
  if (!shown) {
    return <p aria-live="polite" className="sr-only" />;
  }
  const flagged = vesselIds.filter((artery) => isFlagged(shown.vessels[artery]));
  return (
    <p aria-atomic="true" aria-live="polite" className="sr-only">
      {scenario ? "What-if result: " : "Result: "}
      chance of coronary artery disease {Math.round(shown.cad.probability * 100)}%,{" "}
      {isFlagged(shown.cad) ? "flagged" : "not flagged"}.{" "}
      {flagged.length ? `Arteries flagged: ${flagged.join(", ")}.` : "No artery flagged."}
    </p>
  );
}

export function StudioApp() {
  usePredictionDriver();
  const theme = useStudioStore((state) => state.theme);
  const glass = useStudioStore((state) => state.glass);
  const touring = useStudioStore((state) => state.tour.active);
  const compact = useCompact();

  useEffect(() => {
    document.body.classList.add("studio-body");
    return () => document.body.classList.remove("studio-body");
  }, []);

  useEffect(() => {
    const fit = () => useStudioStore.getState().fitToViewport();
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const studio = useStudioStore.getState();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        studio.setPaletteOpen(!studio.paletteOpen);
        return;
      }
      if (event.key === "Escape" && !studio.paletteOpen && !studio.tour.active) {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`studio${touring ? " is-touring" : ""}${compact ? " is-compact" : ""}`}
      data-theme={theme}
      style={{ ["--glass" as string]: glass }}
    >
      <section aria-label="3D heart" className="studio-stage">
        <StudioScene />
      </section>
      <TopBar />
      <aside aria-label="3D view controls" className="studio-landmark">
        <HeartBar />
      </aside>
      <main className="studio-windows" aria-label="Results">
        <PatientWindow />
        <RiskWindow />
        <DriversWindow />
        <WhatIfWindow />
        <FactorsWindow />
        <PeopleWindow />
        <CompareWindow />
        <MeasuresWindow />
        <ModelWindow />
        <ResultAnnouncer />
        <p className="sr-only" id="sw-arrange-hint">
          Arrow keys move the window; Shift and arrow keys resize it.
        </p>
      </main>
      {SHOW_DOCK && <Dock />}
      <Watermark />
      <Toasts />
      <TourOverlay />
      <CommandPalette />
    </div>
  );
}

export default StudioApp;
