import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import qa from './qa_support.cjs';

qa.writeReport('structure-checks.json', { status: 'running', startedAt: new Date().toISOString() });
process.on('uncaughtException', error => {
  qa.writeReport('structure-checks.json', { status: 'fail', error: error.message });
  console.error(error); process.exit(1);
});
const { validateDocument } = await import('../../../../../mcp-server/src/stage-model.js');
const productAtStart = qa.fingerprint();

const outputUrl = new URL('./romeo-juliet-full-show-ai-revised.stage-sketch.json', import.meta.url);
const manifestUrl = new URL('./ai-change-manifest.json', import.meta.url);
const reportUrl = new URL('./qa/structure-checks.json', import.meta.url);
const document = JSON.parse(fs.readFileSync(outputUrl, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestUrl, 'utf8'));
const project = document.project;
const scenes = project.scenes.filter(scene => scene.kind === 'scene');
const sceneById = new Map(scenes.map(scene => [scene.id, scene]));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const outputSha256 = sha256(fs.readFileSync(outputUrl));

const native = validateDocument(document);
assert.equal(native.valid, true, native.errors.join('\n'));
assert.equal(document.kind, 'shosai-stage-sketch');
assert.equal(document.version, 3);
assert.equal(project.id, 'romeo-juliet-full-show-ai-revised-2026-09-13');
assert.equal(outputSha256, manifest.output.sha256);
const fieldAudit = JSON.parse(fs.readFileSync(new URL('./ai-field-changes.json', import.meta.url)));
assert.equal(fieldAudit.outputSha256, outputSha256);
assert.equal(fieldAudit.sourceSha256, manifest.sources.sourceNative.sha256);
assert.equal(fieldAudit.changes.length, manifest.fieldChanges.count);

const ids = values => values.map(value => value.id);
const duplicateIds = values => ids(values).filter((id, index, all) => all.indexOf(id) !== index);
assert.deepEqual(duplicateIds(project.scenes), []);
assert.deepEqual(duplicateIds(project.cast), []);
assert.deepEqual(duplicateIds(project.sets), []);

const castIds = new Set(ids(project.cast));
const setIds = new Set(ids(project.sets));
const audioIds = new Set(ids(project.audioTracks || []));
const sceneIds = new Set(ids(project.scenes));
const dangling = [];
let pieceCount = 0;
let heldReferenceCount = 0;
for (const scene of scenes) {
  const pieces = scene.pieces || [];
  pieceCount += pieces.length;
  const pieceIds = new Set(ids(pieces));
  assert.deepEqual(duplicateIds(pieces), [], `duplicate piece ids: ${scene.id}`);
  for (const piece of pieces) {
    if (piece.castId && !castIds.has(piece.castId)) dangling.push({ sceneId: scene.id, pieceId: piece.id, field: 'castId', value: piece.castId });
    if (piece.setId && !setIds.has(piece.setId)) dangling.push({ sceneId: scene.id, pieceId: piece.id, field: 'setId', value: piece.setId });
    if (piece.supportId && !pieceIds.has(piece.supportId)) dangling.push({ sceneId: scene.id, pieceId: piece.id, field: 'supportId', value: piece.supportId });
    if (piece.heldBy) {
      heldReferenceCount += 1;
      if (!pieceIds.has(piece.heldBy)) dangling.push({ sceneId: scene.id, pieceId: piece.id, field: 'heldBy', value: piece.heldBy });
    }
  }
  if (scene.audioTrackId && !audioIds.has(scene.audioTrackId)) dangling.push({ sceneId: scene.id, field: 'audioTrackId', value: scene.audioTrackId });
}
if (project.activeSceneId && !sceneIds.has(project.activeSceneId)) dangling.push({ field: 'activeSceneId', value: project.activeSceneId });
assert.deepEqual(dangling, []);

const normalize = text => String(text || '').trim().replace(/\s+/g, ' ');
const identicalRoleLighting = scenes.filter(scene => {
  const role = normalize(scene.beat?.role);
  const objective = normalize(scene.lightingIntent?.objective);
  return role && objective && role === objective;
});
assert.equal(identicalRoleLighting.length, 0);
assert.ok(scenes.every(scene => normalize(scene.lightingIntent?.objective)), 'every revised scene has an actual lighting objective');

const technicalIds = [
  'rj-frame-rj-cond-01-b-m6-01',
  'rj-frame-rj-cond-01-b-m6-02',
  'rj-frame-rj-cond-01-b-m6-03',
];
const technical = technicalIds.map(id => sceneById.get(id));
assert.ok(technical.every(Boolean));
assert.equal(technical.length, 3);
for (const scene of technical) {
  assert.equal(scene.blackout, true);
  assert.equal(scene.rehearsal.holdDurationSeconds, null);
  assert.equal(scene.rehearsal.transitionToNextSeconds, null);
  assert.equal(scene.lightingIntent.transition.triggerType, 'manual');
}

