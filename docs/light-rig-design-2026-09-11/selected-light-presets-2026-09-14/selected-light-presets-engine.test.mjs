import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const url = new URL("./selected-light-presets-engine.js", import.meta.url);
const context = { window: {} };
vm.runInNewContext(await readFile(url, "utf8"), context, { filename: "selected-light-presets-engine.js" });
const E = context.window.SELECTED_LIGHT_PRESETS_ENGINE;
const plain = (value) => JSON.parse(JSON.stringify(value));
const fixtures = [
  { id: "m-right", kind: "moving", mount: { u: 0.8 } },
  { id: "fixed", kind: "fixed", mount: { u: 0.5 } },
  { id: "m-left", kind: "moving", mount: { u: 0.2 } },
];
const cue = () => ({ lights: {
  "m-left": { on: true, color: "#abc", level: 44, beamDeg: 19, path: { kind: "still", a: { u: 0.2, v: 0.6, hM: 0 } }, custom: { keep: true } },
  "m-right": { on: true, color: "#def", level: 66, beamDeg: 21, path: { kind: "still", a: { u: 0.8, v: 0.6, hM: 0 } }, custom: { keep: "right" } },
  fixed: { on: true, color: "#999", level: 50, beamDeg: 23, path: { kind: "still", a: { u: 0.5, v: 0.6, hM: 0 } }, custom: { keep: "fixed" } },
}, unknownTopLevel: { preserve: true } });
const regions = { stage: { kind: "rect", u0: 0, v0: 0, u1: 1, v1: 1 }, "audience:main": { kind: "rect", u0: 0, v0: 0.84, u1: 1, v1: 1 } };

test("P0 は32型の宣言を持ち、IDは重複しない", () => {
  assert.equal(E.PRESETS.length, 32);
  assert.equal(new Set(E.PRESETS.map((preset) => preset.id)).size, 32);
  ["aim", "area", "motion", "value", "show", "flash"].forEach((family) => assert.ok(E.PRESETS.some((preset) => preset.family === family)));
});

test("同じseed・灯順・時刻ならwander位置は同じで、seedを替えると変わる", () => {
  const args = { presetId: "motion.wander.stage", cue: cue(), fixtures, selection: ["m-right", "m-left"], regions, choices: { seed: 2841, periodSec: 10 } };
  const a = E.applySelectedLightPreset(args), b = E.applySelectedLightPreset(args);
  assert.equal(a.status, "applied"); assert.deepEqual(plain(a.nextCue), plain(b.nextCue));
  const path = a.nextCue.lights["m-left"].path;
  const atA = E.wanderPoint(path, 3210, regions), atB = E.wanderPoint(path, 3210, regions);
  assert.deepEqual(plain(atA), plain(atB));
  const changed = E.applySelectedLightPreset({ ...args, choices: { seed: E.deriveRerollSeed(2841), periodSec: 10 } });
  assert.notDeepEqual(plain(changed.nextCue.lights["m-left"].path), plain(path));
});

test("wanderは許可領域の中に収まり、客席版も明示した領域なしでは拒否する", () => {
  const r = E.applySelectedLightPreset({ presetId: "motion.wander.stage", cue: cue(), fixtures, selection: ["m-left", "m-right"], regions, choices: { seed: 3 } });
  r.targets.forEach((id) => { for (let t = 0; t < 9000; t += 111) assert.equal(E.insideRect(E.wanderPoint(r.nextCue.lights[id].path, t, regions), regions.stage), true); });
  const audience = E.applySelectedLightPreset({ presetId: "motion.wander.stageAudience", cue: cue(), fixtures, selection: ["m-left"], regions: { stage: regions.stage }, choices: { seed: 3 } });
  assert.equal(audience.status, "invalid"); assert.equal(audience.reason, "audience-region-required");
});

test("同じ選択集合なら入力配列順に関係なく、物理順で同じ範囲点を受け取る", () => {
  const a = E.applySelectedLightPreset({ presetId: "area.full", cue: cue(), fixtures, selection: ["m-right", "m-left"], choices: { alignIntensity: false } });
  const b = E.applySelectedLightPreset({ presetId: "area.full", cue: cue(), fixtures, selection: ["m-left", "m-right"], choices: { alignIntensity: false } });
  assert.deepEqual(plain(a.nextCue.lights["m-left"].path), plain(b.nextCue.lights["m-left"].path));
  assert.deepEqual(plain(a.nextCue.lights["m-right"].path), plain(b.nextCue.lights["m-right"].path));
});

