# 発注書 P1 — 舞台スケッチ「AI作成マニュアル」本文・見本・検証器（Codex向け）

- 発注: Claude（Fable 5.1）2026-09-11 / 本人承認済み（判断用HTML D1〜D8「全部賛成」）
- 実行モデル: gpt-5.6-terra / effort medium / sandbox workspace-write / cwd = shosai-app
- 契約: `docs/ai-json-manual-2026-09-11/CONTRACT_P0_2026-09-11.md`（必読・これが仕様）
- 背景資料: 同フォルダ index.html（判断用）、REVIEW_astra_raw.md（独立レビュー）、`mcp-server/PLAYBOOK.md`（創作方針）

## 成果物（すべて新規ファイル。既存ファイルは変更しない）

```
docs/ai-json-manual/                       ← 正本フォルダ（新規）
  AI_MANUAL_ja.md        AIに貼る本文。自己完結・日本語。末尾に自己点検表を同梱
  SELF_CHECK_ja.md       自己点検表（本文末尾と同一内容）
  samples/sample-minimal.json    1演者・2場面・照明なし（契約に完全準拠）
  samples/sample-standard.json   4演者・8場面（section 2つ・depth0/1）・照明 hang 2〜3・beat・lightingIntent・高リスク装置1件（note に安全未確認）・姿勢と色の違う演者
  CHANGELOG.md           マニュアル改訂番号（v0.1.0 から）と対応アプリ版（stage.html の版表示を実測して記録）
tools/ai-json-check.mjs           raw JSON検査器（node 単体）
tools/ai-json-browser-check.mjs   ブラウザ往復検査（Playwright + study-preview）
docs/ai-json-manual-2026-09-11/P1_REPORT.md   実行報告（検証証拠・未決・停止した項目）
docs/ai-json-manual-2026-09-11/qa/            スクリーンショット置き場
```

## AI_MANUAL_ja.md に必ず入れるもの（判断用HTML「本文に必ず入れる要素」）

1. 何を作り何を作らないか（新規下書き専用／動線・安全判断・舞台機構は書かない／完成品ではない）
2. 出力形式の固定: UTF-8 の単一JSON。説明文・コードフェンス・コメント・末尾カンマ・`...`・プレースホルダを入れない
3. 契約の必須／任意／条件付き必須の表（省略時の値・null不可・置く階層を併記）。enum は **stage-sketch.js から実際に抽出した値**を載せる（POSES・PIECE_TYPES・SET_KINDS・LIGHT_KINDS・会場プリセット）
4. 参照の規則（castId/setId・type と kind の一致・登録IDは場面をまたいで固定・同一場面で同じ登録IDを2回使わない・id は一意）
5. 座標契約と生成範囲（u,v 0〜1、facing 度、size 100基準、heightCm）
6. section の並べ方の具体例（平坦配列 depth0/1）
7. 上限（scene+section 60・1場面80駒）と、失敗時は「理由＋修正版の完全JSON」を返す指示
8. 創作上の入力欄（人数・会場・場面数・使える道具・採用済み要素）。実測値を捏造しない・仮定は note に明記。PLAYBOOK の 6〜9 ビートを場面数指定へ無条件適用しない
9. **本文内の完全例1本**（1演者・2場面。登録と参照を最後まで省略しない。sample-minimal と同一内容）
10. ユーザーの受け取り手順（PC は比較画面→「別のショーとして開く」／スマホは即保存／保存失敗時／全場面を見てから判断）
11. 入れない表現: 「自己点検済み＝読み込み保証」「読み込み成功＝意図どおり」「安全警告なし＝安全」
12. 第8節の契約文言4点（D8）
13. 本文の長さは契約を削らずに決める（6,000〜9,000字は目安にすぎない）

## tools/ai-json-check.mjs（raw JSON 検査器）

- 入力: JSONファイルパス（複数可）。出力: 人が読める一覧＋ `--json` で機械可読。**解析失敗・検出ありは終了コード非0**（既存 check-object-on-performer.mjs の「解析失敗でも exit 0」を繰り返さない）
- 検査: 構文／外枠（kind・数値 version 4・venues 空）／型／許可キー以外の存在（未知キー＝エラー。黙って落ちる項目を可視化する）／enum（**stage-sketch.js から実行時に読み取る**。check-object-on-performer.mjs と同じ方式で POSES・PIECE_TYPES・SET_KINDS・LIGHT_KINDS を取得）／非空・一意ID／castId・setId の参照先存在／piece.type と set.kind の一致／null 値／文字列数値／上限／section に駒・beat が無いこと／kind:"scene" が1件以上／高リスク装置の場面 note に「安全未確認」があること
- 負のケースを `tools/ai-json-check.fixtures/` に最低8本用意し（MCP形の誤投入・未知type・不明姿勢・参照切れ・null要素・文字列数値・重複ID・version文字列）、全部を検出することを P1_REPORT に一覧で示す
- 見本2本は検出0件であること

