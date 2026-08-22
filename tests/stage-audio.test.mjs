import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const storeSource = await readFile(new URL("stage-audio-store.js", root), "utf8");
const indexSource = await readFile(new URL("index.html", root), "utf8");
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");
const i18nSource = await readFile(new URL("stage-i18n.js", root), "utf8");

const context = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const model = context.window.SHOSAI_STAGE_AUDIO_MODEL;
const plain = (value) => JSON.parse(JSON.stringify(value));

test("楽曲メタデータを小さく正規化し、不正IDと重複を捨てる", () => {
  const normalized = plain(model.normalizeTracks([
    { id: "track-one", title: "  Opening  ", durationSeconds: 91.25, blob: "data:audio/huge" },
    { id: "track-one", title: "duplicate" },
    { id: "bad id", title: "invalid" },
    { id: "track-two", title: "", durationSeconds: -1 },
  ]));
  assert.deepEqual(normalized, [
    { id: "track-one", title: "Opening", durationSeconds: 91.25 },
    { id: "track-two", title: "楽曲 4", durationSeconds: null },
  ]);
  assert.equal(model.trackLimit, 24);
  assert.equal(model.fileMaxBytes, 150 * 1024 * 1024);
});

test("sceneの割り当てIDは音源未接続でも保持し、sectionでは消す", () => {
  assert.equal(model.normalizeTrackId("scene", "track-missing"), "track-missing");
  assert.equal(model.normalizeTrackId("section", "track-missing"), null);
  assert.equal(model.normalizeTrackId("scene", "bad id"), null);
});

test("同じ曲の連続シーンだけ再生位置を維持する", () => {
  assert.deepEqual(plain(model.transition("track-a", "track-a", true)), {
    action: "continue", play: true,
  });
  assert.deepEqual(plain(model.transition("track-a", "track-b", true)), {
    action: "load", play: true,
  });
  assert.deepEqual(plain(model.transition("track-a", null, true)), {
    action: "stop", play: false,
  });
  assert.deepEqual(plain(model.transition(null, "track-b", false)), {
    action: "load", play: false,
  });
});

test("再接続候補は曲名と5%超の尺差を検知する", () => {
  const track = { title: "Opening", durationSeconds: 100 };
  assert.deepEqual(plain(model.identityDifference(track, " opening ", 104)), {
    titleChanged: false,
    durationChanged: false,
  });
  assert.deepEqual(plain(model.identityDifference(track, "Finale", 100)), {
    titleChanged: true,
    durationChanged: false,
  });
  assert.deepEqual(plain(model.identityDifference(track, "Opening", 108)), {
    titleChanged: false,
    durationChanged: true,
  });
});

test("新規・読込・書出しのstateへ音源参照だけを接続する", () => {
  assert.match(stageSource, /audioTracks: \[\],/);
  assert.match(stageSource, /audioTrackId: null,/);
  assert.match(stageSource, /audioTracks: normalizeAudioTracks\(rawProject\.audioTracks\)/);
  assert.match(stageSource, /audioTrackId: normalizeAudioTrackId\(kind, raw\.audioTrackId\)/);
  assert.match(stageSource, /audioStore\.put\(track\.id, file\)[\s\S]*?audioTracks\(\)\.push\(track\)/);
  assert.doesNotMatch(storeSource, /localStorage\.(?:get|set|remove)Item|data:audio|FileReader/);
});

test("IndexedDB helperはtrackIdを検査し、孤児回収を持つ", () => {
  const storeContext = { window: {}, Blob };
  vm.runInNewContext(storeSource, storeContext, { filename: "stage-audio-store.js" });
  const store = storeContext.window.SHOSAI_STAGE_AUDIO_STORE;
  assert.equal(store.validTrackId("track-abc_1"), true);
  assert.equal(store.validTrackId("bad id"), false);
  assert.equal(typeof store.put, "function");
  assert.equal(typeof store.get, "function");
  assert.equal(typeof store.pruneExcept, "function");
  assert.match(storeSource, /const DB_NAME = "shosai-stage-audio"/);
  assert.match(storeSource, /const STORE = "tracks"/);
});

test("PC・iPad・スマホが一つのaudio要素を共有する", () => {
  for (const html of [indexSource, stageHtml]) {
    assert.equal((html.match(/id="stage-music-audio"/g) || []).length, 1);
    assert.match(html, /data-panel="music"/);
    assert.match(html, /id="stage-scene-audio-track"/);
    assert.match(html, /id="stage-music-toggle"/);
    assert.match(html, /stage-audio-store\.js\?v=2/);
  }
  assert.match(stageSource, /id: "music", icon: "♪", label: "音楽", panels: \["music"\]/);
  assert.match(stageSource, /className = "stage-phone-music-bar"/);
  assert.match(stageSource, /musicToggle\.addEventListener\("click", toggleAudioPlayback\)/);
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-scene-bar \{ display: none; \}/);
  assert.match(styleSource, /html\.stage-phone-viewer \.stage-scene-bar \{ display: none !important; \}/);
  assert.match(
    styleSource,
    /is-tablet-drawer-open[\s\S]*?\.stage-canvas-bar \.stage-canvas-tools \{[\s\S]*?overflow-x: auto;/,
  );
  assert.match(styleSource, /100dvh - 46px/);
  assert.match(stageSource, /applyDocumentString\(text\)[\s\S]*?continuePlayback[\s\S]*?state\.project = project/);
});

test("音源のローカル限定をUIで明示し、主要文言を日英で持つ", () => {
  const note = "音源ファイルはこの端末内だけに保存され、JSON、端末データの書き出し、共有セッションには含まれません。別端末では元ファイルを選び直してください。";
  assert.ok(indexSource.includes(note));
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  const text = i18nContext.window.SHOSAI_I18N.text;
  assert.equal(text["音楽"], "Music");
  assert.equal(text["このシーンで流す曲"], "Music for this scene");
  assert.match(text[note], /not included in project JSON/);
});

test("新しい音源helperと版番号がHTML・単独版・Service Workerで一致する", () => {
  const versionOf = (source, name) => source.match(new RegExp(`${name.replaceAll(".", "\\.")}\\?v=(\\d+)`))?.[1] || null;
  for (const name of ["style.css", "stage-i18n.js", "stage-audio-store.js", "stage-sketch.js"]) {
    const expected = versionOf(indexSource, name);
    assert.ok(expected, `${name} がindex.htmlにない`);
    assert.equal(versionOf(stageHtml, name), expected, `${name} がstage.htmlと不一致`);
    assert.equal(versionOf(swSource, name), expected, `${name} がstage-sw.jsと不一致`);
  }
});
