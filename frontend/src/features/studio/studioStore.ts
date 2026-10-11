import { create } from "zustand";
import type { VesselId } from "../viewer/vesselMap";
import {
  ANCHORED_WINDOWS,
  clampRect,
  DEFAULT_OPEN,
  defaultLayout,
  MIN_WINDOW_SIZE,
  WINDOW_IDS,
  type Rect,
  type WindowId,
} from "./studioModel";

export type StudioTheme = "midnight" | "clinical";
export const STUDIO_THEMES: readonly StudioTheme[] = [
  "midnight",
  "clinical",
];
export const THEME_LABEL: Record<StudioTheme, string> = {
  midnight: "Midnight",
  clinical: "Clinical light",
};

export type Quality = "high" | "lite";

interface Persisted {
  theme: StudioTheme;
  /** Window glass opacity, 0.25 (very see-through) to 0.95 (nearly solid). */
  glass: number;
  /** 0 solid heart, 0.5 x-ray, 1 arteries only. */
  depth: number;
  /**
   * One switch for every looping animation: the heartbeat, blood flow along the arteries, the slow turn of the
   * heart and the rotating base.
   */
  motion: boolean;
  labels: boolean;
  quality: Quality;
  rects: Record<WindowId, Rect>;
  open: Record<WindowId, boolean>;
  order: WindowId[];
}

interface StudioState extends Persisted {
  /**
   * Windows that follow the default layout for the current viewport (re-laid out on resize). A window leaves it
   * when the user moves or resizes it, for the rest of the session.
   */
  anchored: Record<WindowId, boolean>;
  /** Each request bumps the sequence so the same vessel can be revisited. */
  camera: { vessel: VesselId | null; sequence: number };
  paletteOpen: boolean;
  tour: { active: boolean; step: number; playing: boolean };
  /** A factor kept lit on the heart after the pointer leaves it (chosen from the factor map or command bar). */
  pinnedFactor: string | null;
  setTheme: (theme: StudioTheme) => void;
  setGlass: (glass: number) => void;
  setDepth: (depth: number) => void;
  toggle: (key: "motion" | "labels") => void;
  setQuality: (quality: Quality) => void;
  focus: (vessel: VesselId | null) => void;
  setPaletteOpen: (open: boolean) => void;
  startTour: () => void;
  stopTour: () => void;
  setTourStep: (step: number) => void;
  setTourPlaying: (playing: boolean) => void;
  setPinnedFactor: (feature: string | null) => void;
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  toggleWindow: (id: WindowId) => void;
  raiseWindow: (id: WindowId) => void;
  moveWindow: (id: WindowId, rect: Rect) => void;
  /** Puts a window back on the default layout for the current viewport. */
  anchorWindow: (id: WindowId) => void;
  fitToViewport: () => void;
  resetLayout: () => void;
}

// v2: new default layout (patient left-centre, what-if closed) and no Aurora theme; v1 layouts are not reused
const STORAGE_KEY = "cardioclarity-studio-v2";

function viewport() {
  return typeof window === "undefined"
    ? { w: 1440, h: 900 }
    : { w: window.innerWidth, h: window.innerHeight };
}

function allAnchored(): Record<WindowId, boolean> {
  return Object.fromEntries(WINDOW_IDS.map((id) => [id, true])) as Record<WindowId, boolean>;
}

function freshLayout(): Pick<StudioState, "rects" | "open" | "order" | "anchored"> {
  const { w, h } = viewport();
  return {
    rects: defaultLayout(w, h),
    open: { ...DEFAULT_OPEN },
    order: [...WINDOW_IDS],
    anchored: allAnchored(),
  };
}

function defaults(): Persisted & Pick<StudioState, "anchored"> {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return {
    theme: "midnight",
    glass: 0.55,
    depth: 0,
    motion: !reducedMotion,
    labels: true,
    quality: "high",
    ...freshLayout(),
  };
}

