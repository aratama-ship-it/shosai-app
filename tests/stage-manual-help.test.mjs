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

test("正本と単独版に検索・冊子導線と共通データが継承される", () => {
  for (const source of [indexSource, stageSource]) {
    for (const value of ["stage-help-open", "stage-manual-open", "manual/manual-content.js?v=1"]) {
      assert.ok(source.includes(value), `${value} がページにある`);
    }
    assert.ok(
      source.indexOf("manual/manual-content.js?v=1") < source.indexOf("stage-sketch.js?v=301"),
      "共通マニュアルデータがstage-sketch.jsより先に読み込まれる",
    );
  }
});

test("Service Workerは冊子一式をv155へキャッシュする", () => {
  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v157";/);
  for (const entry of [
    "./manual/manual-content.js?v=1",
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
