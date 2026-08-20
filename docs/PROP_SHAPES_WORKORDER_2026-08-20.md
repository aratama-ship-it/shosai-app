# 発注書：小道具の形プリセット10種 2026-08-20

Claudeが仕様（形状・寸法・握り位置を含む）を決め、Codexが実装し、Claudeが検証する。
この文書だけを読んで着手できるように書く。前提となる持ち物機能は
`PROP_HOLDING_WORKORDER_2026-08-20.md` で実装済み。

## 決定事項（2026-08-20・本人が選択）

小道具（kind: `prop`）はいま全ビューで「ただの箱」。これを、登録時に**「形」プリセット**を
選べるようにする。プリセットは10種＋既定の「箱」：

**傘・クラブ・ボール・リング・棒・刀・本・シルクハット・ランタン・旗**

## 設計方針（作り直さない。ここに乗せる）

- **種類は `prop` 一つのまま。** 形はセット登録の1項目 `propShape`（文字列id、既定 `"box"`）。
- **形はセットビルダーのプリミティブ（stage-set-model.js の part）で定義**し、
  `window.SHOSAI_STAGE_MODELS.partBoxes(part)` で箱配列へ展開する。
  `pieceParts()` がその箱配列を返せば、2D正面図・平面図・3Dの全部が既存パイプラインで描く
  （`model` 種類と同じ通り道。形を二重に書かない）。
- **照明の種類selectと同じ流儀のUI。** 出るものの追加行で kind=prop を選んでいるとき、
  名前の横に形のselectを出す。
- **握り位置（grip）**をプリセットごとに持ち、持たれたときは「握りの点」が手に来るようにする。
  中心合わせだと棒や旗の持ち姿が嘘になる。

## A. データ

1. セット登録項目（`state.project.sets[]` の prop）へ `propShape: string` を追加。
   既定・不明値は `"box"`。`addSetItem` と読み込み整形の両方で正規化する。
   既存の登録（例: 検証で作った「傘」）は `"box"` のまま＝挙動不変。
2. 駒側のフォールバック `piece.propShape`（AI JSON等で登録なしに置かれた場合用）。
   解決順: `pieceSet(piece).propShape` → `piece.propShape` → `"box"`。
   `normalizePiece` に `propShape` を追加（文字列のみ、既定 null）。

## B. 形プリセットの定義（この数値だけを使う。自分で調整しない）

`PROP_SHAPES` として stage-sketch.js に定義する。各プリセット:
`{ ja, en, dims: {w,d,h}（基準寸法・登録時の既定）, grip: {x,y}（基準空間・m）, parts: [...] }`

parts は stage-set-model の part 形式（shape/x/y/z/w/d/h/dia/tint。y=床からのlift）。
省略したフィールドは 0（tint は 1）。**登録寸法での拡縮**は、partBoxes に渡す前に
part を拡縮する: `sx=dims.w/基準w, sy=dims.h/基準h, sz=dims.d/基準d` として
`x*=sx, z*=sz, w*=sx, d*=sz, y*=sy, h*=sy, dia*=(sx+sz)/2`。grip も `x*=sx, y*=sy`。

