# Viewer phone layout — 2026-09-11

Reference: stage-sketch.js `initPhoneViewerWorkspace`, style.css `html.stage-phone-viewer` and its landscape rules. Explicit user direction: use the existing iPhone PWA layout, retain Stage Sketch Viewer and blue identity.

1. Performer checks positions and scene changes on their phone.
2. The drawing and scene controls stay visible; secondary content opens on demand.
3. Existing stage rendering, personal annotations and blue Viewer identity are the core.
4. Use PWA stacked portrait drawings and a 64px landscape rail. Choose collapsible panels over the previous long document; keep one original instance of each input.
5. Preserve note storage, scene identity, 44px targets, Japanese/English, orientation and safe areas. Production release is separate from this static preview.

## Tokens

- Background #191512; panel/brand #1c272c; accent #81bfd4; emphasis #9dd4e6; text #d0c8b9. Existing viewer colours.
- Contrast measured with design-web/tools/contrast.mjs: emphasis/panel 9.44:1; text/panel 9.19:1.
- Existing serif brand 18px / 1.4; landscape 14px / 1.4; sans controls 12px / 1.5; panel headings 14px / 1.5; inputs 16px / 1.6.
- Spacing 4/8/12/16px; header 44px in both orientations; scene bar 44px; tools 48px; landscape rail 64px.
- Frame consumes remaining actual grid height. Portrait both views, landscape single front/plan; aspect handled by existing renderer, no distortion.
- Panel width min(360px, available width); portrait height max 55% of viewport, landscape available height below header. Inner scrolling and keyboard viewport resizing.
- Square corners, 1px borders, no shadow, existing 120ms button feedback, no panel animation; honour reduced motion.
- Phone activation: touch screen short edge <=600px (as main PWA) or narrow non-touch preview viewport <=600px. iPad/desktop retain original layout.

UI adaptation files are hand-authored and retained by build.mjs. No dataset or API changes.
