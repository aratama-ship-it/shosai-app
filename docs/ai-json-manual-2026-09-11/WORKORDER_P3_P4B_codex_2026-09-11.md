# 発注書 P3＋P4B — 公開ページ「AIに作らせる」（本文コピー・見本DL・JSON点検）と共有判定関数（Codex向け）

- 発注: Claude（Fable 5.1）2026-09-11 / 本人承認済み（P4_DECISION.html の P4-1〜4「全部通してください」）
- 実行モデル: gpt-5.6-terra / effort medium / sandbox workspace-write / cwd = shosai-app
- 契約: `docs/ai-json-manual-2026-09-11/CONTRACT_P0_2026-09-11.md`（§1〜§10。§10 が P4 の決定）
- 背景: P1_REPORT.md（検査器と往復検査）、P2_LEDGER.md（外部AI 5本の実測。NG版は p2-runs/ にある）、P4_DECISION.html

## 絶対に触らないもの（別セッションが同時編集中・本番は未コミット木から配信中）

`stage-sketch.js`、`stage.html`、`index.html`、`build_stage.py`、`worker.js`、`mcp-server/`、`.stage-sketch-mcp/`、既存 docs。git 操作（commit / stash / checkout / add）をしない。ネットワーク送信・公開・削除・移動をしない。

## 成果物（すべて新規ファイル。既存ファイルの変更は tools/ai-json-check.mjs の分割だけ）

```
tools/ai-json-check-core.mjs      判定関数の正本（純粋関数。node/ブラウザ共用。I/O なし）
                                  export function validate(doc, enums) → { errors:[{path, message, severity:'changes-figure'|'contract'}], ... }
                                  export function buildFixRequest(errors) → AIに貼る修正依頼文（P2 で使った書式: 「検査器の結果です。修正版の完全JSONを返してください。…」）
tools/ai-json-check.mjs           既存CLI。core を import する薄い皮に書き換える（引数・出力・終了コードは現状維持。--json も維持）
tools/build-ai-json-page.mjs      ビルド: stage-sketch.js / stage-venues.js から enum（POSES 46・PIECE_TYPES・SET_KINDS・LIGHT_KINDS・会場と規模）と
                                  対応アプリ版（stage.html の .stage-app-version）を抽出し、docs/ai-json-manual/AI_MANUAL_ja.md と samples/ を読み込んで
                                  public/ai-json/ 以下を生成する。抽出に失敗したら非0で止まる（黙って古い enum を使わない）
public/ai-json/index.html         公開ページ（生成物。日本語のみ）。外部スクリプト・外部フォント・外部送信なし。file:// で開いても動く
public/ai-json/ai-json-check.browser.js   core を bundle した単一ファイル（enum と版を埋め込み。依存パッケージを増やさない＝手書きの連結でよい）
public/ai-json/AI_MANUAL_ja.md    本文のコピー（生成物。正本は docs/ai-json-manual/）
public/ai-json/samples/*.json     見本のコピー（生成物）
public/ai-json/README.md          配置方法（本番のどのパスに置けば公開されるか＝worker.js を読んで判定した結果。worker.js の変更が要るなら「未決」として行番号つきで書く）
tools/ai-json-page-check.mjs      Playwright で public/ai-json/index.html を file:// で開き、下記の検証を行う
docs/ai-json-manual-2026-09-11/P3_P4B_REPORT.md   実行報告（検証証拠・未決・停止した項目）
docs/ai-json-manual-2026-09-11/qa-p3/              スクリーンショット
```

## 公開ページの内容（1ページ・上から）

