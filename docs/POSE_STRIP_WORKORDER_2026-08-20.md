# 発注書: 正面図の下に姿勢タイル帯（横スクロール）を付ける

- 日付: 2026-08-20（本人の指定: 3Dカメラの姿勢帯が良いので正面図にも。小さく・横スクロール）
- 発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
- 対象ファイル: `index.html`・`style.css`・`stage-sketch.js` の3つと、
  新規テスト `tests/stage-pose-strip.test.mjs`。**版上げと stage.html 再生成は発注元がやる。**
- バックアップ済み: `stage-sketch_backup_2026-08-20-before-pose-strip.js` /
  `style_backup_2026-08-20-before-pose-strip.css`
- **削除・移動・リネーム禁止。並行作業あり。編集前に該当箇所を読み直し、内容で位置特定。**

## 仕様

- 演者を選んでいる間だけ、**正面図の枠（`#stage-front-cell`）のいちばん下**に
  姿勢タイルの帯が出る。タイルは小さめ（幅56px・絵48px）で**横スクロール**。
- タイルは 3Dカメラの姿勢帯と同じく `POSES` 全種を `drawPosePreview` の絵付きで並べ、
  現在の姿勢をハイライトして中央へスクロール。クリックで姿勢変更
  （checkpoint → updateInspector → render → persistSoon → announce。
  文言は既存モーダルと同一の「姿勢を「◯◯」にしました。」を使う＝SAY登録済み）。
- **乗り物（mountKindOf が pole/chair/trapeze/tissue を返す）に乗っている演者では出さない**
  （既存の姿勢ボタンの disabled と同じ判断）。演者以外の選択・未選択でも出さない。
- 正面図を閉じている（平面のみ等）ときは、`#stage-front-cell` ごと隠れるので追加対応不要。
- 見た目は既存の姿勢モーダルのタイル（`.stage-pose-tile`、style.css 2438行付近）の
  配色（`--line-dark`／`--brass`／`--rust`／`--milk-dim` 等のCSS変数）を踏襲した縮小版。

## 作業1: index.html

`#stage-front-cell` 内、`#stage-front-inner`（`</div>` で閉じた直後、
`#stage-front-cell` の閉じタグの直前）へ追加:

```html
<!-- 選んだ演者の姿勢を、正面図の下から直接選ぶ帯。演者を選んでいる間だけ出る -->
<div class="stage-pose-strip" id="stage-pose-strip" hidden></div>
```

## 作業2: style.css

`.stage-pose-tile` 系の定義の近くに追加:

```css
/* 正面図の下の姿勢帯。モーダルを開かずに姿勢を選ぶ（3Dカメラの帯と同じ発想の縮小版） */
.stage-pose-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 6px 8px;
  border-top: 1px solid var(--line-dark);
  scrollbar-width: thin;
}
.stage-pose-strip-tile {
  flex: none;
  width: 56px;
  padding: 0 0 3px;
  border: 1px solid var(--line-dark);
  background: rgba(13, 12, 11, 0.5);
  color: var(--milk-dim);
  font-size: 9.5px;
  letter-spacing: 0.02em;
  cursor: pointer;
  font-family: inherit;
}
.stage-pose-strip-tile canvas { display: block; width: 100%; height: 48px; }
.stage-pose-strip-tile span {
  display: block;
  padding: 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.stage-pose-strip-tile:hover { border-color: var(--brass); color: var(--milk); }
.stage-pose-strip-tile.is-on {
  border-color: var(--rust);
  background: rgba(168, 75, 38, 0.16);
  color: var(--paper);
}
```

## 作業3: stage-sketch.js

1. `els` の登録（`piecePose:` の近く）: `poseStrip: document.getElementById("stage-pose-strip"),`
2. `updateInspector` の**早期 return より前**（`els.selectionControls.hidden = !piece;` の
   近く、`if (!piece) return;` より上）に `renderPoseStrip(piece);` を挿入する。
   ※ piece が null でも呼ぶ（帯を隠すため）。
