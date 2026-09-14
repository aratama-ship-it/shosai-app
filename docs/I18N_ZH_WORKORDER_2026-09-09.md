# 発注書: 舞台スケッチ 中国語UI（簡体・繁体）の実装 — 2026-09-09

- 状態: **R1〜R5 完了（2026-09-09 23:30）。未コミット・未配信。** 配信可否は本人判断（§0-d の保留3鍵、ネイティブ確認、体験版の再ビルドを含む）。ラウンドの経過は §7 末尾。 §0 の3点は本人回答済み: a=③両方／b=②英名 "Stage Sketch"／c=`gpt-5.6-sol`＋`medium`（「よしなに」＝Claude 選定。別案件で -m 明示なら動作した実績があるため）。
- 担当: Claude（Fable 5.1）が発注書・検証・統合。実装は Codex（モデルは §0-c で承認されたもの）。
- 正本: この文書。準備物は `i18n-prep/`（README.md／GLOSSARY.md／STYLE-zh-Hans.md／STYLE-zh-Hant.md／
  `stage-i18n.zh-Hans.draft.js`／`stage-i18n.zh-Hant.draft.js`／`stage-prompt-i18n.zh-Hant.draft.js`）。
  **訳語はこの発注書でもCodexでも新しく決めない。** 無い訳は英語のまま出し、`i18n-prep/NEEDS_REVIEW.md` に未訳として記録する。
- 関連: `docs/system-audit-2026-09-09/WO_B3_i18n_ternaries.md`（前提作業）、`docs/I18N_VENUE_WORKORDER_2026-08-12.md`（前回のi18n発注の書式）。

---

## 0. 先に本人に決めてもらうこと（回答が出るまで R2 以降は始めない）

| # | 問い | 選択肢 | 推奨と理由 |
|---|---|---|---|
| a | 対象の中国語 | ① 繁体（台湾）のみ ② 簡体（大陸）のみ ③ 両方 | **③ 両方。** 辞書は2本とも TEXT 989鍵・MAPS 20群・SAY 210本が原本と一致済み（2026-08-28 機械検証）。増える手数は「読み込むファイル1本」と「言語選択の項目1つ」だけ。片方だけ出すと、台湾と大陸で UI 動詞（儲存/保存、匯出/导出）も劇場語（左舞台/上場門）も別系統なので、もう片方の利用者には誤訳に見える |
| b | 製品名の中国語表記 | ① 舞台速寫／舞台速写 ② Stage Sketch（英名のまま） ③ 併記 | STYLE 両版は「舞台速寫（英名併記可）」で保留になっている。**ここは本人のトーン判断。** 決まるまで見出し・タイトル・About は英名 "Stage Sketch" で仮置きし、NEEDS_REVIEW に残す |
| c | Codex のモデルと effort | 例: `gpt-5.6-sol` ＋ `medium` | 手数が主で判断は少ない作業。`~/.codex/config.toml` の既定は `gpt-6-astra`/`xhigh` だが、別案件で 400 即死（exit 0）を起こしているので **-m で必ず明示**。承認された ID をそのまま §7 のコマンドへ入れる |

### 0-d. R1 で出た保留（本人判断・R2 を止めない）

| 鍵 | 既存 TEXT の英語 | 出現箇所の英語 | 推奨 |
|---|---|---|---|
| `秒` | `sec` | `s`（`0.6s`・`12s` の単位） | **`s` に統一**（既存 `sec` の使用箇所も `s` へ。単位は短いほうが UI で崩れない） |
| `不明` | `Unknown` | `unknown`（尺が不明のとき括弧内） | **`Unknown` に統一**（括弧内でも大文字始まりで違和感なし） |
| `まだありません。言葉を入れて〈映す〉を押してください。` | `Nothing yet. Type a word and press Project.` | `No screen text yet. …`（映す言葉の欄） | 日本語が同文で文脈が2つある。**日本語側を分ける**なら「映す言葉はまだありません。…」へ変える必要があり、日本語UIのコピー変更＝本人判断。変えないなら既存英語に統一 |

---

## 1. 事実（2026-09-09 実測）

