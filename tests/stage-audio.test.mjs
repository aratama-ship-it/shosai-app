import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const storeSource = await readFile(new URL("stage-audio-store.js", root), "utf8");
const indexSource = await readFile(new URL("stage.html", root), "utf8");
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
    { id: "track-one", title: "Opening", durationSeconds: 91.25, gainDb: 0, timelineFadeOut: false },
    { id: "track-two", title: "楽曲 4", durationSeconds: null, gainDb: 0, timelineFadeOut: false },
  ]);
  assert.equal(model.trackLimit, 24);
  assert.equal(model.fileMaxBytes, 150 * 1024 * 1024);
  assert.equal(model.betaFileMaxBytes, 50 * 1024 * 1024);
  assert.equal(model.normalizeGainDb(4.26), 4.5);
  assert.equal(model.normalizeGainDb(-99), -24);
  assert.equal(model.normalizeGainDb(99), 12);
  assert.equal(model.normalizeGainDb("invalid"), 0);
});

test("音源に追加したカウント合わせ情報を小さく正規化して保持する", () => {
  const normalized = plain(model.normalizeTrack({
    id: "track-sync", title: "Sync", durationSeconds: 60,
    countBpm: 128, firstCountSec: 0.75, firstSet: true, firstLocked: true,
    anchors: [{ count: 9, sec: 4.5, locked: false }],
    phrases: [{ fromCount: 1, length: 8 }],
  }));
  assert.equal(normalized.countBpm, 128);
  assert.equal(normalized.firstCountSec, 0.75);
  assert.deepEqual(normalized.anchors, [{ count: 9, sec: 4.5, locked: false }]);
  assert.deepEqual(normalized.phrases, [{ fromCount: 1, length: 8 }]);
});

