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
  NormalBlending,
  Object3D,
  ShaderMaterial,
  Vector3,
  type Group,
  type PerspectiveCamera,
  type InstancedMesh,
  type Material,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import { useFeatures } from "../../api/hooks";
import { cameraPositionFacing, type Point3 } from "../../lib/cameraFocus";
import { inkOn, riskColorAt, riskHeat, thresholdPosition } from "../../lib/colorScale";
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
import { clearSelection, toggleArtery } from "./selection";
import { beatPulse, pulseRate } from "./studioModel";
import { heartCovered, useStudioStore } from "./studioStore";
import { isFlagged } from "../../lib/flags";

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
        const blending = theme.light ? NormalBlending : AdditiveBlending;
        if (material.blending !== blending) {
          material.blending = blending;
          material.needsUpdate = true;
        }
      }
    });
    root.visible = xrayOpacity > 0.01;
  }, [theme.light, theme.xray, xray, xrayOpacity]);

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
/** Most blood-flow particles on one artery (the hottest); cool arteries show none. */
const FLOW_MAX = 30;
/** Time for an artery to heat up or cool down to a new prediction. */
const RISK_EASE_MS = 600;
/** The tube is built at this radius; a vertex shader widens or narrows it every frame without rebuilding it. */
const TUBE_RADIUS = 0.016;
const MATTE_GREY = new Color("#8a94a6");
const RAISE_COLOR = new Color(RAISE_GLOW);
const LOWER_COLOR = new Color(LOWER_GLOW);
/** The risk scale sampled every 1%, so per-frame colour updates need no string work. */
const RISK_LUT = Array.from({ length: 101 }, (_, i) => new Color(riskColorAt(i / 100)));

function riskColorInto(target: Color, position: number): Color {
  const x = Math.min(1, Math.max(0, position)) * 100;
  const lo = Math.floor(x);
  return target.copy(RISK_LUT[lo]).lerp(RISK_LUT[Math.min(100, lo + 1)], x - lo);
}