```js
const PROP_SHAPES = {
  box: { ja: "箱", en: "Box", dims: { w: 0.4, d: 0.3, h: 0.4 }, grip: null, parts: null },
  umbrella: { ja: "傘", en: "Umbrella", dims: { w: 0.9, d: 0.9, h: 1.08 }, grip: { x: 0, y: 0.30 },
    parts: [
      { shape: "cylinder", y: 0,    dia: 0.03,  h: 0.78, tint: 0.7 },
      { shape: "cylinder", y: 0.78, dia: 0.90,  h: 0.09, tint: 1.0 },
      { shape: "cylinder", y: 0.87, dia: 0.58,  h: 0.10, tint: 1.05 },
      { shape: "cylinder", y: 0.97, dia: 0.24,  h: 0.06, tint: 1.1 },
      { shape: "cylinder", y: 1.03, dia: 0.035, h: 0.05, tint: 0.7 },
    ] },
  club: { ja: "クラブ", en: "Club", dims: { w: 0.12, d: 0.12, h: 0.53 }, grip: { x: 0, y: 0.10 },
    parts: [
      { shape: "sphere",   y: 0,    dia: 0.05 },           // 底のノブ（tint 0.7）
      { shape: "cylinder", y: 0.05, dia: 0.028, h: 0.10, tint: 0.8 },
      { shape: "cylinder", y: 0.15, dia: 0.045, h: 0.12, tint: 0.95 },
      { shape: "cylinder", y: 0.27, dia: 0.11,  h: 0.20, tint: 1.1 },
      { shape: "sphere",   y: 0.47, dia: 0.06,  tint: 1.0 },
    ] },
  ball: { ja: "ボール", en: "Ball", dims: { w: 0.24, d: 0.24, h: 0.24 }, grip: { x: 0, y: 0.12 },
    parts: [ { shape: "sphere", y: 0, dia: 0.24, tint: 1.05 } ] },
  ring: { ja: "リング", en: "Ring", dims: { w: 0.40, d: 0.04, h: 0.40 }, grip: { x: 0, y: 0.03 },
    parts: [
      { shape: "box", x: 0,      y: 0.35, w: 0.30, d: 0.04, h: 0.05 },
      { shape: "box", x: 0,      y: 0,    w: 0.30, d: 0.04, h: 0.05 },
      { shape: "box", x: -0.175, y: 0.05, w: 0.05, d: 0.04, h: 0.30, tint: 0.95 },
      { shape: "box", x: 0.175,  y: 0.05, w: 0.05, d: 0.04, h: 0.30, tint: 0.95 },
    ] },
  staff: { ja: "棒", en: "Staff", dims: { w: 0.05, d: 0.05, h: 1.60 }, grip: { x: 0, y: 0.75 },  // 検証後にClaudeが0.95→0.75へ調整（下端の床抜け）
    parts: [
      { shape: "cylinder", y: 0,    dia: 0.045, h: 0.04, tint: 0.6 },
      { shape: "cylinder", y: 0.04, dia: 0.035, h: 1.52, tint: 0.9 },
      { shape: "cylinder", y: 1.56, dia: 0.045, h: 0.04, tint: 0.6 },
    ] },
  sword: { ja: "刀", en: "Sword", dims: { w: 0.15, d: 0.05, h: 0.99 }, grip: { x: 0, y: 0.13 },
    parts: [
      { shape: "sphere",   y: 0,    dia: 0.045, tint: 0.55 },
      { shape: "cylinder", y: 0.03, dia: 0.035, h: 0.21, tint: 0.6 },
      { shape: "box",      y: 0.24, w: 0.15,  d: 0.04,  h: 0.03, tint: 0.65 },
      { shape: "box",      y: 0.27, w: 0.045, d: 0.015, h: 0.72, tint: 1.2 },
    ] },
  book: { ja: "本", en: "Book", dims: { w: 0.20, d: 0.26, h: 0.06 }, grip: { x: 0, y: 0.03 },
    parts: [
      { shape: "box", y: 0,    w: 0.20,  d: 0.26, h: 0.055, tint: 0.7 },
      { shape: "box", y: 0.01, w: 0.185, d: 0.24, h: 0.04,  tint: 1.2 },
    ] },
  tophat: { ja: "シルクハット", en: "Top hat", dims: { w: 0.32, d: 0.32, h: 0.19 }, grip: { x: 0, y: 0.02 },
    parts: [
      { shape: "cylinder", y: 0,     dia: 0.32, h: 0.025, tint: 0.6 },
      { shape: "cylinder", y: 0.025, dia: 0.18, h: 0.16,  tint: 0.55 },
      { shape: "cylinder", y: 0.03,  dia: 0.19, h: 0.035, tint: 0.95 },
    ] },
  lantern: { ja: "ランタン", en: "Lantern", dims: { w: 0.16, d: 0.16, h: 0.28 }, grip: { x: 0, y: 0.27 },
    parts: [
      { shape: "cylinder", y: 0,     dia: 0.15, h: 0.025, tint: 0.6 },
      { shape: "cylinder", y: 0.025, dia: 0.12, h: 0.15,  tint: 1.2 },
      { shape: "cylinder", y: 0.175, dia: 0.15, h: 0.035, tint: 0.6 },
      { shape: "box", x: -0.05, y: 0.21,  w: 0.015, d: 0.015, h: 0.045, tint: 0.65 },
      { shape: "box", x: 0.05,  y: 0.21,  w: 0.015, d: 0.015, h: 0.045, tint: 0.65 },
      { shape: "box", x: 0,     y: 0.255, w: 0.115, d: 0.015, h: 0.02,  tint: 0.65 },
    ] },
  flag: { ja: "旗", en: "Flag", dims: { w: 0.60, d: 0.04, h: 1.30 }, grip: { x: -0.27, y: 0.78 },
    parts: [
      { shape: "cylinder", x: -0.27, y: 0,    dia: 0.025, h: 1.25, tint: 0.7 },
      { shape: "sphere",   x: -0.27, y: 1.25, dia: 0.045, tint: 0.9 },
      { shape: "panel",    x: 0.015, y: 0.84, w: 0.545, d: 0.02, h: 0.38, tint: 1.1 },
    ] },
};
```

順序も上のとおり（selectの並び順に使う）。

## C. 描画

