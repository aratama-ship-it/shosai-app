import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { StudyLinks } from '../study-links.js';
import { StudyReaderAccount, validateReaderNote, readerDigest } from '../study-reader-account.js';
import { StudyReaderAuth, verifyGoogleToken, handleReaderAuth } from '../study-reader-auth.js';
const origin = 'http://127.0.0.1:8800';
function namespace(Class) {
  const instances = new Map(), stores = new Map();
  return { stores, idFromName: id => id, get(id) {
    if (!instances.has(id)) {
      const saved = stores.get(id) || new Map(); stores.set(id, saved); let alarm = null, queue = Promise.resolve();
      const storage = { get: async k => structuredClone(saved.get(k)), put: async (k,v) => saved.set(k,structuredClone(v)), delete: async k => saved.delete(k), list: async ({prefix='',limit=Infinity}={}) => new Map([...saved].filter(([k])=>k.startsWith(prefix)).slice(0,limit)), getAlarm: async()=>alarm, setAlarm: async value=>{alarm=value;} };
      storage.transaction = fn => { const p=queue.then(()=>fn(storage));queue=p.catch(()=>{});return p; };
      instances.set(id, new Class({storage}));
    } return instances.get(id);
  }, restart(){instances.clear();} };
}
function setup() {
  const env = { SITE_USER:'owner',SITE_PASS:'fake-owner',GUEST_ACCOUNTS:JSON.stringify([{user:'other',pass:'fake-other'}]),STUDY_LOCAL_READER_LOGIN:'true',
    STUDY_LINKS:namespace(StudyLinks),STUDY_READER_AUTH:namespace(StudyReaderAuth),STUDY_READER_ACCOUNTS:namespace(StudyReaderAccount), ASSETS:{fetch:async()=>new Response('asset')} };
  const call=(path,{cookie='',user,method='GET',body,headers={}}={})=>worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,Cookie:cookie,...(user?{Authorization:'Basic '+btoa(user+':fake-'+user)}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env,{});
  const login=async(account='reader-a')=>{const r=await call('/study/auth/local',{method:'POST',body:{account}});assert.equal(r.status,200);return r.headers.get('Set-Cookie').split(';')[0];};
  const issue=async(user='owner',id='same-show')=>{const r=await call('/study/api/owner/shows/'+id,{user,method:'POST',body:{document:{kind:'shosai-stage-sketch',version:4,project:{id,title:user+' Show',scenes:[{id:'s1',kind:'scene',title:'入口',pieces:[]},{id:'s2',kind:'scene',title:'Finale',pieces:[]}]}}}});assert.equal(r.status,201);return(await r.json()).link.token;};
  const join=async(cookie,token)=>{const r=await call('/study/api/me/connect',{cookie,method:'POST',body:{token}});assert.equal(r.status,200);return(await r.json()).connection.id;};
  return{env,call,login,issue,join};
}
const entry=(token,text='私だけ <script>alert(1)</script>')=>({text,sceneTitle:'入口',publication:token,revision:1,strokes:[{view:'front',points:[[.1,.2],[.8,.4]]}]});
const note=(token,text,baseVersion=0)=>({baseVersion,operationId:crypto.randomUUID(),entry:entry(token,text)});
test('free login creates isolated HttpOnly sessions; anonymous, forged cookies and editor access fail',async()=>{
 const s=setup(),token=await s.issue(),cookie=await s.login();
 assert.equal((await s.call('/study/api/view/'+token)).status,401);
 assert.equal((await s.call('/study/api/view/'+token,{cookie:'stage_study_reader='+'a'.repeat(64)})).status,401);
 assert.equal((await s.call('/study/api/view/'+token,{cookie})).status,200);
 for(const path of ['/stage.html','/index.html','/library.html','/roster.js','/whoami','/session/create','/study/api/owner/shows/same-show']) assert.ok([401,302,404].includes((await s.call(path,{cookie})).status),path);
 assert.equal((await s.call('/study/api/view/'+token,{cookie,method:'PUT',body:{document:{}}})).status,404);
 assert.equal((await s.call('/study/api/view/'+token+'/notes',{cookie})).status,404);
 const r=await s.call('/study/auth/local',{method:'POST',body:{account:'reader-a'}});assert.match(r.headers.get('Set-Cookie'),/HttpOnly; SameSite=Lax/);assert.match(r.headers.get('Set-Cookie'),/Path=\/study;/);
});
test('one reader joins different owners, notes survive a new device and storage restart, other accounts cannot read them',async()=>{
 const s=setup(),a=await s.login(),b=await s.login('reader-b'),t1=await s.issue(),t2=await s.issue('other');
 const c1=await s.join(a,t1),c2=await s.join(a,t2);assert.notEqual(c1,c2);
 const path='/study/api/me/notebook/'+c1+'/s1',body=note(t1);
 assert.equal((await s.call(path,{cookie:a,method:'PUT',body})).status,200);
 s.env.STUDY_READER_ACCOUNTS.restart();const phone=await s.login();
 const loaded=await(await s.call(path,{cookie:phone})).json();assert.equal(loaded.entry.text,body.entry.text);assert.deepEqual(loaded.entry.strokes,body.entry.strokes);
 assert.equal((await(await s.call('/study/api/me/links',{cookie:phone})).json()).connections.length,2);
 assert.equal((await s.call(path,{cookie:b})).status,404);
 await s.join(b,t1);assert.equal((await(await s.call(path,{cookie:b})).json()).entry,null);
 assert.deepEqual((await(await s.call('/study/api/owner/links/'+t1+'/notes',{user:'owner'})).json()).notes,[]);
 assert.match((await s.call(path,{cookie:a})).headers.get('Cache-Control'),/no-store/);
});
test('CAS protects concurrent changes and retry is idempotent; a stale device gets both versions',async()=>{
 const s=setup(),a=await s.login(),token=await s.issue(),c=await s.join(a,token),path='/study/api/me/notebook/'+c+'/s1',body=note(token,'PC');
 assert.equal((await s.call(path,{cookie:a,method:'PUT',body})).status,200);
 assert.equal((await(await s.call(path,{cookie:a,method:'PUT',body})).json()).version,1);
 assert.equal((await s.call(path,{cookie:a,method:'PUT',body:{...body,entry:entry(token,'wrong reuse')}})).status,409);
 const r=await s.call(path,{cookie:a,method:'PUT',body:note(token,'Phone')});assert.equal(r.status,409);const conflict=await r.json();assert.equal(conflict.entry.text,'PC');assert.equal(conflict.version,1);
 assert.equal((await s.call(path,{cookie:a,method:'PUT',body:note(token,'Chosen by user',1)})).status,200);
});
test('explicit sharing uses verified reader display name, sends no private account permission and stays owner only',async()=>{
 const s=setup(),cookie=await s.login(),token=await s.issue();
 const r=await s.call('/study/api/view/'+token+'/notes',{cookie,method:'POST',body:{name:'forged owner',text:'shared',revision:1,sceneId:'s1'},headers:{'X-Study-Owner':'account:owner','X-Study-Name':'forged'}});assert.equal(r.status,201);
 const notes=(await(await s.call('/study/api/owner/links/'+token+'/notes',{user:'owner'})).json()).notes;assert.equal(notes[0].name,'演者 A / Reader A');
 for(const method of ['GET','PUT','DELETE'])assert.equal((await s.call('/study/api/owner/links/'+token+(method==='GET'?'/notes':''),{cookie,method,...(method==='PUT'?{body:{document:{}}}:{})})).status,401);
});
test('revocation blocks private notebook reads/writes, old tokens fail, reissue reconnects stable notebook',async()=>{
 const s=setup(),cookie=await s.login(),token=await s.issue(),c=await s.join(cookie,token),path='/study/api/me/notebook/'+c+'/s1';
 await s.call(path,{cookie,method:'PUT',body:note(token,'keep')});await s.call('/study/api/owner/links/'+token,{user:'owner',method:'DELETE'});
 assert.equal((await s.call(path,{cookie})).status,404);assert.equal((await s.call(path,{cookie,method:'PUT',body:note(token,'blocked',1)})).status,404);
 for(const t of [token,'0'.repeat(48),'invalid'])assert.equal((await s.call('/study/api/view/'+t,{cookie})).status,404);
 const next=await s.issue();assert.notEqual(next,token);assert.equal(await s.join(cookie,next),c);assert.equal((await(await s.call(path,{cookie})).json()).entry.text,'keep');
 assert.equal((await s.call(path,{cookie,method:'PUT',body:note(token,'old publication',1)})).status,409);
});
test('logout revokes the server session; expired sessions and cross-origin writes fail closed',async()=>{
 const s=setup(),cookie=await s.login();
 assert.equal((await s.call('/study/auth/local',{method:'POST',body:{account:'reader-a'},headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await s.call('/study/api/me/connect',{cookie,method:'POST',body:{token:'0'.repeat(48)},headers:{Origin:'https://evil.example'}})).status,403);
 await s.call('/study/auth/logout',{cookie,method:'POST',body:{}});assert.equal((await(await s.call('/study/api/me',{cookie})).json()).identity,null);
 const expired=await s.login();for(const values of s.env.STUDY_READER_AUTH.stores.values())for(const v of values.values())v.expires=0;
 assert.equal((await(await s.call('/study/api/me',{cookie:expired})).json()).identity,null);
 const prod=await handleReaderAuth(new Request('https://public.example/study/auth/local',{method:'POST',headers:{Origin:'https://public.example','Content-Type':'application/json'},body:'{"account":"reader-a"}'}),s.env);assert.equal(prod.status,404);
});
test('private notes enforce types, size, coordinates, scene ownership and rate limits without storing IP/UA',async()=>{
 const s=setup(),cookie=await s.login(),token=await s.issue(),c=await s.join(cookie,token),path='/study/api/me/notebook/'+c+'/s1';
 for(const bad of [null,{}, {...entry(token),text:1},{...entry(token),text:'x'.repeat(2001)},{...entry(token),strokes:[{view:'front',points:[[Infinity,0]]}]},{...entry(token),strokes:Array(65).fill({view:'plan',points:[[0,0]]})}])assert.throws(()=>validateReaderNote(bad));
 assert.equal((await s.call(path,{cookie,method:'PUT',body:note(token,'x'.repeat(800000))})).status,413);
 assert.equal((await s.call('/study/api/me/notebook/'+c+'/other-scene',{cookie,method:'PUT',body:note(token)})).status,400);
 for(let i=0;i<120;i++)assert.equal((await s.call(path,{cookie,method:'PUT',body:note(token,'edit '+i,i)})).status,200);
 assert.equal((await s.call(path,{cookie,method:'PUT',body:note(token,'limited',120)})).status,429);
 const saved=JSON.stringify([...s.env.STUDY_READER_ACCOUNTS.stores.values()].map(m=>[...m]));assert.ok(!saved.includes('User-Agent'));assert.ok(!saved.includes('127.0.0.1'));
});
test('Google RS256 validation rejects wrong signature, audience, issuer, nonce and expiry',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256',use:'sig'},now=Math.floor(Date.now()/1000);
 const claims={iss:'https://accounts.google.com',aud:'client',sub:'verified-123',iat:now,exp:now+300,nonce:'nonce',name:'演者'};
 const sign=async(c,h={alg:'RS256',kid:'test-key'})=>{const input=Buffer.from(JSON.stringify(h)).toString('base64url')+'.'+Buffer.from(JSON.stringify(c)).toString('base64url');return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');};
 assert.deepEqual(await verifyGoogleToken(await sign(claims),'client','nonce',[jwk]),{subject:'google:verified-123',displayName:'演者'});
 for(const patch of [{iss:'https://evil.example'},{aud:'other'},{nonce:'wrong'},{exp:now-1},{iat:now+120},{azp:'evil'},{sub:'../owner'}])await assert.rejects(verifyGoogleToken(await sign({...claims,...patch}),'client','nonce',[jwk]));
 await assert.rejects(verifyGoogleToken(await sign(claims,{alg:'none',kid:'test-key'}),'client','nonce',[jwk]));
 const jwt=await sign(claims);await assert.rejects(verifyGoogleToken(jwt.slice(0,-10)+'AAAAAAAAAA','client','nonce',[jwk]));
});
test('Google login state keeps invite server-side, binds browser and consumes once; missing config does not bypass login',async()=>{
 const s=setup();assert.equal((await s.call('/study/auth/start',{method:'POST',body:{}})).status,503);
 Object.assign(s.env,{STUDY_GOOGLE_CLIENT_ID:'fake-client',STUDY_GOOGLE_CLIENT_SECRET:'synthetic-only',STUDY_GOOGLE_REDIRECT_URI:origin+'/study/auth/callback'});
 const token='b'.repeat(48),r=await s.call('/study/auth/start',{method:'POST',body:{token,lang:'ja'}});assert.equal(r.status,200);
 const auth=new URL((await r.json()).url);assert.equal(auth.origin,'https://accounts.google.com');assert.ok(!auth.href.includes(token));assert.ok(!auth.href.includes('synthetic-only'));assert.equal(auth.searchParams.get('code_challenge_method'),'S256');
 const stateKey='flow:'+await readerDigest(auth.searchParams.get('state')),store=s.env.STUDY_READER_AUTH.get('reader-auth-v1');
 const call=body=>store.fetch(new Request('https://auth.internal/take',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await(await call({key:stateKey,browser:'wrong'})).json()).flow,undefined);
 const browser=r.headers.get('Set-Cookie').split(';')[0].split('=')[1],body={key:stateKey,browser:await readerDigest(browser)};
 assert.equal((await(await call(body)).json()).flow.token,token);assert.equal((await(await call(body)).json()).flow,undefined);
});

test('an old tab cannot write its personal notes or shared screen into a newly signed-in account',async()=>{
 const s=setup(),a=await s.login(),b=await s.login('reader-b'),token=await s.issue(),id=await s.join(a,token);await s.join(b,token);
 const expected=(await(await s.call('/study/api/me',{cookie:a})).json()).identity.id;
 for(const path of ['/study/api/me/notebook/'+id+'/s1','/study/api/view/'+token+'/notes'])assert.equal((await s.call(path,{cookie:b,method:path.includes('notebook')?'PUT':'POST',body:note(token),headers:{'X-Study-Reader':expected}})).status,401);
});
test('OAuth callback exchanges a code, validates Google signature and returns the original invite; cancel keeps it retryable',async()=>{
 const s=setup();Object.assign(s.env,{STUDY_GOOGLE_CLIENT_ID:'callback-client',STUDY_GOOGLE_CLIENT_SECRET:'fake-secret',STUDY_GOOGLE_REDIRECT_URI:origin+'/study/auth/callback'});
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'callback-key',alg:'RS256',use:'sig'},now=Math.floor(Date.now()/1000),token='c'.repeat(48);
 const start=async()=>{const response=await s.call('/study/auth/start',{method:'POST',body:{token,lang:'en'}});return {url:new URL((await response.json()).url),cookie:response.headers.get('Set-Cookie').split(';')[0]};};
 const flow=await start(),claims={iss:'https://accounts.google.com',aud:'callback-client',sub:'google-reader',name:'Verified Reader',nonce:flow.url.searchParams.get('nonce'),iat:now,exp:now+300};
 const input=Buffer.from(JSON.stringify({alg:'RS256',kid:'callback-key'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url');
 const idToken=input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');
 const originalFetch=globalThis.fetch;let exchanges=0;
 globalThis.fetch=async(url,options)=>{
  if(url==='https://www.googleapis.com/oauth2/v3/certs')return new Response(JSON.stringify({keys:[jwk]}));
  assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.body.get('code'),'fake-code');assert.equal(options.body.get('grant_type'),'authorization_code');assert.equal(options.body.get('client_secret'),'fake-secret');assert.match(options.body.get('code_verifier'),/^[a-f0-9]{64}$/);exchanges++;return new Response(JSON.stringify({id_token:idToken,access_token:'must-not-be-stored'}));
 };
 try{
  const callback='/study/auth/callback?state='+flow.url.searchParams.get('state')+'&code=fake-code';
  const r=await s.call(callback,{cookie:flow.cookie});assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/study?lang=en#'+token);assert.match(r.headers.get('Set-Cookie'),/stage_study_reader=[a-f0-9]{64}/);
  await s.call(callback,{cookie:flow.cookie});assert.equal(exchanges,1,'OAuth state is single use');
  const session=r.headers.get('Set-Cookie').match(/stage_study_reader=[a-f0-9]{64}/)[0];assert.equal((await(await s.call('/study/api/me',{cookie:session})).json()).identity.displayName,'Verified Reader');
  const storage=JSON.stringify([...s.env.STUDY_READER_AUTH.stores.values()].map(m=>[...m]));assert.ok(!storage.includes('must-not-be-stored'));assert.ok(!storage.includes('fake-secret'));assert.ok(!storage.includes(idToken));
 }finally{globalThis.fetch=originalFetch;}
 const canceled=await start();const r=await s.call('/study/auth/callback?state='+canceled.url.searchParams.get('state')+'&error=access_denied',{cookie:canceled.cookie});assert.equal(r.headers.get('Location'),'/study?lang=en&login=failed#'+token);
});
test('library and notebook storage ceilings fail safely without discarding saved notes',async()=>{
 const ns=namespace(StudyReaderAccount),stub=ns.get('limit-test'),id='d'.repeat(64),token='e'.repeat(48);
 const call=(path,body)=>stub.fetch(new Request('https://reader.internal'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const connection={id,token,showId:'show',title:'Show',ownerName:'Owner'};
 assert.equal((await call('/join',{connection})).status,200);const saved=ns.stores.get('limit-test');saved.set('connectionCount',100);
 assert.equal((await call('/join',{connection:{...connection,id:'f'.repeat(64)}})).status,409);
 // Reopening an existing invitation does not consume another place.
 assert.equal((await call('/join',{connection})).status,200);
 for(const [key,value]of [['notebook:'+id,{scenes:[],bytes:2097152}],['totalBytes',20971520]]){
  saved.set(key,value);
  const r=await stub.fetch(new Request('https://reader.internal/notebook/'+id+'/s1',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(note(token))}));assert.equal(r.status,409);assert.equal(saved.has('note:'+id+':s1'),false);saved.delete(key);
 }
});
test('editor login does not silently replace a signed-out performer account',async()=>{
 const s=setup();assert.equal((await(await s.call('/study/api/me',{user:'owner'})).json()).identity,null);
 const cookie=await s.login();assert.ok((await(await s.call('/study/api/me',{cookie,user:'owner'})).json()).identity);
 await s.call('/study/auth/logout',{cookie,user:'owner',method:'POST',body:{}});
 assert.equal((await(await s.call('/study/api/me',{cookie,user:'owner'})).json()).identity,null);
});


test('pinned notes sync privately across devices, survive restart and follow normal authorization and CAS', async()=>{
 const s=setup(),cookie=await s.login(),token=await s.issue(),c=await s.join(cookie,token),path='/study/api/me/notebook/'+c+'/s1';
 const body=note(token,'');body.entry.stickies=[{id:'sticky-1',view:'plan',x:.25,y:.5,text:'図の自分用メモ <img src=x>'}];
 assert.equal((await s.call(path,{cookie,method:'PUT',body})).status,200);
 s.env.STUDY_READER_ACCOUNTS.restart();const phone=await s.login();
 assert.deepEqual((await(await s.call(path,{cookie:phone})).json()).entry.stickies,body.entry.stickies);
 assert.equal((await s.call(path,{user:'owner'})).status,401);
 const other=await s.login('reader-b');await s.join(other,token);
 assert.equal((await(await s.call(path,{cookie:other})).json()).entry,null);
 assert.deepEqual((await(await s.call('/study/api/owner/links/'+token+'/notes',{user:'owner'})).json()).notes,[]);
 const conflict=await s.call(path,{cookie,method:'PUT',body:{...body,operationId:crypto.randomUUID()}});
 assert.equal(conflict.status,409);assert.deepEqual((await conflict.json()).entry.stickies,body.entry.stickies);
});
