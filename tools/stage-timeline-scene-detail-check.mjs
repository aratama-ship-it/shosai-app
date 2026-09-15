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
  || "http://127.0.0.1:8950/stage.html?seam-sample&timeline-scene-detail-check=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(10000);
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

const seeded = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const section = documentValue.project.scenes.find((scene) => scene.kind === "section");
  const scenes = documentValue.project.scenes.filter((scene) => scene.kind === "scene");
  assertMinimumScenes(scenes);
  section.title = "詳細確認セクション";
  scenes[1].title = "ダブルクリック詳細確認";
  scenes[1].beat = { role: "静止から群舞へ", energy: 4 };
  scenes[1].note = "入口で静止。\n照明が変わってから次へ進む。";
  scenes[1].rehearsal = { holdDurationSeconds: 7, transitionToNextSeconds: 3 };
  documentValue.project.activeSceneId = scenes[0].id;
  window.SHOSAI_STAGE_SESSION_BRIDGE.applyDocumentString(JSON.stringify(documentValue));
  return { beforeId: scenes[0].id, targetId: scenes[1].id, sectionTitle: section.title };

  function assertMinimumScenes(items) {
    if (items.length < 2) throw new Error("シーン詳細確認には2シーン以上必要です");
  }
});

await page.keyboard.press("E");
await page.locator("#stage-timeline-panel").waitFor({ state: "visible" });
const target = page.locator(`.stage-timeline-scene[data-scene-id="${seeded.targetId}"]`);
await target.waitFor();
await target.dblclick({ delay: 60 });
const modal = page.locator("#stage-rename");
await modal.waitFor({ state: "visible" });
await page.waitForTimeout(300);

const detail = await page.evaluate(() => {
  const text = (id) => document.getElementById(id).textContent.trim();
  const value = (id) => document.getElementById(id).value;
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return {
    activeSceneId: documentValue.project.activeSceneId,
    heading: text("stage-rename-title"),
    title: value("stage-rename-input"),
    subtitle: value("stage-rename-subtitle"),
    hasEnergyControl: Boolean(document.getElementById("stage-rename-energy")),
    number: text("stage-rename-scene-number"),
    section: text("stage-rename-scene-section"),
    position: text("stage-rename-scene-position"),
    hold: text("stage-rename-scene-hold"),
    transition: text("stage-rename-scene-transition"),
    description: value("stage-rename-scene-note"),
  };
});
assert.equal(detail.activeSceneId, seeded.beforeId, "ダブルクリック前半の単クリックでシーン移動しない");
assert.equal(detail.heading, "シーンの詳細");
assert.equal(detail.title, "ダブルクリック詳細確認");
assert.equal(detail.subtitle, "静止から群舞へ");
assert.equal(detail.hasEnergyControl, false);
assert.match(detail.number, /\d/);
assert.match(detail.section, /詳細確認セクション/);
assert.match(detail.position, /^\d+:/);
assert.equal(detail.hold, "0:07.0");
assert.equal(detail.transition, "0:03.0");
assert.equal(detail.description, "入口で静止。\n照明が変わってから次へ進む。");

const screenshot = path.join(outDir, "timeline-scene-detail-1440x1000.png");
await page.screenshot({ path: screenshot, fullPage: false });

console.log("timeline detail checked");
await page.locator("#stage-rename-scene-note").fill("タイムラインとシーンパネルで共有する説明");
await page.locator("#stage-rename-ok").click();
await modal.waitFor({ state: "hidden" });

const legacyEnergy = await page.evaluate((targetId) => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return documentValue.project.scenes.find((scene) => scene.id === targetId).beat.energy;
}, seeded.targetId);
assert.equal(legacyEnergy, 4, "旧版のenergy値は非表示のまま往復保持する");

console.log("timeline detail saved");
await page.keyboard.press("E");
const panelScene = page.locator(`.stage-scene-row[data-scene-id="${seeded.targetId}"] .stage-scene-chip`);
await panelScene.waitFor();
console.log("panel scene located");
await panelScene.click();
await page.waitForFunction((sceneId) => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return documentValue.project.activeSceneId === sceneId;
}, seeded.targetId);
await panelScene.dblclick({ delay: 60 });
await modal.waitFor({ state: "visible" });
const panelDetail = await page.evaluate((sceneId) => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const scene = documentValue.project.scenes.find((item) => item.id === sceneId);
  return {
    modalId: document.querySelector(".stage-modal:not([hidden])#stage-rename")?.id || "",
    title: document.getElementById("stage-rename-input").value,
    description: document.getElementById("stage-rename-scene-note").value,
    savedDescription: scene && scene.note,
  };
}, seeded.targetId);
assert.equal(panelDetail.modalId, "stage-rename");
assert.equal(panelDetail.title, detail.title);
assert.equal(panelDetail.description, "タイムラインとシーンパネルで共有する説明");
assert.equal(panelDetail.savedDescription, panelDetail.description);
console.log("panel detail checked");
await page.keyboard.press("Escape");
await modal.waitFor({ state: "hidden" });

await page.keyboard.press("E");
await target.click();
await page.waitForFunction((sceneId) => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return documentValue.project.activeSceneId === sceneId;
}, seeded.targetId);
assert.deepEqual(errors, []);

const result = { url: baseUrl, checkedAt: new Date().toISOString(), detail, panelDetail, singleClickTarget: seeded.targetId };
await writeFile(
  path.join(outDir, "timeline-scene-detail-browser-check.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
