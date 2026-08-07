import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const stageHtml = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");

/* ---------- シーンの説明（正面図の上の欄） ---------- */

test("シーンの説明は正面の絵の枠の中、絵より上に置く", () => {
  const cell = stageHtml.slice(stageHtml.indexOf('id="stage-front-cell"'));
  const desc = cell.indexOf('id="stage-scene-desc"');
  const inner = cell.indexOf('id="stage-front-inner"');
  assert.ok(desc > 0, "正面の枠の中に説明の行がある");
  assert.ok(desc < inner, "説明の行は絵より前に来る");
  assert.match(cell.slice(desc, inner), /<label class="stage-scene-desc-label"/);
});

test("説明はその場で書き直せる（読むだけの札にしない）", () => {
  assert.match(stageHtml, /<textarea class="stage-scene-desc-text" id="stage-scene-desc-text"/);
  assert.match(stageHtml, /maxlength="200"/);
  // 枠を持たず、押したときだけ下線が出る
  assert.match(styleSource, /\.stage-scene-desc-text:focus \{[^}]*border-bottom-color: var\(--brass\)/);
});

test("打っている最中の欄には書き戻さない（変換中の文字が飛ぶため）", () => {
  assert.match(
    stageSource,
    /if \(document\.activeElement !== box && box\.value !== text\) box\.value = text;/,
  );
  assert.match(stageSource, /if \(twin && twin !== document\.activeElement\) twin\.value = scene\.note;/);
});

test("シーンの説明は日英どちらでも出る", () => {
  const context = { window: {} };
  vm.runInNewContext(i18nSource, context, { filename: "stage-i18n.js" });
  assert.equal(context.window.SHOSAI_I18N.text["シーンの説明"], "Scene description");
});

/* ---------- プレゼンと印刷 ---------- */

test("プレゼンの説明は全画面の正面図にだけ描く（書き出す画像には焼き付けない）", () => {
  assert.match(stageSource, /if \(!L\.plan && presenting && target === ctx\) drawSceneCaption\(target\)/);
  assert.match(stageSource, /document\.addEventListener\("fullscreenchange"/);
  assert.match(stageSource, /presenting = document\.fullscreenElement === canvas|const now = document\.fullscreenElement === canvas/);
});

test("プレゼンの見出しはシーン名にする（画面の道具の名前は出さない）", () => {
  const fn = stageSource.slice(stageSource.indexOf("function drawSceneCaption"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.match(body, /const title = \(scene\.title \|\| ""\)\.trim\(\)/);
});

test("説明の帯は絵の拡大・移動に付き合わせない", () => {
  const fn = stageSource.slice(stageSource.indexOf("function drawSceneCaption"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.match(body, /target\.setTransform\(S, 0, 0, S, 0, 0\)/);
});

test("印刷用ページはシーンの説明を見出し付きで絵の前に出す", () => {
  const iDesc = stageSource.indexOf('<p class="desc">');
  const iPics = stageSource.indexOf('<div class="pics">');
  assert.ok(iDesc > 0 && iDesc < iPics, "説明は絵より前");
  assert.match(stageSource, /class="desc-label">\$\{en \? "Scene description" : "シーンの説明"\}/);
});

/* ---------- 舞台上／舞台裏の控え ---------- */

test("舞台から下げるとき、出し直すための置き場所を控える", () => {
  const fn = stageSource.slice(stageSource.indexOf("function toggleSetOnStage"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  // 履歴に残してから控える。順が逆だと「一つ戻す」で控えごと戻せない
  assert.ok(body.indexOf("checkpoint()") < body.indexOf("stashPiece("), "checkpoint が先");
  assert.match(body, /if \(!restoreStashed\(scene, setId, shape\)\) placeSetPiece\(item\)/);
});

test("演者の舞台上／舞台裏も同じ控えで立ち位置を保つ", () => {
  const fn = stageSource.slice(stageSource.indexOf("function toggleCastOnStage"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.ok(body.indexOf("checkpoint()") < body.indexOf("stashPiece("), "checkpoint が先");
  assert.match(body, /stashPiece\(scene, castId, existing\)/);
  assert.match(body, /if \(!restoreStashed\(scene, castId, shape\)\) placeCastPiece\(member\)/);
});

test("消す操作も控えを残す（下げるのと同じ結果にする）", () => {
  const fn = stageSource.slice(stageSource.indexOf("function removeSelected"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.ok(body.indexOf("checkpoint()") < body.indexOf("stashPiece("), "checkpoint が先");
  assert.match(body, /stashPiece\(sc\(\), piece\.setId \|\| piece\.castId, piece\)/);
});

test("控えの鍵は舞台セットと名簿の両方を生きているとみなす", () => {
  const fn = stageSource.slice(stageSource.indexOf("function sweepStashes"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.match(body, /\(project\.sets \|\| \[\]\)\.map/);
  assert.match(body, /\(project\.cast \|\| \[\]\)\.map/);
});

test("照明の組も同じ控えを使い、無いときだけ組んだ置き場へ戻す", () => {
  const fn = stageSource.slice(stageSource.indexOf("function toggleLightGroup"));
  const body = fn.slice(0, fn.indexOf("\n  }\n"));
  assert.ok(body.indexOf("checkpoint()") < body.indexOf("stashPiece("), "checkpoint が先");
  assert.match(body, /if \(restoreStashed\(scene, item\.id, \{ setId: item\.id, type: "light", color: item\.color \}\)\) return;/);
  assert.match(body, /const at = item\.preset \|\| \{ u: 0\.5, v: 0\.5, beam: null \}/);
});

test("控えるのは登録から引き直せないものだけ", () => {
  const m = stageSource.match(/const STASH_KEYS = \[([\s\S]*?)\];/);
  assert.ok(m, "STASH_KEYS がある");
  const keys = m[1].match(/"[a-zA-Z]+"/g).map((s) => s.slice(1, -1));
  ["u", "v", "size", "facing", "pose", "glow", "beam", "route", "locked"].forEach((k) => {
    assert.ok(keys.includes(k), `${k} は控える`);
  });
  // 寸法と色は舞台セットの登録が持ち、高さと支えは置き場所から引き直す
  ["dims", "color", "base", "supportId", "id", "castId", "originId"].forEach((k) => {
    assert.ok(!keys.includes(k), `${k} は控えない`);
  });
});

test("登録を外したら控えも捨てる", () => {
  assert.match(stageSource, /if \(scene\.stashed\) delete scene\.stashed\[setId\]/);
  assert.match(stageSource, /if \(scene\.stashed\) ids\.forEach\(\(id\) => delete scene\.stashed\[id\]\)/);
});

test("行き場のない控えは読み込みのときに掃く", () => {
  assert.match(stageSource, /function sweepStashes\(project\)/);
  assert.match(stageSource, /sweepPhotos\(project\);\s*\n\s*sweepStashes\(project\);/);
});

test("控えは保存にも残り、読み直しても形が揃う", () => {
  assert.match(stageSource, /stashed: normalizeStash\(raw\.stashed\)/);
  assert.match(stageSource, /function normalizeStash\(raw\)/);
});

/* ---------- 平面図の重ね順 ---------- */

test("平面図は床から高い順に重ね、演者を最後に描く", () => {
  assert.match(stageSource, /const planLayer = \(p\) => \(p\.type === "performer" \? 1 : 0\)/);
  assert.match(stageSource, /const topH = \(p\) => finite\(p\.base, 0\) \+ pieceTopLocal\(p\)/);
  assert.match(
    stageSource,
    /\(planLayer\(a\) - planLayer\(b\)\) \|\| \(topH\(a\) - topH\(b\)\)/,
  );
});
