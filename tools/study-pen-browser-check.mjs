import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const imported = await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT || require.resolve('playwright')));
const { chromium } = imported.default || imported;
const base = process.env.STUDY_BASE || 'http://127.0.0.1:8796';
const output = new URL('../docs/study-links/qa/', import.meta.url);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ownerContext = await browser.newContext({ extraHTTPHeaders: { Authorization: `Basic ${Buffer.from('study-owner:local-study-owner').toString('base64')}` } });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
await context.addInitScript(() => { if (window === window.top) localStorage.setItem('shosai-stage-sketch-v1', 'existing-show-sentinel'); });
const page = await context.newPage(); const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
let token;
try {
  const document = JSON.parse(await readFile(new URL('synthetic-review-show.json', new URL('../docs/study-links/', import.meta.url)), 'utf8'));
  document.project.id = 'pen-check-' + crypto.randomUUID();
  const issued = await ownerContext.request.post(base + '/study/api/owner/shows/' + document.project.id, { data: { document } });
  assert.equal(issued.status(), 201); token = (await issued.json()).link.token;
  assert.equal((await context.request.post(base + '/study/auth/local', { data: { account: 'reader-a' }, headers: { Origin: base } })).status(), 200);
  const viewApi = base + '/study/api/view/' + token;
  const published = await (await context.request.get(viewApi)).json();
  await page.goto(base + '/study?lang=ja#' + token);
  await page.waitForFunction(() => document.querySelector('#study-status').textContent.includes('公開された'));
  const frame = page.frames().find(f => f.url().includes('study-frame'));
  async function draw(view, touch = false) {
    const target = frame.locator(`.study-pen-layer[data-pen-view="${view}"]`);
    await page.locator('#study-frame-host').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await target.scrollIntoViewIfNeeded(); let r = await target.boundingBox();
    await page.evaluate(y => window.scrollBy(0, y), r.y - 140);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    r = await target.boundingBox(); assert.ok(r.width > 0 && r.height > 0);
    const points = [[.25,.45],[.32,.42],[.42,.53],[.51,.4],[.62,.49]].map(([x,y]) => ({ x: r.x + x*r.width, y: r.y + y*r.height }));
    let cdp;
    if (touch) {
      // The sandbox renderer is an out-of-process iframe. Target that frame,
      // while Input.dispatchTouchEvent still takes top-level viewport coordinates.
      cdp = await context.newCDPSession(frame);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    }
    // Compare painting at the same viewport/resolution, after scrolling/emulation.
    await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const canvasBytes = () => frame.evaluate(() => ['stage-canvas','stage-plan-canvas'].map(id => document.getElementById(id).toDataURL()).join('|'));
    const before = await canvasBytes();
    if (touch) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
      for (const point of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else {
      await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
      for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
      await page.mouse.up();
    }
    assert.ok(await canvasBytes() === before, `${view}: stage canvases changed during drawing`);
  }
  async function clickControl(selector) {
    await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator(selector).click();
  }
  await draw('front'); assert.match(await page.locator('#study-pen-status').textContent(), /線 0本/);
  await clickControl('#study-pen');
  await draw('front'); await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 1本'));
  await draw('plan', true); await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 2本'));
  checks.push('mouse front and touch plan draw annotations without changing stage canvas');
  const paths = await frame.locator('.study-pen-line').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')));
  await clickControl('#study-next'); assert.match(await page.locator('#study-pen-status').textContent(), /線 0本/);
  await clickControl('#study-prev'); await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 2本'));
  assert.deepEqual(await frame.locator('.study-pen-line').evaluateAll(nodes => nodes.map(n => n.getAttribute('d'))), paths);
  checks.push('strokes belong to the selected scene');
  for (const lang of ['ja', 'en']) {
    await page.locator('#study-language').selectOption(lang);
    for (const [width,height] of [[390,844],[844,390],[768,1024],[1440,1000]]) {
      await page.setViewportSize({width,height}); await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const small = await page.locator('.study-pen-tools button').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().width < 44 || n.getBoundingClientRect().height < 44).map(n => n.id));
      assert.deepEqual(small, []);
      assert.deepEqual(await frame.locator('.study-pen-line').evaluateAll(nodes => nodes.map(n => n.getAttribute('d'))), paths);
      const aligns = await frame.evaluate(() => ['front','plan'].every(view => {
        const c = document.querySelector(view === 'front' ? '#stage-canvas' : '#stage-plan-canvas');
        const a = document.querySelector(`[data-pen-view="${view}"]`).getBoundingClientRect(), r = c.getBoundingClientRect();
        const scale = Math.min(r.width / c.width, r.height / c.height);
        return Math.abs(a.width - c.width*scale) < 1 && Math.abs(a.height - c.height*scale) < 1;
      })); assert.ok(aligns);
      await page.screenshot({ path: fileURLToPath(new URL(`pen-${lang}-${width}.png`, output)), fullPage: true });
    }
  }
  checks.push('Japanese and English at four sizes: no overflow, 44px controls, aligned normalized strokes');
  await page.locator('#study-language').selectOption('ja');
  await clickControl('#study-pen-undo'); await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 1本'));
  await clickControl('#study-pen-clear'); await clickControl('#study-pen-clear-no');
  assert.match(await page.locator('#study-pen-status').textContent(), /線 1本/);
  await clickControl('#study-pen-clear'); await clickControl('#study-pen-clear-yes');
  await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 0本'));
  checks.push('undo, cancel clear, and confirm clear');
  assert.equal(await page.evaluate(() => localStorage.getItem('shosai-stage-sketch-v1')), 'existing-show-sentinel');
  assert.deepEqual(await (await context.request.get(viewApi)).json(), published);
  assert.equal(await frame.evaluate(() => window.SHOSAI_STAGE_SESSION_BRIDGE === undefined), true);
  checks.push('published snapshot and existing local show remain unchanged; editor bridge stays absent');
  assert.deepEqual(errors, []);
  await writeFile(new URL('pen-result.json', output), JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  if (token) await ownerContext.request.delete(base + '/study/api/owner/links/' + token);
  await context.close(); await ownerContext.close(); await browser.close();
}