function easeInOut(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

/** Shader hook that moves every vertex of a tube along its normal by `grow`: animated thickness, no new geometry. */
function growTube(
  shader: { uniforms: Record<string, unknown>; vertexShader: string },
  grow: { value: number },
) {
  shader.uniforms.uGrow = grow;
  shader.vertexShader = `uniform float uGrow;\n${shader.vertexShader.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\ntransformed += normalize(normal) * uGrow;",
  )}`;
}
const growCacheKey = () => "artery-grow";

/** What the artery currently looks like, shared with its blood flow: risk colour and flow density (0-1). */
interface VesselLook {
  color: Color;
  flow: number;
}

/** Blood flow along an artery, in its risk colour: none on a cool artery, more and faster as it heats up. */
function FlowParticles({
  points,
  look,
  beatRef,
}: {
  points: Vector3[];
  look: { current: VesselLook };
  beatRef: { current: number };
}) {
  const ref = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    const mesh = ref.current;
    const material = materialRef.current;
    if (!mesh || !material) {
      return;
    }
    const { flow, color } = look.current;
    const active = Math.round(FLOW_MAX * flow);
    mesh.visible = active > 0;
    if (active === 0) {
      return;
    }
    // above display range, so bloom catches the particles
    material.color.copy(color).multiplyScalar(2.8);
    progress.current += delta * (0.05 + 0.24 * flow) * (0.6 + beatRef.current * 1.4);
    const last = points.length - 1;
    for (let index = 0; index < FLOW_MAX; index += 1) {
      if (index < active) {
        const t = (index / active + progress.current) % 1;
        FLOW_DUMMY.position.copy(points[Math.round(t * last)]);
        // particles fade in at the origin and out at the tip, and grow on hot arteries
        FLOW_DUMMY.scale.setScalar((Math.sin(Math.PI * t) * 0.9 + 0.1) * (0.8 + 0.7 * flow));
      } else {
        FLOW_DUMMY.scale.setScalar(0);
      }
      FLOW_DUMMY.updateMatrix();
      mesh.setMatrixAt(index, FLOW_DUMMY.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      args={[undefined, undefined, FLOW_MAX]}
      frustumCulled={false}
      raycast={() => null}
      ref={ref}
    >
      <sphereGeometry args={[0.011, 8, 6]} />
      <meshBasicMaterial ref={materialRef} toneMapped={false} />
    </instancedMesh>
  );
}

interface StudioVesselProps {
  vessel: VesselId;
  beatRef: { current: number };
}

/**
 * One coronary artery, coloured by its chance of narrowing against its own threshold (blue → amber → hot
 * red-magenta). Cool arteries are thin, matte and still; hot ones are thicker, glow above display range for bloom,
 * pulse with the heartbeat and carry faster, denser blood flow. Everything scales with the probability, and eases
 * over 600 ms when the prediction changes, so the artery visibly heats up or cools down.
 */
function StudioVessel({ vessel, beatRef }: StudioVesselProps) {
  const definition = vesselMap[vessel];
  const lightStage = useStudioStore((state) => SCENE_THEMES[state.theme].light);
  const invalidate = useThree((state) => state.invalidate);
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
  const flow = useStudioStore((state) => state.motion);
  const labels = useStudioStore((state) => state.labels);
  const covered = useStudioStore(heartCovered);
  const target = display.target;
  const flagged = target !== null && isFlagged(target);
  // null while the next prediction is being scored: the artery keeps its current look until it arrives
  const position = target ? thresholdPosition(target.probability, target.threshold) : null;
  const tagColor = position === null ? display.color : riskColorAt(position);
  const impact =
    hoveredFactor && prediction && !prediction.mock
      ? factorImpact(prediction.explanations, hoveredFactor)[vessel]
      : null;
  const affected = impact !== null && Math.abs(impact) >= 1;
  const faded =
    (impact !== null && !affected) ||
    (impact === null && anySelected && !isSelected && !isHovered);
  // lit arteries go above display range and bloom; cool ones stay matte
  const glows = affected || isHovered || isSelected || riskHeat(position ?? 0) > 0.12;
  const materialRef = useRef<MeshStandardMaterial>(null);
  const haloRef = useRef<Mesh>(null);
  const haloMaterialRef = useRef<MeshBasicMaterial>(null);
  const grow = useRef({ value: 0 });
  const haloGrow = useRef({ value: 0 });
  const look = useRef<VesselLook>({ color: new Color(), flow: 0 });
  const motion = useStudioStore((state) => state.motion);
  const animate = motion && !reducedMotion();
  // start -1: the transition begins on the next frame
  const ease = useRef({ from: 0, to: 0, start: -1, value: 0 });

  // a new prediction (another patient, a what-if change) starts a transition from wherever the artery is now
  useEffect(() => {
    if (position === null) {
      return;
    }
    const now = ease.current;
    ease.current = { from: now.value, to: position, start: -1, value: now.value };
    invalidate();
  }, [invalidate, position]);

  useFrame(() => {
    const material = materialRef.current;
    if (!material) {
      return;
    }
    const e = ease.current;
    // wall-clock time: frames are rendered on demand while motion is off, so the scene clock is not continuous
    const time = performance.now();
    if (e.start < 0) {
      e.start = time;
    }
    const k = reducedMotion() ? 1 : Math.min(1, (time - e.start) / RISK_EASE_MS);
    e.value = e.from + (e.to - e.from) * easeInOut(k);
    if (k < 1) {
      invalidate();
    }
    const heat = riskHeat(e.value);
    const beat = animate ? beatRef.current : 0;
    const current = look.current;
    riskColorInto(current.color, e.value);
    current.flow = Math.min(1, Math.max(0, (e.value - 0.25) / 0.75));

    // thickness: thin when cool, thick when hot; hover, selection and factor highlights widen it further
    let radius = 0.0085 + 0.004 * e.value + 0.0145 * heat;
    if (affected) {
      radius = Math.max(radius, 0.022);
    }
    if (isSelected) {
      radius = Math.max(radius, 0.024);
    }
    if (isHovered) {
      radius += 0.003;
    }
    grow.current.value = radius - TUBE_RADIUS;

    // colour: desaturated and matte when cool; glossy and glowing with the heartbeat when hot, where the glow
    // carries the colour (the lit surface dims) so a hot artery stays saturated red-pink instead of turning white
    material.color
      .copy(current.color)
      .lerp(MATTE_GREY, 0.3 * (1 - heat))
      .multiplyScalar(1 - 0.55 * heat);
    material.emissive.copy(affected ? (impact > 0 ? RAISE_COLOR : LOWER_COLOR) : current.color);
    let glow = (0.02 + 1.7 * heat ** 1.15) * (1 + 0.6 * heat * beat);
    if (affected) {
      glow = Math.max(glow, 1.4);
    } else if (isHovered) {
      glow = Math.max(glow, 1.2);
    } else if (isSelected) {
      // the picked artery is brighter than any other, whatever its risk; the other two fade (see faded)
      glow = Math.max(glow * 1.35, 1.3);
    }
    material.emissiveIntensity = glow;
    material.roughness = 0.85 - 0.6 * heat;
    material.metalness = 0.04 + 0.2 * heat;

    // halo: fades in with the heat and swells and brightens on every heartbeat
    const halo = haloRef.current;
    const haloMaterial = haloMaterialRef.current;
    if (halo && haloMaterial) {
      const hot = Math.min(1, Math.max(0, (heat - 0.2) / 0.8)) ** 1.2;
      const opacity = Math.max(
        hot * (lightStage ? 0.22 : 0.14) * (1 + 1.8 * beat),
        isSelected ? (lightStage ? 0.38 : 0.26) : affected || isHovered ? (lightStage ? 0.3 : 0.18) : 0,
      );
      halo.visible = opacity > 0.005 && !faded;
      haloMaterial.opacity = opacity;
      haloMaterial.color.copy(material.emissive);
      haloGrow.current.value = radius * (1.7 + 0.6 * beat * hot) - TUBE_RADIUS;
    }
  });

  const setHovered = useUiStore((state) => state.setHoveredVessel);
  // click picks this artery for the Why window; clicking it again goes back to the overall result
  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    toggleArtery(vessel);
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
        <tubeGeometry args={[curve, 64, TUBE_RADIUS, 12, false]} />
        <meshStandardMaterial
          customProgramCacheKey={growCacheKey}
          onBeforeCompile={(shader) => growTube(shader, grow.current)}
          opacity={faded ? 0.22 : 1}
          ref={materialRef}
          toneMapped={!glows}
          transparent={faded}
        />
      </mesh>
      <mesh raycast={() => null} ref={haloRef} visible={false}>
        <tubeGeometry args={[curve, 64, TUBE_RADIUS, 12, false]} />
        <meshBasicMaterial
          blending={lightStage ? NormalBlending : AdditiveBlending}
          customProgramCacheKey={growCacheKey}
          depthWrite={false}
          onBeforeCompile={(shader) => growTube(shader, haloGrow.current)}
          ref={haloMaterialRef}
          side={DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
      {flow && target && !faded && (
        <FlowParticles beatRef={beatRef} look={look} points={spaced} />
      )}
      {labels && target && (
        <Html
          center
          position={tagPosition}
          style={{ pointerEvents: "none" }}
          zIndexRange={[20, 0]}
        >
          <span
            className={`sv-tag${flagged ? " is-flagged" : ""}${isSelected || isHovered ? " is-active" : ""}${faded ? " is-faded" : ""}${covered ? " is-hidden" : ""}`}
            style={{ backgroundColor: tagColor, color: inkOn(tagColor) }}
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
  const motion = useStudioStore((state) => state.motion);
  const animate = motion && !reducedMotion();
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

/** Breathing room between the heart and the toolbar above it or the window below it, in pixels. */
const FRAME_MARGIN = 14;

/**
 * Keeps the heart in the clear band of the screen: below the 3D toolbar and above the bottom window (or the dock
 * when that window is closed or moved aside). The camera's view is shifted up and, when the band is short,
 * zoomed out a little, so windows cover as little of the heart as possible. Orbiting and flying to an artery work
 * as before, inside the same band.
 */
function Framing({ heartBox }: { heartBox: Box3 | null }) {
  const get = useThree((state) => state.get);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const whatifOpen = useStudioStore((state) => state.open.whatif);
  const whatif = useStudioStore((state) => state.rects.whatif);
  const setHeartCentre = useStudioStore((state) => state.setHeartCentre);

  useEffect(() => {
    const view = get().camera as PerspectiveCamera;
    // compact (phone) layout stacks the windows below the stage, so the heart keeps the plain centred view
    if (!heartBox || heartBox.isEmpty() || size.width < 760) {
      setHeartCentre(null);
      view.clearViewOffset();
      view.zoom = 1;
      view.updateProjectionMatrix();
      invalidate();
      return;
    }
    // where the heart lands on screen from the overview position, without any framing
    const probe = view.clone();
    probe.clearViewOffset();
    probe.zoom = 1;
    probe.aspect = size.width / size.height;
    probe.position.set(...STUDIO_OVERVIEW_POSITION);
    probe.lookAt(...STUDIO_OVERVIEW_TARGET);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld();
    let top = Infinity;
    let bottom = -Infinity;
    const { min, max } = heartBox;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          const point = new Vector3(x, y, z).project(probe);
          const screenY = ((1 - point.y) / 2) * size.height;
          top = Math.min(top, screenY);
          bottom = Math.max(bottom, screenY);
        }
      }
    }
    const toolbarBottom =
      document.querySelector(".studio .toolbar")?.getBoundingClientRect().bottom ?? 104;
    const bandTop = toolbarBottom + FRAME_MARGIN;
    // a window only limits the band when it sits under the heart (the what-if sliders or the artery inspector)
    const under = (open: boolean, rect: { x: number; y: number; w: number }) =>
      open &&
      rect.x < size.width * 0.6 &&
      rect.x + rect.w > size.width * 0.4 &&
      rect.y > bandTop + 240;
    const bandBottom = Math.min(
      size.height - 96,
      under(whatifOpen, whatif) ? whatif.y - FRAME_MARGIN : Infinity,
    );
    const zoom = Math.min(1, Math.max(0.6, (bandBottom - bandTop) / (bottom - top)));
    const centre = size.height / 2 + ((top + bottom) / 2 - size.height / 2) * zoom;
    const shift = centre - (bandTop + bandBottom) / 2;
    view.zoom = zoom;
    view.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    view.updateProjectionMatrix();
    setHeartCentre({ x: Math.round(size.width / 2), y: Math.round((bandTop + bandBottom) / 2) });
    invalidate();
  }, [get, heartBox, invalidate, setHeartCentre, size.height, size.width, whatif, whatifOpen]);

  return null;
}

// ------------------------------------------------------------------------------------------- scene
function SceneContent() {
  const themeName = useStudioStore((state) => state.theme);
  const theme = SCENE_THEMES[themeName];
  const depth = useStudioStore((state) => state.depth);
  const motion = useStudioStore((state) => state.motion);
  const quality = useStudioStore((state) => state.quality);
  // the heart turns only in the overview: not while an artery is in focus, the camera flies, or the tour runs
  const overview = useStudioStore(
    (state) => state.camera.vessel === null && !state.tour.active,
  );
  const nothingSelected = useUiStore((state) => state.selectedVessel === null);
  const autoRotate = motion && overview && nothingSelected;
  const pulse = usePatientStore((state) => pulseRate(state.features.PR));
  const controls = useRef<OrbitControlsImpl | null>(null);
  const beating = useRef<Group>(null);
  const beatRef = useRef(0);
  const [floorY, setFloorY] = useState(-0.95);
  const [heartBox, setHeartBox] = useState<Box3 | null>(null);
  const onBounds = useMemo(
    () => (box: Box3) => {
      if (Number.isFinite(box.min.y)) {
        setFloorY(box.min.y - 0.06);
        setHeartBox(box);
      }
    },
    [],
  );

  useFrame((state) => {
    const pulseValue = motion
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
      <Framing heartBox={heartBox} />
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
  const motion = useStudioStore((state) => state.motion);
  const quality = useStudioStore((state) => state.quality);
  const setQuality = useStudioStore((state) => state.setQuality);
  const animated = motion;
  const prediction = useShownPrediction();
  const features = useFeatures();
  const summary = prediction
    ? `CAD ${Math.round(prediction.cad.probability * 100)}%, LAD ${Math.round(prediction.vessels.LAD.probability * 100)}%, LCX ${Math.round(prediction.vessels.LCX.probability * 100)}%, RCA ${Math.round(prediction.vessels.RCA.probability * 100)}%.`
    : "No prediction yet.";

  return (
    <SceneErrorBoundary>
      <Canvas
        aria-label={`3D heart with the LAD, LCX and RCA arteries. ${summary} Drag to rotate, scroll to zoom, click an artery to explain it in the Why window.`}
        camera={{ position: [...STUDIO_OVERVIEW_POSITION], fov: 32 }}
        className="studio-canvas"
        dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
        frameloop={animated ? "always" : "demand"}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={clearSelection}
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
