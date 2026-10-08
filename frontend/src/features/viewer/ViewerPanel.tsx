import {
  Bounds,
  Html,
  OrbitControls,
  Stats,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, type ReactNode } from "react";
import type { ErrorInfo } from "react";
import { HeartModel } from "./HeartModel";
import { VesselMesh } from "./VesselMesh";
import {
  vesselColor,
  vesselIds,
  vesselMap,
} from "./vesselMap";
import { useUiStore } from "../../store/uiStore";

function HeartScene() {
  return (
    <>
      <color attach="background" args={["#f4f8f5"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 5, 5]} intensity={2.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.65} />
      <Bounds fit clip margin={1.2}>
        <HeartModel />
        {vesselIds.map((vessel) => (
          <VesselMesh key={vessel} vessel={vessel} />
        ))}
      </Bounds>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.4}
        maxDistance={5.5}
      />
      {import.meta.env.DEV && <Stats />}
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
  const hoveredVessel = useUiStore((state) => state.hoveredVessel);
  const selectedVessel = useUiStore((state) => state.selectedVessel);
  const setSelectedVessel = useUiStore((state) => state.setSelectedVessel);

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
            aria-label="Interactive 3D heart with schematic LAD, LCX and RCA vessels. Drag to orbit and scroll to zoom."
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
              <HeartScene />
            </Suspense>
          </Canvas>
        </AssetErrorBoundary>
        <div className="viewer-caption">
          <span>Schematic vessels; not patient-specific lesion maps.</span>
          <span>Drag to rotate - Scroll to zoom</span>
        </div>
      </div>
      <div className="viewer-legend flex-wrap">
        {vesselIds.map((vessel) => (
          <span className="inline-flex items-center gap-1.5" key={vessel}>
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: vesselColor(vessel) }}
            />
            <span>
              {vessel} {vesselMap[vessel].probability.toFixed(2)}
            </span>
          </span>
        ))}
      </div>
      <div
        aria-live="polite"
        className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-950"
      >
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {selectedVessel && (
            <span>
              Selected: {selectedVessel} ({vesselMap[selectedVessel].label}) —
              illustrative test value{" "}
              {vesselMap[selectedVessel].probability.toFixed(2)}
            </span>
          )}
          {hoveredVessel && (
            <span>
              Hovering: {hoveredVessel} ({vesselMap[hoveredVessel].label})
            </span>
          )}
          {!hoveredVessel && !selectedVessel && (
            <span>Hover or select a vessel to inspect it.</span>
          )}
        </span>
        {selectedVessel && (
          <button
            className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 font-semibold"
            onClick={() => setSelectedVessel(null)}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <p className="px-5 pb-2 text-[10px] leading-relaxed text-slate-500">
        Illustrative test values only — not live predictions. Heart:{" "}
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
      <div className="sr-only" aria-live="polite">
        {hoveredVessel
          ? `Hovering over ${hoveredVessel}`
          : selectedVessel
            ? `Selected vessel ${selectedVessel}`
            : "No vessel selected"}
      </div>
    </section>
  );
}
