import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { validateReaderNote } from '../study-reader-account.js';
const token = 'a'.repeat(48), context = 'b'.repeat(64);
const sticky = (id = 'note-1') => ({ id, text: '<img src=x onerror=alert(1)>\n待つ', view: 'front', x: .2, y: .3 });
const note = () => ({ text: '', strokes: [], stickies: [sticky()], sceneTitle: '入口', revision: 1, publication: token, context, updatedAt: '2026-09-10T00:00:00Z' });
const sources = await Promise.all(['stage-study-sticky.js','stage-study-private.js','stage-study-continuity.js'].map(n => readFile(new URL('../' + n, import.meta.url),'utf8')));
function model(saved = new Map()) {
  const env = { window: {}, structuredClone, crypto, localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,v) } };
  sources.forEach(src => vm.runInNewContext(src, env));
  return { saved, ...env.window.SHOSAI_STUDY_CONTINUITY, create: env.window.SHOSAI_STUDY_PRIVATE, valid: env.window.SHOSAI_STUDY_STICKY.valid };
}
test('pinned-only notes survive reload and never replace local shows or another invite notebook', () => {
  const m = model(new Map([['shosai-stage-sketch-v1','original-show'],['shosai-stage-shows-v1','original-shelf']]));
  assert.ok(m.create(token).put('scene-1', note()));
  assert.deepEqual(m.create(token).get('scene-1'), note());
  assert.equal(m.create('c'.repeat(48)).get('scene-1'), null);
  assert.equal(m.saved.get('shosai-stage-sketch-v1'), 'original-show');
  assert.equal(m.saved.get('shosai-stage-shows-v1'), 'original-shelf');
  const old = note(); delete old.stickies;
  assert.ok(m.create(token).put('legacy', old)); assert.deepEqual(m.create(token).get('legacy'), old);
});
test('client and server reject malformed, duplicate, oversized and off-diagram pinned notes', () => {
  const m = model(), store = m.create(token);
  for (const stickies of [null, {}, [null], [sticky(), sticky()], Array.from({length:17},(_,i) => sticky('n'+i)),
    [{...sticky(),id:1}], [{...sticky(),text:1}], [{...sticky(),text:'x'.repeat(201)}],
    [{...sticky(),view:'other'}], [{...sticky(),x:NaN}], [{...sticky(),y:Infinity}], [{...sticky(),x:-.1}], [{...sticky(),y:1.1}], [{...sticky(),x:'0.1'}]]) {
    assert.equal(m.valid(stickies), false); assert.equal(store.put('s1', {...note(),stickies}), false);
    assert.throws(() => validateReaderNote({...note(),stickies}), /invalid-private-note/);
  }
  const value = note(); value.stickies = Array.from({length:16}, (_,i) => ({...sticky('n'+i),text:'あ'.repeat(200)}));
  assert.ok(m.valid(value.stickies)); assert.ok(store.put('s1', value)); assert.deepEqual(validateReaderNote(value).stickies,value.stickies);
  assert.equal(validateReaderNote(note()).stickies[0].text, sticky().text);
});
test('changed and removed scenes keep pinned-only history; selected notes copy without changing the original', () => {
  const m = model(), old = note(), scene = {id:'s1',title:'入口'}, data = {revision:2,sceneKeys:{s1:'d'.repeat(64),s2:'e'.repeat(64)}};
  const fresh = m.prepare(old, scene, data, token);
  assert.deepEqual(fresh.history[0].stickies, old.stickies); assert.ok(!fresh.stickies?.length);
  const sources = m.list({removed:old},token); assert.equal(sources.length,1); assert.equal(sources[0].sceneId,'removed');
  const copy = m.copySelection(null,sources[0],{id:'s2',title:'新場面'},data,token,'',[],[old.stickies[0]]);
  assert.equal(copy.stickies[0].text,old.stickies[0].text); assert.notEqual(copy.stickies[0].id,old.stickies[0].id);
  assert.equal(copy.copiedFrom.sceneId,'removed'); assert.deepEqual(old,note());
  assert.ok(m.create(token).put('s2',copy));
  assert.deepEqual(validateReaderNote({...copy,history:fresh.history}).history[0].stickies,old.stickies);
  const same = m.prepare(old,scene,{revision:2,sceneKeys:{s1:context}},token);
  assert.deepEqual(same.stickies,old.stickies);
});
test('copy limits and unreadable pinned-note data preserve originals', () => {
  const m = model(), full = {...note(),stickies:Array.from({length:16},(_,i)=>sticky('n'+i))};
  assert.throws(() => m.copySelection(full,{...note(),sceneId:'s0'},{id:'s1',title:'入口'},{revision:1,sceneKeys:{s1:context}},token,'',[],[sticky()]), /copyFull/);
  const key = `stage-study-private-v1:${token}`, raw = JSON.stringify({version:1,entries:{s1:{...note(),stickies:[{...sticky(),x:'bad'}]}}});
  const damaged = model(new Map([[key,raw]])).create(token);
  assert.equal(damaged.readable(),false); assert.equal(damaged.put('s1',note()),false);
  assert.deepEqual(full.stickies.length,16);
});

