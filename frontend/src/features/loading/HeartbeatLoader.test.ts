import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isAwaitingPrediction } from "../../store/patientStore";
import { HeartbeatLoader } from "./HeartbeatLoader";

describe("isAwaitingPrediction", () => {
  const base = { prediction: null, isPredicting: false, predictionStatus: "initial" as const };

  it("is true only while a prediction is scheduled or in flight and none is shown", () => {
    expect(isAwaitingPrediction({ ...base, predictionStatus: "auto-updating" })).toBe(true);
    expect(isAwaitingPrediction({ ...base, isPredicting: true, predictionStatus: "pending" })).toBe(true);
    for (const status of ["initial", "edited", "invalid", "error"] as const) {
      expect(isAwaitingPrediction({ ...base, predictionStatus: status })).toBe(false);
    }
  });
});

describe("HeartbeatLoader", () => {
  it("announces the wait and the first real processing step", () => {
    const markup = renderToStaticMarkup(createElement(HeartbeatLoader, { title: "Reading the arteries", variant: "stage" }));
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Reading the arteries");
    expect(markup).toContain("Checking the patient&#x27;s inputs");
    expect(markup.match(/hb-branch/g)).toHaveLength(3);         // LAD, LCX, RCA
  });

  it("renders a compact inline trace", () => {
    const markup = renderToStaticMarkup(createElement(HeartbeatLoader, { variant: "inline", steps: ["Updating scenario"] }));
    expect(markup).toContain("hb-inline");
    expect(markup).toContain("Updating scenario");
  });
});
