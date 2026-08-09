---
title: "光の意図カード Phase 2「視覚との接続」実装発注書"
status: "仕様確定・実装待ち"
updated: "2026-08-09"
target: "Stage Sketch"
---

# 光の意図カード Phase 2「視覚との接続」実装発注書

この文書は Claude が仕様を確定させた実装指示である。判断は済んでいるので、
**書いてあるとおりに実装すること。設計を変えないこと。迷ったら実装せずに報告すること。**

作業ディレクトリ（Gitルート）:

```text
/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app
```

## 0. 絶対に守る境界

- **ファイルの削除・移動をしない。** 新規作成と既存ファイルへの追記・修正のみ。
- **既存ファイルは編集前に必ず読み直す。** 別のエージェントが同じワークスペースを触っている。
- **push / deploy / 公開をしない。** git commit もしない。
- 作業開始前から多数の dirty / untracked ファイルがある。**自分の担当外の変更を巻き戻さない。**
- `mcp-server/` 配下は**一切変更しない**。
- 保存形式を変更しない。`lightingIntent` のスキーマ、`normalizeLightingIntent`、
  ブラウザ version 4、MCP version 3 のいずれも触らない。
- `safetyStatus` に関わるコードを触らない。
- **照明駒（`type === "light"` の piece）を自動生成・自動配置・自動削除しない。**
- 既存の `scene.note`、照明駒、照明プリセット（`LIGHT_PRESETS`）の中身を書き換えない。
- 既存の描画順を変えない。追加する描画は指定された1箇所のみ。

## 1. この機能が何をするか

シーンの `lightingIntent`（光の意図カード）の内容を、正面図・平面図の上に
**作図注記（annotation）として一時的に重ねる**。

**照明のシミュレーションではない。** 「本番はこう見える」を再現するのではなく、
「いまカードのこの文はこの部分の話をしている」を図の上で名指しするだけ。
だから沈める表現に真っ黒を使わず、斜線ハッチなど作図記号だと分かる描き方をする。

重ねは表示状態のみで、**保存されず、Undo/Redo にも入らない。**

---

## 2. 変更するファイル

| ファイル | 変更内容 |
|---|---|
| `stage.html` | カードのDOM移動、正面図バーにトグル1つ、照合帯1つ、プリセットモーダルに注記1行 |
| `style.css` | ドックレイアウト、照合帯、カードの単独ボックス化 |
| `stage-sketch.js` | 重ね描画、照合帯更新、トグル配線、state追加、テスト用エクスポート |
| `stage-i18n.js` | 日英文言 |
| `stage-sw.js` / `index.html` | ローカル版番号の更新 |
| `tests/stage-light-intent-overlay.test.mjs` | **新規** |

---

## 3. state への追加

`stage-sketch.js` の初期 state（`showLightsFront: true,` のすぐ下、
コメント「画面の状態。プロジェクトの内容ではないので、共有や書き出しには含めない」の
ブロック内）へ1つ追加する。

```js
      // 光の意図の重ね。作図注記なので保存も書き出しもしない
      showLightIntent: false,
```

正規化側（`showLightsPlan: raw.showLightsPlan === undefined ? true : Boolean(raw.showLightsPlan),`
の直後）へも追加する。

```js
      showLightIntent: Boolean(raw.showLightIntent),
```

**この state を書き出しJSONへ含める処理は書かないこと。** 既存の `showLightsFront` 等と
同じ扱い（画面状態）になっていればよい。

---

## 4. 重ねを出す条件

```js
const lightIntentOverlayOn = () => (
  state.showLightIntent
  || Boolean(els.lightIntent && els.lightIntent.open && !els.lightIntent.hidden)
);
```

つまり **カードが開いている間は自動的にON**、加えてトグルで**カードを閉じたまま出し続けられる**。

さらに描画関数の冒頭で次を必ず弾く（本人確定事項）:

```js
  // 書き出し・印刷・プレゼンには作図注記を焼き付けない
  if (target !== ctx && target !== planCtx) return;
  if (presenting) return;
```

`ctx` は 539行目、`planCtx` は 540行目で定義済みの生きたキャンバス。`presenting` は 551行目。

---

## 5. 意図値 → 描画指定の写像（純関数・テスト対象）

`stage-sketch.js` の光の意図モデルの近く（`window.SHOSAI_STAGE_LIGHT_INTENT_MODEL` の
定義の直後）に、**canvas に依存しない純関数**として置く。テストがここを直接叩く。

