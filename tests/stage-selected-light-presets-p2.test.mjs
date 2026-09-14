import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const plain = (value) => JSON.parse(JSON.stringify(value));

function compatModel() {
  const storage = new MemoryStorage();
  const window = { localStorage: storage };
  const context = {
    window,
    document: { getElementById: () => null },
  };
  vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
  return context.window.SHOSAI_STAGE_LIGHT_PRESET_COMPAT;
}

function staticPresetModel() {
  const storage = new MemoryStorage();
  const window = { localStorage: storage };
  const context = {
    window,
    document: { getElementById: () => null },
  };
  vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
  return context.window.SHOSAI_STAGE_SELECTED_LIGHT_STATIC_PRESETS;
}

function motionPresetModel() {
  const storage = new MemoryStorage();
  const window = { localStorage: storage };
  const context = { window, document: { getElementById: () => null } };
  vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
  return context.window.SHOSAI_STAGE_SELECTED_LIGHT_MOTION_PRESETS;
}

function timeEffectPresetModel() {
  const storage = new MemoryStorage();
  const window = { localStorage: storage };
  const context = { window, document: { getElementById: () => null } };
  vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
  return context.window.SHOSAI_STAGE_SELECTED_LIGHT_TIME_EFFECT_PRESETS;
}

const lights = () => [
  { id: "light-left", type: "light", color: "#ffd67b", glow: 0.8, beam: { u: 0.2, v: 0.3, h: 5.4, toH: 0.2 } },
  { id: "light-center", type: "light", color: "#e7f0ff", glow: 0.9, beam: { u: 0.5, v: 0.4, h: 5.8, toH: 0.4 } },
  { id: "light-right", type: "light", color: "#bdccff", glow: 1, beam: { u: 0.8, v: 0.5, h: 6.2, toH: 0.6 } },
];

test("P2a: 旧ショーの未指定値は空の新キーとして保存しない", () => {
  const model = compatModel();
  assert.equal(model.normalizeCapability(null), null);
  assert.equal(model.normalizeBehavior(null), null);
  assert.match(stageSource,
    /if \(lightCapability\) normalizedSet\.lightCapability = lightCapability;/);
  assert.match(stageSource,
    /if \(lightBehavior\) normalized\.lightBehavior = lightBehavior;/);
});

test("P2a: 明示された可動能力と由来メタデータは正規化・保存・再読込で保たれる", () => {
  const model = compatModel();
  const behavior = {
    version: 1,
    lastAppliedByScope: {
      aim: { presetId: "aim.cross", appliedAt: "2026-09-14T00:00:00.000Z" },
      motion: { presetId: "motion.stage-wander", seed: 2741, pathVersion: 1 },
    },
  };
  const first = plain(model.normalizeBehavior(behavior));
  const reloaded = plain(model.normalizeBehavior(first));

  assert.deepEqual(plain(model.normalizeCapability({ motion: "moving" })), { motion: "moving" });
  assert.deepEqual(reloaded, behavior);
  assert.notEqual(first.lastAppliedByScope, behavior.lastAppliedByScope, "入力をそのまま再利用しない");
  assert.match(stageSource, /lightKind: kind === "light"/);
  assert.match(stageSource, /lightGroup: kind === "light"/);
});

test("P2a: 不正な能力は保存せず、将来版の由来メタデータは丸ごと保持する", () => {
  const model = compatModel();
  const futureBehavior = {
    version: 2,
    lastAppliedByScope: { motion: { presetId: "motion.audience-wander", seed: 91 } },
    futureField: { maskVersion: 3, audienceEnabled: true },
  };
  assert.equal(model.normalizeCapability({ motion: "not-a-capability" }), null);
  assert.deepEqual(plain(model.normalizeBehavior(futureBehavior)), futureBehavior);
});

test("P2a: 互換キーはlightの登録・駒だけに限定する", () => {
  const normalizePiece = stageSource.slice(
    stageSource.indexOf("function normalizePiece"), stageSource.indexOf("function normalizeNote"),
  );
  const normalizeSets = stageSource.slice(
    stageSource.indexOf("sets: Array.isArray(rawProject.sets)"), stageSource.indexOf("rigs: Array.isArray(rawProject.rigs)"),
  );
  assert.match(normalizePiece, /if \(type === "light"\)/);
  assert.match(normalizeSets, /if \(kind === "light"\)/);
});

