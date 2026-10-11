import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
  Sparkles,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  AdditiveBlending,
  Box3,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  FrontSide,
  Mesh as MeshClass,
  Object3D,
  ShaderMaterial,
  Vector3,
  type Group,
  type InstancedMesh,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { useFeatures } from "../../api/hooks";
import { cameraPositionFacing, type Point3 } from "../../lib/cameraFocus";
import { factorImpact } from "../../lib/insights";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { useActiveScenario } from "../../store/whatIfStore";
import { HeartbeatLoader } from "../loading/HeartbeatLoader";
import {
  LEFT_MAIN_PATH,
  vesselDisplay,
  vesselIds,
  vesselMap,
  type VesselId,
} from "../viewer/vesselMap";
import { SCENE_THEMES, type SceneTheme } from "./sceneTheme";
import { beatPulse, pulseRate } from "./studioModel";
import { useStudioStore } from "./studioStore";

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

const HEART_MODEL_URL = "/models/heart.glb";
const STUDIO_OVERVIEW_POSITION: Point3 = [0.62, 0.28, 4.05];
const STUDIO_OVERVIEW_TARGET: Point3 = [0, -0.1, 0];
/** Distance from a vessel when the camera flies to it. */
const FOCUS_DISTANCE = 2.4;

/** Raise colour (magenta) and lower colour (blue) for factor highlights, bright enough to glow on dark scenes. */
const RAISE_GLOW = "#ff4d9a";
const LOWER_GLOW = "#4dabf7";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// ------------------------------------------------------------------------------------------- backdrop
const backdropVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}`;
const backdropFragment = /* glsl */ `
uniform vec3 uInner;
uniform vec3 uOuter;
uniform float uAspect;
varying vec2 vUv;
void main() {
  vec2 c = vUv - vec2(0.5, 0.56);
  c.x *= uAspect;
  float d = smoothstep(0.0, 0.95, length(c));
  gl_FragColor = vec4(mix(uInner, uOuter, d), 1.0);
  #include <colorspace_fragment>
}`;

/** Full-screen radial gradient drawn inside the scene, so bloom and vignette blend with it. */
function Backdrop({ theme }: { theme: SceneTheme }) {
  const aspect = useThree((state) => state.size.width / state.size.height);
  const uniforms = useMemo(
    () => ({
      uInner: { value: new Color() },
      uOuter: { value: new Color() },
      uAspect: { value: 1 },
    }),
    [],
  );
  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        depthTest={false}
        depthWrite={false}
        fragmentShader={backdropFragment}
        uniforms={uniforms}
        uniforms-uAspect-value={aspect}
        uniforms-uInner-value={theme.inner}
        uniforms-uOuter-value={theme.outer}
        vertexShader={backdropVertex}
      />
    </mesh>
  );
}

// ------------------------------------------------------------------------------------------- heart
const xrayVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const xrayFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
  gl_FragColor = vec4(uColor * (0.25 + rim * 1.9), (0.035 + rim * 0.9) * uOpacity);
}`;

interface HeartProps {
  depth: number;
  theme: SceneTheme;
  onBounds: (box: Box3) => void;
}

/**
 * The anatomical heart, shown solid, as an x-ray shell, or faded to a ghost so only the arteries remain. One depth
 * value (0 solid, 0.5 x-ray, 1 arteries only) cross-fades between the looks.
 */
