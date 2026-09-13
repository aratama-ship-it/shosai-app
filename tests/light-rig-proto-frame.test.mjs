import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

/* 照明デザインモード試作（docs/light-rig-design-2026-09-11/prototype/rig-engine.js）の
   バーンドア／カッター（2026-09-14）。「切る線」の純関数だけをここで確かめる。描画は app.js 側。 */
const source = await readFile(new URL("../docs/light-rig-design-2026-09-11/prototype/rig-engine.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "rig-engine.js" });
const E = context.window.RIG_ENGINE;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const plain = (v) => JSON.parse(JSON.stringify(v));   // vm の別レルムのオブジェクトは deepEqual で prototype が合わないので平文にする
const fixed = (barn) => ({ ...E.newFixture("f1", 1, { type: "truss", trussId: "t", u: 0.5 }, "", "fixed", 24), barn });
const mover = (barn) => ({ ...E.newFixture("f2", 2, { type: "truss", trussId: "t", u: 0.5 }, "", "moving", 15), barn });

test("公開している一式", () => {
  ["BARN_KEYS", "SHUTTER_ROT_MAX", "newShutter", "barnOf", "barnActive", "shutterActive", "frameDoors", "doorCutInEllipse"].forEach((k) => assert.ok(k in E, `${k} が無い`));
  assert.deepEqual(plain([...E.BARN_KEYS]), ["back", "front", "left", "right"]);
  assert.equal(E.newShutter().rot, 0);
});

test("バーンドアは固定灯だけ・値は0〜1に丸める・未設定は全部0", () => {
  assert.deepEqual(plain(E.barnOf(fixed(undefined))), { back: 0, front: 0, left: 0, right: 0 });
  assert.deepEqual(plain(E.barnOf(fixed({ front: 1.7, left: -3, right: "x" }))), { back: 0, front: 1, left: 0, right: 0 });
  assert.equal(E.barnActive(fixed({ front: 0.4 })), true);
  assert.equal(E.barnActive(fixed({})), false);
  assert.equal(E.barnActive(mover({ front: 0.4 })), false, "ムービングに付けても効かない");
});

test("frameDoors: バーンドアは閉めた方向だけ、軸は床(y)と奥の壁(z)で変わる", () => {
  const dy = E.frameDoors(fixed({ front: 0.5, left: 0.25 }), null, "y");
  assert.deepEqual(plain(dy.map((d) => d.key)), ["front", "left"]);
  assert.deepEqual(plain(dy[0].n), { x: 0, y: 1, z: 0 });      // 手前＝+y
  assert.deepEqual(plain(dy[1].n), { x: -1, y: 0, z: 0 });     // 下手＝−x
  assert.equal(dy[0].f, 0.5); assert.ok(dy[0].soft > 0.1, "バーンドアは柔らかい");
  const dz = E.frameDoors(fixed({ back: 0.3 }), null, "z");
  assert.deepEqual(plain(dz[0].n), { x: 0, y: 0, z: 1 });      // 上＝+z
});

test("frameDoors: カッターは4本の硬い線。1.0で内接正方形、√2以上はその向きを切らない", () => {
  const sq = E.frameDoors(mover(), { shutter: E.newShutter() }, "y");
  assert.equal(sq.length, 4);
  sq.forEach((d) => { assert.ok(near(d.f, 1 - 1 / Math.SQRT2, 1e-9)); assert.ok(d.soft < 0.1, "カッターは硬い"); });
  const band = E.frameDoors(mover(), { shutter: { on: true, w: 1.45, h: 0.5 } }, "y");
  assert.deepEqual(plain(band.map((d) => d.key)), ["back", "front"], "幅を√2以上にすると左右は切らない");
  assert.ok(near(band[0].f, 1 - 0.5 / Math.SQRT2, 1e-9));
  assert.equal(E.frameDoors(mover(), { shutter: { on: false, w: 0.5, h: 0.5 } }, "y").length, 0, "オフなら無し");
  assert.equal(E.shutterActive(null), false);
});

test("バーンドア＋カッターは両方の線が並ぶ（固定灯）", () => {
  const both = E.frameDoors(fixed({ back: 0.2 }), { shutter: E.newShutter({ w: 0.6, h: 0.6 }) }, "y");
  assert.equal(both.length, 5);
});

test("doorCutInEllipse: 真下の円では向きそのまま・距離は1−f。面に垂直な軸は切れない", () => {
  const S = { x: 0, y: 4, z: 7 }, T = { x: 0, y: 4, z: 0 };
  const el = E.spotEllipse(S, T, 30, "floor");
  const front = E.frameDoors(fixed({ front: 0.4 }), null, "y")[0];
  const c = E.doorCutInEllipse(front, el.ea, el.eb);
  assert.ok(near(Math.hypot(c.mx, c.my), 1, 1e-9), "m は単位ベクトル");
  assert.ok(near(c.d, 0.6, 1e-9));
  // 単位円の座標で「手前側」の点 p = c.m*1 は切られ、反対側は残る
  const dot = (p) => p.x * c.mx + p.y * c.my;
  assert.ok(dot({ x: c.mx, y: c.my }) > c.d);
  assert.ok(dot({ x: -c.mx, y: -c.my }) < c.d);
  assert.equal(E.doorCutInEllipse({ n: { x: 0, y: 0, z: 1 }, f: 0.5 }, el.ea, el.eb), null, "床の上で z 軸は線にならない");
});

test("doorCutInEllipse: 斜めの楕円でも、世界座標の手前側が切られる", () => {
  const S = { x: 0, y: 1, z: 7 }, T = { x: 0, y: 6, z: 0 };     // 奥から手前へ斜めに当てる
  const el = E.spotEllipse(S, T, 30, "floor");
  const front = E.frameDoors(fixed({ front: 0.5 }), null, "y")[0];
  const c = E.doorCutInEllipse(front, el.ea, el.eb);
  // 単位円の点 p → 世界座標 c + p.x·ea + p.y·eb。y が大きい（手前）側が切られているか
  const world = (p) => ({ y: el.c.y + p.x * el.ea.y + p.y * el.eb.y });
  const cutSide = world({ x: c.mx, y: c.my }).y, keepSide = world({ x: -c.mx, y: -c.my }).y;
  assert.ok(cutSide > keepSide, "切る側のほうが手前（y が大きい）");
  // 切る線の位置: 中心から手前へ「y方向の半径×(1−f)」
  const ey = Math.hypot(el.ea.y, el.eb.y);
  const lineY = el.c.y + ey * c.d;
  assert.ok(near(lineY, el.c.y + ey * 0.5, 1e-9));
});

test("カッターの回転: 90°で左右の線が奥⇄手前の軸へ回る（バーンドアは回らない）", () => {
  const d0 = E.frameDoors(mover(), { shutter: E.newShutter({ w: 0.5, h: 1.0, rot: 0 }) }, "y");
  const d90 = E.frameDoors(mover(), { shutter: E.newShutter({ w: 0.5, h: 1.0, rot: 90 }) }, "y");
  const right0 = d0.find((d) => d.key === "right"), right90 = d90.find((d) => d.key === "right");
  assert.ok(near(right0.n.x, 1, 1e-9) && near(right0.n.y, 0, 1e-9));
  assert.ok(near(right90.n.x, 0, 1e-9) && near(right90.n.y, -1, 1e-9), "90°で右の線は奥（−y）を向く");
  const d45 = E.frameDoors(mover(), { shutter: E.newShutter({ rot: 45 }) }, "z");
  const r45 = d45.find((d) => d.key === "right");
  assert.ok(near(Math.hypot(r45.n.x, r45.n.y, r45.n.z), 1, 1e-9) && near(r45.n.z, Math.SQRT1_2, 1e-9), "奥の壁では x と z の面で回る");
  const barn = E.frameDoors(fixed({ left: 0.5 }), { shutter: E.newShutter({ rot: 90 }) }, "y").find((d) => d.key === "left" && d.soft > 0.1);
  assert.deepEqual(plain(barn.n), { x: -1, y: 0, z: 0 }, "バーンドアは回転の影響を受けない");
});
