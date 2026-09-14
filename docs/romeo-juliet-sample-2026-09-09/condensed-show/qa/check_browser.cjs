const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const here = __dirname;
const base = process.env.RJ_SAMPLE_BASE_URL || "http://127.0.0.1:18743";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", e => pageErrors.push(String(e)));
    page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
    const response = await page.goto(`${base}/condensed-show/?v=2`, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) throw new Error(`HTTP ${response?.status()}`);
    const body = await page.locator("body").innerText();
    for (const marker of ["5場面案を", "3場面へ統合", "1を残し、2・3・4を一つにまとめ、5を終幕として残す", "二人の約束から、届かない手紙へ", "人の川"]) {
      if (!body.includes(marker)) throw new Error(`Missing marker: ${marker}`);
    }
    if (await page.locator("article.scene").count() !== 3) throw new Error("Expected three scenes.");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${viewport.width}px.`);
    if (pageErrors.length || consoleErrors.length) throw new Error(pageErrors.concat(consoleErrors).join(" | "));
    await page.screenshot({ path: path.join(here, `overview-${viewport.width}.png`), fullPage: false });
    await page.locator("#RJ-COND-02").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(here, `scene-02-${viewport.width}.png`), fullPage: false });
    results.push({ viewport, status: response.status(), sceneCount: 3, horizontalOverflow: false, pageErrors, consoleErrors });
    await page.close();
  }
  const context = await browser.newContext();
  const outlineResponse = await context.request.get(`${base}/condensed-show/outline.json`);
  if (!outlineResponse.ok()) throw new Error(`Outline HTTP ${outlineResponse.status()}`);
  const outline = await outlineResponse.json();
  const sources = outline.scenes.flatMap(scene => scene.sourceScenes);
  if (outline.proposedSceneCount !== 3 || JSON.stringify(sources) !== JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12])) {
    throw new Error("Source scene coverage is invalid.");
  }
  if (JSON.stringify(outline.scenes.map(s => s.previousScenes)) !== JSON.stringify([[1],[2,3,4],[5]])) throw new Error("Previous-scene grouping is invalid.");
  if (outline.scenes.flatMap(s => s.internalCues).length !== 19) throw new Error("Internal cues were lost.");
  await context.close();
  await browser.close();
  const report = { checkedAt: "2026-09-09", baseUrl: base, results, sourceCoverage: sources, proposalStatus: outline.status };
  fs.writeFileSync(path.join(here, "browser-checks.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
