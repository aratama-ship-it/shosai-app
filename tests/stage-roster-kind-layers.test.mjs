import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("stage.html", root), "utf8");
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const css = await readFile(new URL("style.css", root), "utf8");

test("出るものパネルは演者・大道具・小道具の3つを最初に横並びで選ぶ", () => {
  const panel = html.match(/data-panel="cast"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(panel, /class="stage-roster-kind-openers" role="group"/);
  for (const [layer, label] of [
    ["performer", "演者"],
    ["set", "大道具"],
    ["prop", "小道具"],
  ]) {
    assert.match(panel, new RegExp(`data-roster-kind-layer="${layer}"[\\s\\S]*?aria-haspopup="dialog"[\\s\\S]*?>${label}<`));
  }
  assert.match(css, /\.stage-roster-kind-openers \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.stage-roster-kind-open \{[\s\S]*?min-height: 36px;/);
});

test("出るものの一覧は大道具と小道具を別見出し・別一覧として示す", () => {
  const panel = html.match(/data-panel="cast"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(panel, /この舞台に出る演者、大道具、小道具を、まとめてここに登録します。/);
  assert.match(panel, /id="stage-group-sets"[\s\S]*?<span>大道具<\/span>[\s\S]*?id="stage-set-list"[\s\S]*?aria-label="大道具の一覧の高さ"/);
  assert.match(panel, /id="stage-group-props"[\s\S]*?<p class="stage-roster-head">小道具<\/p>[\s\S]*?id="stage-prop-list"[\s\S]*?aria-label="小道具の一覧の高さ"/);
});

test("登録窓で名前・色と、分類に応じた姿勢・大道具種類・小道具の形を選べる", () => {
  const modal = html.match(/id="stage-kind"[\s\S]*?id="stage-pose-backdrop"/)?.[0] || "";
  assert.match(modal, /class="stage-kind-compact-row"[\s\S]*?id="stage-roster-name"[\s\S]*?placeholder="名前を入れて追加"[\s\S]*?for="stage-roster-color">色<[\s\S]*?id="stage-roster-color" type="color"[\s\S]*?id="stage-roster-search"[\s\S]*?type="search"[\s\S]*?placeholder="検索"/);
  assert.match(modal, /id="stage-kind-performer-fields"[\s\S]*?id="stage-roster-pose-grid"/);
  assert.match(modal, /id="stage-kind-set-fields" hidden[\s\S]*?id="stage-kind-grid"/);
  assert.match(modal, /id="stage-kind-prop-fields" hidden[\s\S]*?id="stage-roster-prop-grid"/);
  assert.match(modal, /id="stage-kind-model-open" class="btn-quiet" hidden>セットを組む</);
  assert.match(modal, /id="stage-roster-add"[\s\S]*?>追加</);
  assert.match(css, /\.stage-kind-submit \.btn-quiet \{[\s\S]*?min-width: 200px;[\s\S]*?min-height: 56px;[\s\S]*?border: 3px solid var\(--paper\);[\s\S]*?font-size: 16px;/);
  assert.match(css, /\.stage-modal#stage-kind \{[\s\S]*?width: min\(1240px, calc\(100vw - 24px\)\);[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.stage-kind-submit \{[\s\S]*?position: sticky;[\s\S]*?bottom: 0;[\s\S]*?background: var\(--desk-2\);/);
  assert.match(css, /\.stage-kind-submit \{[\s\S]*?justify-content: space-between;/);
  assert.match(css, /#stage-kind \.stage-pose-grid \{[\s\S]*?grid-template-columns: repeat\(8, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.stage-kind-compact-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 56px minmax\(0, 1fr\);[\s\S]*?gap: 10px;/);
  assert.match(css, /\.stage-kind-compact-field \{[\s\S]*?gap: 4px;[\s\S]*?min-width: 0;/);
  assert.match(css, /\.stage-kind-color-field > input\[type="color"\] \{[\s\S]*?width: 46px;[\s\S]*?height: 28px;/);
});

test("セットを組む入口は一覧では隠し、大道具モーダルの左下から同じビルダーを開く", () => {
  const roster = html.match(/id="stage-group-sets"[\s\S]*?id="stage-group-props"/)?.[0] || "";
  assert.match(roster, /id="stage-model-open" class="btn-quiet" hidden>セットを組む</);
  assert.match(source, /kindModelOpen: document\.getElementById\("stage-kind-model-open"\)/);
  const layer = source.match(/function renderRosterKindLayer\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(layer, /els\.kindModelOpen\.hidden = rosterKindLayer !== "set"/);
  assert.match(source, /const openSetBuilder = \(\) => \{[\s\S]*?builder\.open\(\)/);
  assert.match(source, /els\.kindModelOpen\.addEventListener\("click", openSetBuilder\)/);
});

test("既存の登録種類を演者・小道具・それ以外の大道具へ分ける", () => {
  assert.match(source, /performer: Object\.freeze\(\["performer"\]\)/);
  assert.match(source, /const ROSTER_PROP_KINDS = new Set\(\["prop", "diabolo"\]\)/);
  assert.match(source, /set: Object\.freeze\(SET_KIND_ORDER\.filter\(\(kind\) => !ROSTER_PROP_KINDS\.has\(kind\)\)\)/);
  assert.match(source, /prop: Object\.freeze\(\["prop", "diabolo"\]\)/);
  assert.match(source, /ROSTER_KIND_LAYERS\.set\.forEach\(\(kind\) =>/);
});

test("3分類の候補は名前で即時検索でき、小道具の空分類も隠す", () => {
  const search = source.match(/function applyRosterSearch\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(source, /function rosterSearchKey\(value\)[\s\S]*?normalize\("NFKC"\)[\s\S]*?toLocaleLowerCase\(\)/);
  assert.match(search, /split\(\/\\s\+\/\)\.filter\(Boolean\)/);
  assert.match(search, /tile\.hidden = !words\.every\(\(word\) => haystack\.includes\(word\)\)/);
  assert.match(search, /stage-prop-choice-group[\s\S]*?section\.hidden = !section\.querySelector/);
  assert.match(source, /tile\.dataset\.rosterSearch = `\$\{label\.textContent\}/);
  assert.match(source, /els\.rosterSearch\.addEventListener\("input", applyRosterSearch\)/);
  assert.match(source, /if \(els\.rosterSearch\) els\.rosterSearch\.value = "";[\s\S]*?renderRosterKindLayer\(\)/);
});

test("演者を開くたびに立つ姿勢を初期選択し、姿勢タイルのダブルクリックで登録できる", () => {
  const open = source.match(/function openKindModal\(layer\) \{[\s\S]*?\n  \}/)?.[0] || "";
  const render = source.match(/function renderRosterPoseChoices\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(open, /if \(layer === "performer"\)[\s\S]*?rosterPose = "stand"/);
  assert.match(render, /POSES\.forEach\(\(pose\) =>/);
  assert.match(render, /aria-pressed/);
  assert.match(render, /rosterPose = pose\.id/);
  assert.match(render, /addEventListener\("dblclick"[\s\S]*?addFromRoster\(\)/);
  assert.match(source, /function addCastMember\(nameInput, poseId = "stand", pieceColor\)[\s\S]*?autoName\(pieceTypeName\("performer"\)\)/);
});

test("大道具は1回クリックで選び、ダブルクリックまたは追加ボタンで登録する", () => {
  const render = source.match(/function renderRosterSetChoices\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  const add = source.match(/const addFromRoster = \(\) => \{[\s\S]*?\n  \};/)?.[0] || "";
  assert.match(render, /rosterKind = kind/);
  assert.match(render, /addEventListener\("dblclick"[\s\S]*?addFromRoster\(\)/);
  assert.match(add, /added = addSetItem/);
  assert.match(add, /if \(added\) closeKindModal\(\)/);
});

test("小道具は既存分類ごとの絵付きグリッドで選び、ダブルクリックでも登録できる", () => {
  const render = source.match(/function renderRosterPropChoices\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(render, /propShapeGroups\(rosterPropShape\)\.forEach\(\(group\) =>/);
  assert.match(render, /className = "stage-pose-grid stage-prop-choice-grid"/);
  assert.match(render, /canvas\.width = 132/);
  assert.match(render, /drawKindPreview\(canvas, "prop", "#8b98a1", shapeId\)/);
  assert.match(render, /rosterPropShape = shapeId/);
  assert.match(render, /addEventListener\("dblclick"[\s\S]*?addFromRoster\(\)/);
  assert.match(source, /added = addSetItem\([\s\S]*?rosterPropShape, rosterSelectedColor\(\)\);/);
});

test("ディアボロは専用タイプを保ったまま小道具の手に持つものへ分類する", () => {
  assert.match(source, /const ROSTER_PROP_SPECIAL_KINDS = Object\.freeze\(\[[\s\S]*?group: "手に持つもの", kind: "diabolo"/);
  const render = source.match(/function renderRosterPropChoices\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(render, /ROSTER_PROP_SPECIAL_KINDS\.filter/);
  assert.match(render, /drawKindPreview\(canvas, choice\.kind, "#8b98a1"\)/);
  assert.match(render, /rosterKind = choice\.kind/);
  assert.match(source, /if \(kind === "diabolo"\) \{[\s\S]*?二つのカップと軸/);
  const lists = source.match(/function renderSets\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(lists, /!ROSTER_PROP_KINDS\.has\(item\.kind\)/);
  assert.match(lists, /ROSTER_PROP_KINDS\.has\(item\.kind\)/);
});

test("演者の登録時に選んだ姿勢を新しい舞台上の駒へ保存する", () => {
  assert.match(source, /function addCastMember\(nameInput, poseId = "stand", pieceColor\)/);
  assert.match(source, /placeCastPiece\(member, poseId\)/);
  assert.match(source, /function placeCastPiece\(member, poseId = "stand"\)[\s\S]*?pose: poseById\(poseId\)\.id/);
  assert.match(source, /added = addCastMember\(els\.rosterName, rosterPose, rosterSelectedColor\(\)\)/);
});

test("演者・大道具・小道具は名前の隣で選んだ色を登録データへ保存する", () => {
  assert.match(source, /rosterColor: document\.getElementById\("stage-roster-color"\)/);
  assert.match(source, /function rosterDefaultColor\(\)[\s\S]*?nextPieceColor\(state\.project\.cast\.length\)[\s\S]*?defaultSetColor\(rosterKind, rosterPropShape\)/);
  assert.match(source, /function addCastMember\(nameInput, poseId = "stand", pieceColor\)[\s\S]*?color: validColor\(pieceColor, nextPieceColor\(state\.project\.cast\.length\)\)/);
  assert.match(source, /function addSetItem\(kind, nameInput, lightKind, modelId, propShape, pieceColor\)[\s\S]*?color: validColor\(pieceColor, defaultSetColor\(kind, shape\)\)/);
  assert.match(source, /added = addSetItem\("light"[\s\S]*?rosterSelectedColor\(\)\)/);
  assert.match(source, /rosterPropShape, rosterSelectedColor\(\)\)/);
  assert.match(source, /rosterColorTouched = false;[\s\S]*?syncRosterColorDefault\(\)/);
  assert.match(source, /els\.rosterColor\.addEventListener\("input", \(\) => \{ rosterColorTouched = true; \}\)/);
});

test("PWAキャッシュは現在の分類UI資産と揃う", async () => {
  const sw = await readFile(new URL("stage-sw.js", root), "utf8");
  for (const reference of [
    "style.css?v=380",
    "stage-i18n.js?v=181",
    "stage-i18n.zh-Hans.js?v=70",
    "stage-i18n.zh-Hant.js?v=70",
    "stage-sketch.js?v=491",
  ]) {
    assert.ok(html.includes(reference), `${reference} が正本にある`);
    assert.ok(sw.includes(`./${reference}`), `${reference} がPWAキャッシュにある`);
  }
  assert.match(sw, /stage-sketch-pwa-v506/);
});