test("範囲6種は正規化され、指定範囲は四角または丸の有効な領域を必須にする", () => {
  ["area.full", "area.left", "area.right", "area.front", "area.back"].forEach((presetId) => {
    const r = E.applySelectedLightPreset({ presetId, cue: cue(), fixtures, selection: ["m-left", "fixed"] });
    assert.equal(r.status, "applied", presetId);
  });
  const bad = E.applySelectedLightPreset({ presetId: "area.custom", cue: cue(), fixtures, selection: ["m-left"], choices: { region: { kind: "rect", u0: 0.2, u1: 0.2, v0: 0.3, v1: 0.7 } } });
  assert.equal(bad.status, "invalid"); assert.equal(bad.reason, "custom-region-required");
  const good = E.applySelectedLightPreset({ presetId: "area.custom", cue: cue(), fixtures, selection: ["m-left"], choices: { region: { kind: "rect", u0: 0.2, u1: 0.8, v0: 0.3, v1: 0.7 } } });
  assert.equal(good.status, "applied");
  assert.deepEqual(plain(good.nextCue.lights["m-left"].presetMeta.lastAppliedByScope.area.region), { kind: "rect", u0: 0.2, u1: 0.8, v0: 0.3, v1: 0.7 });
  const circle = { kind: "circle", u: 0.5, v: 0.5, r: 0.3 };
  const round = E.applySelectedLightPreset({ presetId: "area.custom", cue: cue(), fixtures, selection: ["m-left", "fixed", "m-right"], choices: { region: circle } });
  assert.equal(round.status, "applied");
  assert.deepEqual(plain(round.nextCue.lights.fixed.presetMeta.lastAppliedByScope.area.region), circle);
  round.targets.forEach((id) => {
    const target = round.nextCue.lights[id].path.a;
    assert.ok((target.u - circle.u) ** 2 + (target.v - circle.v) ** 2 <= circle.r ** 2 + 1e-10);
  });
  const outside = E.applySelectedLightPreset({ presetId: "area.custom", cue: cue(), fixtures, selection: ["m-left"], choices: { region: { kind: "circle", u: 0.5, v: 0.5, r: 0.6 } } });
  assert.equal(outside.status, "invalid"); assert.equal(outside.reason, "custom-region-required");
});

test("ムービング専用型は固定灯を変えず、除外理由を返す", () => {
  const before = cue();
  const r = E.applySelectedLightPreset({ presetId: "motion.sweep", cue: before, fixtures, selection: ["fixed", "m-left"] });
  assert.equal(r.status, "applied"); assert.deepEqual(plain(r.targets), ["m-left"]);
  assert.deepEqual(plain(r.skipped), [{ id: "fixed", reason: "moving-fixture-required" }]);
  assert.deepEqual(plain(r.nextCue.lights.fixed), plain(before.lights.fixed));
});

test("担当外属性と未知キーを保ち、入力cueは変更しない", () => {
  const before = cue();
  const r = E.applySelectedLightPreset({ presetId: "motion.circle", cue: before, fixtures, selection: ["m-left"], choices: { radius: 0.2 } });
  assert.equal(r.nextCue.lights["m-left"].color, "#abc"); assert.equal(r.nextCue.lights["m-left"].level, 44); assert.equal(r.nextCue.lights["m-left"].beamDeg, 19);
  assert.deepEqual(plain(r.nextCue.lights["m-left"].custom), { keep: true }); assert.deepEqual(plain(r.nextCue.unknownTopLevel), { preserve: true });
  assert.equal(before.lights["m-left"].path.kind, "still"); assert.equal(before.lights["m-left"].presetMeta, undefined);
});

test("空選択と同値の再適用はno-opで、履歴を積む必要がないことを結果で示す", () => {
  const empty = E.applySelectedLightPreset({ presetId: "area.full", cue: cue(), fixtures, selection: [] });
  assert.equal(empty.status, "noop"); assert.equal(empty.reason, "no-selected-fixtures");
  const first = E.applySelectedLightPreset({ presetId: "flash.all", cue: cue(), fixtures, selection: ["m-left"], choices: { rateHz: 2 } });
  const second = E.applySelectedLightPreset({ presetId: "flash.all", cue: first.nextCue, fixtures, selection: ["m-left"], choices: { rateHz: 2 } });
  assert.equal(second.status, "noop"); assert.equal(second.reason, "no-change");
});

