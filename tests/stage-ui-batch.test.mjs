import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

function between(value, start, end) {
  const from = value.indexOf(start);
  const to = value.indexOf(end, from + start.length);
  return from >= 0 && to >= 0 ? value.slice(from, to) : "";
}

test("シーン説明の帯が作図道具より上にあり、3Dは上部のモード列だけに置く", () => {
  assert.ok(html.indexOf('id="stage-scene-bar"') < html.indexOf('class="stage-center-bar"'));
  assert.match(html, /class="stage-workspace-tab" id="stage-freecam-open"[\s\S]*?>3Dモード<\/button>/);
  const centre = between(html, '<div class="stage-center-bar">', '<div class="stage-canvas-stack"');
  assert.doesNotMatch(centre, /id="stage-freecam-open"/);
  assert.doesNotMatch(html, /id="stage-tool-help"/);
});

test("シーンの欄は内容に合わせ、画面高の3分の2を上限にする", () => {
  assert.match(source, /sceneListHeightMode: "auto",\s*sceneListHeight: null,/);
  assert.match(source, /sceneListHeightMode: raw\.sceneListHeightMode === "manual" \? "manual" : "auto"/);
  assert.match(source, /if \(state\.sceneListHeightMode === "manual" && state\.sceneListHeight\)[\s\S]*?style\.removeProperty\("height"\)/);
  assert.match(source, /window\.innerHeight \* 2 \/ 3/);
  assert.match(source, /state\.sceneListHeightMode = "manual";/);
  assert.match(css, /\.stage-col \.stage-scene-list \{[\s\S]*?height: auto;[\s\S]*?min-height: 0;[\s\S]*?max-height: 66\.667vh;[\s\S]*?max-height: 66\.667dvh;/);
});

test("次のシーンから動線を引く操作は平面図の動線ボタンの隣で既存処理につながる", () => {
  const planTools = between(html, 'id="stage-plan-route"', 'id="stage-arrange-select"');
  assert.match(planTools, /id="stage-plan-derive-route"/);
  assert.match(html, /class="stage-canvas-tool stage-route-action"[\s\S]*?id="stage-plan-route"[\s\S]*?<svg[\s\S]*?動線を描く/);
  assert.match(planTools, /stage-derive-route-action[\s\S]*?data-tool-tip="deriveRoute"[\s\S]*?<svg[\s\S]*?次から引く/);
  assert.match(source, /els\.planDeriveRoute\.addEventListener\("click", \(\) => deriveRoutes\(sc\(\)\)\)/);
  assert.match(source, /els\.planDeriveRoute\.disabled = !next/);
  assert.match(source, /deriveRoute: "次のシーンで動いているものに、いまの位置から行き先までの動線を引きます。"/);
  assert.match(css, /\.stage-canvas-tool-icon\s*\{[^}]*display:\s*none;[^}]*width:\s*16px;[^}]*height:\s*16px;/s);
  assert.match(css, /@container stage-board \(max-width: 520px\)[\s\S]*?\.stage-canvas-tools\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.stage-canvas-tools \.stage-route-action \.stage-canvas-tool-label,[\s\S]*?display:\s*none;/);
  assert.match(css, /\.stage-board-frame\s*\{[^}]*container-type:\s*inline-size;[^}]*container-name:\s*stage-board;/s);
});

