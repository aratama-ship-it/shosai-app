# Codex に渡すプロンプト（2026-09-09 監査対応・実装セッション用）

本人がそのまま Codex に貼る文。本人が事前に決めた判断があれば「■判断」欄を書き換えてから渡す。
未記入なら Codex は推奨値で進め、推奨値が無い項目（削除・デプロイ・ダッシュボード操作）は行わない。

---

最初に「/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md」を読むこと。
次に「/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/system-audit-2026-09-09/START_HERE.md」を読み、そこに書かれた読む順番で RUNBOOK.html と各発注書（WO_*.md）を読んでから着手すること。作業フォルダは shosai-app/。

## 目的
2026-09-09 のシステム監査で用意した準備物（コード未変更）を、この1セッションでまとめて実装する。順番は RUNBOOK の段に従う。各段の「完了条件」を数値で満たしてから次へ進む。

## ■判断（本人記入。空欄なら推奨値）
- D-a 設計フォルダ85MBの扱い: ＿＿（推奨 B＝PNGは追跡せず文書だけコミット。実装は「docs/*-20??-??-??/ 内の *.png と *_before-* は git add しない」で足りる。退避・削除はしない）
- D-b サインイン試行制限: ＿＿（推奨 a＝Cloudflareダッシュボード。本人が行うのでコード側は何もしない）
- D-c frame-ancestors 先行: ＿＿（推奨 入れる）
- D-d 異常把握: ＿＿（推奨 1＝端末内ログ欄。今回は着手しない。発注書が無いため）
- コミットの可否: ＿＿（推奨 可。ただし push はしない）
- 小修正の番号（SMALL_FIXES_CANDIDATES_2026-09-09.html の P/Q/W/D 番号。任意）: ＿＿

## やること（順番厳守）
1. 段0: `git status --short | wc -l` と `git log -1 --format='%h %cd'` を記録し、START_HERE.md の「状態の要点」（HEAD 6e4ba1d・未コミット30件）と比べる。違っていたら差分を報告して段1を再計画してから進む。`CHECK_ROOT="$PWD" zsh docs/system-audit-2026-09-09/check.sh.draft --allow-dirty` を回して現在地を記録。
2. 段1（A-1・A-3）: `python3 build_public.py` で public-dist を作り直し、A1_commit_split_plan.md の手順どおりに4コミットに分ける（①はパッチを `git apply --cached` で index に載せる。`git add -A` は使わない。④は上の D-a に従う）。終わったら `git status --short` が空（無視対象を除く）であること。
3. 段3（WO-A2）: stage-sw.js の版ずれ対策と再現テストの追加。完了条件は発注書のとおり。版上げは全編集の最後に1回。
4. 段6（WO-B7/B8）: check.sh.draft を shosai-app/check.sh として置き実行属性を付ける。eslint.config.mjs.draft を置き、node_modules を iCloud 配下に作らない方法で ESLint を通す。初回の指摘は直さず件数と一覧を報告。
5. 段7（WO-A9）: 整列7形状と usage-admin-page.js のテストを追加。製品コードを外へ出す必要が出たら、その提案を報告に書いて止める（勝手に製品コードを変えない）。
6. 段5（WO-A4/A5）: D-c が「入れる」なら X-Frame-Options と CSP frame-ancestors、Report-Only CSP を worker.js に。D-b=a ならコード側の試行制限は作らない。
7. 段8: WO-B2 → WO-B3 → WO-B4 → WO-B1 の順。各発注書の受け入れ条件（出力の同一性・innerText 差分0・getComputedStyle 差分0・描画ハッシュ一致）を実測で示す。1つでも満たせなければそこで止めて報告（次の発注書に進まない）。
8. 小修正の番号が記入されていれば、その番号だけを SMALL_FIXES_CANDIDATES_2026-09-09.html の「現状／候補」に従って実装する（1件1コミット。日英両方のラベルを更新し、stage-i18n-coverage 系テストを通す）。番号が無ければ何もしない。
9. 最後に `./check.sh --allow-dirty` を回し、全段の結果を docs/system-audit-2026-09-09/IMPLEMENTATION_REPORT_<日付>.md に書く（段ごとに: 実施／完了条件の実測値／未達と理由／コミットID）。

## やらないこと
- `wrangler deploy`（本番・体験版とも）、Cloudflare ダッシュボード操作、git push、ファイルやブランチや stash の削除、退避コピー（*_backup_*）の移動・削除、README.md の差し替え（草案は README_DRAFT_2026-09-09.md のまま置く）、iPad 実機確認、`.git` の gc。
- 発注書に無い機能追加・見た目の「ついで」の修正。
- 版番号（?v=・CACHE_NAME・APP_SHELL）を編集の途中で上げること。上げるのは各段の全編集が終わった後に1回。

## 作法
- index.html が正本。stage.html は `python3 build_stage.py` で作り直す。手で直さない。
- 他の Claude／Codex セッションが同じツリーを触っている前提。着手前と各コミット前に `git status` を見て、自分が触っていないファイルを add しない。
- テストは `node tests/index.mjs`、MCP は `cd mcp-server && npm test`。落ちたテストを緩めて通さない。
- 「できました」ではなく、完了条件の実測値（件数・ハッシュ・差分0）を報告に書く。満たせないものは「未達」と書く。

## 止まる条件
段0で状態が記録と違う／段1のパッチが当たらない／テストが赤で原因が発注書の範囲外／受け入れ条件を満たせない／削除・移動・デプロイが必要になった。いずれも、そこまでの結果を報告して止まる。

---
