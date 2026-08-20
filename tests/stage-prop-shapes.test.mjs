import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const fpvSource = await readFile(new URL("stage-first-person.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");

function bodyBetween(source, startPattern, endPattern) {
  const start = source.indexOf(startPattern);
  const end = source.indexOf(endPattern, start);
  assert.ok(start >= 0, `${startPattern} がある`);
  assert.ok(end > start, `${startPattern} の終端がある`);
  return source.slice(start, end);
}

const shapesBlock = bodyBetween(stageSource, "const PROP_SHAPES =", "const PROP_SHAPE_ORDER");
const shapesContext = {};
vm.runInNewContext(`${shapesBlock}\nthis.shapes = PROP_SHAPES;`, shapesContext);
const shapes = shapesContext.shapes;
const shapeIds = [
  "box", "umbrella", "club", "ball", "ring", "staff",
  "sword", "book", "tophat", "lantern", "flag",
];

test("PROP_SHAPESは箱と10形を指定順で持ち、表示名・基準寸法・部品を定義する", () => {
  assert.deepEqual(Object.keys(shapes), shapeIds);
  shapeIds.forEach((id) => {
    const shape = shapes[id];
    assert.equal(typeof shape.ja, "string", `${id}.ja`);
    assert.equal(typeof shape.en, "string", `${id}.en`);
    assert.deepEqual(Object.keys(shape.dims), ["w", "d", "h"], `${id}.dims`);
    assert.ok(Object.hasOwn(shape, "parts"), `${id}.parts`);
    if (id === "box") assert.equal(shape.parts, null);
    else assert.ok(Array.isArray(shape.parts) && shape.parts.length > 0, `${id}.parts`);
  });
});

test("握り位置は全プリセットで基準寸法の高さ内にある", () => {
  shapeIds.forEach((id) => {
    const shape = shapes[id];
    if (!shape.grip) return;
    assert.equal(typeof shape.grip.y, "number", `${id}.grip.y`);
    assert.ok(shape.grip.y >= 0 && shape.grip.y <= shape.dims.h,
      `${id}: 0 <= ${shape.grip.y} <= ${shape.dims.h}`);
  });
});

test("登録と駒のpropShapeを正規化し、登録時は形の基準寸法を使う", () => {
  const normalizePiece = bodyBetween(stageSource, "function normalizePiece", "function normalizeNote");
  assert.match(normalizePiece,
    /propShape: typeof piece\.propShape === "string" \? piece\.propShape : null/);
  assert.match(stageSource,
    /propShape: kind === "prop" && PROP_SHAPES\[t && t\.propShape\] \? t\.propShape : "box"/);
  const addSetItem = bodyBetween(stageSource, "function addSetItem", "function placeSetPiece");
  assert.match(addSetItem, /const shape = kind === "prop" && PROP_SHAPES\[propShape\] \? propShape : "box"/);
  assert.match(addSetItem, /const dims = kind === "prop" \? \{ \.\.\.PROP_SHAPES\[shape\]\.dims \}/);
});

test("形の部品と握り位置は登録寸法の比率で拡縮する", () => {
  const body = bodyBetween(stageSource, "function scaledPropShape", "function propPartsBounds");
  assert.match(body, /const sx = dims\.w \/ preset\.dims\.w/);
  assert.match(body, /const sy = dims\.h \/ preset\.dims\.h/);
  assert.match(body, /const sz = dims\.d \/ preset\.dims\.d/);
  assert.match(body, /dia: finite\(part\.dia, 0\) \* \(\(sx \+ sz\) \/ 2\)/);
  assert.match(body, /grip: preset\.grip \? \{ x: preset\.grip\.x \* sx, y: preset\.grip\.y \* sy \} : null/);
});

test("piecePartsのprop分岐はpropShapeを解決してpartBoxesへ一度だけ展開する", () => {
  const body = bodyBetween(stageSource, "function pieceParts", "function drawDiabolo");
  assert.match(body, /piece\.type === "prop"/);
  assert.match(body, /scaledPropShape\(piece, d\)/);
  assert.match(body, /SHOSAI_STAGE_MODELS\.partBoxes\(part\)/);
  assert.match(stageSource, /function propShapeOf[\s\S]*?owner\.propShape[\s\S]*?piece\.propShape[\s\S]*?"box"/);
});

test("openFpvはpropへpartsと拡縮済みgripを渡す", () => {
  const body = bodyBetween(stageSource, "function openFpv", "if (els.fpvOpen)");
  assert.match(body, /visual\.type === "prop" \? scaledPropShape\(visual, dims\) : null/);
  assert.match(body, /parts: visual\.type === "prop"/);
  assert.match(body, /grip: propShape \? propShape\.grip : null/);
});

test("3Dのparts分岐は握り点または外接高さ中央から保持の下駄を計算する", () => {
  const body = bodyBetween(fpvSource, "if (Array.isArray(piece.parts))", "} else if (piece.type === \"model\"");
  assert.match(body, /const held = piece\.heldBy/);
  // 2026-08-20 FPV転換対応で base の直読みは pieceBaseOf（animBase優先）へ替わった
  assert.match(body, /Math\.max\(0\.05, pieceBaseOf\(piece\)/);
  assert.match(body, /piece\.grip \? finite\(piece\.grip\.y, 0\) : \(boundsTop - boundsBottom\) \/ 2/);
  assert.match(body, /const lift = finite\(box\.lift, 0\) \+ held/);
});

test("追加行と寸法窓に小道具の形selectがある", () => {
  assert.match(indexSource, /id="stage-roster-prop-shape"/);
  assert.match(indexSource, /id="stage-setinfo-prop-shape"/);
});

test("出るものは小道具を専用グループと一覧へ分ける", () => {
  assert.match(indexSource, /id="stage-group-props"[\s\S]*?id="stage-prop-list"/);
  const body = bodyBetween(stageSource, "function renderSets()", "/* 照明の一覧");
  assert.match(body,
    /renderSetList\(els\.setList, \(item\) => item\.kind !== "light" && item\.kind !== "prop"/);
  assert.match(body, /renderSetList\(els\.propList, \(item\) => item\.kind === "prop"/);
  assert.match(stageSource, /function setListRow[\s\S]*?host\.append\(setListRow\(item\)\)/);
});