test("転換アニメーションと時間の設定は環境設定にある", () => {
  const prefs = between(html, 'id="stage-prefs-modal"', 'id="stage-prefs-list"');
  const centre = between(html, '<div class="stage-center-bar">', '<div class="stage-canvas-stack"');
  assert.match(prefs, /id="stage-anim-scenes" checked/);
  assert.match(prefs, /<span>転換アニメーション<\/span>/);
  assert.match(prefs, /id="stage-anim-ms" min="0\.2" max="3" step="0\.05"/);
  assert.match(prefs, /転換時間/);
  assert.match(prefs, /ショーに保存されます/);
  assert.doesNotMatch(centre, /stage-anim-scenes|stage-anim-ms/);
  assert.match(css, /\.stage-pref-row\.stage-transition-animation-pref \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(source, /state\.animateScenes = e\.target\.checked/);
});

test("正面図と平面図の説明ラベルを図の上へ重ねない", () => {
  assert.doesNotMatch(html, /stage-depth-(back|front)[^>]*>奥・背景|stage-depth-(back|front)[^>]*>手前・客席側/);
  assert.doesNotMatch(source, /label\(target,\s*"舞台の立ち上がり"/);
  assert.doesNotMatch(source, /function sightLabel/);
});

test("シーン名横の四つの常設アイコンは一つの補助メニューへ収納する", () => {
  assert.doesNotMatch(source, /className = "stage-scene-(?:outdent|indent|pen|wrap)"/);
  assert.match(source, /more\.className = "stage-scene-more"/);
  assert.match(source, /button\.addEventListener\("dblclick",[\s\S]*openRename\(scene\)/);
  assert.match(css, /\.stage-scene-head \{[\s\S]*grid-template-columns: 16px minmax\(0, 1fr\) auto;/);
});

test("セクション操作は上部と詳細モーダルへ整理する", () => {
  const sceneMove = between(html, 'class="stage-scene-move"', 'class="stage-scene-list"');
  assert.doesNotMatch(sceneMove, /stage-scene-fold-all|畳む/);
  assert.doesNotMatch(source, /sceneFoldAll|stage-scene-fold-all/);
  assert.match(sceneMove, /id="stage-scene-grid-open"[^>]*data-tool-tip="sceneGrid"[^>]*aria-label="シーン一覧を開く"[\s\S]*?<svg/);
  assert.match(sceneMove, /id="stage-scene-section"[^>]*data-tool-tip="sceneSection"[^>]*aria-label="新規セクション"[\s\S]*?<svg/);
  assert.match(sceneMove, /id="stage-scene-add"[^>]*data-tool-tip="sceneAdd"[^>]*aria-label="新規シーン"[\s\S]*?<svg/);
  assert.match(css, /\.stage-scene-move \{[^}]*display:\s*flex;[^}]*gap:\s*4px;/s);
  assert.match(css, /\.stage-panel \.stage-scene-move button\.stage-scene-action-icon \{[^}]*width:\s*34px;[^}]*min-height:\s*34px;/s);
  assert.match(css, /\.stage-scene-action-icon svg \{[^}]*width:\s*17px;[^}]*height:\s*17px;/s);
  for (const hint of ["sceneGrid", "sceneSection", "sceneAdd"]) assert.match(source, new RegExp(`${hint}:`));
  assert.doesNotMatch(css, /#stage-scene-(?:section|add)\s*\{[^}]*grid-row:\s*2/);
  assert.doesNotMatch(css, /\.stage-scene-grid-open\s*\{\s*grid-column:\s*1 \/ -1;/);
  for (const removedId of ["stage-scene-add-rig", "stage-scene-dup", "stage-scene-del"]) {
    assert.doesNotMatch(html, new RegExp(`id="${removedId}"`));
  }
  assert.doesNotMatch(html, /id="stage-clear"/);
  assert.doesNotMatch(html, /id="stage-scene-edit-actions"/);
  assert.match(html, /id="stage-rename-delete" hidden>このセクションを削除<\/button>/);
  assert.match(html, /id="stage-rename-input"[\s\S]*id="stage-rename-section-fields" hidden[\s\S]*id="stage-rename-section-note"[^>]*maxlength="2000"/);
  assert.match(source, /if \(isCursor && !wrapPickStartId && scene\.kind === "scene"\)/);
  assert.match(source, /if \(els\.renameDelete\) els\.renameDelete\.hidden = scene\.kind !== "section"/);
  assert.match(source, /const sceneLoss = \(cur\.kind === "scene" \? 1 : 0\) \+ kidScenes/);
  assert.match(css, /\.stage-rename-swatch \{[^}]*width:\s*44px;[^}]*min-width:\s*44px;[^}]*height:\s*44px;[^}]*min-height:\s*44px;/s);
  assert.match(html, /id="stage-rename-color-picker"[\s\S]*<summary[^>]*id="stage-rename-color-summary"[\s\S]*>色を選ぶ</);
  assert.match(html, /id="stage-rename-ok">保存する<\/button>/);
  assert.match(css, /\.stage-rename-colors \{[^}]*margin-top:\s*16px;[^}]*padding-top:\s*12px;[^}]*border-top:\s*1px solid var\(--line-dark\);/s);
  assert.match(css, /\.stage-rename-color-summary \{[^}]*grid-template-columns:\s*22px minmax\(0, 1fr\) auto 12px;[^}]*min-height:\s*44px;/s);
  assert.match(css, /\.stage-rename-swatches \{[^}]*grid-template-columns:\s*repeat\(4, 44px\);[^}]*gap:\s*8px;/s);
  assert.match(source, /renameColorPicker\.open = false/);
  assert.match(source, /updateRenameColorSummary\(renameTarget\)/);
  assert.match(source, /scene\.kind === "section" \? "保存する" : "変更を保存"/);
  assert.match(source, /renameSectionFields\.hidden = scene\.kind !== "section"/);
  assert.match(source, /renameSectionNote\.value = scene\.kind === "section"[\s\S]*String\(scene\.note \|\| ""\)\.slice\(0, 2000\)/);
  assert.match(source, /sectionNoteChanged = renameTarget\.kind === "section"[\s\S]*if \(titleChanged \|\| beatChanged \|\| sectionNoteChanged \|\| sceneNoteChanged\)[\s\S]*if \(sectionNoteChanged\) renameTarget\.note = nextSectionNote/);
  assert.match(source, /renameSectionNote\.addEventListener\("keydown"[\s\S]*e\.metaKey \|\| e\.ctrlKey/);
  assert.match(css, /\.stage-rename-section-fields \{[^}]*margin-top:\s*12px;/s);
  assert.match(css, /\.stage-rename-modal \.stage-rename-section-fields textarea\.stage-text-input \{ min-height:\s*84px; \}/);
  assert.match(css, /\.stage-rename-modal #stage-rename-ok,[\s\S]*\.stage-rename-modal #stage-rename-delete \{[^}]*width:\s*100%;[^}]*min-height:\s*44px;[^}]*margin-top:\s*8px;/s);
  assert.match(css, /\.stage-modal \.stage-rename-delete \{[^}]*border-color:\s*var\(--danger\);[^}]*color:\s*var\(--danger\);/s);
  assert.match(css, /\.stage-scene-chip\.is-section \{[^}]*min-height:\s*56px;[^}]*background:/s);
  assert.match(css, /\.stage-scene-chip \{[^}]*min-height:\s*40px;/s);
});