test("ブラウザ版ベータはWAVと50MB超を保存前に拒否し、ネイティブ版は通常制限へ戻す", () => {
  assert.equal(model.filePolicy({ name: "show.wav", type: "audio/wav", size: 1024 }, "beta-20260912"), "beta-wav");
  assert.equal(model.filePolicy({ name: "show.mp3", type: "audio/mpeg", size: 51 * 1024 * 1024 }, "beta-20260912"), "beta-size");
  assert.equal(model.filePolicy({ name: "show.mp3", type: "audio/mpeg", size: 12 * 1024 * 1024 }, "beta-20260912"), "");
  assert.equal(model.filePolicy({ name: "show.wav", type: "audio/wav", size: 100 * 1024 * 1024 }, "beta-20260912", true), "");
  assert.equal(model.filePolicy({ name: "show.wav", type: "audio/wav", size: 151 * 1024 * 1024 }, "beta-20260912", true), "size");
  assert.equal(model.filePolicy({ name: "show.wav", type: "audio/wav", size: 1024 }, ""), "");
  assert.equal(model.isNativeAppRuntime({ version: "1", platform: "macos" }), true);
  assert.equal(model.isNativeAppRuntime({ version: "1", platform: "ios" }), true);
  assert.equal(model.isNativeAppRuntime({}), false);
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
  assert.match(stageSource, /audioTrackId: null,[\s\S]*?audioTimelineStartSeconds: null,[\s\S]*?audioTimelineEndSeconds: null,/);
  assert.match(stageSource, /audioTracks: normalizeAudioTracks\(rawProject\.audioTracks\)/);
  assert.match(stageSource, /audioTrackId: normalizeAudioTrackId\(kind, raw\.audioTrackId\),[\s\S]*?audioTimelineStartSeconds: kind === "scene" \? rehearsalSeconds\(raw\.audioTimelineStartSeconds\) : null/);
  assert.match(stageSource, /setTimelineAudioStartSeconds\(sectionId, sceneId, value, options = \{\}\)[\s\S]*?scene\.audioTimelineStartSeconds = nextSeconds/);
  assert.match(stageSource, /setTimelineAudioEndSeconds\(sectionId, sceneId, value, options = \{\}\)[\s\S]*?scene\.audioTimelineEndSeconds = nextSeconds/);
  assert.match(stageSource, /audioStore\.put\(track\.id, file\)[\s\S]*?audioTracks\(\)\.push\(track\)/);
  assert.match(stageSource, /setTimelineAudioGainDb\(trackId, value, options = \{\}\)[\s\S]*?timelineFadeOut[\s\S]*?track\.gainDb = gainDb[\s\S]*?track\.timelineFadeOut = timelineFadeOut/);
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

/* 2026-08-24 方針変更: 楽曲はPC版のみ。タブレット・スマホからはUIごと取り除いた。
   長時間再生・画面ロック・バックグラウンド復帰・Bluetooth出力切替という
   モバイル固有の壊れ方を抱え込まないための線引き（本人判断）。
   このテストは以前「PC・iPad・スマホが一つのaudio要素を共有する」ことを守っていたが、
   守るべき不変条件が「PCにはある／タブレット・スマホには無い」へ変わった。 */

test("PCの音楽機能は一つのaudio要素で動く", () => {
  for (const html of [indexSource, stageHtml]) {
    assert.equal((html.match(/id="stage-music-audio"/g) || []).length, 1);
    assert.match(html, /data-panel="music"/);
    assert.match(html, /id="stage-scene-audio-track"/);
    assert.match(html, /id="stage-music-toggle"/);
    assert.match(html, /stage-audio-store\.js\?v=2/);
  }
  assert.match(stageSource, /els\.musicToggle\.addEventListener\("click", toggleAudioPlayback\)/);
  assert.match(stageSource, /applyDocumentString\(text\)[\s\S]*?continuePlayback[\s\S]*?state\.project = project/);
});

test("タブレット・スマホに音楽UIを持ち込まない", () => {
  // ★ここが緩むと、保証しない機能のボタンが配布物へ戻る
  assert.ok(
    !/id: "music", icon: "♪"/.test(stageSource),
    "iPadのレールに音楽グループを載せないこと",
  );
  assert.ok(
    !/stage-phone-music-bar|stage-tablet-music-toggle|stage-tablet-music-open/.test(stageSource),
    "スマホ・タブレット専用の音楽UIを作らないこと",
  );
  assert.ok(
    !/tabletUi\.music|phoneUi\.music/.test(stageSource),
    "タブレット・スマホのUIオブジェクトへ音楽を持たせないこと",
  );
  assert.ok(
    !/stage-phone-music|stage-tablet-music/.test(styleSource),
    "音楽UIのCSSも残さないこと",
  );
});

test("シーンの送りはタブレット・スマホの専用UIが持つ", () => {
  // 音楽とは別の話。PC用の帯を隠して専用の送りを使う作りは変えていない
  assert.match(styleSource, /html\.stage-pwa-tablet \.stage-scene-bar \{ display: none; \}/);
  assert.match(styleSource, /html\.stage-phone-viewer \.stage-scene-bar \{ display: none !important; \}/);
  assert.match(
    styleSource,
    /is-tablet-drawer-open[\s\S]*?\.stage-canvas-bar \.stage-canvas-tools \{[\s\S]*?overflow-x: auto;/,
  );
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

test("ブラウザ版ベータだけ音源追加の直下でWAVを扱わない理由を明示する", () => {
  const note = "ベータ版ではMP3またはM4A/AAC（1ファイル50MBまで）を使用してください。WAVは容量が大きくなりやすく、ブラウザの保存領域を圧迫して読み込み失敗につながるため使用できません。";
  assert.ok(stageHtml.includes(`id="stage-music-beta-note" hidden>${note}`));
  assert.match(stageSource, /BETA_BROWSER_AUDIO_RESTRICTIONS[\s\S]*?musicBetaNote\.hidden = false/);
  assert.match(stageSource, /betaAudioAccept = "audio\/mpeg,audio\/mp4,audio\/x-m4a,audio\/aac,\.mp3,\.m4a,\.aac"/);
  assert.match(styleSource, /\.stage-music-beta-note \{[\s\S]*?border-left: 2px solid var\(--rust\)/);
  const i18nContext = { window: {} };
  vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
  assert.match(i18nContext.window.SHOSAI_I18N.text[note], /WAV files are not accepted/);
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
