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
const baseUrl = process.env.STAGE_URL || "http://127.0.0.1:8941/stage.html?seam-sample";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
const missingResources = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) {
    errors.push(message.text());
  }
});
page.on("response", (response) => {
  if (response.status() === 404) missingResources.push(response.url());
});

await page.addInitScript(() => {
  localStorage.removeItem("shosai-stage-timeline-ui-v1");
  localStorage.removeItem("shosai-stage-prefs-v1");
  localStorage.setItem("shosai-stage-lang", "ja");
  localStorage.setItem("shosai-stage-tour-v1", "done");
});
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("#stage-workspace-tabs").waitFor();
const launchBackupContinue = page.locator("#stage-launch-backup-continue");
if (await launchBackupContinue.isVisible()) await launchBackupContinue.click();

const headerPlacement = async () => page.evaluate(() => {
  const title = document.querySelector("#stage-sketch-title");
  const tabs = document.querySelector("#stage-workspace-tabs");
  const caution = document.querySelector(".stage-storage-caution");
  const actions = document.querySelector(".stage-history-actions");
  const titleRect = title.getBoundingClientRect();
  const tabsRect = tabs.getBoundingClientRect();
  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  return {
    parentClass: tabs.parentElement.className,
    titleRight: titleRect.right,
    tabsLeft: tabsRect.left,
    bottomDelta: Math.abs(titleRect.bottom - tabsRect.bottom),
    overlapsCaution: intersects(tabsRect, caution.getBoundingClientRect()),
    overlapsActions: intersects(tabsRect, actions.getBoundingClientRect()),
  };
});

const wideHeader = await headerPlacement();
assert.equal(wideHeader.parentClass, "stage-brand-row");
assert.ok(wideHeader.tabsLeft >= wideHeader.titleRight, "モード切替は題の右に置く");
assert.ok(wideHeader.bottomDelta <= 2, "題とモード切替の下端を同じ行で揃える");
assert.equal(wideHeader.overlapsCaution, false, "モード切替を保存注意へ重ねない");
assert.equal(wideHeader.overlapsActions, false, "モード切替を右上操作へ重ねない");

const fullscreenControl = await page.evaluate(() => {
  const button = document.querySelector("#stage-present-btn");
  const exportButton = document.querySelector("#stage-export");
  const icon = button.querySelector("svg");
  const buttonRect = button.getBoundingClientRect();
  const exportRect = exportButton.getBoundingClientRect();
  const iconRect = icon.getBoundingClientRect();
  return {
    width: buttonRect.width,
    height: buttonRect.height,
    exportWidth: exportRect.width,
    exportHeight: exportRect.height,
    iconWidth: iconRect.width,
    iconHeight: iconRect.height,
    visibleText: button.textContent.trim(),
    accessibleName: button.getAttribute("aria-label"),
  };
});
assert.equal(fullscreenControl.visibleText, "", "全画面操作には文字を併記しない");
assert.ok(fullscreenControl.accessibleName, "アイコンだけでも全画面操作の名前を保つ");
assert.equal(fullscreenControl.width, fullscreenControl.exportWidth, "隣の書き出しアイコンと幅を揃える");
assert.equal(fullscreenControl.height, fullscreenControl.exportHeight, "隣の書き出しアイコンと高さを揃える");
assert.deepEqual(
  [fullscreenControl.width, fullscreenControl.height, fullscreenControl.iconWidth, fullscreenControl.iconHeight],
  [44, 44, 20, 20],
);

const panelOrder = async () => page.evaluate(() => ({
  left: [...document.querySelectorAll("#stage-col-left [data-panel]")].map((node) => node.dataset.panel),
  right: [...document.querySelectorAll("#stage-col-right [data-panel]")].map((node) => node.dataset.panel),
  collapsed: [...document.querySelectorAll("[data-panel].is-collapsed")].map((node) => node.dataset.panel),
}));

