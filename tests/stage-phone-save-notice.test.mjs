// スマホで保存が無言で失敗しないことを守る（P1-7・2026-08-24）。
//
// 実機QAで確認した状態: スマホ閲覧機ではメモを編集でき、persistSoon() が
// localStorage へ書き込む。しかし保存状態・警告の書き込み先 #stage-save-status は
// 「保存」パネルの中にあり、閲覧機ではパネルごと display:none で隠れている。
// そのため容量不足や棚の破損が起きても画面に何も出ず、**無言で失敗していた**。
// さらに書き出しボタンが無く、書いたメモを端末から取り出す手段もなかった。
//
// 対処の二本柱。どちらが欠けても意味が薄い:
//   1. 失敗を知らせる（警告帯）
//   2. 逃がす道を隣に置く（書き出し）— 気づいても取り出せないのでは意味がない

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const style = await readFile(new URL("style.css", root), "utf8");

function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const code = withoutComments(source);

test("保存状態の書き込みは一本化されている", () => {
  /* ★ els.saveStatus へ直接代入すると、閲覧機では誰にも見えないまま失敗する。
     setSaveStatus() を通すことで、スマホへも必ず届く。 */
  assert.match(code, /function setSaveStatus\(text, level = "info"\)/);
  const direct = [...code.matchAll(/els\.saveStatus\.textContent\s*=/g)];
  assert.equal(direct.length, 1, "直接代入は setSaveStatus の中の1箇所だけであること");
  const setter = code.slice(code.indexOf("function setSaveStatus"));
  assert.match(setter.slice(0, 260), /els\.saveStatus\.textContent = text/);
  assert.match(setter.slice(0, 260), /syncPhoneSaveNotice\(text, level\)/);
});

test("保存の失敗と棚の異常は警告として送る", () => {
  const persist = code.slice(
    code.indexOf("function persistSoon()"),
    code.indexOf("function announce(message)"),
  );
  assert.ok(persist.length > 0, "persistSoon が見つかること");
  // 棚の破損・容量不足・書き込み例外の3つが warn であること
  const warns = [...persist.matchAll(/"warn"/g)];
  assert.equal(warns.length, 3, "棚の破損・棚の容量不足・保存例外の3つを警告にすること");
  assert.match(persist, /shelfCorrupt/);
  assert.match(persist, /shelfFailed/);
  assert.match(persist, /catch \(_\) \{[\s\S]*?"warn"/);
  // 通常の保存は警告にしない（毎回帯が出ては読まれなくなる）
  assert.match(persist, /Saving/);
});

test("通常の保存では帯を出さず、警告のときだけ出す", () => {
  const sync = code.slice(
    code.indexOf("function syncPhoneSaveNotice"),
    code.indexOf("function setSaveStatus"),
  );
  assert.ok(sync.length > 0, "syncPhoneSaveNotice が見つかること");
  assert.match(sync, /if \(level !== "warn"\) return;/, "通常の保存では何もしないこと");
  assert.match(sync, /phoneUi\.saveNotice\.hidden = false/);
  /* ★ info のときに hidden = true にしないこと。
     警告の直後に通常の保存が走ると、せっかくの警告が消えてしまう。 */
  assert.ok(
    !/hidden = true/.test(sync),
    "帯を自動で閉じないこと（閉じるのは利用者の操作だけ）",
  );
});

test("閉じるのは利用者の操作だけ", () => {
  assert.match(code, /saveNoticeClose\.addEventListener\("click", \(\) => \{ saveNotice\.hidden = true; \}\)/);
});

test("警告の隣に書き出しがある", () => {
  // 気づいても取り出せないのでは意味がない
  assert.match(code, /saveNoticeExport\.addEventListener\("click", \(\) => exportProject\(\)\)/);
  assert.match(code, /saveNoticeActions\.append\(saveNoticeExport, saveNoticeClose\)/);
});

test("読み込みの対として書き出しを置く", () => {
  /* 文言は言語切替の対象だが、「同じ読み込み面に逃がす道を置く」意図は変えない。 */
  assert.match(code, /const exportButton = makePhoneButton\(tx\("ファイルへ書き出す"\)/);
  assert.match(code, /sourcePanel\.append\(sourceTitle, fileButton, seamSampleButton, sampleButton,\s*exportButton, sourceClose\)/);
  // 既存の書き出し処理を使い回すこと（別経路を作らない）
  const handler = code.slice(code.indexOf('exportButton.addEventListener'));
  assert.match(handler.slice(0, 200), /exportProject\(\)/);
});

test("警告帯は盤面のgridの外へ出す", () => {
  /* 警告は設定等の流し込み面と違って、利用者へ割り込んで知らせる必要がある。
     六段gridの行へ入れず、従来どおり枠外へ重ねる。 */
  const block = style.slice(
    style.indexOf("html.stage-phone-viewer .stage-phone-save-notice {"),
    style.indexOf("html.stage-phone-viewer .stage-phone-save-notice[hidden]"),
  );
  assert.ok(block.length > 0, "警告帯のCSSがあること");
  assert.match(block, /position: fixed/);
  assert.match(block, /env\(safe-area-inset-top\)/, "ノッチを避けること");
  assert.match(block, /background: var\(--paper\)/, "暗い図の上で読めるよう紙の色にすること");
});

test("警告帯のボタンは指で押せる大きさ", () => {
  const block = style.slice(style.indexOf(".stage-phone-save-notice .stage-phone-button {"));
  assert.match(block.slice(0, 220), /min-height: 44px/);
});

test("スマホの盤面から音楽帯ぶんの行が消えている", () => {
  /* 音楽UIは戻さないこと。外側に足した段は 題・情報・ショー・設定 だけで、
     メモ欄は canvas-stack の内側へ置く。
     ★44pxの固定行が現れたら、下端の音楽帯が復活した疑い（2026-08-24 に取り除いたもの）。 */
  assert.match(style, /grid-template-rows: 30px 48px auto auto auto minmax\(0, 1fr\);/);
  assert.ok(!/30px 48px auto auto auto 44px/.test(style));
  assert.ok(!/stage-phone-music/.test(style), "音楽帯の見た目が戻っていないこと");
});