```js
  /* 意図の値を、図の上の作図記号へ写す。明るさの再現ではないので、
     沈める表現に真っ黒を使わず、斜線ハッチなど「指定」だと読める記号を使う。 */
  const LIGHT_INTENT_MARKS = Object.freeze({
    unspecified: null,
    reveal:     { fill: null,                dim: "others", outline: null,               tag: "reveal" },
    soften:     { fill: "rgba(9,8,7,0.35)",  dim: null,     outline: null,               tag: "soften" },
    conceal:    { fill: "rgba(9,8,7,0.45)",  dim: null,     outline: null,  hatch: true, tag: "conceal" },
    silhouette: { fill: null,                dim: null,     outline: { w: 2,   dash: null   }, tag: "silhouette" },
    separate:   { fill: null,                dim: null,     outline: { w: 3.5, dash: null   }, tag: "separate" },
    transform:  { fill: null,                dim: null,     outline: { w: 2,   dash: [6, 5] }, tag: "transform" },
  });
  const lightIntentMark = (value) => LIGHT_INTENT_MARKS[value] || null;
```

**`unspecified` は必ず `null` を返し、何も描かせないこと。**
「指定なし」は「見せない」ではない。ここを取り違えると機能の意味が壊れる。

テスト用に、既存の `window.SHOSAI_STAGE_LIGHT_INTENT_MODEL` は変更せず、
**新しいグローバルを1つ**追加する:

```js
  window.SHOSAI_STAGE_LIGHT_INTENT_OVERLAY = Object.freeze({
    marks: LIGHT_INTENT_MARKS,
    mark: lightIntentMark,
    plan: lightIntentOverlayPlan,      // §6 で定義
  });
```

### 5.1 重ね計画を組む純関数

```js
  /* 意図から「どのレイヤーに何を描くか」の計画を組む。canvasに触らない。
     戻り値の layers は描く順（背景→空間→演者）に並べる。 */
  const lightIntentOverlayPlan = (raw) => {
    const intent = normalizeLightingIntent("scene", raw);
    if (!intent) return null;
    const layers = ["background", "space", "performer"]
      .map((key) => ({ key, value: intent.layers[key].intent, note: intent.layers[key].note,
                       mark: lightIntentMark(intent.layers[key].intent) }))
      .filter((entry) => entry.mark);
    const revealed = layers.filter((entry) => entry.value === "reveal").map((entry) => entry.key);
    return {
      layers,
      revealed,
      // reveal が1つでもあるとき、reveal されていないレイヤーを沈める
      dimmed: revealed.length
        ? ["background", "space", "performer"].filter((key) => !revealed.includes(key))
        : [],
      audienceFocus: intent.audienceFocus,
      transition: intent.transition,
      hasAnything: layers.length > 0 || Boolean(intent.audienceFocus),
    };
  };
```

---

## 6. 描画の実装

### 6.1 呼び出し位置（1箇所だけ）

`drawStage()` の中、**`if (showSelection) { ... drawSelection ... }` のすぐ手前**に1行追加する。
選択枠より下、駒・動線・メモより上になる。

```js
    if (lightIntentOverlayOn()) drawLightIntentOverlay(target, L);

    if (showSelection) {
```

**それ以外の場所から呼ばないこと。既存の描画順を動かさないこと。**

### 6.2 レイヤーの領域

- **背景（background）**
  - 正面図: `backdropRect(L)` の矩形。`null`（全周形式）のときはこのレイヤーを描かない。
  - 平面図: 舞台矩形 `L.stage` の**上端から高さ 14px の帯**のみ（奥の壁を表す）。
- **空間（space）**
  - 正面図: 舞台床の四角形。`drawFrontVenue` 内の `floorPath` と同じ形。
    **既存の `floorPath` を外へ括り出さず、重ね用に同じ形を作る関数を新規に書く**
    （既存関数に手を入れないため。重複は許容する）:

    ```js
    /* 重ね用の床の形。drawFrontVenue の floorPath と同じ形をなぞる。
       既存側を書き換えると描画順に影響するので、ここでは別に持つ。 */
    function intentFloorPath(target, L) {
      target.beginPath();
      const ring = ringEllipse(L);
      if (L.venue.audience === "round" && ring) {
        target.ellipse(ring.x, ring.y, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        return;
      }
      const shiftBack = L.shift || 0;
      target.moveTo(L.centerX + shiftBack - L.backW / 2, L.floorY);
      target.lineTo(L.centerX + shiftBack + L.backW / 2, L.floorY);
      target.lineTo(L.centerX + L.frontW / 2, L.bottomY);
      target.lineTo(L.centerX - L.frontW / 2, L.bottomY);
      target.closePath();
    }
    ```
  - 平面図: `L.stage` の矩形。
  - **舞台装置の駒（台・箱など）は空間レイヤーに含めない**（本人確定事項）。
    装置は常に等倍のまま描く。
