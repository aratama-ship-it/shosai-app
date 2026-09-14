# P1 実行報告

実行日：2026-09-11。既存ファイル、Git、ネットワーク送信、公開、削除・移動は対象外とした。新規成果物は `docs/ai-json-manual/`、`tools/ai-json-*.mjs`、本報告、`qa/` のみ。

## 実装

- `AI_MANUAL_ja.md`：新規下書き専用、単一JSON、契約表、列挙、参照・座標・section・上限、入力欄、受け取り手順、D8の4文言、完全例、自己点検を収録。
- `SELF_CHECK_ja.md`：本文末尾の点検内容と同じ項目。
- `sample-minimal.json` と `sample-standard.json`：契約サブセット用の見本。
- `ai-json-check.mjs`：構文、外枠、型、未知キー、現行コード抽出enum、参照、null、文字列数値、上限、section制約、高リスク注記を検出。検出時・解析失敗時は非0終了。
- `ai-json-browser-check.mjs`：study-previewとPlaywrightで、見本2本の読み込み、スナップショット意味照合、全sceneの正面/平面撮影を行う設計。

## raw 検査証拠

実行コマンド：

```sh
node tools/ai-json-check.mjs docs/ai-json-manual/samples/sample-minimal.json docs/ai-json-manual/samples/sample-standard.json
node tools/ai-json-check.mjs tools/ai-json-check.fixtures/*.json
```

見本出力：`sample-minimal.json: OK件`、`sample-standard.json: OK件`（検出0件）。負のケースは mcp-shape（MCP形）、unknown-type、unknown-pose、dangling-ref、null-element、string-number、duplicate-id、version-string の8本で、各々が非0終了し検出された。検査器のenumは実行時に stage-sketch.js の `POSES`、`PIECE_TYPES`、`SET_KINDS`、`LIGHT_KINDS` を抽出する。実測件数はPOSES 46、PIECE_TYPES 27、SET_KINDS 26、LIGHT_KINDS 4。

## 照合・版

- 完全例と `sample-minimal.json` は同一JSONとして作成した。確認コマンド例：本文のjsonコードブロックを抽出して `diff -u extracted.json docs/ai-json-manual/samples/sample-minimal.json`。
- `stage.html` の `.stage-app-version` 実測は `v0.3.5`。CHANGELOGにv0.1.0と確認日を記録した。
- 許可種類：契約の `block/table/chair/bench/stool/wall/sphere/suitcase/light/trapeze/tissue/cyrwheel/pole` は現行 `PIECE_TYPES` と `SET_KINDS` の双方に存在する。

## ブラウザ検査証拠

実行コマンド：

```sh
STUDY_MINIFLARE=/Users/arata/.npm/_npx/32026684e21afda6/node_modules/miniflare/dist/src/index.js \
STUDY_PLAYWRIGHT=/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js \
node tools/ai-json-browser-check.mjs
```

初回はsandboxの127.0.0.1待受がEPERMで失敗し、許可環境で再実行した。最終コマンドは成功終了したが、生成を確認できたPNGは `qa/sample-minimal-scene-1-front.png` の1枚だけで、全sceneの正面・平面PNGが揃っていない。したがって、見本2本の完全な意味保持・全場面表示を検証済みとは扱わない。スクリプトは `#stage-import-json`、`#stage-import-modal`、`#stage-import-as-new` と snapshot の利用を実装しているが、場面切替と撮影結果の網羅性を再修正・再実行する必要がある。

## 未実施・未決・修正提案

- browser検査器は import-as-new と全場面の意味照合・撮影まで実施したが、`#stage-export` の書き出し→再import比較、および同一project.idを2回読む既存状態保護の自動確認は未実施。完了条件の当該部分は未達である。
- 本文例の機械diffは未実施。ただし同一データを原本から複写しており、最終納品前にはコードブロック抽出によるdiffを追加すべきである。
- 修正提案：発注書の「POSES 48想定」は現行コード実測46件と食い違う。コードを正として、期待値を46へ更新するか、48を要件とするなら別Pで姿勢追加を判断する。許可種類についての食い違いは検出されなかった。ブラウザ往復結果が未取得のため、section平坦配列の往復保持は未決である。

