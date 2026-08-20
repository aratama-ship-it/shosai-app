# 発注書: 3Dカメラ（FPV）から選んだ演者を「移動」できるようにする

- 日付: 2026-08-20（FPV編集=向き・姿勢の続き。選択・リング・編集パネルは実装済み）
- 発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
- 対象ファイル: `stage-sketch.js`・`stage-first-person.js`・`stage-i18n.js` の3つだけ。
  **版上げ・stage.html 再生成は発注元がやる。**
- バックアップ済み: `*_backup_2026-08-20-before-fpv-move.js`
- **削除・移動・リネーム禁止。並行作業あり。編集前に該当箇所を読み直し、内容で位置特定。**

## 仕様（決定済み）

- 選択中の演者の**体そのものをドラッグ**すると床の上を移動する（リング=向き、体=移動）。
- **WYSIWYG**: ポインタが指す床の点に演者が付いてくる。盆（回り舞台）の上では
  「見えている位置」を盆の回転で**逆変換してから保存**する（向きの `shownDelta` と同じ思想）。
  盆が回り続けていても、ドラッグ中は毎イベント逆変換するのでポインタの下に留まる。
- 掴んだ瞬間の**オフセットを保持**する（胸を掴んだら胸の下の床が基準。足へスナップさせない）。
- **乗り物（pole/trapeze/tissue/chair の supportId）付き演者は移動不可**（姿勢と同じ扱い。
  リングと姿勢パネルの制限に合わせる）。転換中（data.transition）は開始しない。
- 1ドラッグ = checkpoint 1回（最初に実際へ動いた時。あわせて bringToTop も1回）。
- 範囲は u,v とも -0.5..1.5 に丸める（本編の動線・キーボード移動と同じ。袖へ出せる）。
- 高さ base は書かない（read() が毎フレーム refreshBases で再計算するので、台の上へ
  運べば自然に乗り、降ろせば床に戻る）。

## 作業1: stage-sketch.js — ブリッジに setPiecePlace を追加

`openFpv` 内、`setPiecePose` の直後に追加:

```js
setPiecePlace: (pieceId, u, v, snapshot) => {
  const piece = sc().pieces.find((p) => p.id === pieceId && p.type === "performer");
  if (!piece || piece.heldBy) return false;
  /* FPVが指すのは「見えている位置」。盆に乗っていれば、盆の回転（見かけの向き−保存の向き）
     を逆に回してから保存する。そのまま書くと盆の回転分だけ滑る。 */
  const placed = effectivePlacement(piece);
  let targetU = finite(u, piece.u);
  let targetV = finite(v, piece.v);
  const revolve = placed.revolveId
    ? sc().pieces.find((p) => p.id === placed.revolveId) : null;
  if (revolve) {
    const size = venueSize();
    const centre = effectivePlacement(revolve);
    const spin = finite(placed.facing, 0) - finite(piece.facing, 0);
    const angle = -spin * Math.PI / 180;
    const dx = (targetU - finite(centre.u, .5)) * size.width;
    const dz = (targetV - finite(centre.v, .5)) * size.depth;
    const dims = pieceDims(revolve);
    /* 逆変換した点が盆から出るなら、盆を離れる＝見えている位置をそのまま保存する
       （盆の円は回転で不変なので、境界で位置は連続する） */
    if (Math.hypot(dx, dz) <= finite(dims && dims.dia, 0) / 2) {
      targetU = finite(revolve.u, .5) + (dx * Math.cos(angle) - dz * Math.sin(angle)) / size.width;
      targetV = finite(revolve.v, .5) + (dx * Math.sin(angle) + dz * Math.cos(angle)) / size.depth;
    }
  }
  const nextU = clamp(targetU, -0.5, 1.5);
  const nextV = clamp(targetV, -0.5, 1.5);
  if (Math.abs(nextU - finite(piece.u, .5)) < 1e-6
    && Math.abs(nextV - finite(piece.v, .5)) < 1e-6) return true;
  if (snapshot) {
    checkpoint();
    bringToTop(piece);
  }
  piece.u = nextU;
  piece.v = nextV;
  render();
  persistSoon();
  return true;
},
```

`effectivePlacement` / `venueSize` / `pieceDims` / `bringToTop` / `checkpoint` /
`render` / `persistSoon` / `clamp` / `finite` はすべて同IIFE内に既存。
`updateInspector` は位置には不要（本編の位置表示は render が持つ）ので呼ばない。

## 作業2: stage-first-person.js — 体ドラッグで移動

### 2-1. ヘルパー

`facingFromGround` の近くに追加し、`_geom` にも公開:

```js
/* 床のワールド座標を舞台の正規化座標へ戻す（toWorld の逆） */
function uvFromGround(hit, width, depth) {
  return { u: hit.x / width + 0.5, v: hit.z / depth + 0.5 };
}
```

