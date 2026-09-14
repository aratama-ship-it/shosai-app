import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import bridge from './workflow-annotation-bridge-2026-09-09.js';
import snapshot from './workflow-snapshot-canonical-2026-09-09.js';

const here = new URL('.', import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(new URL(name, here), 'utf8'));
const [stageExport, workflow, annotations] = await Promise.all([
  readJson('stage-sketch-v4-binding-fixture-2026-09-09.json'),
  readJson('project-workflow-fixture-2026-09-09.json'),
  readJson('workflow-annotation-binding-fixture-2026-09-09.json'),
]);
const expectedSnapshotHash = `sha256:${createHash('sha256').update(snapshot.canonicalBaseExportJson(stageExport), 'utf8').digest('hex')}`;

const valid = bridge.validateBinding({ stageExport, workflow, annotations, expectedSnapshotHash });
assert.equal(valid.ok, true, valid.errors.join('\n'));
assert.deepEqual(valid.sceneIds.sort(), ['scene-fixture-3', 'scene-fixture-4']);

const chief = bridge.buildReadModel({ stageExport, workflow, annotations, expectedSnapshotHash, viewerId: 'chief', cueId: 'cue-q12' });
assert.equal(chief.binding.ok, true);
assert.equal(chief.scene.id, 'scene-fixture-4');
assert.equal(chief.cue.number, 'Q12');
assert.equal(chief.sceneMarkups.length, 3, 'チーフは音響・照明の部門共有と制作チーム共有を確認できる');
assert.equal(chief.workflowNotes.length, 1, 'チーフは照明のQ12メモを確認できる');
assert.equal(chief.activities.length, 1);
assert.equal(chief.cueActivities[0].id, 'activity-carry-table');
assert.equal(chief.sceneMarkups.some((item) => item.id === 'markup-sound-private'), false, '音響privateはチーフに出ない');
assert.equal(chief.sceneMarkups.some((item) => item.id === 'markup-performer-private'), false, '演者privateはチーフに出ない');

const sound = bridge.buildReadModel({ stageExport, workflow, annotations, expectedSnapshotHash, viewerId: 'sound', cueId: 'cue-q13' });
assert.equal(sound.workflowNotes.length, 1);
assert.equal(sound.workflowNotes[0].id, 'note-sound-q13');
assert.equal(sound.sceneMarkups.some((item) => item.id === 'markup-lighting-direction'), false, '音響は照明部門共有を読めない');

const wrongBinding = structuredClone(workflow);
wrongBinding.projectBinding.projectId = 'other-project';
const mismatch = bridge.validateBinding({ stageExport, workflow: wrongBinding, annotations, expectedSnapshotHash });
assert.equal(mismatch.ok, false);
assert.ok(mismatch.errors.some((item) => item.includes('projectId')));

const missingScene = structuredClone(annotations);
missingScene.sceneMarkups[0].sceneId = 'scene-missing';
const unresolved = bridge.validateBinding({ stageExport, workflow, annotations: missingScene, expectedSnapshotHash });
assert.equal(unresolved.ok, false);
assert.ok(unresolved.errors.some((item) => item.includes('scene-missing')));

const wrongHash = bridge.validateBinding({ stageExport, workflow, annotations, expectedSnapshotHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' });
assert.equal(wrongHash.ok, false);
assert.ok(wrongHash.errors.some((item) => item.includes('baseSnapshotHash')));

console.log('workflow annotation bridge passed: v4 snapshot hash, scene/cue references, chief aggregation, private isolation, mismatch guards');