- `stage-sketch.js` の言語は `let lang = "ja"`（2879行）／`isEn()`（2880行）の二値。`isEn()` の出現 **216件**。
  うち文字列リテラル同士の三項演算子 **154件**＋式を含む 9件は WO-B3 の対象（表: `docs/system-audit-2026-09-09/B3_isEn_ternary_sites.md`）。
  残り約50件は分岐・書式（`"s"`/`"秒"` 等）・`applyLang`/`setLang`/`announce` の内部。
- 辞書の入口は3つ: `tx(ja)`（2882行）／`tm(group,id,ja)`（2884行）／`announce()` 内の `I18N.say`（5847行）。
  `applyLang()`（21231行）が DOM のテキスト節と placeholder/title/aria-label を差し替え、`document.documentElement.lang` を `"en"|"ja"` に設定。
- 初期言語 `resolveInitialStageLanguage()`（77行）: `?lang=` → localStorage `shosai-stage-lang` → `navigator.language`（ja始まり→ja、他→en）。
  `window.SHOSAI_STAGE_PHONE_VIEWER_MODEL.resolveInitialLanguage` として公開済み（テスト可）。
- 生成名 `sceneTitle(n)`（2909行）と `untitledShow()` は**作成時の言語で焼き付く**。ドラフトの `GENERATED` 節に訳がある（`場景 {n}`／`未命名演出`）。
- 言語切替UI: 設定モーダルの `#stage-lang` ボタン（index.html 1892行、EN⇄日本語のトグル）と、
  スマホ閲覧機の `phoneUi.langJa`/`phoneUi.langEn`（stage-sketch.js 11120行付近）。説明文「画面の文字を日本語と英語で切り替えます。」（1890行）。
- `stage-set-builder.js` は独自の `WORDS` 辞書＋`isEn()` 5件。`stage-public.js`（体験版）は `document.documentElement.lang === "en"` で7件分岐（zh では日本語側に落ちる）。
- `stage-prompt-i18n.js`（ピッチ生成条件）は既に ja/en/fr/zh/ko。zh は簡体。繁体ブロックと「地排光→流动光」修正提案が `i18n-prep/stage-prompt-i18n.zh-Hant.draft.js` にある。
- 版: `index.html` に `stage-sketch.js?v=320`／`stage-i18n.js?v=99`／`stage-prompt-i18n.js?v=2`／`style.css?v=230`。`stage-sw.js` は `CACHE_NAME = "stage-sketch-pwa-v201"`、`APP_SHELL` に上記を列挙。`stage.html` は `python3 build_stage.py` の生成物。
- テスト: `node tests/index.mjs`（89ファイル）。i18n 関連は `stage-i18n.test.mjs`／`stage-i18n-coverage.test.mjs`／`stage-samples-i18n.test.mjs`／`stage-about.test.mjs`。
- **git は未コミット30ファイル**（`stage-sketch.js`・`stage-i18n.js`・`stage-sw.js`・`index.html` を含む）。別セッションの作業が乗っている。`git add -A` 禁止。編集前に読み直す。

---

## 2. 段取り（1ラウンド＝1回の `codex exec`。間に Claude の検証を挟む）

| R | 内容 | 変更ファイル | 動作 |
|---|---|---|---|
| R1 | WO-B3: 三項演算子 154＋9件 → `tx()`/`SAY` | stage-sketch.js, stage-set-builder.js, stage-i18n.js, tests | **英語UIの見え方は不変** |
| R2 | 辞書のパック化と `lang` の値域拡張（英語だけで動かす） | stage-sketch.js, stage-i18n.js, stage-set-builder.js, stage-public.js, tests | **日英の見え方は不変**。`?lang=zh-Hant` を付けても英語に落ちる |
| R3 | 中国語パック投入・言語選択UI・フォント・`<html lang>`・ピッチ条件の繁体追加 | 新規 `stage-i18n.zh-Hans.js`／`stage-i18n.zh-Hant.js`、index.html、style.css、stage-prompt-i18n.js、tests | 中国語UIが出る |
| R4 | 版上げ3点セット・`build_stage.py`・全テスト・独立レビュー（read-only） | index.html, stage-sw.js, stage.html | 配信できる状態 |

R1 は WO-B3 の文書をそのまま渡す。R2〜R4 の指示は §7。**R1 と R2 を1回にまとめない**（差分が読めなくなる）。

---

## 3. 確定仕様

### 3.1 辞書のパック化（R2）

