# 発注書N: 使いかたの冊子への導線と、アプリ内「使い方をさがす」検索

作成 2026-08-27・Claude（仕様確定済み・本人承認済み）。実装担当: Codex。
このファイル単体で作業できるように書いてある。**着手前に対象ファイルを必ず読むこと。**

## 背景（1分で）

- テスター配布用マニュアルの正本が `manual/manual-content.js`（構造化データ・全10章35節）にあり、
  `manual/manual.html` がそれを「冊子」として描画する。どちらも実装済み・ローカル確認済み。
- 本人要望: **アプリ内からも冊子へ飛べて、さらにアプリ内で「使い方検索」ができること。**
- 検索ロジックと本文は一元管理にする。本文= `MANUAL_CONTENT`、検索= `MANUAL_FIND`（今回追加）。
  アプリ側にも冊子側にも、本文や検索ロジックの複製を書かないこと。

## 対象

`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/`
（パスに空白があるので引用符必須。このMacでは node は `~/.local/node/bin/node`）

## やること

### 1. `manual/manual-content.js` — 共通検索関数を足す

ファイル末尾に `window.MANUAL_FIND(query)` を追加する。純関数。

- 入力: 検索文字列。`trim → toLowerCase → normalize("NFKC")` し、空白（全半角）で語に分割。
- 全語AND一致した節の id を、章順・節順のまま配列で返す。クエリが空なら `[]`。
- 照合対象: `title` ＋ `keywords` 結合 ＋（`noindex` が真でない節のみ）`html` のテキスト。
  htmlのテキスト化はDOM不要の `html.replace(/<[^>]*>/g, " ")` でよい（テスト環境でも動かすため）。
- `MANUAL_CONTENT` 本体の構造・本文は**一切変えない**。

### 2. `manual/manual.html` — 内蔵検索を `MANUAL_FIND` へ寄せる

`applyFind` 内の照合部分を `MANUAL_FIND` 呼び出しに置き換える（返ってきた id 集合に
入っていない `.sec` を隠す）。見た目・件数表示・0件文・タブ・リンク挙動は現状維持。
`dataset.find` / `dataset.findBody` の仕込みは不要になるので消してよい。

### 3. `index.html` — 導線とモーダルを足す（書斎の他タブには触らない）

1. stage系スクリプト群に `<script src="manual/manual-content.js?v=1"></script>` を追加。
   **位置は `stage-sketch.js` の script タグより前。** `build_stage.py` の SKIP_JS には入れない
   （入れなければ stage.html へ自動で継承される。build_stage.py 冒頭コメント参照）。
2. 設定モーダル内 `.stage-prefs-links`（「案内とサポート」）のボタン並びを次にする:
   〈使い方〉〈使い方をさがす〉〈使いかたの冊子〉〈このアプリについて〉〈感想を送る〉。
   新規2つの id は `stage-help-open`（使い方をさがす）と `stage-manual-open`（使いかたの冊子）。
   class は既存の `stage-about-link` に合わせる。
3. 新モーダルを追加: `stage-help-backdrop` ＋ `stage-help-modal`。
   既存の `stage-reach-modal`（端末による違い）の構造・クラス・aria属性・✕ボタンの作法を踏襲。
   中身は上から: 見出し「使い方をさがす」、検索入力 `stage-help-find`
   （type=search、placeholder は「例：保存 ／ 消えた ／ 盆」）、結果領域 `stage-help-results`、
   案内行 `stage-help-note`（空クエリ時と0件時の文言をここに出す）。

### 4. `stage-sketch.js` — 配線

- `els` に新要素を登録。
- `stage-manual-open`: `window.open("manual/manual.html", "_blank", "noopener")`。
- `stage-help-open`: 設定モーダルを閉じて（`closePrefs()` 相当の既存作法）ヘルプモーダルを開き、
  入力へフォーカス。開閉・backdrop・Esc・✕・フォーカス戻しは既存モーダル（reach等）の作法を踏襲。
