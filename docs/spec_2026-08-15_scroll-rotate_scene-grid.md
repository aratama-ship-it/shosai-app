# 仕様書: スクロール回転＋向きロック / シーン一覧グリッド（2026-08-15）

対象アプリ: 舞台スケッチ（このディレクトリの `index.html` + `stage-sketch.js` + `style.css` + `stage-i18n.js`）

## 共通の制約（必ず守る）

- ファイルの削除・移動はしない。既存ファイルは編集前に必ず読む。
- 既存機能（ドラッグ移動、ズーム、ポインタ操作、印刷、保存/読込、アンドゥ）を壊さない。
- 追加する日本語UI文言は、`stage-i18n.js` の既存の対訳テーブル（例: `"押すと開閉します": "Press to open or close"`）に英訳を追加する。JS側は既存の `tx("...")` / `isEn()` の作法に従う。
- CSSは `style.css` に追記。既存の `.stage-scene-row` などの配色・密度・角の丸みに合わせる。新奇な装飾は入れない。
- コメントは既存ファイルの流儀（日本語・理由を書く）に合わせる。

---

## 機能1: 選択中ピースのスクロール回転

### 挙動

- 前提: `selectedId` が指すピースが存在し、`piece.type === "performer" || SOLID_TYPES[piece.type]` のとき
  （この判定は既存の `els.pieceFacing` の input ハンドラ（stage-sketch.js 14469行付近）と同一にする）。
- `canvas`（正面図）と `planCanvas`（平面図）に `wheel` リスナーを追加
  （登録場所は既存の `[canvas, planCanvas].filter(Boolean).forEach(...)`（14312行付近）にまとめる。
  `{ passive: false }` で登録し、回転を実行するときのみ `event.preventDefault()`）。
- 回転量: `deltaY` を累積し、累積が ±40 を超えるたびに 15° 回す（下スクロール=時計回り、平面図で見て自然な向き）。
  Shift押下中は 5° 刻み。トラックパッドの細かいdeltaでも1ノッチずつ動くようにする。
- `piece.facing = ((facing % 360) + 360) % 360` で正規化。
- 更新時は既存フェーダーと同じ後処理: `els.pieceFacing.value`（-180〜180表現）と
  `els.facingValue`（`facingLabel(piece.facing)`）を同期し、`render()` と `persistSoon()` を呼ぶ。
- アンドゥ: 連続ホイールは1ジェスチャ扱い。前回のwheelから600ms以上空いた最初のノッチで `checkpoint()` を1回だけ呼ぶ。
- 選択が無い・回転対象外の型・後述の向きロック中は、`preventDefault()` せず何もしない（ページ側のスクロールを奪わない）。

### 向きロック（シーン単位）

- データ: シーンに `facingLock: boolean` を追加。`normalizeScene()`（2595行付近）に
  `facingLock: kind === "scene" ? Boolean(raw.facingLock) : false` を追加して保存/読込で残るようにする。
- UI: `index.html` の `#stage-facing-controls`（835行付近）内、「向き」ラベルの行に小さなトグルボタンを追加。
  - id: `stage-facing-lock`、表示は施錠アイコン（例: 🔓/🔒 のテキストでよい）＋ `aria-pressed`。
  - title/aria-label: 「このシーンではスクロールでの向き変更をロックします」（英訳も追加）。
- 挙動: 押すと現在のシーン `sc().facingLock` を反転。`checkpoint()` → 表示更新 → `persistSoon()`。
  `announce()` で「向きをロックしました。スクロールでは回りません。」/「向きロックを外しました。」を知らせる。
- ロック中: スクロール回転だけを無効化する。**既存のフェーダーでの変更は引き続き可能**（明示操作は誤作動でないため）。
  ロック中にスクロール回転しようとした場合、シーンごとに1回だけ `announce()` で「向きロック中です」と知らせる。
- ボタンの点灯状態はシーン切替（`openScene`）やアンドゥ後にも正しく同期させる
  （既存の `updateInspector()` など、フェーダー値を同期している場所（13506行付近）と同じ経路で更新する）。

---

## 機能2: シーン一覧グリッド（正面図/平面図サムネイル＋ジャンプ）

### 入口

- `index.html` のシーンパネル（`data-panel="scenes"`、460行付近）の `.stage-scene-move` の並びに
  ボタンを追加: id `stage-scene-grid-open`、表示「⊞ 一覧」（英語 "Grid"）。

### モーダル

