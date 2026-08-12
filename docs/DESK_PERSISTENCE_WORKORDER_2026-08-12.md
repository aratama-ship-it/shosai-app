# 作業指示書: 制作机の永続化＋場面スタディ入力UI（2026-08-12）

発注: Claude（仕様確定済み）／実装: Codex／検証: Claude
対象アプリ: このディレクトリ（shosai-app）の書斎側（index.html + app.js + style.css）。
**stage-*.js / stage.html には一切触れない。git commit もしない。**

## 背景（自己完結のための要約）

制作の書斎アプリの「制作机」（app.js 内 `// ---------- 制作机 ----------` 以降）は現在
読み取り専用で、プロジェクト（問い）はセッション中のメモリにしか存在しない。
設計計画書22節が「中核の制作ループ（Step 2〜8）が未着手」と名指ししている箇所を、
localStorage 永続化＋場面スタディ等の入力UIで実装に戻す。

スクラップブックに完成した永続化パターンがある（app.js 98〜220行付近:
`SCRAPBOOK_STORAGE_KEY` / `normalizeScrapbookClip` / `loadScrapbook` / `persistScrapbook`）。
**このパターン（防御的normalize・try/catchで保存失敗しても操作継続）を踏襲すること。**

## ステージ1: 制作机プロジェクトの永続化

### ストレージ設計

- 新キー: `shosai-desk-projects-v1`（`shosai-` 接頭辞は storage-migration.js の移行対象に
  乗せるため必須）
- 保存形: `{ version: 1, projects: [<project>...] }`
- project レコード:

```js
{
  id: "proj-<Date.now()>-<rand>",   // 既存 clipId() と同型
  title, subtitle,
  question: { previous: string|null, current: string },
  sceneLine: string|null,
  sceneLineHistory: [{ text, at }],   // 書き直すたび旧文を追記（設計書Step5.5「版として残る」）
  constraints: [{ label: string, hard: boolean }],
  scene: { audience, entry, exit,
           relations: [[string,string]...],   // 人物/物/光/音/背景 の5行固定
           removed, undecided, next } | null,
  transformation: { fromLabel, rows: [[string,string]...] } | null,  // 5行固定（下記）
  origin: { recipe, sources, bookSources, apparatusSources, inspiration } | null,
  placed: [refId...],            // state.placed(Set) を配列で保存
  decisions: { [visualId]: { verdict, reason } },
  createdAt, updatedAt           // ISO文字列
}
```

- `normalizeDeskProject(raw)` を作り、読み込み時に型崩れを全て弾く／補う
  （normalizeScrapbookClip と同水準の防御）。
- `persistDeskProjects()` は try/catch。保存不可でもセッション操作は続行。

### 永続化の対象と対象外

- **対象**: kind "new" のプロジェクト全て。生成経路は3つ:
  `buildNewProject()`（机の新しい問いフォーム）、スクラップブック「制作机で続ける」
  （app.js 1209行付近）、装置カード「この問いで制作机を始める」（2456行付近）。
  → `buildNewProject` で id/createdAt を付与し、生成時に即保存する。
- **対象外**: kind "fixed" の見本プロジェクト（`SHOSAI.project`）。従来どおり
  セッション限りの読み取り見本。保存も編集UIも付けない。

### 保存タイミング

- プロジェクト生成時／編集保存時／資料を置く・外す（`state.placed` 変更）／
  判断記録（`state.decisions` 変更）のたびに、該当projectへ書き戻して persist。
  いずれも `updatedAt` を更新。
- `openProject` は placed(Set)・decisions を保存レコードから復元する。

### 机（ホーム）に「進行中の問い」一覧

- 位置: `#resume-card`（見本カード）の**上**に新セクション「進行中の問い」。
- 各カード: title、場面の一行（無ければ question.current）、更新日（「8月12日」形式）。
  クリックで openProject。カード内に「削除」ボタン（`confirm()` で確認してから削除・persist）。
- 並び: updatedAt 降順。0件のときはセクションごと非表示。
- 既存 `#resume-card` には「見本」と分かる小さなラベルを追加
  （例: カード右上に `<span class="k">見本</span>` 相当。既存チップ様式を流用）。
- **見た目は既存の紙カード様式（.paper-card）を流用**し、新規の装飾体系を持ち込まない。

### storage-migration.js の確認

- `isManagedKey` の接頭辞走査が `shosai-desk-projects-v1` を拾うことを確認。
  拾わない実装なら明示的にキー一覧へ追加する。テストで担保（後述）。

## ステージ2: 紙面（sheet）の入力UI

`renderSheet` の紙面に編集モードを付ける。**kind "new" のプロジェクトのみ。**

### 操作モデル

- 紙面右上に「書き込む」ボタン → 紙面全体が編集モードに切り替わる（モーダル禁止。
  その場で同じ紙の上に書く感覚を保つ）。
- 編集モード下部に「保存」「取り消す」。保存で normalize→persist→表示モードへ。
  取り消すは変更を捨てて表示モードへ。
- 表示モードの見た目・構造は現状を維持（既存の .study-section / .transform-memo /
  .constraints の様式のまま）。

### 編集できる項目

1. **場面の一行**: 1行テキスト入力。保存時に旧文と異なれば
   `sceneLineHistory` に `{ text: 旧文, at }` を追記。
2. **問い**: `question.current` のテキスト入力。変更して保存すると
   旧 current が `question.previous` へ移る（既存の「問いの変化」表示がそのまま生きる）。
