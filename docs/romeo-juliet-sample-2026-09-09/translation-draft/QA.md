# Translation draft verification · 2026-09-09

## Scope and editorial review

- English source file re-read; SHA256 `5a2037a19e60cccb67b3f5fc93a12cb65c58694ce6a1dc61d0d67d0d2502b3b4`.
- All 11 saved English extracts equal their specified physical source-line ranges. Speaker labels, punctuation, spelling and stage directions are retained, with line endings normalized to LF.
- Japanese rough translation read back against those 11 extracts. Preserves the progression of shrine / pilgrims / hands / lips / prayer / sin, and Juliet's replies within Romeo's metaphor.
- Explicit editorial notes record the interpretation of `gentle sin`, the palm/palmer wordplay, the repositioned first kiss direction, and the open reading of `by the book`. The second kiss has no added stage direction.
- This is an AI baseline for revision, not a human-approved translation. No human performance/read-through has been evaluated. No copyright authorship conclusion follows from editing or export.

## Browser verification

- Chromium 151.0.7922.34 at 1440×900 and 390×844: all 11 Japanese fields fit their contents; no horizontal document overflow; displayed English and Japanese match the data.
- Opened the baseline disclosure and verified its visible text. Closed disclosures are checked with textContent, because Chromium returns empty innerText for their hidden contents. An initial verification assertion used innerText and was corrected; no content fix was needed.
- Edited the first speech, exported TXT and JSON, and inspected the downloaded bytes. TXT includes the edited Japanese and the final speech. JSON preserves every English passage and AI baseline and stores only the changed speech as userRevisionJa; adopted remains false. No script errors occurred.
- Screenshots inspected: desktop and mobile first dialogue, mobile header, desktop ending. Japanese and English are readable, and the mobile layout stacks each paired speech in order. The date was then kept on one line as a phrase; refreshed viewport checks follow in `qa/final-layout.json`.
- design-lint: NG 0 / WARN 0 / unmeasurable 0 at both sizes. Explicit contrast measurements: ink/page 14.41:1, muted/page 5.94:1, accent/page 7.02:1.
- Evidence: `qa/browser-checks.json`, `qa/design-lint/report.md` and PNGs. Validation covers local Chromium, not Safari, real mobile devices, or a human reading performance.

## Usage and boundaries

- Open `index.html` or the localhost `/translation-draft/` page. Edit Japanese fields and download TXT or JSON before closing; there is no automatic persistence or import UI.
- The static `ai-draft-ja.txt` and `draft.json` preserve the initial version. The review page does not write to Stage Sketch storage or turn a working revision into an adopted script.
- Prior Tsubouchi materials and PDF cue samples remain separate. Attaching existing cue anchors to this new Japanese version, completing other scenes, and circus/theatre show development are subsequent work.
- Rebuild this directory only with `python3 make_draft.py`; it reads the saved English source and the adjacent HTML template.
