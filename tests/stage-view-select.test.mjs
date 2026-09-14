import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");
const en = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const zhHans = await readFile(new URL("../stage-i18n.zh-Hans.js", import.meta.url), "utf8");
const zhHant = await readFile(new URL("../stage-i18n.zh-Hant.js", import.meta.url), "utf8");

test("正面・平面の表示は上下順を含む4択プルダウンにまとまる", () => {
  const select = html.match(/<select id="stage-view-select"[\s\S]*?<\/select>/)?.[0] || "";
  const options = [...select.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
    .map((match) => [match[1], match[2]]);
  assert.deepEqual(options, [
    ["front", "正面"],
    ["plan", "平面"],
    ["both-front", "両方①"],
    ["both-plan", "両方②"],
  ]);
  assert.doesNotMatch(html, /data-show-view|stage-swap-center/);
});

test("両方①と両方②は既存の中央表示順へ接続する", () => {
  assert.match(source, /value === "both-plan" \? \["plan", "front"\] : \["front", "plan"\]/);
  assert.match(source, /state\.layout\.centerOrder\[0\] === "plan" \? "both-plan" : "both-front"/);
  assert.match(source, /value === "front"[\s\S]*state\.showFront = true;[\s\S]*state\.showPlan = false;/);
  assert.match(source, /value === "plan"[\s\S]*state\.showFront = false;[\s\S]*state\.showPlan = true;/);
});

test("1枚表示では表示中パネルの右下に正面・平面の切り替えを出す", () => {
  for (const owner of ["front", "plan"]) {
    assert.match(html, new RegExp(`data-single-view-switch="${owner}"[\\s\\S]*?data-single-view-target="front"[\\s\\S]*?data-single-view-target="plan"`));
  }
  assert.match(source, /const single = state\.showFront !== state\.showPlan/);
  assert.match(source, /group\.hidden = !single \|\| !ownerShown/);
  assert.match(source, /state\.showFront = target === "front";[\s\S]*?state\.showPlan = target === "plan";/);
  assert.match(css, /\.stage-single-view-switch \{[\s\S]*?position: absolute;[\s\S]*?right: 12px;[\s\S]*?bottom: 12px;/);
  assert.match(css, /\.stage-single-view-switch button\[aria-pressed="true"\]/);
});

test("中央バーの表示プルダウンはコンパクトな幅と高さを使う", () => {
  assert.match(css, /\.stage-view-select select \{[\s\S]*width: 88px;[\s\S]*min-height: 30px;/);
  assert.match(css, /\.stage-center-bar \.stage-view-select select \{ min-height: 27px; \}/);
});

test("4択と上下順の説明を英語・簡体字・繁体字でも表示できる", () => {
  for (const dictionary of [en, zhHans, zhHant]) {
    assert.match(dictionary, /"両方①":/);
    assert.match(dictionary, /"両方②":/);
    assert.match(dictionary, /"表示する図。両方①は正面が上、両方②は平面が上":/);
  }
});
