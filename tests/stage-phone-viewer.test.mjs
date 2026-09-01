import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const style = await readFile(new URL("style.css", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");
const indexHtml = await readFile(new URL("index.html", root), "utf8");

const modelContext = { window: {}, document: { getElementById: () => null } };
vm.runInNewContext(source, modelContext, { filename: "stage-sketch.js" });
const phoneModel = modelContext.window.SHOSAI_STAGE_PHONE_VIEWER_MODEL;
const i18nContext = { window: {} };
vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
const translations = i18nContext.window.SHOSAI_I18N.text;

test("スマホ閲覧版はiPad PWAと分けて短辺600px以下のタッチ端末で起動する", () => {
  assert.match(source, /const phoneLike = navigator\.maxTouchPoints > 0[\s\S]*?Math\.min\(window\.screen\.width, window\.screen\.height\) <= 600/);
  assert.match(source, /const phoneViewerActive = standaloneStagePage && !tabletPwaActive && \(phonePreview \|\| phoneLike\)/);
  assert.match(source, /has\("phone-viewer-preview"\)/);
  assert.match(source, /classList\.toggle\("stage-phone-viewer", phoneViewerActive\)/);
});

test("初回言語は外部指定、保存値、端末言語の順で決まり、明示保存したjaを守る", () => {
  const none = { getItem: () => null };
  const savedJa = { getItem: () => "ja" };
  const savedEn = { getItem: () => "en" };
  assert.equal(phoneModel.resolveInitialLanguage("", none, { language: "ja-JP" }), "ja");
  assert.equal(phoneModel.resolveInitialLanguage("", none, { language: "en-US" }), "en");
  assert.equal(phoneModel.resolveInitialLanguage("", none, { languages: ["ja"] }), "ja");
  assert.equal(phoneModel.resolveInitialLanguage("", savedJa, { language: "en-US" }), "ja");
  assert.equal(phoneModel.resolveInitialLanguage("", savedEn, { language: "ja-JP" }), "en");
  assert.equal(phoneModel.resolveInitialLanguage("en", savedJa, { language: "ja-JP" }), "en");
});

test("端末言語を読めなくても日本語で起動する", () => {
  const navigatorLike = {};
  Object.defineProperty(navigatorLike, "language", { get() { throw new Error("blocked"); } });
  assert.equal(phoneModel.resolveInitialLanguage("", { getItem: () => null }, navigatorLike), "ja");
  assert.match(source, /lang = resolveInitialStageLanguage\(openLang, localStorage, navigator\);/);
});

test("スマホの操作はショー・前後シーン・情報に限定する", () => {
  assert.match(source, /function initPhoneViewerWorkspace\(\)/);
  /* ★入口は「読込」ではなく「ショー」。中に書き出しも入っているため、
     読み込み専用の名前だと書き出しに辿り着けない（2026-08-26 本人が実機で発見）。
     名前を「読込」へ戻すなら、書き出しの置き場所も一緒に考え直すこと。 */
  assert.match(source, /makePhoneButton\(tx\("ショー"\), tx\("ショーを開く・書き出す"\)/);
  assert.ok(!/makePhoneButton\("読込"/.test(source), "「読込」へ戻っていないこと");
  assert.match(source, /scenePrev\.addEventListener\("click", \(\) => stepScene\(-1\)\)/);
  assert.match(source, /sceneNext\.addEventListener\("click", \(\) => stepScene\(1\)\)/);
  assert.match(source, /infoToggle\.addEventListener\("click"/);
  assert.ok(!/stage-phone-note-toggle/.test(source), "図上へ付箋を足す入口が残っていないこと");
  assert.match(source, /sceneNote\.addEventListener\("input"/);
  assert.match(source, /sc\(\)\.note = sceneNote\.value\.slice\(0, 200\)/);
});

test("スマホの読込メニューからJSONと同梱サンプルを選べる", () => {
  assert.match(source, /className = "stage-phone-source"/);
  assert.match(source, /makePhoneButton\(tx\("JSONファイル"\), tx\("JSONファイルからショーを開く"\)\)/);
  assert.match(source, /makePhoneButton\(tx\("サンプルショー"\), tx\("サンプルショーを開く"\)\)/);
  assert.match(source, /sampleButton\.addEventListener\("click"[\s\S]*?openSampleShow\(\)/);
});

test("スマホ閲覧機の固定文言・aria-label・placeholderはtxを通す", () => {
  const start = source.indexOf("function initPhoneViewerWorkspace()");
  const end = source.indexOf("/* ---------- iPad PWA専用ワークスペース", start);
  const initBody = source.slice(start, end);
  const japanese = "[\\u3040-\\u30ff\\u3400-\\u9fff]";
  assert.ok(!new RegExp(`makePhoneButton\\(\\s*[\"'\`]${japanese}`).test(initBody),
    "makePhoneButtonへ日本語リテラルを直接渡さない");
  assert.ok(!new RegExp(`(?:textContent|placeholder)\\s*=\\s*[\"'\`]${japanese}`).test(initBody),
    "表示文字列とplaceholderへ日本語リテラルを直接代入しない");
  assert.ok(!new RegExp(`setAttribute\\(\\s*[\"']aria-label[\"']\\s*,\\s*[\"'\`]${japanese}`).test(initBody),
    "aria-labelへ日本語リテラルを直接渡さない");
  assert.match(initBody, /sceneNote\.placeholder = tx\("このシーンのメモ"\)/);
  assert.match(initBody, /sourceTitle\.textContent = tx\("ショーを開く"\)/);
});

test("スマホ閲覧機で使う追加日本語はすべて英訳を持つ", () => {
  const expected = {
    "スマホ閲覧用の操作": "Phone viewer controls",
    "ショーを開く・書き出す": "Open or export a show",
    "情報": "Info",
    "シーン情報を表示する": "Show scene information",
    "平面図へ": "Plan view",
    "正面図へ": "Front view",
    "平面図へ切り替える": "Switch to plan view",
    "正面図へ切り替える": "Switch to front view",
    "全画面のシーン一覧を開く": "Open the full-screen scene list",
    "読み込んだシーンの情報": "Scene information",
    "このシーンのメモ": "Notes for this scene",
    "開くショーを選ぶ": "Choose a show to open",
    "ショーを開く": "Open a show",
    "JSONファイル": "JSON file",
    "JSONファイルからショーを開く": "Open a show from a JSON file",
    "継ぎ目の庭": "Seam Garden",
    "継ぎ目の庭のサンプルを開く": "Open the Seam Garden sample",
    "サンプルショー": "Sample show",
    "サンプルショーを開く": "Open the sample show",
    "いまのショーをファイルへ書き出す": "Export the current show to a file",
    "ショー選択を閉じる": "Close the show picker",
    "この知らせを閉じる": "Dismiss this notice",
    "設定を開く": "Open settings",
    "日本語": "Japanese",
    "日本語に切り替える": "Switch to Japanese",
    "英語に切り替える": "Switch to English",
    "設定を閉じる": "Close settings",
    "全画面のシーン一覧": "Full-screen scene list",
    "全画面のシーン一覧を閉じる": "Close the full-screen scene list",
    "セクションを展開する": "Expand section",
    "セクションを折りたたむ": "Collapse section",
  };
  Object.entries(expected).forEach(([ja, en]) => assert.equal(translations[ja], en, ja));
});

test("setLangはスマホ閲覧機の文言をその場で貼り直す", () => {
  assert.match(source, /function setLang\(next\) \{[\s\S]*?applyLang\(\);\s*applyPhoneViewerLang\(\);/);
  assert.match(source, /langJa\.addEventListener\("click", \(\) => setLang\("ja"\)\)/);
  assert.match(source, /langEn\.addEventListener\("click", \(\) => setLang\("en"\)\)/);
});

test("読み込んだJSONはスマホでは編集用比較モーダルを挟まず開く", () => {
  assert.match(source, /if \(phoneViewerActive\) \{\s*if \(next\.mcpRevision === null\) reserveImportedShowId\(next\);\s*if \(!applyLoadedState\(next, `「\$\{next\.project\.title\}」を読み込み、ショー一覧へ保存しました。`\)\) return;[\s\S]*?return;/);
});

test("縦画面は正面図と平面図を並べ、横画面は一枚を切り替える", () => {
  assert.match(source, /if \(phoneIsPortrait\(\)\) \{[\s\S]*?state\.showFront = true;[\s\S]*?state\.showPlan = true;/);
  assert.match(source, /const which = phoneUi && phoneUi\.singleView === "plan" \? "plan" : "front"/);
  assert.match(source, /viewToggle\.addEventListener\("click"[\s\S]*?enforcePhoneViews\(viewToggle\.dataset\.phoneView\)/);
  assert.match(style, /html\.stage-phone-viewer \.stage-canvas-stack \{[\s\S]*?grid-template-rows: auto auto minmax\(0, 1fr\);[\s\S]*?align-content: start/);
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?html\.stage-phone-viewer \.stage-canvas-stack \{[\s\S]*?grid-template-rows: minmax\(0, 1fr\)/);
});

test("横画面は操作を右側レールへ移し、図が縦いっぱいを使う", () => {
  /* 2026-08-24: 楽曲をPC専用にして下の音楽帯44pxを取り除いたので、
     その分は図の取り分になった（以前は 100dvh - 46px を引いていた）。
     引き算が復活していたら、音楽帯が戻ったか、計算だけ取り残されている。 */
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 64px/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-toolbar \{[\s\S]*?grid-column: 2;[\s\S]*?flex-direction: column/);
  assert.match(style, /justify-items: end/);
  assert.ok(!/100dvh - 46px/.test(style), "音楽帯ぶんの引き算が残っていないこと");
});

/* ★2026-08-28: 旧 `width: min(100%, calc(100dvh * 16/9))` は、この枠へ実際に
   配られる高さ（safe-area等を引いた後の値）と食い違うことがあり、iPhone 13 Pro Maxで
   上下がわずかに切れる報告があった。100dvhから逆算する式をやめ、実際にグリッドから
   渡された高さ（height:100%）からaspect-ratioで幅を導く形にした。
   ブラウザ実測でオーバーフローが0.867px→-0.008pxへ縮んだことを確認済み。 */
test("横画面の枠幅は100dvhの逆算式ではなく、実際に配られた高さから導く", () => {
  const landscapeBlock = style.slice(style.indexOf("@media (orientation: landscape)"));
  const frameRule = landscapeBlock.slice(
    landscapeBlock.indexOf("html.stage-phone-viewer .stage-board-frame {"));
  const body = frameRule.slice(0, frameRule.indexOf("}") + 1);
  // 経緯を書いた説明コメントには "100dvh" の語が出るので、宣言だけを見る。
  const declarations = body.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(declarations, /100dvh/, "dvhから幅を逆算する式が残っていないこと");
  assert.match(body, /width: auto;/);
  assert.match(body, /height: auto;/);
  assert.match(body, /max-width: 100%;/);
  assert.match(body, /max-height: 100%;/);
  assert.match(body, /aspect-ratio: 16 \/ 9;/);
});

test("スマホの縦は外側を六段、canvas-stack内を図二段+メモ一段にし、横は図だけ", () => {
  /* 2026-08-26: ①題の帯30pxを足した ②情報・ショーのパネルを重ねずに流し込み、
     図を下へ押し下げるようにした（どちらも本人指示）。
     2026-08-28: メモは canvas-stack の内側へ移し、縦長画面の余りを受け取る。
     横向きは縦の余白が図に要るので、題を消し、パネルは重ね、道具は右レールで一段に戻す。
     ★段を増減したら、この行と各パネルの grid-row を必ず一緒に直すこと。 */
  assert.match(style, /html\.stage-phone-viewer \.stage-board-column \{[\s\S]*?grid-template-rows: 30px 48px auto auto auto minmax\(0, 1fr\);/);
  assert.match(style, /html\.stage-phone-viewer \.stage-canvas-stack \{\s*display: grid;\s*grid-template-rows: auto auto minmax\(0, 1fr\);/);
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?grid-template-rows: minmax\(0, 1fr\);/);
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?html\.stage-phone-viewer \.stage-phone-title \{ display: none; \}/);
});

test("縦向きは情報・ショー・設定を図へ重ねず、図を下へ押し下げる", () => {
  /* ★本人指示（2026-08-26）: 正面図の上にパネルが被るのをやめる。
     hidden で段が消えても図が繰り上がらないよう、段は全部明示する。 */
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-title \{[\s\S]*?grid-row: 1;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-toolbar \{[\s\S]*?grid-row: 2;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-info \{[\s\S]*?grid-row: 3;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-source \{[\s\S]*?grid-row: 4;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-settings \{[\s\S]*?grid-row: 5;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-canvas-stack \{ grid-row: 6; \}/);
  // 縦向きでは浮かせない＝position:fixed と影を持たないこと
  const portraitInfo = style.slice(style.indexOf("html.stage-phone-viewer .stage-phone-info {"),
    style.indexOf("html.stage-phone-viewer .stage-phone-info[hidden]"));
  assert.ok(!/position: fixed/.test(portraitInfo), "縦向きの情報パネルは重ねない");
  assert.ok(!/box-shadow/.test(portraitInfo), "縦向きの情報パネルは浮かせない");
});

test("横向きだけは情報・ショー・設定を重ね、右レール64pxを避ける", () => {
  /* 横向きには押し下げる余白が無い。流し込むと図が画面の下へ出る。 */
  const landscape = style.slice(style.lastIndexOf("@media (orientation: landscape)"));
  assert.match(landscape, /\.stage-phone-info,[\s\S]*?\.stage-phone-source,[\s\S]*?\.stage-phone-settings \{[\s\S]*?position: fixed;[\s\S]*?grid-row: auto;/);
  assert.match(landscape, /right: calc\(64px \+ max\(8px, env\(safe-area-inset-right\)\)\)/);
  assert.match(landscape, /html\.stage-phone-viewer \.stage-canvas-stack \{ grid-row: 1; \}/);
});

test("スマホの上部の題は、版とβ版をヘッダーの正本から読む", () => {
  /* 版をここへ書き写すと二重管理になり、index.html だけ上げて食い違う。 */
  assert.match(source, /className = "stage-phone-title"/);
  assert.match(source, /document\.querySelector\("\.stage-app-version"\)/);
  assert.match(source, /document\.querySelector\("\.stage-beta"\)/);
  assert.ok(!/stage-phone-title-version[\s\S]{0,200}textContent = "v\d/.test(source),
    "版番号を直接書き込んでいないこと");
  // ゲストの目印も要素ごとここへ移す（id が変わらないので session 側の切り替えはそのまま効く）
  assert.match(source, /getElementById\("stage-session-guest-badge"\)[\s\S]{0,120}titleBar\.append/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-title-name \{[\s\S]*?font-family: var\(--serif\)/);
});

test("題の右端に44pxの設定入口があり、言語と「端末による違い」だけを持つ", () => {
  /* ★絵文字の「⚙」ではなくSVG（2026-08-26 本人指示。16pxで潰れない形に描き直した）。
     文字へ戻すと、端末のフォント任せの絵になり、他のアイコンと揃わない。 */
  assert.match(source, /makePhoneIconButton\("gear", tx\("設定を開く"\), "stage-phone-title-settings"\)/);
  assert.ok(!/makePhoneButton\("⚙"/.test(source), "設定の入口が絵文字へ戻っていないこと");
  assert.match(source, /if \(guestBadge\) titleBar\.append\(guestBadge\);[\s\S]*?titleBar\.append\(settingsToggle\);/);
  assert.match(style, /\.stage-phone-title \.stage-phone-title-settings \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  /* 中身は言語2つ＋「端末による違い」＋閉じる、で全部（E-3・2026-08-29 本人指示で入口を追加）。
     「端末による違い」は表を開くだけの入口で、機能のスイッチではない。
     編集機能のスイッチをここへ足さない方針は変わっていない。 */
  assert.match(source, /settingsPanel\.append\(settingsTitle, langJa, langEn, reachButton, settingsClose\)/);
  assert.match(source, /langJa\.setAttribute\("aria-pressed"/);
  assert.match(source, /langEn\.setAttribute\("aria-pressed"/);
  const settingsBlock = source.slice(source.indexOf("const settingsPanel ="),
    source.indexOf("/* 矢印の中央から開く全画面一覧", source.indexOf("const settingsPanel =")));
  /* 機能スイッチの混入を止める: この塊で押した状態を持つのは言語の2つだけ */
  const pressedSetters = settingsBlock.match(/\.setAttribute\("aria-pressed"/g) || [];
  assert.equal(pressedSetters.length, 2, "スマホ設定に状態を持つ項目は言語の2つだけ");
});

test("「端末による違い」の入口はスマホからも開け、狭い画面の一段組みが表側にある", () => {
  /* E-3の芯: スマホは機能が最少の端末なのに、それが意図的だと確かめる表への
     入口だけが無かった。「壊れている」という誤解の芽になる。 */
  assert.match(source, /reachButton\.addEventListener\("click", \(\) => \{[\s\S]*?openReachTable\(\);[\s\S]*?\}\);/);
  assert.match(source, /setPhoneButtonLang\(phoneUi\.reachButton, "端末による違い", "端末による違いを開く"\)/,
    "言語切替で入口の文言も引き直す");
  // 表そのものは560px以下で一段組みへ変わる（列見出しが縦積みで読めなくなる対策）
  assert.match(style, /@media \(max-width: 560px\) \{[\s\S]*?\.stage-reach-body tbody td::before \{[\s\S]*?content: attr\(data-label\);/);
});

test("シーン名は押せる入口で、一覧は段組み外の全画面スクロール面になる", () => {
  assert.match(source, /const sceneCurrent = document\.createElement\("button"\)/);
  assert.match(source, /sceneCurrent\.addEventListener\("click", openPhoneSceneList\)/);
  assert.match(source, /document\.body\.append\(sceneList\)/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-scene-list \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
  assert.match(style, /\.stage-phone-scene-list-scroll \{[\s\S]*?overflow-y: auto;[\s\S]*?-webkit-overflow-scrolling: touch;/);
  assert.match(style, /\.stage-phone-scene-list-row \{[\s\S]*?min-height: 44px;/);
  assert.match(source, /scrollIntoView\(\{ block: "center" \}\)/);
});

test("シーン一覧のセクション折りたたみは一時Setだけを変え、projectを変更しない", () => {
  const rows = [
    { id: "section-a", kind: "section", depth: 0 },
    { id: "scene-a", kind: "scene", depth: 1 },
    { id: "section-b", kind: "section", depth: 1 },
    { id: "scene-b", kind: "scene", depth: 2 },
    { id: "scene-c", kind: "scene", depth: 0 },
  ];
  const before = JSON.stringify(rows);
  const visible = phoneModel.visibleSceneRows(rows, new Set(["section-a"]));
  assert.deepEqual(Array.from(visible, (row) => row.id), ["section-a", "scene-c"]);
  assert.equal(JSON.stringify(rows), before);
  const listBlock = source.slice(source.indexOf("function renderPhoneSceneList()"),
    source.indexOf("function syncPhoneViewer()"));
  assert.match(listBlock, /phoneUi\.collapsedSections\.(?:add|delete)\(row\.id\)/);
  assert.ok(!/state\.project\.[A-Za-z]+\s*=/.test(listBlock),
    "一覧の折りたたみからprojectへ代入しないこと");
});

test("シーン行はopenSceneを呼んでから全画面一覧を閉じる", () => {
  assert.match(source, /button\.addEventListener\("click", \(\) => \{\s*openScene\(row\.id\);\s*closePhoneSceneList\(\);\s*\}\)/);
  assert.match(source, /row\.id === state\.project\.activeSceneId/);
  assert.match(source, /button\.setAttribute\("aria-current", "true"\)/);
});

test("縦画面の操作は一段に収まり、図へ重ならない", () => {
  assert.match(style, /grid-template-rows: 48px;/);
});

test("スマホでは舞台要素も付箋も図上で編集できない", () => {
  assert.match(source, /if \(phoneViewerActive\) nextTool = "select"/);
  assert.match(source, /if \(phoneViewerActive\) return;/);
  assert.match(source, /if \(phoneViewerActive\) return;[\s\S]*?const piece = selectedPiece\(\)/);
  assert.match(source, /if \(tabletPwaActive \|\| phoneViewerActive\) event\.preventDefault\(\)/);
});

test("スマホ画面はスクロールせず44px操作を使う", () => {
  assert.match(style, /html\.stage-phone-viewer body \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-phone-button \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  assert.match(style, /html\.stage-phone-viewer \.stage-board-frame\.is-closed \{ display: none; \}/);
});

test("スマホの付箋入力を外しても既存付箋の表示と図の下のメモ欄を残す", () => {
  assert.equal(translations["メモ"], "Note", "tx(\"メモ\") の対訳を残すこと");
  assert.match(source, /memoLabel\.textContent = tx\("メモ"\)/);
  assert.match(source, /const memoInput = document\.createElement\("textarea"\)/);
  assert.match(source, /drawNotes\(target, L, view, showSelection\)/);
  assert.match(style,
    /grid-template-columns: 48px 44px minmax\(0, 1fr\) 44px 48px;/,
    "スマホの道具列は5列にすること");
});

test("スマホ閲覧版では編集チュートリアルを自動起動しない", () => {
  assert.match(source, /function stageTourContextActive\(\) \{[\s\S]*?if \(phoneViewerActive\) return false;/);
});

test("設定の歯車は、ブラウザ版とスマホで同じ図形を使う", () => {
  /* ★片方だけ描き直すと、同じ「設定」が端末によって違う絵になる。
     index.html の #stage-prefs-btn と stage-sketch.js の PHONE_ICON_SVG.gear は同じ形。 */
  /* B案＝歯は短く太く（stroke-width 2.3）。線だけ・塗りなしで、他の道具アイコンと語彙を揃える。
     ★塗りの突起へ変えるなら、他のアイコンの描き方から見直すこと（本人判断 2026-08-26）。 */
  const shape = /circle cx="8" cy="8" r="4\.2"[\s\S]*?circle cx="8" cy="8" r="1\.4"[\s\S]*?stroke-width="2\.3" d="M8 3\.10V1\.90/;
  assert.match(indexHtml, shape, "ブラウザ版(index.html)の歯車");
  assert.match(source, shape, "スマホ版(stage-sketch.js)の歯車");
  // 16pxで潰れる多角形の歯へ戻っていないこと
  assert.ok(!/M6\.12 3\.47L6\.78 1\.72/.test(indexHtml), "多角形で歯を刻む古い形へ戻っていないこと");
});

test("全画面のシーン一覧を閉じるのは×の絵で、読み上げ名は文字で残す", () => {
  assert.match(source, /makePhoneIconButton\("close", tx\("全画面のシーン一覧を閉じる"\), "stage-phone-scene-list-close"\)/);
  assert.match(source, /close: '<svg[\s\S]*?M4\.4 4\.4l7\.2 7\.2M11\.6 4\.4l-7\.2 7\.2/);
  // 絵のボタンは言語切替で中身を貼り替えない（textContentで絵が消えるため）
  assert.match(source, /function setPhoneIconButtonLang\(button, label\) \{[\s\S]*?setAttribute\("aria-label"/);
  assert.ok(!/setPhoneButtonLang\(phoneUi\.sceneListClose/.test(source),
    "絵のボタンへ文字の貼り直しを使っていないこと");
});

test("図の下のメモ欄は縦向きだけで、中身はシーンのメモそのもの", () => {
  /* ★スマホの中だけに残る別の入れ物を作らないこと。書き出しても持ち帰れなくなる
     （P1-7で問題にした形）。情報パネルの欄と同じ sc().note を読み書きする。 */
  assert.match(source, /memoInput\.addEventListener\("input", \(\) => \{[\s\S]*?sc\(\)\.note = memoInput\.value\.slice\(0, 200\)/);
  // 二枚あるので、打っている側は貼り替えない（カーソルが飛ぶ）
  assert.match(source, /document\.activeElement !== phoneUi\.memoInput\) phoneUi\.memoInput\.value = scene\.note/);
  assert.match(source, /els\.canvasStack\.append\(memoBar\)/, "メモ欄をcanvas-stackの内側へ置くこと");
  assert.doesNotMatch(source, /board\.append\(memoBar\)/, "メモ欄を外側gridの行へ戻さないこと");
  assert.match(style, /@media \(orientation: landscape\) \{[\s\S]*?html\.stage-phone-viewer \.stage-phone-memo \{ display: none; \}/);
  // iOSは16px未満の入力欄へ寄ると画面ごと拡大する
  assert.match(style, /\.stage-phone-memo-input \{[\s\S]*?font-size: 16px;/);
});

/* ★2026-08-28に実ブラウザで発見: applyLayout()には正面図・平面図のDOM順を
   並べ替える既存ロジック（swapCenter用。centerOrderに沿って前後を毎回re-appendする）
   があり、これがcanvas-stackの子要素すべてに効く。メモにgrid-rowを明示しないと、
   横縦切替（viewToggleのクリック＝orient()相当）のたびに前後図がDOMの末尾へ
   移動し、メモがDOM順の先頭へ押し出されて1段目（本来は正面図の場所）に
   自動配置されてしまう。実機相当のブラウザで、grid-row無しの状態を再現して
   確認した（縦向き回転操作を6回往復させても崩れないことも確認済み）。 */
test("メモの段はDOM順に頼らずgrid-rowで固定する（並べ替えで押し出されないように）", () => {
  const memoRule = style.slice(style.indexOf("html.stage-phone-viewer .stage-phone-memo {"));
  const body = memoRule.slice(0, memoRule.indexOf("}") + 1);
  assert.match(body, /grid-row: 3;/,
    "grid-rowを明示しないと、applyLayout()のDOM並べ替えでメモが1段目へ押し出される");
});
