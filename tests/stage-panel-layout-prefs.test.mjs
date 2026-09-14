import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const english = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const hans = await readFile(new URL("../stage-i18n.zh-Hans.js", import.meta.url), "utf8");
const hant = await readFile(new URL("../stage-i18n.zh-Hant.js", import.meta.url), "utf8");

test("パネル表示は1列用の順番を2列のショー配置から分離する", () => {
  assert.match(source, /const panelLayoutMode = \(workspace = currentWorkspaceMode\(\)\) =>/);
  assert.match(source, /prefs\.panelLayoutByWorkspace\[workspace\]/);
  assert.match(source, /workspace === "normal"[\s\S]*?prefs\.panelLayoutMode/);
  assert.match(source, /const panelSingleSide = \(workspace = currentWorkspaceMode\(\)\) =>/);
  assert.match(source, /prefs\.panelSingleSideByWorkspace\[workspace\]/);
  assert.match(source, /return prefs\.panelSingleSide === "right" \? "right" : "left"/);
  assert.match(source, /const panelSingleOrder = \(\) => \([\s\S]*?prefs\.panelSingleOrder/);
  assert.match(source, /if \(panelLayoutMode\(\) === "single"\) \{[\s\S]*?prefs\.panelSingleOrder = next;[\s\S]*?savePrefs\(\);/);
  assert.match(source, /const oneColumnOrder = panelSingleOrder\(\);/);
  assert.match(source, /stage-panels-single/);
});

test("環境設定は各編集モードごとに2列・1列左・1列右を一つの選択肢で扱う", () => {
  assert.match(source, /function panelLayoutPrefsGroup\(\)/);
  assert.match(source, /const workspaceModeDefinitions = \(\) =>/);
  assert.match(source, /"パネルの表示スタイル", hintText/);
  assert.match(source, /definitions\.forEach\(\(definition\) =>/);
  assert.match(source, /select\.dataset\.stageWorkspacePanelLayout = definition\.key/);
  assert.match(source, /prefs\.panelLayoutByWorkspace =/);
  assert.match(source, /\["split", "2列表示"\], \["single-left", "1列・左"\], \["single-right", "1列・右"\]/);
  assert.match(source, /prefs\.panelSingleSideByWorkspace =/);
  assert.doesNotMatch(source, /prefSelectRow\(\s*"1列の位置"/);
  assert.doesNotMatch(source, /function prefTabletModeRow\(\)/);
  assert.match(source, /definition\.key === "normal" && next === "ipad"/);
  assert.match(source, /prefs\.tabletMode = true;/);
  assert.match(source, /window\.setTimeout\(\(\) => window\.location\.reload\(\), 80\)/);
});

test("iPad表示モードは起動時に既存のiPadワークスペースを選ぶ", () => {
  assert.match(source, /bootPrefs\.tabletMode === true/);
  assert.match(source, /classList\.toggle\("stage-pwa-tablet", tabletPwaActive\)/);
  assert.match(source, /function initTabletPwaWorkspace\(\) \{[\s\S]*?if \(!tabletPwaActive \|\| tabletUi\) return;/);
});

test("1列は空の反対列を残さず、既存のiPadドロワーをそのまま使う", () => {
  assert.match(css, /\.stage-sketch-grid\.stage-panels-single:not\(\.stage-panels-on-right\) \{[\s\S]*?grid-template-areas: "tools board";/);
  assert.match(css, /\.stage-sketch-grid\.stage-panels-single\.stage-panels-on-right \{[\s\S]*?grid-template-areas: "board inspector";/);
  assert.match(css, /html\.stage-pwa-tablet \.stage-sketch-grid\.is-tablet-drawer-open/);
  assert.match(css, /html\.stage-pwa-tablet \.stage-tablet-rail-button \{[\s\S]*?min-height: 48px;/);
});

test("新しい設定文は日本語・英語・中国語の辞書にある", () => {
  for (const dictionary of [english, hans, hant]) {
    assert.match(dictionary, /"パネルの表示スタイル"/);
    assert.match(dictionary, /"iPad表示モード"/);
    assert.match(dictionary, /"2列表示"/);
    assert.match(dictionary, /"1列・左"/);
    assert.match(dictionary, /"1列・右"/);
  }
});
