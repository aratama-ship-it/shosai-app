const {chromium}=require('/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8941/docs/native-music-edit-2026-09-12/preview.html');await page.waitForFunction(()=>window.__NATIVE_MUSIC_PREVIEW__?.ready,{},{timeout:20000});await page.screenshot({path:__dirname+'/music-plan.png'});
console.log(JSON.stringify(await page.evaluate(()=>({errors:[],sections:document.querySelector('#nm-section').options.length,dimensions:['#stage-col-center','#stage-work-area','#stage-canvas-stack','#stage-plan-canvas','.nm-timeline'].map(s=>({selector:s,rect:document.querySelector(s).getBoundingClientRect().toJSON()})),bodyScroll:document.documentElement.scrollHeight})),null,2));
await page.locator('#nm-front').click();await page.screenshot({path:__dirname+'/music-front.png'});
await page.locator('#nm-counts').click();assert.equal(await page.locator('#nm-unit-label').textContent(),'カウント');
await page.locator('#nm-seconds').click();assert.equal(await page.locator('#nm-unit-label').textContent(),'秒');
await page.locator('#nm-standard-tab').click();await page.screenshot({path:__dirname+'/standard.png'});
await page.locator('#nm-music-tab').click();await page.locator('#nm-plan').click();
await page.locator('#nm-section').selectOption('1');assert.equal(await page.locator('#nm-scenes button').count(),4);
await page.locator('#nm-section').selectOption('0');await page.locator('#nm-scenes button').nth(1).click();
await page.locator('#nm-play').click();await page.waitForTimeout(250);await page.locator('#nm-play').click();
for(const [width,height] of [[1024,768],[390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:__dirname+`/music-${width}.png`});}
await page.goto('http://127.0.0.1:8941/docs/native-music-edit-2026-09-12/plan.html');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:__dirname+'/plan-mobile.png'});
await fs.writeFile(__dirname+'/check.json',JSON.stringify({checks:'UI modes, view switch, units, 8 sections/4 scenes, playback mock, responsive screenshots, mobile plan overflow',errors},null,2));await browser.close();assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exit(1)});
