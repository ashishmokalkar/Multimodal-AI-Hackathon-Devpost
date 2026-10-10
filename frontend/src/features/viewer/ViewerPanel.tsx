import { Bounds, Html, OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import type { ErrorInfo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import { HeartModel } from "./HeartModel";
import { VesselMesh } from "./VesselMesh";
import {
  cameraPositionForTarget,
  OVERVIEW_CAMERA_POSITION,
  OVERVIEW_CAMERA_TARGET,
} from "../../lib/cameraFocus";
import { formatProbability } from "../../lib/format";
import { usePatientStore } from "../../store/patientStore";
import {
  vesselDisplay,
  vesselIds,
  vesselMap,
  type VesselId,
} from "./vesselMap";
import { useUiStore } from "../../store/uiStore";

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

interface CameraRequest {
  focusVessel: VesselId | null;
  sequence: number;
}

interface HeartSceneProps {
  cameraRequest: CameraRequest;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  setControlsRef: (controls: OrbitControlsImpl | null) => void;
}

interface OverviewView {
  position: Vector3;
  target: Vector3;
}

interface CameraFocusControllerProps {
  cameraRequest: CameraRequest;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  overviewViewRef: RefObject<OverviewView | null>;
}

function CameraFocusController({
  cameraRequest,
  controlsRef,
  overviewViewRef,
}: CameraFocusControllerProps) {
  const { camera, invalidate } = useThree();
  const appliedSequence = useRef<number | null>(null);

  useEffect(() => {
    if (cameraRequest.sequence === appliedSequence.current) {
      return;
    }
    appliedSequence.current = cameraRequest.sequence;

    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    if (cameraRequest.focusVessel === null) {
      const overview = overviewViewRef.current;
      camera.position.copy(
        overview?.position ?? new Vector3(...OVERVIEW_CAMERA_POSITION),
      );
      controls.target.copy(
        overview?.target ?? new Vector3(...OVERVIEW_CAMERA_TARGET),
      );
    } else {
      const path = vesselMap[cameraRequest.focusVessel].path;
      const focusPoint = new CatmullRomCurve3(
        path.map(([x, y, z]) => new Vector3(x, y, z)),
      ).getPoint(0.5);
      const nextCameraPosition = cameraPositionForTarget(
        [camera.position.x, camera.position.y, camera.position.z],
        [controls.target.x, controls.target.y, controls.target.z],
        [focusPoint.x, focusPoint.y, focusPoint.z],
      );
      camera.position.set(...nextCameraPosition);
      controls.target.copy(focusPoint);
    }

    controls.update();
    invalidate();
  }, [
    camera,
    cameraRequest.focusVessel,
    cameraRequest.sequence,
    controlsRef,
    invalidate,
    overviewViewRef,
  ]);

  return null;
}

function HeartScene({
  cameraRequest,
  controlsRef,
  setControlsRef,
}: HeartSceneProps) {
  const { camera } = useThree();
  const overviewViewRef = useRef<OverviewView | null>(null);

  return (
    <>
      <color attach="background" args={["#f4f8f5"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 5, 5]} intensity={2.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.65} />
      <Bounds
        fit
        clip
        margin={1.2}
        maxDuration={1}
        onFit={({ center, distance }) => {
          const direction = camera.position.clone().sub(center).normalize();
          overviewViewRef.current = {
            position: center.clone().addScaledVector(direction, distance),
            target: center.clone(),
          };
        }}
      >
        <HeartModel />
        {vesselIds.map((vessel) => (
          <VesselMesh key={vessel} vessel={vessel} />
        ))}
      </Bounds>
      <OrbitControls
        ref={setControlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.4}
        maxDistance={5.5}
      />
      <CameraFocusController
        cameraRequest={cameraRequest}
        controlsRef={controlsRef}
        overviewViewRef={overviewViewRef}
      />
      {import.meta.env.DEV &&
        new URLSearchParams(window.location.search).get("fps") === "1" && (
          <Stats />
        )}
    </>
  );
}

interface AssetErrorBoundaryProps {
  children: ReactNode;
}

interface AssetErrorBoundaryState {
  error: Error | null;
}

class AssetErrorBoundary extends Component<
  AssetErrorBoundaryProps,
  AssetErrorBoundaryState
> {
  state: AssetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AssetErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unable to load the local heart model.", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="m-auto max-w-xs rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
          role="alert"
        >
          The local heart model could not be loaded. {this.state.error.message}
        </div>
      );
    }

    return this.props.children;
  }
}