const normalPanels = await panelOrder();
assert.equal(await page.locator("#stage-view-select").inputValue(), "both-front");
await page.locator("#stage-workspace-timeline").click();
await page.locator("#stage-timeline-panel").waitFor({ state: "visible" });
await page.locator("#stage-freecam-open").click();
await page.locator("#stage-fpv-overlay").waitFor({ state: "visible" });
assert.equal(await page.locator("#stage-freecam-open").getAttribute("aria-pressed"), "true");
await page.locator("#stage-fpv-close").click();
await page.locator("#stage-fpv-overlay").waitFor({ state: "hidden" });
assert.equal(await page.locator("#stage-workspace-timeline").getAttribute("aria-pressed"), "true");
const firstTimelinePanels = await panelOrder();
assert.deepEqual(firstTimelinePanels.left, [...normalPanels.left, ...normalPanels.right]);
assert.deepEqual(firstTimelinePanels.right, []);
assert.deepEqual(firstTimelinePanels.collapsed, normalPanels.collapsed);
assert.equal(await page.locator(".stage-sketch-grid").evaluate((node) => node.classList.contains("stage-panels-single")), true);
assert.equal(await page.locator("#stage-view-select").inputValue(), "plan");
assert.equal(await page.locator("#stage-front-inner").isVisible(), false);
assert.equal(await page.locator("#stage-plan-inner").isVisible(), true);
assert.equal(await page.locator('#stage-view-select option[value="both-front"]').evaluate((option) => option.disabled), false);
assert.equal(await page.locator('#stage-view-select option[value="both-plan"]').evaluate((option) => option.disabled), false);
const unitToggle = page.locator("#stage-timeline-unit-toggle");
const unitLabels = [await unitToggle.textContent()];
assert.deepEqual(unitLabels, ["時間式"]);
assert.equal(await unitToggle.getAttribute("aria-checked"), "false");
const sectionDurationOrder = await page.evaluate(() => {
  const strip = document.querySelector(".stage-timeline-menu-strip.is-source");
  const children = [...strip.children];
  return {
    heading: children.indexOf(strip.querySelector(".stage-timeline-heading")),
    duration: children.indexOf(strip.querySelector(".stage-timeline-section-duration")),
    unit: children.indexOf(strip.querySelector(".stage-timeline-unit")),
  };
});
assert.deepEqual(sectionDurationOrder, { heading: 0, duration: 1, unit: 2 });
const durationBefore = Number(await page.locator("#stage-timeline-section-duration-number").inputValue());
assert.ok(durationBefore > 0);
const sceneHoldBefore = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const scene = documentValue.project.scenes.find((row) => row.id === documentValue.project.activeSceneId);
  return scene.rehearsal && scene.rehearsal.holdDurationSeconds;
});
assert.equal(await page.locator("#stage-timeline-section-duration-range").count(), 0);
assert.equal(await page.locator("#stage-timeline-section-duration-number").isDisabled(), false);
assert.equal(await page.locator("#stage-timeline-section-duration-number").getAttribute("max"), null);
await page.locator("#stage-timeline-section-duration-number").evaluate((node) => {
  node.value = "90000";
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
});
const unlimitedDuration = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const activeAt = documentValue.project.scenes.findIndex((row) => row.id === documentValue.project.activeSceneId);
  const section = documentValue.project.scenes.slice(0, activeAt).reverse().find((row) => row.kind === "section");
  return {
    stored: section.timelineDurationSeconds,
    sceneHold: documentValue.project.scenes[activeAt].rehearsal?.holdDurationSeconds,
    number: Number(document.getElementById("stage-timeline-section-duration-number").value),
  };
});
assert.deepEqual(unlimitedDuration, { stored: 90000, sceneHold: sceneHoldBefore, number: 90000 });
await page.locator("#stage-timeline-section-duration-number").evaluate((node) => {
  node.value = "12.3";
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
});
const directDuration = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const activeAt = documentValue.project.scenes.findIndex((row) => row.id === documentValue.project.activeSceneId);
  const section = documentValue.project.scenes.slice(0, activeAt).reverse().find((row) => row.kind === "section");
  const scene = documentValue.project.scenes[activeAt];
  return {
    stored: section.timelineDurationSeconds,
    sceneHold: scene.rehearsal && scene.rehearsal.holdDurationSeconds,
    number: Number(document.getElementById("stage-timeline-section-duration-number").value),
  };
});
assert.deepEqual(directDuration, { stored: 12.3, sceneHold: sceneHoldBefore, number: 12.3 });
const durationNumber = page.locator("#stage-timeline-section-duration-number");
const durationBox = await durationNumber.boundingBox();
assert.ok(durationBox);
await page.mouse.move(durationBox.x + durationBox.width / 2, durationBox.y + durationBox.height / 2);
await page.mouse.down();
await page.mouse.move(durationBox.x + durationBox.width / 2 + 18, durationBox.y + durationBox.height / 2);
await page.mouse.up();
const dragDuration = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const activeAt = documentValue.project.scenes.findIndex((row) => row.id === documentValue.project.activeSceneId);
  const section = documentValue.project.scenes.slice(0, activeAt).reverse().find((row) => row.kind === "section");
  return {
    stored: section.timelineDurationSeconds,
    number: Number(document.getElementById("stage-timeline-section-duration-number").value),
  };
});
assert.deepEqual(dragDuration, { stored: 18.3, number: 18.3 });
assert.equal(await page.locator("#stage-undo").isDisabled(), false);
await page.locator("#stage-undo").click();
await page.waitForFunction(() => document.getElementById("stage-timeline-section-duration-number").value === "12.3");
const undoDuration = Number(await page.locator("#stage-timeline-section-duration-number").inputValue());
assert.equal(undoDuration, 12.3);
await page.waitForFunction(() => !document.getElementById("stage-redo").disabled);
assert.equal(await page.locator("#stage-redo").isDisabled(), false);
await page.locator("#stage-redo").click();
await page.waitForFunction(() => document.getElementById("stage-timeline-section-duration-number").value === "18.3");
const redoDuration = Number(await page.locator("#stage-timeline-section-duration-number").inputValue());
assert.equal(redoDuration, 18.3);
await page.locator("#stage-view-select").selectOption("both-front");
assert.equal(await page.locator("#stage-front-inner").isVisible(), true);
assert.equal(await page.locator("#stage-plan-inner").isVisible(), true);
await page.locator("#stage-view-select").selectOption("plan");

await page.locator("#stage-prefs-btn").click();
await page.locator("#stage-prefs-modal").waitFor({ state: "visible" });
const readModeLayouts = () => page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll("[data-stage-workspace-panel-layout]")]
    .map((select) => [select.dataset.stageWorkspacePanelLayout, select.value]),
));
const defaultModeLayouts = await readModeLayouts();
assert.deepEqual(defaultModeLayouts, { normal: "split", timeline: "single-left" });
await page.locator('[data-stage-workspace-panel-layout="timeline"]').selectOption("split");
assert.equal(await page.locator(".stage-sketch-grid").evaluate((node) => node.classList.contains("stage-panels-single")), false);
await page.locator('[data-stage-workspace-panel-layout="timeline"]').selectOption("single-left");
assert.equal(await page.locator(".stage-sketch-grid").evaluate((node) => node.classList.contains("stage-panels-single")), true);
await page.locator("#stage-prefs-close").click();
assert.equal(await page.locator("#stage-timeline-panel").evaluate((node) => getComputedStyle(node).height), "360px");

