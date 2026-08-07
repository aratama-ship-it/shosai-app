import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");

test("全画面APIが無い環境では疑似プレゼンへ入る", () => {
  assert.match(
    stageSource,
    /if \(!cv \|\| !cv\.requestFullscreen\) \{\s*enterPseudoPresentation\(\);\s*return;/,
  );
});

test("全画面APIが拒否された場合も疑似プレゼンへ入る", () => {
  assert.match(
    stageSource,
    /\.catch\(\(\) => \{[\s\S]*?enterPseudoPresentation\(\);[\s\S]*?\}\);/,
  );
});

test("疑似プレゼンの左右ゾーンは既存のシーン送りへ配線する", () => {
  assert.match(stageSource, /presentPrev\.addEventListener\("click", \(\) => stepScene\(-1\)\)/);
  assert.match(stageSource, /presentNext\.addEventListener\("click", \(\) => stepScene\(1\)\)/);
});

test("疑似プレゼン中のfullscreenchangeは状態を変更しない", () => {
  assert.match(
    stageSource,
    /document\.addEventListener\("fullscreenchange", \(\) => \{\s*if \(pseudoPresenting\) return;/,
  );
});

test("プレゼン中は見る位置の小図を描かない（見せる相手の道具ではない）", () => {
  assert.match(
    stageSource,
    /state\.showSeatMap && L\.venue\.audience === "front" && !\(presenting && target === ctx\)/,
  );
});
