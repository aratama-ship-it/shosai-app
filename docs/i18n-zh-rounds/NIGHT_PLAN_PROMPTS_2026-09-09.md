# 深夜ラン用プロンプト集 — 舞台スケッチ 中国語版の残タスク（2026-09-09 作成）

用途: 本人が夜間セッションへ貼るプロンプト。**本人判断が要るもの（保留3鍵の英語、説明文コピー、配信、コミット実行、削除、iPad実機）は夜間に回さず、
判断用の材料を作るところまで**にしてある。判断はすべて「提案としてレポートに書き、朝に承認を待つ」形。

テンプレートは `_maintenance/NIGHT_TASK_RESERVE.md`（Primary / Reserve、Owner session 宣言、終了30分前から新規wave禁止）。

---

## 0. 総合プロンプト（セッションの最初に貼る）

```text
夜間ラン「9/9夜 舞台スケッチ 中国語版 残タスク」の担当セッションとして開始する。最初に "claude code files/CLAUDE.md" と
"_maintenance/NIGHT_TASK_RESERVE.md" を読む。作業場所は "show-creative-ideas/shosai-app/"。

まず overnight-runs/2026-09-09-i18n-zh-followup/ に PLAN.md / STATE.md / REPORT.md を作る。PLAN.md の Owner session は
「9/9夜 i18n-zh followup担当・<着手日時>・<使用モデル>」。既に別 Owner の STATE.md が実行中なら何もせず「重複検知」だけ報告して終える。

前提の確認（違えば本命に入らず REPORT に書いて止まる）:
  - docs/I18N_ZH_WORKORDER_2026-09-09.md の状態行が「R1〜R5 完了・未コミット・未配信」。
  - node tests/index.mjs が 858 緑（数が増えているのは可、赤があれば停止）。python3 build_stage.py --check が 0。
  - git HEAD が 6e4ba1d のまま（進んでいれば、他セッションが動いた印。git log を読んで REPORT に書き、本命 W5 は再計画）。
  - preflight スキル（.claude/skills/preflight/SKILL.md）を実行。FAIL なら開始しない。

権限と道具:
  - 書き込みは shosai-app/ 配下と overnight-runs/ 配下のみ。削除・移動・改名・コミット・push・デプロイ・外部送信は禁止。
    バックアップも動かさない（W4 は一覧と参照確認まで）。
  - 10分を超える処理は run_in_background: true で走らせる。
  - Codex 委譲は W3・R-A・R-B に限り、次の1行の範囲で許可済み:
    codex exec --skip-git-repo-check --sandbox workspace-write -m "gpt-5.6-sol" -c model_reasoning_effort=medium -C "<shosai-app 絶対パス>" "<指示>" </dev/null
    起動は nohup + & で切り離し、pgrep -f "codex exec" で生死を見る。ログの短さで失敗と決めて再実行しない。人数は常に1（同時に2本走らせない）。
  - サブエージェント（Agent ツール）は使わない。Codex 以外のモデル追加起動もしない。

本命（Primary Wave Queue）: W1 → W2 → W3 → W4 → W5 の順。各 wave の指示は下の節をそのまま使う。
1 wave 終わるごとに STATE.md と REPORT.md を更新し、前提（テスト緑・HEAD 不変・build --check 0）を再確認してから次へ進む。
予備（Reserve Queue）: R-A → R-B → R-C。本命が全部終わり、終了時刻の30分前より前に開始できる場合だけ、1件ずつ。
終了時刻: <本人が書く。例 06:30>。最終検証開始はその30分前。

最終 REPORT.md の形: 完了したこと／verified facts／提案（本人判断待ち）と推奨／unknowns／使ったトークンと時間／確認リンク（作った HTML への相対リンク）。
すべての成果物の先頭に「何を判断してほしいか」を書く。
```

---

## W1. ネイティブ確認用の一覧 HTML（判断は確認者。作業のみ）— 推奨モデル: Sonnet