const menuState = await page.evaluate(() => {
  const visibleIds = [
    "stage-timeline-song-select", "stage-timeline-song-delete",
    "stage-timeline-add-audio", "stage-timeline-volume",
    "stage-timeline-prev", "stage-timeline-play",
    "stage-timeline-next", "stage-timeline-metronome", "stage-timeline-head", "stage-timeline-anchor",
    "stage-timeline-clear-anchors", "stage-timeline-loop-a", "stage-timeline-loop-b",
    "stage-timeline-loop", "stage-timeline-bpm", "stage-timeline-auto-bpm", "stage-timeline-mark-one",
    "stage-timeline-grid", "stage-timeline-zoom-out", "stage-timeline-zoom-in",
    "stage-timeline-split", "stage-timeline-record", "stage-timeline-record-next",
    "stage-timeline-add-scene", "stage-timeline-add-transition",
    "stage-timeline-add-light-cue", "stage-timeline-add-music-cue", "stage-timeline-add-dialogue-cue",
  ];
  return {
    stripCount: document.querySelectorAll(".stage-timeline-menu-strip").length,
    themeAbsent: !document.getElementById("stage-timeline-theme"),
    saveLoadAbsent: !document.getElementById("stage-timeline-save")
      && !document.getElementById("stage-timeline-load"),
    historyAbsent: !document.getElementById("stage-timeline-undo")
      && !document.getElementById("stage-timeline-redo"),
    skinSettingsRemain: document.querySelectorAll("[data-stage-ui-skin]").length === 2,
    allRendered: visibleIds.every((id) => {
      const node = document.getElementById(id);
      return node && getComputedStyle(node).display !== "none";
    }),
    unsupportedDisabled: ["stage-timeline-metronome", "stage-timeline-anchor", "stage-timeline-split", "stage-timeline-record"]
      .every((id) => document.getElementById(id).disabled),
  };
});
assert.deepEqual(menuState, {
  stripCount: 2,
  themeAbsent: true,
  saveLoadAbsent: true,
  historyAbsent: true,
  skinSettingsRemain: true,
  allRendered: true,
  unsupportedDisabled: true,
});

const headerVolume = await page.evaluate(() => {
  const control = document.getElementById("stage-timeline-volume");
  const feedback = document.getElementById("stage-feedback-open");
  const rect = control.getBoundingClientRect();
  return {
    inHeader: Boolean(control.closest(".stage-history-actions")),
    inTimeline: Boolean(control.closest("#stage-timeline-panel")),
    beforeFeedback: Boolean(control.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING),
    width: rect.width,
    value: control.value,
  };
});
assert.deepEqual(headerVolume, {
  inHeader: true,
  inTimeline: false,
  beforeFeedback: true,
  width: 108,
  value: "100",
});
await page.locator("#stage-timeline-volume").fill("37");
assert.equal(await page.locator("#stage-music-audio").evaluate((node) => node.volume), 0.37);
await page.locator("#stage-timeline-volume").fill("100");

const rowAddControls = await page.evaluate(() => {
  const expected = {
    "stage-timeline-add-audio": "audio",
    "stage-timeline-add-scene": "scenes",
    "stage-timeline-add-transition": "transitions",
    "stage-timeline-add-light-cue": "light",
    "stage-timeline-add-music-cue": "music",
    "stage-timeline-add-dialogue-cue": "dialogue",
  };
  return Object.fromEntries(Object.entries(expected).map(([id, rowKey]) => {
    const button = document.getElementById(id);
    const row = button.closest("[data-stage-timeline-row]");
    const rect = button.getBoundingClientRect();
    const iconRect = button.querySelector("svg").getBoundingClientRect();
    return [id, {
      rowKey: row && row.dataset.stageTimelineRow,
      inLabel: Boolean(button.closest(".stage-timeline-row-label")),
      width: rect.width,
      height: rect.height,
      iconCenterDeltaX: Math.round((iconRect.left + iconRect.width / 2) - (rect.left + rect.width / 2)),
      iconCenterDeltaY: Math.round((iconRect.top + iconRect.height / 2) - (rect.top + rect.height / 2)),
      labelledBy: button.getAttribute("aria-labelledby"),
    }];
  }));
});
assert.deepEqual(Object.values(rowAddControls).map((control) => [
  control.inLabel, control.width, control.height, control.iconCenterDeltaX, control.iconCenterDeltaY,
]), Array(6).fill([true, 32, 32, 0, 0]));
assert.deepEqual(Object.values(rowAddControls).map((control) => control.rowKey), [
  "audio", "scenes", "transitions", "light", "music", "dialogue",
]);
assert.equal(await page.locator(".stage-timeline-cue-add").count(), 0);

const chooserPromise = page.waitForEvent("filechooser");
await page.locator("#stage-timeline-add-audio").click();
await chooserPromise;

