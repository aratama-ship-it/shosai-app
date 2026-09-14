import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker, { BETA_RELEASE_ASSETS } from "./beta-overlay-worker.js";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, "overlay-manifest.json"), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fallback = [];
const env = {
  SITE_USER: "owner", SITE_PASS: "owner-pass",
  GUEST_ACCOUNTS: JSON.stringify([{ user: "guest", pass: "guest-pass" }]),
  STAGE_BETA_ACTIVE: "true", STUDY_ALLOW_ANONYMOUS: "false", STAGE_USAGE_ENABLED: "true",
  ASSETS: { async fetch(request) {
    fallback.push(new URL(request.url).pathname);
    return new Response(`retained:${new URL(request.url).pathname}`, { headers: { "Content-Type": "text/plain" } });
  } },
};
const auth = (user, pass) => ({ Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` });
const request = (pathname, headers = {}) => new Request(`https://fixture.example${pathname}`, { headers });

for (const item of manifest.textAssets) {
  const body = fs.readFileSync(path.join(repo, item.path));
  assert.equal(sha256(body), item.sha256, item.path);
  for (const route of item.routes) assert.equal(BETA_RELEASE_ASSETS[route][1], body.toString("utf8"), route);
}

const ownerStage = await worker.fetch(request("/stage?lang=ja", auth("owner", "owner-pass")), env, {});
assert.equal(ownerStage.status, 200);
assert.equal(ownerStage.headers.get("X-Stage-Beta-Release"), "selected-five-viewer-20260912");
const stageHtml = await ownerStage.text();
assert.match(stageHtml, /id="stage-share-open"[^>]*data-tablet-icon="共"/);
assert.doesNotMatch(stageHtml, /id="stage-viewer-link-open"/);
assert.match(stageHtml, /id="stage-share-study-title">演者用リンク/);
assert.match(stageHtml, /window\.SHOSAI_RELEASE_SCOPE="beta-20260912"/);

const guestStage = await worker.fetch(request("/stage", auth("guest", "guest-pass")), env, {});
assert.equal(guestStage.status, 200);
assert.doesNotMatch(await guestStage.text(), /<script[^>]+stage-shows\.local\.js/);

const study = await worker.fetch(request("/study"), env, {});
assert.equal(study.status, 200);
assert.equal(study.headers.get("X-Stage-Beta-Release"), "selected-five-viewer-20260912");
const studyHtml = await study.text();
assert.match(studyHtml, /class="study-brand"/);
assert.match(studyHtml, /<span>Stage Sketch<\/span>\s*<span class="study-brand-mode">Viewer<\/span>/);

const usage = await worker.fetch(request("/usage/config", auth("owner", "owner-pass")), env, {});
assert.equal(usage.status, 200);
assert.equal((await usage.json()).enabled, false);

const retained = await worker.fetch(request("/db.js", auth("owner", "owner-pass")), env, {});
assert.equal(await retained.text(), "retained:/db.js");
assert.deepEqual(fallback, ["/db.js"]);

console.log(JSON.stringify({ release: manifest.release, checkedTextAssets: manifest.textAssets.length, checksPassed: true,
  releaseScopeInjected: true, usageDisabled: true, retainedFallback: true }));
