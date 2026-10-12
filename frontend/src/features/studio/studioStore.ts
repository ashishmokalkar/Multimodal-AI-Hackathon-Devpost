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
/** How the Risk window shows the chances: aligned threshold bars, or one tile per target. */
export type RiskView = "bars" | "tiles";

interface Persisted {
  theme: StudioTheme;
  /** Window background opacity, GLASS_MIN to GLASS_MAX: mostly opaque, so the heart never shows through text. */
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
  riskView: RiskView;
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
  /** Windows currently enlarged with Expand (the 3D artery tags hide while one is). */
  expanded: Partial<Record<WindowId, boolean>>;
  /** Where the middle of the heart is on screen (set by the camera framing); null in the stacked phone layout. */
  heartCentre: { x: number; y: number } | null;
  /** Bumped when an artery is picked, so the Why window flashes its border once in that artery's risk colour. */
  whyFlash: { vessel: VesselId; sequence: number } | null;
  setTheme: (theme: StudioTheme) => void;
  setGlass: (glass: number) => void;
  setDepth: (depth: number) => void;
  toggle: (key: "motion" | "labels") => void;
  setQuality: (quality: Quality) => void;
  setRiskView: (view: RiskView) => void;
  focus: (vessel: VesselId | null) => void;
  setPaletteOpen: (open: boolean) => void;
  startTour: () => void;
  stopTour: () => void;
  setTourStep: (step: number) => void;
  setTourPlaying: (playing: boolean) => void;
  setPinnedFactor: (feature: string | null) => void;
  setExpanded: (id: WindowId, expanded: boolean) => void;
  setHeartCentre: (centre: { x: number; y: number } | null) => void;
  flashWhy: (vessel: VesselId) => void;
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
export const GLASS_MIN = 0.85;
export const GLASS_MAX = 0.98;
const GLASS_DEFAULT = 0.93;

function clampGlass(glass: number): number {
  return Math.min(GLASS_MAX, Math.max(GLASS_MIN, glass));
}

function viewport() {
  return typeof window === "undefined"
    ? { w: 1440, h: 900 }
    : { w: window.innerWidth, h: window.innerHeight };
}

function allAnchored(): Record<WindowId, boolean> {
  return Object.fromEntries(WINDOW_IDS.map((id) => [id, true])) as Record<WindowId, boolean>;
}

/** The default layout for this screen with the windows open as given (Risk sits higher once Why is open). */
function layoutFor(open: Record<WindowId, boolean>): Record<WindowId, Rect> {
  const { w, h } = viewport();
  return defaultLayout(w, h, { whyOpen: open.drivers });
}

/**
 * Opening or closing Why moves Risk between the middle and the top of the right column, if Risk still follows the
 * default layout; a window the user has placed stays where it is.
 */
function withOpen(
  state: Pick<StudioState, "rects" | "anchored">,
  open: Record<WindowId, boolean>,
): Pick<StudioState, "open" | "rects"> {
  if (!state.anchored.risk) {
    return { open, rects: state.rects };
  }
  const layout = layoutFor(open);
  return {
    open,
    rects: {
      ...state.rects,
      risk: layout.risk,
      drivers: state.anchored.drivers ? layout.drivers : state.rects.drivers,
    },
  };
}

function freshLayout(): Pick<StudioState, "rects" | "open" | "order" | "anchored"> {
  return {
    rects: layoutFor(DEFAULT_OPEN),
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
    glass: GLASS_DEFAULT,
    depth: 0,
    motion: !reducedMotion,
    labels: true,
    quality: "high",
    riskView: "bars",
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
      // the patient, risk and why windows always start on the layout for this screen (Why closed)
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
      // layouts saved when windows were see-through start mostly opaque now
      glass:
        typeof saved.glass === "number" && saved.glass >= GLASS_MIN
          ? clampGlass(saved.glass)
          : base.glass,
      depth:
        typeof saved.depth === "number"
          ? Math.min(1, Math.max(0, saved.depth))
          : base.depth,
      // earlier versions saved the heartbeat on its own; it stands in for the combined switch
      motion: saved.motion ?? (saved as { beat?: boolean }).beat ?? base.motion,
      labels: saved.labels ?? base.labels,
      quality: saved.quality === "lite" ? "lite" : "high",
      riskView: saved.riskView === "tiles" ? "tiles" : "bars",
      rects,
      anchored,
      open,
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
    riskView: state.riskView,
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
  expanded: {},
  heartCentre: null,
  whyFlash: null,
  setTheme: (theme) => set({ theme }),
  setGlass: (glass) => set({ glass: clampGlass(glass) }),
  setDepth: (depth) => set({ depth: Math.min(1, Math.max(0, depth)) }),
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setQuality: (quality) => set({ quality }),
  setRiskView: (riskView) => set({ riskView }),
  focus: (vessel) =>
    set((state) => ({
      camera: { vessel, sequence: state.camera.sequence + 1 },
    })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  // the tour explains each target, so Why opens with it
  startTour: () =>
    set((state) => ({
      ...withOpen(state, { ...state.open, drivers: true }),
      tour: { active: true, step: 0, playing: true },
      paletteOpen: false,
    })),
  stopTour: () =>
    set((state) => ({
      tour: { ...state.tour, active: false },
      camera: { vessel: null, sequence: state.camera.sequence + 1 },
    })),
  setTourStep: (step) => set((state) => ({ tour: { ...state.tour, step } })),
  setTourPlaying: (playing) =>
    set((state) => ({ tour: { ...state.tour, playing } })),
  setPinnedFactor: (pinnedFactor) => set({ pinnedFactor }),
  setExpanded: (id, expanded) =>
    set((state) => ({ expanded: { ...state.expanded, [id]: expanded } })),
  setHeartCentre: (heartCentre) =>
    set((state) =>
      state.heartCentre?.x === heartCentre?.x && state.heartCentre?.y === heartCentre?.y
        ? state
        : { heartCentre },
    ),
  flashWhy: (vessel) =>
    set((state) => ({
      whyFlash: { vessel, sequence: (state.whyFlash?.sequence ?? 0) + 1 },
    })),
  openWindow: (id) =>
    set((state) => ({
      ...withOpen(state, { ...state.open, [id]: true }),
      order: raised(state.order, id),
    })),
  closeWindow: (id) => set((state) => withOpen(state, { ...state.open, [id]: false })),
  toggleWindow: (id) =>
    set((state) =>
      state.open[id] && state.order[state.order.length - 1] === id
        ? withOpen(state, { ...state.open, [id]: false })
        : { ...withOpen(state, { ...state.open, [id]: true }), order: raised(state.order, id) },
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
      return {
        rects: { ...state.rects, [id]: layoutFor(state.open)[id] },
        anchored: { ...state.anchored, [id]: true },
      };
    }),
  fitToViewport: () =>
    set((state) => {
      const { w, h } = viewport();
      const layout = layoutFor(state.open);
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

/** Half-size of the area around the heart's centre that, when a window covers it, hides the 3D artery tags. */
const HEART_CORE = 40;

/**
 * Whether the 3D artery tags should hide: a window is enlarged, or an open window covers the middle of the heart
 * (the tags would otherwise float over the window's text).
 */
export function heartCovered(
  state: Pick<StudioState, "open" | "rects" | "expanded" | "heartCentre">,
): boolean {
  if (WINDOW_IDS.some((id) => state.open[id] && state.expanded[id])) {
    return true;
  }
  const centre = state.heartCentre;
  if (!centre) {
    return false;
  }
  return WINDOW_IDS.some((id) => {
    const rect = state.rects[id];
    return (
      state.open[id] &&
      rect.x < centre.x + HEART_CORE &&
      rect.x + rect.w > centre.x - HEART_CORE &&
      rect.y < centre.y + HEART_CORE &&
      rect.y + rect.h > centre.y - HEART_CORE
    );
  });
}
