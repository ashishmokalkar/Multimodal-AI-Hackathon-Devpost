import { create } from "zustand";
import type { VesselId } from "../features/viewer/vesselMap";
import type { UnitSystem } from "../lib/units";

export type ExplainView = "why" | "arteries" | "body";
export type ArteryMode = "flow" | "table";
/** Which interface is shown: the immersive Studio or the original Classic layout. */
export type UiVersion = "studio" | "classic";

const UI_VERSION_STORAGE_KEY = "cad-risk-ui-version";
const UNIT_SYSTEM_STORAGE_KEY = "cad-risk-lab-units";

function storedUnitSystem(): UnitSystem {
  try {
    return window.localStorage.getItem(UNIT_SYSTEM_STORAGE_KEY) === "si"
      ? "si"
      : "conventional";
  } catch {
    return "conventional";
  }
}

function storedUiVersion(): UiVersion {
  try {
    return window.localStorage.getItem(UI_VERSION_STORAGE_KEY) === "classic"
      ? "classic"
      : "studio";
  } catch {
    return "studio";
  }
}

interface UiState {
  uiVersion: UiVersion;
  setUiVersion: (version: UiVersion) => void;
  /** Lab units shown on screen; the API always receives its own (conventional) units. */
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  /** The clinician has picked a patient on the start screen (each visit starts there). */
  patientChosen: boolean;
  setPatientChosen: (chosen: boolean) => void;
  /** The printable patient report is open (both layouts). */
  reportOpen: boolean;
  setReportOpen: (open: boolean) => void;
  hoveredVessel: VesselId | null;
  selectedVessel: VesselId | null;
  /** Input feature currently highlighted in an explanation view; the 3D vessels react to it. */
  hoveredFactor: string | null;
  /** Explanation tab and Arteries mode survive patient switches (the hub remounts while a prediction loads). */
  explainView: ExplainView;
  arteryMode: ArteryMode;
  setExplainView: (view: ExplainView) => void;
  setArteryMode: (mode: ArteryMode) => void;
  setHoveredVessel: (vessel: VesselId | null) => void;
  setSelectedVessel: (vessel: VesselId | null) => void;
  setHoveredFactor: (feature: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  uiVersion: storedUiVersion(),
  setUiVersion: (uiVersion) => {
    try {
      window.localStorage.setItem(UI_VERSION_STORAGE_KEY, uiVersion);
    } catch {
      // the choice still applies for this visit
    }
    set({ uiVersion, hoveredFactor: null, hoveredVessel: null });
  },
  unitSystem: storedUnitSystem(),
  setUnitSystem: (unitSystem) => {
    try {
      window.localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, unitSystem);
    } catch {
      // the choice still applies for this visit
    }
    set({ unitSystem });
  },
  patientChosen: false,
  setPatientChosen: (patientChosen) =>
    set({ patientChosen, reportOpen: false, selectedVessel: null, hoveredFactor: null }),
  reportOpen: false,
  setReportOpen: (reportOpen) => set({ reportOpen }),
  hoveredVessel: null,
  selectedVessel: null,
  hoveredFactor: null,
  explainView: "why",
  arteryMode: "flow",
  setExplainView: (explainView) => set({ explainView }),
  setArteryMode: (arteryMode) => set({ arteryMode }),
  setHoveredVessel: (hoveredVessel) => set({ hoveredVessel }),
  setSelectedVessel: (selectedVessel) => set({ selectedVessel }),
  setHoveredFactor: (hoveredFactor) => set({ hoveredFactor }),
}));
