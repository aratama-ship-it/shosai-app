const {chromium}=require('/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const out='/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/ui-fullscreen-swap-2026-09-10';
(async()=>{await fs.mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[];
try{for(const cfg of [
 {name:'desktop-ja',lang:'ja'}, {name:'desktop-plan-en',lang:'en',initial:'plan'},
 {name:'desktop-front-zh-Hans',lang:'zh-Hans',initial:'front'}, {name:'desktop-zh-Hant',lang:'zh-Hant'},
 {name:'tablet-landscape',lang:'ja',tablet:true,width:1024,height:768,initial:'plan'},
 {name:'tablet-portrait',lang:'ja',tablet:true,width:768,height:1024},
 {name:'no-api',lang:'ja',fallback:'missing'}, {name:'rejected-api',lang:'ja',fallback:'reject',initial:'plan'}
]){
 const c=await b.newContext({viewport:{width:cfg.width||1440,height:cfg.height||1000},serviceWorkers:'block'});
 await c.addInitScript(({fallback})=>{localStorage.setItem('shosai-stage-tour-v1','done');if(fallback==='missing')Element.prototype.requestFullscreen=undefined;if(fallback==='reject')Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Test fallback'));},cfg);
 const p=await c.newPage();p.setDefaultTimeout(9000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>errors.push(cfg.name+': '+e.message));
 await p.goto('http://127.0.0.1:8847/stage.html?lang='+cfg.lang+'&verify=fullscreen-swap-20260910'+(cfg.tablet?'&tablet-pwa-preview':''));await p.waitForFunction(()=>window.SHOSAI_STAGE_SESSION_BRIDGE);
 await p.locator('#stage-scene-dup').evaluate(e=>e.click());await p.locator('#stage-clear').evaluate(e=>e.click());
 if(cfg.initial){if(cfg.tablet)await p.locator('[data-tablet-view="'+cfg.initial+'"]').click();else await p.locator('[data-show-view="'+cfg.initial+'"]').click();}
 const doc=()=>p.evaluate(()=>JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project);
 const before=await doc();const original=await p.evaluate(()=>{window.miniTestNodes=['stage-canvas','stage-plan-canvas'].map(id=>{const node=document.getElementById(id);return {node,parent:node.parentNode,next:node.nextSibling}});return{frontHidden:document.getElementById('stage-front-inner').hidden,planHidden:document.getElementById('stage-plan-inner').hidden}});
 const mainView=cfg.initial==='plan'?'plan':'front';let expected=mainView;
 const button=p.locator('#stage-present-mini'),swap=p.locator('#stage-present-swap');
 const check=async()=>{
  const main=expected==='front'?'stage-canvas':'stage-plan-canvas',other=expected==='front'?'stage-plan-canvas':'stage-canvas';
  await p.waitForFunction(main=>document.querySelector('#stage-present-canvas > canvas')?.id===main,main);
  assert.equal(await p.locator('#stage-present-mini-view > canvas').getAttribute('id'),other);
  const label={ja:{front:'正面図',plan:'平面図'},en:{front:'Front view',plan:'Plan view'},'zh-Hans':{front:'正视图',plan:'平面图'},'zh-Hant':{front:'正視圖',plan:'平面圖'}}[cfg.lang][expected==='front'?'plan':'front'];
  assert.equal(await p.locator('#stage-present-mini-label').textContent(),label);
  const rect=await button.boundingBox();assert.ok(rect.width>=160&&rect.width<=280);assert.ok(Math.abs(rect.x+rect.width-(cfg.width||1440)+14)<1);assert.ok(Math.abs(rect.y+rect.height-(cfg.height||1000)+70)<1);
  const thumb=await p.locator('#stage-present-mini-view canvas').boundingBox();assert.ok(Math.abs(thumb.width/thumb.height-16/9)<0.02);assert.ok(await button.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}));
  const swapRect=await swap.boundingBox(),closeRect=await p.locator('#stage-present-close').boundingBox();
  assert.equal(swapRect.width,44);assert.equal(swapRect.height,44);assert.equal(swapRect.y,14);assert.equal(closeRect.x-swapRect.x-swapRect.width,8);
  assert.equal(await swap.getAttribute('aria-keyshortcuts'),'X');assert.equal(await button.getAttribute('aria-keyshortcuts'),'X');
  assert.equal(await swap.getAttribute('aria-label'),await button.getAttribute('aria-label'));
  assert.ok(await swap.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}));
  return {mini:rect,swap:swapRect};
 };
 await p.locator('#stage-present-btn').click();await p.waitForFunction(()=>document.body.classList.contains('stage-fullscreen'));const measure=await check();
 // The two source canvases must update even if the normal workspace had one hidden.
 const hash=()=>p.evaluate(()=>{const h=id=>{const data=document.getElementById(id).toDataURL();let n=2166136261;for(let i=0;i<data.length;i++)n=Math.imul(n^data.charCodeAt(i),16777619);return n>>>0};return{front:h('stage-canvas'),plan:h('stage-plan-canvas')}});
 const blank=await hash();await p.locator('#stage-present-prev').click();await p.waitForFunction(id=>JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.activeSceneId!==id,before.activeSceneId);
 await p.waitForFunction(blank=>{const h=id=>{const data=document.getElementById(id).toDataURL();let n=2166136261;for(let i=0;i<data.length;i++)n=Math.imul(n^data.charCodeAt(i),16777619);return n>>>0};return h('stage-canvas')!==blank.front&&h('stage-plan-canvas')!==blank.plan},blank);
 await p.screenshot({path:out+'/'+cfg.name+'-main-'+expected+'.png'});
 await button.click();expected=expected==='front'?'plan':'front';await check();assert.deepEqual((await doc()).scenes,before.scenes,'Swap must not edit a scene');
 await p.screenshot({path:out+'/'+cfg.name+'-swapped.png'});
 await swap.click();expected=expected==='front'?'plan':'front';await check();
 await p.keyboard.press('x');expected=expected==='front'?'plan':'front';await check();
 await swap.focus();await p.keyboard.press('Enter');expected=expected==='front'?'plan':'front';await check();await p.keyboard.press('Space');expected=expected==='front'?'plan':'front';await check();
 if(cfg.name==='desktop-ja'){
  const guarded=await p.evaluate(()=>{
   const overlay=document.getElementById('stage-present-overlay'),before=overlay.dataset.mainView,results=[];
   function key(target,opts={}){const event=new KeyboardEvent('keydown',{key:'x',code:'KeyX',bubbles:true,cancelable:true,...opts});if(opts.defaultPrevented)event.preventDefault();target.dispatchEvent(event);if(overlay.dataset.mainView!==before)throw Error('X changed view during '+JSON.stringify(opts));return event.defaultPrevented;}
   for(const opt of ['ctrlKey','metaKey','altKey','shiftKey','repeat','isComposing','defaultPrevented']){key(overlay,{[opt]:true});results.push(opt);}
   key(overlay,{keyCode:229});results.push('IME 229');
   for(const tag of ['input','textarea','select','div']){const el=document.createElement(tag);if(tag==='div')el.contentEditable='true';overlay.append(el);el.focus();key(el);el.remove();results.push(tag);}
   const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.textContent='Shortcut guard probe';overlay.append(dialog);key(overlay);dialog.remove();results.push('dialog');
   return results;
  });
  // Open the real 3D camera from the fullscreen drawer, then verify X leaves the underlying views alone.
  await p.locator('#stage-present-drawer-toggle').click();
  await p.locator('#stage-freecam-open').evaluate(e=>e.click());
  await p.waitForFunction(()=>document.querySelector('#stage-fpv-overlay')?.getClientRects().length);
  await p.keyboard.press('x');assert.equal(await p.locator('#stage-present-overlay').getAttribute('data-main-view'),expected);
  await p.locator('#stage-fpv-close').click();await p.locator('#stage-present-drawer-toggle').click();
  console.log('PASS shortcut guards '+guarded.join(', ')+', real 3D camera');
 }
 await p.locator('#stage-present-drawer-toggle').click();await check();assert.ok(await p.locator('#stage-present-close').isVisible());await p.screenshot({path:out+'/'+cfg.name+'-drawer.png'});
 await p.locator('#stage-present-close').click();await p.waitForFunction(()=>!document.body.classList.contains('stage-fullscreen'));
 assert.ok(await p.evaluate(()=>window.miniTestNodes.every(({node,parent,next})=>node.parentNode===parent&&node.nextSibling===next)),'Restore both canvas positions');
 assert.deepEqual(await p.evaluate(()=>({frontHidden:document.getElementById('stage-front-inner').hidden,planHidden:document.getElementById('stage-plan-inner').hidden})),original);
 await p.keyboard.press('x');assert.ok(await p.evaluate(()=>window.miniTestNodes.every(({node,parent})=>node.parentNode===parent)));
 assert.deepEqual((await doc()).scenes,before.scenes);assert.equal(await p.locator('#stage-canvas').count(),1);assert.equal(await p.locator('#stage-plan-canvas').count(),1);
 results.push({name:cfg.name,measure,initialMain:mainView,checks:'opposite view, localized label, 16:9, lower-right bounds, live scene update in both canvases, icon/preview/X/Enter/Space swap, 44px icon with 8px gap, no scene edits, drawer visible, original canvas locations and view preference restored'});console.log('PASS '+cfg.name);await c.close();
}
assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-check.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors,out}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
