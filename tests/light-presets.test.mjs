import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

/* 照明デザインモード試作の「照明のあるある」プリセット（docs/light-rig-design-2026-09-11/prototype/light-presets.js）。
   純関数だけをここで確かめる。描画・UIは light-presets-ui.js（ブラウザで実測）。
   設計の正本: docs/light-rig-design-2026-09-11/visual-presets-2026-09-14/DECISION.html */
const base = new URL("../docs/light-rig-design-2026-09-11/prototype/", import.meta.url);
const context = { window: {} };
vm.runInNewContext(await readFile(new URL("rig-engine.js", base), "utf8"), context, { filename: "rig-engine.js" });
vm.runInNewContext(await readFile(new URL("light-presets.js", base), "utf8"), context, { filename: "light-presets.js" });
const E = context.window.RIG_ENGINE;
const LP = context.window.LIGHT_PRESETS;
const plain = (v) => JSON.parse(JSON.stringify(v));

let seq = 1;
const deps = () => ({ newTruss: E.newTruss, newFixture: E.newFixture, uid: (p) => `${p}${seq++}`, nextNo: 1 });
const rigOf = (size) => { seq = 1; const r = LP.buildHouseRig(size, deps()); return { rig: { trusses: r.trusses, fixtures: r.fixtures, bindings: r.bindings }, dims: r.dims }; };
const emptyCue = () => ({ lights: {}, groups: [] });
const lit = (cue) => Object.entries(cue.lights).filter(([, l]) => l.on === true).map(([id]) => id);

test("公開している一式", () => {
  ["buildHouseRig", "applyPreset", "nowChips", "cardState", "sizeForDims", "supportCheck"].forEach((k) => assert.equal(typeof LP[k], "function", `${k} が無い`));
  assert.equal(LP.PRESETS.length, 30, "あるあるは30件");
  assert.equal(new Set(LP.PRESETS.map((p) => p.id)).size, 30, "IDが重複");
  assert.deepEqual(plain(LP.PRESETS.filter((p) => p.kind === "light").length), 24);
  assert.equal(LP.PRESETS.filter((p) => p.kind === "motion").length, 5);
  assert.equal(LP.PRESETS.filter((p) => p.kind === "reset").length, 1);
});

test("仮想仕込み3種の要素数は 小34／中54／大70（cyc上下2列込み）", () => {
  const n = (s) => rigOf(s).rig.fixtures.length;
  assert.equal(n("small"), 34); assert.equal(n("mid"), 54); assert.equal(n("large"), 70);
  assert.equal(rigOf("small").rig.trusses.length, 2, "小はバトン2本");
  assert.equal(rigOf("mid").rig.trusses.length, 3); assert.equal(rigOf("large").rig.trusses.length, 3);
});

test("配置グループの対応表（WASH/SPECIAL/BACK/FL）と固定灯の共通狙い", () => {
  const { rig } = rigOf("mid");
  const g = rig.bindings.groups;
  assert.equal(g.WASH.length, 14); assert.equal(g.SPECIAL.length, 2); assert.equal(g.BACK.length, 8); assert.equal(g.FL.length, 4);
  assert.equal(g.CL.length, 12); assert.equal(g.FR.length, 4); assert.equal(g.SL.length, 4); assert.equal(g.SH.length, 4); assert.equal(g.CY.length, 2);
  // SPECIAL はバトン1の中央寄り2灯。WASH と重ならない
  const fx = (id) => rig.fixtures.find((f) => f.id === id);
  g.SPECIAL.forEach((id) => { assert.ok(Math.abs(fx(id).mount.u - 0.5) < 0.1); assert.ok(!g.WASH.includes(id)); });
  // 固定灯はすべて共通狙いを持つ。ムービング（バトン・転がし）も既定の狙いを持つ
  rig.fixtures.forEach((f) => assert.ok(rig.bindings.defaultAim[f.id], `${f.id} に共通狙いが無い`));
  // シーリングは仰角45°の式: 中央用 小 ahead 3.5 → h 7.128（DECISION §2 の表）
  const cl = rig.fixtures.find((f) => f.mount.type === "front" && g["CL.center.l"].includes(f.id));
  assert.equal(cl.mount.ahead, 3.5); assert.ok(Math.abs(cl.mount.h - 7.128) < 0.001);
  // 小はWASH＝バトン1の4灯、BACK＝バトン2
  const s = rigOf("small").rig.bindings.groups; assert.equal(s.WASH.length, 4); assert.equal(s.BACK.length, 6); assert.equal(s.FL.length, 2);
});

