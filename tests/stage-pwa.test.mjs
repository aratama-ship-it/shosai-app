import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("stage-sketch.webmanifest", root), "utf8"));
const buildSource = await readFile(new URL("build_stage.py", root), "utf8");
const pwaSource = await readFile(new URL("stage-pwa.js", root), "utf8");
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");

test("ホーム画面から舞台スケッチ単独版をstandaloneで開く", () => {
  assert.equal(manifest.id, "./stage.html");
  assert.equal(manifest.start_url, "./stage.html");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#191512");
});

test("iPad用メタ情報とホーム画面アイコンを単独版へ組み込む", () => {
  assert.match(buildSource, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(buildSource, /rel="manifest" href="stage-sketch\.webmanifest"/);
  assert.match(buildSource, /rel="apple-touch-icon" href="icons\/stage-sketch-180\.png"/);
  assert.match(buildSource, /rel="icon" href="icons\/stage-sketch-192\.png"/);
  assert.match(buildSource, /stage-pwa\.js\?v=2/);
});

test("iPadのホーム画面版だけ上部の補足文を隠す", () => {
  assert.match(pwaSource, /display-mode: standalone/);
  assert.match(pwaSource, /window\.navigator\.standalone === true/);
  assert.match(pwaSource, /navigator\.maxTouchPoints > 1/);
  assert.match(pwaSource, /classList\.toggle\("stage-pwa-tablet", standalone && tablet\)/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-sketch-kicker/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-storage-caution/);
});

test("使い方・About・感想は上部ではなく設定内にまとめる", () => {
  const prefs = indexSource.match(/<div class="stage-prefs-links"[\s\S]*?<\/div>/)?.[0] || "";
  ["stage-tour-start", "stage-about-open-from-prefs", "stage-feedback"].forEach((id) => {
    assert.match(prefs, new RegExp(`id="${id}"`));
  });
  assert.doesNotMatch(indexSource, /id="stage-about-open"/);
});

test("舞台スケッチ名の右側に小さなアプリ版番号を表示する", () => {
  assert.match(
    indexSource,
    /舞台スケッチ<span class="stage-app-version">v0\.1\.0<\/span><span class="stage-beta">β版<\/span>/,
  );
  assert.match(styleSource, /\.stage-app-version \{[\s\S]*?font-size: 0\.38em;/);
});

test("PWA登録はHTTP上だけで行い、舞台スケッチの保存データには触れない", () => {
  assert.match(pwaSource, /"serviceWorker" in navigator/);
  assert.match(pwaSource, /window\.location\.protocol === "file:"/);
  assert.match(pwaSource, /register\("\.\/stage-sw\.js", \{ scope: "\.\/" \}\)/);
  assert.doesNotMatch(pwaSource + swSource, /localStorage|indexedDB/);
});

test("Service Workerは資料棚など同一サイトの別画面へ介入しない", () => {
  assert.match(swSource, /if \(url\.pathname !== STAGE_PATH\) return/);
  assert.match(swSource, /if \(!APP_SHELL_URLS\.has\(request\.url\)\) return/);
});

test("オフライン用CSSとJSの版は現在のHTML参照と揃う", () => {
  const assetNames = [
    "style.css",
    "stage-venues.js",
    "stage-i18n.js",
    "stage-rehearsal-export.js",
    "stage-sketch.js",
  ];
  assetNames.forEach((name) => {
    const ref = indexSource.match(new RegExp(`${name.replace(".", "\\.")}\\?v=\\d+`));
    assert.ok(ref, `${name} の版番号がindex.htmlにある`);
    assert.ok(swSource.includes(`./${ref[0]}`), `${ref[0]} がオフライン対象にある`);
  });
  assert.ok(swSource.includes("./stage-pwa.js?v=2"));
});

test("標準アイコンとマスク可能アイコンを宣言する", async () => {
  assert.deepEqual(
    manifest.icons.map(({ sizes, purpose }) => [sizes, purpose]),
    [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]],
  );

  const expectedSizes = new Map([
    ["icons/stage-sketch-180.png", [180, 180]],
    ...manifest.icons.map(({ src, sizes }) => [src.replace(/^\.\//, ""), sizes.split("x").map(Number)]),
  ]);
  for (const [path, expected] of expectedSizes) {
    const png = await readFile(new URL(path, root));
    assert.deepEqual([...png.subarray(1, 4)], [80, 78, 71], `${path} がPNGである`);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected, `${path} の寸法`);
  }
});
