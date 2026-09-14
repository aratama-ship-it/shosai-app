# 3場面統合構成 UI Token Sheet

2026-09-09: 対応表を3列へ変更。第2場面の詳細は3つの流れと折りたたみへ整理。
Phase heading: 18px; transition note: 14px; control height: 44px; spacing: 12 / 16px.
Mapping: repeat(3,minmax(0,1fr)); 760px以下は1列。

- Background: `#efe7d6`
- Page: `#fffaf0`
- Ink: `#2b2620`
- Muted: `#6a604e`
- Accent: `#8f3e1e`
- Rule: `#75664f`
- Soft panel: `#f7f0e2`
- Serif: `Hiragino Mincho ProN`, `Yu Mincho`, serif
- Sans: `Hiragino Kaku Gothic ProN`, `Yu Gothic`, sans-serif
- Spacing: 8 / 12 / 16 / 24 / 32 / 48 px
- Minimum control height: 44 px
- Layout: one editorial sequence with a narrow source-scene rail; no card grid
- Mobile: source rail becomes a horizontal label row; all text stays in document flow

The palette and type roles match the existing Romeo and Juliet review artifacts. The large `5 → 3` figure is text, so the structure remains legible without color.

## Scene 2 reading view · 2026-09-10

Reuses the palette and type roles above. Width 1000px; desktop gutter 64px; mobile gutter 20px at 700px. Dialogue 18px / 1.95 serif (17px mobile), speaker 14px sans. Dialogue uses an 8em speaker column on desktop and a stacked speaker on mobile. Stage directions use 15px / 1.9 on the soft panel. Controls remain at least 44px. Three movement anchors stay within one consolidated scene. Director notes use native details; print hides these notes and retains all script lines. No new color pair introduced.

Character names and short place names stay together with phrase-level no-wrap; paragraphs otherwise wrap naturally.

Stage preview figures: width 100%, aspect ratio 1100:680, 1px rule-color border, 14px caption, 44px minimum link target, 16px/24px margins. Diagram tokens are defined in `../stage-visuals/TOKEN_SHEET.md`.
