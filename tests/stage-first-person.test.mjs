import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-first-person.js", import.meta.url), "utf8");
const geometryContext = { window: {} };
vm.runInNewContext(source, geometryContext, { filename: "stage-first-person.js" });
const geom = geometryContext.window.SHOSAI_STAGE_FPV._geom;
const panels = geometryContext.window.SHOSAI_STAGE_FPV._panels;
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9,
  `${actual} should be close to ${expected}`);

test("正規化座標の4点を客席から見た舞台ワールドへ変換する", () => {
  const width = 12;
  const depth = 8;
  assert.deepEqual([geom.toWorld(0, .5, width, depth).x, geom.toWorld(0, .5, width, depth).z], [-6, 0]);
  assert.deepEqual([geom.toWorld(1, .5, width, depth).x, geom.toWorld(1, .5, width, depth).z], [6, 0]);
  assert.deepEqual([geom.toWorld(.5, 0, width, depth).x, geom.toWorld(.5, 0, width, depth).z], [0, -4]);
  assert.deepEqual([geom.toWorld(.5, 1, width, depth).x, geom.toWorld(.5, 1, width, depth).z], [0, 4]);
});

test("床のワールド座標を舞台の正規化座標へ戻す", () => {
  const centre = geom.uvFromGround({ x: 0, z: 0 }, 12, 9);
  assert.deepEqual([centre.u, centre.v], [.5, .5]);
  const corner = geom.uvFromGround({ x: 6, z: -4.5 }, 12, 9);
  assert.deepEqual([corner.u, corner.v], [1, 0]);
});

test("袖幅は舞台幅に比例し、小劇場と極端に広い舞台では上下限に収まる", () => {
  assert.equal(geom.wingWidthFor(4), 2.4);
  closeTo(geom.wingWidthFor(12), 3.6);
  assert.equal(geom.wingWidthFor(60), 4.5);
});

test("袖幕の中心は舞台端より0.4m外側になる", () => {
  assert.equal(geom.wingLegX(12), 6.4);
  assert.equal(geom.wingLegX(8), 4.4);
});

test("袖幕の対数は舞台奥行きに応じて2組から4組に収まる", () => {
  assert.equal(geom.wingLegPairs(3), 2);
  assert.equal(geom.wingLegPairs(9), 3);
  assert.equal(geom.wingLegPairs(60), 4);
});

test("袖幕のz位置は指定した組数ぶん客席側から舞台奥へ単調減少する", () => {
  const zs = Array.from(geom.wingLegZs(9, 3));
  assert.equal(zs.length, 3);
  assert.deepEqual(zs, [3.5, 0, -3.5]);
  assert.ok(zs.every((value, index) => index === 0 || value < zs[index - 1]));
});

test("客席の1列あたり座席数は既存式を保ち、狭い舞台でも最低8席になる", () => {
  assert.equal(geom.houseSeatsPerRow(1), 8);
  assert.equal(geom.houseSeatsPerRow(12), Math.floor(12 * 1.6 / .55));
});

test("客席段床は13列で、奥へ行くほど位置と高さが一定量ずつ増える", () => {
  const rows = Array.from(geom.houseRiserRows(12, 9));
  const floorY = geom.houseFloorY();
  assert.equal(rows.length, 13);
  rows.forEach((row, index) => {
    closeTo(row.z, 9 / 2 + 1.6 + .92 * index);
    closeTo(row.height, floorY + .14 * (index + 1));
    if (index > 0) {
      assert.ok(row.z > rows[index - 1].z);
      assert.ok(row.height > rows[index - 1].height);
    }
  });
});

/* 客席の床は舞台の床（Y=0）より低い（2026-08-29・本人指示）。額縁もリングも
   同じ方針: 演者を見上げる圧はここから生まれる。Vision Proアプリの
   houseFloorY: -1.0 と同じ値を採る。 */
test("客席の床は舞台の床より1m低い（Vision Proの houseFloorY と同じ）", () => {
  closeTo(geom.houseFloorY(), -1);
  // 最前列（1階もリングも）は真の地面のすぐ上、天井桟敷側は舞台の床を超えて上がる
  const stalls = Array.from(geom.houseRiserRows(12, 9));
  assert.ok(stalls[0].height < 0, "最前列の床は舞台の床（0）より低い");
  assert.ok(stalls[stalls.length - 1].height > 0, "後方の床は舞台の床を超えて上がる");
  const ring = Array.from(geom.houseRingRows(13));
  assert.ok(ring[0].height < 0, "リングの最前列も同じ方針");
});

