import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const linesSource = await readFile(new URL("stage-venue-lines.js", root), "utf8");
const editorSource = await readFile(new URL("stage-venue-editor.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");

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

test("探り針パネルは実測JSON入口・出所・0.5m丸めの事実表示を持つ", () => {
  assert.match(indexSource,
    /id="stage-venue-editor-probe-capture-open"[^>]*>実測を読み込む</);
  assert.match(indexSource,
    /type="file" id="stage-venue-editor-probe-capture-input" accept="\.json" hidden/);
  assert.match(indexSource, /id="stage-venue-editor-probe-capture-source"/);
  assert.match(indexSource, /id="stage-venue-editor-probe-headroom"/);
  assert.match(editorSource, /raw\.format !== "performer-capture-v0"/);
  assert.match(editorSource, /実測: \$\{state\.lines\.measurement\.performer\}（目安）/);
  assert.match(editorSource, /Math\.round\(linesResult\.fall\.headroomM \* 2\) \/ 2/);
  assert.match(editorSource, /天井まで だいたい\$\{amount\}/);
  assert.match(editorSource, /clearProbeMeasurement\(\);[\s\S]*?setProbeReach\(els\.probeReach\.value\)/);
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