1. 各言語を **1ファイル1パック**にする。既存 `stage-i18n.js` は英語パックとして残し、末尾の公開を
   `window.SHOSAI_I18N_PACKS = window.SHOSAI_I18N_PACKS || {}; window.SHOSAI_I18N_PACKS.en = { text: TEXT, maps: MAPS, say: SAY, generated: { sceneTitle: "Scene {n}", untitledShow: "Untitled show" } };`
   に拡張する。**`window.SHOSAI_I18N` はそのまま残す**（tests/stage-i18n.test.mjs・stage-about.test.mjs・mcp-server が読む）。
2. `stage-sketch.js`:
   - `lang` の値域を `"ja" | "en" | "zh-Hans" | "zh-Hant"`（将来 `fr`）。**正規化関数 `normalizeStageLanguage(code)` を1つ**置き、
     `?lang=`・localStorage・navigator の3経路すべてを通す:
     `ja*→ja`／`zh-tw|zh-hant|zh-hk|zh-mo→zh-Hant`／`zh|zh-cn|zh-hans|zh-sg→zh-Hans`／`en*→en`／その他→en。
     旧保存値 `"en"`/`"ja"` はそのまま有効。**読み込まれていないパックの言語**（R2 時点の zh）は `en` へ落とす。
   - `const pack = () => (lang === "ja" ? null : (window.SHOSAI_I18N_PACKS || {})[lang] || null);`
     `tx = (ja) => (pack() && pack().text[ja]) || ja;` `tm` と `announce()` の SAY 参照も `pack()` 経由に。
     `applyLang()` の `I18N.text[key]` 参照も `pack()`。`isEn()` は残してよいが**新規に増やさない**。
   - `sceneTitle(n)` / `untitledShow()` は `pack().generated` を表引き（`{n}` を置換）。ja は現行文字列。
   - `document.documentElement.lang = lang`（BCP47 の `zh-Hans`/`zh-Hant` をそのまま入れる）。
   - `resolveInitialStageLanguage` の公開名は変えない。
   - **R1 の成果物への対応（2026-09-09 追記）**: Codex が導入した `sx(message, englishFallback)`（62箇所・SAY で訳し、英語の直書きを保険にしている）と
     `languageValue(() => en, () => ja)`（21箇所。見本データの en/ja 二言語フィールドと、保留3鍵の7箇所）を次のように扱う:
     `sx` は `pack().say` を見る。`englishFallback` は `lang === "en"` のときだけ使い、他言語では SAY の結果（無ければ日本語）を返す。
     `languageValue` は「ja なら ja()、en なら en()、それ以外は pack があれば en()、無ければ ja()」にする（見本データは日英しか持たないため英語へ落とす）。
     保留3鍵（不明／秒／まだありません…）は本人決定後に `tx()` へ寄せる。
3. `stage-set-builder.js`: `WORDS`（38語）は **TEXT へ混ぜない**（`種類`=Shape↔Kind、`寸法`=Dimensions↔Size、`箱`、`球` が既存 TEXT と衝突するため。R2 で Codex が検出）。en パックの **MAPS 群 `setBuilder`**（id＝日本語そのもの）として収録し、`t(value)` は `tm("setBuilder", value, value)` 相当にする。`isEn()` 5件もこれで消える。
4. `stage-public.js`（体験版）: `lang === "en"` の分岐は **現存する全件**（R2 時点で14件。発注書の「7件」は古い実測）を「`ja` なら日本語、それ以外はパック→英語」に。**日本語へは落とさない。**
4b. **取り落としの順序（全言語共通・R2 で確定）**: `ja` は常に日本語原文。それ以外の言語は「その言語のパック → en パック → 日本語原文」の順で引く（TEXT・MAPS・SAY・generated すべて）。R1 で増えた 58鍵・63文型や Set Builder の38語は中国語ドラフトに無いので、この順序で**英語に落ちる**。R3 の「かな漏れ0件」はこの前提で判定する。
5. R2 完了時点で `stage.html?lang=en` の `document.body.innerText` が R1 完了時点と**完全一致**、`?lang=ja` も同様。

### 3.2 中国語パックの投入（R3）

