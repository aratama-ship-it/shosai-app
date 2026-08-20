# 発注書：舞台機構 段階3＝回り続ける盆（持続run） 2026-08-20

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけを読んで着手できるように書く。
段階1（`STAGE_MACHINERY_WORKORDER_2026-08-19.md`）・段階2（`STAGE_MACHINERY_PHASE2_WORKORDER_2026-08-19.md`）
の続き。段階2で本人へ提示済みだった「持続run＝場面の間じゅう盆が回り続ける」の実装。
**2026-08-20 本人承認済み（「全部回しましょう」）。**

## 何を作るか（1行）

盆（revolve）に**回転速度（度/秒）**を持たせ、値が0でない場面では、
場面を表示しているあいだじゅう盆と盆の上の駒が回り続けるようにする。

## 決定済みの仕様

### データモデル

- 盆の駒に新フィールド **`spinRate`**（数値・度/秒）。場面ごとの状態値（`spin` と同格）。
  - 正の値＝既存の `spin` が増える向きに回る。負の値＝逆向き。0＝回らない（既定）。
  - 正規化: stage-sketch.js の機構値の正規化ブロック（2856行付近、
    `if (type === "revolve") normalized.spin = ...` の行の直後）に
    `normalized.spinRate = clamp(finite(piece.spinRate, 0), -30, 30);` を追加。
  - `STASH_KEYS`（3185行付近）に `"spinRate"` を追加（控えから引き直せるように）。
  - 古いJSONはフィールドが無いだけなのでそのまま読める。**保存JSONの形はこれ以外変えない。**
  - 範囲 -30〜30 は表現上の上限。**実在ショーの盆の速度を調べて埋めない**（段階1・2と同じ方針）。

### 回転の時間モデル（重要・ここが段階3の芯）

- 場面の `spin` は**その場面に入った時点の開始位相**。回転は開始位相から
  `spinRate × 経過秒` だけ進む。
- **場面が変わったら経過はリセットする**（場面＝キューという段階2の時間モデルに合わせる。
  位相を場面またぎで持ち越すと、`spin` を編集しても見た目が変わらず編集不能になるため）。
- 実表示角は `spin + spinRate × t` を最短弧の折り返しで -180〜180 に畳んで使う
  （段階2の `((x + 540) % 360) - 180` 系の式を再利用してよい）。

### 実行ループ（stage-sketch.js）

- モジュールレベルに持続runループ（例: `spinRun` / `startSpinRun` / `stopSpinRun`）を新設する。
  `requestAnimationFrame` で回し、各フレームで対象の盆の `piece.animMech` に
  `{ spin: 実表示角 }` を書いて `render()` する（読む側は段階2の `mechVal` が既に
  `animMech` を優先するので**描画側の変更は不要のはず**。2D・3D・一人称・盆上の駒の追従は
  `effectivePlacement` 経由で自動で付いてくる。通っていない描画を見つけたら直さず**報告する**）。
- ループが動く条件（すべて満たすときだけ）:
  1. いまの場面に `|spinRate| > 0.01` の盆が1つ以上ある
  2. `state.animateScenes` がオン（オフの人は静止＝開始位相で固定）
  3. `document.hidden` でない（`visibilitychange` で停止・再開）
- **場面転換アニメ（`sceneAnim`）が動いている間は書かない**（転換の補間が `animMech` を
  所有する。段階2の `stopSceneAnim` は `animMech` を delete するので、転換が終わった
  次のフレームから持続runが書き直せば衝突しない）。転換終了後は経過をリセットして
  新しい場面の `spin` から回り始める。
- フレーム間隔 `dt` は 250ms でクランプする（タブ復帰時の大ジャンプ防止）。
- ループを止めるとき（条件を満たさなくなったとき）は、自分が書いた `animMech.spin` を
  消してから1回 `render()` し、静止状態（開始位相）に戻す。
  `sceneAnim` が生きている駒の `animMech` には触らない。
- 起動・停止のフックは、場面切替（`renderScenes` 等の既存経路）と
  `animateScenes` のトグル（17738行付近）と `visibilitychange` に足す。
  **常時ポーリングはしない**（回る盆が無い場面ではrAFを回さない）。

### 転換との関係（段階2に1キー足すだけ）

- `MACHINERY_ANIM_KEYS`（13133行付近）の `revolve` に `spinRate: 0` を追加する。
  これで転換中に回転速度そのものが補間され、盆が滑らかに加減速して見える
  （メモリ `stage-machinery-backlog` の「新しい状態値は `MACHINERY_ANIM_KEYS` と
  `mechVal` の両方に足す」に従う）。