test("P2b: 静止型は13種類で、選択された灯だけを非破壊で更新する", () => {
  const model = staticPresetModel();
  const source = [...lights(), { id: "actor", type: "performer", u: 0.5, v: 0.5 }];
  const before = plain(source);
  const result = plain(model.apply(source, "area.left"));

  assert.equal(model.presets.length, 13);
  assert.equal(result.status, "applied");
  assert.deepEqual(source, before, "入力の駒をその場で変更しない");
  assert.deepEqual(result.pieces.at(-1), before.at(-1), "灯以外は変えない");
  result.pieces.slice(0, 3).forEach((piece) => {
    assert.ok(piece.beam.u >= 0 && piece.beam.u <= 0.5, "下手半分の範囲内に配る");
    assert.equal(piece.beam.h, before.find((item) => item.id === piece.id).beam.h, "灯体高を残す");
    assert.equal(piece.beam.toH, before.find((item) => item.id === piece.id).beam.toH, "狙いの高さを残す");
    assert.deepEqual(piece.lightBehavior, { version: 1, lastAppliedByScope: { area: { id: "area.left", version: 1 } } });
  });
});

test("P2c: 指定矩形は舞台内で正規化し、選んだ灯の狙いと由来だけを更新する", () => {
  const model = staticPresetModel();
  const source = lights();
  const before = plain(source);
  const region = { kind: "rect", u0: 0.76, u1: 0.24, v0: 0.72, v1: 0.3 };
  const result = plain(model.apply(source, "area.custom", { region }));

  assert.equal(result.status, "applied");
  assert.deepEqual(source, before, "入力の駒をその場で変更しない");
  result.pieces.forEach((piece) => {
    assert.ok(piece.beam.u >= 0.24 && piece.beam.u <= 0.76, "下手・上手の指定範囲内に配る");
    assert.ok(piece.beam.v >= 0.3 && piece.beam.v <= 0.72, "奥・手前の指定範囲内に配る");
    assert.equal(piece.beam.h, before.find((item) => item.id === piece.id).beam.h, "灯体高を残す");
    assert.equal(piece.beam.toH, before.find((item) => item.id === piece.id).beam.toH, "狙いの高さを残す");
    assert.deepEqual(piece.lightBehavior.lastAppliedByScope.area, {
      id: "area.custom", version: 1, region: { kind: "rect", u0: 0.24, v0: 0.3, u1: 0.76, v1: 0.72 },
    });
  });
  const invalid = plain(model.apply(source, "area.custom", { region: { kind: "rect", u0: 0.5, u1: 0.5, v0: 0.2, v1: 0.8 } }));
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.reason, "custom-region-required");
});

test("P2d: 舞台内ワンダーはムービング灯だけへseed付きで保存し、同時刻なら再現する", () => {
  const model = motionPresetModel();
  const source = lights().map((piece, index) => ({ ...piece, setId: `set-${index}` }));
  const sets = [
    { id: "set-0", kind: "light", lightCapability: { motion: "moving" } },
    { id: "set-1", kind: "light", lightCapability: { motion: "fixed" } },
    { id: "set-2", kind: "light", lightCapability: { motion: "moving" } },
  ];
  const before = plain(source);
  const result = plain(model.apply(source, sets, { seed: 19, loopSec: 8, irregularity: 0.55 }));
  assert.equal(result.status, "applied");
  assert.deepEqual(source, before, "入力の駒をその場で変更しない");
  assert.equal(result.skipped[0], "light-center");
  assert.equal(result.pieces[1].lightBehavior, undefined, "固定灯は変えない");
  [result.pieces[0], result.pieces[2]].forEach((piece) => {
    const motion = piece.lightBehavior.motion;
    assert.equal(motion.kind, "wander-stage");
    assert.equal(motion.seed, 19);
    const atA = plain(model.positionAt(motion, 2450));
    const atB = plain(model.positionAt(motion, 2450));
    assert.deepEqual(atA, atB, "同じseed・時刻なら同じ位置");
    assert.ok(atA.u >= motion.region.u0 && atA.u <= motion.region.u1);
    assert.ok(atA.v >= motion.region.v0 && atA.v <= motion.region.v1);
  });
});

