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
