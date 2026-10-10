import { useState } from "react";
import type { MeasurementGroup } from "../../lib/insights";
import { ATTENTION_POINTS, attributionColor, formatPoints } from "../../lib/insights";

interface MeasurementCardsProps {
  groups: MeasurementGroup[];
  targetLabel: string;
  activeFactor: string | null;
  onHoverFactor: (feature: string | null) => void;
}

const GROUP_ICONS: Record<string, string> = {
  Demographics: "👤",
  "Symptoms/Exam": "🩺",
  ECG: "📈",
  Lab: "🧪",
  Echo: "🫀",
};

/**
 * Physiological breakdown: each measurement with its value, typical adult reference range, an out-of-range flag
 * and how much it moves the selected target's estimate.
 */
export function MeasurementCards({ groups, targetLabel, activeFactor, onHoverFactor }: MeasurementCardsProps) {
  const [attentionOnly, setAttentionOnly] = useState(true);
  const visible = groups
    .map((group) => ({
      ...group,
      cards: attentionOnly ? group.cards.filter((card) => card.attention) : group.cards,
    }))
    .filter((group) => group.cards.length > 0);
  const flagged = groups.reduce((n, g) => n + g.cards.filter((c) => c.attention).length, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] leading-4 text-slate-600">
          Chips show how much each value moves the <strong>{targetLabel}</strong> estimate.
        </p>
        <button
          aria-pressed={attentionOnly}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
            attentionOnly
              ? "border-amber-400 bg-amber-100 text-amber-950"
              : "border-slate-300 bg-white text-slate-700"
          }`}
          type="button"
          onClick={() => setAttentionOnly((value) => !value)}
        >
          {attentionOnly ? `Needs attention (${flagged})` : "Showing all inputs"}
        </button>
      </div>
      {visible.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600" role="status">
          No value is outside its typical range or moves the estimate by {ATTENTION_POINTS} points or more.
        </p>
      )}
      {visible.map((group) => (
        <section aria-label={group.group} key={group.group}>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span aria-hidden="true">{GROUP_ICONS[group.group] ?? "•"}</span>
            {group.group}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {group.cards.map((card, index) => {
              const color = attributionColor(card.points);
              const dimmed = activeFactor !== null && activeFactor !== card.feature;
              return (
                <article
                  className={`insight-card ${card.attention ? "insight-card-attention" : ""} ${
                    dimmed ? "opacity-40" : ""
                  }`}
                  key={card.feature}
                  style={{ animationDelay: `${index * 35}ms` }}
                  tabIndex={0}
                  title={card.description}
                  onBlur={() => onHoverFactor(null)}
                  onFocus={() => onHoverFactor(card.feature)}
                  onMouseEnter={() => onHoverFactor(card.feature)}
                  onMouseLeave={() => onHoverFactor(null)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="text-[10.5px] font-semibold leading-4 text-slate-700">{card.label}</h5>
                    {card.status && card.status !== "normal" && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                        {card.status === "high" ? "▲ High" : "▼ Low"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[15px] font-bold tabular-nums text-slate-900">{card.valueText}</p>
                  {card.bar && (
                    <div aria-hidden="true" className="insight-range mt-1.5">
                      <span
                        className="insight-range-band"
                        style={{ left: `${card.bar.bandStart}%`, width: `${Math.max(1, card.bar.bandEnd - card.bar.bandStart)}%` }}
                      />
                      <span
                        className={`insight-range-marker ${card.status !== "normal" ? "insight-range-marker-out" : ""}`}
                        style={{ left: `${Math.min(100, Math.max(0, card.bar.marker))}%` }}
                      />
                    </div>
                  )}
                  {card.rangeText && (
                    <p className="mt-1 text-[9.5px] text-slate-500">Typical range {card.rangeText}</p>
                  )}
                  <p className="mt-1.5">
                    {card.sameAsReference ? (
                      <span className="text-[9.5px] text-slate-400">Same as typical patient · 0 pts</span>
                    ) : (
                      <span
                        className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white"
                        style={{ backgroundColor: color }}
                      >
                        {formatPoints(card.points)}
                      </span>
                    )}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-[10px] leading-4 text-slate-500">
        Typical ranges are common adult reference intervals; laboratories differ. A value can be in range and still
        move the estimate, and the reverse.
      </p>
    </div>
  );
}
