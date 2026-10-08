import { create } from "zustand";
import type { VesselId } from "../features/viewer/vesselMap";

interface UiState {
  hoveredVessel: VesselId | null;
  selectedVessel: VesselId | null;
  setHoveredVessel: (vessel: VesselId | null) => void;
  setSelectedVessel: (vessel: VesselId | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  hoveredVessel: null,
  selectedVessel: null,
  setHoveredVessel: (hoveredVessel) => set({ hoveredVessel }),
  setSelectedVessel: (selectedVessel) => set({ selectedVessel }),
}));
