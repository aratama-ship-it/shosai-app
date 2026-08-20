import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function functionBody(name, nextName) {
  const start = stageSource.indexOf(`function ${name}`);
  const end = nextName ? stageSource.indexOf(`function ${nextName}`, start) : stageSource.length;
  assert.ok(start >= 0, `${name} がある`);
  assert.ok(end > start, `${name} の終端がある`);
  return stageSource.slice(start, end);
}

test("舞台セットの種類にせりがある", () => {
  const kinds = stageSource.match(/const SET_KINDS = \{([\s\S]*?)\n  \};/);
  assert.ok(kinds, "SET_KINDS がある");
  assert.match(kinds[1], /seri:\s*"せり"/);
});

test("舞台裏の控えにせり上がりを残す", () => {
  const stash = stageSource.match(/const STASH_KEYS = \[([\s\S]*?)\];/);
  assert.ok(stash, "STASH_KEYS がある");
  assert.match(stash[1], /"seriH"/);
});

test("せりの上面は登録寸法ではなくシーンのせり上がりから決め、床下は支持面にしない", () => {
  const body = functionBody("pieceTopLocal", "supportFootprint");
  assert.match(body, /piece\.animMech && piece\.animMech\.seriH !== undefined/);
  assert.match(body, /piece\.animMech\.seriH : piece\.seriH/);
  assert.match(body, /clamp\(finite\(seriH, 0\), -3, 4\)/);
});

test("せりは必ず床を基準にして支えを持たない", () => {
  const body = functionBody("refreshBases", "bringToTop");
  assert.match(body, /\["seri", "revolve", "deck", "curtain", "pool"\]\.includes\(piece\.type\)[\s\S]*piece\.base = 0; piece\.supportId = null; return;/);
});

test("床面のせりは箱を作らず、負のせりは床下へ箱を作る", () => {
  const parts = functionBody("pieceParts", "drawSeatMap");
  assert.match(parts, /machinery\.machineryParts/);
  assert.match(stageSource, /piece\.seriH, 0\), -3, 4/);
  const draw = functionBody("drawSolid", "riggingPoint");
  assert.match(draw, /piece\.type === "seri" && parts\.length === 0/);
  assert.match(draw, /piece\.type === "seri" && L\.plan[\s\S]*machinery\.mechVal\(piece, "seriH", 0\)/);
  assert.match(draw, /target\.stroke\(\);[\s\S]*target\.restore\(\);[\s\S]*return;/);
});

test("せりをドラッグし終えるとowner優先の錠を掛け直す", () => {
  const body = functionBody("finishPointer", "grabNote");
  assert.match(body, /pointerAction\.kind === "drag" && pointerAction\.moved/);
  assert.match(body, /piece\.type === "seri"[\s\S]*setLocked\(piece, true\)/);
  assert.match(body, /せりを置きました。錠を掛けました（せりの位置は動きません）/);
});

test("後から動かしたせりの上にも乗れる（並び順を超えて支えの候補に入れる）", () => {
  assert.match(stageSource, /\.concat\(pieces\.slice\(i \+ 1\)\.filter\(\(p\) => p\.type === "seri"\)\)/);
});

test("せりの寸法表示は幅×奥行きだけ（高さを持たないのでNaNを出さない）", () => {
  assert.match(stageSource, /if \(item\.kind === "seri"\) return `\$\{Math\.round\(d\.w \* 100\)\}×\$\{Math\.round\(d\.d \* 100\)\}cm`;/);
});
