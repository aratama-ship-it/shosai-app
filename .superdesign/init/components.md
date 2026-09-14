# UI components

## Architecture

This is a framework-free browser application. `index.html` defines the persistent DOM; `stage-sketch.js` constructs dynamic rows and attaches interactions with DOM APIs; `style.css` contains all visual styles. There is no shared React/Vue/Svelte component directory or reusable component primitive to extract as source code.

## Relevant reusable DOM patterns

### Scene action group

- Source: `index.html:613-630`
- Category: basic
- Description: A static action group that is moved beneath the active scene row at render time. It currently contains creation, grouping, deletion, and clear-stage actions.
- State: Do not extract before redesign. The requested target is to reduce and regroup this control set.

### Scene list row

- Source: `stage-sketch.js:15190-15385`
- Category: basic
- Description: A dynamically-rendered scene/section list row with drag handle, selection, name, count, optional hierarchy controls, and summaries.
- State: Do not extract before redesign. Its inline hierarchy controls are specifically being retired in favour of a future folder model.
