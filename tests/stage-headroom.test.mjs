import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const linesSource = await readFile(new URL("stage-venue-lines.js", root), "utf8");
const editorSource = await readFile(new URL("stage-venue-editor.js", root), "utf8");
const indexSource = await readFile(new URL("stage.html", root), "utf8");

function loadLines() {
  const window = {};
  window.window = window;
  vm.runInContext(linesSource, vm.createContext({ window, console }), {
    filename: "stage-venue-lines.js",
  });
  return window.SHOSAI_VENUE_LINES;
}

const room = {
  format: "venue-v2",
  floor: { outline: [[0, 0], [12, 0], [12, 8], [0, 8]], levels: [] },
  ceiling: { heightM: 4, rigging: "none" },
  audience: [],
  fixtures: [],
  access: [],
};

test("headroomは要求値の正負を保ち、既存のクランプ済み高さと落下半径を変えない", () => {
  const lines = loadLines();
  const below = lines.computeFall(room,
    { at: [6, 4], tool: "juggling", reachHeightM: 2.5 });
  assert.equal(below.requestedReachHeightM, 2.5);
  assert.equal(below.reachHeightM, 2.5);
  assert.equal(below.headroomM, 1.5);

  const above = lines.computeFall(room,
    { at: [6, 4], tool: "juggling", reachHeightM: 5.5 });
  assert.equal(above.requestedReachHeightM, 5.5);
  assert.equal(above.reachHeightM, 4);
  assert.equal(above.headroomM, -1.5);
  assert.equal(above.radiusM, 2.4);
});

test("会場実測ツールは現在の会場エディタには置かず、会場線の純粋計算として保つ", () => {
  // 実測読込UIは3D会場編集への移行で廃止済み。古い入口の復活を要求せず、
  // 会場線の計算器が独立していることだけを回帰対象にする。
  assert.doesNotMatch(indexSource, /stage-venue-editor-probe-capture-open/);
  assert.doesNotMatch(editorSource, /performer-capture-v0/);
  assert.match(linesSource, /function computeFall/);
  assert.match(linesSource, /function normalizeProbe/);
});

test("compute()経由でも要求値が二重正規化で失われない（回帰: 天井超の実測が+0.0になる）", () => {
  const lines = loadLines();
  const result = lines.compute(room, { at: [6, 4], tool: "juggling", reachHeightM: 7 }, null);
  assert.equal(result.probe.requestedReachHeightM, 7);
  assert.equal(result.fall.requestedReachHeightM, 7);
  assert.equal(result.fall.headroomM, -3);
  assert.equal(result.fall.reachHeightM, 4);
  // 正規化済みprobeの再正規化が冪等であること
  const renorm = lines.normalizeProbe(room, result.probe);
  assert.equal(renorm.requestedReachHeightM, 7);
  assert.equal(renorm.headroomM, -3);
});
