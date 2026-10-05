import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

function PlaceholderScene() {
  return (
    <>
      <color attach="background" args={["#f4f8f5"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 5, 5]} intensity={2.2} />
      <directionalLight position={[-4, -2, -3]} intensity={0.65} />
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1.08, 64, 48]} />
        <meshStandardMaterial
          color="#78a897"
          roughness={0.34}
          metalness={0.06}
        />
      </mesh>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2.6}
        maxDistance={8}
      />
    </>
  );
}

export function ViewerPanel() {
  return (
    <section
      className="panel viewer-panel"
      aria-labelledby="viewer-panel-heading"
    >
      <header className="panel-header viewer-header">
        <div>
          <p className="eyebrow">Interactive visualization</p>
          <h2 id="viewer-panel-heading">3D canvas</h2>
        </div>
        <span className="viewer-status">
          <span className="status-dot" aria-hidden="true" />
          Placeholder
        </span>
      </header>
      <div className="viewer-stage">
        <Canvas
          aria-label="Interactive 3D canvas with a placeholder sphere. Drag to orbit and scroll to zoom."
          camera={{ position: [4, 2.8, 5], fov: 38 }}
          dpr={[1, 1.5]}
          frameloop="demand"
        >
          <PlaceholderScene />
        </Canvas>
        <div className="viewer-caption" aria-hidden="true">
          <span>Placeholder geometry</span>
          <span>Drag to orbit - Scroll to zoom</span>
        </div>
      </div>
      <div className="viewer-legend">
        <span className="legend-swatch" aria-hidden="true" />
        <span>Placeholder sphere</span>
      </div>
    </section>
  );
}
