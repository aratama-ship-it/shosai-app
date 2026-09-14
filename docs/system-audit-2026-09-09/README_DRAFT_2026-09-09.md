# README.md 改訂草案（C-5・2026-09-09）— 採用されたら `shosai-app/README.md` を差し替える

> 現行 README との違い: 冒頭に「配信構成」「検査の回し方」「版上げ」「stage.html は生成物」を置いた。
> 「未着手: このアプリについて」（9/5 完了）と「iPad実機QAは未実施」（8/24〜28 実施）の古い記述を外した。
> 書斎・名簿・データの節は現行のまま残す（下部）。事実確認は 2026-09-09 のコードと docs による。

---

# 制作の書斎／舞台スケッチ（Stage Sketch）

**舞台スケッチ**（`stage.html`）は配る製品。**書斎**（`index.html`）は身内用の作業空間で、舞台スケッチを内包する。
品質基準は舞台スケッチ側を高く取る（外部利用者が触るため）。

## 配信構成（2026-09 時点）

| 配信先 | 中身 | 設定 | 認証 |
|---|---|---|---|
| β本体 `https://stagesketch.pygmix.com`（旧 workers.dev も併存） | `.` 全体（`.assetsignore` 除外分を除く） | `wrangler.toml`（Worker `shosai-app`・DO: SessionRoom／UsageMetrics） | `worker.js` のクッキー式サインイン。本人＝`SITE_USER`、ゲスト＝`GUEST_ACCOUNTS`（JSON Secret・不正なら fail-closed 503）。ゲストは舞台スケッチの資材だけ |
| 公開体験版 `https://stagesketch-try.juggler-arata.workers.dev` | `public-dist/`（`build_public.py` が集めたものだけ） | `wrangler.public.toml`（Worker `stagesketch-try`） | なし。3場面まで・保存なし。Cloudflare Web Analytics 付き（`docs/WEB_ANALYTICS.md`） |
| Macアプリ | `mac-app/`（iCloud の作業フォルダを読む窓） | `docs/MAC_APP_DESIGN.md` | — |

**`directory = "."` を `wrangler.public.toml` に書いてはいけない**（名簿・個人ショー・設計文書まで配る。2026-09-03 に公開直前で発見）。

## 検査の回し方（配る前に必ず）

```bash
./check.sh                 # 未コミット確認 → 構文 → stage.html 整合 → public-dist 整合 → tests/ → mcp-server
```

`check.sh` が無い環境では同じ順で手で回す: `python3 build_stage.py --check`／`python3 build_public.py --check`／`node tests/index.mjs`／`cd mcp-server && npm test`。
**未コミットの作業ツリーから `wrangler deploy` しない**（2026-09-08 に起きた。別マシンが HEAD から配ると巻き戻る）。

## 直したら必ず

- **`index.html` が正本、`stage.html` は `python3 build_stage.py` の生成物。** 手で直さない（次の生成で消える）。
- **版上げ3点セット**（JS/CSS を直したとき）: ① `index.html` の `?v=` ② `stage-sw.js` の `CACHE_NAME` **と `APP_SHELL` 内の `?v=`** ③ `python3 build_stage.py`。
  **全編集が終わってから上げる**（先に上げると新SWが旧内容をプリキャッシュする）。版ピンのテストが食い違いを止める。
- 体験版に効く変更なら `python3 build_public.py` → `npx wrangler deploy -c wrangler.public.toml`。
- 新しいJSを足したら `worker.js` の `GUEST_STAGE_ASSETS`（ゲストに配る許可リスト）と `build_public.py` の `PUBLIC_SKIP_JS` を見直す。

## リポジトリの決まり

- 公開リポジトリ。`roster-key.local.js`・`stage-shows.local.js`・`.dev.vars`・`*_backup_*` は追跡しない（`.gitignore`）。
- **コード変更のコミットと索引再生成（`db.js`）のコミットは分ける。** 再生成を重ねたら `git gc`。
- 複数の Claude セッションと Codex が同じ作業ツリーを触る。`git add -A` は使わず、パスを明示して add する。
- 設計・発注書・QA記録は `docs/`。索引は `docs/INDEX.md`（`python3 docs/system-audit-2026-09-09/make_docs_index.py` で再生成。手で直さない）。
- テストは `tests/*.test.mjs`（`tests/index.mjs` が自動で全件読む）。製品JSは `window.SHOSAI_STAGE_*_MODEL` をテストの掴み所として外へ出している。

## 舞台スケッチの主な入口

- PC: `stage.html`。iPad: ホーム画面へ追加（PWA・`stage-sw.js`）。iPad版に舞台機構・3Dカメラが無いのは確定仕様。
- スマホ: 閲覧と少数の修正（`initPhoneViewerWorkspace`）。
- 共有セッション（ZOOM会議用・ホスト＋ゲスト最大19人）: `stage-session.js`＋`session-room.js`（設計 `REALTIME_SESSION_DESIGN.md`）。
- AI編集（MCP・差分承認式）: `mcp-server/README.md`、`docs/AI_EDITING_HANDOFF.md`。
- 使いかた: `manual/`（クイックガイド・冊子・日英）。連絡先は アプリ内〈感想を送る〉（Google フォーム）。

---

（以下、現行 README の「資料棚と名簿の役割分担」「名簿タブ・アーティスト」「合言葉を毎回入力しない設定」「データ」の各節をそのまま続ける。
「使い方」の節は上の内容と重複する部分を削る。「状態」節の「未着手: このアプリについて」は削除。）
