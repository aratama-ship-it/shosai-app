import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const previewDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(previewDir, '../..');
const source = relative => resolve(repoDir, relative);
const output = relative => resolve(previewDir, relative);
const read = relative => readFile(source(relative), 'utf8');
const write = (relative, value) => writeFile(output(relative), value);

await mkdir(previewDir, { recursive: true });

const copies = new Map([
  ['style.css', 'style.css'],
  ['stage-study.css', 'stage-study.css'],
  ['stage-study-sticky.js', 'stage-study-sticky.js'],
  ['stage-study-private.js', 'stage-study-private.js'],
  ['stage-study-sync.js', 'stage-study-sync.js'],
  ['stage-study-frame.js', 'stage-study-frame.js'],
  ['stage-study-pen.js', 'stage-study-pen.js'],
  ['stage-venues.js', 'stage-venues.js'],
  ['stage-venue-lines.js', 'stage-venue-lines.js'],
  ['stage-i18n.js', 'stage-i18n.js'],
  ['stage-set-model.js', 'stage-set-model.js'],
  ['stage-machinery.js', 'stage-machinery.js'],
  ['stage-sketch.js', 'stage-sketch.js'],
]);

for (const [from, to] of copies) await write(to, await read(from));

let index = await read('study.html');
const pageAssets = new Map([
  ['/study-assets/style.css', './style.css'],
  ['/stage-study.css', './stage-study.css'],
  ['/stage-study-sticky.js', './stage-study-sticky.js'],
  ['/stage-study-private.js', './stage-study-private.js'],
  ['/stage-study-sync.js', './stage-study-sync.js'],
  ['/stage-study-continuity.js', './stage-study-continuity.js'],
  ['/stage-study-viewer.js', './stage-study-viewer.js'],
]);
for (const [from, to] of pageAssets) index = index.replaceAll(from, to);
index = index
  .replace('<title>Stage Sketch Viewer</title>', '<title>Stage Sketch Viewer — 端末UI確認用</title>\n<link rel="icon" href="data:,">')
  .replace('href="/study"', 'href="./index.html"')
  .replace(
    '<script src="./stage-study-viewer.js?v=17" defer></script>',
    '<script src="./preview-adapter.js?v=1" defer></script>\n<script src="./stage-study-viewer.js?v=17" defer></script>',
  )
  .replace(
    '<span data-text="noteAllowed">自分用メモは書き込み可</span>',
    '<span data-text="noteAllowed">自分用メモは書き込み可</span><span>UI確認用・合成サンプル・送信なし</span>',
  )
  .replace(
    '<div id="study-name-field">',
    '<p class="study-muted"><strong>端末UI確認用：</strong>共有ボタンは成功表示まで確認できますが、入力内容はどこにも送信されません。</p><div id="study-name-field">',
  );
await write('index.html', index);

let frame = await read('study-frame.html');
const frameAssets = new Map([
  ['/study-assets/style.css', './style.css'],
  ['/stage-study.css', './stage-study.css'],
  ['/stage-study-sticky.js', './stage-study-sticky.js'],
  ['/stage-study-pen.js', './stage-study-pen.js'],
  ['/stage-study-frame.js', './stage-study-frame.js'],
  ['/study-assets/stage-venues.js', './stage-venues.js'],
  ['/study-assets/stage-venue-lines.js', './stage-venue-lines.js'],
  ['/study-assets/stage-i18n.js', './stage-i18n.js'],
  ['/study-assets/stage-set-model.js', './stage-set-model.js'],
  ['/study-assets/stage-machinery.js', './stage-machinery.js'],
  ['/study-assets/stage-sketch.js', './stage-sketch.js'],
]);
for (const [from, to] of frameAssets) frame = frame.replaceAll(from, to);
await write('study-frame.html', frame);

let viewer = await read('stage-study-viewer.js');
viewer = viewer
  .replaceAll("frame.src = '/study-frame.html';", "frame.src = './study-frame.html';")
  .replace(
    "sent: ['オーナーへ共有しました。自分用メモは残っています。', 'Shared with the owner. Your personal notes are kept.']",
    "sent: ['UI確認用の成功表示です。入力内容は送信されていません。', 'Preview success state only. Nothing was sent.']",
  )
  .replace(
    "private: ['現在表示している舞台図・線・図上メモを画像にして、メモ・表示名と一緒に送ります。他の閲覧者には表示されません。', 'Sends an image of the visible stage views, strokes and pinned notes, together with your note and display name. Other viewers cannot see it.']",
    "private: ['本番では舞台図・線・図上メモ・メモ・表示名をオーナーへ共有します。この端末UI確認用ページでは送信しません。', 'The live feature shares the stage views, drawings, notes and display name with the owner. This device UI preview sends nothing.']",
  );
