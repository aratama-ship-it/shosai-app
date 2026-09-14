# 発注書 WO-A9: テストが無い実装にテストを足す（2026-09-09・未着手）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/tests/`。製品コードは変更しない。

## 対象

1. **整列7形状（追加4種類）** `lineupPerformers(shape)`（`stage-sketch.js`、未コミット差分。`row / column / diagonal-up / diagonal-down / circle / vee / inverted-vee`）
2. **利用状況の管理者ページ** `usage-admin-page.js`（`export function usageAdminResponse(english=false)`）

## 1. 整列のテスト `tests/stage-lineup.test.mjs`（新規）

仕様・状態は [一括反映用引き継ぎ](../HANDOFF_LINEUP_2026-09-09.html) を参照。2026-09-09の実装時に関連テスト103件と一時fixture28ケース、5人でのブラウザ操作は確認済み。この発注書は専用の永続テストを残すための後続作業で、形状の再実装は不要。

`lineupPerformers` は IIFE 内部で `window` に出ていない。既存テストの流儀（例: `tests/stage-props-plot.test.mjs` が
`window.SHOSAI_STAGE_*_MODEL` を掴む方法、または `tests/stage-plan-fit.test.mjs` のようにソースから関数本文を切り出して vm で評価する方法）に倣う。
外へ出す必要があれば `window.SHOSAI_STAGE_LINEUP_MODEL = { lineup(pieces, shape) }` を**純粋関数として**切り出す提案を先に本人へ出す（製品コード変更になるため）。

確認すること（各形状）:

- 舞台上の演者が2人未満なら何も動かさず、`announce` に「並べ替える演者が足りません」を出す
- `row`: 左右の順（u昇順）が保たれ、u が 0.15〜0.85 に等間隔、v は元の平均（0.1〜0.95 に clamp）
- `column`: 奥行きの順（v昇順）が保たれ、v が 0.15〜0.85 に等間隔、u は元の平均（0.1〜0.95）
- `diagonal-up`／`diagonal-down`: 左右の順が保たれ、u は 0.15〜0.85、v は `up` で 0.85→0.15、`down` で 0.15→0.85
- `vee`／`inverted-vee`: 真ん中が頂点、`inverted-vee` は `vee` の v を `1 - v` にしたもの
- `circle`: 重心からの角度順が保たれる（元の並びの回転順が変わらない）
- 舞台裏（`onStageArea` が偽）の演者と演者以外（装置・小道具）は動かない
- 未知の shape は何もしない
- 日英: `stage-i18n.js` の SAY に7本すべての告知文の型があること（既に `stage-i18n-coverage` 系テストがあれば重複させない）

## 2. 管理者ページのテスト `tests/usage-admin-page.test.mjs`（新規）

- `usageAdminResponse(false)`／`(true)` が `Response` を返し、`Content-Type: text/html; charset=utf-8`、`Cache-Control: no-store`
- 本文の `<html lang>` が `ja`／`en`
- 日本語版に英語UIの文言（例 "Refresh"）が混ざらない、英語版に日本語が混ざらない（既存の `stage-session-i18n` テストの正規表現を再利用）
- 期間の選択肢が3つ（7/30/90日）で、`fetch` 先が同一オリジンの相対パスであること（外部URLを含まない）
- 「記録が無い＝使われていない、ではない」の注記（`empty`）が両言語に含まれる

## 完了条件

`node tests/index.mjs` 全件緑。新規2本の件数を報告。製品コードに差分が無いこと（`git diff --stat -- '*.js' ':!tests'` が空）。
