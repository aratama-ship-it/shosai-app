# A-1 コミット分割計画（2026-09-09・未実行）

対象: `shosai-app`（git HEAD `6e4ba1d` 2026-09-06）。作業ツリーに未コミット30ファイル＋未追跡フォルダ多数。
本番Worker `shosai-app` は 2026-09-08 10:59Z に**この作業ツリーの一部（ゲストアクセス）からデプロイ済み**
（`docs/guest-access-2026-09-08/deployment-proof.json`）。公開体験版 `stagesketch-try` も 9/8 に
Cloudflare Web Analytics 付きで公開済み（`docs/WEB_ANALYTICS.md`）。利用計測（Durable Object 移行を含む）は未デプロイ。

## 検証済みの事実（2026-09-09・一時クローン `/tmp/shosai-verify` で確認）

- `docs/guest-access-2026-09-08/guest-access.patch` は HEAD に**そのまま当たる**（`git apply --check` OK）。
  実リポジトリでも `git apply --cached --check` OK（index は未変更のまま）。
- ただしパッチ①を当てても作業ツリーと一致するのは `tests/worker-guest-accounts-verify.test.mjs` と
  `tests/worker-session-login.test.mjs` の2本だけ。`worker.js`／`stage.html`／`build_stage.py`／
  `tests/stage-session-shelve.test.mjs`／`tests/worker-guest-scope.test.mjs` には**その後の変更（利用計測・SW修正）が重なっている**。
- `docs/usage-metrics-2026-09-08/code-changes.patch` は①の上に**当たらない**（stage.html / stage-sw.js / tests 2本で失敗。
  版番号が後の作業でさらに上がっているため）。→ 利用計測だけを機械的に切り出すことはできない。

## 推奨する分け方（4コミット）

整列の引き継ぎ: [整列4種類追加・一括反映用引き継ぎ](../HANDOFF_LINEUP_2026-09-09.html)。本人から次回の一括反映対象として記録する依頼あり（2026-09-09）。ローカル実装済み・本タスクからは未公開。追加4種類、既存と合わせて全7形状。②に本資料も含める。

| # | 内容 | 入れるもの | デプロイ状態 |
|---|---|---|---|
| ① | ゲストアクセス＋サインイン画面（9/8 本番） | パッチ①で index に載る分（`worker.js`・`build_stage.py`・`stage.html`・tests 4本）＋ 新規 `tests/worker-guest-scope.test.mjs`・`design/TOKEN_SHEET_guest-login_2026-09-08.md`・`docs/guest-access-2026-09-08/` | 本番稼働中 |
| ② | 利用計測＋SW更新修正＋整列7形状（追加4種類）＋9/7フォローアップ＋体験版計測 | 残りの製品コード全部（`worker.js` 残り・`wrangler.toml`・`stage-sw.js`・`stage-pwa.js`・`stage-sketch.js`・`stage-i18n.js`・`style.css`・`index.html`／`stage.html`／`try.html`・`stage-public.*`・`public-beta.html`・`public-lp/index.html`・`build_public.py`・`usage-metrics.js`・`usage-admin-page.js`・`stage-usage.js`・tests・`design/TOKEN_SHEET_{usage,lineup,public-preview}*`・`docs/usage-metrics-2026-09-08/`・`docs/WEB_ANALYTICS.md`・`docs/RELEASE_FOLLOWUP_2026-09-07.html`） | **未デプロイ**（体験版の計測タグ分だけは公開済み） |
| ③ | MCP: 根拠パック（evidenceContext） | `mcp-server/` の6ファイル | ローカルのみ |
| ④ | 設計フォルダ（製品コード無変更） | `docs/script-cues-2026-09-09/`（30MB）・`docs/set-transitions-2026-09-08/`（25MB）・`docs/romeo-juliet-sample-2026-09-09/`（30MB）・`docs/system-audit-2026-09-09/`・`docs/INDEX.md` | — |

②をさらに「利用計測」と「それ以外」に分けたい場合は `git add -p`（対話）でしかできない。混在しているのは
`worker.js`・`stage.html`・`stage-sw.js`・`tests/stage-session-shelve.test.mjs`・`tests/stage-manual-help.test.mjs` の5本。

