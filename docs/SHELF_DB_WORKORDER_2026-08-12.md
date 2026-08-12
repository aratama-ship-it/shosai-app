# 作業指示書: 制作机の資料棚を固定5件→実DB接続（2026-08-12・第3便）

発注: Claude（仕様確定済み・本人判断2件反映済み）／実装: Codex／検証: Claude
前便: `docs/DESK_PERSISTENCE_WORKORDER_2026-08-12.md`・`docs/VISUAL_BRIEF_WORKORDER_2026-08-12.md`
（いずれも実装・検証済み。この上に積む）
対象: index.html + app.js + style.css の書斎側。**stage-*.js / stage.html に触れない。git commit しない。**

## 背景と本人判断（自己完結の要約）

制作机のドロワー資料棚（app.js `renderShelf` 付近）は固定5件（`SHOSAI.references`）のみ。
5件の「いまの問いとつながる理由」等は**見本プロジェクトの問い専用の手書き文章**である。
正本DB（`db.js` → グローバル `SHOSAI_DB`、app.js内では `const DB`、works 2,640件）へ接続する。

本人判断（2026-08-12 確認済み）:
1. **固定5件は見本専用に退避。** kind "new" のプロジェクトでは実DB検索だけを出す。
   固定5件は kind "fixed"（見本）の棚にだけ従来どおり出す。
2. **「なぜ置くか」の一行理由は任意＋促し。** 空でも置ける。置いた後から書ける。

設計原則: AIを使わない。理由・判断は本人が書く（設計書6.4）。事実・確信度・未確認はDBから
機械的に出し、区分を混ぜない。

## データ

### placed の拡張

現在 `placed` は文字列ID配列（state上は Set）。これを**エントリ配列**へ拡張する:

```js
placed: [{ id, role: "near" | "contrast", note: string, at: ISO文字列 }]
```

- `normalizeDeskProject`: 旧形式（文字列）は `{ id, role: "near", note: "", at: createdAt }` へ
  変換して読む。旧データを壊さない。
- state 側: `state.placed`（Set of id）は既存の has() 判定用に維持し、
  `state.placedMeta`（Map id → { role, note, at }）を追加。
  `syncCurrentDeskProject` は両者からエントリ配列を組み立てて保存する。
  `openProject` は保存レコードから両方を復元する。
- kind "fixed"（見本）は従来どおりのSet運用のままでよい（保存しない）。

### 作品の解決

- placed の id は、kind "new" では正本DBの作品ID（`DB.works[].id`）。
  旧データに `ref_` 始まりのID（固定5件）が混ざっていた場合は `SHOSAI.references` から
  解決して従来カードで表示する（後方互換。新規に置くことはできない）。
- 解決できないIDは左レールに「資料棚で見つかりません（ID）」と小さく表示し、外す操作だけ出す。
  黙って捨てない。

### 確信度の表示変換

DBの `confidence` は英語スネークケースの長文（例:
`high_official_description_with_scene_detail_unverified`）。純関数 `confidenceLabel(raw)` を作る:
先頭が `high`→「高」、`medium`→「中」、`low`→「低」、それ以外→「不明」。
括弧で原文をtitle属性に残す（`<span title="原文">高</span>`）。

## UI

### ドロワー資料棚（kind "new" のとき）

`renderShelf` を kind で分岐。kind "fixed" は現行実装のまま。kind "new" は:

1. **頭に現在の問いを小さく表示**: 「この問いに効く資料を探す — <question.current>」
   （sceneLine があれば2行目に「場面の一行 — <sceneLine>」）。
   検索語は本人が自分の言葉から選ぶ。AIによる推薦はしない旨をUIで匂わせない（単に出さない）。
2. **検索**: 既存 `#shelf-input` を流用。空白区切りの複数語は AND。対象フィールド:
   `title` / `original_title` / `company` / `genre` / `summary` / `themes` / `tone` /
   `structure` / `signature_scenes` / `show_type`（配列は各要素）。大文字小文字無視。
   検索ロジックは純関数 `searchShelfWorks(works, query)` に切り出し
   （一致フィールド数の多い順→年の新しい順で並べ、`{ work, hits }` の配列を返す）、APIへ公開。
3. **ジャンル絞り込みチップ**: `genre` の頻度上位8種＋「すべて」。選択中は検索と AND。
4. **結果カード**（上位30件まで。「全N件中30件を表示」を出す）:
   - 作品名／▪ 会社・年・ジャンル（事実マーク `.k-fact` は既存様式）
   - `summary` の先頭120字（…付き）
   - 確信度: `confidenceLabel` の表示
   - 「作品ページを読む →」リンク（`#db/<id>`。ドロワーは閉じる）
   - **「この制作へ置く」**: 押すとカード内がインライン展開し、
     - 近い／対照 の2択（既定: 近い）
     - 一行理由の入力（placeholder「なぜ置くか — 空でも置けます。あとから書けます」）
     - 「置く」ボタン → placedへ追加（role/note/at記録）、syncCurrentDeskProject、
       ボタンを「置きました」でdisabled化（既存挙動に合わせる）
   - 置き済み作品は最初から「置きました」disabled。
5. **検索語が空のとき**: 作品を並べない。促し文
   「問いの中の言葉や、作品名・会社名・ジャンルで探せます。」＋ジャンルチップだけを出す。
   2,640件を無差別に並べない（設計書7.2「同型カードを大量に並べない」）。

### 左レール（置いた資料・kind "new"）

`renderPlaced` を kind で分岐（fixed は現行のまま）。new は DBから解決して:
- 作品名／会社・年
- role が contrast なら「対照」タグ（既存 `.axis-tag` 様式）
- note があれば先頭を1行プレビュー。**無ければ「なぜ置くかを書き添える」を薄く表示**（任意＋促し）
- 「根拠を見る」「外す」（既存ボタン様式。外すは placedMeta からも削除して sync）

