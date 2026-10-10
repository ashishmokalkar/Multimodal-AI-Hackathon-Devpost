import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

const HEART_MODEL_URL = "/models/heart.glb";

export function HeartModel() {
  // meshopt-compressed geometry (decoded locally); no Draco, so no decoder is fetched from a CDN
  const { scene } = useGLTF(HEART_MODEL_URL, false, true);
  const heartScene = useMemo(() => scene.clone(true), [scene]);

  return (
    <group name="Heart">
      <primitive object={heartScene} />
    </group>
  );
}
