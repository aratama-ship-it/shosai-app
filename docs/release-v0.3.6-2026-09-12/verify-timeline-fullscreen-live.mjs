import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, "../..");
const deployed = JSON.parse(fs.readFileSync(path.join(releaseDir, "timeline-fullscreen-deployment.json"), "utf8"));
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
const headers = { Authorization: `Bearer ${token}` };
const accountId = "802917588735d979244a77332421e90c";
const baseApi = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const deploymentsResponse = await fetch(`${baseApi}/workers/scripts/shosai-app/deployments`, { headers });
const deploymentsBody = await deploymentsResponse.json();
assert.equal(deploymentsResponse.ok && deploymentsBody.success, true);
const rows = Array.isArray(deploymentsBody.result) ? deploymentsBody.result : deploymentsBody.result?.deployments || [];
const active = rows[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
assert.equal(active, deployed.deployedVersion, "the active production version changed after deployment");

const sourceResponse = await fetch(`${baseApi}/workers/scripts/shosai-app`, { headers });
assert.equal(sourceResponse.ok, true);
const parts = await sourceResponse.formData();
const values = [...parts.values()];
assert.equal(values.length, 1);
assert.equal(typeof values[0], "string");
const source = values[0];
const assetsStart = source.indexOf("var BETA_RELEASE_ASSETS = ");
const releaseEnvAt = source.indexOf("function releaseEnv(env) {", assetsStart);
assert.ok(assetsStart >= 0 && releaseEnvAt > assetsStart);
const assets = vm.runInNewContext(`${source.slice(assetsStart, releaseEnvAt)}\nBETA_RELEASE_ASSETS;`, Object.create(null), { timeout: 10_000 });

const checkedAssets = [];
for (const [route, local] of [
  ["/stage", "stage.html"],
  ["/stage.html", "stage.html"],
  ["/style.css", "style.css"],
  ["/stage-sw.js", "stage-sw.js"],
  ["/stage-timeline.js", "stage-timeline.js"],
  ["/study-frame", "study-frame.html"],
  ["/study-assets/style.css", "style.css"],
]) {
  assert.ok(Array.isArray(assets[route]), `${route} is missing from the live overlay`);
  const localBody = fs.readFileSync(path.join(repo, local), "utf8");
  assert.equal(sha256(assets[route][1]), sha256(localBody), `${route} differs from local ${local}`);
  checkedAssets.push({ route, local, sha256: sha256(localBody) });
}
assert.match(assets["/stage"][1], /class="stage-app-version">v0\.3\.6/);
assert.match(assets["/stage"][1], /class="stage-lang stage-present-icon" id="stage-present-btn"/);
assert.doesNotMatch(assets["/stage"][1], /<span class="stage-control-label">全画面<\/span>/);
assert.match(assets["/stage"][1], /id="stage-workspace-tabs"/);
assert.match(assets["/style.css"][1], /\.stage-history-actions \.stage-present-icon/);
assert.match(assets["/stage-sw.js"][1], /stage-sketch-pwa-v342/);
assert.match(source.slice(0, assetsStart), /GUEST_STAGE_ASSETS[\s\S]*?"\/stage-sketch\.js",\s*"\/stage-timeline\.js",/);

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
  activeVersion: active,
  checkedAt: new Date().toISOString(),
  checkedAssets,
  unauthenticatedStageStatus: stageResponse.status,
  betaActive: betaStatus.betaActive,
  publicViewerStatus: viewerResponse.status,
};
fs.writeFileSync(path.join(releaseDir, "timeline-fullscreen-live-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
