# P3＋P4B 実行報告

実行日: 2026-09-11。発注書と契約 P0 §10 に従い、`stage-sketch.js`、`stage.html`、`index.html`、`build_stage.py`、`worker.js`、`mcp-server/`、既存 docs は変更していない。Git 操作、ネットワーク送信、公開、削除・移動も行っていない。

## 成果物

- `tools/ai-json-check-core.mjs`: I/Oなしの `validate(doc, enums)` と `buildFixRequest(errors)`。エラーは `changes-figure` / `contract` を持つ。
- `tools/ai-json-check.mjs`: core を呼ぶCLIの薄い皮。既存の引数、標準出力、終了コード、`--json` の errors文字列配列を維持した。
- `tools/build-ai-json-page.mjs`: 現行 `stage-sketch.js` / `stage-venues.js` / `stage.html`、マニュアル、見本から `public/ai-json/` を生成する。必須抽出位置・4会場・POSES 46件を確認できなければ非0停止する。
- `public/ai-json/`: 日本語の単一ページ、ブラウザ用の自己完結bundle、マニュアルと見本の複写、配置README。外部スクリプト、外部フォント、送信はない。`file://` で動作する。
- `tools/ai-json-page-check.mjs` と `docs/ai-json-manual-2026-09-11/qa-p3/`: file:// のPlaywright検証とPC/390pxの初期・OK・NGスクリーンショット。

## 検証証拠

### 1. CLI回帰

```text
$ node tools/ai-json-check.mjs docs/ai-json-manual/samples/sample-minimal.json docs/ai-json-manual/samples/sample-standard.json
docs/ai-json-manual/samples/sample-minimal.json: OK件
docs/ai-json-manual/samples/sample-standard.json: OK件
exit 0

$ node tools/ai-json-check.mjs tools/ai-json-check.fixtures/*.json
dangling-ref / duplicate-id / mcp-shape / null-element / string-number /
unknown-pose / unknown-type / venue-size-mismatch / version-string: 全9本がNGを出力
exit 1
```

### 2. core分類

`chatgpt-1-1.json` は参照切れ6件すべて `changes-figure`。`gemini-1-1.json` は実測39件の内訳が、色書式37件 `changes-figure`、高リスク装置の安全注記不足2件 `contract` だった。P2台帳の「色39件」は総件数の表現であり、契約 §10 の「安全注記は規約違反」とは両立しないため、後者に従った。

`chatgpt-1-2.json`、`gemini-1-2.json`、`claude-1-1.json`、`sonnet-1-1.json`、`sonnet-2-1.json` は core で0件を確認した。

### 3. ブラウザ（file://、Playwright/Chrome）

コマンド:

```sh
STUDY_PLAYWRIGHT=/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js \
node tools/ai-json-page-check.mjs
```

結果: 本文コピー対象は正本と一致、ChatGPT 6/6、Gemini 色37/37＋規約2、修正依頼文は共通関数と一致、見本は点検OK、構文エラーは行・列を表示、PC/390pxともページエラーなし。詳細は `qa-p3/browser-check-results.json`。

スクリーンショット: `initial-pc.png` / `ok-pc.png` / `ng-pc.png`、`initial-390.png` / `ok-390.png` / `ng-390.png`。

### 4. 版・enum・複写

- 対応アプリ版: `stage.html` 実測 `v0.3.5`
- 本文版: `AI_MANUAL_ja.md` 見出し `v0.2.3`
- enum: POSES 46、PIECE_TYPES 27、SET_KINDS 26、LIGHT_KINDS 4
- `cmp docs/ai-json-manual/AI_MANUAL_ja.md public/ai-json/AI_MANUAL_ja.md` は一致（各12,155 bytes）。

### 5. 再現性

`node tools/build-ai-json-page.mjs` を連続2回実行し、生成物をファイル名順SHA-256で比較した結果は差分なし（`cmp` exit 0）。

## 未決・停止した項目

- `worker.js:193-216` はゲスト配信を明示allowlistに限定している。`/public/ai-json/` をゲストへ公開するには同ファイルの変更が必要だが、発注書の停止条件と禁止対象に従い変更していない。本人用の認証済み経路では `wrangler.toml` の `[assets] directory = "."` により `/public/ai-json/index.html` に置かれる。
- LP、保存パネルからの導線は別セッション編集中のため付けていない。`public/ai-json/README.md` に配置と未決を記録した。
- 実機・本番配信・人による内容/視覚の最終受容は未実施。今回の確認はローカル file:// のChrome表示と自動操作まで。

---

## Claude による独立検証（2026-09-11・Codex完了後）

Codex（gpt-5.6-terra・medium）の報告を、宣言ではなく再実行で確認した。

### 確認できたこと
- **禁止ファイルは Codex に変更されていない**。Codexログの `diff --git` は5本のみ（`tools/ai-json-check-core.mjs` / `ai-json-check.mjs` / `ai-json-page-check.mjs` / `build-ai-json-page.mjs` / 本報告）。`stage-sketch.js`(14:18)・`stage.html`/`index.html`(14:21) は同時刻に更新されているが、**並行セッション（光の動きスケッチ／light-rig-design-2026-09-11、同フォルダ index.html が 14:19）によるもの**で、Codexログに該当する書き込みはない。
- CLI回帰: 見本2本 exit 0、fixtures 9本すべて exit 1（初回の自己検証では zsh の `$(...)` が `$?` を上書きして全て0に見えた。取り直して確認済み）。
- core 分類（Claudeが直接 import して実行）: chatgpt-1-1 = 6件すべて「図が変わる」／gemini-1-1 = 39件のうち色37件「図が変わる」・安全注記2件「規約違反」／他7本すべて0件。Codex報告と一致。
- ビルド: 連続実行で差分なし。さらに**並行セッションが stage-sketch.js を更新した後に再ビルドしても、Codex生成物と差分なし**（enumドリフトなし＝POSES等は変わっていない）。
- ページ検証（Claudeが実行）: 8項目すべて OK（本文一致・ChatGPT 6/6・Gemini 37+2・修正依頼文一致・見本OK・構文エラーの行列表示・PC/390px ページエラーなし）。
- 修正依頼文の実物を確認。P2 で実際に効いた文面と同じ書式（「検査器の結果です。修正版の完全JSONを返してください。説明文やコードフェンスは付けず…」＋パス付き一覧）。
- 生成物 76KB、外部送信なし、file:// で動作。

### 残る判断（本人）
1. **ゲストへ公開するか**。`worker.js:193-216` の allowlist 変更が要る。worker.js は現在ほかの変更も載っている未コミット状態なので、変更するなら単独の小さな発注にする。
2. **導線**（LP・保存パネル・マニュアルの受け取り手順）。マニュアル側の一文追加だけなら本体を触らずできる。
3. Claude.ai 課題2（P2 6/6）は claude.ai のサインイン待ち。
