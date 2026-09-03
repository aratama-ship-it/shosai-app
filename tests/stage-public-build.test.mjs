import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tryHtml = await readFile(new URL("../try.html", import.meta.url), "utf8");
const stageHtml = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const publicJs = await readFile(new URL("../stage-public.js", import.meta.url), "utf8");
const publicCss = await readFile(new URL("../stage-public.css", import.meta.url), "utf8");

test("公開体験版はPWAにならない（SW・manifest・アイコンを持たない）", () => {
  // βの stage.html には有る。公開版には無い、という対比で守る。
  assert.match(stageHtml, /stage-pwa\.js/);
  assert.doesNotMatch(tryHtml, /stage-pwa\.js/);
  assert.doesNotMatch(tryHtml, /rel="manifest"/);
  assert.doesNotMatch(tryHtml, /apple-touch-icon/);
});

test("公開体験版は共有セッションを読み込まない（認証の無いホストで /whoami が404になる）", () => {
  assert.match(stageHtml, /<script src="stage-session\.js/);
  assert.doesNotMatch(tryHtml, /<script src="stage-session\.js/);
});

test("公開体験版は is-public を付け、専用のCSSとJSを最後に読む", () => {
  assert.match(tryHtml, /<body class="is-standalone is-public">/);
  assert.match(tryHtml, /stage-public\.css\?v=\d+/);
  assert.match(tryHtml, /stage-public\.js\?v=\d+/);
  assert.ok(
    tryHtml.indexOf("stage-public.js") > tryHtml.indexOf("stage-sketch.js"),
    "stage-public.js は stage-sketch.js より後に読む",
  );
});

test("保存は残さない（2つの保存キーを消し、書き込みも止める）", () => {
  assert.match(publicJs, /STORAGE_KEYS = new Set\(\["shosai-stage-sketch-v1", "shosai-stage-shows-v1"\]\)/);
  assert.match(publicJs, /storageProto\.setItem = function/);
});

test("体験版の下地は手で組み立てず、書き出した文書を直して戻す", () => {
  // 手組みの文書は audioTracks 等が欠けて applyDocumentString がその場で落ちる（2026-09-03）。
  assert.match(publicJs, /function resetPreview\(\) \{\s*const documentValue = readDocument\(\);/);
  assert.doesNotMatch(publicJs, /kind: "shosai-stage-sketch"/);
  assert.match(publicJs, /project\.scenes = \[scene\];/);
  assert.match(publicJs, /\.slice\(0, 3\)/);
});

test("自動デモは画面に見えてから再生する", () => {
  // 背面のタブや画面外の iframe では rAF が進まず、利用者が見る前に終わってしまう。
  assert.match(publicJs, /function whenVisible\(run\)/);
  assert.match(publicJs, /IntersectionObserver/);
  assert.match(publicJs, /visibilitychange/);
  assert.match(publicJs, /whenVisible\(\(\) => playDemo\(\)\)/);
});

test("正面図のタップは左右だけ動かし、演者を宙に浮かせない", () => {
  // 俯瞰図では v も渡す。正面図では undefined を渡して奥行きを変えない。
  assert.match(publicJs,
    /movePerformer\(selectedPerformerId, u, canvas\.id === "stage-plan-canvas" \? v : undefined\);/);
  // 二指の最中は動かさない（ピンチを妨げない）
  assert.match(publicJs, /touches\.size >= 2/);
});

test("シーン・保存・書き出し・3Dカメラ・共有は公開版で隠す", () => {
  for (const selector of [
    "#stage-scene-bar", "#stage-export", "#stage-present-btn", "#stage-prefs-btn",
    "#stage-freecam-open", "#stage-col-left", "#stage-col-right",
    ".stage-canvas-tools", ".stage-seat-list", ".stage-zoom-fab", ".stage-phone-info",
  ]) {
    assert.ok(publicCss.includes(selector), `${selector} を隠す指定がある`);
  }
});

test("二つの図は広い画面で横に並ぶ（連動が同時に見えることが体験版の核）", () => {
  assert.match(publicCss, /@media \(min-width: 900px\)[\s\S]*?\.stage-canvas-stack \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/);
});
