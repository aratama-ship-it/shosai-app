# 発注書 WO-B2: 配信資材の一覧と版番号を index.html 一箇所から生成する（2026-09-09・未着手）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/`。**B-1（分割）より先に行う。**

## 事実

同じ「舞台スケッチが読むファイルと版」が5箇所に手書きされている。

| 場所 | 何を持つか | 今の作り方 |
|---|---|---|
| `index.html` | `<script src="…?v=N">`／`<link href="style.css?v=N">` | 手書き（**正本にする**） |
| `stage.html` | 同上（舞台だけ） | `build_stage.py` が index.html から生成（済） |
| `stage-sw.js` | `CACHE_NAME`＋`APP_SHELL`（`?v=` 付き URL 一覧） | 手書き。忘れ事故が複数回（メモリ記録） |
| `worker.js` | `GUEST_STAGE_ASSETS`（ゲストに配ってよいパスの許可リスト。`?v=` 無し） | 手書き |
| `build_public.py` | `PUBLIC_SKIP_JS`（体験版で外すもの）＋コピー一覧 | 手書き。`script_srcs` は共有 |

版ピンのテスト（`stage-venue-library`／`stage-session-shelve`／`stage-manual-help`／`stage-pwa`）が数値の食い違いを見張っているが、
食い違いを**検出する**だけで、**揃える**作業は手。

## 仕様

1. `stage_extract.py` に `app_shell_urls()` を足す: index.html の `script_srcs`（既存）＋ `style.css?v=N` ＋ 固定資材
   （`./stage.html`、`manual/manual.html`、`manual/quick.html`、`manual/quick-en.html`、`stage-sketch.webmanifest`、`icons/stage-sketch-*.png`）を、
   **現在の `stage-sw.js` の `APP_SHELL` と同じ順・同じ表記（`./` 始まり）**で返す。`build_stage.py` の `stage_scripts()` と同じ除外（`SKIP_JS`）を使い、
   `stage-pwa.js?v=N` は `build_stage.py` が今ハードコードしている版（`?v=9`）を **index.html 側に移す**
   （index.html に `<!-- stage-only: stage-pwa.js?v=9 -->` のようなコメント1行で持たせ、`stage_extract.py` が拾う。stage.html にだけ出す）。
2. `build_stage.py` が `stage-sw.js` の `APP_SHELL = [ … ];` ブロックを**書き換える**（ブロックの前後は触らない。`const APP_SHELL = [` から `];` まで）。
   `CACHE_NAME` は `stage-sketch-pwa-v<N>` の N を「APP_SHELL 内の `?v=` の合計」ではなく、**APP_SHELL 全行の SHA-256 先頭8桁**にする案と、
   **現状どおり手で上げる**案がある。→ 手で上げる案を採る（テストが `v199` 形式の整数を前提にしており、変える範囲が広がるため）。
   ただし `--check` で「APP_SHELL の中身が変わったのに CACHE_NAME が前回と同じ」を検出して赤にする（前回の APP_SHELL を `.stage-sw.lock.json` に控える。追跡対象）。
3. `build_stage.py --check` を拡張: (a) stage.html の一致（既存）(b) stage-sw.js の APP_SHELL 一致 (c) `worker.js` の `GUEST_STAGE_ASSETS` に
   APP_SHELL の全パス（`?v=` を外し `/` 始まりにしたもの）が含まれるか (d) `build_public.py` の `PUBLIC_SKIP_JS` が index.html に実在するファイル名だけか。
   いずれか不一致なら終了コード1と差分の表示。
4. `worker.js` の `GUEST_STAGE_ASSETS` は**生成しない**（許可リストは人が意図して書くべきもの。不足を検出するだけにする）。
5. `build_public.py` は `script_srcs` を既に共有しているので変更なし。`--check` は現状のまま。

## テスト（完了条件）

- `tests/stage-build-manifest.test.mjs`（新規）: 一時ディレクトリに index.html／stage-sw.js の最小サンプルを置き `python3 build_stage.py` を子プロセスで実行、
  APP_SHELL が index.html の並びどおりに書き換わる／`--check` が不一致で 1 を返す／CACHE_NAME 据え置きで APP_SHELL だけ変わると赤。
- 既存の版ピンテスト4本はそのまま緑（数値は変えない）。
- `python3 build_stage.py --check`・`python3 build_public.py --check` が現状の本物のファイルで緑（このとき stage-sw.js に差分が出ないこと＝現状と同一出力）。

## 注意

- 版上げそのものは今回しない。生成器を入れた直後は「出力が今の stage-sw.js と1文字も違わない」ことが受け入れ条件。
- `.stage-sw.lock.json` を `.assetsignore` に追加（配信しない）。
- README の「版上げ3点セット」を「index.html を直して `python3 build_stage.py`、CACHE_NAME を1つ上げる」の2点に書き換える（C-5 と同時）。
