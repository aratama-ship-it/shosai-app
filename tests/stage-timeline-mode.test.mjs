import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("stage.html", root), "utf8");
const css = await readFile(new URL("style.css", root), "utf8");
const timeline = await readFile(new URL("stage-timeline.js", root), "utf8");
const sketch = await readFile(new URL("stage-sketch.js", root), "utf8");
const worker = await readFile(new URL("worker.js", root), "utf8");
const sw = await readFile(new URL("stage-sw.js", root), "utf8");

test("通常・タイムライン・3Dは舞台編集画面の上で同列に選べる", () => {
  assert.match(html, /id="stage-workspace-normal"[\s\S]*?>通常モード<\/button>/);
  assert.match(html, /id="stage-workspace-timeline"[\s\S]*?>タイムラインモード<\/button>/);
  assert.match(html, /id="stage-freecam-open"[\s\S]*?data-stage-workspace-launch="3d"[\s\S]*?>3Dモード<\/button>/);
  assert.match(html, /id="stage-timeline-panel"[\s\S]*?hidden/);
  assert.match(timeline, /document\.body\.classList\.toggle\("stage-timeline-mode"/);
  assert.match(timeline, /panel\.hidden = next !== "timeline"/);
});

test("3Dモードは既存カメラを開き、閉じると直前の2Dモード表示へ戻る", () => {
  const centre = html.match(/<div class="stage-center-bar">[\s\S]*?<p class="stage-tool-hint"/)?.[0] || "";
  assert.doesNotMatch(centre, /id="stage-freecam-open"/);
  assert.match(sketch, /function setFreecamWorkspaceActive\(active\)/);
  assert.match(sketch, /openFpv\(undefined, "free", els\.freecamOpen, true\)/);
  assert.match(sketch, /if \(workspace3d\) setFreecamWorkspaceActive\(false\)/);
});

test("モード切替は舞台スケッチの題と同じヘッダー行に置く", () => {
  const stageHeader = html.match(/<header class="stage-sketch-head">[\s\S]*?<\/header>/)?.[0] || "";
  assert.match(stageHeader, /class="stage-brand-row"[\s\S]*?id="stage-sketch-title"[\s\S]*?id="stage-workspace-tabs"[\s\S]*?<\/div>/);
  assert.doesNotMatch(stageHeader, /<\/header>[\s\S]*?<nav class="stage-workspace-tabs"/);
  assert.match(css, /\.stage-brand-row \{[\s\S]*?display: flex;[\s\S]*?align-items: flex-end;/);
  assert.match(css, /\.stage-workspace-tabs \{[\s\S]*?margin-left: 16px;/);
});

test("パネルは複製せず、モードごとの一列・二列設定で同じDOMを並べ直す", () => {
  assert.doesNotMatch(timeline, /cloneNode|state\.layout|panelSingleOrder|applyDocumentString/);
  assert.match(timeline, /同じDOMを保ったまま/);
  assert.match(html, /data-stage-workspace-mode="normal" data-stage-panel-layout-default="split"/);
  assert.match(html, /data-stage-workspace-mode="timeline" data-stage-panel-layout-default="single"/);
  assert.match(sketch, /const workspaceModeDefinitions = \(\) =>/);
  assert.match(sketch, /prefs\.panelLayoutByWorkspace/);
  assert.match(sketch, /select\.dataset\.stageWorkspacePanelLayout = definition\.key/);
  assert.match(timeline, /stage-workspace-mode-change/);
  assert.match(sketch, /addEventListener\("stage-workspace-mode-change"[\s\S]*?applyLayout\(\)/);
});

test("タイムラインモードは平面を初期値にし、正面・平面・両方を選べる", () => {
  assert.doesNotMatch(timeline, /restrictViewOptions|option\.hidden|option\.disabled/);
  assert.match(timeline, /ui\.normalView = outgoingView/);
  assert.match(timeline, /\["front", "plan", "both-front", "both-plan"\]\.includes\(ui\.timelineView\)[\s\S]*?: "plan"/);
  assert.match(timeline, /if \(mode === "timeline"\) ui\.timelineView = value/);
  assert.match(timeline, /setStageView\(target\)/);
  assert.match(html, /option value="both-front"/);
  assert.match(html, /option value="both-plan"/);
  assert.match(css, /body\.stage-timeline-mode \.stage-canvas-close \{ display: none; \}/);
});

test("保存済みミュージックシンクの複数楽曲・シーン・転換を時間軸へ読む", () => {
  assert.match(timeline, /Array\.isArray\(formation\.songs\)/);
  assert.match(timeline, /saved\.audioTrackBySong && saved\.audioTrackBySong\[song\.id\]/);
  assert.match(timeline, /scene\.formationLink\.sourceSegmentId === group\.id/);
  assert.match(timeline, /const transitions = groups\.slice\(1\)/);
  assert.match(timeline, /ui\.songBySection/);
  assert.match(html, /id="stage-timeline-song-select"/);
});

test("転換は次シーンに入る前の区間としてシーン行にも示す", () => {
  assert.match(timeline, /function withSceneTransitionPhases\(segments, transitions\)/);
  assert.match(timeline, /sceneEnd: segment\.end/);
  assert.match(timeline, /source\.sceneEnd = Math\.max\(source\.start, Math\.min\(source\.sceneEnd, transition\.start\)\)/);
  assert.match(timeline, /placeBlock\(button, segment\.start, sceneEnd\)/);
  assert.match(timeline, /className = "stage-timeline-scene-transition-marker"/);
  assert.match(timeline, /転換開始.*次のシーンへ/);
  assert.match(css, /\.stage-timeline-scene-transition-marker \{[\s\S]*?repeating-linear-gradient/);
});

test("同じセクションのシーン間には0秒でも転換ポイントを必ず示す", () => {
  assert.match(timeline, /if \(index < scenes\.length - 1\) transitions\.push\(\{/);
  assert.match(timeline, /title: travel > 0 \? tx\("転換"\) : tx\("転換ポイント"\)/);
  assert.match(timeline, /sourceSceneId: scene\.id,[\s\S]*?targetSceneId: scenes\[index \+ 1\]\.id,[\s\S]*?isPoint: travel <= 0/);
  assert.match(timeline, /transition\.sourceSceneId[\s\S]*?segment\.sceneId === transition\.sourceSceneId/);
  assert.match(timeline, /stage-timeline-transition-block[\s\S]*?if \(isPoint\) block\.classList\.add\("is-point"\)/);
  assert.match(css, /\.stage-timeline-transition-block\.is-point \{[\s\S]*?width: 3px !important/);
  assert.match(css, /\.stage-timeline-scene-transition-marker\.is-point::after,[\s\S]*?rotate\(45deg\)/);
});

test("タイムライン再生は絶対位置を本体へ渡し、音源時計を描画ごとに読む", () => {
  assert.match(sketch, /setTimelinePosition\(position\)/);
  assert.match(timeline, /function timelineTransitionAt\(seconds\)/);
  assert.match(timeline, /bridge\.setTimelinePosition\(\{/);
  assert.match(timeline, /syncTimelinePlaybackScene\(els\.audio\.currentTime\)/);
  // Timing, pause, backward seek and curve behavior are exercised in stage-timeline-transport.browser.mjs.
});

test("シーンと転換の左右端をドラッグして長さを変え、後続のキューも追従させる", () => {
  assert.match(timeline, /function timelineContentCanResize\(\)[\s\S]*?timeline\.source === "fallback"/);
  assert.match(timeline, /stage-timeline-block-resize-handle is-\$\{edge\}/);
  assert.match(timeline, /part: precedingTransition \? "transition" : "hold"/);
  assert.match(timeline, /part: "hold",[\s\S]*?boundarySeconds: transition\.start/);
  assert.match(timeline, /part: "transition",[\s\S]*?boundarySeconds: transition\.end/);
  assert.match(timeline, /function continueBlockResize\(event\)[\s\S]*?setTimelineScenePartDuration/);
  assert.match(timeline, /rippleFromSeconds: resizing\.descriptor\.boundarySeconds/);
  assert.match(sketch, /setTimelineScenePartDuration\(sectionId, sceneId, part, value, sectionDurationValue, options = \{\}\)/);
  assert.match(sketch, /cue\.sectionId === section\.id[\s\S]*?cue\.atSeconds = Math\.max\(0/);
  assert.match(css, /\.stage-timeline-block-resize-handle \{[\s\S]*?cursor: ew-resize/);
  assert.match(timeline, /function updateBlockResizeIndicator\(event, deltaSeconds\)[\s\S]*?toFixed\(1\).*?秒/);
  assert.match(css, /\.stage-timeline-resize-delta \{[\s\S]*?position: fixed;[\s\S]*?pointer-events: none;/);
});

test("0秒転換も右側の広いドラッグ域から転換時間を作れる", () => {
  assert.match(timeline, /if \(isPoint\) \{[\s\S]*?block\.classList\.add\("is-expandable-point"\)[\s\S]*?addTimelineResizeHandle\(block, "end", \{[\s\S]*?part: "transition"/);
  assert.match(timeline, /転換ポイント[\s\S]*?右へドラッグして転換を作る/);
  assert.match(css, /\.stage-timeline-transition-block\.is-point\.is-expandable-point \.stage-timeline-block-resize-handle\.is-end \{[\s\S]*?width: 24px/);
  assert.match(css, /is-expandable-point \.stage-timeline-block-resize-handle\.is-end::before \{[\s\S]*?content: "\+"/);
  assert.match(timeline, /function beginBlockResize\(event, descriptor\)[\s\S]*?lockedTimelineSceneAfter/);
});

test("時間帯は開始・終了を選んで固定し、キューは一点を固定する", () => {
  for (const id of ["stage-timeline-lock-menu", "stage-timeline-lock-menu-start", "stage-timeline-lock-menu-end", "stage-timeline-lock-menu-clear", "stage-timeline-lock-menu-cue"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(timeline, /button\.addEventListener\("contextmenu", \(event\) => openTimelineLockMenu\(event, \{/);
  assert.match(timeline, /block\.addEventListener\("contextmenu", \(event\) => openTimelineLockMenu/);
  assert.match(timeline, /開始時刻を固定/);
  assert.match(timeline, /終了時刻を固定/);
  assert.match(timeline, /固定を解除/);
  assert.match(timeline, /この時刻を固定/);
  assert.match(timeline, /時刻固定を解除/);
  assert.match(timeline, /if \(cue\.timelinePositionLocked\)[\s\S]*?右クリックで解除できます/);
  assert.match(timeline, /function timelineRangeLock\(project, kind, id\)/);
  assert.match(timeline, /kind: "audio", id: clip\.trackId, lockedEdge: audioRangeLock/);
  assert.match(timeline, /kind: "transition", id: positionLockSceneId, lockedEdge: rangeLock/);
  assert.match(sketch, /raw\.timelineRangeLock === "start" \|\| raw\.timelineRangeLock === "end"/);
  assert.match(sketch, /raw\.timelinePositionLocked === true \? \{ timelineRangeLock: "start" \} : \{\}/);
  assert.match(sketch, /setTimelinePositionLocked\(kind, id, value\)[\s\S]*?item\.timelinePositionLocked = locked/);
  assert.match(sketch, /setTimelineRangeLock\(kind, id, value\)[\s\S]*?transitionRangeLock/);
  assert.match(sketch, /!cue\.timelinePositionLocked[\s\S]*?finite\(cue\.atSeconds, -1\) >= rippleFrom/);
  assert.match(sketch, /if \(timingChanged && \(fixedFollowingScene \|\| ownLockedEdge\)\) return false/);
  assert.match(css, /\.stage-timeline-lock-menu \{[\s\S]*?min-width: 184px/);
  assert.match(css, /\.stage-timeline-time-lock \{[\s\S]*?width: 13px/);
});

test("転換の最初の描画は前シーンの位置から始め、行き先を一瞬だけ描かない", () => {
  assert.match(sketch, /sceneAnim = \{ pieces, exits, blackout, progress: 0, raf: 0,[\s\S]*?step\(start\);/);
  assert.match(sketch, /function beginSceneAnim\(fromScene, liveSpinsIn, durationMs = null, timelineProgress = null\)[\s\S]*?return true;/);
  assert.match(sketch, /updateInspector\(\);[\s\S]*?if \(!beginSceneAnim\(before, liveSpins, options\.transitionDurationMs\)\) render\(\);/);
});

test("時間表示は時刻だけ、カウント表示はカウントだけを目盛りに置く", () => {
  assert.match(html, /id="stage-timeline-unit-toggle"[^>]*role="switch"[^>]*>時間式<\/button>/);
  assert.doesNotMatch(html, /data-stage-timeline-unit=/);
  assert.match(timeline, /function sectionTimelineUnit\(section\)/);
  assert.match(timeline, /function confirmUnitWarning\(\)[\s\S]*?ui\.unit = pending\.next/);
  assert.match(timeline, /unitToggle\.textContent = tx\(ui\.unit === "count" \? "カウント式" : "時間式"\)/);
  assert.match(timeline, /if \(ui\.unit === "time"\)[\s\S]*?makeTick\(sec, formatTime\(sec\)\)/);
  assert.match(timeline, /else \{[\s\S]*?makeTick\(sec, String\(Math\.round\(count\)\)\)/);
});

test("テンポ・カウント合わせ操作はカウント式だけで表示する", () => {
  assert.match(html, /id="stage-timeline-metronome"[\s\S]*?hidden disabled/);
  assert.match(html, /id="stage-timeline-anchor" hidden disabled/);
  assert.match(html, /id="stage-timeline-clear-anchors" hidden disabled/);
  assert.match(html, /id="stage-timeline-bpm-label" hidden/);
  assert.match(html, /id="stage-timeline-bpm"[^>]*hidden disabled/);
  assert.match(html, /id="stage-timeline-auto-bpm" hidden disabled/);
  assert.match(html, /id="stage-timeline-meter" hidden/);
  assert.match(html, /id="stage-timeline-mark-one" hidden disabled/);
  assert.match(html, /id="stage-timeline-real-tempo-readout" hidden/);
  assert.match(timeline, /const showCountTempo = ui\.unit === "count"/);
  assert.match(timeline, /\[els\.metronome, els\.anchorHere, els\.clearAnchors, els\.bpmLabel, els\.bpm, els\.autoBpm,[\s\S]*?els\.meter, els\.markOne, els\.realTempoReadout\][\s\S]*?control\.hidden = !showCountTempo/);
});

test("シーク位置へ移動すると該当シーンを平面図・正面図へ同期する", () => {
  assert.match(timeline, /function syncSceneForSeek\(\)[\s\S]*?syncTimelinePlaybackScene\(seekSeconds, \{ reset: true \}\)/);
  assert.match(timeline, /function seekFromPointer\(event\)[\s\S]*?syncSceneForSeek\(\)/);
  assert.match(timeline, /if \(event\.shiftKey\)[\s\S]*?syncSceneForSeek\(\)/);
  assert.match(timeline, /name === "seeking"[\s\S]*?seekSeconds = els\.audio\.currentTime;[\s\S]*?syncSceneForSeek\(\)/);
});

test("表示単位はセクションごとに保存し、切替前に毎回注意を確認する", () => {
  assert.match(sketch, /timelineUnit: sceneKind === "section" \? "time" : null/);
  assert.match(sketch, /timelineUnit: kind === "section" && raw\.timelineUnit === "count" \? "count" : "time"/);
  assert.match(sketch, /setSectionTimelineUnit\(id, value\)[\s\S]*?checkpoint\(\)[\s\S]*?section\.timelineUnit = unit/);
  assert.match(html, /id="stage-timeline-unit-warning-modal"[\s\S]*?時間式は一般的な進行管理に使えます。[\s\S]*?ダンスのようにカウントに合わせてフォーメーションを次々変える/);
  assert.match(html, /id="stage-timeline-unit-warning-caution"[\s\S]*?途中で切り替えると対応を見誤るおそれ/);
  assert.match(timeline, /function openUnitWarning\(\)[\s\S]*?pendingUnitChange = \{ sectionId: section\.id, next \}/);
  assert.match(timeline, /function confirmUnitWarning\(\)[\s\S]*?bridge\.setSectionTimelineUnit\(pending\.sectionId, pending\.next\)/);
  assert.match(timeline, /ui\.unit = sectionTimelineUnit\(section\)/);
  assert.match(timeline, /els\.unitToggle\.addEventListener\("click", \(\) => \{[\s\S]*?openUnitWarning\(\)/);
  assert.match(css, /\.stage-timeline-unit-warning-caution \{[\s\S]*?border-left: 2px solid var\(--rust\)/);
});

test("セクション時間は上限なしの数値入力を直接入力またはドラッグして変更する", () => {
  assert.match(html, /class="stage-timeline-heading"[\s\S]*?id="stage-timeline-section-duration-number"[\s\S]*?class="stage-timeline-unit"/);
  assert.doesNotMatch(html, /stage-timeline-section-duration-range/);
  assert.match(html, /id="stage-timeline-section-duration-number"[\s\S]*?min="0\.1" step="0\.1"/);
  assert.doesNotMatch(html, /id="stage-timeline-section-duration-number"[^>]*max=/);
  assert.match(timeline, /syncSectionDurationControls\(project\)/);
  assert.match(timeline, /bridge\.setSectionTimelineDurationSeconds\(section\.id, seconds, \{ checkpoint, finalize \}\)/);
  assert.match(timeline, /sectionDurationNumber\.addEventListener\("input"/);
  assert.match(timeline, /function continueDurationScrub\(event\)[\s\S]*?Math\.trunc\(pixels \/ 3\)[\s\S]*?writeCurrentSectionDuration/);
  assert.match(timeline, /const step = event\.shiftKey \? 10 : 1/);
  assert.match(sketch, /setSectionTimelineDurationSeconds\(id, value, options = \{\}\)[\s\S]*?if \(options\.checkpoint\) checkpoint\(\)[\s\S]*?section\.timelineDurationSeconds = seconds/);
  assert.match(sketch, /const timelineSeconds = \(value\) =>[\s\S]*?Number\.isFinite\(number\) && number >= 0\.1/);
  assert.match(css, /\.stage-timeline-section-duration input\[type="number"\] \{[\s\S]*?width: 78px[\s\S]*?cursor: ew-resize/);
});

test("8レーンは左ハンドルで並べ替え、左のレーン名端で高さを変更して端末内へ保存する", () => {
  for (const key of ["ruler", "anchors", "audio", "scenes", "transitions", "light", "music", "dialogue"]) {
    assert.match(html, new RegExp(`data-stage-timeline-row="${key}"`));
  }
  assert.equal((html.match(/class="stage-timeline-row-handle"/g) || []).length, 8);
  assert.equal((html.match(/class="stage-timeline-row-resize"/g) || []).length, 8);
  assert.match(timeline, /ui\.rowOrder/);
  assert.match(timeline, /if \(ui\.anchorLaneOrderVersion !== 1\)[\s\S]*?rulerIndex \+ 1[\s\S]*?anchorLaneOrderVersion = 1/);
  assert.match(timeline, /ui\.rowHeights/);
  assert.match(timeline, /function continueRowReorder\(event\)[\s\S]*?elementFromPoint[\s\S]*?insertBefore/);
  assert.match(timeline, /function continueRowResize\(event\)[\s\S]*?setRowHeight/);
  assert.match(timeline, /const ROW_MAX_HEIGHT = 320/);
  assert.match(css, /\.stage-timeline-row-handle \{[\s\S]*?cursor: grab/);
  assert.match(html, /class="stage-timeline-row-label"[\s\S]*?class="stage-timeline-row-resize"[\s\S]*?<\/div>[\s\S]*?class="stage-timeline-row-content"/);
  assert.match(css, /\.stage-timeline-row-label \.stage-timeline-row-resize \{[\s\S]*?cursor: ns-resize/);
  assert.match(css, /\.stage-timeline-row-label \.stage-timeline-row-resize::after \{[\s\S]*?right: 8px;[\s\S]*?left: 8px;/);
});

test("右上の表示設定から8レーンを個別に隠し、端末内へ保存する", () => {
  assert.match(html, /id="stage-timeline-settings-trigger"[\s\S]*?aria-controls="stage-timeline-settings-panel"/);
  assert.match(html, /id="stage-timeline-settings-panel"[\s\S]*?role="dialog"[\s\S]*?表示するレーン/);
  assert.equal((html.match(/data-stage-timeline-row-visibility/g) || []).length, 8);
  assert.match(timeline, /ui\.rowVisibility/);
  assert.match(timeline, /row\.hidden = !ui\.rowVisibility\[key\] \|\| \(key === "anchors" && ui\.unit !== "count"\)/);
  assert.match(timeline, /event\.key === "Escape"[\s\S]*?setSettingsOpen\(false/);
  assert.match(css, /\.stage-timeline-settings-panel \{[\s\S]*?width: 260px;[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.stage-timeline-settings-panel label \{[\s\S]*?min-height: 44px;/);
});

test("タイムラインのシーン選択は本体のopenSceneへ接続する", () => {
  assert.match(sketch, /openSceneById\(id, options = \{\}\)[\s\S]*?openScene\(next\.id, options\)/);
  assert.match(timeline, /bridge\.openSceneById\(segment\.sceneId\)/);
});

test("シーン帯は単クリックの移動と端ドラッグを保ち、ダブルクリックで本体と同じ詳細を開く", () => {
  assert.doesNotMatch(html, /id="stage-timeline-scene-detail-modal"/);
  assert.match(html, /id="stage-rename"[\s\S]*?id="stage-rename-scene-number"[\s\S]*?id="stage-rename-scene-section"/);
  assert.match(html, /id="stage-rename-scene-position"[\s\S]*?id="stage-rename-scene-hold"[\s\S]*?id="stage-rename-scene-transition"/);
  assert.match(html, /id="stage-rename-scene-note"[^>]*maxlength="2000"/);
  assert.match(timeline, /function scheduleTimelineSceneOpen\(segment\)[\s\S]*?setTimeout[\s\S]*?openTimelineScene\(segment\)/);
  assert.match(timeline, /button\.addEventListener\("dblclick", \(event\) => \{[\s\S]*?bridge\.openSceneDetailsById\(segment\.sceneId\)/);
  assert.match(timeline, /event\.target\.closest\("\.stage-timeline-block-resize-handle"\)/);
  assert.match(timeline, /window\.SHOSAI_STAGE_TIMELINE_DETAILS = Object\.freeze\(\{ sceneFactsById \}\)/);
  assert.match(sketch, /openSceneDetailsById\(id\)[\s\S]*?openRename\(scene\)/);
  assert.match(sketch, /nextSceneNote[\s\S]*?renameTarget\.note = nextSceneNote/);
  assert.match(css, /\.stage-modal#stage-rename \{[^}]*width: min\(520px, calc\(100vw - 40px\)\)/);
});

test("音源なしでもセクション時間を内部時計として再生する", () => {
  assert.match(timeline, /function startSilentPlayback\(\)/);
  assert.match(timeline, /performance\.now\(\)/);
  assert.match(timeline, /window\.requestAnimationFrame\(silentPlaybackFrame\)/);
  assert.match(timeline, /if \(!timeline\.trackId\) \{[\s\S]*?startSilentPlayback\(\)/);
  assert.match(timeline, /syncSilentScene\(seekSeconds\)/);
  assert.match(timeline, /els\.play\.disabled = !timeline\.segments\.some/);
  assert.match(timeline, /const desiredDuration = section \? sectionDurationSeconds\(project, section\) : baseDuration/);
  assert.match(timeline, /duration: desiredDuration/);
});

test("セクション時間を全体幅にし、音源は実尺の帯として複数置ける", () => {
  assert.match(timeline, /function sceneAudioClips\(project, segments, duration\)[\s\S]*?audioTimelineDuration\(run\.track\)/);
  assert.match(timeline, /audioTimelineStartSeconds[\s\S]*?sourceSceneId/);
  assert.match(timeline, /const hasPlacedStart = Number\.isFinite\(run\.audioTimelineStartSeconds\)[\s\S]*?start \+ displayDuration/);
  assert.match(timeline, /const duration = section \? sectionDurationSeconds\(project, section\) : plannedDuration/);
  assert.match(timeline, /audioClips: sceneAudioClips\(project, segments, desiredDuration\)/);
  assert.match(timeline, /const audioClips = Array\.isArray\(timeline\.audioClips\) \? timeline\.audioClips : \[\]/);
  assert.match(timeline, /placeBlock\(audioBlock, clip\.start, clip\.end\)/);
  assert.match(timeline, /function beginAudioDrag\(event, clip, button, audioRangeLock\)[\s\S]*?setTimelineAudioStartSeconds/);
  assert.match(timeline, /audioBlock\.addEventListener\("pointerdown", \(event\) => beginAudioDrag\(event, clip, audioBlock, audioRangeLock\)\)/);
  assert.match(css, /--stage-timeline-audio-block-inset-y: 0px;/);
  assert.match(css, /button\.stage-timeline-audio-block\.is-draggable \{ cursor: grab/);
  assert.doesNotMatch(timeline, /function capTimelineToAudio\(/);
});

test("各編集レーンの追加操作を左ラベルへ揃え、キューをシーン単位で連番表示する", () => {
  for (const id of [
    "stage-timeline-add-audio", "stage-timeline-add-scene", "stage-timeline-add-transition",
    "stage-timeline-add-light-cue", "stage-timeline-add-music-cue", "stage-timeline-add-dialogue-cue",
    "stage-timeline-light-cues", "stage-timeline-music-cues", "stage-timeline-dialogue-cues",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /class="stage-timeline-cue-add"/);
  for (const [row, type] of [["light", "light"], ["music", "music"], ["dialogue", "dialogue"]]) {
    assert.match(html, new RegExp(`data-stage-timeline-row="${row}"[\\s\\S]*?data-stage-timeline-add-cue="${type}"`));
  }
  for (const [row, id] of [["audio", "stage-timeline-add-audio"], ["scenes", "stage-timeline-add-scene"], ["transitions", "stage-timeline-add-transition"]]) {
    assert.match(html, new RegExp(`data-stage-timeline-row="${row}"[\\s\\S]*?id="${id}"`));
  }
  assert.equal((html.match(/class="stage-timeline-row-add"/g) || []).length, 6);
  assert.match(sketch, /cues: \[\]/);
  assert.match(sketch, /cues: normalizeProjectCues\(rawProject\.cues\)/);
  assert.match(sketch, /addTimelineCue\(type, sectionId, atSeconds, scope = \{\}\)[\s\S]*?kind: "timeline"[\s\S]*?cueType: type[\s\S]*?sectionId[\s\S]*?atSeconds[\s\S]*?memo: ""/);
  assert.match(sketch, /removeTimelineCue\(id\)[\s\S]*?checkpoint\(\)[\s\S]*?cues\.splice/);
  assert.match(sketch, /addTimelineSceneAfter\(sceneId\)[\s\S]*?addScene\(false\)/);
  assert.match(sketch, /addTimelineTransition\(sceneId, seconds = 4\)[\s\S]*?transitionToNextSeconds = duration/);
  assert.match(timeline, /function addCueAtPlayhead\(type\)[\s\S]*?bridge\.addTimelineCue/);
  assert.match(timeline, /function cuePrefix\(type\)[\s\S]*?LXcue[\s\S]*?Mcue[\s\S]*?VOXcue/);
  assert.match(timeline, /const ordinalKey = `\$\{cue\.cueType\}:\$\{sceneId\}`/);
  assert.match(timeline, /displayName: `\$\{cuePrefix\(cue\.cueType\)\} \$\{sceneNumber\}-\$\{ordinal\}`/);
  assert.match(timeline, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(css, /\.stage-timeline-cue \{[\s\S]*?border: 2px solid/);
  assert.match(css, /\.stage-timeline-cue\[data-cue-type="light"\]/);
  assert.match(css, /\.stage-timeline-cue\[data-cue-type="music"\]/);
  assert.match(css, /\.stage-timeline-cue\[data-cue-type="dialogue"\]/);
  assert.match(css, /--stage-timeline-label-width: 156px/);
  assert.match(css, /\.stage-timeline-row-add \{[\s\S]*?width: 32px;[\s\S]*?height: 32px/);
  assert.match(timeline, /const labelWidth = finite\(getComputedStyle\(root\)\.getPropertyValue\("--stage-timeline-label-width"\), 156\);[\s\S]*?els\.viewport\.clientWidth - labelWidth/);
});

test("キューはダブルクリックで詳細とメモを開き、詳細またはDeleteキーで削除できる", () => {
  for (const id of [
    "stage-timeline-cue-detail-backdrop", "stage-timeline-cue-detail-modal",
    "stage-timeline-cue-detail-title", "stage-timeline-cue-detail-scene",
    "stage-timeline-cue-detail-position", "stage-timeline-cue-detail-note",
    "stage-timeline-cue-detail-save", "stage-timeline-cue-detail-delete",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="stage-timeline-cue-detail-note" maxlength="2000"/);
  assert.match(timeline, /button\.addEventListener\("pointerdown", \(event\) => beginCueDrag\(event, cue, button\)\)/);
  assert.match(timeline, /function cueDragSeconds\(event\)[\s\S]*?snappedSeconds/);
  assert.match(timeline, /function endCueDrag\(event\)[\s\S]*?bridge\.updateTimelineCue\(dragging\.id, \{[\s\S]*?atSeconds: dragging\.nextSeconds/);
  assert.match(timeline, /button\.addEventListener\("dblclick", \(\) => openCueDetails/);
  assert.match(timeline, /bridge\.updateTimelineCue\(cueDetailId, \{ memo: els\.cueDetailNote\.value \}\)/);
  assert.match(timeline, /function deleteCueFromDetails\(\)[\s\S]*?removeSelectedCue\(\)/);
  assert.match(sketch, /const memo = typeof patch\.memo === "string" \? patch\.memo\.slice\(0, 2000\) : String\(cue\.memo \|\| ""\)/);
  assert.match(sketch, /updateTimelineCue\(id, patch = \{\}\)[\s\S]*?cue\.atSeconds = atSeconds/);
  assert.match(html, /id="stage-timeline-cue-detail-delete"[\s\S]*?class="btn-quiet" id="stage-timeline-cue-detail-save"/);
  assert.match(css, /\.stage-timeline-cue-detail-modal \.stage-timeline-cue-detail-actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.stage-timeline-cue-detail-modal \.stage-timeline-cue-detail-actions button \{[\s\S]*?justify-content: center;[\s\S]*?font-size: 14px/);
  assert.match(css, /\.stage-modal\.stage-timeline-cue-detail-modal \{ width: min\(440px/);
});

test("再生で通過したキューは、機器を実行せず舞台図へ一時表示する", () => {
  assert.equal((html.match(/data-stage-timeline-cue-pop/g) || []).length, 2);
  assert.match(html, /data-stage-timeline-cue-pop role="status"[\s\S]*?aria-live="polite"/);
  assert.match(html, /data-stage-timeline-cue-pop aria-hidden="true"/);
  assert.match(timeline, /function dispatchTimelineCuePasses[\s\S]*?new CustomEvent\("stage-timeline-cue-passed"/);
  assert.match(timeline, /syncTimelinePlaybackScene\(els\.audio\.currentTime, \{ cuePlayback: true \}\)/);
  assert.match(timeline, /syncTimelinePlaybackScene\(seekSeconds, \{ reset: true, cuePlayback: true, includeCueAtPosition: true \}\)/);
  assert.match(sketch, /window\.addEventListener\("stage-timeline-cue-passed"[\s\S]*?showTimelineCuePop/);
  assert.match(sketch, /実行指示ではなく、打ち合わせ用/);
  assert.match(css, /\.stage-timeline-cue-pop \{[\s\S]*?pointer-events: none;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.stage-timeline-cue-pop\.is-visible/);
});

test("ミュージックシンクの操作列を二段で並べ、未接続の編集操作は無効で示す", () => {
  for (const id of [
    "stage-timeline-song-select", "stage-timeline-song-delete",
    "stage-timeline-add-audio", "stage-timeline-volume",
    "stage-timeline-prev", "stage-timeline-play",
    "stage-timeline-next", "stage-timeline-metronome", "stage-timeline-head", "stage-timeline-anchor",
    "stage-timeline-clear-anchors", "stage-timeline-loop-a", "stage-timeline-loop-b",
    "stage-timeline-loop", "stage-timeline-bpm", "stage-timeline-auto-bpm", "stage-timeline-mark-one",
    "stage-timeline-grid", "stage-timeline-zoom-out", "stage-timeline-zoom-in",
    "stage-timeline-split",
    "stage-timeline-add-scene", "stage-timeline-add-transition",
    "stage-timeline-add-light-cue", "stage-timeline-add-music-cue", "stage-timeline-add-dialogue-cue",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /id="stage-timeline-(?:save|load|record(?:-next)?)"/);
  assert.doesNotMatch(timeline, /stage-timeline-(?:save|load)|els\.(?:save|load)/);
  assert.doesNotMatch(html, /id="stage-timeline-(?:undo|redo)"/);
  assert.doesNotMatch(timeline, /stage-timeline-(?:undo|redo)|els\.(?:undo|redo|stageUndo|stageRedo)/);
  assert.match(html, /id="stage-timeline-metronome"[\s\S]*?disabled/);
  assert.match(html, /id="stage-timeline-split" disabled/);
  assert.doesNotMatch(html, /stage-timeline-sound-check|stage-timeline-duplicate/);
  assert.doesNotMatch(html, /id="stage-timeline-theme"/);
  assert.doesNotMatch(timeline, /stage-timeline-theme|els\.theme/);
  assert.equal((html.match(/data-stage-ui-skin=/g) || []).length, 2);
  assert.match(css, /\.stage-timeline-menu-strip[\s\S]*?flex-wrap: wrap/);
});

test("音量フェーダーはタイムラインから外し、感想ボタンの左側で同じ再生音量を操作する", () => {
  const volumeAt = html.indexOf('id="stage-timeline-volume"');
  const feedbackAt = html.indexOf('id="stage-feedback-open"');
  const timelineAt = html.indexOf('id="stage-timeline-panel"');
  assert.ok(volumeAt > html.indexOf('class="stage-history-actions"'));
  assert.ok(volumeAt < feedbackAt);
  assert.ok(volumeAt < timelineAt);
  assert.equal((html.match(/id="stage-timeline-volume"/g) || []).length, 1);
  assert.match(html, /class="stage-header-volume"[\s\S]*?id="stage-timeline-volume"[\s\S]*?id="stage-feedback-open"/);
  assert.doesNotMatch(html.slice(timelineAt), /id="stage-timeline-volume"/);
  assert.match(css, /\.stage-header-volume input \{[\s\S]*?width: 108px;[\s\S]*?min-height: var\(--stage-history-action-height\)/);
  assert.match(timeline, /els\.volume\.value = String\(ui\.volume\);[\s\S]*?applyAudioLevels\(\)/);
});

test("タイムラインモードのSpaceは入力欄を除いて再生と一時停止を切り替える", () => {
  assert.match(timeline, /event\.code === "Space" \|\| event\.key === " "/);
  assert.match(timeline, /mode !== "timeline" \|\| isTextEntry\(event\.target\)/);
  assert.match(timeline, /event\.preventDefault\(\);[\s\S]*?if \(!event\.repeat\) void toggleTimelinePlayback\(\)/);
  assert.match(timeline, /document\.querySelector\("\.stage-modal:not\(\[hidden\]\)"\)/);
});

test("音源ブロックのダブルクリックで音源別ゲインを編集して保存する", () => {
  for (const id of [
    "stage-timeline-audio-detail-backdrop", "stage-timeline-audio-detail-modal",
    "stage-timeline-audio-detail-name", "stage-timeline-audio-detail-duration",
    "stage-timeline-audio-gain-range", "stage-timeline-audio-gain-number",
    "stage-timeline-audio-detail-cancel", "stage-timeline-audio-detail-save",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="stage-timeline-audio-gain-range" min="-24" max="12" step="0\.5"/);
  assert.match(timeline, /const audioClips = Array\.isArray\(timeline\.audioClips\)/);
  assert.match(timeline, /audioBlock\.addEventListener\("dblclick", \(\) => \{[\s\S]*?openAudioDetails\(clip\.trackId, audioBlock\)/);
  assert.match(timeline, /const factor = 10 \*\* \(normalizedAudioGainDb\(gainDb\) \/ 20\)/);
  assert.match(timeline, /createMediaElementSource\(els\.audio\)[\s\S]*?createGain\(\)[\s\S]*?gain\.connect\(context\.destination\)/);
  assert.match(timeline, /bridge\.setTimelineAudioGainDb\(trackId, gainDb\)/);
  assert.match(sketch, /setTimelineAudioGainDb\(trackId, value\)[\s\S]*?track\.gainDb = gainDb/);
  assert.match(css, /\.stage-modal\.stage-timeline-audio-detail-modal \{ width: min\(440px/);
});

test("端末内の音源が欠落したら同じ音源枠から再接続し、タイムライン情報を作り直さない", () => {
  assert.match(sketch, /hasTimelineAudioFile\(trackId\)[\s\S]*?audioStore\.get\(normalizedTrackId\)/);
  assert.match(sketch, /openTimelineAudioRelinkPicker\(trackId\)[\s\S]*?openAudioRelinkPicker\(trackId\)/);
  assert.match(sketch, /audioStore\.put\(trackId, file\)[\s\S]*?stage-timeline-audio-change[\s\S]*?reconnected: true/);
  assert.match(timeline, /function checkTimelineAudioAvailability\(audioBlock, trackId, title, generation\)/);
  assert.match(timeline, /showMissingAudioState\(audioBlock, title\)/);
  assert.match(timeline, /audioBlock\.dataset\.audioMissing !== "true"[\s\S]*?bridge\.openTimelineAudioRelinkPicker\(clip\.trackId\)/);
  assert.match(timeline, /音源が見つかりません/);
  assert.match(timeline, /読み込み直す/);
  assert.match(css, /\.stage-timeline-audio-block\.is-missing \{[\s\S]*?border-style: dashed/);
  assert.doesNotMatch(timeline, /openTimelineAudioRelinkPicker[\s\S]{0,260}(?:addTimelineScene|addTimelineCue|addTimelineTransition)/);
});

test("再生は単独三角形、前後は縦棒付き、先頭は矢印として44px枠へ揃える", () => {
  assert.match(html, /id="stage-timeline-song-delete"[\s\S]*?aria-label="この楽曲を削除"[\s\S]*?class="stage-timeline-close-icon"[\s\S]*?<path d="M4\.4 4\.4l7\.2 7\.2M11\.6 4\.4l-7\.2 7\.2"/);
  assert.match(html, /id="stage-timeline-head"[\s\S]*?<path d="M5 5v14M19 12H9M13 8l-4 4 4 4"/);
  assert.match(html, /id="stage-timeline-prev"[\s\S]*?<path d="M6 5v14"[\s\S]*?<path class="stage-timeline-solid" d="M9 12l9-6v12z"/);
  assert.match(html, /id="stage-timeline-play"[\s\S]*?<path class="stage-timeline-solid stage-timeline-play-glyph" d="M8 5\.5 19 12 8 18\.5z"/);
  assert.match(html, /id="stage-timeline-next"[\s\S]*?<path class="stage-timeline-solid" d="M15 12 6 6v12z"[\s\S]*?<path d="M18 5v14"/);
  assert.match(html, /id="stage-timeline-metronome"[\s\S]*?aria-label="メトロノーム"[\s\S]*?class="stage-timeline-metronome-icon"/);
  assert.match(html, /id="stage-timeline-split" disabled>シーン分割<\/button>/);
  assert.doesNotMatch(timeline, /els\.play\.textContent/);
  assert.match(timeline, /els\.play\.setAttribute\("aria-pressed", String\(playing\)\)/);
  assert.match(timeline, /els\.play\.title = playLabel/);
  assert.match(css, /\.stage-timeline-play \{[\s\S]*?min-width: 44px/);
  assert.match(css, /\.stage-timeline-transport-button \{[\s\S]*?display: inline-grid;[\s\S]*?place-items: center;[\s\S]*?line-height: 0;/);
  assert.match(css, /#stage-timeline-metronome \.stage-timeline-metronome-icon \{[\s\S]*?width: 28px;[\s\S]*?height: 28px;/);
  assert.match(css, /#stage-timeline-song-delete \{[\s\S]*?display: inline-grid;[\s\S]*?place-items: center;[\s\S]*?line-height: 0;/);
});

test("拡大縮小は0.05倍まで全体を見渡せる倍率範囲・既存の刻み・入力を使う", () => {
  assert.match(timeline, /const ZOOM_MIN = 0\.05/);
  assert.match(timeline, /const ZOOM_MAX = 12/);
  assert.match(timeline, /const ZOOM_FACTOR = 1\.3/);
  assert.match(timeline, /event\.metaKey[\s\S]*?event\.ctrlKey[\s\S]*?zoomBy/);
  assert.match(timeline, /\["\+", "=", ";", "-", "_"\]\.includes\(event\.key\)/);
});

test("タイムライン上のホイールは横移動し、Shift付きでは再生位置を動かす", () => {
  assert.match(timeline, /const rawDelta = Math\.abs\(event\.deltaX\) > Math\.abs\(event\.deltaY\) \? event\.deltaX : event\.deltaY/);
  assert.match(timeline, /const delta = event\.deltaMode === 1 \? rawDelta \* 16 : rawDelta/);
  assert.match(timeline, /if \(event\.shiftKey\)[\s\S]*?seekSeconds = clamp\([\s\S]*?seekSeconds - delta \/ Math\.max\(1, timelineWidth\) \* timeline\.duration/);
  assert.match(timeline, /if \(els\.audio && audioMatchesTimeline\(\)\) els\.audio\.currentTime = seekSeconds/);
  assert.match(timeline, /els\.viewport\.scrollLeft \+= delta/);
  assert.match(timeline, /if \(event\.metaKey \|\| event\.ctrlKey\)[\s\S]*?zoomBy/);
});

test("タイムラインは上端のドラッグとキーで高さを変え、端末内に保存する", () => {
  assert.match(html, /id="stage-timeline-resize"[\s\S]*?role="separator"/);
  assert.match(timeline, /timelineResize\.startHeight \+ timelineResize\.startY - event\.clientY/);
  assert.match(timeline, /setPointerCapture/);
  assert.match(timeline, /event\.key === "ArrowUp" \? 24 : -24/);
  assert.match(css, /\.stage-timeline-resize[\s\S]*?cursor: row-resize/);
});

test("吸着単位は数値だけでなくスナップ名を付けて表示する", () => {
  assert.match(html, /id="stage-timeline-grid" title="スナップ単位" data-no-i18n>スナップ 1\/4<\/button>/);
  assert.match(timeline, /els\.grid\.textContent = `\$\{tx\("スナップ"\)\} \$\{snapLabel\}`/);
  assert.match(timeline, /ui\.grid === 0\.25 \? 0\.5 : ui\.grid === 0\.5 \? 1 : 0\.25/);
});

test("A・B位置と区間ループの範囲を時間軸上へ表示する", () => {
  assert.match(html, /id="stage-timeline-loop-range"[\s\S]*?stage-timeline-loop-marker is-a">A<[\s\S]*?stage-timeline-loop-marker is-b">B</);
  assert.match(timeline, /function renderLoopRange\(\)[\s\S]*?ui\.loopB > ui\.loopA/);
  assert.match(timeline, /--stage-timeline-loop-start-x/);
  assert.match(timeline, /--stage-timeline-loop-width/);
  assert.match(timeline, /classList\.toggle\("is-active", hasRange && ui\.loop\)/);
  assert.match(timeline, /els\.loopRange\.hidden = !hasRange/);
  assert.match(timeline, /if \(!hasRange\) return/);
  assert.match(timeline, /const hasLoopRange = ui\.loopB > ui\.loopA;[\s\S]*?els\.loopA\.setAttribute\("aria-pressed", String\(hasLoopRange\)\)/);
  assert.match(css, /\.stage-timeline-loop-range \{[\s\S]*?pointer-events: none;/);
  assert.match(css, /\.stage-timeline-loop-range \{[\s\S]*?opacity: 0\.3;/);
  assert.match(css, /\.stage-timeline-loop-range\.is-active \{[\s\S]*?opacity: 1;/);
  assert.match(css, /\.stage-timeline-loop-range\.is-active \{[\s\S]*?animation: stage-timeline-loop-glow 2\.2s/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.stage-timeline-loop-range\.is-active \{ animation: none; \}/);
});

test("カウント式だけに丸・閉じた鍵・開いた鍵の合わせレーンを表示して保存する", () => {
  assert.match(html, /data-stage-timeline-row="anchors"[\s\S]*?id="stage-timeline-anchors-label">カウント合わせ<[\s\S]*?id="stage-timeline-anchors"/);
  assert.match(timeline, /const ROW_KEYS = \["ruler", "anchors", "audio"/);
  assert.match(timeline, /key === "anchors" && ui\.unit !== "count"/);
  assert.match(timeline, /function anchorIconMarkup\(state\)[\s\S]*?<circle[\s\S]*?stage-timeline-anchor-lock-body/);
  assert.match(timeline, /if \(!current\.set\)[\s\S]*?else if \(current\.locked\)[\s\S]*?else if \(current\.start\)[\s\S]*?set: false/);
  assert.match(timeline, /function continueAnchorDrag\(event\)[\s\S]*?deltaX \/ Math\.max\(1, timelineWidth\) \* timeline\.duration/);
  assert.match(timeline, /bridge\.setTimelineCountSync\(\{/);
  assert.match(sketch, /setTimelineCountSync\(identity = \{\}, value = \{\}\)[\s\S]*?identity\.source === "formation"[\s\S]*?audioTrackById\(identity\.trackId\)/);
  assert.match(sketch, /Object\.assign\(track, next\)[\s\S]*?stage-timeline-count-sync-change/);
  assert.match(timeline, /els\.anchorHere\.addEventListener\("click", anchorCurrentPhraseHead\)/);
  assert.match(timeline, /els\.markOne\.addEventListener\("click", markFirstCount\)/);
  assert.match(timeline, /sync\.anchors = \[\]/);
  assert.match(css, /\.stage-timeline-anchor-mark\.is-open \{[\s\S]*?cursor: ew-resize/);
});

test("追加資源は本体・PWA・ゲスト許可で同じ版を読む", () => {
  for (const asset of [
    "style.css", "stage-sketch.js", "stage-timeline.js", "stage-i18n.js",
    "stage-i18n.zh-Hans.js", "stage-i18n.zh-Hant.js",
  ]) {
    const escaped = asset.replaceAll(".", "\\.");
    const version = html.match(new RegExp(`${escaped}\\?v=(\\d+)`))?.[1];
    assert.ok(version, `${asset} の版がstage.htmlにありません`);
    assert.match(sw, new RegExp(`\\./${escaped}\\?v=${version}`));
  }
  assert.match(worker, /"\/stage-timeline\.js"/);
});