- **演者（performer）**
  - `sc().pieces.filter((p) => p.type === "performer")` の駒の**実際の形**。
    矩形で囲まないこと（選択枠に見えてしまう）。§6.3 のマスクを使う。
  - 正面図では、既存 `drawStage` と同じく `onStageArea(pieceU(p), pieceV(p))` が偽の駒は対象外。

### 6.3 演者マスク（この機能の中核）

演者を体の形どおりに扱うため、オフスクリーンのマスクを1枚作る。
既存の `paintCanvas`（543行目付近）と同じ作り方で、モジュール先頭付近に1枚用意する。

```js
  // 光の意図の重ねで、演者を体の形どおりに扱うためのマスク
  const intentMaskCanvas = document.createElement("canvas");
  intentMaskCanvas.width = W;
  intentMaskCanvas.height = H;
  const intentMaskCtx = intentMaskCanvas.getContext("2d");
```

使い方:

1. `intentMaskCtx.clearRect(0, 0, W, H)` してから、対象の演者駒だけを
   `drawStage` 内と同じ経路で `intentMaskCtx` へ描く
   （正面図なら `drawPerformer`、平面図なら `drawPlanPiece`。位置・スケールの求め方も同じ）。
2. **塗りを流す**（`soften` / `conceal` / 沈め）:
   `intentMaskCtx.globalCompositeOperation = "source-in"` で単色やハッチで塗りつぶし、
   `target.drawImage(intentMaskCanvas, 0, 0)`。→ 体の形の内側だけが塗られる。
3. **輪郭を作る**（`silhouette` / `separate` / `transform`）:
   マスクを8方向（0°,45°,…,315°）に `w` px ずらして単色で描き重ね、
   最後に `globalCompositeOperation = "destination-out"` で中心のマスクを抜く。
   残った環が体の外形線になる。それを `target.drawImage` する。
   `dash` 指定があるときは、輪郭を作ったうえで
   `target` 側に破線のストロークを重ねるのではなく、
   **環を作ったあと、45°の破線パターンで環を間引く**（`destination-out` で
   斜線パターンを抜く）。実装が難しければ `dash` 指定時は環を 55% の不透明度で描き、
   その旨をコード内コメントに書いて報告すること。

輪郭の色は `rgba(211,172,89,0.85)`（既存の brass 系）。

### 6.4 ハッチ（`conceal`）

45°の斜線。`createPattern` でパターンを作る:

- パターン用キャンバス 9×9px
- 線色 `rgba(239,231,214,0.16)`、線幅 1、左下から右上への斜線1本
- パターンは1度だけ作って使い回す（毎フレーム作らない）

`conceal` は「ハッチ」＋「`rgba(9,8,7,0.45)` の塗り」の**両方**を重ねる。

### 6.5 沈め（`reveal` の副作用）

`plan.dimmed` に入っているレイヤーへ `rgba(9,8,7,0.55)` を重ねる。
`reveal` 指定のレイヤーには、外周に `rgba(211,172,89,0.6)` の 1.5px 実線を引く。

**沈めるのは領域だけ。駒のデータは一切変えない。**

### 6.6 札（タグ）

各レイヤーに小さな札を1つ置く。

- 位置: 正面図では背景＝矩形の左上内側 +8px、空間＝床の下端中央の少し上、
  演者＝いちばん上手側の対象演者の頭上 −22px。平面図では背景＝帯の左端、
  空間＝舞台矩形の左上、演者＝対象演者の右脇。
- 見た目: 背景 `rgba(13,12,11,0.72)` の角丸なし矩形、文字 `rgba(239,231,214,0.9)`、
  `10px 'Hiragino Kaku Gothic ProN', sans-serif`、上下 3px / 左右 6px の余白。
- 文言: `「{レイヤー名}: {値の日本語/英語}」`。
  レイヤー名は既存の `LIGHT_INTENT_LAYER_LABELS`、値は既存の `LIGHT_INTENT_VALUE_LABELS` を
  **そのまま使う**（新しい訳語を作らない）。言語は既存の `isEn()` で判定する。

