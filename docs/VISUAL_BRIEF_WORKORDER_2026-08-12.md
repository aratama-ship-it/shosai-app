# 作業指示書: 場面スタディ→ビジュアルブリーフ接続（2026-08-12・第2便）

発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
前便: `docs/DESK_PERSISTENCE_WORKORDER_2026-08-12.md`（実装・検証済み。この上に積む）
対象: index.html + app.js + style.css の書斎側。**stage-*.js / stage.html に触れない。git commit しない。**

## 背景（自己完結の要約）

制作机（kind "new" のプロジェクト）は前便で localStorage 永続化と場面スタディ入力UIを得た。
設計計画書 Step 6「ビジュアルブリーフへ変える」を実装し、場面スタディからブリーフへの
接続を作る。**AIは使わない。** 接続とは「本人が紙面に書いた記述を、ブリーフの初期値へ
機械的に写す」こと（設計書6.4: AIの提案を本人の決定へ自動昇格させない、を守る）。

前便で作った部品を必ず流用する:
`normalizeDeskProject` / `syncCurrentDeskProject` / `renderSheetEditor` の編集モードパターン
（下線入力 `.sheet-field` 系スタイル）／ `window.SHOSAI_DESK_PROJECTS_API`。

## データ

project レコードへ `brief` を追加（normalizeDeskProject で防御）:

```js
brief: {
  subject,      // 主題
  viewpoint,    // 視点と構図
  people,       // 人物数と距離
  objects,      // 主要な物
  background,   // 背景
  color,        // 色
  light,        // 光
  material,     // 素材感
  era,          // 時代感
  moment,       // 動きの瞬間
  lettering,    // 文字の有無
  avoid,        // 避けたい要素
} | null        // 全フィールド空（trim後）なら null
```

- 12項目・この順・この日本語ラベルは設計書 Step 6 の固定リスト。増減しない。
- `normalizeBrief(raw)` を新設（normalizeScene と同水準）。旧保存データ（briefなし）も
  壊れず読めること。

## UI（kind "new" のみ。見本 kind "fixed" には出さない）

### 置き場所

index.html の `.visuals` セクション内、`.visuals-head` と `#visual-grid` の間に
`<div class="visual-brief" id="visual-brief"></div>` を追加。描画は app.js。

### 表示モード

1. 冒頭に判定基準の一行:
   - `p.sceneLine` あり → 「場面の一行 — <本文>」を小さく常時表示
     （ブリーフと3案比較の共通判定基準。設計書 Step 5.5）。
   - なし → 「まず紙面の「場面の一行」を言い切ると、ブリーフと3案比較の判定基準になります
     （暫定でよい）。」という促し文。**ブリーフの記入自体は妨げない**
     （制限をエラー扱いにすると早すぎる収束を招く — 設計書 Step 5.5）。
2. `brief` が null → プレースホルダ
   「ブリーフはまだ書かれていません。場面スタディの条件を、画像試作に渡せる形へまとめます。」
   ＋「書き込む」ボタン。
3. `brief` あり → 12項目を dl で表示（空項目は行ごと非表示）＋「書き込む」ボタン。
   様式は紙面の `.transform-memo` の dl に揃える（新装飾を作らない）。

### 編集モード（紙面と同じその場編集。モーダル禁止）

- 上部に**参照ブロック**（読み取り専用・小さく）: 場面スタディから
  「この場面が観客に起こすこと」「関係の埋まっている行（人物・物・光・音・背景）」
  「意図的に外したもの」を引用表示。書き写しの元を目の前に置くための接続。
  scene が null なら出さない。
- 12項目の入力（`.sheet-field` 流用。textarea rows=2。「文字の有無」だけ input 1行）。
- 下部に「保存」「取り消す」。保存で normalize→`syncCurrentDeskProject()`→表示モード。
- **初期値の写し込み（brief が null で編集を開いた初回のみ）**:
  | ブリーフ項目 | 初期値の出どころ（本人の記述） |
  |---|---|
  | 人物数と距離 | scene.relations の「人物」行 |
  | 主要な物 | 同「物」行 |
  | 光 | 同「光」行 |
  | 背景 | 同「背景」行 |
  | 避けたい要素 | scene.removed と transformation の「避ける表面」行を「／」で連結 |
  - 出どころが空なら空のまま。他の項目（主題・視点と構図・色・素材感・時代感・
    動きの瞬間・文字の有無）は常に空で始める。**要約・言い換えをしない。原文のまま写す。**
  - この写し込みロジックは純関数 `briefDraftFromStudy(project)` として切り出し、
    API へ公開してテスト可能にする。