test("setup: 対象灯だけ作り直し、対象外の灯には触れない（重ねる）", () => {
  const { rig, dims } = rigOf("mid");
  const a = LP.applyPreset({ preset: LP.presetById("cl.all"), rig, dims, cue: emptyCue(), E });
  assert.equal(a.status, "applied"); assert.equal(lit(a.nextCue).length, 12);
  const b = LP.applyPreset({ preset: LP.presetById("cyc.single"), rig, dims, cue: a.nextCue, E });
  assert.equal(lit(b.nextCue).length, 14, "前明かり12＋ホリ2が重なる");
  // 入力は変更しない
  assert.equal(lit(a.nextCue).length, 12);
  // 由来
  const chips = LP.nowChips(b.nextCue, rig);
  assert.deepEqual(plain(chips.map((c) => c.presetId).sort()), ["cl.all", "cyc.single"]);
  assert.equal(chips.find((c) => c.presetId === "cyc.single").ids.length, 2);
});

test("同じ配置グループは後勝ち: ホリ青→ホリ上下2色で置き換わる。前明かりは残る", () => {
  const { rig, dims } = rigOf("mid");
  let c = LP.applyPreset({ preset: LP.presetById("cl.all"), rig, dims, cue: emptyCue(), E }).nextCue;
  c = LP.applyPreset({ preset: LP.presetById("cyc.single"), rig, dims, cue: c, E }).nextCue;
  assert.equal(LP.cardState(LP.presetById("cyc.two"), c, rig, dims, E).state, "replaces");
  c = LP.applyPreset({ preset: LP.presetById("cyc.two"), rig, dims, cue: c, E }).nextCue;
  const g = rig.bindings.groups;
  assert.equal(c.lights[g["CY.lower"][0]].color, LP.COLOR.O); assert.equal(c.lights[g["CY.upper"][0]].color, LP.COLOR.P);
  assert.equal(lit(c).length, 14);
  assert.equal(LP.cardState(LP.presetById("cyc.two"), c, rig, dims, E).state, "on");
  assert.equal(LP.cardState(LP.presetById("cl.all"), c, rig, dims, E).state, "on");
  assert.equal(LP.cardState(LP.presetById("cyc.single"), c, rig, dims, E).state, "replaces");
});

test("前明かり・中央は CL 全体を対象にして面用を消す。色選択は choices で効く", () => {
  const { rig, dims } = rigOf("large");
  let c = LP.applyPreset({ preset: LP.presetById("cl.all"), rig, dims, cue: emptyCue(), E }).nextCue;
  c = LP.applyPreset({ preset: LP.presetById("cl.center"), rig, dims, cue: c, E }).nextCue;
  assert.equal(lit(c).length, 2);
  const w = LP.applyPreset({ preset: LP.presetById("wash.all"), rig, dims, cue: c, choices: { color: LP.COLOR.B }, E });
  assert.equal(w.status, "applied");
  w.targets.forEach((id) => assert.equal(w.nextCue.lights[id].color, LP.COLOR.B));
  assert.equal(w.nextCue.lights[w.targets[0]].beamDeg, 36, "大劇場の地明かりは36°");
});

test("手で触った灯は「調整あり」", () => {
  const { rig, dims } = rigOf("mid");
  const c = LP.applyPreset({ preset: LP.presetById("ss.low"), rig, dims, cue: emptyCue(), E }).nextCue;
  assert.equal(LP.cardState(LP.presetById("ss.low"), c, rig, dims, E).state, "on");
  const id = lit(c)[0]; c.lights[id] = { ...c.lights[id], level: 30 };
  assert.equal(LP.isAdjusted(c.lights[id]), true);
  assert.equal(LP.cardState(LP.presetById("ss.low"), c, rig, dims, E).state, "adjusted");
  assert.equal(LP.nowChips(c, rig)[0].adjusted, true);
});