test("点滅とカーテン追いは試作の時間調整形式へ変換し、相対位相を残す", () => {
  const flash = E.applySelectedLightPreset({ presetId: "flash.alternate", cue: cue(), fixtures, selection: ["m-left", "m-right"], choices: { rateHz: 2, phaseOffset: 0.25 } });
  assert.equal(flash.status, "applied");
  assert.deepEqual(plain(flash.nextCue.lights["m-left"].strobe), { on: true, kind: "sharp", hz: 2, duty: 50, phaseNorm: 0.25 });
  assert.deepEqual(plain(flash.nextCue.lights["m-right"].strobe), { on: true, kind: "sharp", hz: 2, duty: 50, phaseNorm: 0.75 });
  assert.equal(flash.nextCue.lights["m-left"].levelTo, 44);
  const chase = E.applySelectedLightPreset({ presetId: "show.curtainChase", cue: cue(), fixtures, selection: ["m-left", "m-right"], choices: { rateHz: 1.5 } });
  assert.equal(chase.nextCue.lights["m-left"].strobe.on, true);
  assert.equal(chase.nextCue.lights["m-left"].strobe.hz, 1.5);
  assert.equal(chase.nextCue.lights["m-right"].strobe.phaseNorm, 0.5);
});

test("未知の経路版を保ったまま別の属性型を適用できる", () => {
  const before = cue(); before.lights["m-left"].path = { kind: "wander", pathVersion: 99, seed: 1 };
  const r = E.applySelectedLightPreset({ presetId: "value.alternate", cue: before, fixtures, selection: ["m-left", "m-right"] });
  assert.equal(r.status, "applied"); assert.equal(r.nextCue.lights["m-left"].path.pathVersion, 99);
});

test("グラデーションは連続色を配り、ライトカーテンは演出として由来を残す", () => {
  const gradient = E.applySelectedLightPreset({ presetId: "value.gradient", cue: cue(), fixtures, selection: ["m-left", "fixed", "m-right"], choices: { colorA: "#000000", colorB: "#ffffff" } });
  assert.equal(gradient.nextCue.lights["m-left"].color, "#000000"); assert.equal(gradient.nextCue.lights.fixed.color, "#808080"); assert.equal(gradient.nextCue.lights["m-right"].color, "#ffffff");
  const curtain = E.applySelectedLightPreset({ presetId: "show.curtain", cue: cue(), fixtures, selection: ["m-left", "fixed", "m-right"] });
  assert.equal(curtain.nextCue.lights.fixed.presetMeta.lastAppliedByScope.show.id, "show.curtain");
  assert.equal(curtain.nextCue.lights.fixed.presetMeta.lastAppliedByScope.area, undefined);
});

test("カーテンを開く／波は既存の扇軌道を保ちつつ、演出としての由来を残す", () => {
  ["show.curtainOpen", "show.curtainWave"].forEach((presetId) => {
    const result = E.applySelectedLightPreset({ presetId, cue: cue(), fixtures, selection: ["m-left", "m-right"], choices: { periodSec: 9 }, regions });
    assert.equal(result.status, "applied", presetId);
    result.targets.forEach((id) => {
      const applied = result.nextCue.lights[id].presetMeta.lastAppliedByScope;
      assert.equal(applied.motion.id, "motion.fan");
      assert.equal(applied.show.id, presetId);
      assert.equal(applied.show.derivedMotionPresetId, "motion.fan");
    });
  });
});

test("調整ありは型の担当属性だけを適用時の値と比較する", () => {
  const area = E.applySelectedLightPreset({ presetId: "area.full", cue: cue(), fixtures, selection: ["m-left", "m-right"], choices: { alignIntensity: false } });
  const areaLight = plain(area.nextCue.lights["m-left"]);
  const areaApplied = areaLight.presetMeta.lastAppliedByScope.area;
  assert.equal(E.isAppliedValueChanged(areaLight, "area", areaApplied), false);
  areaLight.color = "#123456";
  assert.equal(E.isAppliedValueChanged(areaLight, "area", areaApplied), false, "範囲型に関係ない色は調整ありにしない");
  areaLight.path.a.u = 0.73;
  assert.equal(E.isAppliedValueChanged(areaLight, "area", areaApplied), true);
  assert.deepEqual(plain(E.appliedValueChanges(areaLight, "area", areaApplied)), ["path"]);

  const curtain = E.applySelectedLightPreset({ presetId: "show.curtainOpen", cue: cue(), fixtures, selection: ["m-left", "m-right"], choices: { periodSec: 9 }, regions });
  const curtainLight = plain(curtain.nextCue.lights["m-left"]);
  const curtainApplied = curtainLight.presetMeta.lastAppliedByScope.show;
  assert.equal(E.isAppliedValueChanged(curtainLight, "show", curtainApplied), false);
  curtainLight.level = 12;
  assert.equal(E.isAppliedValueChanged(curtainLight, "show", curtainApplied), false, "開閉演出に関係ない強さは調整ありにしない");
  curtainLight.periodSec = 13;
  assert.equal(E.isAppliedValueChanged(curtainLight, "show", curtainApplied), true);
  assert.deepEqual(plain(E.appliedValueChanges(curtainLight, "show", curtainApplied)), ["periodSec"]);
  assert.deepEqual(plain(E.appliedValueChanges(cue().lights["m-left"], "motion", { id: "motion.fan" })), [], "旧cueの由来には差分表示を出さない");
});

