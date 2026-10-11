import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  CatmullRomCurve3,
  Vector3,
  type MeshStandardMaterial,
} from "three";
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
  LEFT_MAIN_PATH,
  vesselMap,
  vesselDisplay,
  type VesselId,
  VESSEL_TUBE_RADIAL_SEGMENTS,
  VESSEL_TUBE_TUBULAR_SEGMENTS,
} from "./vesselMap";
import { isFlagged } from "../../lib/flags";

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

/** Left main coronary artery: the short trunk LAD and LCX branch from. Not a predicted target, so neutral grey. */
export function LeftMainMesh() {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        LEFT_MAIN_PATH.map(([x, y, z]) => new Vector3(x, y, z)),
      ),
    [],
  );
  return (
    <mesh name="LeftMain" raycast={() => null}>
      <tubeGeometry
        args={[curve, 12, 0.02, VESSEL_TUBE_RADIAL_SEGMENTS, false]}
      />
      <meshStandardMaterial color="#8a939c" metalness={0.03} roughness={0.4} />
    </mesh>
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
  // risk tag on the part of each vessel that faces the default camera
  const tagPosition = useMemo(
    () => curve.getPoint(vessel === "LAD" ? 0.55 : 0.3),
    [curve, vessel],
  );
  const isHovered = useUiStore((state) => state.hoveredVessel === vessel);
  const isSelected = useUiStore((state) => state.selectedVessel === vessel);
  const anySelected = useUiStore((state) => state.selectedVessel !== null);
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
  // another artery is selected: fade this one so the selection stands out (factor hover takes priority)
  const selectionDimmed =
    impact === null && anySelected && !isSelected && !isHovered;
  const uncertain = display.target?.uncertain === true;
  // colour shows which artery; risk is shown by the tag, thickness and glow
  const flagged = display.target !== null && isFlagged(display.target);
  const pulse =
    uncertain &&
    impact === null &&
    !isHovered &&
    !selectionDimmed &&
    !prefersReducedMotion();
  const radius = affected ? 0.03 : isSelected ? 0.032 : flagged ? 0.024 : 0.015;
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
        ? 0.6
        : flagged
          ? 0.35
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
          opacity={dimmed ? 0.25 : selectionDimmed ? 0.35 : 1}
          ref={materialRef}
          roughness={0.3}
          transparent={dimmed || selectionDimmed}
        />
      </mesh>
      {isSelected && (
        // soft white halo behind the selected artery, visible at overview zoom
        <mesh raycast={() => null}>
          <tubeGeometry
            args={[
              curve,
              VESSEL_TUBE_TUBULAR_SEGMENTS,
              radius * 1.6,
              VESSEL_TUBE_RADIAL_SEGMENTS,
              false,
            ]}
          />
          <meshBasicMaterial
            color="#ffffff"
            depthWrite={false}
            opacity={0.55}
            side={BackSide}
            transparent
          />
        </mesh>
      )}
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
      {display.target && !affected && !isHovered && (
        <Html center position={tagPosition} style={{ pointerEvents: "none" }}>
          <span
            className={`vessel-risk-tag ${flagged ? "vessel-risk-tag-flagged" : ""}`}
          >
            <i aria-hidden="true" style={{ backgroundColor: color }} />
            {vessel} {Math.round(display.target.probability * 100)}%
            {flagged ? " ▲" : ""}
          </span>
        </Html>
      )}
      {isHovered && (
        <Html
          center
          position={tooltipPosition}
          style={{ pointerEvents: "none" }}
        >
          <span className="whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
            {vessel} · {definition.label} · {display.percentage}
            {display.target ? ` · ${display.target.label}` : ""}
            {uncertain ? " · uncertain" : ""}
          </span>
        </Html>
      )}
    </>
  );
}
