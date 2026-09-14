# 発注書 WO-B3: `isEn() ? … : …` の三項演算子を辞書参照へ寄せる（2026-09-09・未着手）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/stage-sketch.js`・`stage-set-builder.js`・`stage-i18n.js`。

## 事実

- 文字列リテラル同士の三項演算子 **154件**（`B3_isEn_ternary_sites.md` に行番号・日本語・英語の表）。式や複数行を含むもの **9件**は同表末尾に行番号のみ。
  `stage-set-builder.js` にも4件。
- 既存の仕組み: `stage-i18n.js` の `TEXT`（989鍵・日本語→英語）、`MAPS`、`SAY`（`announce()` の文型変換）。
  `stage-sketch.js` 2875行 `const tx = (ja) => (isEn() && I18N.text[ja]) || ja;` が TEXT の参照口。
- 仏・簡体・繁体の辞書ドラフト（`i18n-prep/`）は TEXT 989鍵と一致済み。三項演算子の英語は**ドラフトに含まれていない**＝第3言語で欠落する。

## 仕様

1. 表の154件を機械的に置換: `isEn() ? "EN" : "JA"` → `tx("JA")`。同時に `stage-i18n.js` の `TEXT` に `"JA": "EN"` を追加
   （既に同じ鍵があれば追加せず、値が違えば**置換せずに報告**して本人判断）。
2. テンプレートリテラルで名前や数を埋めるもの（例: `` `Saved “${state.project.title}”.` ``）は `tx` ではなく **`SAY` の型**へ
   （`announce()` と同じ正規表現の対に日本語を通す）。9件の手動分と、表のうち `${` を含む行はこちら。
3. `isEn()` 自体と `setLang`、`I18N.text` の構造は変えない（第3言語の値域拡張は別発注）。
4. 置換後、`stage-sketch.js` に残る `isEn() ?` は**0件**（`grep -c 'isEn() *?' stage-sketch.js`）。`isEn()` の他用途（分岐・フォーマット）は残ってよい。
5. `i18n-prep/stage-i18n.fr.draft.js` 等のドラフトへは触らない。追加した鍵の一覧を `i18n-prep/NEEDS_REVIEW.md` の末尾に「2026-09-XX 追加鍵（未訳）」として追記する。

## テスト（完了条件）

- `tests/stage-i18n-coverage.test.mjs`（既存）が緑。TEXT に追加した鍵がすべて日本語UIから到達可能であること（同テストの走査で確認）。
- `tests/stage-i18n.test.mjs` に1件追加: `stage-sketch.js` の `isEn() ?` が 0 件であることを固定（戻り防止）。
- 英語UIの見え方が変わらないこと: 置換前後で `stage.html?lang=en` を開き、`document.body.innerText` の差分が空
  （`docs/guest-access-2026-09-08/verify-local-http.mjs` に近い手順のローカルHTTP＋ブラウザで実測。差分があれば全件列挙して報告）。
- `node tests/index.mjs` 全件緑。

## Codex 向きの理由

仕様が閉じており、判断は「同じ鍵で英語が食い違う」時だけ。手数は多い（154件）。推奨モデル Sonnet 相当。
