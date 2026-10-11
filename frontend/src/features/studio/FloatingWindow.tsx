import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { IconMinus } from "./icons";
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
}: FloatingWindowProps) {
  const rect = useStudioStore((state) => state.rects[id]);
  const open = useStudioStore((state) => state.open[id]);
  const layer = useStudioStore((state) => state.order.indexOf(id));
  const isTop = useStudioStore(
    (state) => state.order[state.order.length - 1] === id,
  );
  const moveWindow = useStudioStore((state) => state.moveWindow);
  const raiseWindow = useStudioStore((state) => state.raiseWindow);
  const closeWindow = useStudioStore((state) => state.closeWindow);
  const compact = useCompact();
  const drag = useRef<{
    edge: Edge;
    startX: number;
    startY: number;
    rect: Rect;
  } | null>(null);
  const restore = useRef<Rect | null>(null);
  const [active, setActive] = useState(false);

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
      moveWindow(id, restore.current);
      restore.current = null;
      return;
    }
    restore.current = rect;
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
      <div className="sw-body">{children}</div>
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
