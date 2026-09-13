import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("stage.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const bridgeSource = await readFile(new URL("mac-app/Sources/StageSketchBridge.swift", root), "utf8");
const coordinatorSource = await readFile(
  new URL("mac-app/Sources/WebDownloadCoordinator.swift", root),
  "utf8",
);
const appDelegateSource = await readFile(new URL("mac-app/Sources/AppDelegate.swift", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

function loadDownloadModel(bridge = null, windowAdditions = {}) {
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
  const window = { ...windowAdditions };
  if (bridge) window.stageSketchBridge = bridge;
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

test("保存場所の選択に非対応なら従来のダウンロード先へ書き出す", async () => {
  const { model, clicks } = loadDownloadModel();

  assert.equal(model.hasProjectSaveLocationPicker(), false);
  assert.equal(await model.saveProjectBlob({}, "show-v1.json"), true);
  assert.deepEqual(clicks, [{ href: "blob:test-export", download: "show-v1.json" }]);
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

test("対応ブラウザでは純正の保存画面で場所を選びJSONを書き込む", async () => {
  const writes = [];
  let closed = false;
  let pickerOptions = null;
  const showSaveFilePicker = async (options) => {
    pickerOptions = options;
    return {
      async createWritable() {
        return {
          async write(value) { writes.push(value); },
          async close() { closed = true; },
        };
      },
    };
  };
  const { model, clicks } = loadDownloadModel(null, { showSaveFilePicker });
  const blob = { sample: true };

  assert.equal(model.hasProjectSaveLocationPicker(), true);
  assert.equal(await model.saveProjectBlob(blob, "show-v1.json"), true);
  assert.equal(pickerOptions.suggestedName, "show-v1.json");
  assert.equal(pickerOptions.types[0].description, "JSON");
  assert.deepEqual(Array.from(pickerOptions.types[0].accept["application/json"]), [".json"]);
  assert.deepEqual(writes, [blob]);
  assert.equal(closed, true);
  assert.deepEqual(clicks, []);
});

test("純正の保存画面をキャンセルしても通常ダウンロードへ進まない", async () => {
  const abort = new Error("cancelled");
  abort.name = "AbortError";
  const { model, clicks } = loadDownloadModel(null, {
    async showSaveFilePicker() { throw abort; },
  });

  assert.equal(await model.saveProjectBlob({}, "show-v1.json"), false);
  assert.deepEqual(clicks, []);
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

test("ショーを書き出す前にファイル名を確認し、ショー名は変更しない", () => {
  const { model } = loadDownloadModel();

  assert.equal(
    model.defaultProjectExportBasename({ title: "夏 の 公演", versionLabel: "v2" }),
    "夏_の_公演-v2",
  );
  assert.equal(model.normaliseProjectExportFilename(" 夏の/公演.json "), "夏の_公演.json");
  assert.equal(model.normaliseProjectExportFilename("memo"), "memo.json");
  assert.equal(model.normaliseProjectExportFilename(" .json "), "show-v1.json");

  assert.match(indexSource, /id="stage-project-export-modal"[^>]*role="dialog"/);
  assert.match(indexSource, /id="stage-project-export-name"[^>]*class="stage-text-input"[^>]*maxlength="80"[^>]*required/);
  assert.match(indexSource, /この名前は書き出すファイルだけに使います。ショー名は変わりません。/);
  assert.match(indexSource, /id="stage-project-export-cancel">キャンセル<\/button>/);
  assert.match(indexSource, /stage-venue-editor-actions stage-project-export-actions/);
  assert.match(indexSource, /id="stage-project-export-destination"/);
  assert.match(styleSource, /\.stage-project-export-actions > button \{[\s\S]*?flex: 1 1 0;[\s\S]*?min-height: 44px;[\s\S]*?font-size: 14px;/);
  assert.match(stageSource, /function exportProject\(\) \{\s*openProjectExportName\(\);\s*\}/);
  assert.match(stageSource, /projectExportForm\.addEventListener\("submit"/);
  assert.match(stageSource, /openVenueExportConfirmOrWrite\(filename\)/);
  assert.match(stageSource, /await saveProjectBlob\(blob, filename\)/);
});

test("⌘SとCtrl+Sは文字入力中も書き出しの名前確認を開く", () => {
  const { model } = loadDownloadModel();
  assert.equal(model.isProjectExportShortcut({ key: "s", metaKey: true }), true);
  assert.equal(model.isProjectExportShortcut({ key: "S", ctrlKey: true }), true);
  assert.equal(model.isProjectExportShortcut({ key: "s" }), false);
  assert.equal(model.isProjectExportShortcut({ key: "s", metaKey: true, shiftKey: true }), false);
  assert.equal(model.isProjectExportShortcut({ key: "s", ctrlKey: true, altKey: true }), false);

  assert.match(indexSource, /id="stage-export-json"[^>]*aria-keyshortcuts="Meta\+S Control\+S"/);
  assert.match(stageSource, /\["ショーを書き出す", "⌘S"\]/);
  const shortcutHandler = stageSource.match(/\/\* 保存に近い操作として⌘S／Ctrl\+S[\s\S]*?document\.addEventListener\("keydown", \(event\) => \{[\s\S]*?\n  \}\);/);
  assert.ok(shortcutHandler, "書き出しショートカットの処理がある");
  assert.match(shortcutHandler[0], /event\.preventDefault\(\)/);
  assert.match(shortcutHandler[0], /fullscreenModalOpen\(\)/);
  assert.match(shortcutHandler[0], /exportProject\(\)/);
  assert.doesNotMatch(shortcutHandler[0], /isTyping\(/);
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
