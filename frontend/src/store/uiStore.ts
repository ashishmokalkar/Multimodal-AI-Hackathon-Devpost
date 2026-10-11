import { create } from "zustand";
import type { VesselId } from "../features/viewer/vesselMap";

export type ExplainView = "why" | "arteries" | "body";
export type ArteryMode = "flow" | "table";
/** Which interface is shown: the immersive Studio or the original Classic layout. */
export type UiVersion = "studio" | "classic";

const UI_VERSION_STORAGE_KEY = "cad-risk-ui-version";

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
