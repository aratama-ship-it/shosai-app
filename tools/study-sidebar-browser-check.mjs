// Local integration test for the performer sidebar; uses a separate browser and show.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT || require.resolve('playwright')));
const base = process.env.STUDY_BASE || 'http://127.0.0.1:8849';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Local preview only');
const out = fileURLToPath(new URL('../docs/study-links/sidebar-qa/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const owner = await browser.newContext({ extraHTTPHeaders: { Authorization: 'Basic ' + Buffer.from('study-owner:local-study-owner').toString('base64') } });
const page = await context.newPage(), errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
const pass = value => { checks.push(value); console.log('PASS', value); };
const ready = () => page.waitForFunction(() => /公開された|Showing/.test(document.querySelector('#study-status')?.textContent));
const saved = () => page.waitForFunction(() => /この端末に保存済み|Saved on this device/.test(document.querySelector('#study-save-status')?.textContent));
try {
  await page.addInitScript(() => { if (window === window.top) { localStorage.setItem('shosai-stage-sketch-v1', 'existing-show'); localStorage.setItem('shosai-stage-shows-v1', 'existing-shelf'); } });
  const document = JSON.parse(await readFile(new URL('../docs/study-links/synthetic-review-show.json', import.meta.url), 'utf8'));
  document.project.id = 'sidebar-check-' + crypto.randomUUID();
  const issued = await owner.request.post(base + '/study/api/owner/shows/' + document.project.id, { data: { document } });
  assert.equal(issued.status(), 201, await issued.text());
  const token = (await issued.json()).link.token, url = base + '/study?lang=ja#' + token;
  await writeFile(out + '/preview-url.txt', url + '\n');
  await page.goto(url); await ready();
  const viewApi = base + '/study/api/view/' + token, ownerApi = base + '/study/api/owner/links/' + token;
  const published = await (await context.request.get(viewApi)).json();
  let posts = 0; page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/study/api/')) posts++; });
  await page.locator('#study-note').fill('入口で待つ。照明が点いたら中央へ。'); await saved();
  await page.locator('#study-pen').click();
  for (const view of ['front', 'plan']) {
    const frame = page.frames().find(f => f.url().includes('/study-frame'));
    const layer = frame.locator(`[data-pen-view="${view}"]`); await layer.scrollIntoViewIfNeeded();
    const r = await layer.boundingBox();
    await page.mouse.move(r.x + r.width * .25, r.y + r.height * .4); await page.mouse.down();
    await page.mouse.move(r.x + r.width * .6, r.y + r.height * .65, { steps: 12 }); await page.mouse.up();
  }
  await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 2本')); await saved();
  await page.locator('#study-pen-clear').click(); await page.locator('#study-pen-clear-no').click();
  assert.match(await page.locator('#study-pen-status').innerText(), /線 2本/);
  await page.locator('#study-pen-undo').click();
  await page.waitForFunction(() => document.querySelector('#study-pen-status').textContent.includes('線 1本'));
  await page.reload(); await ready();
  assert.equal(await page.locator('#study-note').inputValue(), '入口で待つ。照明が点いたら中央へ。');
  assert.match(await page.locator('#study-pen-status').innerText(), /線 1本/);
  assert.equal(posts, 0);
  pass('SVG pen draws on both diagrams; cancel clear, undo and reload preserve private notes without sharing');
  await page.locator('#study-next').click(); assert.equal(await page.locator('#study-note').inputValue(), '');
  await page.locator('#study-prev').click(); assert.match(await page.locator('#study-note').inputValue(), /入口で待つ/);
  await page.locator('#study-name').fill('演者UI確認'); await page.locator('#study-send').click();
  await page.waitForFunction(() => document.querySelector('#study-note-status').textContent.includes('共有しました'));
  const notes = (await (await owner.request.get(ownerApi + '/notes')).json()).notes;
  assert.equal(notes.length, 1); assert.equal(notes[0].name, '演者UI確認'); assert.equal(notes[0].screens.length, 2);
  assert.equal((await context.request.get(viewApi + '/notes')).status(), 404);
  pass('Sidebar scene navigation restores each note; explicit sharing sends the name, text and two drawings only to the owner');
  for (const lang of ['ja', 'en']) {
    await page.locator('#study-language').selectOption(lang);
    assert.equal(await page.locator('#study-pen').getAttribute('aria-label'), lang === 'ja' ? 'ペン' : 'Pen');
    for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [1440, 1000]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.study-side').scrollTop = 0; });
      // Let the iframe ResizeObserver and the renderer's scheduled paint settle.
      await page.frames().find(f => f.url().includes('/study-frame')).evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => {
        const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        return { stage: rect('.study-stage'), side: rect('.study-side'), memo: rect('.study-memo'),
          overflow: document.documentElement.scrollWidth > innerWidth,
          icons: [...document.querySelectorAll('[data-label]')].map(n => ({ svg: n.querySelectorAll('svg').length, label: n.getAttribute('aria-label'), title: n.title })),
          hit: [...document.querySelectorAll('button, select, input, summary')].filter(n => n.getClientRects().length).map(n => ({ id: n.id, w: n.getBoundingClientRect().width, h: n.getBoundingClientRect().height })) };
      });
      assert.equal(layout.overflow, false, `${lang} ${width}: page width`);
      if (width >= 700) { assert.ok(layout.side.x >= layout.stage.right, 'Tools beside stage'); assert.ok(layout.memo.x >= layout.stage.right, 'Notes beside stage'); }
      else assert.ok(layout.side.y >= layout.stage.bottom, 'Small screens keep usable diagram width');
      for (const icon of layout.icons) { assert.equal(icon.svg, 1); assert.ok(icon.label); assert.equal(icon.label, icon.title); }
      for (const hit of layout.hit) assert.ok(hit.w >= 43.9 && hit.h >= 43.9, `${hit.id} hit ${hit.w}×${hit.h}`);
      await page.screenshot({ path: out + `/${lang}-${width}.png`, fullPage: false });
    }
  }
  pass('JA/EN at four viewport sizes: side placement, no horizontal overflow, SVGs survive relabelling, 44px controls');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#study-view').selectOption('front');
  const ratio = await page.locator('#study-frame-host iframe').evaluate(n => { const r = n.getBoundingClientRect(); return r.width / r.height; });
  assert.ok(Math.abs(ratio - 16 / 9) < .01);
  await page.locator('#study-view').selectOption('both');
  await page.locator('#study-pen').focus(); await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => ({ visible: document.activeElement.matches(':focus-visible'), outline: getComputedStyle(document.activeElement).outlineWidth }));
  assert.equal(focus.visible, true); assert.equal(focus.outline, '2px');
  await page.locator('#study-history summary').click();
  assert.equal(await page.locator('#study-history').getAttribute('open'), '');
  assert.equal(await page.locator('#study-history summary svg').count(), 1);
  await page.locator('#study-history summary').click();
  const frame = page.frames().find(f => f.url().includes('/study-frame'));
  await frame.locator('#stage-canvas').click(); await page.keyboard.press('Backspace'); await page.keyboard.press('Meta+z');
  assert.deepEqual((await (await context.request.get(viewApi)).json()).document, published.document);
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('shosai-stage-sketch-v1'), localStorage.getItem('shosai-stage-shows-v1')]), ['existing-show', 'existing-shelf']);
  pass('Single-view proportions, keyboard focus, SVG history toggle and read-only/local-show boundaries retained');
  assert.deepEqual(errors, []);
  await writeFile(out + '/result.json', JSON.stringify({ checks, errors, url }, null, 2));
  console.log(`Browser: ${checks.length} groups passed; page errors ${errors.length}`);
} catch (error) { await page.screenshot({ path: out + '/failure.png', fullPage: true }).catch(() => {}); throw error; }
finally { await browser.close(); }