1. `i18n-prep/stage-i18n.zh-Hans.draft.js` → `stage-i18n.zh-Hans.js`、`…zh-Hant.draft.js` → `stage-i18n.zh-Hant.js` へ**コピー**（ドラフトは残す。移動しない）。
   変更点はグローバル名だけ: `window.SHOSAI_I18N_DRAFT_ZH_HANT = {...}` → `window.SHOSAI_I18N_PACKS["zh-Hant"] = {...}`。
   `needsReview` 配列はパックに残してよい（UIは読まない）。**訳文は一字も変えない。**
2. `index.html` の `stage-i18n.js` の直後に2本を `?v=1` で読み込む。`stage-sw.js` の `APP_SHELL` にも足す（R4 で版と一緒に）。
3. 言語選択UI:
   - 設定モーダル `#stage-lang` のトグルボタン → `<select id="stage-lang">`。選択肢は**各言語の自称**で固定表記
     （`日本語` / `English` / `中文（简体）` / `中文（繁體）`）。この4語は翻訳対象外（`data-no-i18n`）。
   - 説明文「画面の文字を日本語と英語で切り替えます。」は**鍵を変えない**（両ドラフトに訳がある）。文言を直したくなったら本人判断へ回す。
   - スマホ閲覧機の `langJa`/`langEn` 2ボタン → パック一覧から生成した4ボタン。`aria-pressed` は現在言語だけ true。
   - 言語切替は**設定の錠がかかっていても届く場所に残す**（dev-preferences 2026-09-04）。
4. フォント: `style.css` に `:lang(zh-Hans)`／`:lang(zh-Hant)` で `--sans` を
   `"PingFang SC" / "PingFang TC", "Hiragino Sans", "Microsoft YaHei" / "Microsoft JhengHei", "Noto Sans SC" / "Noto Sans TC", sans-serif` に差し替える。
   `--serif` も同様に `"Songti SC"/"Songti TC", "Noto Serif SC"/"Noto Serif TC"`。日英の見え方は変えない。
5. `stage-prompt-i18n.js`: `i18n-prep/stage-prompt-i18n.zh-Hant.draft.js` の指示どおり `zh-Hant` ブロックを各表へ追加し、`LANGS` を
   `{ code: "zh", label: "中文（简体）" }`＋`{ code: "zh-Hant", label: "中文（繁體）" }` に。既存 zh の `LIGHT_KIND.floor`「地排光（地面光）」→「流动光（地面侧光）」、
   `LIGHT_NOTE.floor` →「流动灯从地面向上打在身体上」に修正し、`NEEDS_REVIEW` の zh `lightKind.floor` を外す。fr の porteuse 提案は**触らない**（任意扱い）。
6. 製品名（§0-b）: **§0-b の回答が出てから R3 を始める**（辞書を二度直さないため）。回答が①ならドラフトの `舞台速寫`/`舞台速写` をそのまま使う。②なら該当鍵の値を "Stage Sketch" に置き換え、置き換えた鍵を `i18n-prep/NEEDS_REVIEW.md` に列挙する。③なら「舞台速寫 Stage Sketch」の形（順序・区切りは本人指定）。

### 3.3 版上げ・ビルド（R4）

- `index.html`: `stage-sketch.js?v=321`、`stage-i18n.js?v=100`、`stage-prompt-i18n.js?v=3`、`stage-set-builder.js?v=2`、`stage-public.js` は現行値+1、`style.css?v=231`、新規2本は `?v=1`。
- `stage-sw.js`: `CACHE_NAME` を `v202`、`APP_SHELL` の該当行を同じ値に、新規2本を追加。
- `python3 build_stage.py` を実行し `--check` が緑。`stage.html` は手で触らない。
- **他の発注書（WO-A2 SW版ずれ等）と同じ日に出す場合は、版上げは最後の1回にまとめる。**

---

## 4. 未決事項（Codex は実装せず「提案」として報告に書く）

- パック2本（各約100KB）を静的 `<script>` で常時読むか、言語選択時に遅延読込するか。R3 は**静的**で実装し、初回ロードの増分（KB・ms）を測って報告。
- `stage-public.js` の体験版タイトル「体験版」の中国語（ドラフトに鍵があるか確認。無ければ英語 "Preview" のまま＋NEEDS_REVIEW）。
- 使いかたの冊子（`manual/`）は日英のみ。zh UI で「使い方をさがす」が日英の冊子に当たる旨をどこで示すか（案を1〜2行）。
- ドラフト内 `NEEDS_REVIEW` 12件×2言語のネイティブ確認の進め方（実装の完了条件には**含めない**。公開判断の条件）。

