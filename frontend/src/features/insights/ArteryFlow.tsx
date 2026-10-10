import { useId, useState } from "react";
import type { Target } from "../../api/types";
import { targetColor } from "../../lib/colorScale";
import { formatProbability } from "../../lib/format";
import {
  FLOW_ARTERIES,
  formatPoints,
  LOWER_COLOR,
  RAISE_COLOR,
  type ArteryFlow as ArteryFlowData,
  type ArteryId,
  type InsightTarget,
} from "../../lib/insights";
import { useUiStore } from "../../store/uiStore";

interface ArteryFlowProps {
  flow: ArteryFlowData;
  arteries: Record<ArteryId, Target>;
  selected: InsightTarget;
  activeFactor: string | null;
  onHoverFactor: (feature: string | null) => void;
  onSelectTarget: (target: InsightTarget) => void;
}

// Geometry (SVG user units; the chart scales to the panel width).
const W = 360;
const TOP = 22;
const LABEL_R = 124;
const FACTOR_X = 130;
const FACTOR_W = 5;
const X0 = FACTOR_X + FACTOR_W;
const ARTERY_X = 288;
const ARTERY_W = 9;
const X1 = ARTERY_X;
const ARTERY_LABEL_X = ARTERY_X + ARTERY_W + 8;
/** Fixed scale (not normalised per patient), so a low-risk patient honestly shows thin links. */
const PX_PER_POINT = 0.42;
const MIN_LINK_PX = 1.5;
const MAX_LINK_PX = 26;
const MIN_POINTS = 0.5;
const STACK_GAP = 1.5;
const SLOT_MIN = 32;
const SLOT_GAP = 6;
const ARTERY_SLOT_MIN = 34;
const OTHER = "__other";
const OTHER_COLOR = "#adb5bd";

interface Link {
  item: string;
  artery: ArteryId;
  points: number;
  width: number;
  color: string;
  sy: number;
  ty: number;
}

interface Item {
  key: string;
  label: string;
  sub: string;
  y: number;
  height: number;
  barY: number;
  barH: number;
  links: Link[];
  describe: string;
}

const widthFor = (points: number) =>
  Math.abs(points) < MIN_POINTS
    ? 0
    : Math.min(
        MAX_LINK_PX,
        Math.max(MIN_LINK_PX, Math.abs(points) * PX_PER_POINT),
      );

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

function ribbon(link: Link) {
  const xm = (X0 + X1) / 2;
  const { sy, ty, width } = link;
  return `M${X0},${sy} C${xm},${sy} ${xm},${ty} ${X1},${ty} L${X1},${ty + width} C${xm},${ty + width} ${xm},${sy + width} ${X0},${sy + width} Z`;
}

function layout(flow: ArteryFlowData) {
  const sources = [
    ...flow.factors.map((factor) => ({
      key: factor.feature,
      label: factor.label,
      sub: factor.valueText,
      points: factor.links,
      widths: factor.links,
      grey: false,
    })),
    ...(flow.other
      ? [
          {
            key: OTHER,
            label: `${flow.other.count} other factors`,
            sub: "combined",
            points: flow.other.links,
            widths: flow.other.links,
            grey: true,
          },
        ]
      : []),
  ];

  // Left column: one slot per factor, links stacked in artery order to keep crossings low.
  let cursor = TOP;
  const items: Item[] = sources.map((source) => {
    const links: Link[] = FLOW_ARTERIES.filter(
      (artery) => widthFor(source.widths[artery]) > 0,
    ).map((artery) => ({
      item: source.key,
      artery,
      points: source.points[artery],
      width: widthFor(source.widths[artery]),
      color: source.grey
        ? OTHER_COLOR
        : source.points[artery] >= 0
          ? RAISE_COLOR
          : LOWER_COLOR,
      sy: 0,
      ty: 0,
    }));
    const stack =
      links.reduce((sum, link) => sum + link.width, 0) +
      STACK_GAP * Math.max(0, links.length - 1);
    const height = Math.max(SLOT_MIN, stack + 8);
    let y = cursor + (height - stack) / 2;
    for (const link of links) {
      link.sy = y;
      y += link.width + STACK_GAP;
    }
    const item: Item = {
      key: source.key,
      label: source.label,
      sub: source.sub,
      y: cursor,
      height,
      barY: cursor + (height - stack) / 2,
      barH: Math.max(2, stack),
      links,
      describe: `${source.label}${source.grey ? "" : `, ${source.sub}`}: ${FLOW_ARTERIES.map(
        (artery) => `${artery} ${formatPoints(source.points[artery], 0)}`,
      ).join(", ")}`,
    };
    cursor += height + SLOT_GAP;
    return item;
  });
  const leftHeight = Math.max(0, cursor - SLOT_GAP - TOP);

  // Right column: arteries spread over the same height; incoming links stacked in factor order.
  const incoming = FLOW_ARTERIES.map((artery) =>
    items.flatMap((item) =>
      item.links.filter((link) => link.artery === artery),
    ),
  );
  const stacks = incoming.map(
    (links) =>
      links.reduce((sum, link) => sum + link.width, 0) +
      STACK_GAP * Math.max(0, links.length - 1),
  );
  const slots = stacks.map((stack) => Math.max(ARTERY_SLOT_MIN, stack + 8));
  const rightHeight = slots.reduce((sum, slot) => sum + slot, 0) + SLOT_GAP * 2;
  const bodyHeight = Math.max(leftHeight, rightHeight);
  const spare = (bodyHeight - slots.reduce((sum, slot) => sum + slot, 0)) / 2;
  let arteryCursor = TOP;
  const arteries = FLOW_ARTERIES.map((artery, index) => {
    const y = arteryCursor;
    const barY = y + (slots[index] - stacks[index]) / 2;
    let linkY = barY;
    for (const link of incoming[index]) {
      link.ty = linkY;
      linkY += link.width + STACK_GAP;
    }
    arteryCursor += slots[index] + spare;
    return {
      artery,
      y,
      height: slots[index],
      barY,
      barH: Math.max(4, stacks[index]),
    };
  });

  return { items, arteries, height: TOP + bodyHeight + 6 };
}

