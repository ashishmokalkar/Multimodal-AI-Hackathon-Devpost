/**
 * Records the Hindi "Listen" summary of each featured patient with Sarvam AI (Bulbul) once, so the demo plays
 * them as plain audio files and never calls Sarvam.
 *
 *   node scripts/record-hindi.mjs --dry   # print the Hindi text only (no Sarvam calls)
 *   node scripts/record-hindi.mjs         # record any clip not already in public/audio/hi
 *
 * Needs the real-model API running (API_URL, default http://127.0.0.1:8000) and SARVAM_API_KEY in the repo's
 * .env. The text comes from the app's own code (src/lib/spokenSummaryHindi.ts), so each clip matches its captions;
 * it is stored under a hash of that text, and the app only plays a clip whose text is unchanged.
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";
const SPEAKER = process.env.SARVAM_SPEAKER ?? "priya";
const MODEL = "bulbul:v3";
const dry = process.argv.includes("--dry");

async function json(path, init) {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function sarvamKey() {
  const env = await readFile(join(FRONTEND, "..", ".env"), "utf8").catch(() => "");
  const key = env.match(/^SARVAM_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!key || key === "paste-your-key-here") {
    throw new Error("SARVAM_API_KEY is not set in .env");
  }
  return key;
}

async function record(text, key) {
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, language_code: "hi-IN", speaker: SPEAKER, model: MODEL, output_audio_codec: "mp3" }),
  });
  if (!response.ok) {
    throw new Error(`Sarvam: ${response.status} ${await response.text()}`);
  }
  const { audios } = await response.json();
  return Buffer.from(audios.join(""), "base64");
}

// no dependency pre-bundling: it is not needed to load one module and its late reload breaks the shutdown
const vite = await createServer({
  root: FRONTEND,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const { spokenSummaryHindi, clipKey } = await vite.ssrLoadModule("/src/lib/spokenSummaryHindi.ts");
  const features = await json("/features");
  const featured = await json("/patients/samples");
  const key = dry ? null : await sarvamKey();
  const clips = [];
  for (const sample of featured) {
    const prediction = await json("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: sample.features, sample_id: sample.id }),
    });
    const sentences = spokenSummaryHindi(prediction, features, sample.features);
    const id = clipKey(sentences);
    const text = sentences.join(" ");
    const file = join(FRONTEND, "public", "audio", "hi", `${id}.mp3`);
    clips.push({ id, label: sample.label });
    console.log(`\n${sample.label}  [${id}, ${text.length} characters]\n${sentences.join("\n")}`);
    if (dry) {
      continue;
    }
    if (await access(file).then(() => true, () => false)) {
      console.log("  already recorded");
      continue;
    }
    if (text.length > 2500) {
      throw new Error("Text is longer than Sarvam's 2,500-character limit");
    }
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, await record(text, key));
    console.log(`  recorded public/audio/hi/${id}.mp3`);
  }
  if (!dry) {
    const lines = clips.map(({ id, label }) => `  "${id}", // ${label}`).join("\n");
    await writeFile(
      join(FRONTEND, "src", "features", "speech", "hindiClips.ts"),
      `// Written by scripts/record-hindi.mjs: the recorded Hindi summaries in public/audio/hi, by text hash.\nexport const HINDI_CLIPS: readonly string[] = [\n${lines}\n];\n`,
    );
  }
} finally {
  await vite.close();
}
