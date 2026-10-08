import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

const HEART_MODEL_URL = "/models/heart.glb";

export function HeartModel() {
  const { scene } = useGLTF(HEART_MODEL_URL);
  const heartScene = useMemo(() => scene.clone(true), [scene]);

  return (
    <group name="Heart">
      <primitive object={heartScene} />
    </group>
  );
}
