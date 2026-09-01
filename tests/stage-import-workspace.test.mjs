import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

test("JSON読込は端末側の画面配置と表示設定を保ち、projectだけ差し替える", () => {
  assert.match(source,
    /const next = normalizeState\(\{\s*\.\.\.state,\s*project: incoming\.project,\s*mcpRevision: appliedRevision,\s*\}\);/);
  assert.doesNotMatch(source,
    /normalizeState\(\{ project: incoming\.project, seat: state\.seat/);
});

test("読み込んだショーは即時に棚へ保存し、別内容のID衝突では共存させる", () => {
  assert.match(source, /function reserveImportedShowId\(next\)/);
  assert.match(source, /const savedProject = existing\.state\.project \|\| \{\};/);
  assert.match(source, /if \(JSON\.stringify\(importedProject\) !== JSON\.stringify\(savedComparable\)\) \{\s*project\.id = rid\("show"\);/);
  assert.match(source, /function prepareLoadedState\(next\) \{[\s\S]*?if \(!shelveCurrent\(\)\)[\s\S]*?if \(!shelveState\(next\)\)[\s\S]*?return true;/);
  assert.match(source, /function applyLoadedState\(next, message\) \{\s*if \(!prepareLoadedState\(next\)\) return false;[\s\S]*?persistSoon\(\);[\s\S]*?return true;/);
  assert.match(source, /if \(phoneViewerActive\) \{\s*if \(next\.mcpRevision === null\) reserveImportedShowId\(next\);\s*if \(!applyLoadedState\(next,[\s\S]*?\)\) return;[\s\S]*?ショー一覧へ保存しました/);
  assert.match(source, /function confirmImport\(asNew\) \{[\s\S]*?if \(next\.mcpRevision === null\) reserveImportedShowId\(next\);\s*if \(!prepareLoadedState\(next\)\) return;[\s\S]*?renderShows\(\);/);
});
