import { describe, expect, it } from "vitest";
import {
  PROCEDURAL_VESSEL_TRIANGLES,
  vesselColor,
  vesselIds,
  vesselMap,
} from "./vesselMap";

describe("vesselMap", () => {
  it("maps all three separately addressable vessels to their illustrative values", () => {
    expect(vesselIds).toEqual(["LAD", "LCX", "RCA"]);
    expect(vesselMap.LAD).toMatchObject({
      nodeName: "LAD",
      probability: 0.8,
    });
    expect(vesselMap.LCX).toMatchObject({
      nodeName: "LCX",
      probability: 0.3,
    });
    expect(vesselMap.RCA).toMatchObject({
      nodeName: "RCA",
      probability: 0.55,
    });
    expect(new Set(vesselIds.map(vesselColor)).size).toBe(3);
  });

  it("keeps procedural tube geometry below the total triangle budget", () => {
    expect(PROCEDURAL_VESSEL_TRIANGLES).toBe(2304);
    expect(22_562 + PROCEDURAL_VESSEL_TRIANGLES).toBeLessThanOrEqual(150_000);
  });
});
