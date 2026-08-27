# 発注書N: スマホ縦向きの図を縦に伸ばす（キャンバスを4:3にする）

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-27。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 背景（本人指示）

2026-08-26:
> 縦向きで図が横長すぎる。**縦幅を1.2倍くらいにしたい。**その余った部分にメモ欄を作るような感じで

メモ欄は8/26に作った。**残っているのは図の縦幅。** 2026-08-27の実測で、スマホ縦向き
(375×812)では図の下に**約235pxの空き**が残っている。

## Claudeが調べて確認済みの事実（再調査不要）

行番号は2026-08-27・commit `a07ccba` 時点。

### 1. なぜ空くのか——キャンバスが16:9固定だから

- `index.html` の `<canvas id="stage-canvas" width="1280" height="720">`（`:900` と `:956`）
- `stage-sketch.js:1070-1071` で `const W = canvas.width; const H = canvas.height;`
- `style.css:2652-2659` に **`#stage-canvas, #stage-plan-canvas { width:100%; height:auto; aspect-ratio: 16 / 9; }`**

スマホ縦向きは幅366px前後なので、図の高さは `366 / (16/9) = 206px`。二段で412px。
**絵はキャンバスいっぱいに描かれている。空いているのはキャンバスの外側。**
→ **縦を伸ばすにはキャンバスの内部寸法（backing store）を変えるしかない。**
CSSで縦だけ伸ばすと絵が歪む。

### 2. 正面図は720px前提の絶対座標に固定されている（★ここが肝）

`stage-venues.js` の席定義（`:163` 以降・15件超）が **`floorY` `bottomY` `apron` を画素の実数**で持つ
（`floorY: 490` / `bottomY: 532` / `apron: 150` など）。`layout()` の正面図の枝（`stage-sketch.js:5300`
付近）はこれをそのまま画面座標として使う。

→ **キャンバスだけ高くすると、正面図は上部720px内に描かれ、下に空白が residual として残る。**
→ 対策は下記 N-3。**`stage-venues.js` は書き換えないこと**（実在会場プリセットと
`approxFrontSeats` の近似が同じ値を共有しているため）。

### 3. 平面図は縦寸に自動で追随する

`planFit`（`stage-sketch.js:5236` の `@planFit:start`）は `H` を入力に取る純粋関数なので、
**Hを変えるだけで正しく計算される**（2026-08-27の発注書Lで導入済み）。追加の対応は不要。

### 4. 付箋は1280×720の絶対画素で位置を持つ

`normalizeNote`（`:3263`）: `x` は -200..1480、`y` は -200..920 でclamp。コメントにも
「場所は 1280×720 の絵の中の画素で持つ」とある。**Hを変えると縦位置がずれる。** → N-4。

### 5. 向きの変更を拾う口はすでにある

`const orient = () => { closeNoteEditor(); enforcePhoneViews(); applyLayout(); syncViewSwitch(); render(); }`
（`:11255` 付近）が `phoneOrientation`（`:1036` の `matchMedia("(orientation: portrait)")`）の
change に繋がっている。**ここへ寸法の張り替えを足せばよい。**

### 6. 塗りの層は毎回データから描き直される

`buildPaintLayer(L)`（`:5827`）は `paintCtx.clearRect(0,0,W,H)` してから `sc().strokes` を
引き直す。**`paintCanvas` を張り替えても、描いた背景は失われない**（renderで再構築される）。
`intentMaskCanvas`（`:1073`）も同様に毎回 `clearRect` される。

## N-1. 縦向きのスマホだけキャンバスを4:3にする

**`W` は常に1280のまま。変えるのは `H` だけ。**

| 状態 | `H` |
|---|---|
| スマホ閲覧機（`phoneViewerActive`）で**縦向き** | **960**（4:3） |
| それ以外（横向き・PC・iPad PWA） | **720**（16:9・いままでどおり） |

### 実装

1. `const W` / `const H`（`:1070-1071`）を **`let`** にする。**`W` は変更しないが、
   対称にしておくと読み手が迷わない**——という理由で変えてよい。迷うなら `H` だけ `let`。
2. 基準の高さを定数に置く: `const BASE_H = 720;`（**720という数字を各所へ散らさない**）
3. 寸法を張り替える関数を作る:
   ```js
   /* スマホ縦向きだけ、絵の枠を4:3にする。16:9のままだと縦長の画面で
      図の下に空きが残る（2026-08-27 本人指示）。W は変えない。 */
   function applyCanvasSize() {
     const next = (phoneViewerActive && phoneOrientation.matches) ? 960 : BASE_H;
     if (next === H) return false;
     H = next;
     canvas.height = H;
     if (planCanvas) planCanvas.height = H;
     paintCanvas.height = H;
     intentMaskCanvas.height = H;
     return true;
   }
   ```
   **`canvas.height` への代入はキャンバスを消す**が、`render()` が描き直すので問題ない。
4. **初回**: `phoneViewerActive` が決まった後、**最初の `render()` より前**に1回呼ぶ。
5. **向きが変わったとき**: 上記5の `orient` の**先頭**で呼ぶ（`applyLayout()` と `render()` の前）。

## N-2. CSSの `aspect-ratio` を合わせる

`style.css:2657` の `aspect-ratio: 16 / 9` は共通の既定。**これは残す。**
スマホ閲覧機の**縦向きのときだけ** 4/3 にする規則を足す:

