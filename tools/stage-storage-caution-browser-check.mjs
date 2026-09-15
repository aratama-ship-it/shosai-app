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
const outDir = path.join(root, "docs/ui-prefs-storage-warning-2026-09-13");
const baseUrl = process.env.STAGE_URL || "http://127.0.0.1:8942/stage.html?storage-warning=1";
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
  localStorage.setItem("shosai-stage-lang", "ja");
  localStorage.setItem("shosai-stage-tour-v1", "done");
});
await page.goto(baseUrl, { waitUntil: "networkidle" });

const launchBackupContinue = page.locator("#stage-launch-backup-continue");
if (await launchBackupContinue.isVisible()) await launchBackupContinue.click();

await page.keyboard.press("E");
const timelineSnap = page.locator("#stage-timeline-grid");
await timelineSnap.waitFor({ state: "visible" });
assert.equal((await timelineSnap.textContent())?.trim(), "スナップ 1/4");
await page.screenshot({
  path: path.join(outDir, "timeline-snap-1440x1000.png"),
  fullPage: false,
});

const ruler = page.locator("#stage-timeline-ruler");
const rulerBox = await ruler.boundingBox();
assert.ok(rulerBox);
await page.mouse.click(rulerBox.x + Math.min(rulerBox.width * 0.2, 220), rulerBox.y + rulerBox.height / 2);
await page.locator("#stage-timeline-loop-a").click();
await page.mouse.click(rulerBox.x + Math.min(rulerBox.width * 0.65, 700), rulerBox.y + rulerBox.height / 2);
await page.locator("#stage-timeline-loop-b").click();
await page.locator("#stage-timeline-loop").click();
const loopRange = await page.locator("#stage-timeline-loop-range").evaluate((range) => {
  const rect = range.getBoundingClientRect();
  const style = getComputedStyle(range);
  return {
    hidden: range.hidden,
    active: range.classList.contains("is-active"),
    width: rect.width,
    height: rect.height,
    animationName: style.animationName,
    markerA: range.querySelector(".is-a")?.textContent,
    markerB: range.querySelector(".is-b")?.textContent,
  };
});
assert.equal(loopRange.hidden, false);
assert.equal(loopRange.active, true);
assert.ok(loopRange.width > 2);
assert.ok(loopRange.height > 100);
assert.equal(loopRange.animationName, "stage-timeline-loop-glow");
assert.equal(loopRange.markerA, "A");
assert.equal(loopRange.markerB, "B");
assert.equal(await page.locator("#stage-timeline-loop-a").getAttribute("aria-pressed"), "true");
assert.equal(await page.locator("#stage-timeline-loop-b").getAttribute("aria-pressed"), "true");
assert.equal(await page.locator("#stage-timeline-loop").getAttribute("aria-pressed"), "true");
await page.screenshot({
  path: path.join(outDir, "timeline-loop-range-1440x1000.png"),
  fullPage: false,
});

assert.equal(await page.locator(".stage-sketch-head .stage-storage-caution").count(), 0);
await page.locator("#stage-prefs-btn").click();
await page.locator("#stage-prefs-modal").waitFor({ state: "visible" });

const caution = page.locator("#stage-prefs-modal .stage-storage-caution");
await caution.waitFor({ state: "visible" });
const settingsText = (await page.locator("#stage-prefs-modal").innerText()).replace(/\s+/g, " ");
assert.equal(settingsText.includes("パネルのオン/オフ"), false);
assert.equal(settingsText.includes("1列の位置"), false);
assert.equal(await page.locator("#stage-panels-toggle").isVisible(), true);
const panelLayoutOptions = await page.locator("[data-stage-workspace-panel-layout]").evaluateAll((selects) => (
  Object.fromEntries(selects.map((select) => [
    select.dataset.stageWorkspacePanelLayout,
    [...select.options].map((option) => ({ value: option.value, label: option.textContent.trim() })),
  ]))
));
assert.deepEqual(panelLayoutOptions.normal.slice(0, 3), [
  { value: "split", label: "2列表示" },
  { value: "single-left", label: "1列・左" },
  { value: "single-right", label: "1列・右" },
]);
assert.deepEqual(panelLayoutOptions.timeline, panelLayoutOptions.normal.slice(0, 3));
const text = (await caution.textContent())?.replace(/\s+/g, " ").trim() || "";
assert.equal(
  text,
  "! 描いたものはこの端末のブラウザにだけ保存されます。設定や容量で消えることがあるので、区切りごとに〈書き出す〉からファイルへ控えを取ってください。",
);

const geometry = await page.evaluate(() => {
  const warning = document.querySelector("#stage-prefs-modal .stage-storage-caution");
  const prefsMain = document.querySelector("#stage-prefs-modal .stage-prefs-main");
  const warningRect = warning.getBoundingClientRect();
  const mainRect = prefsMain.getBoundingClientRect();
  const style = getComputedStyle(warning);
  return {
    role: warning.getAttribute("role"),
    warningTop: warningRect.top,
    warningBottom: warningRect.bottom,
    warningWidth: warningRect.width,
    mainTop: mainRect.top,
    borderTopWidth: style.borderTopWidth,
    borderRightWidth: style.borderRightWidth,
    borderBottomWidth: style.borderBottomWidth,
    borderLeftWidth: style.borderLeftWidth,
    borderColor: style.borderTopColor,
    backgroundColor: style.backgroundColor,
    fontSize: style.fontSize,
  };
});
assert.equal(geometry.role, "alert");
assert.ok(geometry.warningBottom <= geometry.mainTop);
assert.ok(geometry.warningWidth > 900);
assert.deepEqual(
  [geometry.borderTopWidth, geometry.borderRightWidth, geometry.borderBottomWidth, geometry.borderLeftWidth],
  ["2px", "2px", "2px", "2px"],
);
assert.equal(geometry.borderColor, "rgb(230, 107, 101)");
assert.equal(geometry.backgroundColor, "rgba(230, 107, 101, 0.08)");
assert.equal(geometry.fontSize, "13px");

await page.screenshot({
  path: path.join(outDir, "settings-storage-warning-1440x1000.png"),
  fullPage: false,
});

const unrelatedErrors = errors.filter((message) => message.includes("syncRosterPropShape is not defined"));
const targetErrors = errors.filter((message) => !unrelatedErrors.includes(message));
const result = {
  url: baseUrl,
  checkedAt: new Date().toISOString(),
  text,
  timelineSnapLabel: (await timelineSnap.textContent())?.trim(),
  loopRange,
  settingsPanelToggleRemoved: !settingsText.includes("パネルのオン/オフ"),
  separateSingleSideRowRemoved: !settingsText.includes("1列の位置"),
  headerPanelMenuVisible: await page.locator("#stage-panels-toggle").isVisible(),
  panelLayoutOptions,
  geometry,
  targetErrors,
  unrelatedErrors,
};
assert.deepEqual(targetErrors, []);
await writeFile(
  path.join(outDir, "settings-storage-warning-browser-check.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
