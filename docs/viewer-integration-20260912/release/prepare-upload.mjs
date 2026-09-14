import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, '../../..');
const accountId = '802917588735d979244a77332421e90c';
const currentVersion = 'daa371b2-76e7-4638-8b93-e70612f0f002';
const token = fs.readFileSync(`${os.homedir()}/.wrangler/config/default.toml`, 'utf8')
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error('Saved Wrangler OAuth token was not found.');
const api = async (pathname) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Cloudflare read failed (${response.status}) for ${pathname}`);
  const body = await response.json();
  if (!body.success) throw new Error(`Cloudflare read was unsuccessful for ${pathname}`);
  return body.result;
};
const deployments = await api('/workers/scripts/shosai-app/deployments');
const deploymentRows = Array.isArray(deployments) ? deployments : deployments?.deployments || [];
const liveVersion = deploymentRows[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
if (liveVersion !== currentVersion) {
  throw new Error(`Production baseline changed: expected ${currentVersion}, found ${liveVersion || 'none'}. Re-inspect before uploading.`);
}
const settings = await api('/workers/scripts/shosai-app/settings');
const resources = settings.resources || settings;
const bindings = resources.bindings || settings.bindings || [];
const names = new Set(bindings.map((binding) => binding.name));
for (const name of ['ASSETS', 'GUEST_ACCOUNTS', 'SESSION_ROOM', 'SITE_PASS', 'SITE_USER', 'STAGE_BETA_ACTIVE']) {
  if (!names.has(name)) throw new Error(`Current production binding is missing: ${name}`);
}
if (bindings.some((binding) => binding.name === 'STUDY_LINKS')) {
  throw new Error('StudyLinks already exists in production; rebaseline the release package instead of creating it again.');
}

execFileSync(process.execPath, [path.join(releaseDir, 'build.mjs')], { cwd: repo, stdio: 'inherit' });
const esbuild = '/Users/arata/.npm/_npx/32026684e21afda6/node_modules/esbuild/bin/esbuild';
execFileSync(esbuild, [
  path.join(releaseDir, 'viewer-beta-worker.js'), '--bundle', '--format=esm',
  `--outfile=${path.join(releaseDir, 'upload-worker.js')}`,
], { cwd: repo, stdio: 'inherit' });
execFileSync(process.execPath, ['--check', path.join(releaseDir, 'upload-worker.js')], { cwd: repo, stdio: 'inherit' });

const metadata = {
  main_module: 'upload-worker.js',
  compatibility_date: resources.script_runtime?.compatibility_date || settings.compatibility_date,
  compatibility_flags: resources.script_runtime?.compatibility_flags || settings.compatibility_flags || [],
  bindings: [
    ...bindings.map(({ name }) => ({ name, type: 'inherit' })),
    { name: 'STUDY_LINKS', type: 'durable_object_namespace', class_name: 'StudyLinks' },
    { name: 'STUDY_ALLOW_ANONYMOUS', type: 'plain_text', text: 'true' },
  ],
  migrations: {
    // The active Worker currently records the SessionRoom migration as v1.
    // Carry that exact tag forward so this Viewer-only migration leaves the
    // existing SessionRoom namespace untouched.
    old_tag: 'v1-session-room',
    new_tag: 'v3-study-links',
    steps: [{ new_sqlite_classes: ['StudyLinks'] }],
  },
  keep_assets: true,
  assets: { config: { run_worker_first: true } },
  annotations: {
    'workers/message': 'Stage Sketch Viewer beta: performer invitation links with compact iPhone/iPad Viewer UI',
    'workers/tag': 'viewer-beta-20260912',
  },
};
fs.writeFileSync(path.join(releaseDir, 'upload-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify({
  prepared: true,
  productionBaseline: liveVersion,
  retainedBindings: bindings.length,
  addedBindings: ['STUDY_LINKS', 'STUDY_ALLOW_ANONYMOUS'],
  keepAssets: metadata.keep_assets,
  migration: metadata.migrations,
}));