### 6.7 視線の線

`plan.audienceFocus` が空でなく、かつ `plan.revealed` が1つ以上あるときだけ、正面図に描く。

- 起点: `(L.centerX, H - 6)`（客席側＝見ている人自身）
- 終点: 最初の reveal レイヤーの領域の重心
- 線: `rgba(211,172,89,0.55)`、線幅 1.2、実線。**矢印にしない**
  （既存の照明のビームは円と帯なので、矢印だと光線に見える）
- 両端に半径 3 の塗り円
- 線の中ほどの脇に `audienceFocus` の本文を最大2行（1行28文字で折り返し、
  超える分は末尾に `…`）。字は札と同じ見た目。

平面図には視線の線を描かない。

### 6.8 平面図で描くもの（控えめに）

平面図の主用途は「誰がどこに立っているか」なので、重ねは最小限にする。

- `reveal` 指定の演者: 足元に `rgba(211,172,89,0.6)` の 1.5px の円（半径 14px）
- 背景レイヤー: 奥の壁の帯＋札のみ
- 空間レイヤー: 舞台矩形への塗り／ハッチ＋札
- 演者の `silhouette` / `separate` / `transform` / `soften` / `conceal`: **札のみ。塗りも輪郭も描かない**
- 視線の線: 描かない

---

## 7. トグル（正面図バー）

`stage.html` の正面図バー、`id="stage-front-lights"` を含む `<label>` の**直後**へ追加する。

```html
                  <label class="stage-canvas-toggle" title="光の意図を、図の上に作図の印として重ねる">
                    <input type="checkbox" id="stage-front-light-intent">
                    <span>光の意図</span>
                  </label>
```

配線は既存の `stage-front-lights`（13739行目付近）と同じ形にする。

```js
  if (els.frontLightIntent) {
    els.frontLightIntent.addEventListener("change", (e) => {
      state.showLightIntent = e.target.checked;
      save();
      render();
      announce(state.showLightIntent
        ? "光の意図を図に重ねました。作図の印で、本番の見え方ではありません。"
        : "光の意図の重ねを消しました。");
    });
  }
```

`els` への登録（1613行目付近、`lightIntent:` の近く）:

```js
    frontLightIntent: document.getElementById("stage-front-light-intent"),
```

`render()` 内、既存の `if (els.frontLights) els.frontLights.checked = state.showLightsFront;`
（12490行目付近）の直後で checked を同期する。

**平面図バーにはトグルを追加しないこと。** 正面図のトグル1つで両図が連動する。

---

## 8. カードのドックレイアウト

### 8.1 DOM の移動

`stage.html` で、`<details class="stage-light-intent" id="stage-light-intent">` 〜 `</details>`
のブロック**全体**を `.stage-scene-bar`（`<div class="stage-scene-bar" id="stage-scene-bar">`）の
**外へ出し**、`.stage-canvas-stack` と一緒に新しいラッパーで包む。

移動後の構造:

```html
          </div><!-- /.stage-scene-bar -->
          <div class="stage-work-area" id="stage-work-area">
            <details class="stage-light-intent" id="stage-light-intent">
              ... (中身は1文字も変えない) ...
            </details>
            <div class="stage-canvas-stack" id="stage-canvas-stack">
              ... (中身は1文字も変えない) ...
            </div>
          </div>
```

**カードの中身と `.stage-canvas-stack` の中身は一切変更しないこと。** 移動だけ。

### 8.2 CSS

```css
/* 光の意図カードと図の作業領域。
   既定は今までどおり縦に並ぶ（display: contents で親の流れに素通しする）。
   カードを開いたときだけ、広い画面で図の左横へ寄せる。
   ★カードを開くと図が画面外へ押し出されて「書きながら図を見る」ができなかったため。 */
.stage-work-area { display: contents; }

@media (min-width: 1100px) {
  .stage-work-area.is-docked {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  .stage-work-area.is-docked > .stage-light-intent {
    position: sticky;
    top: 8px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
  }
}
```

`.stage-light-intent` は `.stage-scene-bar` の外へ出るので、`flex: 1 0 100%;` と
`border-top: 1px solid rgba(211, 172, 89, 0.22);` を、**単独のボックスとして成立する指定**へ
差し替える（`.stage-scene-bar` と同じ見た目に揃える）:

