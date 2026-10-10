import fs from "node:fs";

const directory = "docs/evidence";
const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = targets.find(
  (target) => target.type === "page" && target.url.includes("5173"),
);
if (!page) throw new Error("No frontend page is open in the Edge debugger.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const response = JSON.parse(event.data);
  const request = pending.get(response.id);
  if (!request) return;
  pending.delete(response.id);
  response.error ? request.reject(new Error(response.error.message)) : request.resolve(response.result);
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description);
  }
  return response.result.value;
}

async function waitFor(expression, predicate, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await evaluate(expression);
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});
await waitFor(
  `document.querySelector(".model-version strong")?.textContent ?? ""`,
  (value) => value.includes("Real v1.1.0"),
);
await waitFor(
  `document.querySelector(".acknowledge-button")?.textContent ?? "dismissed"`,
  (value) => value.includes("Acknowledge") || value === "dismissed",
);
await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")]
    .find((item) => item.textContent.trim() === "Acknowledge and continue");
  button?.click();
  return true;
})()`);
const footer = await waitFor(
  `document.querySelector(".footer-credits")?.textContent ?? ""`,
  (value) => value.includes("Z-Alizadeh Sani extension"),
);
const firstViewport = await evaluate(
  `JSON.stringify({width: innerWidth, height: innerHeight, footer: document.querySelector(".footer-credits").innerText, canvas: (() => { const r = document.querySelector(".viewer-stage canvas").getBoundingClientRect(); return {width: r.width, height: r.height}; })()})`,
);
const firstImage = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
fs.writeFileSync(
  `${directory}/s3p3-real-attribution-1920x1080.png`,
  Buffer.from(firstImage.data, "base64"),
);

await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
});
await waitFor("JSON.stringify([innerWidth, innerHeight])", (value) => value === "[1280,800]");
await new Promise((resolve) => setTimeout(resolve, 250));
const secondViewport = await evaluate(
  `JSON.stringify({width: innerWidth, height: innerHeight, footer: document.querySelector(".footer-credits").innerText, canvas: (() => { const r = document.querySelector(".viewer-stage canvas").getBoundingClientRect(); return {width: r.width, height: r.height}; })()})`,
);
const secondImage = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
fs.writeFileSync(
  `${directory}/s3p3-real-attribution-1280x800.png`,
  Buffer.from(secondImage.data, "base64"),
);

console.log(
  JSON.stringify(
    {
      footer,
      viewports: [JSON.parse(firstViewport), JSON.parse(secondViewport)],
      screenshots: [
        `${directory}/s3p3-real-attribution-1920x1080.png`,
        `${directory}/s3p3-real-attribution-1280x800.png`,
      ],
    },
    null,
    2,
  ),
);
socket.close();
