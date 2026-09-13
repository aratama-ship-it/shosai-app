// Local-only browser regression for the Viewer's device layout preference.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT || require.resolve('playwright')));
const url = process.env.STUDY_VIEWER_URL || (await readFile(new URL('../docs/study-links/sticky-opacity-qa/preview-url.txt', import.meta.url), 'utf8')).trim();
const parsed = new URL(url);
assert.match(parsed.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const out = fileURLToPath(new URL('../docs/study-links/panel-width-qa/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(), errors = [], writes = [], checks = [];
const key = 'stage-study-panel-width-v1';
page.on('pageerror', error => errors.push(error.message));
page.on('request', r => { if (r.url().includes('/study/api/') && !['GET', 'HEAD'].includes(r.method())) writes.push(r.url()); });
const pass = text => { checks.push(text); console.log('PASS', text); };
const ready = () => page.locator('#study-workspace').waitFor({ state: 'visible' });
const handle = page.locator('#study-side-resize');
const width = async () => Math.round((await page.locator('#study-side').boundingBox()).width);
const stored = () => page.evaluate(k => localStorage.getItem(k), key);
const waitWidth = value => page.waitForFunction(expected => Math.abs(document.querySelector('#study-side').getBoundingClientRect().width - expected) < 1, value);
const startDrag = async delta => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const r = await handle.boundingBox();
  const x = r.x + r.width / 2, y = r.y + 60;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x - delta, y, { steps: 12 });
};
const dragBy = async delta => { await startDrag(delta); await page.mouse.up(); };
try {
  await context.addInitScript(() => { if (window.top === window) { localStorage.setItem('shosai-stage-sketch-v1', 'panel-test-existing-show'); localStorage.setItem('shosai-stage-shows-v1', 'panel-test-existing-shelf'); } });
  const viewAPI = parsed.origin + '/study/api/view/' + parsed.hash.slice(1);
  const snapshot = await (await context.request.get(viewAPI)).json();
  assert.ok(snapshot.document.project.scenes.filter(s => s.kind === 'scene').length > 1, 'Use a multi-scene synthetic invitation');
  await page.goto(url); await ready(); await waitWidth(320);
  await page.locator('#study-note').fill('幅調整後も、この自分用メモを保持する。');
  await page.waitForFunction(() => document.querySelector('#study-save-status').textContent.includes('この端末に保存済み'));
  await dragBy(180); await waitWidth(500); assert.equal(await stored(), '500');
  await page.reload(); await ready(); await waitWidth(500);
  assert.equal(await page.locator('#study-note').inputValue(), '幅調整後も、この自分用メモを保持する。');
  pass('Drag left widens the complete right column; width and private text survive reload');
  const scene = await page.locator('#study-scenes').inputValue();
  await handle.focus(); await page.keyboard.press('ArrowLeft'); await waitWidth(510);
  await page.keyboard.press('ArrowRight'); await waitWidth(500);
  await page.keyboard.press('Shift+ArrowLeft'); await waitWidth(530);
  assert.equal(await page.locator('#study-scenes').inputValue(), scene);
  await page.keyboard.press('Home'); await waitWidth(260);
  await page.keyboard.press('End'); await waitWidth(640);
  pass('Arrow/Shift/Home/End resize the panel without navigating to another scene');
  for (const cancel of ['escape', 'pointercancel', 'lostcapture']) {
    await startDrag(-100); await waitWidth(540);
    if (cancel === 'escape') await page.keyboard.press('Escape');
    if (cancel === 'pointercancel') await handle.dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true });
    if (cancel === 'lostcapture') await handle.evaluate(el => el.releasePointerCapture(1));
    await page.mouse.up(); await waitWidth(640); assert.equal(await stored(), '640');
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('study-panel-resizing')), false);
  }
  pass('Escape, pointer cancellation and lost capture roll back unfinished drags');
  for (const lang of ['ja', 'en']) {
    await page.locator('#study-language').selectOption(lang);
    assert.equal(await handle.getAttribute('aria-label'), lang === 'ja' ? '右パネルの幅' : 'Right panel width');
    for (const [w, h] of [[768, 1024], [390, 844], [844, 390], [1440, 1000]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForFunction(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await handle.isVisible(), w >= 700);
      if (w >= 700) {
        const max = Number(await handle.getAttribute('aria-valuemax'));
        await waitWidth(max);
        assert.ok((await page.locator('.study-stage').boundingBox()).width >= 319.9);
        const r = await handle.boundingBox(); assert.ok(r.width >= 44 && r.height >= 44);
      }
      assert.equal(await stored(), '640', 'Viewport clamping must preserve the chosen width');
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.study-side').scrollTop = 0; });
      await page.screenshot({ path: out + `/${lang}-${w}.png` });
    }
  }
  pass('JA/EN responsive limits preserve drawing space and saved width; narrow phones hide the separator');
  await handle.focus(); await page.keyboard.press('Enter'); await waitWidth(320); assert.equal(await stored(), null);
  await dragBy(130); await waitWidth(450);
  await handle.dblclick({ position: { x: 22, y: 60 } }); await waitWidth(320); assert.equal(await stored(), null);
  await page.evaluate(k => localStorage.setItem(k, 'invalid'), key); await page.reload(); await ready(); await waitWidth(320);
  assert.equal(await stored(), 'invalid');
  pass('Enter/double-click reset the device preference; corrupt saved width is ignored safely');
  assert.deepEqual(await (await context.request.get(viewAPI)).json(), snapshot);
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('shosai-stage-sketch-v1'), localStorage.getItem('shosai-stage-shows-v1')]), ['panel-test-existing-show', 'panel-test-existing-shelf']);
  assert.deepEqual(writes, []); assert.deepEqual(errors, []);
  pass('No API writes, no page errors, published snapshot and existing editor saves remain unchanged');
  const blocked = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await blocked.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Unavailable', 'QuotaExceededError'); }; });
  const bp = await blocked.newPage(); await bp.goto(url); await bp.locator('#study-workspace').waitFor({ state: 'visible' });
  await bp.locator('#study-side-resize').focus(); await bp.keyboard.press('ArrowLeft');
  assert.equal(await bp.locator('#study-side-resize').getAttribute('aria-valuenow'), '330');
  await blocked.close();
  pass('Resizing remains usable when browser preference storage is unavailable');
  await writeFile(out + '/results.json', JSON.stringify({ checks, url, errors, apiWrites: writes }, null, 2));
} catch (error) { await page.screenshot({ path: out + '/failure.png', fullPage: true }).catch(() => {}); throw error; }
finally { await browser.close(); }
