# 仕様書: 自由描画の矢印（床／空中・3D）（2026-08-16）

対象アプリ: 舞台スケッチ（`index.html` + `stage-sketch.js` + `style.css` + `stage-i18n.js`）

## 共通の制約（必ず守る）

- ファイルの削除・移動はしない。既存ファイルは編集前に必ず読む。
- 既存機能（動線・メモ・背景の塗り／消し・照明・ドラッグ・アンドゥ・保存/読込・
  シーン一覧グリッド・印刷）を壊さない。
- 日本語UI文言は `stage-i18n.js` へ英訳を足す（`announce()` の文は `SAY` の正規表現表）。
  **i18nの網羅テストがあるので、登録漏れはテストで落ちる。**
- CSSは `style.css` へ追記。既存の落ち着いた茶系・密度に合わせる。
- コメントは既存ファイルの流儀（日本語・理由を書く）で。

## つくるもの

**駒に紐づかない、手描きの矢印**。動線（`piece.route`）は「ある駒が次にどこへ行くか」の
一方通行だが、これは**往復・行ったり来たり・投げの軌道など、何にでも使える印**。

- 舞台の3D空間に置く。**床の上**にも、**空中の垂直な面**にも描ける。
- 矢じりは**片側**か**両側**（往復は両側）。
- 正面図で描く。平面図にも同じものが出る。

## データ

シーンごとに `arrows` を持つ（`scene.strokes` は背景の塗りなので**別物**。混ぜない）。

```js
arrow = {
  id,                       // rid("arrow")
  plane: "floor" | "air",
  depth: 0..1,              // air のときの奥行き v。floor では使わない
  points: [{ a, b }, ...],  // floor: a=左右u(0..1)  b=奥行きv(0..1)
                            // air:   a=左右u(0..1)  b=高さ(m, 0..12)
  heads: "one" | "both",
  color: "#rrggbb",
  width: 1..8,              // 画面上の太さの目安（既定 3）
}
```

- `normalizeScene`（2620行付近）へ:
  `arrows: Array.isArray(raw.arrows) ? raw.arrows.slice(-60).map(normalizeArrow).filter((x) => x.points.length >= 2) : []`
- `normalizeArrow` を `normalizeStroke` の隣に作る。点は最大400まで、
  `a` は 0〜1 に、`b` は plane が floor なら 0〜1、air なら 0〜12 に丸める。
- `newScene`（2200行付近）にも `arrows: []` を足す。

## 座標の変換（既存関数をそのまま使う）

- 床の点 → 画面: `place(u, v, L)`（3691行付近）。戻り値の `rawY` が傾ける前の高さ。
- 画面 → 床: `fromScreen(x, y, L)`（3717行付近）。
- **高さのある点 → 画面**: `riggingPoint` と同じ作法で作る。新しい補助関数を1つ置く:

```js
  /* 舞台の点（左右u・奥行きv・高さhメートル）を画面へ落とす。
   * 床の1m枡と同じ道（place → perMetre → tilt）を通るので遠近が一致する。 */
  function stagePoint(u, v, h, L) {
    const p = place(u, v, L);
    if (L.plan || !h) return { x: p.x, y: p.y };
    return { x: p.x, y: L.tilt(p.rawY - h * perMetre(p, L).y) };
  }
```

- 矢印の点 → 画面:
  - `floor`: `stagePoint(pt.a, pt.b, 0, L)`
  - `air`: `stagePoint(pt.a, arrow.depth, pt.b, L)`

## 描く道具（ツール）

`index.html` の `.stage-tool-grid`（507行付近）へボタンを1つ足す:

```html
<button type="button" data-stage-tool="arrow" data-tablet-icon="↗" aria-label="矢印を描く" aria-pressed="false">矢印を描く</button>
```

- `tool` の値に `"arrow"` を足す。`setTool` / `dataset.tool` / ツールの説明文
  （`stage-tool-hint`）など、既存のツールが登録されている所すべてに同じ要領で足す。
  説明文: 「正面図をなぞると矢印になります。床の上か空中かを選べます。」
