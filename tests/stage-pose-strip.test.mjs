import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [html, stageSource, styleSource] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("stage-sketch.js", root), "utf8"),
  readFile(new URL("style.css", root), "utf8"),
]);

function functionBody(name, nextName) {
  const start = stageSource.indexOf(`function ${name}`);
  const end = stageSource.indexOf(`function ${nextName}`, start);
  assert.ok(start >= 0, `${name} がある`);
  assert.ok(end > start, `${name} の終端がある`);
  return stageSource.slice(start, end);
}

test("姿勢帯は正面図の内側で平面図より前にある", () => {
  const frontStart = html.indexOf('id="stage-front-cell"');
  const stripStart = html.indexOf('id="stage-pose-strip"', frontStart);
  const planStart = html.indexOf('id="stage-plan-cell"', frontStart);
  assert.ok(frontStart >= 0, "stage-front-cell がある");
  assert.ok(planStart > frontStart, "stage-plan-cell が正面図より後にある");
  assert.ok(stripStart > frontStart && stripStart < planStart,
    "stage-pose-strip が正面図と平面図の間にある");
});

test("選択更新は早期returnより前に姿勢帯を同期する", () => {
  const body = functionBody("updateInspector", "renderPoseStrip");
  assert.match(body, /renderPoseStrip\(piece\);[\s\S]*if \(!piece\) return;/);
});

test("姿勢帯は乗り物を除外し、絵を描いて現在姿勢を中央へ寄せる", () => {
  const body = functionBody("renderPoseStrip", "syncInputs");
  assert.match(body, /mountKindOf\(piece\)/);
  assert.match(body, /drawPosePreview\(/);
  assert.match(body, /scrollIntoView/);
});

test("姿勢帯の縮小タイルにCSS定義がある", () => {
  assert.match(styleSource, /\.stage-pose-strip-tile\s*\{/);
});