test("P2e: ワンダーは周期・不規則さ・範囲・経路を後調整でき、停止しても他の型を消さない", () => {
  const model = motionPresetModel();
  const source = lights().map((piece, index) => ({ ...piece, setId: `set-${index}` }));
  const sets = [
    { id: "set-0", kind: "light", lightCapability: { motion: "moving" } },
    { id: "set-1", kind: "light", lightCapability: { motion: "fixed" } },
    { id: "set-2", kind: "light", lightCapability: { motion: "moving" } },
  ];
  const applied = plain(model.apply(source, sets, { seed: 19, loopSec: 8, irregularity: 0.55 }));
  applied.pieces[0].lightBehavior.lastAppliedByScope.aim = { id: "aim.row", version: 1 };
  const beforeAdjust = plain(applied.pieces);
  const adjusted = plain(model.adjust(applied.pieces, {
    seed: 77, loopSec: 16, irregularity: 0.2,
    region: { kind: "rect", u0: 0.8, v0: 0.74, u1: 0.18, v1: 0.26 },
  }));

  assert.equal(adjusted.status, "applied");
  assert.deepEqual(applied.pieces, beforeAdjust, "調整前の駒をその場で変更しない");
  assert.equal(adjusted.pieces[1].lightBehavior, undefined, "固定灯は調整しない");
  [adjusted.pieces[0], adjusted.pieces[2]].forEach((piece) => {
    const motion = piece.lightBehavior.motion;
    assert.equal(motion.seed, 77);
    assert.equal(motion.loopSec, 16);
    assert.equal(motion.irregularity, 0.2);
    assert.deepEqual(motion.region, { kind: "rect", u0: 0.18, v0: 0.26, u1: 0.8, v1: 0.74 });
    const at = plain(model.positionAt(motion, 2450));
    assert.ok(at.u >= 0.18 && at.u <= 0.8 && at.v >= 0.26 && at.v <= 0.74);
  });
  const stopped = plain(model.stop(adjusted.pieces));
  assert.equal(stopped.status, "applied");
  assert.equal(stopped.pieces[0].lightBehavior.motion, undefined);
  assert.deepEqual(stopped.pieces[0].lightBehavior.lastAppliedByScope.aim, { id: "aim.row", version: 1 }, "別の型の由来を残す");
  assert.equal(stopped.pieces[1].lightBehavior, undefined);
  assert.equal(stopped.pieces[2].lightBehavior, undefined, "動きだけの由来は空キーを残さない");
  assert.equal(model.adjust(adjusted.pieces, {
    seed: 77, loopSec: 16, irregularity: 0.2,
    region: { kind: "rect", u0: 0.18, v0: 0.26, u1: 0.8, v1: 0.74 },
  }).status, "noop", "同じ調整では履歴用の変更を返さない");
  assert.match(stageSource, /stage-selected-light-wander-loop/);
  assert.match(stageSource, /stage-selected-light-wander-stop/);
});