test("開いたシーンの説明は初期表示から全文が見える高さへ伸びる", () => {
  assert.match(source, /note\.className = "stage-text-input stage-scene-note"/);
  assert.match(source, /const growNote = \(preserveCurrent = false\) => \{[\s\S]*currentHeight[\s\S]*note\.scrollHeight \+ borderHeight[\s\S]*Math\.max\(46, currentHeight, contentHeight\)/);
  assert.match(source, /note\.addEventListener\("input", \(\) => \{[\s\S]*growNote\(true\)/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{[\s\S]*growNote\(false\);[\s\S]*requestAnimationFrame\(\(\) => growNote\(false\)\)/);
  assert.match(css, /\.stage-scene-body textarea\.stage-scene-note \{[^}]*overflow-y:\s*auto;[^}]*resize:\s*vertical;/s);
});

test("転換の長さ・暗転・メモは選択中シーンの上下にあるシーン間の枠で編集する", () => {
  assert.match(source, /\{ key: "sceneTransitions", label: "転換情報", def: false,/);
  assert.match(source, /const makeSceneTransitionFrame = \(fromScene, toScene, position\) => \{/);
  assert.match(source, /toScene\.cueSeconds = normalizeCueSeconds\(cueInput\.value\)/);
  assert.match(source, /darkBox\.checked = Boolean\(toScene\.blackout\)/);
  assert.match(source, /toScene\.blackout = darkBox\.checked/);
  assert.match(source, /transitionNote: kind === "scene" && typeof raw\.transitionNote === "string"[\s\S]*raw\.transitionNote\.slice\(0, 1000\)/);
  assert.match(source, /noteInput\.maxLength = 1000/);
  assert.match(source, /noteInput\.value = toScene\.transitionNote \|\| ""/);
  assert.match(source, /toScene\.transitionNote = noteInput\.value\.slice\(0, 1000\)/);
  assert.match(source, /cueInput\.placeholder = "—"/);
  assert.match(source, /sharedHint\.textContent = `\$\{tx\("空欄は設定の転換時間"\)\} \$\{\(state\.sceneAnimMs \/ 1000\)\.toFixed\(1\)\}\$\{tx\("秒"\)\}`/);
  assert.match(source, /const growTransitionNote = \(preserveCurrent = false\) => \{[\s\S]*noteInput\.scrollHeight \+ borderHeight[\s\S]*Math\.max\(46, currentHeight, contentHeight\)/);
  assert.match(source, /const makeSceneTransitionPoint = \(fromScene, toScene\) => \{/);
  assert.match(source, /point\.setAttribute\("aria-expanded", String\(expanded\)\)/);
  assert.match(source, /expandedSceneTransitionToId === toScene\.id \|\| expandedBySetting/);
  assert.match(source, /if \(next\) els\.sceneList\.append\(makeSceneTransitionPoint\(scene, next\)\)/);
  assert.match(source, /boundary\.append\(makeSceneTransitionFrame\(fromScene, toScene, "between"\)\)/);
  assert.doesNotMatch(source, /delete (?:scene|toScene)\.(?:cueSeconds|blackout|transitionNote)/);
  assert.match(source, /\(position === "outgoing" \|\| position === "between"\) && featureOn\("sceneTiming"\)[\s\S]*makeRehearsalTimeInput\([\s\S]*fromScene,[\s\S]*"transitionToNextSeconds"/);
  assert.match(source, /timing\.append\(makeRehearsalTimeInput\(scene, "見せる時間", "holdDurationSeconds"\)\)/);
  assert.match(css, /\.stage-scene-row\.is-open \{[^}]*background:\s*rgba\(168, 75, 38, 0\.11\);/s);
  assert.match(css, /\.stage-scene-row\.is-open \.stage-scene-chip \{[^}]*background:\s*rgba\(168, 75, 38, 0\.16\);/s);
  assert.match(css, /\.stage-scene-transition \{[^}]*border-left:\s*2px solid var\(--brass\);[^}]*background:\s*rgba\(211, 172, 89, 0\.065\);/s);
  assert.match(css, /\.stage-scene-transition-controls \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s);
  assert.match(css, /\.stage-scene-transition \{[^}]*gap:\s*4px;[^}]*padding:\s*6px 7px 7px 16px;/s);
  assert.match(css, /\.stage-scene-transition-controls input\[type="number"\] \{[^}]*width:\s*64px;[^}]*min-height:\s*38px;/s);
  assert.match(css, /\.stage-scene-transition-note textarea \{[^}]*width:\s*100%;[^}]*min-height:\s*46px;[^}]*resize:\s*vertical;/s);
  assert.match(css, /\.stage-scene-transition-point \{[^}]*min-height:\s*30px;[^}]*border:\s*1px solid rgba\(211, 172, 89, 0\.32\);[^}]*background:\s*rgba\(211, 172, 89, 0\.065\);/s);
  assert.match(css, /\.stage-scene-transition-point-axis::after \{[^}]*width:\s*7px;[^}]*height:\s*7px;[^}]*transform:\s*translateY\(-50%\) rotate\(45deg\);/s);
});

