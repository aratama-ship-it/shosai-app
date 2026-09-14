# Extractable components

## ScenePanel

- Source: `index.html:591-636`, `stage-sketch.js:15190-15385`
- Category: layout
- Description: Contextual panel for choosing scenes and performing scene-related actions.
- Extractable props: `activeSceneName`, `sceneCount`, `hasTransitionRoute`, `hasSelection`.
- Hardcoded: dark desk visual tokens, Japanese action labels, stage-specific icons.
- Status: Candidate only. Do not extract before the proposed scene-create and folder interaction model is chosen.

## SceneRow

- Source: `stage-sketch.js:15203-15385`
- Category: basic
- Description: Selectable/draggable scene list item with optional status summaries.
- Extractable props: `title`, `active`, `placedCount`, `energy`, `hasLightSummary`, `hasAudioSummary`.
- Hardcoded: row structure, drag handle, current scene typography.
- Status: Candidate only. Current nesting icons are explicitly out of scope for future use.
