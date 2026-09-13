import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [indexHtml, stageHtml, style, serviceWorker, aiPage] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("stage.html", root), "utf8"),
  readFile(new URL("style.css", root), "utf8"),
  readFile(new URL("stage-sw.js", root), "utf8"),
  readFile(new URL("public/ai-json/index.html", root), "utf8"),
]);

const aiLink = /id="stage-feedback-open"[^>]*>[^<]*<\/button>\s*<a class="stage-lang stage-ai-link" id="stage-ai-showwright-link"[\s\S]*?href="https:\/\/aratama-ship-it\.github\.io\/shosai-app\/public\/ai-json\/"[\s\S]*?target="_blank" rel="noopener noreferrer"[\s\S]*?aria-label="AI showwright for StageSketch β"[\s\S]*?>AI<\/a>/;

test("AI showwrightへの入口は正本と単独ページの感想ボタン直後に残る", () => {
  assert.match(indexHtml, aiLink);
  assert.match(stageHtml, aiLink);
});

test("AI入口の正方形表示とPWA配布版が揃う", () => {
  assert.match(style, /\.stage-history-actions \.stage-ai-link \{[\s\S]*?width: var\(--stage-history-action-height\);[\s\S]*?height: var\(--stage-history-action-height\);/);
  for (const page of [indexHtml, stageHtml]) assert.ok(page.includes("style.css?v=343"));
  assert.ok(serviceWorker.includes("./style.css?v=343"));
  assert.match(serviceWorker, /stage-sketch-pwa-v438/);
});

test("リンク先はAI showwrightとStageSketchのβ表示を持つ", () => {
  assert.ok(aiPage.includes("AI showwright β"));
  assert.ok(aiPage.includes("StageSketch β"));
});
