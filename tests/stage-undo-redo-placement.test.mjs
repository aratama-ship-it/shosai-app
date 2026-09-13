import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const indexSource = await readFile(new URL("stage.html", root), "utf8");
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `${start} が見つからない`);
  assert.ok(to > from, `${end} が見つからない`);
  return source.slice(from, to);
}

test("Undo／Redoはヘッダーから中央バーの最左へ移る", () => {
  const header = sourceBetween(indexSource, '<header class="stage-sketch-head">', '<div class="stage-sketch-grid">');
  const centerStart = indexSource.indexOf('<div class="stage-center-bar">');
  const undoAt = indexSource.indexOf('<div class="stage-undo-redo">', centerStart);
  const toolsAt = indexSource.indexOf('<div class="stage-tool-grid"', centerStart);

  assert.doesNotMatch(header, /id="stage-(?:undo|redo)"/);
  assert.match(header, /id="stage-freecam-open"/);
  assert.ok(centerStart >= 0 && centerStart < undoAt && undoAt < toolsAt);
  assert.doesNotMatch(indexSource.slice(centerStart, indexSource.indexOf('class="stage-canvas-stack"', centerStart)),
    /id="stage-freecam-open"/);
  assert.equal((indexSource.match(/id="stage-undo"/g) || []).length, 1);
  assert.equal((indexSource.match(/id="stage-redo"/g) || []).length, 1);
  assert.match(indexSource, /id="stage-undo"[\s\S]*?aria-label="一つ戻す"[\s\S]*?disabled/);
  assert.match(indexSource, /id="stage-redo"[\s\S]*?aria-label="やり直す"[\s\S]*?disabled/);
});

test("中央バーでは線画アイコン、iPadでは既存44px操作として表示する", () => {
  assert.match(styleSource, /\.stage-center-bar \.stage-undo-redo button \{[\s\S]*?width: 40px;[\s\S]*?min-width: 40px;/);
  assert.match(styleSource, /\.stage-center-bar \.stage-undo-redo button:disabled \{ opacity: 0\.28; cursor: default; \}/);
  assert.match(styleSource, /\.stage-center-bar \.stage-history-icon svg \{ display: block; width: 16px; height: 16px; \}/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-tablet-top-controls \.stage-undo-redo/);
  assert.match(stageSource, /const undoRedo = centerBar && centerBar\.querySelector\("\.stage-undo-redo"\)/);
  assert.match(stageSource, /if \(undoRedo\) topControls\.append\(undoRedo\);[\s\S]*?if \(toolGrid\) topControls\.append\(toolGrid\);/);
});

test("既存のクリック、キー操作、履歴の無効状態を同じIDで使い続ける", () => {
  assert.match(stageSource, /els\.undo\.disabled = history\.length === 0;/);
  assert.match(stageSource, /els\.redo\.disabled = future\.length === 0;/);
  assert.match(stageSource, /els\.undo\.addEventListener\("click", undo\);/);
  assert.match(stageSource, /els\.redo\.addEventListener\("click", redo\);/);
  assert.match(stageSource, /if \(event\.shiftKey\) redo\(\); else undo\(\);/);
});
