# Codex レビュー依頼 — 舞台スケッチ「AI作成マニュアル方式」全体（2026-09-11）

推奨: gpt-6-astra / effort high / sandbox read-only（レビューは判断を要するため上位モデル。ファイルは一切変更しない）

このMacでの実行例（shosai-app で）:

```bash
codex exec --skip-git-repo-check --sandbox read-only -m gpt-6-astra -c model_reasoning_effort=high -C "$PWD" "$(cat docs/ai-json-manual-2026-09-11/CODEX_REVIEW_PROMPT_2026-09-11.md | sed -n '/^=== ここから貼る ===/,$p' | tail -n +2)" </dev/null > docs/ai-json-manual-2026-09-11/REVIEW2_astra_raw.md
```

Codex アプリで対話的に使う場合は、下の「ここから貼る」以降をそのまま貼る。

=== ここから貼る ===
最初に "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md" を読むこと。

目的: 独立レビュー（読み取り限定。ファイルは一切変更しない。git 操作もしない）。
対象: 舞台スケッチ（stage.html / stage-sketch.js）向け「AI作成マニュアル方式」の全体。各ユーザーが自分のAI（ChatGPT・Claude.ai・Gemini等）にマニュアルを読ませ、舞台スケッチの「読み込む」で開けるショーJSONを吐かせる仕組み。MCP（mcp-server/）は本人用に残し、配布しない前提。

## 背景と現状（事実）

- 2026-09-11 に設計→実装→検証を1日で通した。判断用HTML docs/ai-json-manual-2026-09-11/index.html に経緯と本人の決定（D1〜D8、P4-1〜4）がある。
- 本番P2（外部AI 3種 × 課題2種 = 6本）を完走。開けた率 6/6、意味が保たれた率 初回 4/6 → 検査器のNG本文を1回貼って 6/6。質問票は3/3で妥当。台帳 docs/ai-json-manual-2026-09-11/P2_LEDGER.md。
- 「黙った変形」（読み込みは通るが図が変わる）の実例を2種確認: 参照切れ→別人物として描かれる（ChatGPT）、色の先頭空白→全員が既定色（Gemini）。ブラウザは無警告。検査器なら1発。
- P4 の決定: 独立の点検ページ public/ai-json/index.html を先行し（file:// で動作・外部送信なし・本体非改変）、本体 stage-sketch.js への組み込みは別セッション（光の動きスケッチ）の編集後に別発注。ゲスト（テスター用ID）への公開は見送り本人限定。
- 本文は v0.2.4。公開ページには .md ダウンロードとコピーの両方、手順3ステップ、JSON点検（図が変わる／規約違反の2段）、AIに貼る修正依頼文のコピーがある。

## 必ず読む資料（すべて shosai-app 相対）

