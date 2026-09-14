import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin='http://127.0.0.1:18396';
const checks=[];
async function check(name,path,expected,options={},inspect) {
 const response=await fetch(origin+path,{redirect:'manual',...options});
 assert.equal(response.status,expected,name);
 if(inspect) await inspect(response);
 checks.push({name,path,status:response.status});
 return response;
}
await check('anonymous programmatic fetch is refused','/stage.html?lang=en',401);
await check('English sign-in title','/sign-in?next=%2Fstage.html%3Flang%3Den',200,{},async r=>assert.match(await r.text(),/<h1>Stage Sketch<\/h1>/));
const body=new URLSearchParams({user:'test-guest',pass:'guest-test-only',next:'/stage.html?lang=en#session=example'});
const login=await check('guest sign-in preserves English and fragment','/sign-in',303,{method:'POST',body},r=>assert.equal(r.headers.get('location'),'/stage.html?lang=en#session=example'));
const cookie=login.headers.get('set-cookie').split(';')[0];
const auths=[{Cookie:cookie},{Authorization:'Basic '+btoa('test-guest:guest-test-only')}];
for(const headers of auths) {
 for(const path of ['/index.html','/index','/db.js','/%64b.js','/roster-key.local.js','/stage-shows.local.js','/manual/new-private.html','/stage.html%2f..%2fdb.js']) {
  await check('guest cannot read private resource',path,403,{headers});
 }
 await check('guest root opens English stage','/?lang=en',303,{headers},r=>assert.equal(r.headers.get('location'),'/stage.html?lang=en'));
 await check('real asset canonical redirect preserves query','/stage.html?lang=en',307,{headers},r=>assert.equal(r.headers.get('location'),'/stage?lang=en'));
 await check('guest stage HTML is complete and contains no private script','/stage?lang=en',200,{headers},async r=>{
  const html=await r.text(); assert.match(html,/id="view-stage"/); assert.doesNotMatch(html,/<script[^>]+stage-shows\.local\.js/); assert.match(html,/<title>舞台スケッチ \| Stage Sketch<\/title>/);
 });
 for(const path of ['/stage-sketch.js','/stage-sw.js','/manual/manual-content.js','/manual/quick-en','/manual/QuickGuide_2026-08-28.pdf']) await check('guest app dependency',path,200,{headers});
}
await check('guest whoami','/whoami',200,{headers:auths[0]},async r=>assert.equal((await r.json()).user,'test-guest'));
await check('guest can create local shared session','/session/new',200,{method:'POST',headers:auths[0]},async r=>{const data=await r.json(); assert.ok(data.roomId&&data.hostKey);assert.equal(data.user,'test-guest');});
const owner={Authorization:'Basic '+btoa('test-owner:owner-test-only')};
await check('owner study remains accessible','/',200,{headers:owner},async r=>assert.match(await r.text(),/Owner fixture/));
await check('owner data remains accessible','/db.js',200,{headers:owner},async r=>assert.match(await r.text(),/SYNTHETIC_PRIVATE_DB/));
await check('owner shows remain accessible','/stage-shows.local.js',200,{headers:owner},async r=>assert.match(await r.text(),/SYNTHETIC_PRIVATE_SHOWS/));
await writeFile('/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/guest-access-2026-09-08/native-checks.json',JSON.stringify({environment:'Local workerd, synthetic credentials and private-data fixtures only',checks},null,2));
console.log(`${checks.length} native HTTP checks passed`);