```text
W1: 中国語UIのネイティブ確認者へ渡す一覧を docs/i18n-zh-2026-09/native-review/index.html（1ファイル・ローカル用・外部依存なし）として作る。

入力（読むだけ）:
  - i18n-prep/NEEDS_REVIEW.md（R1〜R5 で増えた節すべて）、stage-i18n.zh-Hans.js / stage-i18n.zh-Hant.js 末尾の needsReview 配列、
    i18n-prep/GLOSSARY.md（罠一覧と用語の根拠）、i18n-prep/STYLE-zh-Hans.md / STYLE-zh-Hant.md、docs/i18n-zh-2026-09/*.png。
  - 各鍵の「使われる場所」は index.html と stage-sketch.js を鍵文字列で grep し、いちばん近いパネル名・ボタン名・コメントから短く書く（推測なら「推定」と付ける）。

出力の構成（簡体字・繁体字で別ページ or タブ。確認者が別人のため混ぜない）:
  1. 冒頭「お願いしたいこと」: 訳の自然さ・現場語としての通り・製品名は英名 Stage Sketch 固定、の3点。
  2. 表: 鍵（日本語原文）／英語／中国語（現訳）／使われる場所／確認理由（needsReview のコメント）／記入欄（空）。
     節は (a) ドラフト作成時の NEEDS_REVIEW（簡体10・繁体12） (b) 訳が無く英語に落ちている鍵（R1 の 58鍵・SAY 63文型・setBuilder 38語・上手へ/下手へ）
     (c) 例外扱いにした3件（孤児鍵・削除済み venueNote・杆高の同訳）。
  3. GLOSSARY の「罠」4つを、確認者向けに図1枚（上手＝下場門側、台湾の上舞台＝奥）で示す。
  4. 4枚のスクリーンショットを縮小で貼り、該当パネルへ番号で対応づける。
  完了条件: 表の鍵数が NEEDS_REVIEW.md と needsReview 配列の合計と一致（機械照合の件数を REPORT に書く）／HTML を開いて崩れがない（読み取り確認）／
  新しい訳語を一つも書かない（記入欄は空）／PC とスマホ幅で読める。
```

## W2. 保留3鍵と説明文の「判断用 HTML」（判断は本人）— 推奨モデル: Sonnet

```text
W2: docs/i18n-zh-2026-09/pending-decisions.html を作る（ローカル用）。判断してほしいこと4件を、比較表で並べる。
  1. 「秒」: 既存 TEXT は sec、R1 で見つかった箇所は s。両案の表示例（0.6sec / 0.6s、12sec / 12s）と出現箇所（stage-sketch.js を "秒" と tx("秒") で grep した行）。推奨は s。
  2. 「不明」: Unknown / unknown。出現箇所と文脈（括弧内の尺）。推奨は Unknown。
  3. 「まだありません。言葉を入れて〈映す〉を押してください。」: 同じ日本語が2文脈。案A=既存英語に統一、案B=日本語側を「映す言葉はまだありません。…」に分ける（日本語コピー変更）。
     それぞれで日本語UI・英語UI・中国語UIがどう見えるかを表に。
  4. 言語切替の説明文「画面の文字を日本語と英語で切り替えます。」: 4言語になった現状の画面（スクリーンショットの該当部分を切り出し）と、
     文言案を3つ（例: 「画面の文字の言語を切り替えます。」）。中国語訳はドラフトに無いので、変更すれば中国語では英語に落ちる旨を明記。
  各件に「決めたあとに必要な作業（ファイル・行・テスト）」を1〜3行で添える。実装はしない。
  完了条件: 4件すべてに現状の実測（行番号・表示例）が付いている／推奨に理由がある／未確認は「未確認」と書く。
```

## W3. 体験版（public-dist）の再ビルド確認 — Codex 可（gpt-5.6-sol・medium）

```text
W3: 体験版の生成物を最新にする。配信はしない。
  1. 現状: python3 build_public.py --check の終了コードと差分の要約を REPORT に記録（既知: public-dist が古い）。
  2. build_public.py を読み、体験版が中国語パック（stage-i18n.zh-Hans.js / zh-Hant.js）を含むか確認。
     含まない場合は変更せず「体験版の中国語は英語へ落ちる（normalizeStageLanguage がパック未読込を en に落とす）」と REPORT に書く。含める判断は本人へ。
  3. build_public.py 内の stage-public.js?v=2 を ?v=3 に上げる（stage-public.js が R2 で変わったため）。他の版は触らない。
  4. python3 build_public.py を実行 → --check が 0。node tests/index.mjs 全緑（tests/stage-public-build.test.mjs を含む）。
  5. public-dist の変更ファイル一覧と、体験版のローカル表示（?lang=ja / en、可能なら zh-Hant で英語へ落ちること）を REPORT に。
  禁止: wrangler / deploy / commit。編集前に build_public.py を build_public_backup_2026-09-10-before-v3.py に複製。
```

## W4. バックアップ13本の棚卸し（4段階の①②まで。削除・移動はしない）— 推奨モデル: Haiku/Sonnet

