import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './viewer-beta-worker.js';

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, 'manifest.json'), 'utf8'));
const fallbackRequests = [];
const env = {
  SITE_USER: 'owner', SITE_PASS: 'owner-pass', GUEST_ACCOUNTS: JSON.stringify([{ user: 'guest', pass: 'guest-pass' }]),
  STAGE_BETA_ACTIVE: 'true', STUDY_ALLOW_ANONYMOUS: 'true',
  ASSETS: { fetch: async (request) => {
    fallbackRequests.push({ path: new URL(request.url).pathname, signal: request.headers.get('X-Stage-Study-Asset') });
    return new Response(`retained:${new URL(request.url).pathname}`, { headers: { 'Content-Type': 'text/plain' } });
  } },
};
const request = (pathname, { headers = {}, method = 'GET' } = {}) => new Request(`https://fixture.example${pathname}`, { method, headers });
const text = (file) => fs.readFileSync(path.join(repo, file), 'utf8');
const sha = (body) => crypto.createHash('sha256').update(body).digest('hex');

for (const entry of manifest.inputs) assert.equal(sha(text(entry.filename)), entry.sha256, entry.filename);
for (const [pathname, filename] of [['/study', 'study.html'], ['/study-frame', 'study-frame.html'], ['/stage-study-navigation.js', 'stage-study-navigation.js']]) {
  const response = await worker.fetch(request(pathname), env, {});
  assert.equal(response.status, 200, pathname);
  assert.equal(response.headers.get('X-Stage-Viewer-Release'), '20260912', pathname);
  assert.equal(await response.text(), text(filename), pathname);
}
const editor = await worker.fetch(request('/stage', { headers: { Authorization: `Basic ${Buffer.from('owner:owner-pass').toString('base64')}` } }), env, {});
assert.equal(editor.status, 200, '/stage');
assert.equal(editor.headers.get('X-Stage-Viewer-Release'), '20260912', '/stage');
assert.match(await editor.text(), /id="stage-viewer-link-open"/, '/stage includes performer-link entry');
const ownerControl = await worker.fetch(request('/stage-study-owner.js', { headers: { Authorization: `Basic ${Buffer.from('owner:owner-pass').toString('base64')}` } }), env, {});
assert.equal(ownerControl.headers.get('X-Stage-Viewer-Release'), '20260912', '/stage-study-owner.js');
assert.equal(await ownerControl.text(), text('stage-study-owner.js'));
const frameCss = await worker.fetch(request('/study-assets/style.css'), env, {});
assert.equal(await frameCss.text(), text('style.css'));
assert.equal(frameCss.headers.get('X-Stage-Viewer-Release'), '20260912');
const editorCss = await worker.fetch(request('/style.css', { headers: { Authorization: `Basic ${Buffer.from('guest:guest-pass').toString('base64')}` } }), env, {});
assert.equal(await editorCss.text(), 'retained:/style.css');
assert.deepEqual(fallbackRequests, [{ path: '/style.css', signal: null }]);
console.log(JSON.stringify({ release: manifest.release, checkedAssets: manifest.inputs.length, preservedEditorAsset: true }));
