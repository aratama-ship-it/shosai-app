import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const english = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const simplified = await readFile(new URL("../stage-i18n.zh-Hans.js", import.meta.url), "utf8");
const traditional = await readFile(new URL("../stage-i18n.zh-Hant.js", import.meta.url), "utf8");

test("シーンサブタイトルは端末設定で初期OFFになる", () => {
  assert.match(source, /key: "sceneSubtitle", label: "シーンのサブタイトル", def: false/);
  assert.match(source, /featureOn\("sceneSubtitle"\) && scene\.beat && scene\.beat\.role/);
  assert.doesNotMatch(source, /stage-scene-beat-energy|stage-beat-energy-step/);
});

test("ダブルクリックのシーン詳細で名前・サブタイトル・説明を編集できる", () => {
  for (const id of [
    "stage-rename-input", "stage-rename-scene-fields", "stage-rename-subtitle", "stage-rename-scene-note",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /stage-rename-energy|>エネルギー</);
  assert.match(source, /renameTitle\.textContent = tx\(scene\.kind === "section" \? "セクションの詳細" : "シーンの詳細"\)/);
  assert.match(source, /renameSceneFields\.hidden = scene\.kind !== "scene"/);
  assert.match(source, /renameSubtitle\.value = scene\.kind === "scene"[\s\S]*normalizeBeat\(scene\.beat\)\.role/);
  assert.match(source, /const beatChanged = renameTarget\.kind === "scene"[\s\S]*checkpoint\(\);[\s\S]*renameTarget\.beat = nextBeat/);
  assert.match(css, /\.stage-rename-scene-fields \{[\s\S]*display: grid/);
});

test("サブタイトルUIは英語・簡体字・繁体字を持つ", () => {
  assert.match(english, /"シーンのサブタイトル": "Scene subtitle"/);
  assert.match(simplified, /"シーンのサブタイトル": "场景副标题"/);
  assert.match(traditional, /"シーンのサブタイトル": "場景副標題"/);
  for (const pack of [english, simplified, traditional]) {
    for (const key of ["シーンの詳細", "サブタイトル", "変更を保存"]) {
      assert.match(pack, new RegExp(`"${key}":`), key);
    }
    assert.doesNotMatch(pack, /"エネルギー":/);
  }
});
