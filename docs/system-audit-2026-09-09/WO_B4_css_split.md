# 発注書 WO-B4: style.css の重複統合と舞台スケッチ分の分離（2026-09-09・未着手）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/style.css`（12,804行・318KB・gzip 68KB）。

## 事実（`B4_css_duplicate_selectors.md`）

- トップレベルで2回以上定義されたセレクタ 19種（余分な規則ブロック 20）。`!important` 26件（行番号は同文書）。
- セレクタ 1,921種のうち `stage`/`fpv`/`venue` を含むもの約1,040種。書斎（資料棚・名簿・机・スクラップブック）と1ファイル。
- 体験版 `public-dist/style.css` は全量コピー（312KB）。

## 第1段: 重複19件の統合（低リスク・先に単独で）

1. 各重複について**後ろの定義を正**とし、前の定義と突き合わせる。前にしか無い宣言があれば後ろへ移す（カスケードの結果が変わらないように）。
2. 1件ずつ、`stage.html`／`index.html` の該当要素で `getComputedStyle` が変わらないことを確認する（下の受け入れ条件の自動比較で担保）。
3. `!important` は今回触らない（26件の理由を個別に見る必要があり、判断を含む）。

## 第2段: 舞台スケッチ分の分離

1. `style.css` を `style.css`（書斎＋共通）と `stage.css`（舞台スケッチ専用）に分ける。分け方は機械的に:
   セレクタに `.stage-`／`.fpv-`／`.venue-`／`#stage-` を含む規則ブロック（`@media` 内も同様）を `stage.css` へ。
   `.rail-heading` のように両方が使う共通規則は `style.css` に残す。
2. `stage.html`（＝`build_stage.py` の雛形）は `style.css` と `stage.css` の両方を読む。`index.html` も両方読む
   （書斎の中から舞台スケッチを使うため）。**読み込み順は style.css → stage.css** を固定（同名セレクタの上書き順を保つ）。
3. `build_public.py` は両方をコピーする（体験版は書斎分を持たないので、将来 `style.css` を「共通だけ」に減らせる余地を残す。今回は減らさない）。
4. `?v=` は `stage.css?v=1` から。`stage-sw.js` の APP_SHELL（B-2 の生成器がある前提）、`worker.js` の `GUEST_STAGE_ASSETS` に追加。

## 受け入れ条件（自動比較）

- `tests/stage-css-split.test.mjs`（新規、ブラウザ不要の部分）: `stage.css` に書斎専用セレクタ（`.shelf-`、`.roster-`、`.desk-`、`.scrapbook-`）が0件、
  `style.css` に `.stage-` 規則が0件（共通で残すものは許可リストに明記）。
- **計算済みスタイルの同一性**（ローカルHTTP＋ヘッドレスブラウザ。手順は `docs/script-cues-2026-09-09/verify-local-http.mjs` に準ずる）:
  分割前後で `stage.html`（PC幅1440・iPad 1024・スマホ390、日英）と `index.html` の全要素について
  `getComputedStyle` の全プロパティを辞書化して比較し、差分0。差分があれば要素・プロパティを全件列挙して報告。
- `design/DESIGN_LINT_FINDINGS_2026-08-30.md` の lint を再実行して NG が増えていない。
- 配信量の実測（gzip 前後）を報告。

## 注意

- `style_backup_*.css` は参照しない（退避コピーであり正本ではない）。
- 分割の最中に見た目を「ついでに」直さない（同一性比較が壊れる）。直したいものは別途起票。
