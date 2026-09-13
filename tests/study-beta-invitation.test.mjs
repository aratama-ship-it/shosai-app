import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { StudyLinks, STUDY_LIMITS, STUDY_PUBLIC_ASSETS } from '../study-links.js';

// No reader auth/account binding: casual beta invitations must work without Google setup.
function setup(flags = { STAGE_BETA_ACTIVE: 'true', STUDY_ALLOW_ANONYMOUS: 'true' }) {
  const saved = new Map(); let queue = Promise.resolve();
  const storage = { get: async k => structuredClone(saved.get(k)), put: async (k,v) => saved.set(k,structuredClone(v)), delete: async k => saved.delete(k), list: async ({prefix=''}) => new Map([...saved].filter(([k]) => k.startsWith(prefix))) };
  storage.transaction = fn => { const p = queue.then(() => fn(storage)); queue = p.catch(() => {}); return p; };
  let object = new StudyLinks({storage});
  const env = { ...flags, SITE_USER:'alice', SITE_PASS:'fake-alice', GUEST_ACCOUNTS:JSON.stringify([{user:'bob',pass:'fake-bob'}]),
    STUDY_LINKS:{idFromName:x=>x,get:()=>({fetch:r=>object.fetch(r)})}, ASSETS:{fetch:async()=>new Response('asset')} };
  const origin = 'https://study.example';
  const call = (path, {user, method='GET', body, headers={}}={}) => worker.fetch(new Request(origin+path, {method,
    headers:{Origin:origin,...(user?{Authorization:'Basic '+btoa(user+':fake-'+user)}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},
    ...(body!==undefined?{body:JSON.stringify(body)}:{})}),env,{});
  const document = {kind:'shosai-stage-sketch',version:4,project:{id:'beta-show',title:'招待テスト',scenes:[{kind:'scene',id:'one',title:'入口',pieces:[]},{kind:'scene',id:'two',title:'最後',pieces:[]}]}};
  const issue = async () => { const r=await call('/study/api/owner/shows/beta-show',{user:'alice',method:'POST',body:{document}}); assert.equal(r.status,201); return (await r.json()).link.token; };
  return {call,issue,document,saved,restart(){object=new StudyLinks({storage});}};
}
const note = {name:'演者 <A>',text:'<img src=x onerror=alert(1)>',sceneId:'two',revision:1};

test('beta bearer invitation opens all scenes without Google or a reader account; manual snapshots survive restart',async()=>{
  const s=setup(),token=await s.issue(),path='/study/api/view/'+token;
  const me=await(await s.call('/study/api/me')).json(); assert.equal(me.identity,null); assert.equal(me.allowAnonymous,true); assert.equal(me.methods.google,false);
  s.document.project.title='編集中';
  let r=await s.call(path);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');
  const v=await r.json();assert.equal(v.document.project.title,'招待テスト');assert.equal(v.document.project.scenes.length,2);assert.equal(v.displayName,'');assert.equal(v.owner,undefined);
  assert.equal((await s.call(path+'/status')).status,200);
  await s.call('/study/api/owner/links/'+token,{user:'alice',method:'PUT',body:{document:s.document}});s.restart();
  r=await s.call(path);assert.equal((await r.json()).document.project.title,'編集中');
});
test('anonymous access requires both explicit flags and never becomes an account permission',async()=>{
  for(const flags of [{},{STAGE_BETA_ACTIVE:'true'},{STAGE_BETA_ACTIVE:'true',STUDY_ALLOW_ANONYMOUS:'false'},{STAGE_BETA_ACTIVE:'false',STUDY_ALLOW_ANONYMOUS:'true'}]){
    const s=setup(flags);const token=await s.issue();assert.equal((await s.call('/study/api/view/'+token)).status,401);
  }
  const s=setup(),token=await s.issue();
  for(const [path,method,body] of [['/study/api/me/links','GET'],['/study/api/me/connect','POST',{token}],['/study/api/me/notebook/'+'a'.repeat(64),'GET'],['/study/api/me/notebook/'+'a'.repeat(64)+'/one','PUT',{}]]) assert.equal((await s.call(path,{method,body})).status,401);
  assert.equal((await s.call('/study/api/view/'+token,{headers:{'X-Study-Reader':'a'.repeat(64)}})).status,401,'stale logged-in tab cannot silently fall back to device identity');
});
test('beta anonymous path exposes only exact viewer assets and target token operations',async()=>{
  const s=setup(),token=await s.issue(),path='/study/api/view/'+token;
  for(const asset of STUDY_PUBLIC_ASSETS)assert.equal((await s.call(asset)).status,200,asset);
  for(const blocked of ['/index.html','/stage.html','/desk.html','/roster.html','/db.js','/roster-key.local.js','/stage-secret.js','/stage-study-owner.js','/study-assets/roster.js','/study-assets/../db.js','/usage/config','/study/api/owner/links/'+token+'/notes']) assert.ok([401,403,404].includes((await s.call(blocked)).status),blocked);
  for(const method of ['PUT','DELETE','PATCH','POST'])assert.equal((await s.call(path,{method,body:{document:s.document}})).status,404);
  for(const user of [undefined,'bob'])for(const [suffix,method] of [['/notes','GET'],['','PUT'],['','DELETE']]) assert.equal((await s.call('/study/api/owner/links/'+token+suffix,{user,method,...(method==='PUT'?{body:{document:s.document}}:{}),headers:{'X-Study-Owner':'account:alice'}})).status,user?404:401);
  assert.equal((await s.call(path+'/notes')).status,404);
  assert.equal((await s.call('/study/api/view/'+'0'.repeat(48))).status,404);
});
test('explicit anonymous share retains display name as plain text and only owner can list it',async()=>{
  const s=setup(),token=await s.issue(),path='/study/api/view/'+token;
  const r=await s.call(path+'/notes',{method:'POST',body:note,headers:{'X-Study-Name':'forged','X-Study-Owner':'account:alice'}});assert.equal(r.status,201);assert.deepEqual(await r.json(),{ok:true});
  let notes=(await(await s.call('/study/api/owner/links/'+token+'/notes',{user:'alice'})).json()).notes;
  assert.equal(notes[0].name,note.name);assert.equal(notes[0].text,note.text);assert.equal(notes[0].sceneTitle,'最後');assert.ok(Date.parse(notes[0].createdAt));
  await s.call('/study/api/owner/links/'+token,{user:'alice',method:'PUT',body:{document:s.document}});
  notes=(await(await s.call('/study/api/owner/links/'+token+'/notes',{user:'alice'})).json()).notes;assert.equal(notes.length,1);
  assert.equal((await s.call(path+'/notes')).status,404);
});
test('anonymous note validation, cross-origin protection, request bounds and rate limit remain effective',async()=>{
  const s=setup(),token=await s.issue(),path='/study/api/view/'+token+'/notes';
  for(const body of [{...note,text:2},{...note,name:2},{...note,text:'a'.repeat(2001)},{...note,sceneId:'missing'}])assert.equal((await s.call(path,{method:'POST',body})).status,400);
  assert.equal((await s.call(path,{method:'POST',body:note,headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await s.call(path,{method:'POST',body:{...note,text:'a'.repeat(STUDY_LIMITS.noteBytes)}})).status,413);
  for(let i=0;i<5;i++)assert.equal((await s.call(path,{method:'POST',body:note})).status,201);
  assert.equal((await s.call(path,{method:'POST',body:note})).status,429);
  assert.doesNotMatch(JSON.stringify([...s.saved]),/CF-Connecting-IP|User-Agent|X-Study-Client/);
});
test('revoked, missing and malformed tokens share the same error for viewing, status and posts',async()=>{
  const s=setup(),token=await s.issue();await s.call('/study/api/owner/links/'+token,{user:'alice',method:'DELETE'});
  for(const t of [token,'0'.repeat(48),'invalid','a'.repeat(47),'a'.repeat(49)])for(const [suffix,method,body] of [['','GET'],['/status','GET'],['/notes','POST',note]]){
    const r=await s.call('/study/api/view/'+t+suffix,{method,body});assert.equal(r.status,404);assert.deepEqual(await r.json(),{error:'link-unavailable'});
  }
});
