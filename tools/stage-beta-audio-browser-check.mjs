import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.STUDY_PLAYWRIGHT
  || "/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(playwrightPath);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "docs/native-music-edit-2026-09-12");
const baseUrl = process.env.STAGE_URL
  || "http://127.0.0.1:8942/stage.html?releaseScope=beta-20260912&beta-audio=1";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];

page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
    errors.push(message.text());
  }
});

await page.addInitScript(() => {
  window.SHOSAI_RELEASE_SCOPE = "beta-20260912";
  localStorage.setItem("shosai-stage-lang", "ja");
  localStorage.setItem("shosai-stage-prefs-v1", JSON.stringify({ panelMusic: true }));
  localStorage.setItem("shosai-stage-tour-v1", "done");
});
await page.goto(baseUrl, { waitUntil: "networkidle" });

const note = page.locator("#stage-music-beta-note");
const musicBody = page.locator('[data-panel="music"] .stage-panel-body');
if (await musicBody.getAttribute("hidden") !== null) {
  await page.locator('[data-panel="music"] .stage-panel-head').click();
}
await note.waitFor({ state: "visible" });
const noteText = (await note.textContent())?.trim() || "";
assert.match(noteText, /MP3またはM4A\/AAC/);
assert.match(noteText, /50MB/);
assert.match(noteText, /WAVは容量が大きくなりやすく/);
assert.match(noteText, /ブラウザの保存領域を圧迫/);

const accept = await page.locator("#stage-music-file").getAttribute("accept");
assert.ok(accept);
assert.doesNotMatch(accept, /wav/i);
assert.match(accept, /\.mp3/);
assert.match(accept, /\.m4a/);

const policy = await page.evaluate(() => ({
  betaWav: window.SHOSAI_STAGE_AUDIO_MODEL.filePolicy(
    { name: "heavy.wav", type: "audio/wav", size: 1024 },
    "beta-20260912",
  ),
  betaOversizeMp3: window.SHOSAI_STAGE_AUDIO_MODEL.filePolicy(
    { name: "large.mp3", type: "audio/mpeg", size: 51 * 1024 * 1024 },
    "beta-20260912",
  ),
  betaSmallMp3: window.SHOSAI_STAGE_AUDIO_MODEL.filePolicy(
    { name: "small.mp3", type: "audio/mpeg", size: 10 * 1024 * 1024 },
    "beta-20260912",
  ),
}));
assert.deepEqual(policy, {
  betaWav: "beta-wav",
  betaOversizeMp3: "beta-size",
  betaSmallMp3: "",
});

await page.locator("#stage-music-file").setInputFiles({
  name: "heavy.wav",
  mimeType: "audio/wav",
  buffer: Buffer.from("RIFF0000WAVE"),
});
await page.waitForFunction(() => (
  document.querySelector("#stage-music-status")?.textContent?.includes("ベータ版ではWAV音源を読み込めません")
));
const rejectionText = (await page.locator("#stage-music-status").textContent())?.trim() || "";
assert.match(rejectionText, /MP3またはM4A\/AACへ変換/);

await page.screenshot({
  path: path.join(outDir, "beta-audio-warning-1440x1000.png"),
  fullPage: false,
});

const unrelatedErrors = errors.filter((message) => message.includes("syncRosterPropShape is not defined"));
const targetErrors = errors.filter((message) => !unrelatedErrors.includes(message));

const nativePage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const nativeErrors = [];
nativePage.on("pageerror", (error) => nativeErrors.push(String(error)));
nativePage.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
    nativeErrors.push(message.text());
  }
});
await nativePage.addInitScript(() => {
  window.SHOSAI_RELEASE_SCOPE = "beta-20260912";
  window.stageSketchBridge = { version: "1", platform: "macos" };
  localStorage.setItem("shosai-stage-lang", "ja");
  localStorage.setItem("shosai-stage-prefs-v1", JSON.stringify({ panelMusic: true }));
  localStorage.setItem("shosai-stage-tour-v1", "done");
});
await nativePage.goto(baseUrl, { waitUntil: "networkidle" });
const nativeState = await nativePage.evaluate(() => ({
  nativeAppRuntime: window.SHOSAI_STAGE_AUDIO_MODEL.nativeAppRuntime,
  betaBrowserRestricted: window.SHOSAI_STAGE_AUDIO_MODEL.betaBrowserRestricted,
  betaWavPolicy: window.SHOSAI_STAGE_AUDIO_MODEL.filePolicy(
    { name: "native.wav", type: "audio/wav", size: 100 * 1024 * 1024 },
    "beta-20260912",
  ),
  warningHidden: document.querySelector("#stage-music-beta-note")?.hidden,
  accept: document.querySelector("#stage-music-file")?.getAttribute("accept"),
}));
assert.equal(nativeState.nativeAppRuntime, true);
assert.equal(nativeState.betaBrowserRestricted, false);
assert.equal(nativeState.betaWavPolicy, "");
assert.equal(nativeState.warningHidden, true);
assert.match(nativeState.accept, /wav/i);
assert.deepEqual(nativeErrors, []);

const result = {
  url: baseUrl,
  checkedAt: new Date().toISOString(),
  noteText,
  accept,
  policy,
  rejectionText,
  nativeState,
  nativeErrors,
  targetErrors,
  unrelatedErrors,
};
assert.deepEqual(targetErrors, []);
await writeFile(
  path.join(outDir, "beta-audio-warning-browser-check.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