/* 客席の人影（2026-08-29）。寸法は Vision Proアプリの AudienceBuilder から借りた実寸。
   舞台から見て「客がいる」気配を出すのが目的なので、頭が座った人の高さにあることと、
   ばらつきが毎フレーム同じであることの2点が要になる。 */
test("客席の人影は座った人の実寸を保つ", () => {
  const person = geom.housePerson();
  closeTo(person.headYM, 1.15);        // 列の床から頭の中心まで
  closeTo(person.headDiameterM, .20);
  closeTo(person.shoulderWidthM, .42);
  closeTo(person.shoulderDropM, .17);
  assert.ok(person.occupancy > 0 && person.occupancy <= 1);
  // 頭は肩より上にある（上下を取り違えると人に見えない）
  assert.ok(person.headYM - person.shoulderDropM < person.headYM);
});

test("席ごとのばらつきは何度呼んでも同じ（客席が沸き立たない）", () => {
  const first = geom.seatNoise(3, 7, 1);
  const again = geom.seatNoise(3, 7, 1);
  assert.equal(first, again, "同じ席・同じ用途なら必ず同じ値");
  assert.ok(first >= 0 && first < 1, "0以上1未満に収まる");
  // 席が違えば値も違う（全員が同じ方へずれない）
  assert.notEqual(geom.seatNoise(3, 7, 1), geom.seatNoise(3, 8, 1));
  assert.notEqual(geom.seatNoise(3, 7, 1), geom.seatNoise(4, 7, 1));
  // 用途（左右・高さ・空席）が違えば独立している
  assert.notEqual(geom.seatNoise(3, 7, 1), geom.seatNoise(3, 7, 2));
});

/* 3Dカメラの絵はブラウザでしか出ないので、席の位置はここで直接検査する。 */
test("客席は1階・2階の全列に席が並び、座った頭の高さに人がいる", () => {
  const width = 12;
  const depth = 9;
  const seats = Array.from(geom.houseSeats(width, depth));
  const stalls = Array.from(geom.houseRiserRows(width, depth));
  const balcony = Array.from(geom.houseBalconyRows(width, depth));
  const perRow = geom.houseSeatsPerRow(width);
  const person = geom.housePerson();

  // 1階13列＋2階6列。中央通路のぶんだけ席が減る
  assert.equal(new Set(seats.filter((s) => s.tier === "stalls").map((s) => s.row)).size, stalls.length);
  assert.equal(new Set(seats.filter((s) => s.tier === "balcony").map((s) => s.row)).size, balcony.length);
  // 席数＝（全列 × 1列の席数）− 中央通路に落ちる席
  const aisleSeats = Array.from({ length: perRow },
    (_, seat) => (seat - (perRow - 1) / 2) * .55).filter((x) => Math.abs(x) < .55).length;
  assert.ok(aisleSeats > 0, "中央通路が空いている");
  assert.equal(seats.length, (stalls.length + balcony.length) * (perRow - aisleSeats));

  // 埋まり方は設定どおり。空席も必ず混じる
  const occupied = seats.filter((s) => s.occupied);
  assert.ok(occupied.length < seats.length, "全部埋まってはいない");
  assert.ok(occupied.length > seats.length * .8, "がらがらでもない");

  seats.forEach((s) => {
    const rows = s.tier === "stalls" ? stalls : balcony;
    const riser = rows[s.row];
    closeTo(s.z, riser.z);
    closeTo(s.floorY, riser.height);
    // 頭は必ずその列の床から座った人の高さにある
    const expected = riser.height + person.headYM;
    assert.ok(Math.abs(s.headY - expected) <= person.jitterYM + 1e-9,
      `${s.tier}${s.row}列${s.seat}番の頭 ${s.headY} が ${expected} からばらつきの範囲に収まる`);
    // 中央通路は空けたまま（ばらつきで埋めない）
    assert.ok(Math.abs(s.x) >= .55 - person.jitterXM - 1e-9);
  });

  // 後ろの列ほど高い（段床）。2階は1階より高く、勾配も急
  const stallRows = seats.filter((s) => s.tier === "stalls");
  const balconyRows = seats.filter((s) => s.tier === "balcony");
  assert.ok(stallRows[stallRows.length - 1].floorY > stallRows[0].floorY);
  assert.ok(balconyRows[0].floorY > stallRows[stallRows.length - 1].floorY, "2階は1階より上");
  const stallRise = stalls[1].height - stalls[0].height;
  const balconyRise = balcony[1].height - balcony[0].height;
  assert.ok(balconyRise > stallRise, "2階のほうが勾配が急");
});