- **正面図でだけ描ける**。平面図では今までどおり（`planCanvas.dataset.tool` の
  分岐に arrow を入れない＝平面図では select と同じ扱い）。

### 描いている間の操作（`onPointerDown` / `onPointerMove` / `finishPointer`）

- 正面図で `tool === "arrow"` のとき、pointerdown で新しい下書きを始める。
  - `arrowDraft = { plane, depth, heads, color, width, points: [] }`
  - pointermove のたびに点を足す。**直前の点から画面上で4px以上離れたときだけ**足す
    （そのまま全部拾うと点が数千になる）。
- pointerup で確定:
  - 点が2つ未満、または画面上の全長が12px未満なら**捨てる**（誤タップで
    ゴミが増えないように）。
  - 確定するときは `checkpoint()` → `sc().arrows.push(...)` → `render()` → `persistSoon()`
    → `announce("矢印を描きました。")`
- 描いている最中も線を出す（下書きは `render()` の中で `arrowDraft` を描く）。

### 道具の設定（正面図の上のバーへ）

正面図のキャンバス上のトグル列（`index.html` 712行付近、「メモ」「照明」「光の意図」
「見る位置の図」が並んでいる所）の並びへ、**arrow ツールのときだけ出す**設定を置く。
`id="stage-arrow-options"`、既定は `hidden`。中身:

1. 面の選択（2つのボタン、`aria-pressed`）
   - `stage-arrow-plane-floor`「床」
   - `stage-arrow-plane-air`「空中」
2. 奥行き（`stage-arrow-depth`、`input[type=range]` min=0 max=1 step=0.01 value=0.5）
   - **`plane === "air"` のときだけ出す**。ラベル「奥行き」。
   - 値の表示は「奥から◯%」ではなく、既存の距離表示に合わせて
     `((1 - v) * 奥行きm).toFixed(1) + "m"`（＝ツラからの距離）を出す。
3. 矢じり（2つのボタン、`aria-pressed`）
   - `stage-arrow-head-one`「片側」（既定）
   - `stage-arrow-head-both`「両側」
4. 色（`stage-arrow-color`、`input[type=color]`、既定 `#d3ac59`）
5. 「この場面の矢印を消す」ボタン（`stage-arrow-clear`）
   - 押すと `checkpoint()` → `sc().arrows = []` → `render()` → `persistSoon()`
     → `announce("矢印を消しました。")`。矢印が0本のときは `disabled`。

これらの設定はプロジェクトではなく**端末の設定**として `prefs` に覚えさせる
（`prefs.arrowPlane` / `arrowDepth` / `arrowHeads` / `arrowColor`、`savePrefs()`）。
シーンやショーの中身ではないため。

### 空中の面の目印

`tool === "arrow"` かつ `plane === "air"` のあいだ、正面図に**その面の位置を示す横線**を
薄く引く（床の `depth` の位置に、舞台の左端から右端へ `rgba(211,172,89,0.35)` の破線）。
どこに描かれるのかが分からないと空中は使えないため。

## 描画（`drawStage` の中）

動線（`drawRoutes`）と同じ層のあたりで `drawArrows(target, L)` を呼ぶ。
**駒より手前**に描く（作図の印なので、隠れると意味がない）。

### 正面図

- 点を上の変換で画面へ落とし、`lineJoin/lineCap = "round"` で折れ線を引く。
  太さは `arrow.width`（既定3）。色は `arrow.color`。
- 矢じり: 終端（`heads === "both"` なら始端にも）へ三角形を置く。
  向きは端から数点ぶん内側の点との角度で決める（動線の `head` と同じ考え方、
  大きさは `9 + arrow.width * 2` 程度）。
- `air` の矢印は、**面が浮いていることが分かるように**、始端の真下（床）へ
  細い縦の点線を1本落とす（`rgba(...,0.25)`）。これがないと高さが読めない。

