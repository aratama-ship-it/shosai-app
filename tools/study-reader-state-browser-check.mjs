import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url), imported=await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT || require.resolve('playwright')));
const {chromium}=imported.default || imported;
import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
// Run after study-reader-browser-check.mjs, which creates fresh synthetic links.
const root=fileURLToPath(new URL('../',import.meta.url));
const links=JSON.parse(await readFile(root+'/docs/study-links/qa/reader-result.json','utf8')).links;
const base=process.env.STUDY_BASE || 'http://127.0.0.1:8800',token=links[1].token,url=base+'/study?lang=ja#'+token;
const browser=await chromium.launch({headless:true,channel:'chrome'}),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage(),checks=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));ctx.setDefaultTimeout(20000);
const ready=()=>p.waitForFunction(()=>document.querySelector('#study-status').textContent.includes('公開された'));
try{
 await ctx.request.post(base+'/study/auth/local',{data:{account:'reader-b'},headers:{Origin:base}});
 await p.goto(url);await ready();
 const scene=await p.locator('#study-scenes').inputValue();
 await p.evaluate(({token,scene})=>localStorage.setItem('stage-study-private-v1:'+token,JSON.stringify({version:1,entries:{[scene]:{text:'引き継ぎを自分で選ぶメモ',sceneTitle:'入口',revision:1,updatedAt:new Date().toISOString(),strokes:[{view:'front',points:[[.1,.1],[.5,.5]]}]}}})),{token,scene});
 await p.reload();await ready();assert.equal(await p.locator('#study-note').inputValue(),'');await p.locator('#study-import').waitFor();
 await p.locator('#study-import-button').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#study-save-status').textContent.includes('アカウントに保存済み'));
 assert.equal(await p.locator('#study-note').inputValue(),'引き継ぎを自分で選ぶメモ');checks.push('legacy device notes are imported only on explicit action');
 await p.route('**/study/api/me/notebook/**',async route=>{if(route.request().method()==='PUT')await route.abort();else await route.continue();});
 await p.locator('#study-note').fill('通信失敗でも残す自分用メモ');await p.waitForFunction(()=>document.querySelector('#study-save-status').textContent.includes('通信待ち'));checks.push('failed sync displays pending, never a false saved status');
 await p.reload();await ready();assert.equal(await p.locator('#study-note').inputValue(),'通信失敗でも残す自分用メモ');await p.unrouteAll();
 await p.waitForFunction(()=>document.querySelector('#study-save-status').textContent.includes('アカウントに保存済み'));checks.push('pending note survives reload and syncs after reconnect');
 await p.locator('#study-send').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await p.locator('#study-send').click();
 await p.waitForFunction(()=>document.querySelector('#study-note-status').textContent.includes('オーナーへ共有しました'));checks.push('actual mouse click shares the screen');
 await p.locator('#study-note').focus();const style=await p.locator('#study-note').evaluate(el=>getComputedStyle(el).outlineStyle);assert.equal(style,'solid');checks.push('visible keyboard focus');
 const a=await ctx.request.post(base+'/study/auth/local',{data:{account:'reader-a'},headers:{Origin:base}});assert.equal(a.status(),200);
 await p.locator('#study-note').fill('旧タブから別アカウントへ送らない');await p.waitForFunction(()=>document.querySelector('#study-status').textContent.includes('ログインして続けて'));checks.push('account switch blocks stale tab writes in the live browser');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));await writeFile(root+'/docs/study-links/qa/reader-states-result.json',JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
