import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

const evidenceDir = path.resolve("docs/evidence");
const captureNames = [
  "s4p2-patient20-cad-why-1920x1080.png",
  "s4p2-model-metrics-detail-1920x1080.png",
  "s4p2-selected-lad-why-1920x1080.png",
  "s4p2-patient20-edited-fresh-1920x1080.png",
  "s4p2-warning-patient20-1920x1080-closed.png",
  "s4p2-warning-patient20-1920x1080-open.png",
  "s4p2-warning-patient20-1280x800-closed.png",
  "s4p2-warning-patient20-1280x800-open.png",
  "s4p2-empty-warning-1920x1080.png",
  "s4p2-empty-warning-1280x800.png",
];
const measurementPath = path.join(evidenceDir, "s4p2-release-measurements.json");
const textPath = path.join(evidenceDir, "s4p2-live-verification.txt");
for (const name of [...captureNames, path.basename(measurementPath), path.basename(textPath)]) {
  if (fs.existsSync(path.join(evidenceDir, name))) {
    throw new Error(`Refusing to overwrite existing evidence: ${name}`);
  }
}

const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = targets.find(
  (target) => target.type === "page" && target.url.includes("localhost:5173"),
);
if (!page) throw new Error("No headed Edge page is open at localhost:5173.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const networkRequests = [];
const consoleErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error
      ? request.reject(new Error(message.error.message))
      : request.resolve(message.result);
    return;
  }
  if (message.method === "Network.requestWillBeSent") {
    const { request, requestId } = message.params;
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/predict"
    ) {
      let body = null;
      try {
        body = JSON.parse(request.postData ?? "null");
      } catch {
        body = { invalidJson: request.postData ?? null };
      }
      networkRequests.push({
        requestId,
        body,
        status: null,
        error: null,
      });
    }
  } else if (message.method === "Network.responseReceived") {
    const request = networkRequests.find(
      (item) => item.requestId === message.params.requestId,
    );
    if (request) request.status = message.params.response.status;
  } else if (message.method === "Network.loadingFailed") {
    const request = networkRequests.find(
      (item) => item.requestId === message.params.requestId,
    );
    if (request) request.error = message.params.errorText;
  } else if (
    message.method === "Runtime.consoleAPICalled" &&
    message.params.type === "error"
  ) {
    consoleErrors.push(
      message.params.args
        .map((argument) => argument.value ?? argument.description ?? "")
        .join(" "),
    );
  } else if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text);
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text,
    );
  }
  return response.result?.value;
}

