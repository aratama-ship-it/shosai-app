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

test("Undo／Redoは音量バーの横にあるヘッダーへ置く", () => {
  const header = sourceBetween(indexSource, '<header class="stage-sketch-head">', '<div class="stage-sketch-grid">');
  const centerStart = indexSource.indexOf('<div class="stage-center-bar">');
  const volumeAt = header.indexOf('id="stage-timeline-volume"');
  const undoAt = header.indexOf('<div class="stage-undo-redo">');
  const feedbackAt = header.indexOf('id="stage-feedback-open"');
  const centerEnd = indexSource.indexOf('class="stage-canvas-stack"', centerStart);

  assert.match(header, /id="stage-undo"[\s\S]*?id="stage-redo"/);
  assert.match(header, /id="stage-freecam-open"/);
  assert.ok(volumeAt >= 0 && volumeAt < undoAt && undoAt < feedbackAt);
  assert.doesNotMatch(indexSource.slice(centerStart, centerEnd), /class="stage-undo-redo"|id="stage-(?:undo|redo)"/);
  assert.equal((indexSource.match(/id="stage-undo"/g) || []).length, 1);
  assert.equal((indexSource.match(/id="stage-redo"/g) || []).length, 1);
  assert.match(indexSource, /id="stage-undo"[\s\S]*?aria-label="一つ戻す"[\s\S]*?disabled/);
  assert.match(indexSource, /id="stage-redo"[\s\S]*?aria-label="やり直す"[\s\S]*?disabled/);
});

test("ヘッダーの音量コントロールに合わせた44pxボタンと大きなアイコンで表示する", () => {
  assert.match(styleSource, /\.stage-history-actions \.stage-undo-redo button \{[\s\S]*?width: var\(--stage-history-action-height\);[\s\S]*?height: var\(--stage-history-action-height\);[\s\S]*?min-width: var\(--stage-history-action-height\);[\s\S]*?min-height: var\(--stage-history-action-height\);/);
  assert.match(styleSource, /\.stage-history-actions \.stage-history-icon svg \{[^}]*display: block;[^}]*width: 22px;[^}]*height: 22px;/s);
  assert.match(styleSource, /\.stage-history-actions button:disabled \{[^}]*opacity: 0\.28;[^}]*cursor: default;/s);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-tablet-top-controls \.stage-undo-redo/);
  assert.match(stageSource, /if \(historyActions\) topControls\.append\(historyActions\)/);
});

test("既存のクリック、キー操作、履歴の無効状態を同じIDで使い続ける", () => {
  assert.match(stageSource, /els\.undo\.disabled = history\.length === 0;/);
  assert.match(stageSource, /els\.redo\.disabled = future\.length === 0;/);
  assert.match(stageSource, /els\.undo\.addEventListener\("click", undo\);/);
  assert.match(stageSource, /els\.redo\.addEventListener\("click", redo\);/);
  assert.match(stageSource, /if \(event\.shiftKey\) redo\(\); else undo\(\);/);
});
