import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

const evidenceDir = path.resolve("docs/evidence");
const screenshotsToCreate = [
  "s3p3-disclaimer-1920x1080.png",
  "s3p3-real-sample-cad-1920x1080.png",
  "s3p3-real-sample-lad-1920x1080.png",
  "s3p3-real-sample-inputs-lad-1920x1080.png",
  "s3p3-camera-focus-lad-1920x1080.png",
  "s3p3-real-cleared-pending-1920x1080.png",
  "s3p3-real-edited-lad-1920x1080.png",
  "s3p3-real-edited-inputs-lad-1920x1080.png",
  "s3p3-real-custom-final-models-1920x1080.png",
  "s3p3-real-error-cleared-1920x1080.png",
  "s3p3-real-recovered-1920x1080.png",
  "s3p3-real-metrics-1920x1080.png",
  "s3p3-real-metrics-lower-1920x1080.png",
  "s3p3-real-active-orbit-1920x1080.png",
  "s3p3-real-1280x800.png",
  "s3p3-real-inputs-1280x800.png",
  "s3p3-live-measurements.json",
  "s3p3-live-flow.txt",
];
for (const name of screenshotsToCreate) {
  if (fs.existsSync(path.join(evidenceDir, name))) {
    throw new Error(`Refusing to overwrite existing evidence: ${name}`);
  }
}

const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const pageTarget = targets.find(
  (target) => target.type === "page" && target.url.includes("5173"),
);
if (!pageTarget) {
  throw new Error("No Edge page target is open at the Windows frontend URL.");
}

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextCommandId = 0;
let failNextPredictionPost = false;
let fetchInterceptionEnabled = false;
const pendingCommands = new Map();
const consoleErrors = [];
const interceptedFailures = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextCommandId;
    pendingCommands.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    message.error
      ? pending.reject(new Error(message.error.message))
      : pending.resolve(message.result);
    return;
  }
  if (
    message.method === "Runtime.consoleAPICalled" &&
    message.params.type === "error"
  ) {
    consoleErrors.push(
      message.params.args
        .map((argument) => argument.value ?? argument.description ?? "")
        .join(" "),
    );
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Fetch.requestPaused" && fetchInterceptionEnabled) {
    const { requestId, request } = message.params;
    const isPredictionPost =
      request.method === "POST" &&
      new URL(request.url).pathname === "/predict";
    if (failNextPredictionPost && isPredictionPost) {
      failNextPredictionPost = false;
      interceptedFailures.push({ method: request.method, url: request.url });
      void send("Fetch.failRequest", {
        requestId,
        errorReason: "Failed",
      }).catch((error) => consoleErrors.push(String(error)));
    } else {
      void send("Fetch.continueRequest", { requestId }).catch((error) =>
        consoleErrors.push(String(error)),
      );
    }
  }
});

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

async function waitFor(expression, predicate, timeout = 12_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await evaluate(expression);
    if (predicate(value)) return value;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for page expression: ${expression}`);
}

async function clickButtonText(text) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent.trim() === ${JSON.stringify(text)});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${text}`);
}

async function focusButtonText(text) {
  const focused = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent.trim() === ${JSON.stringify(text)});
    if (!button) return false;
    button.focus();
    return true;
  })()`);
  if (!focused) throw new Error(`Button not found for keyboard activation: ${text}`);
}

async function focusButtonAriaPrefix(prefix) {
  const focused = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => (item.getAttribute("aria-label") ?? "").startsWith(${JSON.stringify(prefix)}));
    if (!button) return false;
    button.focus();
    return true;
  })()`);
  if (!focused) throw new Error(`Accessible button not found for keyboard activation: ${prefix}`);
}

