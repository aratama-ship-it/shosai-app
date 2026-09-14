import fs from 'node:fs';
import os from 'node:os';

const configPath = `${os.homedir()}/.wrangler/config/default.toml`;
const config = fs.readFileSync(configPath, 'utf8');
const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error('Saved Wrangler OAuth token was not found.');
const accountId = '802917588735d979244a77332421e90c';
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app/settings`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!response.ok) throw new Error(`Remote settings request failed: ${response.status}`);
const body = await response.json();
if (!body.success) throw new Error('Remote settings request was unsuccessful.');
const result = body.result || {};
const resources = result.resources || result;
const versionResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app/versions/e06a4161-092b-4504-903b-6d11cbb1762b`, {
  headers: { Authorization: `Bearer ${token}` },
});
const version = versionResponse.ok ? (await versionResponse.json()).result || {} : {};
console.log(JSON.stringify({
  compatibilityDate: resources.script_runtime?.compatibility_date ?? result.compatibility_date ?? null,
  compatibilityFlags: resources.script_runtime?.compatibility_flags ?? result.compatibility_flags ?? [],
  bindings: (resources.bindings || result.bindings || []).map(({ name, type, class_name }) => ({ name, type, class_name: class_name || null })),
  migrationTag: resources.migrations?.new_tag ?? result.migrations?.new_tag ?? null,
  versionMigrationTag: version.migration_tag ?? null,
  versionBindings: (version.resources?.bindings || []).map(({ name, type, class_name }) => ({ name, type, class_name: class_name || null })),
  hasAssetsBinding: (resources.bindings || result.bindings || []).some((binding) => binding.type === 'assets'),
}, null, 2));
