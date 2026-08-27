# 発注書L: 平面図の既定の大きさを「実際に要る余白」から決める

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-27。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 本人指示（2026-08-27）

> （平面図の余白を必要な分だけにして図を大きく）**これは両方です**（＝PCもスマホも）。
> どちらも拡大縮小ができるはずなので**デフォルトで大きめに表示**しましょう。

## ★先に訂正: 前の下調べに誤りがあった

`docs/BACKLOG_PHONE_NOTE_AND_CANVAS_2026-08-26.md` にこう書いた——
> 幅は `planBounds()` の `uMin`/`vMin` から決まる ＝**舞台の外に置かれた駒の位置**で決まる

**これは誤り。** `planBounds()`（`stage-sketch.js:5219` 付近）は駒を一切見ていない。

```js
const du = WING_M / (size.width || 12);   // WING_M = 2.5（袖の奥行き・m）
const dv = WING_M / (size.depth || 9);
if (v.audience === "three") return { uMin: 0, uMax: 1, vMin: -dv, vMax: 1 };
return { uMin: -du, uMax: 1 + du, vMin: 0, vMax: 1 };
```

**会場の寸法だけで決まる固定値**である。したがって「袖に駒が無ければ余白を詰められる」
という前の案は成り立たない。**駒の有無に関係なく、袖の帯は常に同じ幅で描かれる。**

正しい問題はこうだった——**固定の `pad = 104` と、会場寸法で決まる袖の幅が、
互いに無関係に決められている。** だから会場によって余りが出たり、詰まったりする。

## Claudeが調べて確認済みの事実（再調査不要）

行番号は2026-08-27・commit `a464428` 時点。

### 1. いまの計算（`layout(view)` の `plan` の枝・`:5234`）

```js
const pad = v.audience === "round" ? 176 : 104;
const availW = W - pad * 2;
const availH = H - pad * 2;
const ratio = size.depth / size.width;
let sw = availW; let sh = sw * ratio;
if (sh > availH) { sh = availH; sw = sh / ratio; }
const shift = v.audience === "none" ? 0 : (v.audience === "round" ? 0 : -28);
return { plan: true, venue: v, size,
  stage: { x: (W - sw) / 2, y: (H - sh) / 2 + shift, w: sw, h: sh },
  pxPerM: sw / size.width };
```

キャンバスは **`W = 1280` / `H = 720` 固定**（`index.html:900` `:956` の
`<canvas width="1280" height="720">`。端末差はCSSの拡大なので、**この変更はPC・iPad・
スマホすべてに同じだけ効く**＝本人指示の「両方」を満たす）。

### 2. 舞台の枠の外に何が描かれるか（`drawPlanVenue`）

| 会場形式 | 枠の外に描かれるもの | 要る余白 |
|---|---|---|
| `front`（9会場） | 左右に袖の帯（幅 `-uMin * s.w` = **`WING_M * pxPerM`**）／下に客席の帯（`s.y+s.h+14` から `H-30` まで、文字は `s.y+s.h+58`） | 左右=袖ぶん、下=**96px**（文字が入る高さ） |
| `three`（3会場） | 上に舞台裏の帯（高さ `-vMin * s.h` = **`WING_M * pxPerM`**）／左右の客席（`s.x-96` から幅78）／下の客席（高さ76・文字は `+52`） | 上=袖ぶん、左右=**96px**、下=**96px** |
| `round`（3会場） | 同心円5本（半径 `max(s.w,s.h)/2 + i*19`、最外 **+95**）＋文字（さらに約28px） | 四方に `max(s.w,s.h)/2 + 123 - (該当辺/2)` |
| `none`（3会場） | 袖の帯のみ | 左右=袖ぶん、上下=なし |

**袖の帯の幅は、上でも左右でも `WING_M * pxPerM` に等しい**（`dv * sh = WING_M/depth *
sw*ratio = WING_M * sw/width = WING_M * pxPerM`）。計算が一本化できる。