test("動き: 床を狙って点いているムービングだけ。固定灯・消灯・空中は対象外。組は対象灯だけ組み替える", () => {
  const { rig, dims } = rigOf("mid");
  let c = LP.applyPreset({ preset: LP.presetById("cl.all"), rig, dims, cue: emptyCue(), E }).nextCue;   // 固定灯だけ
  let m = LP.applyPreset({ preset: LP.presetById("move.sweep"), rig, dims, cue: c, E });
  assert.equal(m.status, "noop", "固定灯しか点いていなければ何もしない");
  const a3 = LP.applyPreset({ preset: LP.presetById("area.3"), rig, dims, cue: c, E }); c = a3.nextCue;   // ムービング3灯・床
  c = LP.applyPreset({ preset: LP.presetById("fl.back"), rig, dims, cue: c, E }).nextCue;  // 転がし4灯・空中（対象外）
  m = LP.applyPreset({ preset: LP.presetById("move.fan"), rig, dims, cue: c, E });
  assert.equal(m.status, "applied"); assert.equal(m.targets.length, 3);
  assert.equal(m.nextCue.groups.length, 1); assert.equal(m.nextCue.groups[0].compose, "fan");
  m.targets.forEach((id) => { assert.equal(m.nextCue.lights[id].path.kind, "line"); assert.equal(m.nextCue.lights[id].level, 70, "色・強さは維持"); assert.equal(m.nextCue.lights[id].srcm.m, "move.fan"); });
  // 転がしと前明かりは触らない
  rig.bindings.groups.FL.forEach((id) => assert.equal(m.nextCue.lights[id].path.kind, "still"));
  const chip = LP.nowChips(m.nextCue, rig).find((x) => x.presetId === "area.3");
  assert.equal(chip.label, "エリア・3分割＋扇");
  assert.equal(chip.adjusted, false, "動きを当てただけでは「調整あり」にしない");
  // 止める: いまの位置で静止し、組から外れる
  const s = LP.applyPreset({ preset: LP.presetById("move.stop"), rig, dims, cue: m.nextCue, E, timeMs: 2000 });
  assert.equal(s.status, "applied"); assert.equal(s.nextCue.groups.length, 0);
  s.targets.forEach((id) => assert.equal(s.nextCue.lights[id].path.kind, "still"));
  // 選択があればその中の適格灯だけ
  const one = LP.applyPreset({ preset: LP.presetById("move.circle"), rig, dims, cue: c, E, selection: new Set([a3.targets[0], "nope"]) });
  assert.equal(one.status, "applied"); assert.equal(one.targets.length, 1);
  // 選択に適格灯が無ければ点いている適格灯すべて
  const all = LP.applyPreset({ preset: LP.presetById("move.circle"), rig, dims, cue: c, E, selection: new Set([rig.bindings.groups.CY[0]]) });
  assert.equal(all.targets.length, 3);
});

test("全部消す: 消灯のみで設定は残る", () => {
  const { rig, dims } = rigOf("small");
  let c = LP.applyPreset({ preset: LP.presetById("cyc.single"), rig, dims, cue: emptyCue(), E }).nextCue;
  const r = LP.applyPreset({ preset: LP.presetById("all.off"), rig, dims, cue: c, E });
  assert.equal(r.status, "applied"); assert.equal(lit(r.nextCue).length, 0);
  const id = rig.bindings.groups.CY[0]; assert.equal(r.nextCue.lights[id].color, LP.COLOR.B, "色は残る");
  assert.equal(LP.applyPreset({ preset: LP.presetById("all.off"), rig, dims, cue: r.nextCue, E }).status, "noop");
});

test("仮想仕込みでない rig では未対応（機材不足とは言わない）", () => {
  const rig = { trusses: [], fixtures: [E.newFixture("f1", 1, { type: "floor", u: 0.5, v: 0.5 }, "")] };
  const r = LP.applyPreset({ preset: LP.presetById("cl.all"), rig, dims: { W: 12, D: 8, H: 8 }, cue: emptyCue(), E });
  assert.equal(r.status, "unsupported"); assert.match(r.reason, /初版では試せません/);
  assert.equal(LP.cardState(LP.presetById("cl.all"), emptyCue(), rig, null, E).state, "unsupported");
});

test("30件すべてが3サイズで適用できる（unsupported/例外なし）", () => {
  ["small", "mid", "large"].forEach((size) => {
    const { rig, dims } = rigOf(size);
    let c = emptyCue();
    // 動きの前提として床を狙うムービングを点けておく
    LP.PRESETS.forEach((p) => {
      const r = LP.applyPreset({ preset: p, rig, dims, cue: c, E, timeMs: 500 });
      assert.notEqual(r.status, "unsupported", `${size}: ${p.id} が未対応`);
      if (r.status === "applied") c = r.nextCue;
      if (p.id === "wash.all") assert.equal(r.targets.length, rig.bindings.groups.WASH.length);
      if (p.id === "top.row" || p.id === "path.center") assert.equal(r.targets.length, 4, `${size}: ${p.id} は4灯`);
      if (p.id === "area.3") assert.equal(r.targets.length, 3);
      if (p.id.startsWith("spot.")) assert.equal(r.targets.length, 1);
    });
  });
});
