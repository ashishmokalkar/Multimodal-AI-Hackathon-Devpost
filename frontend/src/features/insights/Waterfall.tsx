import type { Waterfall as WaterfallData } from "../../lib/insights";
import {
  attributionColor,
  formatPoints,
  NEUTRAL_COLOR,
} from "../../lib/insights";
import { targetColor, type TargetId } from "../../lib/colorScale";

interface WaterfallProps {
  data: WaterfallData;
  targetLabel: string;
  /** Target shown ("cad" or an artery), for the final bar's colour. */
  targetId?: TargetId;
  activeFactor: string | null;
  onHoverFactor: (feature: string | null) => void;
}

const WIDTH = 360;
const LABEL_W = 132;
const CHART_L = LABEL_W + 6;
const CHART_R = WIDTH - 44;
const ROW_H = 30;
const TOP = 26;

interface Row {
  kind: "base" | "step" | "other" | "final";
  key: string;
  label: string;
  sub: string;
  start: number;
  end: number;
  points: number;
}

const x = (percent: number) =>
  CHART_L + (Math.min(100, Math.max(0, percent)) / 100) * (CHART_R - CHART_L);

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Additive waterfall from the reference ("typical") patient to this patient. Every bar starts where the previous
 * one ended, so the chart visibly adds up to the probability the model returned.
 */
export function Waterfall({
  data,
  targetLabel,
  targetId = "cad",
  activeFactor,
  onHoverFactor,
}: WaterfallProps) {
  const rows: Row[] = [
    {
      kind: "base",
      key: "__base",
      label: "Typical patient",
      sub: "reference",
      start: 0,
      end: data.basePercent,
      points: 0,
    },
    ...data.steps.map((step): Row => ({
      kind: "step",
      key: step.feature,
      label: step.label,
      sub: step.valueText,
      start: step.start,
      end: step.end,
      points: step.points,
    })),
    ...(data.other
      ? [
          {
            kind: "other" as const,
            points: data.other.points,
            key: "__other",
            label: `${data.other.count} other factors`,
            sub: "combined",
            start: data.other.start,
            end: data.other.end,
          },
        ]
      : []),
    {
      kind: "final",
      key: "__final",
      label: `This patient · ${targetLabel}`,
      sub: "model estimate",
      start: 0,
      end: data.finalPercent,
      points: 0,
    },
  ];
  const height = TOP + rows.length * ROW_H + 26;

  return (
    <svg
      aria-label={`Waterfall: typical patient ${data.basePercent.toFixed(0)}% to this patient ${data.finalPercent.toFixed(0)}% for ${targetLabel}.`}
      className="insight-waterfall w-full"
      role="img"
      viewBox={`0 0 ${WIDTH} ${height}`}
    >
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line
            className="stroke-slate-200"
            x1={x(tick)}
            x2={x(tick)}
            y1={TOP - 6}
            y2={height - 22}
          />
          <text
            className="fill-slate-400 text-[9px]"
            textAnchor="middle"
            x={x(tick)}
            y={height - 8}
          >
            {tick}%
          </text>
        </g>
      ))}
      <line
        className="stroke-slate-700"
        strokeDasharray="4 3"
        strokeWidth={1.2}
        x1={x(data.thresholdPercent)}
        x2={x(data.thresholdPercent)}
        y1={TOP - 12}
        y2={height - 22}
      />
      <text
        className="fill-slate-700 text-[9px] font-semibold"
        textAnchor="middle"
        x={x(data.thresholdPercent)}
        y={TOP - 15}
      >
        threshold {data.thresholdPercent.toFixed(0)}%
      </text>

      {rows.map((row, index) => {
        const y = TOP + index * ROW_H;
        const left = Math.min(x(row.start), x(row.end));
        const width = Math.max(2, Math.abs(x(row.end) - x(row.start)));
        const isFactor = row.kind === "step";
        const points = row.points;
        const fill =
          row.kind === "base"
            ? NEUTRAL_COLOR
            : row.kind === "final"
              ? targetColor(targetId)
              : attributionColor(points);
        const dimmed =
          activeFactor !== null && isFactor && activeFactor !== row.key;
        const next = rows[index + 1];
        return (
          <g
            className={`insight-waterfall-row ${isFactor ? "cursor-pointer" : ""}`}
            key={row.key}
            opacity={dimmed ? 0.35 : 1}
            style={{ animationDelay: `${index * 55}ms` }}
            tabIndex={isFactor ? 0 : undefined}
            onBlur={isFactor ? () => onHoverFactor(null) : undefined}
            onFocus={isFactor ? () => onHoverFactor(row.key) : undefined}
            onMouseEnter={isFactor ? () => onHoverFactor(row.key) : undefined}
            onMouseLeave={isFactor ? () => onHoverFactor(null) : undefined}
          >
            {/* full-row hit area: SVG groups only receive pointer events over painted shapes */}
            <rect
              className={
                isFactor && activeFactor === row.key ? "fill-slate-100" : ""
              }
              fill={
                isFactor && activeFactor === row.key ? undefined : "transparent"
              }
              height={ROW_H - 2}
              rx={6}
              width={WIDTH}
              x={0}
              y={y - 2}
            />
            <text
              className={`text-[10.5px] ${row.kind === "final" ? "fill-slate-900 font-bold" : "fill-slate-800 font-semibold"}`}
              x={4}
              y={y + 11}
            >
              {clip(row.label, 24)}
            </text>
            <text className="fill-slate-500 text-[9px]" x={4} y={y + 22}>
              {clip(row.sub, 28)}
            </text>
            <rect
              className="insight-waterfall-bar"
              fill={fill}
              height={16}
              rx={4}
              width={width}
              x={left}
              y={y + 5}
            />
            {next && next.kind !== "final" && (
              <line
                className="stroke-slate-400"
                strokeDasharray="2 2"
                x1={x(row.end)}
                x2={x(row.end)}
                y1={y + 21}
                y2={y + ROW_H + 5}
              />
            )}
            <text
              className="text-[10px] font-bold tabular-nums"
              fill={
                row.kind === "base" || row.kind === "final" ? "#1f2937" : fill
              }
              x={Math.min(WIDTH - 2, Math.max(left + width, x(row.start)) + 4)}
              y={y + 17}
            >
              {row.kind === "base" || row.kind === "final"
                ? `${row.end.toFixed(0)}%`
                : formatPoints(points, Math.abs(points) < 1 ? 1 : 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
