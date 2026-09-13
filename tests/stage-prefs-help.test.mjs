import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("環境設定の説明は？から開閉でき、設定トグルとは分離される", () => {
  assert.match(source, /function prefHelp\(root, label, text, hint\)/);
  assert.match(source, /help\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(source, /help\.setAttribute\("aria-controls", hintId\)/);
  assert.match(source, /hint\.setAttribute\("aria-hidden", String\(!open\)\)/);
  assert.match(source, /toggle\.className = "stage-pref-toggle"/);
  assert.match(source, /row\.append\(toggle, prefHelp\(row, f\.label, f\.hint, hint\), hint\)/);
});

test("説明は？のクリックでのみ開き、再クリックで閉じる", () => {
  assert.match(css, /\.stage-pref-grid \.stage-pref-hint \{[\s\S]*?max-height: 0;/);
  assert.doesNotMatch(css, /\.stage-pref-group-head:hover \+ \.stage-pref-group-hint/);
  assert.doesNotMatch(css, /\.stage-pref-group-head:focus-within \+ \.stage-pref-group-hint/);
  assert.doesNotMatch(css, /\.stage-pref-grid \.stage-pref-row:hover > \.stage-pref-hint/);
  assert.doesNotMatch(css, /\.stage-pref-grid \.stage-pref-row:focus-within > \.stage-pref-hint/);
  assert.match(css, /\.stage-pref-group\.is-help-open > \.stage-pref-group-hint/);
  assert.match(css, /\.stage-pref-grid \.stage-pref-row\.is-help-open > \.stage-pref-hint/);
  assert.doesNotMatch(source, /help\.title = tx\(text\)/);
  assert.match(source, /const open = help\.getAttribute\("aria-expanded"\) !== "true";/);
  assert.match(source, /hint\.setAttribute\("aria-hidden", String\(!open\)\);/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
