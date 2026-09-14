# Viewer phone preview validation — 2026-09-11

Scope: `device-preview/performer-link-ui-20260911/` only. Uses existing synthetic sample and original annotation handlers. No production Worker, beta authentication, sharing endpoint or main PWA changes.

- Chrome mobile emulation: 390×844, 844×390, 375×667, 667×375. No horizontal overflow, overlapping primary controls or primary targets below 44×44px. Frame sizes respectively 390×708, 780×346, 375×531, 603×331.
- Passed scene retention on rotation, local notes after rotation and reload, front/plan switching, replay/stop, simulated sharing (no external submission), pen drawing/undo, pinned note creation/position mode, scene picker and English controls.
- iPad 820×1180 and desktop 1440×900 retain the original sidebar layout.
- No page JavaScript errors during interaction test.
- Slow-frame regression: held the renderer script for 2.5 seconds, confirmed navigation remains disabled until the frame is ready, then the first Next click selects scene 2. This fixes an ignored early click reproduced during live verification of the first deployment.
- design-lint initial portrait: 0 NG, 0 WARN; text contrast minimum 9.36:1. Expanded panel behavior separately tested, not covered by the lint summary. Canvas readability inspected in colour and grayscale screenshots, not measured by lint.
- Physical iPhone/iPad Safari, keyboard and safe-area behavior require the user's device check. Browser emulation is not physical-device validation.

`check-viewer-phone.mjs` is a local replayable check with explicit local Playwright/Chrome paths. Pass an alternate URL as its first argument for live verification.

Design tokens: `../../device-preview/performer-link-ui-20260911/PHONE_DESIGN.md`.

## Live proof

- Published commit `6c029176f8ca356b32216964d4001b81e22f790d`; Pages run `34611232382` succeeded.
- Live `index.html`, `phone.css` and `phone.js`: HTTP 200 and SHA-256 matches to the local manifest.
- Re-ran the full interaction and four-size layout test against `https://aratama-ship-it.github.io/shosai-app/device-preview/performer-link-ui-20260911/?lang=ja&v=3`: all passed, no JavaScript errors; iPad/desktop original layout retained.
- Published from an isolated worktree based on remote main, preserving the newer friend-test page and unrelated dirty workspace files. Main working checkout was not reset or merged.