3. 関数を追加（updateInspector の近くでよい）:

```js
/* 正面図の下の姿勢帯。毎回39枚を描き直すと重いので、
   同じ演者・同じ色・同じ言語の間は組み直さず、ハイライトだけ動かす。 */
let poseStripFor = "";
function renderPoseStrip(piece) {
  if (!els.poseStrip) return;
  const show = Boolean(piece && piece.type === "performer" && !mountKindOf(piece));
  els.poseStrip.hidden = !show;
  if (!show) { poseStripFor = ""; return; }
  const buildKey = `${piece.id}|${piece.color}|${lang}`;
  if (poseStripFor === buildKey) {
    els.poseStrip.querySelectorAll(".stage-pose-strip-tile").forEach((tile) => {
      const on = tile.dataset.pose === piece.pose;
      tile.classList.toggle("is-on", on);
      tile.setAttribute("aria-pressed", String(on));
      if (on && tile.scrollIntoView) tile.scrollIntoView({ inline: "center", block: "nearest" });
    });
    return;
  }
  poseStripFor = buildKey;
  els.poseStrip.innerHTML = "";
  POSES.forEach((pose) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `stage-pose-strip-tile${pose.id === piece.pose ? " is-on" : ""}`;
    tile.dataset.pose = pose.id;
    tile.setAttribute("aria-pressed", String(pose.id === piece.pose));
    tile.title = poseName(pose);
    const canvas = document.createElement("canvas");
    canvas.width = 112;
    canvas.height = 96;
    const label = document.createElement("span");
    label.textContent = poseName(pose);
    tile.append(canvas, label);
    els.poseStrip.appendChild(tile);
    drawPosePreview(canvas, pose.id, piece.color);
    tile.addEventListener("click", () => {
      const current = selectedPiece();
      if (!current || current.type !== "performer" || mountKindOf(current)
        || current.pose === pose.id) return;
      checkpoint();
      current.pose = pose.id;
      updateInspector();
      render();
      persistSoon();
      announce(`姿勢を「${poseName(pose)}」にしました。`);
    });
  });
  const active = els.poseStrip.querySelector(".is-on");
  if (active && active.scrollIntoView) active.scrollIntoView({ inline: "center", block: "nearest" });
}
```

`mountKindOf` / `POSES` / `poseName` / `drawPosePreview` / `selectedPiece` / `checkpoint` /
`render` / `persistSoon` / `announce` / `lang` はすべて同IIFE内に既存。
（announce の文言は既存モーダルの姿勢変更と同一なので SAY 登録済み。新規登録不要。）

## 作業4: 新規テスト tests/stage-pose-strip.test.mjs

既存テストの流儀（source を読んで正規表現で検査）で最低限:

1. index.html に `id="stage-pose-strip"` があり、`stage-front-cell` の開始から
   `stage-plan-cell` の開始の間に位置する。
2. stage-sketch.js の `updateInspector` 本文（`function updateInspector` から
   `function renderPoseStrip` などの次関数まで）に `renderPoseStrip(piece)` の呼び出しがある。
3. `renderPoseStrip` 本文に `mountKindOf(piece)`（乗り物では出さない）と
   `drawPosePreview(` と `scrollIntoView` がある。
4. style.css に `.stage-pose-strip-tile` の定義がある。

## 完了条件

1. `node --check stage-sketch.js` が通る。
2. `node --test tests/stage-pose-strip.test.mjs` と
   `node --test tests/stage-first-person.test.mjs` が全件成功。
3. 挙動（発注元が検証）: 正面図で演者を選ぶと下に帯が出て横スクロールでき、
   タイルで姿勢が変わり、モーダル・FPVの姿勢とも一致。台等の装置や未選択では出ない。
   ポール・ブランコ搭乗中は出ない。undo1クリック=姿勢1変更。
