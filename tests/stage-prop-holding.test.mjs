import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

function bodyBetween(source, startPattern, endPattern) {
  const start = source.indexOf(startPattern);
  const end = source.indexOf(endPattern, start);
  assert.ok(start >= 0, `${startPattern} がある`);
  assert.ok(end > start, `${startPattern} の終端がある`);
  return source.slice(start, end);
}

test("小道具propが駒・セット・並び順・実寸・立体へ登録されている", () => {
  assert.match(stageSource, /const PIECE_TYPES = \{[\s\S]*?prop: "小道具"/);
  assert.match(stageSource, /const SET_KINDS = \{[\s\S]*?prop: "小道具"/);
  assert.match(stageSource, /"sphere", "prop", "model"/);
  assert.match(stageSource, /prop: 0\.4/);
  assert.match(stageSource, /prop: \{ w: 0\.4, d: 0\.3, h: 0\.4 \}/);
  assert.match(stageSource, /const SOLID_TYPES = \{[\s\S]*?prop: true/);
});

test("normalizePieceは持ち手と左右を正規化する", () => {
  const body = bodyBetween(stageSource, "function normalizePiece", "function normalizeNote");
  assert.match(body, /heldBy: typeof piece\.heldBy === "string" \? piece\.heldBy : null/);
  assert.match(body, /holdSide: piece\.holdSide === "L" \? "L" : "R"/);
});

test("持てる種類・寸法上限・吊物除外が一つの判定にまとまっている", () => {
  assert.match(stageSource,
    /const HOLDABLE_TYPES = \{ prop: true, suitcase: true, diabolo: true, sphere: true, cane: true \}/);
  const body = bodyBetween(stageSource, "function isHoldable", "function effectivePlacement");
  // 小道具は寸法上限なし（棒・旗・傘は1.2m超が普通）。上限は既存種類だけに残す
  assert.match(body, /\(piece\.type === "prop" \|\| longest <= 1\.2\) && !flown/);
});

test("supportUnderは持たれている駒を乗る側・支える側の両方から外す", () => {
  const body = bodyBetween(stageSource, "function supportUnder", "function isFlown");
  assert.match(body, /if \(piece\.heldBy\) return \{ top, holder \}/);
  assert.match(body, /if \(other\.heldBy\) return/);
});

test("保持中の位置・高さ同期とシーン複製時のid張り替えがある", () => {
  const refresh = bodyBetween(stageSource, "function refreshBases", "function bringToTop");
  assert.match(refresh, /const across = side \* 0\.28/);
  assert.match(refresh, /piece\.base = finite\(holder\.base, 0\) \+ 0\.75/);
  const clone = bodyBetween(stageSource, "function cloneScene", "function nextSceneOf");
  assert.match(clone, /piece\.heldBy = swap\.get\(piece\.heldBy\) \|\| null/);
});

test("インスペクタに持ち物・持ち手の操作があり英語名も登録されている", () => {
  assert.match(indexSource, /id="stage-hold-controls"/);
  assert.match(indexSource, /id="stage-holder-controls"/);
  assert.match(i18nSource, /setKind: \{[\s\S]*?prop: "Prop"/);
  assert.match(i18nSource, /pieceType: \{[\s\S]*?prop: "Prop"/);
});