async function pointerClickSelector(selector) {
  const rect = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
      width: bounds.width, height: bounds.height };
  })()`);
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    throw new Error(`Element is not visible: ${selector}`);
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

async function pressKey(key, code, shift = false) {
  const keyCode =
    key === "Enter" ? 13 : key === "Escape" ? 27 : key === " " ? 32 : 9;
  const modifiers = shift ? 8 : 0;
  const text =
    key === "Enter" ? "\r" : key === " " ? " " : key === "Tab" ? "\t" : undefined;
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    modifiers,
    ...(text ? { text, unmodifiedText: text } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
    modifiers,
  });
}

async function pageSnapshot() {
  const value = await evaluate(`JSON.stringify((() => {
    const canvas = document.querySelector(".viewer-stage canvas");
    const canvasRect = canvas?.getBoundingClientRect();
    const results = document.querySelector(".results-panel");
    const resultsBody = document.querySelector(".results-panel .panel-body");
    const bodyRect = resultsBody?.getBoundingClientRect();
    const rows = [...document.querySelectorAll(
      '.results-panel ol[aria-label$="contribution values and input values"] li'
    )];
    const chartBars = [...document.querySelectorAll(".recharts-bar-rectangle")];
    const zeroTick = [...document.querySelectorAll(".recharts-cartesian-axis-tick-value")]
      .find((item) => item.textContent.trim() === "0.00");
    const zeroLine = document.querySelector(".recharts-reference-line-line");
    const zeroTextRect = zeroTick?.getBoundingClientRect();
    const zeroLineRect = zeroLine?.getBoundingClientRect();
    const tickSizes = [...document.querySelectorAll(
      ".recharts-cartesian-axis-tick-value"
    )].map((item) => Number.parseFloat(getComputedStyle(item).fontSize));
    const predictions = [...document.querySelectorAll(".probability-readout")]
      .map((item) => item.innerText.replaceAll(String.fromCharCode(10), " ").trim());
    const source = document.querySelector(".prediction-source-badge")
      ?.innerText.replaceAll(String.fromCharCode(10), " ").trim() ?? null;
    const resultsText = results?.innerText ?? "";
    const viewerText = document.querySelector(".viewer-panel")?.innerText ?? "";
    const predictionSourceLine = resultsText.split(String.fromCharCode(10))
      .find((line) => line.startsWith("Prediction source:")) ?? null;
    const warningLine = resultsText.split(String.fromCharCode(10))
      .find((line) => line.startsWith("Model warnings")) ?? null;
    const selectedTargetLine = viewerText.split(String.fromCharCode(10))
      .find((line) => line.startsWith("Selected target:")) ?? null;
    const viewButtons = [...document.querySelectorAll(".result-view-toggle button")];
    return {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      document: { width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight },
      root: (() => {
        const root = document.querySelector("#root");
        const bounds = root.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height,
          scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight };
      })(),
      canvas: canvasRect ? { x: canvasRect.x, y: canvasRect.y,
        width: canvasRect.width, height: canvasRect.height,
        pixelWidth: canvas.width, pixelHeight: canvas.height } : null,
      sampleId: document.querySelector("#sample-patient")?.value ?? null,
      profile: document.querySelector(".model-version")
        ?.innerText.replaceAll(String.fromCharCode(10), " ").trim() ?? null,
      predictions,
      source,
      editedScenario: resultsText.includes("Edited dataset-sample scenario"),
      predictionSource: predictionSourceLine?.replace("Prediction source: ", "") ?? null,
      warnings: warningLine,
      selectedTarget: selectedTargetLine,
      view: viewButtons.find((item) => item.getAttribute("aria-pressed") === "true")
        ?.textContent.trim() ?? null,
      probabilityReadoutCount: predictions.length,
      unavailableVessels: (viewerText.match(/Unavailable/g) ?? []).length,
      visibleContributionRows: rows.filter((item) => {
        const bounds = item.getBoundingClientRect();
        return bodyRect && bounds.top >= bodyRect.top && bounds.bottom <= bodyRect.bottom;
      }).length,
      totalContributionRows: rows.length,
      visibleChartBars: chartBars.filter((item) => {
        const bounds = item.getBoundingClientRect();
        return bodyRect && bounds.width > 0 && bounds.height > 0 &&
          bounds.top >= bodyRect.top && bounds.bottom <= bodyRect.bottom;
      }).length,
      totalChartBars: chartBars.length,
      chart: {
        zeroAlignmentPx: zeroTextRect && zeroLineRect
          ? Math.abs(zeroTextRect.left + zeroTextRect.width / 2 - zeroLineRect.left)
          : null,
        minYAxisTickFontPx: tickSizes.length ? Math.min(...tickSizes) : null,
      },
      metricsDrawerOpen: Boolean(document.querySelector(".metrics-drawer")),
      resultsPanelText: resultsText,
    };
  })())`);
  return JSON.parse(value);
}

async function capture(name) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const bytes = Buffer.from(result.data, "base64");
  fs.writeFileSync(path.join(evidenceDir, name), bytes);
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
    throw new Error(
      `Unsupported screenshot PNG format: ${width}x${height}, depth ${bitDepth}, type ${colorType}`,
    );
  }
  const stride = width * channels;
  const encoded = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(stride * height);
  const paeth = (left, up, upperLeft) => {
    const base = left + up - upperLeft;
    const leftDistance = Math.abs(base - left);
    const upDistance = Math.abs(base - up);
    const upperLeftDistance = Math.abs(base - upperLeft);
    return leftDistance <= upDistance && leftDistance <= upperLeftDistance
      ? left
      : upDistance <= upperLeftDistance
        ? up
        : upperLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * (stride + 1);
    const filter = encoded[sourceStart];
    const rowStart = y * stride;
    for (let index = 0; index < stride; index += 1) {
      const raw = encoded[sourceStart + 1 + index];
      const left = index >= channels ? pixels[rowStart + index - channels] : 0;
      const up = y > 0 ? pixels[rowStart - stride + index] : 0;
      const upperLeft =
        y > 0 && index >= channels
          ? pixels[rowStart - stride + index - channels]
          : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : filter === 4
                  ? paeth(left, up, upperLeft)
                  : null;
      if (predictor === null) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowStart + index] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

function compareImages(left, right) {
  if (left.width !== right.width || left.height !== right.height) {
    return {
      width: left.width,
      height: left.height,
      changedPixels: null,
      changedFraction: 1,
      bounds: null,
    };
  }
  let changedPixels = 0;
  let minX = left.width;
  let minY = left.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const leftOffset = (y * left.width + x) * left.channels;
      const rightOffset = (y * right.width + x) * right.channels;
      const difference =
        Math.abs(left.pixels[leftOffset] - right.pixels[rightOffset]) +
        Math.abs(left.pixels[leftOffset + 1] - right.pixels[rightOffset + 1]) +
        Math.abs(left.pixels[leftOffset + 2] - right.pixels[rightOffset + 2]);
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
    width: left.width,
    height: left.height,
    changedPixels,
    changedFraction: changedPixels / (left.width * left.height),
    bounds:
      maxX >= 0
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : null,
  };
}

async function canvasImage() {
  const clip = await evaluate(`(() => {
    const bounds = document.querySelector(".viewer-stage canvas").getBoundingClientRect();
    return { x: Math.floor(bounds.x), y: Math.floor(bounds.y),
      width: Math.ceil(bounds.width), height: Math.ceil(bounds.height) };
  })()`);
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    clip: { ...clip, scale: 1 },
  });
  const bytes = Buffer.from(result.data, "base64");
  return {
    ...decodePng(result.data),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(250);
  const current = await evaluate(
    "JSON.stringify({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})",
  );
  const viewport = JSON.parse(current);
  if (
    viewport.width !== width ||
    viewport.height !== height ||
    viewport.dpr !== 1
  ) {
    throw new Error(`Viewport mismatch: ${JSON.stringify(viewport)}`);
  }
}

async function selectSample(sampleId) {
  const result = await evaluate(`(() => {
    const element = document.querySelector("#sample-patient");
    if (!element) return false;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype, "value"
    ).set;
    setter.call(element, ${JSON.stringify(sampleId)});
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  if (!result) throw new Error("Sample picker is unavailable.");
}