- docs/ai-json-manual/AI_MANUAL_ja.md（本文の正本 v0.2.4）／ CHANGELOG.md ／ SELF_CHECK_ja.md ／ samples/*.json
- docs/ai-json-manual-2026-09-11/CONTRACT_P0_2026-09-11.md（契約 §1〜§10。§10 が P4 の決定）
- docs/ai-json-manual-2026-09-11/P2_LEDGER.md（6本の実測・NG版と修正版は p2-runs/ に両方ある）
- docs/ai-json-manual-2026-09-11/P1_REPORT.md ／ P3_P4B_REPORT.md（Codex実装とClaude独立検証の記録）
- docs/ai-json-manual-2026-09-11/P4_DECISION.html ／ index.html（判断の経緯）
- docs/ai-json-manual-2026-09-11/REVIEW_astra_raw.md（第1回レビュー。今回はこの続き。同じ指摘を繰り返さず、対応済みかを確認する）
- tools/ai-json-check-core.mjs（判定関数の正本。node と ブラウザで共有）／ tools/ai-json-check.mjs（CLI）／ tools/ai-json-check.fixtures/*.json（負のケース9本）
- tools/build-ai-json-page.mjs（公開ページ生成。enum と版を stage-sketch.js / stage-venues.js / stage.html から抽出）
- public/ai-json/index.html ／ ai-json-check.browser.js ／ README.md（生成物）
- tools/ai-json-browser-check.mjs（Playwright で読み込み→意味照合→撮影→往復）／ tools/ai-json-page-check.mjs（公開ページの検証）
- 参照用: stage-sketch.js の importProject / prepareProjectImportDocument / normalizeState / normalizeScene / normalizePiece / normalizeBeam、stage-venues.js の VENUES_V2、worker.js の GUEST_STAGE_ASSETS（行番号は別セッションの編集でずれるので grep で探す）
- 無視するもの: tools/ai-json-check 2.mjs（iCloud の競合コピー。正本は tools/ai-json-check.mjs）

## 問い（すべてコードか実測の根拠つきで。推測は「推測」と明記。第1回レビューの指摘が対応済みなら「対応済み」と一言で済ませる）

1. **契約とコードの食い違い**: CONTRACT_P0 §1〜§9 と本文 v0.2.4 の記述が、現行の stage-sketch.js / stage-venues.js の挙動と食い違う箇所はあるか。特に、読み込み時に黙って落ちる・化ける項目で、本文にも検査器にも書かれていないものを探す。
2. **検査器の穴**: tools/ai-json-check-core.mjs が見逃す「黙った変形」はあるか（例: 座標の範囲外、size の範囲外、heightCm、facing、section の depth 不整合、scene の順序、同一場面での同一登録IDの重複、light 駒の setId が light 以外を指す、など）。fixtures 9本で足りない負のケースを列挙する。「図が変わる」「規約違反」の分類が妥当か。
3. **本文（マニュアル）の品質**: 外部AIに貼る文書として、誤読を生む箇所・冗長な箇所・欠けている指示はどこか。質問票の仕組み（最大6問・推奨＋理由・保留は仮定を note へ・回答後はJSONだけ）は、P2 の実測（3AIで妥当）を踏まえて改善余地があるか。本文の長さ（約12,000字）は適切か。
4. **公開ページ**: public/ai-json/index.html の UX・アクセシビリティ・安全性（外部送信なし・file:// 動作・クリップボード失敗時の退避）。手順の文言（作りたい内容を詳しく添える／足りない部分はAIから質問が返る）は伝わるか。ダウンロード（.md）とコピーの併存は妥当か。
5. **ビルドと正本の一本化**: tools/build-ai-json-page.mjs の抽出が壊れる条件（stage-sketch.js の書式変更等）と、壊れたときに黙って古い値を出さないか。公開ページと CLI が同じ判定関数を使っている保証は十分か。
6. **P2 の方法論**: 6本の試験設計（課題1=欠落入力・課題2=全指定）と台帳の指標（開けた率・意味保持率・質問票妥当率）は妥当か。次に何を何本試すべきか（例: 別題材、英語、長い演目、既存ショーの誤投入、意図的な悪意入力）。
7. **本体組み込み（P4-A、未着手）への助言**: 将来 stage-sketch.js の読み込み比較画面に点検を組み込むとき、どこに何を足すのが最小か。スマホ経路（比較画面なし）の扱い。別セッションが同ファイルを編集中であることへの配慮。
8. **公開前のリスク**: ゲスト公開を将来解禁する場合の worker.js 変更点と、本文に含まれる文言（安全未確認・秘密保持しない・共有中の同期）の法的・運用的な妥当性。
9. **最後に**: 優先順位つきの推奨（上位5件。各1〜2行。「今すぐ／次の改訂／将来」に分ける）。

## 出力

日本語の Markdown。見出しは「## 1」〜「## 9」で固定。根拠は file:line（またはコマンドと出力）で示す。コードの実行は読み取り限定の範囲で可（node tools/ai-json-check.mjs 等の実行はよいが、ファイル生成・変更はしない。ブラウザ検証を走らせる場合は結果を報告に貼るだけで、qa/ 等への書き込みはしない）。
=== ここまで ===