const iconControls = await page.evaluate(() => {
  const ids = [
    "stage-timeline-song-delete", "stage-timeline-head", "stage-timeline-prev",
    "stage-timeline-play", "stage-timeline-next", "stage-timeline-metronome",
  ];
  const controls = Object.fromEntries(ids.map((id) => {
    const node = document.getElementById(id);
    const rect = node.getBoundingClientRect();
    const icon = node.querySelector("svg");
    const iconRect = icon && icon.getBoundingClientRect();
    return [id, {
      text: node.textContent.trim(),
      label: node.getAttribute("aria-label"),
      title: node.title,
      width: rect.width,
      height: rect.height,
      iconWidth: iconRect && iconRect.width,
      iconHeight: iconRect && iconRect.height,
      iconCenterDeltaX: iconRect && (iconRect.left + iconRect.width / 2) - (rect.left + rect.width / 2),
      iconCenterDeltaY: iconRect && (iconRect.top + iconRect.height / 2) - (rect.top + rect.height / 2),
    }];
  }));
  const order = [...document.querySelectorAll(".stage-timeline-menu-strip.is-transport > button")]
    .map((node) => node.id);
  return {
    controls,
    order: order.slice(0, 5),
    splitLabel: document.getElementById("stage-timeline-split").textContent.trim(),
  };
});
assert.deepEqual(iconControls.order, [
  "stage-timeline-head", "stage-timeline-prev", "stage-timeline-play",
  "stage-timeline-next", "stage-timeline-metronome",
]);
assert.deepEqual(
  Object.fromEntries(Object.entries(iconControls.controls).map(([id, value]) => [id, value.text])),
  {
    "stage-timeline-song-delete": "",
    "stage-timeline-head": "",
    "stage-timeline-prev": "",
    "stage-timeline-play": "",
    "stage-timeline-next": "",
    "stage-timeline-metronome": "",
  },
);
assert.ok(Object.values(iconControls.controls).every((control) => control.label && control.title));
assert.ok(Object.values(iconControls.controls).every((control) => control.width === 44 && control.height === 44));
assert.deepEqual(
  [iconControls.controls["stage-timeline-song-delete"].iconWidth,
    iconControls.controls["stage-timeline-song-delete"].iconHeight],
  [16, 16],
);
assert.deepEqual(
  [iconControls.controls["stage-timeline-song-delete"].iconCenterDeltaX,
    iconControls.controls["stage-timeline-song-delete"].iconCenterDeltaY],
  [0, 0],
);
assert.deepEqual(
  [iconControls.controls["stage-timeline-metronome"].iconWidth,
    iconControls.controls["stage-timeline-metronome"].iconHeight],
  [28, 28],
);
for (const id of ["stage-timeline-head", "stage-timeline-prev", "stage-timeline-play", "stage-timeline-next"]) {
  assert.deepEqual(
    [iconControls.controls[id].iconWidth, iconControls.controls[id].iconHeight],
    [20, 20],
  );
}
for (const id of ["stage-timeline-head", "stage-timeline-prev", "stage-timeline-play", "stage-timeline-next", "stage-timeline-metronome"]) {
  assert.ok(Math.abs(iconControls.controls[id].iconCenterDeltaX) <= 0.01, `${id}を左右中央へ置く`);
  assert.ok(Math.abs(iconControls.controls[id].iconCenterDeltaY) <= 0.01, `${id}を上下中央へ置く`);
}
assert.equal(iconControls.splitLabel, "シーン分割");

const zoomBefore = await page.locator("#stage-timeline-surface").evaluate((node) => node.getBoundingClientRect().width);
await page.locator("#stage-timeline-zoom-in").click();
const zoomAfter = await page.locator("#stage-timeline-surface").evaluate((node) => node.getBoundingClientRect().width);
assert.match(await page.locator("#stage-timeline-zoom-in").getAttribute("title"), /1\.30×/,
  "拡大ボタンはミュージックシンクと同じ1.3倍刻みで更新する");
assert.ok(zoomAfter >= zoomBefore, "拡大でタイムライン幅を縮めない");
await page.keyboard.press("-");
const zoomReset = await page.locator("#stage-timeline-surface").evaluate((node) => node.getBoundingClientRect().width);
assert.ok(Math.abs(zoomReset - zoomBefore) <= 1, "−キーで一段縮小する");

const resizeBox = await page.locator("#stage-timeline-resize").boundingBox();
assert.ok(resizeBox);
await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
await page.mouse.down();
await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y - 80);
await page.mouse.up();
const expandedHeight = await page.locator("#stage-timeline-panel").evaluate((node) => node.getBoundingClientRect().height);
assert.ok(expandedHeight >= 430, "上端を上へドラッグするとタイムラインが広がる");
await page.locator("#stage-timeline-resize").dblclick();
assert.equal(await page.locator("#stage-timeline-panel").evaluate((node) => getComputedStyle(node).height), "360px");

await page.locator("#stage-view-select").selectOption("plan");
await page.locator("#stage-workspace-normal").click();
assert.equal(await page.locator("#stage-view-select").inputValue(), "both-front");
assert.equal(await page.locator("#stage-timeline-panel").isHidden(), true);
assert.deepEqual(await panelOrder(), normalPanels);
await page.locator("#stage-workspace-timeline").click();
assert.equal(await page.locator("#stage-view-select").inputValue(), "plan");
assert.equal(await page.locator("#stage-front-inner").isVisible(), false);
assert.equal(await page.locator("#stage-plan-inner").isVisible(), true);

const timelineRowOrder = () => page.locator("#stage-timeline-surface > [data-stage-timeline-row]")
  .evaluateAll((rows) => rows.map((row) => row.dataset.stageTimelineRow));
