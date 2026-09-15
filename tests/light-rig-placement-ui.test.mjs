import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const app = await readFile(new URL("docs/light-rig-design-2026-09-11/prototype/app.js", root), "utf8");
const html = await readFile(new URL("docs/light-rig-design-2026-09-11/prototype/index.html", root), "utf8");
const presetUi = await readFile(new URL("docs/light-rig-design-2026-09-11/prototype/light-presets-ui.js", root), "utf8");

const functionBody = (name) => {
  const start = app.indexOf(`function ${name}()`);
  assert.ok(start >= 0, `${name} が無い`);
  const next = app.indexOf("\n  function ", start + 1);
  return app.slice(start, next < 0 ? undefined : next);
};
const sourceOf = (needle) => {
  const start = app.indexOf(needle), open = app.indexOf("{", start);
  assert.ok(start >= 0 && open >= start, `${needle} が無い`);
  let depth = 0;
  for (let i = open; i < app.length; i++) {
    if (app[i] === "{") depth++;
    if (app[i] === "}" && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${needle} が閉じていない`);
};

test("配置モードは下手・正面・上手を同時に表示し、照明デザイン側の切替は残す", () => {
  assert.match(html, /id="secL"/);
  assert.match(html, /id="secF"/);
  assert.match(html, /id="secR"/);
  assert.match(html, /placement-unfolded/);
  assert.match(html, /placement-unfolded #sidemode\{display:none\}/);
  assert.match(app, /const activeSections = \(\) => state\.mode === "place" \? SECS : SECS\.filter\(\(sec\) => sec !== SIDE_R\)/);
});

test("等間隔に並べるは選択済み灯体を再配置するだけで、単灯では何も作らない", () => {
  const body = functionBody("spreadSelected");
  assert.match(body, /fs\.length === 1/);
  assert.match(body, /f\.mount\.u = a \+ \(b - a\) \* i/);
  assert.doesNotMatch(body, /newFixture|duplicateSelected|mirrorSelected/);
});

test("選択は光の描画係数に入れず、バトン操作は面別に処理する", () => {
  assert.doesNotMatch(app, /state\.sel\.size\s*&&\s*!isSel/);
  assert.doesNotMatch(sourceOf("function drawBeam("), /state\.sel|isSel/);
  assert.match(app, /function hitTrussSection\(sec, pt\)/);
  assert.match(app, /dg\.kind === "trussVH"/);
  assert.match(app, /dg\.kind === "trussH"/);
});

test("バトンの既存 rig 座標は保存と読込でそのまま往復する", () => {
  assert.match(app, /rig: JSON\.parse\(JSON\.stringify\(state\.rig\)\)/);
  assert.match(app, /state\.rig = o\.rig/);
});

test("配置の一覧削除は灯体だけを選んで既存の削除処理へ渡し、通常複製UIは置かない", () => {
  assert.match(app, /className = "delete-fixture"/);
  assert.match(app, /f\.mount\.type !== "cyc"/);
  assert.match(app, /state\.sel = new Set\(\[f\.id\]\)[\s\S]*removeSelected\(\)/);
  assert.doesNotMatch(html, /id="dup"/);
  assert.doesNotMatch(app, /ev\.key === "d"/);
});

test("ソロは表示専用で、入力中を除くSキーとパネルボタンから同じ操作を行う", () => {
  assert.match(html, /id="solo"[^>]*aria-label="ソロ"/);
  assert.match(app, /const soloMuted = \(fid\) => state\.mode === "move" && state\.solo/);
  assert.match(app, /visibleLight\(f, l\)/);
  assert.match(app, /ev\.key === "s"[\s\S]*toggleSolo\(\)/);
  assert.match(app, /if \(!inMove \|\| !state\.sel\.size\) state\.solo = false/);
  assert.doesNotMatch(app.slice(app.indexOf("const snapshot"), app.indexOf("function restore")), /solo/);
});

test("レーザーカラープリセットはレーザー専用で、色以外を変更せず保存可能な灯データへ置く", () => {
  assert.match(app, /const LASER_COLOR_PRESETS = Object\.freeze/);
  assert.match(app, /レーザー機材のみを選択してください/);
  assert.match(app, /l\.laserColorPreset = preset\.id/);
  assert.match(app, /laserColorsOf\(l\)/);
  assert.match(html, /laser-color-presets/);
});

test("ライブ・コンサートの既定と公開初期値は同じ定義から転がしとレーザーを入れる", () => {
  assert.match(app, /key: "live", name: "ライブ・コンサート", count: 26/);
  assert.match(app, /const hangLaser = putHang\(b3, 0\.1, "laser", 1\)/);
  assert.match(app, /const floorLaser = putFloor\(0\.88, 0\.82, "laser", 1\)/);
  assert.match(app, /function loadLiveConcertDemo\(\)/);
  assert.match(app, /loadLiveConcertDemo\(\)/);
});

test("型の一覧は大きい図解を持つ4列基準のレスポンシブカードにする", () => {
  assert.match(presetUi, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(presetUi, /\.lpCard \.img\{width:100%;aspect-ratio:1\.35\/1/);
  assert.match(presetUi, /@media \(max-width:1180px\).*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(presetUi, /@media \(max-width:920px\).*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(presetUi, /@media \(max-width:560px\)\{\.lpGrid\{grid-template-columns:1fr/);
});
