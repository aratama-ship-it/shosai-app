import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const baselineSourcePath = "/private/tmp/stage-name-beta-release-gB2tOa/version-release/v036-overlay-upload.js";
const baselineVersion = "e945c90d-5e88-4601-8266-fa664d37247e";
const accountId = "802917588735d979244a77332421e90c";
const scriptName = "shosai-app";
const allowedChangedRoutes = new Set(["/stage", "/stage.html", "/style.css", "/stage-sw.js"]);
const recordPath = path.join(releaseDir, "fullscreen-icon-only-deployment.json");

const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
if (!fs.existsSync(baselineSourcePath)) throw new Error("The preserved v0.3.6 baseline source is missing.");

const headers = { Authorization: `Bearer ${token}` };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const deploymentRows = (value) => Array.isArray(value) ? value : value?.deployments || [];
const activeVersion = (value) => deploymentRows(value)[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
const api = async (pathname) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`, { headers });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`Cloudflare read failed for ${pathname} (${response.status}).`);
  return body.result;
};

const readObject = (source, marker, nextMarker) => {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start);
  if (start < 0 || end < 0 || source.indexOf(marker, start + marker.length) >= 0) {
    throw new Error(`Could not locate unique object block: ${marker}`);
  }
  const value = vm.runInNewContext(`${source.slice(start, end)}\n${marker.match(/var ([A-Z_]+)/)?.[1]};`, Object.create(null), { timeout: 10_000 });
  return { start, end, value };
};
const replaceObject = (source, marker, nextMarker, value) => {
  const { start, end } = readObject(source, marker, nextMarker);
  return `${source.slice(0, start)}${marker}${JSON.stringify(value)};\n${source.slice(end)}`;
};
const effectiveAssets = (source) => {
  const beta = readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {").value;
  const version = readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default").value;
  return { ...beta, ...version };
};
const routeHashes = (assets) => Object.fromEntries(
  Object.entries(assets).map(([route, entry]) => [route, sha256(entry[1])]).sort(([a], [b]) => a.localeCompare(b))
);

const before = await api(`/workers/scripts/${scriptName}/deployments`);
assert.equal(activeVersion(before), baselineVersion, "production is not on the restored v0.3.6 baseline");

const baselineSource = fs.readFileSync(baselineSourcePath, "utf8");
assert.equal(sha256(baselineSource), "5d4d78c93f1bda934c106c9274026be7c60cad89e16f8b4f52c407bbb7ab6c12", "preserved baseline source changed");
const baselineEffective = effectiveAssets(baselineSource);
const baselineHashes = routeHashes(baselineEffective);
assert.equal(baselineEffective["/stage"][1].includes('class="stage-app-version">v0.3.6'), true);
assert.equal(baselineEffective["/stage"][1].includes("stage-workspace-tabs"), false);
assert.equal(baselineEffective["/stage"][1].includes("stage-timeline"), false);
assert.equal(baselineEffective["/stage-sw.js"][1].includes("stage-timeline.js"), false);

let source = baselineSource;
const betaBlock = readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {");
const betaAssets = betaBlock.value;
const oldCss = betaAssets["/style.css"]?.[1];
assert.equal(typeof oldCss, "string", "baseline style.css is missing");
assert.equal(oldCss.includes(".stage-present-icon"), false, "baseline already contains icon-only CSS");
assert.equal(oldCss.includes(".stage-workspace-tabs"), false, "baseline CSS unexpectedly contains timeline mode");
const iconCss = `/* 全画面は定番の記号だけにして、隣のアイコン操作と当たり判定を揃える。 */
.stage-history-actions .stage-present-icon {
  --stage-present-hit-size: var(--stage-history-action-height);
  --stage-present-icon-size: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 var(--stage-present-hit-size);
  width: var(--stage-present-hit-size);
  min-width: var(--stage-present-hit-size);
  min-height: var(--stage-present-hit-size);
  height: var(--stage-present-hit-size);
  padding: 0;
}
.stage-present-icon > span[aria-hidden="true"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.stage-present-icon svg {
  display: block;
  width: var(--stage-present-icon-size);
  height: var(--stage-present-icon-size);
}`;
betaAssets["/style.css"][1] = `${oldCss.trimEnd()}\n\n${iconCss}\n`;
source = replaceObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {", betaAssets);

const versionBlock = readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default");
const versionAssets = versionBlock.value;
const oldButton = '<button type="button" class="stage-lang" id="stage-present-btn" data-tablet-icon="⛶" aria-keyshortcuts="F" aria-pressed="false" title="図を全画面表示（F）。矢印キーでシーン送り、FまたはEscで戻る"><span aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10"/></svg></span><span class="stage-control-label">全画面</span></button>';
const newButton = '<button type="button" class="stage-lang stage-present-icon" id="stage-present-btn" data-tablet-icon="⛶" aria-label="全画面" aria-keyshortcuts="F" aria-pressed="false" title="図を全画面表示（F）。矢印キーでシーン送り、FまたはEscで戻る"><span aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10"/></svg></span></button>';
for (const route of ["/stage", "/stage.html"]) {
  const oldHtml = versionAssets[route]?.[1];
  assert.equal(typeof oldHtml, "string", `${route} is missing from the v0.3.6 overlay`);
  assert.equal(oldHtml.split(oldButton).length, 2, `${route} fullscreen button baseline differs`);
  assert.equal(oldHtml.includes("style.css?v=287"), true, `${route} style baseline differs`);
  const newHtml = oldHtml.replace(oldButton, newButton).replace("style.css?v=287", "style.css?v=291");
  assert.equal(newHtml.includes("stage-workspace-tabs"), false);
  assert.equal(newHtml.includes("stage-timeline"), false);
  versionAssets[route][1] = newHtml;
}
const oldSw = versionAssets["/stage-sw.js"]?.[1];
assert.equal(typeof oldSw, "string", "v0.3.6 stage-sw.js overlay is missing");
assert.equal(oldSw.includes('stage-sketch-pwa-v339'), true, "PWA cache baseline differs");
assert.equal(oldSw.includes('style.css?v=287'), true, "PWA style baseline differs");
assert.equal(oldSw.includes("stage-timeline.js"), false, "baseline PWA unexpectedly contains timeline mode");
versionAssets["/stage-sw.js"][1] = oldSw
  .replaceAll("stage-sketch-pwa-v339", "stage-sketch-pwa-v343")
  .replaceAll("style.css?v=287", "style.css?v=291");
source = replaceObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default", versionAssets);

const patchedEffective = effectiveAssets(source);
const patchedHashes = routeHashes(patchedEffective);
const allRoutes = new Set([...Object.keys(baselineHashes), ...Object.keys(patchedHashes)]);
const changedRoutes = [...allRoutes].filter((route) => baselineHashes[route] !== patchedHashes[route]).sort();
assert.deepEqual(changedRoutes, [...allowedChangedRoutes].sort(), "the prepared release changes routes outside the approved scope");
assert.match(patchedEffective["/stage"][1], /class="stage-lang stage-present-icon" id="stage-present-btn"/);
assert.doesNotMatch(patchedEffective["/stage"][1], /<span class="stage-control-label">全画面<\/span>/);
assert.doesNotMatch(patchedEffective["/stage"][1], /stage-workspace-tabs|stage-timeline-panel|stage-timeline\.js/);
assert.match(patchedEffective["/style.css"][1], /\.stage-history-actions \.stage-present-icon/);
assert.doesNotMatch(patchedEffective["/style.css"][1], /\.stage-workspace-tabs|\.stage-timeline-panel/);
assert.match(patchedEffective["/stage-sw.js"][1], /stage-sketch-pwa-v343/);
assert.doesNotMatch(patchedEffective["/stage-sw.js"][1], /stage-timeline\.js/);
assert.doesNotMatch(source.slice(0, source.indexOf("var BETA_RELEASE_ASSETS = ")), /stage-timeline\.js/);

const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-v036-fullscreen-only-"));
const moduleName = "v036-fullscreen-icon-only.js";
const temporaryModule = path.join(temporaryDir, moduleName);
fs.writeFileSync(temporaryModule, source);
execFileSync(process.execPath, ["--check", temporaryModule], { stdio: "inherit" });

const metadata = {
  main_module: moduleName,
  compatibility_date: "2026-08-19",
  bindings: [
    { name: "ASSETS", type: "inherit" },
    { name: "GUEST_ACCOUNTS", type: "inherit" },
    { name: "SESSION_ROOM", type: "inherit" },
    { name: "SITE_PASS", type: "inherit" },
    { name: "SITE_USER", type: "inherit" },
    { name: "STAGE_BETA_ACTIVE", type: "inherit" },
    { name: "STAGE_RELEASE_SCOPE", type: "inherit" },
    { name: "STAGE_USAGE_ENABLED", type: "inherit" },
    { name: "STUDY_ALLOW_ANONYMOUS", type: "inherit" },
    { name: "STUDY_LINKS", type: "inherit" },
  ],
  keep_assets: true,
  assets: { config: { run_worker_first: true } },
  annotations: {
    "workers/message": "Stage Sketch beta: icon-only fullscreen; timeline held",
    "workers/tag": "v0.3.6-fullscreen-icon-only-20260912",
  },
};

const preflight = await api(`/workers/scripts/${scriptName}/deployments`);
assert.equal(activeVersion(preflight), baselineVersion, "production changed during patch preparation");
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.set(moduleName, new Blob([source], { type: "application/javascript+module" }), moduleName);
const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, {
  method: "PUT",
  headers,
  body: form,
});
const uploadBody = await uploadResponse.json();
if (!uploadResponse.ok || !uploadBody.success) {
  const message = uploadBody.errors?.map((error) => error.message).join("; ") || `HTTP ${uploadResponse.status}`;
  throw new Error(`Production deployment failed: ${message}`);
}
const after = await api(`/workers/scripts/${scriptName}/deployments`);
const deployedVersion = activeVersion(after);
assert.ok(deployedVersion && deployedVersion !== baselineVersion, "deployment did not advance the active version");

const result = {
  status: "deployed",
  release: "v0.3.6-fullscreen-icon-only-20260912",
  baselineVersion,
  deployedVersion,
  deploymentId: deploymentRows(after)[0]?.id || null,
  deployedAt: new Date().toISOString(),
  sourceSha256: sha256(source),
  baselineSourceSha256: sha256(baselineSource),
  changedRoutes,
  baselineRouteHashes: Object.fromEntries(changedRoutes.map((route) => [route, baselineHashes[route]])),
  deployedRouteHashes: Object.fromEntries(changedRoutes.map((route) => [route, patchedHashes[route]])),
};
fs.writeFileSync(recordPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