const initialRowOrder = await timelineRowOrder();
assert.deepEqual(initialRowOrder, ["ruler", "anchors", "audio", "scenes", "transitions", "light", "music", "dialogue"]);
assert.equal(await page.locator('[data-stage-timeline-row="anchors"]').isHidden(), true);
const audioRow = page.locator('[data-stage-timeline-row="audio"]');
const settingsTrigger = page.locator("#stage-timeline-settings-trigger");
const settingsPanel = page.locator("#stage-timeline-settings-panel");
await settingsTrigger.click();
await settingsPanel.waitFor({ state: "visible" });
assert.equal(await settingsTrigger.getAttribute("aria-expanded"), "true");
const settingsGeometry = await page.evaluate(() => {
  const trigger = document.getElementById("stage-timeline-settings-trigger").getBoundingClientRect();
  const panel = document.getElementById("stage-timeline-settings-panel").getBoundingClientRect();
  return {
    triggerWidth: trigger.width,
    triggerHeight: trigger.height,
    panelWidth: panel.width,
    panelRight: panel.right,
    viewportWidth: document.documentElement.clientWidth,
  };
});
assert.deepEqual(
  [settingsGeometry.triggerWidth, settingsGeometry.triggerHeight, settingsGeometry.panelWidth],
  [44, 44, 260],
);
assert.ok(settingsGeometry.panelRight <= settingsGeometry.viewportWidth + 0.5, "表示設定を画面右端からはみ出さない");
await page.screenshot({ path: path.join(outDir, "timeline-lane-settings-1440x1000.png"), fullPage: false });
const visibilityInputs = page.locator("[data-stage-timeline-row-visibility]");
assert.equal(await visibilityInputs.count(), 8);
assert.deepEqual(await visibilityInputs.evaluateAll((inputs) => inputs.map((input) => input.checked)), Array(8).fill(true));
const audioVisibility = page.locator('[data-stage-timeline-row-visibility][value="audio"]');
await audioVisibility.uncheck();
assert.equal(await audioRow.isHidden(), true);
assert.deepEqual(await timelineRowOrder(), initialRowOrder, "非表示にしてもレーン順を失わない");
const hiddenLaneState = JSON.parse(await page.evaluate(() => localStorage.getItem("shosai-stage-timeline-ui-v1")));
assert.equal(hiddenLaneState.rowVisibility.audio, false);
await page.keyboard.press("Escape");
assert.equal(await settingsPanel.isHidden(), true);
assert.equal(await settingsTrigger.getAttribute("aria-expanded"), "false");
await settingsTrigger.click();
assert.equal(await audioVisibility.isChecked(), false, "設定パネルを開き直しても非表示状態を保つ");
await audioVisibility.check();
assert.equal(await audioRow.isVisible(), true);
await page.locator("#stage-timeline-section").click();
assert.equal(await settingsPanel.isHidden(), true, "設定外を押すと閉じる");
const audioResizer = audioRow.locator(".stage-timeline-row-resize");
const audioHeightBefore = await audioRow.evaluate((node) => node.getBoundingClientRect().height);
const audioResizerBox = await audioResizer.boundingBox();
assert.ok(audioResizerBox);
await page.mouse.move(audioResizerBox.x + audioResizerBox.width / 2, audioResizerBox.y + audioResizerBox.height / 2);
await page.mouse.down();
await page.mouse.move(audioResizerBox.x + audioResizerBox.width / 2, audioResizerBox.y + audioResizerBox.height / 2 + 44);
await page.mouse.up();
const audioHeightExpanded = await audioRow.evaluate((node) => node.getBoundingClientRect().height);
assert.ok(audioHeightExpanded >= audioHeightBefore + 40, "行の下端をドラッグすると高さが広がる");
await audioResizer.focus();
await audioResizer.press("Home");
const audioHeightReset = await audioRow.evaluate((node) => node.getBoundingClientRect().height);
assert.equal(audioHeightReset, 40);

const audioHandle = audioRow.locator(".stage-timeline-row-handle");
const rulerRow = page.locator('[data-stage-timeline-row="ruler"]');
const audioHandleBox = await audioHandle.boundingBox();
const rulerBox = await rulerRow.boundingBox();
assert.ok(audioHandleBox && rulerBox);
await page.mouse.move(audioHandleBox.x + audioHandleBox.width / 2, audioHandleBox.y + audioHandleBox.height / 2);
await page.mouse.down();
await page.mouse.move(rulerBox.x + 8, rulerBox.y + 4, { steps: 4 });
await page.mouse.up();
const reorderedRows = await timelineRowOrder();
assert.deepEqual(reorderedRows.slice(0, 2), ["audio", "ruler"]);
const persistedCustomRows = JSON.parse(await page.evaluate(() => localStorage.getItem("shosai-stage-timeline-ui-v1")));
assert.deepEqual(persistedCustomRows.rowOrder.slice(0, 2), ["audio", "ruler"]);
await audioHandle.focus();
await audioHandle.press("ArrowDown");
assert.deepEqual(await timelineRowOrder(), ["ruler", "audio", "anchors", "scenes", "transitions", "light", "music", "dialogue"]);

