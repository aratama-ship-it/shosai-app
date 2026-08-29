import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const [manualSource, indexSource, stageSource, swSource, assetsIgnore, i18nSource] = await Promise.all([
  readFile(new URL("manual/manual-content.js", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("stage.html", root), "utf8"),
  readFile(new URL("stage-sw.js", root), "utf8"),
  readFile(new URL(".assetsignore", root), "utf8"),
  readFile(new URL("stage-i18n.js", root), "utf8"),
]);

const manualContext = { window: {} };
vm.runInNewContext(manualSource, manualContext, { filename: "manual/manual-content.js" });
const manual = manualContext.window.MANUAL_CONTENT;
const find = manualContext.window.MANUAL_FIND;

test("マニュアル正本は10章35節を検索に使える構造で持つ", () => {
  assert.equal(manual.chapters.length, 10);
  const sections = manual.chapters.flatMap((chapter) => Array.from(chapter.sections));
  assert.equal(sections.length, 35);
  sections.forEach((section) => {
    assert.equal(typeof section.id, "string");
    assert.ok(section.id);
    assert.equal(typeof section.title, "string");
    assert.ok(section.title);
    assert.ok(Array.isArray(section.keywords));
    assert.equal(typeof section.html, "string");
    assert.ok(section.html);
  });
  const ids = sections.map((section) => section.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("MANUAL_FINDは全語ANDで検索し、noindex本文を除外する", () => {
  assert.equal(typeof find, "function");
  const hits = Array.from(find("消えた"));
  assert.ok(hits.includes("lost"));
  assert.ok(hits.includes("feedback"));
  assert.ok(!hits.includes("how-to-read"));
  assert.deepEqual(Array.from(find("")), []);
});

test("全章・全節に英語の対訳が揃い、日本語が漏れていない", () => {
  const kana = /[぀-ヿ一-鿿]/;
  manual.chapters.forEach((chapter) => {
    assert.ok(chapter.titleEn, `${chapter.id} に titleEn`);
    assert.ok(chapter.tabEn, `${chapter.id} に tabEn`);
    assert.ok(!kana.test(chapter.titleEn + chapter.tabEn), `${chapter.id} の章名英訳に日本語がない`);
    chapter.sections.forEach((section) => {
      assert.ok(section.titleEn, `${section.id} に titleEn`);
      assert.ok(Array.isArray(section.keywordsEn) && section.keywordsEn.length, `${section.id} に keywordsEn`);
      assert.equal(typeof section.htmlEn, "string");
      assert.ok(section.htmlEn, `${section.id} に htmlEn`);
      assert.ok(
        !kana.test(section.titleEn + section.keywordsEn.join(" ") + section.htmlEn),
        `${section.id} の英語本文に日本語がない`,
      );
      if (section.tags) {
        assert.equal((section.tagsEn || []).length, section.tags.length, `${section.id} の tags に対訳がある`);
      }
    });
  });
});

test("MANUAL_FINDは英語モードで英語の見出し・言い換え語・本文を引く", () => {
  const en = Array.from(find("disappeared", "en"));
  assert.ok(en.includes("lost"));
  assert.ok(!en.includes("how-to-read"));
  assert.ok(Array.from(find("revolve", "en")).includes("p-machinery"));
  assert.ok(Array.from(find("no sound", "en")).includes("p-music"));
  // 言語は混ぜない: 英語モードで日本語の言い換え語は当たらない
  assert.ok(!Array.from(find("盆", "en")).includes("p-machinery"));
  // 既定（第2引数なし）は従来どおり日本語
  assert.ok(Array.from(find("盆")).includes("p-machinery"));
});

test("本文はいまのUIに追随している（地図なし・空にするはシーン欄・はじめての案内）", () => {
  const sectionById = new Map(
    manual.chapters.flatMap((chapter) => chapter.sections.map((section) => [section.id, section])),
  );
  const all = Array.from(sectionById.values()).map((section) => section.html).join(" ");
  assert.ok(!all.includes("〈地図〉"), "廃止した〈地図〉が本文に残っていない");
  assert.ok(sectionById.get("p-scenes").html.includes("舞台を空にする"), "空にするはシーン欄の節にある");
  assert.ok(!sectionById.get("p-save").html.includes("舞台を空にする"), "保存の節から移動済み");
  assert.ok(sectionById.get("tour").html.includes("はじめての案内"), "案内の呼び出し名が現行");
});

test("正本と単独版に検索・冊子導線と共通データが継承される", () => {
  for (const source of [indexSource, stageSource]) {
    for (const value of ["stage-help-open", "stage-manual-open", "manual/manual-content.js?v=2"]) {
      assert.ok(source.includes(value), `${value} がページにある`);
    }
    assert.ok(
      source.indexOf("manual/manual-content.js?v=2") < source.indexOf("stage-sketch.js?v=312"),
      "共通マニュアルデータがstage-sketch.jsより先に読み込まれる",
    );
  }
});

test("Service Workerは冊子一式を最新版へキャッシュする", () => {
  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v177";/);
  for (const entry of [
    "./manual/manual-content.js?v=2",
    "./manual/manual-content.js",
    "./manual/manual.html",
  ]) {
    assert.ok(swSource.includes(`"${entry}"`), `${entry} がAPP_SHELLにある`);
  }
});

test("manualディレクトリは配信除外されていない", () => {
  const rules = assetsIgnore.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  assert.deepEqual(rules.filter((line) => line.toLowerCase().includes("manual")), []);
});

test("使い方検索の新ラベルは英訳表に登録されている", () => {
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const text = i18nContext.window.SHOSAI_I18N.text;
  for (const label of [
    "使い方をさがす",
    "使いかたの冊子",
    "例：保存 ／ 消えた ／ 盆",
    "言葉を入れると、冊子から該当箇所だけを出します。",
    "見つかりませんでした。別の言い方でもう一度どうぞ。",
    "冊子で読む",
    "冊子を開く",
    "冊子を読み込めませんでした。ページを再読み込みしてください。",
  ]) {
    assert.equal(typeof text[label], "string", `${label} の英訳がある`);
    assert.ok(text[label]);
  }
});
