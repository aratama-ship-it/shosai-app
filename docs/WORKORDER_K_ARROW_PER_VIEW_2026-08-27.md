# 発注書K: 矢印を平面図でも描き、描いた図にだけ出す

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-27。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 本人指示（2026-08-27）

> 矢印の記入は平面図でもできるようにしたい。
> **平面図で書いたものは平面図で表示、正面図なら正面図のみ表示、のようにしたい。**

つまり**二つ**のことをする。①平面図でも描けるようにする ②矢印を「描いた図」に属させる。

**★②は既存の設計を変える。** `stage-sketch.js` の描画呼び出しにこう書いてある——
> 自由矢印は作図の印なので、駒より手前へ置き、正面・平面の両方へ出す。

この方針を**本人指示で撤回する。** コメントも書き換えること（古い方針が残っていると、
次に読む人が「バグでは」と戻してしまう）。

## Claudeが調べて確認済みの事実（再調査不要）

行番号は2026-08-27・commit `a464428` 時点。ずれていたら関数名で探すこと。

### 1. 平面図の逆写像は**すでにある**。新しく作らないこと

`arrowPointFromScreen(point, L, arrow)`（`:17595`）の `plane === "floor"` の枝は
`fromScreen(point.x, point.y, L)` を呼ぶだけで、**`fromScreen`（`:5363`）は `L.plan` の
分岐を持っている。** 平面図では `planBounds()` で袖まで含めてclampする。
`L` は `layout("plan")` の戻りでズーム込みなので、**ズレる心配もない。**

→ **平面図で描くときも `arrowPointFromScreen(point, layout("plan"), draft)` をそのまま使う。**
新しい逆写像を書くと、平面図のズーム（`zoomOf("plan")`）とずれる。

### 2. 床の矢印はデータ構造の変更なしで平面図に載る

`normalizeArrow`（`:3479`）: `plane: "floor"` は `points[].a`=左右(0-1)、`b`=**奥行き**(0-1)。
`arrowScreenPoints`（`:7978`）は floor を `stagePoint(a, b, 0, L)` へ落とす。
**平面図で描いた `{a, b}` はそのまま同じ意味になる。**

### 3. 空中の矢印は平面図では描けない（仕様の結論）

`plane: "air"` は `b`=高さ(0-12m)、奥行きは矢印に1つの固定値 `depth`。
平面図に高さを入力する軸は無い。→ **平面図で描けるのは床の矢印だけ。**

### 4. 既存ショーに矢印は1本も無い（移行リスクはほぼゼロ）

Claudeが実測: `.stage-sketch-mcp/exports/` の8本と `stage-shows.local.js`（618KB）を
走査して `arrows` の要素は**0件**。端末のlocalStorageは確認できていないが、
書き出しにも棚にも無い以上、**既存ショーの見え方が変わる実害は小さい**と判断した。

### 5. 共有セッションは矢印をJSONごと運ぶ

`stage-session.js:471` が `{ kind: "arrows.add", arrows: [arrow] }` を送り、ホスト側は
`applyGuestOp`（`stage-sketch.js`）で `normalizeArrow({ ...raw, guest: true })` を通す。
→ **`normalizeArrow` に項目を足せば、セッション経由でも自動的に運ばれる。**
`stage-session.js` は**変更不要**。

## K-1. データに `view` を持たせる

`normalizeArrow` に **`view: "front" | "plan"`** を足す。

- 既定は **`"front"`**。項目が無い古い矢印は正面図の矢印として扱う
  （実際、いままで正面図でしか描けなかったので、事実に合う）。
- **`view === "plan"` のときは `plane` を必ず `"floor"` へ倒す。**
  平面図は高さを表せないため。`raw.plane === "air"` でも `"floor"` にする。
- 位置は既存項目の並びに合わせる（`plane` の隣が読みやすい）。

## K-2. 描画を図ごとに分ける

### `drawArrows(target, L)`（`:8054`）

1. `const wantView = L.plan ? "plan" : "front";`
2. 本体の矢印は **`arrow.view === wantView` のものだけ**描く。
3. 下書き（`arrowDraft`）も **`arrowDraft.view === wantView` のときだけ**描く。
   **★いまの条件 `target === ctx && !L.plan` は使えない。** `ctx` は正面図の
   コンテキストなので、平面図の下書きが出ない。`planCtx`（`:1062` で定義済み・
   同じスコープにある）を足して **`(target === ctx || target === planCtx)`** にする。
   この `target === ctx` の意味は「画面のときだけ。書き出しやサムネイルには焼かない」
   なので、その意図は保つこと。
4. 空中面の奥行きを示す破線ガイド（`drawArrows` 冒頭）は**いままでどおり正面図だけ**。
   条件 `!L.plan` を残す。

### `arrowScreenPoints`（`:7978`）

冒頭の `if (L.plan && arrow.plane === "air")`（空中矢印を平面図で左右1本へ潰す枝）は
**到達不能になる**——空中矢印は `view: "front"` しか持てず、平面図では描かれないため。
**この枝を削除する。** 削除して他が壊れないことは、呼び出し元が
`drawOneArrow`（`:8013`）と `arrowAt`（`:8089`）の2つだけで、どちらもK-2/K-3で
view で絞られることから確認済み。

### 呼び出し元のコメント（`:10015` 付近）

> // 自由矢印は作図の印なので、駒より手前へ置き、正面・平面の両方へ出す。

を、**「描いた図にだけ出す（本人指示 2026-08-27）。駒より手前へ置く」**の趣旨へ書き換える。

