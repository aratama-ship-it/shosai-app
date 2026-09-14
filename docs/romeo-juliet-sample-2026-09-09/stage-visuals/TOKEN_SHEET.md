# 舞台構成図 · 設計と数値

2026-09-10 / design-web / ロミオとジュリエット

## 設計メモ

- 演出を考える本人が、台本の各キューで誰がどこにいるか、焦点と次の移動を図で確かめる。
- 添付された別セッションの斜め図を参照。舞台の厚み、輪郭線、人物記号、客席方向を採用する。今回の舞台は平舞台の仮枠とし、寸法・設備は未確定。
- この作品で確定している四隅の乱戦、右手前の二人、七人の背中、人の川、中央への集合を主役にする。
- 一覧だけ／3D操作を中心にする案も比較し、3場面から瞬間を選ぶ構成図帳を採用。位置が変わるキューは複数の図で示す。自動再生は付けず、時間の経過と図の切替を混同しない。
- 既存の台本にも画像を挿入。PCでは図を大きく、スマートフォンでは全体表示と拡大を切り替える。各図には文字の説明と人物凡例を併記する。
- 座標、向き、追加した動線は検討案。本人指定の構図と未決定の細部を分け、今回の図は直接アプリへ取り込まない。

## Tokens

- Paper #efe7d6, page #fffaf0, ink #2b2620, muted #6a604e, rule #75664f, soft #f7f0e2.
- Focus #8f3e1e. Named Montague-side roles — Romeo, Benvolio, Mercutio and Montague — use red #8f3e1e. Named Capulet-side roles — Juliet, Tybalt, Nurse and Capulet — use blue #245963. Lawrence remains #556044; other neutral figures remain #655b4c; river #245963. Anonymous groups stay neutral, including the four-corner opening brawl, which does not identify either household by color.
- Text on character disks #fffaf0: contrast measured for #245963 = 7.52:1; #556044 = 6.42:1; existing accent pair = 7.02:1.
- Floor #ddd2bc; stage side #c5b79c. Light-intent pool #fffaf0, opacity .7; boundary hatch uses rule color, no opaque wall.
- Masquerade interior: bar counter top #77563c, front #9b7248, back shelf #4d3525 and bottles #d5b77d. The set is neutral and does not indicate either family. White label on the bar top uses #fffaf0. Every masquerade performer has a #fffaf0 mask symbol with ink eyeholes, set above the role label so the character remains legible.
- Typeface: Hiragino Kaku Gothic ProN / Yu Gothic / sans-serif; titles Hiragino Mincho ProN / Yu Mincho / serif.
- UI body 16px / 1.8; notes 14px / 1.8; h1 32px / 1.5; h2 24px / 1.5; controls min 44px; spacing 8 / 12 / 16 / 24 / 32px.
- Legend role/state phrases and anonymous-cast holder labels: 12px / 1.8, kept together with phrase-level no-wrap.
- Page max 1360px; desktop diagram + notes grid 2.7fr / 1fr; breakpoint 850px one column; mobile gutter 16px. Image fits viewport; expanded image minimum width 1040px with local horizontal scroll.
- SVG viewBox 0 0 1100 680. Person head radius 21px, labels 19px bold; body stroke 8px, border 3px. Foot position uses normalized u/v; arrows 3px dashed 8/6, orientation tick 2px.
- Isometric drawing: x=160+700u+160v; y=240-145u+285v. Plan: x=140+820u; y=105+440v. v=0 is upstage, v=1 is downstage. Stage thickness in drawing 24px, not a physical dimension.
- No automatic motion or CSS animation. All state changes follow explicit controls. Print shows the current frame and its notes.

Reference: user attachment スクリーンショット 2026-09-10 16.14.18.png. No external visual assets or libraries required.

Neutral character disk #655b4c with text #fffaf0: measured contrast 6.40:1.

Offline edition: preserves existing tokens and diagrams. Embedded document dialog width min(1200px, 96vw), height 92vh, padding 0, 1px rule border; toolbar padding 12px 16px, gap 16px, close target at least 44px. Backdrop uses ink at 45% opacity. No animation. The document iframe takes remaining height; on mobile the same 96vw frame contains the existing responsive reading view.
