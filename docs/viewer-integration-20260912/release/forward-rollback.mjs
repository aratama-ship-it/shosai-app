import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, '../../..');
const accountId = '802917588735d979244a77332421e90c';
const failedVersion = 'e122cc4d-259a-4e72-88b5-8609bdbd2b32';
const token = fs.readFileSync(`${os.homedir()}/.wrangler/config/default.toml`, 'utf8')
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error('Saved Wrangler OAuth token was not found.');
const headers = { Authorization: `Bearer ${token}` };
const api = async (pathname) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, { headers });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`Cloudflare read failed for ${pathname}`);
  return body.result;
};
const deployments = await api('/workers/scripts/shosai-app/deployments');
const active = deployments?.deployments?.[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
if (active !== failedVersion) throw new Error(`Active version changed before forward rollback: ${active || 'none'}`);
const settings = await api('/workers/scripts/shosai-app/settings');
const resources = settings.resources || settings;
const bindings = resources.bindings || settings.bindings || [];
for (const name of ['ASSETS', 'SESSION_ROOM', 'SITE_PASS', 'SITE_USER', 'STAGE_BETA_ACTIVE', 'STUDY_LINKS']) {
  if (!bindings.some((binding) => binding.name === name)) throw new Error(`Rollback binding is missing: ${name}`);
}

const gitText = (file) => execFileSync('git', ['show', `HEAD:${file}`], { cwd: repo, encoding: 'utf8' });
const modules = new Map([
  ['rollback-entry.js', `import app from './worker-old.js';\nexport { SessionRoom } from './worker-old.js';\nexport { StudyLinks } from './study-links.js';\nexport default app;\n`],
  ['worker-old.js', gitText('worker.js')],
  ['session-room.js', gitText('session-room.js')],
  ['study-links.js', fs.readFileSync(path.join(repo, 'study-links.js'), 'utf8')],
  ['study-reader-account.js', fs.readFileSync(path.join(repo, 'study-reader-account.js'), 'utf8')],
]);
const metadata = {
  main_module: 'rollback-entry.js',
  compatibility_date: resources.script_runtime?.compatibility_date || settings.compatibility_date || '2026-08-19',
  compatibility_flags: resources.script_runtime?.compatibility_flags || settings.compatibility_flags || [],
  bindings: bindings.map(({ name }) => ({ name, type: 'inherit' })),
  keep_assets: true,
  assets: { config: { run_worker_first: true } },
  annotations: {
    'workers/message': 'Forward rollback: restore Stage Sketch beta worker behaviour after Viewer release regression',
    'workers/tag': 'viewer-forward-rollback-20260912',
  },
};
const form = new FormData();
form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
for (const [name, source] of modules) {
  form.set(name, new Blob([source], { type: 'application/javascript+module' }), name);
}
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app`, {
  method: 'PUT', headers, body: form,
});
const body = await response.json();
if (!response.ok || !body.success) {
  const message = body.errors?.map((error) => error.message).join('; ') || `HTTP ${response.status}`;
  throw new Error(`Forward rollback failed: ${message}`);
}
const after = await api('/workers/scripts/shosai-app/deployments');
const restored = after?.deployments?.[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
if (!restored || restored === failedVersion) throw new Error('Forward rollback did not advance the active version.');
console.log(JSON.stringify({ status: 'forward-rolled-back', from: failedVersion, restoredVersion: restored }));
