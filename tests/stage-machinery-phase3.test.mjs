import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const sketchSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");

test("盆の回転速度は既定0で-30〜30度/秒に正規化する", () => {
  assert.match(sketchSource,
    /if \(type === "revolve"\) normalized\.spinRate = clamp\(finite\(piece\.spinRate, 0\), -30, 30\);/);
});

test("盆を控えて引き直すときspinRateを保持する", () => {
  assert.match(sketchSource, /const STASH_KEYS = \[[\s\S]*?"spinRate"[\s\S]*?\];/);
});

test("場面転換は盆のspinRateも補間対象にする", () => {
  assert.match(sketchSource, /revolve: \{ spin: 0, spinRate: 0 \}/);
});

test("持続runは再生設定・転換・タブ表示状態を見て必要な時だけrAFを回す", () => {
  const start = sketchSource.indexOf("function spinningRevolves");
  const end = sketchSource.indexOf("const easeInOut", start);
  const runSource = sketchSource.slice(start, end);
  assert.ok(start >= 0 && end > start, "持続run本体がある");
  assert.match(runSource, /state\.animateScenes/);
  assert.match(runSource, /document\.hidden/);
  assert.match(runSource, /if \(sceneAnim\)/);
  assert.match(runSource, /requestAnimationFrame\(step\)/);
  assert.match(runSource, /delete piece\.animMech\.spin/);
});

test("持続runのフレーム間隔は250msでクランプする", () => {
  assert.match(sketchSource, /Math\.min\(250, Math\.max\(0, now - run\.lastAt\)\)/);
});

test("盆のインスペクタに日英対応の回転速度スライダーがある", () => {
  assert.match(indexSource,
    /id="stage-piece-spin-rate" min="-30" max="30" step="0\.5" value="0"/);
  assert.match(indexSource, /場面の間じゅう盆が回り続ける速さ。0で止まる。回転角は開始位相になる/);
  assert.match(i18nSource, /"回転速度": "Spin speed"/);
  assert.match(i18nSource, /"度\/秒": "°\/s"/);
  assert.match(i18nSource, /spinRate: "Spin speed "/);
});

test("持続runの実表示角は大きな正負の位相も-180〜180へ折り返す", () => {
  const expression = sketchSource.match(/const wrapSpinAngle = \(angle\) => ([^;]+);/)?.[1];
  assert.ok(expression, "wrapSpinAngleの式がある");
  const wrapSpinAngle = vm.runInNewContext(`(angle) => ${expression}`, { Math });
  assert.equal(wrapSpinAngle(0), 0);
  assert.equal(wrapSpinAngle(180), -180);
  assert.equal(wrapSpinAngle(-181), 179);
  assert.equal(wrapSpinAngle(1261), -179);
  assert.equal(wrapSpinAngle(-1261), 179);
});
