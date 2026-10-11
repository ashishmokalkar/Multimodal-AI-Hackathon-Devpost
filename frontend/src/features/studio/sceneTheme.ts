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
  /** A light stage: glows are drawn normally, not added, because adding light to near-white shows nothing. */
  light: boolean;
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
    light: false,
  },
  clinical: {
    // a soft cool-grey stage, darker towards the edges, so the red heart and the coloured arteries stand out
    // instead of fading into white; rim lights are slate rather than white so the outline stays defined
    inner: "#e3eaf2",
    outer: "#8fa2b8",
    accent: "#0f766e",
    xray: "#1e3a5f",
    rimA: "#6b8bb0",
    rimB: "#9fb3c8",
    bloom: 0.3,
    vignette: 0.32,
    ambient: 0.7,
    light: true,
  },
};
