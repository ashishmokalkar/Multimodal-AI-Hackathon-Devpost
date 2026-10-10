export type Point3 = readonly [x: number, y: number, z: number];

export const OVERVIEW_CAMERA_POSITION: Point3 = [4, 2.8, 5];
export const OVERVIEW_CAMERA_TARGET: Point3 = [0, 0, 0];

export function cameraPositionForTarget(
  cameraPosition: Point3,
  currentTarget: Point3,
  nextTarget: Point3,
): Point3 {
  return [
    cameraPosition[0] + nextTarget[0] - currentTarget[0],
    cameraPosition[1] + nextTarget[1] - currentTarget[1],
    cameraPosition[2] + nextTarget[2] - currentTarget[2],
  ];
}

/**
 * Camera position that faces a point on the heart surface: out from the heart centre through the point, so
 * vessels on the back or side turn towards the viewer instead of the camera only panning.
 */
export function cameraPositionFacing(
  focus: Point3,
  distance: number,
  centre: Point3 = OVERVIEW_CAMERA_TARGET,
): Point3 {
  const offset = [
    focus[0] - centre[0],
    focus[1] - centre[1],
    focus[2] - centre[2],
  ];
  const length = Math.hypot(offset[0], offset[1], offset[2]) || 1;
  return [
    focus[0] + (offset[0] / length) * distance,
    focus[1] + (offset[1] / length) * distance,
    focus[2] + (offset[2] / length) * distance,
  ];
}
