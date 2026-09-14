const {chromium,webkit}=require('playwright');
const fs=require('fs/promises'),path=require('path'),assert=require('assert/strict');
const key='shosai.lightDesigns.optionB.v1',legacy='shosai.lightDesigns.v1';
(async()=>{const report={};for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:1800,height:1300}});
  await page.goto('http://127.0.0.1:8797/backlight-redesign/prototype-b/?example=back');await page.waitForFunction(()=>window.__RIG?.hooks);
  const result=await page.evaluate(()=>{
   const {state:s,hooks:h}=window.__RIG;
   const snap=()=>{const d=h.buildDesign('test');delete d.savedAt;return JSON.stringify({d,history:s.history,future:s.future,dirty:s.dirty,sel:[...s.sel]});};
   const original=snap(),good=h.buildDesign('test'),rejected=[];
   const invalid=[{...good,version:999},{...good,rig:{}},{...good,scenes:[]},{...good,stage:{W:0,D:8,H:8}},{...good,scenes:[null]}];
   for(const data of invalid){let failure=false;try{h.applyDesign(data);}catch{failure=true;}if(!failure||snap()!==original)throw new Error('invalid import mutated edit');rejected.push(true);}
   // Also preserve the edit if a renderer throws after state preparation.
   const get=HTMLCanvasElement.prototype.getContext;let thrown=false;
   HTMLCanvasElement.prototype.getContext=function(...args){if(!thrown){thrown=true;throw new Error('simulated renderer failure');}return get.apply(this,args);};
   let rollback=false;try{h.applyDesign({...good,name:'must rollback',stage:{W:15,D:8,H:8}});}catch{rollback=true;}finally{HTMLCanvasElement.prototype.getContext=get;}
   if(!rollback||snap()!==original)throw new Error('renderer failure did not restore edit');
   h.cue().environment={haze:0,unknown:'retain'};h.cue().futureField={a:[1,2]};
   const d=h.buildDesign('zero');h.applyDesign(d);d.scenes[0].cue.environment.haze=99;
   if(h.cue().environment.haze!==0)throw new Error('import retained caller alias');
   return {invalidImports:rejected.length,rendererRollback:rollback,zeroAndUnknown:h.cue().environment,callerIsolated:true};
  });
  await page.evaluate(({key,legacy})=>{localStorage.setItem(legacy,'legacy-sentinel');localStorage.setItem(key,'broken{');},{key,legacy});
  await page.locator('#save').click();assert(await page.locator('#dssave').isDisabled());assert(await page.locator('#dsfile').isEnabled());
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'broken{');
  await page.locator('#dialog').getByRole('button',{name:'閉じる',exact:true}).click();await page.evaluate(key=>localStorage.setItem(key,'[]'),key);await page.locator('#save').click();await page.locator('#dsname').fill('Roundtrip B');await page.locator('#dssave').click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(saved[0].scenes[0].cue.environment.haze,0);assert.equal(saved[0].scenes[0].cue.environment.unknown,'retain');
  await page.reload();await page.waitForFunction(()=>window.__RIG?.hooks);await page.locator('#save').click();await page.locator('[data-act="load"]').click();
  assert.equal(await page.evaluate(()=>window.__RIG.hooks.cue().environment.haze),0);
  await page.locator('#save').click();await page.locator('#dsname').fill('Quota failure');
  await page.evaluate(()=>{const old=Storage.prototype.setItem;window.__restoreStore=()=>Storage.prototype.setItem=old;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
  await page.locator('#dssave').click();assert(await page.locator('#dssave').isVisible());
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),JSON.stringify(saved));
  await page.evaluate(()=>window.__restoreStore());
  assert.equal(await page.evaluate(legacy=>localStorage.getItem(legacy),legacy),'legacy-sentinel');
  report[engine]={...result,corruptStoreProtected:true,fileExportAvailable:true,reloadRoundtrip:true,quotaPreservesStore:true,legacyUntouched:true};
  console.log(engine,JSON.stringify(report[engine]));
 }finally{await browser.close();await fs.writeFile(path.join(__dirname,'evidence-b/storage.json'),JSON.stringify(report,null,2));}
}})().catch(e=>{console.error(e);process.exitCode=1;});
