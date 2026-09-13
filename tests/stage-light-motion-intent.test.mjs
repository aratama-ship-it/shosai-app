import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// 光の動き（案）は、光の意図カードの子ではなく、シーン直下の独立した項目
// （scene.lightMotion）として保存する（2026-09-11 本人指示で光の意図カードから
// 独立させ、モーダルで組む形に変更）。ここでは、
//   1. 光の意図（scene.lightingIntent）側にlightMotionが残っていないこと
//      （切り離しが正しく行われたこと）
//   2. stage-light-motion.js の正規化・書き出しに使う値が、そのままJSON書き出しで
//      壊れずに残ること（scene.lightMotionとしてのラウンドトリップ）
// を検証する。stage-light-motion.js を先に読み込んでから stage-sketch.js を
// 読み込む（stage-sketch.js は window.SHOSAI_STAGE_LIGHT_MOTION を参照する）。
const motionSource = await readFile(new URL("../stage-light-motion.js", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

const context = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(motionSource, context, { filename: "stage-light-motion.js" });
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const intentModel = context.window.SHOSAI_STAGE_LIGHT_INTENT_MODEL;
const motionModel = context.window.SHOSAI_STAGE_LIGHT_MOTION;
const projectIo = context.window.SHOSAI_STAGE_PROJECT_IO;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("stage-light-motion.jsが読み込まれていること（stage-sketch.jsの前提）", () => {
  assert.ok(motionModel, "window.SHOSAI_STAGE_LIGHT_MOTION が定義されていない");
});

test("光の意図（emptyLightingIntent）はlightMotionを持たない（切り離し済み）", () => {
  const empty = plain(intentModel.empty());
  assert.equal("lightMotion" in empty, false,
    "lightMotionは2026-09-11に光の意図カードから独立した。ここに残っていてはいけない");
  // 既存の主要キーは引き続き存在すること（切り離しの巻き添えで消えていないか）
  assert.ok("objective" in empty);
  assert.ok("layers" in empty);
  assert.ok("transition" in empty);
  assert.ok("safetyStatus" in empty);
});

test("光の意図の正規化にlightMotionを含む生データを渡しても、lightMotionは無視される", () => {
  const normalized = plain(intentModel.normalize({
    objective: "テスト",
    lightMotion: { presetId: "cross", count: 1, range: 5, speed: "fast", relation: "opposite" },
  }));
  assert.equal(normalized.objective, "テスト");
  assert.equal("lightMotion" in normalized, false);
});

test("scene.lightMotion相当のJSONは、モジュール単体のnormalizeと同じ値に正規化される", () => {
  // stage-sketch.js側のnormalizeLightMotion(kind, raw)は、stage-light-motion.jsの
  // normalize(raw)への薄いラッパー。ここでは委譲先のモジュールが返す値そのものを確認する
  // （stage-sketch.js内のラッパー自体はnormalizeSceneの中だけで呼ばれ、windowには出ていない）。
  const raw = { presetId: "chase", count: 1, range: 0.9, speed: "fast" };
  const normalized = plain(motionModel.normalize(raw));
  assert.equal(normalized.presetId, "chase");
  assert.equal(normalized.count, 2, "chaseは2本に固定される");
  assert.equal(normalized.range, 0.9);
  assert.equal(normalized.speed, "fast");
});

test("シーン直下のlightMotionは、version 4書き出し（exportDocument）でも保持される", () => {
  const project = {
    id: "light-motion-show",
    title: "Light Motion Test",
    venue: "proscenium",
    scenes: [{
      id: "scene-1",
      kind: "scene",
      title: "Scene 1",
      lightingIntent: null,
      lightMotion: { presetId: "sweep", count: 1, range: 0.6, speed: "slow", relation: "together" },
    }],
  };
  const doc = projectIo.exportDocument(project, false);
  assert.equal(doc.version, 4);
  const scene = doc.project.scenes[0];
  assert.equal(scene.lightingIntent, null);
  assert.equal(scene.lightMotion.presetId, "sweep");
  assert.equal(scene.lightMotion.range, 0.6);
});