```css
.stage-light-intent {
  min-width: 0;
  margin-bottom: 8px;
  padding: 7px 10px;
  border: 1px solid var(--line-dark);
  background: var(--desk-2);
}
```

### 8.3 `is-docked` の付け外し

`stage-sketch.js` で、カードの `toggle` イベントと `render()` の両方から同期する。

```js
  const syncLightIntentDock = () => {
    const area = document.getElementById("stage-work-area");
    if (!area || !els.lightIntent) return;
    area.classList.toggle("is-docked", els.lightIntent.open && !els.lightIntent.hidden);
  };
```

- `els.lightIntent.addEventListener("toggle", () => { syncLightIntentDock(); render(); })`
  を配線する（`render()` を呼ぶのは、開いた瞬間に重ねを出すため）。
- `render()` の中でも `syncLightIntentDock()` を呼ぶ（シーン切替でカードが hidden になる場合の追随）。

**1100px 未満では今の縦積みのまま**になること（メディアクエリで守られている）。

---

## 9. 照合帯

### 9.1 DOM

`.stage-canvas-stack` の**直前**（＝`.stage-work-area` の中、`.stage-canvas-stack` の上）へ置く。
ドック時は右カラムの上に載る。

```html
            <div class="stage-light-intent-compare" id="stage-light-intent-compare" hidden>
              <div class="stage-light-intent-compare-row">
                <span class="stage-light-intent-compare-kicker">光の意図</span>
                <span id="stage-light-intent-compare-intent"></span>
              </div>
              <div class="stage-light-intent-compare-row">
                <span class="stage-light-intent-compare-kicker">いまの照明</span>
                <span id="stage-light-intent-compare-lights"></span>
                <button type="button" class="btn-quiet" id="stage-light-intent-presets">配置案を試す…</button>
              </div>
              <p class="stage-light-intent-compare-note">照らし合わせは人が行います。</p>
            </div>
```

グリッドの列に正しく載るよう、CSS で `.stage-work-area.is-docked > .stage-light-intent-compare`
を `grid-column: 2;` にすること（`.stage-canvas-stack` も `grid-column: 2;`）。
行が2つになるので `grid-template-rows` は `auto auto`、カードは `grid-row: 1 / span 2;`。

### 9.2 中身

`render()` から更新する。表示条件は `lightIntentOverlayOn()` と同じ。

- **光の意図の行**: `unspecified` でないレイヤーを
  `演者=輪郭にする ／ 空間=見せる ／ 背景=隠す` の形で並べる。
  ラベルは既存の `LIGHT_INTENT_LAYER_LABELS` / `LIGHT_INTENT_VALUE_LABELS` を使う。
  1つも指定がなければ `指定なし`。
- **いまの照明の行**: 現在のシーンの `type === "light"` の駒を `kind` ごとに数える。
  `6個（吊り4・SS2）` の形。0個なら `0個`。
  kind の日本語は既存の照明種別の表示名を使う（`hang`=吊り, `ss`=SS, `front`=前明かり, `floor`=転がし）。
  既存に対応する表示名の関数があればそれを使い、なければこの4語をそのまま使う。

**判定や助言を一切書かないこと。** 「足りない」「合っている」「〜すべき」を出力しない。
数を数えるのは事実、意味づけは人がする。

### 9.3 「配置案を試す…」

**新しいモーダルを作らない。** 既存の `stage-light-preset-open` が開くモーダルを
そのまま開く。同じ処理を呼ぶか、`els.lightPresetOpen.click()` でよい。

加えて、**意図から開いたときだけ**モーダル上部に注記を1行出す。
`stage.html` の `id="stage-light-preset-modal"` の中、タイル一覧
（`id="stage-light-preset-tiles"`）の**直前**へ:

```html
                <p class="stage-light-preset-intent-note" id="stage-light-preset-intent-note" hidden></p>
```

文面（`{意図}` に §9.2 の意図の行をそのまま入れる）:

```text
光の意図: {意図} — これは候補の一覧です。意図と一致する保証はありません。組んだあとも光の意図は残ります。
```

意図から開いたときに `hidden = false` にして本文を入れ、
既存の「プリセットから組む」から開いたときは `hidden = true` にする。

**プリセットの並び替え・絞り込み・推薦を絶対にしないこと。** 並び順は今のまま。
推薦した瞬間に「AIが照明を決めた」ことになる。

---

## 10. i18n