### 3. 作成会場・実在会場（`custom` / `realVenue`）は枠の外に何も描かない

`drawCustomPlanVenue` は輪郭の外接矩形を `L.stage` へそのまま写す（`pointAt`）ので、
**輪郭も客席多角形も必ず `L.stage` の中に収まる。**
ただし `planBounds()` は custom でも袖を返すので、**駒は袖へ置ける**。
→ **袖ぶんの余白は custom でも要る**（帯は描かれないが、駒が出る）。

### 4. いまの数字（既定の12m×9m・`front`）

`pad=104` → `availH = 512` が効いて `sh = 512`、`sw = 682.7`、`pxPerM = 56.9`。
**縦が制約**になっている。左右には `(1280-682.7)/2 = 298.7px` も空いているのに、
袖に要るのは `2.5 × 56.9 = 142px` だけ。**156px が使われないまま余っている。**

## L-1. 余白を「描かれるものから」計算する

`layout()` の中に埋めず、**純粋関数として切り出す**（テストできるようにするため）。
`layout()` のすぐ上に、**この形で**置くこと。アンカーのコメントは
テストが本文を取り出すために使うので、**一字一句そのまま**入れる。

```js
/* @planFit:start */
/* 平面図の既定の大きさ。舞台の枠だけでなく、その外に描かれるもの（袖の帯・客席・
   全周の円）と、袖へ置かれる駒まで画面へ収める。固定の余白（旧 pad=104/176）だと
   会場の寸法と無関係なので、余ったり詰まったりした。外部を一切参照しない純粋関数に
   してあるのは、テストから取り出して数値で確かめるため。触るときは同じ性質を保つこと。 */
function planFit(input) {
  // input: { W, H, audience, width, depth, wingM }
  // 返り値: { stage: { x, y, w, h }, pxPerM }
  …
}
/* @planFit:end */
```

### 計算の中身（この式のとおりに実装すること）

記号: `ratio = depth / width`、`sw` = 舞台の幅(px)、`sh = sw * ratio`、
`pxPerM = sw / width`、`wingPx = wingM * pxPerM = wingM * sw / width`。

**息継ぎの余白 `M = 24`。** 駒は位置を中心に描かれるので、枠の縁に置いた駒は
半分だけ外へはみ出す。その分を見込んだ値（24px ≒ 平面図での小さな駒の半分）。

各辺に要る幅:

| 会場形式 | 左右 | 上 | 下 |
|---|---|---|---|
| `three` | `96 + M` | `wingPx + M` | `96 + M` |
| `round` | 下記の別扱い | 別扱い | 別扱い |
| それ以外（`front` `none` `""` ほか） | `wingPx + M` | `M` | `audience === "none" ? M : 96 + M` |

**`round` 以外**は、辺ごとの必要量が `sw` に比例する（`wingPx`）か定数なので、
そのまま解ける:

```
横: sw + 2*(左右に要る幅) ≤ W
      それ以外の形式 → sw * (1 + 2*wingM/width) + 2M ≤ W
      three        → sw + 2*(96 + M) ≤ W
縦: sh + 上 + 下 ≤ H
      それ以外 → sw*ratio + M + (none ? M : 96 + M) ≤ H
      three   → sw*ratio + (wingM*sw/width + M) + (96 + M) ≤ H
```

`sw` について解き、**小さい方**を採る。

**`round` の別扱い**: 同心円の最外半径は `max(sw, sh)/2 + 95`、さらに文字へ約28px。
円は縦横どちらへも同じだけ広がるので、短い辺で決まる:

```
max(sw, sh)/2 + 95 + 28 + M ≤ min(W, H)/2
→ sw ≤ (min(W, H) - 2*(95 + 28 + M)) / Math.max(1, ratio)
```

### 位置

```
x = (W - sw) / 2                                  // 左右の必要量は対称なので中央でよい
y = 上に要る幅 + (H - 上に要る幅 - 下に要る幅 - sh) / 2
```

