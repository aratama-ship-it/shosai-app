# Overnight Run Plan

## Objective

舞台スケッチ段階0として、D2正本に忠実な「ビート骨格テンプレ」を日本語UIから安全に新規ショーへ適用できるようにする。テンプレはシーン名・役割・エネルギーだけを生成し、演者・道具・照明・背景・技・装置を一切補完しない。D2でも解消しない #2 の役割数／エネルギー数の不一致は推測せず保留し、朝の判断事項へ残す。

## Scope

- Working directory: `/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`
- Ledger: `overnight-runs/2026-08-02-stage-beat-templates/`
- Writable paths: `stage-sketch.js`, `mcp-server/src/stage-model.js`, `mcp-server/src/schemas.js`, `mcp-server/src/server.js`, `mcp-server/test/`, `tests/`, `index.html`, `stage.html`, `style.css`, `stage-i18n.js`, and this ledger
- Canonical content source: `../overnight-runs/2026-07-28_stage-sketch-codex-round2-answer.md` D2
- Work order: `../overnight-runs/2026-08-02_stage-beat-templates-workorder.md`
- Baseline: branch `main`, commit `678a3a2`, clean worktree with zero modified or untracked files at 2026-08-02 22:55 JST
- Reporting time: this task's completion; no recurring automation is created

## Definition of Done

- Nine unambiguous D2 templates (#1, #3-#10) are previewable and can create a new show without touching an existing show.
- #2 remains unavailable with its exact mismatch recorded for the user; no guessed role, energy, or section treatment is introduced.
- Generated rows are ordinary scenes with `beat.role`, `beat.energy`, and empty `pieces`; section rows have `beat: null`.
- Browser normalization/export and MCP normalization/schema/store roundtrips preserve `beat`.
- Relevant syntax, existing browser tests, MCP tests, new template/model tests, build, and generated-page parity checks pass.
- Milestone 2 English localization is attempted only if all Milestone 1 conditions, including #2, can be satisfied without a user decision; otherwise it remains explicitly deferred.
- Changes are committed by milestone with Japanese messages, but nothing is pushed, deployed, or published.

## Allowed Actions

- Read project files, applicable instructions, the work order, and the D2 source.
- Edit only the scoped application, test, generated page, and ledger files.
- Run local Node, npm, Python, Git inspection, build, and test commands.
- Create intentional local commits for completed milestones.
- Use only bundled local assets and data already present in the repository.

## Prohibited Actions

- Do not push, deploy, publish, send external messages, purchase, or change secrets.
- Do not delete user data.
- Do not call AI services, add API keys, add external communication, CDN scripts, or analytics.
- Do not modify `../show-reference/data/`, regenerate `db.js`, or manually change `db.js?v=`.
- Do not implement proposal-review layers, broad `shosai-story-outline` fields, energy diagnostics, breathing ribbons, or automatic performers/props/lights/backgrounds/skills/devices.
- Do not modify D2 template content, invent sources, or resolve #2 by inference.
- Do not claim browser, visual, device, production, account, deployment, or public verification without direct evidence.

## Stop Conditions

- #2 mismatch remains unresolved after reading D2: hold only #2, record it, and continue independent safe work.
- If template content itself must change, stop that template and record the exact decision required.
- If commit `678a3a2` or the initially clean worktree changes unexpectedly, stop writes and inspect the difference.
- If an independent task is blocked, continue other scoped tasks that remain safe.
- Do not begin English localization while Milestone 1 remains incomplete because of #2.

## Team

- Coordinator: primary Codex agent; owns scope, waves, stop decisions, commits, and final report.
- Explorer: performed sequentially by the primary agent after the repository instruction requiring prior approval for subagents was discovered.
- Writer: primary Codex agent only; no other agent may edit this checkout.
- Verifier: performed sequentially and independently by the primary agent after implementation, including fresh test and diff review.
- Two read-only subagents were started before the applicable `AGENTS.md` was read, then immediately interrupted when its prior-approval rule was discovered; they made no edits and their work is not relied upon.

## Verification

- `node --check stage-sketch.js`
- `node --check stage-i18n.js` if changed
- `node --check mcp-server/src/stage-model.js`
- `node --check mcp-server/src/schemas.js`
- `node --test tests/*.mjs`
- `cd mcp-server && npm test`
- New tests: template role/energy/generated-scene equality for all implemented templates; browser/model JSON roundtrip; empty `pieces`; section `beat: null`; MCP persistence/export.
- `python3 build_stage.py`
- `python3 build_stage.py --check`
- Confirm only touched assets had their `index.html` cache versions raised and `db.js?v=` stayed unchanged.
- Inspect `git diff --check`, named diff, final status, and final ledger validation.
- `python3 /Users/arata/.codex/skills/overnight-project-runner/scripts/validate_run.py overnight-runs/2026-08-02-stage-beat-templates --final`