export function ViewerPanel() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const setControlsRef = useCallback((controls: OrbitControlsImpl | null) => {
    controlsRef.current = controls;
  }, []);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>({
    focusVessel: null,
    sequence: 0,
  });
  const hoveredVessel = useUiStore((state) => state.hoveredVessel);
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);
  const prediction = usePatientStore((state) => state.prediction);
  const isPredicting = usePatientStore((state) => state.isPredicting);
  const predictionError = usePatientStore((state) => state.predictionError);
  const selectedTarget = selectedVessel
    ? prediction?.vessels[selectedVessel]
    : prediction?.cad;
  const selectedTargetName = selectedVessel ?? "CAD";
  const selectedTargetProbability = selectedTarget?.probability ?? null;
  const predictionStatus = prediction
    ? `Current predicted probabilities: CAD ${formatProbability(prediction.cad.probability)}, LAD ${vesselDisplay(prediction, "LAD").percentage}, LCX ${vesselDisplay(prediction, "LCX").percentage}, RCA ${vesselDisplay(prediction, "RCA").percentage}.`
    : isPredicting
      ? "A prediction is pending; vessel probabilities are unavailable."
      : predictionError
        ? "The latest prediction failed; vessel probabilities are unavailable."
        : "No current prediction; vessel probabilities are unavailable.";

  const focusVessel = (vessel: VesselId) => {
    setCameraRequest((request) => ({
      focusVessel: vessel,
      sequence: request.sequence + 1,
    }));
  };
  const resetView = () => {
    setCameraRequest((request) => ({
      focusVessel: null,
      sequence: request.sequence + 1,
    }));
  };

  return (
    <section
      className="panel viewer-panel"
      aria-labelledby="viewer-panel-heading"
    >
      <header className="panel-header viewer-header">
        <div>
          <p className="eyebrow">Interactive visualization</p>
          <h2 id="viewer-panel-heading">3D heart</h2>
        </div>
        <span className="viewer-status">
          <span className="status-dot" aria-hidden="true" />
          Schematic demo
        </span>
      </header>
      <div className="viewer-stage">
        <AssetErrorBoundary>
          <Canvas
            aria-label={`Interactive 3D heart with schematic LAD, LCX and RCA vessels. ${predictionStatus} Drag to orbit and scroll to zoom.`}
            camera={{ position: [4, 2.8, 5], fov: 38 }}
            dpr={[1, 1.5]}
            frameloop="demand"
          >
            <Suspense
              fallback={
                <Html center>
                  <div
                    className="whitespace-nowrap rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700 shadow"
                    role="status"
                  >
                    Loading local heart model...
                  </div>
                </Html>
              }
            >
              <HeartScene
                cameraRequest={cameraRequest}
                controlsRef={controlsRef}
                setControlsRef={setControlsRef}
              />
            </Suspense>
          </Canvas>
        </AssetErrorBoundary>
        <div className="viewer-caption">
          <span>Schematic vessels; not patient-specific lesion maps.</span>
          <span>Drag to rotate - Scroll to zoom</span>
        </div>
      </div>
      <div
        aria-label="Schematic camera controls"
        className="mx-4 mb-3 flex flex-wrap items-center gap-2"
        role="group"
      >
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          type="button"
          onClick={resetView}
        >
          Reset view
        </button>
        {vesselIds.map((vessel) => (
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            key={vessel}
            type="button"
            onClick={() => focusVessel(vessel)}
          >
            Focus {vessel}
          </button>
        ))}
      </div>
      <div
        className="viewer-legend"
        role="group"
        aria-label="Predicted probability colour legend"
      >
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-600">
            Predicted probability · not percentage artery narrowing
          </p>
          <div
            aria-hidden="true"
            className="h-2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #2e7d32 0%, #f9a825 50%, #c62828 100%)",
            }}
          />
          <div className="flex justify-between text-[10px] tabular-nums text-slate-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {vesselIds.map((vessel) => {
            const display = vesselDisplay(prediction, vessel);
            return (
              <span className="inline-flex items-center gap-1.5" key={vessel}>
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: display.color }}
                />
                <span>
                  {vessel} {display.percentage}
                </span>
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: "#94a3b8" }}
            />
            <span>Unavailable</span>
          </span>
        </div>
      </div>
      <div
        aria-live="polite"
        className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-800"
      >
        <span className="flex min-w-0 flex-nowrap gap-x-3">
          <span className="whitespace-nowrap">
            Selected target: {selectedTargetName} —{" "}
            {formatProbability(selectedTargetProbability)}
            {selectedTarget &&
              ` · ${selectedTarget.label} · threshold ${formatProbability(selectedTarget.threshold)}`}
          </span>
          {hoveredVessel && (
            <span className="whitespace-nowrap">
              Hovering: {hoveredVessel} ({vesselMap[hoveredVessel].label}) —{" "}
              {vesselDisplay(prediction, hoveredVessel).percentage}
            </span>
          )}
        </span>
        {selectedVessel && (
          <button
            className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 font-semibold"
            type="button"
            onClick={() => setSelectedVessel(null)}
          >
            Select CAD
          </button>
        )}
      </div>
      <p className="viewer-attribution px-5 pb-2 text-[10px] leading-relaxed text-slate-500">
        {prediction?.mock ? "Mock prediction. " : ""}
        Heart:{" "}
        <a
          className="font-semibold underline"
          href="/models/ATTRIBUTION.md"
          rel="noreferrer"
          target="_blank"
        >
          Realistic Human Heart by neshallads (CC BY 4.0)
        </a>
        .
      </p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {predictionStatus} Selected target {selectedTargetName}:{" "}
        {formatProbability(selectedTargetProbability)}.
      </div>
    </section>
  );
}
