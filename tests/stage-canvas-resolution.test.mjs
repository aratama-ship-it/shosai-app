import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("描画の拡大率は描き先のcanvasから導く（書き出しは等倍のまま）", () => {
  assert.match(stageSource, /target\.canvas\.width \/ W/);
});

test("表示サイズに合わせて内部解像度を上げる（上限3倍）", () => {
  assert.match(stageSource, /BACKING_MAX_SCALE = 3/);
  assert.match(stageSource, /new ResizeObserver\(/);
});

test("広い画面では盤面が広がる（max-width 3000px）", () => {
  const stageSketchRule = styleSource.match(/\.stage-sketch \{[^}]*\}/)?.[0] || "";
  assert.match(stageSketchRule, /max-width: 3000px/);
});

test("初回の解像度合わせはResizeObserver任せにしない（初回通知が来ない環境がある）", () => {
  assert.match(stageSource, /requestAnimationFrame\(syncCanvasResolution\)/);
});

test("サイズが変わる操作の後は解像度を合わせ直す（プレゼン出入り・絵の開閉）", () => {
  const calls = stageSource.match(/syncCanvasResolution\(\);/g) || [];
  assert.ok(calls.length >= 4, `明示的な呼び出しが4か所以上ある（実際: ${calls.length}）`);
});
