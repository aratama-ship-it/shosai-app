import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-machinery.js", import.meta.url), "utf8");
const context = { window: {}, Date, Math, JSON };
vm.runInNewContext(source, context, { filename: "stage-machinery.js" });
const machinery = context.window.SHOSAI_STAGE_MACHINERY;
const plain = (value) => JSON.parse(JSON.stringify(value));
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9,
  `${actual} should be close to ${expected}`);
const dims = (piece) => piece.type === "revolve" ? piece.dims : null;

test("盆の内側の駒は盆の中心まわりに回転し、向きも追従する", () => {
  const revolve = { id: "rev", type: "revolve", u: .5, v: .5, spin: 90, dims: { dia: 10 } };
  const piece = { id: "actor", type: "performer", u: .75, v: .5, facing: 0 };
  const placed = machinery.effectivePlacement(piece, { pieces: [revolve, piece] },
    { width: 20, depth: 20 }, { dimsFor: dims, isFlown: () => false });
  closeTo(placed.u, .5);
  closeTo(placed.v, .75);
  closeTo(placed.facing, 90);
  assert.equal(placed.revolveId, "rev");
});

test("二重盆では最も小さい内盆だけを選び、内盆自身は外盆に追従する", () => {
  const outer = { id: "outer", type: "revolve", u: .5, v: .5, spin: 90, dims: { dia: 16 } };
  const inner = { id: "inner", type: "revolve", u: .6, v: .5, spin: -45, dims: { dia: 9 } };
  const piece = { id: "prop", type: "block", u: .65, v: .5, facing: 10 };
  const scene = { pieces: [outer, inner, piece] };
  const options = { dimsFor: dims, isFlown: () => false };
  const innerPlaced = machinery.effectivePlacement(inner, scene, { width: 20, depth: 20 }, options);
  const piecePlaced = machinery.effectivePlacement(piece, scene, { width: 20, depth: 20 }, options);
  assert.equal(innerPlaced.revolveId, "outer");
  assert.equal(piecePlaced.revolveId, "inner");
  closeTo(piecePlaced.u, .5 + Math.SQRT1_2 / 20);
  closeTo(piecePlaced.v, .6 + Math.SQRT1_2 / 20);
  closeTo(piecePlaced.facing, 55);
});

test("左右開きの幕は閉じたとき全幅、全開時も両端に8%ずつ布を残す", () => {
  const closed = machinery.machineryParts({ type: "curtain", curtainKind: "front", open: 0 },
    { w: 10, h: 8, lift: 0 });
  const open = machinery.machineryParts({ type: "curtain", curtainKind: "front", open: 100 },
    { w: 10, h: 8, lift: 0 });
  closeTo(closed.reduce((sum, part) => sum + part.w, 0), 10);
  assert.deepEqual(plain(open.map((part) => part.w)), [.8, .8]);
});

test("プール床が水面より下なら水面を描き、床が0なら乾いた床だけにする", () => {
  const wet = machinery.machineryParts({ type: "pool", poolH: -3, water: 1 }, { w: 16, d: 12 });
  const dry = machinery.machineryParts({ type: "pool", poolH: 0, water: 1 }, { w: 16, d: 12 });
  assert.equal(wet.length, 2);
  assert.equal(wet[1].surface, "water");
  assert.equal(wet[1].lift, 1);
  assert.equal(dry.length, 1);
  assert.equal(dry[0].lift, 0);
});

test("負のせりは床線より下の箱として展開する", () => {
  const parts = machinery.machineryParts({ type: "seri", seriH: -2 }, { w: 3, d: 2 });
  assert.deepEqual(plain(parts), [{ ox: 0, oz: 0, w: 3, d: 2, h: 2, lift: -2, tint: 1 }]);
});

test("5件の内蔵プリセットは未確認の根拠メモを持ち、展開するとsetsとpiecesが増える", () => {
  const presets = machinery.builtInPresets({ width: 18, depth: 12, height: 9 });
  assert.equal(presets.length, 5);
  presets.forEach((preset) => {
    assert.equal(preset.confidence, "unverified");
    assert.equal(preset.sourceNote, "一般的な劇場設備の目安から置いた出発点。実在ショーの公表値ではない");
  });
  const project = { sets: [] };
  const scene = { pieces: [] };
  let id = 0;
  const created = machinery.expandPreset(project, scene, presets[1], {
    makeId: (prefix) => `${prefix}-${++id}`,
    normalizeDims: (kind, item) => item.dims,
    normalizePiece: (piece) => piece,
  });
  assert.equal(created.length, 2);
  assert.equal(project.sets.length, 2);
  assert.equal(scene.pieces.length, 2);
  assert.ok(project.sets.every((set) => set.estimated && set.confidence === "unverified"));
});
