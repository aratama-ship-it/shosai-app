// 機能一覧「端末による違い」（旧称「どこで何ができるか」。2026-08-26に本人が改称）を守る。
//
// 置き場所の経緯: 最初は保存パネルの中に <details> で畳んで入れたが、
// 側柱の幅が268pxしかなく、列見出しが「ブ／ラ／ウ／ザ」と縦積みになって読めなかった
// （実測して判明）。幅が要る資料なので既存の窓（stage-modal）にし、その入口は
// 2026-08-26 に保存パネルから環境設定モーダルへ移した。
//
// 内容の正しさ（●○—の値）は本人が決めた確定事項なので、勝手に変えないこと。

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const indexHtml = await readFile(new URL("index.html", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const style = await readFile(new URL("style.css", root), "utf8");

test("環境設定から開ける", () => {
  for (const [name, html] of [["index.html", indexHtml], ["stage.html", stageHtml]]) {
    assert.match(html, /id="stage-reach-open"/, `${name}: 開くボタンがあること`);
    assert.match(html, /id="stage-reach-modal"/, `${name}: 窓があること`);
    assert.match(html, /id="stage-reach-backdrop"/, `${name}: 暗幕があること`);
    assert.match(html, /id="stage-reach-close"/, `${name}: 閉じるがあること`);
  }
  const prefsModal = indexHtml.slice(
    indexHtml.indexOf('id="stage-prefs-modal"'),
    indexHtml.indexOf('id="stage-about-backdrop"'),
  );
  assert.match(prefsModal, /id="stage-prefs-list"[\s\S]*id="stage-reach-open"/,
    "開くボタンは環境設定モーダルの設定一覧より下に置くこと");

  const savePanel = indexHtml.slice(
    indexHtml.indexOf('data-panel="save"'),
    indexHtml.indexOf('data-panel="ask"'),
  );
  assert.doesNotMatch(savePanel, /id="stage-reach-open"/, "保存パネルには開くボタンを残さないこと");
});

test("窓は既存の作法に従う", () => {
  assert.match(indexHtml, /class="stage-modal stage-reach-modal"/);
  assert.match(indexHtml, /role="dialog"[\s\S]{0,80}aria-modal="true"/);
  // 開閉・暗幕・Escape の4経路
  assert.match(source, /els\.reachOpen\.addEventListener\("click", openReachTable\)/);
  assert.match(source, /els\.reachClose\.addEventListener\("click", closeReachTable\)/);
  assert.match(source, /els\.reachBackdrop\.addEventListener\("click", closeReachTable\)/);
  assert.match(source, /Escape.*els\.reachModal.*closeReachTable\(\)/);
});

test("窓は表が読める幅を持つ", () => {
  /* ★側柱（268px）へ戻さないこと。列見出しが縦積みになって読めなくなる。 */
  const block = style.slice(
    style.indexOf(".stage-modal.stage-reach-modal {"),
    style.indexOf(".stage-modal.stage-reach-modal .stage-modal-head"),
  );
  assert.ok(block.length > 0, "窓のCSSがあること");
  assert.match(block, /width: min\(760px, calc\(100vw - 32px\)\)/);
  assert.match(block, /max-height: calc\(100dvh - 48px\)/);
  assert.match(block, /z-index: 72/, "環境設定モーダルより手前に開くこと");
});

test("配る製品では書斎の一覧を見せない", () => {
  /* 単独配布版（stage.html）の利用者は書斎を持っていない。
     持っていない機能の一覧を見せても混乱するだけ。導入文も差し替える
     （書斎の表が消えると「二つの道具があります」が意味を失うため）。 */
  const guard = source.slice(
    source.indexOf("if (standaloneStagePage) {"),
    source.indexOf("const SCENE_STUDIES"),
  );
  assert.ok(guard.length > 0, "単独版の分岐があること");
  assert.match(guard, /\.block-inhouse[\s\S]*?hidden = true/);
  assert.match(guard, /reach-lead-desk[\s\S]*?hidden = true/);
  assert.match(guard, /reach-lead-standalone[\s\S]*?hidden = false/);
  // 二つの導入文がHTMLにあること
  assert.match(indexHtml, /class="reach-lead-desk"/);
  assert.match(indexHtml, /class="reach-lead-standalone" hidden/);
});

test("表の中身は確定した内容どおり", () => {
  const table = indexHtml.slice(
    indexHtml.indexOf('id="stage-reach-modal"'),
    indexHtml.indexOf('id="stage-scene-grid-backdrop"'),
  );
  assert.ok(table.length > 0, "表が窓の中にあること");

  // 舞台機構・3Dカメラ: iPadに足さないと確定（2026-08-25）
  const machinery = table.slice(table.indexOf("舞台機構"), table.indexOf("3Dカメラ"));
  assert.match(machinery, /data-label="タブレット" class="col-away m-none"/,
    "舞台機構のタブレット列は — のまま");

  // 楽曲: PC版のみと確定（2026-08-24）
  const assign = table.slice(table.indexOf("曲を割り当てる"), table.indexOf("曲を再生する"));
  assert.match(assign, /data-label="タブレット" class="col-away m-none"/);
  assert.match(assign, /data-label="スマホ" class="col-away m-none"/);

  // スマホの保存警告と書き出し: 課題2で実装したので ●
  const warn = table.slice(table.indexOf("保存の警告が目に入る"), table.indexOf("ファイルを読み込む"));
  assert.match(warn, /data-label="スマホ" class="col-away m-full"/,
    "保存警告と書き出しはスマホでも使える（課題2で実装済み）");
});

test("窓の中に外部参照を持ち込まない", () => {
  const table = indexHtml.slice(
    indexHtml.indexOf('id="stage-reach-modal"'),
    indexHtml.indexOf('id="stage-scene-grid-backdrop"'),
  );
  assert.ok(!/<img|<script|https?:\/\//.test(table), "画像・スクリプト・外部URLを含めないこと");
});
