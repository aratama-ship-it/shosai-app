// Dedicated local touch simulation; this is not an iPhone hardware test.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT||require.resolve('playwright')));
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.cwd(),url=(await readFile(root+'/docs/study-links/sticky-qa/preview-url.txt','utf8')).trim();
if(!url.startsWith('http://127.0.0.1:')||new URL(url).port==='8802')throw new Error('Dedicated local preview only');
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const frame=()=>page.frames().find(f=>f.url().includes('/study-frame'));
const saved=()=>page.waitForFunction(()=>document.querySelector('#study-save-status').textContent.includes('この端末に保存済み'));
const notebook=()=>page.evaluate(()=>JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('stage-study-notebook-v1:'))[1]));
const touch=await context.newCDPSession(page);
try{
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#study-status').textContent.includes('公開された'));
 await page.locator('#study-sticky').tap();const layer=frame().locator('[data-sticky-view="front"]');await layer.scrollIntoViewIfNeeded();const b=await layer.boundingBox();
 await layer.tap({position:{x:b.width*.12,y:b.height*.18}});await page.locator('#study-sticky-text').fill('入口で待機\n合図で前へ');await saved();
 let entries=(await notebook()).entries,id=Object.keys(entries)[0],note=entries[id].stickies[0];
 const n=frame().locator(`[data-sticky-id="${note.id}"]`);await page.locator('#study-frame-host').scrollIntoViewIfNeeded(); await n.scrollIntoViewIfNeeded({timeout:5000});const rect=await n.boundingBox();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+20,y:rect.y+20}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+65,y:rect.y+45}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(({id,x})=>JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('stage-study-notebook-v1:'))[1]).entries[id].stickies[0].x>x,{id,x:note.x});
 note=(await notebook()).entries[id].stickies[0];
 await page.locator('#study-sticky-list').selectOption(note.id);await page.locator('#study-sticky-text').scrollIntoViewIfNeeded();await page.screenshot({path:root+'/docs/study-links/sticky-qa/touch-editor-390.png'});
 await page.setViewportSize({width:844,height:390});await page.setViewportSize({width:390,height:844});assert.deepEqual((await notebook()).entries[id].stickies[0],note);
 await page.locator('#study-frame-host').scrollIntoViewIfNeeded(); await n.scrollIntoViewIfNeeded({timeout:5000});const cancelRect=await n.boundingBox();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cancelRect.x+10,y:cancelRect.y+10}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cancelRect.x+30,y:cancelRect.y+25}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.deepEqual((await notebook()).entries[id].stickies[0],note);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#study-status').textContent.includes('公開された'));
 assert.deepEqual((await notebook()).entries[id].stickies[0],note);
 await page.locator('#study-sticky').tap();
 for(let i=1;i<16;i++){
  await page.locator('#study-sticky-plan').tap();
  await page.waitForFunction(count=>document.querySelector('#study-sticky-list').options.length===count+1,i+1);
 }
 assert.equal((await notebook()).entries[id].stickies.length,16);assert.equal(await page.locator('#study-sticky-front').isDisabled(),true);
 assert.equal(await page.locator('#study-sticky-plan').isDisabled(),true);
 const rawBefore=JSON.stringify(await notebook());
 await frame().evaluate(({sceneId})=>parent.postMessage({channel:'stage-study',action:'stickies',sceneId,revision:2,stickies:[{id:'bad',view:'front',text:{html:'x'},x:0,y:0}],change:{kind:'add',id:'bad'}},'*'),{sceneId:id});
 assert.equal(JSON.stringify(await notebook()),rawBefore);
 assert.deepEqual(errors,[]);
 await writeFile(root+'/docs/study-links/sticky-qa/touch-result.json',JSON.stringify({passed:['touch placement and Japanese text','touch drag','orientation keeps normalized coordinates','touch cancellation and reload preserve notes','16 note limit','malformed frame messages rejected'],errors,physicalDevice:false},null,2));
 console.log('PASS touch placement, drag, rotate, cancel, reload, note limits and invalid messages');
}catch(e){await page.screenshot({path:root+'/docs/study-links/sticky-qa/touch-failure.png',fullPage:true});throw e;}finally{await browser.close();}
