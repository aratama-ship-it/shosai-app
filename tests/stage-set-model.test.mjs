import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-set-model.js", import.meta.url), "utf8");
const context = { window: {}, Date, Math };
vm.runInNewContext(source, context, { filename: "stage-set-model.js" });
const models = context.window.SHOSAI_STAGE_MODELS;
const plain = (value) => JSON.parse(JSON.stringify(value));
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9,
  `${actual} should be close to ${expected}`);

test("normalizeModelはnullを部品0個のモデルへ直す", () => {
  const model = models.normalizeModel(null);
  assert.equal(model.parts.length, 0);
  assert.equal(typeof model.id, "string");
  assert.equal(typeof model.name, "string");
});

test("normalizePartは不正な数値を安全な範囲へ直す", () => {
  const part = models.normalizePart({ w: -1, d: NaN, h: -99, dia: -2, rotY: 10000, tint: 99, steps: 80 });
  assert.ok(part.w > 0 && part.d > 0 && part.h > 0 && part.dia > 0);
  assert.ok(part.rotY >= -180 && part.rotY < 180);
  assert.equal(part.tint, 1.2);
  assert.equal(part.steps, 12);
});

test("partBoxesはbox・step・sphereを指定数の箱へ展開する", () => {
  assert.equal(models.partBoxes({ shape: "box" }).length, 1);
  assert.equal(models.partBoxes({ shape: "step", steps: 3 }).length, 3);
  assert.equal(models.partBoxes({ shape: "sphere" }).length, 4);
});

test("stepは床から立ち上がる段になり、最上段の高さと奥行きの合計が元寸法に一致する", () => {
  const boxes = models.partBoxes({ shape: "step", steps: 3, h: 0.9, d: 1.8 });
  closeTo(boxes.reduce((sum, box) => sum + box.d, 0), 1.8);
  // 段ごとに lift を上げると宙に浮いた板になる。すべて床から立てる
  assert.ok(boxes.every((box) => box.lift === 0), "どの段も床から立ち上がる");
  closeTo(boxes[0].h, 0.3);
  closeTo(boxes[2].h, 0.9);
  assert.ok(boxes[0].oz > boxes[2].oz, "+z側が低い段になる");
});

test("modelExtentは原点から離れた部品を含む外形を返す", () => {
  const extent = models.modelExtent({ parts: [{ shape: "box", x: 5, z: -3, y: 2, w: 2, d: 4, h: 1 }] });
  assert.deepEqual(plain(extent), { w: 6, d: 5, h: 3 });
});

test("parseLibraryは壊れたJSONをnullにする", () => {
  assert.equal(models.parseLibrary("{壊れたJSON"), null);
});

test("serializeLibraryとparseLibraryでモデルを往復できる", () => {
  const library = { version: 1, models: [models.emptyModel("階段セット")] };
  const restored = models.parseLibrary(models.serializeLibrary(library));
  assert.deepEqual(plain(restored.models), plain(library.models));
});

test("normalizeModelは部品を64個までに切る", () => {
  const model = models.normalizeModel({ parts: Array.from({ length: 70 }, () => ({ shape: "box" })) });
  assert.equal(model.parts.length, 64);
});
