#!/usr/bin/env node
/* AI作成マニュアル P1 — ブラウザ往復検査
 * 1. study-preview（miniflare）を起動し、stage.html?lang=ja を開く
 * 2. 見本JSONを「読み込む」→ 比較画面 → 「別のショーとして開く」
 * 3. 正規化後の project（snapshot）と元JSONの「意味」を照合（差分は一覧で出す）
 * 4. 全場面を選んでページ全体（正面図＋平面図が同居）を撮影
 * 5. 書き出し文書（snapshot＝exportDocument）を再読み込みして往復一致を確認
 * 6. 既存状態の保護: 読み込みをキャンセル／同じ project.id を2回読み込み
 * 差分・未実施は終了コード非0と一覧で示す。既存ファイルは変更しない。
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/ai-json-manual-2026-09-11/qa');
await mkdir(out, { recursive: true });
const pw = process.env.STUDY_PLAYWRIGHT || '/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js';
const loaded = await import(pathToFileURL(pw));
const { chromium } = loaded.default || loaded;
const BASE = process.env.STUDY_BASE || 'http://127.0.0.1:8796';
const AUTH = `Basic ${Buffer.from('study-owner:local-study-owner').toString('base64')}`;
const server = spawn(process.execPath, ['tools/study-preview.mjs'], {
  cwd: root, stdio: 'ignore',
  env: { ...process.env, STUDY_MINIFLARE: process.env.STUDY_MINIFLARE || '/Users/arata/.npm/_npx/32026684e21afda6/node_modules/miniflare/dist/src/index.js' },
});
async function waitServer() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(BASE + '/stage.html', { headers: { Authorization: AUTH } }); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('study-preview を起動できません（127.0.0.1:8796）');
}
/* 意味の照合対象。許す差: 自動付与id・時刻・既定フィールドの追加・pieceのpose既定(stand)・lightingIntentの既定項目 */
function semantic(doc) {
  const p = doc.project;
  return {
    title: p.title, venue: p.venue, venueSize: p.venueSize,
    cast: p.cast.map(c => ({ id: c.id, name: c.name, color: c.color, heightCm: c.heightCm ?? 165 })),
    sets: p.sets.map(s => ({ id: s.id, kind: s.kind, name: s.name, color: s.color, lightKind: s.kind === 'light' ? (s.lightKind ?? 'hang') : null })),
    scenes: p.scenes.map(s => ({
      kind: s.kind, depth: s.depth, title: s.title, note: s.kind === 'scene' ? (s.note ?? '') : '',
      role: s.beat?.role ?? null,
      intent: s.lightingIntent ? { objective: s.lightingIntent.objective ?? '', audienceFocus: s.lightingIntent.audienceFocus ?? '', mood: s.lightingIntent.mood ?? '' } : null,
      pieces: (s.pieces || []).map(x => ({
        type: x.type, castId: x.castId ?? null, setId: x.setId ?? null, color: x.color,
        pose: x.type === 'performer' ? (x.pose ?? 'stand') : null,
        u: Math.round(x.u * 1000) / 1000, v: Math.round(x.v * 1000) / 1000,
        facing: x.facing ?? 0, size: x.size ?? 100,
        /* 契約: AIは beam を書かない → 読み込み後は「真上・高さ6m・床(toH 0)」に正規化される。元JSONに beam が無い場合はその既定値を期待値にする */
        beam: x.type === 'light' ? (x.beam ? { h: x.beam.h, toH: x.beam.toH, above: Math.abs(x.beam.u - x.u) < 1e-6 && Math.abs(x.beam.v - x.v) < 1e-6 } : { h: 6, toH: 0, above: true }) : null,
      })),
    })),
  };
}
function diff(a, b, at = '$', acc = []) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) acc.push(`${at}: 件数 ${a.length} → ${b.length}`);
    a.forEach((x, i) => i < b.length && diff(x, b[i], `${at}[${i}]`, acc));
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${at}.${k}`, acc);
  } else if (JSON.stringify(a) !== JSON.stringify(b)) acc.push(`${at}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  return acc;
}
const results = [];
let failures = 0;
const record = (name, ok, detail) => { results.push({ name, ok, detail }); if (!ok) failures++; console.log(`${ok ? 'OK ' : 'NG '} ${name}${detail ? ' — ' + detail : ''}`); };

