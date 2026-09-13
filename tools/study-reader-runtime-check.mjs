import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(process.env.STUDY_MINIFLARE||require.resolve('miniflare')));
const persistence=await mkdtemp('/tmp/study-reader-runtime-'),base='http://127.0.0.1:8801';
const options={...convertV4MiniflareOptions({name:'reader-runtime',modules:['worker.js','study-links.js','study-reader-account.js','study-reader-auth.js','study-reader-api.js','session-room.js','usage-metrics.js','usage-admin-page.js'].map(name=>({type:'ESModule',path:resolve(root,name)})),modulesRoot:root,compatibilityDate:'2026-08-19',host:'127.0.0.1',port:8801,durableObjects:{STUDY_LINKS:{className:'StudyLinks',useSQLite:true},STUDY_READER_AUTH:{className:'StudyReaderAuth',useSQLite:true},STUDY_READER_ACCOUNTS:{className:'StudyReaderAccount',useSQLite:true}},bindings:{SITE_USER:'owner',SITE_PASS:'fake-owner',GUEST_ACCOUNTS:JSON.stringify([{user:'other',pass:'fake-other'}]),STUDY_LOCAL_READER_LOGIN:'true'},serviceBindings:{ASSETS:async()=>new Response('asset')}}),resourcePersistencePath:persistence};
let mf,checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS',label);};
const call=(path,{cookie='',user,method='GET',body,headers={}}={})=>mf.dispatchFetch(base+path,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json',...(user?{Authorization:'Basic '+btoa(user+':fake-'+user)}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
try{
 mf=new Miniflare(options);await mf.ready;
 const document={kind:'shosai-stage-sketch',version:4,project:{id:'reader-runtime',title:'Notebook SQLite test',scenes:[{kind:'scene',id:'s1',title:'第一場',pieces:[]}]}};
 const issue=await call('/study/api/owner/shows/reader-runtime',{user:'owner',method:'POST',body:{document}});check('owner issues real SQLite snapshot',issue.status===201);const token=(await issue.json()).link.token;
 const login=await call('/study/auth/local',{method:'POST',body:{account:'reader-a'}});check('opaque session persisted in SQLite',login.status===200);const cookie=login.headers.get('Set-Cookie').split(';')[0];
 const joined=await call('/study/api/me/connect',{cookie,method:'POST',body:{token}});check('invitation connects account',joined.status===200);const id=(await joined.json()).connection.id,path='/study/api/me/notebook/'+id+'/s1';
 const body={baseVersion:0,operationId:crypto.randomUUID(),entry:{text:'あ'.repeat(2000),sceneTitle:'第一場',publication:token,revision:1,strokes:Array.from({length:64},(_,i)=>({view:i%2?'front':'plan',points:Array.from({length:512},(_,j)=>[j/1000,i/100])}))}};
 body.entry.history = [{ id: crypto.randomUUID(), sceneId:'s1', sceneTitle:'元の場面', publication:token, revision:1, updatedAt:'2026-09-10T00:00:00.000Z', text:'引き継ぐ前のメモ <img src=x>', strokes:[{view:'front',points:[[.2,.3],[.4,.5]]}] }];
 body.entry.stickies = [{ id:'pinned-current', view:'plan', x:.25, y:.4, text:'待機位置 <img src=x>', shape:'bubble', color:'sage', width:260, height:144, backgroundOpacity:.5 }];
 body.entry.history[0].stickies = [{ id:'pinned-earlier', view:'front', x:.1, y:.2, text:'以前の位置', shape:'rounded', color:'rose', backgroundOpacity:0 }];
 body.entry.copiedFrom = { sceneId:'s1', publication:token, revision:1 };
 const saved=await call(path,{cookie,method:'PUT',body});check('bounded long Japanese text and all 32768 points save across chunks',saved.status===200);const canonical=(await saved.json()).entry;
 await mf.dispose();mf=new Miniflare(options);await mf.ready;
 check('session remains valid after process restart',(await(await call('/study/api/me',{cookie})).json()).identity?.displayName==='演者 A / Reader A');
 const restored=await call(path,{cookie});check('personal note survives process restart',restored.status===200);assert.deepEqual((await restored.json()).entry,canonical);check('text and normalized pen points roundtrip exactly',true);
 check('historical text and strokes remain private and intact',canonical.history[0].text==='引き継ぐ前のメモ <img src=x>'&&canonical.history[0].strokes.length===1);
 check('current and historical pinned notes survive SQLite restart',canonical.stickies[0].text==='待機位置 <img src=x>'&&canonical.history[0].stickies[0].text==='以前の位置');
 check('pinned note shape, color and dimensions survive SQLite restart',canonical.stickies[0].shape==='bubble'&&canonical.stickies[0].color==='sage'&&canonical.stickies[0].width===260&&canonical.stickies[0].height===144&&canonical.history[0].stickies[0].shape==='rounded'&&canonical.history[0].stickies[0].color==='rose');
 check('current and historical background opacity survive SQLite restart',canonical.stickies[0].backgroundOpacity===.5&&canonical.history[0].stickies[0].backgroundOpacity===0);
 for (const backgroundOpacity of [-.01,1.01,'0.5',null]) {
  const invalid=structuredClone(body);invalid.baseVersion=1;invalid.operationId=crypto.randomUUID();invalid.entry.stickies[0].backgroundOpacity=backgroundOpacity;
  assert.equal((await call(path,{cookie,method:'PUT',body:invalid})).status,400);
 }
 check('private API rejects out-of-range and non-number background opacity',true);
 check('idempotent retry after restart keeps version 1',(await(await call(path,{cookie,method:'PUT',body})).json()).version===1);
 const results=await Promise.all(['PC','Phone'].map(text=>call(path,{cookie,method:'PUT',body:{...body,baseVersion:1,operationId:crypto.randomUUID(),entry:{...body.entry,text}}})));check('real SQLite transaction accepts one competing edit and rejects one',results.map(r=>r.status).sort().join(',')==='200,409');
 const account=(await(await call('/study/api/me',{cookie})).json()).identity;
 const second=await call('/study/auth/local',{method:'POST',body:{account:'reader-b'}}),otherCookie=second.headers.get('Set-Cookie').split(';')[0];await call('/study/api/me/connect',{cookie:otherCookie,method:'POST',body:{token}});
 check('account switch rejects stale tab header',(await call(path,{cookie:otherCookie,headers:{'X-Study-Reader':account.id}})).status===401);
 check('second reader has no first reader notes',(await(await call(path,{cookie:otherCookie})).json()).entry===null);
 check('owner cannot read private notes',(await call(path,{user:'owner'})).status===401);
 await call('/study/api/owner/links/'+token,{user:'owner',method:'DELETE'});check('revocation also blocks private notebook access',(await call(path,{cookie})).status===404);
 await call('/study/auth/logout',{cookie,method:'POST',body:{}});await mf.dispose();mf=new Miniflare(options);await mf.ready;
 check('logout remains revoked after restart',(await call('/study/api/view/'+token,{cookie})).status===401);
 console.log(`Reader SQLite runtime: ${checks}/${checks} passed`);
}finally{if(mf)await mf.dispose();}
