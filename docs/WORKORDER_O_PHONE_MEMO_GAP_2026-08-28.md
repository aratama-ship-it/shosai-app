# 発注書O: スマホ縦向き、平面図の下とメモの間に開く隙間を埋める

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-28。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 本人指摘（2026-08-28）

> PWAの方と縦表示のとき並べて表示したときにメモが1番下にひっつくようになっていると
> 思うのですが、平面図の下とメモの間が開くことが起きます。それも修正してほしいです。
> メモのサイズを大きくすればいいだけだと思います。

発注書N（2026-08-27・スマホの図を4:3にする）の副作用。図が縦に伸びた結果、
メモ欄との間に隙間ができるようになった。

## Claudeが実ブラウザで確認済みの事実（再調査不要）

`?phone-viewer-preview` を付けたローカル配信で、428×926（iPhone 13 Pro Max相当）を
実測。**隙間は`.stage-canvas-stack`自身の箱の内側にある**——正面図・平面図の2枚
（`grid-template-rows: auto auto`）が箱の上に詰めて並び（`align-content: start`）、
箱の下端まで届かないぶんが**138.2px**、何も描かれない空間として残っていた
（`.stage-canvas-stack`の背景色がページと同じ暗色なので、隙間だと分かりにくい）。

- `.stage-board-column`の6段目（`.stage-canvas-stack`）は`minmax(0, 1fr)`＝
  残りの縦幅を**全部**取る指定。取った分より2枚の図が小さければ、余りは
  `.stage-canvas-stack`の箱の中に**空白として残ったまま**、メモ（7段目・`auto`）へは流れない。
- 375×667（iPhone SE級・画面が低い）では隙間が0だった。**画面が縦に長いほど
  隙間が大きくなる**構造的な問題で、iPhone 13 Pro Maxに限らない。

### ★なぜ「メモの段を1frにするだけ」では直せないか

`.stage-board-column`の7段構成（`30px 48px auto auto auto minmax(0, 1fr) auto`）の
6段目（図）と7段目（メモ）を単純に入れ替える（図=auto・メモ=1fr）と、**別の壊れ方をする**。

情報・ショー・設定パネルは互いに排他（`infoToggle`等のクリックで他が閉じる。
`stage-sketch.js:11254-11269`で確認済み）なので**同時に開くのは最大1つ**。だが
「ショー」パネルは実測**192px**（`.stage-phone-source`）を要る。375×667（画面が低い機種）で
このパネルを開くと、固定部（題30+道具48+パネル192=270px）を除いた残りは**397px**。
一方2枚の図の自然な高さは375px幅で**約558px**（428px幅での実測637pxを375/428で換算）。
**図がautoで縮まない設計にすると、パネルを開いた瞬間に397px使えるのに558px要求する
＝約160px分あふれ、`.stage-board-column`の`overflow: hidden`が図の下側を切り取る。**
現状（図=1fr）はこの場面で図がちゃんと縮んでいるので、優先順位を逆転させてはいけない
（`.stage-board-column`の既存コメント「上のパネルが開いても縮むのは図のほう」は
理由があって書かれている）。

## O-1. メモをcanvas-stackの中へ移す（設計の核）

**`.stage-phone-memo`を`.stage-board-column`の7段目から、`.stage-canvas-stack`の
3段目（内部の子要素）へ移す。** 外側の7段グリッドは6段になる。

これなら**パネルが開いたときは、いままでどおり図（を含むcanvas-stack全体）が
真っ先に縮む**——外側の6段目（canvas-stack）は変わらず`minmax(0, 1fr)`のまま。
**空きが出る・出ないの判定は、canvas-stackの内側だけで完結する**——中の3段目
（メモ）が`minmax(0, 1fr)`で余りを引き受け、2枚の図（`auto auto`）は自分の自然な
高さより増えも減りもしない。パネルを開いてcanvas-stack自体が縮んだときは、
中のメモ（1fr・最小0）が先に潰れ、それでも足りなければ`overflow: hidden`で
図の下端が切られる——**これは現状と同じ壊れ方**（悪化させない）。

### JSの変更（`stage-sketch.js`）

`board.append(memoBar);`（現在の行。`board`=`.stage-board-column`）を
**`els.canvasStack.append(memoBar);`**へ変える。`els.canvasStack`は`:2447`で
`document.getElementById("stage-canvas-stack")`として既に取得済み。
`phoneUi`オブジェクトへの`memoBar`等の登録はそのまま（構築順・参照は変えない）。

### CSSの変更（`style.css`）

**`.stage-board-column`（`:10784`付近）の`grid-template-rows`から末尾の`auto`を外す**:
```
grid-template-rows: 30px 48px auto auto auto minmax(0, 1fr);
```
（7値→6値。コメントの「7段目は図の下のメモ欄」の説明も、内側へ移った旨に書き換える）

