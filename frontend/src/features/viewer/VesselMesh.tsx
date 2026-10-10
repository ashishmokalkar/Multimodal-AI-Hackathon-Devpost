import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, Vector3, type MeshStandardMaterial } from "three";
import {
  factorImpact,
  formatPoints,
  LOWER_COLOR,
  RAISE_COLOR,
} from "../../lib/insights";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { useActiveScenario } from "../../store/whatIfStore";
import {
  vesselMap,
  vesselDisplay,
  type VesselId,
  type VesselDisplay,
  VESSEL_TUBE_RADIAL_SEGMENTS,
  VESSEL_TUBE_TUBULAR_SEGMENTS,
} from "./vesselMap";

interface VesselMeshProps {
  vessel: VesselId;
}

/** Points below this are treated as "this factor does not move this artery". */
const IMPACT_FLOOR = 1;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

interface VesselLabelProps {
  vessel: VesselId;
  position: Vector3;
  display: VesselDisplay;
  isHovered: boolean;
  isSelected: boolean;
}

export function VesselLabel({
  vessel,
  position,
  display,
  isHovered,
  isSelected,
}: VesselLabelProps) {
  if (!isHovered && !isSelected) {
    return null;
  }

  const definition = vesselMap[vessel];
  return (
    <Html center position={position} style={{ pointerEvents: "none" }}>
      <span className="whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
        {isSelected ? "Selected" : "Hover"}: {vessel} · {definition.label} ·{" "}
        {display.percentage}
        {display.target ? ` · ${display.target.label}` : ""}
        {display.target?.uncertain ? " · uncertain" : ""}
      </span>
    </Html>
  );
}

export function VesselMesh({ vessel }: VesselMeshProps) {
  const definition = vesselMap[vessel];
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        definition.path.map(([x, y, z]) => new Vector3(x, y, z)),
      ),
    [definition.path],
  );
  const tooltipPosition = useMemo(() => curve.getPoint(0.5), [curve]);
  const labelPosition = useMemo(() => curve.getPoint(0.82), [curve]);
  const isHovered = useUiStore((state) => state.hoveredVessel === vessel);
  const isSelected = useUiStore((state) => state.selectedVessel === vessel);
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);
  const accepted = usePatientStore((state) => state.prediction);
  const scenario = useActiveScenario();
  const prediction = scenario ?? accepted;
  const display = vesselDisplay(prediction, vessel);
  const color = display.color;
  const impact =
    hoveredFactor && prediction && !prediction.mock
      ? factorImpact(prediction.explanations, hoveredFactor)[vessel]
      : null;
  const affected = impact !== null && Math.abs(impact) >= IMPACT_FLOOR;
  const dimmed = impact !== null && !affected;
  const uncertain = display.target?.uncertain === true;
  const pulse =
    uncertain && impact === null && !isHovered && !prefersReducedMotion();
  const radius = affected ? 0.03 : isSelected ? 0.025 : 0.018;
  const emissiveColor = affected
    ? impact > 0
      ? RAISE_COLOR
      : LOWER_COLOR
    : color;
  const emissiveIntensity = affected
    ? Math.min(1.4, 0.45 + Math.abs(impact) / 35)
    : isHovered
      ? 0.9
      : isSelected
        ? 0.45
        : 0;
  const materialRef = useRef<MeshStandardMaterial>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [pulse, impact, invalidate]);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) {
      return;
    }
    if (pulse) {
      material.emissive.set(color);
      material.emissiveIntensity =
        0.12 + 0.38 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.6));
      state.invalidate();
    } else {
      // restore the declared state after a pulse (props that did not change are not re-applied by React)
      material.emissive.set(emissiveIntensity > 0 ? emissiveColor : "#000000");
      material.emissiveIntensity = emissiveIntensity;
    }
  });

  return (
    <>
      <mesh
        name={definition.nodeName}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredVessel(vessel);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHoveredVessel(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedVessel(vessel);
        }}
      >
        <tubeGeometry
          args={[
            curve,
            VESSEL_TUBE_TUBULAR_SEGMENTS,
            radius,
            VESSEL_TUBE_RADIAL_SEGMENTS,
            false,
          ]}
        />
        <meshStandardMaterial
          color={color}
          emissive={emissiveIntensity > 0 ? emissiveColor : "#000000"}
          emissiveIntensity={emissiveIntensity}
          metalness={0.03}
          opacity={dimmed ? 0.25 : 1}
          ref={materialRef}
          roughness={0.3}
          transparent={dimmed}
        />
      </mesh>
      {affected && (
        <Html center position={labelPosition} style={{ pointerEvents: "none" }}>
          <span
            className="vessel-impact-label"
            style={{ backgroundColor: impact > 0 ? RAISE_COLOR : LOWER_COLOR }}
          >
            {vessel} {formatPoints(impact, 0)}
          </span>
        </Html>
      )}
      <VesselLabel
        display={display}
        isHovered={isHovered}
        isSelected={isSelected}
        position={tooltipPosition}
        vessel={vessel}
      />
    </>
  );
}
