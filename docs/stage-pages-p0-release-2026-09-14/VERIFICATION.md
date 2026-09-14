# GitHub Pages P0 release verification

Published commit: b01f10c8228d3c7996cee3e6b77eac71b0b10660
Parent: 5bf35eadf2a47524f6be971d91b870f8c75dee51
Target: https://aratama-ship-it.github.io/shosai-app/stage.html
GitHub Pages build: built, 2026-09-14T03:55:07Z.
Cloudflare: no deploy, configuration write, or account operation. worker.js and wrangler.toml unchanged.

## Scope
A01 migration backup failure, A02 same-ID import exception, A04 one-track timeline crossing an unassigned scene.
No persisted schema or scene assignment changes. Runtime-only audio context. Remaining audit issues are not claimed fixed.

## Checks
- Audit's 20 selected test files: 259 passed.
- Chromium E2E: 9 passed. Test and synthetic fixture included in the commit.
- WebKit: 7 passed, 2 audio cases blocked by IndexedDB audio storage failure.
- Original GitHub source fails at the same save step; direct Blob and File puts also fail in the isolated WebKit runtime.
- Cause beyond this runtime boundary is not determined; do not call Safari validated.
- Published Pages: 3 primary E2E cases passed with fresh contexts and synthetic storage, SW blocked.
- Published HTML, sketch JS, timeline JS, SW match candidate SHA-256.
- build_stage.py --check passed. Temporary-index diff --cached --check passed. Explicit 8-file allowlist matched.
- No rebase, pull, merge, reset, normal-index staging, or shared-tree source mutation.

## Reproduction on this Mac
Playwright: /Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
Run PLAYWRIGHT_MODULE=<path> node --test tests/stage-pages-p0.browser.mjs from published source.
STAGE_TEST_BROWSER=webkit selects WebKit. STAGE_TEST_ROOT permits comparison with an unmodified archive.

## Handoff
Shared app sources remain at the previous version. Read latest origin/main before the next candidate.
Use release.patch or published files to preserve fixes while retaining unrelated dirty work. Never publish stale full files.
The report reuses the reviewed audit tokens; it is local only, not among the 8 public files.

Report QA: design-lint at 390 and 1440 pixels passed with NG 0, WARN 0, unavailable 0.
