# 作業指示書: 3案比較の実画像化（持ち込み型・初見モード）（2026-08-13・第4便）

発注: Claude（仕様確定済み・本人判断2件反映済み）／実装: Codex／検証: Claude
前便: docs/DESK_PERSISTENCE / VISUAL_BRIEF / SHELF_DB 各WORKORDER_2026-08-12.md（実装・検証・公開済み）
対象: index.html + app.js + style.css の書斎側。**stage-*.js / stage.html に触れない。git commit しない。**
基準コミット: 8a26f72（作業ツリーはクリーン。差分確認は git diff でできる）

## 背景と本人判断（自己完結の要約）

kind "new" のプロジェクトのビジュアルスタディ欄は現在、空スロットA/B/Cの表示のみ。
設計書 Step 7（考え方が違う3案の比較）・Step 8（判断を残す）・7.4（初見モード）・
8節（生成履歴）を実装する。

本人判断（2026-08-13 確認済み）:
1. **持ち込み型。** アプリは生成条件の書き出しと受け皿に徹する。画像は外部
   （Midjourney・Codex・手描き写真等）で作り、ドラッグ&ドロップで持ち込む。
   アプリ内に画像生成APIを持ち込まない。
2. **初見モードは既定オン**（オフへ切替可）。新しく持ち込んだ画像の初回は、
   方向ラベル・意図・生成履歴を隠し、本人の第一印象を先に書いてから開示する。

設計原則（従来どおり）: AIの要約・提案を挟まない。本人の記述の機械結合だけ。
6.4「AIの提案を本人の決定へ自動昇格させない」。

## データ

### project レコードへの追加（normalizeDeskProject で防御）

```js
directions: {           // 3方向は固定キー A/B/C。本人が書く
  A: { label: string, intent: string },   // label=方向の一行、intent=この考え方の意図
  B: { ... }, C: { ... },
},                      // 両方空のキーは保存時 { label:"", intent:"" } のままでよい
visualMeta: {           // 画像のメタ（画像本体はIndexedDB）
  A: {
    importedAt: ISO,
    kind: "ai" | "self" | "external",   // AI生成／本人添付／外部資料（8節の区分）
    method: string,      // 使用したモデルまたは方法（自由記述）
    prompt: string,      // 使った生成条件（自由記述。書き出しテキストの貼り戻しを想定）
    firstImpression: { text: string, at: ISO } | null,
    revealed: boolean,   // 初見の開示が済んだか
  } | null,
  B: ..., C: ...,
},
```

- 旧レコード（これらのキーなし）は directions 空・visualMeta 全null として読めること。
- 判断記録は既存の `decisions` を流用し、キーは `"A"|"B"|"C"`。

### 画像本体 — IndexedDB

- 新ファイル `desk-media.js`（index.html で app.js より先に読み込み）。
  Promiseベースの小さなヘルパーを `window.SHOSAI_DESK_MEDIA` に公開:
  `put(projectId, dir, blob)` / `get(projectId, dir)` → Blob|null /
  `remove(projectId, dir)` / `removeProject(projectId)`。
  DB名 `shosai-desk-media`、store `images`、キー `${projectId}/${dir}`。
- IndexedDB が使えない環境では put が reject し、UIは「この端末では画像を保存できません」
  と表示して他機能は動き続ける。
- **プロジェクト削除時（机ホームの削除ボタン）に `removeProject` を呼ぶ**。画像を孤児にしない。
- 画像の受け入れは image/png, image/jpeg, image/webp のみ。10MB超は拒否してその旨表示。

## UI（kind "new" のみ。見本 kind "fixed" は現行のまま）

ビジュアルスタディ欄（#visual-grid とその周辺）を kind "new" のとき次の構成にする。

### 1. 方向の設計（A/B/C）

- 3スロット固定。各スロット上部に方向ラベル（`案A — <label>`）。
- 「書き込む」（紙面と同じその場編集様式）で label（1行）と intent（textarea 2行）を編集。
  placeholder に設計書の例を薄く出す:
  A「人物と物の関係を中心にする」B「光と空間の変化を中心にする」C「観客の視点と発見を中心にする」。
  ※placeholderであり初期値ではない（本人が書く）。

### 2. 生成条件の書き出し

- 各スロットに「生成条件を書き出す」ボタン。押すとスロット内に読み取り専用textareaと
  「コピー」ボタン（navigator.clipboard、失敗時は選択状態にする）。
- 内容は**機械結合のみ**（純関数 `visualPromptText(project, dirKey)` に切り出しAPIへ公開）:
  1. 場面の一行（あれば）
  2. 方向: label ＋ intent
  3. ビジュアルブリーフの埋まっている項目（`ラベル: 本文` 形式で12項目順）
  4. 固定の注意文（8節）:
     「実在作品の意匠・キャラクター・象徴を再現しない。構図上の機能・関係・光・時間・観客体験へ分解して扱う。」
     ＋ ブリーフ「避けたい要素」があればその内容
- ブリーフ未記入なら書き出しボタンの代わりに
  「先にビジュアルブリーフを書くと、ここから生成条件を書き出せます」を表示。

### 3. 画像の持ち込み

- 各スロットに投下領域（ドラッグ&ドロップ＋クリックでfile選択）。
- 持ち込み時に小さなフォームで生成履歴を記入して確定:
  区分（select: AI生成/本人添付/外部資料。既定=AI生成）／方法（1行・任意）／
  生成条件（textarea・任意。書き出したテキストを貼り戻す想定）。
  確定で IndexedDB へ保存し `visualMeta[dir]` を記録（importedAt付与、revealed=false）、
  syncCurrentDeskProject。