**旧 `shift = -28` は削除する。** 「客席のぶん舞台を上へ寄せる」という意図は、
`下に要る幅` を明示的に確保することで満たされる。二重にずらすと下がりすぎる。

### 期待される結果（Claudeが手計算した値。実装後に確かめること）

| 会場 | いまの `sw` | 新しい `sw` | 倍率 |
|---|---|---|---|
| 12×9m `front` | 682.7 | **784** | **約1.15倍** |
| 12×9m `none` | 682.7 | 869.6（横で頭打ち） | 約1.27倍 |
| 正方形 `round` | 368 | 450 | 約1.22倍 |

**「1.2倍」は会場によって届かない**（`front` は下の客席の帯が固定費として効くため）。
本人には「およそ1.15〜1.27倍。会場形式で変わる」と報告する。

## L-2. `layout()` から呼ぶ

`plan` の枝を、`planFit({ W, H, audience: v.audience, width: size.width,
depth: size.depth, wingM: WING_M })` の呼び出しへ置き換える。返り値の `stage` と
`pxPerM` をそのまま既存の戻り値へ入れる。**`plan: true, venue: v, size` はそのまま。**

`WING_M` は `planBounds()` と同じ定数を渡すこと（**二重に定義しない**。
ずれると帯の幅と余白の計算が食い違い、袖が切れる）。

## 触ってはいけないもの

- **正面図のレイアウト**（`layout()` の `plan` でない側）。**今回は対象外。**
  正面図は擬似パースで「余白」という概念が無く、別途の調査が要る。
- `planBounds()` / `fromScreen` / `place` / `stagePoint` の中身
- `drawPlanVenue` / `drawCustomPlanVenue` の描画そのもの（**読むだけ**）
- ズーム（`zoomOf` / `ZOOM_MIN` / `ZOOM_MAX` / ピンチ）。既定の大きさだけを変える
- `stage-session.js` / `worker.js` / `mac-app/` 配下（**ゼロ変更**）
- 版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行。**発注元がやる。**

## 共通の制約

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。

## 完了条件

1. `node --test tests/` 全通過（現状586件。**減らさない**）。
2. 回帰テストを新規 `tests/stage-plan-fit.test.mjs` へ追加。
   **`/* @planFit:start */` と `/* @planFit:end */` の間を `stage-sketch.js` から
   取り出し、`new Function` で走らせて数値で確かめる**（このリポジトリの
   `tests/stage-set-model.test.mjs` が別ファイルを `vm` で走らせている先例に倣う。
   `planFit` は外部を参照しない純粋関数なので、この方法で走る）。最低限:
   - **4形式すべてで、枠の外に描かれるものが画面に収まる**——
     `front`/`none`/custom想定: `stage.x - wingPx >= 0` かつ `stage.x + stage.w + wingPx <= W`
     `three`: `stage.y - wingPx >= 0` かつ左右に96px以上
     `round`: `max(w,h)/2 + 95 + 28` が中心から `min(W,H)/2` に収まる
   - **下の客席の帯と文字が入る**——`none` 以外で `H - (stage.y + stage.h) >= 96`
   - **いまより大きくなる**——12×9m `front` で `stage.w` が旧計算（`pad=104`）の
     **1.1倍以上**（旧値682.7を直書きせず、旧式もテスト内で計算して比べること）
   - 極端な会場で壊れない——幅50m×奥行2m、幅2m×奥行50m、1m×1m で
     `stage.w > 0 && stage.h > 0` かつ上のはみ出し条件を満たす
3. `stage-sketch.js` に **`pad = 104` / `176` / `shift = -28` が残っていない**ことを
   ソース照合で確かめる。
4. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が実機で検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- **上の「期待される結果」の表と、実装後の実測値の突き合わせ**（食い違ったら、
  どちらが正しいか自分の計算を示して報告する。勝手に表へ合わせない）
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**