- 入力のたび `window.MANUAL_FIND(値)` で節idを取り、`MANUAL_CONTENT` から該当節を描画:
  章タイトル（小さく）＋節見出し（`tags` があれば「PCのみ」等の小さな札を添える）＋本文HTML＋
  「冊子で読む」リンク（`manual/manual.html#節id`、target="_blank" rel="noopener"）。
  - クエリ空: 結果を消し、案内行に「言葉を入れると、冊子から該当箇所だけを出します。」
  - 0件: 案内行に「見つかりませんでした。別の言い方でもう一度どうぞ。」＋冊子を開くリンク。
- `window.MANUAL_CONTENT` か `window.MANUAL_FIND` が無い場合（読み込み失敗）: ボタンを押しても
  壊れず、「冊子を読み込めませんでした。ページを再読み込みしてください。」を案内行相当に出す。
- 本文HTMLは自作データなので innerHTML 描画でよい（既存の reach モーダルと同等の扱い）。

### 5. `style.css` — 必要最小限だけ

結果領域の余白・区切り程度。既存モーダルの見た目を踏襲し、新しい装飾を発明しない。

### 6. `stage-i18n.js` — 新ラベルの英訳

既存の流儀（日本語キー→英語値）で追加: 「使い方をさがす」「使いかたの冊子」
「例：保存 ／ 消えた ／ 盆」「言葉を入れると、冊子から該当箇所だけを出します。」
「見つかりませんでした。別の言い方でもう一度どうぞ。」「冊子で読む」「冊子を開く」
「冊子を読み込めませんでした。ページを再読み込みしてください。」
**マニュアル本文（MANUAL_CONTENT）の英語化はしない**（今回の範囲外）。

### 7. キャッシュと版上げ（忘れると配布先で旧JSが動き続ける）

- `stage-sw.js`: `APP_SHELL` へ3行追加
  `"./manual/manual-content.js?v=1"` / `"./manual/manual-content.js"` / `"./manual/manual.html"`
  （冊子ページ自身は `?v=` 無しで content.js を参照するため、素のURLもキャッシュに置く）。
- `CACHE_NAME` を `stage-sketch-pwa-v153` → `v154` へ。
- `stage-sketch.js` を触るので `?v=298` → `?v=299`（index.html と APP_SHELL の両方）。
  `style.css` を触ったら `?v=204` → `?v=205`（同じく両方）。stage-i18n.js も同様に版上げ。
- 配信除外（`.assetsignore`）は変更不要（`manual/` はどのパターンにも当たらない＝認証内で配信される）。

### 8. ビルド

`python3 build_stage.py` を実行して `stage.html` を作り直す（index.html を触ったら必須）。

### 9. 回帰テスト `tests/stage-manual-help.test.mjs` を新規作成

既存 `tests/stage-about.test.mjs` の流儀（node:test ＋ ソース読み＋vm評価）で:

1. `manual/manual-content.js` が vm で評価でき、章が10、全節に id/title/keywords/html があり、
   節idに重複が無い。
2. `MANUAL_FIND("消えた")` の結果が `lost` と `feedback` を含み、`how-to-read` を含まない。
   `MANUAL_FIND("")` は空配列。
3. `index.html` と `stage.html` の両方に `stage-help-open` / `stage-manual-open` /
   `manual/manual-content.js?v=1` が含まれる（stage.html への継承をビルド後の実物で確認）。
4. `stage-sw.js` の `APP_SHELL` に manual の3エントリがあり、`CACHE_NAME` が `v154`。
5. `.assetsignore` に `manual` を除外する行が無い。
6. 上記6のラベルが `stage-i18n.js` に登録されている。

## 制約

- 既存ファイルは**編集前に必ず読む**（他エージェントが触っている前提。勝手に巻き戻さない）。
- **ファイルの削除・移動はしない。** リネームもしない。
- 書斎側（他タブのHTML・db.js・app.js等）と `FEEDBACK_URL`・ツアー（TOUR）には触らない。
- `MANUAL_CONTENT` の本文・構造を変えない（文言の改善提案があれば実装せず報告に書く）。
- パスの空白に注意し、コマンドでは引用符を徹底する。

## 完了条件（検証可能な形で）

1. `~/.local/node/bin/node tests/index.mjs` が全件通過（既存586件＋新規）。
2. `python3 build_stage.py --check` が「作り直し不要」（終了コード0）。
3. `grep -c "stage-help-open" stage.html` が1以上。
4. 変更ファイル一覧と、やったこと・やらなかったことを短く報告する。
