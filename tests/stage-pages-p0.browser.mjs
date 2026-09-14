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
  url = `http://127.0.0.1:${server.address().port}/stage.html`;
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
for (const failure of ['current','shelf']) {
  test(`A01: ${failure} backup failure preserves both originals after edit, shelf and import attempts`, async t => {
    const state=oldState(), shows={[state.project.id]:{state}};
    const p=await pageFor(t,{state,shows,fail:failure});
    await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s2'));
    assert.equal(await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.shelveNow()), false);
    const exported=await doc(p);
    assert.equal(exported.project.activeSceneId,'audit-s2','draft editing still works');
    await p.locator('#stage-import-json').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
    await p.locator('#stage-import-as-new').click();
    await p.waitForTimeout(350);
    const raw=await p.evaluate(({CURRENT,SHELF})=>[localStorage.getItem(CURRENT),localStorage.getItem(SHELF)],{CURRENT,SHELF});
    assert.deepEqual(raw,[JSON.stringify(state),JSON.stringify(shows)]);
    assert.equal((await doc(p)).project.id,state.project.id,'failed preservation prevents show switch');
  });
}
test('A01: successful backups allow migration, editing and persistence', async t => {
  const state=oldState(), shows={[state.project.id]:{state}};
  const p=await pageFor(t,{state,shows});
  await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s2'));
  await p.waitForTimeout(350);
  const data=await p.evaluate(({CURRENT,SHELF,id})=>({current:JSON.parse(localStorage.getItem(CURRENT)),source:localStorage.getItem(CURRENT+'-pre-section-hierarchy-v1:'+id),shelf:localStorage.getItem(SHELF+'-pre-section-hierarchy-v1')}),{CURRENT,SHELF,id:state.project.id});
  assert.equal(data.source,JSON.stringify(state));assert.equal(data.shelf,JSON.stringify(shows));
  assert.equal(data.current.project.scenes[0].kind,'section');assert.equal(data.current.project.activeSceneId,'audit-s2');
});
for (const changed of [false,true]) {
  test(`A02: same ID import ${changed?'with changed content preserves the previous show':'round-trips without an exception'}`, async t => {
    const p=await pageFor(t);
    assert.equal(await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.shelveNow()),true);
    const incoming=await doc(p), prior=structuredClone(incoming.project);
    if(changed)incoming.project.title='changed synthetic show';
    await p.locator('#stage-import-json').setInputFiles({name:'same-id.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
    await p.locator('#stage-import-replace').click();
    await p.waitForTimeout(250);
    assert.equal(await p.locator('#stage-import-modal').isVisible(),false);
    const result=await doc(p);
    if(changed)assert.notEqual(result.project.id,prior.id);else assert.equal(result.project.id,prior.id);
    assert.equal(result.project.title,incoming.project.title);
    const shelf=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),SHELF);
    assert.equal(shelf[prior.id].state.project.title,prior.title);
    await p.reload();await p.locator('#stage-launch-backup-close').click();
    assert.deepEqual((await doc(p)).project,result.project,'reload keeps the imported show');
  });
}
function silentWav(seconds=8){const wav=Buffer.alloc(44+8000*seconds*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);return wav;}
async function addAudio(p){await p.locator('#stage-music-file').setInputFiles({name:'synthetic-silence.wav',mimeType:'audio/wav',buffer:silentWav()});try { await p.waitForFunction(()=>(SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState?.().ready || document.querySelector('#stage-music-audio').readyState>=1)); } catch(error) { error.message += JSON.stringify(await p.evaluate(()=>({status:document.getElementById('stage-music-status').textContent, playback:SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState?.(), audio: { ready:document.getElementById('stage-music-audio').readyState, error:document.getElementById('stage-music-audio').error?.message }, tracks:JSON.parse(SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.audioTracks}))); throw error; }}
const transport=p=>p.evaluate(()=>{const a=document.querySelector('#stage-music-audio');return{time:a.currentTime,paused:a.paused,src:a.getAttribute('src'),scene:JSON.parse(SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.activeSceneId}});
test('A04: one assigned track continues across an unassigned scene; pause/resume/seek/reload keep assignments',async t=>{
  const p=await pageFor(t,{mode:'timeline'});await addAudio(p);
  const assigned=(await doc(p)).project.scenes.map(s=>s.audioTrackId);
  await p.locator('#stage-timeline-play').click();
  await p.waitForFunction(()=>document.querySelector('#stage-music-audio').currentTime>1.3);
  let a=await transport(p);assert.equal(a.paused,false);assert.equal(a.scene,'audit-s2');
  await p.locator('#stage-timeline-play').click();a=await transport(p);assert.equal(a.paused,true);
  await p.locator('#stage-timeline-play').click();await p.waitForFunction(()=>!document.querySelector('#stage-music-audio').paused);
  await p.evaluate(()=>document.querySelector('#stage-music-audio').currentTime=3.5);
  await p.waitForTimeout(400);a=await transport(p);assert.ok(a.time>=3.5);assert.equal(a.paused,false);assert.equal(a.scene,'audit-s2');
  assert.deepEqual((await doc(p)).project.scenes.map(s=>s.audioTrackId),assigned);
  await p.locator('#stage-timeline-play').click();await p.waitForTimeout(250);
  await p.reload();await p.locator('#stage-launch-backup-close').click();
  await p.waitForFunction(()=>(SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState?.().ready || document.querySelector('#stage-music-audio').readyState>=1));
  assert.deepEqual((await doc(p)).project.scenes.map(s=>s.audioTrackId),assigned);
  await p.locator('#stage-workspace-normal').click();
  await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s2'));
  await p.waitForTimeout(200);a=await transport(p);assert.equal(a.paused,true);assert.equal(a.src,null,'normal mode still treats an unassigned scene as silent');
});
test('normal mode retains same-track playback across assigned scenes',async t=>{
  const p=await pageFor(t);await addAudio(p);const before=await doc(p);
  const track=before.project.scenes.find(s=>s.id==='audit-s1').audioTrackId;
  await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s2'));
  if (!(await p.locator('#stage-scene-audio-track').isVisible())) await p.locator('[data-panel-head="music"]').click();
  await p.locator('#stage-scene-audio-track').selectOption(track);
  await p.waitForFunction(()=>(SHOSAI_STAGE_SESSION_BRIDGE.getAudioPlaybackState?.().ready || document.querySelector('#stage-music-audio').readyState>=1));
  await p.locator('#stage-music-toggle').click();
  await p.waitForFunction(()=>document.querySelector('#stage-music-audio').currentTime>.3);
  const a=await transport(p);await p.evaluate(()=>SHOSAI_STAGE_SESSION_BRIDGE.openSceneById('audit-s1'));
  await p.waitForTimeout(200);const b=await transport(p);assert.equal(b.paused,false);assert.equal(a.src,b.src);assert.ok(b.time>=a.time);
});
test('audio-free timeline still advances the selected scene',async t=>{
  const p=await pageFor(t,{mode:'timeline'});await p.locator('#stage-timeline-play').click();
  await p.waitForFunction(()=>JSON.parse(SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.activeSceneId==='audit-s2');
  assert.equal((await doc(p)).project.audioTracks.length,0);
});

test('mixed cache: timeline tolerates a host exposing the previous bridge',async t=>{
  const p=await pageFor(t,{mode:'timeline',legacyBridge:true});
  assert.equal(await p.locator('#stage-timeline-panel').isVisible(),true);
  await p.locator('#stage-workspace-normal').click();
  await p.locator('#stage-workspace-timeline').click();
  assert.equal(await p.locator('#stage-timeline-panel').isVisible(),true);
});
