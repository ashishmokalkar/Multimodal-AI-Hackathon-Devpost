import { useUiStore } from "../../store/uiStore";
import type { VesselId } from "../viewer/vesselMap";
import { useStudioStore } from "./studioStore";

/**
 * Points the Studio at one artery, or back at the overall result (null): the Why window explains it, the camera
 * flies to it and the 3D heart brightens it and fades the other two. Picking an artery also opens the Why window
 * and flashes its border once in that artery's risk colour, so the eye follows from the heart to the explanation.
 */
export function selectTarget(
  vessel: VesselId | null,
  { flash = true }: { flash?: boolean } = {},
) {
  useUiStore.getState().setSelectedVessel(vessel);
  const studio = useStudioStore.getState();
  studio.focus(vessel);
  if (vessel) {
    studio.openWindow("drivers");
    if (flash) {
      studio.flashWhy(vessel);
    }
  }
}

/** Picks an artery, or goes back to the overall result when it is already picked. */
export function toggleArtery(vessel: VesselId) {
  selectTarget(useUiStore.getState().selectedVessel === vessel ? null : vessel);
}

/** Back to the overall result, if an artery is picked (clicking empty space or pressing Escape). */
export function clearSelection() {
  if (useUiStore.getState().selectedVessel !== null) {
    selectTarget(null);
  }
}