3. **制約ピン**: 行エディタ（label入力 + 「固定」チェック + 削除ボタン、＋追加ボタン）。
   表示モードは既存チップ描画。0件時の文言は
   「制約ピンはまだありません — 書き込むから追加」に変更（「Phase 1で編集」を卒業）。
4. **場面スタディ**（設計書Step 5の7項目）:
   - この場面が観客に起こすこと（textarea）
   - 入口／出口（textarea 2つ）
   - 人物・物・光・音・背景の関係（5行固定。各ラベル + textarea 1行ずつ。
     空行は表示モードで出さない）
   - 意図的に外したもの／未決定事項／次に試すこと（textarea 3つ）
   - 全項目空なら scene = null（表示モードは現行プレースホルダ文。
     文中の「（Phase 0では入力・保存は未実装）」は削除し
     「右上の「書き込む」から場面スタディを書けます」へ差し替え）。
5. **変換メモ**（設計書Step 4の構造を固定行で）:
   - 「参考にした構造」ラベル（fromLabel）: 1行入力
   - 5行固定: 元の構造／残す機能／変更する条件／避ける表面／生まれた案（各textarea）
   - 全て空なら transformation = null（表示モードでセクション非表示）。
   - rows の最終行「生まれた案」は既存表示の `.born` 強調が付く並びを維持する。

### デザイン制約（重要）

- 新しい色・角丸・影・ピル型などの装飾体系を持ち込まない。style.css の既存変数と
  既存フォーム様式（.new-question の input 系）を流用し、「同じ紙に鉛筆で書き足す」
  トーンに揃える。編集モードで紙面の背景・余白・見出し階層を変えない。
- ラベル・ボタン文言はすべて日本語で上記のとおり。絵文字・英語UIを足さない。

## 共通の完了条件

- index.html の `<script src="app.js?v=...">` の v を上げる（キャッシュ対策）。
- `node --test tests/desk-projects.test.mjs` を新設して通す。最低限:
  - normalizeDeskProject の防御（壊れたJSON・型違い・欠損フィールド）
  - 保存→読込のラウンドトリップ（placed配列⇄Set、decisions）
  - 問い編集で current→previous に移ること
  - 全空の scene / transformation が null になること
  - storage-migration が `shosai-desk-projects-v1` を管理対象と判定すること
  - 既存テストの様式（node:test + vm.runInNewContext。tests/db-shelves.test.mjs 参照）に従う
- 既存テスト `node --test tests/` が全て通ること（stage系含め壊さない）。
- 実装完了後、変更ファイル一覧と各テスト結果をこのファイルの末尾に
  「## 実装報告（Codex）」として追記する。

## 実装報告（Codex）

### 変更ファイル

- `app.js`
  - `shosai-desk-projects-v1` の normalize / load / persist / sync を追加。
  - kind `"new"` の制作机プロジェクト生成時保存、`placed` / `decisions` の保存同期、保存レコードからの復元を追加。
  - 机ホームへ「進行中の問い」一覧と削除操作を追加。
  - kind `"new"` の紙面に「書き込む」編集モードを追加し、場面の一行、問い、制約ピン、場面スタディ、変換メモを保存できるようにした。
- `style.css`
  - 進行中の問いカードと紙面編集フォームの最小スタイルを追加。既存の紙カード、紙面、フォーム変数を流用。
- `index.html`
  - `<script src="app.js?v=49">` へ更新。
- `tests/desk-projects.test.mjs`
  - 制作机プロジェクト永続化の新規テストを追加。
- `docs/DESK_PERSISTENCE_WORKORDER_2026-08-12.md`
  - 本実装報告を追記。

`storage-migration.js` は `isManagedKey()` の `key.startsWith("shosai")` で `shosai-desk-projects-v1` を拾うため変更なし。新規テストで管理対象であることを確認済み。

### テスト結果

- `node --test tests/desk-projects.test.mjs`
  - PASS（5 tests / 5 pass）
- `node --test tests/*.mjs`
  - PASS（201 tests / 201 pass）
- `node --test tests/`
  - Node.js v22.13.0 が `tests/` ディレクトリをテスト探索せずモジュールとして解決し、`MODULE_NOT_FOUND` で実行前に失敗。全テスト対象は上記 `tests/*.mjs` で確認済み。

## 検証報告（Claude・2026-08-12）

Codexの実装をClaudeが検証し、以下を確認・修正した。

- `node --test tests/*.mjs` を自分で実行し **201/201 pass** を確認（Codex報告と一致）。
- スナップショット（`claude-files-archives/shosai-snapshots/2026-08-12_desk-persistence_before/`）
  との差分を精読。仕様との乖離1件を発見し修正:
  **表示モードの「参考にした構造」（変換メモ）が場面スタディ末尾に移動していた**のを、
  設計書Step 5の項目順どおり「関係」と「意図的に外したもの」の間へ戻した（修正後も201/201 pass）。
- 追加変更（Claude）: 紙面JSON書き出しの `conversionGuide` を
  `shosai-app/mcp-server/PLAYBOOK.md`（段階0.5で新設した変換規則の正本）へ向け直し、
  `?v=` を49→50に更新。
- ブラウザ実機検証（localhost）: 新しい問いの作成→即保存／「書き込む」→7項目＋変換メモ＋
  制約ピンの編集・保存／リロード後の「進行中の問い」一覧表示と復元／問い編集での
  current→previous移行／削除のconfirmキャンセル・実行／0件時のセクション非表示、
  すべて動作確認済み。編集UIの見た目も既存の紙面様式（下線入力・既存変数）に適合。
