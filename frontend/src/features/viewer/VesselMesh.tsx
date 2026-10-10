import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
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
  const isHovered = useUiStore((state) => state.hoveredVessel === vessel);
  const isSelected = useUiStore((state) => state.selectedVessel === vessel);
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);
  const prediction = usePatientStore((state) => state.prediction);
  const display = vesselDisplay(prediction, vessel);
  const color = display.color;
  const radius = isSelected ? 0.025 : 0.018;
  const emissiveIntensity = isHovered ? 0.9 : isSelected ? 0.45 : 0;

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
          emissive={emissiveIntensity > 0 ? color : "#000000"}
          emissiveIntensity={emissiveIntensity}
          metalness={0.03}
          roughness={0.3}
        />
      </mesh>
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