---

## 5. 制約

- 最初に `"/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md"` を読む。
- 編集前に対象ファイルを読み直す。未コミットの他人の変更を巻き戻さない。`git add -A` 禁止。コミットは Claude 側で行う（Codex はコミットしない）。
- 削除・移動・公開・外部送信をしない。ドラフト（`i18n-prep/`）は読むだけ。バックアップは `<name>_backup_2026-09-XX-before-i18n-packs.js` の慣例で。
- 訳語を新しく決めない。GLOSSARY の罠（上手＝下場門側／台湾の上舞台＝奥／転がし＝流動光）を崩す変更が必要に見えたら**止めて報告**。
- 文字列検査はソースの正規表現ではなく**評価後の値**で行う（dev-preferences 2026-09-05）。
- `stage.html` は生成物。`index.html` を直す。

---

## 6. 完了条件（各ラウンド共通＝`node tests/index.mjs` 全件緑。以下は追加分）

R1: WO-B3 のテスト節どおり（`isEn() ?` 0件・英語 innerText 差分なし）。

R2:
- `tests/stage-i18n.test.mjs` に追加: `normalizeStageLanguage` の表（上記11入力→4出力）、旧保存値 `"en"`/`"ja"` の互換、未読込パックの言語が `en` に落ちること。
- ローカルHTTPで `stage.html?lang=ja` と `?lang=en` の `document.body.innerText` が R1 完了時と一致（差分があれば全件列挙）。

R3:
- `tests/stage-i18n.test.mjs` に追加（パックごとに走らせる）: **（21:32 読み替え。R1 で en 側が 1062鍵／21群／280文型に増えたため「集合一致」は不成立）** ドラフトの TEXT 989鍵・MAPS 20群 256 id・SAY 210文型が**欠落・改変なく**パックに登録されている／zh の鍵・群・id・SAY source が **en の集合の部分集合**（zh にだけある鍵が無い）／en にあって zh に無い鍵（R1 追加分・setBuilder 群）が `現在言語 → en → ja` の順で**英語に落ちる**ことを評価後の値で確認／重複鍵なし／
  zh-Hant の値に `“ ”` が無く zh-Hans の値に `「」` が無い（引用符の系統違い）／同一 MAPS 群内で異なる id が同じ訳に潰れていない（訳語の衝突）。
- `tests/stage-i18n-coverage.test.mjs` を言語横断に: 静的日本語がすべてのパックで引けること。
- ローカルHTTP＋ブラウザで `?lang=zh-Hant`／`?lang=zh-Hans` を開き、主要パネル（道具列・設定・シーン一覧・出るもの・明かり・書き出し）を開いた状態で
  `document.body.innerText` に**かな（`[\p{Script=Hiragana}\p{Script=Katakana}]`・中黒「・」は中国語の間隔號として正当なので対象外）が0件**（`data-no-i18n` と利用者データを除く）。漢字は判別できないので、かなを漏れの検出器にする。
- `document.documentElement.lang` が `zh-Hant`/`zh-Hans` になること。`?lang=en`/`ja` の innerText が R2 と一致。
- スクリーンショット（zh-Hant・zh-Hans の設定モーダルと正面図）を `docs/i18n-zh-2026-09/` に保存して報告に貼る。

R4:
- 版上げ3点の整合（`index.html` の `?v=` と `APP_SHELL` が同値、`CACHE_NAME` が上がっている）。`python3 build_stage.py --check` 緑。
- 独立レビュー（別セッション・read-only）: §7 R4b。

---

## 7. Codex とのやりとり（そのまま使う文）

### 7.0 起動の作法（このMac・codex-cli 0.153.4 で構文確認済み）

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app" && \
nohup codex exec --skip-git-repo-check --sandbox workspace-write \
  -m "gpt-5.6-sol" -c model_reasoning_effort=medium \
  -C "$PWD" "$(cat docs/i18n-zh-rounds/R2.txt)" </dev/null \
  > "docs/i18n-zh-rounds/R2.log" 2>&1 &
