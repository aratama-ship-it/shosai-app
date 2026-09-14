import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import snapshot from './workflow-snapshot-canonical-2026-09-09.js';

const fixture = JSON.parse(await readFile(new URL('./workflow-timeline-fixture-2026-09-09.json', import.meta.url), 'utf8'));
const stageExport = JSON.parse(await readFile(new URL('./stage-sketch-v4-binding-fixture-2026-09-09.json', import.meta.url), 'utf8'));
const expectedSnapshotHash = `sha256:${createHash('sha256').update(snapshot.canonicalBaseExportJson(stageExport), 'utf8').digest('hex')}`;
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const ids = new Set();
const add = (items, name) => (items || []).forEach((item) => {
  fail(item?.id && !ids.has(item.id), `${name} id: ${item?.id || 'missing'}`);
  ids.add(item.id);
});

add(fixture.assets, 'asset');
add(fixture.script?.documents, 'document');
add(fixture.script?.cues, 'cue');
add(fixture.script?.anchors, 'anchor');
add(fixture.coordination?.people, 'person');
add(fixture.coordination?.planContexts, 'context');
add(fixture.coordination?.origins, 'origin');
add(fixture.coordination?.estimates, 'estimate');
add(fixture.coordination?.points, 'point');
add(fixture.coordination?.activities, 'activity');
add(fixture.coordination?.windows, 'window');
add(fixture.reviews, 'review');

const cueIds = new Set(fixture.script.cues.map((cue) => cue.id));
const anchorCueIds = new Set(fixture.script.anchors.map((anchor) => anchor.target?.id));
const activityIds = new Set(fixture.coordination.activities.map((activity) => activity.id));
fail(fixture.kind === 'shosai-stage-workflow-fixture', 'fixture kind');
fail(fixture.capabilities?.includes('workflow-v1'), 'workflow capability');
fail(fixture.projectBinding?.baseSnapshotHash === expectedSnapshotHash, 'fixture snapshot hash');
fail(fixture.script.cues.length === 5, 'five sequential cues');
fail(fixture.timeline?.focusCueId === 'cue-q12', 'selected timeline cue');
fail(cueIds.has('cue-q13') && !anchorCueIds.has('cue-q13'), 'Q13 must remain visibly unassigned');
for (const anchor of fixture.script.anchors) {
  fail(cueIds.has(anchor.target?.id), `anchor cue: ${anchor.id}`);
  for (const activityId of anchor.activityRefs || []) fail(activityIds.has(activityId), `anchor activity: ${anchor.id}`);
}
for (const asset of fixture.assets) fail(!('blob' in asset) && !('dataUrl' in asset) && !('objectUrl' in asset), `asset binary: ${asset.id}`);
console.log(`workflow timeline fixture passed: ${fixture.script.cues.length} cues, ${fixture.script.anchors.length} anchors, ${fixture.coordination.activities.length} activities, Q13 unassigned`);
