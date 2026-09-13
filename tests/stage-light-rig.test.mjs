import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

/* stage-light-rig.js は独立モジュール（灯体の配置と、一灯ずつの当てる先・動きの幾何）。
   DOM も描画も持たないので、数値の部分はここで全部確かめられる。
   正面図の3D（擬似パース）は本体の描画を借りる方針なので、このモジュールには無い。 */
const source = await readFile(new URL("../stage-light-rig.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "stage-light-rig.js" });
const M = context.window.SHOSAI_STAGE_LIGHT_RIG;
const plain = (value) => JSON.parse(JSON.stringify(value));
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const DIMS = { W: 12, D: 8, H: 8 };
const rigWith = (truss) => ({ trusses: [truss], fixtures: [] });

test("モジュールが期待どおりの一式を公開する", () => {
  assert.ok(M, "window.SHOSAI_STAGE_LIGHT_RIG が定義されていない");
  ["newTruss", "newFixture", "isMoving", "beamDegOf", "spotRadiusM", "beamLanding",
   "fixtureWorld", "targetAt", "pathGuide", "mirrorMount", "describeMount",
   "makePlanProjector", "makeFrontProjector", "makeSideProjector"].forEach((k) => {
    assert.equal(typeof M[k], "function", `${k} が無い`);
  });
  assert.deepEqual(plain(M.PLANE_VALUES), ["horizontal", "frontVertical", "sideVertical"]);
});

test("灯体の既定はムービング。固定は明示したときだけ", () => {
  assert.equal(M.isMoving(M.newFixture("f1", 1, { type: "floor", u: 0.5, v: 0.5 }, "")), true);
  assert.equal(M.isMoving(M.newFixture("f2", 2, { type: "floor", u: 0.5, v: 0.5 }, "", "fixed")), false);
});

test("取り付け方ごとに世界座標が決まる（吊り・転がし・SS・前明かり）", () => {
  const t = M.newTruss("t1", 0.25, 6, "1サス");
  const rig = rigWith(t);

  // 吊り: バトンの奥行きと高さを継ぐ。左右だけ灯体が持つ
  const hang = M.fixtureWorld({ mount: { type: "truss", trussId: "t1", u: 0.75 } }, rig, DIMS);
  assert.ok(near(hang.x, 3), `吊りのx=${hang.x}`);      // (0.75-0.5)*12
  assert.ok(near(hang.y, 2), `吊りのy=${hang.y}`);      // 0.25*8
  assert.ok(near(hang.z, 6), `吊りのz=${hang.z}`);

  // 転がし: 床の少し上
  const floor = M.fixtureWorld({ mount: { type: "floor", u: 0.5, v: 0.5 } }, rig, DIMS);
  assert.ok(near(floor.z, M.FLOOR_FIXTURE_Z));

  // SS: 舞台の外側。下手が負、上手が正
  const ssL = M.fixtureWorld({ mount: { type: "side", side: "shimote", v: 0.5, h: 2 } }, rig, DIMS);
  const ssR = M.fixtureWorld({ mount: { type: "side", side: "kamite", v: 0.5, h: 2 } }, rig, DIMS);
  assert.ok(ssL.x < -DIMS.W / 2, "下手のSSが舞台の外に出ていない");
  assert.ok(near(ssR.x, -ssL.x), "上手と下手が対称でない");

  // 前明かり: 舞台より手前（客席の上）。高さは舞台の高さを超えてよい
  const front = M.fixtureWorld({ mount: { type: "front", u: 0.5, ahead: 6, h: 9 } }, rig, DIMS);
  assert.ok(near(front.y, DIMS.D + 6), `前明かりのy=${front.y}`);
  assert.ok(near(front.z, 9), "前明かりの高さが舞台の高さで頭打ちになっている");
});

test("反対側へコピーは配置だけを左右へ写す", () => {
  assert.deepEqual(plain(M.mirrorMount({ type: "truss", trussId: "t1", u: 0.2 })),
    { type: "truss", trussId: "t1", u: 0.8 });
  assert.deepEqual(plain(M.mirrorMount({ type: "side", side: "shimote", v: 0.4, h: 2 })),
    { type: "side", side: "kamite", v: 0.4, h: 2 });
  assert.deepEqual(plain(M.mirrorMount({ type: "front", u: 0.1, ahead: 5, h: 7 })),
    { type: "front", u: 0.9, ahead: 5, h: 7 });
});

test("往復は「ゆるめる」が既定で、端で減速する。「一定」は等速", () => {
  const cue = { lights: {}, groups: [] };
  const line = (easing) => ({
    on: true, color: "#fff", surface: "floor", speed: "normal",
    path: { kind: "line", start: "a", easing, a: { u: 0, v: 0.5, hM: 0 }, b: { u: 1, v: 0.5, hM: 0 } },
  });
  const T = M.SPEED_PERIOD_MS.normal;
  const at = (l, frac) => M.targetAt(l, cue, "f1", T * frac, DIMS).phase;

  // 一定: 1/4進めば位相も1/4（三角波の登り）
  assert.ok(near(at(line("linear"), 0.125), 0.25, 1e-9), "一定が等速でない");
  // ゆるめる: 同じ時刻で位相が小さい＝端で遅い
  assert.ok(at(line("ease"), 0.125) < at(line("linear"), 0.125), "ゆるめるが端で減速していない");
  // 折り返しの中央（半分の半分）はどちらも 0.5
  assert.ok(near(at(line("ease"), 0.25), 0.5, 1e-9));
  assert.ok(near(at(line("linear"), 0.25), 0.5, 1e-9));
  // 既定は ease
  assert.ok(near(at(line(undefined), 0.125), at(line("ease"), 0.125), 1e-9), "既定がゆるめるでない");
});

/* 秒で決める時間とオフセット（2026-09-12 本人要望）。
   periodSec は3段（ゆっくり／普通／速い）より優先し、offsetSec は灯ごとに動きを遅らせる。 */
test("1往復の秒数は直に決められ、オフセットは灯ごとに動きを遅らせる", () => {
  const cue = { lights: {}, groups: [] };
  const line = (extra) => ({
    on: true, color: "#fff", surface: "floor", speed: "normal",
    path: { kind: "line", start: "a", easing: "linear", a: { u: 0, v: 0.5, hM: 0 }, b: { u: 1, v: 0.5, hM: 0 } },
    ...extra,
  });
  const at = (l, ms) => M.targetAt(l, cue, "f1", ms, DIMS).phase;

  // periodSec=4秒なら1秒で1/4周＝位相0.5（三角波の登りは半周期で端から端まで）
  assert.ok(near(at(line({ periodSec: 4 }), 1000), 0.5, 1e-9), "秒の指定が効いていない");
  // speed より periodSec が優先される
  assert.ok(near(at(line({ periodSec: 4, speed: "fast" }), 1000), at(line({ periodSec: 4 }), 1000), 1e-9),
    "3段が秒の指定を上書きしている");
  // 0や負の秒は無視して3段へ戻す
  assert.ok(near(at(line({ periodSec: 0 }), 750), at(line({}), 750), 1e-9), "0秒が無視されていない");

  // オフセット0.5秒＝0.5秒だけ遅れて始まる（1.5秒時点が、遅れなしの1.0秒時点と同じ）
  const off = line({ periodSec: 4, offsetSec: 0.5 });
  assert.ok(near(at(off, 1500), at(line({ periodSec: 4 }), 1000), 1e-9), "オフセットが遅らせていない");
  // 負のオフセットは先行する
  assert.ok(near(at(line({ periodSec: 4, offsetSec: -0.5 }), 500), at(line({ periodSec: 4 }), 1000), 1e-9),
    "負のオフセットが先行していない");
});

test("円は2軸で楕円にでき、傾きで面の中を回せる", () => {
  const cue = { lights: {}, groups: [] };
  const light = {
    on: true, color: "#fff", surface: "floor", speed: "normal",
    path: { kind: "circle", c: { u: 0.5, v: 0.5, hM: 0 }, r: 3, r2: 1, tilt: 0, plane: "horizontal", dir: "cw", start: 0 },
  };
  const T = M.SPEED_PERIOD_MS.normal;
  const p = (frac) => M.targetAt(light, cue, "f1", T * frac, DIMS);
  // 角0で1軸目(左右)の端、角90°で2軸目(奥行き)の端
  assert.ok(near(p(0).x, 3), `x=${p(0).x}`);
  assert.ok(near(p(0.25).y, 4 + 1), `y=${p(0.25).y}`);   // 中心 v=0.5 → 4m、+r2
  // 傾き90°で軸が入れ替わる
  const a = M.planeVec("horizontal", 1, 0, 0), b = M.planeVec("horizontal", 1, 0, 90);
  assert.ok(near(a.dx, 1) && near(a.dy, 0), "傾き0で軸が動いている");
  assert.ok(near(b.dx, 0, 1e-9) && near(b.dy, 1, 1e-9), "傾き90°で軸が入れ替わらない");
});

test("8の字は1周で2軸目が2往復する（∞の形）", () => {
  const r = 2.2, r2 = 1;
  const at = (deg) => M.eightOffset("horizontal", (deg * Math.PI) / 180, r, r2, 0);
  assert.ok(near(at(0).dx, 0, 1e-9) && near(at(0).dy, 0, 1e-9), "起点が中心でない");
  assert.ok(near(at(45).dy, r2, 1e-9), "45°で2軸目が端に来ていない");
  assert.ok(near(at(90).dx, r, 1e-9) && near(at(90).dy, 0, 1e-9), "90°で1軸目の端・2軸目0でない");
  assert.ok(near(at(135).dy, -r2, 1e-9), "135°で2軸目が逆の端に来ていない");
  assert.ok(near(at(180).dx, 0, 1e-9), "180°で中心へ戻っていない");
});

test("光は狙った点で止まらない。床か奥の壁まで進み、当たらなければ抜ける", () => {
  // 上から下へ: 床(z=0)に当たる
  const down = M.beamLanding({ x: 0, y: 4, z: 6 }, { x: 0, y: 4, z: 3 }, DIMS);
  assert.equal(down.on, "floor");
  assert.ok(near(down.z, 0), `床の高さ=${down.z}`);
  // 手前から奥へ水平: 奥の壁(y=0)に当たる
  const back = M.beamLanding({ x: 0, y: 6, z: 3 }, { x: 0, y: 4, z: 3 }, DIMS);
  assert.equal(back.on, "back");
  assert.ok(near(back.y, 0), `奥の壁のy=${back.y}`);
  // 上向き: 何にも当たらず図の外へ
  const up = M.beamLanding({ x: 0, y: 4, z: 1 }, { x: 0, y: 4, z: 3 }, DIMS);
  assert.equal(up.on, null);
  assert.ok(up.z > DIMS.H, `抜ける光が舞台の高さを超えていない z=${up.z}`);
});

test("光の広がりは距離に比例して開く。ムービングだけシーンでズームできる", () => {
  const moving = M.newFixture("f1", 1, { type: "floor", u: 0.5, v: 0.5 }, "", "moving", 15);
  const fixed = M.newFixture("f2", 2, { type: "floor", u: 0.5, v: 0.5 }, "", "fixed", 24);
  // シーン側の値はムービングだけ効く
  assert.equal(M.beamDegOf(moving, { beamDeg: 45 }), 45);
  assert.equal(M.beamDegOf(fixed, { beamDeg: 45 }), 24, "固定灯がシーンの値で変わってしまう");
  // 半径 = 距離 × tan(広がり/2)
  const S = { x: 0, y: 4, z: 6 }, T = { x: 0, y: 4, z: 0 };
  const r = M.spotRadiusM(S, T, 30);
  assert.ok(near(r, 6 * Math.tan(Math.PI / 12), 1e-9), `半径=${r}`);
  // 2倍遠ければ2倍
  assert.ok(near(M.spotRadiusM(S, { x: 0, y: 4, z: -6 }, 30), r * 2, 1e-9));
});

test("取り付けの説明は本体の照明パネルと同じ語彙で出す", () => {
  const t = M.newTruss("t1", 0.25, 6, "1サス");
  const rig = { trusses: [t], fixtures: [] };
  const say = (mount) => M.describeMount({ mount }, rig);
  assert.match(say({ type: "truss", trussId: "t1", u: 0.5 }), /^吊り・/);
  assert.match(say({ type: "truss", trussId: "t1", u: 0.5 }), /バトン/);
  assert.match(say({ type: "front", u: 0.5, ahead: 6, h: 7 }), /^前明かり・/);
  assert.match(say({ type: "side", side: "shimote", v: 0.5, h: 2 }), /^SS・下手の袖/);
  assert.match(say({ type: "floor", u: 0.5, v: 0.5 }), /^転がし・/);
  // 一般名は使わない
  ["トラス", "床置き・", "横（"].forEach((word) => {
    assert.ok(!say({ type: "truss", trussId: "t1", u: 0.5 }).includes(word), `${word} が残っている`);
  });
});

test("図の投影は縮尺どおり（真上・正面・側面）", () => {
  const box = { x: 0, y: 0, w: 120, h: 80 };   // 12m×8m の舞台をちょうど収める箱
  const plan = M.makePlanProjector(DIMS, box);
  assert.deepEqual(plain(plan({ x: -6, y: 0, z: 0 })), { X: 0, Y: 0 });      // 下手・最奥
  assert.deepEqual(plain(plan({ x: 6, y: 8, z: 0 })), { X: 120, Y: 80 });   // 上手・最前

  const front = M.makeFrontProjector(DIMS, { x: 0, y: 0, w: 120, h: 80 });
  assert.deepEqual(plain(front({ x: -6, y: 0, z: 0 })), { X: 0, Y: 80 });   // 下手・床
  assert.deepEqual(plain(front({ x: 6, y: 0, z: 8 })), { X: 120, Y: 0 });   // 上手・天

  // 側面: 下手から見ると客席が左・奥壁が右
  const side = M.makeSideProjector(DIMS, { x: 0, y: 0, w: 80, h: 80 }, "shimote");
  assert.equal(side({ x: 0, y: 8, z: 0 }).X, 0, "下手から見て客席側が左でない");
  assert.equal(side({ x: 0, y: 0, z: 0 }).X, 80, "下手から見て奥壁が右でない");
});