### 平面図

- `floor`: そのまま `place(a, b, L)` で折れ線＋矢じり（正面図と同じ形）。
- `air`: 高さは潰れるので、**`depth` の位置に、点の `a`（左右）の範囲を結ぶ線**を
  破線で引き、両端（または終端）に矢じり。空中であることを破線で示す。

### 印刷・書き出し

`drawStage` を通るので印刷ページとシーン一覧グリッドには自動で乗る。
特別な対応は不要（**乗っていることを確認すること**）。

## 消し方（個別）

- `tool === "arrow"` のとき、**Alt（option）を押しながらクリック**で、
  その点に近い矢印を1本消す（画面上で12px以内）。
  `checkpoint()` → 配列から取り除く → `render()` → `persistSoon()`
  → `announce("矢印を1本消しました。")`
- 説明文（ツールのヒント）にこの操作を書く。

## 文言（`stage-i18n.js`）

TEXT へ: 「矢印を描く」"Draw an arrow" /「矢印」"Arrow" /「床」"On the floor" /
「空中」"In the air" /「奥行き」"Depth" /「矢じり」"Arrowhead" /「片側」"One end" /
「両側」"Both ends" /「この場面の矢印を消す」"Clear this scene's arrows" /
「正面図をなぞると矢印になります。床の上か空中かを選べます。」
"Drag on the front view to draw an arrow. Choose the floor or the air."

SAY へ:
- `[/^矢印を描きました。$/, "Drew an arrow."]`
- `[/^矢印を消しました。$/, "Cleared the arrows."]`
- `[/^矢印を1本消しました。$/, "Removed one arrow."]`

---

## 完了条件（検証可能な形で）

1. `node --check stage-sketch.js` と `node --check stage-i18n.js` が通り、
   `node --test tests/*.test.mjs` が**全件**通る。
2. 「矢印を描く」を選ぶと設定の列が出る。正面図をなぞると矢印が描け、離すと確定する。
   誤タップ（ほぼ動かさないクリック）では何も増えない。
3. 「床」で描いた矢印は舞台の床に寝て見え、奥へ行くほど細く（遠近が）見える。
   平面図でも同じ経路が出る。
4. 「空中」で描いた矢印は、指定した奥行きの垂直な面の上に立つ。描いている間、
   その面の位置が床に破線で示される。平面図ではその奥行きの位置に破線で出る。
5. 矢じりを「両側」にすると、両端に三角が付く（往復の表現ができる）。
6. Alt+クリックで1本だけ消せる。「この場面の矢印を消す」で全部消える。
   どちらも「一つ戻す」で戻る。
7. リロードしても矢印が残る。書き出したJSONを読み込み直しても残る。
8. 印刷用ページとシーン一覧グリッドのサムネイルにも矢印が出る。
9. 実装後、変更点の要約を本ファイル末尾に「## 実装メモ(Codex)」として追記する。

## 実装メモ(Codex)

- `scene.arrows` を背景の `strokes` とは別に追加し、新規シーン・JSON正規化・複製・
  自動保存・Undo/Redoの既存経路へ接続した。矢印は1シーン60本、1本400点までに正規化する。
- 正面図専用の「矢印を描く」ツールと、床／空中、空中面の奥行き、片側／両側の矢じり、
  色、シーン内全消去の設定列を追加した。設定値はショーではなく端末の `prefs` に保存する。
- 4px間隔の自由描画、12px未満の誤タップ破棄、Alt（option）+クリックでの1本削除を追加した。
  空中面の位置、空中矢印から床への高さ補助線、平面図での破線投影も描画する。
- 自由矢印は共通の `drawStage` で駒より手前へ描くため、通常表示だけでなくシーン一覧グリッド、
  画像書き出し、印刷用ページの正面図／平面図にも同じデータが出る。
- 日本語UI文言と操作アナウンスの英訳を `stage-i18n.js` に追加し、設定列の見た目を
  `style.css` の既存の茶系・小密度に合わせた。
