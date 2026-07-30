# Overnight Run Plan

## Objective

舞台スケッチからVision Pro稽古用のStageDocument schemaVersion 2 JSONを書き出せるようにし、正本仕様のMilestone 1と2を完了する。

## Scope

- Working directory: `/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`
- Writable paths: `stage-rehearsal-export.js`、`tests/`、`stage-sketch.js`、`stage-i18n.js`、`style.css`、`index.html`、`stage.html`、`mcp-server/src/`、`mcp-server/test/`、この実行台帳
- Baseline: `main` の `9ffc4c3`。開始時から `README.md` と `db.js` は変更済み、`.codex/`、`.mcp.json`、`docs/` は未追跡

## Definition of Done

- DOM・localStorage非依存の変換器と、正本仕様5節の必須10項目を覆うNodeテストがある
- version 3の`project.rehearsal`と`scene.rehearsal`がブラウザ保存・JSON入出力・MCP作成更新経路で保持される
- シーンの開いている行に「留まる」「次へ移動」の秒数入力がある
- 保存パネルから通常JSONを置き換えず、検査結果・省略項目・非対応劇場の選択を示して稽古用JSONを書き出せる
- 指定されたJS構文検査、Nodeテスト、MCPテスト、`build_stage.py`生成確認が成功する
- Milestoneごとに日本語のコミットを作り、pushしない

## Allowed Actions

- プロジェクトファイルと適用規約を読む
- 指定されたMilestone 1と2の範囲だけを編集する
- ローカルの構文検査、テスト、ビルド生成、Gitコミットを実行する
- 名前を指定して対象ファイルだけをstageする

## Prohibited Actions

- push、deploy、公開、外部メッセージ、購入、secret変更をしない
- ユーザーデータを削除しない
- visionOS側のコードを変更しない
- 音源バイナリを埋め込まない
- 既存のversion 3書き出しやMCPの基本挙動を置き換えない
- 開始時からある未コミット変更を今回のコミットへ混ぜない

## Stop Conditions

- 仕様の方向を変える必要が出た場合は台帳へ記録して停止する
- baselineが予期せず変わった場合は書き込みを止め、差分を確認する
- 一部が阻害されても、独立して安全に進められる検証と実装は続ける

## Team

- Coordinator: スコープ、wave、停止判断、最終報告
- Explorer: 正本仕様、既存ブラウザ保存経路、Vision Pro入力契約の読み取り
- Writer: このCodexセッションのみ
- Verifier: 各wave後に差分と指定コマンドを独立して再確認する同一セッションの検証工程

## Verification

- `node --check` で対象の全JavaScriptを検査
- `node --test tests/stage-rehearsal-export.test.mjs`
- `cd mcp-server && npm test`
- `python3 build_stage.py`
- `python3 build_stage.py --check`
- 実行台帳をactive/finalの両段階で`validate_run.py`に通す
