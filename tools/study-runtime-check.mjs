import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = await import(pathToFileURL(process.env.STUDY_MINIFLARE || require.resolve('miniflare')));
const root = fileURLToPath(new URL('../', import.meta.url));
const persistence = await mkdtemp('/tmp/stage-study-runtime-');
const options = auth => ({ ...convertV4MiniflareOptions({
  name: 'study-runtime',
  modules: ['worker.js', 'study-reader-auth.js', 'study-reader-account.js', 'study-reader-api.js', 'study-links.js', 'session-room.js', 'usage-metrics.js', 'usage-admin-page.js'].map(name => ({ type: 'ESModule', path: resolve(root, name) })), modulesRoot: root,
  compatibilityDate: '2026-08-19', host: '127.0.0.1', port: 8797,
  durableObjects: { STUDY_LINKS: { className: 'StudyLinks', useSQLite: true }, SESSION_ROOM: { className: 'SessionRoom', useSQLite: true }, USAGE_METRICS: { className: 'UsageMetrics', useSQLite: true } },
  durableObjectsPersist: persistence, bindings: auth ? { SITE_USER: 'alice', SITE_PASS: 'fake-alice', GUEST_ACCOUNTS: JSON.stringify([{ user: 'bob', pass: 'fake-bob' }]) } : {},
  serviceBindings: { ASSETS: async () => new Response('synthetic asset') },
}), resourcePersistencePath: persistence });
let mf; let checks = 0;
const check = (label, fn) => { fn(); checks++; console.log('PASS', label); };
try {
  mf = new Miniflare(options(true)); await mf.ready;
  const call = (path, user, method = 'GET', body) => mf.dispatchFetch('http://127.0.0.1:8797' + path, { method,
    headers: { ...((user || (path.startsWith('/study/api/view/') ? 'bob' : '')) ? { Authorization: `Basic ${btoa(`${user || 'bob'}:fake-${user || 'bob'}`)}` } : {}), Origin: 'http://127.0.0.1:8797', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const document = { kind: 'shosai-stage-sketch', version: 4, project: { id: 'runtime', title: 'SQLite rehearsal', scenes: [0, 1, 2].map(i => ({ kind: 'scene', id: 'scene-' + i, title: 'Scene ' + i, note: 'あ'.repeat(35000), pieces: [], strokes: [], arrows: [] })) }, venues: [] };
  let response = await call('/study/api/owner/shows/runtime', 'alice', 'POST', { document }); check('actual SQLite create', () => assert.equal(response.status, 201));
  const token = (await response.json()).link.token;
  const viewPath = `/study/api/view/${token}`; const ownerPath = `/study/api/owner/links/${token}`;
  const read = await (await call(viewPath)).json(); check('chunked Japanese snapshot roundtrip', () => assert.deepEqual(read.document, document));
  for (const [path, method, body] of [[ownerPath + '/notes', 'GET'], [ownerPath, 'PUT', { document }], [ownerPath, 'DELETE']]) {
    response = await call(path, 'bob', method, body); check(`other owner ${method} denied`, () => assert.equal(response.status, 404));
  }
  response = await call(viewPath + '/notes', null, 'POST', { name: 'A', text: '<script>alert(1)</script>', revision: 1, sceneId: 'scene-1' }); check('authenticated reader note accepted', () => assert.equal(response.status, 201));
  document.project.title = 'Updated'; response = await call(ownerPath, 'alice', 'PUT', { document }); check('explicit update', () => assert.equal(response.status, 200));
  await mf.dispose(); mf = new Miniflare(options(true)); await mf.ready;
  let restored = await (await call(viewPath)).json(); check('snapshot survives process restart', () => assert.equal(restored.document.project.title, 'Updated'));
  const historical = await call(viewPath + '/revisions/1'); check('earlier drawing survives SQLite restart', () => assert.equal(historical.status, 200));
  const historicalBody = await historical.json(); check('earlier drawing is unchanged', () => { assert.equal(historicalBody.document.project.title, 'SQLite rehearsal'); assert.equal(historicalBody.document.project.scenes[0].note.length, 35000); });
  let notes = await (await call(ownerPath + '/notes', 'alice')).json(); check('old notes survive update and restart', () => { assert.equal(notes.notes.length, 1); assert.equal(notes.notes[0].revision, 1); assert.equal(notes.notes[0].sceneTitle, 'Scene 1'); });
  response = await call(viewPath + '/notes'); check('other recipients cannot list notes', () => assert.equal(response.status, 404));
  response = await call(ownerPath, 'alice', 'DELETE'); check('revoke', () => assert.equal(response.status, 200));
  response = await call(viewPath + '/revisions/1'); check('historical drawing denied after revoke', () => assert.equal(response.status, 404));
  response = await call(viewPath); check('view denied after revoke', () => assert.equal(response.status, 404));
  response = await call(viewPath + '/notes', null, 'POST', { name: 'A', text: 'blocked', sceneId: 'scene-0', revision: 2 }); check('post denied after revoke', () => assert.equal(response.status, 404));
  notes = await (await call(ownerPath + '/notes', 'alice')).json(); check('owner retains notes after revoke', () => assert.equal(notes.notes.length, 1));
  response = await call('/study/api/owner/shows/runtime', 'alice', 'POST', { document }); check('reissue after revoke', () => assert.equal(response.status, 201));
  const replacement = await response.json(); const replacementToken = replacement.link.token;
  check('reissue rotates token', () => { assert.equal(replacement.reissued, true); assert.notEqual(replacementToken, token); });
  response = await call(ownerPath + '/notes', 'alice'); check('reissue deletes old owner record', () => assert.equal(response.status, 404));
  const replacementOwner = `/study/api/owner/links/${replacementToken}`; const replacementView = `/study/api/view/${replacementToken}`;
  notes = await (await call(replacementOwner + '/notes', 'alice')).json(); check('reissue starts without old notes', () => assert.deepEqual(notes.notes, []));
  response = await call(replacementView + '/notes', null, 'POST', { name: 'B', text: 'new note', revision: 1, sceneId: 'scene-1' }); check('new token accepts notes', () => assert.equal(response.status, 201));
  response = await call(replacementOwner + '/notes', 'alice', 'DELETE'); check('owner clears notes', () => assert.equal(response.status, 200));
  notes = await (await call(replacementOwner + '/notes', 'alice')).json(); check('cleared note list stays empty', () => assert.deepEqual(notes.notes, []));
  response = await call(replacementView + '/notes', null, 'POST', { name: 'B', text: 'after clear', revision: 1, sceneId: 'scene-1' }); check('posting resumes after clear', () => assert.equal(response.status, 201));
  response = await call('/study/api/owner/shows/runtime', 'alice', 'DELETE'); check('active saved data cannot be purged', () => assert.equal(response.status, 409));
  await call(replacementOwner, 'alice', 'DELETE');
  response = await call('/study/api/owner/shows/runtime', 'alice', 'DELETE'); check('revoked saved data can be purged', () => assert.equal(response.status, 200));
  response = await call(replacementView); check('purged token remains unavailable', () => assert.equal(response.status, 404));
  await mf.dispose(); mf = new Miniflare(options(false)); await mf.ready;
  // Existing realtime integration script, unchanged except for this dedicated local port.
  let realtime = await readFile(resolve(root, 'tests/session-room.test.mjs'), 'utf8');
  realtime = realtime.replace('http://localhost:8788', 'http://127.0.0.1:8797');
  await import('data:text/javascript;base64,' + Buffer.from(realtime).toString('base64'));
  console.log(`Study SQLite runtime: ${checks}/${checks} passed. Existing realtime integration was run unchanged except for its port.`);
} finally { if (mf) await mf.dispose(); }
