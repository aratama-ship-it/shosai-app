# 制作の書斎DB拡張・夜間計画

## Objective

2026-08-28 23:00 JSTまでに、制作の書斎の正本データ、分類・検索、資料棚UIの三領域について、正本を変更せずに、根拠・影響・保留を明示したレビュー可能なDB拡張パッケージを作る。

## Scope

- 作業基点: `show-creative-ideas/`
- 書き込み先: このrun directoryのみ
- 読み取り対象: `show-reference/data/*.json`、`show-reference/scripts/`、`shosai-app/{build_db.py,db.js,index.html,app.js,style.css,data.js,tests/}`、既存の関連設計書
- 正本と生成物は読み取り専用。`db.js`の再生成は隔離コピーまたは一時領域での比較に限る。
- 終了時刻: 2026-08-28 23:00 JST。22:15 JST以降は新規の外部調査waveを開始せず、統合と最終検証へ移る。

## Definition of Done

- 正本データの品質・欠損に基づく優先キュー、直接公式資料に基づく候補またはhold、分類・検索への影響、資料棚UIの要件をrun-localに統合する。
- 隔離したDB生成差分について、件数・分類・検索影響を記録する。実ファイルを置換しない。
- 正本・アプリDB関連ファイルの開始時ハッシュが変わっていないことを確認する。
- query/audit、run-local JSON構文、隔離検証、ledger validatorを実行し、REPORTに結果と次の人間判断を記録する。

## Allowed Actions

- 読み取り、ローカル解析、既存テスト・query・auditの実行。
- 公開された公式一次資料の確認を、固定した優先キューに対して行い、URL・確認範囲・未確認事項をrun-local proposalまたはholdとして記録する。
- このrun directoryと一時領域にのみ、Markdown、JSON、比較用生成物、検証ログを作成・更新する。

## Prohibited Actions

- `show-reference/data/*.json`、`show-reference/obsidian/`、`shosai-app/{build_db.py,db.js,index.html,app.js,style.css,data.js}`、既存run ledger、一般ドラフトの変更。
- 正本への候補適用、`db.js`の置換、cache versionの変更、Obsidian生成、同名候補の統合。
- commit、push、deploy、公開、外部メッセージ、購入、アカウント設定変更、ユーザーデータの削除。
- 直接資料にない人物同一性、版、初演、上演状況、技術・安全・観客操作の推測。

## Stop Conditions

- 保護対象17ファイルのハッシュ、`shosai-app` HEAD、または開始時の既存未追跡状態に説明不能な変化があれば、新規調査と隔離生成を停止し、STATE/REPORTに記録して最終化する。
- 一次資料で対象の同定または事実確認ができない場合はholdとして記録し、推測で補わない。
- 22:15 JST以降は新規外部調査waveを始めず、検証と報告だけを行う。

## Team

- Coordinator / Writer / Verifier: Codex（このrun directoryの唯一の書き手）。
- 正本とアプリ本体の書き手は置かない。人間レビューが、後続の適用可否を決める。

## Verification

- `shasum -a 256 -c BASELINE_SHA256.txt` をworkspace rootから実行。
- `query_person.py check`、`query_features.py check`、`query_elements.py check`、`query_candidates.py check`、`query_company_catalogs.py check`、`query_research_intake.py check`、`audit_data_gaps.py check`。
- run-local JSON parse、候補ID・feature ID・URL・根拠範囲の検証。
- 隔離DB生成物のJSON/JavaScript構文、件数、分類・検索の比較。実`db.js`には書き込まない。
- 必要最小限の既存資料棚テストと `validate_run.py --final`。

## Wave Queue

1. W0: 保護境界・ハッシュ・既存dirty状態・検証コマンドを固定する。
2. W1: 正本DBの品質・欠損と既存ローカル根拠を棚卸しし、固定した優先キューを作る。
3. W2: 優先キューだけを直接公式資料で確認し、run-local候補またはholdを記録する。
4. W3: 分類・検索の現状と、正本から隔離生成した索引の差分を診断する。
5. W4: 資料棚UIに必要な検索・表示・保存要件を、現行テストとDB契約へ対応付ける。
6. W5: データ・分類検索・UIの相互影響をレビュー表へ統合し、適用案と非提案を分離する。
7. W6: 最終ハッシュ、全検証、REPORT、ledger final validationを実行する。
