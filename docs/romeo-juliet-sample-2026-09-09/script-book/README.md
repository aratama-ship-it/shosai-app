# Romeo and Juliet sequential script book

Human entry: `index.html`. This is a generated local reading copy of the 12 short script samples, current cast summary, and current direction notes. It is not a full translation, production script, or Stage Sketch import document.

Rebuild with `python3 build_script.py` from this directory. The builder reads `../scene-samples/draft.json`, `../direction-notes/scene-notes.json`, and `cast.json`, preserves their source and adoption states, and writes only `index.html` in this folder. Browser-only unsaved revisions are not available to the builder.

The page offers a cast summary, `台本＋演出` and `台本のみ` modes, a 12-scene table of contents, and print styling. The production uses 10 performers for the 10 named roles, with those performers rotating into ensemble functions when available. Scene 1 reads `../direction-notes/scene-01-blocking-plan.json` and presents a 12m×9m reference map plus a three-beat, approximately 90-second highlight. Four-pair details and exact normalized positions remain available in collapsed sections. Performer names, actual-venue transformation, safe choreography, and technical levels remain undecided.

The Scene 1 panel links to `../stage-sketch/scene-01-stage-sketch-v3.json`, which is generated and schema-validated but has not been imported into Stage Sketch.

Current browser and data checks are recorded in `QA.md`.