echo "pid=$!"
```

- `&` で返る exit 0 は起動の成功にすぎない。**`pgrep -fl "codex exec"` で本体の生死を見る。** ログが短いだけで失敗と決めて再実行しない（多重起動になる）。
- 終了後は `tail -40 docs/i18n-zh-rounds/R2.log` と `git status --short`、`git diff --stat` を読んでから次へ。
- レビュー（R4b）は `--sandbox read-only`。
- 各ラウンドの指示文は `docs/i18n-zh-rounds/R*.txt` に置く（本書 §7.1〜7.4 の本文を1ファイルずつ。作成は §0 の回答後に Claude が行う）。

### 7.1 R1（WO-B3）— Codex への指示

```text
最初に "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md" を読むこと。
次に "…/show-creative-ideas/shosai-app/docs/system-audit-2026-09-09/WO_B3_i18n_ternaries.md" を読み、その仕様・テスト・制約のとおりに実装する。
補足（本発注固有）:
  - 目的は後続の中国語UI（docs/I18N_ZH_WORKORDER_2026-09-09.md）の土台。isEn() の値域拡張はしない。
  - 同じ鍵で英語が食い違う場合は置換せず、鍵・行番号・両方の英語を表にして報告する。
  - コミットしない。git add -A しない。編集前に読み直す。
完了報告: 変更ファイル一覧／置換件数（154+9 のうち何件）／保留件数と表／node tests/index.mjs の結果／
  stage.html?lang=en の innerText 差分（空であること）／追加した TEXT 鍵の一覧（i18n-prep/NEEDS_REVIEW.md に追記済みであること）。
