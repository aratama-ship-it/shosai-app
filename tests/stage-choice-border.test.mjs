import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("stage.html", root), "utf8");
const css = await readFile(new URL("style.css", root), "utf8");
const js = await readFile(new URL("stage-sketch.js", root), "utf8");

test("連続選択肢は選択中の四辺を明示し、隣接項目より手前へ描く", () => {
  assert.match(css, /\.stage-tool-grid button\[aria-pressed="true"\]\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;[^}]*border:\s*1px solid var\(--rust\);[^}]*\}/s);
  assert.match(css, /\.stage-light-motion-seg button\[aria-pressed="true"\]\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;/s);
  assert.match(css, /\.stage-arrow-choice button\[aria-pressed="true"\]\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;/s);
  assert.match(css, /#stage-export-pitch-fields > \.stage-tool-grid button,\s*\.stage-pitch-langs button\s*\{\s*border-left-width:\s*1px;\s*\}/s);
  assert.doesNotMatch(css, /#stage-export-pitch-fields > \.stage-tool-grid button,[^}]*border-left:\s*1px solid/s);
});

test("舞台スケッチ内のstage-tool-grid選択肢は共通の四辺枠を利用する", () => {
  const groups = [...html.matchAll(/<div class="([^"]*\bstage-tool-grid\b[^"]*)"[^>]*role="group"[^>]*>([\s\S]*?)<\/div>/g)];
  assert.ok(groups.length >= 9, `stage-tool-gridの選択肢が${groups.length}件しか見つからない`);
  groups.forEach(([, className, contents]) => {
    if (/\bstage-pitch-langs\b/.test(className)) {
      assert.match(js, /function buildPitchLanguageButtons\(\)[\s\S]*?button\.setAttribute\("aria-pressed",[\s\S]*?els\.pitchLangs\.append\(button\);/);
      return;
    }
    assert.match(contents, /<button\b[^>]*aria-pressed="(?:true|false)"/, `${className}にaria-pressed付きの選択肢がない`);
  });
});

test("選択枠の再発防止基準をトークン表に記録する", async () => {
  const tokens = await readFile(new URL("docs/ui-implementation-plan-2026-09-10/TOKENS.md", root), "utf8");
  assert.match(tokens, /連続選択肢の選択枠[^\n]*選択中は必ず四辺を閉じる/);
});
