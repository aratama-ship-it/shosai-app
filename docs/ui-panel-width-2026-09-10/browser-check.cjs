const {chromium}=require('/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const out='/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/ui-panel-width-2026-09-10';
(async()=>{await fs.mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[];
if(process.argv[2]==='tablet')results.push(...JSON.parse(await fs.readFile(out+'/browser-check.json','utf8')).results.filter(r=>!r.name.startsWith('tablet')));
try{for(const cfg of [{name:'desktop-ja',lang:'ja'},{name:'desktop-en',lang:'en',skin:'blue-black'},{name:'desktop-zh-Hans',lang:'zh-Hans'},{name:'desktop-zh-Hant',lang:'zh-Hant'},{name:'tablet-landscape',lang:'ja',tablet:true,width:1024,height:768},{name:'tablet-portrait',lang:'ja',tablet:true,width:768,height:1024}]){
 if(process.argv[2]==='tablet'&&!cfg.tablet)continue;
 const c=await b.newContext({viewport:{width:cfg.width||1440,height:cfg.height||1000},hasTouch:!!cfg.tablet,serviceWorkers:'block'});
 await c.addInitScript(({skin})=>{localStorage.setItem('shosai-stage-tour-v1','done');if(!localStorage.getItem('shosai-stage-prefs-v1'))localStorage.setItem('shosai-stage-prefs-v1',JSON.stringify({uiSkin:skin||'warm-black'}));},cfg);
 const p=await c.newPage();p.setDefaultTimeout(9000);p.on('pageerror',e=>errors.push(cfg.name+': '+e.message));
 await p.goto('http://127.0.0.1:8847/stage.html?lang='+cfg.lang+'&verify=panel-width-20260910'+(cfg.tablet?'&tablet-pwa-preview':''));
 await p.waitForFunction(()=>document.querySelector('[data-panel-width]'));
 const doc=()=>p.evaluate(()=>JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project);
 await p.locator('#stage-project-title').evaluate(e=>{e.value='Panel width QA';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.waitForFunction(()=>localStorage.getItem('shosai-stage-sketch-v1')?.includes('Panel width QA'));
 let before=await doc();
 const handle=key=>p.locator('[data-panel-width="'+key+'"]');
 const value=key=>handle(key).getAttribute('aria-valuenow').then(Number);
 const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const drag=async(key,dx,touch=false)=>{const el=handle(key);await el.scrollIntoViewIfNeeded();const r=await el.boundingBox();const x=r.x+r.width/2,y=Math.min(Math.max(r.y+70,70),p.viewportSize().height-60,r.y+r.height-4);
  assert.ok(await el.evaluate((node,{x,y})=>document.elementFromPoint(x,y)?.closest("[data-panel-width]")===node,{x,y}),"resize handle receives input: "+key);
  if(touch){const client=await c.newCDPSession(p);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=5;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y,id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();}
  else{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx,y,{steps:5});await p.mouse.up();}await settled();
 };
 const normalKey=cfg.tablet?'tablet':'left';
 if(cfg.tablet){await p.locator('[data-tablet-group="scenes"]').click();await p.waitForFunction(()=>Math.abs(document.querySelector('.stage-tablet-drawer').getBoundingClientRect().width-Number(document.querySelector('[data-panel-width="tablet"]').getAttribute('aria-valuenow')))<1);}
 const initial=await value(normalKey);await drag(normalKey,70,!!cfg.tablet);const expanded=await value(normalKey);assert.ok(expanded>initial+40,JSON.stringify({initial,expanded}));
 await handle(normalKey).focus();await p.keyboard.press('ArrowLeft');assert.equal(await value(normalKey),expanded-10);
 const savedWidth=await value(normalKey);
 if(!cfg.tablet){const right=await value('right');await drag('right',-55);assert.equal(await value('right'),right+55);}
 assert.deepEqual(await doc(),before,'resizing does not change project');
 await p.screenshot({path:out+'/'+cfg.name+'-normal.png'});
 await p.reload();await p.waitForFunction(()=>document.querySelector('[data-panel-width]'));
 if(cfg.tablet){await p.locator('[data-tablet-group="scenes"]').click();await p.waitForFunction(()=>Math.abs(document.querySelector('.stage-tablet-drawer').getBoundingClientRect().width-Number(document.querySelector('[data-panel-width="tablet"]').getAttribute('aria-valuenow')))<1);}
 assert.equal(await value(normalKey),savedWidth,'saved width restores');
 // Loading normalises existing optional fields; compare each live editing session independently.
 before=await doc();
 await p.locator('#stage-present-btn').click();await p.waitForFunction(()=>document.body.classList.contains('stage-fullscreen'));await p.locator('#stage-present-drawer-toggle').click();
 const fullDefault=await value('fullscreen');await drag('fullscreen',100,!!cfg.tablet);const fullWidth=await value('fullscreen');assert.equal(fullWidth,fullDefault+100);
 const drawer=await p.locator('#stage-present-drawer').boundingBox();assert.equal(drawer.width,fullWidth);const toggle=await p.locator('#stage-present-drawer-toggle').boundingBox();assert.equal(toggle.x,fullWidth);
 await p.screenshot({path:out+'/'+cfg.name+'-fullscreen.png'});
 await handle('fullscreen').focus();await p.keyboard.press('End');assert.equal(await value('fullscreen'),Number(await handle('fullscreen').getAttribute('aria-valuemax')));
 await p.keyboard.press('Home');assert.equal(await value('fullscreen'),Number(await handle('fullscreen').getAttribute('aria-valuemin')));
 await p.keyboard.press('Enter');assert.equal(await value('fullscreen'),fullDefault);
 await p.locator('#stage-present-close').click();assert.equal(await value(normalKey),savedWidth,'normal width restored after fullscreen');
 assert.deepEqual(await doc(),before);assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('is-panel-resizing')),false);
 if(cfg.name==='desktop-ja'){
  await p.setViewportSize({width:1120,height:900});await settled();const dims=await p.evaluate(()=>({board:document.getElementById('stage-col-center').getBoundingClientRect().width,scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(dims.board>=419);assert.ok(dims.scroll<=dims.width);
  await p.setViewportSize({width:1000,height:900});assert.equal(await handle('left').isVisible(),false);
  await p.setViewportSize({width:1440,height:1000});await settled();assert.equal(await value('left'),savedWidth);
  await handle('left').dblclick();assert.equal(await value('left'),268);
  const start=await value('left'),r=await handle('left').boundingBox();await p.mouse.move(r.x+8,Math.min(r.y+70,800));await p.mouse.down();await p.mouse.move(r.x+65,Math.min(r.y+70,800));await settled();await p.keyboard.press('Escape');await p.mouse.up();assert.equal(await value('left'),start,'Escape rolls back');
 }
 results.push({name:cfg.name,initial,expanded,savedWidth,fullDefault,fullWidth,checks:'drag, touch on tablet, arrow keys, Home/End/Enter, persistence, project unchanged, normal/fullscreen independent, drawer toggle follows edge'});console.log('PASS '+cfg.name);await fs.writeFile(out+'/browser-check.json',JSON.stringify({results,errors},null,2));await c.close();
}assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,errors}));}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
