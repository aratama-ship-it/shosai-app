# 発注書：舞台機構 段階2＝転換で機構が動く（キュー方式） 2026-08-19

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけを読んで着手できるように書く。

## 背景と決定事項（本人承認済み・2026-08-19）

段階1（`docs/STAGE_MACHINERY_WORKORDER_2026-08-19.md`・実装済み）で、機構は場面ごとの
状態値（`seriH`・`spin`・`tilt`・`deckH`・`open`・`water`・`poolH`）を持った。
ただし場面を送ると機構は**瞬間移動**する。一方このアプリには既に**場面転換アニメーション**
（`stage-sketch.js` の `beginSceneAnim`、12560行付近）があり、演者は歩き、照明はフェードする。

本人が選んだ段階2の方式は**キュー方式**：

1. **機構の状態値を、既存の場面転換アニメの補間対象に加える**（場面＝キュー。
   タイムラインUIは作らない。保存されるJSONの形は段階1のまま＝新データモデルなし）
2. **場面ごとの「転換の長さ」上書き**を追加する（機構の重さをゆっくり見せるため。0.2〜10秒）
3. **「この転換をもう一度見る」再生ボタン**を追加する（作り込み中に何度も確かめるため）

## 既存の仕組み（ここに乗せる。作り直さない）

- `beginSceneAnim(fromScene)`（stage-sketch.js 12595行付近）: 次の場面へ進むときだけ動く。
  `twinOf(piece, fromScene.pieces)` で前の場面の同じ駒（`setId`/`castId`/`originId`で照合）を見つけ、
  `sameSpot && sameBeam && sameGlow` なら対象外。動く駒は `entry = { piece, from, ctrl, to, ... }` を作り、
  `step()` の中で `piece.animU`/`animV`/`animBase`/`animPose`/`animBeamU`/`animBeamV`/`animGlow` に
  途中の値を書き、`render()` する。転換の長さは `state.sceneAnimMs`（200〜3000ms）。
  終わると `stopSceneAnim()` が anim系フィールドを全部 delete する。
- `stage-machinery.js`: `machineryParts(piece, dims)` が `piece.seriH` 等を直接読んで箱の配列を返す。
  `effectivePlacement(piece, scene, size, options)` が盆の `spin` を読み、盆の上の駒の描画位置を回す
  （既に `piece.animU`/`animV` を優先して読む作りになっている＝アニメ対応の下地はある）。
- `pieceTopLocal(piece)`（stage-sketch.js 4500行付近）: せりの上面高さを `piece.seriH` から返す。
  `refreshBases` → `supportUnder` がこれを読むので、**ここが補間値を読めば、せりの上の演者が
  転換中に一緒に上がる**。
- 場面ごとの設定UI: `renderScenes` 内の `timing` コンテナ（stage-sketch.js 12084〜12107行付近。
  `featureOn("sceneTiming")` の稽古時間入力と、`featureOn("blackout")` の暗転チェックがある場所）。
- シーン送りボタン: `index.html` 578〜580行付近の `stage-scene-prev` / `stage-scene-next`。

## 実装1: 機構の状態値の補間

### 対象キー（種類ごと）

```
seri:    seriH
revolve: spin
deck:    tilt, deckH
curtain: open
pool:    water, poolH
```

### beginSceneAnim の変更

- 機構タイプ（上の5種）の駒について、twin と現在の駒で対象キーの値を比較する
  （`finite()` で数値化して差が 0.001 超なら「違う」）。
- 1つでも違えば、その駒を動く対象に加える（**位置が同じでも**。既存の `sameSpot && ...` の
  早期除外に「機構値が同じ」という条件を足す形にする）。entry に
  `mechFrom: { key: 値 }` / `mechTo: { key: 値 }` を持たせる。位置も違う駒は両方補間する。
- `step()` の中で `piece.animMech = { key: 補間値 }` を書く（イージングは既存の `e` を使う）。
- **`spin` だけは最短弧で補間する**: `delta = ((to - from + 540) % 360) - 180` を使い
  `from + delta * e`。170度→-170度が360度近く逆回りしないため。
- `stopSceneAnim()` の delete 一覧に `animMech` を足す。

### 補間値を読む側

- `stage-machinery.js` に小さな関数を足して公開する:
  ```js
  const mechVal = (piece, key, fallback) => {
    const anim = piece && piece.animMech;
    return finite(anim && anim[key] !== undefined ? anim[key] : (piece ? piece[key] : undefined), fallback);
  };
  ```
  `machineryParts` 内の `piece.seriH`・`piece.tilt`・`piece.deckH`・`piece.open`・`piece.water`・
  `piece.poolH` の読み取りをすべて `mechVal(piece, "...", 既定値)` に置き換える。
  `effectivePlacement` 内の `finite(revolve.spin, 0)` も `mechVal(revolve, "spin", 0)` に置き換える。
  `window.SHOSAI_STAGE_MACHINERY` の公開オブジェクトに `mechVal` を足す（テストから使う）。
- `stage-sketch.js` の `pieceTopLocal` のせりの分岐も同じ読み方にする
  （`piece.animMech && piece.animMech.seriH !== undefined ? ... : piece.seriH`）。
  これで転換中もせりの上の演者の `base` が追従する。

### 挙動の要点（完了条件に含む）

- 盆の `spin` が転換中に補間されると、盆の上の駒は `effectivePlacement` 経由で**一緒に回りながら**
  描かれる（2D・3D・一人称すべて。個別対応は不要のはず＝既に全描画がこの関数を通っている。
  通っていない箇所を見つけたら直すのではなく、**報告する**）。