test("2階バルコニーは1階の後方に張り出し、Vision Proと同じ寸法を持つ", () => {
  const depth = 9;
  const balcony = Array.from(geom.houseBalconyRows(12, depth));
  const stalls = Array.from(geom.houseRiserRows(12, depth));
  const spec = geom.houseBalcony();

  assert.equal(balcony.length, 6);
  closeTo(spec.floorYM, 4.2);      // 1階の床から2階の床まで
  closeTo(spec.riseM, .35);
  closeTo(spec.railHeightM, .95);
  // 2階最前列は1階最前列から7.7m後ろ
  closeTo(balcony[0].z, stalls[0].z + spec.frontOffsetM);
  // 1階の最後列より手前から張り出す（真上に覆いかぶさる）
  assert.ok(balcony[0].z < stalls[stalls.length - 1].z, "2階は1階の上に張り出す");
});

test("天井が低い会場には2階席を作らない（テント・小屋で天井を突き抜けない）", () => {
  const spec = geom.houseBalcony();
  // 最後列の頭が収まらない高さなら一段も作らない
  assert.deepEqual(Array.from(geom.houseBalconyRows(12, 9, 5.5)), []);   // シャピトー相当
  assert.equal(Array.from(geom.houseBalconyRows(12, 9, 12)).length, spec.rows);
  // 2階を作る会場では、最後列の頭が天井の内側に収まる
  const rows = Array.from(geom.houseBalconyRows(12, 9, spec.needsCeilingM));
  const topHead = rows[rows.length - 1].height + geom.housePerson().headYM;
  assert.ok(topHead <= spec.needsCeilingM,
    `最後列の頭 ${topHead.toFixed(2)}m が天井 ${spec.needsCeilingM}m に収まる`);
  // 席のほうも2階が消える
  const seats = Array.from(geom.houseSeats(12, 9, 5.5));
  assert.equal(seats.filter((s) => s.tier === "balcony").length, 0);
  assert.ok(seats.filter((s) => s.tier === "stalls").length > 0, "1階は残る");
});

/* 全周会場（audience: "round"）のリング客席（2026-08-29）。
   舞台の円を同心円の列が囲み、対角の通路で4つの帯に分かれる。2階は無い。 */
test("全周会場では客席がリングになり、舞台をぐるりと囲む", () => {
  const diameter = 13;
  const seats = Array.from(geom.houseSeats(diameter, diameter, 12, "round"));
  const rows = Array.from(geom.houseRingRows(diameter));
  const person = geom.housePerson();
  const ring = geom.houseRing();

  assert.ok(seats.length > 0);
  assert.ok(seats.every((s) => s.tier === "ring"), "リング席だけで2階は無い");
  assert.equal(new Set(seats.map((s) => s.row)).size, ring.rows, "全列に席がある");

  // 席は必ず自分の列の踏み面の中央、頭は座った人の高さ
  seats.forEach((s) => {
    const riser = rows[s.row];
    const radius = Math.hypot(s.x, s.z);
    assert.ok(Math.abs(radius - (riser.r + .92 / 2)) < person.jitterXM * 2 + 1e-9,
      `${s.row}列${s.seat}番の半径 ${radius.toFixed(2)} が踏み面の中央にある`);
    closeTo(s.floorY, riser.height);
    assert.ok(Math.abs(s.headY - (riser.height + person.headYM)) <= person.jitterYM + 1e-9);
  });

  // 四方すべてに席がある（前だけのブロックになっていない）
  const quadrants = new Set(seats.map((s) => `${s.x >= 0 ? "E" : "W"}${s.z >= 0 ? "S" : "N"}`));
  assert.equal(quadrants.size, 4, "正面・上手・下手・奥のどこにも客がいる");

  // 対角の通路（ヴォミトリー）が空いている
  const firstRow = seats.filter((s) => s.row === 0);
  const centreR = rows[0].r + .92 / 2;
  const nearestToAisle = Math.min(...firstRow.map((s) => {
    const angle = Math.atan2(s.z, s.x);
    const period = Math.PI / 2;
    const rel = ((angle - Math.PI / 4) % period + period) % period;
    return Math.min(rel, period - rel) * centreR;   // 通路中心からの弧長
  }));
  assert.ok(nearestToAisle > ring.aisleWidthM / 2 - person.jitterXM * 2,
    `通路のそば ${nearestToAisle.toFixed(2)}m に席が食い込んでいない`);

  // 決定性: 何度求めても同じ
  const again = Array.from(geom.houseSeats(diameter, diameter, 12, "round"));
  assert.equal(again.length, seats.length);
  seats.forEach((s, i) => {
    closeTo(s.x, again[i].x);
    closeTo(s.z, again[i].z);
    assert.equal(s.occupied, again[i].occupied);
  });
});

