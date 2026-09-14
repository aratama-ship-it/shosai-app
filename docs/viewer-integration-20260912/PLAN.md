# Stage Sketch Viewer integration — 2026-09-12

Status: plan only; no application changes or deployment in this turn. Human decision page: index.html.

## Recommendation

Integrate the approved Viewer UI into shared beta/product source, validate real invite/storage paths, and release beta first. A formal product-service launch is a separate decision: the 2026-09-10 release record says shared source updated, service not published; product URL, authentication/licensing/organization permissions remain unresolved there. This is recorded status, not a live audit of every possible product service.

## Evidence

- README.md, section 事前学習用リンク（ローカル実装・未デプロイ）: beta anonymous token flow differs from product free-reader-account flow; public trial excluded.
- docs/ui-release-2026-09-10/README.md: actual beta uses a frozen Worker and an ASSETS adapter with reviewed UI files. Root worker.js/wrangler.toml include unfinished backend changes and were not deployed. Preserve adapter or provide a complete reviewed asset payload.
- docs/release-v0.3.5-2026-09-10/release-summary.json: product shared-source-updated-service-not-published.
- Live anonymous HTTP, 2026-09-12 JST: beta /study?lang=ja and /study/api/me both 401 text/plain; public trial /study 404. These do not prove live secret/binding configuration.
- Main shared checkout has unrelated changes; status entries moved from 218 to 221 during this audit. Re-establish exact HEAD, diff ownership, remote deployment and dependency manifests before implementation. No historical count is an authorization baseline.
- UI reference: device-preview/performer-link-ui-20260911, published ca421a6963c06eb1b8a09caad431132af48b3e45. Browser evidence: docs/viewer-navigation-20260911/verification.md. Physical Safari acceptance remains separate.

## Work packages and acceptance

1. Freeze release baseline in an isolated checkout. Inventory current Worker version, reviewed assets, bindings and migrations read-only; preserve current auth, session and public/private routing. Exclude unrelated work and private workspace documents.
2. Merge only UI deltas into current authoritative sources. Proposed production names: stage-study-phone.{css,js}, stage-study-navigation.{css,js}. Update study.html, build_study.py, precise study-links.js public asset allowlist and versioned references. Merge renderer camera API and inset removal, frame event routing, pen/sticky transform and capture adjustments without overwriting newer canonical renderer work. Build stage.html/study-frame.html through generators, never edit generated files as source. Do not copy preview-adapter.js, mock APIs, fake token or sample auto-loading. Update cache dependencies and release notes after selecting the release version.
3. Validate against actual local Worker storage: owner creates invite; beta reader opens without account; private notes stay private; explicit share reaches only the owner; published revision appears; revoked link stops access; different owners cannot read each other's data. Check invalid/expired tokens and bounded image input, frame sandbox, auth and no-store behavior. Preserve editor source data and existing annotations.
4. Run UI regression in portrait/landscape, iPad and desktop, Japanese/English, keyboard open, failed storage/loading, and old cache. Use real two-touch events, verify canvas/pen/sticky alignment and captured visible region. Test all five seat presets and non-standard venues; preserve scene/orientation zoom. Non-central front views must not display central-view annotations misleadingly; starting annotation returns to central with a clear indication. Verify current tests/builds; repeat a physical iPhone/iPad smoke check before announcement.
5. Beta release: configure only required Study storage/migrations after comparing live state; beta anonymous mode requires both beta and anonymous flags. Google login is not needed in this beta flow. Do not include unfinished telemetry incidentally. Preserve current ASSETS adapter or replace with a complete reviewed asset manifest. Record rollback Worker/assets/config; do not delete new durable storage on rollback. Check live bytes/hashes and a synthetic real invite end-to-end, including revoke, existing owner login and private-path denial.
6. Product: shared UI can be ready now. Before a separate service launch, settle actual URL and owner access/licensing rules, configure free-reader authentication/Google callback and required storage, and test account separation and note sync. Do not silently make product anonymous or rename the public trial as product. Publish and announce product availability only after that deployment is verified.

Stop before deployment if live migration state, current asset ownership, required product configuration, or authorization boundaries cannot be established. Report the exact missing decision; no DNS/account-policy changes are implied by this plan.

## Design contract / token sheet

The approved source is ../../device-preview/performer-link-ui-20260911/PHONE_DESIGN.md, with its final Device feedback refinement superseding initial header height.

Five design questions: (1) performers checking stage positions before rehearsal on phones; (2) immediate orientation with drawings dominant; (3) existing stage renderer, personal annotation and blue Viewer identity; (4) keep iPhone PWA portrait/landscape structure, omit the redundant seat-map inset and permanently expanded secondary panels; (5) preserve safe areas, accessibility, local-note ownership, explicit sharing, Japanese/English and tablet/desktop behavior. Compare UI-only copy, beta-first integration, and simultaneous product launch: choose beta-first because static API mocks cannot establish real service readiness.

Production values retained: bg #191512, panel #1c272c, accent #81bfd4, emphasis #9dd4e6, text #d0c8b9; brand 18px portrait / 14px landscape; header 52px / 44px plus safe area; local view rows 44px; bottom tools 48px; landscape rail 64px; gaps 4/8/12/16px; touch targets >=44px; pinch 1–4x. No new visual direction.

Decision-page tokens: same panel/text/emphasis palette; body 16px/1.7, h1 28px/1.4, h2 20px/1.5; system sans; letter spacing 0; max width 760px; 1 column; spacing 8/16/24/32px; square corners; 1px emphasis borders; no shadow or animation; buttons >=44px. Contrast measured 2026-09-12 using design-web contrast.mjs: text/panel 9.19:1, emphasis/panel 9.44:1. Decision controls are local only and do not authorize deployment or submit messages.

## Twitter/X draft — only after beta deployment and checks

舞台スケッチβ版を更新しました！
演者へリンクを送って、スマホで舞台図を確認できる「Stage Sketch Viewer」を追加。
縦・横表示、客席視点の切り替え、ピンチ拡大に対応。自分用メモや図への書き込みもできます。
#舞台スケッチ

Do not post this as completed before release. It deliberately makes no claim of a published product service, account sync in beta, or offline support. No external posting performed.
