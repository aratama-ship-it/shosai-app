# Overnight Run State

## Status

- Status: PARTIAL
- Last updated: 2026-08-22 JST
- Current wave: close-out after protected-state fingerprint change

## Baseline

- Git root: `shosai-app`; branch `main`; HEAD `373c2df7ed1de5a37395ec32dd9096ce9b32add0`.
- 開始前の完全なdirty状態は `BASELINE_GIT_STATUS.txt` に保存（42行、SHA-256 `b3c6688c3cfac3864ae5735d70a54e8084d12b244a7f68710a70ae4f856ee014`）。このrunディレクトリ自身は開始後に増える許可済み出力であり、基線42行には含まれない。
- tracked diff SHA-256: `ca1eea3867808ae598749cac0e442becafe620961e15f50bcde9883904ead617`; untracked一覧 SHA-256: `02ec95ebabc98580697c88caaf9a6543bea3d071009496a4dec20efe3cbf295a`。
- 保護対象: アプリ、JSON、設定、Git履歴、正本、生成物、公開先。`SHOWS_INVENTORY.md`を含む既存未追跡ファイルは編集しない。

## Completed Waves

- 指定の6文書を読み、P0の既知根拠と前回配置スキャンの2件を把握した。
- run ledgerと開始時dirty状態のスナップショットを作成した。
- P0-1〜P0-3は現行コードとNode回帰テストで、前回指摘の経路が修正済みであることを確認した。
- P0-4はSwiftのorigin制限・navigation制限・共通lock・expected revisionが現行ソースに存在し、Node回帰テストは通過した。Mac buildは一時コピーで成功したが、同コピーのSelf Testは終了コード134で結果JSONを出せなかった。
- `SHOWS_INVENTORY.md`の16 JSONを正しい引数で再走査。新規0、既知allowlist 18（前回の2件を含む）、終了コード0だった。
- Node suite 447 pass / 0 fail / 0 skip、MCP suite 34 pass / 0 fail。`python3 build_stage.py --check`、指定JS構文検査、`git diff --check`も実行した。リポジトリ直下にはpackage.jsonがなく、直下の`npm test`はENOENT（正しい`mcp-server/`で再実行済み）。

## Current Wave

- 開始時以降にtracked diff SHA-256が `ca1eea3867808ae598749cac0e442becafe620961e15f50bcde9883904ead617` から `59952a18f63a3ed3384f1410128669048698ba22cb47a244b1df72293a66ca94` へ変化したため、run directory以外への書込みを伴う追加検証は行わない。

## Next Action

- 最終報告とledgerを検証し、本人にdirty状態の指紋変化とSwift Self Test未完了を渡す。

## Blockers

- 開始時と同じ42件のdirtyパス（run ledgerを除外）のporcelain状態は一致したが、tracked diffの内容指紋が変化した。変更者・変更時点はこの監査から同定できない。
- 一時コピーでMac Self Testを実行すると終了コード134となり、実行結果を得られない。物理iPad/iPhone・PWA・公開環境QAも未実施。
