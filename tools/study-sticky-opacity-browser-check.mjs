// Dedicated synthetic localhost fixture. Never change a user's personal notes.
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT||require.resolve('playwright')));
const base=process.env.STUDY_BASE||'http://127.0.0.1:8871';if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)||base.endsWith(':8802'))throw new Error('Dedicated preview only');
const out=fileURLToPath(new URL('../docs/study-links/sticky-opacity-qa/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const owner=await browser.newContext({extraHTTPHeaders:{Authorization:'Basic '+Buffer.from('study-owner:local-study-owner').toString('base64')}});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const pass=s=>{checks.push(s);console.log('PASS',s);};
const ready=()=>page.waitForFunction(()=>/公開された|Showing published content/.test(document.querySelector('#study-status').textContent));
const frame=()=>page.frames().find(f=>f.url().includes('/study-frame'));
const note=()=>page.evaluate(()=>JSON.parse(Object.entries(localStorage).find(([k])=>k.startsWith('stage-study-notebook-v1:'))[1]).entries['qa-scene-0'].stickies[0]);
const slider=()=>page.locator('#study-sticky-transparency');
const choose=async id=>{await page.locator('#study-sticky').scrollIntoViewIfNeeded();await page.waitForTimeout(350);if(await page.locator('#study-sticky').getAttribute('aria-pressed')!=='true')await page.locator('#study-sticky').click();await page.locator('#study-sticky-list').selectOption(id);};
const transparency=async (percent,view='front')=>{await slider().scrollIntoViewIfNeeded();await slider().press('Home');for(let n=0;n<Math.floor(percent/10);n++)await slider().press('PageUp');for(let n=0;n<percent%10;n++)await slider().press('ArrowRight');await page.waitForFunction(p=>document.querySelector('#study-sticky-transparency-value').textContent===p+'%',percent);await frame().waitForFunction(({alpha,view})=>document.querySelector('[data-sticky-view="'+view+'"] .study-sticky-note > svg > path').getAttribute('fill-opacity')===String(alpha),{alpha:(100-percent)/100,view});};
try{
 const doc=JSON.parse(await readFile(new URL('../docs/study-links/synthetic-review-show.json',import.meta.url),'utf8'));doc.project.id='opacity-'+crypto.randomUUID();
 const issued=await owner.request.post(base+'/study/api/owner/shows/'+doc.project.id,{data:{document:doc}});assert.equal(issued.status(),201,await issued.text());const token=(await issued.json()).link.token,url=base+'/study?lang=ja#'+token,view=base+'/study/api/view/'+token,manage=base+'/study/api/owner/links/'+token;
 await writeFile(out+'/preview-url.txt',url+'\n');await page.goto(url);await ready();let shares=0;page.on('request',r=>{if(r.method()==='POST'&&r.url()===view+'/notes')shares++;});
 await page.locator('#study-sticky').scrollIntoViewIfNeeded();await page.waitForTimeout(350);await page.locator('#study-sticky').click();await page.locator('#study-sticky-front').click();await page.locator('#study-sticky-text').fill('背景の確認');await page.locator('[data-sticky-shape="rounded"]').click();await page.locator('[data-sticky-color="yellow"]').click();await page.locator('#study-sticky-height').fill('144');await page.locator('#study-sticky-height').press('Tab');
 const original=await note();assert.equal(original.backgroundOpacity,undefined);assert.equal(await slider().inputValue(),'0');
 const pixels={};
 for(const p of [0,50,100]){
  await choose(original.id);await transparency(p);assert.equal((await note()).backgroundOpacity ?? 1,(100-p)/100);assert.deepEqual({...await note(),backgroundOpacity:undefined},{...original,backgroundOpacity:undefined});
  const textStyle=await frame().locator('.study-sticky-body').evaluate(e=>({opacity:getComputedStyle(e).opacity,color:getComputedStyle(e).color,shadow:getComputedStyle(e).textShadow}));assert.equal(textStyle.opacity,'1');assert.equal(textStyle.color,'rgb(33, 29, 25)');assert.equal(textStyle.shadow==='none',p===0);
  const point=await frame().locator('.study-sticky-note').evaluate(e=>{const b=e.getBoundingClientRect(),l=e.parentElement.getBoundingClientRect();return{x:(b.left-l.left+b.width*.7)/l.width,y:(b.top-l.top+b.height*.7)/l.height};});
  await page.locator('#study-name').fill('透明度の演者');await page.locator('#study-send').click();await page.waitForFunction(()=>document.querySelector('#study-note-status').textContent.includes('共有しました'));
  const notes=(await(await owner.request.get(manage+'/notes')).json()).notes;assert.equal(notes.length,Object.keys(pixels).length+1);const jpg=await(await owner.request.get(`${manage}/notes/${notes[0].id}/images/front`)).body();await writeFile(out+`/shared-${p}.jpg`,jpg);
  pixels[p]=await page.evaluate(async({src,point})=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(Math.floor(point.x*c.width),Math.floor(point.y*c.height),1,1).data].slice(0,3);},{src:'data:image/jpeg;base64,'+jpg.toString('base64'),point});
 }
 for(let i=0;i<3;i++)assert.ok(Math.abs(pixels[50][i]-(pixels[0][i]+pixels[100][i])/2)<5,JSON.stringify(pixels));assert.ok(pixels[0].some((v,i)=>Math.abs(v-pixels[100][i])>60));
 assert.equal(shares,3);assert.deepEqual((await(await context.request.get(view)).json()).document,doc);
 pass('Native slider controls 0/50/100% background transparency; text and other style fields stay intact, and shared JPEG pixels match alpha blending');
 await choose(original.id);await transparency(37);await page.reload();await ready();assert.equal((await note()).backgroundOpacity,.63);await choose(original.id);assert.equal(await slider().inputValue(),'37');
 await page.locator('#study-frame-host').scrollIntoViewIfNeeded();await frame().locator('.study-sticky-note').dblclick({position:{x:25,y:20}});await frame().locator('.study-sticky-inline-text').fill('透明度を保ったまま入力');await frame().locator('.study-sticky-inline-done').click();await frame().waitForFunction(()=>document.querySelector('.study-sticky-note > svg > path').getAttribute('fill-opacity')==='0.63');
 assert.equal((await note()).backgroundOpacity,.63);assert.equal((await note()).text,'透明度を保ったまま入力');
 pass('A 1% increment, reload and double-click inline editing preserve opacity and text without extra owner sharing');
 for(const lang of ['ja','en'])for(const [width,height] of [[1440,1000],[768,1024],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#study-language').selectOption(lang);await ready();await choose(original.id);await slider().scrollIntoViewIfNeeded();
  const ui=await slider().evaluate(e=>({label:e.labels[0].textContent,aria:e.getAttribute('aria-valuetext'),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(ui.label,lang==='ja'?'背景の透明度':'Background transparency');assert.equal(ui.aria,'37%');assert.ok(ui.w>=44&&ui.h>=44);assert.equal(ui.overflow,false);await page.screenshot({path:out+`/${lang}-${width}.png`});
 }
 pass('Japanese/English labels and values fit four viewport widths with at least 44px controls and no horizontal overflow');
 await page.setViewportSize({width:1440,height:1000});await page.locator('#study-language').selectOption('ja');await ready();await choose(original.id);await page.locator('#study-sticky-plan').click();await page.locator('#study-sticky-text').fill('平面図の透明メモ');await transparency(100,'plan');await frame().waitForFunction(()=>document.querySelector('[data-sticky-view="plan"] .study-sticky-note > svg > path')?.getAttribute('fill-opacity')==='0');
 assert.equal(await frame().locator('[data-sticky-view="front"] .study-sticky-note > svg > path').first().getAttribute('fill-opacity'),'0.63');assert.equal(shares,3);
 pass('Plan and front notes keep independent transparency settings and stay private until explicit sharing');
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({checks,errors,pixels,url,physicalDevice:false},null,2));
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
