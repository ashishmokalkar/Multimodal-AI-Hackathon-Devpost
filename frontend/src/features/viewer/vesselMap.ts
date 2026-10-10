import { targetColor } from "../../lib/colorScale";
import { formatProbability } from "../../lib/format";
import type { PredictionResponse, Target } from "../../api/types";

export const vesselIds = ["LAD", "LCX", "RCA"] as const;

export type VesselId = (typeof vesselIds)[number];
export type Point3 = readonly [x: number, y: number, z: number];

interface VesselDefinition {
  nodeName: VesselId;
  label: string;
  path: readonly Point3[];
}

export const UNAVAILABLE_VESSEL_COLOR = "#94a3b8";

/** Left main coronary artery: not a predicted target; drawn grey so LAD and LCX visibly branch from it. */
export const LEFT_MAIN_PATH: readonly Point3[] = [
  [-0.0, 0.474, 0.278],
  [0.081, 0.46, 0.283],
];

export const vesselMap = {
  LAD: {
    nodeName: "LAD",
    label: "Left anterior descending",
    path: [
      [0.081, 0.46, 0.283],
      [0.101, 0.378, 0.328],
      [0.118, 0.298, 0.374],
      [0.1, 0.195, 0.346],
      [0.092, 0.107, 0.373],
      [0.117, 0.01, 0.433],
      [0.133, -0.101, 0.449],
      [0.137, -0.204, 0.427],
      [0.143, -0.302, 0.411],
      [0.153, -0.405, 0.386],
      [0.153, -0.508, 0.352],
      [0.157, -0.601, 0.308],
      [0.143, -0.693, 0.251],
    ],
  },
  LCX: {
    nodeName: "LCX",
    label: "Left circumflex",
    path: [
      [0.081, 0.46, 0.283],
      [0.182, 0.42, 0.321],
      [0.249, 0.378, 0.29],
      [0.297, 0.34, 0.236],
      [0.344, 0.319, 0.169],
      [0.375, 0.278, 0.067],
      [0.381, 0.276, -0.024],
      [0.394, 0.253, -0.151],
      [0.334, 0.225, -0.27],
      [0.247, 0.198, -0.334],
      [0.153, 0.171, -0.373],
      [0.088, 0.145, -0.386],
      [0.02, 0.114, -0.385],
    ],
  },
  RCA: {
    nodeName: "RCA",
    label: "Right coronary artery",
    path: [
      [-0.108, 0.45, 0.342],
      [-0.203, 0.417, 0.334],
      [-0.27, 0.387, 0.258],
      [-0.377, 0.353, 0.228],
      [-0.481, 0.311, 0.124],
      [-0.523, 0.267, -0.018],
      [-0.509, 0.23, -0.178],
      [-0.409, 0.186, -0.31],
      [-0.264, 0.133, -0.361],
      [-0.131, 0.097, -0.36],
      [-0.04, 0.064, -0.374],
      [0.018, -0.044, -0.389],
      [0.075, -0.151, -0.385],
      [0.106, -0.28, -0.364],
      [0.125, -0.408, -0.32],
      [0.133, -0.52, -0.267],
      [0.126, -0.632, -0.205],
    ],
  },
} as const satisfies Record<VesselId, VesselDefinition>;

export const VESSEL_TUBE_TUBULAR_SEGMENTS = 48;
export const VESSEL_TUBE_RADIAL_SEGMENTS = 8;
export const PROCEDURAL_VESSEL_TRIANGLES =
  vesselIds.length *
  VESSEL_TUBE_TUBULAR_SEGMENTS *
  VESSEL_TUBE_RADIAL_SEGMENTS *
  2;

export interface VesselDisplay {
  target: Target | null;
  probability: number | null;
  percentage: string;
  color: string;
}

/** Each artery's fixed identity colour; grey when there is no current prediction. */
export function vesselColor(
  target: Target | null,
  vessel: VesselId = "LAD",
): string {
  return target === null ? UNAVAILABLE_VESSEL_COLOR : targetColor(vessel);
}

export function vesselDisplay(
  prediction: PredictionResponse | null,
  vessel: VesselId,
): VesselDisplay {
  const target = prediction?.vessels[vessel] ?? null;
  const probability = target?.probability ?? null;

  return {
    target,
    probability,
    percentage: formatProbability(probability),
    color: vesselColor(target, vessel),
  };
}
