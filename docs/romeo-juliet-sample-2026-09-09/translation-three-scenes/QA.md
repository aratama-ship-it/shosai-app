# Three-scene draft verification · 2026-09-09

## Delivered scope

- Three excerpted scenes: meeting (I.5, saved source lines1300–1341); window and names (II.2,1525–1615); duel and curse (III.1,2701–2756).
- 34 speeches and6 independent stage directions. The window excerpt extends the earlier test sample from1568 through1615 so the characters' exchange about names is included. This is not a translation of the entire five-act play or a continuous performance script.
- The first11 speeches retain the initial meeting AI baseline. The user approved its direction and asked to continue; final polishing belongs to the user. That approval is not recorded as adoption of every line.
- Eight proposed lighting/sound cues are attached to the new Japanese. No product import or app storage write is made. A future performance needs transitions, staging choices, cue timing and an ending.

## Text and source checks

- Every English block equals its physical line range in the locally saved English source. Across each declared scene range, all nonblank lines are covered once, without overlaps or gaps. English display removes the separate speaker label; raw source data retains it.
- Source SHA256: `5a2037a19e60cccb67b3f5fc93a12cb65c58694ce6a1dc61d0d67d0d2502b3b4`.
- First meeting baseline and unique block IDs checked by the builder. Data includes source hashes and the first meeting draft hash.
- Read through the new Japanese against the English. Notes identify figurative choices, the window staging, the continued Romeo speech, wherefore, grave, the three recurring curses and the absence of an explicit stabbing direction in this saved excerpt. Performance quality remains for the user's final polishing.
- The same curse occurs3 times in both languages. Two separate cues point to occurrences1 and2 in different blocks; quotes, context and UTF-16 offsets are recorded.

## Browser and visual checks

- Chromium151.0.7922.34, desktop1440×900 and mobile390×844. All40 textareas, English displays and baseline copies match the source data. No horizontal overflow and no clipped textarea contents.
- All3 scene navigation links and translation-note disclosures work. The initial baseline disclosure shows its original text.
- Modified the second curse, exported TXT and JSON, and inspected the downloads. TXT includes all3 scenes and the changed phrase. JSON preserves English and AI baselines, records one revision, and marks only the affected cue anchor as requiring review. Restoring the baseline restores the baseline anchor status. Adoption remains false.
- No JavaScript page errors. Evidence: `qa/browser-checks.json`.
- design-lint: NG0 / WARN0 / unmeasurable0 at both widths. Minimum measured text contrast5.94:1; no measured interactive target below44px. Evidence: `qa/design-lint/report.md`.
- Visually inspected the desktop name dialogue, the long mobile Mercutio speech, mobile cue table and mobile overview. English/Japanese remain legible; paragraphs and controls fit the page. Safari, physical mobile devices and actor read-through are not validated.

## Reproduction

- In this directory run `python3 build_review.py`. The builder writes only this directory, reading the existing meeting baseline, its visual template and saved English source.
- Open `index.html` or the localhost `/translation-three-scenes/` URL. Edit Japanese fields and download before closing. There is no automatic persistence or import UI.
- `draft.json` stores the source, baseline, interpretation notes and cue proposals; `cue-proposals.json` is a standalone proposal export. Neither claims compatibility with the app's import format.
- The original `translation-draft/` page is retained, so this new combined page does not replace an open first-meeting review.