test("リングの席は舞台の中心を向く", () => {
  const width = geom.housePerson().shoulderWidthM;
  // 真横（x軸上）の席が中心 (0,0) を向くと、肩の線はz方向＝接線方向に伸びる
  const ends = geom.seatSpanEnds(9, 0, width, { x: 0, z: 0 });
  assert.ok(Math.abs(ends[1].x - ends[0].x) < 1e-9, "肩の線が半径と直交する");
  closeTo(Math.abs(ends[1].z - ends[0].z), width);
  // 引数を省略すればプロセニアムの既定（中央少し奥）のまま
  const preset = geom.seatSpanEnds(0, 10, width);
  assert.ok(Math.abs(preset[1].z - preset[0].z) < 1e-6);
});

test("3Dカメラへの会場データに客席の囲み方が渡っている", async () => {
  const sketch = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
  assert.match(sketch, /venue: \{ width: size\.width, depth: size\.depth, height: size\.height, type: state\.project\.venue,[\s\S]{0,120}audience: venue\(\)\.audience \}/);
});

/* 客席の入り（2026-08-29・本人要望）。稽古で見たい状態が2つある——
   本番の圧（満席）と、客入れ前・ゲネプロの空の劇場（座席だけ）。 */
test("客席のカメラは段床の上に立つ（段に埋もれない）", () => {
  const width = 12;
  const depth = 9;
  const rows = Array.from(geom.houseRiserRows(width, depth));
  const seatedEye = geom.housePerson().headYM;

  // 通路（最前列より手前）は素の地面、列の上ではその列の床
  closeTo(geom.houseFloorAt(0, width, depth), geom.houseFloorY());
  closeTo(geom.houseFloorAt(rows[0].z, width, depth), rows[0].height);
  closeTo(geom.houseFloorAt(rows[rows.length - 1].z + 5, width, depth), rows[rows.length - 1].height);

  // プリセットの目の高さは、その場所の床＋座った人の目
  const presets = Array.from(geom.freePresets(width, depth, 8));
  ["audience-center", "front-row"].forEach((id) => {
    const preset = presets.find((candidate) => candidate.id === id);
    const floor = geom.houseFloorAt(preset.z, width, depth);
    closeTo(preset.y, floor + seatedEye);
    assert.ok(preset.y - floor > .9, `${id} のカメラは床から十分な高さにある`);
  });
});

test("舞台奥のカメラは舞台の内側に立つ（奥壁の裏へ出ない）", () => {
  const depth = 9;
  const upstage = Array.from(geom.freePresets(12, depth, 8)).find((p) => p.id === "upstage");
  // 奥壁は z = -depth/2。カメラはその手前（舞台の内側）にいる
  assert.ok(upstage.z > -depth / 2, `舞台奥のカメラ z=${upstage.z} が奥壁 ${-depth / 2} より手前`);
  assert.ok(upstage.z < 0, "それでも舞台の奥半分にいる");
  assert.equal(upstage.yaw, 0, "客席のほうを向いている");
});

test("客席の入りは満席と空席の2つで、空席では誰も座らない", () => {
  const modes = Array.from(geom.houseModes());
  assert.deepEqual(Array.from(modes, (mode) => mode.id), ["full", "empty"]);
  assert.equal(geom.houseModeById("empty").occupancy, 0);
  assert.ok(geom.houseModeById("full").occupancy > .5);
  // 知らないidは満席へ落とす（保存値が壊れていても動く）
  assert.equal(geom.normalizeHouseModeId("nonsense"), "full");
  assert.equal(geom.normalizeHouseModeId(null), "full");
  assert.equal(geom.normalizeHouseModeId("empty"), "empty");
});