- 既に brief がある場合の編集は保存値をそのまま出す（写し込みしない）。

### 3案スロットの文言

`renderVisuals` の isNew 空スロット文言
「方向の異なる試作をここに置く<br>（場面の一行を書いてから作る）」を
「方向の異なる試作をここに置く<br>（場面の一行→ブリーフの順で書いてから）」へ変更。

## 完了条件

- index.html の `?v=50` を `?v=51` へ。
- `window.SHOSAI_DESK_PROJECTS_API` へ `normalizeBrief` / `briefDraftFromStudy` /
  `BRIEF_FIELD_LABELS`（12項目のキーとラベルの定義）を追加公開。
- `tests/visual-brief.test.mjs` 新設（前便 tests/desk-projects.test.mjs の様式）:
  - normalizeBrief の防御（型違い・欠損・全空→null）
  - brief ありプロジェクトの保存→読込ラウンドトリップ
  - briefDraftFromStudy: 関係行・removed・避ける表面が正しい項目へ原文のまま写ること／
    scene・transformation が null でも壊れないこと
  - 旧形式（brief キーなし）の保存データが読めること
- `node --test tests/*.mjs` 全通過（既存を壊さない）。
- 実装完了後、このファイル末尾へ「## 実装報告(Codex)」を追記
  （変更ファイル一覧・テスト結果）。

## 実装報告(Codex)

### 変更ファイル

- `app.js`
  - `BRIEF_FIELD_LABELS` / `normalizeBrief` / `briefDraftFromStudy` を追加し、`window.SHOSAI_DESK_PROJECTS_API` へ公開。
  - `normalizeDeskProject` に `brief` の防御的 normalize を追加し、旧形式（briefなし）を `null` として読めるようにした。
  - kind `"new"` のビジュアルスタディ欄へブリーフ表示・その場編集・保存同期を追加。
  - 3案空スロット文言を「場面の一行→ブリーフの順」へ更新。
- `index.html`
  - `.visuals-head` と `#visual-grid` の間に `#visual-brief` を追加。
  - `<script src="app.js?v=50">` を `?v=51` へ更新。
- `style.css`
  - ビジュアルブリーフ欄の最小スタイルを追加。既存の `.transform-memo` / `.sheet-field` 系を流用。
- `tests/visual-brief.test.mjs`
  - normalize、防御、保存→読込、初期写し込み、旧形式読込のテストを追加。
- `docs/VISUAL_BRIEF_WORKORDER_2026-08-12.md`
  - 本実装報告を追記。

`stage-*.js` / `stage.html` は本便では変更していない。

### テスト結果

- `node --test tests/visual-brief.test.mjs`
  - PASS（5 tests / 5 pass）
- `node --test tests/*.mjs`
  - PASS（206 tests / 206 pass）

## 検証報告（Claude・2026-08-12）

- `node --test tests/*.mjs` を自分で実行し **206/206 pass** を確認（Codex報告と一致）。
- スナップショット（`claude-files-archives/shosai-snapshots/2026-08-12_visual-brief_before/`）
  との差分を全行精読。仕様との乖離なし。既存様式（.transform-memo / .sheet-field）の流用を確認。
- ブラウザ実機検証（localhost）:
  - 場面スタディ記入後にブリーフ「書き込む」→ 人物・物・光の関係行、外したもの／避ける表面の
    連結（「／」）が対応項目へ**原文のまま**写し込まれること、空の出どころ（背景）は空のままであること。
  - 参照ブロック（場面スタディから写す元）の表示、「場面の一行」の判定基準表示。
  - 保存→表示モードのdl（空項目非表示・7行）→ リロード後の復元、3案スロット文言の更新。
  - 検証用データは確認後に削除済み。
