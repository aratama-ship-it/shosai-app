import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = (await import(pathToFileURL(process.env.STUDY_PLAYWRIGHT || require.resolve('playwright')))).default;
const base = process.env.STUDY_BASE || 'http://127.0.0.1:8803';
const auth = `Basic ${Buffer.from('study-owner:local-study-owner').toString('base64')}`;
const show = JSON.parse(await readFile(new URL('../docs/study-links/synthetic-review-show.json', import.meta.url), 'utf8'));
show.project.id = `viewer-navigation-${crypto.randomUUID()}`;

const issued = await fetch(`${base}/study/api/owner/shows/${show.project.id}`, {
  method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ document: show }),
});
if (issued.status !== 201) throw new Error(`invite issue failed: ${issued.status} ${await issued.text()}`);
const token = (await issued.json()).link.token;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
const requestFailures = [], apiResponses = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => requestFailures.push(`${request.url()} ${request.failure()?.errorText}`));
page.on('response', response => { if (response.url().includes('/study/api/')) apiResponses.push(`${response.status()} ${response.url()}`); });

try {
  await page.goto(`${base}/study?lang=ja#${token}`);
  await page.waitForFunction(() => document.documentElement.classList.contains('study-phone') && !document.querySelector('#study-workspace').hidden);
  await page.waitForTimeout(300);
  if (pageErrors.length) throw new Error(`viewer page errors: ${pageErrors.join(' | ')}`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'portrait has no horizontal overflow');
  const frame = page.frameLocator('#study-frame-host iframe');
  const embedded = page.frames().find(value => value.url().includes('study-frame'));
  assert.ok(embedded, `reader iframe is attached (${page.frames().map(value => value.url()).join(', ')}; ${JSON.stringify(await page.evaluate(() => ({ hidden: document.querySelector('#study-workspace').hidden, status: document.querySelector('#study-status').textContent, title: document.querySelector('#study-title').textContent, host: document.querySelector('#study-frame-host').innerHTML })))}; API ${apiResponses.join(', ')}; failures ${requestFailures.join(', ')}; console ${consoleErrors.join(' | ')})`);
  const frameState = await embedded.evaluate(() => ({ navigation: Boolean(window.SHOSAI_STUDY_NAVIGATION), seat: Boolean(document.querySelector('#viewer-seat')), frameClass: document.body.className }));
  assert.deepEqual(frameState, { navigation: true, seat: true, frameClass: 'study-frame' }, 'renderer installs the Viewer navigation controls');
  assert.ok(await frame.locator('#viewer-seat option').count() >= 2, 'front view lists multiple audience positions');
  assert.match(await frame.locator('[data-viewer-reset="front"]').textContent(), /^100%/, 'front starts at 100%');
  await frame.locator('.study-front .viewer-viewport').evaluate(viewport => {
    const send = (type, id, x, y) => viewport.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y, button: 0 }));
    const box = viewport.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2;
    send('pointerdown', 1, x - 24, y); send('pointerdown', 2, x + 24, y);
    send('pointermove', 1, x - 84, y); send('pointermove', 2, x + 84, y);
    send('pointerup', 1, x - 84, y); send('pointerup', 2, x + 84, y);
  });
  await page.waitForTimeout(100);
  assert.ok(await frame.locator('.study-front .viewer-surface').evaluate(el => Number(el.dataset.zoom) > 1), 'two pointers enlarge the front view');
  await frame.locator('[data-viewer-reset="front"]').click();
  assert.equal(await frame.locator('.study-front .viewer-surface').evaluate(el => el.dataset.zoom), '1', 'reset returns the front view to 100%');
  const alternateSeat = await frame.locator('#viewer-seat option').evaluateAll(options => options.find(option => option.value !== 'center')?.value);
  assert.ok(alternateSeat, 'a non-central audience position is available');
  await frame.locator('#viewer-seat').selectOption(alternateSeat);
  assert.equal(await frame.locator('.study-front').getAttribute('data-alternate-seat'), 'true', 'alternate audience view changes only the presentation camera');
  assert.equal(await frame.locator('.study-front .viewer-seat-hint').isHidden(), false, 'alternate-seat note explains annotation scope');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => matchMedia('(orientation: landscape)').matches);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'landscape has no horizontal overflow');
  assert.equal(Math.round((await page.locator('.phone-tools').boundingBox()).width), 64, 'landscape keeps the 64px operation rail');
  console.log('Viewer navigation: seat selector, pinch/reset, annotation scope and landscape rail passed');
} finally {
  await fetch(`${base}/study/api/owner/links/${token}`, { method: 'DELETE', headers: { Authorization: auth } });
  await browser.close();
}