```

**Claude が見るもの**: `grep -c 'isEn() *?' stage-sketch.js` が 0／保留表の中身（英語の食い違いは本人判断へ）／NEEDS_REVIEW.md の追記／テスト緑。
**R5 完了（23:30）・Claude 再検証（23:35）**: レビュー採用分をすべて反映。858/858 緑・`build_stage.py --check` 0・`isEn()` 二択 0・日英 innerText 基準一致・zh-Hant で見本ショーが英語データで生成・かな漏れ 0（Codex 実測）。実値評価テスト用に `window.SHOSAI_STAGE_I18N_MODEL` を最小公開。
  **教訓（発注書の書き方）**: 完了条件に「鍵集合が一致」のような**前ラウンドで動く数を固定で書かない**（R1 で en 側が増え、R3 の条件が自壊した）。数は「ドラフト全件が欠落なく」「部分集合」「取り落としが効く」のような関係で書く。
**R4 完了（22:45）**: 版上げ（style 231／i18n 100／prompt-i18n 3／set-builder 2／sketch 321／zh 2本 v1）・CACHE_NAME v202・APP_SHELL 同値・`build_stage.py --check` 0 を Claude 実測。残った赤1件＝`worker.js` のゲスト許可リストに zh パック2本が無く 403 → Claude が2行追加（バックアップ `worker_backup_2026-09-09-before-zh-allowlist.js`）。
  **体験版（public-dist）は今回の対象外**: `stage-public.js` は R2 で変わったが `?v=2` は `build_public.py` にしかない。配信時に `python3 build_public.py` の再ビルドと版上げが必要（既知の「public-dist が古い」件と一緒に）。zh パックを public-dist に含めない場合、体験版の中国語は英語へ落ちる（`normalizeStageLanguage` がパック未読込を en に落とすため安全）。
**R3e 完了（22:37）・Claude 検証済み（22:40）**: 857/857 緑。ドラフトとパックの差分は両言語とも20行（グローバル公開行＋製品名 Stage Sketch のみ）。4言語セレクト・パック2本の読込・`:lang(zh-*)` フォント・ピッチ条件 zh-Hant・venueNote ガードを実測で確認。かな漏れ 0件（Codex 実測）。日英 innerText 基準一致。ロード増分 204KiB／+0.8ms（ローカル）。R4 起動。
**R3d 経過（22:19）**: 856/856 緑・日英 innerText 基準一致・スクリーンショット4枚・ロード増分 204KiB/+1.8ms 取得。かな漏れ検査で12件＝①本体直書きの日本語2箇所（会場寸法 18045行・書き出し 21975行）②ドラフト訳文に正当に含まれる中黒「・」（U+30FB は [぀-ヿ] に入る）。→ 検査式を `[\p{Script=Hiragana}\p{Script=Katakana}]` に変更し、直書き2箇所は既存英語へ落とす狭い修正を許可（R3e）。中国語訳は作らない。
**R3c 経過（21:54）**: 例外2件は許可配列で実装・記録済み、スマホ4言語ボタンのテスト更新済み（854/856）。新たに `MAPS.venueNote` の5 id（proscenium/thrust/arena/outdoor/blackbox）が**英語側では 2026-09-04 の本人指示で削除済み**なのにドラフトに残ると判明。→ 許可リストに追加し、`stage-sketch.js` に「日本語の説明が空なら他言語の説明も出さない」ガードを入れる（R3d）。削除済みUIを中国語だけ復活させないため。
**R3b 経過（21:46）**: Codex が2件の不整合で停止。①`整列（一列・円・V字）` はドラフトにだけ残る**孤児鍵**（アプリ本体からは消えた文言。2026-08-12 バックアップにのみ存在）→ zh 固有鍵の唯一の例外として許容し NEEDS_REVIEW に記録。②zh-Hans の `dimBy.pole.h`／`dimBy.cane.h` が同訳 `杆高`（zh-Hant は 竿高／桿高 で区別）→ 訳文は変えず、意図的同訳の例外として許容しネイティブ確認へ。R3c（`R3c.txt`）で完走。
**R3 経過（21:32）**: Codex が §6 R3 の「集合一致」と §3.2 の「ドラフト無変更」の矛盾を検出して停止（正しい停止）。§6 R3 を上のとおり読み替え、R3b（`R3b.txt`）で再開。
**R2 経過（21:06）**: Codex が Set Builder の WORDS 衝突4件と stage-public.js の件数差（7→14）を検出して停止（正しい停止）。§3.1-3／4／4b を上のとおり確定し R2b（`R2b.txt`）で再開。
**R1 実績（2026-09-09 20:40 完了）**: 175件除去・842テスト緑・英語 innerText 一致（SHA-256 同値）。未達2点（言語コードを TEXT 鍵にした10箇所・SAY追加分の未記録）を R1b（`docs/i18n-zh-rounds/R1b.txt`）で差し戻し。保留3鍵は §0 の下に本人判断として追記。
**差し戻しの型**: 「R1 の <項目> が未達。<実測値>。<該当行>。この1点だけ直して同じ報告形式で返す。他は触らない。」

### 7.2 R2（パック化）— Codex への指示

```text
最初に "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md" を読むこと。
対象: "…/show-creative-ideas/shosai-app/" の stage-sketch.js / stage-i18n.js / stage-set-builder.js / stage-public.js / tests/。
目的: 実装。docs/I18N_ZH_WORKORDER_2026-09-09.md の §3.1 を、§5 の制約で、§6 R2 の完了条件まで。
確定仕様: §3.1 の1〜5。日英の見え方を一切変えない（innerText 一致が条件）。window.SHOSAI_I18N は残す。
未決事項: なし（判断が要る箇所が出たら止めて報告）。
制約: §5 のとおり。isEn() を新規に増やさない。stage.html を手で触らない。
完了報告: 変更ファイル／normalizeStageLanguage の表と対応テスト／innerText 一致の実測手順と結果／node tests/index.mjs の結果／触らなかった isEn() の残件数と内訳（分岐・書式）。
```

**Claude が見るもの**: `tx`/`tm`/`announce`/`applyLang` が `pack()` を通っているか（`grep -n "pack()"`）／`stage-public.js` の7件／innerText 一致の証拠／旧保存値の互換テスト。

### 7.3 R3（中国語パック・UI）— Codex への指示

```text
最初に "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md" を読むこと。
対象: "…/show-creative-ideas/shosai-app/"。新規 stage-i18n.zh-Hans.js / stage-i18n.zh-Hant.js、index.html、style.css、stage-sketch.js（言語選択UIのみ）、stage-prompt-i18n.js、tests/。
目的: 実装。docs/I18N_ZH_WORKORDER_2026-09-09.md の §3.2 を、§6 R3 の完了条件まで。
確定仕様: §3.2 の1〜6。訳文はドラフトから一字も変えない。訳語を新しく決めない。
  製品名の表記は §0-b の決定: ② 英名 "Stage Sketch"（ドラフトの 舞台速寫／舞台速写 は出さない。§3.2-6 の②の手順）。