await write('stage-study-viewer.js', viewer);

let continuity = await read('stage-study-continuity.js');
continuity = continuity.replaceAll("el.src = '/study-frame.html';", "el.src = './study-frame.html';");
await write('stage-study-continuity.js', continuity);

const sample = JSON.parse(await read('public/ai-json/samples/sample-standard.json'));
sample.project.id ||= 'device-preview-four-outlines';
sample.project.versionLabel ||= 'UI preview';
sample.project.activeSceneId ||= sample.project.scenes.find(scene => scene.kind === 'scene')?.id || '';
await write('sample.json', JSON.stringify(sample, null, 2) + '\n');

const token = 'd3e71ce41ab94ce3b610dc50d89b4704f8a693a12dc836bd';
const revision = 1;
const updatedAt = '2026-09-11T12:00:00.000Z';
const notebookId = 'b7b95eb639f67a9073f6242955446f558943ce3b93ae2ec27a60b184fda2db81';
const sceneKeys = Object.fromEntries(sample.project.scenes
  .filter(scene => scene.kind === 'scene')
  .map((scene, index) => [scene.id, createHash('sha256').update(`${scene.id}:${index}`).digest('hex')]));

const adapter = `(() => {
  'use strict';
  const TOKEN = ${JSON.stringify(token)};
  const DOCUMENT = ${JSON.stringify(sample)};
  const PAYLOAD = Object.freeze({
    updatedAt: ${JSON.stringify(updatedAt)},
    revision: ${revision},
    document: DOCUMENT,
    notebookId: ${JSON.stringify(notebookId)},
    sceneKeys: ${JSON.stringify(sceneKeys)},
    historyRevisions: [],
    changes: null,
    displayName: '',
  });
  if (location.hash !== '#' + TOKEN) history.replaceState(null, '', location.pathname + location.search + '#' + TOKEN);
  const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  }));
  const originalFetch = window.fetch.bind(window);
  window.__STAGE_SKETCH_DEVICE_PREVIEW__ = { mode: 'ui-only', sample: 'sample-standard', submissions: 0 };
  window.fetch = (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const viewBase = '/study/api/view/' + TOKEN;
    if (url.pathname === '/study/api/me') return json({ identity: null, methods: { google: false, local: false }, allowAnonymous: true });
    if (url.pathname.endsWith(viewBase) && method === 'GET') return json(PAYLOAD);
    if (url.pathname.endsWith(viewBase + '/status') && method === 'GET') return json({ revision: PAYLOAD.revision, updatedAt: PAYLOAD.updatedAt });
    if (url.pathname.endsWith(viewBase + '/notes') && method === 'POST') {
      window.__STAGE_SKETCH_DEVICE_PREVIEW__.submissions += 1;
      return json({ ok: true }, 201);
    }
    if (url.pathname === '/whoami') return json({ user: null });
    if (url.pathname.startsWith('/study/api/')) return json({ error: 'preview-only' }, 404);
    return originalFetch(input, options);
  };
})();
`;
await write('preview-adapter.js', adapter);

const generated = ['index.html', 'study-frame.html', 'stage-study-viewer.js', 'stage-study-continuity.js',
  'preview-adapter.js', 'sample.json', ...copies.values()];
const manifest = {
  kind: 'stage-sketch-device-ui-preview',
  generatedAt: new Date().toISOString(),
  mode: 'static-ui-only',
  sourceSample: 'public/ai-json/samples/sample-standard.json',
  externalSubmission: false,
  files: Object.fromEntries(await Promise.all(generated.sort().map(async relative => {
    const bytes = await readFile(output(relative));
    return [relative, { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
  }))),
};
await write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

for (const relative of ['index.html', 'study-frame.html']) {
  const html = await readFile(output(relative), 'utf8');
  if (/\b(?:src|href)="\/(?:study|stage)/.test(html)) throw new Error(`absolute preview asset path remains in ${relative}`);
}
if (!viewer.includes("frame.src = './study-frame.html';") || !continuity.includes("el.src = './study-frame.html';")) {
  throw new Error('preview iframe paths were not rewritten');
}
console.log(`Built ${generated.length} files in ${previewDir}`);
