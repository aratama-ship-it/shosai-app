# START_HERE — 舞台スケッチ 2026-09-09 監査の準備物（次回の実装セッションはまずここを読む）

対象: `show-creative-ideas/shosai-app/`。この時点で**製品コードは未変更**。すべて `docs/system-audit-2026-09-09/` にある。
本人の指示（2026-09-09）:「実装の時にまとめて行えるようにしておく。コードは変えない」「リファクタに限らず、文言・デザイン・小道具・姿勢の細かな修正を逐次やりたい」。

## 読む順番

1. **人向けの判断** → [RUNBOOK.html](RUNBOOK.html)（段0〜10・判断6件・コマンド付き）と [../SYSTEM_AUDIT_2026-09-09.html](../SYSTEM_AUDIT_2026-09-09.html)（根拠）
2. **逐次修正の候補** → [SMALL_FIXES_CANDIDATES_2026-09-09.html](SMALL_FIXES_CANDIDATES_2026-09-09.html)（小道具 P-01〜50・姿勢 Q-01〜22・文言 W-01〜14・デザイン D-01〜09・その他 X）
3. **発注書**（Codex にそのまま渡せる。各冒頭に「最初に AGENTS.md を読む」）:
   `WO_A2_sw_update_consistency.md`／`WO_A4_A5_worker_hardening.md`／`WO_A9_tests_lineup_admin.md`／
   `WO_B2_asset_manifest.md` → `WO_B1_split_stage_sketch.md`／`WO_B3_i18n_ternaries.md`／`WO_B4_css_split.md`／`WO_B7_B8_lint_and_check.md`
   追記 2026-09-09: 中国語UI（簡体・繁体）の発注書は `../I18N_ZH_WORKORDER_2026-09-09.md`。**WO_B3 を前提（R1）にする**ので、WO_B3 の着手時はこちらも読む。
4. **材料**: `A1_commit_split_plan.md`（コミット分割・検証済み）、`A8_backup_files_ledger.md`、`B1_split_dependency_map.md`、`B3_isEn_ternary_sites.md`、
   `B4_css_duplicate_selectors.md`、`B6_same_name_functions.md`（統合対象なし）、`C1_error_beacon_options.md`、`C2_ipad_pwa_update_checklist.md`、`README_DRAFT_2026-09-09.md`
5. **草案・スクリプト**: `check.sh.draft`（試走済み）、`eslint.config.mjs.draft`、`repro-a2-sw-mixed-version.mjs`（A-2 再現）、
   `make_docs_index.py`（`docs/INDEX.md` 生成）、`make_split_dependency_map.py`

- **2026-09-09 夜 追記**: 中国語UI（簡体・繁体）が `I18N_ZH_WORKORDER_2026-09-09.md` の R1〜R5 で実装済み（未コミット・未配信）。WO_B3 は**この中で完了**（`isEn() ?` 0件）。版は sketch 321／i18n 100／CACHE_NAME v202 に上がっている。次に版上げする人は**この値から**続ける。バックアップ `*_backup_2026-09-09-before-*` は4段階フローで整理。

## 状態の要点（2026-09-09 時点・変わっていたら本文を優先）

- git HEAD `6e4ba1d`（9/6）。未コミット30ファイル。本番 Worker は 9/8 にこの作業ツリーの一部（ゲストアクセス）からデプロイ済み。利用計測（DO 移行）は未デプロイ。
- テスト 804/804・MCP 42/42 緑。`build_stage.py --check` 緑。`build_public.py --check` **赤**（public-dist が古い）。
- A-2（SW版ずれ）は再現済み・条件付き（キャッシュ列挙順が新が先のときだけ）。B-6 は取り下げ。B-1 の第1段は体モデル（依存23）に変更。
- 別セッションが整列7形状の引き継ぎ `docs/HANDOFF_LINEUP_2026-09-09.html` を追記し、`A1_commit_split_plan.md`／`WO_A9` にも反映している。

## 作法（この案件固有）

- `index.html` が正本、`stage.html` は `python3 build_stage.py` の生成物。版上げ3点セット（`?v=`・`CACHE_NAME`＋`APP_SHELL`・build_stage.py）は**全編集が終わってから**。
- 並行セッション前提。`git add -A` 禁止。コミット前に `git status` を見て他人の変更を巻き込まない。
- 削除・移動は4段階（退避→稼働確認→承認→削除）。AI は削除しない。
- 実機（iPad PWA）でしか分からない不具合がある。SW・キャッシュ・オフラインは `C2_ipad_pwa_update_checklist.md` を通すまで「直った」と言わない。
- Codex 委譲は `-m` でモデル明示、`-C` サブフォルダ時は AGENTS.md の絶対パスを指示文に書く。

## 次のセッションが最初にやること

1. `git status --short | wc -l` と `git log -1 --format=%cd` で状態が上と同じか確認（違えば RUNBOOK の段1 は再計画）。
2. 本人に RUNBOOK 冒頭の判断6件と、SMALL_FIXES の「先に決めてもらうと速いこと」4件を聞く。
3. 決まったものから、該当する発注書を Codex へ／小修正は1件ずつ発注書化して進める。