function load(): Persisted & Pick<StudioState, "anchored"> {
  const base = defaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return base;
    }
    const saved = JSON.parse(raw) as Partial<Persisted>;
    const rects = { ...base.rects };
    const open = { ...base.open };
    const anchored = { ...base.anchored };
    for (const id of WINDOW_IDS) {
      // the patient, risk and why windows always start on the layout for this screen, open
      if (ANCHORED_WINDOWS.includes(id)) {
        continue;
      }
      const rect = saved.rects?.[id];
      if (
        rect &&
        [rect.x, rect.y, rect.w, rect.h].every((n) => Number.isFinite(n))
      ) {
        rects[id] = rect;
        anchored[id] = false;
      }
      if (typeof saved.open?.[id] === "boolean") {
        open[id] = saved.open[id];
      }
    }
    const order = (saved.order ?? []).filter((id) =>
      (WINDOW_IDS as readonly string[]).includes(id),
    );
    return {
      theme: STUDIO_THEMES.includes(saved.theme as StudioTheme)
        ? (saved.theme as StudioTheme)
        : base.theme,
      glass:
        typeof saved.glass === "number"
          ? Math.min(0.95, Math.max(0.25, saved.glass))
          : base.glass,
      depth:
        typeof saved.depth === "number"
          ? Math.min(1, Math.max(0, saved.depth))
          : base.depth,
      // earlier versions saved the heartbeat on its own; it stands in for the combined switch
      motion: saved.motion ?? (saved as { beat?: boolean }).beat ?? base.motion,
      labels: saved.labels ?? base.labels,
      quality: saved.quality === "lite" ? "lite" : "high",
      rects,
      anchored,
      // the vessel inspector follows the selection, so it never reopens by itself
      open: { ...open, vessel: false },
      order: [...order, ...WINDOW_IDS.filter((id) => !order.includes(id))],
    };
  } catch {
    return base;
  }
}

function save(state: StudioState) {
  const persisted: Persisted = {
    theme: state.theme,
    glass: state.glass,
    depth: state.depth,
    motion: state.motion,
    labels: state.labels,
    quality: state.quality,
    rects: state.rects,
    open: state.open,
    order: state.order,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // layout still works for this visit
  }
}

function raised(order: WindowId[], id: WindowId): WindowId[] {
  return [...order.filter((item) => item !== id), id];
}

export const useStudioStore = create<StudioState>((set) => ({
  ...load(),
  camera: { vessel: null, sequence: 0 },
  paletteOpen: false,
  tour: { active: false, step: 0, playing: true },
  pinnedFactor: null,
  setTheme: (theme) => set({ theme }),
  setGlass: (glass) => set({ glass: Math.min(0.95, Math.max(0.25, glass)) }),
  setDepth: (depth) => set({ depth: Math.min(1, Math.max(0, depth)) }),
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setQuality: (quality) => set({ quality }),
  focus: (vessel) =>
    set((state) => ({
      camera: { vessel, sequence: state.camera.sequence + 1 },
    })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  startTour: () =>
    set({ tour: { active: true, step: 0, playing: true }, paletteOpen: false }),
  stopTour: () =>
    set((state) => ({
      tour: { ...state.tour, active: false },
      camera: { vessel: null, sequence: state.camera.sequence + 1 },
    })),
  setTourStep: (step) => set((state) => ({ tour: { ...state.tour, step } })),
  setTourPlaying: (playing) =>
    set((state) => ({ tour: { ...state.tour, playing } })),
  setPinnedFactor: (pinnedFactor) => set({ pinnedFactor }),
  openWindow: (id) =>
    set((state) => ({
      open: { ...state.open, [id]: true },
      order: raised(state.order, id),
    })),
  closeWindow: (id) => set((state) => ({ open: { ...state.open, [id]: false } })),
  toggleWindow: (id) =>
    set((state) =>
      state.open[id] && state.order[state.order.length - 1] === id
        ? { open: { ...state.open, [id]: false } }
        : { open: { ...state.open, [id]: true }, order: raised(state.order, id) },
    ),
  raiseWindow: (id) =>
    set((state) =>
      state.order[state.order.length - 1] === id
        ? state
        : { order: raised(state.order, id) },
    ),
  moveWindow: (id, rect) =>
    set((state) => ({
      rects: { ...state.rects, [id]: rect },
      anchored: { ...state.anchored, [id]: false },
    })),
  anchorWindow: (id) =>
    set((state) => {
      const { w, h } = viewport();
      return {
        rects: { ...state.rects, [id]: defaultLayout(w, h)[id] },
        anchored: { ...state.anchored, [id]: true },
      };
    }),
  fitToViewport: () =>
    set((state) => {
      const { w, h } = viewport();
      const layout = defaultLayout(w, h);
      const rects = { ...state.rects };
      for (const id of WINDOW_IDS) {
        rects[id] = state.anchored[id]
          ? layout[id]
          : clampRect(rects[id], w, h, MIN_WINDOW_SIZE[id]);
      }
      return { rects };
    }),
  resetLayout: () => set(freshLayout()),
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;
useStudioStore.subscribe((state) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => save(state), 250);
});
