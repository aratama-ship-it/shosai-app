import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const accountId = '802917588735d979244a77332421e90c';
const baseline = 'daa371b2-76e7-4638-8b93-e70612f0f002';
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
const activeBefore = (await api('/workers/scripts/shosai-app/deployments'))?.deployments?.[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
if (activeBefore !== baseline) throw new Error(`Production baseline changed before deployment: expected ${baseline}, found ${activeBefore || 'none'}.`);

const form = new FormData();
form.set('metadata', new Blob([fs.readFileSync(path.join(releaseDir, 'upload-metadata.json'), 'utf8')], { type: 'application/json' }));
form.set('upload-worker.js', new Blob([fs.readFileSync(path.join(releaseDir, 'upload-worker.js'), 'utf8')], { type: 'application/javascript+module' }), 'upload-worker.js');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app`, {
  method: 'PUT', headers, body: form,
});
const body = await response.json();
if (!response.ok || !body.success) {
  const message = body.errors?.map((error) => error.message).join('; ') || `HTTP ${response.status}`;
  throw new Error(`Production deployment failed: ${message}`);
}
const activeAfter = (await api('/workers/scripts/shosai-app/deployments'))?.deployments?.[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
if (!activeAfter || activeAfter === baseline) throw new Error('Deployment returned success but did not advance the production version.');
const result = {
  status: 'deployed', baseline, deployedVersion: activeAfter,
  deploymentId: (await api('/workers/scripts/shosai-app/deployments'))?.deployments?.[0]?.id || null,
  deployedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(releaseDir, 'deployment-result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
