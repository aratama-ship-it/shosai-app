import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import worker from '../worker.js';
import { StudyLinks, STUDY_LIMITS, studySceneKeys } from '../study-links.js';
import { validateReaderNote } from '../study-reader-account.js';

const token = 'a'.repeat(48), context = 'c'.repeat(64), origin = 'https://study.example';
const doc = () => ({ kind: 'shosai-stage-sketch', version: 4, project: { id: 'continuity', title: '確認', venue: 'proscenium', venueSize: 'mid', scenes: [
  { id:'one', kind:'scene', title:'入口', pieces:[] }, { id:'two', kind:'scene', title:'終幕', pieces:[] },
] }, venues:[] });
const note = () => ({ text:'old text <img onerror=alert(1)>', strokes:[{view:'front',points:[[.2,.3],[.5,.6]]},{view:'plan',points:[[.1,.1],[.8,.8]]}], sceneTitle:'入口', revision:1, publication:token, context, updatedAt:'2026-09-10T00:00:00.000Z' });
const scripts = await Promise.all(['stage-study-continuity.js','stage-study-private.js'].map(name => readFile(new URL('../'+name,import.meta.url),'utf8')));
function model() {
  const saved = new Map(), sandbox = { window:{}, structuredClone, crypto, localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)} };
  for(const source of scripts) vm.runInNewContext(source,sandbox);
  return { ...sandbox.window.SHOSAI_STUDY_CONTINUITY, create:sandbox.window.SHOSAI_STUDY_PRIVATE, saved };
}
function setup() {
  let saved = new Map();
  const ops = map => ({ get:async key=>structuredClone(map.get(key)),put:async(key,value)=>map.set(key,structuredClone(value)),delete:async key=>map.delete(key),list:async({prefix='' }={})=>new Map([...map].filter(([key])=>key.startsWith(prefix))) });
  const storage = { transaction:async fn=>{ const copy=structuredClone(saved); const result=await fn(ops(copy)); saved=copy;return result; } };
  let object = new StudyLinks({storage});
  const env = {STAGE_BETA_ACTIVE:'true',STUDY_ALLOW_ANONYMOUS:'true',SITE_USER:'alice',SITE_PASS:'local-alice',GUEST_ACCOUNTS:JSON.stringify([{user:'bob',pass:'local-bob'}]),STUDY_LINKS:{idFromName:x=>x,get:()=>object},ASSETS:{fetch:async()=>new Response('asset')}};
  const call = (path,method='GET',body,owner) => worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,...(owner?{Authorization:'Basic '+btoa(owner+':local-'+owner)}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{});
  const issue = async() => {const r=await call('/study/api/owner/shows/continuity','POST',{document:doc()},'alice');assert.equal(r.status,201);return (await r.json()).link.token;};
  return {call,issue,restart:()=>{object=new StudyLinks({storage});},saved:()=>saved};
}

