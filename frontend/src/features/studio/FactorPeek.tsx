import { createPortal } from "react-dom";
import type { FeatureDefinition, PredictionResponse } from "../../api/types";
import { targetColor } from "../../lib/colorScale";
import type { InsightTarget } from "../../lib/insights";
import { factorBreakdown } from "./studioModel";

/** Where the hovered reason sits on screen, and the Studio root the card is drawn into (outside the window's clip). */
export interface PeekAnchor {
  feature: string;
  rect: { top: number; left: number; bottom: number; height: number };
  root: HTMLElement;
}

const CARD_WIDTH = 236;
const GAP = 14;

function pointsText(points: number): string {
  const size = Math.abs(Math.round(points));
  return `${points > 0 ? "+" : "−"}${size} ${size === 1 ? "pt" : "pts"}`;
}

/**
 * A small card beside a reason in the Why window, with an arrow pointing at it: what this one input does to the
 * overall chance and to each artery, in points from a typical patient. It is the text version of the highlight on
 * the heart, where arteries it moves by under a point are hidden.
 */
export function FactorPeek({
  anchor,
  prediction,
  features,
  current,
}: {
  anchor: PeekAnchor;
  prediction: PredictionResponse;
  features: readonly FeatureDefinition[];
  current: InsightTarget;
}) {
  const breakdown = factorBreakdown(prediction, features, anchor.feature);
  const largest = Math.max(1, ...breakdown.items.map((item) => Math.abs(item.points)));
  // to the left of the row; below it when the window sits too close to the left edge (narrow screens)
  const beside = anchor.rect.left >= CARD_WIDTH + GAP + 8;
  const style = beside
    ? {
        top: Math.round(anchor.rect.top + anchor.rect.height / 2),
        left: Math.round(anchor.rect.left - GAP - CARD_WIDTH),
      }
    : { top: Math.round(anchor.rect.bottom + GAP), left: Math.round(anchor.rect.left) };
  const hidden = breakdown.items.filter((item) => !item.moves && item.target !== "cad");

  return createPortal(
    <div
      aria-hidden="true"
      className={`factor-peek ${beside ? "is-beside" : "is-below"}`}
      style={{ ...style, width: CARD_WIDTH }}
    >
      <p className="factor-peek-title">
        <b>{breakdown.label}</b>
        {breakdown.valueText && <span>{breakdown.valueText}</span>}
      </p>
      <ul className="factor-peek-items">
        {breakdown.items.map((item) => (
          <li
            className={`${item.target === current ? "is-current" : ""}${item.moves ? "" : " is-none"}`}
            key={item.target}
          >
            <span className="factor-peek-name">
              <i style={{ backgroundColor: targetColor(item.target) }} />
              {item.target === "cad" ? "Overall" : item.target}
            </span>
            <span className="factor-peek-track">
              {item.moves && (
                <i
                  className={item.points > 0 ? "sl-raise" : "sl-lower"}
                  style={{ width: `${(Math.abs(item.points) / largest) * 100}%` }}
                />
              )}
            </span>
            <b className={item.moves ? (item.points > 0 ? "sl-raise" : "sl-lower") : undefined}>
              {item.moves ? pointsText(item.points) : "< 1 pt"}
            </b>
          </li>
        ))}
      </ul>
      <p className="factor-peek-note">
        Points vs a typical patient
        {hidden.length > 0 && ` · ${hidden.map((item) => item.target).join(", ")} hidden on the heart`}
      </p>
    </div>,
    anchor.root,
  );
}
