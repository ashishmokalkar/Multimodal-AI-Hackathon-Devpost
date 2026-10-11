import { useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { CommandPalette } from "./CommandPalette";
import { Dock, Toasts, Toolbar, TopBar, Watermark } from "./StudioChrome";
import { StudioScene } from "./StudioScene";
import { TourOverlay } from "./TourOverlay";
import { usePredictionDriver } from "./usePredictionDriver";
import { useStudioStore } from "./studioStore";
import { useCompact } from "./useCompact";
import { DriversWindow } from "./windows/DriversWindow";
import { FactorsWindow } from "./windows/FactorsWindow";
import { MeasuresWindow } from "./windows/MeasuresWindow";
import { ModelWindow } from "./windows/ModelWindow";
import { PatientWindow } from "./windows/PatientWindow";
import { PeopleWindow } from "./windows/PeopleWindow";
import { RiskWindow } from "./windows/RiskWindow";
import { VesselWindow } from "./windows/VesselWindow";
import { WhatIfWindow } from "./windows/WhatIfWindow";
import "./studio.css";

/**
 * Studio: the heart fills the screen and every result floats over it in a glass window that can be moved, resized,
 * hidden to the dock or found with the command bar.
 */
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
      if (
        event.key === "Escape" &&
        !studio.paletteOpen &&
        !studio.tour.active &&
        useUiStore.getState().selectedVessel
      ) {
        useUiStore.getState().setSelectedVessel(null);
        studio.closeWindow("vessel");
        studio.focus(null);
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
      <div className="studio-stage">
        <StudioScene />
      </div>
      <TopBar />
      <Toolbar />
      <main className="studio-windows" aria-label="Results">
        <PatientWindow />
        <RiskWindow />
        <DriversWindow />
        <VesselWindow />
        <WhatIfWindow />
        <FactorsWindow />
        <PeopleWindow />
        <MeasuresWindow />
        <ModelWindow />
      </main>
      <Dock />
      <Watermark />
      <Toasts />
      <TourOverlay />
      <CommandPalette />
    </div>
  );
}

export default StudioApp;