async function editChestPain() {
  await evaluate(`(() => {
    const group = [...document.querySelectorAll(".patient-panel button")]
      .find((item) => item.textContent.trim().startsWith("Symptoms/Exam"));
    if (group && group.getAttribute("aria-expanded") !== "true") group.click();
    return true;
  })()`);
  await waitFor(
    "Boolean(document.getElementById('feature-Chest Pain'))",
    Boolean,
    2000,
  );
  const result = await evaluate(`(() => {
    const element = document.getElementById("feature-Chest Pain");
    if (!element) return null;
    const previous = element.value;
    const next = previous === "Typical" ? "None" : "Typical";
    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype, "value"
    ).set;
    setter.call(element, next);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return { previous, next };
  })()`);
  if (!result) throw new Error("Chest Pain control is unavailable.");
  return result;
}

async function editAge() {
  await evaluate(`(() => {
    const group = [...document.querySelectorAll(".patient-panel button")]
      .find((item) => item.textContent.trim().startsWith("Demographics"));
    if (group && group.getAttribute("aria-expanded") !== "true") group.click();
    return true;
  })()`);
  await waitFor(
    "Boolean(document.getElementById('feature-Age'))",
    Boolean,
    2000,
  );
  const result = await evaluate(`(() => {
    const element = document.getElementById("feature-Age");
    if (!element) return null;
    const previous = Number(element.value);
    const next = previous >= 99 ? previous - 1 : previous + 1;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, "value"
    ).set;
    setter.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return { previous, next };
  })()`);
  if (!result) throw new Error("Age control is unavailable.");
  return result;
}