```text
W4: 2026-09-09 に作られた *_backup_2026-09-09-before-*.{js,html} と worker_backup_2026-09-09-before-zh-allowlist.js を棚卸しし、
  docs/system-audit-2026-09-09/A8_backup_files_ledger.md に「2026-09-09 追加分」節として追記する。
  各ファイルについて: 作成ラウンド（R1/R2/R3/R4/R5/worker）／元ファイルとの差分行数／元ファイルが現在テスト緑で動いていること（node tests/index.mjs の結果を1回だけ流用）／
  ワークスペース全体で参照されていないこと（grep -rn --include="*.js" --include="*.html" --include="*.py" --include="*.md" -F "<ファイル名>" の件数。自分の台帳以外で0件が条件）／
  推奨: 「退避候補」か「残す」か、理由1行。
  4段階フロー（退避→稼働確認→承認→削除）の①②までで止める。実際の退避・削除は本人の承認後。ファイルは一切動かさない。
```

## W5. コミット分割案の更新（コミットはしない）— 推奨モデル: Sonnet

```text
W5: docs/system-audit-2026-09-09/A1_commit_split_plan.md を読み、今日の中国語版の変更を分割案へ追記する。
  1. git status --short と git diff --stat で、今回の i18n 群（stage-sketch.js / stage-i18n*.js / stage-set-builder.js / stage-public.js / stage-prompt-i18n.js /
     index.html / stage.html / style.css / stage-sw.js / worker.js の許可リスト2行 / tests/ の該当 / i18n-prep/NEEDS_REVIEW.md / docs/I18N_ZH_* / docs/i18n-zh-*）と、
     他セッション由来（worker.js のゲストアクセス、mcp-server/、public-lp/ 等）を分ける。同一ファイル内で混在するもの（worker.js、index.html、stage-sw.js、tests/ の一部）は
     git add -p で切る hunk の見当を行番号付きで書く。
  2. 提案するコミットの並び（例: ①WO-B3 三項演算子→辞書 ②辞書パック化 ③中国語パック＋UI ④版上げ・SW・worker 許可 ⑤テスト・記録）と、各コミットの検証コマンド。
  3. コミットは実行しない。git add も実行しない。dry-run（git diff の範囲確認）のみ。
  完了条件: 今日変わった全ファイルがどちらかの群に入り、混在ファイルには hunk の見当がある。
```

---

## 予備（Reserve Queue）

### R-A. warm-cache テストのスキップ挙動（レビュー#10・後日扱い）— Codex 可

```text
R-A: tests/stage-pwa-offline-warm.test.mjs（206・216行付近）が「HTML 側の資材が APP_SHELL に無いと検査をスキップする」件を、
  「index.html / stage.html が読み込む .js/.css/.webmanifest 資材はすべて APP_SHELL に同じ ?v= で存在する」ことを失敗として検出する形へ直す。
  現状（v202・zh パック2本を含む）で緑になること。意図的に APP_SHELL から外している資材があれば、明示の除外リストにして理由コメントを付ける。
  完了条件: node tests/index.mjs 全緑／APP_SHELL から1行消すと赤になることを一時的に試して確認（試したあと必ず戻し、差分ゼロを示す）。
```

### R-B. coverage テストの実値評価化（レビュー#9・別発注）— Codex 可・大きめ

```text
R-B: tests/stage-i18n-coverage.test.mjs はソース解析で announce() 等を合成している。R5 で公開した window.SHOSAI_STAGE_I18N_MODEL を使い、
  実際に言語を ja/en/zh-Hans/zh-Hant に切り替えて評価した値で「静的日本語がすべてのパックで引ける（または取り落とし順序で英語に落ちる）」を検査する形へ置き換える。
  旧テストが検出していた事項（README/コメントで確認）を新テストも検出できることを、代表3件を故意に壊して赤になることで示し、必ず戻す。
  完了条件: 全緑／検出範囲が旧以上（件数で比較）／実行時間が旧の2倍以内。終了30分前までに終わらない見込みなら着手しない。
```

### R-C. docs/INDEX.md の再生成 — 推奨モデル: Haiku

```text
R-C: python3 docs/system-audit-2026-09-09/make_docs_index.py を実行して docs/INDEX.md を更新し、今日追加した docs/I18N_ZH_WORKORDER_2026-09-09.md、
  docs/i18n-zh-rounds/、docs/i18n-zh-2026-09/ が索引に載ることを確認する。生成物以外は触らない。
```

---

## 夜間に入れなかったもの（本人の手・判断が要る）

- 保留3鍵の英語と説明文コピーの決定（W2 の HTML を見て決める）／ネイティブ確認の依頼そのもの／配信（デプロイ）／コミットの実行／
  バックアップの退避・削除／iPad 実機の SW 更新確認（docs/system-audit-2026-09-09/C2_ipad_pwa_update_checklist.md）／
  遅延読込にするかの判断（204KiB 増をどう見るか）／体験版に中国語を含めるかの判断／Codex との会議（ブレスト）。
