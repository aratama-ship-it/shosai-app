const test = require('node:test');
const assert = require('node:assert/strict');
const { assertImportFidelity } = require('./qa_support.cjs');

function fixture() {
  return { project: { cast: [{ id: 'actor' }], sets: [{ id: 'bar', dims: { w: 2.4 } }],
    scenes: [{ id: 'scene', kind: 'scene', rehearsal: { durationSec: null },
      pieces: [
        { id: 'person', type: 'performer', castId: 'actor', u: .5, v: .5 },
        { id: 'bar-piece', type: 'prop', setId: 'bar', propShape: 'counter', dims: { w: 2.4 }, u: .2, v: .3 },
        { id: 'mask', type: 'prop', heldBy: 'person', holdMode: 'face', u: .5, v: .5 },
      ] }] } };
}
test('identical input passes', () => {
  const expected = fixture();
  assert.equal(assertImportFidelity(expected, structuredClone(expected)).pieces, 3);
});
for (const [name, mutate] of [
  ['performer position', doc => { doc.project.scenes[0].pieces[0].u = .7; }],
  ['independent prop position', doc => { doc.project.scenes[0].pieces[1].v = .7; }],
  ['bar width', doc => { doc.project.scenes[0].pieces[1].dims.w = 10.08; }],
  ['bar shape', doc => { doc.project.scenes[0].pieces[1].propShape = 'wall'; }],
  ['held reference', doc => { doc.project.scenes[0].pieces[2].heldBy = 'unknown'; }],
  ['null timing becomes zero', doc => { doc.project.scenes[0].rehearsal.durationSec = 0; }],
  ['missing piece', doc => { doc.project.scenes[0].pieces.pop(); }],
]) {
  test('rejects ' + name, () => {
    const expected = fixture(), actual = structuredClone(expected);
    mutate(actual);
    assert.throws(() => assertImportFidelity(expected, actual));
  });
}
test('additive native defaults do not hide specified dimension changes', () => {
  const expected = fixture(), actual = structuredClone(expected);
  actual.project.sets[0].dims.lift = 0;
  assert.doesNotThrow(() => assertImportFidelity(expected, actual));
  actual.project.sets[0].dims.w = 10.08;
  assert.throws(() => assertImportFidelity(expected, actual));
});
test('held prop placement is reported separately, not claimed exact', () => {
  const expected = fixture(), actual = structuredClone(expected);
  actual.project.scenes[0].pieces[2].v = .52;
  const result = assertImportFidelity(expected, actual);
  assert.equal(result.heldPlacementAdjustments.length, 1);
  assert.equal(result.heldPlacementAdjustments[0].field, 'v');
});
