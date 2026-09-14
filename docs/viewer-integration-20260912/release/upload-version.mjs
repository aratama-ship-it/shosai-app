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
const deploymentResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app/deployments`, { headers });
const deployments = await deploymentResponse.json();
const active = deployments.result?.deployments?.[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
if (!deploymentResponse.ok || active !== baseline) {
  throw new Error(`Production baseline changed before upload: expected ${baseline}, found ${active || 'none'}.`);
}
const metadata = fs.readFileSync(path.join(releaseDir, 'upload-metadata.json'), 'utf8');
const worker = fs.readFileSync(path.join(releaseDir, 'upload-worker.js'), 'utf8');
const form = new FormData();
form.set('metadata', new Blob([metadata], { type: 'application/json' }));
form.set('upload-worker.js', new Blob([worker], { type: 'application/javascript+module' }), 'upload-worker.js');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app/versions`, {
  method: 'POST', headers, body: form,
});
const body = await response.json();
if (!response.ok || !body.success || !body.result?.id) {
  const message = body.errors?.map((error) => error.message).join('; ') || `HTTP ${response.status}`;
  throw new Error(`Version upload failed: ${message}`);
}
const result = {
  uploadedVersion: body.result.id,
  baseline,
  status: 'uploaded-not-deployed',
  uploadedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(releaseDir, 'upload-result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