test("P2f: 舞台内ストロボとライトカーテンは時間変化だけを重ね、同じ型で解除できる", () => {
  const model = timeEffectPresetModel();
  const source = lights();
  source[0].lightBehavior = { version: 1, lastAppliedByScope: { aim: { id: "aim.row", version: 1 } } };
  const before = plain(source);
  const strobe = plain(model.apply(source, "effect.strobe.stage"));
  assert.equal(strobe.status, "applied");
  assert.deepEqual(source, before, "入力の駒をその場で変更しない");
  strobe.pieces.forEach((piece) => {
    assert.deepEqual(piece.lightBehavior.strobe, { kind: "stage-strobe", version: 1, rateHz: 8, duty: 0.32 });
  });
  assert.equal(model.intensityAt(strobe.pieces[0].lightBehavior, 0), 1);
  assert.equal(model.intensityAt(strobe.pieces[0].lightBehavior, 100), 0.04, "点滅の消灯位相は描画だけを落とす");

  const chase = plain(model.apply(strobe.pieces, "effect.curtain.chase"));
  assert.equal(chase.status, "applied");
  assert.equal(chase.pieces[0].lightBehavior.chase.phaseNorm, 0);
  assert.equal(chase.pieces[2].lightBehavior.chase.phaseNorm, 2 / 3);
  assert.equal(model.intensityAt(chase.pieces[0].lightBehavior, 0), 1);
  assert.equal(model.intensityAt(chase.pieces[2].lightBehavior, 0), 0.05, "灯ごとの位相でカーテンを走らせる");

  const noStrobe = plain(model.apply(chase.pieces, "effect.strobe.stage"));
  assert.equal(noStrobe.status, "applied");
  assert.equal(noStrobe.cleared, true);
  assert.equal(noStrobe.pieces[0].lightBehavior.strobe, undefined);
  assert.equal(noStrobe.pieces[0].lightBehavior.chase.kind, "curtain-chase", "別の時間変化は保持する");
  assert.deepEqual(noStrobe.pieces[0].lightBehavior.lastAppliedByScope.aim, { id: "aim.row", version: 1 }, "既存の型の由来を残す");
  const noChase = plain(model.apply(noStrobe.pieces, "effect.curtain.chase"));
  assert.equal(noChase.pieces[0].lightBehavior.chase, undefined);
  assert.deepEqual(noChase.pieces[0].lightBehavior.lastAppliedByScope.aim, { id: "aim.row", version: 1 });
  assert.match(stageSource, /effect\.strobe\.stage/);
  assert.match(stageSource, /effect\.curtain\.chase/);
});

test("P2b: 見せ方の型は色を残し、ライトカーテンは横へ展開する", () => {
  const model = staticPresetModel();
  const source = lights();
  const alternate = plain(model.apply(source, "value.alternate"));
  const curtain = plain(model.apply(source, "show.curtain"));

  assert.deepEqual(alternate.pieces.map((piece) => piece.color), source.map((piece) => piece.color));
  assert.deepEqual(alternate.pieces.map((piece) => piece.glow), [1.2, 0.65, 1.2]);
  assert.ok(Math.abs(curtain.pieces[0].beam.u - 0.06) < 1e-9);
  assert.ok(Math.abs(curtain.pieces[1].beam.u - 0.5) < 1e-9);
  assert.ok(Math.abs(curtain.pieces[2].beam.u - 0.94) < 1e-9);
  assert.ok(curtain.pieces.every((piece) => piece.glow >= 1.05));
  assert.deepEqual(curtain.pieces[0].lightBehavior.lastAppliedByScope.show, { id: "show.curtain", version: 1 });
});

test("P2b: UIは2灯以上の明かりだけに表示し、組へ暗黙展開せず一度だけ履歴を作る", () => {
  const selection = stageSource.slice(
    stageSource.indexOf("function selectedLightStaticPieces"),
    stageSource.indexOf("function closeSelectedLightPresetModal"),
  );
  const apply = stageSource.slice(
    stageSource.indexOf("function applySelectedLightStaticPreset"),
    stageSource.indexOf("function openSelectedLightPresetModal"),
  );
  assert.match(selection, /pieces\.length >= 2/);
  assert.match(selection, /pieces\.every\(\(piece\) => piece\.type === "light"\)/);
  assert.match(apply, /model\.apply\(selected, presetId, options\)/);
  assert.match(apply, /checkpoint\(\);/);
  assert.doesNotMatch(apply, /lightGroup|groupScenePieces|groupItems/);
  assert.match(stageSource, /stage-selected-light-preset-open/);
  assert.match(stageSource, /stage-selected-light-preset-modal/);
  assert.match(stageSource, /stage-selected-light-custom-canvas/);
  assert.match(stageSource, /area\.custom/);
  assert.match(stageSource, /selectedLightMovingPieces/);
  assert.match(stageSource, /motion\.wander\.stage/);
});

test("P2b: 照明を動かす平面図ではShiftクリックで灯だけを複数選択できる", () => {
  const lightTool = stageSource.slice(
    stageSource.indexOf('if (tool === "light")'),
    stageSource.indexOf('if (tool === "select" || (tool === "arrow" && view === "plan"))'),
  );
  assert.match(lightTool, /view === "plan" && event\.shiftKey && hit/);
  assert.match(lightTool, /const hit = fixture \|\| hitTest\(point, L\);/);
  assert.match(lightTool, /setSelectedPieces\(ordered,/);
  assert.match(lightTool, /\$\{ids\.size\}灯を選択しました/);
});