const timeLabels = await page.locator("#stage-timeline-ruler .stage-timeline-tick span").allTextContents();
assert.ok(timeLabels.length > 2);
assert.ok(timeLabels.every((label) => /^\d+:\d{2}$/.test(label)), "時間目盛りへカウントを混ぜない");
await unitToggle.click();
await page.locator("#stage-timeline-unit-warning-modal").waitFor({ state: "visible" });
await page.locator("#stage-timeline-unit-warning-confirm").click();
assert.equal(await unitToggle.textContent(), "カウント式");
assert.equal(await unitToggle.getAttribute("aria-checked"), "true");
const countLabels = await page.locator("#stage-timeline-ruler .stage-timeline-tick span").allTextContents();
assert.ok(countLabels.length > 2);
assert.ok(countLabels.every((label) => /^\d+$/.test(label)), "カウント目盛りへ時刻を混ぜない");
await unitToggle.click();
await page.locator("#stage-timeline-unit-warning-modal").waitFor({ state: "visible" });
await page.locator("#stage-timeline-unit-warning-confirm").click();
assert.equal(await unitToggle.textContent(), "時間式");
assert.equal(await unitToggle.getAttribute("aria-checked"), "false");

const audioGainTrackId = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  const active = documentValue.project.scenes.find((scene) => scene.id === documentValue.project.activeSceneId);
  const track = { id: "timeline-browser-gain", title: "ゲイン確認音源", durationSeconds: 84.5, gainDb: 0 };
  documentValue.project.audioTracks = [track];
  active.audioTrackId = track.id;
  window.SHOSAI_STAGE_SESSION_BRIDGE.applyDocumentString(JSON.stringify(documentValue));
  return track.id;
});
await page.waitForFunction((trackId) => document.querySelector(`#stage-timeline-audio [data-track-id="${trackId}"]`), audioGainTrackId);
const audioBlock = page.locator(`#stage-timeline-audio [data-track-id="${audioGainTrackId}"]`);
await audioBlock.dblclick();
await page.locator("#stage-timeline-audio-detail-modal").waitFor({ state: "visible" });
assert.equal(await page.locator("#stage-timeline-audio-detail-name").textContent(), "ゲイン確認音源");
assert.equal(await page.locator("#stage-timeline-audio-detail-duration").textContent(), "1:24.5");
await page.locator("#stage-timeline-audio-gain-number").fill("6");
assert.equal(await page.locator("#stage-timeline-audio-gain-range").inputValue(), "6");
assert.equal(await page.locator("#stage-timeline-audio-gain-value").textContent(), "+6 dB");
await page.screenshot({ path: path.join(outDir, "timeline-audio-gain-1440x1000.png"), fullPage: false });
await page.locator("#stage-timeline-audio-detail-save").click();
const savedAudioGain = await page.evaluate((trackId) => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.audioTracks
    .find((track) => track.id === trackId).gainDb
), audioGainTrackId);
assert.equal(savedAudioGain, 6, "音源ごとのゲインをショーデータへ保存する");
await page.locator("#stage-undo").click();
const undoneAudioGain = await page.evaluate((trackId) => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.audioTracks
    .find((track) => track.id === trackId).gainDb
), audioGainTrackId);
assert.equal(undoneAudioGain, 0, "ゲイン保存は一度のUndoで戻る");

assert.equal(await page.locator("#stage-timeline-song-delete").isDisabled(), false, "ゲイン確認中は音源がある");
const silentSceneIds = await page.evaluate(() => {
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
assert.equal(silentSceneIds.length, 2);
await page.waitForTimeout(80);
assert.equal(await page.locator("#stage-timeline-song-delete").isDisabled(), true, "音源なしの見本を使う");
await page.locator("#stage-timeline-head").click();
const silentBefore = await page.locator("#stage-timeline-position").textContent();
await page.keyboard.press("Space");
await page.waitForTimeout(260);
const silentDuring = await page.locator("#stage-timeline-position").textContent();
const silentActiveScene = await page.evaluate(() => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.activeSceneId
));
assert.equal(await page.locator("#stage-timeline-play").getAttribute("aria-pressed"), "true");
assert.notEqual(silentDuring, silentBefore, "音源なしでも内部時計で再生位置が進む");
assert.equal(silentActiveScene, silentSceneIds[1], "セクション時間内の次の舞台シーンへ切り替える");
await page.keyboard.press("Space");
assert.equal(await page.locator("#stage-timeline-play").getAttribute("aria-pressed"), "false");
await page.locator("#stage-timeline-section-duration-number").focus();
await page.keyboard.press("Space");
assert.equal(await page.locator("#stage-timeline-play").getAttribute("aria-pressed"), "false",
  "数値入力中のSpaceでは再生しない");

await page.locator("#stage-timeline-head").click();
const transitionCountBefore = await page.locator("#stage-timeline-transitions .stage-timeline-transition-block").count();
await page.locator("#stage-timeline-add-transition").click();
assert.equal(await page.locator("#stage-timeline-transitions .stage-timeline-transition-block").count(), transitionCountBefore + 1);
const addedTransitionSeconds = await page.evaluate(() => {
  const project = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project;
  const sectionAt = project.scenes.findIndex((row) => row.kind === "section");
  return project.scenes.slice(sectionAt + 1).find((row) => row.kind === "scene").rehearsal.transitionToNextSeconds;
});
assert.equal(addedTransitionSeconds, 4, "転換の＋は再生位置のシーンへ4秒の転換を足す");
await page.locator("#stage-undo").click();
await page.waitForFunction((count) => (
  document.querySelectorAll("#stage-timeline-transitions .stage-timeline-transition-block").length === count
), transitionCountBefore);

const sceneCountBefore = await page.evaluate(() => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.scenes
    .filter((row) => row.kind === "scene").length
));
await page.locator("#stage-timeline-add-scene").click();
await page.waitForFunction((count) => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.scenes
    .filter((row) => row.kind === "scene").length === count + 1
), sceneCountBefore);
await page.locator("#stage-undo").click();
await page.waitForFunction((count) => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.scenes
    .filter((row) => row.kind === "scene").length === count
), sceneCountBefore);