## tools/ai-json-browser-check.mjs（ブラウザ往復検査）

- 既存の `tools/study-browser-check.mjs` と `tools/study-preview.mjs` の作法をそのまま使う。**このMacの環境変数**:
  - `STUDY_MINIFLARE=/Users/arata/.npm/_npx/32026684e21afda6/node_modules/miniflare/dist/src/index.js`
  - `STUDY_PLAYWRIGHT=/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js`（無ければ `/Users/arata/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`）
  - preview は `node tools/study-preview.mjs` を別プロセスで起動（127.0.0.1:8796、Basic study-owner / local-study-owner）。終了時に必ず停止する
- 手順（見本2本それぞれ）: `/stage.html?lang=ja` → 保存パネルの `#stage-import-json` にファイルを渡す → `#stage-import-modal` 表示 → `#stage-import-as-new` → `window.SHOSAI_STAGE_STUDY_OWNER.snapshot()` で正規化後の project を取得
- 照合（意味の保持）: 場面数・順序・kind/depth 階層・題名・note・beat.energy・演者数と castId・駒の type/setId・色・姿勢・u/v（±0.001）・lightingIntent 文字列・照明駒の beam が真上6m になっていること。許す差（自動付与 id・時刻・既定フィールドの追加）は明示して P1_REPORT に列挙
- 全場面を正面図・平面図で表示し、各場面のスクリーンショットを `qa/` へ保存（先頭場面だけで合格にしない）
- 往復: `#stage-export` で書き出し → その JSON を再度読み込み → snapshot が一致（許す差を除く）
- 既存状態の保護: 読み込みモーダルをキャンセル／同じ project.id の文書を2回読み込み／それぞれで元のショーが残ること
- 実行できない場合（miniflare・playwright 起動失敗・chrome 不在）は**その旨を P1_REPORT に「未実施」と明記**し、代替として stage-sketch.js から normalizeState 系を隔離実行する node 検査で意味保持だけ確認する（Astra が同方式で確認済み）。未実施を実施済みと書かない

## 停止条件（推測で埋めず、P1_REPORT の「未決」に書いて止める／保守的な選択で続ける）

- 契約書とコードが食い違う箇所（例: 許可 kind が SET_KINDS に無い、depth 平坦配列が往復で崩れる）→ コードを正として契約書の該当行を **P1_REPORT に修正提案**として書く。契約書・index.html 自体は編集しない
- ユーザー向けの意味が変わる判断（許可種類の追加、照明を hang 以外へ広げる、文言の緩和）→ しない。未決として記録
- stage-sketch.js・stage.html・index.html・build_stage.py・mcp-server/・.stage-sketch-mcp/・既存 docs は**一切変更しない**
- git: commit / stash / checkout / add -A をしない（本番が未コミット木から配信中。165件の未コミット変更がある）
- ネットワーク送信・公開・削除・移動をしない。/tmp を成果の置き場にしない

## 完了条件（すべて P1_REPORT に証拠つきで）

1. ai-json-check.mjs: 見本2本が0件、負のケース8本以上が全件検出（コマンドと出力を貼る）
2. ブラウザ往復検査: 見本2本で意味保持と往復一致（差分一覧＋各場面スクリーンショットのパス）。未実施なら理由と代替検査の結果
3. AI_MANUAL_ja.md の本文内完全例が sample-minimal.json と一致（diff で示す）
4. enum 一覧が stage-sketch.js の現物と一致（抽出コマンドと件数: POSES 48 想定）
5. CHANGELOG.md に v0.1.0・対応アプリ版（stage.html の版表示を実測）・確認日
6. 未決・修正提案・未実施の一覧

## 開発方針（dev-preferences より転記）

- [コード/UI] 推測・簡略化より正確性を優先。判定に自信がない箇所は断定せず「要確認」にする
- [外部形式/入出力の明示] 入力形式・出力形式・開くアプリ・方向を操作の直前に明記。「JSON」で一括りにしない
- [進め方] 一度に広げず、承認済みの範囲を小さな完了単位で仕上げる
