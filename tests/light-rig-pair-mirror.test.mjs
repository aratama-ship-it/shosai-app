import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../docs/light-rig-design-2026-09-11/prototype/rig-engine.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "rig-engine.js" });
const E = context.window.RIG_ENGINE;
const plain = (v) => JSON.parse(JSON.stringify(v));

test("左右反転モードは対応する2灯の組合せだけを受け付ける", () => {
  assert.equal(E.pairMirrorCompatible({ type: "truss", trussId: "t1" }, { type: "truss", trussId: "t1" }), true);
  assert.equal(E.pairMirrorCompatible({ type: "truss", trussId: "t1" }, { type: "truss", trussId: "t2" }), false);
  assert.equal(E.pairMirrorCompatible({ type: "side", side: "shimote" }, { type: "side", side: "kamite" }), true);
  assert.equal(E.pairMirrorCompatible({ type: "floor" }, { type: "front" }), false);
  assert.equal(E.pairMirrorCompatible({ type: "cyc" }, { type: "cyc" }), false);
});

test("吊りと床置きは舞台のセンター線で横位置を反転する", () => {
  const trussSource = { type: "truss", trussId: "t1", u: 0.18 };
  const trussPartner = { type: "truss", trussId: "t1", u: 0.64 };
  assert.deepEqual(plain(E.mirrorPairMount(trussSource, trussPartner)), { type: "truss", trussId: "t1", u: 0.82 });

  const floorSource = { type: "floor", u: 0.24, v: 0.73 };
  const floorPartner = { type: "floor", u: 0.6, v: 0.1 };
  assert.deepEqual(plain(E.mirrorPairMount(floorSource, floorPartner)), { type: "floor", u: 0.76, v: 0.73 });
});

test("SSと前明かりは左右反転と共通の位置パラメータを同時に写す", () => {
  const sideSource = { type: "side", side: "shimote", v: 0.42, h: 3.5 };
  const sidePartner = { type: "side", side: "shimote", v: 0.8, h: 1.2 };
  assert.deepEqual(plain(E.mirrorPairMount(sideSource, sidePartner)), { type: "side", side: "kamite", v: 0.42, h: 3.5 });

  const frontSource = { type: "front", u: 0.37, ahead: 7, h: 8.2 };
  const frontPartner = { type: "front", u: 0.5, ahead: 2, h: 4 };
  assert.deepEqual(plain(E.mirrorPairMount(frontSource, frontPartner)), { type: "front", u: 0.63, ahead: 7, h: 8.2 });
});

test("対応しない組合せでは相手の配置を変えず、入力も破壊しない", () => {
  const sourceMount = { type: "truss", trussId: "t1", u: 0.2 };
  const partnerMount = { type: "truss", trussId: "t2", u: 0.7 };
  const beforeSource = plain(sourceMount), beforePartner = plain(partnerMount);
  assert.deepEqual(plain(E.mirrorPairMount(sourceMount, partnerMount)), beforePartner);
  assert.deepEqual(plain(sourceMount), beforeSource);
  assert.deepEqual(plain(partnerMount), beforePartner);
});
