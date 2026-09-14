import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, "../..");
const accountId = "802917588735d979244a77332421e90c";
const scriptName = "shosai-app";
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

const deployments = await api(`/workers/scripts/${scriptName}/deployments`);
const baseline = activeVersion(deployments);
if (!baseline) throw new Error("The active beta version could not be resolved.");
const settings = await api(`/workers/scripts/${scriptName}/settings`);
const resources = settings.resources || settings;
const bindings = resources.bindings || settings.bindings || [];
const names = new Set(bindings.map((binding) => binding.name));
for (const name of ["ASSETS", "GUEST_ACCOUNTS", "SESSION_ROOM", "SITE_PASS", "SITE_USER", "STAGE_BETA_ACTIVE", "STUDY_ALLOW_ANONYMOUS", "STUDY_LINKS"]) {
  if (!names.has(name)) throw new Error(`Current beta binding is missing: ${name}`);
}

execFileSync(process.execPath, [path.join(releaseDir, "build-overlay.mjs")], { cwd: repo, stdio: "inherit" });
execFileSync(process.execPath, [path.join(releaseDir, "check-overlay.mjs")], { cwd: repo, stdio: "inherit" });
const esbuild = "/Users/arata/.npm/_npx/32026684e21afda6/node_modules/esbuild/bin/esbuild";
if (!fs.existsSync(esbuild)) throw new Error("Pinned esbuild executable was not found.");
const uploadPath = path.join(releaseDir, "beta-overlay-upload.js");
execFileSync(esbuild, [
  path.join(releaseDir, "beta-overlay-worker.js"),
  "--bundle", "--format=esm", `--outfile=${uploadPath}`,
], { cwd: repo, stdio: "inherit" });
execFileSync(process.execPath, ["--check", uploadPath], { cwd: repo, stdio: "inherit" });

const overrideNames = new Set(["STAGE_RELEASE_SCOPE", "STAGE_USAGE_ENABLED", "STUDY_ALLOW_ANONYMOUS"]);
const metadata = {
  main_module: "beta-overlay-upload.js",
  compatibility_date: resources.script_runtime?.compatibility_date || settings.compatibility_date || "2026-08-19",
  compatibility_flags: resources.script_runtime?.compatibility_flags || settings.compatibility_flags || [],
  bindings: [
    ...bindings.filter(({ name }) => !overrideNames.has(name)).map(({ name }) => ({ name, type: "inherit" })),
    { name: "STAGE_RELEASE_SCOPE", type: "plain_text", text: "beta-20260912" },
    { name: "STAGE_USAGE_ENABLED", type: "plain_text", text: "false" },
    { name: "STUDY_ALLOW_ANONYMOUS", type: "plain_text", text: "true" },
  ],
  keep_assets: true,
  assets: { config: { run_worker_first: true } },
  annotations: {
    "workers/message": "Stage Sketch beta: selected five updates and performer Viewer",
    "workers/tag": "selected-five-viewer-20260912",
  },
};
fs.writeFileSync(path.join(releaseDir, "upload-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
const uploadBody = fs.readFileSync(uploadPath);
const baselineRecord = {
  scriptName,
  activeVersion: baseline,
  activeDeploymentId: deploymentRows(deployments)[0]?.id || null,
  recordedAt: new Date().toISOString(),
  uploadBytes: uploadBody.length,
  uploadSha256: crypto.createHash("sha256").update(uploadBody).digest("hex"),
  retainedBindings: bindings.map(({ name, type, class_name }) => ({ name, type, class_name: class_name || null })),
};
fs.writeFileSync(path.join(releaseDir, "remote-baseline.json"), `${JSON.stringify(baselineRecord, null, 2)}\n`);
console.log(JSON.stringify({
  prepared: true,
  baseline,
  uploadBytes: baselineRecord.uploadBytes,
  retainedBindings: bindings.length,
  releaseScope: "beta-20260912",
  usageEnabled: false,
  keepAssets: true,
}));
