import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import snapshot from './workflow-snapshot-canonical-2026-09-09.js';

const fixturePath = new URL('./project-workflow-fixture-2026-09-09.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const stageExport = JSON.parse(await readFile(new URL('./stage-sketch-v4-binding-fixture-2026-09-09.json', import.meta.url), 'utf8'));
const expectedSnapshotHash = `sha256:${createHash('sha256').update(snapshot.canonicalBaseExportJson(stageExport), 'utf8').digest('hex')}`;
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const ids = new Map();
const add = (entry, collection) => {
  check(entry && typeof entry.id === 'string' && entry.id, `${collection} has an invalid id`);
  if (!entry?.id) return;
  check(!ids.has(entry.id), `duplicate id: ${entry.id}`);
  ids.set(entry.id, collection);
};
const has = (id, collection) => ids.get(id) === collection;

check(fixture.kind === 'shosai-stage-workflow-fixture', 'fixture kind');
check(fixture.contractVersion === 1, 'contract version');
check(fixture.projectBinding?.baseExportKind === 'shosai-stage-sketch', 'base export kind');
check(fixture.projectBinding?.baseExportVersion === 4, 'base export version');
check(fixture.projectBinding?.baseSnapshotHash === expectedSnapshotHash, 'fixture binding hash');
check(fixture.capabilities?.includes('workflow-v1'), 'workflow capability');

for (const asset of fixture.assets || []) add(asset, 'asset');
for (const document of fixture.script?.documents || []) add(document, 'document');
for (const cue of fixture.script?.cues || []) add(cue, 'cue');
for (const anchor of fixture.script?.anchors || []) add(anchor, 'anchor');
for (const person of fixture.coordination?.people || []) add(person, 'person');
for (const context of fixture.coordination?.planContexts || []) add(context, 'context');
for (const origin of fixture.coordination?.origins || []) add(origin, 'origin');
for (const estimate of fixture.coordination?.estimates || []) add(estimate, 'estimate');
for (const point of fixture.coordination?.points || []) add(point, 'point');
for (const activity of fixture.coordination?.activities || []) add(activity, 'activity');
for (const window of fixture.coordination?.windows || []) add(window, 'window');
for (const review of fixture.reviews || []) add(review, 'review');

for (const asset of fixture.assets || []) {
  check(['available', 'missing-local', 'unreadable'].includes(asset.localStatus), `asset status: ${asset.id}`);
  check(!('blob' in asset) && !('dataUrl' in asset) && !('objectUrl' in asset), `asset embeds binary data: ${asset.id}`);
}
for (const document of fixture.script?.documents || []) check(has(document.assetId, 'asset'), `document asset: ${document.id}`);
for (const anchor of fixture.script?.anchors || []) {
  check(has(anchor.documentId, 'document'), `anchor document: ${anchor.id}`);
  check(Number.isInteger(anchor.pageIndex) && anchor.pageIndex >= 0, `anchor page: ${anchor.id}`);
  check(Array.isArray(anchor.rect) && anchor.rect.length === 4 && anchor.rect.every((n) => Number.isFinite(n) && n >= 0 && n <= 1), `anchor rect: ${anchor.id}`);
  check(anchor.rect?.[0] < anchor.rect?.[2] && anchor.rect?.[1] < anchor.rect?.[3], `anchor rect ordering: ${anchor.id}`);
  check(anchor.target?.kind === 'cue' && has(anchor.target.id, 'cue'), `anchor target: ${anchor.id}`);
  for (const activityId of anchor.activityRefs || []) check(has(activityId, 'activity'), `anchor activity: ${anchor.id}`);
}
for (const origin of fixture.coordination?.origins || []) {
  check(has(origin.planContextId, 'context'), `origin context: ${origin.id}`);
  check(has(origin.cueId, 'cue'), `origin cue: ${origin.id}`);
}
for (const point of fixture.coordination?.points || []) {
  check(has(point.planContextId, 'context'), `point context: ${point.id}`);
  if (point.expression?.kind === 'anchor') check(has(point.expression.originId, 'origin'), `point origin: ${point.id}`);
  if (point.expression?.kind === 'after') {
    check(has(point.expression.pointId, 'point'), `point dependency: ${point.id}`);
    check(has(point.expression.estimateId, 'estimate'), `point estimate: ${point.id}`);
  }
}
for (const activity of fixture.coordination?.activities || []) {
  check(['script', 'transition', 'personal'].includes(activity.owner), `activity owner: ${activity.id}`);
  check(has(activity.startPointId, 'point') && has(activity.endPointId, 'point'), `activity points: ${activity.id}`);
  for (const assignment of activity.assignments || []) check(has(assignment.personId, 'person'), `activity person: ${activity.id}`);
}
for (const window of fixture.coordination?.windows || []) {
  check(has(window.planContextId, 'context'), `window context: ${window.id}`);
  check(has(window.startPointId, 'point') && has(window.deadlinePointId, 'point'), `window points: ${window.id}`);
  for (const activityId of window.completionActivityIds || []) check(has(activityId, 'activity'), `window activity: ${window.id}`);
}
for (const review of fixture.reviews || []) {
  for (const subjectId of review.subjectRefs || []) check(ids.has(subjectId), `review subject: ${review.id}`);
  for (const [subjectId, revision] of Object.entries(review.inputRevisions || {})) check(review.subjectRefs?.includes(subjectId) && revision === 1, `review revision: ${review.id}`);
}

if (errors.length) throw new Error(`workflow contract fixture failed:\n- ${errors.join('\n- ')}`);
console.log(`workflow contract fixture passed: ${ids.size} unique records, ${fixture.script.anchors.length} anchor, ${fixture.coordination.activities.length} activity`);
