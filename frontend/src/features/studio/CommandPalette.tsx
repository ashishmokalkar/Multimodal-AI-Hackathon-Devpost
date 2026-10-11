import { useEffect, useMemo, useRef, useState } from "react";
import { useFeatures, useSamples } from "../../api/hooks";
import { usePatientStore } from "../../store/patientStore";
import { useUiStore } from "../../store/uiStore";
import { vesselIds, type VesselId } from "../viewer/vesselMap";
import { IconSearch } from "./icons";
import { WINDOW_TITLES } from "./windowTitles";
import { WINDOW_IDS } from "./studioModel";
import { STUDIO_THEMES, THEME_LABEL, useStudioStore } from "./studioStore";

interface Command {
  id: string;
  group: string;
  label: string;
  keywords?: string;
  run: () => void;
}

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

function useCommands(): Command[] {
  const features = useFeatures().data;
  const samples = useSamples().data;
  return useMemo(() => {
    const studio = useStudioStore.getState;
    const list: Command[] = [
      {
        id: "overview",
        group: "View",
        label: "Overview",
        keywords: "reset camera home whole heart",
        run: () => focusVessel(null),
      },
      ...vesselIds.map((vessel) => ({
        id: `focus-${vessel}`,
        group: "View",
        label: `Fly to ${vessel}`,
        keywords: "focus artery vessel",
        run: () => focusVessel(vessel),
      })),
      {
        id: "solid",
        group: "View",
        label: "Solid heart",
        run: () => studio().setDepth(0),
      },
      {
        id: "xray",
        group: "View",
        label: "X-ray heart",
        keywords: "transparent see through",
        run: () => studio().setDepth(0.5),
      },
      {
        id: "isolate",
        group: "View",
        label: "Arteries only",
        keywords: "isolate hide heart",
        run: () => studio().setDepth(1),
      },
      {
        id: "beat",
        group: "View",
        label: "Toggle heartbeat",
        keywords: "pulse animation",
        run: () => studio().toggle("beat"),
      },
      {
        id: "flow",
        group: "View",
        label: "Toggle blood flow",
        keywords: "particles animation",
        run: () => studio().toggle("flow"),
      },
      {
        id: "rotate",
        group: "View",
        label: "Toggle auto-rotate",
        keywords: "spin turntable",
        run: () => studio().toggle("autoRotate"),
      },
      {
        id: "tour",
        group: "Guide",
        label: "Start guided tour",
        keywords: "walkthrough demo story",
        run: () => studio().startTour(),
      },
      ...WINDOW_IDS.filter((id) => id !== "vessel").map((id) => ({
        id: `window-${id}`,
        group: "Windows",
        label: `Show ${WINDOW_TITLES[id]}`,
        keywords: "open panel window",
        run: () => studio().openWindow(id),
      })),
      {
        id: "layout",
        group: "Windows",
        label: "Reset window layout",
        keywords: "arrange tidy",
        run: () => studio().resetLayout(),
      },
      ...STUDIO_THEMES.map((theme) => ({
        id: `theme-${theme}`,
        group: "Theme",
        label: `${THEME_LABEL[theme]} theme`,
        keywords: "colour color dark light",
        run: () => studio().setTheme(theme),
      })),
      {
        id: "classic",
        group: "Theme",
        label: "Switch to Classic layout",
        keywords: "old original simple",
        run: () => useUiStore.getState().setUiVersion("classic"),
      },
      ...(samples ?? []).map((sample) => ({
        id: `sample-${sample.id}`,
        group: "Patients",
        label: sample.label.replace("Dataset patient", "Patient"),
        keywords: "load sample",
        run: () => usePatientStore.getState().setFromSample(sample),
      })),
      ...(features ?? []).map((feature) => ({
        id: `factor-${feature.name}`,
        group: "Show input on heart",
        label: feature.label,
        keywords: `${feature.name} ${feature.group} factor`,
        run: () => {
          studio().setPinnedFactor(feature.name);
          useUiStore.getState().setHoveredFactor(feature.name);
          studio().openWindow("factors");
        },
      })),
    ];
    return list;
  }, [features, samples]);
}

/** Ctrl/Cmd+K: type "LCX", "LDL", "x-ray" or a patient number to jump straight there. */
export function CommandPalette() {
  const open = useStudioStore((state) => state.paletteOpen);
  // mounted only while open, so every opening starts with an empty search
  return open ? <PaletteDialog /> : null;
}

function PaletteDialog() {
  const setOpen = useStudioStore((state) => state.setPaletteOpen);
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/s+/).filter(Boolean);
    const matches = tokens.length
      ? commands.filter((command) => {
          const text =
            `${command.label} ${command.keywords ?? ""} ${command.group}`.toLowerCase();
          return tokens.every((token) => text.includes(token));
        })
      : commands.filter((command) => command.group !== "Show input on heart");
    return matches.slice(0, 40).map((command, index, list) => ({
      command,
      header:
        index === 0 || list[index - 1].group !== command.group
          ? command.group
          : null,
    }));
  }, [commands, query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (command: Command | undefined) => {
    if (!command) {
      return;
    }
    setOpen(false);
    command.run();
  };

  return (
    <div className="palette-backdrop" onPointerDown={() => setOpen(false)}>
      <div
        aria-label="Command bar"
        aria-modal="true"
        className="palette"
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="palette-input">
          <IconSearch size={17} />
          <input
            aria-activedescendant={
              results[active] ? `cmd-${results[active].command.id}` : undefined
            }
            aria-controls="palette-list"
            aria-expanded="true"
            aria-label="Search commands"
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(results.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                run(results[active]?.command);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            placeholder="Fly to LCX, show LDL, x-ray, patient 159…"
            role="combobox"
            value={query}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" id="palette-list" ref={listRef} role="listbox">
          {results.map(({ command, header }, index) => (
            <li key={command.id} role="presentation">
              {header && <p className="palette-group">{header}</p>}
              <button
                aria-selected={index === active}
                className="palette-item"
                data-index={index}
                id={`cmd-${command.id}`}
                onClick={() => run(command)}
                onPointerMove={() => setActive(index)}
                role="option"
                tabIndex={-1}
                type="button"
              >
                {command.label}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="palette-empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
