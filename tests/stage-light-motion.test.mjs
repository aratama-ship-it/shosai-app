import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// stage-light-motion.js は独立モジュール（機材を持たない、動く光の案の
// 正規化・時間計算・描画・書き出し）。DOM無しでも純粋な数値部分は検証できる。
const source = await readFile(new URL("../stage-light-motion.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "stage-light-motion.js" });
const model = context.window.SHOSAI_STAGE_LIGHT_MOTION;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("モジュールが期待どおりの定数・関数一式を公開する", () => {
  assert.ok(model, "window.SHOSAI_STAGE_LIGHT_MOTION が定義されていない");
  assert.deepEqual(plain(model.PRESETS), ["sweep", "fan", "cross", "circle", "chase"]);
  assert.deepEqual(plain(model.COUNT_VALUES), [1, 2]);
  assert.deepEqual(plain(model.SPEED_VALUES), ["slow", "normal", "fast"]);
  assert.deepEqual(plain(model.RELATION_VALUES), ["together", "opposite", "sequential"]);
});

test("プリセット未選択は中身なし（null）として扱う", () => {
  assert.equal(model.normalize(null), null);
  assert.equal(model.normalize({}), null);
  assert.equal(model.normalize({ presetId: "not-a-real-preset" }), null);
});

test("正規化は既定値で埋め、範囲は0.2〜1にクランプする", () => {
  const normalized = model.normalize({ presetId: "sweep" });
  assert.equal(normalized.version, 1);
  assert.equal(normalized.presetId, "sweep");
  assert.equal(normalized.count, 1);
  assert.equal(normalized.range, 0.5);
  assert.equal(normalized.speed, "normal");
  assert.equal(normalized.relation, "together");

  assert.equal(model.normalize({ presetId: "sweep", range: 5 }).range, 1);
  assert.equal(model.normalize({ presetId: "sweep", range: -5 }).range, 0.2);
  assert.equal(model.normalize({ presetId: "sweep", speed: "invalid" }).speed, "normal");
});

test("fan・cross・chaseは本数を2本に固定する（1本を渡しても2本になる）", () => {
  ["fan", "cross", "chase"].forEach((presetId) => {
    const normalized = model.normalize({ presetId, count: 1 });
    assert.equal(normalized.count, 2, `${presetId} は2本に固定されるはず`);
  });
  // sweep・circleは1本のままでよい
  assert.equal(model.normalize({ presetId: "sweep", count: 1 }).count, 1);
  assert.equal(model.normalize({ presetId: "circle", count: 2 }).count, 2);
});

test("本数が1のときは光の関係を持たない（togetherへ戻す）", () => {
  const normalized = model.normalize({ presetId: "sweep", count: 1, relation: "opposite" });
  assert.equal(normalized.relation, "together");
});

test("プリセットごとの既定値: fan/crossはtogether、chaseはsequential", () => {
  assert.deepEqual(plain(model.defaultsForPreset("fan")), { count: 2, relation: "together" });
  assert.deepEqual(plain(model.defaultsForPreset("cross")), { count: 2, relation: "together" });
  assert.deepEqual(plain(model.defaultsForPreset("chase")), { count: 2, relation: "sequential" });
  assert.deepEqual(plain(model.defaultsForPreset("sweep")), { count: 1, relation: "together" });
});

test("位相は0→1→0の往復（sweep等）と0→1の連続（circle）で異なる", () => {
  const sweepMotion = model.normalize({ presetId: "sweep", speed: "normal" }); // 1周期=2000ms
  assert.equal(model.phaseAt(sweepMotion, 0, 0), 0);
  assert.equal(model.phaseAt(sweepMotion, 1000, 0), 1); // 半周期=端
  assert.ok(Math.abs(model.phaseAt(sweepMotion, 2000, 0) - 0) < 1e-9); // 1周期で戻る

  const circleMotion = model.normalize({ presetId: "circle", speed: "normal" });
  assert.equal(model.phaseAt(circleMotion, 0, 0), 0);
  assert.ok(Math.abs(model.phaseAt(circleMotion, 1000, 0) - 0.5) < 1e-9); // 半周で0.5（往復しない）
});

test("2本目は光の関係に応じて位相がずれる（together=同時、opposite=半周期）", () => {
  const together = model.normalize({ presetId: "fan", relation: "together" });
  const p0 = model.phaseAt(together, 500, 0);
  const p1 = model.phaseAt(together, 500, 1);
  assert.equal(p0, p1);

  const opposite = model.normalize({ presetId: "fan", relation: "opposite" });
  const q0 = model.phaseAt(opposite, 0, 0);
  const q1 = model.phaseAt(opposite, 0, 1);
  assert.notEqual(q0, q1); // 半周期ずれるので開始時点から異なる
});

test("beamGeometryは本数ぶんの灯を返し、出どころ(x0,y0)と光の先(x1,y1)は0..1に収まる", () => {
  const motion = model.normalize({ presetId: "cross", range: 0.8 });
  const beams = model.beamGeometry(motion, 300);
  assert.equal(beams.length, 2);
  beams.forEach((beam) => {
    [beam.x0, beam.y0, beam.x1, beam.y1].forEach((value) => {
      assert.ok(value >= -0.1 && value <= 1.1, `座標が範囲外: ${value}`);
    });
  });
});

test("プリセット未選択のときbeamGeometryは空配列、rangeGuideはnull", () => {
  assert.deepEqual(plain(model.beamGeometry(null, 0)), []);
  assert.deepEqual(plain(model.beamGeometry({ presetId: null }, 0)), []);
  assert.equal(model.rangeGuide(null), null);
});

test("crossは左右対称の出どころを持ち、sweepと違って交差する経路になる", () => {
  const cross = model.normalize({ presetId: "cross", range: 0.5 });
  const beams = model.beamGeometry(cross, 0);
  assert.ok(beams[0].x0 < 0.5 && beams[1].x0 > 0.5, "出どころは左右に分かれる");
});

test("circleのrangeGuideは楕円、sweepは線分", () => {
  const circle = model.normalize({ presetId: "circle" });
  assert.equal(model.rangeGuide(circle).kind, "ellipse");
  const sweep = model.normalize({ presetId: "sweep" });
  assert.equal(model.rangeGuide(sweep).kind, "line");
});

test("cycleMsは speed に応じて slow>normal>fast の順で長い", () => {
  const slow = model.cycleMs(model.normalize({ presetId: "sweep", speed: "slow" }));
  const normal = model.cycleMs(model.normalize({ presetId: "sweep", speed: "normal" }));
  const fast = model.cycleMs(model.normalize({ presetId: "sweep", speed: "fast" }));
  assert.ok(slow > normal && normal > fast);
});

test("Node環境（MediaRecorder無し）ではsupportedExportMimeTypesが空配列を返す", () => {
  assert.deepEqual(plain(model.supportedExportMimeTypes()), []);
});

test("exportVideoはMediaRecorder未対応の環境で ok:false, reason:unsupported を返す", async () => {
  const result = await model.exportVideo({}, {}, model.normalize({ presetId: "sweep" }), {});
  assert.deepEqual(plain(result), { ok: false, reason: "unsupported" });
});

test("drawFrameはctxのメソッドを呼び、例外を投げない（最小モックで確認）", () => {
  const calls = [];
  const ctx = {
    save() {}, restore() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {},
    moveTo() {}, lineTo() {}, stroke() {}, ellipse() {}, fillText() {},
    setLineDash() {}, createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    set fillStyle(v) { calls.push(["fillStyle", v]); },
    set strokeStyle(v) { calls.push(["strokeStyle", v]); },
    set lineWidth(v) {},
    set lineCap(v) {},
    set font(v) {},
    set textBaseline(v) {},
  };
  const motion = model.normalize({ presetId: "chase", count: 2 });
  assert.doesNotThrow(() => model.drawFrame(ctx, 960, 540, motion, 500, { label: "x", footNote: "y" }));
  assert.ok(calls.length > 0);
});
