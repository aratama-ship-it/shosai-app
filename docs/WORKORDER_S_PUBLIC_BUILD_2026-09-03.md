# 発注書S: 公開体験版のビルド（build_public.py）2026-09-03

発注 Claude → 実装 Codex → 検証 Claude。設計の根拠は
`../docs/stage-sketch/2026-09-03_舞台スケッチ_公開版LP_参照ブリーフと実装計画.html`。
パスは `shosai-app/` 起点。**指定したファイル以外は触らない。`mcp-server/` は絶対に触らない。**

## 何を作るか

認証なしで誰でも触れる **公開体験版 `try.html`** を、正本 `index.html` から生成する仕組み。
βの本体（`stage.html`）とは別物で、**βの動作を一切変えない**。

## 0. 大前提（これを外すと設計が壊れる）

- **HTMLから要素を削らない。** `stage-sketch.js` は多数の要素を `getElementById` で掴む。
  削ると検査（`build_stage.py` 末尾）で落ちるか、実行時に落ちる。
  **隠して無効化する**方式で作ること。
- **`stage-sketch.js` を書き換えない。** 公開版の振る舞いは、後から読み込む
  `stage-public.js` と `stage-public.css` だけで作る。
- **βの `stage.html` / `stage-sw.js` / `index.html` の中身を変えない。**
  `build_stage.py --check` が、この作業の前後で必ず「揃っています」と出ること。

## 1. `build_stage.py` の共有化（先にこれ）

いまの `build_stage.py` は「抜き出し」と「単独ページの組み立て」が一つのスクリプトに入っている。
`build_public.py` から同じ抜き出しを使いたいので、**抜き出し部分だけを共有する**。

- 新規 `stage_extract.py` を作り、`index.html` から次を取り出す関数を置く:
  `view`（`<main id="view-stage">`）／`tour`／`modal_html`／`present_html`／
  `script_srcs`（`?v=` 付きのsrc一覧）／`ver(name)`。
- `build_stage.py` はこれを import して使う形へ書き換える。
- **完了条件（絶対）**: 書き換え後に `python3 build_stage.py` を実行し、
  **`stage.html` が1バイトも変わらないこと**（`git diff --stat stage.html` が空）。
  変わったらこの節をやり直す。

## 2. `build_public.py`（新規）

`stage_extract.py` を使って `try.html` を書き出す。`stage.html` との違いは次だけ。

| 項目 | `stage.html`（β） | `try.html`（公開） |
|---|---|---|
| `<body>` のクラス | `is-standalone` | `is-standalone is-public` |
| manifest / apple-touch-icon | あり | **無し** |
| `stage-pwa.js` | 読む | **読まない**（Service Workerを使わない） |
| 追加で読むもの | — | `stage-public.css` と `stage-public.js`（**最後**に読む） |
| `<title>` | 舞台スケッチ — 制作の書斎 | 舞台スケッチ（体験版） |
| `robots` | — | `<meta name="robots" content="index, follow">` |

- `stage-public.css` / `stage-public.js` にも `?v=1` を付ける（以後は上げ方を他と揃える）。
- `--check` を `build_stage.py` と同じ流儀で用意する。
- 末尾の「足りない id」の検査も同じように行う。

## 3. `stage-public.css`（新規）

`body.is-public` の下でだけ効く。**既存の `style.css` は触らない。**

- `#stage-col-left` と `#stage-col-right` を `display:none`。
- 左右列の中の操作可能要素を、キーボードからも触れないようにする
  （`#stage-col-left, #stage-col-right { display:none }` で足りるが、足りない場合は
  `inert` 属性を `stage-public.js` から付ける）。
- `#stage-col-center` が全幅を使うようにする。
- モーダル（`.stage-modal` / `.stage-modal-backdrop`）と使い方案内（`#stage-tour`）は
  出さない（`display:none`）。
- 追加する要素（下の4）のための最小限のスタイル。**新しい色を作らない。**
  `style.css` の `:root` にある変数だけを使う。

## 4. `stage-public.js`（新規・本体）

`stage-sketch.js` の**後**に読み込む。以下を順に行う。

