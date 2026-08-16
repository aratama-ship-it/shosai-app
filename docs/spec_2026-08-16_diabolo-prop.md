# 仕様書: 舞台装置に「ディアボロ」を足す（2026-08-16）

対象アプリ: 舞台スケッチ（`index.html` + `stage-sketch.js` + `style.css` + `stage-i18n.js`）

## 共通の制約（必ず守る）

- ファイルの削除・移動はしない。既存ファイルは編集前に必ず読む。
- 既存の道具（シルホイール・ポール・トラピーズ等）の見た目と当たり判定を変えない。
- 追加する日本語UI文言は `stage-i18n.js` へ英訳を足す（`setKind` / `pieceType` の対応表は
  759行付近と767行付近の**2か所ある**ので両方に足すこと）。
- コメントは既存ファイルの流儀（日本語・理由を書く）で。
- CSSは必要なら `style.css` へ追記。既存の配色・密度に合わせる。

## つくるもの

床に置くディアボロ。**縦置き（軸が垂直）と横置き（軸が水平）**の2通りで置ける。
吊物にはしない（`FLOWN_ONLY` には入れない）。

### 種類の登録（`stage-sketch.js`）

`cyrwheel` が登録されている所すべてに、同じ要領で `diabolo` を足す:

| 場所 | 追加内容 |
|---|---|
| `PIECE_TYPES`（739行付近） | `diabolo: "ディアボロ"` |
| `PIECE_METERS`（761行付近） | `diabolo: 0.13` |
| `PIECE_DIMS`（778行付近） | `diabolo: { dia: 0.115, w: 0.13 }` |
| `SET_KINDS`（847行付近） | `diabolo: "ディアボロ"` |
| `SET_KIND_ORDER`（891行付近） | `"cyrwheel"` の直後へ `"diabolo"` |
| `SOLID_TYPES`（1564行付近） | `diabolo: true` |
| `DIM_LABELS`（806行付近） | `diabolo: { dia: "カップの直径", w: "軸を含む長さ" }` |

寸法の既定はカップ直径11.5cm・全長13cm（一般的なディアボロの実寸）。
`dia` と `w` の2つのつまみが出れば十分（`h` は持たない）。

### 置き方（縦／横）

- 駒に `diaboloMode` を持たせる。値は `"lay"`（横置き・既定）と `"stand"`（縦置き）。
- `normalizePiece`（2448行付近、`trapMode` を正規化している所）へ追加:
  `diaboloMode: piece.diaboloMode === "stand" ? "stand" : "lay"`
- 舞台裏へ下げた控えにも残すため、`STASH_KEYS`（2668行付近の配列）へ `"diaboloMode"` を足す。

### 正面図の描き方（`pieceParts` の中。4827行付近の `cyrwheel` の隣へ）

`paintRigging`（輪の描画）は今 `plane:"xz"`（寝た輪）と既定（正面に立つ輪）しか持たない。
**`plane:"yz"` を足す**（横を向いた輪。中心 `c` から y と z へ半径を振る）:

```js
: part.plane === "yz"
  ? riggingPoint(piece, part.c[0], part.c[1] + Math.sin(t) * part.r, part.c[2] + Math.cos(t) * part.r, L)
```

そのうえで `diabolo` の部品を返す。`r = d.dia / 2`、`len = d.w`。

- **横置き（`lay`）**: 向き0度で軸が左右（x）へ通る。正面から見て砂時計の形に見えるため。
  - カップの縁の輪を2枚: `{ kind:"ring", plane:"yz", c:[±(len/2), r, 0], r, w:0.012, tone:"gear" }`
  - 軸: `{ kind:"line", a:[-len/2, r, 0], b:[len/2, r, 0], w:0.02, tone:"gear" }`
  - くびれが分かるよう、内側にもう一回り小さい輪を2枚足してよい
    （`r*0.45` 程度、`c[0]` を `±len*0.12` に）。過剰なら省いてよい。
- **縦置き（`stand`）**: 軸が垂直。カップの縁で床に立つ。
  - 下の輪: `{ kind:"ring", plane:"xz", c:[0, 0.004, 0], r, w:0.012, tone:"gear" }`
  - 上の輪: `{ kind:"ring", plane:"xz", c:[0, len, 0], r, w:0.012, tone:"gear" }`
  - 軸: `{ kind:"line", a:[0, 0, 0], b:[0, len, 0], w:0.02, tone:"gear" }`

### 床の占有（`pieceFootprint`、1570行付近）

`d.dia !== undefined` の分岐より**前**に `diabolo` の分岐を置く（`dia` を持つため、
先に書かないと正方形として扱われる）:

