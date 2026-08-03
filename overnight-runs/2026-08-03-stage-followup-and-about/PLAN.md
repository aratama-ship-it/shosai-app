# Overnight Run Plan

## Objective

舞台スケッチの段階0ビート骨格テンプレートを10種すべて利用可能にし、日本語正本に沿った英語表示を完成させる。その完了とコミットを確認した後、本人承認済みの日本語・英語本文を一字一句変えずに独立した「このアプリについて」モーダルへ実装する。2件を別wave・別コミットとして検証し、push・公開・デプロイは行わない。

## Scope

- Working directory: `/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`
- Ledger: `overnight-runs/2026-08-03-stage-followup-and-about/`
- Work order Wave 1: `../overnight-runs/2026-08-03_stage-beat-templates-followup-workorder.md`
- Work order Wave 2: `../overnight-runs/2026-08-03_stage-about-workorder.md`
- Canonical template source: `../overnight-runs/2026-07-28_stage-sketch-codex-round2-answer.md` D2
- Canonical About copy: `../2026-08-03_舞台スケッチ_このアプリについて_約1000字版.md` and `../2026-08-03_舞台スケッチ_このアプリについて_英語版.md`
- Writable application paths: `index.html`, generated `stage.html`, `style.css`, `stage-sketch.js`, `stage-i18n.js`, relevant files under `tests/`, and this ledger
- Baseline: branch `main`, commit `1dbbe4a0ca0740dc8602eac3a1ed5e6c0a53f39d`, at 2026-08-03 12:20 JST
- Baseline cache versions: `style.css?v=123`, `stage-i18n.js?v=34`, `stage-sketch.js?v=173`, `db.js?v=79`
- Pre-existing user changes outside scope: modified `README.md` SHA-256 `39174f0f9ed1ee29d633f9aae6c931545f8f1179386676219f232555ffed5be1`; untracked `docs/IPAD_DEVICE_TEST.md` SHA-256 `686074e4c483efe5d8ed18e76ef5c30962da877a4efb9da8c26bde85ef02f14d`
- Reporting time: completion of both waves in this task; no recurring automation is created

## Definition of Done

- Wave 1: template #2 generates nine ordinary scenes; scene 5 has `role: "休憩"`, `energy: 4`, and empty `pieces`; all ten templates are selectable and retain existing behavior.
- Wave 1: all ten template names, role names, template-picker copy, dynamic announcements, and `休憩` display appropriately in English without duplicate `TEXT` keys.
- Wave 1 is fully tested and committed locally as the first work-order commit before Wave 2 begins.
- Wave 2: an independent About modal opens from both the header and the preferences modal, displays the approved Japanese and English copy without wording or paragraph changes, and closes by its close button and backdrop.
- Wave 2 reads the live `index.html` cache versions after Wave 1 and increments only assets actually changed; it does not trust the stale work-order baseline.
- Wave 2 is fully tested and committed locally as the second work-order commit.
- Generated-page parity, syntax, browser tests, MCP tests, local browser checks, named diff review, and final ledger validation pass.
- The two pre-existing user changes remain byte-identical and unstaged; no push, deployment, publication, external message, deletion, `db.js` regeneration, or canonical data edit occurs.

## Allowed Actions

- Read project files, instructions, work orders, canonical local sources, and prior run evidence.
- Edit only the scoped application, test, generated page, and ledger files.
- Run local Node, npm, Python, Git inspection, build, test, and local browser verification commands.
- Create exactly separated local commits for the two work orders, staging named files only.
- Use bundled local assets and project data already present in the workspace.

## Prohibited Actions

- Do not push, deploy, publish, send external messages, purchase, or change secrets.
- Do not delete user data.
- Do not stage, edit, or commit `README.md` or `docs/IPAD_DEVICE_TEST.md`.
- Do not modify `../show-reference/data/`, regenerate `db.js`, or manually change `db.js?v=`.
- Do not add AI calls, external communication, CDN scripts, analytics, API keys, or new product scope.
- Do not change the nine existing template definitions, invent template content, or give `休憩` a special row kind.
- Do not summarize, rewrite, reorder, or otherwise change the approved About copy.
- Do not claim device, production, deployed, or public verification without direct evidence.