## K-3. 当たり判定を図ごとに分ける

`arrowAt(point, L, view)`（`:8083`）は `view` を受け取っているのに使っていない。
**`arrow.view !== view` の矢印は飛ばす。** 返す値は `sc().arrows` の添字のままにすること
（消去が別の矢印を消さないように）。

## K-4. 操作のゲートを開く

### ① 正面図を閉じたときに道具が戻される（`setViewShown` 内・`:17516`）

```
if (!state.showFront && tool !== "select") setTool("select");
```
→ **矢印は残す。** `tool !== "select" && tool !== "arrow"` にする。
（`route` も平面図の道具なので同じ問題があるが、**今回は触らない**。観察として報告だけすること。）

### ② 道具を選ぶときの拒否（`setTool` 内・`:17770`）

```
if (nextTool === "arrow" && !state.showFront) { announce("矢印は正面図で描きます。…"); return; }
```
→ **この分岐ごと削除する。** 正面・平面のどちらかは必ず開いているので、矢印は常に選べる。
文言 `"矢印は正面図で描きます。正面を開いてください。"` が他で使われていなければ
`stage-i18n.js` の対訳も消す（使われているか grep して確認すること）。

### ③ ポインタを下ろす分岐（`:18412` 付近）

```
if (guestSessionActive() && !(tool === "arrow" && view === "front")) return;
if (tool === "arrow" && view === "front") { … }
```
→ 両方から **`&& view === "front"` を外す**（`tool === "arrow"` だけにする）。
つまり**ゲストも平面図で矢印を描ける。** 発注書E-3の権限線は「ポインタと矢印のみ」なので、
図が増えても線は動かない、という読み。**この判断はClaudeがした**ので報告に明記すること。

下書きを作るところ（`:18428`）:
```
arrowDraft = { plane: arrowPlanePref(), depth: …, … };
```
→ **`view` を足し、平面図では面を床へ倒す。**
```
view,                                     // "front" | "plan"
plane: view === "plan" ? "floor" : arrowPlanePref(),
```
`depth` は平面図では使われない（floorは `b` が奥行きそのもの）が、`normalizeArrow` の
既定に任せてそのまま入れてよい。

Alt（option）クリックで1本消す枝も、そのまま両図で効くようにする（K-3で view が効く）。

### ④ 「空中」ボタン（`index.html:850` / `renderArrowControls` 付近 `:17730`）

**正面図が閉じているときは「空中」を押せなくする**（`disabled` と
`aria-disabled="true"`）。押せないままだと理由が分からないので、`title` に
**「空中の矢印は正面図で描きます」**（英語は `stage-i18n.js` へ対訳を足す）を入れる。
正面図が開いていれば、いままでどおり両方選べる。

## K-5. 図を切り替えたときの下書き

`setViewShown` や図の開閉で、描きかけの `arrowDraft` が宙に浮かないようにする。
既存の `setTool` には `if (arrowDraft) { arrowDraft = null; pointerAction = null; }` がある。
**同じ後始末を `setViewShown` にも入れる**（閉じた図の下書きが残ると、開け直したときに出る）。

## 触ってはいけないもの

- `stage-session.js` / `session-room.js` / `worker.js` / `wrangler.toml` / `mac-app/` 配下（**ゼロ変更**）
- 矢印以外の道具（`route` `light` `paint` `erase` `note` `select`）の挙動
- `fromScreen` / `stagePoint` / `place` / `planBounds` / `layout` の中身（**読むだけ**）
- スマホ閲覧機の分岐（`phoneViewerActive`）——**今回は触らない**。
  スマホは `if (phoneViewerActive && tool !== "note") return;` が先に効くので、
  この発注書の変更ではスマホの挙動は変わらない。変わっていたら報告すること。
- 版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行。**発注元がやる。**

## 共通の制約

- **既存ファイルは編集前に必ず読み直す。** 他のエージェントが触っている前提で。
- **ファイルの削除・移動はしない。**
- 秘密の値をコードやテストへ書かない。
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。

## 完了条件

1. `node --test tests/` 全通過（現状586件。**減らさない**）。
2. 回帰テストを新規 `tests/stage-arrow-per-view.test.mjs` へ追加。最低限:
   - `normalizeArrow` の既定 `view` が `"front"`（項目の無い古い矢印が正面図扱い）
   - `view: "plan"` を渡すと `plane` が `"floor"` へ倒れる（`plane: "air"` を渡しても）
   - `drawArrows` が `wantView` で絞っている（`arrow.view === wantView` の形があること）
   - 下書きの描画条件に `planCtx` が入っている（**`!L.plan` だけになっていないこと**）
   - `arrowAt` が `view` で絞っている
   - `setTool` から「矢印は正面図で描きます」の拒否が**消えている**
   - ポインタ分岐に `tool === "arrow" && view === "front"` が**残っていない**
   - `setViewShown` の道具戻しが `arrow` を残す
   - `arrowScreenPoints` に `L.plan && arrow.plane === "air"` の枝が**残っていない**
   このリポジトリのテストはソース照合（`assert.match(source, /…/)`）が主流。
   `normalizeArrow` のようにDOMに触らない関数は、ソースから関数本文を取り出して
   `new Function` で走らせる形にしてもよい（できなければ照合でよい。その旨を報告する）。
3. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が実機で検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- 仕様に書かれておらず自分で判断した点
- K-4③の「ゲストも平面図で描ける」を実装したか
- **できなかったこと・不確かなことを隠さない。**
