# 台本・キュー設計資料 デザイントークン

2026-09-09 / Astra / index.html の操作固定例と設計資料。製品への適用は未実施。
設計メモ: SPEC.md §1/4。既存style.cssの紙/机/錆色を継承。台本とキューの位置関係を主役にする。

| CSS token | 値 | 用途・実測 |
|---|---|---|
| paper | #efe7d6 | 背景70% |
| page | #fffaf0 | 台本面20% |
| ink | #2b2620 | paper上12.19、page上14.41 |
| muted | #6a604e | paper上5.03 |
| accent | #8f3e1e | paper上5.94。選択/要確認は文字も併記 |
| desk | #201b16 | paper文字13.88 |
| line | #75664f | page上5.35。入力境界/ボタン境界 |

2026-09-09に design-web/tools/contrast.mjs で上記6組を実測。AA本文4.5以上。
書体は Hiragino Sans / Yu Gothic / system-ui / sans-serif。h1=32px、h2=24px、h3=18px、本文16px、補足/操作14px、台本18px。
line-height=1.75、見出し1.5、台本1.9、字間0。本文段落max-width50em。
余白4/8/12/16/24/32/48px。ページmax-width1240px、外周32px→mobile16px。本文/詳細1fr/320px、ガター0（区切り線）。
操作固定例は1024px未満で縦積み。製品版の別面切替はSPEC.mdの計画であり、固定例では未実装。
ボタン最小44px、入力44px、独立した参照リンク44px、radius4px、線1px、選択線3px、focus3px+offset2px。影なし。
文字エリアmin-height104px、台本行min-height88px。表は必要時横スクロール。モバイルはキューを本文の下へ流す。
装飾モーション0ms。自動スクロールなし。prefers-reduced-motionでも同じ動作。選択/更新は即時描画。
印刷は操作パネルを隠し、台本/キュー/計画と未確認状態を残す。紙上はインク色/白地、A4余白15mm、本文10pt。
数値が変わるときは本書を先に更新する。
