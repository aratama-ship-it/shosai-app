import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function loadImportModel() {
  const window = {};
  const context = vm.createContext({
    window,
    document: { getElementById: () => null },
    console,
  });
  vm.runInContext(source, context, { filename: "stage-sketch.js" });
  return window.SHOSAI_STAGE_AI_EDIT_IMPORT_MODEL;
}

const model = loadImportModel();

test("editSummary付きJSONの差分行と警告を読み込みモーダル用文字列へ含める", () => {
  const text = model.modalText({
    planId: "plan-1",
    request: "第3場面の円座を入れ替える",
    summary: "円座Aを円座Bへ置換します。",
    baseRevision: 12,
    appliedRevision: 13,
    diff: [{
      sceneId: "scene-3",
      sceneTitle: "第3場面",
      before: ["円座A"],
      after: ["円座B"],
      lines: ["円座A → 円座B に置換。位置・向き・大きさは維持。"],
      stashed: { "set-circle": { u: 0.2, v: 0.8 } },
    }],
    warnings: ["専門家による確認が必要です。"],
    stashed: "UIへ出してはいけない控えの位置",
  });

  assert.match(text, /AIの編集内容/);
  assert.match(text, /指示: 第3場面の円座を入れ替える/);
  assert.match(text, /概要: 円座Aを円座Bへ置換します。/);
  assert.match(text, /Revision: 12 → 13/);
  assert.match(text, /第3場面/);
  assert.match(text, /円座A → 円座B に置換。位置・向き・大きさは維持。/);
  assert.match(text, /専門家による確認が必要です。/);
  assert.match(text, /安全は確認されていません/);
  assert.doesNotMatch(text, /控えの位置|stashed|"u"/);
});

test("editSummaryなしのJSONではAI編集の追加節を作らない", () => {
  assert.equal(model.modalText(null), "");
  assert.equal(model.modalText(undefined), "");
  assert.match(source, /const editDetails = normalizeImportEditSummary\(editSummary, isEn\(\)\);\s*if \(editDetails\) \{/);
});

test("承認後も元のショーを棚に残し、読み込んだショーを別エントリとして増やす", () => {
  const start = source.indexOf("function confirmImport(asNew)");
  const end = source.indexOf("\n  function renderVenueControls", start);
  const confirmImport = source.slice(start, end);

  assert.match(source, /importAsNew\.addEventListener\("click", \(\) => confirmImport\(true\)\)/);
  assert.match(confirmImport, /if \(asNew\) \{[\s\S]*?candidate\.project\.id = rid\("show"\);[\s\S]*?if \(!applyLoadedState\(candidate,[\s\S]*?\)\) return;[\s\S]*?closeImportPreview\(\);/);
  assert.match(source, /function applyLoadedState\(next, message\) \{\s*if \(!prepareLoadedState\(next\)\) return false;[\s\S]*?persistSoon\(\);[\s\S]*?return true;/);
  assert.match(confirmImport, /if \(!prepareLoadedState\(next\)\) return;\s*closeImportPreview\(\);[\s\S]*?state = next;/);
});

test("スマホ閲覧モードは比較モーダルとAI差分表示を挟まない", () => {
  assert.match(source, /if \(phoneViewerActive\) \{[\s\S]*?applyLoadedState\(next,[\s\S]*?return;\s*\}\s*pendingImport = next;\s*renderImportSummary\(next, editSummary\);/);
});
