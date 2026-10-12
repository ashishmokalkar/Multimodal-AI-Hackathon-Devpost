import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApiProfile } from "../../api/hooks";
import { targetColor } from "../../lib/colorScale";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { DISCLAIMER_LINE } from "../safety/disclaimer";
import { SpeakButton } from "../speech/SpeakButton";
import { useSpokenResult } from "../speech/useSpokenResult";
import { UnitToggle } from "../units/UnitToggle";
import { vesselIds, type VesselId } from "../viewer/vesselMap";
import {
  IconBars,
  IconChart,
  IconCompare,
  IconFlask,
  IconGauge,
  IconGrid,
  IconHeart,
  IconLayout,
  IconPalette,
  IconPeople,
  IconPlay,
  IconReport,
  IconSearch,
  IconShield,
  IconSliders,
  IconTag,
  IconTarget,
  IconUser,
} from "./icons";
import { pulseRate, type WindowId } from "./studioModel";
import {
  STUDIO_THEMES,
  THEME_LABEL,
  useStudioStore,
  type StudioTheme,
} from "./studioStore";
import { WINDOW_TITLES } from "./windowTitles";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const THEME_SWATCH: Record<StudioTheme, string> = {
  midnight: "linear-gradient(135deg, #14223f, #03050b 70%, #5eead4)",
  clinical: "linear-gradient(135deg, #e3eaf2, #8fa2b8 70%, #0f766e)",
};

function focusVessel(vessel: VesselId | null) {
  useUiStore.getState().setSelectedVessel(vessel);
  const studio = useStudioStore.getState();
  studio.focus(vessel);
  if (vessel) {
    studio.openWindow("vessel");
  } else {
    studio.closeWindow("vessel");
  }
}

function ToolButton({
  label,
  pressed,
  onClick,
  children,
  style,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className="tool"
      data-tip={label}
      onClick={onClick}
      style={style}
      type="button"
    >
      {children}
    </button>
  );
}

