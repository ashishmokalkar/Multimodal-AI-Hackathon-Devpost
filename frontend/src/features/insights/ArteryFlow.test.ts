import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ArteryFlow as ArteryFlowData } from "../../lib/insights";
import { ArteryFlow } from "./ArteryFlow";

const target = (probability: number) => ({
  probability,
  label: "x",
  threshold: 0.5,
  uncertain: false,
});
const flow: ArteryFlowData = {
  factors: [
    {
      feature: "Chest Pain",
      label: "Chest pain type",
      valueText: "Typical",
      links: { LAD: 58, LCX: 51, RCA: 21 },
      total: 130,
    },
    {
      feature: "Region RWMA",
      label: "Regional wall-motion abnormality",
      valueText: "2",
      links: { LAD: 11, LCX: 0, RCA: 0.2 },
      total: 11.2,
    },
    {
      feature: "EF-TTE",
      label: "Ejection fraction",
      valueText: "45%",
      links: { LAD: -6, LCX: -1, RCA: 0 },
      total: 7,
    },
  ],
  other: { count: 12, links: { LAD: 2, LCX: -1, RCA: 3 } },
  coverage: 0.81,
};

function render(factors = flow.factors) {
  return renderToStaticMarkup(
    createElement(ArteryFlow, {
      flow: { ...flow, factors },
      arteries: { LAD: target(0.91), LCX: target(0.76), RCA: target(0.46) },
      selected: "LAD",
      activeFactor: null,
      onHoverFactor: () => undefined,
      onSelectTarget: () => undefined,
    }),
  );
}

describe("ArteryFlow", () => {
  it("draws one ribbon per meaningful factor-artery link, coloured by direction", () => {
    const markup = render();

    // chest pain 3 + wall motion 1 (0.2 pts is dropped) + ejection fraction 2 + other 3
    expect(markup.match(/class="artery-flow-link"/g)).toHaveLength(9);
    expect(markup).toContain('fill="#c2255c"');
    expect(markup).toContain('fill="#1971c2"');
    expect(markup).toContain("12 other factors");
    expect(markup).toContain("Top 3 explain 81% of all movement");
  });

  it("labels arteries with their probability and exposes accessible factor summaries", () => {
    const markup = render();

    expect(markup).toContain("91%");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(
      "Chest pain type, Typical: LAD +58 pts, LCX +51 pts, RCA +21 pts",
    );
    expect(markup).toContain("Regional wall-motion…");
  });

  it("explains an empty flow instead of drawing nothing", () => {
    expect(render([])).toContain("no factor moves the artery estimates");
  });
});
