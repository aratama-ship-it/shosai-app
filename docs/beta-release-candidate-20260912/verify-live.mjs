import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const deployed = JSON.parse(fs.readFileSync(path.join(releaseDir, "deployment-result.json"), "utf8"));
const accountId = "802917588735d979244a77332421e90c";
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/shosai-app/deployments`, {
  headers: { Authorization: `Bearer ${token}` },
});
const body = await response.json();
assert.equal(response.ok && body.success, true, "Cloudflare deployment lookup failed");
const rows = Array.isArray(body.result) ? body.result : body.result?.deployments || [];
const active = rows[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
assert.equal(active, deployed.deployedVersion, "The active beta version changed after deployment");

const study = await fetch("https://stagesketch.pygmix.com/study?lang=ja");
assert.equal(study.status, 200);
assert.equal(study.headers.get("X-Stage-Beta-Release"), "selected-five-viewer-20260912");
const studyHtml = await study.text();
assert.match(studyHtml, /<span>Stage Sketch<\/span>\s*<span class="study-brand-mode">Viewer<\/span>/);

const studyCss = await fetch("https://stagesketch.pygmix.com/study-assets/style.css?v=231");
assert.equal(studyCss.status, 200);
assert.equal(studyCss.headers.get("X-Stage-Beta-Release"), "selected-five-viewer-20260912");

const stage = await fetch("https://stagesketch.pygmix.com/stage?lang=ja", { redirect: "manual" });
assert.equal(stage.status, 401, "Unauthenticated Stage editor must stay protected");

const status = await fetch("https://stagesketch.pygmix.com/beta-status");
assert.equal(status.status, 200);
assert.equal((await status.json()).betaActive, true);

console.log(JSON.stringify({
  liveVerified: true,
  activeVersion: active,
  publicViewer: 200,
  protectedStage: 401,
  betaActive: true,
  releaseMarker: "selected-five-viewer-20260912",
}));
