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
const baseUrl = process.env.STAGE_URL || "http://127.0.0.1:8942/stage.html?seam-sample";
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
  localStorage.removeItem("shosai-stage-timeline-ui-v1");
  localStorage.removeItem("shosai-stage-prefs-v1");
  localStorage.setItem("shosai-stage-lang", "ja");
  localStorage.setItem("shosai-stage-tour-v1", "done");
});
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("#stage-workspace-timeline").click();
await page.locator("#stage-timeline-panel").waitFor({ state: "visible" });

const trackId = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const active = documentValue.project.scenes.find((scene) => scene.id === documentValue.project.activeSceneId);
  const track = { id: "timeline-space-gain", title: "ゲイン確認音源", durationSeconds: 84.5, gainDb: 0 };
  documentValue.project.audioTracks = [track];
  active.audioTrackId = track.id;
  window.SHOSAI_STAGE_SESSION_BRIDGE.applyDocumentString(JSON.stringify(documentValue));
  return track.id;
});
await page.waitForFunction((id) => document.querySelector(`#stage-timeline-audio [data-track-id="${id}"]`), trackId);
await page.locator(`#stage-timeline-audio [data-track-id="${trackId}"]`).dblclick();
await page.locator("#stage-timeline-audio-detail-modal").waitFor({ state: "visible" });
await page.locator("#stage-timeline-audio-gain-number").fill("6");
assert.equal(await page.locator("#stage-timeline-audio-gain-range").inputValue(), "6");
assert.equal(await page.locator("#stage-timeline-audio-gain-value").textContent(), "+6 dB");
await page.screenshot({ path: path.join(outDir, "timeline-audio-gain-1440x1000.png"), fullPage: false });
await page.locator("#stage-timeline-audio-detail-save").click();
const savedGain = await page.evaluate((id) => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.audioTracks
    .find((track) => track.id === id).gainDb
), trackId);
assert.equal(savedGain, 6);
await page.locator("#stage-undo").click();
const undoneGain = await page.evaluate((id) => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.audioTracks
    .find((track) => track.id === id).gainDb
), trackId);
assert.equal(undoneGain, 0);

const sceneIds = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const scenes = documentValue.project.scenes.filter((scene) => scene.kind === "scene");
  documentValue.project.activeSceneId = scenes[0].id;
  const rows = documentValue.project.scenes;
  const activeAt = rows.findIndex((row) => row.id === scenes[0].id);
  const section = rows.slice(0, activeAt).reverse().find((row) => row.kind === "section");
  const sectionAt = rows.findIndex((row) => row.id === section.id);
  const children = [];
  for (let index = sectionAt + 1; index < rows.length && rows[index].depth > section.depth; index += 1) {
    if (rows[index].kind === "scene") children.push(rows[index]);
  }
  documentValue.project.audioTracks = [];
  children.forEach((scene) => {
    scene.audioTrackId = null;
    scene.rehearsal = { ...(scene.rehearsal || {}), holdDurationSeconds: 0.15, transitionToNextSeconds: 0 };
  });
  section.timelineDurationSeconds = children.length * 0.15;
  window.SHOSAI_STAGE_SESSION_BRIDGE.applyDocumentString(JSON.stringify(documentValue));
  return children.slice(0, 2).map((scene) => scene.id);
});
assert.equal(sceneIds.length, 2);
await page.waitForTimeout(80);
await page.locator("#stage-timeline-head").click();
const before = await page.locator("#stage-timeline-position").textContent();
await page.keyboard.press("Space");
await page.waitForTimeout(260);
const during = await page.locator("#stage-timeline-position").textContent();
assert.notEqual(during, before);
assert.equal(await page.locator("#stage-timeline-play").getAttribute("aria-pressed"), "true");
await page.keyboard.press("Space");
assert.equal(await page.locator("#stage-timeline-play").getAttribute("aria-pressed"), "false");
await page.locator("#stage-timeline-section-duration-number").focus();
await page.keyboard.press("Space");
assert.equal(await page.locator("#stage-timeline-play").getAttribute("aria-pressed"), "false");

const unrelatedErrors = errors.filter((message) => message.includes("syncRosterPropShape is not defined"));
const targetErrors = errors.filter((message) => !unrelatedErrors.includes(message));
const result = {
  url: baseUrl,
  checkedAt: new Date().toISOString(),
  gain: { saved: savedGain, undone: undoneGain },
  playback: { before, during },
  targetErrors,
  unrelatedErrors,
};
assert.deepEqual(targetErrors, []);
await writeFile(path.join(outDir, "timeline-space-gain-browser-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
