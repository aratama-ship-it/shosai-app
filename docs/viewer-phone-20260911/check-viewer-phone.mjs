import assert from 'node:assert/strict';
import { chromium } from '/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const url = process.argv[2] || 'http://127.0.0.1:8812/?lang=ja';
const page = await browser.newPage({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
async function stable() { await page.waitForTimeout(400); }
async function checkLayout(name) {
  await stable();
  const result = await page.evaluate(() => {
    const selectors = ['#phone-prev','#phone-next','#phone-current','#phone-view','#phone-play','#phone-tools','#phone-memo','#phone-settings'];
    const boxes = selectors.map(s => ({s,...document.querySelector(s).getBoundingClientRect().toJSON()}));
    return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,boxes,frame:document.querySelector('#study-frame-host iframe').getBoundingClientRect().toJSON()};
  });
  assert.equal(result.overflow,false,name+' horizontal overflow');
  for(const box of result.boxes) {
    assert.ok(box.width>=44 && box.height>=44,name+' touch target '+box.s);
    assert.ok(box.x>=0 && box.y>=0 && box.right<=result.width+1 && box.bottom<=result.height+1,name+' onscreen '+box.s);
    for(const other of result.boxes.filter(o=>o.s!==box.s)) assert.ok(Math.min(box.right,other.right)-Math.max(box.x,other.x)<1 || Math.min(box.bottom,other.bottom)-Math.max(box.y,other.y)<1,name+' overlap '+box.s+other.s);
  }
  assert.ok(result.frame.height>result.height*.65,name+' diagram visible');
  await page.screenshot({path:'/tmp/viewer-'+name+'.png'});
  console.log('PASS layout',name,Math.round(result.frame.width)+'x'+Math.round(result.frame.height));
}
try {
  await page.goto(url);
  await page.waitForFunction(()=>!document.querySelector('#phone-next').disabled);
  await checkLayout('portrait');
  await page.locator('#phone-next').click(); await stable();
  const scene = await page.locator('#study-scenes').inputValue();
  await page.locator('#phone-memo').click();
  await page.locator('#study-note').fill('端末UI確認：立ち位置と次の合図を確認');
  await stable(); await page.locator('#phone-close').click();
  await page.setViewportSize({width:844,height:390});
  await checkLayout('landscape');
  assert.equal(await page.locator('#study-scenes').inputValue(),scene,'scene retained on rotation');
  assert.equal(await page.locator('#study-view').inputValue(),'front');
  await page.locator('#phone-view').click();
  assert.equal(await page.locator('#study-view').inputValue(),'plan');
  await page.locator('#phone-play').click(); await stable();
  assert.equal(await page.locator('#phone-play').textContent(),'停止');
  await page.locator('#phone-play').click(); await stable();
  await page.locator('#phone-memo').click();
  assert.match(await page.locator('#study-note').inputValue(),/端末UI確認/);
  await stable(); await page.screenshot({path:'/tmp/viewer-landscape-notes.png'});
  await page.locator('.phone-share > summary').click();
  await page.locator('#study-name').fill('UI確認用の演者');
  await page.locator('#study-send').click();
  await page.waitForFunction(()=>window.__STAGE_SKETCH_DEVICE_PREVIEW__.submissions===1);
  await page.locator('#phone-close').click();
  await page.locator('#phone-tools').click();
  await page.locator('#study-pen').click();
  assert.equal(await page.locator('#phone-panel').isVisible(),false,'draw closes drawer');
  const frame = page.frames().find(f=>f.url().includes('study-frame.html'));
  const canvas = frame.locator('.study-plan canvas').first();
  const rect = await canvas.boundingBox();
  assert.ok(rect,'plan canvas available');
  await page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.4);
  await page.mouse.down(); await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.6,{steps:6}); await page.mouse.up();
  await page.waitForFunction(()=>!document.querySelector('#study-pen-undo').disabled);
  await page.locator('#phone-tools').click();
  await page.locator('#study-pen-undo').click();
  await page.waitForFunction(()=>document.querySelector('#study-pen-undo').disabled);
  await page.locator('#study-pen').click();
  await page.locator('#study-sticky').click();
  await page.locator('#study-sticky-front').click();
  await page.locator('#study-sticky-text').fill('合図で入る');
  await page.locator('#study-sticky-position').click();
  assert.equal(await page.locator('#phone-panel').isVisible(),false);
  await page.locator('#phone-current').click();
  assert.equal(await page.locator('.phone-scene-list button').count(),8);
  await page.locator('.phone-scene-list button').nth(3).click();
  await page.locator('#phone-settings').click();
  await page.locator('#study-language').selectOption('en'); await stable();
  assert.equal(await page.locator('#phone-panel-title').textContent(),'Show & settings');
  await page.locator('#phone-close').click();
  await page.setViewportSize({width:375,height:667}); await checkLayout('small-portrait-en');
  await page.setViewportSize({width:667,height:375}); await checkLayout('small-landscape-en');
  await page.reload(); await page.waitForFunction(()=>!document.querySelector('#phone-next').disabled);
  await page.locator('#phone-next').click(); await stable(); await page.locator('#phone-memo').click();
  assert.match(await page.locator('#study-note').inputValue(),/端末UI確認/,'note retained on reload');
  assert.deepEqual(errors,[]);
  console.log('PASS scene, orientation, notes/reload, view switch, replay/stop, simulated share, pen/undo, sticky, scene list, language; no JS errors');
  for(const [name,viewport] of [['ipad',{width:820,height:1180}],['desktop',{width:1440,height:900}]]) {
    const p=await browser.newPage({viewport,screen:viewport,hasTouch:name==='ipad',isMobile:name==='ipad'});
    await p.goto(url); await p.waitForTimeout(1000);
    assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('study-phone')),false);
    assert.equal(await p.locator('#study-side').isVisible(),true);
    console.log('PASS unchanged',name); await p.close();
  }
} finally { await browser.close(); }
