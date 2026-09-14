import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [html, css, serviceWorker] = await Promise.all([
  readFile(new URL("stage.html", root), "utf8"),
  readFile(new URL("style.css", root), "utf8"),
  readFile(new URL("stage-sw.js", root), "utf8"),
]);

test("設定とパネル設定は44pxの正方形でアイコンを22pxにする", () => {
  assert.match(css, /button:is\(\.stage-gear-btn, \.stage-panel-visibility-btn\) \{[\s\S]*?--stage-header-icon-hit-size: var\(--stage-history-action-height\);[\s\S]*?--stage-header-icon-size: 22px;[\s\S]*?flex: 0 0 var\(--stage-header-icon-hit-size\);[\s\S]*?width: var\(--stage-header-icon-hit-size\);[\s\S]*?height: var\(--stage-header-icon-hit-size\);[\s\S]*?min-height: var\(--stage-header-icon-hit-size\);/);
  assert.match(css, /\.stage-gear-btn svg,[\s\S]*?\.stage-panel-visibility-btn svg \{[\s\S]*?width: var\(--stage-header-icon-size\);[\s\S]*?height: var\(--stage-header-icon-size\);/);
});

test("新しいCSS版を画面とPWAキャッシュで一致させる", () => {
  assert.match(html, /style\.css\?v=363/);
  assert.match(serviceWorker, /stage-sketch-pwa-v480/);
  assert.match(serviceWorker, /style\.css\?v=363/);
});
