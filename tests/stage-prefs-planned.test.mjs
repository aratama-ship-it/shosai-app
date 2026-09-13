import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

test("環境設定には準備中の機能を描画しない", () => {
  assert.doesNotMatch(source, /FEATURES_PLANNED\.forEach/);
  assert.doesNotMatch(source, /className = "stage-pref-row is-planned"/);
});
