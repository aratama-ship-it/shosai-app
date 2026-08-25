# Overnight Run Plan

## Objective

現行Stage SketchのP0-1〜P0-4を独立に読み取り再監査し、修正を行わず、根拠・実行結果・リリース判定を残す。

## Scope

- Working directory: `/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`
- Writable paths: `overnight-runs/2026-08-22-stage-sketch-release-reaudit/` のみ
- Baseline: `main` / `373c2df7ed1de5a37395ec32dd9096ce9b32add0`; 開始時の完全なporcelain状態は `BASELINE_GIT_STATUS.txt`（42行、SHA-256 `b3c6688c3cfac3864ae5735d70a54e8084d12b244a7f68710a70ae4f856ee014`）。tracked diff SHA-256 `ca1eea3867808ae598749cac0e442becafe620961e15f50bcde9883904ead617`、untracked一覧 SHA-256 `02ec95ebabc98580697c88caaf9a6543bea3d071009496a4dec20efe3cbf295a`。

## Definition of Done

- 各P0を `confirmed` / `changed` / `not-reproduced` / `要確認` で根拠ファイル・行番号・実行コマンドとともに示す独立報告を完成する。
- `SHOWS_INVENTORY.md`の16 JSONに配置スキャンを実行し、前回の2件との一致/相違を記録する。
- 非破壊のテスト・構文・check mode・`git diff --check`を実行し、物理端末・公開状態と分離した上で `release: block / conditional / pass` を一つ決める。

## Allowed Actions

- Read project files and applicable instructions.
- 読取用のソース走査、既存テスト、構文検査、`python3 build_stage.py --check`、`git diff --check`、JSON配置スキャンを実行する。
- 出力するMac buildはプロジェクトを変更せず、必要なら一時コピー上だけで実行する。
- レポート・状態・基線スナップショットをこのrunディレクトリだけへ書く。

## Prohibited Actions

- Do not push, deploy, publish, send external messages, purchase, or change secrets.
- Do not delete user data.
- アプリ、JSON、設定、Git履歴、正本、生成物、公開先、Secret、鍵へ書き込まない。
- commit、push、deploy、公開確認、外部連絡、予約、Secret変更・鍵ローテーションは行わない。
- 物理iPad/iPhone QA、ブラウザ相当QA、ローカル実装、公開状態を混同しない。

## Stop Conditions

- 修正や公開を必要とする判断は本人へ残し、実装しない。
- 開始時の既存42行のdirty状態に、runディレクトリ以外の新規差分が加わったら停止して記録する。
- buildは一時コピー以外で実行しない。物理端末・本番確認がない限り `pass` としない。

## Team

- 単独実行（サブエージェントなし）。Coordinator/Explorer/Verifierを順に担い、Writerはrun ledgerのみを更新する。

## Verification

- P0根拠のファイル/行番号確認、既存テスト、構文検査、`python3 build_stage.py --check`、`git diff --check`、配置スキャン、最終Git状態指紋、`validate_run.py --final`。
