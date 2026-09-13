// Synthetic local fixture only; never change a user's published show or private notes.
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT||require.resolve('playwright')));
const base=process.env.STUDY_BASE||'http://127.0.0.1:8867';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)||base.endsWith(':8802'))throw new Error('Dedicated local preview only');
const out=fileURLToPath(new URL('../docs/study-links/sticky-style-qa/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const owner=await browser.newContext({extraHTTPHeaders:{Authorization:'Basic '+Buffer.from('study-owner:local-study-owner').toString('base64')}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));const pass=s=>{checks.push(s);console.log('PASS',s);};
const ready=()=>page.waitForFunction(()=>document.querySelector('#study-status').textContent.includes('公開された')||document.querySelector('#study-status').textContent.includes('Showing published content.'));
const frame=()=>page.frames().find(f=>f.url().includes('/study-frame'));
const book=()=>page.evaluate(()=>JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('stage-study-notebook-v1:'))[1]));
const entry=async()=>Object.values((await book()).entries)[0];
const commit=async(id,value)=>{await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');};
try{
 const doc=JSON.parse(await readFile(new URL('../docs/study-links/synthetic-review-show.json',import.meta.url),'utf8'));doc.project.id='style-'+crypto.randomUUID();
 const issued=await owner.request.post(base+'/study/api/owner/shows/'+doc.project.id,{data:{document:doc}});assert.equal(issued.status(),201);const token=(await issued.json()).link.token,url=base+'/study?lang=ja#'+token;
 await writeFile(out+'/preview-url.txt',url+'\n');await page.goto(url);await ready();await page.locator('#study-sticky').scrollIntoViewIfNeeded();await page.waitForTimeout(350);await page.locator('#study-sticky').click();await page.locator('#study-sticky-front').click();
 await page.locator('#study-sticky-text').fill('照明が点いたら中央へ');await page.waitForFunction(()=>document.querySelector('#study-sticky-save').textContent.includes('保存済み'));
 for(const shape of ['rect','rounded','bubble'])for(const color of ['desk','paper','yellow','rose','sage','blue']){
  await page.locator(`[data-sticky-shape="${shape}"]`).click();await page.locator(`[data-sticky-color="${color}"]`).click();
  assert.equal((await entry()).stickies[0].shape,shape);assert.equal((await entry()).stickies[0].color,color);
  await frame().waitForFunction(({shape,color})=>{const el=document.querySelector('.study-sticky-note');return el?.dataset.shape===shape&&el?.dataset.color===color;},{shape,color});
 }
 await commit('study-sticky-width','270');await commit('study-sticky-height','160');let note=(await entry()).stickies[0];assert.equal(note.width,270);assert.equal(note.height,160);
 await page.locator('#study-frame-host').scrollIntoViewIfNeeded();const grip=frame().locator('.study-sticky-resize');await grip.scrollIntoViewIfNeeded();const box=await grip.boundingBox();
 await page.mouse.move(box.x+30,box.y+30);await page.mouse.down();await page.mouse.move(box.x+80,box.y+65,{steps:6});await page.mouse.up();
 await page.waitForFunction(()=>Object.values(JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('stage-study-notebook-v1:'))[1]).entries)[0].stickies[0].width>270);
 note=(await entry()).stickies[0];assert.equal(note.height,195);assert.equal(note.color,'blue');assert.equal(note.shape,'bubble');
 await page.reload();await ready();assert.deepEqual((await entry()).stickies[0],note);
 await page.locator('#study-frame-host').scrollIntoViewIfNeeded();await frame().locator('.study-sticky-note').scrollIntoViewIfNeeded();await frame().locator('.study-sticky-note').click({position:{x:25,y:25}});
 await page.locator('#study-sticky-auto').click();assert.equal((await entry()).stickies[0].height,undefined);assert.equal((await entry()).stickies[0].width,note.width);
 pass('18 shape/color combinations, numeric size, corner drag, reload and auto height preserve text and appearance');
 await page.locator('#study-name').fill('形と色の演者');await page.locator('#study-send').click();await page.waitForFunction(()=>document.querySelector('#study-note-status').textContent.includes('共有しました'));
 const manage=base+'/study/api/owner/links/'+token;const shared=(await(await owner.request.get(manage+'/notes')).json()).notes;assert.equal(shared.length,1);assert.equal(shared[0].name,'形と色の演者');
 const jpg=await(await owner.request.get(`${manage}/notes/${shared[0].id}/images/front`)).body();await writeFile(out+'/shared-front.jpg',jpg);
 const colored=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pix=ctx.getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<pix.length;i+=4)if(Math.abs(pix[i]-183)<8&&Math.abs(pix[i+1]-203)<8&&Math.abs(pix[i+2]-209)<8)count++;return count;},'data:image/jpeg;base64,'+jpg.toString('base64'));assert.ok(colored>500,'shared image contains the selected blue note surface');
 assert.deepEqual((await(await context.request.get(base+'/study/api/view/'+token)).json()).document,doc);
 pass('Explicit owner sharing includes the styled note in the image; source show remains unchanged');
 const baseline=JSON.parse(JSON.stringify((await entry()).stickies));
 for(const lang of ['ja','en'])for(const [width,height] of [[1440,1000],[768,1024],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#study-language').selectOption(lang);await ready();
  if(await page.locator('#study-sticky').getAttribute('aria-pressed')!=='true'){await page.locator('#study-sticky').scrollIntoViewIfNeeded();await page.waitForTimeout(350);await page.locator('#study-sticky').click();}
  await page.locator('#study-sticky-list').selectOption(baseline[0].id);
  await page.locator('#study-sticky-text').scrollIntoViewIfNeeded();
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,minHit:Math.min(...[...document.querySelectorAll('.study-sticky-choices button,#study-sticky-width,#study-sticky-height')].map(e=>Math.min(e.getBoundingClientRect().width,e.getBoundingClientRect().height))),labels:[...document.querySelectorAll('.study-sticky-options legend')].map(e=>e.textContent)}));
  assert.equal(layout.overflow,false);assert.ok(layout.minHit>=44);assert.deepEqual(layout.labels,lang==='ja'?['形','色']:['Shape','Color']);assert.deepEqual((await entry()).stickies,baseline);
  await page.screenshot({path:out+`/${lang}-${width}.png`});
 }
 pass('Japanese/English controls at four widths retain 44px targets, labels, text sizes and saved notes');
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),touchPage=await mobile.newPage();await touchPage.goto(url);await touchPage.waitForFunction(()=>document.querySelector('#study-status').textContent.includes('公開された'));
 await touchPage.locator('#study-sticky').scrollIntoViewIfNeeded();await touchPage.waitForTimeout(350);await touchPage.locator('#study-sticky').tap();await touchPage.locator('#study-sticky-plan').tap();await touchPage.locator('#study-sticky-text').fill('ここで待機');await touchPage.locator('[data-sticky-shape="rounded"]').tap();await touchPage.locator('[data-sticky-color="rose"]').tap();
 const mobileFrame=touchPage.frames().find(f=>f.url().includes('/study-frame'));await touchPage.locator('#study-frame-host').scrollIntoViewIfNeeded();const handle=mobileFrame.locator('.study-sticky-resize');await handle.scrollIntoViewIfNeeded();const rect=await handle.boundingBox();const cdp=await mobile.newCDPSession(touchPage);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+28,y:rect.y+28}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+58,y:rect.y+66}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await touchPage.waitForFunction(()=>Object.values(JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('stage-study-notebook-v1:'))[1]).entries)[0].stickies[0].width>188);
 await touchPage.locator('#study-sticky-text').scrollIntoViewIfNeeded();await touchPage.screenshot({path:out+'/touch-390.png'});await mobile.close();
 pass('Touch shape/color selection and corner resize work in mobile simulation');
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({checks,errors,physicalDevice:false,url},null,2));
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
