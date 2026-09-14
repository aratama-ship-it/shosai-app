import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const accountId = "802917588735d979244a77332421e90c";
const baseline = JSON.parse(fs.readFileSync(path.join(releaseDir, "remote-baseline.json"), "utf8"));
const metadataPath = path.join(releaseDir, "upload-metadata.json");
const uploadPath = path.join(releaseDir, "beta-overlay-upload.js");
const uploadBody = fs.readFileSync(uploadPath);
const uploadSha256 = crypto.createHash("sha256").update(uploadBody).digest("hex");
if (uploadSha256 !== baseline.uploadSha256) throw new Error("Prepared upload changed after the remote baseline was recorded.");
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
const headers = { Authorization: `Bearer ${token}` };
const api = async (pathname) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, { headers });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`Cloudflare read failed for ${pathname} (${response.status}).`);
  return body.result;
};
const deploymentRows = (value) => Array.isArray(value) ? value : value?.deployments || [];
const activeVersion = (value) => deploymentRows(value)[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
const before = await api(`/workers/scripts/${baseline.scriptName}/deployments`);
const activeBefore = activeVersion(before);
if (activeBefore !== baseline.activeVersion) {
  throw new Error(`Beta baseline changed before deployment: expected ${baseline.activeVersion}, found ${activeBefore || "none"}.`);
}

const form = new FormData();
form.set("metadata", new Blob([fs.readFileSync(metadataPath, "utf8")], { type: "application/json" }));
form.set("beta-overlay-upload.js", new Blob([uploadBody], { type: "application/javascript+module" }), "beta-overlay-upload.js");
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${baseline.scriptName}`, {
  method: "PUT",
  headers,
  body: form,
});
const body = await response.json();
if (!response.ok || !body.success) {
  const message = body.errors?.map((error) => error.message).join("; ") || `HTTP ${response.status}`;
  throw new Error(`Beta deployment failed: ${message}`);
}
const after = await api(`/workers/scripts/${baseline.scriptName}/deployments`);
const activeAfter = activeVersion(after);
if (!activeAfter || activeAfter === baseline.activeVersion) throw new Error("Deployment succeeded but the active beta version did not advance.");
const result = {
  status: "deployed",
  baseline: baseline.activeVersion,
  deployedVersion: activeAfter,
  deploymentId: deploymentRows(after)[0]?.id || null,
  release: "selected-five-viewer-20260912",
  deployedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(releaseDir, "deployment-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