- 既存のモーダル群（例: shows のモーダル `els.showsOpen/showsClose/showsBackdrop` の実装）と同じ構造・作法で
  全画面オーバーレイを追加。id 例: `stage-scene-grid-modal` / `-backdrop` / `-close`。
  Escキー・背景クリック・×ボタンで閉じる。
- ヘッダー: タイトル「シーン一覧」、右側に表示切替の2ボタン「正面図」「平面図」
  （セグメント風。選択中を `aria-pressed="true"`）。切替はモジュール変数 `sceneGridView`（既定 `"front"`）に保持し、
  切替時にグリッドを再描画。永続化は不要。
- 本文: グリッド表示（CSS: `display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));` 目安）。
  - `state.project.scenes` を順に走査。`kind === "section"` は行全体を使う小見出し（グリッドの1行ぶち抜き）。
  - `kind === "scene"` はカード: サムネイル画像＋「番号 タイトル」＋配置数。
    番号は `renderScenes()`（10670行付近）と同じ「深さごとの数え札」ロジックで振る（例: 4-1）。
  - 現在開いているシーン（`activeSceneId`）のカードは枠色などで強調。
  - カードクリックで `openScene(scene.id)` を呼び、モーダルを閉じる。

### サムネイル生成

- `openPrintPage()`（11600行付近）と同じ方式を流用:
  1. `activeSceneId` と `zoomState.front` / `zoomState.plan` を退避し、ズームを `{z:1, ox:0, oy:0}` に。
  2. オフスクリーンcanvas（W×H）に `drawStage(ctx, false, "front" | "plan")` で描画。
  3. それを幅300px程度の小さいcanvasへ `drawImage` で縮小し、`toDataURL("image/jpeg", 0.82)` を `<img>` に入れる。
  4. 終わったら `activeSceneId` とズームを必ず復元する（例外時も復元されるよう try/finally）。
- シーン数が多くても固まらないよう、1フレームあたり数枚ずつ `requestAnimationFrame` で分割生成し、
  未生成のカードにはプレースホルダ（背景色の空枠）を出す。各チャンク内で退避→描画→復元を完結させる。
- キャッシュ: `Map`（キー `${scene.id}:${view}`）。モーダルを開くたびにクリアして作り直す（編集反映を優先）。
- モーダルが閉じられたら生成ループを中断する。

### 文言（i18n追加が必要なもの）

「⊞ 一覧」「シーン一覧」「正面図」「平面図」「閉じる」（既存訳があるものは再利用）、
向きロック関連の文言一式。

---

## 完了条件（検証可能な形で）

1. `node --check stage-sketch.js` が通る。
2. 演者を選択してキャンバス上でホイール → 15°ずつ回転し、フェーダーと「向き」表示が追従する。
   Shift+ホイールで5°刻み。非選択時はスクロールしても何も起きない。
3. 向きロックボタンでロック → スクロールで回らない、フェーダーでは回る。リロード後もロック状態が残る。
4. 「⊞ 一覧」でモーダルが開き、全シーンのサムネイルがグリッド表示される。正面図/平面図の切替が効く。
   カードクリックで該当シーンが開き、モーダルが閉じる。
5. 実装後、変更点の要約（触ったファイルと関数名）をこのファイルの末尾に「## 実装メモ(Codex)」として追記する。

## 実装メモ(Codex)

- `index.html`: `#stage-facing-lock`、`#stage-scene-grid-open`、シーン一覧モーダル一式を追加。
- `stage-sketch.js`: `newScene()` / `normalizeScene()` に `facingLock` を追加。`onFacingWheel()` / `resetFacingWheelGesture()` で15°（Shift時5°）のスクロール回転と600ms単位のアンドゥを実装し、`updateInspector()` でロック表示を同期。`sceneNumberMap()` / `openSceneGrid()` / `closeSceneGrid()` / `setSceneGridView()` / `renderSceneGrid()` / `sceneGridThumbnail()` / `stopSceneGridGeneration()` で正面図・平面図の分割生成グリッドを実装。
- `style.css`: `.stage-facing-lock` と `.stage-scene-grid-*` の既存配色に沿ったレイアウト・選択状態・レスポンシブ表示を追加。
- `stage-i18n.js`: `TEXT` に一覧・正面図／平面図・向きロック文言、`SAY` に向きロックの通知文を追加。
- 検証: `node --check stage-sketch.js`、`node --check stage-i18n.js`、`node --test tests/*.test.mjs`（243/243件成功）、`git diff --check` を実行。
