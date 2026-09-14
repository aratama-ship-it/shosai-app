# Viewer right-panel resize — 2026-09-10

Local implementation: drag the separator between the drawings and right-hand tools/notes. Drag left to widen the right column, right to narrow it. The selected width is saved in this browser, independently of shows and notes. Double-click or Enter resets; Escape cancels an unfinished drag. Arrow keys adjust 10px, Shift changes 30px, Home/End use the current bounds.

260–640px, further constrained to retain at least 320px for drawings. Existing defaults are 320px, or 280px at 700–1000px viewports. Below 700px the existing stacked layout remains and the separator is hidden. A larger stored preference is retained through smaller viewports. Hit area 44px wide, keyboard focus 2px, cyan identification retained.

Changed: stage-study-viewer.js, stage-study.css, study.html (Viewer v17/CSS v25), build_study.py and generated study-frame.html. No new public asset or API/Worker/migration change. Token sheet: design/TOKEN_SHEET_viewer-identity-proposal_2026-09-10.md. Regression runner: tools/study-panel-width-browser-check.mjs.

Validation:
- Browser runner: 7 groups passed. Real pointer drag and persistence; keyboard without scene navigation; Escape/pointercancel/lost capture rollback; JA/EN at 1440, 768, 390 and 844 widths; width clamping and restoration; reset; corrupt/unavailable preference storage; unchanged snapshot and editor storage; zero page errors or study API writes. Uses an independent browser context and a pre-existing synthetic multi-scene invite on localhost.
- In-app browser: existing Viewer rendered; separator's accessibility value verified at 320, 350 and 440px. Existing pinned note preserved. Left at 440px for user review.
- Existing Node tests: study-links, study-private, study-sticky, study-continuity, study-beta-invitation: 43/43.
- node --check stage-study-viewer.js and tools/study-panel-width-browser-check.mjs passed.
- python3 build_stage.py --check, build_study.py --check, build_public.py --check passed.
- git diff --check passed. design-lint: NG 0 / WARN 0 / unavailable 0 (1440×1000 and 390×844).

No unrelated uncommitted changes were reverted or overwritten. Scoped source snapshots were checked immediately before editing; backups for this Mac are in /tmp/study-panel-width-baseline-20260910. No commit, push, deployment, publication, external messages, or secret registration. Physical iPhone/iPad drag feel is unverified.

On this Mac, rerun with:
STUDY_PLAYWRIGHT=/Users/arata/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node tools/study-panel-width-browser-check.mjs

User preview: http://127.0.0.1:8802/study?lang=ja#a0ec8f4b764141f11ee0b14b579cd41cfcb18c5ea5e3fa9a
