import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const [deskHtml, stageHtml, worker, wrangler, plist, macPage] = await Promise.all([
  source("index.html"),
  source("stage.html"),
  source("worker.js"),
  source("wrangler.toml"),
  source("mac-app/Resources/Info.plist"),
  source("mac.html"),
]);

const checks = [
  {
    id: "entrypoints-separated",
    expected: true,
    actual: !deskHtml.includes('id="view-stage"') && stageHtml.includes('id="view-stage"'),
    note: "書斎のHTMLに舞台画面がなく、舞台スケッチの正本がstage.htmlにある",
  },
  {
    id: "stage-domain-is-dedicated",
    expected: true,
    actual: /pattern\s*=\s*"stagesketch\.pygmix\.com"/.test(wrangler),
    note: "現在のカスタムドメインは舞台スケッチ名になっている",
  },
  {
    id: "stage-worker-does-not-serve-desk",
    expected: true,
    actual: !/SITE_USERは書斎全体/.test(worker)
      && !/env\.ASSETS\.fetch\(stageAssetRequest\(request\)\)/.test(worker),
    note: "未達なら、本人認証後に舞台ドメインから書斎資材へ到達できる余地が残る",
  },
  {
    id: "deployment-root-is-not-repository-root",
    expected: true,
    actual: !/^directory\s*=\s*"\."\s*$/m.test(wrangler),
    note: "未達なら、舞台Workerの静的資材候補がリポジトリ全体のまま",
  },
  {
    id: "native-app-has-stage-identity",
    expected: true,
    actual: /<string>舞台スケッチ<\/string>/.test(plist)
      && !/<string>local\.shosai\.desk<\/string>/.test(plist)
      && /stage-sketch-mac\.zip/.test(macPage),
    note: "未達なら、舞台機能中心のMac版が制作の書斎という旧ID・配布名のまま",
  },
];

const result = {
  checkedAt: new Date().toISOString(),
  mode: "read-only local audit",
  pass: checks.filter((item) => item.actual === item.expected).length,
  total: checks.length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass === result.total ? 0 : 2;