test("空席では席の並びはそのままで、人だけが消える", () => {
  const full = Array.from(geom.houseSeats(12, 9, 12, undefined, .92));
  const empty = Array.from(geom.houseSeats(12, 9, 12, undefined, 0));

  // 席そのものは減らない（椅子は並んだまま）
  assert.equal(empty.length, full.length);
  empty.forEach((seat, index) => {
    closeTo(seat.x, full[index].x);
    closeTo(seat.z, full[index].z);
    closeTo(seat.headY, full[index].headY);
    assert.equal(seat.tier, full[index].tier);
  });

  // 空席では一人も座っていない
  assert.equal(empty.filter((seat) => seat.occupied).length, 0);
  assert.ok(full.filter((seat) => seat.occupied).length > full.length * .8);
});

test("客席の入りの表示は日英そろっている", async () => {
  const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(i18nSource, context, { filename: "stage-i18n.js" });
  const table = context.window.SHOSAI_I18N.text;
  for (const label of ["客席の入り", "満席", "空席"]) {
    assert.equal(typeof table[label], "string", `${label} の英訳がある`);
    assert.ok(!/[぀-ヿ一-鿿]/.test(table[label]), `${label} の英訳に日本語が混じっていない`);
  }
});

test("全周会場でも空席にできる", () => {
  const empty = Array.from(geom.houseSeats(13, 13, 12, "round", 0));
  assert.ok(empty.length > 0);
  assert.equal(empty.filter((seat) => seat.occupied).length, 0);
  const full = Array.from(geom.houseSeats(13, 13, 12, "round", .92));
  assert.equal(empty.length, full.length, "席の数はどちらでも同じ");
});

test("席は舞台の一点を向く（端の席ほど内を向く）", () => {
  const width = geom.housePerson().shoulderWidthM;
  // 中央の席は肩の線が真横（zの差がほぼ無い）
  const centre = geom.seatSpanEnds(0, 10, width);
  assert.ok(Math.abs(centre[1].z - centre[0].z) < 1e-6);
  closeTo(centre[1].x - centre[0].x, width);

  // 端の席は内を向くので、肩の線が前後に傾く
  const side = geom.seatSpanEnds(8, 10, width);
  assert.ok(Math.abs(side[1].z - side[0].z) > .05, "斜めを向いている");
  // どちら向きでも肩の幅そのものは変わらない
  closeTo(Math.hypot(side[1].x - side[0].x, side[1].z - side[0].z), width);

  // 左右対称
  const mirror = geom.seatSpanEnds(-8, 10, width);
  closeTo(Math.abs(mirror[1].z - mirror[0].z), Math.abs(side[1].z - side[0].z));
});

test("空いた椅子は背もたれの高さに描く（人の肩とは別の高さ）", () => {
  const seat = geom.houseSeat();
  const person = geom.housePerson();
  closeTo(seat.backTopYM, .95);
  closeTo(seat.backBottomYM, .45);
  // 背もたれの上端は、座った人の肩よりわずかに低い＝空席が穴に見えない
  const shoulderY = person.headYM - person.shoulderDropM;
  assert.ok(seat.backTopYM < shoulderY, "背もたれの上端は肩より下");
  assert.ok(seat.backTopYM > shoulderY - .1, "肩から離れすぎてもいない");
  assert.ok(seat.widthM < .52, "座席ピッチより狭い（隙間がある）");
});

test("客席の席の位置は何度求めても同じ（カメラを動かしても並びが変わらない）", () => {
  const a = Array.from(geom.houseSeats(12, 9));
  const b = Array.from(geom.houseSeats(12, 9));
  assert.equal(a.length, b.length);
  a.forEach((seat, index) => {
    closeTo(seat.x, b[index].x);
    closeTo(seat.headY, b[index].headY);
    closeTo(seat.z, b[index].z);
    assert.equal(seat.occupied, b[index].occupied);
    assert.equal(seat.tier, b[index].tier);
  });
});

test("空席の判定は席ごとにばらけ、満席寄りに収まる", () => {
  const person = geom.housePerson();
  let occupied = 0;
  let total = 0;
  for (let row = 0; row < 13; row += 1) {
    for (let seat = 0; seat < 30; seat += 1) {
      total += 1;
      if (geom.seatNoise(row, seat, 3) <= person.occupancy) occupied += 1;
    }
  }
  const rate = occupied / total;
  assert.ok(Math.abs(rate - person.occupancy) < .06,
    `埋まり方（${rate.toFixed(3)}）が設定（${person.occupancy}）から離れすぎない`);
});

