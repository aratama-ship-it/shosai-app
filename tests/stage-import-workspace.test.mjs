import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

test("JSON読込は端末側の画面配置と表示設定を保ち、projectだけ差し替える", () => {
  assert.match(source,
    /const next = normalizeState\(\{ \.\.\.state, project: incoming\.project \}\);/);
  assert.doesNotMatch(source,
    /normalizeState\(\{ project: incoming\.project, seat: state\.seat/);
});

test("読み込んだショーは即時に棚へ保存し、別内容のID衝突では共存させる", () => {
  assert.match(source, /function reserveImportedShowId\(next\)/);
  assert.match(source, /const savedProject = existing\.state\.project \|\| \{\};/);
  assert.match(source, /if \(JSON\.stringify\(importedProject\) !== JSON\.stringify\(savedComparable\)\) \{\s*project\.id = rid\("show"\);/);
  assert.match(source, /function applyLoadedState\(next, message\) \{[\s\S]*?shelveCurrent\(\);[\s\S]*?persistSoon\(\);/);
  assert.match(source, /if \(phoneViewerActive\) \{[\s\S]*?shelveCurrent\(\);\s*reserveImportedShowId\(next\);[\s\S]*?ショー一覧へ保存しました/);
  assert.match(source, /function confirmImport\(asNew\) \{[\s\S]*?shelveCurrent\(\);\s*reserveImportedShowId\(next\);[\s\S]*?renderShows\(\);/);
});
