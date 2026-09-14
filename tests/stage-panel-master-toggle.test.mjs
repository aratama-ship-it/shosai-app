import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("設定の隣にパネル別ON/OFF一覧の入口を置く", () => {
  const prefsAt = html.indexOf('id="stage-prefs-btn"');
  const panelsAt = html.indexOf('id="stage-panels-toggle"');
  const presentAt = html.indexOf('id="stage-present-btn"');
  assert.ok(prefsAt > 0 && prefsAt < panelsAt && panelsAt < presentAt);
  assert.match(html, /id="stage-panels-toggle"[\s\S]*?aria-label="パネルのオン\/オフ"[\s\S]*?aria-haspopup="true" aria-expanded="false" aria-controls="stage-panels-menu"/);
  assert.match(html, /id="stage-panels-toggle"[\s\S]*?<svg viewBox="0 0 16 16"/);
  assert.match(html, /id="stage-panels-menu"[\s\S]*?role="group" aria-label="パネルのオン\/オフ" hidden/);
});

test("パネル一覧は環境設定から外し、上部の専用メニューだけで切り替える", () => {
  const renderMenu = source.match(/function renderPanelVisibilityMenu\(\) \{[\s\S]*?\n  }/)?.[0] || "";
  const renderPrefs = source.match(/function renderPrefs\(\) \{[\s\S]*?\n  }/)?.[0] || "";
  for (const [key, panel, label] of [
    ["panelProject", "project", "ショー"],
    ["panelMusic", "music", "音楽"],
    ["panelCast", "cast", "出るもの"],
    ["panelMachinery", "machinery", "舞台機構"],
    ["panelRigs", "rigs", "セット登録"],
    ["panelLight", "light", "照明"],
    ["panelBackground", "background", "背景"],
    ["panelScenes", "scenes", "シーン"],
    ["panelInspector", "inspector", "選んだもの"],
    ["panelAsk", "ask", "AI指示"],
  ]) {
    assert.match(source, new RegExp(`key: "${key}", panel: "${panel}", label: "${label}"`));
  }
  assert.match(source, /key: "panelLight", panel: "light", label: "照明", def: false/);
  assert.match(renderMenu, /PANEL_FEATURES\.filter\(\(f\) => panelEl\(f\.panel\)\)\.forEach/);
  assert.doesNotMatch(renderPrefs, /PANEL_FEATURES|パネルのオン\/オフ/);
  assert.match(renderMenu, /box\.checked = featureOn\(f\.key\)/);
  assert.match(renderMenu, /prefs\[f\.key\] = box\.checked/);
  assert.match(renderMenu, /savePrefs\(\)[\s\S]*?applyFeatureFlags\(\)/);
  assert.doesNotMatch(source, /panelColumnsVisible|stage-panels-hidden|togglePanelColumns/);
  assert.doesNotMatch(css, /stage-panels-hidden/);
});

test("ゲスト・iPad・スマホは専用UIを正本にして端末のパネル設定で隠さない", () => {
  const applyVisibility = source.match(/function applyPanelVisibility\(\) \{[\s\S]*?\n  }/)?.[0] || "";
  assert.match(applyVisibility, /!tabletUi && !phoneViewerActive[\s\S]*?!document\.body\.classList\.contains\("stage-session-guest"\)/);
  assert.match(applyVisibility, /el\.hidden = deskUi \? !featureOn\(f\.key\) : false/);
});

test("一覧は開閉状態・外側クリック・Escを扱い、PCでだけ表示する", () => {
  assert.match(source, /function togglePanelVisibilityMenu\(\)[\s\S]*?renderPanelVisibilityMenu\(\)[\s\S]*?aria-expanded", "true"/);
  assert.match(source, /function closePanelVisibilityMenu\(returnFocus = false\)[\s\S]*?aria-expanded", "false"[\s\S]*?if \(returnFocus\) els\.panelsToggle\.focus\(\)/);
  assert.match(source, /document\.addEventListener\("pointerdown"[\s\S]*?!els\.panelsMenu\.contains\(event\.target\)[\s\S]*?closePanelVisibilityMenu\(\)/);
  assert.match(source, /event\.key === "Escape"[\s\S]*?closePanelVisibilityMenu\(true\)/);
  assert.match(css, /\.stage-panel-visibility-menu \{[\s\S]*?position: absolute;[\s\S]*?width: 260px;/);
  assert.match(css, /\.stage-panel-visibility-menu \{[\s\S]*?max-height: calc\(100vh - 120px\);[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.stage-panel-visibility-item \{[\s\S]*?min-height: 44px;/);
  assert.match(css, /html\.stage-pwa-tablet \.stage-panel-visibility-control,[\s\S]*?body\.stage-session-guest \.stage-panel-visibility-control \{ display: none; \}/);
});

test("正本・PWAキャッシュの版を更新する", async () => {
  const sw = await readFile(new URL("../stage-sw.js", import.meta.url), "utf8");
  assert.match(html, /style\.css\?v=363/);
  assert.match(html, /stage-sketch\.js\?v=478/);
  assert.match(html, /stage-i18n\.js\?v=175/);
  assert.match(sw, /stage-sketch-pwa-v482/);
  assert.match(sw, /style\.css\?v=363/);
  assert.match(sw, /stage-sketch\.js\?v=478/);
  assert.match(sw, /stage-i18n\.js\?v=175/);
});