async function waitFor(expression, predicate, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await evaluate(expression);
    if (predicate(value)) return value;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for page readiness: ${expression}`);
}

async function clickElement(selector, text = null) {
  const rect = await evaluate(`(() => {
    const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})];
    const element = candidates.find((candidate) =>
      ${text === null ? "true" : `candidate.textContent.trim() === ${JSON.stringify(text)}`}
    );
    if (!element) return null;
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
      width: bounds.width, height: bounds.height };
  })()`);
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    throw new Error(`Visible browser control not found: ${selector} ${text ?? ""}`);
  }
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: rect.x,
    y: rect.y,
    button: "none",
    buttons: 0,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: rect.x,
    y: rect.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: rect.x,
    y: rect.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function pressKey(key, code, keyCode, text = undefined) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    ...(text ? { text, unmodifiedText: text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function pressTab() {
  await pressKey("Tab", "Tab", 9, "\t");
}

async function pressEnter() {
  await pressKey("Enter", "Enter", 13, "\r");
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(
    "JSON.stringify({width: innerWidth, height: innerHeight, dpr: devicePixelRatio})",
    (value) => {
      const viewport = JSON.parse(value);
      return viewport.width === width &&
        viewport.height === height &&
        Math.abs(viewport.dpr - 1) < 0.01;
    },
  );
  await sleep(450);
}

async function settleLayout() {
  await sleep(500);
}

async function snapshot() {
  return JSON.parse(
    await evaluate(`JSON.stringify((() => {
      const canvas = document.querySelector(".viewer-stage canvas");
      const canvasRect = canvas?.getBoundingClientRect();
      const root = document.documentElement;
      const results = document.querySelector(".results-panel");
      const resultsBody = results?.querySelector(".panel-body");
      const bodyRect = resultsBody?.getBoundingClientRect();
      const resultsText = results?.innerText ?? "";
      const warningDetails = results?.querySelector(".response-warning-disclosure");
      const warningStatus = results?.querySelector(".response-warning-status");
      const source = results?.querySelector(".scenario-provenance")?.innerText
        .replaceAll(String.fromCharCode(10), " ").trim() ?? null;
      const cards = [...(results?.querySelectorAll(".probability-readout") ?? [])];
      const marker = document.querySelector("[data-threshold-marker]");
      const markerRect = marker?.getBoundingClientRect();
      const markerTrack = marker?.parentElement?.getBoundingClientRect();
      const chart = results?.querySelector('[aria-labelledby="why-heading"] [aria-hidden="true"]');
      const chartRect = chart?.getBoundingClientRect();
      const bars = [...(chart?.querySelectorAll(".recharts-bar-rectangle") ?? [])];
      const labels = [...(chart?.querySelectorAll(".recharts-cartesian-axis-tick-value") ?? [])]
        .filter((label) => label.textContent.trim() &&
          !Number.isFinite(Number(label.textContent.trim())));
      const chartRows = bars.map((bar) => {
        const barRect = bar.getBoundingClientRect();
        const matchedLabel = labels.map((label) => {
          const labelRect = label.getBoundingClientRect();
          const labelY = labelRect.top + labelRect.height / 2;
          const barY = barRect.top + barRect.height / 2;
          return {
            label,
            labelRect,
            distance: Math.abs(labelY - barY),
          };
        }).sort((left, right) => left.distance - right.distance)[0];
        if (!matchedLabel || matchedLabel.distance > 20) return null;
        const { labelRect } = matchedLabel;
        const insideBody = bodyRect &&
          barRect.top >= bodyRect.top && barRect.bottom <= bodyRect.bottom &&
          labelRect.top >= bodyRect.top && labelRect.bottom <= bodyRect.bottom;
        const insideChart = chartRect &&
          barRect.top >= chartRect.top && barRect.bottom <= chartRect.bottom &&
          labelRect.top >= chartRect.top && labelRect.bottom <= chartRect.bottom;
        return {
          feature: matchedLabel.label.textContent.trim(),
          barBounds: {
            top: barRect.top, bottom: barRect.bottom,
            left: barRect.left, right: barRect.right,
          },
          labelBounds: {
            top: labelRect.top, bottom: labelRect.bottom,
            left: labelRect.left, right: labelRect.right,
          },
          complete: Boolean(
            insideBody && insideChart && barRect.width > 0 && barRect.height > 0 &&
            labelRect.width > 0 && labelRect.height > 0
          ),
        };
      });
      const viewerText = document.querySelector(".viewer-panel")?.innerText ?? "";
      const details = results?.querySelector(".contribution-method-details");
      const whyButton = [...(results?.querySelectorAll(".result-view-toggle button") ?? [])]
        .find((button) => button.textContent.trim() === "Why?");
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        document: {
          width: root.clientWidth, height: root.clientHeight,
          scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight,
          overflowX: root.scrollWidth - root.clientWidth,
          overflowY: root.scrollHeight - root.clientHeight
        },
        canvas: canvasRect ? {
          x: canvasRect.x, y: canvasRect.y, width: canvasRect.width,
          height: canvasRect.height, pixelWidth: canvas.width, pixelHeight: canvas.height
        } : null,
        sampleId: document.querySelector("#sample-patient")?.value ?? null,
        profile: document.querySelector(".model-version")?.innerText
          .replaceAll(String.fromCharCode(10), " ").trim() ?? null,
        source,
        probabilityCards: cards.map((card) =>
          card.innerText.replaceAll(String.fromCharCode(10), " ").trim()
        ),
        warningStatus: warningDetails?.querySelector("summary")?.innerText.trim()
          ?? warningStatus?.innerText.trim() ?? null,
        warningText: warningDetails?.innerText.trim()
          ?? warningStatus?.innerText.trim() ?? null,
        warningDisclosureOpen: warningDetails?.open ?? null,
        selectedTarget: viewerText.split(String.fromCharCode(10))
          .find((line) => line.startsWith("Selected target:")) ?? null,
        selectedVesselLabel: [...document.querySelectorAll(".viewer-panel *")]
          .find((item) => item.childElementCount === 0 &&
            /^Selected: (LAD|LCX|RCA) · /.test(item.textContent.trim()))
          ?.textContent.trim() ?? null,
        thresholdMarker: marker && markerRect && markerTrack ? {
          left: getComputedStyle(marker).left,
          positionPercent: markerTrack.width
            ? Number(((markerRect.left + markerRect.width / 2 - markerTrack.left) /
                markerTrack.width * 100).toFixed(3)) : null,
          text: document.querySelector(".viewer-legend")?.innerText
            .split(String.fromCharCode(10))
            .find((line) => line.includes("decision threshold")) ?? null
        } : null,
        predictionSourceText: source,
        resultsScrollTop: resultsBody?.scrollTop ?? null,
        whyActive: whyButton?.getAttribute("aria-pressed") === "true",
        methodDisclosureOpen: details?.open ?? null,
        visibleChartRows: chartRows.filter((row) => row.complete),
        completeVisibleChartRows: chartRows.filter((row) => row.complete).length,
        totalChartBars: bars.length,
        noPredictionReadouts: cards.length === 0,
        noWarningDisclosure: !warningDetails,
        resultTextStart: resultsText.slice(0, 800)
      };
    })())`),
  );
}

async function capture(name) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const bytes = Buffer.from(result.data, "base64");
  const file = path.join(evidenceDir, name);
  fs.writeFileSync(file, bytes);
  return {
    file: `docs/evidence/${name}`,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function decodePng(base64) {
  const bytes = Buffer.from(base64, "base64");
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const imageData = [];
  for (let offset = 8; offset < bytes.length; ) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      imageData.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!width || !height || bitDepth !== 8 || !channels) {
    throw new Error(`Unsupported screenshot PNG: ${width}x${height}, ${bitDepth}, ${colorType}`);
  }
  const stride = width * channels;
  const encoded = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(stride * height);
  const paeth = (left, up, upperLeft) => {
    const base = left + up - upperLeft;
    const dl = Math.abs(base - left);
    const du = Math.abs(base - up);
    const dul = Math.abs(base - upperLeft);
    return dl <= du && dl <= dul ? left : du <= dul ? up : upperLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * (stride + 1);
    const rowStart = y * stride;
    const filter = encoded[sourceStart];
    for (let index = 0; index < stride; index += 1) {
      const raw = encoded[sourceStart + 1 + index];
      const left = index >= channels ? pixels[rowStart + index - channels] : 0;
      const up = y > 0 ? pixels[rowStart - stride + index] : 0;
      const upperLeft =
        y > 0 && index >= channels ? pixels[rowStart - stride + index - channels] : 0;
      const predictor =
        filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up :
          filter === 3 ? Math.floor((left + up) / 2) :
            filter === 4 ? paeth(left, up, upperLeft) : null;
      if (predictor === null) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowStart + index] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

function compareImages(left, right) {
  if (left.width !== right.width || left.height !== right.height) {
    return { changedPixels: null, changedFraction: 1, changedBounds: null };
  }
  let changedPixels = 0;
  let minX = left.width;
  let minY = left.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const a = (y * left.width + x) * left.channels;
      const b = (y * right.width + x) * right.channels;
      const difference =
        Math.abs(left.pixels[a] - right.pixels[b]) +
        Math.abs(left.pixels[a + 1] - right.pixels[b + 1]) +
        Math.abs(left.pixels[a + 2] - right.pixels[b + 2]);
      if (difference > 24) {
        changedPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    changedPixels,
    changedFraction: changedPixels / (left.width * left.height),
    changedBounds: maxX >= 0
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null,
  };
}

async function canvasImage() {
  const clip = await evaluate(`(() => {
    const rect = document.querySelector(".viewer-stage canvas").getBoundingClientRect();
    return { x: Math.floor(rect.x), y: Math.floor(rect.y),
      width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
  })()`);
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    clip: { ...clip, scale: 1 },
  });
  return decodePng(result.data);
}

async function selectVesselCard(targetName) {
  const found = await evaluate(`(() => {
    const button = [...document.querySelectorAll(".probability-readout")]
      .find((item) => item.getAttribute("aria-label")?.startsWith(
        ${JSON.stringify(`Select ${targetName}.`)}
      ));
    if (!button) return false;
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2,
      width: rect.width, height: rect.height };
  })()`);
  if (!found) throw new Error(`Probability card not found: ${targetName}`);
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved", x: found.x, y: found.y, button: "none", buttons: 0,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed", x: found.x, y: found.y, button: "left", buttons: 1, clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: found.x, y: found.y, button: "left", buttons: 0, clickCount: 1,
  });
}

async function captureState(name) {
  console.log(`Waiting for settled layout before ${name}`);
  await evaluate(
    `(() => { const body = document.querySelector(".results-panel .panel-body"); if (body) body.scrollTop = 0; return true; })()`,
  );
  await settleLayout();
  const resultsScrollTopBeforeCapture = await evaluate(
    `document.querySelector(".results-panel .panel-body")?.scrollTop ?? null`,
  );
  const screenshot = await capture(name);
  const measurement = await snapshot();
  measurement.resultsScrollTopAfterCapture = measurement.resultsScrollTop;
  measurement.resultsScrollTopBeforeCapture = resultsScrollTopBeforeCapture;
  measurement.resultsScrollTop = resultsScrollTopBeforeCapture;
  measurement.screenshot = screenshot;
  console.log(
    `Saved ${name}: ${measurement.viewport.width}x${measurement.viewport.height}, canvas ${measurement.canvas?.height ?? "unavailable"} CSS px, visible chart rows ${measurement.completeVisibleChartRows}`,
  );
  return measurement;
}

async function focusWarningSummaryFromCad() {
  await selectVesselCard("CAD");
  const traversed = [];
  for (let index = 0; index < 12; index += 1) {
    await pressTab();
    const active = await evaluate(`(() => {
      const item = document.activeElement;
      return { tag: item?.tagName ?? null,
        text: item?.textContent?.trim().replaceAll(String.fromCharCode(10), " ") ?? "",
        isWarningSummary: item?.matches(".response-warning-disclosure summary") ?? false };
    })()`);
    traversed.push(active);
    if (active.isWarningSummary) return traversed;
  }
  return traversed;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await setViewport(1920, 1080);
await waitFor(
  `document.querySelector(".model-version")?.innerText ?? ""`,
  (value) => value.includes("Real v1.1.0") && value.includes("cardiotwin-v2.0.0"),
);
await waitFor(
  `document.querySelector("#sample-patient")?.options.length ?? 0`,
  (value) => value >= 2,
);
await waitFor(
  `document.querySelector(".acknowledge-button")?.textContent.trim() ?? "dismissed"`,
  (value) => value.includes("Acknowledge") || value === "dismissed",
);
if (await evaluate("Boolean(document.querySelector('.disclaimer-modal'))")) {
  await clickElement("button", "Acknowledge and continue");
}
console.log("App profile and dataset are ready in the real API profile.");
const initialSampleId = await evaluate(
  `document.querySelector("#sample-patient")?.value ?? ""`,
);
if (initialSampleId !== "patient-20") {
  await clickElement("#sample-patient");
  await pressKey("Home", "Home", 36);
  await pressKey("ArrowDown", "ArrowDown", 40);
  await pressEnter();
}
await waitFor(
  `document.querySelector("#sample-patient")?.value ?? ""`,
  (value) => value === "patient-20",
);
await waitFor(
  `document.querySelectorAll(".probability-readout").length`,
  (value) => value === 4,
);
await waitFor(
  `document.querySelector(".response-warning-disclosure")?.innerText ?? ""`,
  (value) => value.includes("Model warnings"),
);
await waitFor(
  `document.querySelector(".scenario-provenance")?.innerText ?? ""`,
  (value) => value.includes("Original dataset sample") &&
    value.includes("Dataset patient 20"),
);
console.log("Patient 20 prediction accepted and CAD selected.");
await clickElement(".result-view-toggle button", "Why?");
await waitFor(
  `document.querySelector(".result-view-toggle button[aria-pressed='true']")?.textContent.trim() ?? ""`,
  (value) => value === "Why?",
);
await selectVesselCard("CAD");
await waitFor(
  `document.querySelector(".viewer-panel [aria-live='polite']")?.innerText ?? ""`,
  (value) => value.includes("Selected target: CAD"),
);
const evidence = {
  capturedAtUtc: new Date().toISOString(),
  browser: "Headed Microsoft Edge controlled through DevTools Protocol; DPR 1",
  apiProfile: "Real v1.1.0, cardiotwin-v2.0.0 (health mock=false)",
  captures: {},
  keyboard: {},
  selection: {},
  editedSampleFlow: {},
  emptyWarning: {},
  requests: networkRequests,
  consoleErrors,
};
evidence.captures.patient20CadWhy = await captureState(
  "s4p2-patient20-cad-why-1920x1080.png",
);
await clickElement("button", "Model metrics");
await waitFor(
  `document.querySelector(".metrics-drawer")?.innerText ?? ""`,
  (value) => value.includes("Each target has its own decision threshold") &&
    value.includes("each served vessel probability is capped"),
);
evidence.modelDetailText = await evaluate(
  `document.querySelector(".metrics-drawer")?.innerText ?? ""`,
);
evidence.captures.modelMetricsDetail = await capture(
  "s4p2-model-metrics-detail-1920x1080.png",
);
await clickElement("button", "Close");
await waitFor("Boolean(document.querySelector('.metrics-drawer'))", (value) => !value);

const canvasBeforeSelection = await canvasImage();
await selectVesselCard("LAD");
await waitFor(
  `document.body.innerText.includes("Selected: LAD · Left anterior descending")`,
  Boolean,
);
await sleep(300);
const canvasAfterSelection = await canvasImage();
evidence.selection.cameraImageDifference = compareImages(
  canvasBeforeSelection,
  canvasAfterSelection,
);
evidence.selection.selectedLadVisible = (
  await snapshot()
).selectedVesselLabel;
evidence.selection.cameraCanvasCssBounds = (
  await snapshot()
).canvas;
await clickElement(".result-view-toggle button", "Why?");
evidence.captures.selectedLadWhy = await captureState(
  "s4p2-selected-lad-why-1920x1080.png",
);

const symptomsButton = await evaluate(`(() => [...document.querySelectorAll(".patient-panel button")]
  .find((item) => item.textContent.trim().startsWith("Symptoms/Exam"))
  ?.textContent.trim() ?? "")()`);
if (symptomsButton && symptomsButton.endsWith("+")) {
  await clickElement(".patient-panel button", symptomsButton);
}
await waitFor("Boolean(document.getElementById('feature-Chest Pain'))", Boolean);
const beforeEdit = await evaluate(`(() => {
  const input = document.getElementById("feature-Chest Pain");
  return { value: input.value, options: [...input.options].map((item) => item.value) };
})()`);
await clickElement('[id="feature-Chest Pain"]');
if (beforeEdit.value === "None") {
  await pressKey("ArrowDown", "ArrowDown", 40);
} else {
  await pressKey("Home", "Home", 36);
}
await pressEnter();
const editedValue = await waitFor(
  `document.getElementById("feature-Chest Pain")?.value ?? ""`,
  (value) => value !== beforeEdit.value,
  5_000,
);
await sleep(100);
evidence.editedSampleFlow.immediateClear = await snapshot();
evidence.editedSampleFlow.input = {
  name: "Chest Pain",
  before: beforeEdit.value,
  after: editedValue,
  options: beforeEdit.options,
};
const requestDeadline = Date.now() + 20_000;
let acceptedEditRequest;
while (Date.now() < requestDeadline) {
  acceptedEditRequest = [...networkRequests]
    .reverse()
    .find((request) =>
      request.body?.sample_id === "patient-20" &&
      request.body?.features?.["Chest Pain"] === editedValue &&
      request.status === 200
    );
  if (acceptedEditRequest) break;
  await sleep(150);
}
if (!acceptedEditRequest) {
  throw new Error("No successful fresh prediction retained patient-20 sample origin.");
}
await waitFor(
  `document.querySelector(".scenario-provenance")?.innerText ?? ""`,
  (value) => value.includes("Edited dataset sample"),
);
await waitFor(
  `document.querySelectorAll(".probability-readout").length`,
  (value) => value === 4,
);
await selectVesselCard("CAD");
evidence.editedSampleFlow.request = acceptedEditRequest;
evidence.editedSampleFlow.freshPrediction = await snapshot();
evidence.captures.editedFresh = await captureState(
  "s4p2-patient20-edited-fresh-1920x1080.png",
);

await setViewport(1920, 1080);
await waitFor(
  `document.querySelector(".response-warning-disclosure")?.innerText ?? ""`,
  (value) => value.includes("Model warnings"),
);
await waitFor(
  `document.querySelector("#sample-patient")?.value ?? ""`,
  (value) => value === "patient-20",
);
evidence.captures.warning1920Closed = await captureState(
  "s4p2-warning-patient20-1920x1080-closed.png",
);
const focused1920 = await focusWarningSummaryFromCad();
evidence.keyboard.viewport1920TabPath = focused1920;
if (!focused1920.some((item) => item.isWarningSummary)) {
  await clickElement(".response-warning-disclosure summary");
  await clickElement(".response-warning-disclosure summary");
} else {
  await pressEnter();
}
evidence.keyboard.viewport1920EnterOpened = await evaluate(
  `document.querySelector(".response-warning-disclosure")?.open ?? false`,
);
evidence.captures.warning1920Open = await captureState(
  "s4p2-warning-patient20-1920x1080-open.png",
);
if (await evaluate(`document.querySelector(".response-warning-disclosure")?.open`)) {
  await pressEnter();
}

await setViewport(1280, 800);
await waitFor(
  `JSON.stringify([innerWidth, innerHeight])`,
  (value) => value === "[1280,800]",
);
evidence.captures.warning1280Closed = await captureState(
  "s4p2-warning-patient20-1280x800-closed.png",
);
const focused1280 = await focusWarningSummaryFromCad();
evidence.keyboard.viewport1280TabPath = focused1280;
if (!focused1280.some((item) => item.isWarningSummary)) {
  await clickElement(".response-warning-disclosure summary");
  await clickElement(".response-warning-disclosure summary");
} else {
  await pressKey(" ", "Space", 32, " ");
}
evidence.keyboard.viewport1280SpaceOpened = await evaluate(
  `document.querySelector(".response-warning-disclosure")?.open ?? false`,
);
evidence.captures.warning1280Open = await captureState(
  "s4p2-warning-patient20-1280x800-open.png",
);
if (await evaluate(`document.querySelector(".response-warning-disclosure")?.open`)) {
  await pressKey(" ", "Space", 32, " ");
}

await clickElement("#sample-patient");
await pressKey("Home", "Home", 36);
await pressEnter();
await waitFor(
  `document.querySelector("#sample-patient")?.value ?? "pending"`,
  (value) => value === "",
);
await waitFor(
  `document.querySelectorAll(".probability-readout").length`,
  (value) => value === 4,
);
await waitFor(
  `document.querySelector(".response-warning-status")?.innerText ?? ""`,
  (value) => value.includes("none returned; this is not clinical reassurance"),
);
await clickElement(".probability-readout", null);
await clickElement(".result-view-toggle button", "Why?");
evidence.emptyWarning.at1280 = await captureState(
  "s4p2-empty-warning-1280x800.png",
);
await setViewport(1920, 1080);
evidence.emptyWarning.at1920 = await captureState(
  "s4p2-empty-warning-1920x1080.png",
);
evidence.emptyWarning.freshCustomRequest = [...networkRequests]
  .reverse()
  .find((request) => request.status === 200 && request.body?.sample_id == null);
evidence.emptyWarning.status =
  "Response warnings: none returned; this is not clinical reassurance.";
evidence.requests = networkRequests;

fs.writeFileSync(measurementPath, JSON.stringify(evidence, null, 2) + "\n");
const warningClosed1920 = evidence.captures.warning1920Closed.canvas?.height;
const warningOpen1920 = evidence.captures.warning1920Open.canvas?.height;
const warningClosed1280 = evidence.captures.warning1280Closed.canvas?.height;
const warningOpen1280 = evidence.captures.warning1280Open.canvas?.height;
const summary = [
  "Sprint 4 Phase 2 headed real-profile verification",
  `Captured UTC: ${evidence.capturedAtUtc}`,
  `Profile: ${evidence.apiProfile}`,
  `Patient 20 source: ${evidence.captures.patient20CadWhy.source}`,
  `Prediction cards: ${evidence.captures.patient20CadWhy.probabilityCards.join(" | ")}`,
  `LAD selection: ${evidence.selection.selectedLadVisible}`,
  `Camera canvas image difference after result selection: ${JSON.stringify(evidence.selection.cameraImageDifference)}`,
  `Edited Chest Pain: ${beforeEdit.value} -> ${editedValue}; request sample_id=${acceptedEditRequest.body.sample_id}; status=${acceptedEditRequest.status}`,
  `1280 warning canvas closed/open: ${warningClosed1280}/${warningOpen1280} CSS px; variation=${Math.abs(warningClosed1280 - warningOpen1280)} px`,
  `1920 warning canvas closed/open: ${warningClosed1920}/${warningOpen1920} CSS px; variation=${Math.abs(warningClosed1920 - warningOpen1920)} px`,
  `Keyboard summary reached by Tab at 1920/1280: ${focused1920.some((item) => item.isWarningSummary)}/${focused1280.some((item) => item.isWarningSummary)}`,
  `Warning opened by Enter/Space at 1920/1280: ${evidence.keyboard.viewport1920EnterOpened}/${evidence.keyboard.viewport1280SpaceOpened}`,
  `Custom empty-warning state: ${evidence.emptyWarning.status}`,
  `Captures and raw measurements: ${captureNames.map((name) => `docs/evidence/${name}`).join(", ")}`,
  `Measurement JSON: docs/evidence/${path.basename(measurementPath)}`,
].join("\n");
fs.writeFileSync(textPath, `${summary}\n`);
socket.close();

const failures = [];
for (const [key, size, minHeight] of [
  ["warning1920Closed", "1920x1080", 480],
  ["warning1920Open", "1920x1080", 480],
  ["warning1280Closed", "1280x800", 300],
  ["warning1280Open", "1280x800", 300],
]) {
  const measurement = evidence.captures[key];
  if (
    measurement.viewport.width !== Number(size.split("x")[0]) ||
    measurement.viewport.height !== Number(size.split("x")[1]) ||
    measurement.document.overflowX > 2 ||
    measurement.document.overflowY > 2 ||
    !measurement.source ||
    measurement.probabilityCards.length !== 4 ||
    !/^Model warnings \([1-9]\d*\)/.test(measurement.warningStatus ?? "") ||
    measurement.resultsScrollTop !== 0 ||
    measurement.canvas.height < minHeight ||
    measurement.screenshot.width !== Number(size.split("x")[0]) ||
    measurement.screenshot.height !== Number(size.split("x")[1])
  ) {
    failures.push(`${key} failed its saved viewport/content thresholds`);
  }
}
if (Math.abs(warningClosed1920 - warningOpen1920) > 2) {
  failures.push("1920x1080 closed/open canvas variation exceeds 2 CSS px");
}
if (Math.abs(warningClosed1280 - warningOpen1280) > 2) {
  failures.push("1280x800 closed/open canvas variation exceeds 2 CSS px");
}
for (const key of ["at1920", "at1280"]) {
  const measurement = evidence.emptyWarning[key];
  if (
    measurement.document.overflowX > 2 ||
    measurement.document.overflowY > 2 ||
    measurement.probabilityCards.length !== 4 ||
    !measurement.warningStatus?.includes("none returned") ||
    !measurement.source ||
    measurement.resultsScrollTop !== 0
  ) {
    failures.push(`${key} empty-warning evidence is incomplete`);
  }
}
if (!evidence.captures.patient20CadWhy.completeVisibleChartRows ||
  evidence.captures.warning1280Closed.completeVisibleChartRows < 3) {
  failures.push("1280 Phase 1 chart-row evidence must still show at least three rows");
}
if (
  !evidence.captures.warning1280Open.warningText.includes(
    "Validated accuracy is lower for patients aged 65 or over",
  )
) {
  failures.push("Full patient-20 warning text is not present in the open disclosure evidence");
}
if (
  !evidence.modelDetailText.includes("Each target has its own decision threshold") ||
  !evidence.modelDetailText.includes("each served vessel probability is capped") ||
  !evidence.modelDetailText.includes("equal values alone do not show")
) {
  failures.push("Metrics drawer does not explain independent thresholds and the served cap with qualifications");
}
if (!evidence.selection.selectedLadVisible) {
  failures.push("Persistent selected-vessel label was not visible");
}
if (evidence.selection.cameraImageDifference.changedFraction > 0.08) {
  failures.push("Canvas image suggests unexpected camera movement on selection");
}
if (
  !acceptedEditRequest ||
  acceptedEditRequest.body.sample_id !== "patient-20" ||
  evidence.editedSampleFlow.freshPrediction.sampleId !== "patient-20"
) {
  failures.push("Edited prediction did not retain the patient-20 demo-model origin");
}
if (evidence.editedSampleFlow.immediateClear.probabilityCards.length !== 0) {
  failures.push("Patient-dependent prediction cards were not immediately cleared on edit");
}
if (
  !evidence.keyboard.viewport1920EnterOpened ||
  !evidence.keyboard.viewport1280SpaceOpened
) {
  failures.push("Native warning disclosure was not opened by real browser keyboard input");
}
if (evidence.consoleErrors.length > 0) {
  failures.push(`Browser console reported errors: ${evidence.consoleErrors.join(" | ")}`);
}

console.log(summary);
if (failures.length) {
  console.error(`\nSaved evidence has acceptance failures:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
}