```css
/* 縦向きのスマホは絵の枠を4:3にする（stage-sketch.js の applyCanvasSize と対）。
   ★片方だけ直すと絵が歪む。両方そろえること。 */
@media (orientation: portrait) {
  html.stage-phone-viewer #stage-canvas,
  html.stage-phone-viewer #stage-plan-canvas { aspect-ratio: 4 / 3; }
}
```

既存の横向きメディアクエリ（`:11185` 以降）と喧嘩しないか確認すること。

## N-3. 正面図を縦寸に追随させる

`layout()` の**正面図の枝だけ**で、席の3つの値に倍率を掛ける。**`stage-venues.js` は触らない。**

```js
/* 席の floorY / bottomY / apron は 720px の絵に合わせた実数（stage-venues.js）。
   枠を高くしたぶんだけ下げないと、正面図が上へ寄って下に空白が残る。
   PCでは k === 1 なので何も変わらない。 */
const k = H / BASE_H;
const floorY = seat.floorY * k;
const bottomY = seat.bottomY * k;
const apron = seat.apron * k;
```

以降、その枝の中で `seat.floorY` / `seat.bottomY` / `seat.apron` を**直接読んでいる箇所を
すべてこのローカル値へ置き換える**（`headroom` の計算、`horizon`、`backY`、`floorY`、
`rawFloorY`、`rawCeilY`、`apronBottom` など）。**読み替え漏れがあると絵が破綻するので、
その枝の中の `seat.` を全部たどって確認すること。**

`seat.backW` / `frontW` / `shift` / `rise` / `tilt` / `eye` は**倍率・比率なので掛けない。**

## N-4. 付箋の縦位置を追随させる

付箋の `y` は720基準の画素なので、画面へ出すときに `k` を掛ける。

- 描画（`drawNotes`）と、掴む/当たり判定（付箋を拾っている箇所）の**両方**に同じ換算を入れる。
  **片方だけだと、見えている位置と掴める位置がずれる。**
- 換算は1か所の小さな関数にまとめる（例 `noteScreenXY(note)` → `{ x: note.x, y: note.y * (H / BASE_H) }`）。
  `x` は `W` が変わらないのでそのまま。
- 逆向き（画面→保存）も存在するなら同じ倍率で割ること。**スマホでは付箋を作れない**
  （発注書Mで道具を外した）が、PC側の経路を壊さないこと（PCは k=1）。

## 触ってはいけないもの

- **`stage-venues.js`**（席の定数・会場データ）——**ゼロ変更**
- `planFit`（発注書Lで入れたばかり。`H` を受け取る形のままでよい）
- iPad PWA（`tabletPwaActive`）とPCの見え方——**k=1・H=720 で完全に従来どおりであること**
- `stage-session.js` / `worker.js` / `session-room.js` / `mac-app/` 配下（**ゼロ変更**）
- 版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行。**発注元がやる。**

## 共通の制約

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。
- **版番号を直書きしているテストがある**（`tests/stage-session-shelve.test.mjs` /
  `tests/stage-venue-library.test.mjs`）。**版上げは発注元がやるので、そこは触らないこと。**

## 完了条件

1. `node --test tests/` 全通過（現状601件。**減らさない**）。
2. 回帰テストを新規 `tests/stage-phone-canvas-size.test.mjs` へ追加。最低限:
   - `applyCanvasSize` が `phoneViewerActive && phoneOrientation.matches` のときだけ960を選ぶ
   - `canvas.height` `planCanvas.height` `paintCanvas.height` `intentMaskCanvas.height` の
     **4つすべて**を張り替えている（1つでも漏れるとずれる）
   - `orient` の中で `applyCanvasSize()` が `render()` **より前**に呼ばれている
   - `BASE_H = 720` があり、正面図の枝が `seat.floorY` を**直接使っていない**
   - `seat.backW` / `frontW` / `shift` / `rise` / `tilt` に `k` を掛けていない
   - `style.css` に縦向きスマホの `aspect-ratio: 4 / 3` がある
   - 付箋の換算が描画と当たり判定の両方から呼ばれている
3. `planFit` に `H = 960` を渡したときの数値テストを `tests/stage-plan-fit.test.mjs` へ追記:
   - 12×9m `front`・W=1280・**H=960** で、袖が画面内に収まる／客席の帯の96pxが残る
   - **H=720 のときの結果が変わっていない**（PCの回帰）
4. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が検証する）。

## 期待される結果（Claudeの手計算。実装後に突き合わせること）

12×9m `front`・スマホ縦向き(幅366px想定):

| | いま(H=720) | あと(H=960) |
|---|---|---|
| キャンバスの画面上の高さ | 206px | **274px** |
| 図の中の舞台 `sw`×`sh` | 766×576 | **869.6×652**（横で頭打ちへ変わる） |
| 画面上の舞台の大きさ | 219×165 | **249×186** |
| 二段の図の合計 | 412px | **548px** |
| 図の下の空き | 約235px | **約99px** |

**4:3より高くしても舞台は大きくならない**（12×9の会場では横で頭打ちになるため）。
だから960（4:3）が妥当な着地点である。**この根拠が崩れる会場があれば報告すること。**

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- **上の期待値表と実装後の実測の突き合わせ**（食い違ったら、勝手に表へ合わせず、
  自分の計算を示して報告する）
- N-3で `seat.` を読み替えた箇所の一覧（漏れが無いことの根拠）
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**