**④の判断が要る点**: 公開リポジトリに PNG 中心の 85MB を入れるか。案A＝そのまま入れる／案B＝PNG と `*_before-*` の退避コピーを
`claude-files-archives/` へ移して MD・HTML・JSON だけ入れる／案C＝設計フォルダは追跡しない（`.gitignore` に `docs/*-20??-??-??/`）。
過去の方針（E-4 2026-08-28）は「夜間ログはコミット、復旧用コピーは archives へ」＝案Bに近い。

## 実行手順（本人または実装セッションが行う。並行セッションが動いていないことを先に確認）

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app"
pgrep -fl "codex|claude" | grep -v grep     # 並行セッションの有無を見る（動いていたら一報してから）
git status --short | wc -l                   # 開始時の件数を控える
```

①（パッチで index にだけ載せる。作業ツリーは触らない）

```bash
git apply --cached docs/guest-access-2026-09-08/guest-access.patch
git add tests/worker-guest-scope.test.mjs design/TOKEN_SHEET_guest-login_2026-09-08.md docs/guest-access-2026-09-08
git diff --cached --stat                      # 7ファイル＋新規3件 になっているか
git commit -m "ゲストアクセス: ゲスト口座は舞台スケッチの資材だけに限定し、サインイン画面の名称を整える（2026-09-08 本番デプロイ済み）"
```

②（残りの製品コード。`git add -A` は使わない）

```bash
git add worker.js wrangler.toml stage-sw.js stage-pwa.js stage-sketch.js stage-i18n.js style.css \
  index.html stage.html try.html stage-public.js stage-public.css public-beta.html public-lp/index.html \
  build_public.py build_stage.py usage-metrics.js usage-admin-page.js stage-usage.js \
  tests/stage-manual-help.test.mjs tests/stage-public-build.test.mjs tests/stage-pwa-offline-warm.test.mjs \
  tests/stage-pwa.test.mjs tests/stage-session-shelve.test.mjs tests/stage-venue-library.test.mjs tests/usage-metrics.test.mjs \
  design/TOKEN_SHEET_usage_2026-09-08.md design/TOKEN_SHEET_lineup_2026-09-09.md design/TOKEN_SHEET_public-preview_2026-09-07.md \
  docs/usage-metrics-2026-09-08 docs/WEB_ANALYTICS.md docs/RELEASE_FOLLOWUP_2026-09-07.html docs/HANDOFF_LINEUP_2026-09-09.html
git commit -m "利用計測(DO v2・未デプロイ)／PWA更新は資材が揃うまで旧版を残す／整列を7形状に／英語の問い合わせ導線と体験版の保存注記（9/7レビュー2・3件目）"
```

③・④

```bash
git add mcp-server && git commit -m "MCP: 編集計画に根拠パック（sources/observations/interpretations/proposal）を任意で保持"
# ④は上の判断（案A/B/C）を決めてから。案Aなら:
git add docs/script-cues-2026-09-09 docs/set-transitions-2026-09-08 docs/romeo-juliet-sample-2026-09-09 docs/system-audit-2026-09-09 docs/INDEX.md
git commit -m "設計資料: 台本キュー／転換の担当交代／ロミジュリ見本／システム監査 2026-09-09（製品コード無変更）"
```

確認

```bash
git status --short          # 空になること（`SHOWS_INVENTORY 2.md` 等の無視対象は出ない）
node tests/index.mjs | tail -8
python3 build_stage.py --check && python3 build_public.py --check
```

`build_public.py --check` は現状**赤**（A-3）。②の前に `python3 build_public.py` で `public-dist/` を作り直してから
コミットすると緑で締められる（`public-dist/` 自体は追跡外。`try.html` と `en/try.html` の元は追跡対象）。

## 再発防止（B-8 に含める）

デプロイ前に `git status --porcelain` が空でなければ止める。`wrangler deploy` を手で打つ運用のあいだは、
`docs/system-audit-2026-09-09/check.sh.draft` を `check.sh` として置き、デプロイの直前に必ず通す。
