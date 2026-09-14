import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const candidateDir = path.join(releaseDir, "candidate");
const previewDir = "/private/tmp/stage-launch-warning-close-release-preview";
const accountId = "802917588735d979244a77332421e90c";
const scriptName = "shosai-app";
const allowedChangedRoutes = ["/stage", "/stage.html", "/style.css", "/stage-sketch.js", "/stage-sw.js"];
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
const headers = { Authorization: "Bearer " + token };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const deploymentRows = (value) => Array.isArray(value) ? value : value?.deployments || [];
const activeVersion = (value) => deploymentRows(value)[0]?.versions?.find((item) => item.percentage === 100)?.version_id;
const api = async (pathname) => {
  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + accountId + pathname, { headers });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error("Cloudflare read failed for " + pathname + " (" + response.status + ").");
  return body.result;
};
const oneReplace = (source, needle, replacement, label) => {
  assert.equal(source.split(needle).length, 2, label + " marker must occur exactly once");
  return source.replace(needle, replacement);
};
const readObject = (source, marker, nextMarker) => {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, "missing object block: " + marker);
  const name = marker.match(/var ([A-Z_]+)/)?.[1];
  const value = vm.runInNewContext(source.slice(start, end) + "\n" + name + ";", Object.create(null), { timeout: 10_000 });
  return { start, end, value };
};
const replaceObject = (source, marker, nextMarker, value) => {
  const range = readObject(source, marker, nextMarker);
  return source.slice(0, range.start) + marker + JSON.stringify(value) + ";\n" + source.slice(range.end);
};
const effectiveAssets = (source) => ({
  ...readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {").value,
  ...readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default").value,
});
const routeHashes = (assets) => Object.fromEntries(
  Object.entries(assets).map(([route, entry]) => [route, sha256(entry[1])]).sort(([a], [b]) => a.localeCompare(b)),
);
const bumpReference = (source, file, expectedVersion) => {
  const matcher = new RegExp(file.replaceAll(".", "\\.") + "\\?v=(\\d+)", "g");
  const versions = new Set([...source.matchAll(matcher)].map((match) => Number(match[1])));
  assert.deepEqual([...versions], [expectedVersion], file + " baseline revision differs");
  return source.replaceAll(file + "?v=" + expectedVersion, file + "?v=" + (expectedVersion + 1));
};

const deployments = await api("/workers/scripts/" + scriptName + "/deployments");
const baselineVersion = activeVersion(deployments);
assert.ok(baselineVersion, "active beta version is missing");
const baselineDeploymentId = deploymentRows(deployments)[0]?.id || null;
const sourceResponse = await fetch("https://api.cloudflare.com/client/v4/accounts/" + accountId + "/workers/scripts/" + scriptName, { headers });
assert.equal(sourceResponse.ok, true, "could not read active Worker source (" + sourceResponse.status + ")");
const sourceEntries = [...(await sourceResponse.formData()).entries()];
assert.equal(sourceEntries.length, 1, "active Worker must have one bundled module");
assert.equal(typeof sourceEntries[0][1], "string", "active Worker module must be text");
const baselineSource = sourceEntries[0][1];
const baselineSourceSha256 = sha256(baselineSource);
const baselineAssets = effectiveAssets(baselineSource);
const baselineHashes = routeHashes(baselineAssets);

for (const route of allowedChangedRoutes) assert.ok(baselineAssets[route], "baseline route is missing: " + route);
assert.match(baselineAssets["/stage"][1], /id="stage-launch-backup-warning"/);
assert.doesNotMatch(baselineAssets["/stage"][1], /id="stage-launch-backup-close"/);
assert.match(baselineAssets["/stage-sketch.js"][1], /MANAGED_BACKUP_WARNING_EXEMPT_USER = "guest1"/);
assert.doesNotMatch(baselineAssets["/stage-sketch.js"][1], /launchBackupClose/);
assert.match(baselineAssets["/stage-i18n.js"][1], /"この知らせを閉じる": "Dismiss this notice"/);

const revision = {
  style: Number(baselineAssets["/stage"][1].match(/style\.css\?v=(\d+)/)?.[1]),
  sketch: Number(baselineAssets["/stage"][1].match(/stage-sketch\.js\?v=(\d+)/)?.[1]),
  cache: Number(baselineAssets["/stage-sw.js"][1].match(/stage-sketch-pwa-v(\d+)/)?.[1]),
};
for (const [name, value] of Object.entries(revision)) assert.ok(Number.isInteger(value), name + " revision is missing");

let stageHtml = baselineAssets["/stage"][1];
stageHtml = oneReplace(
  stageHtml,
  '    <h2 id="stage-launch-backup-title">保存データの控えを取ってください</h2>\n',
  '    <h2 id="stage-launch-backup-title">保存データの控えを取ってください</h2>\n'
    + '    <button type="button" class="stage-launch-backup-close" id="stage-launch-backup-close"\n'
    + '            aria-label="この知らせを閉じる">×</button>\n',
  "warning close button",
);
stageHtml = bumpReference(stageHtml, "style.css", revision.style);
stageHtml = bumpReference(stageHtml, "stage-sketch.js", revision.sketch);

let styleCss = baselineAssets["/style.css"][1];
styleCss = oneReplace(
  styleCss,
  ".stage-launch-backup-head h2 {\n  color: var(--milk);",
  ".stage-launch-backup-head h2 {\n  flex: 1 1 auto;\n  color: var(--milk);",
  "warning title flex",
);
const closeCss = [
  ".stage-launch-backup-close {",
  "  display: grid;",
  "  place-items: center;",
  "  flex: 0 0 44px;",
  "  width: 44px;",
  "  height: 44px;",
  "  margin: -8px -8px -8px auto;",
  "  padding: 0;",
  "  border: 0;",
  "  background: transparent;",
  "  color: var(--milk-dim);",
  "  font: 400 28px/1 var(--sans);",
  "  cursor: pointer;",
  "}",
  "",
  ".stage-launch-backup-close:hover { color: var(--milk); }",
  ".stage-launch-backup-close:focus-visible {",
  "  outline: 2px solid var(--milk);",
  "  outline-offset: 2px;",
  "}",
  "",
].join("\n");
styleCss = oneReplace(styleCss, ".stage-launch-backup-mark {\n", closeCss + ".stage-launch-backup-mark {\n", "warning close styles");

let stageSketch = baselineAssets["/stage-sketch.js"][1];
stageSketch = oneReplace(
  stageSketch,
  '    launchBackupBackdrop: document.getElementById("stage-launch-backup-backdrop"),\n',
  '    launchBackupBackdrop: document.getElementById("stage-launch-backup-backdrop"),\n'
    + '    launchBackupClose: document.getElementById("stage-launch-backup-close"),\n',
  "warning close binding",
);
stageSketch = oneReplace(
  stageSketch,
  '  if (els.launchBackupExport) {\n',
  '  if (els.launchBackupClose) {\n'
    + '    els.launchBackupClose.addEventListener("click", () => closeLaunchBackupWarning(true));\n'
    + '  }\n'
    + '  if (els.launchBackupBackdrop) {\n'
    + '    els.launchBackupBackdrop.addEventListener("click", () => closeLaunchBackupWarning(true));\n'
    + '  }\n'
    + '  if (els.launchBackupExport) {\n',
  "warning dismiss handlers",
);
stageSketch = oneReplace(
  stageSketch,
  "    const actions = [els.launchBackupExport, els.launchBackupContinue].filter(Boolean);",
  "    const actions = [els.launchBackupClose, els.launchBackupExport, els.launchBackupContinue].filter(Boolean);",
  "warning focus trap",
);

let stageSw = baselineAssets["/stage-sw.js"][1];
stageSw = oneReplace(
  stageSw,
  'const CACHE_NAME = "stage-sketch-pwa-v' + revision.cache + '";',
  'const CACHE_NAME = "stage-sketch-pwa-v' + (revision.cache + 1) + '";',
  "PWA cache revision",
);
stageSw = bumpReference(stageSw, "style.css", revision.style);
stageSw = bumpReference(stageSw, "stage-sketch.js", revision.sketch);

let patchedSource = baselineSource;
let betaObject = readObject(patchedSource, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {").value;
let versionObject = readObject(patchedSource, "var VERSION_ASSETS = ", "var v036_overlay_default").value;
const updates = {
  "/stage": stageHtml,
  "/stage.html": stageHtml,
  "/style.css": styleCss,
  "/stage-sketch.js": stageSketch,
  "/stage-sw.js": stageSw,
};
for (const [route, body] of Object.entries(updates)) {
  const owner = versionObject[route] ? versionObject : betaObject;
  const previous = owner[route];
  assert.ok(previous, "route owner is missing: " + route);
  owner[route] = [previous[0], body, previous[2]];
}
patchedSource = replaceObject(patchedSource, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {", betaObject);
patchedSource = replaceObject(patchedSource, "var VERSION_ASSETS = ", "var v036_overlay_default", versionObject);

const patchedAssets = effectiveAssets(patchedSource);
const patchedHashes = routeHashes(patchedAssets);
const allRoutes = new Set([...Object.keys(baselineHashes), ...Object.keys(patchedHashes)]);
const changedRoutes = [...allRoutes].filter((route) => baselineHashes[route] !== patchedHashes[route]).sort();
assert.deepEqual(changedRoutes, [...allowedChangedRoutes].sort(), "candidate changes routes outside the warning close scope");
assert.match(patchedAssets["/stage"][1], /id="stage-launch-backup-close"[\s\S]*?aria-label="この知らせを閉じる"/);
assert.match(patchedAssets["/style.css"][1], /\.stage-launch-backup-close \{[\s\S]*?width: 44px;[\s\S]*?height: 44px/);
assert.match(patchedAssets["/stage-sketch.js"][1], /launchBackupBackdrop\.addEventListener\("click"/);

const settings = await api("/workers/scripts/" + scriptName + "/settings");
const resources = settings.resources || settings;
const bindings = resources.bindings || settings.bindings || [];
for (const name of ["ASSETS", "GUEST_ACCOUNTS", "SESSION_ROOM", "SITE_PASS", "SITE_USER", "STAGE_BETA_ACTIVE", "STAGE_RELEASE_SCOPE"]) {
  assert.ok(bindings.some((binding) => binding.name === name), "current binding is missing: " + name);
}
const metadata = {
  main_module: "stage-warning-upload.js",
  compatibility_date: resources.script_runtime?.compatibility_date || settings.compatibility_date || "2026-08-19",
  compatibility_flags: resources.script_runtime?.compatibility_flags || settings.compatibility_flags || [],
  bindings: bindings.map(({ name }) => ({ name, type: "inherit" })),
  keep_assets: true,
  assets: { config: { run_worker_first: true } },
  annotations: {
    "workers/message": "Stage Sketch beta: warning close controls only",
    "workers/tag": "launch-backup-warning-close-20260913",
  },
};

fs.mkdirSync(candidateDir, { recursive: true });
fs.writeFileSync(path.join(releaseDir, "baseline-worker.js"), baselineSource);
fs.writeFileSync(path.join(candidateDir, "stage-warning-upload.js"), patchedSource);
fs.writeFileSync(path.join(candidateDir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
fs.writeFileSync(path.join(releaseDir, "manifest.json"), JSON.stringify({
  scriptName,
  preparedAt: new Date().toISOString(),
  baselineVersion,
  baselineDeploymentId,
  baselineSourceSha256,
  candidateSourceSha256: sha256(patchedSource),
  changedRoutes,
  baselineRouteHashes: Object.fromEntries(changedRoutes.map((route) => [route, baselineHashes[route]])),
  candidateRouteHashes: Object.fromEntries(changedRoutes.map((route) => [route, patchedHashes[route]])),
  revision: {
    style: revision.style + " -> " + (revision.style + 1),
    sketch: revision.sketch + " -> " + (revision.sketch + 1),
    cache: revision.cache + " -> " + (revision.cache + 1),
  },
  retainedBindings: bindings.map(({ name, type, class_name }) => ({ name, type, class_name: class_name || null })),
}, null, 2) + "\n");

fs.mkdirSync(previewDir, { recursive: true });
for (const [route, entry] of Object.entries(patchedAssets)) {
  if (!Array.isArray(entry) || typeof entry[1] !== "string" || route === "/" || !route.startsWith("/") || route.includes("..")) continue;
  const output = path.join(previewDir, route.slice(1));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, entry[1]);
}

console.log(JSON.stringify({
  prepared: true,
  baselineVersion,
  baselineDeploymentId,
  baselineSourceSha256,
  candidateSourceSha256: sha256(patchedSource),
  changedRoutes,
  revision,
  previewDir,
}, null, 2));