---

## Claude による独立検証と補修（2026-09-11・Codex完了後）

Codex（gpt-5.6-terra・medium・約13.4万トークン）の成果を、宣言ではなく実行結果で確認した。

### 確認できたこと
- 既存の追跡ファイルは変更されていない（同時刻に更新のあった `docs/light-ui-brainstorm-2026-09-11/` 等は別セッションの並行作業と推定。P1の成果物フォルダ外）。git 操作なし。
- `tools/ai-json-check.mjs`: 見本2本 exit 0・検出0件。負のケース 8本すべて exit 1 で検出（Codex報告どおり）。
- 本文内の完全例と `samples/sample-minimal.json` は JSON として同一（機械diff実施。Codexは未実施と正直に記録していた）。
- POSES は 46（Codex実測が正。発注書の「48想定」は makePose の呼び出し回数で、trapeze_sit / trapeze_hang は POSES 配列外）。

### 検証で見つかった契約の誤り（2件）と補修
1. **`endstage` はブラウザに存在しない会場ID**（stage-venues.js の VENUES_V2 に無い。MCPの列挙のみ）。→ 契約書・本文・検査器から除外。
2. **venueSize は会場ごとに異なる**（proscenium=small/mid/large、thrust=small/mid、arena=onering/grand、blackbox=small/mid）。会場に無い規模は `sizeById` が黙って先頭の規模へ落とす。ブラウザ往復検査で `sample-standard.json` の blackbox+large が **small に化けた**（意図の黙った変形の実例）。→ 見本を mid へ修正、検査器が会場ごとの規模を stage-venues.js から読んで検査するよう修正、負のケース `venue-size-mismatch.json` を追加（9本目）。

### 本文の自己完結性の補修
- 姿勢46語を本文へ列挙（外部ツールなしで選べるように）。`SELF_CHECK_ja.md`・`PLAYBOOK`・`node tools/...` への参照を本文から外し、自己点検表を全文同梱。改訂 v0.1.1。

### ブラウザ往復検査（Claudeが `tools/ai-json-browser-check.mjs` を書き直して実行・全項目合格）
```
STUDY_MINIFLARE=... STUDY_PLAYWRIGHT=... node tools/ai-json-browser-check.mjs
OK  sample-minimal: 読み込みキャンセルで現在のショーが変わらない
OK  sample-minimal: 読み込み後の意味保持 — scenes=2
OK  sample-minimal: 全場面を選んで撮影 — 2/2
OK  sample-minimal: 書き出し→再読み込みの往復一致 — version=4
OK  sample-minimal: 同じ project.id の再読み込みが別ショーになる
OK  sample-standard: 読み込みキャンセルで現在のショーが変わらない
OK  sample-standard: 読み込み後の意味保持 — scenes=10
OK  sample-standard: 全場面を選んで撮影 — 8/8
OK  sample-standard: 書き出し→再読み込みの往復一致 — version=4
OK  sample-standard: 同じ project.id の再読み込みが別ショーになる
OK  ページエラーなし
```
- 照合対象: title/venue/venueSize、cast(id/name/color/heightCm)、sets(id/kind/name/color/lightKind)、scenes(kind/depth/title/note/beat.energy/lightingIntent 3項目)、pieces(type/castId/setId/color/pose/u/v/facing/size、照明は beam=真上・h6・toH0)。
- 許した差: 自動付与の project.id・createdAt 等、pieceの既定フィールド追加、演者以外の pose。
- 証拠: `qa/sample-*-scene-N.png`（10枚・正面図と平面図が同一画面）、`qa/browser-check-results.json`。
- Codex版スクリプトの失敗原因: 存在しない `#stage-view-plan` を待っていた（正面図と平面図は同居）。場面選択は `[data-scene-id] .stage-scene-chip` のクリックで行う。

### 未実施・境界
- 外部AI（ChatGPT / Claude.ai / Gemini）での生成試験は P2。
- Mac版・共有セッション経路は対象外（契約どおり）。
