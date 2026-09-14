# Romeo and Juliet sample pack / 2026-09-09

Purpose: 舞台スケッチの台本キュー設計者が、日英原文と小さな実台本PDFをすぐ選び、対応箇所と演出案を照合する。製品UIは変更しない。
Design: 既存 docs/script-cues-2026-09-09/PDF_TOKEN_SHEET.md の紙面系を継承。青空文庫の書誌・本文分離と既存PDF設計の版表示を参照。資料一覧だけ／日英全文並列／場面抜粋＋別添キューを比較し、検証の開始が短い第3案を採用。書誌・原文・演出提案を区別し、全文はリンクから読む。
Feeling: 台本として落ち着いて読め、何を試せるかと未採用の範囲が分かる。
Identity: 原作の幕・場、翻訳版、手・視線・決闘という具体的動作、キューを記入できる余白。
Constraints: ローカルのみ。オフラインHTML、外部依存ゼロ、本文選択可能なPDF、日英対照は幕場単位で逐語対訳としない。PDFにキューを焼き込まず別データを添える。

## Tokens
- paper #efe7d6; page #fffaf0; ink #2b2620; muted #6a604e; accent #8f3e1e; line #75664f.
- contrast.mjs measured: ink/page 14.41:1, muted/page 5.94:1, accent/page 7.02:1.
- Web: Hiragino Sans / Yu Gothic / system-ui; body 16px/1.8; h1 32px/1.4; h2 24px/1.5; h3 18px/1.5; labels 14px/1.75.
- Web spacing: 8, 12, 16, 24, 32, 48px; outer 32px desktop / 16px mobile; max width 1120px; text max 44em; links/summary min44px; columns collapse at 800px.
- Border 1px; radius 0; focus 3px/offset3px; no shadows, animation, gradients, auto-scrolling or autoplay.
- PDF: A4 portrait 595.28x841.89pt; body x44 to x424, note margin x450 to x555; y117 to y743; header 17pt; subhead 10pt; body JA 11pt/17pt, EN 10.5pt/13pt; blank line EN 5pt; footer 8pt/12pt.
- PDF font: embedded subset of this Mac's Arial Unicode.ttf, no font file distributed. Excerpt text must be checked against its cmap before generation. Each selected scene starts a new page. Source-line labels are in the data, not mistaken for published verse numbers.