test("背景の常設アイコンを外し、描画・文字・写真を背景モーダルへ集約する", () => {
  const centreBar = between(html, 'class="stage-center-bar"', 'class="stage-work-area"');
  const backgroundModal = between(html, 'id="stage-bg-modal"', '</aside>');
  assert.doesNotMatch(centreBar, /data-stage-tool="(?:paint|erase)"/);
  assert.match(backgroundModal, /data-stage-tool="paint"/);
  assert.match(backgroundModal, /data-stage-tool="erase"/);
  assert.match(backgroundModal, /id="stage-screentext-block"/);
  assert.match(backgroundModal, /id="stage-photo-block"/);
  assert.match(source, /function openBackgroundModal\(\)/);
  assert.match(source, /function closeBackgroundModal\(\)/);
  assert.match(css, /\.stage-modal\.stage-background-modal \{ width: min\(760px,/);
  assert.match(css, /\.stage-background-controls \{[\s\S]*grid-template-columns: repeat\(2,/);
});

test("保存パネルはPCとiPadの操作一覧から非表示にする", () => {
  assert.match(html, /<section class="stage-panel stage-save-note" data-panel="save" data-title="保存" hidden aria-hidden="true">/);
  assert.match(html, /id="stage-save-status"/);
  assert.match(html, /id="stage-rehearsal-export-open"/);
  assert.match(source, /label: "共有・設定", panels: \["session"\], special: "display"/);
  assert.doesNotMatch(source, /panels: \[[^\]]*"save"[^\]]*\]/);
});