test('scene identity tolerates rename/reorder but detects pieces, venue dimensions and shared assets',async()=>{
  const a=doc(), b=structuredClone(a), keys=await studySceneKeys(a);
  b.project.scenes.reverse();b.project.scenes[1].title='renamed';b.project.activeSceneId='two';
  assert.deepEqual(await studySceneKeys(b),keys);
  b.project.scenes[1].pieces.push({id:'piece',x:.1});assert.notEqual((await studySceneKeys(b)).one,keys.one);assert.equal((await studySceneKeys(b)).two,keys.two);
  b.project.venueSize='large';assert.notEqual((await studySceneKeys(b)).two,keys.two);
  b.venues.push({id:'custom',width:10});assert.notEqual((await studySceneKeys(b)).two,keys.two);
});
test('old snapshots survive update/restart; deleted/added scenes remain in their correct revisions',async()=>{
  const s=setup(),t=await s.issue(),path='/study/api/view/'+t,newDoc=doc();
  newDoc.project.scenes.shift();newDoc.project.scenes.push({id:'three',kind:'scene',title:'new',pieces:[]});
  assert.equal((await s.call('/study/api/owner/links/'+t,'PUT',{document:newDoc},'alice')).status,200);s.restart();
  const old=await s.call(path+'/revisions/1');assert.equal(old.status,200);assert.match(old.headers.get('Cache-Control'),/no-store/);
  assert.deepEqual((await old.json()).document,doc());
  const latest=await(await s.call(path)).json();assert.deepEqual(latest.changes,{added:1,removed:1,changed:0});assert.equal(latest.revision,2);
  assert.deepEqual(latest.document,newDoc);assert.deepEqual(latest.historyRevisions,[1]);assert.match(latest.notebookId,/^[a-f0-9]{64}$/);
  assert.equal((await s.call(path+'/notes')).status,404);
});
test('historical views obey revocation, strict paths, read-only methods and owner isolation',async()=>{
  const s=setup(),t=await s.issue(),view='/study/api/view/'+t,owner='/study/api/owner/links/'+t;
  assert.equal((await s.call(owner,'PUT',{document:doc()},'bob')).status,404);
  await s.call(owner,'PUT',{document:doc()},'alice');
  for(const path of ['/revisions/0','/revisions/01','/revisions/9999999999','/revisions/2/notes','/revisions/../notes'])assert.equal((await s.call(view+path)).status,404,path);
  for(const method of ['POST','PUT','DELETE'])assert.equal((await s.call(view+'/revisions/1',method,method==='DELETE'?undefined:{document:doc()})).status,404);
  await s.call(owner,'DELETE',undefined,'alice');
  for(const path of [view,view+'/revisions/1','/study/api/view/'+'0'.repeat(48)+'/revisions/1']){
    const r=await s.call(path);assert.equal(r.status,404);assert.deepEqual(await r.json(),{error:'link-unavailable'});
  }
});
test('history limits refuse the new update without dropping earlier publications or owner feedback',async()=>{
  const s=setup(),t=await s.issue(),path='/study/api/owner/links/'+t;
  await s.call('/study/api/view/'+t+'/notes','POST',{sceneId:'one',revision:1,name:'A',text:'Keep me'});
  for(let i=0;i<STUDY_LIMITS.historyRevisions;i++)assert.equal((await s.call(path,'PUT',{document:doc()},'alice')).status,200);
  const r=await s.call(path,'PUT',{document:doc()},'alice');assert.equal(r.status,409);assert.equal((await r.json()).error,'history-full');
  assert.equal((await(await s.call('/study/api/view/'+t)).json()).revision,51);
  assert.equal((await s.call('/study/api/view/'+t+'/revisions/1')).status,200);
  assert.equal((await(await s.call(path+'/notes','GET',undefined,'alice')).json()).notes[0].text,'Keep me');
  await s.call(path,'DELETE',undefined,'alice');await s.call(path+'/purge','DELETE',undefined,'alice');
  assert.equal([...s.saved().keys()].some(key=>key.startsWith('history:'+t+':')),false);
});
test('unchanged drawings continue; changed drawings start clean while preserving the complete old note',()=>{
  const m=model(),original=note(),scene={id:'one',title:'Renamed'},same={revision:2,sceneKeys:{one:context}},changed={revision:2,sceneKeys:{one:'d'.repeat(64)}};
  const sameDraft=m.prepare(original,scene,same,token);assert.deepEqual(sameDraft.strokes,original.strokes);
  const promoted=m.promote(sameDraft,scene,same,token);assert.equal(promoted.revision,2);assert.equal(promoted.history[0].revision,1);
  const draft=m.prepare(original,scene,changed,token);assert.equal(draft.text,'');assert.equal(draft.strokes.length,0);assert.equal(draft.history[0].text,original.text);
  assert.deepEqual(original,note());
});
test('deleted scenes stay listed and selected text/strokes copy to any current scene, keeping both originals',()=>{
  const m=model(),store=m.create(token);store.put('deleted',note());store.put('target',{...note(),text:'target note'});
  const sources=m.list(store.list(),token);assert.equal(sources.length,2);const old=sources.find(e=>e.sceneId==='deleted');
  const data={revision:2,sceneKeys:{target:context}},scene={id:'target',title:'Target'};
  const value=m.copySelection(store.get('target'),old,scene,data,token,'selected text',[old.strokes[1]]);
  assert.equal(value.text,'target note\nselected text');assert.equal(value.strokes.length,3);assert.equal(value.history.length,1);
  assert.equal(value.copiedFrom.sceneId,'deleted');assert.equal(store.put('target',value),true);
  assert.equal(store.get('deleted').text,note().text);assert.equal(store.get('target').history[0].text,'target note');
  const again=m.create(token);assert.equal(m.list(again.list(),token).length,3);
  assert.throws(()=>m.copySelection(value,old,scene,data,token,'x'.repeat(2000),[]),/copyFull/);
  assert.throws(()=>m.copySelection(value,old,scene,data,token,'',[]),/selectContent/);
});
test('bounded note history rejects nested/malformed entries and overflow, preserving storage',()=>{
  const m=model(),store=m.create(token),value=m.archive(note(),'one',token);assert.equal(store.put('one',value),true);
  const before=[...m.saved];
  for(const invalid of [{...value,history:[{...value.history[0],sceneId:123}]},{...value,history:Array(33).fill(value.history[0])},{...value,history:[{...value.history[0],history:[]}]},{...value,history:[{...value.history[0],strokes:[{view:'bad',points:[[0,0]]}]}]}]){
    assert.equal(store.put('one',invalid),false);assert.throws(()=>validateReaderNote(invalid),/invalid-private-note/);
  }
  assert.deepEqual([...m.saved],before);
  const validated=validateReaderNote(value);assert.equal(validated.history[0].text,note().text);assert.equal(validated.context,context);
  assert.throws(()=>m.archive({...note(),history:Array(32).fill(value.history[0])},'one',token),/historyFull/);
});
test('verified stable notebook IDs reconnect device notes on reissue without touching the legacy key or another show',()=>{
  const m=model();m.create(token).put('one',note());const legacy=m.saved.get('stage-study-private-v1:'+token);
  const notebook='e'.repeat(64),store=m.create(token,notebook);assert.equal(store.get('one').text,note().text);store.put('one',note());
  assert.equal(m.create('b'.repeat(48),notebook).get('one').text,note().text);
  assert.equal(m.create('b'.repeat(48),'f'.repeat(64)).get('one'),null);
  assert.equal(m.saved.get('stage-study-private-v1:'+token),legacy);
});

