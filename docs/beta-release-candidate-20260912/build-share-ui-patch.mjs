import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(releaseDir, "deployed-base-cc2c485a.js");
const snapshotPath = path.join(releaseDir, "beta-overlay-worker.js");
const outputPath = path.join(releaseDir, "beta-overlay-upload.js");
const manifestPath = path.join(releaseDir, "share-ui-patch-manifest.json");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const expectedBaseSha256 = "bb0fb178657ca00a88c4890b8229fb90ae708960716cbaa9cd312cfa287958e8";
const base = fs.readFileSync(basePath, "utf8");
if (sha256(base) !== expectedBaseSha256) throw new Error("Previously deployed beta bundle no longer matches its recorded SHA-256.");

const snapshot = fs.readFileSync(snapshotPath, "utf8");
const assetsStart = "export const BETA_RELEASE_ASSETS = ";
const assetsEnd = ";\nfunction releaseEnv";
const start = snapshot.indexOf(assetsStart);
const end = snapshot.indexOf(assetsEnd, start);
if (start < 0 || end < 0) throw new Error("Could not read the frozen beta asset snapshot.");
const assets = JSON.parse(snapshot.slice(start + assetsStart.length, end));

const routes = ["/stage", "/stage.html", "/stage-study-owner.js", "/stage-study.css", "/stage-sw.js"];
for (const route of routes) {
  if (!Array.isArray(assets[route]) || assets[route].length !== 3) throw new Error(`Frozen asset is missing: ${route}`);
}

const stage = assets["/stage"][1];
const owner = assets["/stage-study-owner.js"][1];
const css = assets["/stage-study.css"][1];
const sw = assets["/stage-sw.js"][1];
const required = [
  [stage.includes('id="stage-share-open"'), "Share entry is missing."],
  [!stage.includes("stage-viewer-link-open"), "The redundant performer-link entry is still present."],
  [stage.includes('class="stage-share-channel stage-share-live"'), "Realtime share box is missing."],
  [stage.includes('class="stage-share-channel stage-share-study"'), "Performer-link box is missing."],
  [stage.includes('id="stage-share-study-title">演者用リンク'), "Performer-link title is missing."],
  [stage.includes("演者がショーの動きを確認するためのViewerのリンクです。"), "Performer-link description is missing."],
  [owner.includes("stage-share-study-action"), "Performer-link owner controls are missing."],
  [owner.includes("stage-viewer-link-explanations"), "Performer-link explanation accordion is missing."],
  [css.includes(".stage-share-live"), "Realtime share styling is missing."],
  [css.includes(".stage-share-study"), "Performer-link styling is missing."],
  [css.includes("#81bfd4"), "Performer-link blue accent is missing."],
  [sw.includes('stage-sketch-pwa-v338'), "Expected PWA cache version is missing."],
];
for (const [ok, message] of required) if (!ok) throw new Error(message);

const marker = "\nfunction releaseEnv(env) {";
const markerAt = base.indexOf(marker);
if (markerAt < 0 || base.indexOf(marker, markerAt + 1) >= 0) throw new Error("Could not locate the single releaseEnv insertion point.");
const assignments = routes.map((route) => `BETA_RELEASE_ASSETS[${JSON.stringify(route)}] = ${JSON.stringify(assets[route])};`).join("\n");
const banner = [
  "",
  "// Share UI patch built from the already deployed beta bundle.",
  "// Only the owner Stage page, performer-link UI, its styles, and PWA cache are replaced.",
  assignments,
  "",
].join("\n");
const output = `${base.slice(0, markerAt)}${banner}${base.slice(markerAt)}`;
fs.writeFileSync(outputPath, output);

const manifest = {
  status: "prepared-locally-not-deployed",
  release: "selected-five-viewer-share-ui-20260912",
  baseVersion: "cc2c485a-b83f-47b4-ac6d-453ba20f18bb",
  baseSha256: expectedBaseSha256,
  frozenSnapshotSha256: sha256(snapshot),
  patchedRoutes: routes.map((route) => ({ route, source: assets[route][2], bytes: Buffer.byteLength(assets[route][1]), sha256: sha256(assets[route][1]) })),
  uploadBytes: Buffer.byteLength(output),
  uploadSha256: sha256(output),
  excludedConcurrentChange: "stage-sketch.js modified after the selected-five beta deployment and is not included in this patch.",
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ built: true, patchedRoutes: routes, uploadBytes: manifest.uploadBytes, uploadSha256: manifest.uploadSha256 }));