test("facing 0は客席向き、facing 90は上手向きになる", () => {
  const front = geom.yawForward(0);
  const stageLeft = geom.yawForward(90);
  closeTo(front.x, 0); closeTo(front.y, 0); closeTo(front.z, 1);
  closeTo(stageLeft.x, -1); closeTo(stageLeft.y, 0); closeTo(stageLeft.z, 0);
});

test("客席カメラのRIGHTはu=1側を画面右に置く", () => {
  const right = geom.rightOf(geom.yawForward(180));
  closeTo(right.x, 1); closeTo(right.y, 0); closeTo(right.z, 0);
});

test("自由カメラはWを1秒押すと視線の水平前方へ2.4m進む", () => {
  const moved = geom.moveFree({ x: 0, y: 1.35, z: 0 }, { x: 0, y: 0, z: 1 },
    { x: -1, y: 0, z: 0 }, { forward: true }, 1, 2.4);
  closeTo(moved.x, 0);
  closeTo(moved.y, 1.35);
  closeTo(moved.z, 2.4);
});

test("自由カメラの前進と右移動を同時にしても斜めだけ速くならない", () => {
  const origin = { x: 0, y: 1.35, z: 0 };
  const moved = geom.moveFree(origin, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
    { forward: true, right: true }, 1, 2.4);
  closeTo(Math.hypot(moved.x - origin.x, moved.y - origin.y, moved.z - origin.z), 2.4);
});

test("ほぼ真下を向いた自由カメラもWでは水平に進む", () => {
  const origin = { x: 2, y: 6, z: 3 };
  const pitch = -88 * Math.PI / 180;
  const moved = geom.moveFree(origin, { x: 0, y: Math.sin(pitch), z: Math.cos(pitch) },
    { x: 1, y: 0, z: 0 }, { forward: true }, 1, 2.4);
  closeTo(moved.y, origin.y);
  closeTo(Math.hypot(moved.x - origin.x, moved.z - origin.z), 2.4);
});

test("自由カメラの位置を舞台と客席を含む移動範囲へ収める", () => {
  const upper = geom.clampFree({ x: 999, y: 999, z: 999 }, 12, 9, 8);
  assert.deepEqual([upper.x, upper.y, upper.z], [18, 14, 26.5]);
  const lower = geom.clampFree({ x: -999, y: -999, z: -999 }, 12, 9, 8);
  assert.deepEqual([lower.x, lower.y, lower.z], [-18, .2, -12.5]);
});

test("自由カメラの客席中央と真上プリセットが指定の向きと高さを持つ", () => {
  const presets = geom.freePresets(12, 9, 8);
  const audience = presets.find((preset) => preset.name === "客席中央");
  const overhead = presets.find((preset) => preset.name === "真上");
  assert.equal(audience.yaw, 180);
  assert.equal(overhead.y, 12);
});

test("自由カメラの移動はdtが0なら位置を変えずNaNにもならない", () => {
  const moved = geom.moveFree({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 0 }, { forward: true }, 0, 2.4);
  assert.deepEqual([moved.x, moved.y, moved.z], [1, 2, 3]);
  assert.ok([moved.x, moved.y, moved.z].every(Number.isFinite));
});

test("フレーム間隔は上限0.1秒で切り、裏に回った直後もカメラがワープしない", () => {
  // 裏に回って3秒止まったあとの1フレーム。3秒ぶん進ませてはいけない
  assert.equal(geom.frameDelta(1000, 4000), .1);
  assert.equal(geom.frameDelta(1000, 1016), .016);
  // 初回フレームと、時刻が戻った場合は進めない
  assert.equal(geom.frameDelta(null, 1000), 0);
  assert.equal(geom.frameDelta(1000, 1000), 0);
  assert.equal(geom.frameDelta(1000, 900), 0);
});

test("near面より手前を捨て、跨ぐ線分を交点で切る", () => {
  assert.deepEqual(Array.from(geom.clipPolyNear([
    { x: -1, y: 0, z: .02 }, { x: 1, y: 0, z: .04 }, { x: 0, y: 1, z: .08 },
  ])), []);
  const line = geom.clipPolyNear([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }]);
  assert.equal(line.length, 2);
  closeTo(line[0].x, .12);
  closeTo(line[0].z, .12);
  closeTo(line[1].z, 1);
});

