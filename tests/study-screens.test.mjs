import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../worker.js';
import { StudyLinks, STUDY_LIMITS, validateSharedScreens } from '../study-links.js';
const screen = JSON.parse(await readFile(new URL('study-screen-fixture.json',import.meta.url),'utf8'));
const document = {kind:'shosai-stage-sketch',version:4,project:{id:'image-test',title:'Image test',scenes:[{kind:'scene',id:'s1',title:'Scene 1',pieces:[]}]}};
function setup(){
 const saved=new Map();const storage={get:async k=>structuredClone(saved.get(k)),put:async(k,v)=>saved.set(k,structuredClone(v)),delete:async k=>saved.delete(k),list:async({prefix})=>new Map([...saved].filter(([k])=>k.startsWith(prefix)))};
 let queue=Promise.resolve();storage.transaction=fn=>{const pending=queue.then(()=>fn(storage));queue=pending.catch(()=>{});return pending;};
 let object=new StudyLinks({storage});
 const env={SITE_USER:'alice',SITE_PASS:'fake-alice',GUEST_ACCOUNTS:JSON.stringify([{user:'bob',pass:'fake-bob'}]),STUDY_LINKS:{idFromName:x=>x,get:()=>({fetch:r=>object.fetch(r)})}};
 const call=(path,user,method='GET',body)=>worker.fetch(new Request('https://study.example'+path,{method,headers:{...((user || (path.startsWith('/study/api/view/') ? 'bob' : ''))?{Authorization:`Basic ${btoa(`${user || 'bob'}:fake-${user || 'bob'}`)}`} :{}),Origin:'https://study.example','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),env,{});
 return{saved,call,restart:()=>{object=new StudyLinks({storage});}};
}
test('shared screens accept bounded JPEGs and derive dimensions from the file',()=>{
 const [valid]=validateSharedScreens([screen]);assert.equal(valid.width,32);assert.equal(valid.height,24);assert.equal(valid.view,'front');
 assert.equal(valid.bytes,Buffer.from(screen.dataUrl.split(',')[1],'base64').length);
 const bad=[null,{},[null],[screen,screen],[screen,{...screen,view:'plan'},screen],[{...screen,view:'top'}],[{...screen,dataUrl:3}],[{...screen,dataUrl:'https://evil.example/image.jpg'}],[{...screen,dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}],[{...screen,dataUrl:'data:image/jpeg;base64,'+btoa('<script>alert(1)</script>')}],[{...screen,dataUrl:screen.dataUrl+'x'.repeat(180000)}]];
 for(const input of bad)assert.throws(()=>validateSharedScreens(input),/invalid-screen/);
 const bytes=Buffer.from(screen.dataUrl.split(',')[1],'base64');const sof=bytes.indexOf(Buffer.from([255,192]));assert.ok(sof>0);
 const large=Buffer.from(bytes);large.writeUInt16BE(65535,sof+7);
 assert.throws(()=>validateSharedScreens([{...screen,dataUrl:'data:image/jpeg;base64,'+large.toString('base64')}]),/invalid-screen/);
});
test('only the matching owner can retrieve shared images, including after update/restart/revocation',async()=>{
 const s=setup();let response=await s.call('/study/api/owner/shows/image-test','alice','POST',{document});assert.equal(response.status,201);
 const token=(await response.json()).link.token,view=`/study/api/view/${token}`,owner=`/study/api/owner/links/${token}`;
 response=await s.call(view+'/notes',null,'POST',{name:'Performer <A>',text:'<img src=x> personal',sceneId:'s1',revision:1,screens:[screen,{...screen,view:'plan'}]});assert.equal(response.status,201);
 let notes=(await(await s.call(owner+'/notes','alice')).json()).notes;assert.equal(notes[0].name,'bob');assert.equal(notes[0].screens.length,2);assert.equal(notes[0].screens[0].dataUrl,undefined);
 const path=owner+`/notes/${notes[0].id}/images/front`;
 const bytes=Buffer.from(screen.dataUrl.split(',')[1],'base64');
 response=await s.call(path,'alice');assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Content-Type'),'image/jpeg');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
 for(const user of [null,'bob'])assert.ok([401,404].includes((await s.call(path,user)).status));
 assert.equal((await s.call(view+`/notes/${notes[0].id}/images/front`)).status,404);assert.equal((await s.call(view+'/notes')).status,404);
 await s.call(owner,'alice','PUT',{document});s.restart();await s.call(owner,'alice','DELETE');
 assert.deepEqual(Buffer.from(await(await s.call(path,'alice')).arrayBuffer()),bytes);
 assert.equal((await s.call(view)).status,404);assert.equal((await s.call(view+'/notes',null,'POST',{name:'A',text:'',sceneId:'s1',revision:2,screens:[screen]})).status,404);
});
test('screen-only shares are valid; malformed images, byte quotas and request sizes are enforced',async()=>{
 const s=setup();const token=(await(await s.call('/study/api/owner/shows/image-test','alice','POST',{document})).json()).link.token;
 const path=`/study/api/view/${token}/notes`,body={name:'A',text:'',sceneId:'s1',revision:1,screens:[screen]};
 assert.equal((await s.call(path,null,'POST',body)).status,201);
 assert.equal((await s.call(path,null,'POST',{...body,screens:[]})).status,400);
 assert.equal((await s.call(path,null,'POST',{...body,screens:[{...screen,dataUrl:'<svg onload=alert(1)>'}]})).status,400);
 assert.equal((await s.call(path,null,'POST',{...body,screens:[{...screen,dataUrl:'x'.repeat(STUDY_LIMITS.noteBytes)}]})).status,413);
 const record=s.saved.get(`link:${token}`);record.imageBytes=STUDY_LIMITS.imageBytesPerLink;s.saved.set(`link:${token}`,record);
 const full=await s.call(path,null,'POST',body);assert.equal(full.status,409);assert.equal((await full.json()).error,'images-full');
 assert.equal((await s.call(path,null,'POST',{...body,screens:[],text:'Legacy text-only note'})).status,201);
});
test('clear, reissue and purge remove stored note-image chunks as part of the owner lifecycle',async()=>{
 const s=setup();let response=await s.call('/study/api/owner/shows/image-test','alice','POST',{document});let token=(await response.json()).link.token;
 const post=()=>s.call(`/study/api/view/${token}/notes`,null,'POST',{name:'A',text:'image',sceneId:'s1',revision:1,screens:[screen]});
 await post();assert.ok([...s.saved.keys()].some(key=>key.startsWith(`note-image:${token}:`)));
 response=await s.call(`/study/api/owner/links/${token}/notes`,'alice','DELETE');assert.equal(response.status,200);
 assert.equal([...s.saved.keys()].some(key=>key.startsWith(`note:${token}:`)||key.startsWith(`note-image:${token}:`)),false);
 await post();await s.call(`/study/api/owner/links/${token}`,'alice','DELETE');const old=token;
 response=await s.call('/study/api/owner/shows/image-test','alice','POST',{document});assert.equal(response.status,201);token=(await response.json()).link.token;
 assert.notEqual(token,old);assert.equal([...s.saved.keys()].some(key=>key.includes(old)),false);
 await post();await s.call(`/study/api/owner/links/${token}`,'alice','DELETE');
 response=await s.call('/study/api/owner/shows/image-test','alice','DELETE');assert.equal(response.status,200);
 assert.equal([...s.saved.keys()].some(key=>key.includes(token)),false);assert.equal(s.saved.get('linkCount'),0);assert.equal(s.saved.get('ownerCount:account:alice'),0);
});
