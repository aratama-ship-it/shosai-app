const {chromium}=require('/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const phase=process.argv[2]||'after';
const out='/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/ui-plan-label-2026-09-10';
(async()=>{await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[];
try{for(const cfg of (phase==='before'?[{name:'desktop-ja',lang:'ja'}]:[
{name:'desktop-ja',lang:'ja'},{name:'desktop-en',lang:'en'},{name:'desktop-zh-Hans',lang:'zh-Hans'},{name:'desktop-zh-Hant',lang:'zh-Hant'},
{name:'tablet-landscape',lang:'ja',width:1024,height:768,tablet:true},{name:'tablet-portrait',lang:'ja',width:768,height:1024,tablet:true}
])){
 const context=await browser.newContext({viewport:{width:cfg.width||1440,height:cfg.height||1000},serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('shosai-stage-tour-v1','done');window.planLabelDraws=new Map();
 const original=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
  if(this.font.startsWith('13px')&&/m$/.test(text)&&!String(text).includes('—')&&x===640){
   const measure=this.measureText(text),matrix=this.getTransform();
   window.planLabelDraws.set(this.canvas,{text,x,y,top:y-measure.actualBoundingBoxAscent,bottom:y+measure.actualBoundingBoxDescent,font:this.font,scale:matrix.a,width:this.canvas.width,height:this.canvas.height});
  }
  return original.call(this,text,x,y,...rest);
 };
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto('http://127.0.0.1:8847/stage.html?lang='+cfg.lang+'&verify=plan-label-20260910'+(cfg.tablet?'&tablet-pwa-preview':''));
 await page.waitForFunction(()=>window.SHOSAI_STAGE_SESSION_BRIDGE);
 const read=()=>page.evaluate(()=>window.planLabelDraws.get(document.getElementById('stage-plan-canvas')));
 const before=await page.evaluate(()=>window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString());
 if(cfg.tablet){if(await page.locator('[data-tablet-view="plan"]').isVisible())await page.locator('[data-tablet-view="plan"]').click();}else await page.locator('[data-show-view="plan"]').click();
 const normal=await read();assert.ok(normal,'width label drawn');if(phase==='before')assert.ok(normal.top<0);else assert.ok(normal.top>=4,JSON.stringify(normal));
 await page.locator('#stage-plan-canvas').screenshot({path:out+'/'+phase+'-'+cfg.name+'-normal.png'});
 await page.locator('#stage-present-btn').click();await page.waitForFunction(()=>document.body.classList.contains('stage-fullscreen'));
 if(await page.locator('#stage-present-canvas > canvas').getAttribute('id')!=='stage-plan-canvas')await page.keyboard.press('x');
 const full=await read();if(phase==='after')assert.ok(full.top>=4,JSON.stringify(full));else assert.ok(full.top<0);
 await page.screenshot({path:out+'/'+phase+'-'+cfg.name+'-fullscreen.png'});
 await page.keyboard.press('x');await page.waitForFunction(()=>document.querySelector('#stage-present-mini-view > canvas')?.id==='stage-plan-canvas');
 const mini=await read();if(phase==='after')assert.ok(mini.top>=4);await page.locator('#stage-present-close').click();
 assert.equal(await page.evaluate(()=>window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()),before,'view changes preserve document');
 results.push({name:cfg.name,normal,full,mini});console.log('PASS '+phase+' '+cfg.name+' top='+normal.top);
 await context.close();
}
assert.deepEqual(errors,[]);await fs.writeFile(out+'/'+phase+'-browser-check.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