test("姿勢と支持物から目の高さを決める", () => {
  closeTo(geom.eyeHeight({ base: 0, pose: "stand" }, 2, []), 1.86);
  const tissue = { id: "tissue-1", type: "tissue" };
  const performer = { base: 4.5, pose: "stand", supportId: tissue.id };
  closeTo(geom.eyeHeight(performer, 2, [performer, tissue]), 6.2);
});

test("浮動小窓の位置と幅を画面内の制約へ収める", () => {
  const tooLarge = panels.clampLayout({ x: -50, y: 900, width: 900, visible: true }, 1000, 700);
  assert.equal(tooLarge.width, 600);
  assert.equal(tooLarge.x, 0);
  assert.equal(tooLarge.y, 336.5);
  const tooSmall = panels.clampLayout({ x: 999, y: -20, width: 20, visible: false }, 1000, 700);
  assert.equal(tooSmall.width, 160);
  assert.equal(tooSmall.x, 840);
  assert.equal(tooSmall.y, 0);
  assert.equal(tooSmall.visible, false);
});

test("転写キャンバスは元キャンバスのアスペクト比を保つ", () => {
  const height = panels.contentHeight(280, 1600, 900);
  assert.ok(height >= 157 && height <= 158);
});

test("浮動小窓の保存値を往復し、壊れたJSONは初期値へ戻す", () => {
  const layout = {
    front: { x: 30, y: 40, width: 280, visible: false },
    plan: { x: 610, y: 420, width: 240, visible: true },
  };
  const restored = panels.restore(panels.serialize(layout), 1000, 800);
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), layout);
  const defaults = panels.defaults(1000, 800);
  assert.deepEqual(JSON.parse(JSON.stringify(panels.restore("{broken", 1000, 800))),
    JSON.parse(JSON.stringify(defaults)));
});

test("隠す・出すでvisibleとトグルチップを同期する", () => {
  const layout = panels.defaults(1000, 800);
  const panel = { hidden: false };
  const values = new Set(["on"]);
  const chip = {
    attributes: {},
    classList: { toggle(value, force) { if (force) values.add(value); else values.delete(value); } },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  panels.setVisible(layout, "front", false, panel, chip);
  assert.equal(layout.front.visible, false);
  assert.equal(panel.hidden, true);
  assert.equal(values.has("on"), false);
  assert.equal(chip.attributes["aria-pressed"], "false");
  panels.setVisible(layout, "front", true, panel, chip);
  assert.equal(layout.front.visible, true);
  assert.equal(panel.hidden, false);
  assert.equal(values.has("on"), true);
  assert.equal(chip.attributes["aria-pressed"], "true");
});

test("openからcloseでrAFを止め、オーバーレイを隠す", () => {
  const nodes = new Map();
  class FakeClassList {
    values = new Set();
    add(value) { this.values.add(value); }
    remove(value) { this.values.delete(value); }
    toggle(value, force) {
      if (force === undefined ? !this.values.has(value) : force) this.values.add(value);
      else this.values.delete(value);
    }
  }
  class FakeElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.classList = new FakeClassList();
      this.style = {};
      this.attributes = {};
      this.hidden = false;
      this.clientWidth = 1024;
      this.clientHeight = 768;
    }
    set id(value) { this._id = value; if (value) nodes.set(value, this); }
    get id() { return this._id || ""; }
    set className(value) { this._className = value; }
    get className() { return this._className || ""; }
    append(...children) { children.forEach((child) => this.appendChild(child)); }
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
    addEventListener() {}
    setAttribute(name, value) { this.attributes[name] = String(value); }
    focus() {}
  }
  const document = {
    head: new FakeElement("head"),
    body: new FakeElement("body"),
    documentElement: new FakeElement("html"),
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => nodes.get(id) || null,
  };
  let requested = 0;
  let cancelled = 0;
  const window = {
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame() { requested += 1; return requested; },
    cancelAnimationFrame(id) { cancelled = id; },
  };
  const context = { window, document, setTimeout, clearTimeout };
  vm.runInNewContext(source, context, { filename: "stage-first-person.js" });
  let closed = 0;
  const piece = { id: "performer-1", castId: "cast-1", type: "performer", u: .5, v: .5,
    base: 0, size: 100, facing: 0, color: "#ffffff" };
  const bridge = {
    initialPieceId: piece.id,
    read: () => ({ pieces: [piece], sceneTitle: "場面1", actTitle: "第一幕", sceneIndex: 0,
      sceneCount: 1, venue: { width: 12, depth: 9, height: 8, type: "proscenium" }, lang: "ja" }),
    heightMOf: () => 1.7,
    labelOf: () => "演者A",
    stepScene() {},
    onClose: () => { closed += 1; },
  };
  assert.equal(window.SHOSAI_STAGE_FPV.open(bridge), true);
  const overlay = nodes.get("stage-fpv-overlay");
  assert.equal(overlay.hidden, false);
  assert.equal(requested, 1);
  window.SHOSAI_STAGE_FPV.close();
  assert.equal(overlay.hidden, true);
  assert.equal(cancelled, 1);
  assert.equal(closed, 1);
});

