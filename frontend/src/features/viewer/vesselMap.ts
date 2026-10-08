import { colorScale } from "../../lib/colorScale";
import { formatProbability } from "../../lib/format";
import type { PredictionResponse, Target } from "../../api/types";

export const vesselIds = ["LAD", "LCX", "RCA"] as const;

export type VesselId = (typeof vesselIds)[number];
type Point3 = readonly [x: number, y: number, z: number];

interface VesselDefinition {
  nodeName: VesselId;
  label: string;
  path: readonly Point3[];
}

export const UNAVAILABLE_VESSEL_COLOR = "#94a3b8";

export const vesselMap = {
  LAD: {
    nodeName: "LAD",
    label: "Left anterior descending",
    path: [
      [0.05, 0.46, 0.39],
      [0.11, 0.24, 0.45],
      [0.14, -0.02, 0.43],
      [0.18, -0.3, 0.34],
      [0.22, -0.55, 0.2],
    ],
  },
  LCX: {
    nodeName: "LCX",
    label: "Left circumflex",
    path: [
      [0.05, 0.43, 0.39],
      [0.21, 0.43, 0.39],
      [0.36, 0.29, 0.32],
      [0.45, 0.08, 0.18],
    ],
  },
  RCA: {
    nodeName: "RCA",
    label: "Right coronary artery",
    path: [
      [-0.04, 0.44, 0.4],
      [-0.22, 0.37, 0.37],
      [-0.38, 0.18, 0.29],
      [-0.42, -0.08, 0.17],
      [-0.28, -0.31, 0.13],
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

export function vesselColor(probability: number | null): string {
  return probability === null
    ? UNAVAILABLE_VESSEL_COLOR
    : colorScale(probability);
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
    color: vesselColor(probability),
  };
}
