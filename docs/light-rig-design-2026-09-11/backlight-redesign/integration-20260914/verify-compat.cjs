const {chromium,webkit}=require('playwright');
const fs=require('fs/promises'),path=require('path'),assert=require('assert/strict');
const root='http://127.0.0.1:8813/',key='shosai.lightDesigns.v1',backup='shosai.lightDesigns.beforeOptionB.v1';
async function closeDialog(page){await page.locator('#dialog').getByRole('button',{name:'閉じる',exact:true}).click();}
(async()=>{const report={};for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
  const context=await browser.newContext({viewport:{width:1800,height:1300},acceptDownloads:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Generate an actual prior-version saved design through its Save UI.
  await page.goto(root+'baseline/');await page.waitForFunction(()=>window.__RIG?.hooks);
  await page.evaluate(()=>{const {state:s,hooks:h}=window.__RIG;s.mode='move';h.cue().futureField={keep:[1,2]};h.cue().environment={unknown:'old-extra'};h.scene().lxq=[{id:'legacy-q',seq:1,cue:structuredClone(h.cue())}];h.renderAll();});
  await page.locator('#save').click();await page.locator('#dsname').fill('Legacy tester');await page.locator('#dssave').click();
  const original=await page.evaluate(key=>localStorage.getItem(key),key),old=JSON.parse(original)[0];
  assert.equal(old.variant,undefined);assert.equal(old.scenes[0].cue.environment.haze,undefined);
  await page.goto(root+'candidate/');await page.waitForFunction(()=>window.__RIG?.hooks);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),original);
  assert.equal(await page.evaluate(backup=>localStorage.getItem(backup),backup),null);
  await page.locator('#save').click();assert.equal(await page.locator('.dsrow').count(),1);await page.locator('[data-act="load"]').click();
  const loaded=await page.evaluate(()=>window.__RIG.hooks.buildDesign('loaded'));
  assert.deepEqual(loaded.rig,old.rig);assert.deepEqual(loaded.scenes,old.scenes);assert.deepEqual(loaded.palette,old.palette);
  assert.equal(await page.locator('.option-b-controls input[type=number]').inputValue(),'35');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),original);
  await page.locator('.option-b-controls button').getByText('なし',{exact:true}).count();
  await page.getByRole('button',{name:'なし',exact:true}).click();
  const newData=await page.evaluate(()=>window.__RIG.hooks.buildDesign('new'));
  assert.deepEqual(newData.rig,old.rig);assert.deepEqual(newData.scenes[0].cue.lights,old.scenes[0].cue.lights);
  assert.equal(newData.scenes[0].cue.environment.haze,0);assert.equal(newData.scenes[0].cue.environment.unknown,'old-extra');
  await page.locator('#save').click();await page.locator('#dsname').fill('Legacy tester');await page.locator('#dssave').click();
  assert.equal(await page.evaluate(backup=>localStorage.getItem(backup),backup),original);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],key);
  await page.reload();await page.waitForFunction(()=>window.__RIG?.hooks);await page.locator('#save').click();await page.locator('[data-act="load"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__RIG.hooks.buildDesign('reload').scenes),saved.scenes);
  // Exercise the actual JSON file export/import controls.
  await page.locator('#save').click();const downloadPromise=page.waitForEvent('download');await page.locator('#dsfile').click();const download=await downloadPromise;
  const bytes=await fs.readFile(await download.path()),exported=JSON.parse(bytes);assert.deepEqual(exported.scenes,saved.scenes);
  await page.locator('#dspick').setInputFiles({name:'roundtrip.lightdesign.json',mimeType:'application/json',buffer:bytes});
  await page.waitForFunction(()=>document.getElementById('dialog').hidden);
  assert.deepEqual(await page.evaluate(()=>window.__RIG.hooks.buildDesign('import').scenes),saved.scenes);
  // A previous-version page can still read this file. It simply does not render haze.
  const prior=await context.newPage();await prior.goto(root+'baseline/');await prior.waitForFunction(()=>window.__RIG?.hooks);await prior.locator('#save').click();await prior.locator('#dspick').setInputFiles({name:'new.lightdesign.json',mimeType:'application/json',buffer:bytes});
  await prior.waitForFunction(()=>document.getElementById('dialog').hidden);
  assert.deepEqual(await prior.evaluate(()=>JSON.parse(JSON.stringify(window.__RIG.state.rig))),old.rig);
  assert.equal(await prior.evaluate(()=>window.__RIG.hooks.cue().environment.haze),0);await prior.close();
  // Rollback copy remains readable by the previous version without changing its bytes.
  const recovery=await context.newPage();await recovery.goto(root+'baseline/');await recovery.locator('#save').click();await recovery.locator('#dspick').setInputFiles({name:'before.lightdesign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(JSON.parse(original)[0]))});
  await recovery.waitForFunction(()=>document.getElementById('dialog').hidden);assert.deepEqual(await recovery.evaluate(()=>JSON.parse(JSON.stringify(window.__RIG.state.rig))),old.rig);await recovery.close();
  // Failure to create the backup must prevent the first write to the existing store.
  const failContext=await browser.newContext({viewport:{width:1800,height:1300}}),fail=await failContext.newPage();await fail.goto(root+'candidate/');
  await fail.evaluate(({key,original})=>localStorage.setItem(key,original),{key,original});
  await fail.locator('#save').click();await fail.locator('#dsname').fill('must not save');
  await fail.evaluate(backup=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===backup)throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};},backup);
  await fail.locator('#dssave').click();assert.equal(await fail.evaluate(key=>localStorage.getItem(key),key),original);assert(await fail.locator('#dssave').isVisible());await failContext.close();
  assert.deepEqual(errors,[]);report[name]={oldSaveLoadedFromSameList:true,loadIsReadOnly:true,oldCueAndRigPreserved:true,hazeZeroPersists:true,fileRoundtrip:true,priorVersionReadsNewData:true,backupExactAndReadable:true,backupFailureStopsWrite:true};
  console.log(name,JSON.stringify(report[name]));
 }finally{await browser.close();await fs.writeFile(path.join(__dirname,'evidence/compatibility.json'),JSON.stringify(report,null,2));}
}})().catch(e=>{console.error(e);process.exitCode=1;});