- `stand` → `{ w: d.dia, d: d.dia }`
- `lay` → `{ w: d.w, d: d.dia }`

### 平面図の描き方（`drawPlanPiece` に `diabolo` の分岐を足す）

トラピーズの分岐（「真上からは0.06mの線にしかならず、見えない・掴めない」と書かれた所）と
同じ考えで、**実寸どおりに描くと小さすぎるので下限の画面サイズを設ける**。

- 共通: `target.translate(pos.x, pos.y); target.rotate(-((piece.facing||0)*Math.PI)/180);`
- `stand`: 半径 `Math.max(6, (d.dia/2) * L.pxPerM)` の円を `piece.color` で塗り、
  中心に軸を表す小さな濃い点（半径はその0.3倍）。
- `lay`: 軸方向（x）に `±Math.max(7, (d.w/2) * L.pxPerM)` 離して、
  半径 `Math.max(5, (d.dia/2) * L.pxPerM)` の円を2つ塗り、その間を太さ3pxほどの線でつなぐ。
- 輪郭線は他の駒と同じ `rgba(0,0,0,0.4)` / `lineWidth 1.4` に揃える。

### 置き方を変えるUI（`index.html` + `stage-sketch.js`）

トラピーズの乗り方（`#stage-trap-controls`、index.html 824行付近）を**そのまま手本にする**。

- `index.html` の `#stage-trap-controls` の隣へ:
  ```html
  <div id="stage-diabolo-controls" hidden>
    <label class="stage-control-label">ディアボロの置き方</label>
    <div class="stage-action-row">
      <button type="button" id="stage-diabolo-lay" class="btn-quiet">横置き</button>
      <button type="button" id="stage-diabolo-stand" class="btn-quiet">縦置き</button>
    </div>
  </div>
  ```
- `els` へ `diaboloControls` / `diaboloLay` / `diaboloStand` を登録。
- `updateInspector` の中（`els.trapControls` を出し入れしている14078行付近の隣）で、
  `選んだ駒の type === "diabolo"` のときだけ出し、`aria-pressed` を現在の値に合わせる。
- ボタンを押したら: `checkpoint()` → `piece.diaboloMode = 選んだ値` → `updateInspector()`
  → `render()` → `persistSoon()` → `announce("ディアボロを縦置きにしました。" / "横置きにしました。")`
  （`trapMode` を書き換えている16643行付近の処理と同じ作法で）。

### 文言（`stage-i18n.js`）

- `setKind` / `pieceType` の両方（759行付近・767行付近）へ `diabolo: "Diabolo"`。
- `TEXT` へ:
  - `"ディアボロ": "Diabolo"`
  - `"ディアボロの置き方": "How the diabolo sits"`
  - `"横置き": "On its side"`
  - `"縦置き": "On end"`
  - `"カップの直径": "Cup diameter"`
  - `"軸を含む長さ": "Length including the axle"`
- `SAY` へ（正規表現の表）:
  - `[/^ディアボロを縦置きにしました。$/, "Stood the diabolo on end."]`
  - `[/^ディアボロを横置きにしました。$/, "Laid the diabolo on its side."]`

---

## 完了条件（検証可能な形で）

1. `node --check stage-sketch.js` と `node --check stage-i18n.js` が通り、
   `node --test tests/*.test.mjs` が**全件**通る（i18nの網羅テストがあるので文言の登録漏れは落ちる）。
2. 「出るもの」の種類選びに「ディアボロ」が出て、舞台へ置ける。
3. 置いた直後は**横置き**。正面図で砂時計の形（左右にカップ、間に軸）に見える。
4. インスペクタに「ディアボロの置き方」が出て、「縦置き」を押すと軸が縦になり、
   正面図・平面図の両方が切り替わる。選び直しても保存され、リロード後も残る。
5. 平面図で、横置きは軸方向に並んだ2つの丸、縦置きは1つの丸として見え、
   小さすぎて掴めないということがない（下限サイズが効いている）。
6. 向きのつまみ（フェーダー／スクロール回転）で回すと、正面図・平面図とも一緒に回る。
7. 実装後、変更点の要約を本ファイル末尾に「## 実装メモ(Codex)」として追記する。

## 実装メモ(Codex)

- `diabolo` を舞台セットの種類へ登録し、カップ直径11.5cm・軸を含む長さ13cmの寸法と、横置き／縦置きの保存状態を追加した。
- 正面図へ3次元の輪と軸、平面図へ掴みやすい下限サイズ付きの横2円／縦1円を追加し、向きと床占有も置き方に追従させた。
- インスペクタの置き方ボタン、日本語／英語文言、操作アナウンスを追加した。既存の操作行CSSを再利用できたため `style.css` の変更は不要だった。
