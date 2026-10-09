import { describe, expect, it } from "vitest";
import {
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
    expect(focusedPosition.map((value, index) => value - focusedTarget[index]))
      .toEqual([4, 2.8, 5]);
  });
});
