# 12場面 通し台本 / QA

## Confirmed

- `build_script.py` joined 12 unique scene IDs from `scene-samples/draft.json` with the matching 12 direction-note scene records.
- The generated page contains 12 table-of-contents links, 12 script panels, 12 direction panels, 10 recorded direction summaries, and 2 direction-pending states.
- Chromium returned HTTP 200 at 1440x900 and 390x844. The title and first/last scene markers matched this artifact, and neither viewport had horizontal document overflow or page errors.
- `台本のみ` hides the context and direction panels and updates both button states. `台本＋演出` restores them.
- The desktop toolbar remains sticky. The mobile toolbar is static so wrapped controls do not cover the script while scrolling.
- The cover, first scene, desktop two-column layout, and mobile single-column layout were visually inspected.
- `cast.json` records the user-confirmed production size of 10 performers for 10 unique named roles: 9 with dialogue and 1 silent movement role. Named-role doubling is not required, and there is no dedicated ensemble; the 10 performers rotate into 5 ensemble functions when their named role is available. The HTML also renders 3 groups of original-play characters whose inclusion remains omitted or unresolved.
- The cast section returned HTTP 200 at 1440x900 and 390x844, had no horizontal overflow, page errors, or console errors, and its heading and two principal cards were visually inspected at both widths.
- Scene 1 now shows 10 performers as Benvolio and Tybalt at center plus four pairs of two in the four corners. It explicitly disables left/right house encoding for this scene, keeps the center pair in eye contact while the corner brawls run, and transfers focus only after the corner fights stop and the eight performers disperse.
- The Scene 1 direction links its final script direction, `RJ-SAMPLE-01-P07` / `（二人、剣を交える）`, to the center pair's first action and immediate blackout. The current approximate target is three minutes rather than an exact cue time.
- The rebuilt Scene 1 returned HTTP 200 in both the direction notebook and script book at 1440x900 and 390x844. All required direction markers were present; the documents had no horizontal overflow, page errors, or console errors. The two-column and single-column Scene 1 layouts were visually inspected with direction details open.
- Scene 1 now assigns the eight role-holders to four anonymous crowd pairs while preserving story continuity: Romeo/Juliet role-holders reconcile upstage-left, Friar Lawrence/Friar John role-holders reconcile upstage-right, Montague/Capulet role-holders end mutually damaged downstage-left, and Mercutio/Nurse role-holders end mutually damaged downstage-right. Only Benvolio and Tybalt appear as their named characters.
- The blocking panel uses a provisional 12m × 9m reference stage and divides the approximate three minutes into four visible beats. Four-pair descriptions and the 10 normalized u/v positions remain available in collapsed details. The downstage-right pair is the final moving corner pair; its stop/dispersal, the center pair's first action, and the blackout share the 3:00 transition.
- `check_scene_01_plan.cjs` verified HTTP 200, 10 map markers, 4 retained pair cards, 10 coordinate rows, collapsed detail defaults, full/script-only switching, the served Stage Sketch v3 artifact, and the direction-notebook artifact link at 1440x900 and 390x844. Both viewports had no horizontal document overflow, page errors, or console errors. The compact highlight panel and stage map were visually inspected at both widths.

## Boundaries

- This is a sequential reading copy of short excerpts, not a full translation or continuous abridged script. Events between scenes remain omitted.
- The script remains an AI draft for the user's final revision. Browser-only unsaved revisions are not included.
- Direction details and unresolved choices come from the canonical direction notebook. Scene 1 now fixes role-holder pairings, four outcomes, a reference stage, normalized blocking positions, dispersal routes, and an approximate cue split. Performer names and body conditions, actual-venue conversion, safe fight choreography, lighting levels, sound, props, and rehearsal timing remain undecided.
- Print styling exists, but printer-specific pagination and physical output have not been tested.
- A Stage Sketch v3 draft was generated and schema-validated, but no Stage Sketch import, browser-storage write, publication, deployment, commit, or push was performed.
