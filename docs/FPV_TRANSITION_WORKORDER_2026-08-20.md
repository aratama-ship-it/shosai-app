# 発注書: 3Dカメラ（FPV）で転換アニメを見せる ＋ 演者の目を描く

- 日付: 2026-08-20（FPV肉付け移植の続き）
- 発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
- 対象ファイル: `stage-sketch.js` と `stage-first-person.js` の2つだけ。
  **版上げ（?v=・CACHE_NAME）と stage.html 再生成は発注元がやるので触らない。**
- バックアップ済み: `*_backup_2026-08-20-before-fpv-transition.js`（Codexは作らなくてよい）
- **削除・移動・リネーム禁止。編集前に対象箇所を読み直す（iCloud共有・並行作業あり）。**

## 背景（調査済みの事実）

FPVは毎フレーム `bridge.read()` で本編の駒を読み直す。read() は駒を `{...visual}` で
コピーするので、転換中の `animU/animV/animBase/animPose/animGlow/animMech` は
**既にFPVへ毎フレーム届いている**。機構（盆・セリ等）は `machineryParts`/`effectivePlacement` が
`mechVal`（animMech対応）を通るため既に動く。欠けているのは:

1. FPVの描画が `piece.u/piece.v/piece.base` を直読みし、転換中の中間値を無視している
2. はけ・入りの「写し」（`sceneAnim.exits`）が read() に含まれず、FPVでは見えない
3. 暗転（`sceneAnim.blackout`）の幕がFPVに無い
4. FPVの場面送り（←/→）が黒フェードを掛けるので、転換アニメが見えても出だしが隠れる

あわせて、前回省略した**演者の目**（顔の向きの2点）もFPVに足す。

## 作業1: stage-sketch.js — read() の拡張（openFpv 内、17820行付近）

read() が返すオブジェクトに3点を足す。`sceneAnim` は同IIFE内のモジュール変数
（13151行 `let sceneAnim = null`）で、openFpv からそのまま参照できる。

1. `animateScenes: Boolean(state.animateScenes),`
2. `transition: sceneAnim ? { progress: finite(sceneAnim.progress, 0), blackout: Boolean(sceneAnim.blackout) } : null,`
3. `pieces:` の配列の末尾に、はけの写しを連結する:

```js
pieces: current.pieces.map((candidate) => { /* 既存のまま */ }).concat(
  sceneAnim && sceneAnim.exits ? sceneAnim.exits.map((entry) => ({
    ...entry.piece,
    dims: pieceDims(entry.piece),
    exitWalker: true,
  })) : []),
```

写し（`exit-…`/`lightout-…`）は場面の駒ではないので、既存mapの
effectivelyPlacedPiece 等には通さず上記の最小形でよい（盆に乗らない・routeを持たない）。

## 作業2: stage-first-person.js — 転換中の値で描く

### 2-1. ヘルパー（`heightOf` の近くに追加）

```js
/* 転換アニメの途中は途中の値で描く（本編の pieceU/pieceV と同じ決まり）。
 * ここを通さず piece.u を直に読むと、その経路だけ転換で瞬間移動する。 */
const pieceUOf = (piece) => (piece && piece.animU !== undefined ? piece.animU : piece && piece.u);
const pieceVOf = (piece) => (piece && piece.animV !== undefined ? piece.animV : piece && piece.v);
const pieceBaseOf = (piece) => finite(piece && (piece.animBase !== undefined ? piece.animBase : piece.base), 0);
const pieceGlowOf = (piece) => clamp(finite(piece && (piece.animGlow !== undefined ? piece.animGlow : piece.glow), 1), 0, 1.5);
```

### 2-2. 置き換え（u/v/base の直読みを全部ヘルパー経由に）

- `drawPerformerSimple`: `toWorld(piece.u, piece.v, W, D, finite(piece.base, 0))` →
  `toWorld(pieceUOf(piece), pieceVOf(piece), W, D, pieceBaseOf(piece))`。
  同関数内の `finite(piece.base, 0)`（影の条件と top の計算、2箇所）も `pieceBaseOf(piece)` に。
- `drawPerformer`（肉付け版）: `base` と `foot` の計算を同様に置き換え。
- `drawRoute`: 出発点の `piece.u / piece.v` → `pieceUOf / pieceVOf`。
- `drawLightPools`: `toWorld(piece.u, piece.v, W, D)` → ヘルパー経由。さらに明るさを
  `const glow = pieceGlowOf(piece);` で取り、2つの塗り色のアルファに掛ける:
  `rgba(242,233,205,${(.10 * glow).toFixed(3)})` と `rgba(242,233,205,${(.05 * glow).toFixed(3)})`
  （テンプレート文字列で生成。glow=1 のとき従来と同じ見た目になること）。
