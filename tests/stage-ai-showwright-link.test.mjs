import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const stage = await readFile(new URL("stage.html", root), "utf8");
const css = await readFile(new URL("style.css", root), "utf8");
const serviceWorker = await readFile(new URL("stage-sw.js", root), "utf8");

test("AI showwrightへの入口は感想ボタンの隣から新しいタブで開く", () => {
  const feedbackAt = stage.indexOf('id="stage-feedback-open"');
  const aiAt = stage.indexOf('id="stage-ai-showwright-link"');
  const prefsAt = stage.indexOf('id="stage-prefs-btn"');

  assert.ok(feedbackAt >= 0);
  assert.ok(aiAt > feedbackAt);
  assert.ok(prefsAt > aiAt);
  assert.match(stage, /<a class="stage-lang stage-ai-link" id="stage-ai-showwright-link"[\s\S]*?href="https:\/\/aratama-ship-it\.github\.io\/shosai-app\/public\/ai-json\/"[\s\S]*?target="_blank" rel="noopener noreferrer"[\s\S]*?>AI<\/a>/);
});

test("AIリンクは既存ヘッダーとタブレットの操作寸法を使う", () => {
  assert.match(css, /\.stage-history-actions \.stage-ai-link \{[\s\S]*?display: inline-flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/);
  assert.match(css, /html\.stage-pwa-tablet \.stage-tablet-top-controls \.stage-ai-link \{[\s\S]*?width: 44px;[\s\S]*?min-height: 44px;/);
  assert.match(stage, /style\.css\?v=363/);
  assert.match(serviceWorker, /stage-sketch-pwa-v481/);
  assert.match(serviceWorker, /\.\/style\.css\?v=363/);
});
