import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");

test("LIGHT_PRESETSにbeamxとbeamfanがある", () => {
  assert.match(stageSource, /const LIGHT_PRESETS = \{[\s\S]*?\n    beamx: \{/);
  assert.match(stageSource, /const LIGHT_PRESETS = \{[\s\S]*?\n    beamfan: \{/);
});

test("beamxは床置きの白ビームと赤ローホリで組まれている", () => {
  const beamx = stageSource.match(/\n    beamx: \{([\s\S]*?)\n    beamfan: \{/)?.[1] || "";
  assert.match(beamx, /color: "#dce6f2", dia: 0\.9, kind: "floor"/);
  assert.match(beamx, /name: `ローホリ\$\{i \+ 1\}`, color: "#a03428", dia: 2\.6, kind: "floor"/);
});

test("サムネイルはプリセットの実データから描く", () => {
  const preview = stageSource.match(/function drawPresetPreview\(canvas, key\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert.match(preview, /const preset = LIGHT_PRESETS\[key\]/);
  assert.match(preview, /const specs = preset\.build\(size\)/);
});

test("stage.htmlはselectを廃止してプリセットタイル一覧を持つ", () => {
  assert.doesNotMatch(stageHtml, /<select[^>]*id="stage-light-preset"/);
  assert.match(stageHtml, /<div id="stage-light-preset-tiles"/);
});
