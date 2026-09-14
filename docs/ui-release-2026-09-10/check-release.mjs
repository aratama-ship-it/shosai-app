import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import worker from './release-bundle.mjs';
const dir='/tmp/stage-ui-release-20260910';
const manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json','utf8'));
let fallbacks=[];
const env={SITE_USER:'fixture-owner',SITE_PASS:'fixture-owner-pass',GUEST_ACCOUNTS:JSON.stringify([{user:'fixture-guest',pass:'fixture-pass'}]),STAGE_BETA_ACTIVE:'true',ASSETS:{fetch:async r=>{fallbacks.push(new URL(r.url).pathname);return new Response('existing:'+new URL(r.url).pathname,{headers:{'Content-Type':'text/plain'}});}}};
const req=(p,user='guest',method='GET')=>new Request('https://fixture.example'+p,{method,headers:user?{Authorization:'Basic '+Buffer.from(user==='owner'?'fixture-owner:fixture-owner-pass':'fixture-guest:fixture-pass').toString('base64')}:{}});
let checks=0;const check=()=>checks++;
for(const item of manifest.assets){
 const response=await worker.fetch(req('/'+item.path+'?verify=release'),env,{});assert.equal(response.status,200,item.path);assert.equal(response.headers.get('X-Stage-UI-Release'),'20260910');
 const body=await response.text();
 if(item.path==='stage.html'){assert(!body.includes('stage-shows.local.js'));assert(!body.includes('stage-study-owner.js'));assert(body.includes('id="stage-beat-templates-open"'));}else{assert.equal(crypto.createHash('sha256').update(body).digest('hex'),item.sha256,item.path);}
 assert.equal(response.headers.get('cache-control'),'private, no-store');check();
 const head=await worker.fetch(req('/'+item.path,'guest','HEAD'),env,{});assert.equal(head.status,200);assert.equal(await head.text(),'');check();
 const unauth=await worker.fetch(req('/'+item.path,null),env,{});assert([401,302].includes(unauth.status));check();
}
for(const p of ['/','/index.html','/stage-shows.local.js','/study-reader-api.js','/usage-metrics.js']){const r=await worker.fetch(req(p),env,{});assert.equal(r.status,p==='/'?303:403,p);check();}
const owner=await worker.fetch(req('/private-existing-file','owner'),env,{});assert.equal(await owner.text(),'existing:/private-existing-file');check();
const icon=await worker.fetch(req('/icons/stage-sketch-192.png',null),env,{});assert.equal(await icon.text(),'existing:/icons/stage-sketch-192.png');check();
const alias=await worker.fetch(req('/stage?lang=en'),env,{});assert.equal(alias.status,200);assert((await alias.text()).includes('stage-sketch.js?v=339'));check();
const sandbox={window:{},localStorage:{getItem:()=>null,setItem:()=>{}},console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(dir+'/beta/stage-venues.js','utf8'),sandbox);assert.equal(sandbox.window.SHOSAI_VENUES.list.length,7);assert(sandbox.window.SHOSAI_VENUES.byId('theatre-tram'));check();
assert.deepEqual(fallbacks,['/private-existing-file','/icons/stage-sketch-192.png']);check();
fs.writeFileSync(dir+'/release-checks.json',JSON.stringify({checks,passed:true,betaAssetCount:manifest.assets.length,authPreserved:true,privateFallbackPreserved:true,venueGenericChoices:7},null,2));
console.log(JSON.stringify({checks,passed:true}));