### 2-2. 状態

`facingDrag` の隣にモジュール変数 `let moveDrag = null;` を追加。
形は `{ id, offsetU, offsetV, snapshotted }`。

### 2-3. onPointerDown

リング判定（`hitsFacingControl`）の**後**、見回しドラッグ開始の**前**に:

```js
if (state.sel && data && !data.transition) {
  const hit = pickPerformer(point.x, point.y);
  const piece = hit && hit.id === state.sel && data.pieces.find((candidate) => (
    candidate.id === state.sel && candidate.type === "performer" && !candidate.exitWalker
  ));
  const holder = piece && supportOf(piece, data.pieces);
  const mounted = holder && ["pole", "trapeze", "tissue", "chair"].includes(holder.type);
  if (piece && !mounted) {
    const foot = toWorld(pieceUOf(piece), pieceVOf(piece), W, D, pieceBaseOf(piece));
    const ground = groundPointAt(point.x, point.y, foot.y);
    const at = ground ? uvFromGround(ground, W, D) : null;
    moveDrag = {
      id: state.sel,
      offsetU: at ? pieceUOf(piece) - at.u : 0,
      offsetV: at ? pieceVOf(piece) - at.v : 0,
      snapshotted: false,
    };
    drag = null;
    elements.canvas.classList.add("dragging");
    if (elements.canvas.setPointerCapture) elements.canvas.setPointerCapture(event.pointerId);
    hintDismissed = true;
    elements.hint.classList.add("gone");
    return;
  }
}
```

### 2-4. onPointerMove

`facingDrag` ブロックの後に:

```js
if (moveDrag) {
  const piece = data && data.pieces.find((candidate) => (
    candidate.id === moveDrag.id && candidate.type === "performer" && !candidate.exitWalker
  ));
  if (!piece || data.transition) return;
  const point = canvasPoint(event);
  const foot = toWorld(pieceUOf(piece), pieceVOf(piece), W, D, pieceBaseOf(piece));
  const ground = groundPointAt(point.x, point.y, foot.y);
  if (!ground || !state.bridge || !state.bridge.setPiecePlace) return;
  const at = uvFromGround(ground, W, D);
  if (state.bridge.setPiecePlace(moveDrag.id, at.u + moveDrag.offsetU, at.v + moveDrag.offsetV,
    !moveDrag.snapshotted)) {
    moveDrag.snapshotted = true;
  }
  return;
}
```

（snapshotted はブリッジが true を返したら立てる。位置が変わらなくても true が返るが、
checkpoint はブリッジ側で「実際に変わった時だけ」通る作りなので二重にはならない。
※ブリッジは変化なしでも true を返すため、厳密には最初の「変化あり」まで snapshot 引数が
true で渡り続ける。ブリッジ側は変化が無ければ checkpoint まで到達しないので問題ない。）

### 2-5. 後始末

- `endPointer`: `moveDrag = null;` を追加し、`shouldPick` の条件に `!moveDrag` を加える
  （体を掴んだだけで動かさなかった場合は選択維持のままでよい。moveDrag があった
  pointerup ではタップ選択処理をしない）。
  ※ endPointer 冒頭で moveDrag を読む順序に注意（null 代入は shouldPick 判定の後）。
- `clearSelection` と `open()` と `close()` に `moveDrag = null;` を追加。

### 2-6. パネルへ操作ヒントを1行

編集パネルの head の下（姿勢帯の上）に小さな案内行を足す:
`text("体をドラッグで移動・リングで向き")`（class `hint2`、CSS:
`#stage-fpv-edit .hint2{font-size:10.5px;opacity:.5;margin:-2px 0 6px}`）。
乗り物固定のときは `text("移動と姿勢は乗り物側で決まっています")` にする
（このときは従来の「姿勢は乗り物で決まっています」の行は出さず、こちらに一本化）。

## 作業3: stage-i18n.js — 追加文言

```js
"体をドラッグで移動・リングで向き": "Drag body to move · ring to turn",
"移動と姿勢は乗り物側で決まっています": "Position and pose are set by the apparatus",
```

（旧「姿勢は乗り物で決まっています」の辞書行は残してよい）

## 完了条件

1. `node --check` 3ファイル、`node --test tests/stage-first-person.test.mjs` 全件成功。
2. `uvFromGround`: `{x:0,z:0}`→(0.5,0.5)、`{x:6,z:-4.5}`(W12,D9)→(1.0,0.0) になる
   （テスト1本追加）。
3. 挙動（発注元が検証）: 選んだ演者の体をドラッグすると床を滑り、ポインタの下に付いてくる。
   盆の上でも滑らない（保存値は逆変換済み）。undo1回でドラッグ全体が戻る。
   リング・姿勢タイル・見回しの既存操作は壊れない。
