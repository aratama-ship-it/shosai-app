import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, "../..");
const candidateDir = path.join(releaseDir, "candidate");
const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, "manifest.json"), "utf8"));
const metadataText = fs.readFileSync(path.join(candidateDir, "metadata.json"), "utf8");
const metadata = JSON.parse(metadataText);
const uploadBody = fs.readFileSync(path.join(candidateDir, "stage-warning-upload.js"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
assert.equal(sha256(uploadBody), manifest.candidateSourceSha256, "candidate upload changed");

execFileSync("python3", [
  path.join(repo, "tools/check-beta-update-safety.py"),
  "--candidate", candidateDir,
  "--review", path.join(releaseDir, "review.json"),
], { cwd: repo, stdio: "inherit" });

const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
const headers = { Authorization: `Bearer ${token}` };
const baseApi = `https://api.cloudflare.com/client/v4/accounts/802917588735d979244a77332421e90c`;
const deploymentRows = (value) => Array.isArray(value) ? value : value?.deployments || [];
const activeVersion = (value) => deploymentRows(value)[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
const api = async (pathname) => {
  const response = await fetch(`${baseApi}${pathname}`, { headers });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`Cloudflare read failed for ${pathname} (${response.status}).`);
  return body.result;
};

const before = await api(`/workers/scripts/${manifest.scriptName}/deployments`);
assert.equal(activeVersion(before), manifest.baselineVersion, "active beta changed after candidate preparation");
assert.equal(deploymentRows(before)[0]?.id || null, manifest.baselineDeploymentId, "active deployment changed after candidate preparation");
const settings = await api(`/workers/scripts/${manifest.scriptName}/settings`);
const resources = settings.resources || settings;
const liveNames = new Set((resources.bindings || settings.bindings || []).map(({ name }) => name));
const candidateNames = new Set(metadata.bindings.map(({ name }) => name));
assert.deepEqual([...candidateNames].sort(), [...liveNames].sort(), "binding set changed after candidate preparation");
assert.equal(metadata.keep_assets, true);
assert.equal(metadata.assets?.config?.run_worker_first, true);

const form = new FormData();
form.set("metadata", new Blob([metadataText], { type: "application/json" }));
form.set("stage-warning-upload.js", new Blob([uploadBody], { type: "application/javascript+module" }), "stage-warning-upload.js");
const response = await fetch(`${baseApi}/workers/scripts/${manifest.scriptName}`, {
  method: "PUT",
  headers,
  body: form,
});
const body = await response.json();
if (!response.ok || !body.success) {
  const message = body.errors?.map((error) => error.message).join("; ") || `HTTP ${response.status}`;
  throw new Error(`Beta deployment failed: ${message}`);
}

const after = await api(`/workers/scripts/${manifest.scriptName}/deployments`);
const deployedVersion = activeVersion(after);
assert.ok(deployedVersion && deployedVersion !== manifest.baselineVersion, "active beta version did not advance");
const result = {
  status: "deployed",
  release: "launch-backup-warning-20260913",
  baselineVersion: manifest.baselineVersion,
  deployedVersion,
  deploymentId: deploymentRows(after)[0]?.id || null,
  deployedAt: new Date().toISOString(),
  candidateSourceSha256: manifest.candidateSourceSha256,
  changedRoutes: manifest.changedRoutes,
  retainedBindings: [...candidateNames].sort(),
};
fs.writeFileSync(path.join(releaseDir, "deployment-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
