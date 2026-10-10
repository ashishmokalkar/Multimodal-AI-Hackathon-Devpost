import { create } from "zustand";
import type { VesselId } from "../features/viewer/vesselMap";

export type ExplainView = "why" | "arteries" | "body";
export type ArteryMode = "flow" | "table";

interface UiState {
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
