# Stage Sketch UI release — 2026-09-10

User authorization: publish all completed UI changes in this task to both beta and public preview.

## Published

- Beta: https://stagesketch.pygmix.com/stage?lang=ja
- Preview: https://stagesketch-try.juggler-arata.workers.dev/try?lang=ja
- Both English entry points also checked. See release.json for deployment IDs.
- Includes print/export grouping, scene actions grouping, full screen (F), drawer, opposite-view mini, view swap (X), plan label placement, resizable panels, two-row scene navigation/description, hidden show templates, and import-only real venue choices.
- Built-in real venues are absent from the initial selector. Legacy byId resolution and imported venue data remain functional. The preview retains its pre-existing locks on import, full screen, and export.

## Deployment boundary — read before deploying again

The shared checkout contains unrelated, unfinished Study/reader and telemetry backend work. Its current worker.js and wrangler.toml were NOT deployed.

The beta release starts from the previously deployed production Worker and retains the complete existing ASSETS binding, all six bindings and values, SessionRoom namespace/migration tag, compatibility date and authentication-first routing. It embeds 24 reviewed UI text assets in release-bundle.mjs, serves those through an ASSETS adapter inside the existing authentication flow, and falls back to the retained static asset set for all other paths. Chinese UI dictionary paths were added to the authenticated guest UI allowlist. The old real-venue response rewrite was removed because the venue module now implements the desired import-safe filtering itself.

Only the frozen beta HTML and SW omit the unfinished Study-owner and usage hooks. The Study-only share section and its two-method hint are omitted/hidden in that artifact. Source index.html remains authoritative and was not reverted over another writer's work. Beta cache is stage-sketch-pwa-v238-ui20260910.

IMPORTANT: another Worker-only deployment with keep_assets but WITHOUT this adapter would serve the older retained beta UI assets again. A subsequent normal asset deployment must include the then-current generated stage.html and its complete dependencies, or retain this release adapter until that complete deployment is ready. Do not deploy an arbitrary dirty root asset tree.

Public preview was deployed independently from the frozen build_public.py output, using wrangler.public.toml and only public-dist/. 44 public files; no beta/private assets, Study backend, or telemetry were included.

## Evidence and limitations

- 894 tests passed; generated stage/public checks passed.
- 82 release adapter checks passed (GET/HEAD, auth, private fallback, venue choices).
- 70 live responses matched expected SHA-256 bytes, including all 44 public files, 24 beta files and two beta aliases.
- Four live Basic/public guards and four live Cookie checks passed.
- Public Japanese/English rendered through CUA. Scene description verified below navigation, templates hidden, seven generic venue choices, panel width handles rendered.
- Earlier local browser evidence covers beta full screen/drawer/mini/swap/import behavior. A new authenticated production beta browser session and physical-device PWA update were not manually exercised in this release turn.
- Existing English preview accessibility lock suffix contains Japanese. This was observed during publication verification and was not changed as part of the UI deployment.

The frozen release bundle and sanitized proof are kept here. Secret values, authentication headers/cookies, and Cloudflare binding values are not copied into this report.
