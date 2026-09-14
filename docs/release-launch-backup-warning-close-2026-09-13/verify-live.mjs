import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const deployment = JSON.parse(fs.readFileSync(path.join(releaseDir, "deployment-result.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, "manifest.json"), "utf8"));
const candidateSource = fs.readFileSync(path.join(releaseDir, "candidate/stage-warning-upload.js"), "utf8");
const accountId = "802917588735d979244a77332421e90c";
const scriptName = "shosai-app";
const baseApi = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
const publicBase = "https://stagesketch.pygmix.com";
const token = fs.readFileSync(path.join(os.homedir(), ".wrangler/config/default.toml"), "utf8")
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Saved Wrangler OAuth token was not found.");
const cloudflareHeaders = { Authorization: `Bearer ${token}` };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rows = (value) => Array.isArray(value) ? value : value?.deployments || [];
const activeVersion = (value) => rows(value)[0]?.versions?.find((version) => version.percentage === 100)?.version_id;
const readObject = (source, marker, nextMarker) => {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, `missing asset table: ${marker}`);
  const name = marker.match(/var ([A-Z_]+)/)?.[1];
  return vm.runInNewContext(`${source.slice(start, end)}\n${name};`, Object.create(null), { timeout: 10_000 });
};
const effectiveAssets = (source) => ({
  ...readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {"),
  ...readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default"),
});

const deploymentsResponse = await fetch(`${baseApi}/workers/scripts/${scriptName}/deployments`, { headers: cloudflareHeaders });
const deploymentsBody = await deploymentsResponse.json();
assert.equal(deploymentsResponse.ok && deploymentsBody.success, true, "could not read live deployments");
assert.equal(activeVersion(deploymentsBody.result), deployment.deployedVersion, "deployed version is not receiving 100 percent traffic");
assert.equal(rows(deploymentsBody.result)[0]?.id || null, deployment.deploymentId, "active deployment differs");

const sourceResponse = await fetch(`${baseApi}/workers/scripts/${scriptName}`, { headers: cloudflareHeaders });
assert.equal(sourceResponse.ok, true, "could not read live Worker source");
const parts = await sourceResponse.formData();
const entries = [...parts.entries()];
assert.equal(entries.length, 1);
assert.equal(typeof entries[0][1], "string");
const liveSource = entries[0][1];
assert.equal(sha256(liveSource), manifest.candidateSourceSha256, "live Worker source hash differs from candidate");
assert.equal(liveSource, candidateSource, "live Worker source bytes differ from candidate");
const liveAssets = effectiveAssets(liveSource);
for (const [route, expected] of Object.entries(manifest.candidateRouteHashes)) {
  assert.equal(sha256(liveAssets[route][1]), expected, `live asset table differs: ${route}`);
}

const rosterPath = "/Users/arata/shosai-guest-accounts/guest-accounts-latest.csv";
assert.equal(fs.existsSync(rosterPath), true, "private guest roster is unavailable");
const python = [
  "import csv,json,sys",
  "rows=list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')))",
  "def val(row,*names):",
  "  for name in names:",
  "    if name in row and row[name]: return row[name]",
  "  return ''",
  "out=[]",
  "for row in rows:",
  "  user=val(row,'username','user','利用者名','ユーザー名','アカウント')",
  "  if user in ('guest1','guest2'):",
  "    out.append({'user':user,'password':val(row,'password','pass','パスワード')})",
  "print(json.dumps(out))",
].join("\n");
const credentials = JSON.parse(execFileSync("python3", ["-c", python, rosterPath], { encoding: "utf8" }));
const credentialFor = (user) => {
  const item = credentials.find((entry) => entry.user === user);
  assert.ok(item?.password, `private credential is missing for ${user}`);
  return `Basic ${Buffer.from(`${item.user}:${item.password}`).toString("base64")}`;
};
const guest2Authorization = credentialFor("guest2");
const guest1Authorization = credentialFor("guest1");

const publicAssetChecks = [];
for (const route of manifest.changedRoutes) {
  const response = await fetch(`${publicBase}${route}?verify=${deployment.deploymentId}`, {
    headers: { Authorization: guest2Authorization, "Cache-Control": "no-cache" },
    redirect: "follow",
  });
  assert.equal(response.status, 200, `live route returned ${response.status}: ${route}`);
  const body = await response.text();
  const actual = sha256(body);
  assert.equal(actual, manifest.candidateRouteHashes[route], `served bytes differ: ${route}`);
  publicAssetChecks.push({ route, status: response.status, sha256: actual });
}

const betaStatusResponse = await fetch(`${publicBase}/beta-status?verify=${deployment.deploymentId}`, { cache: "no-store" });
assert.equal(betaStatusResponse.status, 200);
const betaStatus = await betaStatusResponse.json();
assert.equal(betaStatus.betaActive, true);

const browser = await chromium.launch({ headless: true });
const browserErrors = [];
const regularContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { Authorization: guest2Authorization },
});
const regular = await regularContext.newPage();
regular.on("pageerror", (error) => browserErrors.push(String(error)));
await regular.goto(`${publicBase}/stage?lang=ja&verify=${deployment.deploymentId}`, { waitUntil: "networkidle" });
const warning = regular.locator("#stage-launch-backup-warning");
await warning.waitFor({ state: "visible" });
assert.equal(await regular.locator("#stage-launch-backup-lead").innerText(), "舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。");
assert.equal(await regular.locator("#stage-tour").isVisible(), false);
const closeBox = await regular.locator("#stage-launch-backup-close").boundingBox();
assert.ok(closeBox && closeBox.width >= 44 && closeBox.height >= 44);
await regular.locator("#stage-launch-backup-close").click();
assert.equal(await warning.isVisible(), false, "warning did not close with top-right button");
await regular.reload({ waitUntil: "networkidle" });
assert.equal(await warning.isVisible(), true, "warning did not return on fresh launch");
await regular.locator("#stage-launch-backup-backdrop").click({ position: { x: 5, y: 5 } });
assert.equal(await warning.isVisible(), false, "warning did not close after outside click");
await regular.reload({ waitUntil: "networkidle" });
assert.equal(await warning.isVisible(), true, "warning did not return after outside-dismiss and reload");
await regularContext.close();

const exemptContext = await browser.newContext({ extraHTTPHeaders: { Authorization: guest1Authorization } });
const exempt = await exemptContext.newPage();
await exempt.goto(`${publicBase}/stage?lang=ja&verify=${deployment.deploymentId}`, { waitUntil: "networkidle" });
assert.equal(await exempt.locator("#stage-launch-backup-warning").isVisible(), false, "guest1 was not exempt");
await exemptContext.close();
await browser.close();
assert.deepEqual(browserErrors, []);

const result = {
  status: "verified",
  checkedAt: new Date().toISOString(),
  activeVersion: deployment.deployedVersion,
  deploymentId: deployment.deploymentId,
  liveSourceSha256: sha256(liveSource),
  publicAssetChecks,
  betaActive: betaStatus.betaActive,
  authenticatedBrowser: {
    regularUserWarningOnLaunch: true,
    closeButtonDismisses: true,
    backdropDismisses: true,
    closeTargetAtLeast44px: true,
    returnsOnFreshLaunch: true,
    guest1Exempt: true,
    errors: browserErrors,
  },
};
fs.writeFileSync(path.join(releaseDir, "live-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