await page.locator("#stage-timeline-head").click();
await page.locator("#stage-timeline-add-light-cue").click();
await page.locator("#stage-timeline-ruler").click({ position: { x: 160, y: 10 } });
await page.locator("#stage-timeline-add-light-cue").click();
await page.locator("#stage-timeline-add-music-cue").click();
await page.locator("#stage-timeline-add-dialogue-cue").click();
await page.locator("#stage-timeline-next").click();
await page.locator("#stage-timeline-add-light-cue").click();
const cueState = await page.evaluate(() => {
  const documentValue = JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
  return {
    saved: documentValue.project.cues.filter((cue) => cue.kind === "timeline")
      .map((cue) => ({ type: cue.cueType, sectionId: cue.sectionId, atSeconds: cue.atSeconds })),
    lanes: {
      light: document.querySelectorAll("#stage-timeline-light-cues .stage-timeline-cue").length,
      music: document.querySelectorAll("#stage-timeline-music-cues .stage-timeline-cue").length,
      dialogue: document.querySelectorAll("#stage-timeline-dialogue-cues .stage-timeline-cue").length,
    },
  };
});
assert.deepEqual(cueState.saved.map((cue) => cue.type), ["light", "light", "music", "dialogue", "light"]);
assert.ok(cueState.saved.every((cue) => cue.sectionId && cue.atSeconds >= 0));
assert.deepEqual(cueState.lanes, { light: 3, music: 1, dialogue: 1 });
assert.deepEqual(
  await page.locator("#stage-timeline-light-cues .stage-timeline-cue").allTextContents(),
  ["LXcue 1-1-1", "LXcue 1-1-2", "LXcue 1-2-1"],
);
assert.deepEqual(await page.locator("#stage-timeline-music-cues .stage-timeline-cue").allTextContents(), ["Mcue 1-1-1"]);
assert.deepEqual(await page.locator("#stage-timeline-dialogue-cues .stage-timeline-cue").allTextContents(), ["VOXcue 1-1-1"]);

await page.locator("#stage-timeline-light-cues .stage-timeline-cue").first().dblclick();
await page.locator("#stage-timeline-cue-detail-modal").waitFor({ state: "visible" });
assert.equal(await page.locator("#stage-timeline-cue-detail-title").textContent(), "LXcue 1-1-1");
assert.match(await page.locator("#stage-timeline-cue-detail-scene").textContent(), /^1-1\s+/);
await page.locator("#stage-timeline-cue-detail-note").fill("青へ転じる。次の台詞を待つ。 ");
await page.screenshot({ path: path.join(outDir, "timeline-cue-detail-1440x1000.png"), fullPage: false });
await page.locator("#stage-timeline-cue-detail-save").click();
assert.equal(await page.locator("#stage-timeline-cue-detail-modal").isHidden(), true);
const savedMemo = await page.evaluate(() => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.cues
    .find((cue) => cue.kind === "timeline" && cue.cueType === "light").memo
));
assert.equal(savedMemo, "青へ転じる。次の台詞を待つ。 ");

await page.locator("#stage-timeline-light-cues .stage-timeline-cue").nth(1).click();
await page.keyboard.press("Delete");
assert.equal(await page.locator("#stage-timeline-light-cues .stage-timeline-cue").count(), 2);
await page.locator("#stage-undo").click();
await page.waitForFunction(() => document.querySelectorAll("#stage-timeline-light-cues .stage-timeline-cue").length === 3);

await page.locator("#stage-timeline-music-cues .stage-timeline-cue").dblclick();
await page.locator("#stage-timeline-cue-detail-delete").click();
assert.equal(await page.locator("#stage-timeline-music-cues .stage-timeline-cue").count(), 0);
await page.locator("#stage-undo").click();
await page.waitForFunction(() => document.querySelectorAll("#stage-timeline-music-cues .stage-timeline-cue").length === 1);
const cueDeleteUndoCount = await page.evaluate(() => (
  JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.cues
    .filter((cue) => cue.kind === "timeline").length
));
assert.equal(cueDeleteUndoCount, 5);

const sceneBlocks = await page.locator("#stage-timeline-scenes .stage-timeline-scene").evaluateAll((nodes) => nodes.map((node) => {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return { left: rect.left, right: rect.right, overflow: style.overflow, whiteSpace: style.whiteSpace };
}));
assert.ok(sceneBlocks.length > 1);
for (let i = 0; i < sceneBlocks.length - 1; i += 1) {
  assert.ok(sceneBlocks[i].right <= sceneBlocks[i + 1].left + 0.5,
    `隣のシーン枠へ重ならない: ${JSON.stringify([sceneBlocks[i], sceneBlocks[i + 1]])}`);
}
assert.ok(sceneBlocks.every((block) => block.overflow === "hidden" && block.whiteSpace === "nowrap"));