### 4-1. 保存を残さない
- 起動時に `localStorage` の `shosai-stage-sketch-v1` と `shosai-stage-shows-v1` を消す。
- 以後も残らないよう、この2つのキーへの `setItem` を無効化する
  （`localStorage` 全体を潰さない。他のキーは触らない）。
- 結果として、アプリは毎回 `baseState(true)`（`samplePieces()` の見本の駒）から始まる。

### 4-2. 出るものを絞る
- 道具は「動かす」（`data-stage-tool="select"`）に固定する。他の道具の札は隠す（3で対応）。
- 演者が3人を超えて置かれている場合は、**3人に減らす**
  （`samplePieces()` の中身は実装時に確認すること）。

### 4-3. 会場切替の帯（新規UI）
- 中央列の上に、小さな帯を1本作る。ボタンは4つ:
  プロセニアム／スラスト／アリーナ／シャピトー。英語表示にも対応する
  （`stage-i18n.js` の仕組みに合わせる。無理なら日英の文字列を自前で持ち、
  `<html lang>` か既存の言語判定に従う）。
- 実装は **`#stage-venue-select` の `value` を設定して `change` を発火するだけ**。
  会場の切替ロジックは本体に任せる。自前で舞台を組み立てない。
- ボタンには `aria-pressed` を付ける。

### 4-4. スマホ: タップで選び、タップで置く
- 判定は本体と同じ考え方（狭い画面・タッチ端末）。本体の `phoneViewerActive` は
  参照できないので、`stage-public.js` 側で同等の判定を持つ。
- **本体はスマホの一指操作を `stage-sketch.js:18970` の `if (phoneViewerActive) return;` で止めている。**
  ここは書き換えない。代わりに `stage-public.js` が**キャンバスの `click` を捕まえて**、
  次の2段階で駒を動かす:
  1. 演者の上をタップ → その駒を選ぶ（選択の見た目は本体の選択状態を使う）
  2. 舞台のどこかをタップ → 選んだ駒をそこへ移す
- **置ける場所の決め方**（浮いた人を作らない）:
  - 俯瞰図をタップ → 床の上のその位置へ。
  - 正面図をタップ → **左右方向だけ**動かす。高さは変えない。
- 二指の操作中（`touches.size >= 2`）は何もしない。ピンチを妨げないこと。

### 4-5. スマホ: PCを勧める帯
- スマホでは、開いた最初に**大きく**出す:
  「この体験版はスマホでは操作が限られます。**PCでのご利用をお勧めします。**」
  英語: "This preview is limited on phones. We recommend using a computer."
- 閉じられるようにする。閉じたことは覚えない（毎回出す）。

### 4-6. 自動デモ
- 読み込み後、演者を1人だけ、ゆっくり（約4.5秒）横へ動かす。1回だけ。
- **画面に触れた時点で止める**（`pointerdown` で解除）。
- `prefers-reduced-motion: reduce` のときは**再生しない**。代わりに
  「動かす」ボタンを1つ出し、押されたときだけ1回動かす。

### 4-7. 埋め込みモード `?embed=1`
- LPの中に `<iframe>` で置くときに使う。
- 4-5の帯を出さない。会場切替の帯（4-3）と二つの図は**出す**。
- 余白を詰める。

## 5. 完了条件（自分で確認してから報告すること）

1. `python3 build_stage.py` を実行して **`stage.html` が変わらない**（`git diff --stat stage.html` が空）
2. `python3 build_stage.py --check` が終了コード0
3. `python3 build_public.py` が `try.html` を書き出し、`--check` も動く
4. `cd tests && node index.mjs` が**全件 pass**（現在701件。壊していないこと）
5. `git status --short` の変更が、次以外に無いこと:
   `build_stage.py stage_extract.py build_public.py try.html stage-public.css stage-public.js docs/WORKORDER_S_*.md`
6. **commit はしない**（Claudeが検証後に行う）

## 6. やらないこと

- LP本体は今回作らない（別作業）。
- 新ホストへのデプロイはしない。
- `stage-sketch.js` `style.css` `stage.html` `index.html` `stage-sw.js` の中身を変えない
  （`build_stage.py` の書き換えは1節の範囲だけ）。
