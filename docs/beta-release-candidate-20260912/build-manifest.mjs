import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(releaseDir, "../..");
const read = (relative) => fs.readFileSync(path.join(repo, relative));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const stageSw = read("stage-sw.js").toString("utf8");
const appShellBlock = stageSw.match(/const APP_SHELL = \[([\s\S]*?)\n\];/);
if (!appShellBlock) throw new Error("stage-sw.js の APP_SHELL を読めませんでした。");

const appShell = [...appShellBlock[1].matchAll(/"\.\/([^"?]+)(?:\?[^"\n]+)?"/g)]
  .map((match) => match[1]);

const viewerAssets = [
  "study.html",
  "study-frame.html",
  "stage-study-viewer.js",
  "stage-study-frame.js",
  "stage-study-pen.js",
  "stage-study-private.js",
  "stage-study-sync.js",
  "stage-study-continuity.js",
  "stage-study-sticky.js",
  "stage-study-phone.css",
  "stage-study-phone.js",
  "stage-study-navigation.css",
  "stage-study-navigation.js",
];

const workerModules = [
  "worker.js",
  "session-room.js",
  "study-links.js",
  "study-reader-auth.js",
  "study-reader-api.js",
  "study-reader-account.js",
  "usage-metrics.js",
  "usage-admin-page.js",
];

// 本人用HTMLだけが読む個人ショー。ゲスト用HTMLからWorkerがscriptタグを外し、
// URLへの直接アクセスも拒否するため、PWA shellや公開Viewer資源には入れない。
const ownerOnlyRetainedAssets = ["stage-shows.local.js"];

const supportingAssets = [
  "index.html",
  "stage-sw.js",
  ...fs.readdirSync(path.join(repo, "manual"), { recursive: true })
    .filter((relative) => fs.statSync(path.join(repo, "manual", relative)).isFile())
    .map((relative) => `manual/${relative}`),
];

const browserAssets = [...new Set([...appShell, ...viewerAssets, ...supportingAssets])].sort();
const allInputs = [...new Set([...browserAssets, ...workerModules, ...ownerOnlyRetainedAssets])].sort();

const missing = allInputs.filter((relative) => !fs.existsSync(path.join(repo, relative)));
if (missing.length) throw new Error(`配信候補に存在しないファイルがあります: ${missing.join(", ")}`);

function localReferences(relative) {
  const source = read(relative).toString("utf8");
  return [...source.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:[a-z]+:|\/\/|#|data:)/i.test(value))
    .map((value) => value.split(/[?#]/, 1)[0])
    .filter(Boolean)
    .map((value) => path.posix.normalize(path.posix.join(path.posix.dirname(relative), value)));
}

const checkedHtml = ["stage.html", "study.html", "study-frame.html"];
const missingHtmlReferences = [];
const virtualRoutes = [];
for (const html of checkedHtml) {
  for (const reference of localReferences(html)) {
    if (reference === "study") continue;
    if (ownerOnlyRetainedAssets.includes(reference)) continue;
    if (reference.startsWith("study-assets/")) {
      const source = reference.replace(/^study-assets\//, "");
      virtualRoutes.push({ route: `/${reference}`, source });
      if (!browserAssets.includes(source)) missingHtmlReferences.push({ html, reference, source });
      continue;
    }
    if (!browserAssets.includes(reference)) missingHtmlReferences.push({ html, reference });
  }
}
if (missingHtmlReferences.length) {
  throw new Error(`HTML参照が配信候補から漏れています: ${JSON.stringify(missingHtmlReferences)}`);
}

const inputs = allInputs.map((relative) => {
  const body = read(relative);
  return {
    path: relative,
    role: workerModules.includes(relative)
      ? "worker-module"
      : ownerOnlyRetainedAssets.includes(relative) ? "owner-only-retained-asset" : "browser-asset",
    bytes: body.byteLength,
    sha256: sha256(body),
  };
});

const manifest = {
  releaseCandidate: "stage-sketch-beta-selected-five-viewer-20260912",
  status: "local-candidate-not-deployed",
  purpose: "本人が選んだ本体5項目と演者向けViewerを、新旧が混在しない一つの依存閉包として固定する。",
  selectedFeatures: [
    "パネル配置、折りたたみ、表示バランスの改善",
    "正面図・平面図・客席視点の切替",
    "シーン作成・複製、プロジェクト・背景設定",
    "Undo／Redo、複数選択・整列",
    "会場・客席・広い会場への対応",
    "演者向けViewerリンク",
  ],
  deploymentBoundary: {
    include: ["選択済みの本体5項目", "演者向けViewer", "Viewerに必要なWorker経路"],
    disabledForThisCandidate: [
      "照明モーションの新規作成入口",
      "ミュージックシンクの入口",
      "マスク小道具の新規作成入口",
      "利用状況計測",
    ],
    excluded: ["公開体験版・LP", "MCPサーバー", "device-preview", "docs内の判断資料"],
  },
  dependencyNote: "stage-sketch.js、style.css、worker.jsは複数機能を含むため、未選択機能の互換コードも依存物として同梱する。ただしSTAGE_RELEASE_SCOPEとSTAGE_USAGE_ENABLEDで利用者向け入口と計測を無効化する。",
  requiredLiveConfiguration: {
    STAGE_BETA_ACTIVE: "true",
    STAGE_RELEASE_SCOPE: "beta-20260912",
    STUDY_ALLOW_ANONYMOUS: "true",
    STAGE_USAGE_ENABLED: "false",
    durableObjects: ["SESSION_ROOMS", "STUDY_LINKS"],
    migrationRule: "既に適用済みのSTUDY_LINKS移行を再利用し、UsageMetricsとReaderAccountの新規移行はこの便に含めない。",
  },
  safeguards: [
    "stage.html が参照するAPP_SHELLを全件同じ候補へ含める",
    "study.htmlとstudy-frame.htmlのローカル参照漏れを生成時に停止する",
    "配信前後に各ファイルのSHA-256を比較する",
    "配信HTMLへbeta-20260912スコープが注入され、未選択の入口が表示されないことを確認する",
    "オーナーとゲストの実ログイン確認が終わるまで公開しない",
  ],
  counts: {
    browserAssets: browserAssets.length,
    workerModules: workerModules.length,
    ownerOnlyRetainedAssets: ownerOnlyRetainedAssets.length,
    totalInputs: inputs.length,
  },
  aggregateSha256: sha256(inputs.map((item) => `${item.path}\0${item.sha256}`).join("\n")),
  virtualRoutes: [...new Map(virtualRoutes.map((item) => [item.route, item])).values()],
  inputs,
};

fs.writeFileSync(path.join(releaseDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  counts: manifest.counts,
  aggregateSha256: manifest.aggregateSha256,
}));