test("転換アニメの途中値（animU/animV/animBase/animGlow）を優先して読む", () => {
  const piece = { u: 0.2, v: 0.8, base: 1.5, glow: 1 };
  assert.equal(geom.pieceUOf(piece), 0.2);
  assert.equal(geom.pieceVOf(piece), 0.8);
  assert.equal(geom.pieceBaseOf(piece), 1.5);
  assert.equal(geom.pieceGlowOf(piece), 1);
  piece.animU = 0.45;
  piece.animV = 0.55;
  piece.animBase = 0;
  piece.animGlow = 0.3;
  assert.equal(geom.pieceUOf(piece), 0.45);
  assert.equal(geom.pieceVOf(piece), 0.55);
  assert.equal(geom.pieceBaseOf(piece), 0);   // animBase=0 は「床に降りた」。無視してはいけない
  assert.equal(geom.pieceGlowOf(piece), 0.3);
  assert.equal(geom.pieceUOf(null), null);
  assert.equal(geom.pieceBaseOf(null), 0);
});

test("足元リングの角度: 客席側クリックで0°、上手側90°、下手側-90°、5°刻みで正規化", () => {
  const foot = { x: 0, y: 0, z: 0 };
  assert.equal(geom.facingFromGround(foot, { x: 0, z: 2 }), 0);      // +z=客席側
  assert.equal(geom.facingFromGround(foot, { x: 2, z: 0 }), 90);     // +x=上手
  assert.equal(geom.facingFromGround(foot, { x: -2, z: 0 }), -90);   // -x=下手
  assert.equal(geom.facingFromGround(foot, { x: 0.001, z: -2 }), -180); // 奥は±180へ畳む
  assert.equal(geom.facingFromGround(foot, { x: Math.tan(23 * Math.PI / 180) * 2, z: 2 }), 25); // 5°刻み
});

test("演者のヒット判定は矩形に入った中で最も手前を選ぶ", () => {
  const targets = [
    { id: "far", x: 100, yTop: 10, yBottom: 90, halfW: 30, z: 12 },
    { id: "near", x: 110, yTop: 10, yBottom: 90, halfW: 30, z: 6 },
  ];
  assert.equal(geom.pickFrom(targets, 105, 50).id, "near");
  assert.equal(geom.pickFrom(targets, 75, 50).id, "far");   // farの矩形にだけ入る
  assert.equal(geom.pickFrom(targets, 300, 50), null);
});

test("レンズ表は3種で、既定の標準は従来の水平86度を保つ", () => {
  const presets = Array.from(geom.lensPresets(), (lens) => [lens.id, lens.name, lens.fovDeg]);
  assert.deepEqual(presets, [
    ["ultrawide", "超広角", 120],
    ["wide", "広角", 110],
    ["normal", "標準", 86],
  ]);
  closeTo(geom.focalFor(1024, 86), (1024 / 2) / Math.tan(43 * Math.PI / 180));
});

test("焦点距離は超広角、広角、標準の順に長くなる", () => {
  const ultrawide = geom.focalFor(1024, 120);
  const wide = geom.focalFor(1024, 110);
  const normal = geom.focalFor(1024, 86);
  assert.ok(ultrawide < wide);
  assert.ok(wide < normal);
});

test("未知のレンズidと未指定値は標準へ戻る", () => {
  assert.equal(geom.normalizeLensId("unknown"), "normal");
  assert.equal(geom.normalizeLensId(undefined), "normal");
  assert.equal(geom.normalizeLensId("tele"), "normal"); // 廃止した望遠の保存値も標準へ倒す
  assert.equal(geom.normalizeLensId("ultrawide"), "ultrawide");
});
