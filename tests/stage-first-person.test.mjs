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
  assert.equal(rows.length, 13);
  rows.forEach((row, index) => {
    closeTo(row.z, 9 / 2 + 1.6 + .92 * index);
    closeTo(row.height, .14 * (index + 1));
    if (index > 0) {
      assert.ok(row.z > rows[index - 1].z);
      assert.ok(row.height > rows[index - 1].height);
    }
  });
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
    ["wide", "広角", 110],
    ["normal", "標準", 86],
    ["tele", "望遠", 50],
  ]);
  closeTo(geom.focalFor(1024, 86), (1024 / 2) / Math.tan(43 * Math.PI / 180));
});

test("焦点距離は広角、標準、望遠の順に長くなる", () => {
  const wide = geom.focalFor(1024, 110);
  const normal = geom.focalFor(1024, 86);
  const tele = geom.focalFor(1024, 50);
  assert.ok(wide < normal);
  assert.ok(normal < tele);
});

test("未知のレンズidと未指定値は標準へ戻る", () => {
  assert.equal(geom.normalizeLensId("unknown"), "normal");
  assert.equal(geom.normalizeLensId(undefined), "normal");
  assert.equal(geom.normalizeLensId("wide"), "wide");
});