## Stop Conditions

- Stop writes and inspect if the baseline or the two protected user files change unexpectedly.
- Stop the affected wave and record evidence if template content must change beyond the explicit #2 decision.
- Stop Wave 2 if the About modal conflicts with existing IDs, modal behavior, focus handling, z-index, or confirmed translation keys.
- Record any direction-changing decision for the user; do not invent authority.
- Continue independent safe checks when one verification path is unavailable.

## Team

- Coordinator: primary Codex agent; owns scope, wave ordering, commits, stop decisions, and final synthesis.
- Explorer: primary Codex agent in a read-only pass before each wave.
- Writer: primary Codex agent only; no concurrent writer or subagent is used.
- Verifier: primary Codex agent in a fresh sequential pass after each implementation, including tests, browser evidence, and named diff review.

## Waves

### Wave 1 — Beat template #2 and Milestone 2 English localization

- Read `STATE.md` and confirm `HEAD`, protected-file hashes, and live cache versions.
- Implement template #2 as nine ordinary scenes with the fifth beat `休憩 / 4`, empty pieces, and no special kind.
- Remove the held/disabled picker state and align its generated-count copy with other templates.
- Complete English localization for all ten template names, role names, picker copy, `休憩` as `Intermission`, and dynamic announcements without duplicate keys.
- Add or update focused tests for ten-template generation, #2 semantics, English coverage, JSON persistence, empty pieces, and section behavior.
- Regenerate `stage.html`; run all Wave 1 verification.
- Commit only Wave 1 application, tests, generated page, and ledger updates with a Japanese message explaining what and why. Do not push.

### Wave 2 — About This App modal

- Begin only after the Wave 1 commit exists. Read `STATE.md`, confirm live `HEAD`, protected-file hashes, and the actual cache versions in `index.html`.
- Add `stage-about-modal` to `index.html` using the existing modal structure; regenerate `stage.html` rather than editing it directly.
- Add the header button and preferences-modal link, shared open/close/backdrop behavior, approved Japanese and English copy, and visually distinct developer credit.
- Preserve the approved paragraph text exactly; use existing `Stage Sketch`, `plan view`, and `front view` wording from the approved English source.
- Increment cache versions from the live post-Wave-1 values only for files actually changed; leave `db.js?v=79` unchanged.
- Add focused automated coverage where practical, regenerate `stage.html`, and run all Wave 2 verification including Japanese and English local browser checks.
- Commit only Wave 2 application, tests, generated page, and final ledger updates with a separate Japanese message explaining what and why. Do not push.

## Verification

- `node --check stage-sketch.js`
- `node --check stage-i18n.js`
- `node --check` for every other changed JavaScript file
- `node --test tests/*.mjs`
- `cd mcp-server && npm test`
- `python3 build_stage.py`
- `python3 build_stage.py --check`
- Check `stage-i18n.js` for duplicate `TEXT` keys and confirm every required Japanese template label has an English value.
- Focused assertions for template #2: nine scenes, fifth `休憩 / 4`, empty `pieces`, ordinary editable scene shape, ten selectable templates.
- Local browser Wave 1: generate #2 and inspect the nine scenes; switch to English and inspect all ten names/roles plus Intermission; capture console evidence.
- Local browser Wave 2: open About from both entry points, compare Japanese and English paragraphs to the approved sources, close with button and backdrop, and inspect console evidence.
- Confirm Wave 2 increments from the live cache versions left by Wave 1 and `db.js?v=79` remains unchanged.
- `git diff --check`, named diffs, named staging, commit-content review, final `git status --short`, and protected-file SHA-256 comparison.
- `python3 /Users/arata/.codex/skills/overnight-project-runner/scripts/validate_run.py overnight-runs/2026-08-03-stage-followup-and-about`
- `python3 /Users/arata/.codex/skills/overnight-project-runner/scripts/validate_run.py overnight-runs/2026-08-03-stage-followup-and-about --final`
