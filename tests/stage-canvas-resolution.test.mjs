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

test("表示に要る画素数まで内部解像度を落とす（下限0.5倍）。縦横比は幅の倍率に追従する", () => {
  // 2026-09-03: スマホで必要の約3倍を描いていた。論理座標 W×H は変えない
  assert.match(stageSource, /BACKING_MIN_SCALE = 0\.5/);
  assert.match(stageSource, /Math\.max\(BACKING_MIN_SCALE, \(cssW \* \(window\.devicePixelRatio \|\| 1\)\) \/ W\)/);
  assert.match(stageSource, /canvas\.height = Math\.round\(H \* scale\);/);
});

test("スマホでは奥行きの札を見出しの帯の下へ逃がす（英語で重なる）", () => {
  assert.match(styleSource, /html\.stage-phone-viewer \.stage-depth-back \{ top: 30px; \}/);
});

test("読み込み完了後にも解像度を合わせ直す（スマホの組み替え後に通知が来ない環境がある）", () => {
  assert.match(stageSource, /window\.addEventListener\("load", \(\) => \{\s*syncCanvasResolution\(\);\s*requestAnimationFrame\(syncCanvasResolution\);\s*\}\);/);
});

test("初回描画（finishInitialStageSetup）の直後にも解像度を合わせ直す", () => {
  const start = stageSource.indexOf("function finishInitialStageSetup(identity)");
  const render = stageSource.indexOf("      render();", start);
  const sync = stageSource.indexOf("      syncCanvasResolution();", render);
  assert.ok(start >= 0 && render > start && sync > render && sync - render < 400, "render() の直後で呼ぶ");
});
