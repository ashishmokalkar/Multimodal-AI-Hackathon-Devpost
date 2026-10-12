import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "../../store/uiStore";
import { clearSelection, selectTarget, toggleArtery } from "./selection";
import { useStudioStore } from "./studioStore";

describe("picking an artery", () => {
  beforeEach(() => {
    useUiStore.getState().setSelectedVessel(null);
    useStudioStore.setState({ whyFlash: null });
    useStudioStore.getState().closeWindow("drivers");
  });

  it("explains it in the Why window, flies to it and flashes Why once", () => {
    toggleArtery("LAD");
    const studio = useStudioStore.getState();
    expect(useUiStore.getState().selectedVessel).toBe("LAD");
    expect(studio.camera.vessel).toBe("LAD");
    expect(studio.open.drivers).toBe(true);
    expect(studio.order[studio.order.length - 1]).toBe("drivers");
    expect(studio.whyFlash).toEqual({ vessel: "LAD", sequence: 1 });
  });

  it("goes back to the overall result when the same artery is clicked again", () => {
    toggleArtery("RCA");
    toggleArtery("RCA");
    expect(useUiStore.getState().selectedVessel).toBeNull();
    expect(useStudioStore.getState().camera.vessel).toBeNull();
    // only the pick flashes, not the reset
    expect(useStudioStore.getState().whyFlash?.sequence).toBe(1);
  });

  it("switches straight to another artery and flashes again", () => {
    toggleArtery("LAD");
    toggleArtery("LCX");
    expect(useUiStore.getState().selectedVessel).toBe("LCX");
    expect(useStudioStore.getState().whyFlash).toEqual({ vessel: "LCX", sequence: 2 });
  });

  it("resets to the overall result on a click in empty space, and does nothing when already there", () => {
    toggleArtery("LCX");
    const sequence = useStudioStore.getState().camera.sequence;
    clearSelection();
    expect(useUiStore.getState().selectedVessel).toBeNull();
    expect(useStudioStore.getState().camera.sequence).toBe(sequence + 1);
    // a second empty click leaves the camera where the user orbited it
    clearSelection();
    expect(useStudioStore.getState().camera.sequence).toBe(sequence + 1);
  });

  it("does not flash when the choice is made in the Why window itself", () => {
    selectTarget("RCA", { flash: false });
    expect(useUiStore.getState().selectedVessel).toBe("RCA");
    expect(useStudioStore.getState().whyFlash).toBeNull();
  });
});

describe("opening and closing Why", () => {
  beforeEach(() => {
    useStudioStore.getState().resetLayout();
  });

  it("moves Risk from the middle of the column to the top, and back", () => {
    const centred = useStudioStore.getState().rects.risk;
    useStudioStore.getState().openWindow("drivers");
    const top = useStudioStore.getState().rects.risk;
    expect(top.y).toBeLessThan(centred.y);
    expect(top.h).toBeLessThan(centred.h);
    expect(useStudioStore.getState().rects.drivers.y).toBeGreaterThan(top.y + top.h);
    useStudioStore.getState().closeWindow("drivers");
    expect(useStudioStore.getState().rects.risk).toEqual(centred);
  });

  it("opens Why the same way when an artery is picked", () => {
    const centred = useStudioStore.getState().rects.risk;
    toggleArtery("LAD");
    expect(useStudioStore.getState().open.drivers).toBe(true);
    expect(useStudioStore.getState().rects.risk.y).toBeLessThan(centred.y);
  });

  it("leaves a Risk window the user has placed where it is", () => {
    const placed = { x: 300, y: 200, w: 320, h: 300 };
    useStudioStore.getState().moveWindow("risk", placed);
    useStudioStore.getState().openWindow("drivers");
    expect(useStudioStore.getState().rects.risk).toEqual(placed);
  });
});
