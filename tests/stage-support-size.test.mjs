import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const scannerSource = await readFile(new URL("tools/check-object-on-performer.mjs", root), "utf8");

function supportUnderBody(source, startPattern, endPattern) {
  const start = source.indexOf(startPattern);
  const end = source.indexOf(endPattern, start);
  assert.ok(start >= 0, "supportUnder がある");
  assert.ok(end > start, "supportUnder の終端がある");
  return source.slice(start, end);
}

function assertPerformerSizeGuard(source) {
  assert.match(source, /other\.type === "performer" && piece\.type !== "performer"/);
  assert.match(source, /selfArea > foot\.w \* foot\.d/);
}

function assertPerformerFurnitureGuard(source) {
  assert.match(source, /const PERFORMER_UNSUPPORTABLE_TYPES = \{ chair: true, table: true, bench: true, stool: true \};/);
  assert.match(source, /other\.type === "performer" && PERFORMER_UNSUPPORTABLE_TYPES\[piece\.type\]\) return;/);
}

test("本体は演者より設置面積が大きい非演者を演者の支持対象から外す", () => {
  const body = supportUnderBody(stageSource, "function supportUnder", "function refreshBases");
  assertPerformerSizeGuard(body);
});

test("検出ツールの複製ロジックも本体と同じサイズ判定を持つ", () => {
  const body = supportUnderBody(scannerSource, "const supportUnder", "const flownLift");
  assertPerformerSizeGuard(body);
});

test("本体は座る・寄りかかる家具を演者の支持対象から常に外す", () => {
  assertPerformerFurnitureGuard(stageSource);
});

test("検出ツールの複製ロジックも本体と同じ家具除外を持つ", () => {
  assertPerformerFurnitureGuard(scannerSource);
});

/* 吊物にしかならない道具（FLOWN_ONLY＝トラピーズ・ティシュー）は、
   登録の flown が false のままスクリプト生成JSONから持ち込まれても吊物として扱う。
   放っておくとバーが「演者の頭に乗る」（2026-08-19に垂直線デモで135件発生）。 */
test("本体のisFlownはFLOWN_ONLYを登録値に関係なく吊物として扱う", () => {
  const body = supportUnderBody(stageSource, "function isFlown", "function seriStraddlers");
  assert.match(body, /if \(FLOWN_ONLY\[piece\.type\]\) return true;/);
});

test("読み込みの正規化はFLOWN_ONLYの登録を必ず吊りへ直す", () => {
  assert.match(stageSource, /flown: Boolean\(FLOWN_ONLY\[kind\] \|\| t\.flown\)/);
});

test("検出ツールの複製ロジックも本体と同じFLOWN_ONLY扱いを持つ", () => {
  assert.match(scannerSource, /loadFlownOnly/);
  assert.match(scannerSource, /if \(FLOWN_ONLY\[piece\.type\]\) return true;/);
});
