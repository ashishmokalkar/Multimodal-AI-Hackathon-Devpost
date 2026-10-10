import { describe, expect, it } from "vitest";
import { predictionStatusCopy } from "./predictionStatus";

describe("prediction status guidance", () => {
  it("distinguishes initial, manual, auto-update, pending, invalid, and failed states", () => {
    expect(predictionStatusCopy("initial")?.message).toContain(
      "select Predict",
    );
    expect(predictionStatusCopy("edited")?.message).toContain(
      "previous values are not retained",
    );
    expect(predictionStatusCopy("auto-updating")?.message).toContain(
      "500 ms debounce",
    );
    expect(predictionStatusCopy("pending")?.message).toContain(
      "Previous probabilities and explanations are cleared",
    );
    expect(predictionStatusCopy("invalid")?.role).toBe("alert");
    expect(
      predictionStatusCopy("error", "Network unavailable")?.message,
    ).toContain("Network unavailable");
    expect(predictionStatusCopy("ready")).toBeNull();
  });
});
