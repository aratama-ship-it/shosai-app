# 夜間ラン: 制作の書斎.app の殻とブリッジ

開始: 2026-08-09 03:05 JST / 終了目安: 07:30 JST
最終検証開始: **06:30 JST**（この時刻以降、新しいwaveを開始しない）
設計書: [`../../docs/MAC_APP_DESIGN.md`](../../docs/MAC_APP_DESIGN.md)

## 本人の事前承認（2026-08-09 03:00 JST）

- アプリは1つ `制作の書斎.app`（`index.html` を開く）
- 夜間の範囲は**殻＋ブリッジまで**。AI欄のUIは作らない
- **commitもpushもしない**
- Codex CLIの利用を許可（逐次実行、同時は1つ）。終了条件は「全テストパスまたは停止条件到達」
- **予備キューは承認されていない。** 本命が早く終わったら最終検証へ進み、新しい作業を始めない

## preflight（2026-08-09 03:02 JST / profile=generic）

- FAIL 0 / WARN 1 / PASS 2
- **承知の上で開始したWARN**: キャッシュ以外の同期競合コピー11057件を検出。
  先頭は `show-reference/obsidian/作品/Humans 2.0.md` で、これは作品名「Humans 2.0」の
  正規のファイル名に見える（誤検出の可能性が高い）。**削除も移動もしない。本人へ報告する。**
  今回の作業対象は `shosai-app/mac-app/` 配下の新規作成が中心のため、影響は小さいと判断した。

## 保護対象（触らない）

- 本人の未コミット変更: `stage-venue-editor.js` / `stage-venue-lines.js` / `stage-venues.js` /
  `style.css` / `build_stage.py` / `stage-i18n.js` / `index.html`（版番号行を除く）
- `db.js` / `show-reference/` / 研究DB / 名簿の実データ
- `.stage-sketch-mcp/` 配下の既存JSON（読むだけ。書き換えない）

## ラン開始時の記録

- Git HEAD: `210b6b9`
- 未コミット変更あり（上記の保護対象）。**commitしないため、この状態を維持する**
- テスト基準: ブラウザ側 150 passed / MCP側 18 passed

## Primary Wave Queue

### Wave 1 — 殻とスキームハンドラ
`mac-app/` を作り、`shosai://app/` でディスク上の `shosai-app/` を配信するWKWebViewの窓を作る。
`--self-test` モードを同時に作る。ディレクトリ外アクセスの拒否を含む。
**完了条件**: ビルド成功、`--self-test` の項目1・2・5・6が通る。

### Wave 2 — ブリッジ
`window.stageSketchBridge` を注入し、`listEditExports` / `readExport` / `onEditAvailable` /
`runAgent` を配線する。`exports/` の監視（FSEvents＋30秒ポーリング併用）を含む。
`stage-pwa.js` にService Worker登録の抑止分岐を入れる。
**完了条件**: `--self-test` の全6項目が通る。既存テストが引き続き全て通る。

### Wave 3 — 移行機能と手順書
書斎側に一括の書き出し／読み込みがあるか調査し、無ければ追加する（ブラウザ版にも入る形で）。
`docs/MAC_APP_MIGRATION.md` を書く。
**完了条件**: 移行の往復がテストで通る。手順書がある。

### Wave 4 — 最終検証（06:30以降はこれのみ）
`--self-test`、`node --test tests/*.test.mjs`、`mcp-server` の `npm test` を実行。
`git status` が保護対象を壊していないことを確認。`REPORT.md` を書く。

## Reserve Queue

**なし（本人が承認していない）。** 本命が早く終わった場合は Wave 4 の最終検証へ進み、
残り時間があっても新しい作業を始めない。

## 停止条件（Codexが推測で埋めずに止まる分かれ道）

- 設計書の方式では実現できないことが判明したとき（特にカスタムスキームとCORSの扱い）
- 保護対象のファイルを変更しないと進めないとき
- デザイン・文言・分類など本人の判断が要る選択に当たったとき
- 既存テストが落ち、原因が設計書の矛盾に見えるとき

止まった場合は `STATE.md` へ理由を記録し、次のwaveへ進まず報告する。

---

以下は `overnight-project-runner` の台帳検証に使う見出し対応表であり、上記の承認内容・
wave範囲・停止条件を変更しない。

## Objective

- 「制作の書斎.app」の殻と安全なJS↔Swiftブリッジを、Wave 1・2の範囲で完成させる。

## Scope

- 主な新規作成は `mac-app/`。既存Web資産はディスク上の同一実体を読む。
- `stage-pwa.js` のService Worker抑止分岐と `.gitignore` のビルド成果物追記だけを既存ファイルの例外変更とする。

## Definition of Done

- Wave 1・2と最終検証（Wave 4）の完了条件は上記Primary Wave Queueに従う。Wave 3には進まない。

## Allowed Actions

- Swift/Xcode/Node/npmによるローカル実装・ビルド・テストと、ラン台帳の更新。

## Prohibited Actions

- commit、push、公開、配布、削除、移動、改名、AI欄UIの作成、保護対象への変更を行わない。

## Stop Conditions

- 上記「停止条件」に従い、該当時は `STATE.md` へ記録して停止する。

## Team

- 単一writerで順次実装し、各waveの後に別工程として差分監査と検証を行う。

## Verification

- `.app` ビルド、`--self-test`、`node --test tests/*.test.mjs`、`cd mcp-server && npm test`、保護対象ハッシュとGit差分を確認する。
