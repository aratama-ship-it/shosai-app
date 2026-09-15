import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const index = read("stage.html");
const stage = read("stage.html");
const js = read("stage-sketch.js");
const i18n = read("stage-i18n.js");
const style = read("style.css");
const proto = read("formation/prototype/record-from-video.html");
const worker = read("worker.js");
const sw = read("stage-sw.js");

test("選択中セクションからiframeモーダルを開く", () => {
  for (const html of [index, stage]) {
    assert.match(html, /id="stage-formation-modal"/);
    assert.match(html, /id="stage-formation-frame"[^>]*src="about:blank"/);
  }
  assert.match(js, /stage-section-formation-entry/);
  assert.match(js, /record-from-video\.html\?v=62&embed=1&cast=locked/);
  assert.match(js, /event\.origin !== location\.origin/);
  assert.match(js, /event\.source !== els\.formationFrame\.contentWindow/);
});

test("セクション下の入口はミュージックシンクを開くと示す", () => {
  assert.match(js, /open\.textContent = tx\("ミュージックシンクを開く"\)/);
  assert.match(js, /open\.title = tx\("このセクションのミュージックシンクを開く"\)/);
  assert.match(i18n, /"ミュージックシンクを開く": "Open Music Sync"/);
});

test("音源とシーンのタイミングが反映済みのセクションだけ舞台スケッチで再生できる", () => {
  assert.match(js, /function formationSectionPlaybackItems\(section\)/);
  assert.match(js, /row\.audioTrackId === trackId && row\.formationLink/);
  assert.match(js, /row\.formationLink\.sourceSegmentId === firstGroup\.id/);
  assert.match(js, /if \(formationSectionPlaybackItems\(scene\)\.length\)/);
  assert.match(js, /play\.textContent = `▶ \$\{tx\("舞台スケッチで再生"\)\}`/);
  assert.match(js, /playFormationSection\(scene\)/);
  assert.match(js, /void advanceFormationSectionPlayback\(\)/);
  assert.match(i18n, /"舞台スケッチで再生": "Play in Stage Sketch"/);
  assert.match(style, /\.stage-section-formation-entry \.stage-section-sync-play/);
});

test("フォーメーション一覧の上からセクションを切り替え、編集中の内容を先に保管する", () => {
  assert.match(proto, /id="sectionPicker"/);
  assert.match(proto, /id="sectionPick" aria-label="シーンを編集するセクション"/);
  assert.match(proto, /function setEmbeddedSectionPicker\(sections, selectedId\)/);
  assert.match(proto, /type: "stage-sketch-formation:select-section", sectionId: e\.target\.value/);
  assert.match(js, /function formationSectionChoices\(\)/);
  assert.match(js, /package: formationPackageFor\(section\), audios, sections: formationSectionChoices\(\), sectionId: section\.id/);
  assert.match(js, /async function stashFormationPackage\(section, pkg, audios\)/);
  assert.match(js, /message\.type === "stage-sketch-formation:select-section"/);
  assert.match(js, /await stashFormationPackage\(section, message\.package, message\.audios\);/);
  assert.match(js, /formationModalSectionId = next\.id;/);
});

test("フォーメーションモーダルは窓幅を使い、明るい別アプリ枠を持つ", () => {
  assert.match(style, /\.stage-modal\.stage-formation-modal\s*\{[^}]*width: calc\(100vw - 12px\)/s);
  assert.match(style, /--formation-shell: #f4efe5/);
  assert.match(style, /\.stage-formation-body\s*\{[^}]*padding: 6px[^}]*background: var\(--formation-shell\)/s);
  for (const html of [index, stage]) assert.match(html, /style\.css\?v=\d+/);
  assert.match(sw, /\.\/style\.css\?v=\d+/);
});

