# 制作の書斎DB拡張・継続レビュー実行計画

## Objective

2026-08-28 23:00 JSTまでに、現在の正本データを変更せず、制作の書斎の「データ品質」「検索・分類」「生成DBとの差分」を、後続の実装判断に使える根拠付きレビュー・パッケージとして run-local に残す。

このランは、直前ランが停止時に記録した変化を、ユーザーの「継続」承認に基づく新しい基準状態として扱う。ただし、その変化の由来や正本の妥当性をこのランで変更・正規化・推測しない。

## Scope

- 書き込み先はこの run directory のみ。
- `show-reference/data/*.json`、`show-reference/obsidian/`、`shosai-app/{db.js,index.html,app.js,style.css,data.js,build_db.py}`、既存 run は読み取り専用。
- canonical merge、`db.js` の置換、キャッシュ版数更新、Obsidian生成、アプリ実装、commit、push、deploy、公開、外部連絡、削除、購入、アカウント変更をしない。
- 調査は既存正本・既存スクリプト・既存アプリのローカル読取りに限定する。今回の継続ランでは新規の外部資料取得をしない。

## Definition of Done

1. 固定のデータ品質優先キューを、現在値・根拠・未確定事項付きで run-local に作成する。
2. 隔離領域だけで `build_db.py` の出力を再現し、現行 `db.js` との差分を数値・構造レベルで記録する。
3. 現在の検索・分類・資料棚UIが参照するデータ面と、未露出のデータ面を、実装提案ではなく要件候補として整理する。
4. 各wave後に17保護ファイルのSHA-256、既存7 query/audit checks、run-local JSON parse、ledger validatorを実行し、最終報告を完成する。

## Allowed Actions

- 正本・生成物・アプリ・既存指示書の読み取り。
- この run directory 内の Markdown / JSON / hash / report の作成・更新。
- `/tmp` 内の使い捨て隔離コピーでの再生成と比較。原本は書き込まない。
- 既存の検証スクリプト、JSON parse、静的検索、単体テストの実行。

## Prohibited Actions

- `show-reference/data/` への追加・更新・統合、候補昇格、人物同定、推測による補完。
- `shosai-app` の生成物・アプリ・テスト・設定への更新。
- 新規catalog/reference/person/research intake/element/candidateの収集または登録。
- 外部サイトへのアクセス、認証操作、公開状態の確認・変更。
- 既存run、ユーザーの未追跡ファイル、Git履歴の変更。

## Stop Conditions

- 17保護ファイルのハッシュ、`shosai-app` HEAD、または開始時の既存未追跡状態に説明不能な変化があれば、次のwaveを開始しない。STATE/REPORTへ記録し最終化する。
- 隔離生成が原本への書込みを要求する、JSON/auditが失敗する、または対象外のデータを必要とする場合は、そのwaveをholdとして止める。
- 22:30 JST以降は新規waveを始めず最終検証へ移る。

## Owner session

- Name: 2026-08-28 制作の書斎DB継続レビュー担当
- Claimed at: 2026-08-28 10:42 JST
- Model: 現在のCodexセッション（単一ライター）
- 他セッションへ: HANDOFF記録がない限り、本命・予備とも実行しないこと。

## Team

- Coordinator / Explorer / Writer / Verifier: 現在のCodexセッション1名が順番に担当する。
- 並列エージェントは使用しない。正本とアプリへの書込みは許可されていない。

## Primary Wave Queue

- [x] P1: ローカル品質優先キュー
  - Scope: 既存の `audit_data_gaps.py` 結果、正本スキーマ、現行資料棚の参照面から、最大5つの品質・利用価値クラスタを固定する。
  - Writes allowed: この run directory の `w1-local-quality-queue.json` と対応Markdownのみ。
  - Definition of Done: 件数・対象データ面・根拠スクリプト・不確定事項・後続判断を持つキュー。新規レコードなし。
  - Verification: 保護hash、JSON parse、7 query/audit checks、ledger validator。
- [x] P2: 隔離生成DB差分
  - Scope: `/tmp` のコピーだけで再生成し、現行 `db.js` とデータ件数・公開フィールド・検索面の差を測る。
  - Writes allowed: この run directory の `w2-isolated-db-diff.json` と対応Markdownのみ。隔離コピーは正式成果物ではない。
  - Definition of Done: 元ファイルを更新せず、再生成可否・差分・適用を要する判断を分離する。
  - Verification: 保護hash前後、JSON parse、`node --check`（隔離出力のみ）、7 checks、ledger validator。
- [x] P3: 検索・分類・資料棚の要件候補
  - Scope: 現在のHTML/JS/DBと既存棚テストから、露出済みの検索面、未露出の正本面、後続UI判断を整理する。
  - Writes allowed: この run directory の `w3-search-shelf-requirements.md` のみ。
  - Definition of Done: 実装しない要件候補、根拠ファイル、未確認事項、優先度を分離する。
  - Verification: 保護hash、対象テスト、7 checks、ledger validator。

## Reserve Queue

本命がすべて完了し、Early-completion gateを通過した場合だけ、上から1件ずつ実行する。

- [x] R1: 既存61件の `official_linked_unread` を含むインテーク状態のローカル可視化
  - Scope: `research_intake.json` の状態値と既存URLメタデータだけ。URLを取得しない。
  - Writes allowed: この run directory の JSON / Markdown のみ。
  - Stop condition: 新規情報の取得、個別作品の事実判定、正本化が必要になった時点でhold。
  - Verification: hash、JSON parse、`query_research_intake.py check`、ledger validator。
- [ ] R2: 完了済みレビュー成果の参照整合性監査（保護対象の外部変更により停止）
  - Scope: この run directory のみ。
  - Writes allowed: REPORT/STATEのみ。
  - Stop condition: 既存正本・アプリを変更する必要が出た場合。
  - Verification: 全run-local JSON parse、7 checks、ledger final validator。

## Reserve Budget

- Maximum reserve waves: 2
- Maximum reserve runtime: 90 minutes
- Token/model limit: 単一セッション、現モデルのみ
- Subagents: 使用しない

## Finalization Buffer

- Cutoff: 2026-08-28 23:00 JST
- Begin final verification by: 2026-08-28 22:30 JST
- If the next wave cannot finish before this time: do not start it.

## Early-completion Gate

- [ ] Primary Definition of Done achieved
- [ ] Primary verification recorded
- [ ] Protected baseline unchanged
- [ ] Reserve scope is pre-approved
- [ ] Enough time and budget remain

## Verification

- Baseline and before/after each wave: `shasum -a 256 -c BASELINE_SHA256.txt` from workspace root.
- Existing checks: `query_person.py`, `query_features.py`, `query_elements.py`, `query_candidates.py`, `query_company_catalogs.py`, `query_research_intake.py`, `audit_data_gaps.py`.
- Run-local JSON: parse every JSON added by this run.
- Ledger: `/Users/arata/.codex/skills/overnight-project-runner/scripts/validate_run.py shosai-app/overnight-runs/2026-08-28-shelf-db-expansion-continuation-until-23` and `--final` at completion.