- `drawMinimap` の駒ループ: `toWorld(piece.u, piece.v, W, D)` → ヘルパー経由。
- `renderFrame` の奥行きソート: `toWorld(piece.u, piece.v, W, D, 1)` → ヘルパー経由。
- `cameraPose`: `toWorld(finite(me.u, 0.5), finite(me.v, 0.5), W, D)` →
  `toWorld(finite(pieceUOf(me), 0.5), finite(pieceVOf(me), 0.5), W, D)`
  （演者視点のまま転換すると、視点が動線に沿って歩く）。
- `eyeHeight`: `finite(piece && piece.base, 0)` → `pieceBaseOf(piece)`。
- `mountedPose` の最後の行: `return piece && piece.pose || "stand";` →
  `return piece && (piece.animPose || piece.pose) || "stand";`
  （肉付け版は resolvePoseId が animPose を見るので変更不要。これはフォールバック用）。

### 2-3. はけの写しをキャストチップに出さない

`performers(pieces)`（433行付近）のフィルタへ `&& !piece.exitWalker` を足す。
描画ループ（renderFrame）は `data.pieces` を直に回すので写しもそのまま描かれる（それでよい）。

### 2-4. 場面送りのフェードを転換アニメ時はやめる

`queueScene` で、`data.animateScenes` が真なら黒フェードを掛けず即座に切り替える:

```js
pendingScene = target;
if (!data.animateScenes) elements.fade.classList.add("on");
if (!sceneTimer) sceneTimer = setTimeout(runPendingScene, data.animateScenes ? 0 : 140);
```

`runPendingScene` は変更不要（最後の `elements.fade.classList.remove("on")` はそのまま）。

### 2-5. 暗転の幕

`renderFrame` の `readCurrent()` の後に:

```js
const transition = data.transition;
if (transition && transition.blackout) {
  /* 暗転。本編と同じ山なりのカーブ（進行0→1で 明→暗→明） */
  elements.fade.style.transition = "none";
  elements.fade.style.opacity = String(Math.sin(Math.PI * clamp(finite(transition.progress, 0), 0, 1)));
} else if (elements.fade.style.opacity !== "") {
  elements.fade.style.opacity = "";
  elements.fade.style.transition = "";
}
```

（インラインstyleはCSSクラスより勝つので、通常フェードと衝突しない。終わったら必ず消す。）

### 2-6. 演者の目（前回の積み残し）

肉付け版 `drawPerformer` 内、`deep` を求めた後に目の位置を投影する
（本編 buildRig 5035-5042行と同じ式。瞳孔間0.019×2＝身長比）:

```js
const f = pose.face;
const eyes = [-1, 1].map((side) => project(
  headJ[0] + f[0] * 0.048 + wide[0] * 0.019 * side,
  headJ[1] + f[1] * 0.048 + wide[1] * 0.019 * side,
  headJ[2] + f[2] * 0.048 + wide[2] * 0.019 * side));
```

`paintBody3d(ctx, body, P, rings, wheel, props, color)` の引数に `eyes` を足し
（呼び出し側も直す）、head を描く分岐の楕円の後に:

```js
if (eyes && 0.05 * P.head.s > 3) {
  ctx.fillStyle = "rgba(13,12,11,0.5)";
  ctx.beginPath();
  eyes.forEach((eye) => {
    if (eye.z < P.head.z - 0.004) return;   // 頭の向こう側の目は描かない
    const r = Math.max(0.9, 0.0095 * P.head.s);
    ctx.moveTo(eye.x + r, eye.y);
    ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2);
  });
  ctx.fill();
}
```

### 2-7. テスト用エクスポート

`window.SHOSAI_STAGE_FPV` の `_geom` に `pieceUOf, pieceVOf, pieceBaseOf, pieceGlowOf` を足す。

## 完了条件

1. `node --check` が両ファイルで通る。
2. `node --test tests/stage-first-person.test.mjs` 全件成功。
3. 挙動（発注元が検証）: FPVで「次の場面 ▶」を押すと駒が動線に沿って動き、
   はけの演者が袖へ歩き、暗転指定の場面では幕が掛かる。演者視点では視点ごと歩く。
   目が近距離で見える。アニメーションOFFなら従来どおり黒フェード。
