# 発注書: 3Dカメラ（FPV）から演者の「向き」と「姿勢」を直せるようにする

- 日付: 2026-08-20（FPV肉付け・転換対応の続き）
- 発注: Claude（仕様確定済み・本人が操作方式を選択済み）／実装: Codex／検証: Claude
- 本人の選択: 向き=**足元の回転リングを直接ドラッグ**、姿勢=**絵付きタイルのミニ版**
- 対象ファイル: `stage-sketch.js`・`stage-first-person.js`・`stage-i18n.js` の3つだけ。
  **版上げ（?v=・CACHE_NAME）と stage.html 再生成は発注元がやる。**
- バックアップ済み: `*_backup_2026-08-20-before-fpv-edit.js`
- **削除・移動・リネーム禁止。別エージェントが並行作業中のため、編集前に必ず該当箇所を
  読み直し、行番号ではなく内容で位置を特定すること。**
- スコープ: 向きと姿勢のみ。**位置(u/v)の移動は入れない。**

## 全体像

FPVは読み取り専用だったので、ブリッジに書き込みメソッドを足し、
変更は必ず本編側（checkpoint→updateInspector→render→persistSoon）を通す。
FPVは毎フレーム read() で読み直すので、書けば即座に3D表示へ反映される。

操作の流れ:
1. FPVのキャンバスで演者を**クリック（ドラッグと区別した短いタップ）**すると選択。
   足元に回転リング＋向きノブが出て、画面下中央に編集パネル（名前・向き・姿勢タイル帯）が出る。
2. リング（またはノブ）をドラッグすると体がその場で回る（5°刻み）。
3. 姿勢タイルをクリックすると姿勢が変わる。
4. 何もない所をタップ、または esc で選択解除。esc は選択が無いときだけFPVを閉じる。

## 作業1: stage-sketch.js — ブリッジへ書き込み・参照メソッドを追加

`openFpv` 内の `fpv.open({...})` に渡すオブジェクトへ、次の5メソッドを追加する
（`stepScene,` の隣に並べる）。すべて同IIFE内の既存関数を使う:
`checkpoint` / `updateInspector` / `render` / `persistSoon` / `poseById` / `POSES` /
`poseName`(1103行付近) / `drawPosePreview`(11917行付近) / `facingLabel`(2713行付近)。

```js
/* FPVから演者の向き・姿勢を直す。変更は必ず本編の undo・保存・再描画を通す */
setPieceFacing: (pieceId, deg, snapshot) => {
  const piece = sc().pieces.find((p) => p.id === pieceId && p.type === "performer");
  if (!piece) return false;
  const value = clamp(Math.round(finite(deg, 0)), -180, 180);
  if (value === finite(piece.facing, 0)) return true;
  if (snapshot) checkpoint();
  piece.facing = value;
  updateInspector();
  render();
  persistSoon();
  return true;
},
setPiecePose: (pieceId, poseId) => {
  const piece = sc().pieces.find((p) => p.id === pieceId && p.type === "performer");
  if (!piece || !POSES.some((p) => p.id === poseId)) return false;
  if (piece.pose === poseId) return true;
  checkpoint();
  piece.pose = poseId;
  updateInspector();
  render();
  persistSoon();
  return true;
},
listPoses: () => POSES.map((p) => ({ id: p.id, label: poseName(p) })),
drawPosePreview: (canvas, poseId, color) => drawPosePreview(canvas, poseId, color),
facingLabel,
```

※ `snapshot` はドラッグ1ジェスチャにつき最初の変更だけ true で呼ばれる
（undo1回でジェスチャ全体が戻る）。姿勢は1クリック=1checkpoint。

## 作業2: stage-first-person.js — 選択・リング・編集パネル

### 2-1. 状態とヒット記録

- `state` に `sel: null` を追加（値は選択中の演者の piece.id）。
- モジュール変数 `const hitTargets = [];` を追加。`renderFrame` の冒頭
  （`readCurrent()` の後）で `hitTargets.length = 0;`。
- `drawPerformer`（肉付け版）と `drawPerformerSimple` の両方で、footの投影に成功したら
  登録する（肉付け版は `foot`/`H` 計算後、`tooClose` 判定前でよい）:

```js
const footCam = toCamera(foot);
if (footCam.z > NEAR && !piece.exitWalker) {
  const footScreen = toScreen(footCam);
  const px = focal / footCam.z;   // 1mあたりの画素
  hitTargets.push({ id: piece.id, x: footScreen.x, yTop: footScreen.y - H * 1.1 * px,
    yBottom: footScreen.y + 6, halfW: Math.max(18, 0.35 * H * px), z: footCam.z });
}
```

（Simple版は `H` の代わりに `height` を使う。既に同名の footCam 相当があれば再利用してよい）

### 2-2. タップ判定と選択

`onPointerDown` / `onPointerMove` / `endPointer` を拡張する:

