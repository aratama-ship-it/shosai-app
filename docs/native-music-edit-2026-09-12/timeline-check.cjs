const {chromium}=require('/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8941/docs/native-music-edit-2026-09-12/preview.html');await p.waitForFunction(()=>window.__NATIVE_MUSIC_PREVIEW__?.ready);
assert.equal(await p.locator('.nm').count(),0);assert.deepEqual(await p.locator('#stage-view-select option').evaluateAll(es=>es.map(e=>e.value)),['front','plan']);
assert.equal(await p.locator('#stage-canvas').isVisible(),true);assert.equal(await p.locator('#stage-plan-canvas').isVisible(),false);
const before=await p.locator('.stage-sketch-grid').evaluate(e=>e.getBoundingClientRect().width);
await p.screenshot({path:__dirname+'/timeline-only-front.png'});
await p.locator('#stage-view-select').selectOption('plan');assert.equal(await p.locator('#stage-canvas').isVisible(),false);assert.equal(await p.locator('#stage-plan-canvas').isVisible(),true);
await p.screenshot({path:__dirname+'/timeline-only-plan.png'});
await p.locator('#tl-count-unit').click();assert.equal(await p.locator('#tl-time').textContent(),'1.0 カウント');await p.locator('#tl-time-unit').click();await p.locator('#tl-scenes button').nth(1).click();assert.equal(await p.locator('#tl-time').textContent(),'0:12.00');
// Remove ONLY added stylesheet to compare native geometry, while preserving the same one-view state.
const selectors=['.stage-sketch-head','#stage-col-left','#stage-col-right','.stage-center-bar','#stage-plan-canvas'];
const geometry=()=>p.evaluate(ss=>Object.fromEntries(ss.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),css=getComputedStyle(e);return[s,{x:r.x,width:r.width,font:css.fontSize,display:css.display}]})),selectors);
const withTimeline=await geometry();await p.locator('link[href="timeline-only.css"]').evaluate(e=>e.disabled=true);await p.evaluate(()=>document.getElementById('view-stage').style.display='block');const original=await geometry();for(const s of selectors)assert.deepEqual(withTimeline[s],original[s],s+' geometry unchanged');await p.locator('link[href="timeline-only.css"]').evaluate(e=>e.disabled=false);
await p.setViewportSize({width:1440,height:900});await p.screenshot({path:__dirname+'/timeline-only-1440.png'});await p.setViewportSize({width:1024,height:768});await p.screenshot({path:__dirname+'/timeline-only-1024.png'});
await fs.writeFile(__dirname+'/timeline-check.json',JSON.stringify({revision:'timeline-only',errors,removedCustomUI:true,viewOptions:['front','plan'],oneViewAtATime:true,nativeGeometryUnchanged:withTimeline,gridWidth:before,viewports:['1440x1000','1440x900','1024x768']},null,2));assert.deepEqual(errors,[]);console.log('PASS timeline-only, native geometry unchanged, view switch, units, scene selection');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
