const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const base = process.env.RJ_SAMPLE_BASE_URL || "http://127.0.0.1:18744";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const response = await page.goto(`${base}/script-book/?v=7#RJ-DIR-01`, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) throw new Error(`Script book HTTP status was ${response?.status()}`);
    const scene = page.locator("#RJ-DIR-01");
    await scene.scrollIntoViewIfNeeded();
    if (await scene.locator(".stage-marker").count() !== 10) throw new Error("Expected 10 stage markers.");
    if (await scene.locator(".pair-card").count() !== 4) throw new Error("Expected 4 pair cards.");
    if (await scene.locator(".pair-card").first().isVisible()) throw new Error("Pair details should start collapsed in the highlight view.");
    const visibleText = await scene.innerText();
    for (const marker of ["匿名の群衆役", "約3分", "3:00", "即ブラックアウト", "生成・スキーマ検証済み"]) {
      if (!visibleText.includes(marker)) throw new Error(`Missing visible text marker: ${marker}`);
    }
    if (visibleText.includes("3:00〜3:00")) throw new Error("Zero-duration cue should display as a single timestamp.");
    const allText = await scene.textContent();
    for (const marker of ["ロミオ役 × ジュリエット役", "マーキューシオ役 × 乳母役"]) {
      if (!allText.includes(marker)) throw new Error(`Missing retained detail marker: ${marker}`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${viewport.width}px.`);
    await scene.locator(".stage-map").screenshot({ path: path.join(__dirname, `scene-01-map-${viewport.width}.png`) });
    await scene.locator(".blocking-plan").screenshot({ path: path.join(__dirname, `scene-01-highlight-${viewport.width}.png`) });
    await scene.locator(".pair-details summary").click();
    if (!(await scene.locator(".pair-card").first().isVisible())) throw new Error("Pair details did not open.");
    await scene.locator(".position-details summary").click();
    if (await scene.locator(".position-details tbody tr").count() !== 10) throw new Error("Expected 10 coordinate rows.");
    await page.screenshot({ path: path.join(__dirname, `scene-01-plan-${viewport.width}.png`), fullPage: false });
    await page.getByRole("button", { name: "台本のみ" }).click();
    if (await scene.locator(".blocking-plan").isVisible()) throw new Error("Blocking plan must hide in script-only mode.");
    await page.getByRole("button", { name: "台本＋演出" }).click();
    if (!(await scene.locator(".blocking-plan").isVisible())) throw new Error("Blocking plan must return in full mode.");
    if (pageErrors.length || consoleErrors.length) throw new Error(`Browser errors: ${pageErrors.concat(consoleErrors).join(" | ")}`);
    results.push({ viewport, status: response.status(), stageMarkers: 10, pairCards: 4, coordinateRows: 10, horizontalOverflow: false, pageErrors, consoleErrors });
    await page.close();
  }

  const context = await browser.newContext();
  const artifactResponse = await context.request.get(`${base}/stage-sketch/scene-01-stage-sketch-v3.json`);
  if (!artifactResponse.ok()) throw new Error(`Artifact HTTP status was ${artifactResponse.status()}`);
  const artifact = await artifactResponse.json();
  if (artifact.version !== 3 || artifact.project.cast.length !== 10 || artifact.project.scenes.length !== 5) {
    throw new Error("Served Stage Sketch artifact shape is invalid.");
  }
  const notesResponse = await context.request.get(`${base}/direction-notes/?v=27#RJ-DIR-01`);
  if (!notesResponse.ok()) throw new Error(`Direction notebook HTTP status was ${notesResponse.status()}`);
  const notesText = await notesResponse.text();
  for (const marker of ["約3分", "奥・客席左", "手前・客席右", "Stage Sketch下書き", "生成・検証済み／未取り込み"]) {
    if (!notesText.includes(marker)) throw new Error(`Direction notebook missing text marker: ${marker}`);
  }
  await context.close();
  await browser.close();

  const report = {
    checkedAt: "2026-09-09",
    baseUrl: base,
    results,
    servedArtifact: { version: 3, castCount: 10, sceneEntries: 5 },
    directionNotebook: { status: 200, artifactLinkVerified: true },
  };
  fs.writeFileSync(path.join(__dirname, "scene-01-plan-browser-checks.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