test("複数楽曲を新規シーンへ結び、音源は既存IndexedDBへ保存する", () => {
  assert.match(js, /songs\.forEach\(\(song, songIndex\) => formationGroupsFor\(song\)/);
  assert.match(js, /scene = newScene\("", false, "scene"/);
  assert.match(js, /formationLink = \{ version: 1, documentId, songId: song\.id/);
  assert.match(js, /await audioStore\.put\(trackId, entry\.blob\)/);
  assert.match(js, /audioTrackBySong/);
});

test("既存セクションの全シーンを記録画面のシーンとして渡し、反映時は元の行を使う", () => {
  assert.match(js, /function sectionSceneRows\(section\)/);
  assert.match(js, /function formationSceneDurationCounts\(scene, bpm\)/);
  assert.match(js, /sourceStageSceneId: source && source\.kind === "scene" \? source\.id : null/);
  assert.match(js, /scenePlan: \{ segments: frames\.map/);
  assert.match(js, /const sourceSceneFor = \(spec\) =>/);
  assert.match(js, /if \(!scene\) scene = sourceSceneFor\(spec\);/);
  assert.match(proto, /<h2>シーン一覧/);
  assert.match(proto, /<summary>シーン情報/);
  assert.match(proto, /const formationNo = \(index\) => `シーン\$\{index \+ 1\}`;/);
  assert.doesNotMatch(proto, /フォーメーション一覧|フォーメーション情報/);
  assert.match(js, /const base = `シーン\$\{groupIndex \+ 1\}/);
});

test("舞台スケッチのaudio要素のcurrentTimeから演者位置を毎フレーム計算する", () => {
  assert.match(js, /formationSecToCount\(song\.track, finite\(els\.musicAudio\.currentTime, 0\)\)/);
  assert.match(js, /piece\.animU = pose\.u; piece\.animV = pose\.v/);
  assert.match(js, /formationPlaybackRaf = requestAnimationFrame\(step\)/);
});

test("セットは舞台スケッチから読んでフォーメーション側では表示だけする", () => {
  assert.match(js, /frame\.setPoses = formationSetPoses\(linked \|\| source \|\| fallback\)/);
  assert.match(proto, /セットは各フォーメーション頭で舞台スケッチから写す/);
  assert.match(proto, /doc\.sets\.forEach/);
  assert.doesNotMatch(proto, /doc\.sets\.push/);
});

test("埋め込みではサンプルを自動読込せず、Blobを親へ返す", () => {
  assert.match(proto, /if \(EMBEDDED\)/);
  assert.match(proto, /stage-sketch-formation:apply/);
  assert.match(proto, /a\.blob instanceof Blob/);
  assert.match(proto, /else if \(!T\.src\) loadSample\(\)/);
});

test("埋め込みで音源を追加したら、モーダルを閉じずに舞台スケッチへ接続する", () => {
  assert.match(proto, /function sendAudioSyncToStage\(fullApply = false\)/);
  assert.match(proto, /stage-sketch-formation:sync-audio/);
  assert.match(proto, /if \(sendAudioSyncToStage\(\)\) flash\(`音源: \$\{file\.name\} を舞台スケッチへ接続しています`\)/);
  assert.match(js, /message\.type === "stage-sketch-formation:sync-audio"/);
  assert.match(js, /applyFormationPackage\(section, message\.package, message\.audios, \{ closeModal: false, silent: true \}\)/);
  assert.match(js, /if \(options\.closeModal !== false\) closeFormationModal\(\);/);
});

test("ミュージックシンクは明るい黄色テーマへ切り替えられる", () => {
  assert.match(proto, /id="themeToggle"[^>]*aria-pressed="false"/);
  assert.match(proto, /html\[data-theme="sunny"\]/);
  assert.match(proto, /--bg:#f6c84c;--panel:#fff1b8/);
  assert.match(proto, /--canvas-void:#ffd75a;--canvas-front-void:#191512/);
  assert.match(proto, /const THEME_KEY = LS_KEY \+ ":theme"/);
  assert.match(proto, /function applyVisualTheme\(next, announce = false\)/);
  assert.match(proto, /\$\("themeToggle"\)\.onclick = \(\) => applyVisualTheme/);
  assert.match(proto, /id="themeToggle"[^>]*aria-label="明るい黄色テーマに切り替え"[^>]*>☀<\/button>/);
  assert.match(proto, /toggle\.textContent = visualTheme === "sunny" \? "◐" : "☀";/);
  assert.match(proto, /toggle\.setAttribute\("aria-label", nextThemeLabel\);/);
  assert.match(proto, /frontVoid: read\("--canvas-front-void"\)/);
  assert.match(proto, /function drawStage\(c\) \{[\s\S]{0,300}?sctx\.fillStyle = C\.void/);
  assert.match(proto, /function drawFrontStage\(c\) \{[\s\S]{0,300}?sctx\.fillStyle = C\.frontVoid/);
});

test("埋め込みの音源選択・向きスクロール・隠れた正面プレビューは操作どおりに動く", () => {
  assert.match(proto, /id="fileBtn"[^>]*>音源を追加<\/button>/);
  assert.match(proto, /function chooseAudioFile\(\)/);
  assert.match(proto, /\$\("file"\)\.onchange = \(e\) => \{\s*const file = e\.target\.files\[0\]; e\.target\.value = "";/);
  assert.match(proto, /#front\[hidden\]\{display:none!important\}/);
  assert.match(proto, /下へ回すと反時計回り/);
  assert.match(proto, /setFacing\(notches \* \(e\.shiftKey \? 5 : 15\), true\)/);
});

test("タイムラインを縮小しても文字を隣の目盛りやシーンへ重ねない", () => {
  assert.match(proto, /function fitTimelineText\(ctx, text, maxWidth\)/);
  assert.match(proto, /if \(lx >= lastRulerLabelRight \+ 8 \* dpr\)/);
  assert.match(proto, /whole && pxPerCount >= 14 \* dpr/);
  assert.match(proto, /drawFittedTimelineText\(bctx, sceneTitleOf\(bandGroups\[idx\], idx\)/);
  assert.match(proto, /drawFittedTimelineText\(bctx, label, lx/);
  assert.match(proto, /pickTimelineText\(lctx, \["ここを押して開始位置を決める", "開始位置", "開始"\]/);
});

test("時間モードの目盛りは時刻だけを出し、カウント番号を混ぜない", () => {
  assert.match(proto, /if \(unit === "time"\) \{[\s\S]{0,1600}?fmtSec\(sec\)\.replace/);
  assert.doesNotMatch(proto, /bctx\.fillText\(String\(Math\.round\(sec\) % 5\), x \+ 1, 16 \* dpr\)/);
});

test("転換詳細の演者別タイミングは全体のカウント・時間表示に従う", () => {
  assert.match(proto, /const lagToView = \(counts, atCount\) => \(unit === "time"/);
  assert.match(proto, /const lagFromView = \(v, atCount\) => \(unit === "time"/);
  assert.match(proto, /const step = unit === "time" \? String\(timeSnap\) : String\(grid\);/);
  assert.match(proto, /全体 \$\{escHtml\(String\(lagToView\(travelOf\(nf\), nf\.count\)\)\)\}\$\{unitName\}前から/);
  assert.doesNotMatch(proto, /lagUnit|data-lagunit/);
});

test("ミュージックシンクは予習モードを持たず、編集だけを担う", () => {
  assert.doesNotMatch(proto, /modeStudy|modeRecord|mode === "study"|mode !== "record"|mode === "record"|予習モード/);
  assert.doesNotMatch(proto, /自分を選ぶ（自分だけ追う）/);
  assert.match(proto, /入力: 駒のドラッグ/);
  assert.doesNotMatch(proto, /記録: 音源を流し、動いた人だけドラッグして/);
  assert.doesNotMatch(proto, /演者の登録は舞台スケッチ側で編集します/);
});

test("埋め込みでは舞台サイズを隠し、舞台の空き場所をドラッグして複数選択できる", () => {
  assert.match(proto, /id="setupEntry"/);
  assert.match(proto, /\$\("setupEntry"\)\.hidden = EMBEDDED/);
  assert.match(proto, /id="stageSizeSetup"/);
  assert.match(proto, /\$\("stageSizeSetup"\)\.hidden = EMBEDDED/);
  assert.match(proto, /let drag = null, curveDrag = null, marquee = null/);
  assert.match(proto, /function startMarquee\(e, x, y, front = false\)/);
  assert.match(proto, /if \(!hit0\) \{ startMarquee\(e, x, y, true\); return; \}/);
  assert.match(proto, /if \(!hit\) \{ startMarquee\(e, x, y\); return; \}/);
  assert.match(proto, /if \(marquee\) \{\s*const rect = stage\.getBoundingClientRect\(\); marquee\.x1/);
  assert.match(proto, /drawMarqueeSelection\(C\)/);
});

test("音源追加は現在の楽曲へファイルだけを結び、曲・シーンを生成しない", () => {
  assert.match(proto, /id="fileBtn"[^>]*シーンは変わりません[^>]*>音源を追加<\/button>/);
  assert.match(proto, /\$\("fileBtn"\)\.onclick = \(\) => chooseAudioFile\(\);/);
  assert.match(proto, /\$\("file"\)\.onchange = \(e\) => \{\s*const file = e\.target\.files\[0\]; e\.target\.value = "";\s*if \(!file\) return;\s*loadAudioIntoCurrentSong\(file\);/);
  assert.doesNotMatch(proto, /id="songAdd"|function addSong\(|audioPickPurpose|purpose === "add-song"/);
});

test("表示操作は中央舞台の下左、テンポは下端操作バーに集める", () => {
  assert.match(proto, /\.stageTools\{position:absolute;[^}]*left:var\(--s3\);bottom:var\(--s3\)/);
  assert.match(proto, /<div class="stageTools"[^>]*>[\s\S]*id="viewPlan"[\s\S]*id="viewFront"[\s\S]*id="flipPlan"[\s\S]*id="paths"/);
  assert.match(proto, /<div class="ctrlTempo"[^>]*>[\s\S]*for="bpm"[\s\S]*id="autoBpm"[\s\S]*id="meterLabel"[\s\S]*id="markOne"[\s\S]*id="realTempo"/);
});

test("音量は音源と同じ上段に置き、低頻度の補助操作は隠してキーで扱う", () => {
  assert.match(proto, /<div class="topVolume"[^>]*>[\s\S]*for="vol"[\s\S]*id="vol"/);
  assert.match(proto, /id="soundTest2" hidden/);
  assert.match(proto, /id="markOne"[^>]*>先頭を記録<\/button>/);
  assert.match(proto, /id="dup" hidden/);
  assert.match(proto, /id="del" hidden/);
  assert.match(proto, /e\.target\.closest\("input, textarea, select, \[contenteditable='true'\]"\)/);
  assert.match(proto, /e\.key === "Delete" && !e\.metaKey && !e\.ctrlKey\) \{ e\.preventDefault\(\); \$\("del"\)\.click\(\); \}/);
});

test("認証済みゲストの必要資源だけを許可し、PWAへ試作用音源を入れない", () => {
  assert.match(worker, /"\/formation\/prototype\/record-from-video\.html"/);
  assert.doesNotMatch(sw, /gensan-extend|formation\/prototype\/sample/);
  assert.match(index, /stage-sketch\.js\?v=493/);
  assert.match(stage, /stage-sketch\.js\?v=493/);
  assert.match(sw, /\.\/stage-sketch\.js\?v=493/);
});
