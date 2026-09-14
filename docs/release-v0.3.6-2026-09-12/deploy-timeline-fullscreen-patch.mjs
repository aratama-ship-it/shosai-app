import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, "../..");
const accountId = "802917588735d979244a77332421e90c";
const scriptName = "shosai-app";
const releaseSummary = JSON.parse(fs.readFileSync(path.join(releaseDir, "release-summary.json"), "utf8"));
const deploymentRecordPath = path.join(releaseDir, "timeline-fullscreen-deployment.json");
const previousDeployment = fs.existsSync(deploymentRecordPath)
  ? JSON.parse(fs.readFileSync(deploymentRecordPath, "utf8"))
  : null;
const expectedBaseline = previousDeployment?.deployedVersion || releaseSummary.beta.versionId;
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");

const headers = { Authorization: `Bearer ${token}` };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const read = (relative) => fs.readFileSync(path.join(repo, relative), "utf8");
const deploymentRows = (value) => Array.isArray(value) ? value : value?.deployments || [];
const activeVersion = (value) => deploymentRows(value)[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
const api = async (pathname) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, { headers });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`Cloudflare read failed for ${pathname} (${response.status}).`);
  return body.result;
};

const before = await api(`/workers/scripts/${scriptName}/deployments`);
if (activeVersion(before) !== expectedBaseline) {
  throw new Error(`Production baseline changed: expected ${expectedBaseline}, found ${activeVersion(before) || "none"}.`);
}

const sourceResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, { headers });
if (!sourceResponse.ok) throw new Error(`Could not read active Worker source (${sourceResponse.status}).`);
const sourceParts = await sourceResponse.formData();
const sourceEntries = [...sourceParts.entries()];
if (sourceEntries.length !== 1 || typeof sourceEntries[0][1] !== "string") {
  throw new Error(`Unexpected active Worker module layout: ${sourceEntries.map(([name]) => name).join(", ")}`);
}
let source = sourceEntries[0][1];

const assetsStartMarker = "var BETA_RELEASE_ASSETS = ";
const releaseEnvMarker = "function releaseEnv(env) {";
const assetsStart = source.indexOf(assetsStartMarker);
const releaseEnvAt = source.indexOf(releaseEnvMarker, assetsStart);
if (assetsStart < 0 || releaseEnvAt < 0 || source.indexOf(releaseEnvMarker, releaseEnvAt + 1) >= 0) {
  throw new Error("Could not locate the unique deployed beta asset table.");
}
const assetProgram = `${source.slice(assetsStart, releaseEnvAt)}\nBETA_RELEASE_ASSETS;`;
const assets = vm.runInNewContext(assetProgram, Object.create(null), { timeout: 10_000 });
if (!assets || typeof assets !== "object" || !assets["/stage"] || !assets["/style.css"]) {
  throw new Error("The deployed beta asset table is incomplete.");
}

const stageSw = read("stage-sw.js");
const appShellBlock = stageSw.match(/const APP_SHELL = \[([\s\S]*?)\n\];/);
if (!appShellBlock) throw new Error("Could not read stage-sw.js APP_SHELL.");
const appShell = [...appShellBlock[1].matchAll(/"\.\/([^"?]+)(?:\?[^"\n]+)?"/g)].map((match) => match[1]);
const textExtensions = new Set([".html", ".js", ".css", ".webmanifest"]);
// Service Worker自身はAPP_SHELLへ自分を列挙しないため、配信対象へ明示的に足す。
const files = [...new Set([...appShell, "stage-sw.js", "study-frame.html"])].filter((relative) => textExtensions.has(path.extname(relative)));