function StudioHeart({ depth, theme, onBounds }: HeartProps) {
  const { scene } = useGLTF(HEART_MODEL_URL, false, true);
  const solid = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        mesh.material = (mesh.material as Material).clone();
      }
    });
    return clone;
  }, [scene]);
  const xrayMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color() },
          uOpacity: { value: 0 },
        },
        vertexShader: xrayVertex,
        fragmentShader: xrayFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: FrontSide,
      }),
    [],
  );
  const xray = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        mesh.material = xrayMaterial;
        mesh.raycast = () => null;
      }
    });
    return clone;
  }, [scene, xrayMaterial]);

  useEffect(() => {
    onBounds(new Box3().setFromObject(solid));
  }, [onBounds, solid]);

  const solidRef = useRef<Group>(null);
  const xrayRef = useRef<Group>(null);
  const solidOpacity = Math.min(1, Math.max(0, 1 - depth * 2));
  const xrayOpacity = depth <= 0.5 ? depth * 2 : 1 - (depth - 0.5) * 1.6;

  // the clones are reached through refs so their materials can be updated in place
  useEffect(() => {
    const root = solidRef.current;
    if (!root) {
      return;
    }
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const material = mesh.material as MeshStandardMaterial;
      material.transparent = solidOpacity < 1;
      material.opacity = solidOpacity;
      material.depthWrite = solidOpacity > 0.6;
      material.envMapIntensity = 0.28;
      material.needsUpdate = true;
      // an x-ray or hidden heart must not block clicks on the arteries behind it
      mesh.raycast = solidOpacity > 0.5 ? MeshClass.prototype.raycast : () => null;
    });
    root.visible = solidOpacity > 0.01;
  }, [solid, solidOpacity]);

  useEffect(() => {
    const root = xrayRef.current;
    if (!root) {
      return;
    }
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        const material = mesh.material as ShaderMaterial;
        (material.uniforms.uColor.value as Color).set(theme.xray);
        material.uniforms.uOpacity.value = Math.max(0, xrayOpacity);
      }
    });
    root.visible = xrayOpacity > 0.01;
  }, [theme.xray, xray, xrayOpacity]);

  useEffect(() => () => xrayMaterial.dispose(), [xrayMaterial]);

  return (
    <group name="Heart">
      <group ref={solidRef}>
        <primitive object={solid} />
      </group>
      <group ref={xrayRef}>
        <primitive object={xray} />
      </group>
    </group>
  );
}

// ------------------------------------------------------------------------------------------- vessels
function useShownPrediction() {
  const accepted = usePatientStore((state) => state.prediction);
  const scenario = useActiveScenario();
  return scenario ?? accepted;
}

function LeftMain() {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        LEFT_MAIN_PATH.map(([x, y, z]) => new Vector3(x, y, z)),
      ),
    [],
  );
  return (
    <mesh raycast={() => null}>
      <tubeGeometry args={[curve, 12, 0.02, 10, false]} />
      <meshStandardMaterial color="#9aa5b1" metalness={0.1} roughness={0.35} />
    </mesh>
  );
}

const FLOW_DUMMY = new Object3D();

