import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

const i18nContext = { window: {} };
vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
const text = i18nContext.window.SHOSAI_I18N.text;

const stageContext = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(stageSource, stageContext, { filename: "stage-sketch.js" });
const templates = stageContext.window.SHOSAI_STAGE_BEAT_TEMPLATE_MODEL.templates;

test("TEXTに重複キーがない", () => {
  const body = i18nSource.match(/const TEXT = \{([\s\S]*?)\n  \};\n\n  \/\* 中で組み立てる名前/);
  assert.ok(body, "TEXT object source should be found");
  const keys = [...body[1].matchAll(/^\s*"((?:\\.|[^"])*)"\s*:/gm)]
    .map((match) => JSON.parse(`"${match[1]}"`));
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  assert.deepEqual(duplicates, []);
});

test("10種のテンプレ名・役割名・範囲に英訳がある", () => {
  templates.forEach((template) => {
    assert.ok(text[template.name], `template name: ${template.name}`);
    assert.ok(text[template.range], `template range: ${template.range}`);
    template.roles.forEach((role) => assert.ok(text[role], `template role: ${role}`));
  });
  assert.equal(text["休憩"], "Intermission");
  assert.equal(text["構成テンプレートから作る"], "Create from a structure template");
  assert.equal(text["この骨格で新しいショーを作る"], "Create a new show from this structure");
});
