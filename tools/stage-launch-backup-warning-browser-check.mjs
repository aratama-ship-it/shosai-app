import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.STUDY_PLAYWRIGHT
  || "/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium } = require(playwrightPath);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "docs/ui-launch-backup-warning-2026-09-13");
const baseUrl = process.env.STAGE_URL || "http://127.0.0.1:8943/stage.html";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function stagePage(viewport, user, status = 200) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
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
  await page.route("**/whoami", (route) => route.fulfill({
    status,
    contentType: "application/json",
    body: status === 200 ? JSON.stringify({ user }) : JSON.stringify({ error: "fixture" }),
  }));
  return { context, page };
}

const regular = await stagePage({ width: 1440, height: 900 }, "guest2");
await regular.page.goto(baseUrl, { waitUntil: "networkidle" });
const modal = regular.page.locator("#stage-launch-backup-warning");
await modal.waitFor({ state: "visible" });
assert.equal(await regular.page.locator("#stage-tour").isVisible(), false, "初回案内より先に出す");
assert.equal(await regular.page.locator("#view-stage").getAttribute("inert"), "", "背後を操作不可にする");
assert.equal(await regular.page.evaluate(() => document.activeElement?.id), "stage-launch-backup-export");

const desktop = await regular.page.evaluate(() => {
  const warning = document.querySelector("#stage-launch-backup-warning");
  const rect = warning.getBoundingClientRect();
  const style = getComputedStyle(warning);
  return {
    title: document.querySelector("#stage-launch-backup-title")?.textContent.trim(),
    lead: document.querySelector("#stage-launch-backup-lead")?.textContent.trim(),
    role: warning.getAttribute("role"),
    ariaModal: warning.getAttribute("aria-modal"),
    width: rect.width,
    height: rect.height,
    top: rect.top,
    bottom: rect.bottom,
    borderWidth: style.borderTopWidth,
    borderColor: style.borderTopColor,
    exportHeight: document.querySelector("#stage-launch-backup-export").getBoundingClientRect().height,
    continueHeight: document.querySelector("#stage-launch-backup-continue").getBoundingClientRect().height,
    closeWidth: document.querySelector("#stage-launch-backup-close").getBoundingClientRect().width,
    closeHeight: document.querySelector("#stage-launch-backup-close").getBoundingClientRect().height,
  };
});
assert.equal(desktop.title, "保存データの控えを取ってください");
assert.equal(desktop.lead, "舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。");
assert.equal(desktop.role, "dialog");
assert.equal(desktop.ariaModal, "true");
assert.ok(desktop.width <= 560 && desktop.width > 500);
assert.ok(desktop.top >= 24 && desktop.bottom <= 876);
assert.equal(desktop.borderWidth, "2px");
assert.equal(desktop.borderColor, "rgb(230, 107, 101)");
assert.ok(desktop.exportHeight >= 44 && desktop.continueHeight >= 44);
assert.ok(desktop.closeWidth >= 44 && desktop.closeHeight >= 44);

await regular.page.keyboard.press("Escape");
assert.equal(await modal.isVisible(), true, "Escapeでは消さない");
await regular.page.screenshot({ path: path.join(outDir, "launch-warning-desktop-1440x900.png") });
await regular.page.locator("#stage-launch-backup-close").click();
assert.equal(await modal.isVisible(), false, "右上の×で閉じる");
assert.equal(await regular.page.locator("#view-stage").getAttribute("inert"), null);
await regular.page.reload({ waitUntil: "networkidle" });
assert.equal(await modal.isVisible(), true, "再読み込みでも毎回出す");
await regular.page.locator("#stage-launch-backup-backdrop").click({ position: { x: 5, y: 5 } });
assert.equal(await modal.isVisible(), false, "ポップアップ外側で閉じる");
await regular.page.reload({ waitUntil: "networkidle" });
assert.equal(await modal.isVisible(), true, "外側で閉じた後も再読み込みでは出す");
await regular.page.locator("#stage-launch-backup-export").click();
await regular.page.locator("#stage-project-export-modal").waitFor({ state: "visible" });
assert.equal(await modal.isVisible(), false);
assert.equal(
  await regular.page.locator("#stage-project-export-name").evaluate((element) => element === document.activeElement),
  true,
);
await regular.context.close();

const mobile = await stagePage({ width: 390, height: 844 }, "arata");
await mobile.page.goto(baseUrl, { waitUntil: "networkidle" });
await mobile.page.locator("#stage-launch-backup-warning").waitFor({ state: "visible" });
const mobileGeometry = await mobile.page.evaluate(() => {
  const warning = document.querySelector("#stage-launch-backup-warning").getBoundingClientRect();
  const first = document.querySelector("#stage-launch-backup-export").getBoundingClientRect();
  const second = document.querySelector("#stage-launch-backup-continue").getBoundingClientRect();
  return {
    left: warning.left, right: warning.right, top: warning.top, bottom: warning.bottom,
    firstWidth: first.width, secondWidth: second.width,
    firstTop: first.top, secondTop: second.top,
    closeWidth: document.querySelector("#stage-launch-backup-close").getBoundingClientRect().width,
    closeHeight: document.querySelector("#stage-launch-backup-close").getBoundingClientRect().height,
  };
});
assert.ok(mobileGeometry.left >= 16 && mobileGeometry.right <= 374);
assert.ok(mobileGeometry.top >= 24 && mobileGeometry.bottom <= 820);
assert.ok(Math.abs(mobileGeometry.firstWidth - mobileGeometry.secondWidth) < 1);
assert.ok(mobileGeometry.secondTop > mobileGeometry.firstTop);
assert.ok(mobileGeometry.closeWidth >= 44 && mobileGeometry.closeHeight >= 44);
await mobile.page.screenshot({ path: path.join(outDir, "launch-warning-mobile-390x844.png") });
await mobile.context.close();

const exempt = await stagePage({ width: 1440, height: 900 }, "guest1");
await exempt.page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(await exempt.page.locator("#stage-launch-backup-warning").isVisible(), false, "guest1だけ除外");
assert.equal(await exempt.page.locator("#view-stage").getAttribute("inert"), null);
await exempt.context.close();

const unknown = await stagePage({ width: 1440, height: 900 }, "", 500);
await unknown.page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(await unknown.page.locator("#stage-launch-backup-warning").isVisible(), true, "本人不明でも表示");
await unknown.context.close();

assert.deepEqual(errors, []);
const result = {
  url: baseUrl,
  checkedAt: new Date().toISOString(),
  regularUser: {
    warningShownFirst: true,
    shownAgainAfterReload: true,
    escapeCannotDismiss: true,
    closeButtonDismisses: true,
    backdropDismisses: true,
    exportOpensExistingProjectExport: true,
    desktop,
  },
  mobile: mobileGeometry,
  guest1Exempt: true,
  unknownIdentityWarned: true,
  errors,
};
await writeFile(path.join(outDir, "browser-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