/**
 * Factor -> artery flow: the top factors on the left, the three arteries on the right, ribbons sized by how many
 * percentage points each factor moves each artery (magenta raises, blue lowers). Linked to the 3D heart both ways.
 */
export function ArteryFlow({
  flow,
  arteries,
  selected,
  activeFactor,
  onHoverFactor,
  onSelectTarget,
}: ArteryFlowProps) {
  const clipId = useId();
  const hoveredVessel = useUiStore((state) => state.hoveredVessel);
  const setHoveredVessel = useUiStore((state) => state.setHoveredVessel);
  const [localItem, setLocalItem] = useState<string | null>(null);
  const { items, arteries: nodes, height } = layout(flow);
  const activeItem = localItem ?? activeFactor;
  const activeArtery = activeItem ? null : hoveredVessel;
  const focus = activeItem !== null || activeArtery !== null;

  if (flow.factors.length === 0) {
    return (
      <p
        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
        role="status"
      >
        Every input equals the typical patient&apos;s value, so no factor moves
        the artery estimates.
      </p>
    );
  }

  const enterItem = (key: string) => {
    setLocalItem(key);
    onHoverFactor(key === OTHER ? null : key);
  };
  const leaveItem = () => {
    setLocalItem(null);
    onHoverFactor(null);
  };
  const linkOpacity = (link: Link) => {
    if (!focus) {
      return 0.5;
    }
    const on = activeItem
      ? link.item === activeItem
      : link.artery === activeArtery;
    return on ? 0.88 : 0.07;
  };
  const allLinks = items.flatMap((item) => item.links);

  return (
    <div className="artery-flow">
      <svg
        aria-label={`Top factors and how much each moves LAD, LCX and RCA. ${items.map((item) => item.describe).join(". ")}.`}
        className="w-full"
        role="img"
        viewBox={`0 0 ${W} ${height}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              className="artery-flow-reveal"
              height={height}
              width={W}
              x={0}
              y={0}
            />
          </clipPath>
        </defs>
        <text
          className="fill-slate-400 text-[8.5px] font-bold tracking-wider"
          textAnchor="end"
          x={LABEL_R}
          y={10}
        >
          TOP FACTORS
        </text>
        <text
          className="fill-slate-400 text-[8.5px] font-bold tracking-wider"
          x={ARTERY_X - 2}
          y={10}
        >
          ARTERIES
        </text>

        <g clipPath={`url(#${clipId})`}>
          {allLinks.map((link) => (
            <path
              className="artery-flow-link"
              d={ribbon(link)}
              fill={link.color}
              fillOpacity={linkOpacity(link)}
              key={`${link.item}-${link.artery}`}
              onMouseEnter={() => enterItem(link.item)}
              onMouseLeave={leaveItem}
            >
              <title>{`${items.find((item) => item.key === link.item)?.label} → ${link.artery}: ${formatPoints(link.points)}`}</title>
            </path>
          ))}
        </g>

        {/* point values on the focused links, at the end that is not being hovered */}
        {focus &&
          allLinks
            .filter((link) =>
              activeItem
                ? link.item === activeItem
                : link.artery === activeArtery,
            )
            .map((link) => (
              <text
                className="artery-flow-value"
                fill={link.color === OTHER_COLOR ? "#475569" : link.color}
                key={`v-${link.item}-${link.artery}`}
                textAnchor={activeItem ? "end" : "start"}
                x={activeItem ? X1 - 5 : X0 + 5}
                y={(activeItem ? link.ty : link.sy) + link.width / 2 + 3.5}
              >
                {formatPoints(link.points, 0).replace(" pts", "")}
              </text>
            ))}

        {items.map((item, index) => {
          const dim =
            focus &&
            (activeItem
              ? item.key !== activeItem
              : !item.links.some((l) => l.artery === activeArtery));
          return (
            <g
              aria-label={item.describe}
              className="artery-flow-factor"
              key={item.key}
              opacity={dim ? 0.4 : 1}
              role="button"
              style={{ animationDelay: `${index * 60}ms` }}
              tabIndex={0}
              onBlur={leaveItem}
              onFocus={() => enterItem(item.key)}
              onMouseEnter={() => enterItem(item.key)}
              onMouseLeave={leaveItem}
            >
              <rect
                fill="transparent"
                height={item.height}
                width={X0}
                x={0}
                y={item.y}
              />
              <text
                className={`text-[10.5px] font-semibold ${item.key === OTHER ? "fill-slate-500" : "fill-slate-800"}`}
                textAnchor="end"
                x={LABEL_R}
                y={item.y + item.height / 2 - 1}
              >
                {clip(item.label, 22)}
              </text>
              <text
                className="fill-slate-500 text-[9px]"
                textAnchor="end"
                x={LABEL_R}
                y={item.y + item.height / 2 + 10}
              >
                {clip(item.sub, 24)}
              </text>
              <rect
                fill={item.key === OTHER ? OTHER_COLOR : "#334155"}
                height={item.barH}
                rx={2}
                width={FACTOR_W}
                x={FACTOR_X}
                y={item.barY}
              />
            </g>
          );
        })}

        {nodes.map((node) => {
          const target = arteries[node.artery];
          const isSelected = selected === node.artery;
          const dim =
            focus &&
            (activeArtery
              ? activeArtery !== node.artery
              : !allLinks.some(
                  (l) => l.item === activeItem && l.artery === node.artery,
                ));
          return (
            <g
              aria-label={`${node.artery} ${formatProbability(target.probability)}. Select ${node.artery}.`}
              aria-pressed={isSelected}
              className="artery-flow-node"
              key={node.artery}
              opacity={dim ? 0.4 : 1}
              role="button"
              tabIndex={0}
              onBlur={() => setHoveredVessel(null)}
              onClick={() => onSelectTarget(isSelected ? "cad" : node.artery)}
              onFocus={() => setHoveredVessel(node.artery)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTarget(isSelected ? "cad" : node.artery);
                }
              }}
              onMouseEnter={() => setHoveredVessel(node.artery)}
              onMouseLeave={() => setHoveredVessel(null)}
            >
              <rect
                fill="transparent"
                height={node.height}
                width={W - ARTERY_X + 4}
                x={ARTERY_X - 4}
                y={node.y}
              />
              <rect
                fill={targetColor(node.artery)}
                height={node.barH}
                rx={3}
                stroke={isSelected ? "#0f172a" : "none"}
                strokeWidth={isSelected ? 1.5 : 0}
                width={ARTERY_W}
                x={ARTERY_X}
                y={node.barY}
              />
              <text
                className="fill-slate-900 text-[11px] font-bold"
                x={ARTERY_LABEL_X}
                y={node.y + node.height / 2 - 1}
              >
                {node.artery}
              </text>
              <text
                className="fill-slate-600 text-[10px] font-semibold tabular-nums"
                x={ARTERY_LABEL_X}
                y={node.y + node.height / 2 + 10}
              >
                {Math.round(target.probability * 100)}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <i
              className="artery-flow-swatch"
              style={{ background: RAISE_COLOR }}
            />{" "}
            raises
          </span>
          <span className="inline-flex items-center gap-1">
            <i
              className="artery-flow-swatch"
              style={{ background: LOWER_COLOR }}
            />{" "}
            lowers
          </span>
          <span>thickness = points</span>
        </span>
        <span>
          Top {flow.factors.length} explain {Math.round(flow.coverage * 100)}%
          of all movement
        </span>
      </div>
    </div>
  );
}