/** Glowing particles running along a vessel: blood flow, faster and denser on flagged arteries. */
function FlowParticles({
  points,
  color,
  count,
  speed,
  beatRef,
}: {
  points: Vector3[];
  color: string;
  count: number;
  speed: number;
  beatRef: { current: number };
}) {
  const ref = useRef<InstancedMesh>(null);
  const offsets = useMemo(
    () => Array.from({ length: count }, (_, i) => i / count),
    [count],
  );
  const progress = useRef(0);
  const glow = useMemo(() => new Color(color).multiplyScalar(2.6), [color]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }
    progress.current += delta * speed * (0.6 + beatRef.current * 1.4);
    const last = points.length - 1;
    offsets.forEach((offset, index) => {
      const t = (offset + progress.current) % 1;
      const point = points[Math.round(t * last)];
      FLOW_DUMMY.position.copy(point);
      // particles fade in at the origin and out at the tip
      const scale = Math.sin(Math.PI * t) * 0.9 + 0.1;
      FLOW_DUMMY.scale.setScalar(scale);
      FLOW_DUMMY.updateMatrix();
      mesh.setMatrixAt(index, FLOW_DUMMY.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      args={[undefined, undefined, count]}
      frustumCulled={false}
      raycast={() => null}
      ref={ref}
    >
      <sphereGeometry args={[0.011, 8, 6]} />
      <meshBasicMaterial color={glow} toneMapped={false} />
    </instancedMesh>
  );
}

interface StudioVesselProps {
  vessel: VesselId;
  beatRef: { current: number };
}

function StudioVessel({ vessel, beatRef }: StudioVesselProps) {
  const definition = vesselMap[vessel];
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        definition.path.map(([x, y, z]) => new Vector3(x, y, z)),
      ),
    [definition.path],
  );
  const spaced = useMemo(() => curve.getSpacedPoints(160), [curve]);
  const tagPosition = useMemo(
    () => curve.getPoint(vessel === "LAD" ? 0.55 : 0.3),
    [curve, vessel],
  );
  const prediction = useShownPrediction();
  const display = vesselDisplay(prediction, vessel);
  const isHovered = useUiStore((state) => state.hoveredVessel === vessel);
  const isSelected = useUiStore((state) => state.selectedVessel === vessel);
  const anySelected = useUiStore((state) => state.selectedVessel !== null);
  const hoveredFactor = useUiStore((state) => state.hoveredFactor);
  const flow = useStudioStore((state) => state.flow);
  const labels = useStudioStore((state) => state.labels);
  const target = display.target;
  const flagged = target !== null && target.probability >= target.threshold;
  const impact =
    hoveredFactor && prediction && !prediction.mock
      ? factorImpact(prediction.explanations, hoveredFactor)[vessel]
      : null;
  const affected = impact !== null && Math.abs(impact) >= 1;
  const faded =
    (impact !== null && !affected) ||
    (impact === null && anySelected && !isSelected && !isHovered);
  const radius = affected
    ? 0.022
    : isSelected
      ? 0.024
      : flagged
        ? 0.019
        : 0.012;
  const glowColor = affected
    ? impact > 0
      ? RAISE_GLOW
      : LOWER_GLOW
    : display.color;
  const baseGlow = affected
    ? 1.4
    : isHovered
      ? 1.2
      : isSelected
        ? 1.0
        : flagged
          ? 0.8
          : 0.1;
  // only lit vessels go above display range and bloom; low-risk vessels stay matte
  const glows = affected || isHovered || isSelected || flagged;
  const materialRef = useRef<MeshStandardMaterial>(null);
  const haloRef = useRef<Mesh>(null);
  const animate = !reducedMotion();

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) {
      return;
    }
    // high-risk vessels breathe softly; low-risk vessels stay matte
    const breathe =
      animate && flagged && !affected
        ? 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 2.2)
        : 1;
    material.emissiveIntensity = baseGlow * breathe;
    const halo = haloRef.current;
    if (halo) {
      halo.scale.setScalar(1 + beatRef.current * 0.04);
    }
  });

  const setHovered = useUiStore((state) => state.setHoveredVessel);
  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    useUiStore.getState().setSelectedVessel(vessel);
    const studio = useStudioStore.getState();
    studio.focus(vessel);
    studio.openWindow("vessel");
  };

  return (
    <>
      <mesh
        name={definition.nodeName}
        onClick={select}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(null);
          document.body.style.cursor = "";
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(vessel);
          document.body.style.cursor = "pointer";
        }}
      >
        <tubeGeometry args={[curve, 64, radius, 10, false]} />
        <meshStandardMaterial
          color={display.color}
          emissive={glowColor}
          emissiveIntensity={baseGlow}
          metalness={0.15}
          opacity={faded ? 0.22 : 1}
          ref={materialRef}
          roughness={0.28}
          toneMapped={!glows}
          transparent={faded}
        />
      </mesh>
      {(isSelected || isHovered || affected) && (
        <mesh raycast={() => null} ref={haloRef}>
          <tubeGeometry args={[curve, 64, radius * 1.6, 10, false]} />
          <meshBasicMaterial
            blending={AdditiveBlending}
            color={glowColor}
            depthWrite={false}
            opacity={0.18}
            side={DoubleSide}
            toneMapped={false}
            transparent
          />
        </mesh>
      )}
      {flow && target && !faded && (
        <FlowParticles
          beatRef={beatRef}
          color={display.color}
          count={flagged ? 16 : 8}
          points={spaced}
          speed={flagged ? 0.16 : 0.1}
        />
      )}
      {labels && target && (
        <Html
          center
          position={tagPosition}
          style={{ pointerEvents: "none" }}
          zIndexRange={[20, 0]}
        >
          <span
            className={`sv-tag${flagged ? " is-flagged" : ""}${isSelected || isHovered ? " is-active" : ""}${faded ? " is-faded" : ""}`}
          >
            <i style={{ backgroundColor: display.color }} />
            {vessel}
            <b>
              {affected
                ? `${impact > 0 ? "+" : "−"}${Math.abs(Math.round(impact))} pts`
                : `${Math.round(target.probability * 100)}%`}
            </b>
            {target.uncertain && !affected ? <em>?</em> : null}
          </span>
        </Html>
      )}
    </>
  );
}