`stage-i18n.js` の `TEXT`（日本語をキーにする方式）へ、この発注書で新しく足した
日本語文言をすべて追加する。訳は以下を使う。

| 日本語 | 英語 |
|---|---|
| `光の意図` | `Lighting intention` |
| `光の意図を、図の上に作図の印として重ねる` | `Overlay the lighting intention on the drawing as sketch marks` |
| `いまの照明` | `Lights now` |
| `配置案を試す…` | `Try a layout…` |
| `照らし合わせは人が行います。` | `Comparing the two is up to you.` |
| `指定なし` | `Not specified` |

札と絵の中の文字（`LIGHT_INTENT_LAYER_LABELS` / `LIGHT_INTENT_VALUE_LABELS`）は
**既存のものをそのまま使い、新しい訳語を作らないこと。**

「いまの照明」の個数表記（`6個（吊り4・SS2）`）は英語で `6 lights (hang 4, SS 2)` の形にする。
`isEn()` で分岐して組み立てること。

プリセットモーダルの注記の英訳:

```text
Lighting intention: {intent} — This is a list of candidates. It is not guaranteed to match the intention. The intention stays after you build.
```

---

## 11. PWA の版番号

`stage-sw.js` と `index.html` のローカル版番号・キャッシュ版を、既存の書き方に合わせて1つ上げる。
**既存の上げ方をファイルから読み取って、その流儀に従うこと。** 新しい方式を導入しない。

---

## 12. 新規テスト `tests/stage-light-intent-overlay.test.mjs`

既存の `tests/stage-light-intent-card.test.mjs` と**同じ書き方**（`vm.runInNewContext` で
`stage-sketch.js` を読み、`window` のエクスポートを叩く）にすること。
`document.createElement` が要るので、`context.document` のスタブに
`createElement: () => ({ getContext: () => ({}), width: 0, height: 0 })` を足してよい。

最低限、次を検証する。

1. `mark("unspecified")` が `null` を返す（**最重要**。「指定なし」は「見せない」ではない）
2. 7つの値すべてに対して `mark()` の戻りが期待どおり（`reveal` は `dim: "others"`、
   `conceal` は `hatch: true`、`transform` は `dash` を持つ、など）
3. `plan(null)` と `plan({})` が `null`
4. 意図が演者 `silhouette` のみのとき、`plan().layers` が1件で `revealed` が空、`dimmed` が空
5. 演者 `reveal` ＋ 背景 `conceal` のとき、`revealed = ["performer"]`、
   `dimmed` に `background` と `space` が含まれ、`performer` が含まれない
6. `layers` の並びが常に 背景 → 空間 → 演者 の順
7. `stage.html` に `id="stage-front-light-intent"` と `id="stage-work-area"` と
   `id="stage-light-intent-compare"` が存在する
8. `stage.html` で `.stage-light-intent` が `.stage-scene-bar` の内側に**ない**こと
   （DOM移動が済んでいることの確認）
9. `style.css` に `.stage-work-area` と `.stage-work-area.is-docked` の指定がある
10. `stage-sketch.js` に、重ね描画を書き出し・プレゼンで抑止するガード
    （`target !== ctx && target !== planCtx` と `presenting`）が含まれる
11. `stage-i18n.js` に §10 の6つの日本語キーがすべてある
12. `stage-sketch.js` が `showLightIntent` を書き出し用のJSON組み立て
    （`kind: "shosai-stage-sketch"` を作る箇所）へ**含めていない**こと

---

## 13. 完了条件

すべて満たすこと。1つでも欠けたら「未完了」として報告する。

```bash
node --check stage-sketch.js && node --check stage-i18n.js && node --check stage-sw.js
```

```bash
node --test tests/*.test.mjs
```

- 既存のブラウザ側テスト **177件が全部通ったまま**であること（減っても増えて壊れてもだめ）
- 新規テストが全部通ること

```bash
cd mcp-server && npm test
```

- MCP側 **25件が通ったまま**であること（`mcp-server/` は変更していないので当然通るはず。
  通らなければ何かを壊している）

## 14. 報告に必ず書くこと

- 変更した全ファイルと、それぞれ何を変えたか
- 上記3コマンドの**実際の出力**（件数を含む）
- §6.3 の破線の輪郭を仕様どおり実装できたか、フォールバックしたか
- 仕様どおりに実装できなかった箇所と、その理由
- 判断に迷って自分で決めた点があれば、すべて列挙する
