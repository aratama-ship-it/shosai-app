const {chromium,webkit}=require('playwright');
const fs=require('fs/promises'),path=require('path'),assert=require('assert/strict');
(async()=>{const report={};for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:1800,height:1300}});
  await page.route('**/volume-light.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`;{const old=window.VOLUME_LIGHT;window.__qualities=[];window.VOLUME_LIGHT={...old,render(...args){window.__qualities.push(args[8]);return old.render(...args);}};}`});});
  await page.goto('http://127.0.0.1:8797/backlight-redesign/prototype-b/?example=back');await page.waitForFunction(()=>window.__RIG?.hooks);
  const range=page.locator('.option-b-controls input[type=range]'),box=await range.boundingBox();
  await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height/2,{steps:3});
  assert.equal(await page.evaluate(()=>window.__qualities.at(-1)),true);await page.mouse.up();assert.equal(await page.evaluate(()=>window.__qualities.at(-1)),false);
  // A window switch must not leave the lower resolution latched on.
  await page.mouse.move(box.x+box.width*.5,box.y+box.height/2);await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await page.evaluate(()=>window.__qualities.at(-1)),false);await page.mouse.up();
  report[engine]={dragUsesQuick:true,pointerUpRestoresPrecise:true,blurRestoresPrecise:true};console.log(engine,JSON.stringify(report[engine]));
 }finally{await browser.close();await fs.writeFile(path.join(__dirname,'evidence-b/quality.json'),JSON.stringify(report,null,2));}
}})().catch(e=>{console.error(e);process.exitCode=1;});