test('shape, color and dimensions survive private storage, server validation and selected history copies', () => {
  const m = model(), store = m.create(token);
  for (const shape of ['rect','rounded','bubble']) for (const color of ['desk','paper','yellow','rose','sage','blue']) {
    const value = note(); Object.assign(value.stickies[0], { shape, color, width: 280, height: 144 });
    assert.ok(m.valid(value.stickies)); assert.ok(store.put('s1',value)); assert.deepEqual(store.get('s1'),value);
    assert.deepEqual(validateReaderNote(value).stickies,value.stickies);
    const copy = m.copySelection(null,{...value,sceneId:'s1'},{id:'s2',title:'次'},{revision:2,sceneKeys:{s2:context}},token,'',[],value.stickies);
    assert.deepEqual({...copy.stickies[0],id:value.stickies[0].id},value.stickies[0]);
    const changed = m.prepare(value,{id:'s1',title:'入口'},{revision:2,sceneKeys:{s1:'f'.repeat(64)}},token);
    assert.deepEqual(validateReaderNote(changed).history[0].stickies,value.stickies);
  }
  for (const extra of [{shape:null},{shape:'circle'},{shape:{}},{color:'__proto__'},{color:{toString:()=> 'desk'}},
    {color:'url(https://example.invalid)'},{color:'#fff'},{width:'200'},{width:119},{width:401},{width:Infinity},
    {height:null},{height:43},{height:321},{height:NaN}]) {
    const value = {...note(),stickies:[{...sticky(),...extra}]};
    assert.equal(m.valid(value.stickies),false);assert.equal(store.put('bad',value),false);
    assert.throws(()=>validateReaderNote(value),/invalid-private-note/);
  }
  for (const extra of [{width:120,height:44},{width:400,height:320},{shape:'bubble',color:'sage'}]) {
    const value = {...note(),stickies:[{...sticky(),...extra}]};assert.ok(m.valid(value.stickies));assert.deepEqual(validateReaderNote(value).stickies,value.stickies);
  }
});

test('background opacity preserves legacy notes and roundtrips in current notes, history and selected copies', () => {
  const m = model(), store = m.create(token);
  assert.equal(validateReaderNote(note()).stickies[0].backgroundOpacity, undefined);
  for (const backgroundOpacity of [0, .01, .5, .99, 1]) {
    const value = note(); value.stickies[0].backgroundOpacity = backgroundOpacity;
    assert.ok(m.valid(value.stickies)); assert.ok(store.put('s1', value));
    assert.deepEqual(store.get('s1'), value); assert.deepEqual(validateReaderNote(value).stickies, value.stickies);
    const fresh = m.prepare(value, {id:'s1',title:'入口'}, {revision:2,sceneKeys:{s1:'f'.repeat(64)}}, token);
    assert.deepEqual(validateReaderNote(fresh).history[0].stickies, value.stickies);
    const copied = m.copySelection(null, {...value,sceneId:'removed'}, {id:'s2',title:'追加'}, {revision:2,sceneKeys:{s2:context}}, token, '', [], value.stickies);
    assert.equal(copied.stickies[0].backgroundOpacity, backgroundOpacity);
  }
  for (const backgroundOpacity of [-.01, 1.01, NaN, Infinity, -Infinity, null, '0.5', true, {}, []]) {
    const value = note(); value.stickies[0].backgroundOpacity = backgroundOpacity;
    assert.equal(m.valid(value.stickies), false); assert.equal(store.put('s1', value), false);
    assert.throws(() => validateReaderNote(value), /invalid-private-note/);
    const historical = {...note(), history:[{...value,id:'old',sceneId:'s1'}]};
    assert.throws(() => validateReaderNote(historical), /invalid-private-note/);
  }
});