const q02 = sceneById.get('rj-frame-rj-cond-01-b-02');
const q03 = sceneById.get('rj-frame-rj-cond-01-c-01');
assert.equal(q02.rehearsal.holdDurationSeconds, null);
assert.equal(q02.rehearsal.transitionToNextSeconds, null);
assert.equal(q02.lightingIntent.transition.triggerType, 'manual');
assert.match(q02.lightingIntent.transition.triggerNote, /バー固定.*通路クリア.*10人の位置.*全員の仮面.*照明準備/);
assert.match(q02.lightingIntent.transition.triggerNote, /暗転維持.*遅延を記録/);
assert.equal(q03.beat.role, '群れの中で、二人だけが同じ速度になる。');
assert.equal(q03.lightingIntent.objective, '客席右手前の二人を柔らかく照らし、バーを暖色で見せながら、残る八名にも最低限の明るさを残す。');

const masksIn = scene => scene.pieces.filter(piece => piece.propShape === 'mask');
const maskStates = [q02, ...technical, q03].map(scene => ({
  sceneId: scene.id,
  total: masksIn(scene).length,
  face: masksIn(scene).filter(piece => piece.holdMode === 'face').length,
  hand: masksIn(scene).filter(piece => piece.holdMode === 'hand').length,
}));
assert.deepEqual(maskStates.map(item => [item.total, item.face, item.hand]), [
  [10, 0, 10],
  [10, 4, 6],
  [10, 8, 2],
  [10, 10, 0],
  [10, 10, 0],
]);

const barAsset = project.sets.find(item => item.id === 'rj-set-bar');
assert.ok(barAsset);
assert.equal(barAsset.kind, 'prop');
assert.equal(barAsset.propShape, 'counter');
assert.deepEqual(barAsset.dims, { w: 2.4, d: 0.6, h: 1.1 });
assert.match(`${barAsset.note} ${barAsset.sourceNote}`, /Stage Sketch.*counter/);
assert.equal(barAsset.confidence, 'unverified');
assert.equal(project.sets.some(item => item.id === 'rj-set-bar-shelf'), false);
assert.equal(documentContains(document, 'rj-set-bar-shelf'), false);

const barsIn = scene => scene.pieces.filter(piece => piece.setId === 'rj-set-bar');
assert.equal(barsIn(technical[0]).length, 0);
assert.equal(barsIn(technical[1]).length, 1);
assert.equal(barsIn(technical[2]).length, 1);
assert.equal(barsIn(q03).length, 1);
assert.equal(barsIn(technical[1])[0].u, 0.92);
assert.deepEqual(barsIn(technical[1])[0].route, { u: 0.5, v: 0.12, bu: 0.7, bv: 0.1 });
assert.ok(technical[1].pieces.filter(piece => piece.type === 'performer' && ['FRIAR_LAWRENCE', 'FRIAR_JOHN'].includes(piece.originId)).length === 2);

const sourceChecks = {};
for (const [name, evidence] of Object.entries(manifest.sources)) {
  const actual = sha256(fs.readFileSync(new URL(evidence.path, manifestUrl)));
  sourceChecks[name] = { expected: evidence.sha256, actual, unchangedSinceBuild: actual === evidence.sha256 };
  assert.equal(actual, evidence.sha256, `${name} changed after artifact build; rebuild only after re-review`);
}

const report = {
  status: 'pass',
  checkedAt: new Date().toISOString(),
  validator: 'mcp-server/src/stage-model.js validateDocument',
  nativeSchemaValid: native.valid,
  nativeWarnings: native.warnings,
  sha256: outputSha256,
  counts: {
    sections: project.scenes.filter(scene => scene.kind === 'section').length,
    scenes: scenes.length,
    cast: project.cast.length,
    sets: project.sets.length,
    pieces: pieceCount,
    heldReferences: heldReferenceCount,
    danglingReferences: dangling.length,
    identicalRoleLightingObjectives: identicalRoleLighting.length,
    m6TechnicalScenes: technical.length,
    removedShelfReferences: 0,
  },
  m6: {
    q02Timing: q02.rehearsal,
    technicalTiming: technical.map(scene => ({ sceneId: scene.id, ...scene.rehearsal })),
    maskStates,
    barPresence: technical.map(scene => ({ sceneId: scene.id, count: barsIn(scene).length })),
    barAsset: { kind: barAsset.kind, propShape: barAsset.propShape, dims: barAsset.dims, confidence: barAsset.confidence },
  },
  sources: sourceChecks,
  compatibilityPolicy: manifest.compatibilityEvidence.policy,
  scope: 'Native schema and isolated sample semantics. Browser import/export and rendered UI are checked separately.',
};
assert.deepEqual(qa.fingerprint(), productAtStart, 'product changed during structural check');
report.productFiles = productAtStart;
fs.mkdirSync(new URL('./qa/', import.meta.url), { recursive: true });
fs.writeFileSync(reportUrl, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

function documentContains(value, needle) {
  if (value === needle) return true;
  if (Array.isArray(value)) return value.some(item => documentContains(item, needle));
  if (value && typeof value === 'object') return Object.values(value).some(item => documentContains(item, needle));
  return false;
}