### 根拠パネル（kind "new" のとき）

`showEvidence`/`renderEvidence` を kind で分岐（fixed は現行のまま）。new は区分を分けて:
1. `▪ 事実` — 会社・年・ジャンル・種別、`summary`
2. `資料からの解釈（正本メモ）` — `themes`・`signature_scenes`（あれば。各最大3行）
3. `確信度` — `confidenceLabel` 表示＋原文をtitle属性
4. `未確認事項` — `status` の原文を小さく表示（DBの未確認マーカー）
5. `本人の判断 — なぜ置くか` — **編集可能なtextarea**。入力のたび（input）に
   placedMeta の note を更新して `syncCurrentDeskProject()`（判断記録textareaの既存実装と同型）
6. 末尾に「作品ページを読む →」（`#db/<id>`）
7. 既存の区分凡例文（`.ev-legend`）を流用

## 完了条件

- `?v=51` → `?v=52`。
- API へ `searchShelfWorks` / `confidenceLabel` を追加公開。
- `tests/shelf-db.test.mjs` 新設（前便テストの様式）:
  - placed 旧形式（文字列配列）→ エントリ配列への normalize
  - role/note/at 付き placed の保存→読込ラウンドトリップ
  - `searchShelfWorks`: AND検索・配列フィールドの一致・並び（一致数→年）・空クエリで空配列
  - `confidenceLabel` の変換（high/medium/low/その他）
- 既存テストの placed 形状の断言が変わる場合は**新仕様に合わせて更新**してよい
  （tests/desk-projects.test.mjs の placed ラウンドトリップ断言など）。
- `node --test tests/*.mjs` 全通過。
- このファイル末尾へ「## 実装報告(Codex)」を追記（変更ファイル一覧・テスト結果）。

## 実装報告(Codex)

### 変更ファイル

- `app.js`
  - `placed` を `{ id, role, note, at }` のエントリ配列へ防御的に normalize し、旧文字列配列を `role: "near"` / 空note / 作成日時で読めるようにした。
  - `state.placedMeta` を追加し、kind `"new"` の保存・読込・外す・根拠note編集で同期するようにした。kind `"fixed"` は既存の固定5件Set運用を維持。
  - `searchShelfWorks` / `confidenceLabel` を純関数として追加し、APIへ公開。
  - kind `"new"` の資料棚を正本DB検索へ分岐。AND検索、ジャンル上位8種チップ、30件上限、インラインの近い／対照・一行理由入力、作品ページリンクを実装。
  - kind `"new"` の左レールと根拠パネルをDB作品解決へ分岐し、未解決ID表示、後方互換の固定ref表示、本人noteの編集保存を追加。
- `index.html`
  - 制作机用資料棚の説明文を固定見本／新規DB検索の両方に合う文言へ更新。
  - `<script src="app.js?v=51">` を `?v=52` へ更新。
- `style.css`
  - DB資料棚の問い文脈、ジャンルチップ、件数、インライン配置フォーム、左レールnote、根拠note textarea の最小スタイルを追加。
- `tests/desk-projects.test.mjs`
  - 既存の `placed` 断言を新しいエントリ配列仕様へ更新。
- `tests/shelf-db.test.mjs`
  - 旧形式placed normalize、role/note/atラウンドトリップ、`searchShelfWorks`、`confidenceLabel` の新規テストを追加。

`stage-*.js` / `stage.html` は本便では変更していない。git commit もしていない。

### テスト結果

- `node --test tests/shelf-db.test.mjs tests/desk-projects.test.mjs tests/visual-brief.test.mjs`
  - PASS（14 tests / 14 pass）
- `node --test tests/*.mjs`
  - PASS（215 tests / 215 pass）

## 検証報告（Claude・2026-08-12）

- 書斎側テスト（desk-projects / visual-brief / shelf-db / db-shelves / storage-migration）
  21/21 pass を自分で実行して確認。差分を全行精読。
- 検証時に `tests/stage-present-fallback.test.mjs` が1件failしたが、これは**並行作業中の
  夜間セッションが編集中の stage-sketch.js に対する既存断言**で、本便（app.jsのみ）とは無関係。
- Claudeによる追加修正3件:
  1. **ジャンルチップ・カードのメタ行・根拠パネルの事実欄を `genre`→`category` へ変更。**
     `genre` は正本の英語スラッグ（例: `traditional_performing_arts_catalog_...`）で読めず、
     `category` が日本語の分類（伝統芸能831・サーカス・アクロバット450…）だったため。
     検索対象フィールドとしての `genre` は残した（害がない）。
  2. **プロジェクトを開くたびに検索語・ジャンル選択をリセット**（openProject）。
     前の問いの検索語が持ち越され、見本の固定5件が全て絞り落とされて空に見える事象を確認したため。
  3. `?v=` を52→54へ（category修正で53、リセット修正で54。他セッションとの取り決めどおり
     直前に現在値を読み直してから+1）。
- ブラウザ実機検証: 「ジャグリング 反復」AND検索（4件）→ 対照＋一行理由つきで置く →
  左レールの対照タグ・noteプレビュー → 根拠パネルの事実/解釈/確信度/未確認/本人の判断の区分表示と
  note編集 → リロード復元 → 「ジャグリング」42件中30件表示 → プロジェクト切替で検索語リセット →
  見本の固定5件表示、すべて確認済み。検証データは削除済み。
- index.html は夜間セッションの変更（stage-front-approx要素）と競合せず共存していることを確認。
