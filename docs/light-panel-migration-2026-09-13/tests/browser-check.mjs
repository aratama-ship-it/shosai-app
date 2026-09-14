import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium,webkit}=require('/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),out=path.join(root,'verification');await fs.mkdir(out,{recursive:true});
const sample=await fs.readFile(path.join(root,'sample-show.json'),'utf8'),url='http://127.0.0.1:8944/demo/';
const results=[];
const equalSnapshot=(a,b,message)=>{const x=JSON.parse(a),y=JSON.parse(b);assert.equal(Object.keys({...x,...y}).filter(k=>JSON.stringify(x[k])!==JSON.stringify(y[k])).join(','),'',message);};
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8944/')&&!r.url().startsWith('blob:'))external.push(r.url());});
 await page.goto(url);await page.waitForFunction(()=>window.__RIG&&window.LIGHT_MIGRATION_UI);
 await page.screenshot({path:path.join(out,`${name}-intro.png`)});
 const before=await page.evaluate(()=>__RIG.snapshot());
 await page.locator('#migration-file').setInputFiles(path.join(root,'sample-show.json'));
 await page.getByRole('button',{name:'やめる',exact:true}).click();equalSnapshot(await page.evaluate(()=>__RIG.snapshot()),before);
 await page.locator('#migration-file').setInputFiles(path.join(root,'sample-show.json'));
 await page.getByRole("heading",{name:"引き継ぐ内容を確認",exact:true}).waitFor();
 await page.screenshot({path:path.join(out,`${name}-review.png`)});
 await page.getByRole('button',{name:'コピーを照明モードで開く',exact:true}).click();
 assert.equal(await page.evaluate(()=>__RIG.state.scenes.length),3);
 const migrated=await page.evaluate(()=>__RIG.snapshot());
 assert.equal(await page.evaluate(()=>__RIG.state.scenes.flatMap(s=>s.pieces).length),0,'must not keep unrelated demo actors');
 assert.deepEqual(await page.evaluate(()=>STAGE_LIGHT_PANEL_MIGRATION.restoreOriginal(__RIG.buildDesign('確認'))),JSON.parse(sample));
 await page.evaluate(()=>__RIG.undo());equalSnapshot(await page.evaluate(()=>__RIG.snapshot()),before,'Undo import returns whole prior draft');
 await page.evaluate(()=>__RIG.redo());equalSnapshot(await page.evaluate(()=>__RIG.snapshot()),migrated);
 // OFF stash -> ON through actual row UI must preserve saved aim, level and colour.
 const stash=await page.evaluate(()=>{const m=__RIG.state.migration.mappings.find(m=>m.origin==='stash');return {id:m.fixtureId,light:JSON.parse(JSON.stringify(__RIG.state.scenes[0].cue.lights[m.fixtureId]))};});
 await page.evaluate(fid=>{__RIG.state.sel=new Set([fid]);__RIG.renderAll();},stash.id);
 await page.screenshot({path:path.join(out,`${name}-imported.png`)});
 // Use the prototype API behind its ON action, then validate emitted state/render.
 await page.locator("#list .row").filter({hasText:"消灯の控え"}).getByRole("button",{name:"オフ",exact:true}).click();
 const lit=await page.evaluate(fid=>__RIG.state.scenes[0].cue.lights[fid],stash.id);assert.equal(lit.on,true);assert.deepEqual(lit.path,stash.light.path);assert.equal(lit.level,stash.light.level);assert.equal(lit.color,stash.light.color);
 await page.locator('input[type="color"]').fill('#33bb88');
 await page.locator('input[type="color"]').dispatchEvent('change');
 await page.locator('#save').click();await page.locator('#dsname').fill('移行後の編集保存');await page.locator('#dssave').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('shosai.lightDesignMigration.preview.v1'))[0]);assert.equal(saved.scenes[0].cue.lights[stash.id].color,'#33bb88');assert.deepEqual(saved.migration.originalDocument,JSON.parse(sample));
 // Download and reimport the exact emitted JSON after a browser reload.
 await page.locator('#save').click();const dw=page.waitForEvent('download');await page.locator('#dsfile').click();const download=await dw;const target=path.join(out,`${name}-export.lightdesign.json`);await download.saveAs(target);
 const exported=JSON.parse(await fs.readFile(target,'utf8'));assert.equal(exported.version,2);assert.deepEqual(exported.migration.originalDocument,JSON.parse(sample));
 await page.reload();await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
 await page.locator('#save').click();await page.locator('#dialog button[data-act="load"]').click();assert.deepEqual(await page.evaluate(()=>__RIG.state.migration.originalDocument),JSON.parse(sample));
 await page.locator('#save').click();await page.locator('#dspick').setInputFiles(target);assert.equal(await page.evaluate(fid=>__RIG.state.scenes[0].cue.lights[fid].color,stash.id),'#33bb88');
 await page.locator('#migration-entry').click();const od=page.waitForEvent('download');await page.getByRole('button',{name:'移行前のショーを書き出す',exact:true}).click();const original=await od,originalPath=path.join(out,`${name}-restored-show.json`);await original.saveAs(originalPath);assert.equal(await fs.readFile(originalPath,'utf8'),sample);await page.locator('#migration-dialog .migration-close').click();
 // Invalid import: no partial mutation or autosave.
 const valid=await page.evaluate(()=>__RIG.snapshot());await page.locator('#save').click();await page.locator('#dspick').setInputFiles({name:'future.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,version:999}))});equalSnapshot(await page.evaluate(()=>__RIG.snapshot()),valid);await page.locator('#dialog .acts button').click();
 // Simulated storage quota leaves saved item and draft intact.
 const storeBefore=await page.evaluate(()=>localStorage.getItem('shosai.lightDesignMigration.preview.v1'));
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
 await page.locator('#save').click();await page.locator('#dsname').fill('容量不足の確認');await page.locator('#dssave').click();equalSnapshot(await page.evaluate(()=>__RIG.snapshot()),valid);assert.equal(await page.evaluate(()=>localStorage.getItem('shosai.lightDesignMigration.preview.v1')),storeBefore);assert.ok(await page.locator('#toast').isVisible());await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});await page.locator('#dialog .acts button').click();
 // Unknown coordinates stay off; imported labels render as plain text.
 await page.evaluate(()=>{const f=__RIG.state.rig.fixtures.find(f=>f.mount.h===null);__RIG.ensureOn(f.id);if(__RIG.state.scenes[0].cue.lights[f.id].on!==false)throw Error('unknown source was enabled');});
 const hostile=JSON.parse(sample);hostile.project.sets[0].name='<img src=x onerror="window.pwned=1">';hostile.project.sets[0].groupLabel='<img src=x onerror="window.pwned=1">';hostile.project.title='"<svg onload="window.pwned=1">';await page.locator('#migration-file').setInputFiles({name:'labels.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(hostile))});await page.getByRole('button',{name:'コピーを照明モードで開く',exact:true}).click();assert.equal(await page.evaluate(()=>window.pwned),undefined);assert.equal(await page.locator('img').count(),0);
 // Corrupt saved data must remain byte-for-byte intact even when Save is attempted.
 await page.evaluate(()=>localStorage.setItem('shosai.lightDesignMigration.preview.v1','{broken'));
 await page.locator('#save').click();assert.equal(await page.evaluate(()=>localStorage.getItem('shosai.lightDesignMigration.preview.v1')),'{broken');assert.ok(await page.locator('#toast').isVisible());
 // Smaller tablet review remains within the viewport, including action buttons.
 await page.setViewportSize({width:768,height:1024});await page.locator('#migration-entry').click();const bounds=await page.locator('#migration-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=768);await page.screenshot({path:path.join(out,`${name}-tablet.png`)});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({browser:name,checks:'cancel, import, undo/redo, saved OFF aim, edit, store, reload, export/reimport, exact original recovery, invalid version, storage quota, unknown source, escaped labels, corrupt store preservation, tablet bounds',errors,externalRequests:external});
 await context.close();
 }finally{await browser.close();}
}
await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