1. `pieceParts()` の prop 分岐: `propShape` を解決し、プリセットがあれば
   B の拡縮規則で part を拡縮 → `window.SHOSAI_STAGE_MODELS.partBoxes(part)` で箱配列へ →
   flat にして返す。`"box"`・未知idはいまの単一箱のまま。
   `SHOSAI_STAGE_MODELS` が無い環境では単一箱へフォールバック。
2. **2D正面図・平面図**が prop を parts 経由で描くようにする（`model` と同じ通り道）。
   いまの「dims の単一箱」直描きから切り替える。切り替え後も `"box"` 形の見た目が
   変わらないことを確認する。
3. **3D**: `openFpv` の `read()` で、prop も `parts: pieceParts(visual)` を渡す
   （いまは機構類だけ）。あわせて**拡縮済み grip** を `grip: {x,y}` として渡す（無ければ null）。
4. **3Dの持ち上げ**: stage-first-person.js の `drawPiece` の parts 分岐に、
   持たれている駒の下駄を足す:
   `held = piece.heldBy ? Math.max(0.05, finite(piece.base, 0) - (piece.grip ? piece.grip.y : (バウンズ高さ/2))) : 0`
   を各 box の lift に加算する。grip の無い箱は「高さの半分」を引く（＝中心が手の高さ）。
   ※既存の非parts分岐（箱リスト・球・cane・汎用）の `heldLift` は前回入れた
   `piece.base` そのままなので、同じ規則（grip考慮）に**揃える**。
5. **2D正面図の持ち姿**: `heldFrontPlacement` を「バウンズ中心＝手首」から
   「**握り点＝手首**」へ変える。拡縮済み grip（x,y・m）を、描いたバウンズの
   1mあたり画素で画面座標へ換算する:
   `gripScreenX = box.x + box.w * ((grip.x - minX) / (maxX - minX))`、
   `gripScreenY = box.y + box.h * (1 - (grip.y - minY) / (maxY - minY))`
   （minX/maxX/minY/maxY は拡縮済み parts の外接。grip が null の形は従来どおり中心）。
   向き（facing）による左右の鏡映は今回は考えない（旗だけが非対称。許容する）。

## D. UI

1. **追加行**: 出るものの追加行（名前入力＋種類ボタン＋追加）で、選択中 kind が prop のとき
   だけ、名前の横に形の select（id: `stage-roster-prop-shape`）を出す。照明の
   `lightKind` select と同じ見た目・流儀。既定は「箱」。`addSetItem` へ形を渡す。
2. **登録後の変更**: `openSetInfo`（寸法窓）で、prop のとき形の select を出す。
   形を変えたら **dims をそのプリセットの基準寸法へ戻し**、
   「形を◯◯にしました。寸法は基準値に戻しています。」と announce する
   （拡縮を引き継ぐと、傘→本のような形替えで細長い本ができて壊れて見える）。
3. 名前の自動命名（未入力時）は、形が box 以外ならその形名（例「傘」）を種類名の代わりに使う。

## E. i18n

- `stage-i18n.js` に en を追加: 形名10種＋「箱」（B の en 欄）、
  「形」「形を(.+)にしました。寸法は基準値に戻しています。」等の新規文言。
- `tests/stage-i18n-coverage.test.mjs` が落ちないこと。

## F. テストと仕上げ

1. `tests/stage-prop-shapes.test.mjs` を新設（ソースパターン検査の流儀）:
   - `PROP_SHAPES` に box＋10種が全部ある／各プリセットに ja・en・dims・parts がある
   - grip を持つ形は `0 <= grip.y <= dims.h` を満たす（数値をパースして検査）
   - `pieceParts` の prop 分岐が `propShape` と `partBoxes` を参照している
   - `openFpv` の read が prop に parts と grip を渡している
   - stage-first-person.js の parts 分岐に held の下駄がある
2. 既存テスト全部が通る（`tests/` で `node --test index.mjs`）。
3. 版上げ: `stage-sketch.js?v=256`・`stage-first-person.js?v=8`・`stage-i18n.js?v=62`
   （index.html と stage-sw.js の両方）、`CACHE_NAME` を `stage-sketch-pwa-v87` へ。
   版をピンしているテスト（stage-venue-library / stage-pitch-export）の期待値も更新。
4. `python3 build_stage.py` で stage.html を再生成。

## 制約（必ず守る）

- **ファイルの削除・移動・改名はしない。** `*_backup_*` ファイルに触らない。
- 既存ファイルは**編集前に必ず該当箇所を読む**（iCloud共有ワークスペース）。
- 関係ないコードのリファクタ・整形をしない。
- コメントは既存の流儀（日本語で「なぜ」）に合わせる。
- **Bの数値を勝手に変えない。** 見た目の微調整はClaudeが検証後に判断する。
