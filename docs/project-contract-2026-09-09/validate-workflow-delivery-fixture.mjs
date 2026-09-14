import { readFile } from 'node:fs/promises';

const fixture = JSON.parse(await readFile(new URL('./workflow-timeline-fixture-2026-09-09.json', import.meta.url), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const ids = (items) => new Set((items || []).map((item) => item.id));
const cues = ids(fixture.script?.cues);
const people = ids(fixture.coordination?.people);
const delivery = fixture.distribution;
const recipients = delivery?.recipients || [];
const recipientIds = ids(recipients);

fail(fixture.capabilities?.includes('workflow-delivery-v1'), 'delivery capability');
fail(fixture.capabilities?.includes('workflow-web-view-v1'), 'web viewer capability');
fail(delivery?.version === 1, 'delivery version');
fail(recipients.length >= 7, 'recipient coverage');
fail(recipients.some((item) => item.kind === 'overview'), 'overview recipient');
fail(recipients.some((item) => item.id === 'recipient-lighting'), 'lighting recipient');
fail(recipients.some((item) => item.id === 'recipient-sound'), 'sound recipient');
fail(recipients.some((item) => item.id === 'recipient-performers'), 'performer recipient');

for (const recipient of recipients) {
  fail(recipient.id && recipient.label, `recipient identity: ${recipient.id || 'missing'}`);
  fail(Array.isArray(recipient.formats) && recipient.formats.includes('csv') && recipient.formats.includes('print-html'), `formats: ${recipient.id}`);
  if (recipient.kind === 'person') fail(people.has(recipient.personId), `recipient person: ${recipient.id}`);
}

const assignedCues = new Set();
for (const assignment of delivery?.cueAssignments || []) {
  fail(cues.has(assignment.cueId), `assignment cue: ${assignment.cueId}`);
  fail(Array.isArray(assignment.recipientRefs) && assignment.recipientRefs.length, `assignment recipients: ${assignment.cueId}`);
  assignment.recipientRefs.forEach((recipientId) => fail(recipientIds.has(recipientId), `assignment recipient: ${recipientId}`));
  assignedCues.add(assignment.cueId);
}
fail(assignedCues.size === fixture.script.cues.length, 'every cue routes to a recipient');
const q13 = (delivery?.cueAssignments || []).find((assignment) => assignment.cueId === 'cue-q13');
fail(q13?.recipientRefs.includes('recipient-sound'), 'Q13 reaches sound despite missing anchor');
fail(delivery?.contextPolicy?.includeAdjacentCues === true, 'adjacent context policy');
fail(delivery?.contextPolicy?.showUnassignedWarning === true, 'unassigned warning policy');

const viewer = fixture.webViewer;
fail(viewer?.version === 1, 'web viewer version');
fail(cues.has(viewer?.focusCueId), 'web viewer focus cue');
fail(viewer?.checkPolicy?.persist === false, 'web viewer checks never claim an operational record');
fail(viewer?.notePolicy?.storage === 'browser-local', 'web viewer notes remain browser-local in this fixture');
fail(viewer?.notePolicy?.scope === 'recipient-scene-and-cue', 'web viewer notes are separated by recipient, scene, and cue');
fail(viewer?.notePolicy?.sharing === 'none', 'web viewer notes never claim sharing');
fail(viewer?.annotationPolicy?.storage === 'browser-local', 'stage annotations remain browser-local in this fixture');
fail(viewer?.annotationPolicy?.scope === 'recipient-and-scene', 'stage annotations are separated by recipient and scene');
fail(viewer?.annotationPolicy?.sharing === 'none', 'stage annotations never claim sharing');
fail(Array.isArray(viewer?.annotationPolicy?.kinds) && viewer.annotationPolicy.kinds.includes('arrow') && viewer.annotationPolicy.kinds.includes('note'), 'stage annotation kinds');
const stageStateCueIds = new Set();
for (const stageState of viewer?.stageStates || []) {
  fail(cues.has(stageState.cueId), `stage state cue: ${stageState.cueId}`);
  fail(!stageStateCueIds.has(stageState.cueId), `duplicate stage state cue: ${stageState.cueId}`);
  stageStateCueIds.add(stageState.cueId);
  fail(stageState.sceneRef && stageState.sceneLabel && stageState.status && stageState.stageNote, `stage state text: ${stageState.cueId}`);
  for (const piece of stageState.pieces || []) {
    fail(piece.id && piece.label && piece.kind, `stage piece: ${stageState.cueId}`);
    fail(Number.isFinite(piece.u) && piece.u >= 0 && piece.u <= 1, `stage piece u: ${piece.id}`);
    fail(Number.isFinite(piece.v) && piece.v >= 0 && piece.v <= 1, `stage piece v: ${piece.id}`);
  }
}
fail(stageStateCueIds.size === fixture.script.cues.length, 'every cue has a stage context');
console.log(`workflow delivery fixture passed: ${recipients.length} recipients, ${assignedCues.size} routed cues, ${stageStateCueIds.size} stage states, Q13 routes to sound with warning`);
