確認資料用の控え。正本: shosai-app/design/TOKEN_SHEET_usage_2026-09-08.md

# 舞台スケッチ 利用状況 — デザイントークンシート

2026-09-08 / Codex / design-web。対象: β版の管理画面、利用者向け計測表示。

## 設計メモ

1. 管理者が、招いた人の利用日数・最終利用・操作時間を同じ条件で確認する。
2. 数値の意味と未計測の範囲が読め、利用者の作品を覗かずに状況を把握できる。
3. 舞台スケッチの紙色と茶の文字を継承。アカウントごとの一覧を主役にする。
4. 既存ログイン画面を参照。比較しやすい表を採用し、順位付け・装飾グラフ・カードの反復は設けない。
5. 管理者のみ閲覧、日英対応、390pxと1440px、キーボード操作、失敗をゼロとして表示しない。

## トークン

| 名前 | 値 | 用途 / 実測コントラスト |
|---|---|---|
| paper | #f5f1e8 | 背景 |
| ink | #302a24 | 本文 / paper 12.57:1 |
| muted | #67594c | 注釈 / paper 5.99:1 |
| accent | #88432e | 操作・強調 |
| light | #fffaf0 | ボタン文字 / accent 6.99:1 |
| line | #897a6a | 境界線 |
| font | system-ui, -apple-system, sans-serif | 外部フォントなし |
| body / small / h1 / h2 | 16 / 14 / 30 / 20px | 行送り1.65 / 見出し1.3 |
| spaces | 4 / 8 / 12 / 16 / 24 / 32px | 共通スケール |
| width | 1040px | 管理画面の最大幅 |
| breakpoint | 600px | 表を名前＋指標の縦配置へ変更 |
| control | 44px | 操作対象の最小高さ |
| radius / border | 4 / 1px | 角丸・罫線 |
| focus | 3px / offset 3px | キーボードフォーカス |
| motion / shadow | 0ms / none | 動き・影なし、reduced-motionにも同じ |

利用者向け表示は舞台画面の下に置き、図へ重ねない。言語変更は本体のhtml langに追従。
測定: `.claude/skills/design-web/tools/contrast.mjs` を2026-09-08実行。
画面検証結果は `docs/usage-metrics-2026-09-08/index.html` に記録する。
