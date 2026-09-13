import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../stage-sketch.js", import.meta.url), "utf8");
function between(start, end) {
  const a = source.indexOf(start); const b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, start);
  return source.slice(a, b);
}
function harness(pieces = []) {
  const project = { sets: [{ id: "mask-set", kind: "prop", propShape: "mask" }], scenes: [{ pieces }] };
  const c = { state: { project }, sc: () => project.scenes[0],
    isHoldable: p => p.type === "prop" && !p.flown,
    announce() {}, tx: x => x, heldItemName: p => p.id, performerName: p => p.id };
  vm.createContext(c);
  vm.runInContext([
    between("const BASE_JOINTS =", "/* 衣装・髪型の語彙"),
    between("const norm3 =", "// 多角形の角"),
    between("function mixToward", "// 体の部位"),
    between("function isMask", "function scaledPropShape"),
    between("function normalizeHolds", "const STASH_KEYS"),
    between("function freeHoldSide", "function syncHoldingControls"),
    "finishHoldingChange = () => {}; this.poses = POSES.concat(HIDDEN_POSES);",
  ].join("\n"), c);
  return c;
}
const actor = { id: "a", type: "performer" };
const prop = (id, overrides = {}) => ({ id, type: "prop", propShape: "mask", heldBy: "a", holdSide: "R", ...overrides });

test("顔・左右の手を独立して保持し、顔の重複と参照切れを解除する", () => {
  const pieces = [actor, prop("right"), prop("left", { holdSide: "L" }),
    prop("face", { holdMode: "face", propShape: null, setId: "mask-set" }),
    prop("duplicate", { holdMode: "face" }), prop("missing", { heldBy: "absent" }),
    prop("invalid", { holdMode: "face", propShape: "box" })];
  const c = harness(pieces); c.normalizeHolds(pieces, c.state.project);
  assert.deepEqual(pieces.slice(1).map(p => p.heldBy), ["a", "a", "a", null, null, null]);
  assert.equal(c.freeHoldSide("a", null, "R"), null);
  assert.equal(c.freeHoldSide("a", "right", "R"), "R");
});

test("両手が埋まっていても装着でき、手への切替失敗は装着状態を保つ", () => {
  const mask = prop("mask", { heldBy: null });
  const pieces = [actor, prop("right", { propShape: "club" }), prop("left", { propShape: "ball", holdSide: "L" }), mask];
  const c = harness(pieces);
  assert.equal(c.wearMaskBy(mask, actor), true);
  assert.equal(c.holdPieceBy(mask, actor, "R"), false);
  assert.equal(mask.holdMode, "face"); assert.equal(mask.heldBy, "a");
  c.dropHeldPiece(pieces[1]);
  assert.equal(c.holdPieceBy(mask, actor, "R"), true);
  assert.equal(mask.holdMode, "hand"); assert.equal(mask.holdSide, "R");
});

test("既に仮面がある顔への装着は失敗し、元の持ち手と手を保つ", () => {
  const original = prop("original", { holdMode: "face" });
  const next = prop("next", { holdSide: "L" });
  const c = harness([actor, original, next]);
  assert.equal(c.wearMaskBy(next, actor), false);
  assert.equal(next.heldBy, "a"); assert.equal(next.holdSide, "L"); assert.notEqual(next.holdMode, "face");
  assert.equal(c.canWearMask(prop("box", { propShape: "box" }), actor), false);
  assert.equal(c.canWearMask(prop("flown", { flown: true }), actor), false);
});

test("全姿勢・3身長で頭からの距離と仮面の実寸を保ち、倒れた姿勢にも追従する", () => {
  const c = harness();
  for (const pose of c.poses) for (const height of [1.2, 1.65, 2.1]) {
    const at = c.maskFacePoint(pose, height, [0, 0, 0]);
    assert.ok(at.every(Number.isFinite), pose.id);
    const distance = Math.hypot(...at.map((v, i) => v - pose.joints.head[i])) * height;
    assert.ok(Math.abs(distance - 0.049 * height) < 1e-10, `${pose.id}: head offset ${distance}`);
    const axes = [[0.18, 0, 0], [0, 0.24, 0], [0, 0, 0.08]].map(point =>
      c.maskFacePoint(pose, height, point).map((v, i) => (v - at[i]) * height));
    axes.forEach((axis, i) => assert.ok(Math.abs(Math.hypot(...axis) - [0.18, 0.24, 0.08][i]) < 1e-10, pose.id));
    assert.ok(Math.abs(axes[0].reduce((sum, v, i) => sum + v * axes[1][i], 0)) < 1e-10, pose.id);
  }
});