**`.stage-canvas-stack`の基本形（`:11221`付近・向きに関係ない既定）**:
```
html.stage-phone-viewer .stage-canvas-stack {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  place-items: stretch;
  align-content: start;
  ...（他はそのまま）
}
```
`grid-template-rows`を`auto auto`→`auto auto minmax(0, 1fr)`に。他のプロパティは変えない。

**`.stage-phone-memo`（`:10788`付近）**:
- `grid-row: 7;`を削除する（canvas-stackの内側では3行しかないグリッドの自動配置に
  任せてよい。明示したいなら`grid-row: 3;`でもよいが、必須ではない）。
- 見出しコメント「図の下のメモ欄」は「（canvas-stackの3段目・2026-08-28に内側へ移した）」
  等へ更新する。

**横向き（`@media (orientation: landscape)`・`:11310`〜）**:
- `html.stage-phone-viewer .stage-phone-memo { display: none; }`（`:11321`）は
  **そのまま残す。** `display: none`の要素はグリッドの段を作らないので、DOMの親が
  canvas-stackに変わっても何も壊れない（Claudeが仕様上確認済み。実装後に念のため
  横向きで図が縦いっぱいに出ることを確認すること）。
- `html.stage-phone-viewer .stage-canvas-stack`の横向き用の再定義（`:11391`付近・
  `grid-template-rows: minmax(0, 1fr);`という1行グリッドへの上書き）は**そのまま**。
  上書きなので内側にメモがあっても3段目の指定は横向きでは使われない。

## O-2. 動作確認の観点（Codexが実装後、Claudeが実ブラウザで検証する）

1. **縦向き・パネルなし**: 平面図の下に隙間が無く、メモ欄がすぐ下に続く。
   メモの入力欄も以前よりわずかに広がる（本人の見立てどおり）。
2. **縦向き・「ショー」パネルを開く**: 図が縮む（いままでどおり）。メモが画面外へ
   押し出されたり、レイアウトが壊れたりしない。
3. **横向き**: 発注書Nおよび今回の横向き修正（`docs/WORKORDER_N_...`のフォローで
   Claudeが別途直した`.stage-board-frame`のaspect-ratio化）の見え方に変化がないこと。
   メモは出ない。
4. 縦→横→縦を数回往復しても崩れない。

## 触ってはいけないもの

- `.stage-board-frame`とその横向き定義（別件でClaudeが直した。**今回は触らない**）
- `applyCanvasSize` / `BASE_H` / `noteScreenXY`（発注書Nの実装。**ゼロ変更**）
- 情報・ショー・設定パネルの開閉ロジック（排他の仕組み。読むだけ）
- `stage-session.js` / `worker.js` / `mac-app/` 配下（**ゼロ変更**）
- 版上げ（`?v=`・`CACHE_NAME`）と`build_stage.py`の実行。**発注元がやる。**

## 共通の制約

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。

## 完了条件

1. `node --test tests/`全通過（現状624件。**減らさない**）。
2. 次の既存テストを、新しい構造に合わせて更新する（壊すのではなく直すこと）:
   - `tests/stage-phone-save-notice.test.mjs:111` — `grid-template-rows`の7値照合を6値へ
   - `tests/stage-phone-viewer.test.mjs:172` — 同上
   - `tests/stage-phone-viewer.test.mjs:322` — `.stage-phone-memo { grid-row: 7; }`の照合。
     `grid-row`を明示しないなら、この行は「`.stage-canvas-stack`の中に`.stage-phone-memo`
     がある（DOM構造）」ことを確かめる形へ書き換える
   - `tests/stage-phone-viewer.test.mjs:323` — 横向きで`display: none`のままである確認。
     **これは変更不要のはず**（同じセレクタ・同じ値）。通ることだけ確認する
3. 回帰テストを`tests/stage-phone-viewer.test.mjs`（または新規ファイル）へ追加。最低限:
   - `stage-sketch.js`で`els.canvasStack.append(memoBar)`が呼ばれている
     （`board.append(memoBar)`ではないこと）
   - `.stage-canvas-stack`の基本形が`grid-template-rows: auto auto minmax(0, 1fr);`
   - `.stage-board-column`の`grid-template-rows`が6値（末尾の`auto`が無い）
   - 横向きの`.stage-canvas-stack`再定義（`grid-template-rows: minmax(0, 1fr);`）が
     引き続き存在する（横向きの1行グリッドを壊していないこと）
4. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が実機/実ブラウザで検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- 上のO-2の観点1〜4のうち、どこまで確認できたか（できなければ「未実施」と明記）
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**
