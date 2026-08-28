import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

/* 共有セッションの全文言が英語にできることを静的に検査する。
 * stage-session.js の日本語リテラルを抜き出し、TEXT（完全一致）か
 * SAY（型変換）のどちらかで必ず引けることを確かめる。
 * 新しい文言を足して訳を忘れると、ここで止まる。 */

const sessionSource = await readFile(new URL("../stage-session.js", import.meta.url), "utf8");
const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");

const context = { window: {} };
vm.runInNewContext(i18nSource, context, { filename: "stage-i18n.js" });
const TEXT = context.window.SHOSAI_I18N.text;
const SAY = Array.from(context.window.SHOSAI_I18N.say);

const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;

function literalsOf(source) {
  /* コメントを落としてから、"…" のリテラルだけ拾う（テンプレート文字列は
     変数を含むので SAY 側の責務。ここでは固定文言の取りこぼしを見る） */
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const found = new Set();
  for (const match of stripped.matchAll(/"([^"\\]*)"/g)) {
    const value = match[1];
    if (japanese.test(value)) found.add(value);
  }
  return Array.from(found);
}

test("共有セッションの固定文言はすべて TEXT で英語にできる", () => {
  const missing = literalsOf(sessionSource).filter((value) => !TEXT[value]);
  assert.deepEqual(missing, [], `英訳が無い: ${missing.join(" / ")}`);
});

test("共有セッションの合成文（テンプレート）は SAY で英語にできる", () => {
  /* 変数を含む文は、実際に組み上がる代表例で SAY を引けること */
  const samples = [
    "いま操作中: Mina",
    "切断しました。3秒後に再接続します（2/5）。",
    "セッションを開始できませんでした（HTTP 503）。",
    "セッションを開始できませんでした（Unknown error）。",
  ];
  samples.forEach((sample) => {
    const hit = SAY.find(([pattern]) => pattern.test(sample));
    assert.ok(hit, `SAYに型が無い: ${sample}`);
    const english = sample.replace(hit[0], hit[1]);
    assert.notEqual(english, sample, `置換が効いていない: ${sample}`);
    assert.doesNotMatch(english, japanese, `英訳に日本語が残る: ${english}`);
  });
});

test("会場エディタの寸法・観客帯の文も SAY で英語にできる", () => {
  const samples = [
    "間口 だいたい12m ・ 奥行 だいたい8m",
    "天井まで だいたい+3.0m",
    "天井まで だいたい-0.5m（天井高を超える見込み）",
    "辺 2 の観客 ・ 深さ だいたい3.5m",
    "角を移動中 ・ 間口 だいたい11m ・ 奥行 だいたい7.5m",
    "辺 だいたい6m ・ 間口 だいたい12m ・ 奥行 だいたい8m",
    "観客の帯の深さ だいたい2.5m",
  ];
  samples.forEach((sample) => {
    const hit = SAY.find(([pattern]) => pattern.test(sample));
    assert.ok(hit, `SAYに型が無い: ${sample}`);
    const english = sample.replace(hit[0], hit[1]);
    assert.doesNotMatch(english, japanese, `英訳に日本語が残る: ${english}`);
  });
});

test("小道具の形の選択肢は TEXT で英語にできる", () => {
  ["箱", "傘", "クラブ", "ボール", "リング", "棒", "刀", "本", "シルクハット", "ランタン", "旗"]
    .forEach((shape) => assert.ok(TEXT[shape], `英訳が無い: ${shape}`));
});