- 画像表示は ObjectURL（openProject時にロード、差し替え時はrevoke）。
  クリックで既存ライトボックスに大きく表示（新規プロジェクト用に画像URL対応を追加。
  見本のSVG表示は壊さない）。
- 「画像を外す」で IndexedDB からも削除（confirm不要。visualMeta=null に戻す）。

### 4. 初見モード（既定オン）

- ビジュアル欄の頭に切替（「初見モード」チェックボックス等の既存様式）。
  既定オン。設定は端末共通で `localStorage["shosai-first-look-v1"]` に保存。
- **オンのとき**: `visualMeta[dir].revealed === false` の画像は、画像だけを見せて
  方向ラベル・intent・生成履歴・判断ボタンを隠す。代わりに一行入力
  「第一印象 — 違和感・興味・身体感覚を先に書く」＋「書いて開く」ボタン。
  確定で firstImpression 保存・revealed=true・全情報を開示。
  **空のまま「書かずに開く」も置く**（強制しない。7.4）。その場合 firstImpression=null のまま
  revealed=true。
- **オフのとき**: 隠さない。持ち込み時点で revealed=true にする。
- 記入済み firstImpression はスロット内に常時小さく表示（判断の材料として）。

### 5. 判断記録

- 開示済みスロットに既存の判断UI（採用/一部採用/保留/不採用＋理由textarea）を出す。
  `decisions["A"|"B"|"C"]` に保存（既存syncの流儀）。

### 6. 生成履歴の表示

- 開示済みスロットに小さく: 区分バッジ（AI生成/本人添付/外部資料）・方法・持ち込み日
  （「8月13日」形式）。生成条件は details/summary で畳む。

## デザイン制約

- 新装飾体系を持ち込まない。既存の .visual-card / .sheet-field / .transform-memo /
  チップ様式・変数を流用。「同じ机の上」のトーンを保つ。文言はすべて日本語。
- 投下領域の空状態は現行の .visual-empty の意匠を踏襲する。

## 完了条件

- index.html の `app.js?v=` を**現在値を読み直してから+1**（基準時点では54）。
  desk-media.js の読み込みタグを追加（?v=1）。
- API へ `visualPromptText` と directions/visualMeta の normalize 関数を追加公開。
- `tests/visual-abc.test.mjs` 新設（既存テストの様式。IndexedDBはテスト対象外でよい—
  desk-media.js は薄く保ち、純関数部分をテストする）:
  - directions / visualMeta の normalize（型違い・欠損・旧レコード互換）
  - `visualPromptText` の機械結合（場面の一行・方向・ブリーフ項目・注意文・避けたい要素の包含、
    ブリーフ空項目の除外、**入力文の言い換えが起きないこと＝原文がそのまま含まれること**）
  - revealed / firstImpression の遷移（保存で revealed=true、空でも開ける）
  - decisions のキー A/B/C ラウンドトリップ
- `node --test tests/*.mjs` 全通過（stage系含め壊さない）。
- このファイル末尾へ「## 実装報告(Codex)」を追記（変更ファイル一覧・テスト結果）。

## 実装報告(Codex)

変更ファイル:
- `app.js`
- `index.html`
- `style.css`
- `desk-media.js`
- `tests/visual-abc.test.mjs`
- `docs/VISUALS_ABC_WORKORDER_2026-08-13.md`

実装内容:
- kind "new" のビジュアルスタディ欄に、A/B/C固定の方向編集、生成条件書き出し、画像持ち込み、初見モード、生成履歴、判断記録を追加。
- `normalizeDirections` / `normalizeVisualMeta` / `visualPromptText` / `revealVisualSlot` を `SHOSAI_DESK_PROJECTS_API` に公開。
- IndexedDBヘルパー `window.SHOSAI_DESK_MEDIA` を `desk-media.js` に追加し、画像保存・取得・削除・プロジェクト単位削除を実装。
- `index.html` は `desk-media.js?v=1` を `app.js` より前に追加し、`app.js?v=54` から `app.js?v=55` へ更新。

テスト結果:
- `node --test tests/*.mjs`
- 226 tests, 226 pass, 0 fail

## 検証報告（Claude・2026-08-13）

- `node --test tests/*.mjs` を自分で実行し **226/226 pass** を確認（Codex報告と一致）。
- git diff（基準 8a26f72）を全行精読。仕様乖離なし。
- ブラウザ実機検証（localhost・v=55）:
  - 生成条件の書き出し: 場面の一行→方向（label — intent）→ブリーフ記入項目→8節の注意文＋避けたい要素、
    の機械結合が原文のまま出力されること
  - 画像持ち込み（PNG）→生成履歴フォーム（区分=本人添付・方法・条件）→確定でIndexedDB保存・
    メタ記録（revealed=false）
  - 初見モード: 画像のみ表示・方向ラベル/意図/履歴/判断が隠れる→第一印象を書いて開く→全開示・
    履歴バッジ「本人添付」表示
  - 判断記録（一部採用＋理由）→**リロード後**: 画像・開示状態・第一印象・判断すべて復元
  - 「画像を外す」でUIとIndexedDB両方から削除、プロジェクト削除で後始末
  - 見本（kind fixed）は従来の3案SVG表示のまま・初見トグルも出ない
  - 検証データは削除済み。
- 既知の軽微な点: 生成条件テキストで「避けたい要素」がブリーフ行と注意文の2箇所に出る（仕様どおりだが冗長）。
  実使用で気になれば注意文側を「避けたい要素: 」引用なしに変える程度の小修正で済む。
