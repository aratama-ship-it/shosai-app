import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(process.env.STUDY_MINIFLARE||require.resolve('miniflare')));
const root=fileURLToPath(new URL('../',import.meta.url)),persistence=await mkdtemp('/tmp/study-image-runtime-');
const options={...convertV4MiniflareOptions({name:'study-image-runtime',modules:['worker.js','study-reader-auth.js','study-reader-account.js','study-reader-api.js','study-links.js','session-room.js','usage-metrics.js','usage-admin-page.js'].map(name=>({type:'ESModule',path:resolve(root,name)})),modulesRoot:root,compatibilityDate:'2026-08-19',host:'127.0.0.1',port:8799,durableObjects:{STUDY_LINKS:{className:'StudyLinks',useSQLite:true}},bindings:{SITE_USER:'alice',SITE_PASS:'fake-alice',GUEST_ACCOUNTS:JSON.stringify([{user:'bob',pass:'fake-bob'}])}}),resourcePersistencePath:persistence};
const document={kind:'shosai-stage-sketch',version:4,project:{id:'runtime-image',title:'Images persisted in SQLite',scenes:[{kind:'scene',id:'s1',title:'Scene one',pieces:[]}]}};
const fixture=JSON.parse(await readFile(new URL('../tests/study-screen-fixture.json',import.meta.url),'utf8'));
// Force more than one durable storage chunk using a legal JPEG COM segment.
const original=Buffer.from(fixture.dataUrl.split(',')[1],'base64');const comment=Buffer.alloc(40004,32);comment[0]=255;comment[1]=254;comment.writeUInt16BE(40002,2);
const bytes=Buffer.concat([original.subarray(0,2),comment,original.subarray(2)]);
const screen={view:'front',dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64')};
let mf,checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS',label);};
try{
 mf=new Miniflare(options);await mf.ready;
 const call=(path,user,method='GET',body)=>mf.dispatchFetch('http://127.0.0.1:8799'+path,{method,headers:{...((user || (path.startsWith('/study/api/view/') ? 'bob' : ''))?{Authorization:`Basic ${btoa(`${user || 'bob'}:fake-${user || 'bob'}`)}`} :{}),Origin:'http://127.0.0.1:8799','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 let response=await call('/study/api/owner/shows/runtime-image','alice','POST',{document});check('create in real SQLite',response.status===201);
 const token=(await response.json()).link.token,owner=`/study/api/owner/links/${token}`,view=`/study/api/view/${token}`;
 response=await call(view+'/notes',null,'POST',{name:'Performer A',text:'Private note explicitly shared',sceneId:'s1',revision:1,screens:[screen]});check('save chunked screen',response.status===201);
 let notes=(await(await call(owner+'/notes','alice')).json()).notes;const path=owner+`/notes/${notes[0].id}/images/front`;
 check('list contains metadata only',notes.length===1&&notes[0].screens[0].dataUrl===undefined);
 assert.deepEqual(Buffer.from(await(await call(path,'alice')).arrayBuffer()),bytes);check('image chunks reassemble byte for byte',true);
 await call(owner,'alice','PUT',{document});await mf.dispose();mf=new Miniflare(options);await mf.ready;
 notes=(await(await call(owner+'/notes','alice')).json()).notes;check('scene/name/revision survive update and process restart',notes[0].revision===1&&notes[0].name==='bob'&&notes[0].sceneTitle==='Scene one');
 response=await call(path,'alice');check('image no-store after restart',response.headers.get('Cache-Control')==='private, no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);check('image survives process restart',true);
 check('another owner denied',(await call(path,'bob')).status===404);check('anonymous denied',(await call(path)).status===401);
 await call(owner,'alice','DELETE');check('revoked viewer denied',(await call(view)).status===404);
 assert.deepEqual(Buffer.from(await(await call(path,'alice')).arrayBuffer()),bytes);check('received image retained for owner after revoke',true);
 response=await call(owner+'/notes','alice','DELETE');check('owner clears revoked note images',response.status===200);
 check('cleared image path is gone',(await call(path,'alice')).status===404);
 notes=(await(await call(owner+'/notes','alice')).json()).notes;check('cleared note list is empty',notes.length===0);
 response=await call('/study/api/owner/shows/runtime-image','alice','DELETE');check('purge releases revoked show',response.status===200);
 check('purged owner record is gone',(await call(owner,'alice')).status===404);
 console.log(`Shared screen SQLite runtime: ${checks}/${checks} passed`);
}finally{if(mf)await mf.dispose();}