- `onPointerDown` で `downAt = { x: event.clientX, y: event.clientY, moved: false }` を記録。
  さらに **選択中で回転リングの近くなら回転ドラッグを開始**（2-4）し、見回しドラッグは始めない。
- `onPointerMove` で移動量が6pxを超えたら `downAt.moved = true`（見回しは従来どおり）。
- `endPointer`（pointerup経由）で `downAt` があり `!downAt.moved` なら**タップ**:

```js
function pickPerformer(px, py) {
  let best = null;
  hitTargets.forEach((t) => {
    if (px < t.x - t.halfW || px > t.x + t.halfW || py < t.yTop || py > t.yBottom) return;
    if (!best || t.z < best.z) best = t;   // 手前を優先
  });
  return best;
}
```

命中→ `state.sel = hit.id`、外れ→ `state.sel = null`。どちらも `updateEditPanel()` を呼ぶ。
座標は canvas の getBoundingClientRect() を介して **CSS px のまま**比較する
（toScreen も CSS px。devicePixelRatio は掛けない）。

### 2-3. 選択の後始末

- `runPendingScene` で場面が実際に切り替わったとき、`close()`、および
  演者視点切替（`leaveFree`/`enterFree`）では選択を解除して `updateEditPanel()`。
- 毎フレーム、`state.sel` の駒が `data.pieces` に見つからなければ解除。
- `data.transition` が truthy の間（転換中）はリングと編集パネルを出さない
  （パネルは `hidden` にするだけ。選択自体は保持してよい）。

### 2-4. 回転リング（描画と操作）

- `renderFrame` の駒描画の後（`drawLabels` の前）に、選択中の駒（performer、exitWalkerでない、
  転換中でない）へリングを描く:

```js
function drawFacingRing(ctx, piece) {
  const base = pieceBaseOf(piece);
  const foot = toWorld(pieceUOf(piece), pieceVOf(piece), W, D, base);
  const R = 0.55;
  ringScreenPts = circlePoints(foot.x, foot.y + .015, foot.z, R, 40)
    .map((p) => { const c = toCamera(p); return c.z > NEAR ? toScreen(c) : null; });
  // 線: 細い明色。ノブ: facing の向きに置く
  ctx.save();
  ctx.strokeStyle = "rgba(232,226,212,.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  let drawing = false;
  ringScreenPts.forEach((p) => {
    if (!p) { drawing = false; return; }
    if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; } else { ctx.lineTo(p.x, p.y); }
  });
  ctx.stroke();
  const th = finite(piece.facing, 0) * Math.PI / 180;
  const knobWorld = { x: foot.x + Math.sin(th) * R, y: foot.y + .015, z: foot.z + Math.cos(th) * R };
  const knobCam = toCamera(knobWorld);
  if (knobCam.z > NEAR) {
    const k = toScreen(knobCam);
    const c = toCamera(foot);
    if (c.z > NEAR) { const o = toScreen(c); ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(k.x, k.y); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(k.x, k.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = piece.color || "#e8e2d4"; ctx.fill();
    ctx.strokeStyle = "#14100c"; ctx.lineWidth = 1.5; ctx.stroke();
    knobScreen = k;
  } else knobScreen = null;
  ctx.restore();
}
```

（`ringScreenPts` と `knobScreen` はモジュール変数。毎フレーム上書き。）

- **回転ドラッグの開始判定**（onPointerDown内、選択中のみ）:
  ポインタが `knobScreen` から 16px 以内、またはリング点列の最寄り点から 12px 以内なら
  `facingDrag = { id: state.sel, snapshotted: false }` を立て、見回しドラッグを始めない。
- **ドラッグ中**（onPointerMove内、facingDrag があるとき）: ポインタから床平面への
  レイ交点で角度を出す。数式は次のとおり（`right`/`up`/`forward`/`camera`/`focal` は既存の基底）:

```js
function groundPointAt(px, py, planeY) {
  const a = (px - canvasWidth / 2) / focal;
  const b = (canvasHeight / 2 - py) / focal;
  const dir = {
    x: right.x * a + up.x * b + forward.x,
    y: right.y * a + up.y * b + forward.y,
    z: right.z * a + up.z * b + forward.z,
  };
  if (Math.abs(dir.y) < 1e-6) return null;
  const t = (planeY - camera.y) / dir.y;
  if (t <= 0) return null;
  return { x: camera.x + dir.x * t, z: camera.z + dir.z * t };
}
function facingFromGround(foot, hit) {
  const deg = Math.atan2(hit.x - foot.x, hit.z - foot.z) * 180 / Math.PI;
  const snapped = Math.round(deg / 5) * 5;
  return ((snapped + 180) % 360 + 360) % 360 - 180;   // -180..180 に正規化
}
```

  交点が取れたら `state.bridge.setPieceFacing(facingDrag.id, deg, !facingDrag.snapshotted)`、
  成功したら `facingDrag.snapshotted = true`。編集パネルの向き表示も更新する。
