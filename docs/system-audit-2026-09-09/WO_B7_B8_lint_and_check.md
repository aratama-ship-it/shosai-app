# 発注書 WO-B7/B8: 最小の Lint と「検査を1コマンド」＋デプロイ前ゲート（2026-09-09・未着手）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/` 直下。製品コードは変更しない。

## 事実

- 検査が4系統に分かれている: `node tests/index.mjs`（804件）／`mcp-server` で `npm test`（42件）／`python3 build_stage.py --check`／`python3 build_public.py --check`。
- `.eslintrc*`・`eslint.config.*`・`.prettierrc*`・`.editorconfig`・ルートの `package.json` は無い。
- 本番は `wrangler deploy` を手で打つ。未コミットの作業ツリーからデプロイした実例あり（A-1）。

## B-8 仕様: `check.sh`

- 置き場所 `shosai-app/check.sh`（実行属性）。草案は同フォルダ `check.sh.draft`。**草案をそのまま置いてよい。**
- 段階: (0) `git status --porcelain` が空でなければ**赤**（`--allow-dirty` で通過可。ローカル検証用）
  (1) `node --check` を製品JS全件（`*_backup_*`・`public-dist/`・`node_modules/` を除く）に
  (2) `python3 build_stage.py --check` (3) `python3 build_public.py --check` (4) `node tests/index.mjs`（末尾の集計行だけ表示）
  (5) `mcp-server` で `npm test`（集計行だけ）(6) B-7 が入っていれば `npx eslint .`。
- どれか赤なら終了コード1。最後に「配ってよい／だめ」を1行で出す。
- `README.md` のデプロイ手順を「`./check.sh` が緑になってから `npx wrangler deploy`」に書き換える（C-5 と同時）。
- `.assetsignore` に `check.sh` を足す（配信不要）。

## B-7 仕様: ESLint（最小）

- `eslint.config.mjs`（flat config）。草案は同フォルダ `eslint.config.mjs.draft`。ルールは3つだけ: `no-undef`・`no-unused-vars`（引数は除外）・`no-dupe-keys`。
  整形ルールは入れない（3エージェントが同じツリーを触る中で整形の差分ノイズを増やさないため）。
- グローバルは環境ごとに宣言: ブラウザ製品JS＝`browser` ＋ `window.SHOSAI_*` は `readonly` として列挙（`grep -o 'window\.SHOSAI_[A-Z_]*' *.js | sort -u` で得る）、
  `stage-sw.js`＝`serviceworker`、`worker.js`/`session-room.js`/`usage-*.js`＝`worker`（Cloudflare: `Response`/`Request`/`crypto`/`WebSocketPair`/`DurableObject`）、
  `tests/`＝`node`。
- 除外: `*_backup_*`、`public-dist/`、`node_modules/`、`db.js`（15MB の生成物）、`stage-apparatus-data.js`、`stage-shows.local.js`、`book-seeds.js`、`data.js`。
- ルートに `package.json` を置く（`"private": true`、`devDependencies: eslint ^9`、`scripts: { "lint": "eslint .", "check": "./check.sh" }`）。
  **`node_modules/` は iCloud 配下に置くと dataless 破損の実例がある**（メモリ）。`npm install` はこのフォルダで行わず、
  `npx --prefix ~/npm-tools eslint` の形か、`~/npm-tools/` に入れて `PATH` で解決する。どちらにするかは実装時に1行で報告。

## 受け入れ条件

- 現状の作業ツリー（A-1 コミット後）で `./check.sh` が**緑**になること。`node --check` と ESLint で見つかった問題は**直さずに件数と一覧を報告**
  （直すのは別発注。`no-undef` の初回結果が0でない可能性が高い）。
- `./check.sh` の所要時間を報告（目安 10秒以内）。
- 夜間タスク化の適性: 判断を含まないので可。`_claude-rules/scheduled-tasks.md` の作法（preflight・モデル明記・許可リスト）に従い、
  毎日 4:20（既存の 4:10 走査の後）に `check.sh --allow-dirty` を回して結果を `overnight-runs/` へ残す案を本人へ提示する（勝手に作らない）。
