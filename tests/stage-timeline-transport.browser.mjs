// Run: PLAYWRIGHT_MODULE=/path/to/playwright node --test tests/stage-pages-p0.browser.mjs
// A local HTTP server and fresh browser contexts isolate all synthetic storage.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browserType = playwright[process.env.STAGE_TEST_BROWSER || 'chromium'];
const root = process.env.STAGE_TEST_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(new URL('./fixtures/stage-pages-p0.json', import.meta.url), 'utf8'));
const CURRENT = 'shosai-stage-sketch-v1', SHELF = 'shosai-stage-shows-v1';
let server, browser, url;
before(async () => {
  server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    try {
      const body = await readFile(file);
      res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = process.env.STAGE_TEST_URL || `http://127.0.0.1:${server.address().port}/stage.html`;
  browser = await browserType.launch({ headless:true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
async function pageFor(t, { state=fixture, shows={}, mode='normal', fail='', legacyBridge=false }={}) {
  const context = await browser.newContext({ serviceWorkers:'block', locale:'ja-JP', viewport:{width:1440,height:1000} });
  t.after(() => context.close());
  await context.addInitScript(({state, shows, mode, fail, legacyBridge, CURRENT, SHELF}) => {
    if (legacyBridge) {
      let value;
      Object.defineProperty(window, "SHOSAI_STAGE_SESSION_BRIDGE", { configurable:true, get:()=>value, set:bridge=>{ const {setTimelineAudioContext,getAudioPlaybackState,...rest}=bridge; value=Object.freeze(rest); } });
    }
    if (!localStorage.getItem('p0-test-seeded')) {
      localStorage.setItem(CURRENT, JSON.stringify(state));
      localStorage.setItem(SHELF, JSON.stringify(shows));
      localStorage.setItem('shosai-stage-tour-v1', 'done');
      localStorage.setItem('shosai-stage-prefs-v1',JSON.stringify({panelMusic:true}));
      localStorage.setItem('shosai-stage-timeline-ui-v1', JSON.stringify({mode, volume:0}));
      localStorage.setItem('p0-test-seeded', '1');
    }
    if (fail) {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if ((fail === 'current' && key.startsWith(CURRENT+'-pre-section-hierarchy')) ||
            (fail === 'shelf' && key.startsWith(SHELF+'-pre-section-hierarchy'))) {
          throw new DOMException('Synthetic backup write failure', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
    }
  }, {state,shows,mode,fail,legacyBridge,CURRENT,SHELF});
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  t.after(()=>assert.deepEqual(errors, [], 'no uncaught browser exceptions'));
  await p.goto(url);
  await p.locator('#stage-launch-backup-close').click();
  return p;
}
const doc = p => p.evaluate(()=>JSON.parse(SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()));
const oldState = () => { const f=structuredClone(fixture);f.project.scenes=f.project.scenes.filter(s=>s.kind==='scene').map(s=>({...s,depth:0}));return f; };
function silentWav(seconds=8){const wav=Buffer.alloc(44+8000*seconds*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);return wav;}
async function addAudio(p){await p.locator('#stage-music-file').setInputFiles({name:'synthetic-silence.wav',mimeType:'audio/wav',buffer:silentWav()});try { await p.waitForFunction(()=>(SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState?.().ready || document.querySelector('#stage-music-audio').readyState>=1)); } catch(error) { error.message += JSON.stringify(await p.evaluate(()=>({status:document.getElementById('stage-music-status').textContent, playback:SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState?.(), audio: { ready:document.getElementById('stage-music-audio').readyState, error:document.getElementById('stage-music-audio').error?.message }, tracks:JSON.parse(SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.audioTracks}))); throw error; }}
const pose = p => p.evaluate(()=>{
  const project=JSON.parse(SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project;
  const scene=project.scenes.find(s=>s.id===project.activeSceneId);
  return {scene:scene.id,pieces:scene.pieces,position:document.querySelector('#stage-timeline-position').textContent};
});
const u = snapshot => snapshot.pieces.find(p=>p.type==='performer').animU ?? snapshot.pieces.find(p=>p.type==='performer').u;
async function seek(p, seconds, duration=5){
  await p.locator('#stage-timeline-ruler').evaluate((el,{seconds,duration})=>{
    const r=el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width*seconds/duration,clientY:r.top+8,button:0}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  },{seconds,duration});
  await p.waitForTimeout(60);
}
function near(a,b,eps=.025){assert.ok(Math.abs(a-b)<eps,`${a} should be near ${b}`);}
test('A06: default normal transition honors the scene duration rather than 100 ms',async t=>{
  const p=await pageFor(t);
  await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s2'));
  await p.waitForTimeout(220);const a=await pose(p);assert.ok(u(a)<.5,JSON.stringify(a));
  await p.waitForTimeout(2000);near(u(await pose(p)),.8);
});
test('A08: silent midpoint, backward and repeated seeks sample the same pose and stop there',async t=>{
  const p=await pageFor(t,{mode:'timeline'});
  await seek(p,2);near(u(await pose(p)),.5);
  if(process.env.STAGE_TEST_EVIDENCE){
    await p.locator('#stage-view-select').selectOption('both-plan');
    await p.screenshot({path:process.env.STAGE_TEST_EVIDENCE+'/timeline-midpoint.png'});
    await p.locator('#stage-view-select').selectOption('front');
    await p.screenshot({path:process.env.STAGE_TEST_EVIDENCE+'/front-midpoint.png'});
  }
  await p.waitForTimeout(700);near(u(await pose(p)),.5);
  await seek(p,.5);near(u(await pose(p)),.2);
  await seek(p,2.5);assert.ok(u(await pose(p))>.65);
  await seek(p,2);near(u(await pose(p)),.5);
  await seek(p,3);near(u(await pose(p)),.8);
});
test('A05: silent pause freezes the movement; resume continues from that position',async t=>{
  const p=await pageFor(t,{mode:'timeline'});
  await seek(p,1.5);const before=await pose(p);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(300);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(100);const frozen=await pose(p);
  assert.ok(u(frozen)>u(before));await p.waitForTimeout(700);
  near(u(await pose(p)),u(frozen),.001);
  assert.equal((await pose(p)).position,frozen.position);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(300);
  await p.locator('#stage-timeline-play').click();assert.ok(u(await pose(p))>u(frozen));
});
test('timeline motion is visible even if normal scene animation is disabled',async t=>{
  const state=structuredClone(fixture);state.animateScenes=false;
  const p=await pageFor(t,{state,mode:'timeline'});await seek(p,2);near(u(await pose(p)),.5);
});
test('route control, light fades and machinery all sample the same transition progress',async t=>{
  const state=structuredClone(fixture),[a,b]=state.project.scenes.filter(s=>s.kind==='scene');
  a.pieces[0].route={u:.8,v:.5,bu:.5,bv:.1};
  for (const [scene,n] of [[a,0],[b,1]]){
    scene.pieces.push({id:'light-'+n,originId:'light-x',type:'light',u:.4,v:.5,glow:n?.8:.2,beam:{u:.5,v:.5}});
    scene.pieces.push({id:'deck-'+n,originId:'deck-x',type:'deck',u:.6,v:.6,tilt:n?30:0,deckH:0});
  }
  const p=await pageFor(t,{state,mode:'timeline'});await seek(p,2);const mid=await pose(p);
  near(mid.pieces[0].animV,.3);
  near(mid.pieces.find(x=>x.type==='light').animGlow,.5);
  near(mid.pieces.find(x=>x.type==='deck').animMech.tilt,15);
  await seek(p,.5);await seek(p,2);near((await pose(p)).pieces[0].animV,.3);
});
test('audio currentTime drives mid-transition seek, pause and resume without drifting',async t=>{
  const p=await pageFor(t,{mode:'timeline'});await addAudio(p);
  await p.evaluate(()=>document.querySelector('#stage-music-audio').currentTime=2);
  await p.waitForTimeout(200);near(u(await pose(p)),.5);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(220);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(100);const frozen=await pose(p);
  await p.waitForTimeout(500);near(u(await pose(p)),u(frozen),.002);
  await p.evaluate(()=>document.querySelector('#stage-music-audio').currentTime=1.5);
  await p.waitForTimeout(120);assert.ok(u(await pose(p))<u(frozen));
});
test('saved canonical coordinates survive pause, shelf, reload and export/import',async t=>{
  const p=await pageFor(t,{mode:'timeline'}),before=(await doc(p)).project;
  await seek(p,2);near(u(await pose(p)),.5);
  assert.equal(await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.shelveNow()),true);
  const mid=await doc(p);
  const canonical=project=>project.scenes.map(s=>({id:s.id,pieces:s.pieces.map(x=>({id:x.id,u:x.u,v:x.v,route:x.route})),rehearsal:s.rehearsal}));
  assert.deepEqual(canonical(mid.project),canonical(before));
  await p.reload();await p.locator('#stage-launch-backup-close').click();
  assert.deepEqual(canonical((await doc(p)).project),canonical(before));
  await p.locator('#stage-import-json').setInputFiles({name:'motion.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mid))});
  await p.locator('#stage-import-replace').click();
  await p.waitForTimeout(150);assert.deepEqual(canonical((await doc(p)).project),canonical(before));
  await seek(p,2);near(u(await pose(p)),.5);
  await p.locator('#stage-workspace-normal').click();await p.waitForTimeout(150);
  const normal=await pose(p);assert.equal(normal.pieces[0].animU,undefined);
});
function formationFixture(){
  const state=structuredClone(fixture),[section,a,b]=state.project.scenes;
  const castId=a.pieces[0].castId;
  section.formation={version:1,audioTrackBySong:{},package:{format:'formation-exchange',sync:{documentId:'synthetic-formation'},formation:{songs:[{
    id:'song-one',track:{countBpm:120,firstCountSec:0,anchors:[]},
    frames:[{id:'f1',count:1,poses:{[castId]:{u:.2,v:.5,facing:350}}},{id:'f2',count:7,travel:4,poses:{[castId]:{u:.8,v:.5,facing:10,cu:.5,cv:.1,lead:1,early:1}}}],
    scenePlan:{segments:[{id:'g1',fromFrameId:'f1'},{id:'g2',fromFrameId:'f2'}],endCount:11}
  }]}}};
  for(const [scene,n] of [[a,1],[b,2]])scene.formationLink={documentId:'synthetic-formation',songId:'song-one',sourceSegmentId:'g'+n,sourceFrameId:'f'+n,startCount:n===1?1:7};
  return state;
}
test('Music Sync uses lead/early, curve and facing for silent seek and pause',async t=>{
  const p=await pageFor(t,{state:formationFixture(),mode:'timeline'});
  await seek(p,1.5);let current=await pose(p);near(u(current),.5);near(current.pieces[0].animV,.3);
  near(current.pieces[0].animFacing,0);assert.equal(current.scene,'audit-s1');
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(150);
  await p.locator('#stage-timeline-play').click();const frozen=await pose(p);
  await p.waitForTimeout(500);near(u(await pose(p)),u(frozen),.001);
  await seek(p,3);assert.equal((await pose(p)).scene,'audit-s2');near(u(await pose(p)),.8);
  await seek(p,1.5);near(u(await pose(p)),.5);
});
test('A/B wrap resamples the move instead of continuing the old animation',async t=>{
  const p=await pageFor(t,{mode:'timeline'});
  await seek(p,1.5);await p.locator('#stage-timeline-loop-a').click();
  await seek(p,2);await p.locator('#stage-timeline-loop-b').click();
  if(await p.locator('#stage-timeline-loop').getAttribute('aria-pressed')==='false')await p.locator('#stage-timeline-loop').click();
  await seek(p,1.9);await p.locator('#stage-timeline-play').click();await p.waitForTimeout(250);
  await p.locator('#stage-timeline-play').click();const wrapped=await pose(p);
  assert.ok(u(wrapped)<.5,JSON.stringify(wrapped));await p.waitForTimeout(400);near(u(await pose(p)),u(wrapped),.001);
});
test('A06: null scene duration uses the configured global animation duration',async t=>{
  const state=structuredClone(fixture);state.project.scenes[2].cueSeconds=null;
  const p=await pageFor(t,{state});await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s2'));
  await p.waitForTimeout(220);assert.ok(u(await pose(p))<.5);
});
test('Music Sync audio playback and seek have a single pose writer',async t=>{
  const state=formationFixture(),p=await pageFor(t,{state,mode:'timeline'});await addAudio(p);
  const project=(await doc(p)).project,trackId=project.scenes[1].audioTrackId;
  assert.ok(trackId);project.scenes[0].formation.audioTrackBySong['song-one']=trackId;
  await p.evaluate(({state,project,CURRENT})=>localStorage.setItem(CURRENT,JSON.stringify({...state,project})),{state,project,CURRENT});
  await p.reload();await p.locator('#stage-launch-backup-close').click();
  await p.waitForFunction(()=>SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState().ready);
  await p.evaluate(()=>document.querySelector('#stage-music-audio').currentTime=1.5);
  await p.waitForTimeout(120);let current=await pose(p);near(u(current),.5);near(current.pieces[0].animV,.3);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(180);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(100);const frozen=await pose(p);
  await p.waitForTimeout(400);near(u(await pose(p)),u(frozen),.002);
  await p.evaluate(()=>document.querySelector('#stage-music-audio').currentTime=1.5);
  await p.waitForTimeout(120);near(u(await pose(p)),.5);
});
