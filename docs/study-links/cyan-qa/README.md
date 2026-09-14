# Viewer cyan accent local check — 2026-09-10

User-approved direction: preserve the dark Stage Sketch appearance and common fonts; distinguish Viewer through cyan accents. Local implementation preview, not deployed.

Changed product sources: stage-study.css (Viewer-scoped colors, header, pressed/hover/focus/primary states), study.html (CSS v24), build_study.py (CSS v24), generated study-frame.html. Token values: design/TOKEN_SHEET_viewer-identity-proposal_2026-09-10.md. No new public resource or Worker/migration changes.

Validation:
- 43/43 existing tests: study-links, study-private, study-sticky, study-continuity, study-beta-invitation.
- Actual local browser: existing Viewer invite; header, existing private pinned note preserved, pen on/off state reviewed without drawing or sending anything.
- Automated Chromium: checks.json; Japanese and English at 1440, 768, 390, 844 widths; 44px controls, sidebar placement, no horizontal overflow, active pen/sticky buttons, cyan keyboard focus. No page errors or study API writes.
- design-lint: report.md; NG/WARN/unmeasurable all 0. Header muted text corrected from 4.22:1 to 7.19:1 against its new background. Existing body fonts retained.
- build_stage.py --check and build_study.py --check passed. git diff --check passed.
- build_public.py --check remains blocked by existing stale try.html, translated try.html, i18n files, stage-sketch.js and style.css. These unrelated generated assets were not regenerated for this appearance preview.

Shared workspace: scoped source hashes checked immediately before editing and earlier content backed up under this Mac's /tmp/study-cyan-baseline-20260910. Another writer subsequently regenerated study-frame.html with stage-venues.js v27; its update was preserved. The CSS itself remained limited to this task's Viewer changes. No unrelated changes reverted. No commit, push, deploy, publication, external message, or secret registration.

Not checked: physical iPhone/iPad, dark rehearsal-room brightness, final user acceptance. Appearance evidence is local only; this is not release certification.

Direct local URL: http://127.0.0.1:8802/study?lang=ja#a0ec8f4b764141f11ee0b14b579cd41cfcb18c5ea5e3fa9a
