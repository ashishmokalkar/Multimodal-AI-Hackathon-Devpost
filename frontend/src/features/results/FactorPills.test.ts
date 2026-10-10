import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { driverPillText, type Driver } from "../../lib/summary";
import { FactorPills } from "./FactorPills";

const driver = (
  feature: string,
  label: string,
  valueText: string,
  group: string,
  points: number,
): Driver => ({
  feature,
  label,
  valueText,
  group,
  points,
});

describe("FactorPills", () => {
  it("shows raising and lowering factors as labelled pills with group icons and points", () => {
    const markup = renderToStaticMarkup(
      createElement(FactorPills, {
        raising: [
          driver(
            "Chest Pain",
            "Chest pain type",
            "Typical",
            "Symptoms/Exam",
            46.2,
          ),
          driver("HTN", "High blood pressure", "Yes", "Demographics", 12),
        ],
        lowering: [driver("Sex", "Sex", "Female", "Demographics", -7.4)],
      }),
    );

    expect(markup).toContain("Raises risk");
    expect(markup).toContain("Lowers risk");
    expect(markup).toContain("Chest pain type · Typical");
    expect(markup).toContain("High blood pressure<");
    expect(markup).toContain("Sex · Female");
    expect(markup).toMatch(/\+(<!-- -->)?46</);
    expect(markup).toMatch(/−(<!-- -->)?7</);
    expect(markup.match(/factor-pill-icon/g)).toHaveLength(3);
    expect(markup).toContain('title="Symptom or examination"');
  });

  it("omits an empty row and says so when nothing stands out", () => {
    const onlyRaising = renderToStaticMarkup(
      createElement(FactorPills, {
        raising: [driver("DM", "Diabetes", "Yes", "Demographics", 9)],
        lowering: [],
      }),
    );
    expect(onlyRaising).not.toContain("Lowers risk");
    expect(
      renderToStaticMarkup(
        createElement(FactorPills, { raising: [], lowering: [] }),
      ),
    ).toContain("No single input moves this estimate much");
    expect(driverPillText({ label: "Diabetes", valueText: "No" })).toBe(
      "No diabetes",
    );
  });
});
