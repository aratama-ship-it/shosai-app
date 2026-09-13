import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("iPad上部の設定と全画面はフォント依存でないSVGを表示する", () => {
  assert.match(html, /id="stage-prefs-btn"[\s\S]*?<svg viewBox="0 0 16 16"/);
  assert.match(html, /id="stage-present-btn"[\s\S]*?<svg viewBox="0 0 16 16"/);
  assert.match(css, /:is\(\.stage-gear-btn, #stage-present-btn, \.stage-export-icon\)::before \{ content: none; \}/);
  assert.match(css, /:is\(\.stage-gear-btn, #stage-present-btn, \.stage-export-icon\) svg \{[\s\S]*?display: block;[\s\S]*?width: 20px;[\s\S]*?height: 20px;/);
});

test("PCの全画面操作も周囲と同じ寸法のアイコンだけにする", () => {
  const button = html.match(/<button[^>]*id="stage-present-btn"[\s\S]*?<\/button>/)?.[0] || "";
  assert.match(button, /class="[^"]*stage-present-icon[^"]*"/);
  assert.match(button, /aria-label="全画面"/);
  assert.match(button, /<svg viewBox="0 0 16 16"/);
  assert.doesNotMatch(button, />全画面</);
  assert.match(css, /\.stage-history-actions \.stage-present-icon \{[\s\S]*?--stage-present-hit-size: var\(--stage-history-action-height\);[\s\S]*?width: var\(--stage-present-hit-size\);[\s\S]*?height: var\(--stage-present-hit-size\);/);
  assert.match(css, /\.stage-present-icon svg \{[\s\S]*?width: var\(--stage-present-icon-size\);[\s\S]*?height: var\(--stage-present-icon-size\);/);
});

test("iPad上部は共有だけを入口にして演者用リンクを重複表示しない", () => {
  assert.match(html, /id="stage-share-open" data-tablet-icon="共"/);
  assert.doesNotMatch(html, /id="stage-viewer-link-open"/);
});

test("環境設定の配置リセットはショー内容を消さずレイアウト項目だけを戻す", () => {
  assert.match(html, /id="stage-reset-layout"/);
  assert.match(source, /function resetPanelLayoutToDistributionDefault\(\) \{[\s\S]*?state\.layout = defaultLayout\(\);/);
  assert.match(source, /\["panelLayoutMode", "panelLayoutByWorkspace", "panelSingleSide", "panelSingleSideByWorkspace", "panelSingleOrder", "panelWidths", "rosterListHeights", "tabletMode"\]/);
  assert.match(source, /if \(els\.resetLayout\) els\.resetLayout\.addEventListener\("click", resetPanelLayoutToDistributionDefault\);/);
  const body = source.match(/function resetPanelLayoutToDistributionDefault\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert.doesNotMatch(body, /localStorage\.clear|removeItem|state\.project\s*=/);
  assert.match(body, /savePrefs\(\);[\s\S]*?persistSoon\(\);/);
});
