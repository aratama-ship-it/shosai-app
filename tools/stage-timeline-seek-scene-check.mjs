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
  || "http://127.0.0.1:8950/stage.html?seam-sample&timeline-seek-scene-check=1";

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
const scenes = page.locator(".stage-timeline-scene:not([disabled])");
assert.ok(await scenes.count() >= 2, "シーク同期確認には2シーン以上必要です");

const first = scenes.nth(0);
const second = scenes.nth(1);
const firstId = await first.getAttribute("data-scene-id");
const secondId = await second.getAttribute("data-scene-id");
assert.ok(firstId && secondId && firstId !== secondId);

await first.click();
await page.waitForFunction((sceneId) => {
  const value = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return value.project.activeSceneId === sceneId;
}, firstId);

const secondBox = await second.boundingBox();
const rulerBox = await page.locator("#stage-timeline-ruler").boundingBox();
assert.ok(secondBox && rulerBox, "シーン帯と時間ルーラーを取得できる");
const seekX = Math.max(2, Math.min(rulerBox.width - 2, secondBox.x + secondBox.width / 2 - rulerBox.x));
await page.locator("#stage-timeline-ruler").click({ position: { x: seekX, y: Math.min(12, rulerBox.height / 2) } });
await page.waitForFunction((sceneId) => {
  const value = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return value.project.activeSceneId === sceneId;
}, secondId);

const result = await page.evaluate(({ firstSceneId, secondSceneId }) => {
  const value = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const currentBand = document.querySelector('.stage-timeline-scene.is-current');
  return {
    firstSceneId,
    secondSceneId,
    activeSceneId: value.project.activeSceneId,
    currentBandSceneId: currentBand && currentBand.dataset.sceneId,
    sceneNow: document.getElementById("stage-scene-now")?.textContent.trim() || "",
    viewMode: document.getElementById("stage-view-select")?.value || "",
  };
}, { firstSceneId: firstId, secondSceneId: secondId });
assert.equal(result.activeSceneId, secondId, "シーク先のシーンが本体の選択になる");
assert.equal(result.currentBandSceneId, secondId, "タイムラインの現在シーン表示も同期する");
assert.match(result.sceneNow, /\S/, "舞台側の現在シーン表示が更新される");
assert.deepEqual(errors, []);

const screenshot = path.join(outDir, "timeline-seek-scene-1440x1000.png");
await page.screenshot({ path: screenshot, fullPage: false });
const output = { url: baseUrl, checkedAt: new Date().toISOString(), ...result, screenshot };
await writeFile(
  path.join(outDir, "timeline-seek-scene-browser-check.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify(output, null, 2));
await browser.close();
