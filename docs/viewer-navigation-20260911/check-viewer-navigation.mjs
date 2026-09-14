import assert from 'node:assert/strict';
import {chromium} from '/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p=await browser.newPage({viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const errors=[]; p.on('pageerror',e=>errors.push(e.message));
const base=process.argv[2]||'http://127.0.0.1:8812/?lang=ja';
try {
  await p.goto(base); await p.waitForFunction(()=>!document.querySelector('#phone-next').disabled);
  const f=p.frames().find(f=>f.url().includes('study-frame.html'));
  const title=await p.locator('.study-brand').boundingBox(), header=await p.locator('.study-header').boundingBox();
  assert.ok(Math.abs((title.y+title.height/2)-(header.y+header.height/2))<2,'vertically centered title');
  const hashes=[];
  for(const seat of ['front','center','rear','side','balcony']) {
    await f.locator('#viewer-seat').selectOption(seat); await p.waitForTimeout(80);
    assert.equal(await f.evaluate(()=>SHOSAI_STAGE_STUDY_RENDERER.camera().seat),seat);
    hashes.push(await f.locator('#stage-canvas').evaluate(c=>c.toDataURL()));
  }
  assert.equal(new Set(hashes).size,5,'five distinct seat projections');
  await f.locator('#viewer-seat').selectOption('center');
  const cdp=await p.context().newCDPSession(p);
  async function pinch(view, start, end) {
    const rect=await f.locator('.study-'+view+' .viewer-viewport').boundingBox();
    const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
    const pair=d=>[{x:cx-d,y:cy,id:1},{x:cx+d,y:cy,id:2}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pair(start)});
    for(let n=1;n<=5;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pair(start+(end-start)*n/5)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await p.waitForTimeout(150);
    return Number(await f.locator('.study-'+view+' .viewer-surface').getAttribute('data-zoom'));
  }
  for(const view of ['front','plan']) {
    assert.ok(await pinch(view,35,70)>1.8,view+' pinch out zooms');
    const aligned=await f.locator('.study-'+view).evaluate(d=>{
      const a=d.querySelector('canvas').getBoundingClientRect(),b=d.querySelector('.study-pen-layer').getBoundingClientRect(),c=d.querySelector('.study-sticky-layer').getBoundingClientRect();
      return [b,c].every(r=>Math.abs(r.x-a.x)<1&&Math.abs(r.y-a.y)<1&&Math.abs(r.width-a.width)<1&&Math.abs(r.height-a.height)<1);
    });
    assert.ok(aligned,view+' transformed annotation alignment');
    assert.ok(await pinch(view,70,35)<1.1,view+' pinch in returns to fit');
  }
  assert.equal(await p.evaluate(()=>visualViewport.scale),1,'page chrome not zoomed');
  await p.locator('#phone-tools').click();await p.locator('#study-pen').click();
  await pinch('front',35,70);
  assert.equal(await p.locator('#study-pen-undo').isDisabled(),true,'pinch does not commit a pen stroke');
  await p.locator('#phone-tools').click();await p.locator('#study-pen').click();await p.locator('#phone-close').click();
  await f.locator('[data-viewer-reset="front"]').click();
  assert.equal(await f.locator('.study-front .viewer-surface').getAttribute('data-zoom'),'1');
  await pinch('plan',35,70);
  await p.screenshot({path:'/tmp/viewer-navigation-portrait.png'});
  await p.setViewportSize({width:844,height:390});await p.waitForTimeout(350);
  await p.locator('#phone-view').click();
  assert.ok(Number(await f.locator('.study-plan .viewer-surface').getAttribute('data-zoom'))>1.8,'zoom retained through rotation');
  const viewport=await f.locator('.study-plan .viewer-viewport').boundingBox();
  assert.ok(viewport.width>700,'landscape uses available width');
  await f.locator('[data-viewer-reset="plan"]').click();
  await p.locator('#phone-view').click();await f.locator('#viewer-seat').selectOption('balcony');
  await p.screenshot({path:'/tmp/viewer-navigation-landscape.png'});
  await p.locator('#phone-next').click();
  assert.equal(await f.evaluate(()=>SHOSAI_STAGE_STUDY_RENDERER.camera().seat),'balcony','seat retained on scene change');
  assert.deepEqual(errors,[]);
  console.log('PASS five seats, centered title, real touch pinch in/out on both views, annotation alignment, pen cancellation, reset, unchanged page zoom, rotation/scene retention; no JS errors');
} finally {await browser.close();}
