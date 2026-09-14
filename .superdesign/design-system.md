# Stage Sketch design system — Scene panel study

## Product and job

Stage Sketch is a desktop and iPad authoring editor for planning stage scenes. In the Scene panel, a director or stage maker needs to find the active scene, create the next scene with a deliberate inheritance rule, and later organise scenes without obscuring the stage itself.

The Scene panel is an editorial working margin beside a stage, not a dashboard. A scene's motion route is geometry; it is not itself a cue, responsibility, or rehearsal duration. Transition playback speed is a display setting, not rehearsal duration.

## Existing visual system — hard constraints

- Preserve the dark desk palette: desk `#191512`, raised surface `#201b16`, outline `#382f25`, primary text `#efe7d6`, muted text `rgba(240,231,214,.55)`, rust `#a84b26`, brass `#9c823f`.
- Preserve the existing Japanese/English/Chinese-capable sans stack. No new font.
- Preserve square-to-slightly-rounded outlined controls and restrained small type.
- Use whitespace and grouping rather than new cards, gradients, glow, glass, or a generic dashboard grid.
- Functional controls have a 44px hit target in the selected-row/action context. Do not rely on hover alone; iPad needs tap access.

## Scene-panel information architecture

1. **Choose a scene** — the persistent list is the panel's primary content.
2. **Create a scene** — one visible `+ シーン` entry opens a small menu of creation modes: blank, carry set and lighting, duplicate all, or reflect route end positions. The menu explains the retained information before confirmation.
3. **Edit the active scene** — rename remains double-click. Destructive actions belong behind an explicit `…` menu for the selected scene, with a calm in-context confirmation, not a browser dialog.
4. **Transition controls** — animation lives with the top editor toolbar; deriving a route from the next scene lives beside the plan-view route tool. They do not belong in the Scene panel.
5. **Folders** — scenes must not expose nesting controls. Folder design is deferred until the model has clear operations and states; do not retain ambiguous section affordances merely because an implementation exists.

## Draft target

Redesign only the existing Scene panel at desktop width while keeping the surrounding Stage Sketch visual language. Show an active scene list, one compact create entry, a visible active-row overflow trigger, and a tiny status line. Do not fabricate new product features outside the actions listed above. Keep labels functional and concise in Japanese.

## Timeline lane settings extension

- Keep the current two-row timeline toolbar and pin one 44px settings icon at the upper-right of the source row, independent of wrapped controls.
- Open a compact 260px anchored preferences panel using the same dark desk, quiet outline, 4px radius, and small Japanese labels.
- Show seven explicit checkbox rows: 時間, 音源, シーン, 転換, ライトキュー, 音楽キュー, セリフキュー.
- This is a local display preference, not show content. Avoid a new modal, dashboard card, explanatory paragraph, gradient, or decorative motion.
- Do not duplicate show-level Save or Load actions inside the timeline toolbar; keep those operations in the Stage Sketch host UI.
- Do not duplicate Undo or Redo actions inside the timeline toolbar; keep history controls and shortcuts in the Stage Sketch host UI.
- Remove the grouped cue-add actions from the transport toolbar. Put one compact 32px SVG plus button at the right of each Lighting, Music, and Dialogue cue lane label, after the reorder handle and lane name.
- Use that same 32px SVG plus-button placement for Audio, Scene, and Transition lanes. Audio opens the host file picker; Scene inserts a blank scene after the scene at the playhead; Transition adds a four-second transition after that scene without replacing an existing duration.
- Widen the sticky lane-label column to 156px so the Japanese lane names and plus controls remain readable; cue creation still targets the current playhead.
- Label timeline cues from their containing Stage Sketch scene and their order within that scene: `LXcue 1-1-1`, `Mcue 1-1-1`, and `VOXcue 1-1-1`. Recalculate these labels from scene order instead of persisting display numbers.
- A cue double-click opens a compact 440px Stage Sketch modal showing cue name, scene, current unit position, and an editable memo. Keep Delete available both in this modal and from the selected cue via the keyboard.
- Keep playback volume out of the timeline toolbar. Reuse its single saved control in the shared Stage Sketch header immediately before Feedback, with the existing 108px range width and 44px control height; add no new toolbar row or card.
- Expand only the timeline zoom-out boundary from `0.15×` to `0.05×`, while retaining the established `1.3×` step and `12×` zoom-in ceiling. At the new minimum, a 300-second time-mode section occupies 1200px and can be surveyed on a 1440px editor without horizontal scrolling; keep the adaptive 76px ruler-label spacing so the denser overview does not create overlapping text.

## Timeline transport and audio gain extension

- In Timeline mode, Space is the direct play/pause shortcut. Do not capture it from text inputs, selects, textareas, editable content, the lane-settings popover, or any open modal; ignore key-repeat.
- A real Audio lane block is a focusable button but keeps the existing amber track-block styling. Double-click opens details; a single click does not invent a new selection state.
- Use the existing compact 440px dark Stage Sketch modal for audio details. Show the track name and duration first, followed by one gain editor; do not add a new panel or toolbar row.
- Audio gain uses a range and matching number input from `-24 dB` through `+12 dB` in `0.5 dB` steps. Display `+` for positive values and state that `0 dB` preserves source level.
- Header volume remains the shared master level. Per-track gain is saved on the audio metadata and applied independently through the playback gain stage. Preview during editing, commit once on Save, and restore the saved value on Cancel.
