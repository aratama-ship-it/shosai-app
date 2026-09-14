import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const candidateDir = path.join(releaseDir, "candidate");
const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, "manifest.json"), "utf8"));
const baselineSource = fs.readFileSync(path.join(releaseDir, "baseline-worker.js"), "utf8");
const candidateSource = fs.readFileSync(path.join(candidateDir, "stage-warning-upload.js"), "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readObject = (source, marker, nextMarker) => {
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, "missing object block: " + marker);
  const name = marker.match(/var ([A-Z_]+)/)?.[1];
  return { start, end, value: vm.runInNewContext(source.slice(start, end) + "\n" + name + ";", Object.create(null), { timeout: 10_000 }) };
};
const effectiveAssets = (source) => ({
  ...readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {").value,
  ...readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default").value,
});
const stripAssetObjects = (source) => {
  const beta = readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {");
  source = source.slice(0, beta.start) + "/* BETA_RELEASE_ASSETS */\n" + source.slice(beta.end);
  const version = readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default");
  return source.slice(0, version.start) + "/* VERSION_ASSETS */\n" + source.slice(version.end);
};
const oneReplace = (source, needle, replacement, label) => {
  assert.equal(source.split(needle).length, 2, label + " marker must occur exactly once");
  return source.replace(needle, replacement);
};
const oldRevision = (name) => Number(String(manifest.revision[name]).split(" -> ")[0]);
const newRevision = (name) => Number(String(manifest.revision[name]).split(" -> ")[1]);
const revertRef = (source, file, name) => oneReplace(
  source,
  file + "?v=" + newRevision(name),
  file + "?v=" + oldRevision(name),
  file + " candidate revision",
);

assert.equal(sha256(baselineSource), manifest.baselineSourceSha256, "baseline Worker changed");
assert.equal(sha256(candidateSource), manifest.candidateSourceSha256, "candidate Worker changed");
assert.equal(stripAssetObjects(candidateSource), stripAssetObjects(baselineSource), "Worker logic outside asset tables changed");
const baselineAssets = effectiveAssets(baselineSource);
const candidateAssets = effectiveAssets(candidateSource);
const routeHash = (assets, route) => sha256(assets[route][1]);
const allRoutes = new Set([...Object.keys(baselineAssets), ...Object.keys(candidateAssets)]);
const changedRoutes = [...allRoutes].filter((route) => routeHash(baselineAssets, route) !== routeHash(candidateAssets, route)).sort();
assert.deepEqual(changedRoutes, manifest.changedRoutes);
assert.deepEqual(
  Object.fromEntries(changedRoutes.map((route) => [route, routeHash(candidateAssets, route)])),
  manifest.candidateRouteHashes,
);

const closeButton = '    <button type="button" class="stage-launch-backup-close" id="stage-launch-backup-close"\n'
  + '            aria-label="この知らせを閉じる">×</button>\n';
let restoredHtml = oneReplace(candidateAssets["/stage"][1], closeButton, "", "close button");
restoredHtml = revertRef(restoredHtml, "style.css", "style");
restoredHtml = revertRef(restoredHtml, "stage-sketch.js", "sketch");
assert.equal(restoredHtml, baselineAssets["/stage"][1], "stage HTML differs beyond close control and references");
assert.equal(candidateAssets["/stage.html"][1], candidateAssets["/stage"][1]);

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
let restoredCss = oneReplace(candidateAssets["/style.css"][1], closeCss, "", "close styles");
restoredCss = oneReplace(restoredCss, ".stage-launch-backup-head h2 {\n  flex: 1 1 auto;\n", ".stage-launch-backup-head h2 {\n", "title flex");
assert.equal(restoredCss, baselineAssets["/style.css"][1], "CSS differs beyond close control");

let restoredSketch = candidateAssets["/stage-sketch.js"][1];
restoredSketch = oneReplace(
  restoredSketch,
  '    launchBackupClose: document.getElementById("stage-launch-backup-close"),\n',
  "",
  "close binding",
);
const handlers = '  if (els.launchBackupClose) {\n'
  + '    els.launchBackupClose.addEventListener("click", () => closeLaunchBackupWarning(true));\n'
  + '  }\n'
  + '  if (els.launchBackupBackdrop) {\n'
  + '    els.launchBackupBackdrop.addEventListener("click", () => closeLaunchBackupWarning(true));\n'
  + '  }\n';
restoredSketch = oneReplace(restoredSketch, handlers, "", "dismiss handlers");
restoredSketch = oneReplace(
  restoredSketch,
  "    const actions = [els.launchBackupClose, els.launchBackupExport, els.launchBackupContinue].filter(Boolean);",
  "    const actions = [els.launchBackupExport, els.launchBackupContinue].filter(Boolean);",
  "focus trap",
);
assert.equal(restoredSketch, baselineAssets["/stage-sketch.js"][1], "stage-sketch differs beyond close behavior");

let restoredSw = candidateAssets["/stage-sw.js"][1];
restoredSw = oneReplace(
  restoredSw,
  "stage-sketch-pwa-v" + newRevision("cache"),
  "stage-sketch-pwa-v" + oldRevision("cache"),
  "cache revision",
);
restoredSw = revertRef(restoredSw, "style.css", "style");
restoredSw = revertRef(restoredSw, "stage-sketch.js", "sketch");
assert.equal(restoredSw, baselineAssets["/stage-sw.js"][1], "service worker differs beyond cache references");

assert.match(candidateAssets["/stage"][1], /id="stage-launch-backup-close"[\s\S]*?aria-label="この知らせを閉じる"/);
assert.match(candidateAssets["/style.css"][1], /\.stage-launch-backup-close \{[\s\S]*?width: 44px;[\s\S]*?height: 44px/);
assert.match(candidateAssets["/stage-sketch.js"][1], /launchBackupBackdrop\.addEventListener\("click"/);
assert.match(candidateAssets["/stage-sketch.js"][1], /MANAGED_BACKUP_WARNING_EXEMPT_USER = "guest1"/);
assert.doesNotMatch(handlers, /localStorage|sessionStorage|setInterval|setTimeout/);

const checkDir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-warning-close-check-"));
for (const route of ["/stage-sketch.js", "/stage-sw.js"]) {
  const output = path.join(checkDir, route.slice(1));
  fs.writeFileSync(output, candidateAssets[route][1]);
  execFileSync(process.execPath, ["--check", output], { stdio: "inherit" });
}
execFileSync(process.execPath, ["--check", path.join(candidateDir, "stage-warning-upload.js")], { stdio: "inherit" });

const result = {
  status: "verified",
  checkedAt: new Date().toISOString(),
  baselineVersion: manifest.baselineVersion,
  baselineSourceSha256: manifest.baselineSourceSha256,
  candidateSourceSha256: manifest.candidateSourceSha256,
  changedRoutes,
  unchangedRouteCount: allRoutes.size - changedRoutes.length,
  warning: {
    exactJapaneseCopyPreserved: candidateAssets["/stage"][1].includes("舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。"),
    guest1OnlyExemptionPreserved: candidateAssets["/stage-sketch.js"][1].includes('MANAGED_BACKUP_WARNING_EXEMPT_USER = "guest1"'),
    closeButtonAdded: true,
    backdropDismissAdded: true,
    launchSemanticsUnchanged: true,
  },
  compatibility: {
    existingFeatures: "48 unchanged effective routes; five routes restore byte-for-byte after removing close controls and cache reference bumps",
    projectRoundtrip: "project serialization, import, export, autosave, and migration code is byte-identical to the active beta",
    audioContinuity: "audio code and assets are byte-identical to the active beta",
    storageFailureSafety: "storage and recovery code is byte-identical; dismiss handlers do not write browser storage",
    updateAndRollback: "active Worker source preserved with SHA-256; candidate only advances changed asset and PWA cache references",
  },
};
assert.equal(result.warning.exactJapaneseCopyPreserved, true);
fs.writeFileSync(path.join(releaseDir, "candidate-verification.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