1. 見出し「AIにショーの下書きを作らせる」＋3行の説明（何ができて何ができないか。契約書 §8 の4文言をここに置く）
2. **手順**（3ステップ）: ①本文をコピーしてAIに貼る → ②AIの質問に答えてJSONをもらう → ③ここで点検してから舞台スケッチの「読み込む」で開く
3. **本文をコピー**ボタン（AI_MANUAL_ja.md 全文。ボタン1つで clipboard へ。失敗時は textarea を表示して手動コピー）。本文の版と対応アプリ版を表示
4. **見本**: sample-minimal.json / sample-standard.json のダウンロードリンク（download 属性）
5. **JSON点検**: ファイル選択（input type=file accept=.json）と貼り付け欄（textarea）の両方。結果は2段:
   - 「図が変わる」: 参照切れ（castId/setId）、色の書式、会場と規模の不一致、未知の姿勢、未知の種類、type と kind の不一致
   - 「規約違反」: それ以外（外枠・未知キー・上限・安全注記・null・文字列数値・任意項目の追加…）
   - 0件なら「点検OK。舞台スケッチの『読み込む』で開けます（読み込み成功＝意図どおりではありません。全場面を見て判断）」
   - 1件以上なら **「AIに貼る修正依頼文をコピー」** ボタン（buildFixRequest の出力）
   - JSON構文エラーは行・列つきで表示（JSON.parse のメッセージをそのまま）
6. 脚注: 外部送信なし・ブラウザ内で完結、既知の非対応（既存ショー修正・Mac版AI指示・動線）

デザイン: 舞台スケッチの LP（index.html）と同じトークン（読んで合わせる。index.html は読むだけ）。スマホ幅で崩れないこと。design/TOKEN_SHEET 系があれば従う。

## 検証（P3_P4B_REPORT.md に証拠つきで）

1. `node tools/ai-json-check.mjs` の既存挙動が不変: 見本2本 exit 0、`tools/ai-json-check.fixtures/*.json` 9本すべて exit 1 で検出（P1 と同じコマンド・出力を貼る）
2. core の単体: p2-runs/chatgpt-1-1.json（参照切れ6件）と p2-runs/gemini-1-1.json（色39件）が「図が変わる」に分類され、chatgpt-1-2.json / gemini-1-2.json / claude-1-1.json / sonnet-*.json が 0件
3. ブラウザ（Playwright・file://）: 上の NG 2本を貼り付け欄で点検→件数と分類が CLI と一致／「修正依頼文をコピー」の生成文字列が buildFixRequest と一致／見本2本で「点検OK」／構文エラーの JSON で行・列表示／「本文をコピー」の生成文字列が AI_MANUAL_ja.md と一致（clipboard は権限が要るので、コピー対象文字列を DOM から取って比較でよい）
4. スクリーンショット: PC幅と 390px 幅で、初期・OK・NG の3状態（qa-p3/）
5. 版の整合: ページ表示の対応アプリ版＝stage.html の実測、本文版＝AI_MANUAL_ja.md の見出し、enum 件数（POSES 46 等）を報告に記載
6. ビルドの再現性: `node tools/build-ai-json-page.mjs` を2回実行して差分なし

環境: Playwright は `STUDY_PLAYWRIGHT=/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js`（`chromium.launch({channel:'chrome'})`）。file:// で開くので study-preview（サーバ）は不要。

## 停止条件（推測で埋めず、P3_P4B_REPORT.md の「未決」に書いて止める／保守的な選択で続ける）

- 公開パスの判定で worker.js の変更が必要 → 変更せず「未決」（行番号・必要な変更の提案）。ページ自体は file:// で完結させる
- LP（index.html）や保存パネルからの導線 → 今回は付けない（別セッション編集中）。README に「付けるべき場所」を書くだけ
- 契約書とコードの食い違い → コードを正とし、契約書は編集せず報告に修正提案
- 依存パッケージの追加（bundler 等）→ しない。手書きの連結で足りる
- 英語版 → 作らない（P3 の英語版は別発注）

## 完了条件

上の検証1〜6がすべて報告に証拠つきで載っていること。未決・未実施は「未実施」と明記し、実施済みと書かない。

## 開発方針（dev-preferences より転記）

- [コード/UI] 推測・簡略化より正確性を優先。判定に自信がない箇所は断定せず「要確認」にする
- [外部形式/入出力の明示] 入力形式・出力形式・開くアプリ・方向を操作の直前に明記。「JSON」で一括りにしない
- [比較UX/一手で試せる導線] 判断する主導線（点検→修正依頼文コピー）を補助出口（見本DL等）と区別する
- [進め方] 一度に広げず、承認済みの範囲を小さな完了単位で仕上げる