test("32型の調整ありは保存キーでなく型ごとの短い属性名を示す", () => {
  const expected = Object.fromEntries(E.PRESETS.map((preset) => {
    let labels = ["狙い"];
    if (preset.family === "area") labels = ["狙い", "広がり", "強さ"];
    if (preset.family === "motion") labels = ["軌道", "速さ", "ずらし"];
    if (preset.id === "value.alternate" || preset.id === "value.gradient") labels = ["色"];
    if (preset.id === "value.center" || preset.id === "value.outside") labels = ["強さ"];
    if (preset.id === "show.curtain") labels = ["光の並び", "広がり"];
    if (preset.id === "show.curtainOpen" || preset.id === "show.curtainWave") labels = ["軌道", "速さ", "ずらし"];
    if (preset.id === "show.curtainChase" || preset.family === "flash") labels = ["強さ", "点滅"];
    return [preset.id, labels];
  }));
  assert.equal(Object.keys(expected).length, 32);
  E.PRESETS.forEach((preset) => {
    const choices = { region: { kind: "rect", u0: 0.2, v0: 0.2, u1: 0.8, v1: 0.8 }, audienceRegionId: "audience:main", seed: 91 };
    const selection = preset.movingOnly ? ["m-left", "m-right"] : ["m-left", "fixed", "m-right"];
    const result = E.applySelectedLightPreset({ presetId: preset.id, cue: cue(), fixtures, selection, choices, regions });
    const applied = result.nextCue.lights[result.targets[0]].presetMeta.lastAppliedByScope[preset.scope];
    assert.deepEqual(plain(E.adjustmentLabels(preset.id, Object.keys(applied.values))), expected[preset.id], preset.id);
  });
  assert.deepEqual(plain(E.adjustmentLabels("unknown", ["path"])), []);
});

test("32型は担当外を無視し、担当した各属性だけを調整ありとして拾う", () => {
  const changedValue = (value) => {
    if (typeof value === "number") return value + 0.125;
    if (typeof value === "string") return `${value}-review`;
    return { ...(value || {}), reviewChanged: true };
  };
  E.PRESETS.forEach((preset) => {
    const choices = { region: { kind: "rect", u0: 0.2, v0: 0.2, u1: 0.8, v1: 0.8 }, audienceRegionId: "audience:main", seed: 91 };
    const selection = preset.movingOnly ? ["m-left", "m-right"] : ["m-left", "fixed", "m-right"];
    const result = E.applySelectedLightPreset({ presetId: preset.id, cue: cue(), fixtures, selection, choices, regions });
    const id = result.targets[0], baseline = plain(result.nextCue.lights[id]);
    const applied = baseline.presetMeta.lastAppliedByScope[preset.scope];
    const outside = plain(baseline);
    outside.gobo = { reviewChanged: true };
    assert.deepEqual(plain(E.appliedValueChanges(outside, preset.scope, applied)), [], `${preset.id}: 担当外のゴボは無視する`);
    Object.keys(applied.values).forEach((key) => {
      const changed = plain(baseline);
      changed[key] = changedValue(changed[key]);
      assert.deepEqual(plain(E.appliedValueChanges(changed, preset.scope, applied)), [key], `${preset.id}: ${key}`);
      assert.equal(E.adjustmentLabels(preset.id, [key]).length, 1, `${preset.id}: ${key}の表示名`);
    });
  });
});

test("32型すべてが対応する選択と入力で純関数として適用できる", () => {
  E.PRESETS.forEach((preset) => {
    const choices = { region: { kind: "rect", u0: 0.2, v0: 0.2, u1: 0.8, v1: 0.8 }, audienceRegionId: "audience:main", seed: 91 };
    const selection = preset.movingOnly ? ["m-left", "m-right"] : ["m-left", "fixed", "m-right"];
    const r = E.applySelectedLightPreset({ presetId: preset.id, cue: cue(), fixtures, selection, choices, regions });
    assert.equal(r.status, "applied", preset.id);
  });
});
