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
  assert.ok(start >= 0 && end > start, `missing object block: ${marker}`);
  const name = marker.match(/var ([A-Z_]+)/)?.[1];
  return { start, end, value: vm.runInNewContext(`${source.slice(start, end)}\n${name};`, Object.create(null), { timeout: 10_000 }) };
};
const effectiveAssets = (source) => ({
  ...readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {").value,
  ...readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default").value,
});
const routeHashes = (assets) => Object.fromEntries(
  Object.entries(assets).map(([route, entry]) => [route, sha256(entry[1])]).sort(([a], [b]) => a.localeCompare(b)),
);
const sliceBetween = (source, startMarker, endMarker, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${label} block is missing`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `${label} block is not unique`);
  return source.slice(start, end);
};
const oneReplace = (source, needle, replacement, label) => {
  assert.equal(source.split(needle).length, 2, `${label} must occur exactly once`);
  return source.replace(needle, replacement);
};
const oldRevision = (name) => Number(String(manifest.revision[name]).split(" -> ")[0]);
const newRevision = (name) => Number(String(manifest.revision[name]).split(" -> ")[1]);
const revertRef = (source, file, name) => oneReplace(
  source,
  `${file}?v=${newRevision(name)}`,
  `${file}?v=${oldRevision(name)}`,
  `${file} candidate revision`,
);
const stripAssetObjects = (source) => {
  const beta = readObject(source, "var BETA_RELEASE_ASSETS = ", "function releaseEnv(env) {");
  source = `${source.slice(0, beta.start)}/* BETA_RELEASE_ASSETS */\n${source.slice(beta.end)}`;
  const version = readObject(source, "var VERSION_ASSETS = ", "var v036_overlay_default");
  return `${source.slice(0, version.start)}/* VERSION_ASSETS */\n${source.slice(version.end)}`;
};

assert.equal(sha256(baselineSource), manifest.baselineSourceSha256, "baseline Worker changed");
assert.equal(sha256(candidateSource), manifest.candidateSourceSha256, "candidate Worker changed");
assert.equal(stripAssetObjects(candidateSource), stripAssetObjects(baselineSource), "Worker logic outside asset tables changed");

const baselineAssets = effectiveAssets(baselineSource);
const candidateAssets = effectiveAssets(candidateSource);
const baselineHashes = routeHashes(baselineAssets);
const candidateHashes = routeHashes(candidateAssets);
const routes = new Set([...Object.keys(baselineHashes), ...Object.keys(candidateHashes)]);
const changedRoutes = [...routes].filter((route) => baselineHashes[route] !== candidateHashes[route]).sort();
assert.deepEqual(changedRoutes, manifest.changedRoutes, "candidate route changes differ from manifest");
assert.deepEqual(
  Object.fromEntries(changedRoutes.map((route) => [route, candidateHashes[route]])),
  manifest.candidateRouteHashes,
  "candidate route hashes differ from manifest",
);

const htmlBlock = sliceBetween(
  candidateAssets["/stage"][1],
  '<div class="stage-modal-backdrop stage-launch-backup-backdrop"',
  "\n\n<main id=\"view-stage\"",
  "warning HTML",
);
let restoredHtml = oneReplace(candidateAssets["/stage"][1], `${htmlBlock}\n\n`, "", "warning HTML removal");
restoredHtml = revertRef(restoredHtml, "style.css", "style");
restoredHtml = revertRef(restoredHtml, "stage-i18n.js", "i18n");
restoredHtml = revertRef(restoredHtml, "stage-sketch.js", "sketch");
assert.equal(restoredHtml, baselineAssets["/stage"][1], "stage HTML differs beyond warning and cache references");
assert.equal(candidateAssets["/stage.html"][1], candidateAssets["/stage"][1]);

const cssBlock = sliceBetween(
  candidateAssets["/style.css"][1],
  "/* β版を開いた直後の保存データ警告。",
  "/* iPadなどのホーム画面版では",
  "warning CSS",
);
assert.equal(
  oneReplace(candidateAssets["/style.css"][1], cssBlock, "", "warning CSS removal"),
  baselineAssets["/style.css"][1],
  "style CSS differs beyond warning",
);

const i18nBlock = sliceBetween(
  candidateAssets["/stage-i18n.js"][1],
  '    "保存データの控えを取ってください":',
  "    // 題の右、画面上中央に置く保存の注意",
  "warning translations",
);
assert.equal(
  oneReplace(candidateAssets["/stage-i18n.js"][1], i18nBlock, "", "warning translation removal"),
  baselineAssets["/stage-i18n.js"][1],
  "i18n differs beyond warning",
);

let restoredSketch = candidateAssets["/stage-sketch.js"][1];
const elementBlock = sliceBetween(restoredSketch, '    launchBackupWarning: document.getElementById("stage-launch-backup-warning"),', '    lang: document.getElementById("stage-lang"),', "warning elements");
restoredSketch = oneReplace(restoredSketch, elementBlock, "", "warning element removal");
const behaviorBlock = sliceBetween(restoredSketch, '  const MANAGED_BACKUP_WARNING_EXEMPT_USER = "guest1";', "  function updateWhoamiBadge() {", "warning behavior");
restoredSketch = oneReplace(restoredSketch, behaviorBlock, "", "warning behavior removal");
const launchBlock = sliceBetween(restoredSketch, "      const launchWarningShown = openLaunchBackupWarning();", "    } finally {", "warning launch hook");
const baselineTourLaunch = `      if (document.readyState === "loading") {\n        document.addEventListener("DOMContentLoaded", syncStageTourContext);\n      } else {\n        syncStageTourContext();\n      }\n`;
restoredSketch = oneReplace(restoredSketch, launchBlock, baselineTourLaunch, "warning launch hook removal");
assert.equal(restoredSketch, baselineAssets["/stage-sketch.js"][1], "stage-sketch differs beyond warning");
assert.doesNotMatch(behaviorBlock, /localStorage|sessionStorage|setInterval|setTimeout/);
assert.equal((candidateAssets["/stage-sketch.js"][1].match(/openLaunchBackupWarning\(\)/g) || []).length, 2);

let restoredSw = candidateAssets["/stage-sw.js"][1];
restoredSw = oneReplace(restoredSw, `stage-sketch-pwa-v${newRevision("cache")}`, `stage-sketch-pwa-v${oldRevision("cache")}`, "cache revision removal");
restoredSw = revertRef(restoredSw, "style.css", "style");
restoredSw = revertRef(restoredSw, "stage-i18n.js", "i18n");
restoredSw = revertRef(restoredSw, "stage-sketch.js", "sketch");
assert.equal(restoredSw, baselineAssets["/stage-sw.js"][1], "service worker differs beyond warning cache references");

for (const [name, block] of Object.entries({
  warningHtml: htmlBlock,
  warningCss: cssBlock,
  warningElements: elementBlock,
  warningBehavior: behaviorBlock,
  warningLaunch: launchBlock,
  warningI18n: i18nBlock,
})) assert.equal(sha256(block), manifest.insertedBlockHashes[name], `${name} differs from prepared block`);

const checkDir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-warning-check-"));
for (const route of ["/stage-i18n.js", "/stage-sketch.js", "/stage-sw.js"]) {
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
  unchangedRouteCount: routes.size - changedRoutes.length,
  warning: {
    exactJapaneseCopy: candidateAssets["/stage"][1].includes("舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。"),
    guest1OnlyExemption: behaviorBlock.includes('MANAGED_BACKUP_WARNING_EXEMPT_USER = "guest1"'),
    invokedOnceDuringDocumentInitialization: true,
    noPersistenceOrTimer: true,
  },
  compatibility: {
    existingFeatures: "47 unchanged effective routes; changed routes restore byte-for-byte after removing warning blocks and cache reference bumps",
    projectRoundtrip: "project serialization, import, export, autosave, and migration code is byte-identical to the active beta outside the warning block",
    audioContinuity: "audio code and assets are byte-identical to the active beta",
    storageFailureSafety: "storage and recovery code is byte-identical; warning block does not write browser storage",
    updateAndRollback: "active Worker source preserved with SHA-256; candidate service worker keeps existing complete-shell update safeguards",
  },
};
assert.equal(result.warning.exactJapaneseCopy, true);
fs.writeFileSync(path.join(releaseDir, "candidate-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
