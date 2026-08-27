import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const style = await readFile(new URL("../style.css", import.meta.url), "utf8");

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} が必要です`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${name} の終端が見つかりません`);
}

function runCanvasSize(phoneViewerActive, portrait, initialHeight) {
  const applySource = functionSource("applyCanvasSize");
  return new Function("phoneViewerActive", "portrait", "initialHeight", `
    const phoneOrientation = { matches: portrait };
    const BASE_H = 720;
    let H = initialHeight;
    const canvas = { height: initialHeight };
    const planCanvas = { height: initialHeight };
    const paintCanvas = { height: initialHeight };
    const intentMaskCanvas = { height: initialHeight };
    ${applySource}
    const changed = applyCanvasSize();
    return { changed, H, canvas, planCanvas, paintCanvas, intentMaskCanvas };
  `)(phoneViewerActive, portrait, initialHeight);
}

test("applyCanvasSizeはスマホ閲覧機の縦向きだけ960を選ぶ", () => {
  assert.equal(runCanvasSize(true, true, 720).H, 960);
  assert.equal(runCanvasSize(true, false, 960).H, 720);
  assert.equal(runCanvasSize(false, true, 960).H, 720);
  assert.equal(runCanvasSize(false, false, 960).H, 720);
});

test("applyCanvasSizeは4枚のcanvasを同じ高さへ張り替える", () => {
  const result = runCanvasSize(true, true, 720);
  assert.equal(result.changed, true);
  for (const name of ["canvas", "planCanvas", "paintCanvas", "intentMaskCanvas"]) {
    assert.equal(result[name].height, 960, `${name}.height`);
  }
});

test("初回のcanvas寸法更新は最初の描画より前に行う", () => {
  const initialApply = source.indexOf("\n  applyCanvasSize();");
  const initialRender = source.indexOf("\n  render();");
  assert.ok(initialApply >= 0, "初回のapplyCanvasSize呼び出しが必要です");
  assert.ok(initialRender > initialApply, "初回の寸法更新は最初の描画より前です");
});

test("スマホ向き変更はcanvas寸法をrenderより先に更新する", () => {
  const phoneStart = source.indexOf("function initPhoneViewerWorkspace()");
  const phoneEnd = source.indexOf("/* ---------- iPad PWA専用ワークスペース", phoneStart);
  assert.ok(phoneStart >= 0 && phoneEnd > phoneStart, "スマホworkspaceの範囲が必要です");
  const phoneSource = source.slice(phoneStart, phoneEnd);
  const orientStart = phoneSource.indexOf("const orient = () => {");
  const orientEnd = phoneSource.indexOf("};", orientStart);
  const orient = phoneSource.slice(orientStart, orientEnd);
  assert.ok(orient.indexOf("applyCanvasSize();") >= 0, "向き変更で寸法を更新する");
  assert.ok(orient.indexOf("applyCanvasSize();") < orient.indexOf("render();"),
    "寸法更新は描画より前");
});

test("正面図は720基準の席Y値だけをkで換算する", () => {
  assert.match(source, /const BASE_H = 720;/);
  const layout = functionSource("layout");
  assert.match(layout, /const k = H \/ BASE_H;/);
  assert.match(layout, /const floorY = seat\.floorY \* k;/);
  const afterFloorConversion = layout.slice(layout.indexOf("const floorY ="));
  assert.doesNotMatch(afterFloorConversion.replace("seat.floorY * k", ""), /seat\.floorY/);
  assert.doesNotMatch(layout,
    /(?:seat\.(?:backW|frontW|shift|rise|tilt)\s*\*\s*k|k\s*\*\s*seat\.(?:backW|frontW|shift|rise|tilt))/);
});

test("縦向きスマホのCSSだけcanvasを4:3にする", () => {
  assert.match(style,
    /@media \(orientation: portrait\) \{[\s\S]*?html\.stage-phone-viewer #stage-canvas,[\s\S]*?html\.stage-phone-viewer #stage-plan-canvas \{ aspect-ratio: 4 \/ 3; \}/);
  assert.match(style,
    /@media \(orientation: portrait\) \{[\s\S]*?html\.stage-phone-viewer \.stage-canvas-wrap,[\s\S]*?aspect-ratio: 4 \/ 3;/,
    "二段レイアウトを測るラッパーも4:3にする");
  assert.match(style,
    /#stage-canvas,[\s\S]*?#stage-plan-canvas \{[\s\S]*?aspect-ratio: 16 \/ 9;/);
});

test("付箋の描画と当たり判定は同じ縦座標換算を使う", () => {
  const drawNotes = functionSource("drawNotes");
  const noteAt = functionSource("noteAt");
  assert.match(drawNotes, /noteScreenXY\(note, L\)/);
  assert.match(noteAt, /noteScreenXY\(notes\[i\], L\)/);
  assert.match(functionSource("noteScreenXY"), /note\.y \* \(H \/ BASE_H\)/);
  assert.match(source, /const noteBaseY = \(screenY\) => screenY \/ \(H \/ BASE_H\);/);
});

/* 向きの通知（matchMediaのchange）が来ない環境が実在する（2026-08-27にブラウザ検証で確認）。
   来ないと枠の内部寸法が4:3のまま、CSSだけ16:9へ戻って絵が歪む。
   resizeを保険にするが、携帯のキーボード開閉でも飛ぶので、
   寸法が実際に変わったときだけ描き直すこと（orientを直に繋がない）。 */
test("向きの通知が来なくてもresizeで寸法を直す保険がある", () => {
  const hook = source.slice(source.indexOf('window.addEventListener("resize"'));
  assert.ok(hook.startsWith('window.addEventListener("resize"'), "resizeの保険が要る");
  const body = hook.slice(0, hook.indexOf("});") + 3);
  assert.match(body, /if \(!applyCanvasSize\(\)\) return;/,
    "寸法が変わらないときは何もしないこと（キーボード開閉で走るため）");
  assert.match(body, /applyLayout\(\);[\s\S]*?render\(\);/);
  assert.doesNotMatch(body, /closeNoteEditor\(\)/,
    "orientを直に繋ぐと入力中に付箋の編集が閉じる");
});