- `stage-machinery.js` 側: `machineryParts` は `spinRate` を読む必要はない（形は変わらない）。
  `effectivePlacement` も**変更不要**（実表示角は stage-sketch.js 側が `animMech.spin` に
  書き込む設計のため）。`mechVal` の既存実装で足りる。

### UI（盆のインスペクタ）

- 既存の「回転角」スライダーの直後に**「回転速度」スライダー**を1本足す。
  - `index.html`: `els.pieceSpin` の input（id は既存の命名に合わせる。例: `stage-piece-spin-rate`）。
  - `bindMachineryControl(els.pieceSpinRate, "revolve", "spinRate", 0, -30, 30)`（17586行付近の並び）。
  - `machineControl` の設定（17945行付近の `revolve:` 配列）に
    `{ key: "spinRate", label: "回転速度", min: -30, max: 30, fallback: 0, format: "degPerSec" }` を追加。
    `format: "degPerSec"` の表示（「12 度/秒」）が無ければ既存 format の実装に倣って足す。
  - `syncMachineControl`（18054行付近）にも同じ並びで追加。step は 0.5。
  - ツールチップ: 「場面の間じゅう盆が回り続ける速さ。0で止まる。回転角は開始位相になる」

### i18n

- 新しい文言（「回転速度」「度/秒」・ツールチップ・英語 "Spin speed" / "°/s" 等）は
  `stage-i18n.js` の既存経路（`tm`/`tx`）で日英両方出す。キー名が生で画面に出ないこと。

### 書き出し・検査ツールとの関係（今回は対象外＝変更しない）

- ピッチ書き出し・印刷・香盤表・静止画は**開始位相（場面の `spin`）で描く**。今回は変更しない。
- `tools/check-object-on-performer.mjs`・`tools/scan-prop-render.mjs` は静的JSONを読む検査で、
  `spinRate` の既定0なら挙動が変わらない。**変更しない。**

## テスト

既存の流儀で `tests/stage-machinery-phase3.test.mjs` を新設（読み込み方は
`tests/stage-machinery.test.mjs` に倣う）:

1. 正規化に `spinRate` があり、-30〜30 のクランプと既定0であること（文字列パターン）。
2. `STASH_KEYS` に `"spinRate"` が入っていること。
3. `MACHINERY_ANIM_KEYS` の revolve に `spinRate` があること。
4. 持続runループ本体があり、`state.animateScenes`・`sceneAnim`・`document.hidden` の
   3条件を見ていること（文字列パターン）。
5. dt の 250ms クランプがあること。
6. `index.html`（正本）に回転速度スライダーの id があること。
7. 挙動テスト: `animMech.spin` を持つ盆の上の駒が `effectivePlacement` で回ること
   （段階2のテストがあれば重複させず、位相の折り返し（-180〜180）だけ足す）。

## バージョン更新

- `index.html` の `stage-sketch.js?v=`・`stage-i18n.js?v=` を**現在の値を読んでから+1**。
  `stage-sw.js` の `CACHE_NAME`（現在 `stage-sketch-pwa-v94`。着手時に読み直す）も+1。
- `python3 build_stage.py` を実行する（`stage.html` は生成物。直接編集しない）。
- `tests/stage-venue-library.test.mjs` に版番号のハードコードがある。新しい版番号に更新して
  全テストを通す。

## 制約

- 既存ファイルは編集前に必ず読み直す（共有ワークスペース。他エージェントも編集する）。
- ファイルの削除・移動はしない。変更前に `stage-sketch_backup_2026-08-20-before-spin-run.js` を作る。
- この発注書に書いた以外の箇所は変更しない。プロジェクトJSONデータは変更しない。
- 実在ショーの寸法・速度を調べて埋めない。

## 完了条件

1. 盆の「回転速度」を0以外にすると、その場面を表示しているあいだ盆と盆の上の駒が
   回り続ける（2D・3D・一人称すべて）。0に戻すと開始位相で静止する。
2. 場面転換中は段階2の補間が優先され、転換が終わると新しい場面の `spin` を
   開始位相として回り直す。
3. `animateScenes` をオフにすると回転が止まり、開始位相で静止する。タブを隠すと止まり、
   戻すと大ジャンプせずに再開する。
4. 日英とも文言が出る。
5. `node --test tests/*.mjs` が全件通る。
6. `python3 build_stage.py` 実行済み、`?v=` と `CACHE_NAME` 更新済み。
