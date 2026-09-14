#!/usr/bin/env node
/* Render the review page and import before/after JSON into isolated browser storage. */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { sha, readJson, writeReport, fingerprint, assertImportFidelity } = require('./qa_support.cjs');
writeReport('browser-checks.json', { status: 'running', startedAt: new Date().toISOString() });
process.on('uncaughtException', error => {
  writeReport('browser-checks.json', { status: 'fail', error: error.message });
  console.error(error); process.exit(1);
});
const { chromium } = require('playwright');

const HERE = __dirname;
const FULL_SHOW = path.dirname(HERE);
const REPO = path.resolve(HERE, '../../../../..');
const QA = path.join(HERE, 'qa');
const SOURCE = path.join(FULL_SHOW, 'romeo-juliet-full-show.stage-sketch.json');
const REVISED = path.join(HERE, 'romeo-juliet-full-show-ai-revised.stage-sketch.json');
const REVIEW = path.join(HERE, 'index.html');
const CORE = path.join(HERE, 'romeo-juliet.showwright.json');
const CORE_SCHEMA = path.join(HERE, 'showwright-core.schema.json');
const Q03_ID = 'rj-frame-rj-cond-01-c-01';
const M6_IDS = [
  'rj-frame-rj-cond-01-b-m6-01',
  'rj-frame-rj-cond-01-b-m6-02',
  'rj-frame-rj-cond-01-b-m6-03',
];
const EXPECTED_LIGHT = '客席右手前の二人を柔らかく照らし、バーを暖色で見せながら、残る八名にも最低限の明るさを残す。';

const exportDocument = page => page.evaluate(() => JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()));

function contentType(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const localApi = {
      '/beta-status': { betaActive: true },
      '/whoami': {},
      '/usage/config': { enabled: false, user: '' },
    };
    if (Object.hasOwn(localApi, pathname)) {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify(localApi[pathname]));
      return;
    }
    const candidate = path.resolve(REPO, '.' + pathname);
    if (!candidate.startsWith(REPO + path.sep) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found'); return;
    }
    response.writeHead(200, { 'content-type': contentType(candidate), 'cache-control': 'no-store' });
    fs.createReadStream(candidate).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function captureErrors(page, label, errors) {
  page.on('pageerror', error => errors.push(`${label}: pageerror: ${error.stack || error}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: console.error: ${message.text()}`); });
}

