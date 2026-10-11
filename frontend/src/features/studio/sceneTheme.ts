import type { StudioTheme } from "./studioStore";

export interface SceneTheme {
  /** Radial background: centre glow and edge colour. */
  inner: string;
  outer: string;
  /** Pedestal rings, sparkles and the x-ray shell. */
  accent: string;
  xray: string;
  /** Rim lights that outline the heart against the background. */
  rimA: string;
  rimB: string;
  /** Effect strength: light theme keeps bloom subtle. */
  bloom: number;
  vignette: number;
  ambient: number;
}

export const SCENE_THEMES: Record<StudioTheme, SceneTheme> = {
  midnight: {
    inner: "#14223f",
    outer: "#03050b",
    accent: "#5eead4",
    xray: "#7dd3fc",
    rimA: "#38bdf8",
    rimB: "#a78bfa",
    bloom: 1.1,
    vignette: 0.55,
    ambient: 0.55,
  },
  aurora: {
    inner: "#2a1a5e",
    outer: "#06030f",
    accent: "#c4b5fd",
    xray: "#f0abfc",
    rimA: "#f472b6",
    rimB: "#22d3ee",
    bloom: 1.2,
    vignette: 0.6,
    ambient: 0.55,
  },
  clinical: {
    inner: "#ffffff",
    outer: "#cdd8e3",
    accent: "#0f766e",
    xray: "#0369a1",
    rimA: "#bae6fd",
    rimB: "#ffffff",
    bloom: 0.45,
    vignette: 0.18,
    ambient: 1.05,
  },
};
