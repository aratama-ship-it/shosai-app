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

/* ---- 英語の書式をそろえる（2026-09-05・アプリ内英語の一巡） ----
   LP・紹介ページと同じ方針: 綴りはブリティッシュ、アポストロフィは直線、
   emダッシュは前後に空白。★Aboutモーダルの英語は「承認済み英語原稿」
   （docs/stage-sketch/2026-08-03_..._英語版.md）と完全一致させる決まりなので、
   そこに載っている文言だけは対象外にする。原稿を直すのは本人の判断。 */
const approvedEnglish = new Set(
  (await readFile(
    new URL("../../docs/stage-sketch/2026-08-03_舞台スケッチ_このアプリについて_英語版.md", import.meta.url),
    "utf8",
  ))
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
);
const allEnglishValues = Object.values(text)
  .filter((v) => typeof v === "string" && !/[぀-ヿ一-鿿]/.test(v));
const englishValues = allEnglishValues.filter((v) => !approvedEnglish.has(v.trim()));

test("英語の綴りはブリティッシュにそろえる（承認済み原稿も含む）", () => {
  /* ★綴りだけは承認済み原稿も対象にする。2026-09-05、本人承認のうえで原稿側の
     theater / realize / realizing をブリティッシュに直した（約物は著者の文章として
     そのまま残す）。原稿と stage-i18n.js は完全一致が必須なので、直すときは両方。 */
  const american = ["theater", "realize", "realizing", "organize", "recognize", "analyze", "color", "center", "meter"];
  for (const word of american) {
    const hit = allEnglishValues.filter((v) => new RegExp(`\\b${word}\\b`, "i").test(v));
    assert.equal(hit.length, 0, `アメリカ綴り「${word}」が残っている: ${hit[0]}`);
  }
  // 上演のプログラムは programme（コンピュータの program と区別する）
  assert.equal(text["古典サーカス・プログラム型"], "Classical Circus Programme");
});

test("英語の約物はLPと同じ書き方にそろえる（承認済み原稿は除く）", () => {
  const curly = englishValues.filter((v) => v.includes("’"));
  assert.equal(curly.length, 0, `カーリーのアポストロフィが残っている: ${curly[0]}`);
  const tight = englishValues.filter((v) => /\S—\S/.test(v));
  assert.equal(tight.length, 0, `emダッシュの前後に空白がない: ${tight[0]}`);
});

test("同じ英語が別の意味に使われていない（太さと間口）", () => {
  /* ★2026-09-05: 線の太さも劇場の間口もどちらも "Width" だった。
     矢印の選択肢は Thin / Medium / Thick なので、見出しは Thickness が合う。 */
  assert.equal(text["太さ"], "Thickness");
  assert.equal(text["間口"], "Width");
});

test("パネルの見出しは sentence case にそろえる", () => {
  // 12枚の見出しのうち「AI指示」だけが Title Case だった
  for (const [ja, en] of [
    ["出るもの", "Cast & set"], ["舞台機構", "Stage machinery"], ["セット登録", "Saved sets"],
    ["リアルタイム共有", "Live sharing"], ["AI指示", "AI instructions"],
  ]) {
    assert.equal(text[ja], en);
  }
});
