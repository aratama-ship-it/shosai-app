# 現状調査 — 台本・cue・転換・担当・役割別メモの保存所有者と実装範囲（2026-09-11）

Claude Code Fable。読み取りのみ。人間向け入口は `index.html` §2。パスは `show-creative-ideas/shosai-app/` からの相対。
公開環境（Cloudflare）の配信状態は照合していない。作業ツリーは `git status --short | wc -l` = 159、HEAD `6e4ba1d`（9/6）。

## 1. 正本と保存経路

| 対象 | 正本の所有者 | 保存先・経路 | 版・履歴 | 根拠 |
| --- | --- | --- | --- | --- |
| 舞台の正本（場面・cast・set・機構・cueSeconds） | 演出・舞台監督（オーナー） | ブラウザ `STORAGE_KEY`（現在）／`SHOWS_KEY`（棚）、ファイル書出し `shosai-stage-sketch` v4、MCP `projects/` v3、Mac store v3、共有セッション bridge（揮発） | MCP: revision・history・lock・expectedRevision。ブラウザ: Undo/Redo は state 全体を restore→normalizeState。normalizeState は既知フィールドだけ再構成 | WORKFLOW_IO_AUDIT_2026-09-09.md 表、AI_EDITING_HANDOFF.md、mcp-server/README.md 24–48・153–171行 |
| 演者向け発行版（事前学習リンク） | オーナーの明示「公開内容を更新」 | Worker `study-links.js`（`STUDY_LINKS`）。演者の個人メモは `stage-study-private.js`（localStorage `stage-study-notebook-v1:*`）または読者アカウント（`stage-study-sync.js` → `/study/api/me/notebook/`） | `STUDY_LIMITS.historyRevisions: 50`、`historyBytes: 32 MiB`、上限で `history-full` 409。場面ごと履歴32件（`stage-study-continuity.js`）。共有は「共有ボタンで送った表示名・メモ・図」だけ。受領・既読の記録は無い | study-links.js 3・211行、stage-study-owner.js 37・302行、README「事前学習用リンク」 |
| 台本 PDF・Q・紙面アンカー | （試作）舞台監督 | `docs/script-cues-2026-09-09/script-cue-storage.js`: IndexedDB `stage-sketch-script-cues` の単一レコード（PDF Blob・Q・typed subject・正規化矩形） | schema v1。バックアップ・他端末同期・製品 project への統合は無し。companion workflow v1 は displayRevision／semanticRevision、reviews.inputRevisions、needs-review を定義（fixture・validator のみ） | script-cue-storage.js、PDF_IMPORT_MIGRATION_PLAN.md、PROJECT_WORKFLOW_CONTRACT_2026-09-09.md「改訂と確認の扱い」 |
| 転換・担当・予定（activity／assignment／point） | （試作）舞台監督 | `docs/set-transitions-2026-09-08/` の HTML。localStorage 0・IndexedDB 0 | 共通契約 v1（personId・activityId・整数ms・unknown）。担当・意味の変更で関係する確認だけ失効。実例（転換1件）未受領 | SHARED_PEOPLE_CUES_TIME_CONTRACT_2026-09-09.md §6、HANDOFF_STAGE_TRANSITIONS_2026-09-10.md §1・§5・§6 |
| 役割別の現場メモ・矢印・付箋 | （fixture）見る人 | `docs/project-contract-2026-09-09/workflow-receiver-view-2026-09-09.js`: localStorage、`recipientId + sceneRef／cueId` | `sharing: none`、visibility は private のみ実装。department／team は将来候補。チーフ集約は department／team だけ | WORKFLOW_ANNOTATION_CONTRACT_2026-09-09.md、workflow-notes-permissions-2026-09-09.html |
| 配布（全体・部門・個人の Q シート） | （fixture）舞台監督 | `distribution.cueAssignments` から都度導出。print-html／csv | `webViewer.checkPolicy.persist: false`（確認欄は閲覧補助。GO・共有・実行済み・他者通知を記録しない） | WORKFLOW_DELIVERY_CONTRACT_2026-09-09.md、workflow-timeline-fixture-2026-09-09.json |
| 製品内お知らせ | 本人 | UI 計画 R33（リリース情報のベル、localStorage の最新ID・既読） | 改訂通知とは別物 | ui-implementation-plan-2026-09-10/HANDOFF.md §9 |
| 受領・実行記録・GO | — | 無し | 契約で範囲外と明記 | HANDOFF_STAGE_TRANSITIONS §2、WORKFLOW_DELIVERY_CONTRACT、dev-preferences 2026-09-09 |

## 2. 実装済み・試作・契約の区別

- **製品・公開中**: 舞台の正本、MCP の revision／history／lock、共有セッション（ホスト権威・揮発）。v0.3.5（docs/release-v0.3.5-2026-09-10）。
- **作業ツリーに実装済み・配信状態未確認**: 事前学習リンク（発行版・個人メモ・共有・履歴50版）。README には「ローカル実装・未デプロイ」と「2026-09-10 UI 公開」の両方の記述がある。
- **docs 内の試作（製品未接続）**: 台本 PDF・Q・アンカー（IndexedDB）、Q シート表・CSV、転換・担当・人物別予定、受け手ビュー、配布ハブ、注釈ブリッジ。
- **契約（論理モデルのみ）**: companion workflow v1、共通契約 v1、注釈契約 v1、配布契約 v1。

## 3. 進行中で競合しうる設計（結論を条件付きにする理由）

| 設計 | 状態 | 本研究との関係 |
| --- | --- | --- |
| companion workflow v1 と本体統合の選択（WORKFLOW_IO_AUDIT 着手条件2） | 未決 | 発行版・受領票の保存位置に直結 |
| 転換1件の実例照合（HANDOFF_STAGE_TRANSITIONS §6） | 実例未受領 | 「受領を求める相手」の規則の現場検証 |
| 製品化レビュー D1〜D3（_reviews/2026-09-10_stagesketch-third-party-review） | 本人判断待ち | 提供形態が公演単位なら公演回スコープの代役の優先度が上がる |
| 台本試作の保存基盤（PDF asset store・書出し bundle） | 未決 | 発行版に PDF バイナリを含めない前提 |
| UI 修正 R01〜R36 | 実装・本人確認中 | 触れない |
| システム監査 | 段0 BLOCKED | 触れない。重複する課題なし |
| 台本サンプル制作（romeo-juliet） | 2026-09-11 01:00 台まで更新中 | 読まない・触れない |

## 4. 監査との重複除外

docs/system-audit-2026-09-09 の課題は A-1 コミット分割、A-2 SW 版ずれ、A-4/A-5 Worker ヘッダ、A-9 テスト、B-1 分割、B-2 資材一覧、B-3 i18n、B-4 CSS、B-7/B-8 lint・check。いずれも「改訂の届け直し」と重ならない。オフライン復帰はアプリ殻（A-2）ではなくデータの版・受領の問題として本研究で扱う。

## 5. 読んでいないもの

実在のライセンス名簿（`roster-key.local.js`、`data.enc`）、認証情報、`.stage-sketch-mcp/` の実プロジェクト、演者アカウントの個人メモ、docs/romeo-juliet-sample-2026-09-09 の本文（QA.md 冒頭のみ）。
