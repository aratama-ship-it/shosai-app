import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../stage-study-private.js', import.meta.url), 'utf8');
const token = 'a'.repeat(48), key = `stage-study-private-v1:${token}`;
const entry = () => ({ text: '自分だけのメモ <img src=x>', sceneTitle: '入場', revision: 1, updatedAt: new Date().toISOString(), strokes: [{ view: 'front', points: [[.25,.5],[.4,.7]] }] });
function setup(saved = new Map()) {
  const storage = { getItem: k => saved.get(k) || null, setItem: (k,v) => saved.set(k,v) };
  const sandbox = { window: {}, localStorage: storage, structuredClone };
  vm.runInNewContext(source, sandbox);
  return { create: sandbox.window.SHOSAI_STUDY_PRIVATE, saved, storage };
}
test('private text and strokes survive reload with scene and token isolation; show keys untouched', () => {
  const s = setup(new Map([['shosai-stage-sketch-v1', 'existing-show'], ['shosai-stage-shows-v1','existing-shelf']]));
  const store = s.create(token), value = entry(); assert.ok(store.put('scene-1', value));
  assert.ok(store.put('scene-2', { ...value, text: 'second' }));
  const restored = s.create(token); assert.deepEqual(restored.get('scene-1'), value); assert.equal(restored.get('scene-2').text, 'second');
  assert.equal(s.create('b'.repeat(48)).get('scene-1'), null);
  assert.equal(s.saved.get('shosai-stage-sketch-v1'), 'existing-show'); assert.equal(s.saved.get('shosai-stage-shows-v1'), 'existing-shelf');
  const changed = restored.get('scene-1'); changed.strokes[0].points[0][0] = .9;
  assert.equal(restored.get('scene-1').strokes[0].points[0][0], .25);
});
test('private store merges other scenes and preserves old revision for an explicit warning', () => {
  const s = setup(), a = s.create(token), b = s.create(token);
  a.put('s1', entry()); b.put('s2', { ...entry(), revision: 2 });
  assert.equal(s.create(token).get('s1').revision, 1); assert.equal(s.create(token).get('s2').revision, 2);
});
test('unreadable private data is never overwritten; quota failure retains current notes in memory', () => {
  const s = setup(new Map([[key, '{broken']])); const store = s.create(token);
  assert.equal(store.readable(), false); assert.equal(store.put('s1', entry()), false); assert.equal(s.saved.get(key), '{broken'); assert.equal(store.get('s1').text, entry().text);
  const q = setup(); const draft = q.create(token); q.storage.setItem = () => { throw new Error('quota'); };
  const value = entry(); assert.equal(draft.put('s1', value), false); assert.deepEqual(draft.get('s1'), value);
});
test('private data validation limits structure, coordinates, text and storage size', () => {
  const s = setup(), store = s.create(token);
  for (const value of [null, [], { ...entry(), text: 3 }, { ...entry(), text: 'x'.repeat(2001) }, { ...entry(), strokes: [{ view: 'other', points: [[0,0]] }] }, { ...entry(), strokes: [{ view: 'front', points: [[Infinity,0]] }] }, { ...entry(), strokes: [{ view: 'plan', points: [[-1,0]] }] }]) assert.equal(store.put('s1',value), false);
  assert.equal(store.put('__proto__',entry()), false); assert.throws(() => s.create('bad'));
  assert.equal(s.saved.size, 0);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|sendBeacon|indexedDB|shosai-stage-sketch-v1/);
});
