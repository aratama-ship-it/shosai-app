# 夜間ラン: 採る後の演者編集不能の修正 ＋ データ移行

開始: 2026-08-10 00:15 JST / 最終検証開始: 06:30 JST（以降は新waveを開始しない）
本人指示（就寝前）: 「AIで追加した演者が演者の欄におらず編集もできない。人間の手で追加したのと
同じ状態になるよう直す」「③データ移行も終わらせておく」

## Objective

AI指示で演者を追加して「採る」を押した結果を、人間が追加した場合と同じ編集可能な保存済みショーにする。
あわせて、保護対象を壊さずに可能な範囲でブラウザ側データ移行を完了し、朝に再現可能な検証証拠を残す。

## Scope

- Working directory: `/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`
- Writable paths: 上記チェックアウト内。診断データは一時ディレクトリだけに書く。
- Baseline: branch `main`, HEAD `7c033aa`。開始時の既存変更は `STATE.md` に記録する。

## Definition of Done

- `--diagnose-adopt` が実AI・実データを使わずに「頼む→下書き→採る→棚へ保存」を再現し、3秒後・8秒後の状態、例外、段階ログを出力する。
- 原因を特定できた場合だけ最小修正し、採用後に棚が増え、新ショーへ切り替わり、castの新演者を編集・移動でき、下書き表示が消え、元ショーが残る。
- 回帰テストを追加し、指定された build / self-test / diagnose-adopt / Node / MCP / build_stage 検証を実行する。
- データ移行は読み取りで実体を特定し、安全に実行できない場合は朝ワンクリックで済む準備と手順までに留める。
- `STATE.md` と `REPORT.md` を最終状態へ更新し、台帳最終検証を通す。

## Allowed Actions

- プロジェクトファイル、適用指示、既存実装、テスト、読み取り可能なブラウザ保存データを読む。
- 原因特定に必要な mac-app 診断機能、最小修正、回帰テスト、キャッシュ版番号を編集する。
- `build.sh`、自己診断、ローカルテスト、構文・差分・台帳検証を実行する。
- `STAGE_SKETCH_MCP_DATA_DIR` には一時ディレクトリを指定し、偽エージェントだけを使う。

## Prohibited Actions

- git commit / push、deploy、publish、外部送信、購入、secret変更をしない。
- ファイルを削除・移動・改名しない。
- 実データ `.stage-sketch-mcp/` と本人の既存 localStorage を書き換え・削除しない。
- 実AIを呼び出さない。
- デザイン・文言の新規判断をしない。
- 並行セッションの変更を巻き戻さない。

## preflight
2026-08-10 00:15 FAIL 0 / WARN 1（同期競合コピーの既知WARN。削除しない）

## Primary Wave Queue
1. **原因特定**: 採る（apply→export→棚へ保存）の経路で、cast/sets 登録と pieces の参照が
   手動追加と同じ形になっているかを実データで検証する。アプリ側の採用ハンドラも読む
2. **修正**: 人間の手の追加と同一の結果になるよう修正（Codexへ発注、Claudeが検証）
3. **データ移行**: ブラウザ側localStorageの実体を特定できれば移行を実行。
   TCC等で読めない場合は、朝ワンクリックで済む状態まで準備して手順を書く
4. **最終検証**: 全テスト・self-test・REPORT.md

## Reserve Queue
なし（本人未承認のため。早く終わったら最終検証へ）

## 保護対象
- 本人の既存ショーのlocalStorage実体（読み取りはするが、書き込み・削除はしない）
- .stage-sketch-mcp/ の既存JSON（テストは一時ディレクトリ）
- 並行セッションの光の意図・会場エディタ関連（編集前に読み直す）

## 停止条件
- 本人のブラウザデータを壊すリスクのある操作しか道がないとき（移行は準備止まりにする）
- デザイン・文言など本人判断が要る選択
- 原因が並行セッションの変更にあると判明したとき（勝手に巻き戻さない）

## Stop Conditions

- 本人のブラウザデータを壊すリスクのある操作しか道がない場合、移行は準備までで止める。
- デザイン・文言など本人判断が必要な場合は止める。
- 原因が並行セッションの変更にある場合は巻き戻さず、証拠を記録する。
- ベースラインが予期せず変化した場合は、対象を再読して安全に統合できなければ停止する。
- 原因を特定できない場合は憶測修正をせず、診断結果を `STATE.md` に残す。

## Team

- Coordinator / Explorer / Writer / Verifier: Codex 1名が役割を順番に担当する。
- 同一チェックアウトの書き手は常に1名。サブエージェントは使わない。

## Verification

- `bash mac-app/build.sh`（出力全文を保存）
- `mac-app` の `--self-test`（出力全文を保存）
- `mac-app` の `--diagnose-adopt`（出力全文を保存）
- `node --test tests/*.test.mjs`
- `cd mcp-server && npm test`
- `python3 build_stage.py --check`
- `git diff --check` と対象差分レビュー
- `python3 /Users/arata/.codex/skills/overnight-project-runner/scripts/validate_run.py overnight-runs/2026-08-10-adopt-fix-migration --final`
