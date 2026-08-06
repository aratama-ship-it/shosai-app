import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");

test("シーンの時間は初期OFFの環境設定として扱う", () => {
  assert.match(
    stageSource,
    /\{ key: "sceneTiming", label: "シーンの時間", def: false,/,
  );
  assert.match(stageSource, /if \(featureOn\("sceneTiming"\)\) \{\s*timing\.append/);
  assert.match(stageSource, /if \(timing\.childElementCount\) body\.append\(timing\)/);
});

test("時間欄は意味が分かる名前で日英表示する", () => {
  const context = { window: {} };
  vm.runInNewContext(i18nSource, context, { filename: "stage-i18n.js" });
  const text = context.window.SHOSAI_I18N.text;
  assert.equal(text["シーンの時間"], "Scene timing");
  assert.equal(text["見せる時間"], "Time on this scene");
  assert.equal(text["次のシーンへの移動時間"], "Time moving to the next scene");
});

test("OFFは時間値を削除せず表示と印刷だけを切り替える", () => {
  assert.doesNotMatch(stageSource, /delete scene\.rehearsal/);
  assert.doesNotMatch(stageSource, /scene\.rehearsal = null/);
  assert.match(
    stageSource,
    /if \(featureOn\("sceneTiming"\)\) \{\s*if \(finite\(rh\.holdDurationSeconds/,
  );
});
