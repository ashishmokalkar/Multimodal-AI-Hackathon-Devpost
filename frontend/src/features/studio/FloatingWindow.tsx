import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { IconExpand, IconMinus, IconShrink } from "./icons";
import { useCompact } from "./useCompact";
import { clampRect, MIN_WINDOW_SIZE, type Rect, type WindowId } from "./studioModel";
import { useStudioStore } from "./studioStore";

type Edge = "move" | "e" | "s" | "w" | "se" | "sw";
const EDGES: Exclude<Edge, "move">[] = ["e", "s", "w", "se", "sw"];

interface FloatingWindowProps {
  id: WindowId;
  title: string;
  icon: ReactNode;
  /** Small accent line under the title bar (an artery colour, for example). */
  accent?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Lets keyboard users scroll a window whose content has nothing focusable (WCAG 2.1.1). */
  focusableBody?: boolean;
}

/**
 * A glass window floating over the 3D heart: drag the title bar to move it, drag an edge or corner to resize it,
 * double-click the title to expand it, and hide it to the dock.
 */
export function FloatingWindow({
  id,
  title,
  icon,
  accent,
  actions,
  children,
  focusableBody = false,
}: FloatingWindowProps) {
  const rect = useStudioStore((state) => state.rects[id]);
  const open = useStudioStore((state) => state.open[id]);
  const layer = useStudioStore((state) => state.order.indexOf(id));
  const isTop = useStudioStore(
    (state) => state.order[state.order.length - 1] === id,
  );
  const moveWindow = useStudioStore((state) => state.moveWindow);
  const anchorWindow = useStudioStore((state) => state.anchorWindow);
  const raiseWindow = useStudioStore((state) => state.raiseWindow);
  const closeWindow = useStudioStore((state) => state.closeWindow);
  const compact = useCompact();
  const drag = useRef<{
    edge: Edge;
    startX: number;
    startY: number;
    rect: Rect;
  } | null>(null);
  // where Restore returns to: a fixed rect, or "layout" for a window that was on the default layout
  const restore = useRef<Rect | "layout" | null>(null);
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!open) {
    return null;
  }

  const begin = (event: ReactPointerEvent<HTMLElement>) => {
    const edge = (event.currentTarget.dataset.edge ?? "move") as Edge;
    if (compact || event.button !== 0) {
      return;
    }
    if (
      edge === "move" &&
      (event.target as HTMLElement).closest("button, input, select, a")
    ) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      rect,
    };
    restore.current = null;
    setActive(true);
    raiseWindow(id);
  };

  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) {
      return;
    }
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const start = current.rect;
    const min = MIN_WINDOW_SIZE[id];
    let next: Rect = { ...start };
    if (current.edge === "move") {
      next = { ...start, x: start.x + dx, y: start.y + dy };
    } else {
      if (current.edge.includes("e")) {
        next.w = Math.max(min.w, start.w + dx);
      }
      if (current.edge.includes("s")) {
        next.h = Math.max(min.h, start.h + dy);
      }
      if (current.edge.includes("w")) {
        const w = Math.max(min.w, start.w - dx);
        next = { ...next, x: start.x + (start.w - w), w };
      }
    }
    moveWindow(id, clampRect(next, window.innerWidth, window.innerHeight, min));
  };

  const end = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
    setActive(false);
  };

  const toggleExpand = () => {
    if (compact) {
      return;
    }
    if (restore.current) {
      if (restore.current === "layout") {
        anchorWindow(id);
      } else {
        moveWindow(id, restore.current);
      }
      restore.current = null;
      setExpanded(false);
      return;
    }
    restore.current = useStudioStore.getState().anchored[id] ? "layout" : rect;
    setExpanded(true);
    const w = Math.min(window.innerWidth - 80, Math.max(rect.w, 860));
    const h = Math.min(window.innerHeight - 120, Math.max(rect.h, 600));
    moveWindow(id, {
      x: Math.round((window.innerWidth - w) / 2),
      y: Math.round(64 + (window.innerHeight - 64 - h) / 2),
      w,
      h,
    });
    raiseWindow(id);
  };

  /** Keyboard alternative to dragging: arrows move the window, Shift+arrows resize it. */
  const onArrange = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.altKey ? 4 : 24;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move || compact) {
      return;
    }
    event.preventDefault();
    const min = MIN_WINDOW_SIZE[id];
    const next = event.shiftKey
      ? { ...rect, w: Math.max(min.w, rect.w + move[0]), h: Math.max(min.h, rect.h + move[1]) }
      : { ...rect, x: rect.x + move[0], y: rect.y + move[1] };
    restore.current = null;
    setExpanded(false);
    raiseWindow(id);
    moveWindow(id, clampRect(next, window.innerWidth, window.innerHeight, min));
  };

  const style = compact
    ? undefined
    : {
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex: 20 + layer,
      };

  return (
    <section
      aria-label={title}
      className={`sw${isTop ? " is-top" : ""}${active ? " is-dragging" : ""}${compact ? " is-compact" : ""}`}
      data-window={id}
      onPointerDownCapture={() => raiseWindow(id)}
      style={style}
    >
      <header
        className="sw-head"
        onDoubleClick={toggleExpand}
        onPointerCancel={end}
        data-edge="move"
        onPointerDown={begin}
        onPointerMove={onMove}
        onPointerUp={end}
        title={compact ? undefined : "Drag to move · double-click to expand"}
      >
        <span className="sw-icon">{icon}</span>
        <h2>{title}</h2>
        <div className="sw-actions">
          {actions}
          {!compact && (
            <button
              aria-describedby="sw-arrange-hint"
              aria-label={`${expanded ? "Restore" : "Expand"} ${title}`}
              className="sw-btn"
              onClick={toggleExpand}
              onKeyDown={onArrange}
              title={`${expanded ? "Restore" : "Expand"} · arrow keys move, Shift+arrows resize`}
              type="button"
            >
              {expanded ? <IconShrink size={13} /> : <IconExpand size={13} />}
            </button>
          )}
          <button
            aria-label={`Hide ${title}`}
            className="sw-btn"
            onClick={() => closeWindow(id)}
            type="button"
          >
            <IconMinus size={14} />
          </button>
        </div>
      </header>
      {accent && <div className="sw-accent" style={{ background: accent }} />}
      <div className="sw-body" tabIndex={focusableBody ? 0 : undefined}>
        {children}
      </div>
      {!compact &&
        EDGES.map((edge) => (
          <div
            aria-hidden="true"
            className={`sw-resize sw-resize-${edge}`}
            key={edge}
            onPointerCancel={end}
            data-edge={edge}
            onPointerDown={begin}
            onPointerMove={onMove}
            onPointerUp={end}
          />
        ))}
    </section>
  );
}
