# デザイントークンシート — 転換設計レビュー資料

2026-09-08 / Codex Astra / 対象はローカル設計資料と固定例。製品UIへの適用は未実施。
設計メモ: SPEC.md §1。既存style.cssの生成り/濃茶/錆色の系統を継承。

## 配色

| CSS token | 値 | 役割 | 実測 |
|---|---|---|---|
| --paper | #efe7d6 | 資料面・主背景70% | — |
| --ink | #2b2620 | 本文 | paper上12.19:1 |
| --muted | #6a604e | 補助 | paper上5.03:1 |
| --desk | #201b16 | 図の背景25% | paper文字13.88:1 |
| --accent | #8f3e1e | 行動/選択5% | paper上5.94:1 |
| --line | #9c8d73 | 境界 | 装飾線、文字には使わない |

実測ツール: `.agents/skills/design-web/tools/contrast.mjs`。全4組を2026-09-08実行。

## 文字

和文/欧文: `Hiragino Sans`, `Yu Gothic`, system-ui, sans-serif。
--h1 32px / --h2 24px / --h3 18px / --body 16px / --small 14px。
本文行送り1.75、見出し1.5、字間0。本文段落最大50em（全角50字程度）。
図は元viewBox 900×360、ラベル20px、対象ラベル18px。縮小時はテキスト表が等価な情報を持つ。

## レイアウト/操作

--s1 4px / --s2 8px / --s3 12px / --s4 16px / --s5 24px / --s6 32px / --s7 48px。
--width 1184px、外周PC32px/モバイル16px、2列比1:1、ガター24px。680px以下で1列。
--touch 44px、--radius 4px、線1px、強調線3px、影なし。
図を上、手順を下に配置。図の前景に注意帯を重ねない。低い画面では縦スクロール。

## モーション

自動再生なし、再生はユーザー操作のみ。装飾transition 0ms。
--feedback 120msは将来の製品フィードバック候補（今回不使用）。
prefers-reduced-motion時は自動連続再生を手順送りへ置換、スクラブは利用可能。
再生速度は0.5/1/2、予定尺は6/10+7=13/17秒。時間値はCSSでなくデモデータに置く。

## 反映と検証

index.htmlの:rootに転記。ブラウザ寸法、操作、design-lint、目視の記録はVALIDATION.mdへ。
