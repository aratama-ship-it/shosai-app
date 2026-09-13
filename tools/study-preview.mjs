// Real local workerd + SQLite Durable Object, with synthetic accounts only.
// STUDY_MINIFLARE can point to an already installed miniflare module.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const require = createRequire(import.meta.url);
const modulePath = process.env.STUDY_MINIFLARE || require.resolve('miniflare');
const { Miniflare, convertV4MiniflareOptions } = await import(pathToFileURL(modulePath));
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const previewOptions = convertV4MiniflareOptions({
  name: 'study-preview',
  modules: ['worker.js', 'study-reader-auth.js', 'study-reader-account.js', 'study-reader-api.js', 'study-links.js', 'session-room.js', 'usage-metrics.js', 'usage-admin-page.js'].map(name => ({ type: 'ESModule', path: resolve(root, name) })), modulesRoot: root, compatibilityDate: '2026-08-19',
  host: '127.0.0.1', port: Number(process.env.STUDY_PORT || 8796),
  durableObjects: { STUDY_READER_AUTH: { className: 'StudyReaderAuth', useSQLite: true }, STUDY_READER_ACCOUNTS: { className: 'StudyReaderAccount', useSQLite: true }, STUDY_LINKS: { className: 'StudyLinks', useSQLite: true }, SESSION_ROOM: { className: 'SessionRoom', useSQLite: true }, USAGE_METRICS: { className: 'UsageMetrics', useSQLite: true } },
  durableObjectsPersist: process.env.STUDY_PERSIST || '/tmp/stage-study-local-sqlite',
  bindings: { STUDY_ALLOW_ANONYMOUS: process.env.STUDY_ALLOW_ANONYMOUS || 'false', STUDY_LOCAL_READER_LOGIN: 'true', SITE_USER: 'study-owner', SITE_PASS: 'local-study-owner',
    GUEST_ACCOUNTS: JSON.stringify([{ user: 'study-other', pass: 'local-study-other' }]), STAGE_USAGE_ENABLED: 'false', STAGE_BETA_ACTIVE: 'true' },
  serviceBindings: { ASSETS: async request => {
    let path;
    try { path = decodeURIComponent(new URL(request.url).pathname); } catch { return new Response('', { status: 404 }); }
    // Never include private local assets/credentials in this synthetic preview.
    if (path.includes('.local.') || path.includes('roster-key')) return new Response('', { headers: { 'Content-Type': 'text/javascript' } });
    if (path === '/') path = '/index.html';
    else if (!extname(path)) path += '.html';
    const filename = resolve(root, '.' + path);
    if (!filename.startsWith(root) || path.includes('/.') || ['.toml', '.py'].includes(extname(path))) return new Response('', { status: 404 });
    try { const body = await readFile(filename); return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': mime[extname(path)] || 'application/octet-stream' } }); }
    catch { return new Response('Not found', { status: 404 }); }
  } },
});
previewOptions.resourcePersistencePath = process.env.STUDY_PERSIST || '/tmp/stage-study-local-sqlite';
const mf = new Miniflare(previewOptions);
console.log(`Study preview: ${await mf.ready}`);
console.log('Synthetic owner: study-owner / local-study-owner');
console.log('Synthetic second owner: study-other / local-study-other');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await mf.dispose(); process.exit(0); });
