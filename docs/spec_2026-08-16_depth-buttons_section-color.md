# 仕様書: 深さ変更ボタン／キー・セクションの色指定（2026-08-16）

対象アプリ: 舞台スケッチ（`index.html` + `stage-sketch.js` + `style.css` + `stage-i18n.js`）

## 共通の制約（必ず守る）

- ファイルの削除・移動はしない。既存ファイルは編集前に必ず読む。
- 既存機能（ドラッグ並び替え・横ドラッグでの深さ変更、セクション開閉、色バー、
  「⊂」でまとめる、シーン一覧グリッド、アンドゥ、保存/読込）を壊さない。
- 追加する日本語UI文言は `stage-i18n.js` の対訳テーブルへ英訳を追加
  （`announce()` の文は `SAY` 側の正規表現テーブル）。
- CSSは `style.css` に追記。既存の落ち着いた茶系の配色・密度に合わせる。
- コメントは既存ファイルの流儀（日本語・理由を書く）で。

## 背景（現状の構造・関連コード）

- シーンは `state.project.scenes` のフラット配列。各行 `depth`(0〜`MAX_DEPTH`=4)、`kind`。
- 一覧の描画は `renderScenes()`。カーソル行にだけ鉛筆 `✎`(`.stage-scene-pen`) と
  `⊂`(`.stage-scene-wrap`) を出している（`if (isCursor && !wrapPickStartId)` の中）。
- 深さ変更はいまドラッグ中の横移動だけ（`moveSceneDrag` / `endSceneDrag`）。
  `endSceneDrag` の末尾に「前の行より2段以上深くならないよう詰める」正規化がある。
- 色は `sectionColor(id)` が id のハッシュから `SECTION_COLORS`(8色) を選ぶ。
  呼び出しは `makeSceneBars()` 内に2か所、セクション名の色チップ、`renderSceneGrid()` の見出し。
- 名前変更は `openRename(scene)` / `commitRename()`、窓は `index.html` の `#stage-rename`
  （`#stage-rename-title` / `#stage-rename-input` / `#stage-rename-ok`）。
- 上下キーは `stepScene()` に割り当て済み（document 全体、`isTyping` を除外）。
  左右キーはキャンバス上で駒の移動に使われている（`onKeyDown` 内の `moves`）。

---

## 機能A: 深さをボタンとキーで変える

### A-1 ボタン

- `renderScenes()` のカーソル行、鉛筆 `✎` の**前**に2つのボタンを足す:
  - `⇤`: class `stage-scene-outdent`、title「一段外へ出す」
  - `⇥`: class `stage-scene-indent`、title「一段内側へ入れる」
- 押したときの動作は共通関数 `shiftSceneDepth(scene, step)`（`step` は -1 か +1）へまとめる。
- `event.stopPropagation()` を必ず呼ぶ（行チップのクリックへ伝わると場面が開いてしまう）。
- 可否の判定（できないときは `disabled = true` にして押せなくする。押せない理由は出さない）:
  - `step === -1`: `scene.depth === 0` なら不可。
  - `step === +1`: **直前の見えている行**（配列上で一つ前の行）が無い、または
    `scene.depth > 直前の行.depth` のときは不可（＝すでにその親の中にいるので、これ以上入れない）。
    さらに `scene.depth + 1 > MAX_DEPTH` なら不可。
- 動作:
  1. `checkpoint()`
  2. 対象行とその**子孫**（`sceneChildren(index)`）の depth を一律 `step` 動かす。
     子孫のどれかが `MAX_DEPTH` を超えるなら何もしない（`announce("これ以上内側へは入れられません。")`）。
  3. 「前の行より2段以上深くならないよう詰める」正規化を全体にかける
     （`endSceneDrag` の末尾と同じ処理。共通関数 `tidySceneDepths()` として切り出し、
     `endSceneDrag` からもそれを呼ぶように置き換える）。
  4. `state.cursorRowId = scene.id` を保ち、`renderScenes()` + `renderSceneGrid()` + `persistSoon()`。
  5. `announce(step > 0 ? "一段内側へ入れました。" : "一段外へ出しました。")`

### A-2 キー

- **←/→ は「シーンの一覧の中にフォーカスがあるとき」だけ**深さ変更に使う。
  条件: `els.sceneList.contains(document.activeElement)` かつ `isTyping(event.target)` でない、
  かつ修飾キー無し、かつ `event.defaultPrevented` でないこと。
  （キャンバス上の駒の移動、プレゼンの送りと取り合いにならないようにするため。この条件は必須）
- 対象はフォーカスのある行のシーン（`closest("[data-scene-id]")` から引く）。
- 実行後、**同じ行のチップへフォーカスを戻す**（`renderScenes()` でDOMを作り直すため、
  描き直したあとに `[data-scene-id="…"] .stage-scene-chip` を `focus()` する）。
  これができないと、キーで続けて深さを変えられない。
- `event.preventDefault()` する。

## 機能B: セクションの色を選べるようにする

### B-1 データ