let browser;
try {
  await waitServer();
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, httpCredentials: { username: 'study-owner', password: 'local-study-owner' } });
  await ctx.setExtraHTTPHeaders({ Authorization: AUTH });
  await ctx.addInitScript(() => localStorage.setItem('shosai-stage-tour-v1', 'done'));
  const page = await ctx.newPage();
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(BASE + '/stage.html?lang=ja');
  await page.waitForFunction(() => window.SHOSAI_STAGE_STUDY_OWNER);
  const snapshot = () => page.evaluate(() => window.SHOSAI_STAGE_STUDY_OWNER.snapshot());
  const currentTitle = async () => (await snapshot()).project.title;
  const currentId = async () => (await snapshot()).project.id;

  async function importFile(file, mode) {
    await page.locator('#stage-import-json').setInputFiles(file);
    await page.locator('#stage-import-modal').waitFor({ state: 'visible', timeout: 10000 });
    if (mode === 'cancel') await page.locator('#stage-import-close').click();
    else await page.locator('#stage-import-as-new').click();
    await page.locator('#stage-import-modal').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(300);
  }

  /* AI_JSON_FILES=path1,path2 で任意のJSONを検査できる（P2の外部AI出力用）。未指定なら見本2本 */
  const targets = process.env.AI_JSON_FILES ? process.env.AI_JSON_FILES.split(',').map(f => path.resolve(root, f.trim())) : ['sample-minimal', 'sample-standard'].map(n => path.join(root, 'docs/ai-json-manual/samples', n + '.json'));
  for (const file of targets) {
    const name = path.basename(file, '.json');
    const before = JSON.parse(await readFile(file, 'utf8'));

    // 6a. キャンセルで元のショーが残る
    const titleBefore = await currentTitle();
    await importFile(file, 'cancel');
    record(`${name}: 読み込みキャンセルで現在のショーが変わらない`, (await currentTitle()) === titleBefore, `title=${titleBefore}`);

    // 2–3. 別のショーとして開く → 意味照合
    await importFile(file, 'as-new');
    const snap = await snapshot();
    const d = diff(semantic(before), semantic(snap));
    record(`${name}: 読み込み後の意味保持`, d.length === 0, d.length ? d.slice(0, 12).join(' / ') : `scenes=${snap.project.scenes.length}`);
    const firstId = snap.project.id;

    // 4. 全場面を撮影（正面図・平面図は同一画面に同居）
    const sceneIds = snap.project.scenes.filter(s => s.kind === 'scene').map(s => s.id);
    let shot = 0;
    for (const id of sceneIds) {
      const clicked = await page.evaluate(sid => { const row = document.querySelector(`[data-scene-id="${CSS.escape(sid)}"]`); const chip = row && row.querySelector('.stage-scene-chip'); if (!chip) return false; chip.click(); return true; }, id);
      /* 場面切替のアニメ（前場面の位置から動く）が終わってから撮る。200msでは前場面の位置が写る */
      await page.waitForTimeout(1500);
      const active = await page.evaluate(() => window.SHOSAI_STAGE_STUDY_OWNER.snapshot().project.activeSceneId);
      if (clicked && active === id) shot++;
      await page.screenshot({ path: path.join(out, `${name}-${id}.png`), fullPage: false });
    }
    record(`${name}: 全場面を選んで撮影`, shot === sceneIds.length, `${shot}/${sceneIds.length} 場面（qa/${name}-<sceneId>.png）`);

    // 5. 書き出し文書 → 再読み込み → 一致
    const exported = await snapshot();
    const tmp = path.join(os.tmpdir(), `${name}-roundtrip.json`);
    await writeFile(tmp, JSON.stringify(exported, null, 2));
    await importFile(tmp, 'as-new');
    const again = await snapshot();
    const d2 = diff(semantic(exported), semantic(again));
    record(`${name}: 書き出し→再読み込みの往復一致`, d2.length === 0, d2.length ? d2.slice(0, 12).join(' / ') : `version=${again.version}`);

    // 6b. 同じ project.id を2回読み込んでも別ショーになる（上書きしない）
    record(`${name}: 同じ project.id の再読み込みが別ショーになる`, again.project.id !== firstId, `${firstId} ≠ ${again.project.id}`);
  }
  record('ページエラーなし', pageErrors.length === 0, pageErrors.slice(0, 3).join(' / '));
  await ctx.close();
} catch (error) {
  record('検査の実行', false, error.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
await writeFile(path.join(out, 'browser-check-results.json'), JSON.stringify(results, null, 2));
console.log(failures ? `NG ${failures}件` : 'OK: すべて合格');
process.exitCode = failures ? 1 : 0;
