import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { validateDocument, normalizeLightingIntent } from '../../../../mcp-server/src/stage-model.js';

const file = new URL('./romeo-juliet-full-show.stage-sketch.json', import.meta.url);
const document = JSON.parse(fs.readFileSync(file));
const handoff = JSON.parse(fs.readFileSync(new URL('./romeo-juliet-full-show.handoff.json', import.meta.url)));
const project = document.project;
const source = handoff.sourceShow;
const scenes = project.scenes.filter(s => s.kind === 'scene');
const result = validateDocument(document);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.equal(project.scenes.filter(s => s.kind === 'section').length, 3);
assert.equal(scenes.length, 28);
assert.equal(project.cast.length, 10);
assert.equal(project.sets.length, 13);
assert.equal(handoff.nativeSha256, createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
assert.equal(scenes.reduce((n,s)=>n+s.rehearsal.holdDurationSeconds+s.rehearsal.transitionToNextSeconds,0),1745);
assert.equal(new Set(project.scenes.map(s=>s.id)).size,31);
assert.equal(new Set(scenes.flatMap(s=>s.pieces.map(p=>p.id))).size,scenes.reduce((n,s)=>n+s.pieces.length,0));
assert.equal(handoff.scriptBlocks.length,74);
assert.deepEqual(handoff.scriptBlocks.flatMap(b=>b.dialogue),source.cues.flatMap(c=>c.beats.flatMap(b=>b.dialogue)));
assert.equal(handoff.scriptBlocks.flatMap(b=>b.dialogue).length,47);
assert.equal(handoff.scriptBlocks.flatMap(b=>b.dialogue).filter(s=>s.origin==='new_dialogue_proposal').length,9);
for (const c of handoff.cues) {
  assert.equal(c.nativeSceneIds.reduce((n,id)=>n+scenes.find(s=>s.id===id).rehearsal.holdDurationSeconds,0),c.endProposalSeconds-c.startProposalSeconds);
}
for (const scene of scenes) {
  const map=handoff.frames.find(m=>m.nativeSceneId===scene.id);
  assert.ok(map);
  assert.ok(scene.note.length<=200);
  normalizeLightingIntent(scene.lightingIntent);
  const people=scene.pieces.filter(p=>p.type==='performer');
  assert.equal(new Set(people.map(p=>p.castId)).size,people.length);
  assert.equal(people.length+map.offstageRoleIds.length,10);
  const assigned=new Set(map.roleAssignments.map(a=>a.performerRoleId));
  for (const id of map.offstageRoleIds) assert.ok(!assigned.has(id));
  for (const p of scene.pieces) {
    assert.ok(Number.isFinite(p.u)&&Number.isFinite(p.v)&&p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1);
    assert.ok(Number.isFinite(p.facing)&&p.facing>=0&&p.facing<360);
    if (p.type==='performer') assert.equal(p.color,map.roleAssignments.find(a=>a.nativePieceId===p.id).nativeColor);
  }
}
const byFrame=id=>scenes.find(s=>s.id==='rj-frame-'+id.toLowerCase());
const piece=(scene,role)=>scene.pieces.find(p=>p.originId===role&&p.type==='performer');
const opening=byFrame('RJ-COND-01-A-01');
assert.equal(opening.pieces.filter(p=>p.color==='#655b4c').length,8);
assert.equal(piece(opening,'BENVOLIO').facing,90);
assert.equal(piece(opening,'TYBALT').facing,270);
for (const id of ['RJ-COND-01-C-01','RJ-COND-01-D-01']) {
  const party=byFrame(id);
  const masks=party.pieces.filter(p=>p.holdMode==='face');
  assert.equal(masks.length,10);
  assert.equal(new Set(masks.map(p=>p.heldBy)).size,10);
  for (const m of masks) assert.ok(party.pieces.some(p=>p.id===m.heldBy&&p.type==='performer'));
}
assert.equal(byFrame('RJ-COND-02-A-01').pieces.length,2);
const wedding=byFrame('RJ-COND-02-C-01');
assert.equal(wedding.pieces.filter(p=>p.type==='performer'&&p.facing===180).length,7);
const end=byFrame('RJ-COND-05-D-02');
for (const role of ['ROMEO','JULIET']) assert.equal(piece(end,role).pose,'supine');
for (const role of ['TYBALT','MERCUTIO']) assert.equal(piece(end,role).color,'#655b4c');
assert.deepEqual(project.audioTracks,[]);
assert.equal(project.rehearsal.soundtrack,null);
const report={status:'pass',nativeSchemaValid:true,sections:3,frames:28,cast:10,sets:13,durationProposalSeconds:1745,
  speechPreserved:47,actionBlocksPreserved:74,routeWarnings:result.warnings,
  scope:'Reference validator plus sample semantics. Browser UI import/export is checked separately in check_sample.py.'};
fs.mkdirSync(new URL('./qa/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('./qa/data-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