// 狭幅時の横スクロールは、短い無音再生用セクションを通常の長さへ戻して確認する。
await page.locator("#stage-timeline-section-duration-number").evaluate((node) => {
  node.value = "30";
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.screenshot({ path: path.join(outDir, "timeline-controls-1440x1000.png"), fullPage: false });
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(160);
const narrowHeader = await headerPlacement();
assert.equal(narrowHeader.parentClass, "stage-brand-row");
assert.ok(narrowHeader.tabsLeft >= narrowHeader.titleRight, "1024pxでもモード切替は題の右に置く");
assert.ok(narrowHeader.bottomDelta <= 2, "1024pxでも題とモード切替の下端を揃える");
assert.equal(narrowHeader.overlapsCaution, false, "1024pxでも保存注意へ重ねない");
assert.equal(narrowHeader.overlapsActions, false, "1024pxでも右上操作へ重ねない");
const narrow = await page.evaluate(() => ({
  viewportWidth: document.documentElement.clientWidth,
  toolbarWidth: document.querySelector(".stage-timeline-toolbar").getBoundingClientRect().width,
  panelRight: document.querySelector("#stage-timeline-panel").getBoundingClientRect().right,
  panelHeight: document.querySelector("#stage-timeline-panel").getBoundingClientRect().height,
  horizontalScroll: document.querySelector("#stage-timeline-viewport").scrollWidth
    > document.querySelector("#stage-timeline-viewport").clientWidth,
}));
assert.ok(narrow.panelRight <= narrow.viewportWidth + 0.5);
assert.equal(narrow.panelHeight, 360);
assert.equal(narrow.horizontalScroll, true);
await settingsTrigger.click();
await settingsPanel.waitFor({ state: "visible" });
const narrowSettings = await page.evaluate(() => {
  const panel = document.getElementById("stage-timeline-settings-panel").getBoundingClientRect();
  return { left: panel.left, right: panel.right, width: panel.width, viewportWidth: document.documentElement.clientWidth };
});
assert.ok(narrowSettings.left >= -0.5 && narrowSettings.right <= narrowSettings.viewportWidth + 0.5,
  "1024px幅でも表示設定を左右にはみ出さない");
const dialogueVisibility = page.locator('[data-stage-timeline-row-visibility][value="dialogue"]');
await dialogueVisibility.uncheck();
assert.equal(await page.locator('[data-stage-timeline-row="dialogue"]').isHidden(), true,
  "スクロールした設定末尾からもレーンを隠せる");
await dialogueVisibility.check();
await settingsTrigger.click();
await page.screenshot({ path: path.join(outDir, "timeline-controls-1024x768.png"), fullPage: false });

await page.setViewportSize({ width: 1440, height: 1000 });
await page.locator("#stage-timeline-section-duration-number").evaluate((node) => {
  node.value = "300";
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
});
for (let index = 0; index < 12; index += 1) {
  await page.locator("#stage-timeline-zoom-out").click();
}
const widestTimeline = await page.evaluate(() => ({
  zoomTitle: document.getElementById("stage-timeline-zoom-out").title,
  zoomOutDisabled: document.getElementById("stage-timeline-zoom-out").disabled,
  surfaceWidth: document.getElementById("stage-timeline-surface").getBoundingClientRect().width,
  viewportWidth: document.getElementById("stage-timeline-viewport").clientWidth,
  horizontalScroll: document.getElementById("stage-timeline-viewport").scrollWidth
    > document.getElementById("stage-timeline-viewport").clientWidth,
}));
assert.match(widestTimeline.zoomTitle, /0\.05×/, "縮小側は0.05倍まで広げる");
assert.equal(widestTimeline.zoomOutDisabled, true, "最小倍率で縮小操作を止める");
assert.equal(widestTimeline.horizontalScroll, false, "300秒を1440px画面で全体表示できる");
await page.screenshot({ path: path.join(outDir, "timeline-controls-zoom-out-1440x1000.png"), fullPage: false });

assert.deepEqual(errors, []);
assert.deepEqual(missingResources.filter((url) => (
  /\.(?:html?|css|m?js)(?:[?#]|$)/i.test(url) && !/\/stage-shows\.local\.js(?:[?#]|$)/.test(url)
)), []);
const result = {
  url: baseUrl,
  checkedAt: new Date().toISOString(),
  normalPanels,
  firstTimelinePanels,
  defaultModeLayouts,
  unitLabels,
  sectionDuration: {
    order: sectionDurationOrder,
    before: durationBefore,
    unlimited: unlimitedDuration,
    direct: directDuration,
    drag: dragDuration,
    undo: undoDuration,
    redo: redoDuration,
  },
  laneLayout: {
    initialOrder: initialRowOrder,
    reordered: reorderedRows,
    audioHeightBefore,
    audioHeightExpanded,
    audioHeightReset,
  },
  laneVisibility: {
    inputCount: await visibilityInputs.count(),
    hiddenStored: hiddenLaneState.rowVisibility.audio,
    settingsGeometry,
  },
  fullscreenControl,
  wideHeader,
  narrowHeader,
  timeLabelCount: timeLabels.length,
  countLabelCount: countLabels.length,
  silentPlayback: { before: silentBefore, during: silentDuring, sceneIds: silentSceneIds, activeScene: silentActiveScene },
  audioGain: { trackId: audioGainTrackId, saved: savedAudioGain, undone: undoneAudioGain },
  cues: { ...cueState, savedMemo, deleteUndoCount: cueDeleteUndoCount },
  addedTransitionSeconds,
  sceneCountBefore,
  sceneBlockCount: sceneBlocks.length,
  menuState,
  headerVolume,
  rowAddControls,
  iconControls,
  zoom: { before: zoomBefore, after: zoomAfter, reset: zoomReset, widestTimeline },
  expandedHeight,
  narrow,
  narrowSettings,
  errors,
  missingResources,
};
await writeFile(path.join(outDir, "timeline-controls-browser-check.json"), `${JSON.stringify(result, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(result, null, 2));
