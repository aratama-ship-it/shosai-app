# Selected-light presets — Superdesign brief

Status: proposal only. This brief does not authorize edits to Stage Sketch product code, the lighting prototype, beta, deployment, or publication.

Implementation companion (proposal only): [IMPLEMENTATION_CONTRACT.html](./IMPLEMENTATION_CONTRACT.html) / [IMPLEMENTATION_CONTRACT.md](./IMPLEMENTATION_CONTRACT.md). It fixes the selected-light attribute scope, deterministic seed/region/Undo contract, and the gate before any product-schema integration.

## User request

> 舞台スケッチで複数選択したライトに対して現在のサーチライトのようにプリセットを用意して使えるようにしたいです。もちろんあとから調整可能な形で。プリセットの種類とUIを考えてくれますか。

Follow-up, approved direction and expansion:

> はい大丈夫です。あとはライトカーテンのようなもの、そのストロボのようなものまでやりたいです。数は多くなる可能性があるのでモーダルでの表示も考えています

Additional requested families:

> サーチライトで舞台上のいろんな方向にランダムに動くもの。舞台上だけでなくお客さん側に向けてもランダムに動き回るもの（正確にはランダムに見える規則性が現実的な組み方か？）、動かないけど舞台の指定範囲を複数のライトで明るくする（全体、半分など）もほしいです

## Target and fixed context

- Target: the existing desktop lighting-design prototype at `docs/light-rig-design-2026-09-11/prototype/`, specifically the right-hand inspector shown after two or more fixtures are selected.
- This is a new contextual feature in an existing UI. Do not redesign the rest of the app.
- The current inspector is about 305px wide at 1440x900 and is already vertically dense.
- Preserve the dark desk palette, square outlined controls, restrained Japanese labels, brass selection state, and current sans/mincho stack.
- Existing top-level inspector tabs are `見本` and `調整`. Add one contextual tab so the top-level structure becomes `見本｜型｜調整`; `型` is enabled when at least two lights are selected. This base direction was accepted by the user on 2026-09-14.
- Keep the existing `まとめて変更（n灯）` controls intact. Add a compact `型から選ぶ` entry near that heading that switches to the `型` tab.
- Do not place the full preset library inline above the current controls; that would make the already long inspector harder to scan. Keep recent/frequent presets in the panel and open the full library in a modal.

## Recommended interaction

1. User selects two or more fixtures.
2. `型` becomes available and the inspector states `6灯に型を当てる`.
3. The panel shows a small recent/frequent set. `すべての型を見る（32）` opens the full library without discarding selection order or scroll state.
4. The modal provides search plus `すべて／狙い／範囲／動き／配り方／演出／点滅`. Cards show a static stage/path diagram, concrete name, and the attributes changed.
5. One click selects a modal card and exposes its static preview, scope, compatibility and settings. `この型を適用` commits it; desktop double-click may immediately apply presets that do not require flashing or region review. Flashing, audience-motion and custom-region presets never bypass the review step.
6. Applying writes actual values to compatible selected fixtures and creates one Undo step. The modal closes so the full stage is visible. Reopening returns to the previous category, query and scroll position.
7. `調整` reveals the existing detailed controls, whose values reflect the applied result. Manual edits do not break anything because the preset is not a live reference. A provenance-only status may say `扇に開く・調整あり`; reapplying resets only that preset's attribute scope.

## Attribute scope and preservation

- `狙い` changes aim surface/points only. Preserve color, intensity, beam, gobo and timing.
- `範囲` distributes static aim points across a named or user-drawn stage region. It changes aim points and beam spread; `強さもそろえる` is an explicit, default-on option. Preserve color, gobo and motion.
- `動き` changes path, period, phase/offset and relation only. Preserve color, intensity, beam and gobo.
- `配り方` changes only the named value family (color or intensity). Preserve aim and motion.
- Mixed selection must be explicit. Example: `ムービング6灯に適用・固定2灯はそのまま`.
- Unsupported cards remain visible but disabled with a concrete reason. Never fail silently.
- Preset order is deterministic. Default to physical left-to-right for lateral patterns; let the user switch to `選んだ順`. Depth patterns can state `奥→手前`.

## Initial preset library

32 total: aim 5, range 6, motion 8, distribution 4, show 4 and flash 5.

### 狙い — recommended first release

- `一点へ集める`: all compatible lights aim at one shared point.
- `横一列`: distribute aim points evenly from stage left to stage right.
- `奥から手前`: distribute aim points evenly by stage depth.
- `交差`: reverse the aim order so beams cross.
- `扇に開く`: center-origin fan with increasing spread across the selected order.

### 動き — recommended first release

