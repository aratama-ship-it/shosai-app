import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const japaneseSource = await readFile(
  new URL("../../docs/stage-sketch/2026-08-03_舞台スケッチ_このアプリについて_約1000字版.md", import.meta.url),
  "utf8",
);
const englishSource = await readFile(
  new URL("../../docs/stage-sketch/2026-08-03_舞台スケッチ_このアプリについて_英語版.md", import.meta.url),
  "utf8",
);

const i18nContext = { window: {} };
vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
const text = i18nContext.window.SHOSAI_I18N.text;

function approvedCopy(source, heading, credit) {
  const section = source.split(`## ${heading}\n`)[1];
  assert.ok(section, `${heading} section should exist`);
  const beforeCredit = section.split(`**${credit}**`)[0];
  return beforeCredit.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const japaneseParagraphs = approvedCopy(japaneseSource, "このアプリについて", "開発者");
const englishParagraphs = approvedCopy(englishSource, "About This App", "Developer");

test("Aboutモーダルは承認済み日本語原稿を段落単位でそのまま持つ", () => {
  const htmlParagraphs = [...html.matchAll(/<p class="stage-about-copy">([\s\S]*?)<\/p>/g)]
    .map((match) => match[1]);
  assert.deepEqual(htmlParagraphs, japaneseParagraphs);
  assert.match(html, /<p class="stage-about-credit">開発者<\/p>/);
});

test("Aboutモーダルの英訳は承認済み英語原稿と完全一致する", () => {
  assert.equal(japaneseParagraphs.length, englishParagraphs.length);
  japaneseParagraphs.forEach((paragraph, index) => {
    assert.equal(text[paragraph], englishParagraphs[index]);
  });
  assert.equal(text["このアプリについて"], "About This App");
  assert.equal(text["開発者"], "Developer");
});

test("Aboutには独立モーダルと設定内の入口がある", () => {
  [
    "stage-about-open-from-prefs",
    "stage-about-backdrop",
    "stage-about-modal",
    "stage-about-title",
    "stage-about-close",
  ].forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /id="stage-about-modal" role="dialog" aria-modal="true"/);
  assert.match(html, /aria-labelledby="stage-about-title" hidden/);
  assert.doesNotMatch(html, /id="stage-about-open"/);
  assert.match(stageSource, /els\.aboutOpenFromPrefs\.addEventListener\("click", openAboutFromPrefs\)/);
  assert.match(stageSource, /els\.aboutClose\.addEventListener\("click", closeAbout\)/);
  assert.match(stageSource, /els\.aboutBackdrop\.addEventListener\("click", closeAbout\)/);
});
