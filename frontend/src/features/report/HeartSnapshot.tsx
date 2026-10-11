import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  CatmullRomCurve3,
  Vector3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import type { PredictionResponse } from "../../api/types";
import { cameraPositionFacing, type Point3 } from "../../lib/cameraFocus";
import { targetColor } from "../../lib/colorScale";
import { isFlagged } from "../../lib/flags";
import { LEFT_MAIN_PATH, vesselIds, vesselMap, type VesselId } from "../viewer/vesselMap";

const HEART_MODEL_URL = "/models/heart.glb";
const CENTRE: Point3 = [0, -0.08, 0];
const OVERVIEW: Point3 = [0.62, 0.28, 4.05];
/** Where each artery is best seen from: the point on its path the camera faces. */
const VIEW_POINT: Record<VesselId, number> = { LAD: 0.45, LCX: 0.62, RCA: 0.32 };
const MUTED = "#9aa5b1";

function curveOf(path: readonly Point3[]) {
  return new CatmullRomCurve3(path.map(([x, y, z]) => new Vector3(x, y, z)));
}

function cameraFor(focus: VesselId | null): Point3 {
  if (!focus) {
    return OVERVIEW;
  }
  const point = curveOf(vesselMap[focus].path).getPoint(VIEW_POINT[focus]);
  const [x, y, z] = cameraPositionFacing([point.x, point.y + 0.25, point.z], 3.6, CENTRE);
  return [x, y, z];
}

function Heart({ ghost }: { ghost: boolean }) {
  const { scene } = useGLTF(HEART_MODEL_URL, false, true);
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        const material = (mesh.material as Material).clone() as MeshStandardMaterial;
        material.transparent = ghost;
        material.opacity = ghost ? 0.32 : 1;
        material.depthWrite = !ghost;
        material.envMapIntensity = 0.35;
        mesh.material = material;
      }
    });
    return copy;
  }, [scene, ghost]);
  return <primitive object={clone} />;
}

function Artery({
  path,
  color,
  radius,
  glow,
}: {
  path: readonly Point3[];
  color: string;
  radius: number;
  glow: number;
}) {
  const curve = useMemo(() => curveOf(path), [path]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 10, false]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        metalness={0.05}
        roughness={0.35}
      />
    </mesh>
  );
}

/** Renders a few frames once the heart has loaded, then hands back the picture. */
function Capture({ onCapture }: { onCapture: (url: string) => void }) {
  const gl = useThree((state) => state.gl);
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    frames.current += 1;
    if (!done.current && frames.current > 4) {
      done.current = true;
      onCapture(gl.domElement.toDataURL("image/png"));
    }
  });
  return null;
}

function Scene({
  prediction,
  focus,
  onCapture,
}: {
  prediction: PredictionResponse;
  focus: VesselId | null;
  onCapture: (url: string) => void;
}) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(...cameraFor(focus));
    camera.lookAt(...CENTRE);
  }, [camera, focus]);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight intensity={2.2} position={[3, 4, 5]} />
      <directionalLight color="#9fd8ff" intensity={1.1} position={[-4, 1.5, -3]} />
      <Environment frames={1} resolution={128}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 2]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[-4, 0, -2]} scale={3} />
      </Environment>
      <Heart ghost={focus !== null} />
      <Artery color={MUTED} glow={0} path={LEFT_MAIN_PATH} radius={0.022} />
      {vesselIds.map((vessel) => {
        const target = prediction.vessels[vessel];
        const lit = focus === null || focus === vessel;
        const flagged = isFlagged(target);
        return (
          <Artery
            color={lit ? targetColor(vessel) : MUTED}
            glow={lit ? (flagged ? 0.55 : 0.25) : 0}
            key={vessel}
            path={vesselMap[vessel].path}
            radius={focus === vessel ? 0.034 : lit && flagged ? 0.026 : 0.018}
          />
        );
      })}
      <Capture onCapture={onCapture} />
    </>
  );
}

/**
 * A still picture of the 3D heart for the printed report, with every artery in its colour (overview) or one
 * artery lit and the heart made see-through (artery pages). Drawn once in an off-screen WebGL canvas and kept as
 * an image, which prints reliably and frees the canvas.
 */
export function HeartSnapshot({
  prediction,
  focus,
  alt,
  className = "",
}: {
  prediction: PredictionResponse;
  focus: VesselId | null;
  alt: string;
  className?: string;
}) {
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);
  const key = `${prediction.request_id}:${focus ?? "all"}`;

  if (image?.key === key) {
    return <img alt={alt} className={`rp-snapshot ${className}`} src={image.url} />;
  }
  return (
    <div aria-busy="true" aria-label={`${alt} (drawing)`} className={`rp-snapshot rp-snapshot-live ${className}`} role="img">
      <Canvas
        camera={{ fov: 30, position: [...cameraFor(focus)] }}
        dpr={2}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        key={key}
      >
        <Suspense fallback={null}>
          <Scene
            focus={focus}
            onCapture={(url) => setImage({ key, url })}
            prediction={prediction}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
