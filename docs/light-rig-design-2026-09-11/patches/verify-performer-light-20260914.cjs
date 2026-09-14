// Run with NODE_PATH pointing to a Playwright installation. Uses a fresh browser profile only.
const { chromium, webkit } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.resolve(__dirname, '../evidence/performer-light-20260914');
const beforeDir = process.env.PERFORMER_BEFORE || '/tmp/performer-light-before-20260914';
const url = process.env.PERFORMER_URL || 'http://127.0.0.1:8796/';
(async () => {
  await fs.mkdir(out, { recursive: true });
  const report = {};
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    const browser = await type.launch({ headless: true });
    try {
      report[engine] = {};
      for (const version of ['before', 'after']) {
        const page = await browser.newPage({ viewport: { width: 1800, height: 1300 }, deviceScaleFactor: 1 });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        if (version === 'before') for (const file of ['app.js', 'stage-figure.js']) {
          const body = await fs.readFile(path.join(beforeDir, file), 'utf8');
          await page.route(`**/${file}?*`, route => route.fulfill({ body, contentType: 'text/javascript' }));
        }
        await page.goto(url); await page.waitForFunction(() => window.__RIG?.hooks);
        report[engine][version] = {};
        for (const view of ['front', 'front3d', 'shimote', 'kamite']) {
          for (const scenario of ['back', 'mixed', 'side', 'miss', 'off', 'head', 'work', 'no-people']) {
            const result = await page.evaluate(({ view, scenario }) => {
              const { state: s, E, hooks: h, SECS, secBox } = window.__RIG;
              h.stop(); s.mode = 'move'; s.dims = { W: 12, D: 8, H: 8 }; s.sel.clear();
              s.front3d = view === 'front3d'; s.dim = 100;
              s.show = { ...s.show, blackout: scenario !== 'work', pieces: true, names: false, fixtures: false, grid: false, border: false };
              const pc = { id: 'proof-person', kind: 'performer', u: 0.5, v: 0.5, hM: 1.75, facing: 0, pose: 'stand', color: '#d8cdb6', name: '確認用' };
              h.scene().pieces = scenario === 'no-people' ? [] : [pc];
              s.rig.trusses = [{ id: 'rear', v: 0.1, h: 3 }];
              s.rig.fixtures = [
                E.newFixture('rear-light', 1, { type: 'truss', trussId: 'rear', u: 0.5 }, '', 'fixed', 45),
                E.newFixture('front-light', 2, { type: 'front', u: 0.5, ahead: 4, h: 3 }, '', 'fixed', 45),
                E.newFixture('side-light', 3, { type: 'side', side: 'kamite', v: 0.5, h: 1.3 }, '', 'fixed', 45),
              ];
              const target = { u: 0.5, v: 0.5, hM: 1.3 };
              const light = (on, a = target) => E.newLightCue({ on, surface: 'air', color: '#ffffff', path: { kind: 'still', a } });
              h.cue().groups = []; h.cue().lights = {
                'rear-light': light(scenario !== 'off'),
                'front-light': light(['mixed', 'miss', 'head', 'work', 'no-people'].includes(scenario), scenario === 'miss' ? { u: 0.02, v: 0.2, hM: 7 } : target),
                'side-light': light(scenario === 'side'),
              };
              if (scenario === 'head') {
                s.rig.fixtures[1].mount.h = 1.636; s.rig.fixtures[1].beamDeg = 2;
                h.cue().lights['front-light'].path.a = { ...target, hM: 1.636 };
              }
              const saved = JSON.stringify({ rig: s.rig, scene: h.scene() });
              if (view === 'shimote' || view === 'kamite') document.querySelector(`[data-side="${view}"]`).click();
              h.renderAll(); h.draw(); h.draw();
              const sec = SECS.find(x => x.kind === (view === 'front3d' ? 'front' : view));
              const B = secBox(sec.cv, sec.kind);
              const proj = view === 'front3d' ? E.makeFrontPerspProjector(s.dims, B, s.seat) : view === 'front' ? E.makeFrontProjector(s.dims, B) : E.makeSideProjector(s.dims, B, view);
              const foot = proj({ x: 0, y: 4, z: 0 });
              const L = view === 'front3d' ? E.frontPerspSetup(s.dims, B, s.seat) : null;
              const k = (L ? L.pxPerM : B.w / (view === 'front' ? 12 : 8)) * (foot.scale || 1);
              const yaw = view === 'shimote' ? -Math.PI / 2 : view === 'kamite' ? Math.PI / 2 : 0;
              const rig = window.STAGE_FIGURE.buildRig('stand', foot.X, foot.Y, pc.hM * k, pc.hM * k * (L ? 1 + L.seat.rise * 0.5 : 1), yaw, L ? (L.bottomY - L.floorY) / 8 * pc.hM : 0, null);
              const pixel = (x, y) => [...sec.ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3).reduce((a, b) => a + b, 0);
              const head = pixel(rig.P.head.x, rig.P.head.y - 2);
              const ty = (rig.P.shL.y + rig.P.hipL.y) / 2;
              const chest = pixel(foot.X, ty);
              const width = k * 0.1;
              const body = [-0.8, -0.4, 0, 0.4, 0.8].map(n => pixel(foot.X + width * n, ty));
              const data = sec.ctx.getImageData(0, 0, sec.cv.width, sec.cv.height).data;
              let hash = 2166136261; for (const n of data) hash = Math.imul(hash ^ n, 16777619) >>> 0;
              return { head, chest, body, hash, savedUnchanged: saved === JSON.stringify({ rig: s.rig, scene: h.scene() }), canvas: sec.cv.id, png: view === 'front' && ['back', 'mixed', 'side', 'head'].includes(scenario) ? sec.cv.toDataURL() : null };
            }, { view, scenario });
            if (result.png && engine === 'chromium') await fs.writeFile(path.join(out, `${version}-${scenario}.png`), Buffer.from(result.png.split(',')[1], 'base64'));
            delete result.png;
            report[engine][version][`${view}/${scenario}`] = result;
            assert.ok(result.savedUnchanged, `${engine} ${version} ${view}/${scenario}: render changed saved data`);
          }
        }
        assert.deepEqual(errors, []); await page.close();
      }
      const b = report[engine].before, a = report[engine].after;
      for (const view of ['front', 'front3d', 'shimote', 'kamite']) {
        assert.equal(a[`${view}/no-people`].hash, b[`${view}/no-people`].hash, `${view}: lighting/background changed`);
        assert.equal(a[`${view}/work`].hash, b[`${view}/work`].hash, `${view}: worklight view changed`);
      }
      for (const view of ['front', 'front3d']) {
        assert.ok(b[`${view}/mixed`].chest < 50, 'must reproduce original bug');
        assert.ok(a[`${view}/back`].chest < 50);
        assert.ok(a[`${view}/mixed`].chest > 300);
        assert.ok(a[`${view}/mixed`].head > 300);
        assert.ok(Math.max(...a[`${view}/side`].body) > 100);
        assert.ok(a[`${view}/miss`].chest < 50);
        assert.ok(a[`${view}/off`].chest < 50);
        assert.ok(a[`${view}/head`].head > 300 && a[`${view}/head`].chest < 50);
      }
    } finally { await browser.close(); await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); }
  }
  console.log(JSON.stringify({ status: 'passed', engines: Object.keys(report), renderedCases: 128, pairedComparisons: 64, output: out }));
})().catch(e => { console.error(e); process.exitCode = 1; });
