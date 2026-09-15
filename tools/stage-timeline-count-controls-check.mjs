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
  || "http://127.0.0.1:8950/stage.html?seam-sample&timeline-count-controls-check=1";

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

const controlIds = [
  "stage-timeline-metronome",
  "stage-timeline-anchor",
  "stage-timeline-clear-anchors",
  "stage-timeline-bpm-label",
  "stage-timeline-bpm",
  "stage-timeline-auto-bpm",
  "stage-timeline-meter",
  "stage-timeline-mark-one",
  "stage-timeline-real-tempo-readout",
];
const readControls = () => page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
  const element = document.getElementById(id);
  return [id, {
    hidden: element.hidden,
    disabled: "disabled" in element ? element.disabled : undefined,
    display: getComputedStyle(element).display,
  }];
})), controlIds);
const assertHidden = (state, label) => {
  for (const id of controlIds) {
    assert.equal(state[id].hidden, true, `${label}: ${id} は hidden である`);
    assert.equal(state[id].display, "none", `${label}: ${id} は描画されない`);
  }
};
const assertVisible = (state, label) => {
  for (const id of controlIds) {
    assert.equal(state[id].hidden, false, `${label}: ${id} は表示される`);
    assert.notEqual(state[id].display, "none", `${label}: ${id} は描画される`);
  }
};
const switchUnit = async (expectedChecked) => {
  await page.locator("#stage-timeline-unit-toggle").click();
  await page.locator("#stage-timeline-unit-warning-modal").waitFor({ state: "visible" });
  await page.locator("#stage-timeline-unit-warning-confirm").click();
  await page.waitForFunction((checked) => (
    document.getElementById("stage-timeline-unit-toggle").getAttribute("aria-checked") === checked
  ), String(expectedChecked));
};

const timeBefore = await readControls();
assertHidden(timeBefore, "初期の時間式");
const timeScreenshot = path.join(outDir, "timeline-time-controls-1440x1000.png");
await page.screenshot({ path: timeScreenshot, fullPage: false });

await switchUnit(true);
const count = await readControls();
assertVisible(count, "カウント式");
const countScreenshot = path.join(outDir, "timeline-count-controls-1440x1000.png");
await page.screenshot({ path: countScreenshot, fullPage: false });

await switchUnit(false);
const timeAfter = await readControls();
assertHidden(timeAfter, "時間式へ戻した後");
assert.deepEqual(errors, []);

const result = {
  url: baseUrl,
  checkedAt: new Date().toISOString(),
  timeBefore,
  count,
  timeAfter,
  timeScreenshot,
  countScreenshot,
};
await writeFile(
  path.join(outDir, "timeline-count-controls-browser-check.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
