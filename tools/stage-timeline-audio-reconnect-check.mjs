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
  || "http://127.0.0.1:8950/stage.html?seam-sample&timeline-audio-reconnect-check=1";

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
const launchBackupContinue = page.locator("#stage-launch-backup-continue");
if (await launchBackupContinue.isVisible()) await launchBackupContinue.click();
await page.keyboard.press("E");
await page.locator("#stage-timeline-panel").waitFor({ state: "visible" });

const seeded = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const active = documentValue.project.scenes.find((scene) => scene.id === documentValue.project.activeSceneId);
  const track = {
    id: "timeline-audio-missing-check",
    title: "gensan-extend",
    durationSeconds: 84.8535,
    gainDb: 3,
  };
  documentValue.project.audioTracks = [track];
  active.audioTrackId = track.id;
  window.SHOSAI_STAGE_SESSION_BRIDGE.applyDocumentString(JSON.stringify(documentValue));
  return {
    trackId: track.id,
    sceneCount: documentValue.project.scenes.length,
    cueCount: documentValue.project.cues.length,
    activeSceneId: documentValue.project.activeSceneId,
    gainDb: track.gainDb,
  };
});

const block = page.locator(`#stage-timeline-audio [data-track-id="${seeded.trackId}"]`);
await block.waitFor();
await page.waitForFunction((trackId) => (
  document.querySelector(`#stage-timeline-audio [data-track-id="${trackId}"]`)?.classList.contains("is-missing")
), seeded.trackId);

const presentation = await block.evaluate((node) => {
  const blockRect = node.getBoundingClientRect();
  const copyRect = node.querySelector(".stage-timeline-audio-missing-copy").getBoundingClientRect();
  const actionRect = node.querySelector(".stage-timeline-audio-relink-action").getBoundingClientRect();
  const viewportRect = document.getElementById("stage-timeline-viewport").getBoundingClientRect();
  const style = getComputedStyle(node);
  return {
    text: node.textContent.replace(/\s+/g, " ").trim(),
    ariaLabel: node.getAttribute("aria-label"),
    borderStyle: style.borderStyle,
    actionInside: actionRect.left >= blockRect.left && actionRect.right <= blockRect.right,
    actionVisible: actionRect.left >= viewportRect.left && actionRect.right <= viewportRect.right,
    copyBeforeAction: copyRect.right <= actionRect.left,
  };
});
assert.match(presentation.text, /音源が見つかりません/);
assert.match(presentation.text, /gensan-extend/);
assert.match(presentation.text, /読み込み直す/);
assert.match(presentation.ariaLabel, /読み込み直す/);
assert.equal(presentation.borderStyle, "dashed");
assert.equal(presentation.actionInside, true);
assert.equal(presentation.actionVisible, true);
assert.equal(presentation.copyBeforeAction, true);

const fileChooserPromise = page.waitForEvent("filechooser");
const screenshot = path.join(outDir, "timeline-audio-reconnect-missing-1440x1000.png");
await page.screenshot({ path: screenshot, fullPage: false });
await block.click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles(path.join(root, "formation/prototype/sample/gensan-extend.mp3"));
await page.waitForFunction(async (trackId) => (
  window.SHOSAI_STAGE_SESSION_BRIDGE.hasTimelineAudioFile(trackId)
), seeded.trackId);
await page.waitForFunction((trackId) => {
  const node = document.querySelector(`#stage-timeline-audio [data-track-id="${trackId}"]`);
  return node && !node.classList.contains("is-missing") && node.textContent.includes("gensan-extend");
}, seeded.trackId);
const afterReconnect = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const active = documentValue.project.scenes.find((scene) => scene.id === documentValue.project.activeSceneId);
  const track = documentValue.project.audioTracks.find((item) => item.id === active.audioTrackId);
  return {
    sceneCount: documentValue.project.scenes.length,
    cueCount: documentValue.project.cues.length,
    activeSceneId: documentValue.project.activeSceneId,
    trackId: active.audioTrackId,
    gainDb: track.gainDb,
  };
});
assert.deepEqual(afterReconnect, seeded);
assert.deepEqual(errors, []);

const result = { url: baseUrl, checkedAt: new Date().toISOString(), presentation, preserved: afterReconnect };
await writeFile(
  path.join(outDir, "timeline-audio-reconnect-browser-check.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
