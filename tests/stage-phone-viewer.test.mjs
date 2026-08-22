import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const style = await readFile(new URL("style.css", root), "utf8");

test("スマホ閲覧版はiPad PWAと分けて短辺600px以下のタッチ端末で起動する", () => {
  assert.match(source, /const phoneLike = navigator\.maxTouchPoints > 0[\s\S]*?Math\.min\(window\.screen\.width, window\.screen\.height\) <= 600/);
  assert.match(source, /const phoneViewerActive = standaloneStagePage && !tabletPwaActive && \(phonePreview \|\| phoneLike\)/);
  assert.match(source, /has\("phone-viewer-preview"\)/);
  assert.match(source, /classList\.toggle\("stage-phone-viewer", phoneViewerActive\)/);
});

test("スマホの操作は読込・前後シーン・情報・メモに限定する", () => {
  assert.match(source, /function initPhoneViewerWorkspace\(\)/);
  assert.match(source, /makePhoneButton\("読込", "開くショーを選ぶ"/);
  assert.match(source, /scenePrev\.addEventListener\("click", \(\) => stepScene\(-1\)\)/);
  assert.match(source, /sceneNext\.addEventListener\("click", \(\) => stepScene\(1\)\)/);
  assert.match(source, /infoToggle\.addEventListener\("click"/);
  assert.match(source, /noteToggle\.addEventListener\("click"/);
  assert.match(source, /sceneNote\.addEventListener\("input"/);
  assert.match(source, /sc\(\)\.note = sceneNote\.value\.slice\(0, 200\)/);
});

test("スマホの読込メニューからJSONと同梱サンプルを選べる", () => {
  assert.match(source, /className = "stage-phone-source"/);
  assert.match(source, /makePhoneButton\("JSONファイル", "JSONファイルからショーを開く"\)/);
  assert.match(source, /makePhoneButton\("サンプルショー", "サンプルショーを開く"\)/);
  assert.match(source, /sampleButton\.addEventListener\("click"[\s\S]*?openSampleShow\(\)/);
});

test("読み込んだJSONはスマホでは編集用比較モーダルを挟まず開く", () => {
  assert.match(source, /if \(phoneViewerActive\) \{[\s\S]*?shelveCurrent\(\);\s*if \(next\.mcpRevision === null\) reserveImportedShowId\(next\);[\s\S]*?applyLoadedState\(next, `「\$\{next\.project\.title\}」を読み込み、ショー一覧へ保存しました。`\);[\s\S]*?return;/);
});

test("縦画面は正面図と平面図を並べ、横画面は一枚を切り替える", () => {
  assert.match(source, /if \(phoneIsPortrait\(\)\) \{[\s\S]*?state\.showFront = true;[\s\S]*?state\.showPlan = true;/);
  assert.match(source, /const which = phoneUi && phoneUi\.singleView === "plan" \? "plan" : "front"/);
  assert.match(source, /viewToggle\.addEventListener\("click"[\s\S]*?enforcePhoneViews\(viewToggle\.dataset\.phoneView\)/);
  assert.match(style, /html\.stage-phone-viewer \.stage-canvas-stack \{[\s\S]*?grid-template-rows: auto auto;[\s\S]*?align-content: start/);
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?html\.stage-phone-viewer \.stage-canvas-stack \{[\s\S]*?grid-template-rows: minmax\(0, 1fr\)/);
});

test("横画面は操作を右側レールへ移し、音楽帯を引いた高さへ図を収める", () => {
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 64px/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-toolbar \{[\s\S]*?grid-column: 2;[\s\S]*?flex-direction: column/);
  assert.match(style, /justify-items: end/);
  assert.match(style, /width: min\(100%, calc\(\(100dvh - 46px\) \* 16 \/ 9\)\)/);
});

test("縦画面の操作は一段に収まり、図へ重ならない", () => {
  assert.match(style, /grid-template-rows: 48px;/);
  assert.match(style, /stage-phone-note-toggle \{ grid-row: 1; \}/);
});

test("スマホでは舞台要素を編集できず、メモ操作だけを図上へ通す", () => {
  assert.match(source, /if \(phoneViewerActive && nextTool !== "note"\) nextTool = "select"/);
  assert.match(source, /if \(phoneViewerActive && tool !== "note"\) return;/);
  assert.match(source, /if \(phoneViewerActive\) return;[\s\S]*?const piece = selectedPiece\(\)/);
  assert.match(source, /if \(tabletPwaActive \|\| phoneViewerActive\) event\.preventDefault\(\)/);
});

test("スマホ画面はスクロールせず44px操作と付箋入力シートを使う", () => {
  assert.match(style, /html\.stage-phone-viewer body \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-button \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-board-frame\.is-closed \{ display: none; \}/);
  assert.match(style, /html\.stage-phone-viewer \.stage-note-editor \{[\s\S]*?position: fixed;[\s\S]*?bottom:/);
});

test("スマホ閲覧版では編集チュートリアルを自動起動しない", () => {
  assert.match(source, /function stageTourContextActive\(\) \{[\s\S]*?if \(phoneViewerActive\) return false;/);
});
