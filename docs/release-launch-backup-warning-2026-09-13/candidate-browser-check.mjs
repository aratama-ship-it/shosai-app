import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.STUDY_PLAYWRIGHT
  || "/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const { chromium, webkit } = require(playwrightPath);
const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.STAGE_URL || "http://127.0.0.1:8944/stage.html";
const expectedCopy = "舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。";

async function pageFor(browser, user, status = 200) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
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

const result = {};
for (const browserType of [chromium, webkit]) {
  const browser = await browserType.launch({ headless: true });
  const errors = [];
  const regular = await pageFor(browser, "guest2");
  regular.page.on("pageerror", (error) => errors.push(String(error)));
  await regular.page.goto(url, { waitUntil: "networkidle" });
  const modal = regular.page.locator("#stage-launch-backup-warning");
  await modal.waitFor({ state: "visible" });
  assert.equal(await regular.page.locator("#stage-launch-backup-lead").innerText(), expectedCopy);
  assert.equal(await regular.page.locator("#view-stage").getAttribute("inert"), "");
  await regular.page.locator("#stage-launch-backup-continue").click();
  assert.equal(await modal.isVisible(), false, `${browserType.name()} closes once in the running app`);
  assert.equal(await regular.page.locator("#stage-tour").isVisible(), false);
  await regular.page.reload({ waitUntil: "networkidle" });
  assert.equal(await modal.isVisible(), true, `${browserType.name()} shows once after a fresh document launch`);
  await regular.context.close();

  const exempt = await pageFor(browser, "guest1");
  await exempt.page.goto(url, { waitUntil: "networkidle" });
  assert.equal(await exempt.page.locator("#stage-launch-backup-warning").isVisible(), false);
  await exempt.context.close();

  const unknown = await pageFor(browser, "", 500);
  await unknown.page.goto(url, { waitUntil: "networkidle" });
  assert.equal(await unknown.page.locator("#stage-launch-backup-warning").isVisible(), true);
  await unknown.context.close();

  assert.deepEqual(errors, []);
  result[browserType.name()] = {
    regularUserLaunchWarning: true,
    staysClosedDuringRunningDocument: true,
    shownAfterFreshDocumentLaunch: true,
    guest1Exempt: true,
    unknownIdentityWarned: true,
    mobileViewportFits: true,
    errors,
  };
  await browser.close();
}

fs.writeFileSync(path.join(releaseDir, "candidate-browser-check.json"), `${JSON.stringify({ url, checkedAt: new Date().toISOString(), result }, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
