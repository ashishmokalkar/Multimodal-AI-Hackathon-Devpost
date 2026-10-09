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
