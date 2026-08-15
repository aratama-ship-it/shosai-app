# 作業指示書: AI編集の聞き返しに「選択肢で答える」経路を作る（2026-08-13・第7便）

発注: Claude（方式Bを本人が承認・2026-08-13）／実装: Codex／検証: Claude
前便: docs/TISSUE_GRIP_WORKORDER_2026-08-13.md（実装・検証・commit済み）
対象: `mcp-server/src/` ＋ `stage-sketch.js` / `index.html` / `stage-i18n.js` / `tests/`
**触らないもの**: 書斎側（`app.js`・制作机・資料棚）、`stage-venue-*.js`、`stage-venues.js`。
**git commit しない。**

## 0. いまどうなっているか（Claudeがソースを読んで確認済み）

- `mcp-server/src/edit-plan.js:617` — `questions` が1件でもあると
  `status: "needs_clarification"` になる。
- 質問が出る条件は**1種類だけ**（同 51-64行）: 指示された名前が既存の演者／セットの
  **複数件に一致した**とき。情報不足は既定値で埋めて先へ進む方針なので、質問は必ず
  **「どれのことですか」型**になる。
- `questions` は**ただの文字列の配列**。候補名は文中に埋め込まれているだけで、機械可読ではない。
- UI 側 `stage-sketch.js:488` の `canAdopt(plan)` は `status === "proposed"` のときだけ真。
  つまり **needs_clarification では「採る」が出ない**（ここは既に正しい）。
- **足りないのは「答えを返す道」だけ。** いまは質問が出た時点で行き止まりになる。

## 1. 方式（本人承認済み・再議論しない）

**会話履歴は持たない。** 質問を選択肢のボタンで出し、押したら
「元の指示＋選んだ答え」で**もう一度ゼロから計画を作り直す**。
答えは作り直した時点で捨てる。チャットにはしない。

## 2. MCP側

### 2-1. 構造化した質問を足す（`edit-plan.js`）

51-64行の分岐で、いまの文字列に**加えて**構造化した質問を作る。
**既存の `questions`（文字列配列）はそのまま残す**（後方互換。既存テストとMacアプリの表示が依存している）。

計画へ新しいキー `clarifications` を足す:

```js
clarifications: [
  {
    id: "clarify-1",              // 計画の中で一意。出た順に1から
    assetType: "performer" | "set",
    assetName: "指示に書かれていた名前",
    text: "（いまの日本語の質問文をそのまま）",
    options: [
      { assetId: "<既存アセットのid>", label: "<candidateText と同じ表示文>" },
    ],
  },
]
```

- `options` は `matches` の順序をそのまま使う。`label` は既存の `candidateText()` の返り値を使う
  （表示文を二重に持たない）。
- 検証エラー（603行）由来の質問には `clarifications` を作らない
  （選択肢で答えられる種類ではないため）。この場合 `clarifications` は空配列。

### 2-2. 答えを受け取る（`edit-plan.js` / `schemas.js`）

`plan_edit` の入力へ `resolutions` を足す（任意・省略可）:

```js
resolutions: [
  { assetType: "performer" | "set", assetName: "名前", assetId: "選ばれたid" },
]
```

名前解決（51行の `matches` を出したところ）で:

1. `matches.length === 1` なら今までどおり。
2. 複数一致したとき、`resolutions` に **assetType と assetName が一致し、
   かつ assetId が matches の中にある**エントリがあれば、**それを採用して質問を出さない**。
3. 一致するエントリが無い、または `assetId` が候補外なら、**今までどおり質問を出す**
   （黙って先頭を選ぶことは絶対にしない）。

`schemas.js` に `resolutions` の形を足す。**未指定でも通ること。**

## 3. UI側（`stage-sketch.js` / `index.html`）

### 3-1. 選択肢の描画

AI指示パネルの「下書きあり」状態で、`plan.status === "needs_clarification"` かつ
`plan.clarifications` が1件以上あるとき:

- 質問ごとに `text` を出し、その下に `options` を**ボタンの行**で並べる（既存の `.stage-action-row` 様式）。
- 押されたボタンは `aria-pressed="true"`（ポール左右ボタンと同じ作法）。
- **すべての質問に答えが選ばれたときだけ**「**この答えで作り直す**」ボタンを有効にする。
- `clarifications` が無い古い計画は、**いまの文字列表示のまま**にする（壊さない）。

### 3-2. 作り直し

「この答えで作り直す」で、**同じ指示文＋選んだ答え**でもう一度AIを走らせる。
プロンプトの組み立ては既存（`stage-sketch.js` 12681行あたりの
`本人の指示（この文字列をrequestへそのまま入れる）: ...`）と同じ形で、1行足す:

```
本人の答え（この配列を plan_edit の resolutions へそのまま入れる）: <JSON>
```

- 走らせたら**選択状態は捨てる**（次の計画が来たら新しい質問に置き換わる）。
- 元のショーはこの間も変わらない（現行の保証をそのまま維持する）。

### 3-3. i18n

新しい日本語UI文字列には `stage-i18n.js` へ英訳を足す
（`tests/stage-i18n-coverage.test.mjs` が stage.html の日本語を全部拾うため）。
最低限: 「この答えで作り直す」。

## 4. テスト

### MCP（`mcp-server/test/edit-plan.test.js` へ追加）

1. 同名の演者が2人いる指示 → `status === "needs_clarification"`、
   `clarifications[0].options` が2件、`assetId` が実在のidであること。
2. その `assetId` を `resolutions` に入れて再実行 → `status === "proposed"` になり、
   **意図した方のアセット**が操作対象になっていること。
3. `resolutions` に候補外の `assetId` を入れた場合 → **やはり質問が出る**こと。
4. `resolutions` 未指定でも従来どおり動くこと（後方互換）。
5. 検証エラー由来の質問では `clarifications` が空配列であること。

### ブラウザ側（`tests/stage-ai-panel.test.mjs` の様式で追加）

6. `clarifications` を持つ計画で選択肢が描かれること。
7. 全部答えるまで「この答えで作り直す」が有効にならないこと。
8. `clarifications` の無い計画では従来の文字列表示のままであること。
9. プロンプトに `resolutions` の行が入ること。

## 5. 版番号（着手時に実物を読み直してから +1）

2026-08-13 時点: `stage-sketch.js` `?v=232` ／ `stage-i18n.js` `?v=48` ／
`style.css` `?v=168` ／ `stage-sw.js` `CACHE_NAME = "stage-sketch-pwa-v59"`。

- **`index.html` が正本、`stage.html` は生成物。** 触ったら必ず `python3 build_stage.py`。
- 版は `index.html` / `stage.html` / `stage-sw.js` の3か所を揃える。
- `tests/stage-venue-library.test.mjs` が版番号を直書きしているので、上げたらそこも直す。

## 6. 完了条件

- `node --test tests/*.mjs` 全通過。**現在の基準は237件**（減っていたら壊している）。
- `cd mcp-server && npm test` 全通過。**現在の基準は34件**。
- `stage-sketch.js` は約15,900行。触る前に `stage-sketch_backup_2026-08-14.js` を取る。
- **既存の「採る」「捨てる」「下書きの重ね描き」の挙動を変えないこと。** 足すだけ。
- このファイル末尾へ「## 実装報告(Codex)」を追記（変更ファイル・テスト結果・版番号の新旧）。