function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const theme = useStudioStore((state) => state.theme);
  const glass = useStudioStore((state) => state.glass);
  const quality = useStudioStore((state) => state.quality);
  const setTheme = useStudioStore((state) => state.setTheme);
  const setGlass = useStudioStore((state) => state.setGlass);
  const setQuality = useStudioStore((state) => state.setQuality);
  const resetLayout = useStudioStore((state) => state.resetLayout);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        aria-expanded={open}
        aria-label="Appearance"
        className="topbar-btn"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <IconPalette size={16} />
      </button>
      {open && (
        <div className="menu-pop" role="dialog" aria-label="Appearance">
          <p className="menu-label">Theme</p>
          <div className="swatches">
            {STUDIO_THEMES.map((item) => (
              <button
                aria-pressed={theme === item}
                key={item}
                onClick={() => setTheme(item)}
                type="button"
              >
                <i style={{ background: THEME_SWATCH[item] }} />
                {THEME_LABEL[item]}
              </button>
            ))}
          </div>
          <label className="menu-label" htmlFor="studio-glass">
            Window glass <span>{Math.round((1 - glass) * 100)}% clear</span>
          </label>
          <input
            id="studio-glass"
            max={0.95}
            min={0.25}
            onChange={(event) => setGlass(Number(event.target.value))}
            step={0.05}
            type="range"
            value={glass}
          />
          <p className="menu-label">Lab units</p>
          <UnitToggle className="menu-units" />
          <p className="menu-label">3D quality</p>
          <div className="sl-segmented sl-segmented-sm" role="group" aria-label="3D quality">
            <button
              aria-pressed={quality === "high"}
              onClick={() => setQuality("high")}
              type="button"
            >
              Cinematic
            </button>
            <button
              aria-pressed={quality === "lite"}
              onClick={() => setQuality("lite")}
              type="button"
            >
              Fast
            </button>
          </div>
          <button className="btn-ghost menu-wide" onClick={resetLayout} type="button">
            <IconLayout size={14} /> Reset window layout
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const profileQuery = useApiProfile();
  const profile = profileQuery.isSuccess ? profileQuery.data : null;
  const setPaletteOpen = useStudioStore((state) => state.setPaletteOpen);
  const startTour = useStudioStore((state) => state.startTour);
  const setUiVersion = useUiStore((state) => state.setUiVersion);
  const hasPrediction = usePatientStore((state) => state.prediction !== null);
  const spoken = useSpokenResult();
  const setReportOpen = useUiStore((state) => state.setReportOpen);

  return (
    <header className="topbar">
      <button
        className="brand"
        onClick={() => useUiStore.getState().setPatientChosen(false)}
        title="Back to the patient list"
        type="button"
      >
        <span className="brand-glyph" aria-hidden="true">
          <IconHeart size={18} />
        </span>
        <span className="brand-name">
          CardioClarity <em>Studio</em>
        </span>
        <span className="sr-only">: back to the patient list</span>
      </button>
      <div className="disclaimer-chip">
        <IconShield size={14} />
        <span>{DISCLAIMER_LINE}</span>
      </div>
      <div className="topbar-right">
        <span
          className={`api-dot${profile ? " is-ok" : profileQuery.isError ? " is-bad" : ""}`}
          title={
            profile
              ? `${profile.mode === "real" ? "Real model" : "Mock model"} · ${profile.health.model_version}`
              : profileQuery.isError
                ? `API unavailable: ${profileQuery.error.message}`
                : "Checking the API"
          }
        >
          {profile ? (profile.mode === "real" ? "Live model" : "Mock") : profileQuery.isError ? "Offline" : "…"}
        </span>
        <button
          className="topbar-search"
          onClick={() => setPaletteOpen(true)}
          type="button"
        >
          <IconSearch size={14} />
          <span>Search</span>
          <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
        </button>
        <button
          className="topbar-btn topbar-tour"
          disabled={!hasPrediction}
          onClick={startTour}
          type="button"
        >
          <IconPlay size={13} />
          <span>Tour</span>
        </button>
        <SpeakButton
          className="topbar-speak"
          resultKey={spoken.resultKey}
          sentences={spoken.sentences}
        />
        <button
          className="topbar-btn topbar-report"
          disabled={!hasPrediction}
          onClick={() => setReportOpen(true)}
          title="Printable patient report (save as PDF)"
          type="button"
        >
          <IconReport size={14} />
          <span>Report</span>
        </button>
        <SettingsMenu />
        <button
          className="topbar-btn topbar-classic"
          onClick={() => setUiVersion("classic")}
          title="Switch to the Classic layout"
          type="button"
        >
          Classic
        </button>
      </div>
    </header>
  );
}

/** Camera and heart controls floating above the 3D stage. */
export function Toolbar() {
  const selected = useUiStore((state) => state.selectedVessel);
  const depth = useStudioStore((state) => state.depth);
  const setDepth = useStudioStore((state) => state.setDepth);
  const motion = useStudioStore((state) => state.motion);
  const labels = useStudioStore((state) => state.labels);
  const toggle = useStudioStore((state) => state.toggle);
  const pulse = usePatientStore((state) => Math.round(pulseRate(state.features.PR)));

  return (
    <div className="toolbar" role="toolbar" aria-label="3D view">
      <ToolButton label="Overview" onClick={() => focusVessel(null)} pressed={selected === null}>
        <IconTarget size={16} />
      </ToolButton>
      {vesselIds.map((vessel) => (
        <button
          aria-pressed={selected === vessel}
          className="tool tool-vessel"
          data-tip={`Fly to ${vessel}`}
          key={vessel}
          onClick={() => focusVessel(selected === vessel ? null : vessel)}
          style={{ ["--artery" as string]: targetColor(vessel) }}
          type="button"
        >
          <i />
          {vessel}
        </button>
      ))}
      <span className="toolbar-sep" />
      <div className="depth" data-tip="Peel the heart: solid → x-ray → arteries">
        <IconPlayLayers />
        <input
          aria-label="Heart depth: solid, x-ray, arteries only"
          aria-valuetext={depth < 0.25 ? "Solid" : depth < 0.75 ? "X-ray" : "Arteries only"}
          max={1}
          min={0}
          onChange={(event) => setDepth(Number(event.target.value))}
          step={0.01}
          type="range"
          value={depth}
        />
        <span className="depth-word">
          {depth < 0.25 ? "Solid" : depth < 0.75 ? "X-ray" : "Arteries"}
        </span>
      </div>
      <span className="toolbar-sep" />
      <ToolButton
        label={`Motion: heartbeat at ${pulse} bpm, blood flow and slow rotation`}
        onClick={() => toggle("motion")}
        pressed={motion}
      >
        <IconHeart size={15} />
        <small>{pulse}</small>
      </ToolButton>
      <ToolButton label="Labels" onClick={() => toggle("labels")} pressed={labels}>
        <IconTag size={15} />
      </ToolButton>
    </div>
  );
}

function IconPlayLayers() {
  return (
    <svg aria-hidden="true" fill="none" height="15" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" strokeDasharray="2 2" />
    </svg>
  );
}

const DOCK: { id: WindowId; icon: ReactNode }[] = [
  { id: "patient", icon: <IconUser size={18} /> },
  { id: "risk", icon: <IconGauge size={18} /> },
  { id: "drivers", icon: <IconBars size={18} /> },
  { id: "whatif", icon: <IconSliders size={18} /> },
  { id: "factors", icon: <IconGrid size={18} /> },
  { id: "people", icon: <IconPeople size={18} /> },
  { id: "compare", icon: <IconCompare size={18} /> },
  { id: "measures", icon: <IconFlask size={18} /> },
  { id: "model", icon: <IconChart size={18} /> },
];

/** Every window, one click away; a dot marks the ones on screen. */
export function Dock() {
  const open = useStudioStore((state) => state.open);
  const toggleWindow = useStudioStore((state) => state.toggleWindow);
  return (
    <nav className="dock" aria-label="Windows">
      {DOCK.map(({ id, icon }) => (
        <button
          aria-label={`${open[id] ? "Hide" : "Show"} ${WINDOW_TITLES[id]}`}
          aria-pressed={open[id]}
          className="dock-btn"
          data-tip={WINDOW_TITLES[id]}
          key={id}
          onClick={() => toggleWindow(id)}
          type="button"
        >
          {icon}
        </button>
      ))}
    </nav>
  );
}

export function Watermark() {
  return (
    <footer className="watermark">
      <span>Decision support only · not a diagnosis</span>
      <a href="/models/ATTRIBUTION.md" rel="noreferrer" target="_blank">
        Heart model: neshallads, CC BY 4.0 · schematic arteries
      </a>
    </footer>
  );
}

/** API and prediction problems, shown once at the top instead of inside every window. */
export function Toasts() {
  const profileQuery = useApiProfile();
  const error = usePatientStore((state) => state.predictionError);
  const status = usePatientStore((state) => state.predictionStatus);
  const scenarioWaiting = usePatientStore(
    (state) => state.isPredicting && state.prediction === null,
  );
  const message = profileQuery.isError
    ? `API unavailable: ${profileQuery.error.message}`
    : error
      ? `Prediction failed: ${error}`
      : status === "invalid"
        ? "Some inputs are out of range. Open Patient › Edit inputs to fix them."
        : null;

  return (
    <>
      {message && (
        <div className="toast" role="alert">
          {message}
          {profileQuery.isError && (
            <button onClick={() => void profileQuery.refetch()} type="button">
              Retry
            </button>
          )}
        </div>
      )}
      {scenarioWaiting && !message && (
        <div className="scoring" role="status">
          <span />
          Scoring
        </div>
      )}
    </>
  );
}
