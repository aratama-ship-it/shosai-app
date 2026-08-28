import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

/* 同梱サンプルの内容（場面名・ト書き・名前）が英語版を持つことを静的に検査する。
 * 新しい場面や小道具を足して英訳を忘れると、ここで名指しで止まる。 */

const source = await readFile(new URL("../stage-samples/index.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "stage-samples/index.js" });
const LIBRARY = context.window.SHOSAI_STAGE_SHOW_LIBRARY;

const japanese = /[぀-ヿ㐀-鿿]/;

function assertEnglish(value, label) {
  assert.ok(typeof value === "string" && value.length > 0, `${label}: 英語版が空`);
  assert.doesNotMatch(value, japanese, `${label}: 英語版に日本語が残る: ${value}`);
}

test("サンプルは2本とも titleEn を持つ", () => {
  LIBRARY.samples.forEach((sample) => assertEnglish(sample.titleEn, sample.id));
});

test("八人のサーカス: 出演者・装置・照明・場面・境界のすべてに英語版がある", () => {
  const sample = LIBRARY.samples.find((item) => item.id === "sample-eight-circus-v1");
  sample.cast.forEach((member) => assertEnglish(member.nameEn, `cast ${member.key}`));
  sample.sets.forEach((item) => assertEnglish(item.nameEn, `set ${item.key}`));
  sample.lights.forEach((item) => assertEnglish(item.nameEn, `light ${item.key}`));
  sample.scenes.forEach((scene, index) => {
    assertEnglish(scene.titleEn, `scene ${index + 1} title`);
    assertEnglish(scene.noteEn, `scene ${index + 1} note`);
  });
  assert.equal(sample.boundariesEn.length, sample.boundaries.length);
  sample.boundariesEn.forEach((line, index) => assertEnglish(line, `boundary ${index + 1}`));
});

test("継ぎ目の庭: 全セクション・全32場面・名前・境界に英語版がある", () => {
  const sample = LIBRARY.samples.find((item) => item.id === "sample-seam-garden-v1");
  sample.cast.forEach((member) => assertEnglish(member.nameEn, `cast ${member.key}`));
  sample.sets.forEach((item) => assertEnglish(item.nameEn, `set ${item.key}`));
  sample.lights.forEach((item) => assertEnglish(item.nameEn, `light ${item.key}`));
  let sceneCount = 0;
  sample.sections.forEach((section) => {
    assertEnglish(section.titleEn, `section ${section.id} title`);
    assertEnglish(section.summaryEn, `section ${section.id} summary`);
    section.scenes.forEach((scene) => {
      sceneCount += 1;
      assertEnglish(scene.titleEn, `scene ${scene.id} title`);
      assertEnglish(scene.noteEn, `scene ${scene.id} note`);
    });
  });
  assert.equal(sceneCount, 32, "場面数が32から変わったら英訳の対応も見直す");
  assert.equal(sample.boundariesEn.length, sample.boundaries.length);
  sample.boundariesEn.forEach((line, index) => assertEnglish(line, `boundary ${index + 1}`));
});
