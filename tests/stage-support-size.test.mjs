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