test("仮面の前面だけに目と口を描き、描画座標と塗り色が有限になる", () => {
  const c = harness();
  const paints = [];
  const point = (...values) => assert.ok(values.every(Number.isFinite));
  const ctx = { beginPath() {}, moveTo: point, lineTo: point, closePath() {}, save() {}, restore() {},
    fill() { assert.ok(!String(this.fillStyle).includes("NaN")); paints.push(this.fillStyle); } };
  const dims = { w: 0.18, d: 0.08, h: 0.24 };
  c.paintMask(ctx, (x, y, z) => ({ x, y, z }), dims, "#efe7d6");
  assert.ok(paints.includes("#221d18"));
  paints.length = 0;
  c.paintMask(ctx, (x, y, z) => ({ x, y, z: -z }), dims, "#efe7d6");
  assert.equal(paints.includes("#221d18"), false);
});

test("シーン複製は装着方法を保ち、新しい演者IDへ持ち手を張り替える", () => {
  let id = 0;
  const c = { rid: () => `scene-${++id}`, nextId: () => `piece-${++id}` };
  vm.createContext(c);
  vm.runInContext(between("function cloneScene", "function nextSceneOf"), c);
  const original = { id: "scene", kind: "scene", pieces: [actor, prop("mask", { holdMode: "face" })] };
  const copy = c.cloneScene(original);
  assert.equal(copy.pieces[1].holdMode, "face");
  assert.equal(copy.pieces[1].heldBy, copy.pieces[0].id);
  assert.notEqual(copy.pieces[1].heldBy, actor.id);
  assert.equal(original.pieces[1].heldBy, actor.id);
});

test("3Dの頭描画は受け取った仮面と投影関数で前後を描き、仮面なしでも動く", () => {
  const firstPerson = readFileSync(new URL("../stage-first-person.js", import.meta.url), "utf8");
  const start = firstPerson.indexOf("function paintBody3d");
  const end = firstPerson.indexOf("function paintWheel3d", start);
  assert.ok(start >= 0 && end > start);
  const c = {}; vm.createContext(c); vm.runInContext(firstPerson.slice(start, end), c);
  const calls = [];
  const body = { LIMBS: [], torsoOutline: () => [], smoothClosedPath() {}, paintFaceMask: (...args) => calls.push(args) };
  const ctx = { save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {} };
  const P = Object.fromEntries(["head", "neck", "shL", "shR", "hipL", "hipR"].map(k => [k, { x: 0, y: 1, z: 0, s: 1 }]));
  const attachment = { mask: { dims: { w: .18, d: .08, h: .24 }, color: "#efe7d6" }, project: () => ({}), pose: {}, H: 1.65 };
  c.paintBody3d(ctx, body, P, [], null, null, null, "#a84b26", null, attachment);
  assert.deepEqual(calls.map(args => args[5]), [false, true]);
  for (const args of calls) {
    assert.equal(args[1], attachment.project); assert.equal(args[2], attachment.pose);
    assert.equal(args[3], attachment.H); assert.equal(args[4], attachment.mask);
  }
  c.paintBody3d(ctx, body, P, [], null, null, null, "#a84b26", null);
  assert.equal(calls.length, 2);
});

test("香盤は顔への装着と手への持ち替えを区別して案内する", () => {
  const item = { id: "m", kind: "prop", name: "仮面" };
  const c = { state: { project: { sets: [item], cast: [] } }, tx: x => x,
    pieceLabel: p => p.name, onStageArea: () => true };
  vm.createContext(c); vm.runInContext(between("const registeredProps =", "function syncPropMoves"), c);
  const scene = mode => ({ pieces: [{ ...actor, name: "演者A" }, { ...prop("p"), setId: "m", holdMode: mode }] });
  assert.equal(c.propSceneSummary(scene("face"), false)[0], "仮面=演者A（顔）");
  assert.equal(c.propMovesBetweenScenes(scene("hand"), scene("face"), false)[0], "仮面: 演者Aが顔につける");
  assert.equal(c.propMovesBetweenScenes(scene("face"), scene("hand"), false)[0], "仮面: 演者Aが顔から外して手に持つ");
  assert.equal(c.propMovesBetweenScenes({ pieces: [] }, scene("face"), true)[0], "仮面: 演者A enters wearing it");
});
