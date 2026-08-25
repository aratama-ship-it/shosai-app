import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const bridgeSource = await readFile(new URL("mac-app/Sources/StageSketchBridge.swift", root), "utf8");
const coordinatorSource = await readFile(
  new URL("mac-app/Sources/WebDownloadCoordinator.swift", root),
  "utf8",
);
const appDelegateSource = await readFile(new URL("mac-app/Sources/AppDelegate.swift", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

function loadDownloadModel(bridge = null) {
  const clicks = [];
  const revoked = [];
  const document = {
    createElement(tagName) {
      assert.equal(tagName, "a");
      return {
        href: "",
        download: "",
        click() { clicks.push({ href: this.href, download: this.download }); },
      };
    },
    querySelectorAll() { return []; },
    getElementById() { return null; },
  };
  const window = bridge ? { stageSketchBridge: bridge } : {};
  const context = vm.createContext({
    window,
    document,
    URL: {
      createObjectURL: () => "blob:test-export",
      revokeObjectURL: (url) => revoked.push(url),
    },
    setTimeout: (callback) => { callback(); return 1; },
    clearTimeout() {},
    console,
    Promise,
  });
  vm.runInContext(stageSource, context, { filename: "stage-sketch.js" });
  return { model: window.SHOSAI_STAGE_DOWNLOAD_MODEL, clicks, revoked };
}

test("Macブリッジが無いブラウザではリンクを押し、従来どおり成功として扱う", async () => {
  const { model, clicks, revoked } = loadDownloadModel();

  assert.equal(await model.downloadBlob({}, "show-v1.json"), true);
  assert.deepEqual(clicks, [{ href: "blob:test-export", download: "show-v1.json" }]);
  assert.deepEqual(revoked, ["blob:test-export"]);
});

test("Macで保存先をキャンセルした結果をfalseとして返す", async () => {
  let notifyDecision = null;
  const bridge = {
    onDownloadDestinationDecision(callback) { notifyDecision = callback; },
  };
  const { model, clicks } = loadDownloadModel(bridge);
  const result = model.downloadBlob({}, "show-v1.json");

  assert.equal(typeof notifyDecision, "function");
  assert.equal(clicks.length, 1);
  notifyDecision(false);
  assert.equal(await result, false);
});

test("キャンセル時はlastExportAtとeditsSinceExportを変えない", () => {
  const { model } = loadDownloadModel();
  const state = { lastExportAt: "2026-08-24T12:34:56.000Z", editsSinceExport: 7 };
  const before = { ...state };

  assert.equal(
    model.applyProjectExportOutcome(state, false, "2026-08-25T01:23:45.000Z"),
    false,
  );
  assert.deepEqual(state, before);

  assert.equal(
    model.applyProjectExportOutcome(state, true, "2026-08-25T01:23:45.000Z"),
    true,
  );
  assert.deepEqual(state, {
    lastExportAt: "2026-08-25T01:23:45.000Z",
    editsSinceExport: 0,
  });
});

test("downloadBlobの全呼び出しは保存先の確定結果を待つ", () => {
  const declaration = stageSource.indexOf("async function downloadBlob(");
  assert.ok(declaration >= 0, "downloadBlobの定義が見つからない");
  const callPattern = /downloadBlob\(/g;
  const calls = [];
  let match;
  while ((match = callPattern.exec(stageSource)) !== null) {
    if (match.index !== declaration + "async function ".length) calls.push(match.index);
  }
  assert.equal(calls.length, 7, "downloadBlobの呼び出し数が変わったら全件を再確認する");
  for (const index of calls) {
    assert.match(stageSource.slice(Math.max(0, index - 40), index), /await\s+$/);
  }
});

test("Macの保存先決定は既存ブリッジ通知の形でページへ渡す", () => {
  assert.match(bridgeSource, /func notifyDownloadDestinationDecision\(_ didChooseDestination: Bool\)/);
  assert.match(bridgeSource, /webView\?\.evaluateJavaScript\(/);
  assert.match(bridgeSource, /onDownloadDestinationDecision\(callback\)/);
  assert.match(bridgeSource, /__stageSketchNotifyDownloadDestinationDecision/);
  assert.match(coordinatorSource, /destinationDecisionHandler\(didChooseDestination\)/);
  assert.match(appDelegateSource, /bridge\?\.notifyDownloadDestinationDecision\(didChooseDestination\)/);
  assert.match(i18nSource, /\^書き出しをやめました。\$/);
});