- `normalizeScene()` に、セクションだけが持つ色を追加:
  `color: kind === "section" ? validColor(raw.color, "") || null : null`
  （`validColor` は第2引数をそのまま返すので、空文字を渡して未指定は `null` に落とす）
- `newScene()` の戻り値にも `color: null` を足す。

### B-2 色の決まり方

- `sectionColor(id)` を **`sectionColor(scene)`** に変える（引数をシーン行そのものにする）。
  - `scene.color` があればそれを返す。
  - 無ければ従来どおり `scene.id` のハッシュから `SECTION_COLORS` を選ぶ（既定色）。
- 呼び出し側（`makeSceneBars()` の2か所、名前の色チップ、`renderSceneGrid()` の見出し）を
  すべて新しい引数へ直す。**id を渡している所が残らないよう全て確認すること。**

### B-3 選ぶUI（名前を変える窓に足す）

- `index.html` の `#stage-rename` の本文、名前の入力欄と「この名前にする」の間へ
  色を選ぶ列を足す。**セクションのときだけ見せる**（`hidden` を出し入れする）。
  ```
  <div class="stage-rename-colors" id="stage-rename-colors" hidden>
    <span class="stage-control-label">色</span>
    <div class="stage-rename-swatches" id="stage-rename-swatches" role="group" aria-label="色"></div>
  </div>
  ```
- `openRename(scene)` のとき:
  - `els.renameColors.hidden = scene.kind !== "section"`
  - セクションなら `#stage-rename-swatches` を作り直す。`SECTION_COLORS` の8色ぶんの
    ボタン（`.stage-rename-swatch`、背景がその色、`aria-label` は「色 1」〜「色 8」）を並べ、
    **いま効いている色**（`sectionColor(scene)` と一致するもの）に `aria-pressed="true"` を付ける。
  - 加えて先頭に「自動」ボタン（`.stage-rename-swatch.is-auto`、表示は「自動」、
    title「idから決まる既定の色に戻す」）を置き、`scene.color === null` のとき `aria-pressed="true"`。
- 色ボタンを押したら**その場で反映**する（窓は閉じない。名前と同時に決められるように）:
  `checkpoint()` → `renameTarget.color = 選んだ色（自動なら null）` →
  スウォッチの `aria-pressed` を更新 → `renderScenes()` + `renderSceneGrid()` + `persistSoon()`。
- `commitRename()` は名前だけを扱う（現状のまま）。色は押した時点で確定済み。
- 窓の見出しは、セクションのとき「セクションの名前と色」にする（シーンは従来どおり「シーンの名前」）。

### B-4 CSS

- `.stage-rename-colors` は横並び（`display:flex; align-items:center; gap:8px;`）。
- `.stage-rename-swatches` は `display:flex; flex-wrap:wrap; gap:6px;`。
- `.stage-rename-swatch` は 22×22px・角丸3px・境界線1px（既定は透明）。
  `aria-pressed="true"` のとき境界線を明るく（`rgba(240,231,214,0.85)` 程度）＋わずかに内側の影。
- `.stage-rename-swatch.is-auto` は背景を持たず、`--milk-dim` の文字で「自動」と出す。

---

## 完了条件（検証可能な形で）

1. `node --check stage-sketch.js` と `node --check stage-i18n.js` が通り、
   `node --test tests/*.test.mjs` が全て通る。
2. カーソル行に `⇤ ⇥ ✎ ⊂` が並び、`⇥` で一段内側へ入り、`⇤` で外へ出る。
   深さ0の行の `⇤`、その親の中にすでに居る行の `⇥` は押せない（disabled）。
3. セクションを `⇥`/`⇤` すると、その中の場面も一緒に動く（置き去りにならない）。
4. 一覧の行チップをクリックしてフォーカスを当てた状態で ←/→ を押すと深さが変わり、
   続けて押せる（フォーカスが外れない）。キャンバスで駒を選んでいるときの ←/→ は
   従来どおり駒の移動で、深さは変わらない。
5. セクションの `✎` を開くと色の列が出て、選ぶと一覧の色バー・色チップ・グリッド見出しの
   左ボーダーが即座に変わる。「自動」で既定色に戻る。リロードしても選んだ色が残る。
   シーンの `✎` には色の列が出ない。
6. 実装後、変更点の要約を本ファイル末尾に「## 実装メモ(Codex)」として追記する。

## 実装メモ(Codex)

- カーソル行へ `⇤` / `⇥` を追加し、行と子孫をまとめて動かす `shiftSceneDepth()`、可否判定、
  ドラッグと共用する `tidySceneDepths()`、一覧フォーカス中の左右キー操作を実装した。
- セクションの任意色を `color` として正規化・保存し、未指定時は従来の id 由来色へ戻すようにした。
  一覧の色バー／色チップ／シーングリッド見出しは同じ `sectionColor(scene)` を参照する。
- 名前変更モーダルへ「自動」＋8色のスウォッチを追加し、選択時に一覧とグリッドへ即時反映するようにした。
  追加UIとアナウンス文には英訳を登録した。
