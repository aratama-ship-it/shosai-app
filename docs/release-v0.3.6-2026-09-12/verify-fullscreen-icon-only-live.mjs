import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const baselineSourcePath = "/private/tmp/stage-name-beta-release-gB2tOa/version-release/v036-overlay-upload.js";
const deployed = JSON.parse(fs.readFileSync(path.join(releaseDir, "fullscreen-icon-only-deployment.json"), "utf8"));
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");

const headers = { Authorization: `Bearer ${token}` };
const accountId = "802917588735d979244a77332421e90c";
const baseApi = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const allowedChangedRoutes = ["/stage", "/stage.html", "/style.css", "/stage-sw.js"];

const readObject = (source, marker, nextMarker) => {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, `missing object block: ${marker}`);
  const name = marker.match(/var ([A-Z_]+)/)?.[1];
  return vm.runInNewContext(`${source.slice(start, end)}\n${name};`, Object.create(null), { timeout: 10_000 });
};
const effectiveAssets = (source) => ({
  ...readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {"),
  ...readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default"),
});
const routeHashes = (assets) => Object.fromEntries(
  Object.entries(assets).map(([route, entry]) => [route, sha256(entry[1])]).sort(([a], [b]) => a.localeCompare(b))
);

const deploymentsResponse = await fetch(`${baseApi}/workers/scripts/shosai-app/deployments`, { headers });
const deploymentsBody = await deploymentsResponse.json();
assert.equal(deploymentsResponse.ok && deploymentsBody.success, true);
const rows = Array.isArray(deploymentsBody.result) ? deploymentsBody.result : deploymentsBody.result?.deployments || [];
const activeVersion = rows[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
assert.equal(activeVersion, deployed.deployedVersion, "the active production version changed after deployment");

const sourceResponse = await fetch(`${baseApi}/workers/scripts/shosai-app`, { headers });
assert.equal(sourceResponse.ok, true);
const parts = await sourceResponse.formData();
const values = [...parts.values()];
assert.equal(values.length, 1);
assert.equal(typeof values[0], "string");
const liveSource = values[0];
assert.equal(sha256(liveSource), deployed.sourceSha256, "live Worker source differs from the uploaded source");

const baselineSource = fs.readFileSync(baselineSourcePath, "utf8");
assert.equal(sha256(baselineSource), deployed.baselineSourceSha256, "preserved v0.3.6 baseline changed");
const baselineAssets = effectiveAssets(baselineSource);
const liveAssets = effectiveAssets(liveSource);
const baselineHashes = routeHashes(baselineAssets);
const liveHashes = routeHashes(liveAssets);
const allRoutes = new Set([...Object.keys(baselineHashes), ...Object.keys(liveHashes)]);
const changedRoutes = [...allRoutes].filter((route) => baselineHashes[route] !== liveHashes[route]).sort();
assert.deepEqual(changedRoutes, [...allowedChangedRoutes].sort(), "live release changed routes outside the approved scope");
assert.deepEqual(changedRoutes, deployed.changedRoutes);

const stageHtml = liveAssets["/stage"][1];
const styleCss = liveAssets["/style.css"][1];
const stageSw = liveAssets["/stage-sw.js"][1];
assert.match(stageHtml, /class="stage-app-version">v0\.3\.6/);
assert.match(stageHtml, /class="stage-lang stage-present-icon" id="stage-present-btn"/);
assert.match(stageHtml, /aria-label="全画面"/);
assert.doesNotMatch(stageHtml, /<span class="stage-control-label">全画面<\/span>/);
assert.doesNotMatch(stageHtml, /stage-workspace-tabs|stage-timeline-panel|stage-timeline\.js/);
assert.match(stageHtml, /style\.css\?v=291/);
assert.match(styleCss, /\.stage-history-actions \.stage-present-icon/);
assert.doesNotMatch(styleCss, /\.stage-workspace-tabs|\.stage-timeline-panel/);
assert.match(stageSw, /stage-sketch-pwa-v343/);
assert.match(stageSw, /style\.css\?v=291/);
assert.doesNotMatch(stageSw, /stage-timeline\.js/);
assert.equal(liveAssets["/stage-timeline.js"], undefined, "timeline route is present in the effective beta assets");
assert.doesNotMatch(liveSource.slice(0, liveSource.indexOf("var BETA_RELEASE_ASSETS = ")), /stage-timeline\.js/);

const stageResponse = await fetch("https://stagesketch.pygmix.com/stage?lang=ja", { redirect: "manual" });
assert.ok([302, 401].includes(stageResponse.status), `unauthenticated Stage returned ${stageResponse.status}`);
const betaStatusResponse = await fetch("https://stagesketch.pygmix.com/beta-status");
assert.equal(betaStatusResponse.status, 200);
const betaStatus = await betaStatusResponse.json();
assert.equal(betaStatus.betaActive, true);
const viewerResponse = await fetch("https://stagesketch.pygmix.com/study?lang=ja");
assert.equal(viewerResponse.status, 200);
assert.match(await viewerResponse.text(), /class="study-brand"/);

const result = {
  status: "verified",
  activeVersion,
  deploymentId: rows[0]?.id || null,
  checkedAt: new Date().toISOString(),
  changedRoutes,
  unchangedRouteCount: Object.keys(liveHashes).length - changedRoutes.length,
  sourceSha256: sha256(liveSource),
  stage: {
    version: "v0.3.6",
    fullscreenIconOnly: true,
    timelineModeIncluded: false,
    stylesheetRevision: 291,
    serviceWorkerCache: "stage-sketch-pwa-v343",
  },
  unauthenticatedStageStatus: stageResponse.status,
  betaActive: betaStatus.betaActive,
  publicViewerStatus: viewerResponse.status,
};
fs.writeFileSync(path.join(releaseDir, "fullscreen-icon-only-live-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