- `そろえて往復`: current searchlight sweep, all together.
- `鏡`: symmetric paired motion.
- `扇・開閉`: open and close from a shared center.
- `交差して入れ替わる`: alternate opposite directions.
- `順送り`: same path with phase offsets.
- `それぞれ円`: each compatible moving light circles around its own position.
- `舞台をランダムに巡る`: smooth, apparently irregular paths constrained to the stage region.
- `舞台・客席をランダムに巡る`: smooth paths constrained to the explicitly enabled stage and audience regions.

The two random-looking motions are deterministic, seeded effects rather than frame-by-frame random jitter. A fixed seed makes the same cue reproducible; each light receives a different path, period, direction and phase. `別のばらつき` deliberately changes the seed. Expose speed, irregularity and allowed-region controls. The audience variant must not escape its explicit stage/audience masks, and this sketch does not claim venue, performer or audience safety.

### 範囲 — static multi-light coverage

- `舞台全体`: cover the full stage region.
- `下手半分`: cover the stage-left half.
- `上手半分`: cover the stage-right half.
- `前半分`: cover the downstage half.
- `奥半分`: cover the upstage half.
- `指定範囲`: distribute lights inside a rectangle or polygon drawn on the stage plan.

Distribute aim points deterministically inside the chosen region, then assign lights by physical order or shortest practical pairing to avoid gratuitous beam crossings. This is a visual drafting approximation, not a lux calculation or a guarantee of uniform illumination.

### 配り方 — second increment unless implementation cost is low

- `2色交互`: alternating A/B color.
- `色のグラデーション`: interpolate two chosen colors in order.
- `中央を明るく`: intensity peaks at the center of the ordered selection.
- `外側を明るく`: intensity peaks at both ends.

### 演出 — light-curtain family

- `ライトカーテン`: distribute narrow parallel beams as one plane; changes aim and beam width only.
- `カーテン開閉`: open/close the plane symmetrically; changes aim, motion and timing.
- `カーテン走り`: travel one active band from stage left to stage right; changes intensity timing and phase.
- `カーテン波`: offset adjacent beams to produce a wave through the plane; changes motion/timing and phase.

### 点滅 — reviewed application only

- `全灯ストロボ`: all selected compatible lights flash together.
- `交互ストロボ`: alternating A/B groups.
- `左から右ストロボ`: ordered chase from stage left to stage right.
- `中央から外ストロボ`: mirrored chase from the center outward.
- `ランダム瞬き`: deterministic seeded sparkle; replay must remain reproducible.

Flashing changes intensity/shutter timing and phase only. Preserve aim, color and movement. Thumbnails remain static. Web preview must not automatically flash; if preview is offered, cap it at three flashes per second and stop it when the dialog closes, the tab becomes hidden, or reduced motion is requested. This screen-level rule does not assert performer, audience or venue safety.

## Visual target

- Render a Stage Sketch desktop editor at 1440x900 with the stage visible and a 305px right inspector.
- Show six selected moving lights.
- Make `型` the active inspector tab.
- Keep `扇・開閉` as the last-used compact card and add `すべての型を見る（32）`.
- Open a large but bounded library modal over the editor. It contains search, seven category filters, a three-column card grid, and a persistent detail pane. Show `ライトカーテン` selected plus adjacent curtain, random-motion, range and strobe-family cards.
- The detail pane shows a static diagram, `変えるもの／保つもの`, compatibility, and the explicit apply button. Selecting a strobe-family card replaces the apply area with speed/phase controls and a high-contrast notice; it must not start flashing.
- Selecting a random-motion card shows speed, irregularity, allowed regions and `別のばらつき`, with `同じばらつきを再現` stated beside the fixed seed. Selecting a range card shows the target region, `強さもそろえる`, and `舞台図で範囲を指定`.
- Each card uses a small real-looking line/path diagram, not a marketing illustration.
- Use only the fonts, colors, spacing, and component styles defined in the design system and supplied Stage Sketch token/source context. Do not introduce gradients, glass, glow, rounded dashboard cards, a new font, or unrelated navigation.

## Accessibility and responsive behavior

- Cards are ordinary buttons, not toggle buttons; Enter/Space activates and focus stays in place.
- 44px minimum touch target, visible focus, labels plus diagrams so state never relies on color alone.
- Desktop panel: two columns for recent/frequent presets. Desktop modal: bounded to about 960×680 with the stage still visible around its edges; category rail, three-column results and detail pane.
- iPad: full-height sheet, horizontally scrollable category row, two-column results, and a sticky detail/apply footer. No hover-only information.
- Announce `扇・開閉をムービング6灯に適用しました。一つ戻すで戻せます。` through the existing live status/toast path.

## Do not add

- User-saved custom presets in the first release.
- A confirmation dialog before every application.
- A separate temporary preview state.
- Automatic propagation when the preset definition changes.
- A full-screen desktop modal with no stage context. The bounded modal must include its own static preview and close after apply so the full stage immediately returns.
- Preset names based on story or mood.
