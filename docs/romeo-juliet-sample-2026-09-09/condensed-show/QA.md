# QA

- `outline.json` maps source scenes 1–12 exactly once into three scenes, with previous-five-scene grouping [[1],[2,3,4],[5]].
- The generated HTML identifies the user's regrouping and distinguishes the connective staging as an assistant proposal.
- All 19 previous internal cue IDs are retained, with the middle 11 grouped into three readable phases. On 2026-09-10, the revenge summary was corrected to match the source script's intervention-before-wounding order. The previous five-scene JSON and HTML are archived alongside the current version.
- The existing 12-scene script, direction notes, and Scene 1 Stage Sketch draft remain separate source artifacts.
- Chromium returned HTTP 200 at 1440×900 and 390×844. Both viewports showed three scenes with no horizontal overflow, page errors, or console errors.
- `qa/browser-checks.json` records the served page check. The desktop overview and mobile Scene 2 flow were visually inspected.
- Source script link labels now point to the three-scene structure. Source dialogue and the three-minute opening blocking remain, with the central contrast refined to Benvolio's stopping gesture and Tybalt's challenge before blackout.

## Opening cue revision · 2026-09-11

- `RJ-COND-01-A` now identifies Benvolio as trying to stop the four-corner brawl and Tybalt as refusing that action. `RJ-COND-01-B` blacks out when Tybalt turns the gesture into a challenge, before contact.
- The four-corner structure, central spotlight, approximate three-minute duration, and transition into the masquerade are unchanged. No source dialogue was edited.

## Scene 2 composition · 2026-09-10

- `scene-02/script.json` contains 11 existing cue IDs and 60 script items, including 27 spoken turns. Two spoken turns are explicitly marked as new assistant bridge proposals.
- All 69 reused Japanese source lines were compared against `scene-samples/draft.json`; its SHA-256 still matches the composition's source snapshot. The original twelve-scene dialogue was not edited.
- Ten cast members suffice; the father/daughter confrontation lists only those two performers. The messenger-role transfer to Benvolio is labelled as an assistant adaptation, not an accepted user decision.
- Manual continuity review preserves intervention → wounding → immediate revenge, secret wedding night → dawn → exile, false-death news arriving before the undelivered plan, and the next scene's audience-left tomb.
- `scene-02/qa/browser-checks.json`: final HTML served HTTP 200 at 1440×900 and 390×844, with no overflow or browser errors; all-notes toggling, print-media script visibility, local links and anchors passed. Desktop opening and mobile dialogue screenshots were visually inspected.
- `scene-02/qa/design-lint/report.md`: before the final name-wrapping adjustment, NG 0 / WARN 0; lowest measured contrast 5.94:1. The final wrapping adjustment was checked in the viewport run above; palette and typography were unchanged.
- Physical blocking, skill selection, timing and the user's final prose revision remain open. No Stage Sketch import or public deployment was performed.

## Scene 2 revision 2 · offstage search

- RJ-NOTE-0029 replaces the Nurse's call in the promise/marriage movement with an unnamed person searching loudly from the theatre wing. The exact words and the lovers' response are draft wording; the direction itself is the user's instruction.
- No new performer is added. The voice performer is unassigned, selected from the existing cast available offstage. The seven anonymous backs in the wedding remain.
- The later eight cues and original twelve-scene source JSON were compared with the pre-edit snapshot and are unchanged. One formerly verbatim source line is now an explicitly labelled adaptation; the old line is retained in revision history.
- `scene-02/qa/voice-v2-checks.json` records HTTP 200, the revised anonymous voice, no Nurse character label anywhere in the promise/marriage movement, and no overflow at 1440×900 and 390×844. Screenshots include the revised line and expanded direction note.

## Scene 2 revision 3 · scenery crew voice

- RJ-NOTE-0030 assigns the existing offstage search voice to the scenery crew. The specific crew member is unassigned; actor roles and later cues are unchanged.
- The source script hash is unchanged. HTTP 200 served bytes match the generated v3 HTML, including the 大道具さん speaker and crew assignment, with no obsolete actor-pool assignment in the rendered page. This was a text/data change; viewport checks were not repeated.

## Scene 2 revision 4 · window-to-wedding transition

- `RJ-NOTE-0035` fixes the physical transition across `RJ-COND-02-A` through `RJ-COND-02-C`: no blackout; separate exits after the crew call; Friar Lawrence and a seven-person back-facing row first; separate audience-left/audience-right diagonal entrances for Romeo and Juliet.
- The three-cue data, the condensed outline, the direction notebook, the script draft, and the visual layout reference the same sequence. The visual layout records the updated Scene 2 script SHA-256.
- Static data assertions passed. The B and C visual frames passed design-lint at 390×844 and 1440×900 with NG 0 / WARN 0. Exact steps, speed, lighting levels, and physical blocking remain rehearsal decisions.
