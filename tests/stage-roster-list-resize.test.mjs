import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("stage.html", root), "utf8");
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const css = await readFile(new URL("style.css", root), "utf8");

test("演者・舞台セット・小道具の一覧はそれぞれ高さ変更用の取っ手を持つ", () => {
  for (const [key, id, label] of [
    ["cast", "stage-cast-list", "演者"],
    ["set", "stage-set-list", "大道具"],
    ["prop", "stage-prop-list", "小道具"],
  ]) {
    assert.match(html, new RegExp(`data-roster-list-resize="${key}"[\\s\\S]*?role="separator"[\\s\\S]*?aria-controls="${id}"[\\s\\S]*?aria-label="${label}の一覧の高さ"`));
  }
});

test("一覧の取っ手は見える横線と十分なドラッグ領域を持つ", () => {
  assert.match(css, /\.stage-roster-list-resize \{[\s\S]*?height: 12px;[\s\S]*?border-top: 1px solid[\s\S]*?cursor: ns-resize;[\s\S]*?touch-action: none;/);
  assert.match(css, /\.stage-roster-list-resize::after \{[\s\S]*?width: 34px;[\s\S]*?height: 2px;/);
  assert.match(css, /\.stage-roster-group > \.stage-cast-list\.is-manual-height \{ max-height: none; \}/);
});

test("ドラッグした一覧高は端末設定へ保存し、全項目が見える高さまで広げられる", () => {
  assert.match(source, /function initRosterListHeights\(\)/);
  assert.match(source, /prefs\.rosterListHeights/);
  assert.match(source, /const fullHeight = \(list\) => \{[\s\S]*?list\.style\.removeProperty\("height"\)[\s\S]*?const measured = Math\.ceil\(list\.scrollHeight\)[\s\S]*?return measured/);
  assert.match(source, /const min = Math\.min\(80, max\)[\s\S]*?clamp\(saved\[key\], min, max\)/);
  assert.match(source, /drag\.startHeight \+ \(event\.clientY - drag\.startY\)/);
  assert.match(source, /Math\.min\(80, drag\.maxHeight\)[\s\S]*?minHeight, drag\.maxHeight/);
  assert.match(source, /prefs\.rosterListHeights = drag\.heights; savePrefs\(\)/);
  assert.match(source, /new MutationObserver\([\s\S]*?observe\(list, \{ childList: true \}\)/);
  assert.match(source, /initPanelWidths\(\);\s*initRosterListHeights\(\);/);
});

test("キーボード調整とダブルクリック・Enterによる初期化ができる", () => {
  assert.match(source, /\["ArrowUp", "ArrowDown", "Home", "End", "Enter"\]/);
  assert.match(source, /event\.shiftKey \? 60 : 20/);
  assert.match(source, /addEventListener\("dblclick"[\s\S]*?reset\(key\)/);
  assert.match(source, /event\.key === "Enter"[\s\S]*?reset\(key\)/);
  assert.match(source, /delete next\[key\]/);
});
