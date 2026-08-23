import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const gitignoreSource = await readFile(new URL(".gitignore", root), "utf8");
const generatorSource = await readFile(new URL("build_stage_shows_local.py", root), "utf8");

/* stage-shows.local.js は .gitignore済みの個人用ファイルなので、テスト環境に
   存在しないことがある。ロジックはスタブへ差し替えて、あるかどうかに
   依存せずに検証する。 */
function runLocalShowsLogic() {
  const start = stageSource.indexOf("function simpleHash(text)");
  const end = stageSource.indexOf("\n  const venue = () =>", start);
  assert.ok(start >= 0 && end > start, "simpleHash〜syncLocalShows のブロックが見つからない");
  const body = stageSource.slice(start, end);

  const calls = { readShows: 0, writeShows: 0 };
  let stored = {};
  const sandbox = {
    window: { SHOSAI_STAGE_LOCAL_SHOWS: [] },
    readShows: () => { calls.readShows += 1; return stored; },
    writeShows: (next) => { calls.writeShows += 1; stored = next; return true; },
    // 実際の正規化はしない。project をそのまま素通しするだけの薄いスタブ。
    prepareProjectImportDocument: (doc) => ({ project: doc.project, venueImport: {} }),
    normalizeState: (raw) => ({ project: JSON.parse(JSON.stringify(raw.project)) }),
    nowIso: (() => {
      let n = 0;
      return () => `t${n++}`;
    })(),
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(`${body}\nthis.__api = { simpleHash, buildLocalShow, syncLocalShows };`, context);
  return { api: sandbox.__api, sandbox, calls, getStored: () => stored, setStored: (v) => { stored = v; } };
}

test("syncLocalShows: 初回はSHOSAI_STAGE_LOCAL_SHOWSの各ショーを棚へ追加する", () => {
  const { api, sandbox, getStored } = runLocalShowsLogic();
  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [
    { project: { id: "local-a", title: "A", scenes: [{ id: "s1" }] } },
    { project: { id: "local-b", title: "B", scenes: [{ id: "s1" }] } },
  ];
  api.syncLocalShows();
  const shows = getStored();
  assert.deepEqual(Object.keys(shows).sort(), ["local-a", "local-b"]);
  assert.equal(shows["local-a"].state.project.title, "A");
  assert.ok(shows["local-a"].localHash);
  assert.equal(shows["local-a"].savedAt, shows["local-a"].localShelvedAt);
});

test("syncLocalShows: 内容が変わっていなければ棚を書き戻さない", () => {
  const { api, sandbox, calls } = runLocalShowsLogic();
  const doc = { project: { id: "local-a", title: "A", scenes: [{ id: "s1" }] } };
  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [doc];
  api.syncLocalShows();
  const before = calls.writeShows;
  api.syncLocalShows(); // 同じ内容でもう一度
  assert.equal(calls.writeShows, before, "変化が無いのに書き戻している");
});

test("syncLocalShows: 一度も開いていなければソース更新で新版に差し替える", () => {
  const { api, sandbox, getStored } = runLocalShowsLogic();
  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [
    { project: { id: "local-a", title: "旧題", scenes: [{ id: "s1" }] } },
  ];
  api.syncLocalShows();
  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [
    { project: { id: "local-a", title: "新題", scenes: [{ id: "s1" }] } },
  ];
  api.syncLocalShows();
  assert.equal(getStored()["local-a"].state.project.title, "新題");
});

test("syncLocalShows: 一度開いた（savedAtが動いた）ショーはソース更新でも上書きしない", () => {
  const { api, sandbox, getStored, setStored } = runLocalShowsLogic();
  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [
    { project: { id: "local-a", title: "旧題", scenes: [{ id: "s1" }] } },
  ];
  api.syncLocalShows();
  // 本人が開いた（applyLoadedState→shelveCurrentでsavedAtが動いた）ことを模す。
  const shows = getStored();
  shows["local-a"].savedAt = "opened-later";
  shows["local-a"].state.project.title = "本人が書き換えた題";
  setStored(shows);

  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [
    { project: { id: "local-a", title: "新題", scenes: [{ id: "s1" }] } },
  ];
  api.syncLocalShows();
  assert.equal(getStored()["local-a"].state.project.title, "本人が書き換えた題",
    "本人の編集を新版で上書きしてしまっている");
});

test("syncLocalShows: 同じidの既存ショー（localHash無し=自作/見本）には触らない", () => {
  const { api, sandbox, getStored, setStored } = runLocalShowsLogic();
  setStored({
    "local-a": { savedAt: "x", state: { project: { id: "local-a", title: "本人の別ショー" } } },
  });
  sandbox.window.SHOSAI_STAGE_LOCAL_SHOWS = [
    { project: { id: "local-a", title: "同梱側", scenes: [{ id: "s1" }] } },
  ];
  api.syncLocalShows();
  assert.equal(getStored()["local-a"].state.project.title, "本人の別ショー");
});

test("stage-sketch.js: syncLocalShowsが起動時に一度だけ呼ばれる", () => {
  const calls = stageSource.match(/\bsyncLocalShows\(\);/g) || [];
  assert.equal(calls.length, 1);
  assert.match(stageSource, /shelveSeamGardenSample\(\);\s*\n\s*syncLocalShows\(\);/);
});

test("index.html / stage.html: stage-shows.local.js はstage-sketch.jsより先に読み込む", () => {
  [indexSource, stageHtml].forEach((html) => {
    const localAt = html.indexOf("stage-shows.local.js?v=");
    const sketchAt = html.indexOf("stage-sketch.js?v=");
    assert.ok(localAt >= 0 && sketchAt >= 0, "スクリプトタグが見つからない");
    assert.ok(localAt < sketchAt, "stage-shows.local.js が stage-sketch.js より後に読み込まれている");
  });
});

test(".gitignore: stage-shows.local.js は公開リポジトリに含めない", () => {
  assert.match(gitignoreSource, /^stage-shows\.local\.js$/m);
});

async function jsonFilesUnder(dirUrl, recursive) {
  let entries = [];
  try {
    entries = await readdir(dirUrl, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const out = [];
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dirUrl);
    if (entry.isDirectory()) {
      if (recursive) out.push(...await jsonFilesUnder(child, true));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(child);
    }
  }
  return out;
}

async function expandScanGlob(pattern, workspaceRoot) {
  const recursive = pattern.includes("**/");
  const base = pattern.split(recursive ? "**/" : "*")[0];
  return jsonFilesUnder(new URL(base, workspaceRoot), recursive);
}

test("build_stage_shows_local.py: SCAN_GLOBSの各JSONが読め、採用project.idが一意", async () => {
  const block = generatorSource.match(/SCAN_GLOBS = \[([\s\S]*?)\]/);
  assert.ok(block, "SCAN_GLOBS がある");
  const patterns = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(patterns.length >= 3, "SCAN_GLOBSが少なすぎる（読み取りに失敗した可能性）");
  const excludes = [...generatorSource.matchAll(/"([^"]+)":\s*"[^"]+"/g)].map((m) => m[1]);
  const excludeIds = new Set(excludes);
  const paths = [];
  const pathKeys = new Set();
  const workspaceRoot = new URL("../", root); // build_stage_shows_local.py の ROOT は shosai-app の一つ上
  for (const pattern of patterns) {
    const found = await expandScanGlob(pattern, workspaceRoot);
    for (const path of found) {
      const key = path.href;
      if (pathKeys.has(key)) continue;
      pathKeys.add(key);
      paths.push(path);
    }
  }
  assert.ok(paths.length >= 10, "SCAN_GLOBSの対象JSONが少なすぎる（読み取りに失敗した可能性）");
  const picked = new Map();
  for (const path of paths) {
    let doc;
    const text = await readFile(path, "utf8");
    try {
      doc = JSON.parse(text);
    } catch (_) {
      continue;
    }
    if (!doc || !doc.project || !Array.isArray(doc.project.scenes) || !doc.project.id) continue;
    if (excludeIds.has(doc.project.id)) continue;
    const info = await stat(path);
    const current = picked.get(doc.project.id);
    if (!current || info.mtimeMs > current.mtimeMs) {
      picked.set(doc.project.id, { path, mtimeMs: info.mtimeMs });
    }
  }
  assert.equal(picked.size, new Set(picked.keys()).size, "採用project.idが重複している");
  assert.ok(picked.size >= 10, "採用対象のショーJSONが少なすぎる");
});
