import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../worker.js';
import { StudyLinks, STUDY_LIMITS, STUDY_PUBLIC_ASSETS, studyPrincipal } from '../study-links.js';

const origin = 'https://study.example';
const doc = (showId = 'show-test') => ({ kind: 'shosai-stage-sketch', version: 4, project: { id: showId, title: '稽古 / Rehearsal',
  scenes: [{ kind: 'scene', id: 'scene-one', title: '入口', pieces: [], strokes: [], arrows: [] },
    { kind: 'section', id: 'section-one', title: '後半' }, { kind: 'scene', id: 'scene-two', title: 'Finale', pieces: [], strokes: [], arrows: [] }] }, venues: [] });
function setup() {
  const saved = new Map();
  const storage = { get: async k => structuredClone(saved.get(k)), put: async (k, v) => saved.set(k, structuredClone(v)), delete: async k => saved.delete(k),
    list: async ({ prefix = '' } = {}) => new Map([...saved].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, structuredClone(value)])) };
  let queue = Promise.resolve(); storage.transaction = callback => {
    const pending = queue.then(() => callback(storage)); queue = pending.catch(() => {}); return pending;
  };
  const state = { storage }; let object = new StudyLinks(state);
  const env = { SITE_USER: 'alice', SITE_PASS: 'fake-alice', GUEST_ACCOUNTS: JSON.stringify([{ user: 'bob', pass: 'fake-bob' }]),
    ASSETS: { fetch: async request => new Response(new URL(request.url).pathname, { headers: { 'Content-Type': 'text/html' } }) },
    STUDY_LINKS: { idFromName: x => x, get: () => ({ fetch: request => object.fetch(request) }) } };
  const call = async (path, { user, method = 'GET', body, headers = {}, raw } = {}) => {
    if (user === undefined && path.startsWith('/study/api/view/')) user = 'bob';
    headers = { Origin: origin, ...headers };
    if (user) headers = { Authorization: `Basic ${btoa(`${user}:fake-${user}`)}`, ...headers };
    if (body !== undefined || raw !== undefined) headers = { 'Content-Type': 'application/json', ...headers };
    return worker.fetch(new Request(origin + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) }), env, {});
  };
  const issue = async (showId = 'show-test', user = 'alice') => { const response = await call(`/study/api/owner/shows/${showId}`, { user, method: 'POST', body: { document: doc(showId) } }); assert.equal(response.status, 201); return (await response.json()).link; };
  return { call, issue, saved, env, restart: () => { object = new StudyLinks(state); } };
}
test('発行時の全場面を凍結し明示更新でだけ同じリンクを変更する', async () => {
  const s = setup(); const original = doc(); const before = JSON.stringify(original);
  const link = await s.issue(); assert.match(link.token, /^[a-f0-9]{48}$/);
  assert.equal(JSON.stringify(original), before);
  original.project.scenes[0].title = '作業中';
  const path = `/study/api/view/${link.token}`;
  const published = await (await s.call(path)).json(); assert.equal(published.document.project.scenes.length, 3); assert.equal(published.document.project.scenes[0].title, '入口');
  const updated = await s.call(`/study/api/owner/links/${link.token}`, { user: 'alice', method: 'PUT', body: { document: original } });
  assert.equal(updated.status, 200); assert.equal((await updated.json()).link.token, link.token);
  assert.equal((await (await s.call(path)).json()).document.project.scenes[0].title, '作業中');
  s.restart(); assert.equal((await (await s.call(path)).json()).revision, 2, '再起動後も永続スナップショット');
});
test('閲覧トークンは編集・メモ一覧・所有者の代理操作を許可しない', async () => {
  const s = setup(); const { token } = await s.issue();
  for (const user of [undefined, 'bob']) for (const suffix of ['', '/notes']) for (const method of ['GET', 'PUT', 'DELETE']) {
    const res = await s.call(`/study/api/owner/links/${token}${suffix}`, { user, method, body: method === 'PUT' ? { document: doc() } : undefined,
      headers: { 'X-Study-Owner': 'account:alice', 'X-Shosai-Session-Owner': 'alice' } });
    assert.ok([401, 404].includes(res.status), `${user} ${method} ${suffix}`);
  }
  for (const method of ['PUT', 'DELETE', 'PATCH', 'POST']) assert.equal((await s.call(`/study/api/view/${token}`, { method, body: { document: doc() } })).status, 404);
  assert.equal((await s.call(`/study/api/view/${token}/notes`)).status, 404);
  assert.deepEqual(await (await s.call('/study/api/owner/shows/show-test', { user: 'bob' })).json(), { link: null });
});
test('メモは対象場面・時刻・投稿者とともにオーナーだけへ返し更新後も保持', async () => {
  const s = setup(); const { token } = await s.issue();
  const text = '<img src=x onerror=alert(1)> & <script>bad()</script>\n舞台奥';
  const body = { name: '演者A', sceneId: 'scene-two', text, revision: 1 };
  assert.equal((await s.call(`/study/api/view/${token}/notes`, { method: 'POST', body })).status, 201);
  assert.equal((await s.call(`/study/api/view/${token}/notes`, { method: 'POST', user: 'bob', body: { ...body, name: '偽装Alice' } })).status, 201);
  let notes = (await (await s.call(`/study/api/owner/links/${token}/notes`, { user: 'alice' })).json()).notes;
  assert.equal(notes[0].name, 'bob'); assert.equal(notes[1].name, 'bob'); assert.equal(notes[1].text, text); assert.equal(notes[1].sceneTitle, 'Finale'); assert.ok(Date.parse(notes[1].createdAt));
  await s.call(`/study/api/owner/links/${token}`, { method: 'PUT', user: 'alice', body: { document: doc() } });
  assert.equal((await (await s.call(`/study/api/owner/links/${token}/notes`, { user: 'alice' })).json()).notes.length, 2);
  const viewer = await (await s.call(`/study/api/view/${token}`)).json();
  assert.equal(viewer.notes, undefined); assert.equal(viewer.owner, undefined); assert.equal(viewer.noteCount, undefined);
  assert.equal((await s.call(`/study/api/view/${token}/notes`, { method: 'POST', body })).status, 400, '古い場面版への誤投稿を防ぐ');
});
test('無効化・未知・不正トークンは同じ応答で、既存閲覧者の再取得・投稿を止める', async () => {
  const s = setup(); const { token } = await s.issue();
  await s.call(`/study/api/owner/links/${token}`, { user: 'alice', method: 'DELETE' });
  for (const id of [token, '0'.repeat(48), 'short', '../unknown', 'a'.repeat(200), '%00']) {
    const result = await s.call(`/study/api/view/${id}`);
    assert.equal(result.status, 404); assert.deepEqual(await result.json(), { error: 'link-unavailable' });
  }
  for (let i = 0; i < 64; i++) assert.equal((await s.call(`/study/api/view/${i.toString(16).padStart(48, '0')}`)).status, 404);
  assert.equal((await s.call(`/study/api/view/${token}/status`)).status, 404);
  assert.equal((await s.call(`/study/api/view/${token}/notes`, { method: 'POST', body: { name: 'A', text: 'Hello', sceneId: 'scene-one', revision: 1 } })).status, 404);
});
test('発行上限はオーナーごとに10ショーで、別オーナーの発行枠を消費しない', async () => {
  const s = setup();
  for (let i = 0; i < STUDY_LIMITS.linksPerOwner; i++) await s.issue(`show-${i}`);
  let response = await s.call('/study/api/owner/shows/show-over-limit', { user: 'alice', method: 'POST', body: { document: doc('show-over-limit') } });
  assert.equal(response.status, 409); assert.deepEqual(await response.json(), { error: 'owner-limit' });
  response = await s.call('/study/api/owner/shows/show-bob', { user: 'bob', method: 'POST', body: { document: doc('show-bob') } });
  assert.equal(response.status, 201);
  assert.equal(s.saved.get('ownerCount:account:alice'), STUDY_LIMITS.linksPerOwner);
  assert.equal(s.saved.get('ownerCount:account:bob'), 1);
  assert.equal(s.saved.get('linkCount'), STUDY_LIMITS.linksPerOwner + 1);
});
test('オーナーは自分の保存済みリンクだけを一覧し、無効化後に任意のショーを削除できる', async () => {
  const s = setup(); const first = await s.issue('show-first'), second = await s.issue('show-second');
  let response = await s.call('/study/api/owner/links', { user: 'alice' });
  assert.equal(response.status, 200);
  const listed = (await response.json()).links;
  assert.deepEqual(listed.map(link => link.showId).sort(), ['show-first', 'show-second']);
  assert.ok(listed.every(link => link.owner === undefined && link.token && link.title));
  assert.equal((await s.call('/study/api/owner/links', { user: 'bob' })).status, 200);
  assert.deepEqual((await (await s.call('/study/api/owner/links', { user: 'bob' })).json()).links, []);
  assert.equal((await s.call('/study/api/owner/links', { user: 'charlie' })).status, 401);
  assert.equal((await s.call(`/study/api/owner/links/${first.token}/purge`, { user: 'alice', method: 'DELETE' })).status, 409);
  assert.equal((await s.call(`/study/api/owner/links/${first.token}`, { user: 'alice', method: 'DELETE' })).status, 200);
  assert.equal((await s.call(`/study/api/owner/links/${first.token}/purge`, { user: 'bob', method: 'DELETE' })).status, 404);
  response = await s.call(`/study/api/owner/links/${first.token}/purge`, { user: 'alice', method: 'DELETE' });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  assert.equal(s.saved.get('ownerCount:account:alice'), 1);
  assert.equal(s.saved.get('linkCount'), 1);
  assert.deepEqual((await (await s.call('/study/api/owner/links', { user: 'alice' })).json()).links.map(link => link.token), [second.token]);
  assert.equal((await s.call(`/study/api/view/${first.token}`)).status, 404);
  await s.issue('show-third');
});
test('全体1000件の緊急上限はオーナー枠に余裕があっても発行を止める', async () => {
  const s = setup(); s.saved.set('linkCount', STUDY_LIMITS.links);
  const response = await s.call('/study/api/owner/shows/global-full', { user: 'alice', method: 'POST', body: { document: doc('global-full') } });
  assert.equal(response.status, 409); assert.deepEqual(await response.json(), { error: 'storage-limit' });
});
test('旧owner indexから件数を復元し、区切り文字を含む別ownerを数えない', async () => {
  const own = setup();
  for (let i = 0; i < STUDY_LIMITS.linksPerOwner; i++) {
    const token = i.toString(16).padStart(48, '0');
    own.saved.set(`owner:account:alice:legacy-${i}`, token);
    own.saved.set(`link:${token}`, { token, owner: 'account:alice', showId: `legacy-${i}` });
  }
  own.saved.set('linkCount', STUDY_LIMITS.linksPerOwner);
  let response = await own.call('/study/api/owner/shows/legacy-over-limit', { user: 'alice', method: 'POST', body: { document: doc('legacy-over-limit') } });
  assert.equal(response.status, 409); assert.deepEqual(await response.json(), { error: 'owner-limit' });

  const overlap = setup();
  for (let i = 0; i < STUDY_LIMITS.linksPerOwner; i++) {
    const token = (i + 100).toString(16).padStart(48, '0');
    overlap.saved.set(`owner:account:alice:child:legacy-${i}`, token);
    overlap.saved.set(`link:${token}`, { token, owner: 'account:alice:child', showId: `legacy-${i}` });
  }
  overlap.saved.set('linkCount', STUDY_LIMITS.linksPerOwner);
  response = await overlap.call('/study/api/owner/shows/alice-first', { user: 'alice', method: 'POST', body: { document: doc('alice-first') } });
  assert.equal(response.status, 201);
  assert.equal(overlap.saved.get('ownerCount:account:alice'), 1);
  assert.ok(overlap.saved.has('owner-v2:account%3Aalice:alice-first'));
});
test('無効化後の再発行は新しいtokenへ交換し、古い公開内容とメモを回収する', async () => {
  const s = setup(); const old = await s.issue();
  const note = { name: 'A', text: 'old memo', sceneId: 'scene-one', revision: 1 };
  assert.equal((await s.call(`/study/api/view/${old.token}/notes`, { method: 'POST', body: note })).status, 201);
  assert.equal((await s.call(`/study/api/owner/links/${old.token}`, { user: 'alice', method: 'DELETE' })).status, 200);
  const replacement = doc(); replacement.project.title = '再発行版';
  const response = await s.call('/study/api/owner/shows/show-test', { user: 'alice', method: 'POST', body: { document: replacement } });
  assert.equal(response.status, 201); const result = await response.json();
  assert.equal(result.reissued, true); assert.notEqual(result.link.token, old.token);
  assert.equal((await s.call(`/study/api/view/${old.token}`)).status, 404);
  assert.equal((await s.call(`/study/api/owner/links/${old.token}/notes`, { user: 'alice' })).status, 404);
  assert.equal((await (await s.call(`/study/api/view/${result.link.token}`)).json()).document.project.title, '再発行版');
  assert.deepEqual((await (await s.call(`/study/api/owner/links/${result.link.token}/notes`, { user: 'alice' })).json()).notes, []);
  assert.equal(s.saved.get('linkCount'), 1); assert.equal(s.saved.get('ownerCount:account:alice'), 1);
  assert.equal([...s.saved.keys()].some(key => key.includes(old.token)), false);
});
test('オーナーだけがメモを全削除でき、連番と保存件数を分けて再投稿できる', async () => {
  const s = setup(); const { token } = await s.issue(); const path = `/study/api/view/${token}/notes`;
  const note = { name: 'A', text: 'memo', sceneId: 'scene-one', revision: 1 };
  assert.equal((await s.call(path, { method: 'POST', body: note })).status, 201);
  assert.equal((await s.call(`/study/api/owner/links/${token}/notes`, { user: 'bob', method: 'DELETE' })).status, 404);
  assert.equal((await s.call(`/study/api/owner/links/${token}/notes`, { method: 'DELETE' })).status, 401);
  let response = await s.call(`/study/api/owner/links/${token}/notes`, { user: 'alice', method: 'DELETE' });
  assert.equal(response.status, 200); assert.equal((await response.json()).link.noteCount, 0);
  assert.deepEqual((await (await s.call(`/study/api/owner/links/${token}/notes`, { user: 'alice' })).json()).notes, []);
  assert.equal((await s.call(path, { method: 'POST', body: { ...note, text: 'new memo' } })).status, 201);
  const record = s.saved.get(`link:${token}`);
  assert.equal(record.noteCount, 1); assert.equal(record.nextNoteSeq, 2); assert.deepEqual(record.noteKeys, [2]);
  assert.equal(s.saved.has(`note:${token}:1`), false); assert.equal(s.saved.get(`note:${token}:2`).text, 'new memo');
});
test('失効済み保存データの削除だけが発行枠を戻し、旧tokenを残さない', async () => {
  const s = setup(); const old = await s.issue();
  let response = await s.call('/study/api/owner/shows/show-test', { user: 'alice', method: 'DELETE' });
  assert.equal(response.status, 409); assert.deepEqual(await response.json(), { error: 'revoke-required' });
  await s.call(`/study/api/owner/links/${old.token}`, { user: 'alice', method: 'DELETE' });
  assert.equal((await s.call('/study/api/owner/shows/show-test', { user: 'bob', method: 'DELETE' })).status, 404);
  response = await s.call('/study/api/owner/shows/show-test', { user: 'alice', method: 'DELETE' });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  assert.equal(s.saved.get('linkCount'), 0); assert.equal(s.saved.get('ownerCount:account:alice'), 0);
  assert.equal((await s.call(`/study/api/view/${old.token}`)).status, 404);
  const next = await s.issue(); assert.notEqual(next.token, old.token);
});
test('メモの型・文字数・リクエスト量・場面・連投・保存上限をサーバーで検証する', async () => {
  const s = setup(); const { token } = await s.issue(); const path = `/study/api/view/${token}/notes`;
  const valid = { name: 'A', text: 'Hello', sceneId: 'scene-one', revision: 1 };
  for (const body of [null, [], { ...valid, text: {} }, { ...valid, text: 'x'.repeat(2001) }, { ...valid, sceneId: 'section-one' }, { ...valid, revision: '1' }]) assert.equal((await s.call(path, { method: 'POST', body })).status, 400);
  assert.equal((await s.call(path, { method: 'POST', raw: 'x'.repeat(STUDY_LIMITS.noteBytes + 1) })).status, 413);
  assert.equal((await s.call(path, { method: 'POST', body: valid, headers: { Origin: 'https://evil.example' } })).status, 403);
  for (let i = 0; i < 5; i++) assert.equal((await s.call(path, { method: 'POST', body: valid })).status, 201);
  assert.equal((await s.call(path, { method: 'POST', body: valid })).status, 429);
  const stored = JSON.stringify([...s.saved]); assert.doesNotMatch(stored, /X-Study-Client|CF-Connecting-IP|User-Agent|127\.0\.0\.1/);
  const record = s.saved.get(`link:${token}`); record.noteCount = STUDY_LIMITS.notes; s.saved.set(`link:${token}`, record);
  assert.equal((await s.call(path, { method: 'POST', body: valid })).status, 409);
});
test('公開例外は明示資源・対象token APIだけで、編集画面・棚・名簿・他ショーへ抜けない', async () => {
  const s = setup();
  for (const path of ['/stage.html', '/index.html', '/roster.js', '/db.js', '/stage-shows.local.js', '/stage-future-private.js', '/study-assets/stage-shows.local.js', '/study-assets/../db.js', '/study-frame.html/../roster-key.local.js', '/session/new', '/study/api/owner/shows/show-test']) {
    const res = await s.call(path); assert.ok([401, 404].includes(res.status), `${path}: ${res.status}`);
  }
  for (const path of STUDY_PUBLIC_ASSETS) assert.equal((await s.call(path)).status, 200, path);
  const frame = await s.call('/study-frame'); assert.match(frame.headers.get('Content-Security-Policy'), /sandbox allow-scripts/); assert.match(frame.headers.get('Content-Security-Policy'), /connect-src 'none'/);
});
test('APIはno-store、発行競合は一つだけ、認証境界は交換可能', async () => {
  const s = setup(); const responses = await Promise.all([0, 1].map(() => s.call('/study/api/owner/shows/show-test', { user: 'alice', method: 'POST', body: { document: doc() } })));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  const { link } = await responses.find(response => response.status === 201).json();
  const response = await s.call(`/study/api/view/${link.token}`); assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(studyPrincipal(null), null); assert.deepEqual(studyPrincipal('alice'), { subject: 'account:alice', displayName: 'alice' });
});
test('描画依存と正本の生成、ローカル保存の隔離、解析と編集入口の不在', async () => {
  const root = new URL('../', import.meta.url);
  const html = await readFile(new URL('study.html', root), 'utf8'); const frame = await readFile(new URL('study-frame.html', root), 'utf8');
  for (const page of [html, frame]) for (const match of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], origin); if (url.origin !== origin) continue;
    // Canonical legacy markup is inert and not loaded; scripts/styles must be explicit absolute paths.
    if (/\.(js|css)(\?|$)/.test(match[1])) { assert.ok(match[1].startsWith('/'), match[1]); assert.ok(STUDY_PUBLIC_ASSETS.has(url.pathname), url.pathname); }
  }
  const src = await readFile(new URL('stage-study-viewer.js', root), 'utf8'); const owner = await readFile(new URL('stage-study-owner.js', root), 'utf8');
  assert.doesNotMatch(html + src, /stage-session\.js|stage-usage\.js|cloudflareinsights|alert\(|confirm\(/);
  assert.doesNotMatch(owner, /innerHTML|alert\(|confirm\(/);
  assert.match(src, /sandbox', 'allow-scripts'/); assert.doesNotMatch(src, /allow-same-origin/);
  assert.deepEqual([...src.matchAll(/localStorage\.setItem\('([^']+)'/g)].map(m => m[1]), ['stage-study-display-name']);
});

 test('本家とベータの入口・SW・Worker許可がそろい、書斎と体験版へ管理入口を混ぜない', async () => {
  const root = new URL('../', import.meta.url);
  const html = await readFile(new URL('stage.html', root), 'utf8');
  const desk = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /src="stage-study-owner\.js\?v=23"/);
  assert.doesNotMatch(desk, /stage-study-owner\.js/);
  const sw = await readFile(new URL('stage-sw.js', root), 'utf8');
  assert.match(sw, /stage-study-owner\.js\?v=23/); assert.match(sw, /stage-study\.css\?v=21/);
  const preview = await readFile(new URL('public-dist/try.html', root), 'utf8');
  assert.doesNotMatch(preview, /stage-study-owner\.js|stage-usage\.js|stage-shows\.local\.js/);
  const config = await readFile(new URL('wrangler.toml', root), 'utf8');
  assert.match(config, /name = "STUDY_LINKS", class_name = "StudyLinks"/);
  assert.match(config, /tag = "v3-study-links"\s+new_sqlite_classes = \["StudyLinks"\]/);
});

test('共有パネルは会議用同期と演者用リンクを一つの入口にまとめる', async () => {
  const root = new URL('../', import.meta.url);
  const [html, owner, session, css] = await Promise.all([
    readFile(new URL('stage.html', root), 'utf8'),
    readFile(new URL('stage-study-owner.js', root), 'utf8'),
    readFile(new URL('stage-session.js', root), 'utf8'),
    readFile(new URL('stage-study.css', root), 'utf8'),
  ]);
  assert.match(html, /id="stage-share-open"[^>]*aria-controls="stage-session-panel"/);
  assert.doesNotMatch(html, /id="stage-viewer-link-open"/);
  assert.match(html, /class="stage-modal stage-share-modal" id="stage-session-panel"[^>]*aria-labelledby="stage-share-title" hidden/);
  assert.doesNotMatch(html, /data-panel="session"/);
  assert.match(html, /id="stage-share-panel-hint"/);
  assert.match(html, /id="stage-share-realtime-title">リアルタイム共有（会議用）/);
  assert.match(html, /id="stage-share-study-title">演者用リンク/);
  assert.match(html, /id="stage-share-study-hint">演者がショーの動きを確認するためのViewerのリンクです。/);
  assert.match(html, /id="stage-share-study-action"/);
  assert.ok(html.indexOf('stage-share-realtime-title') < html.indexOf('stage-share-study-title'));
  assert.match(owner, /getElementById\('stage-share-study-action'\)/);
  assert.match(owner, /entryTarget\.classList\.add\('stage-share-study-details'\)/);
  assert.match(owner, /Saved rehearsal links/);
  assert.match(owner, /links\/\$\{entry\.token\}\/purge/);
  assert.match(owner, /document\.addEventListener\('shosai:share-open', openInlineOwnerControls\)/);
  assert.doesNotMatch(owner, /viewerMode|setViewerMode|viewerOpen/);
  assert.match(owner, /演者がショーの動きを確認するためのViewerのリンクです。/);
  assert.match(owner, /stage-viewer-link-explanations/);
  assert.doesNotMatch(owner, /createElement\('dialog'\)/);
  assert.doesNotMatch(owner, /id = 'study-open'/);
  assert.match(session, /function applyShareLabels\(\)/);
  assert.match(session, /function openShareModal\(trigger\)/);
  assert.match(session, /function openShareModal\(trigger\)[\s\S]*?applyShareLabels\(\);/);
  assert.match(session, /function closeShareModal\(\)/);
  assert.match(session, /new Event\("shosai:share-open"\)/);
  assert.match(css, /body\.stage-session-guest \.stage-share-study/);
  assert.match(css, /\.stage-modal\.stage-share-modal \{ width: min\(560px,/);
  assert.match(css, /#stage-share-study-action\.stage-share-study-details/);
  assert.match(css, /stage-share-study-library/);
  assert.doesNotMatch(css, /#stage-viewer-link-open/);
  assert.doesNotMatch(css, /stage-viewer-link-mode/);
  assert.match(css, /\.stage-share-channel \{[\s\S]*?border: 1px solid var\(--line-dark\);[\s\S]*?background: var\(--desk\);/);
  assert.match(css, /\.stage-share-live \{[\s\S]*?box-shadow: inset 0 2px 0 var\(--brass\);/);
  assert.match(css, /\.stage-share-study \{[\s\S]*?box-shadow: inset 0 2px 0 #81bfd4;/);
  assert.doesNotMatch(css, /stage-panel-help/);
  assert.match(css, /stage-share-channel h3 \{[^}]*color: var\(--milk\)/);
});
