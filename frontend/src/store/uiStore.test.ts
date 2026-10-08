import { afterEach, describe, expect, it } from "vitest";
import { useUiStore } from "./uiStore";

afterEach(() => {
  useUiStore.setState({ hoveredVessel: null, selectedVessel: null });
});

describe("uiStore vessel state", () => {
  it("stores and clears the selected vessel", () => {
    useUiStore.getState().setSelectedVessel("LCX");
    expect(useUiStore.getState().selectedVessel).toBe("LCX");

    useUiStore.getState().setSelectedVessel(null);
    expect(useUiStore.getState().selectedVessel).toBeNull();
  });

  it("stores hovered vessel independently from selection", () => {
    useUiStore.getState().setSelectedVessel("RCA");
    useUiStore.getState().setHoveredVessel("LAD");

    expect(useUiStore.getState().selectedVessel).toBe("RCA");
    expect(useUiStore.getState().hoveredVessel).toBe("LAD");
  });
});