test('server notebook identity survives reissue and is distinct for another owner of the same show ID',async()=>{
  const s=setup(),token=await s.issue();const first=await(await s.call('/study/api/view/'+token)).json();
  await s.call('/study/api/owner/links/'+token,'DELETE',undefined,'alice');const secondToken=await s.issue();
  const second=await(await s.call('/study/api/view/'+secondToken)).json();assert.equal(first.notebookId,second.notebookId);
  const r=await s.call('/study/api/owner/shows/continuity','POST',{document:doc()},'bob');assert.equal(r.status,201);
  const otherToken=(await r.json()).link.token;const other=await(await s.call('/study/api/view/'+otherToken)).json();assert.notEqual(other.notebookId,first.notebookId);
  assert.equal((await s.call('/study/api/view/'+token+'/revisions/1')).status,404);
});

test('feedback inbox accessible heading does not collide with the existing product-feedback dialog',async()=>{
  const [owner,index]=await Promise.all(['stage-study-owner.js','stage.html'].map(name=>readFile(new URL('../'+name,import.meta.url),'utf8')));
  const heading=owner.match(/heading\.id = '([^']+)'/)[1];
  assert.equal(index.includes('id="'+heading+'"'),false);
  assert.ok(owner.includes("dialog.setAttribute('aria-labelledby', '"+heading+"')"));
});