async function takeMeasurements() {
  const geometry1920 = [];
  const geometry1280 = [];
  const screenshots = {};
  const actions = {};
  try {
  await send("Page.enable");
  await send("Runtime.enable");
  await setViewport(1920, 1080);
  await evaluate(
    "localStorage.removeItem('cad-risk-visualizer-disclaimer-acknowledged')",
  );

  const fetchRecorder = `(() => {
    if (window.__s3p3FetchRecorder) return;
    const original = window.fetch.bind(window);
    window.__predictionRequests = [];
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input.url;
      const record = url.includes("/predict") ? {
        url,
        body: typeof init.body === "string" ? JSON.parse(init.body) : null,
        started: performance.now(),
      } : null;
      if (record) window.__predictionRequests.push(record);
      try {
        const response = await original(input, init);
        if (record) {
          record.elapsedMs = performance.now() - record.started;
          record.status = response.status;
        }
        return response;
      } catch (error) {
        if (record) {
          record.elapsedMs = performance.now() - record.started;
          record.error = String(error);
        }
        throw error;
      }
    };
    window.__s3p3FetchRecorder = true;
  })();`;
  await send("Page.addScriptToEvaluateOnNewDocument", { source: fetchRecorder });
  await send("Page.navigate", { url: "http://localhost:5173/" });
  await waitFor("document.readyState", (value) => value === "complete", 15_000);
  await sleep(500);
  if (await evaluate("Boolean(document.querySelector('.disclaimer-modal'))")) {
    screenshots.disclaimer = await capture("s3p3-disclaimer-1920x1080.png");
    await clickButtonText("Acknowledge and continue");
  }

  await waitFor(
    "document.querySelector('.model-version')?.innerText.includes('Real v1.1.0')",
    Boolean,
    15_000,
  );
  await waitFor(
    "document.querySelector('#sample-patient')?.value",
    (value) => value === "patient-20",
    15_000,
  );
  await waitFor(
    "document.querySelectorAll('.probability-readout').length",
    (value) => value === 4,
    15_000,
  );
  await waitFor(
    "(window.__predictionRequests??[]).some((item)=>item.body?.sample_id==='patient-20')",
    Boolean,
    15_000,
  );
  await waitFor(
    "document.querySelector('.results-panel .prediction-source-badge')?.innerText.includes('Real-model prediction')",
    Boolean,
    15_000,
  );
  await sleep(1800);
  const initialSample = await pageSnapshot();
  geometry1920.push({ state: "sample-20-cad-why", canvas: initialSample.canvas });
  screenshots.sampleCad = await capture("s3p3-real-sample-cad-1920x1080.png");
  const initialCadCanvas = await canvasImage();
  const initialRequests = JSON.parse(
    await evaluate(
      "JSON.stringify((window.__predictionRequests??[]).filter((item)=>item.body?.sample_id==='patient-20').map((item)=>({sample_id:item.body.sample_id,chestPain:item.body.features['Chest Pain'],status:item.status,elapsedMs:item.elapsedMs})))",
    ),
  );

  await pointerClickSelector('[aria-label^="Select LAD."]');
  await waitFor(
    "document.querySelector('.viewer-panel')?.innerText.includes('Selected target: LAD')",
    Boolean,
    2000,
  );
  await sleep(800);
  const afterLadSelection = await pageSnapshot();
  geometry1920.push({ state: "sample-20-lad-why", canvas: afterLadSelection.canvas });
  await sleep(250);
  const overviewLadCanvas = await canvasImage();
  const pointerSelectionDiff = compareImages(initialCadCanvas, overviewLadCanvas);
  actions.resultPointerSelectionNoCameraMove = {
    pixelDiffFraction: pointerSelectionDiff.changedFraction,
    changedPixels: pointerSelectionDiff.changedPixels,
    changedBounds: pointerSelectionDiff.bounds,
    interpretation:
      "Vessel highlighting changes pixels; focus/reset checks compare the same selected-vessel view.",
  };
  screenshots.sampleLad = await capture("s3p3-real-sample-lad-1920x1080.png");

  await focusButtonText("Inputs");
  await pressKey("Enter", "Enter");
  await sleep(150);
  const sampleInputs = await pageSnapshot();
  geometry1920.push({ state: "sample-20-lad-inputs", canvas: sampleInputs.canvas });
  screenshots.sampleInputs = await capture(
    "s3p3-real-sample-inputs-lad-1920x1080.png",
  );
  actions.inputsTabKeyboard = sampleInputs.view === "Inputs";
  await focusButtonText("Why?");
  await pressKey("Enter", "Enter");
  await sleep(150);

  for (const focusName of ["Focus LAD", "Focus LCX", "Focus RCA"]) {
    await focusButtonText(focusName);
    await pressKey("Enter", "Enter");
    await sleep(1000);
    const focusedImage = await canvasImage();
    const focusDiff = compareImages(overviewLadCanvas, focusedImage);
    if (focusName === "Focus LAD") {
      screenshots.cameraFocusLad = await capture(
        "s3p3-camera-focus-lad-1920x1080.png",
      );
    }
    await focusButtonText("Reset view");
    await pressKey("Enter", "Enter");
    await sleep(1000);
    const resetImage = await canvasImage();
    const resetDiff = compareImages(overviewLadCanvas, resetImage);
    actions[`camera_${focusName.replaceAll(" ", "_")}`] = {
      focusChangedCanvas: focusDiff.changedFraction > 0.02,
      focusPixelDiff: focusDiff,
      resetRestoresOverview: resetDiff.changedFraction < 0.005,
      resetPixelDiff: resetDiff,
    };
  }
  await focusButtonAriaPrefix("Select LCX.");
  await pressKey(" ", "Space");
  await waitFor(
    "document.querySelector('.viewer-panel')?.innerText.includes('Selected target: LCX')",
    Boolean,
    2000,
  );
  await sleep(500);
  const keyboardLcxImage = await canvasImage();
  actions.resultKeyboardSpaceSelectionNoCameraMove = {
    pixelDiffFraction: compareImages(overviewLadCanvas, keyboardLcxImage).changedFraction,
    changedPixels: compareImages(overviewLadCanvas, keyboardLcxImage).changedPixels,
  };
  await focusButtonAriaPrefix("Select LAD.");
  await pressKey("Enter", "Enter");
  await waitFor(
    "document.querySelector('.viewer-panel')?.innerText.includes('Selected target: LAD')",
    Boolean,
    2000,
  );
  await sleep(500);
  actions.resultKeyboardEnterSelectionNoCameraMove =
    compareImages(overviewLadCanvas, await canvasImage()).changedFraction < 0.005;

  const chestPainChange = await editChestPain();
  await sleep(120);
  const staleCleared = await pageSnapshot();
  geometry1920.push({
    state: "sample-edit-pending-cleared",
    canvas: staleCleared.canvas,
  });
  screenshots.pendingCleared = await capture(
    "s3p3-real-cleared-pending-1920x1080.png",
  );
  actions.staleOutputClearedAfterEdit =
    staleCleared.probabilityReadoutCount === 0 &&
    staleCleared.unavailableVessels >= 3;
  await waitFor(
    "document.querySelectorAll('.probability-readout').length",
    (value) => value === 4,
    10_000,
  );
  await waitFor(
    "document.querySelector('.results-panel')?.innerText.includes('Edited dataset-sample scenario')",
    Boolean,
    3000,
  );
  await sleep(150);
  const editedSample = await pageSnapshot();
  geometry1920.push({ state: "sample-20-edited-lad-why", canvas: editedSample.canvas });
  screenshots.editedLad = await capture("s3p3-real-edited-lad-1920x1080.png");
  actions.sampleWhatIf = {
    feature: "Chest Pain",
    previous: chestPainChange.previous,
    edited: chestPainChange.next,
    sampleId: editedSample.sampleId,
    responseSource: editedSample.predictionSource,
    readouts: editedSample.predictions,
    changedProbabilities:
      JSON.stringify(initialSample.predictions) !==
      JSON.stringify(editedSample.predictions),
    displayedAsEdited: editedSample.editedScenario,
  };
  actions.predictionRequests = JSON.parse(
    await evaluate(
      "JSON.stringify((window.__predictionRequests??[]).map((item)=>({sample_id:item.body?.sample_id??null,chestPain:item.body?.features?.['Chest Pain']??null,age:item.body?.features?.Age??null,status:item.status??null,elapsedMs:item.elapsedMs??null,error:item.error??null})))",
    ),
  );
  const editedRequest = [...actions.predictionRequests]
    .reverse()
    .find((item) => item.chestPain === chestPainChange.next);
  actions.editedScenarioUsedSameHoldoutId =
    editedRequest?.sample_id === "patient-20";
  await focusButtonText("Inputs");
  await pressKey("Enter", "Enter");
  await sleep(150);
  const editedInputs = await pageSnapshot();
  geometry1920.push({ state: "edited-sample-lad-inputs", canvas: editedInputs.canvas });
  screenshots.editedInputs = await capture(
    "s3p3-real-edited-inputs-lad-1920x1080.png",
  );
  await focusButtonText("Why?");
  await pressKey("Enter", "Enter");

  await focusButtonText("Model metrics");
  await pressKey("Enter", "Enter");
  await waitFor(
    "Boolean(document.querySelector('.metrics-drawer'))",
    Boolean,
    3000,
  );
  await waitFor(
    "document.querySelector('.metrics-drawer')?.innerText.includes('ROC-AUC 95% CI')",
    Boolean,
    5000,
  );
  await sleep(150);
  const metricsState = JSON.parse(
    await evaluate(
      "JSON.stringify({focus:document.activeElement?.getAttribute('aria-label'),text:document.querySelector('.metrics-drawer')?.innerText})",
    ),
  );
  actions.metricsDrawerInitialFocus = metricsState.focus;
  actions.metricsDrawerTextContainsEstimator = metricsState.text.includes(
    "Returned estimator",
  );
  actions.metricsDrawerTextContainsDemoRefitCaveat = metricsState.text.includes(
    "demo-model refit",
  );
  actions.metricsDrawerIncludesAllAddedRows = [
    "ROC-AUC 95% CI",
    "Balanced accuracy",
    "Brier score",
    "Expected calibration error (ECE)",
    "CV-summary threshold",
    "Returned estimator",
  ].every((label) => metricsState.text.includes(label));
  screenshots.metrics = await capture("s3p3-real-metrics-1920x1080.png");
  await evaluate(
    "(()=>{const content=document.querySelector('.metrics-drawer-content');content.scrollTop=content.scrollHeight;return true})()",
  );
  await sleep(150);
  screenshots.metricsLower = await capture(
    "s3p3-real-metrics-lower-1920x1080.png",
  );
  await pressKey("Tab", "Tab");
  actions.metricsTabRemainsInDrawer = await evaluate(
    "Boolean(document.activeElement?.closest('.metrics-drawer'))",
  );
  await pressKey("Tab", "Tab", true);
  actions.metricsShiftTabRemainsInDrawer = await evaluate(
    "Boolean(document.activeElement?.closest('.metrics-drawer'))",
  );
  await pressKey("Escape", "Escape");
  await waitFor(
    "!Boolean(document.querySelector('.metrics-drawer'))",
    Boolean,
    2000,
  );
  actions.metricsEscapeRestoresFocus = await evaluate(
    "document.activeElement===document.querySelector('.metrics-button')",
  );

  await selectSample("");
  await waitFor(
    "document.querySelector('#sample-patient')?.value",
    (value) => value === "",
    2000,
  );
  await waitFor(
    "document.querySelectorAll('.probability-readout').length",
    (value) => value === 4,
    10_000,
  );
  await waitFor(
    "document.querySelector('.results-panel')?.innerText.includes('Final models trained on all 303 patients')",
    Boolean,
    5000,
  );
  await sleep(150);
  const customFinal = await pageSnapshot();
  geometry1920.push({ state: "custom-final-models", canvas: customFinal.canvas });
  screenshots.customFinal = await capture(
    "s3p3-real-custom-final-models-1920x1080.png",
  );
  const customRequests = JSON.parse(
    await evaluate(
      "JSON.stringify((window.__predictionRequests??[]).map((item)=>({sample_id:item.body?.sample_id??null,chestPain:item.body?.features?.['Chest Pain']??null,age:item.body?.features?.Age??null,status:item.status??null,elapsedMs:item.elapsedMs??null,error:item.error??null})))",
    ),
  );
  actions.customResetClearsOrigin = {
    sampleId: customFinal.sampleId,
    scenario: customFinal.resultsPanelText.includes("Custom input scenario"),
    source: customFinal.predictionSource,
    lastRequest: customRequests.at(-1),
  };
  await send("Fetch.enable", {
    patterns: [
      { urlPattern: "http://localhost:8000/predict*", requestStage: "Request" },
    ],
  });
  fetchInterceptionEnabled = true;
  failNextPredictionPost = true;
  const ageChange = await editAge();
  await sleep(100);
  const pendingFinal = await pageSnapshot();
  geometry1920.push({ state: "custom-request-pending", canvas: pendingFinal.canvas });
  actions.pendingRequestClearsOutputs =
    pendingFinal.probabilityReadoutCount === 0 &&
    pendingFinal.unavailableVessels >= 3;
  await waitFor(
    "document.querySelectorAll('.probability-readout').length",
    (value) => value === 0,
    5000,
  );
  await waitFor(
    "document.querySelector('.results-panel')?.innerText.toLowerCase().includes('failed')",
    Boolean,
    7000,
  );
  await sleep(100);
  const failedPrediction = await pageSnapshot();
  geometry1920.push({ state: "custom-request-failed", canvas: failedPrediction.canvas });
  screenshots.errorCleared = await capture(
    "s3p3-real-error-cleared-1920x1080.png",
  );
  actions.failedRequestClearsOutputs = {
    age: ageChange,
    predictionCards: failedPrediction.probabilityReadoutCount,
    unavailableVessels: failedPrediction.unavailableVessels,
    status: failedPrediction.resultsPanelText.slice(0, 600),
    interceptedPosts: interceptedFailures.length,
  };
  await send("Fetch.disable");
  fetchInterceptionEnabled = false;
  await clickButtonText("Predict");
  await waitFor(
    "document.querySelectorAll('.probability-readout').length",
    (value) => value === 4,
    10_000,
  );
  await waitFor(
    "document.querySelector('.results-panel')?.innerText.includes('Final models trained on all 303 patients')",
    Boolean,
    5000,
  );
  await sleep(150);
  const afterRecovery = await pageSnapshot();
  geometry1920.push({ state: "custom-recovered", canvas: afterRecovery.canvas });
  actions.errorRecovery = afterRecovery.predictions;
  screenshots.recovery = await capture("s3p3-real-recovered-1920x1080.png");

  const gpuInfo = JSON.parse(
    await evaluate(`JSON.stringify((() => {
      const canvas=document.querySelector(".viewer-stage canvas");
      const gl=canvas?.getContext("webgl2");
      const ext=gl?.getExtension("WEBGL_debug_renderer_info");
      return {userAgent:navigator.userAgent,
        renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER),
        vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl?.getParameter(gl.VENDOR),
        dpr:devicePixelRatio};
    })())`),
  );
  actions.renderDevice = gpuInfo;
  await evaluate(`(() => {
    const prototype=WebGL2RenderingContext.prototype;
    if(!window.__s3p3ClearPatched) {
      const original=prototype.clear;
      prototype.clear=function(mask) {
        window.__s3p3ClearCount=(window.__s3p3ClearCount||0)+1;
        return original.call(this,mask);
      };
      window.__s3p3ClearPatched=true;
    }
    window.__s3p3ClearCount=0;
    return true;
  })()`);
  await sleep(1500);
  actions.performance = {
    idleBeforeFrames: await evaluate("window.__s3p3ClearCount"),
  };
  await evaluate("window.__s3p3ClearCount=0");
  const orbitPoint = await evaluate(`(() => {
    const r=document.querySelector(".viewer-stage canvas").getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height};
  })()`);
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: orbitPoint.x,
    y: orbitPoint.y,
    button: "none",
    buttons: 0,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: orbitPoint.x,
    y: orbitPoint.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  const orbitStart = performance.now();
  for (let index = 0; index < 90; index += 1) {
    const x =
      orbitPoint.x + Math.sin(index / 12) * Math.min(90, orbitPoint.width / 5);
    const y =
      orbitPoint.y + Math.cos(index / 15) * Math.min(30, orbitPoint.height / 10);
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "left",
      buttons: 1,
    });
    await sleep(28);
  }
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: orbitPoint.x,
    y: orbitPoint.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  const orbitEnd = performance.now();
  await sleep(250);
  actions.performance.activeFrames = await evaluate("window.__s3p3ClearCount");
  actions.performance.activeSeconds = (orbitEnd - orbitStart) / 1000;
  actions.performance.activeFps =
    actions.performance.activeFrames / actions.performance.activeSeconds;
  screenshots.activeOrbit = await capture(
    "s3p3-real-active-orbit-1920x1080.png",
  );
  await sleep(900);
  await evaluate("window.__s3p3ClearCount=0");
  await sleep(1500);
  actions.performance.idleAfterDampingFrames = await evaluate(
    "window.__s3p3ClearCount",
  );
  const afterOrbit = await pageSnapshot();
  geometry1920.push({ state: "after-orbit-idle", canvas: afterOrbit.canvas });

  await setViewport(1280, 800);
  await selectSample("patient-54");
  await waitFor(
    "document.querySelector('#sample-patient')?.value",
    (value) => value === "patient-54",
    2000,
  );
  await waitFor(
    "document.querySelectorAll('.probability-readout').length",
    (value) => value === 4,
    10_000,
  );
  await waitFor(
    "document.querySelector('.results-panel')?.innerText.includes('Dataset patient 54:')",
    Boolean,
    5000,
  );
  await sleep(150);
  await clickButtonText("Why?");
  const final1280 = await pageSnapshot();
  geometry1280.push({ state: "patient-54-why", canvas: final1280.canvas });
  screenshots.viewport1280 = await capture("s3p3-real-1280x800.png");
  await clickButtonText("Inputs");
  await sleep(150);
  const inputs1280 = await pageSnapshot();
  geometry1280.push({ state: "patient-54-inputs", canvas: inputs1280.canvas });
  screenshots.inputs1280 = await capture(
    "s3p3-real-inputs-1280x800.png",
  );

  function canvasVariation(measurements) {
    const widths = measurements.map((item) => item.canvas?.width).filter(Number.isFinite);
    const heights = measurements.map((item) => item.canvas?.height).filter(Number.isFinite);
    return {
      widthPx: widths.length ? Math.max(...widths) - Math.min(...widths) : null,
      heightPx: heights.length ? Math.max(...heights) - Math.min(...heights) : null,
      states: measurements.map((item) => item.state),
    };
  }
  const layout = {
    at1920x1080: {
      initial: initialSample,
      edited: editedSample,
      failed: failedPrediction,
      canvasVariation: canvasVariation(geometry1920),
    },
    at1280x800: {
      final: final1280,
      inputs: inputs1280,
      canvasVariation: canvasVariation(geometry1280),
    },
  };
  const requestLog = JSON.parse(
    await evaluate(
      "JSON.stringify((window.__predictionRequests??[]).map((item)=>({sample_id:item.body?.sample_id??null,chestPain:item.body?.features?.['Chest Pain']??null,age:item.body?.features?.Age??null,status:item.status??null,elapsedMs:item.elapsedMs??null,error:item.error??null})))",
    ),
  );
  const report = {
    capturedAtUtc: new Date().toISOString(),
    apiProfile: "Real v1.1.0, cardiotwin-v2.0.0",
    initialSample: {
      sampleId: initialSample.sampleId,
      profile: initialSample.profile,
      source: initialSample.predictionSource,
      readouts: initialSample.predictions,
      warnings: initialSample.warnings,
      sampleRequests: initialRequests,
    },
    editedScenario: actions.sampleWhatIf,
    predictionRequests: requestLog,
    clearedStates: {
      afterEdit: actions.staleOutputClearedAfterEdit,
      whilePending: actions.pendingRequestClearsOutputs,
      afterFailure:
        actions.failedRequestClearsOutputs.interceptedPosts > 0 &&
        actions.failedRequestClearsOutputs.predictionCards === 0,
    },
    resetAndRecovery: {
      custom: actions.customResetClearsOrigin,
      failed: actions.failedRequestClearsOutputs,
      recovered: actions.errorRecovery,
    },
    cameraAndKeyboard: actions,
    layout,
    screenshots,
    consoleErrors,
  };
  fs.writeFileSync(
    path.join(evidenceDir, "s3p3-live-measurements.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  const text = [
    "Sprint 3 Phase 3 live verification (Edge CDP, exact CSS viewport emulation, DPR 1)",
    `Captured UTC: ${report.capturedAtUtc}`,
    `Initial profile/sample: ${initialSample.profile}; ${initialSample.sampleId}`,
    `Initial source: ${initialSample.predictionSource}`,
    `Initial CAD/LAD/LCX/RCA readouts: ${initialSample.predictions.join(" | ")}`,
    `Edited Chest Pain: ${chestPainChange.previous} -> ${chestPainChange.next}; source: ${actions.sampleWhatIf.responseSource}`,
    `Edited result changed: ${actions.sampleWhatIf.changedProbabilities}; same demo sample_id: ${actions.editedScenarioUsedSameHoldoutId}`,
    `Custom reset source: ${customFinal.predictionSource}; request sample_id: ${actions.customResetClearsOrigin.lastRequest?.sample_id ?? "omitted"}`,
    `Cleared after edit/pending/failure: ${actions.staleOutputClearedAfterEdit}/${actions.pendingRequestClearsOutputs}/${actions.failedRequestClearsOutputs.interceptedPosts > 0 && actions.failedRequestClearsOutputs.predictionCards === 0}`,
    `Camera: focus changes view=${actions.camera_Focus_LAD.focusChangedCanvas}; reset restores the same selected-vessel overview=${actions.camera_Focus_LAD.resetRestoresOverview}; pointer-selection diff ${actions.resultPointerSelectionNoCameraMove.pixelDiffFraction.toFixed(4)} in ${JSON.stringify(actions.resultPointerSelectionNoCameraMove.changedBounds)}; keyboard Enter restores the selected LAD view=${actions.resultKeyboardEnterSelectionNoCameraMove}`,
    `Metrics keyboard focus: ${actions.metricsDrawerInitialFocus}; tab containment: ${actions.metricsTabRemainsInDrawer}/${actions.metricsShiftTabRemainsInDrawer}; Escape focus restored: ${actions.metricsEscapeRestoresFocus}`,
    `1920x1080: document ${initialSample.document.width}x${initialSample.document.height}; canvas ${initialSample.canvas.width.toFixed(2)}x${initialSample.canvas.height.toFixed(2)} CSS px; DPR ${initialSample.viewport.dpr}; visible chart bars ${initialSample.visibleChartBars}/${initialSample.totalChartBars}; zero alignment ${initialSample.chart.zeroAlignmentPx}; Y tick font ${initialSample.chart.minYAxisTickFontPx}px`,
    `1280x800: document ${final1280.document.width}x${final1280.document.height}; canvas ${final1280.canvas.width.toFixed(2)}x${final1280.canvas.height.toFixed(2)} CSS px; DPR ${final1280.viewport.dpr}`,
    `Canvas variation: 1920 ${JSON.stringify(layout.at1920x1080.canvasVariation)}; 1280 ${JSON.stringify(layout.at1280x800.canvasVariation)}`,
    `Orbit: ${actions.performance.activeFrames} clear frames/${actions.performance.activeSeconds.toFixed(3)}s = ${actions.performance.activeFps.toFixed(1)} FPS; idle pre=${actions.performance.idleBeforeFrames}, idle after damping=${actions.performance.idleAfterDampingFrames}; ${gpuInfo.renderer}`,
    `Screenshots: ${Object.values(screenshots).map((shot) => shot.file).join(", ")}`,
    `Console errors: ${consoleErrors.length}`,
  ];
  fs.writeFileSync(
    path.join(evidenceDir, "s3p3-live-flow.txt"),
    `${text.join("\n")}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        initial: report.initialSample,
        edited: actions.sampleWhatIf,
        requestSampleIds: requestLog.map((item) => item.sample_id),
        clearedStates: report.clearedStates,
        resetAndRecovery: report.resetAndRecovery,
        camera: {
          pointer: actions.resultPointerSelectionNoCameraMove,
          keyboardSpace: actions.resultKeyboardSpaceSelectionNoCameraMove,
          keyboardEnter: actions.resultKeyboardEnterSelectionNoCameraMove,
          focusLad: actions.camera_Focus_LAD,
        },
        drawer: {
          focus: actions.metricsDrawerInitialFocus,
          tabInside: actions.metricsTabRemainsInDrawer,
          shiftTabInside: actions.metricsShiftTabRemainsInDrawer,
          restored: actions.metricsEscapeRestoresFocus,
        },
        layout: {
          at1920: layout.at1920x1080.canvasVariation,
          at1280: layout.at1280x800.canvasVariation,
          canvas1920: initialSample.canvas,
          canvas1280: final1280.canvas,
          overflow1920: {
            width: initialSample.document.width - initialSample.viewport.width,
            height: initialSample.document.height - initialSample.viewport.height,
          },
          overflow1280: {
            width: final1280.document.width - final1280.viewport.width,
            height: final1280.document.height - final1280.viewport.height,
          },
          visibleBars: initialSample.visibleChartBars,
          zeroAlignment: initialSample.chart.zeroAlignmentPx,
          labelFont: initialSample.chart.minYAxisTickFontPx,
        },
        performance: actions.performance,
        renderer: gpuInfo.renderer,
        screenshots: Object.values(screenshots).map((shot) => shot.file),
        consoleErrors,
      },
      null,
      2,
    ),
  );
} finally {
  socket.close();
}
}

await takeMeasurements();
