# Viewer navigation refinement — 2026-09-11

Scope: static synthetic preview only; no production Worker/beta deployment. The public preview renderer snapshot now exposes a presentation-only camera method using the original Stage Sketch seat projection. No editor or save bridge added.

- Header issue reproduced at 390×844: heading top was 0 in a 44px header. Explicit align-items:center and a 52px portrait header fix this; measured heading/header centers differ by less than 2px. Landscape remains 44px; native safe areas retained.
- Real Chromium two-touch events passed: front and plan pinch 100→200→100%, independent zoom, per-view reset, unchanged browser zoom, retained zoom on rotation, pen draft cancellation during pinch, aligned canvas/pen/sticky bounds after zoom.
- All five original seat presets produce distinct rendered images. Seat remains selected on scene changes; show data is not edited. The seat-map inset is disabled in the read-only renderer.
- Front annotations remain bound to the original central viewpoint. Alternate seats hide them; starting annotation restores central view. No notes are deleted or reprojected by approximation.
- Existing regression passed at 390×844, 844×390, 375×667, 667×375: primary controls do not overlap, local text survives rotation/reload, replay/stop, simulated sharing, pen/undo, sticky editing and scene picker work. iPad/desktop outer layout retained. No JavaScript errors.
- design-lint on portrait shell: 0 NG / 0 WARN, minimum text contrast 9.36:1. New iframe controls are covered by interaction tests and screenshots, not the outer-shell lint result.
- Screenshot attachment from the user was not received at implementation time. Physical iPhone Safari keyboard/browser bars and touch feel still need owner acceptance; emulation is not physical-device proof.

Tokens: `../../device-preview/performer-link-ui-20260911/PHONE_DESIGN.md`. Test harness has this Mac's explicit Playwright/Chrome paths; pass a URL as the first argument for live verification.

## Live proof — 2026-09-12 JST

Pages run `34613300592` succeeded for commit `ca421a6963c06eb1b8a09caad431132af48b3e45`. All 23 manifest assets returned successful HTTP responses and matched SHA-256. The navigation/touch test also passed against the public `?lang=ja&v=4` URL, including all five seat renders and both-view pinches, with no JavaScript errors. Published from an isolated worktree; unrelated shared-workspace changes were not staged.
