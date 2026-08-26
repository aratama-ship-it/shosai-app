import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataSource = await readFile(new URL("stage-samples/index.js", root), "utf8");
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataSource, context);
const library = context.window.SHOSAI_STAGE_SHOW_LIBRARY;
const sample = library.samples.find((item) => item.id === "sample-seam-garden-v1");
const scenes = sample.sections.flatMap((section) => section.scenes);

test("継ぎ目の庭は8セクションの各4シーンで60分になる", () => {
  assert.equal(sample.id, "sample-seam-garden-v1");
  assert.equal(sample.sections.length, 8);
  assert.deepEqual(Array.from(sample.sections, (section) => section.scenes.length),
    [4, 4, 4, 4, 4, 4, 4, 4]);
  assert.equal(scenes.length, 32);
  assert.equal(scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0), 3600);
  assert.equal(sample.totalDurationSeconds, 3600);
  assert.deepEqual(Array.from(sample.sections, (section) => section.durationSeconds),
    [300, 420, 540, 540, 480, 420, 480, 420]);
  sample.sections.forEach((section) => {
    assert.equal(section.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
      section.durationSeconds);
  });
});

test("32シーンは一意なID、ビート、E1〜E5、配置を持つ", () => {
  assert.equal(new Set(scenes.map((scene) => scene.id)).size, 32);
  scenes.forEach((scene) => {
    assert.match(scene.id, /^[1-8]-[1-4]$/);
    assert.ok(scene.title.length > 0);
    assert.ok(scene.role.length > 0);
    assert.ok(Number.isInteger(scene.energy) && scene.energy >= 1 && scene.energy <= 5);
    assert.ok(scene.note.length >= 20);
    assert.ok(Object.keys(scene.cast).length >= 1);
    assert.ok(Object.keys(scene.sets).length >= 1);
    assert.ok(Object.keys(scene.lights).length >= 1);
  });
  assert.deepEqual(Array.from(new Set(scenes.map((scene) => scene.energy))).sort(), [1, 2, 3, 4, 5]);
});

test("崩壊と共同支持の中心場面は安全境界と要検証を本文に残す", () => {
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  assert.match(byId.get("6-2").note, /安全な落下位置|無制御の倒壊/);
  assert.match(byId.get("6-3").note, /要検証/);
  assert.match(byId.get("7-2").note, /要検証/);
  assert.match(byId.get("7-3").note, /高所化せず[\s\S]*要検証/);
  assert.equal(sample.boundaries.length, 3);
  assert.match(sample.boundaries.join("\n"), /初期仮説[\s\S]*支持しない/);
});

test("アプリは同梱ショーのデータ棚を先に読み、セクションとシーンへ変換する", () => {
  // 版番号は変更のたびに上がるので数字は見ない。見るのは読み込み順だけ。
  const samplesAt = indexSource.indexOf("stage-samples/index.js?v=");
  const sketchAt = indexSource.indexOf("stage-sketch.js?v=");
  assert.ok(samplesAt >= 0 && sketchAt >= 0, "index.html が同梱ショーと本体を読み込んでいる");
  assert.ok(samplesAt < sketchAt, "同梱ショーのデータ棚を本体より先に読み込んでいない");
  assert.match(swSource, /stage-samples\/index\.js\?v=\d+/);
  assert.equal(library.starter.cast.length, 2);
  assert.equal(library.samples.length, 2);
  assert.ok(library.samples.some((item) => item.id === "sample-eight-circus-v1"));
  assert.match(stageSource, /function bundledSampleById\(id\)/);
  assert.doesNotMatch(stageSource, /const SAMPLE_CAST = \[/);
  assert.match(stageSource, /function buildSeamGardenSampleShow\(\)/);
  assert.match(stageSource, /newScene\(`\$\{section\.id\}\. \$\{section\.title\}`,[\s\S]*"section", 0\)/);
  assert.match(stageSource, /newScene\(`\$\{row\.id\} \$\{row\.title\}`,[\s\S]*"scene", 1\)/);
  assert.match(stageSource, /holdDurationSeconds: row\.durationSeconds/);
  assert.match(stageSource, /transitionToNextSeconds: 0/);
  assert.match(stageSource, /shelveSeamGardenSample\(\);/);
  assert.match(stageSource, /openArgs\.has\("seam-sample"\)/);
});

test("スマホの読込欄はデータ棚の二つのサンプルを区別する", () => {
  /* サンプルの区別を守りつつ、表示名と読み上げ名はどちらも翻訳へ通す。 */
  assert.match(stageSource, /makePhoneButton\(tx\("継ぎ目の庭"\), tx\("継ぎ目の庭のサンプルを開く"\)\)/);
  assert.match(stageSource, /makePhoneButton\(tx\("サンプルショー"\), tx\("サンプルショーを開く"\)\)/);
  assert.match(stageSource, /seamSampleButton\.addEventListener\("click"[\s\S]*openSeamGardenSampleShow\(\)/);
});
