import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const imported=await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT||require.resolve('playwright')));
const {chromium}=imported.default||imported;
const base=process.env.STUDY_BASE||'http://127.0.0.1:8800';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const output=new URL('../docs/study-links/qa/',import.meta.url);await mkdir(output,{recursive:true});
const owner=await browser.newContext({extraHTTPHeaders:{Authorization:'Basic '+btoa('study-owner:local-study-owner')}});
const other=await browser.newContext({extraHTTPHeaders:{Authorization:'Basic '+btoa('study-other:local-study-other')}});
const pc=await browser.newContext({viewport:{width:1440,height:1000}}),phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),stranger=await browser.newContext();
const page=await pc.newPage(),mobile=await phone.newPage(),guest=await stranger.newPage(),errors=[],checks=[];
for(const p of [page,mobile,guest])p.on('pageerror',e=>errors.push(e.message));
const ready=p=>p.waitForFunction(()=>/公開された|Showing/.test(document.querySelector('#study-status').textContent));
const synced=p=>p.waitForFunction(()=>/アカウントに保存済み|Saved to your account/.test(document.querySelector('#study-save-status').textContent));
const frame=p=>p.frames().find(f=>f.url().includes('study-frame'));
pc.setDefaultTimeout(20000);phone.setDefaultTimeout(20000);stranger.setDefaultTimeout(20000);
const originalPush=checks.push.bind(checks);checks.push=(value)=>{console.log('PASS',value);return originalPush(value);};
let issued=[];
try{
 const doc=JSON.parse(await readFile(new URL('../docs/study-links/synthetic-review-show.json',import.meta.url),'utf8'));
 for(const [ctx,title]of [[owner,'演者アカウント確認 / Reader account'],[other,'別のオーナーのショー / Another owner']]){
  const document=structuredClone(doc);document.project.id='reader-check-'+crypto.randomUUID();document.project.title=title;
  const r=await ctx.request.post(base+'/study/api/owner/shows/'+document.project.id,{data:{document}});assert.equal(r.status(),201,await r.text());issued.push((await r.json()).link);
 }
 const token=issued[0].token,url=base+'/study?lang=ja#'+token,api=base+'/study/api/view/'+token,ownerApi=base+'/study/api/owner/links/'+token;
 await pc.addInitScript(()=>{if(window===window.top){localStorage.setItem('shosai-stage-sketch-v1','saved-show-sentinel');localStorage.setItem('shosai-stage-shows-v1','saved-shelf-sentinel');}});
 await page.goto(url);await page.locator('#study-local-a').waitFor();assert.equal((await pc.request.get(api)).status(),401);
 await page.screenshot({path:fileURLToPath(new URL('reader-login-ja.png',output)),fullPage:true});
 await page.locator('#study-local-a').click();await ready(page);checks.push('invitation requires free sign-in, then opens show');
 assert.equal(await page.evaluate(()=>localStorage.getItem('shosai-stage-sketch-v1')),'saved-show-sentinel');
 const before=await(await pc.request.get(api)).json();
 await page.locator('#study-note').fill('PCで書いた自分用メモ <script>unsafe()</script>');await synced(page);
 await page.locator('#study-pen').click();
 for(const view of ['front','plan']){
  const layer=frame(page).locator(`[data-pen-view="${view}"]`);await layer.scrollIntoViewIfNeeded();let r=await layer.boundingBox();
  await page.evaluate(y=>window.scrollBy(0,y),r.y-180);r=await layer.boundingBox();
  await page.mouse.move(r.x+r.width*.25,r.y+r.height*.3);await page.mouse.down();await page.mouse.move(r.x+r.width*.55,r.y+r.height*.45,{steps:8});await page.mouse.up();
 }
 await page.waitForFunction(()=>document.querySelector('#study-pen-status').textContent.includes('線 2本'));await synced(page);
 assert.deepEqual((await(await owner.request.get(ownerApi+'/notes')).json()).notes,[]);checks.push('private text and front/plan ink save without sharing');
 await mobile.goto(url);await mobile.locator('#study-local-a').click();await ready(mobile);
 assert.equal(await mobile.locator('#study-note').inputValue(),'PCで書いた自分用メモ <script>unsafe()</script>');await mobile.waitForFunction(()=>document.querySelector('#study-pen-status').textContent.includes('線 2本'));checks.push('separate phone context loads same account text and both drawings');
 await mobile.locator('#study-note').fill('スマホで続けたメモ');await synced(mobile);
 await page.waitForFunction(()=>document.querySelector('#study-note').value==='スマホで続けたメモ');checks.push('phone changes arrive on PC without reload');
 await guest.goto(url);await guest.locator('#study-local-b').click();await ready(guest);assert.equal(await guest.locator('#study-note').inputValue(),'');checks.push('another reader has a separate empty notebook');
 for(const path of ['/stage.html','/index.html','/whoami','/study/api/owner/links/'+token+'/notes'])assert.ok([401,302,404].includes((await stranger.request.get(base+path,{maxRedirects:0})).status()),path);
 await page.bringToFront();await ready(page);await page.locator('#study-send').scrollIntoViewIfNeeded();await page.locator('#study-send').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#study-note-status').textContent.includes('オーナーへ共有しました'));
 const notes=(await(await owner.request.get(ownerApi+'/notes')).json()).notes;assert.equal(notes.length,1);assert.equal(notes[0].name,'演者 A / Reader A');assert.equal(notes[0].screens.length,2);assert.equal(notes[0].text,'スマホで続けたメモ');checks.push('explicit sharing sends verified name, note and two stage images to owner only');
 const after=await(await pc.request.get(api)).json();assert.deepEqual(after.document,before.document);checks.push('pen, notes and sharing never change the published show');
 await page.goto(base+'/study?lang=ja#'+issued[1].token);await ready(page);await page.locator('#study-library-link').click();await page.locator('#study-library').waitFor();assert.ok(await page.locator('#study-library-list li').count()>=2);checks.push('one reader library contains invitations from two owners');
 await page.screenshot({path:fileURLToPath(new URL('reader-library-ja.png',output)),fullPage:true});
 await page.goto(url);await ready(page);
 // Pause the phone before a write, let PC win, then replay the stale write: no silent overwrite.
 let release,waiting;const arrived=new Promise(r=>waiting=r),gate=new Promise(r=>release=r);
 await mobile.route('**/study/api/me/notebook/**',async route=>{if(route.request().method()==='PUT'){waiting();await gate;}await route.continue();});
 await mobile.bringToFront();await ready(mobile);await mobile.locator('#study-note').fill('スマホの競合メモ');await arrived;
 await page.bringToFront();await ready(page);await page.locator('#study-note').fill('PCの競合メモ');await synced(page);release();
 await mobile.locator('#study-conflict').waitFor();assert.equal(await mobile.locator('#study-note').inputValue(),'スマホの競合メモ');assert.equal(await mobile.locator('#study-conflict-remote').inputValue(),'PCの競合メモ');
 await mobile.screenshot({path:fileURLToPath(new URL('reader-conflict-phone.png',output)),fullPage:true});
 await mobile.locator('#study-use-mine').click();await synced(mobile);await page.waitForFunction(()=>document.querySelector('#study-note').value==='スマホの競合メモ');await mobile.unrouteAll();checks.push('simultaneous device edits preserve both versions and explicit resolution syncs');
 const geometry=[];
 for(const lang of ['ja','en'])for(const [width,height]of [[1440,1000],[1024,768],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#study-language').selectOption(lang);await ready(page);await page.evaluate(()=>window.scrollTo(0,0));
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,frame:document.querySelector('iframe').getBoundingClientRect().width,bad:[...document.querySelectorAll('button,input,select,textarea,a.study-action')].filter(el=>el.getClientRects().length&&!el.disabled).filter(el=>el.getBoundingClientRect().height<44).map(el=>el.id)}));
  assert.ok(size.scroll<=size.width,JSON.stringify(size));assert.deepEqual(size.bad,[]);if(width>=1024)assert.ok(size.frame>=width-40);
  geometry.push({lang,width,height,...size});await page.screenshot({path:fileURLToPath(new URL(`reader-${lang}-${width}.png`,output)),fullPage:true});
 }
 checks.push('Japanese/English desktop/tablet/phone portrait/landscape layouts, full-width desktop drawings and 44px controls');
 await page.locator('#study-logout').click();await page.locator('#study-login').waitFor();assert.equal((await pc.request.get(api)).status(),401);checks.push('sign-out revokes reader access');
 assert.deepEqual(errors,[]);await writeFile(new URL('reader-result.json',output),JSON.stringify({checks,geometry,errors,links:issued},null,2));
 console.log(JSON.stringify({checks,errors,reviewURL:url},null,2));
}catch(error){console.log('STATES',await page.locator('body').innerText(),await mobile.locator('body').innerText(),errors);await page.screenshot({path:fileURLToPath(new URL('reader-failure.png',output)),fullPage:true});throw error;}finally{await browser.close();}