async function importShow(browser, baseUrl, candidate, label, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'ja-JP', acceptDownloads: true, serviceWorkers: 'block' });
  await context.addInitScript(() => { window.showSaveFilePicker = undefined; });
  const page = await context.newPage();
  captureErrors(page, label, errors);
  await page.goto(baseUrl + '/stage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.SHOSAI_STAGE_SESSION_BRIDGE));
  if (await page.locator('#stage-tour-close').isVisible()) await page.locator('#stage-tour-close').click();

  await page.locator('#stage-project-settings-open').click();
  const importLabel = page.locator('label.stage-import-label').filter({ has: page.locator('#stage-import-json') });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), importLabel.click()]);
  await chooser.setFiles(candidate);
  await page.locator('#stage-import-modal').waitFor({ state: 'visible' });
  const summary = await page.locator('#stage-import-summary').innerText();
  const expected = readJson(candidate).project;
  assert.ok(summary.includes(expected.title));
  await page.locator('#stage-import-as-new').click();
  await page.waitForFunction(title => JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.title === title, expected.title);
  for (const selector of ['#stage-import-close', '#stage-project-settings-close']) {
    if (await page.locator(selector).isVisible()) await page.locator(selector).click();
  }

  await page.locator('#stage-view-select').selectOption('plan');
  const row = page.locator(`[data-scene-id="${Q03_ID}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.locator('.stage-scene-chip').click();
  await page.evaluate(() => window.SHOSAI_STAGE_SESSION_BRIDGE.finishSceneTransition());
  await page.waitForTimeout(250);
  const lightSummary = await row.locator('.stage-scene-light-summary').innerText();
  await row.screenshot({ path: path.join(QA, `${label}-q03-light-row.png`) });
  await page.locator('#stage-plan-cell').screenshot({ path: path.join(QA, `${label}-q03-stage.png`) });
  const navigatedSceneIds = [];
  let canvasRenderChecks = 0;
  for (const scene of expected.scenes.filter(scene => scene.kind === 'scene')) {
    await page.locator(`[data-scene-id="${scene.id}"] .stage-scene-chip`).click();
    await page.evaluate(() => window.SHOSAI_STAGE_SESSION_BRIDGE.finishSceneTransition());
    const active = await page.evaluate(() =>
      JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.activeSceneId);
    assert.equal(active, scene.id, 'scene navigation');
    const canvasReady = await page.locator('#stage-plan-canvas').evaluate(canvas =>
      canvas.width > 0 && canvas.height > 0 &&
      getComputedStyle(canvas).display !== 'none' && canvas.toDataURL().length > 1000);
    assert.equal(canvasReady, true, 'plan canvas render sentinel');
    canvasRenderChecks++;
    navigatedSceneIds.push(active);
  }
  const exported = await exportDocument(page);
  const fidelity = assertImportFidelity(readJson(candidate), exported);
  const importedId = exported.project.id;
  assert.notEqual(importedId, expected.id, 'Open as another show must assign a separate project id');
  await context.close();
  return { importSummary: summary, sourceProjectId: expected.id, importedProjectId: importedId, lightSummary, document: exported, fidelity, navigatedSceneIds, canvasRenderChecks };
}

(async () => {
  fs.mkdirSync(QA, { recursive: true });
  const errors = [];
  const checks = [];
  const productAtStart = fingerprint();
  const inputAtStart = Object.fromEntries([SOURCE, REVISED, REVIEW, CORE, CORE_SCHEMA].map(file => [path.relative(REPO, file), sha(file)]));
  const server = await startServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const reviewPath = '/' + path.relative(REPO, REVIEW).split(path.sep).join('/');
  let browser;
  try {
    browser = await chromium.launch();
    const before = await importShow(browser, baseUrl, SOURCE, 'before', errors);
    const after = await importShow(browser, baseUrl, REVISED, 'after', errors);

    assert.ok(before.lightSummary.startsWith('群れの中で、二人だけが同じ速度になる。'));
    assert.ok(after.lightSummary.startsWith(EXPECTED_LIGHT));
    assert.equal(after.lightSummary.startsWith('群れの中で、二人だけが同じ速度になる。'), false);
    const actual = after.document.project;
    const scenes = actual.scenes.filter(scene => scene.kind === 'scene');
    assert.equal(scenes.length, 31);
    assert.equal(actual.cast.length, 10);
    assert.equal(actual.sets.length, 12);
    assert.equal(actual.sets.some(item => item.id === 'rj-set-bar-shelf'), false);
    const q03 = scenes.find(scene => scene.id === Q03_ID);
    const bar = q03.pieces.find(piece => piece.setId === 'rj-set-bar');
    assert.equal(bar.type, 'prop');
    assert.equal(bar.propShape, 'counter');
    assert.deepEqual(bar.dims, { w: 2.4, d: 0.6, h: 1.1 });
    assert.equal(q03.lightingIntent.objective, EXPECTED_LIGHT);
    assert.ok(M6_IDS.every(id => scenes.find(scene => scene.id === id).blackout));
    checks.push('元版と改訂版を各々の隔離ブラウザストレージへ「別のショーとして開く」で読み込み');
    checks.push('Q03の平面図とLIGHT行をbefore/after画像として実表示から取得');
    checks.push('改訂版のUI往復後も31シーン・10演者・12セット・バーprop/counter・M6技術図3枚を保持');

    const reviewContext = await browser.newContext({ locale: 'ja-JP', acceptDownloads: true });
    const reviewPage = await reviewContext.newPage();
    captureErrors(reviewPage, 'review', errors);
    const viewportResults = [];
    let reviewLinksChecked = 0;
    let reviewImagesChecked = 0;
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      await reviewPage.setViewportSize({ width, height });
      await reviewPage.goto(baseUrl + reviewPath, { waitUntil: 'networkidle' });
      await reviewPage.waitForSelector('a[download]');
      const brokenImages = await reviewPage.locator('img').evaluateAll(nodes =>
        nodes.filter(node => !node.complete || node.naturalWidth === 0).map(node => node.src));
      assert.deepEqual(brokenImages, [], 'review images must load');
      reviewImagesChecked = await reviewPage.locator('img').count();
      if (!reviewLinksChecked) {
        const links = await reviewPage.locator('a[href]').evaluateAll(nodes => [...new Set(nodes.map(node => node.href))]);
        for (const url of links) {
          assert.equal(new URL(url).origin, baseUrl, 'review links must stay local');
          const response = await reviewPage.request.get(url);
          assert.equal(response.ok(), true, 'broken review link: ' + url);
          await response.dispose();
        }
        reviewLinksChecked = links.length;
      }
      const overflow = await reviewPage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      const overflowElements = overflow ? await reviewPage.evaluate(() => [...document.querySelectorAll('body *')].map(node => ({ tag: node.tagName, className: node.className, id: node.id, left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width })).filter(box => box.right > innerWidth + 0.5 || box.left < -0.5).slice(0, 12)) : [];
      const heights = await reviewPage.locator('a[download]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      const minActionHeight = Math.min(...heights);
      assert.equal(overflow, 0, `${width}px overflow elements: ${JSON.stringify(overflowElements)}`);
      assert.ok(minActionHeight >= 44);
      await reviewPage.screenshot({ path: path.join(QA, `review-${width}.png`), fullPage: true });
      viewportResults.push({ width, height, horizontalOverflowPx: overflow, minActionHeightPx: Number(minActionHeight.toFixed(2)) });
    }

    const downloadPromise = reviewPage.waitForEvent('download');
    await reviewPage.locator('a[download]').first().click();
    const download = await downloadPromise;
    const downloaded = readJson(await download.path());
    assert.equal(sha(await download.path()), sha(REVISED), 'download bytes must equal the revised JSON');
    const downloadedBar = downloaded.project.sets.find(item => item.id === 'rj-set-bar');
    assert.equal(downloadedBar.kind, 'prop');
    assert.equal(downloadedBar.propShape, 'counter');
    assert.equal(downloaded.project.sets.some(item => item.id === 'rj-set-bar-shelf'), false);
    checks.push('判断HTMLから修正済みJSONを保存し、バーがprop/counter、旧背面棚なしであることを確認');
    checks.push('判断HTMLは1440pxと390pxで横はみ出し0、主要操作44px以上');
    await reviewContext.close();

    assert.deepEqual(errors, []);
    assert.deepEqual(fingerprint(), productAtStart, 'product files changed during browser checks');
    for (const [file, hash] of Object.entries(inputAtStart)) assert.equal(sha(path.join(REPO, file)), hash, file + ' changed during checks');
    const screenshotNames = ['before-q03-stage.png', 'after-q03-stage.png', 'before-q03-light-row.png', 'after-q03-light-row.png', 'review-1440.png', 'review-390.png'];
    const screenshots = Object.fromEntries(screenshotNames.map(name => [name, { sha256: sha(path.join(QA, name)), bytes: fs.statSync(path.join(QA, name)).size }]));
    const report = {
      status: 'pass', baseUrl, revisedSha256: sha(REVISED), isolatedBrowserStorage: true, userBrowserStorageModified: false,
      checkedAt: new Date().toISOString(), productFiles: productAtStart, inputFiles: inputAtStart,
      importFidelity: { before: before.fidelity, after: after.fidelity },
      navigatedScenes: { before: before.navigatedSceneIds.length, after: after.navigatedSceneIds.length },
      canvasRenderChecks: { before: before.canvasRenderChecks, after: after.canvasRenderChecks },
      serviceWorkersBlocked: true,
      localApiMocks: { '/beta-status': 'betaActive=true', '/whoami': 'anonymous empty object', '/usage/config': 'metrics disabled' },
      importMode: '別のショーとして開く',
      beforeProjectIdChanged: before.sourceProjectId !== before.importedProjectId,
      afterProjectIdChanged: after.sourceProjectId !== after.importedProjectId,
      stageViewsChecked: 2, viewports: viewportResults,
      reviewLinksChecked, reviewImagesChecked,
      horizontalOverflowPxMax: Math.max(...viewportResults.map(item => item.horizontalOverflowPx)),
      pageAndConsoleErrors: errors, pageAndConsoleErrorCount: errors.length, screenshots, checks,
    };
    fs.writeFileSync(path.join(QA, 'browser-checks.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  writeReport('browser-checks.json', { status: 'fail', checkedAt: new Date().toISOString(), error: error.message });
  console.error(error); process.exitCode = 1;
});
