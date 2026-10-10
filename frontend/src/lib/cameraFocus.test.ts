import { describe, expect, it } from "vitest";
import {
  cameraPositionFacing,
  cameraPositionForTarget,
  OVERVIEW_CAMERA_POSITION,
  OVERVIEW_CAMERA_TARGET,
} from "./cameraFocus";

describe("camera focus positioning", () => {
  it("translates the camera with its target while preserving orbit and zoom", () => {
    const focusedTarget = [0.2, 0.1, 0.3] as const;
    const focusedPosition = cameraPositionForTarget(
      OVERVIEW_CAMERA_POSITION,
      OVERVIEW_CAMERA_TARGET,
      focusedTarget,
    );

    expect(focusedPosition).toEqual([4.2, 2.9, 5.3]);
    expect(
      focusedPosition.map((value, index) => value - focusedTarget[index]),
    ).toEqual([4, 2.8, 5]);
  });

  it("places the camera outside the surface, facing a vessel on the back of the heart", () => {
    const backPoint = [0.3, 0.2, -0.3] as const;
    const position = cameraPositionFacing(backPoint, 2);

    expect(position[2]).toBeLessThan(backPoint[2]);
    const distance = Math.hypot(
      position[0] - backPoint[0],
      position[1] - backPoint[1],
      position[2] - backPoint[2],
    );
    expect(distance).toBeCloseTo(2);
  });
});
