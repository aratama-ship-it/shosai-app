# 第1場面 Stage Sketch 下書き / QA

## Confirmed

- `build_scene_01.py` generated a deterministic Stage Sketch version 3 document from `../direction-notes/scene-01-blocking-plan.json` and `../script-book/cast.json`.
- `validate_scene_01.mjs` passed the current `mcp-server/src/stage-model.js` `validateDocument` check.
- The artifact contains one section, four cue scenes, 10 cast entries, and 10 performer placements in every cue. It contains no set or lighting-fixture pieces.
- Normalized u/v positions remain within 0–1. Cue hold values total 180 seconds: 115 + 40 + 25 + 0. The final cue is an action-triggered, instant blackout.
- The JSON returned HTTP 200 through the dedicated local server. The served file reported version 3, 10 cast entries, and four total scene/section entries.
- Revision 2 records Benvolio's stopping gesture and Tybalt's challenge in all four cues. The final cue remains zero-duration and blacks out before contact; `validate_scene_01.mjs` passed after regeneration.

## Boundaries

- Status is `generated_validated_not_imported`. The artifact has not been applied to browser storage or any existing show.
- The 12m × 9m venue is a reference assumption. Actual venue geometry, wings, sightlines, and exit paths have not been supplied.
- Cast height 165cm is a required display placeholder because actor measurements are unknown.
- Route warnings are expected. The data is a blocking proposal and does not establish collision clearance, fight choreography, weapons, contact, fall technique, rigging, or performer safety.
- Lighting stores intent only. Fixture count, color, level, spot diameter, operator cue, sound, props, and rehearsal timing remain unresolved.

## Reproduce

From this directory:

```sh
python3 build_scene_01.py
node validate_scene_01.mjs
```

Browser evidence is in `../qa/scene-01-plan-browser-checks.json`, the two `scene-01-highlight-*.png` files, and the two `scene-01-map-*.png` files.