const routesFor = (relative) => {
  if (relative === "stage.html") return ["/stage", "/stage.html"];
  if (relative === "study-frame.html") return ["/study-frame", "/study-frame.html"];
  if (relative === "manual/manual.html") return ["/manual/manual.html", "/manual/manual"];
  if (relative === "manual/quick.html") return ["/manual/quick.html", "/manual/quick"];
  if (relative === "manual/quick-en.html") return ["/manual/quick-en.html", "/manual/quick-en"];
  return [`/${relative}`];
};
const contentType = (relative) => {
  if (relative.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (relative.endsWith(".css")) return "text/css; charset=utf-8";
  if (relative.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
  return "text/html; charset=utf-8";
};

const manifest = [];
for (const relative of files) {
  const body = read(relative);
  const routes = routesFor(relative);
  for (const route of routes) assets[route] = [contentType(relative), body, relative];
  manifest.push({ path: relative, routes, bytes: Buffer.byteLength(body), sha256: sha256(body) });
}
for (const relative of ["style.css", "stage-venues.js", "stage-venue-lines.js", "stage-i18n.js", "stage-set-model.js", "stage-machinery.js", "stage-sketch.js"]) {
  const body = read(relative);
  assets[`/study-assets/${relative}`] = [contentType(relative), body, relative];
}

const stageHtml = read("stage.html");
for (const [ok, message] of [
  [stageHtml.includes('class="stage-app-version">v0.3.6'), "v0.3.6 label is missing"],
  [stageHtml.includes('class="stage-lang stage-present-icon" id="stage-present-btn"'), "icon-only fullscreen control is missing"],
  [!stageHtml.includes('<span class="stage-control-label">全画面</span>'), "visible fullscreen label remains"],
  [stageHtml.includes('id="stage-workspace-tabs"'), "timeline tabs are missing"],
  [stageHtml.includes('stage-timeline.js?v=1'), "timeline script reference is missing"],
  [stageHtml.includes('style.css?v=290'), "style v290 reference is missing"],
  [read("style.css").includes(".stage-history-actions .stage-present-icon"), "fullscreen sizing CSS is missing"],
  [stageSw.includes('stage-sketch-pwa-v342'), "PWA cache v342 is missing"],
]) if (!ok) throw new Error(message);

const guestNeedle = '  "/stage-sketch.js",\n  "/stage-venues.js",';
const guestReplacement = '  "/stage-sketch.js",\n  "/stage-timeline.js",\n  "/stage-venues.js",';
const sourcePrefix = source.slice(0, assetsStart);
let patchedPrefix = sourcePrefix;
if (!patchedPrefix.includes('"/stage-timeline.js"')) {
  if (patchedPrefix.split(guestNeedle).length !== 2) throw new Error("Could not safely extend the deployed guest asset allowlist.");
  patchedPrefix = patchedPrefix.replace(guestNeedle, guestReplacement);
}
source = `${patchedPrefix}${assetsStartMarker}${JSON.stringify(assets)};\n${source.slice(releaseEnvAt)}`;
if (!source.includes('"/stage-timeline.js"') || !source.includes("stage-present-icon") || !source.includes("style.css?v=290")) {
  throw new Error("Prepared Worker is missing required production markers.");
}

const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-v036-ui-patch-"));
const temporaryModule = path.join(temporaryDir, "v036-ui-patch-upload.js");
fs.writeFileSync(temporaryModule, source);
execFileSync(process.execPath, ["--check", temporaryModule], { stdio: "inherit" });

const settings = await api(`/workers/scripts/${scriptName}/settings`);
const resources = settings.resources || settings;
const bindings = resources.bindings || settings.bindings || [];
for (const name of ["ASSETS", "GUEST_ACCOUNTS", "SESSION_ROOM", "SITE_PASS", "SITE_USER", "STAGE_BETA_ACTIVE", "STUDY_ALLOW_ANONYMOUS", "STUDY_LINKS"]) {
  if (!bindings.some((binding) => binding.name === name)) throw new Error(`Current production binding is missing: ${name}`);
}
const overrideNames = new Set(["STAGE_RELEASE_SCOPE", "STAGE_USAGE_ENABLED", "STUDY_ALLOW_ANONYMOUS"]);
const metadata = {
  main_module: "v036-ui-patch-upload.js",
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
    "workers/message": "Stage Sketch beta: timeline mode and icon-only fullscreen",
    "workers/tag": "v0.3.6-timeline-fullscreen-20260912",
  },
};

const preflight = await api(`/workers/scripts/${scriptName}/deployments`);
if (activeVersion(preflight) !== expectedBaseline) throw new Error("Production changed during patch preparation; deployment stopped.");
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.set("v036-ui-patch-upload.js", new Blob([source], { type: "application/javascript+module" }), "v036-ui-patch-upload.js");
const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, {
  method: "PUT", headers, body: form,
});
const uploadBody = await uploadResponse.json();
if (!uploadResponse.ok || !uploadBody.success) {
  const message = uploadBody.errors?.map((error) => error.message).join("; ") || `HTTP ${uploadResponse.status}`;
  throw new Error(`Production deployment failed: ${message}`);
}
const after = await api(`/workers/scripts/${scriptName}/deployments`);
const deployedVersion = activeVersion(after);
if (!deployedVersion || deployedVersion === expectedBaseline) throw new Error("Deployment did not advance the active production version.");

const result = {
  status: "deployed",
  release: "v0.3.6-timeline-fullscreen-20260912",
  baselineVersion: expectedBaseline,
  deployedVersion,
  deploymentId: deploymentRows(after)[0]?.id || null,
  deployedAt: new Date().toISOString(),
  sourceSha256: sha256(source),
  assets: manifest,
  supersedes: previousDeployment ? {
    version: previousDeployment.deployedVersion,
    deploymentId: previousDeployment.deploymentId,
  } : null,
  retainedBindings: bindings.map(({ name, type, class_name }) => ({ name, type, class_name: class_name || null })),
};
fs.writeFileSync(deploymentRecordPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, baselineVersion: result.baselineVersion, deployedVersion, deploymentId: result.deploymentId, assets: manifest.length }));
