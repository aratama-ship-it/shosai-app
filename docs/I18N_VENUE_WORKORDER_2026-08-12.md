# ワークオーダー: 会場エディタ/lines層の英訳＋i18nカバレッジテスト — 2026-08-12 夜間仕込み

- 状態: **完了（2026-08-12夜。Codex実装・Claude検証済み）。ただし下記「残った既知の穴」あり**
- 担当: Claude（夜間仕込みセッション、MBP）。実装はCodexへ委譲し、Claudeが検証する。
- 背景: 2026-08-12の点検で、会場エディタ・lines層（2026-08-08〜12追加分）のUIがまるごと未訳と判明。
  検出77テキスト＋15属性のうち、静的なもの約80件をTEXTへ追加し、announceの穴6件をSAYで塞ぎ、
  再発防止のカバレッジテストを新設する。

## 1. TEXT への追加（訳語表。この表のとおりに入れる。勝手に変えない）

### 会場エディタ

| 日本語キー | 英訳 |
|---|---|
| この部屋を作る | Build this room |
| 会場を書き出す | Export venue |
| 会場を読み込む | Import venue |
| 近い形から始め、辺は一方向、角は二方向へ動かします。角の長押しで欠き取れます。 | Start from a close shape; drag edges one way and corners two ways. Long-press a corner to notch it. |
| 矩形 | Rectangle |
| L字 | L-shape |
| 台形 | Trapezoid |
| 選択 | Select |
| 柱 | Pillar |
| 什器 | Furniture |
| 扉 | Door |
| 柱・什器・扉は選択されていません | No pillar, furniture, or door selected |
| 動かせる（OFFは動かせない） | Movable (OFF = fixed) |
| 選択したものを削除 | Delete selected |
| 什器の高さ | Furniture height |
| 膝 0.5m | Knee 0.5m |
| 腰 1.0m | Waist 1.0m |
| 背丈 1.7m | Head height 1.7m |
| 天井まで | To ceiling |
| 扉の種類 | Door type |
| 搬入口 | Load-in door |
| 天井 | Ceiling |
| 約3m | About 3m |
| 約4m | About 4m |
| 約6m | About 6m |
| 約8m | About 8m |
| それ以上 | Higher |
| 吊り | Rigging |
| 吊れない | No rigging |
| 一部可 | Partial |
| 吊れる | Riggable |
| 選択モードです。辺をタップすると壁沿いに立ち見の観客を置けます。 | Select mode. Tap an edge to place standing audience along the wall. |
| 観客の帯はまだありません | No audience bands yet |
| 座り（OFFは立ち見） | Seated (OFF = standing) |
| この帯を外す | Remove this band |
| 会場名 | Venue name |
| 出所 | Source |
| 実測 | Measured |
| 図面 | Drawings |
| 写真 | Photos |
| 記憶 | Memory |
| 確度 | Confidence |
| 共有 | Sharing |
| 目安の平面です。搬入経路・荷重・安全距離は判定しません。 | This floor plan is approximate. Load-in routes, loads, and safety distances are not assessed. |
| 会場ライブラリに保存 | Save to venue library |
| 会場データの共有確認 | Sharing check for venue data |
| この会場の資料は外部共有不可の設定です。 | This venue's materials are set to internal-only. |
| 会場データを含めます | Include venue data |
| 会場は含めず書き出します | Export without the venue |
| 中止 | Cancel |

### lines層・探り針

| 日本語キー | 英訳 |
|---|---|
| 会場から導く4本の線 | Four lines derived from the venue |
| 既定はすべて表示 | All shown by default |
| 可動範囲 | Movement range |
| 落下範囲 | Fall zone |
| 死角 | Blind spots |
| 見える限界 | Sight limit |
| 探り針の道具 | Probe prop |
| ジャグリング | Juggling |
| ディアボロ | Diabolo |
| エアリアル | Aerial |
| 到達高さ | Reach height |
| 実測を読み込む | Load measurements |
| 落下範囲は経験則による目安です。安全性は判定しません。 | The fall zone is a rule-of-thumb guide. It does not judge safety. |

### AIパネル・その他の取り残し

| 日本語キー | 英訳 |
|---|---|
| 照明名 | Light name |
| 頼む | Ask |
| 止める | Stop |
| 採る | Adopt |
| 捨てる | Discard |
| 不明 | Unknown |
| 見出し | Heading |
| 説明 | Description |
| 戻る | Back |
| 次へ | Next |
| 直径 | Diameter |

### 属性（swapAttrが引くのも同じTEXT）

| 日本語キー | 英訳 |
|---|---|
| シーンを送る | Advance the scene |
| この場面で何が起きるか | What happens in this scene |
| 例: 3場面目の円座を、2場面目のものに入れ替えて | e.g. Swap scene 3's circle with the one in scene 2 |
| 案内とサポート | Guide & support |
| 部屋の近い形 | Basic room shapes |
| 追加モード | Add mode |
| 柱・什器・扉の設定 | Pillar, furniture, and door settings |
| 天井の高さ | Ceiling height |
| 吊り条件 | Rigging conditions |
| 線の表示 | Line display |
| 会場の平面。4本の線を重ね、探り針をドラッグして落下範囲の目安を確かめます | Venue floor plan. Four lines overlaid; drag the probe to check the approximate fall zone |
| 例: 大広間（仮） | e.g. Grand hall (tentative) |