未決事項: §4 の4件は実装せず、報告の末尾に提案として書く。
制約: §5。i18n-prep/ は読むだけ（コピー元）。版上げ（?v= / CACHE_NAME / build_stage.py）はこのラウンドでは**しない**。
完了報告: 変更・新規ファイル／各テストの追加内容と結果／かな漏れ検査の実測（0件の証拠、あれば全件）／
  スクリーンショットの保存先／初回ロード増分の実測（KB・ms）／§4 への提案／ドラフトの NEEDS_REVIEW をそのまま転記。
```

**Claude が見るもの**: ドラフトとの `diff`（グローバル名の1行だけが差であること）／設定モーダルとスマホの選択UI／`:lang()` のフォント／`stage-prompt-i18n.js` の zh 修正2箇所／かな漏れ0件の証拠／スクリーンショットを自分の目で見る（縮んだボタン・行間・「」の描画）。

### 7.4 R4（版上げ・ビルド）と R4b（独立レビュー）

R4 — Codex への指示:
```text
最初に "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md" を読むこと。
対象: "…/show-creative-ideas/shosai-app/" の index.html / stage-sw.js / build_stage.py の実行。
目的: docs/I18N_ZH_WORKORDER_2026-09-09.md §3.3 の版上げと生成。他のファイルは触らない。
完了報告: 変えた ?v= の一覧（前→後）／CACHE_NAME／APP_SHELL の追加行／python3 build_stage.py --check の結果／node tests/index.mjs の結果。
```

R4b — 別セッション・`--sandbox read-only` で Codex に独立レビュー:
```text
最初に "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md" を読むこと。
対象: "…/show-creative-ideas/shosai-app/" の未コミット差分（git diff）。読むだけ。編集しない。
目的: docs/I18N_ZH_WORKORDER_2026-09-09.md の §3・§5・§6 に対する独立レビュー。結論を誘導しないので、合否ではなく「観察した事実→仕様のどの行に反するか」を番号付きで全件挙げる。
特に見る: (1) 日英の見え方が変わる差分 (2) 訳語・訳文への変更 (3) 未読込パック・旧保存値・navigator 各経路の落ち先 (4) data-no-i18n の抜け (5) SW/版の不整合 (6) テストがソース正規表現で検査している箇所（評価後の値で検査すべきもの）。
報告: 番号／ファイル:行／観察／反する仕様の節／重大度（配信を止める・直してから配信・後日）。
```

**Claude の統合**: R4b の指摘を採否付きで表にし、本人へ「配信してよいか」を1問で聞く。配信（デプロイ・公開）は本人の操作。

### R4b 独立レビュー（23:02・read-only・gpt-5.6-sol）の採否

| # | 指摘 | 重大度（レビュー） | 採否（Claude） |
|---|---|---|---|
| 4 | 見本ショー生成が `isEn()` 二択＝中国語で日本語の見本が焼き付く | 配信を止める | **採用・R5 最優先** |
| 5 | 寸法ラベルが英語だけ辞書、他言語は日本語 | 直してから配信 | 採用・R5 |
| 6 | `isEn()` 二択の残り5箇所（左右表示「上手へ」等） | 直してから配信 | 採用・R5 |
| 1〜3 | 保留3鍵の英語が「決定値」と違う | 直してから配信 | **一部採用**: 英語は本人判断待ちで変えない。中国語で辞書を引かず英語へ直行する経路だけ直す |
| 7・8 | テストがソース正規表現／関数型 SAY を未評価 | 直してから配信 | 採用・R5 |
| 10 | PWA 資材一覧に zh パック無し | 後日 | 一覧追加だけ R5。スキップ挙動は後日 |
| 9 | coverage テストの設計（ソース解析） | 直してから配信 | **不採用（別発注）**。既存設計で、今回の範囲外 |

---

## 8. 対象外（この発注に含めない）

- 使いかたの冊子（`manual/` 10章35節）と LP／紹介ページの中国語化。
- ネイティブ確認（NEEDS_REVIEW 12件×2言語）。公開判断の条件として本人が別に進める。
- フランス語（ドラフトはあるが、パック機構ができれば同じ手順で後日追加できる）。
- 「開発者の言葉（このアプリについて）」の訳のトーン確認（本人）。
