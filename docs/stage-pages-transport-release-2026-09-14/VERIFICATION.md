# GitHub Pages transport synchronization verification

Status: published and checked on GitHub Pages.
App commit: 1f7e99a2d5a89b76ca5a705ebf93001ca6816c69
Test-only followup: de62944b68362a287b55a8d5a8f2731c0fff5f96
App Pages build: built at 2026-09-14T04:29:59Z.
Live HTML/sketch/timeline/SW SHA-256 match candidate (live-hashes.json).
Base: 19a6a8eca8b7767071d80400441070189253d5bf.
Scope: A05/A06/A08 transport and pose sampling. A18 reduced to one timeline pose writer, not a complete data-ownership solution.
Runtime scripts: stage-sketch 472, stage-timeline 45, SW cache 467.

## Evidence
- related-tests.tap: 216 pass.
- chromium.tap: 20 pass (11 new, 9 prior P0).
- final-audio.tap: 2 pass after the final matching-track guard change.
- before.tap: initial 9 new tests fail on the unmodified base.
- webkit.tap: 9 non-audio cases pass on the final candidate.
- webkit-audio-limit.tap: synthetic audio load fails before playback in IndexedDB, as in the prior P0 baseline. No claim of Safari audio validation.
- build_stage.py --check and syntax checks pass; stage.html remains the authoritative app entry.
- candidate.json and release.patch: explicit 9-file temporary index. Ordinary index, local branch and shared sources untouched.
- New browser contexts, synthetic project/WAV, serviceWorkers:block. No real user storage.

## Limits
Fallback editor selection still changes to the destination at transition start. Timing ownership is not unified.
Formation package/core geometry ownership and multi-song navigation are unchanged.
Continuous revolve motion during holds, mounted performers, long-show load, native devices and real Safari audio remain unverified.
Project roundtrip checks canonical u/v, route, IDs and rehearsal timing; temporary animation overlays are normalized on reload.

## Reproduce
PLAYWRIGHT_MODULE=<installed playwright path> node --test tests/stage-timeline-transport.browser.mjs tests/stage-pages-p0.browser.mjs
STAGE_TEST_BROWSER=webkit selects WebKit. STAGE_TEST_ROOT=<archive> compares a baseline.
STAGE_TEST_URL=https://aratama-ship-it.github.io/shosai-app/stage.html runs isolated synthetic tests against Pages.

## Next handoff
The shared application sources remain stale relative to GitHub. Archive current origin/main before future work; do not publish entire shared files without reconciling these fixes.
No Cloudflare operations, worker/config changes or beta deployment.

## Public browser outcome
- live-initial.tap: 10 pass, 1 timeout waiting for automatic audio readiness after reload.
- live-preload-diagnostic.tap: same readiness wait timeout; IDs and formation mapping present, playback reports loading.
- live-reload-probe.tap: explicit playback action completed.
- live-browser.tap: all 11 pass using the actual play button after reload; test-only followup preserves this user flow.
- Cause of automatic preload intermittency is unresolved; do not label that behavior fixed.
- Visuals: synthetic midpoint checked in plan and front. Report layout lint passed 390/1440 widths.

## Shared-tree integrity
Local HEAD remains 5fc1473bae251b478ff01a1996e05c789a0736d4.
Timeline/HTML/SW hashes stayed at the initial shared baseline. Shared stage-sketch.js changed concurrently with light-preset metadata work. This task wrote no shared application source; that edit was preserved. See shared-integrity.json. Future publishing must combine the current GitHub fixes with separately owned local edits.

Final Pages build: de62944, built 2026-09-14T04:37:41Z. Four served runtime hashes rechecked unchanged after the test-only followup.