## 2. SAY への追加（announceの穴6件。広い網より前に置く）

静的3件（完全一致で先頭グループへ）:

- 同梱の見本を読み込めませんでした。ページを再読み込みしてください。 → Could not load the bundled sample. Reload the page.
- 下書きを捨てました。 → Discarded the draft.
- AIの実行を止めました。 → Stopped the AI run.

テンプレート3件（正規表現。末尾の汎用網 `^(.+)を(.+)にしました。$` より前に置く）:

- `^(.+)には映す面がありません。奥も客席です。$` → `$1 has no projection surface. The back is audience too.`
- `^(.+)を組みました（明かり(\d+)個）。個々の明かりはあとから自由に動かせます。$` → `Built $1 ($2 lights). Each light can be moved freely afterwards.`
- `^(.+)（(.+)）を読み込み、ショー一覧へ保存しました。$` → `Loaded $1 ($2) and saved it to the show list.`

## 3. カバレッジテスト新設 `tests/stage-i18n-coverage.test.mjs`

既存 `tests/stage-i18n.test.mjs` には**手を入れない**（TEXT抽出正規表現がコメント文言依存で脆いため、混ぜない）。
読み込みは vm.runInNewContext + 偽window方式。stage-sketch.js を読む場合は `document: { getElementById: () => null }` を足す（既存テスト参照）。

- **テスト1 HTMLテキストノード**: `stage.html` を読み、`<head>`・`<script>`・`<style>`・コメント除去 →
  `split(/<[^>]*>/)` → `trim().replace(/\s+/g," ")`（applyLangと同一の正規化）→ 日本語を含むノードは
  TEXTに登録があること。**allowlist（動的プレースホルダ、これ以外は追加禁止の方向で運用）**:
  `2.0秒` / `考えています 0秒` / `天井まで だいたい+3.0m` / `間口 だいたい12m ・ 奥行 だいたい8m`
- **テスト2 属性**: `placeholder` / `title` / `aria-label` の日本語値がTEXTに登録があること。
  allowlist: `日本語 / English`（言語トグル自体）
- **テスト3 announceのSAYカバレッジ**: `stage-sketch.js` から `announce(...)` の文字列リテラルと
  テンプレートリテラルを抽出し、SAYのいずれかに一致すること。テンプレートの展開規則:
  `${cond ? "A" : "B"}` は両枝に展開／その他の `${...}` は `名前X` と `3` の両候補を試す／
  いずれかの候補が一致すれば合格（someで判定）
- **テスト4 SAYの健全性**: SAYに重複パターンが無いこと・先行パターンによる遮蔽が無いこと
  （後のパターンのサンプル文が前のパターンに食われないこと）

## 4. 版上げ（第3弾の最後にClaudeが行う。Codexはやらない）

## 完了条件

1. `node --test "tests/*.test.mjs"` 全件パス・失敗0（新テスト4件はallowlist以外で落ちない厳密判定）
2. ブラウザ実測（Claude実施）: `stage.html?lang=en` で会場エディタを開き、主要ラベルが英語で出る
3. git commit/pushはしない

## 記録

- 開始: 2026-08-12 夕（このセッション）
- Codex実装: 完了（gpt-5.5）。TEXT約90件＋SAY6件＋カバレッジで見つけた追加穴
  「照明名を出しました。/隠しました。」も追加。tests/stage-i18n-coverage.test.mjs 新設（4件）
- Claude検証: 完了。テスト222件全パス。ブラウザ実測（?lang=en）で会場エディタの静的UIが英語化
  （Build this room / Rectangle / Pillar / Fall zone 等）。コンソールエラー0
- 版上げ: stage-i18n.js v47 / CACHE v58（3ファイル一致確認済み）
- commit/pushは未実施（git履歴分岐の未解決問題のため。本人確認待ち）

## 残った既知の穴（次の候補。今夜は着手しない）

**stage-venue-editor.js の動的文字列（40件超）が未対応。** エディタはi18nの仕組みを一切持たず、
setStatus() の案内文・選択状態表示（「柱・什器・扉は選択されていません」等）・canvas内ラベル
（「探り針」「座/立」等）を日本語直書きで上書きする。静的HTML側は英語化されたため、
英語UIでは「開いた瞬間は英語、操作すると案内が日本語」という混在になる。
対応案: 編集器に局所 tx ヘルパ（lang判定は ?lang= → localStorage "shosai-stage-lang"、
辞書は window.SHOSAI_I18N.text）を足し、TEXT へ40件強を追加、カバレッジテストを
editor の setStatus/fillText リテラルにも拡張する。1〜2時間規模のCodex案件。