- **pointerup** で `facingDrag = null`。

### 2-5. 編集パネル（画面下中央）

- DOM: `ensureDom` で `#stage-fpv-edit`（class `stage-fpv-hud`）を作り root へ追加。
  中身は JSで組む: 1行目に色ドット＋演者名＋向き表示（`#stage-fpv-edit-facing`）、
  2行目に姿勢タイル帯 `#stage-fpv-edit-poses`（横スクロール）。既定 `hidden`。
- CSS（addStyleへ追記）:

```
#stage-fpv-edit{left:50%;bottom:70px;transform:translateX(-50%);max-width:min(760px,86vw);background:rgba(16,12,9,.9);border:1px solid rgba(232,226,212,.18);border-radius:4px;padding:8px 10px}
#stage-fpv-edit .head{display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px}
#stage-fpv-edit .dot{width:9px;height:9px;border-radius:50%;flex:none}
#stage-fpv-edit .fv{opacity:.65}
#stage-fpv-edit-poses{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
.stage-fpv-pose-tile{flex:none;width:64px;padding:0;border:1px solid rgba(232,226,212,.16);border-radius:3px;background:rgba(22,16,11,.86);color:#e8e2d4;font-size:10px;cursor:pointer;font-family:inherit}
.stage-fpv-pose-tile canvas{display:block;width:100%;height:56px;background:transparent}
.stage-fpv-pose-tile span{display:block;padding:1px 2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stage-fpv-pose-tile.on{background:#e8e2d4;color:#14100c;border-color:#e8e2d4}
```

- `updateEditPanel()` を新設:
  - `state.sel` が無い／駒が見つからない／`data.transition` → `hidden = true` で終わり。
  - 駒があれば表示。名前＝`labelOf(piece)`、色ドット、向き＝
    `state.bridge.facingLabel ? state.bridge.facingLabel(piece.facing) : ""` ＋ ` ${finite(piece.facing,0)}°`。
  - 姿勢帯: **乗り物で姿勢が固定なら**（`supportOf(piece, data.pieces)` の holder.type が
    pole/trapeze/tissue/chair）タイル帯の代わりに一行
    `text("姿勢は乗り物で決まっています")` を出す。
  - そうでなければ `state.bridge.listPoses()` でタイルを組む。各タイルは
    `canvas(width=128,height=112)` ＋ラベル。描画は `state.bridge.drawPosePreview(canvas, pose.id, piece.color)`。
    現在姿勢のタイルに `on` を付け、`scrollIntoView({inline:"center", block:"nearest"})`。
    クリックで `state.bridge.setPiecePose(piece.id, pose.id)` → `updateEditPanel()`。
  - タイル帯は**選択のたびに作り直してよい**（39枚のプレビュー描画は一度きりなので軽い）。
    向き表示だけは `#stage-fpv-edit-facing` の textContent 更新で済ませる。
- 呼び出し箇所: 選択/解除時、姿勢クリック後、回転ドラッグ中（向き表示のみ更新）、
  `renderHud`（言語・場面変化時の作り直し）、転換の開始・終了
  （`renderFrame` で `data.transition` の真偽が前フレームと変わったときに一度呼ぶ）。

### 2-6. esc とキー一覧

- `onKeyDown` の Escape: `state.sel` があれば選択解除＋`updateEditPanel()` して return。
  無ければ従来どおり `close()`。
- キー一覧（`renderHud` の keyRows）: 両モード共通の先頭に
  `[[text("クリック")], text("演者を選ぶ")]` の行を足す。

### 2-7. テスト用エクスポート

`_geom` に `facingFromGround` と `pickPerformer` で使う矩形判定を試験できる形
（`facingFromGround` はそのまま、`pickPerformer` は hitTargets を引数で受ける純関数
`pickFrom(targets, px, py)` に分けて両方公開）を追加する。

## 作業3: stage-i18n.js — 追加文言

FPVの節（"ドラッグで見回す" の近く）へ追加:

```js
"クリック": "Click",
"演者を選ぶ": "Select a performer",
"姿勢は乗り物で決まっています": "Pose is set by the apparatus",
```

※ 「向き」の語彙（客席・上手など）は bridge の facingLabel が日英を返すので追加不要。

## 完了条件

1. `node --check` 3ファイル、`node --test tests/stage-first-person.test.mjs` 全件成功。
2. `facingFromGround`: 真上からのクリックで、足元より +z 側（客席側）をクリックすると 0°、
   +x 側で 90°、-x 側で -90° になる（新テストを1本足すこと。カメラ基底は
   真上見下ろし相当の値を直接組んでよい）。
3. 挙動（発注元が検証）: クリックで選択→リング表示→リングドラッグで体が回る→
   本編に戻すと同じ向き・undoで戻る。姿勢タイルで姿勢が変わり本編と一致。
   ポール・ブランコ・椅子の駒は姿勢帯が出ない。転換中はリングとパネルが消える。
