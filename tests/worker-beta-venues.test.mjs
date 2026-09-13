import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker.js';
const root = new URL('../', import.meta.url);
const venueSource = fs.readFileSync(new URL('stage-venues.js', root),'utf8');
const swSource = fs.readFileSync(new URL('stage-sw.js', root),'utf8');
test('ベータの実在3会場は選択肢から隠し、保存済みIDと認証を保持する', async () => {
 for(const user of ['owner','guest']) {
  let requested;
  const env={SITE_USER:'owner',SITE_PASS:'fixture-owner',GUEST_USER:'guest',GUEST_PASS:'fixture-guest',ASSETS:{fetch:async request=>{
   requested=request;
   return new Response(new URL(request.url).pathname==='/stage-sw.js'?swSource:venueSource,{headers:{'Content-Type':'application/javascript','ETag':'old','Last-Modified':'old','Content-Length':'1'}});
  }}};
  const auth={Authorization:'Basic '+btoa(user+':fixture-'+user),'If-None-Match':'old',Range:'bytes=0-50'};
  const request=path=>new Request('https://stagesketch.pygmix.com'+path,{headers:auth});
  const response=await worker.fetch(request('/stage-venues.js?v=25'),env,{});
  assert.equal(response.status,200);
  assert.equal(requested.headers.get('Range'),null);
  assert.equal(requested.headers.get('If-None-Match'),null);
  assert.equal(response.headers.get('ETag'),null);
  assert.equal(response.headers.get('Content-Length'),null);
  const storage=new Map();
  const window={localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}};
  vm.runInNewContext(await response.text(),{window});
  const venues=window.SHOSAI_VENUES;
  // 2026-09-12 本人承認により会場3種を追加
  assert.deepEqual(Array.from(venues.list,v=>v.id),['proscenium','thrust','arena','outdoor','blackbox','arena-concert','dome-concert','festival-field','chapiteau','circus-theatre']);
  for (const id of ['theatre-tram','tohu','cirque-dhiver']) {
   assert.equal(venues.list.some(v=>v.id===id),false);
   assert.equal(venues.v2.list.some(v=>v.id===id),false);
   assert.equal(venues.byId(id).id,id);
   assert.equal(venues.byId(id).missing,undefined);
   assert.equal(venues.v2.byId(id).id,id);
  }
  const imported=venues.library.importVenues(['theatre-tram','tohu','cirque-dhiver'].map(id=>venues.library.venueV2ById(id)));
  assert.equal(imported.imported,3);
  for(const venue of imported.venues) {
   assert.ok(venues.list.some(v=>v.id===venue.id),'読み込んだ実在劇場はベータの配信処理でも隠さない');
   assert.ok(venues.v2.list.some(v=>v.id===venue.id));
  }
  const sw=await worker.fetch(request('/stage-sw.js'),env,{});
  const code=await sw.text();
  assert.match(code,/const CACHE_NAME = "stage-sketch-pwa-v\d+-hide-real-venues-20260909";/);
  assert.equal(code.replace('-hide-real-venues-20260909',''),swSource);
  assert.equal((await worker.fetch(new Request('https://stagesketch.pygmix.com/stage-venues.js'),env,{})).status,401);

 }
});
