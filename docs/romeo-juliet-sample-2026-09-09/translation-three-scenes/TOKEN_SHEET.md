# Three-scene translation review · 2026-09-09

Purpose: 本人が最終推敲するための3場面の下訳と、台本キューのテストに使う仮キュー。台詞の調子は本人が方向性を確認した出会いの初稿にそろえる。
Design: 出会いの対照ページを継承。場面一覧から3つの場面へ移動し、各発話の英語／日本語を照合できる。ト書きは独立項目として表示。訳注は場面末尾へ折りたたむ。
State: AI baseline / current editable text / saved user revision; final polish belongs to the user. Cue proposals remain proposals; editing their source block marks anchors as requiring review.

- paper #efe7d6; page #fffaf0; ink #2b2620; muted #6a604e; accent #8f3e1e; line #75664f.
- Existing measured contrast: ink/page14.41:1, muted/page5.94:1, accent/page7.02:1. Re-measure through design-lint for this artifact.
- Hiragino Sans / Yu Gothic / system-ui. English16px/1.9; Japanese18px/1.9; h1 32px/1.4 (mobile28px); scene heading24px/1.5; speaker24px/1.5 (mobile22px); labels14px/1.75.
- Spacing8/12/16/24/32/48px; outer32px desktop/16px mobile; max1120px; columns gap32px, stack below800px. Scene boundary3px accent. Controls min44px. Focus3px+offset3px. No shadows or animation.
- Independent local document. Preserve the initial meeting page and its data; no changes to product files or browser storage.
