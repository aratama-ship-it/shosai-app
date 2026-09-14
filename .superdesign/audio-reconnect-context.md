# Stage Sketch timeline audio reconnect context

## Existing product surface

- Framework-free browser application. `index.html` is authoritative; `stage.html` is generated.
- Timeline mode is a bottom panel inside the existing Stage Sketch editor, not a separate page.
- The Audio lane has a sticky 156px label column and one full-duration amber audio block.
- Dark desk tokens: `#191512`, raised `#201b16`, outline `#382f25`, text `#efe7d6`, muted `rgba(240,231,214,.55)`, rust `#a84b26`, brass `#9c823f`.
- Controls use quiet outlines, 3-4px radius, Japanese small type, and 44px touch targets where practical.
- Do not add gradients, glow, glass, decorative cards, a toolbar row, or a separate recovery panel.

## Existing audio block

Normal connected state:

```text
┌──────────────────────────────────────────────────────────┐
│ 継ぎ目の庭                                               │
└──────────────────────────────────────────────────────────┘
```

The block fills the duration from time zero and opens Audio Details on double-click. Its current CSS uses a translucent brass fill and border.

## New missing-audio state to design

- Preserve the original block width, timing, title, scene links, cues, transition data, gain, and track ID.
- In the same audio block, show a clearly recoverable but calm missing state.
- Primary text: `音源が見つかりません`.
- Secondary text should retain the registered title, e.g. `継ぎ目の庭`.
- Provide one explicit `読み込み直す` control inside the block, ideally with a small file/refresh SVG and text.
- It must be understandable without hover and usable on iPad-sized touch targets, while staying compact at short timeline zoom widths.
- A missing state is not the same as `音源未設定`; do not make it look like an empty lane.
- Do not use a generic warning modal as the primary entry point. Recovery begins from this exact missing block.
- If the block is too narrow, preserve the warning icon and a compact relink affordance; allow text to truncate without overlap.
- The existing details modal remains for connected audio only.

## Recovery behavior already implemented in the host

- Existing file policy validation is reused.
- The host probes playable duration before writing.
- The host compares registered title and duration. A changed title, or a duration difference over the existing tolerance, asks for confirmation.
- On success, the Blob is written back to IndexedDB using the same track ID. It must not create a new track, song, scene, or cue.
- Browser beta restrictions still apply; native builds may use the wider file policy.

## Draft scope

Create one desktop design showing the current Stage Sketch timeline panel with the Audio lane in the missing state. Keep the rest of the editor and timeline unchanged enough to establish context. Focus on the inline missing-audio block, its hierarchy, compact behavior, and its relationship to the existing lane label.