- せりの上に立つ演者は、せりが上がる転換中、一緒に滑らかに上がる。
- 幕は転換中に徐々に引き分けられ／巻き上がる。プールの水位・床も徐々に変わる。

## 実装2: 場面ごとの「転換の長さ」

- シーンの新フィールド **`cueSeconds`**（数値・秒。null＝未設定＝共通設定を使う）。
  正規化（stage-sketch.js 3026行付近のシーン正規化）に追加: 未設定・非数値は null、
  数値は 0.2〜10 にクランプ。**古いJSONはフィールドが無いだけなのでそのまま読める。**
- `beginSceneAnim` の `span` 決定を変更: **行き先の場面**（`sc()`）の `cueSeconds` が設定されていれば
  `cueSeconds * 1000`、なければ従来どおり `state.sceneAnimMs`。
  （`beginSceneAnim` は「この場面へ入る転換」を再生するので、行き先の場面が尺を持つのが自然。
  稽古時間の `rehearsal.transitionToNextSeconds` は**出発側**の場面に付く別概念。**混ぜない。**）
- UI: `renderScenes` の `timing` コンテナ（暗転チェックの並び）に数値入力を1つ足す。
  ラベル「転換の長さ」・単位「秒」・min 0.2・max 10・step 0.1・placeholder は「共通」。
  空にしたら null（共通設定に戻る）。値を変えたら `persistSoon()`。
  ツールチップ: 「この場面へ入る転換の再生時間。空なら設定の共通値」。

## 実装3: 「この転換をもう一度見る」

- `index.html` のシーン送りボタンの並び（`stage-scene-next` の後ろ）に
  `<button type="button" id="stage-scene-replay" class="btn-quiet stage-scene-step-btn">` を追加。
  表示は「⟲ 転換」程度の短い字＋ `title` に「この場面への転換をもう一度見る」。
- 押すと: いまの場面の**1つ前の場面行**（`kind === "scene"` で絞った並びの前）を `fromScene` として
  `beginSceneAnim(fromScene)` を呼ぶだけ。
- 出せない条件（前の場面が無い／`state.animateScenes` がオフ）のときは `disabled` にする。
  状態の更新は既存のシーン切替の描画経路（`renderScenes` など）に足す。

## i18n

新しい文言（「転換の長さ」「共通」「この場面への転換をもう一度見る」「⟲ 転換」等）は
日英両方を `stage-i18n.js` の既存経路（`tm`/`tx`）で出す。キー名が生で画面に出ないこと。

## テスト

既存の流儀（ソースの文字列パターン確認）で `tests/stage-machinery.test.mjs` に追加（または
`tests/stage-machinery-phase2.test.mjs` を新設。既存テストの読み込み方に合わせる）:

1. `beginSceneAnim` 本体に `animMech` と `mechFrom`/`mechTo` があること。
2. `stopSceneAnim` の delete 一覧に `animMech` があること。
3. spin の最短弧の式（`+ 540) % 360) - 180` を含むパターン）があること。
4. `stage-machinery.js` の `machineryParts`・`effectivePlacement` が `mechVal(` を使っていること。
5. **挙動テスト**（`stage-machinery.js` は単体で読み込める。既存の `tests/stage-machinery.test.mjs` の
   読み込み方に倣う）: `animMech.spin = 90` を持つ盆の上の駒が、`effectivePlacement` で
   90度回った位置・向きになること。`machineryParts` が `animMech.seriH` を優先して使うこと。
6. シーン正規化に `cueSeconds` があり、0.2〜10へのクランプと null 既定があること。
7. `index.html` に `stage-scene-replay` があること。
8. `beginSceneAnim` の span 決定に `cueSeconds` が入っていること。

## バージョン更新と、壊れているテストの同時修正

- `index.html` の `stage-sketch.js?v=`・`stage-machinery.js?v=`・（文言を足したら）`stage-i18n.js?v=` を
  **現在の値を読んでから+1**。`stage-sw.js` の `CACHE_NAME` も+1。`python3 build_stage.py` を実行。
- **既知の先行不具合**: `tests/stage-venue-library.test.mjs` の 534行付近が各JSの版番号を
  ハードコードしており、現在すでに2件落ちている（`stage-sketch.js?v=251` を期待、実物は252）。
  今回の版上げに合わせて、**このハードコード一覧を実物の新しい版番号に更新し、全テストを通す**。

## 制約

- 既存ファイルは編集前に必ず読み直す（共有ワークスペース。他エージェントも編集する）。
- ファイルの削除・移動はしない。バックアップ流儀に倣い、変更前に
  `stage-sketch_backup_2026-08-19-before-machinery2.js` を作る。
- この発注書に書いた以外の箇所は変更しない。プロジェクトJSONデータは変更しない。
- 実在ショーの寸法・速度を調べて埋めない（段階1と同じ方針）。

## 完了条件

1. 場面を送ると、転換の中で機構が動く: せりが上がり（上の演者も一緒に上がり）、
   盆が回り（上の駒も回り）、デッキが傾き、幕が引き分けられ／巻き上がり、水位が変わる。
2. spin は最短弧で補間される。
3. 場面の「転換の長さ」を設定すると、その場面へ入る転換だけ長さが変わる。空なら共通設定。
4. 「⟲ 転換」ボタンで、いまの場面への転換をもう一度再生できる。前の場面が無いときは無効。
5. 日英とも文言が出る。
6. `node --test tests/*.mjs` が**全件**通る（既知の2件のハードコード起因の失敗も、
   版番号更新によって解消していること）。
7. `python3 build_stage.py` 実行済み、`?v=` と `CACHE_NAME` 更新済み。