// ------------------------------------------------------------------------------------------- pedestal
function Pedestal({ y, theme }: { y: number; theme: SceneTheme }) {
  const spin = useRef<Group>(null);
  const animate = !reducedMotion();
  useFrame((_, delta) => {
    if (spin.current && animate) {
      spin.current.rotation.z += delta * 0.12;
    }
  });
  const dashes = Array.from({ length: 24 }, (_, i) => i);
  return (
    <group position={[0, y, 0]} rotation-x={-Math.PI / 2}>
      <mesh raycast={() => null}>
        <ringGeometry args={[0.86, 0.875, 128]} />
        <meshBasicMaterial
          color={theme.accent}
          opacity={0.55}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh raycast={() => null}>
        <ringGeometry args={[1.02, 1.026, 128]} />
        <meshBasicMaterial color={theme.accent} opacity={0.22} transparent />
      </mesh>
      <group ref={spin}>
        {dashes.map((i) => (
          <mesh key={i} raycast={() => null}>
            <ringGeometry
              args={[1.13, 1.15, 8, 1, (i / 24) * Math.PI * 2, 0.12]}
            />
            <meshBasicMaterial
              color={theme.accent}
              opacity={i % 6 === 0 ? 0.8 : 0.3}
              toneMapped={false}
              transparent
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------------------------------------------- camera
function vesselFocus(vessel: VesselId): { position: Vector3; target: Vector3 } {
  const path = vesselMap[vessel].path;
  const focus = new CatmullRomCurve3(
    path.map(([x, y, z]) => new Vector3(x, y, z)),
  ).getPoint(0.5);
  const position = cameraPositionFacing(
    [focus.x, focus.y, focus.z],
    FOCUS_DISTANCE,
  );
  return { position: new Vector3(...position), target: focus };
}

/** Flies the camera smoothly to the requested vessel (or the overview); dragging cancels the flight. */
function CameraRig({
  controls,
}: {
  controls: { current: OrbitControlsImpl | null };
}) {
  const request = useStudioStore((state) => state.camera);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);

  useEffect(() => {
    goal.current =
      request.vessel === null
        ? {
            position: new Vector3(...STUDIO_OVERVIEW_POSITION),
            target: new Vector3(...STUDIO_OVERVIEW_TARGET),
          }
        : vesselFocus(request.vessel);
    if (request.sequence === 0) {
      // first frame: start at the overview without a flight
      camera.position.copy(goal.current.position);
      controls.current?.target.copy(goal.current.target);
      goal.current = null;
    }
    invalidate();
  }, [camera, controls, invalidate, request]);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) {
      return;
    }
    const cancel = () => {
      goal.current = null;
    };
    orbit.addEventListener("start", cancel);
    return () => orbit.removeEventListener("start", cancel);
  }, [controls]);

  useFrame((_, delta) => {
    const next = goal.current;
    const orbit = controls.current;
    if (!next || !orbit) {
      return;
    }
    const k = 1 - Math.exp(-delta * 3.2);
    camera.position.lerp(next.position, k);
    orbit.target.lerp(next.target, k);
    orbit.update();
    if (
      camera.position.distanceToSquared(next.position) < 1e-5 &&
      orbit.target.distanceToSquared(next.target) < 1e-5
    ) {
      goal.current = null;
    }
    invalidate();
  });

  return null;
}

// ------------------------------------------------------------------------------------------- scene
function SceneContent() {
  const themeName = useStudioStore((state) => state.theme);
  const theme = SCENE_THEMES[themeName];
  const depth = useStudioStore((state) => state.depth);
  const beat = useStudioStore((state) => state.beat);
  const quality = useStudioStore((state) => state.quality);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const pulse = usePatientStore((state) => pulseRate(state.features.PR));
  const controls = useRef<OrbitControlsImpl | null>(null);
  const beating = useRef<Group>(null);
  const beatRef = useRef(0);
  const [floorY, setFloorY] = useState(-0.95);
  const onBounds = useMemo(
    () => (box: Box3) => {
      if (Number.isFinite(box.min.y)) {
        setFloorY(box.min.y - 0.06);
      }
    },
    [],
  );

  useFrame((state) => {
    const pulseValue = beat
      ? beatPulse((state.clock.elapsedTime * pulse) / 60)
      : 0;
    beatRef.current = pulseValue;
    if (beating.current) {
      beating.current.scale.setScalar(1 + pulseValue * 0.022);
    }
  });

  return (
    <>
      <Backdrop theme={theme} />
      <ambientLight intensity={theme.ambient} />
      <directionalLight intensity={2.4} position={[3, 4, 5]} />
      <directionalLight color={theme.rimA} intensity={2.2} position={[-4, 1.5, -3]} />
      <directionalLight color={theme.rimB} intensity={1.6} position={[4, -1, -4]} />
      <Environment frames={1} resolution={256}>
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[0, 3, 2]}
          scale={[6, 2, 1]}
        />
        <Lightformer
          color={theme.rimA}
          form="ring"
          intensity={1.6}
          position={[-4, 0, -2]}
          scale={3}
        />
        <Lightformer
          color={theme.rimB}
          form="rect"
          intensity={1.2}
          position={[4, -1, 1]}
          scale={[2, 4, 1]}
        />
      </Environment>
      <group ref={beating}>
        <StudioHeart depth={depth} onBounds={onBounds} theme={theme} />
        <LeftMain />
        {vesselIds.map((vessel) => (
          <StudioVessel beatRef={beatRef} key={vessel} vessel={vessel} />
        ))}
      </group>
      <Pedestal theme={theme} y={floorY} />
      {quality === "high" && (
        <>
          <ContactShadows
            blur={2.6}
            far={1.6}
            frames={1}
            opacity={themeName === "clinical" ? 0.35 : 0.6}
            position={[0, floorY + 0.005, 0]}
            scale={2.6}
          />
          <Sparkles
            color={theme.accent}
            count={46}
            opacity={0.45}
            scale={[4.5, 3, 4.5]}
            size={1.6}
            speed={0.18}
          />
        </>
      )}
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        dampingFactor={0.08}
        enableDamping
        makeDefault
        maxDistance={6}
        minDistance={1.3}
        ref={controls}
        target={[...STUDIO_OVERVIEW_TARGET]}
      />
      <CameraRig controls={controls} />
      {quality === "high" && (
        <EffectComposer multisampling={4}>
          <Bloom
            intensity={theme.bloom}
            luminanceSmoothing={0.2}
            luminanceThreshold={1}
            mipmapBlur
            radius={0.72}
          />
          <Vignette darkness={theme.vignette} eskil={false} offset={0.22} />
        </EffectComposer>
      )}
    </>
  );
}

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The 3D scene could not be loaded.", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="studio-scene-error" role="alert">
          The 3D heart could not be loaded. {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Full-screen 3D stage behind the floating windows. */
export function StudioScene() {
  const beat = useStudioStore((state) => state.beat);
  const flow = useStudioStore((state) => state.flow);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const quality = useStudioStore((state) => state.quality);
  const setQuality = useStudioStore((state) => state.setQuality);
  const animated = beat || flow || autoRotate;
  const prediction = useShownPrediction();
  const features = useFeatures();
  const summary = prediction
    ? `CAD ${Math.round(prediction.cad.probability * 100)}%, LAD ${Math.round(prediction.vessels.LAD.probability * 100)}%, LCX ${Math.round(prediction.vessels.LCX.probability * 100)}%, RCA ${Math.round(prediction.vessels.RCA.probability * 100)}%.`
    : "No prediction yet.";

  return (
    <SceneErrorBoundary>
      <Canvas
        aria-label={`3D heart with the LAD, LCX and RCA arteries. ${summary} Drag to rotate, scroll to zoom, click an artery to inspect it.`}
        camera={{ position: [...STUDIO_OVERVIEW_POSITION], fov: 32 }}
        className="studio-canvas"
        dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
        frameloop={animated ? "always" : "demand"}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => {
          useUiStore.getState().setSelectedVessel(null);
          useStudioStore.getState().closeWindow("vessel");
        }}
      >
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => {
            if (useStudioStore.getState().quality === "high") {
              setQuality("lite");
            }
          }}
        />
        <Suspense
          fallback={
            <Html center>
              <HeartbeatLoader
                steps={[
                  features.isPending
                    ? "Loading the model inputs"
                    : "Loading the anatomical heart",
                ]}
                title="Preparing the 3D heart"
              />
            </Html>
          }
        >
          <SceneContent />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  );
}
