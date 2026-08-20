import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("build_stage_shows_local.py: SOURCESの各JSONが実在しproject.idが一意", async () => {
  const matches = [...generatorSource.matchAll(/ROOT \/ "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(matches.length >= 10, "SOURCESが少なすぎる（読み取りに失敗した可能性）");
  const seen = new Set();
  const workspaceRoot = new URL("../", root); // build_stage_shows_local.py の ROOT は shosai-app の一つ上
  for (const rel of matches) {
    const text = await readFile(new URL(rel, workspaceRoot), "utf8");
    const doc = JSON.parse(text);
    assert.ok(doc.project && Array.isArray(doc.project.scenes), `${rel}: project.scenesが無い`);
    assert.ok(doc.project.id, `${rel}: project.idが無い`);
    assert.ok(!seen.has(doc.project.id), `${rel}: id "${doc.project.id}" が重複`);
    seen.add(doc.project.id);
  }
});
