import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import zlib from "node:zlib";

const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const stageHtmlSource = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const swSource = await readFile(new URL("../stage-sw.js", import.meta.url), "utf8");

// stage-sketch.js は window.atob / TextEncoder / TextDecoder / Blob を素朴に使う。
// ブラウザのDOMは要らない（画像を書き出す一連の関数はcanvas等を要求しないpure partだけ叩く）。
const context = {
  window: {},
  document: { getElementById: () => null },
  atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
  TextEncoder,
  TextDecoder,
  Blob,
  URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} },
};
vm.runInNewContext(stageSource, context, { filename: "stage-sketch.js" });
const model = context.window.SHOSAI_STAGE_EXPORT_MODEL;

test("画像書き出しのZIPヘルパーがwindowへ公開されている", () => {
  assert.ok(model, "window.SHOSAI_STAGE_EXPORT_MODEL が無い");
  assert.equal(typeof model.crc32, "function");
  assert.equal(typeof model.makeZipBlob, "function");
  assert.equal(typeof model.dataUrlToBytes, "function");
});

test("crc32はNodeのzlib.crc32と一致する", () => {
  const bytes = new Uint8Array(Buffer.from("舞台スケッチ 書き出しテスト", "utf8"));
  assert.equal(model.crc32(bytes), zlib.crc32(Buffer.from(bytes)));
  const empty = new Uint8Array(0);
  assert.equal(model.crc32(empty), zlib.crc32(Buffer.from(empty)));
});

test("dataUrlToBytesはbase64 data URLを正しいバイト列へ戻す", () => {
  const original = new Uint8Array([0, 1, 2, 253, 254, 255, 10, 37]);
  const dataUrl = `data:image/png;base64,${Buffer.from(original).toString("base64")}`;
  const bytes = model.dataUrlToBytes(dataUrl);
  assert.deepEqual([...bytes], [...original]);
});

test("dataUrlToBytesはtext data URL（生成条件テキスト）もUTF-8で復元する", () => {
  const text = "①暗闇の中／改行\nと引用符\"を含む文";
  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  const bytes = model.dataUrlToBytes(dataUrl);
  assert.equal(Buffer.from(bytes).toString("utf8"), text);
});

test("makeZipBlobは複数エントリ・日本語ファイル名・フォルダ階層を持つ正しいZIPを作る", async () => {
  const entries = [
    { name: "01_場面/中央.png", bytes: new Uint8Array(Buffer.from("front-bytes-1")) },
    { name: "01_場面/平面.png", bytes: new Uint8Array(Buffer.from("plan-bytes-1-longer")) },
    { name: "02_別の場面-中央.png", bytes: new Uint8Array(Buffer.from("front-bytes-2")) },
  ];
  const blob = model.makeZipBlob(entries);
  const buf = Buffer.from(await blob.arrayBuffer());

  // EOCD (End Of Central Directory) は末尾22バイト。エントリ数と中央ディレクトリ位置を持つ。
  const eocdOffset = buf.length - 22;
  assert.equal(buf.readUInt32LE(eocdOffset), 0x06054b50, "EOCDシグネチャ");
  assert.equal(buf.readUInt16LE(eocdOffset + 8), entries.length, "エントリ数");

  // ローカルヘッダを先頭から辿り、各エントリのCRC・サイズ・名前・内容を検証する。
  let offset = 0;
  entries.forEach((entry) => {
    assert.equal(buf.readUInt32LE(offset), 0x04034b50, "ローカルヘッダシグネチャ");
    const flags = buf.readUInt16LE(offset + 6);
    assert.equal(flags & 0x0800, 0x0800, "UTF-8ファイル名フラグ(bit11)が立っていない");
    const method = buf.readUInt16LE(offset + 8);
    assert.equal(method, 0, "無圧縮(store)であるべき");
    const crc = buf.readUInt32LE(offset + 14);
    assert.equal(crc, zlib.crc32(Buffer.from(entry.bytes)), `CRC不一致: ${entry.name}`);
    const compSize = buf.readUInt32LE(offset + 18);
    const rawSize = buf.readUInt32LE(offset + 22);
    assert.equal(compSize, entry.bytes.length, "圧縮サイズ");
    assert.equal(rawSize, entry.bytes.length, "展開後サイズ");
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.slice(offset + 30, offset + 30 + nameLen).toString("utf8");
    assert.equal(name, entry.name, "ファイル名（フォルダ区切り含む）");
    const contentStart = offset + 30 + nameLen + extraLen;
    const content = buf.slice(contentStart, contentStart + entry.bytes.length);
    assert.ok(content.equals(Buffer.from(entry.bytes)), `内容不一致: ${entry.name}`);
    offset = contentStart + entry.bytes.length;
  });
});

test("makeZipBlobは1件でも壊れず、Node標準zlibでCRC検証できる", async () => {
  const entries = [{ name: "単体.png", bytes: new Uint8Array(Buffer.from("x")) }];
  const blob = model.makeZipBlob(entries);
  const buf = Buffer.from(await blob.arrayBuffer());
  assert.equal(buf.readUInt16LE(buf.length - 22 + 8), 1);
});

// 2026-08-19: 「画像書き出しでポップアップが連射される」不具合の修正に合わせて、
// キャッシュ版数の足並みが揃っているかを機械的に確認する（更新し忘れの回帰防止）。
test("index.htmlとstage.htmlのstage-sketch.js版数が一致している", () => {
  const versionOf = (source) => {
    const match = source.match(/stage-sketch\.js\?v=(\d+)/);
    assert.ok(match, "stage-sketch.js?v=N が見つからない");
    return match[1];
  };
  assert.equal(versionOf(indexSource), versionOf(stageHtmlSource));
});

test("stage-sw.jsのCACHE_NAMEはstage-sketch-pwa-v<数字>の形を保っている", () => {
  assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v\d+";/);
});

// 「書き出す」ボタンが document という同名のローカル変数でグローバルdocumentを
// 覆い隠し、document.createElement で無反応落ちしていた不具合（2026-08-19）の再発防止。
test("ショーのJSON書き出し関数がグローバルdocumentを覆い隠す変数を持たない", () => {
  const start = stageSource.indexOf("function writeProjectExport(");
  assert.ok(start >= 0, "writeProjectExport が見つからない");
  const end = stageSource.indexOf("\n  function exportProject(", start);
  const body = stageSource.slice(start, end);
  assert.doesNotMatch(body, /\bconst\s+document\s*=/, "documentを覆い隠すローカル変数がある");
  assert.match(body, /catch\s*\(error\)/, "失敗時のエラーハンドリングが無い");
});

test("画像・ピッチ書き出しの各関数はtry/catchで例外を握り、画面に見える失敗通知を出す", () => {
  ["function runDraftExport(", "function runPitchExport(", "function exportRehearsalProject("].forEach((marker) => {
    const start = stageSource.indexOf(marker);
    assert.ok(start >= 0, `${marker} が見つからない`);
    const end = stageSource.indexOf("\n  function ", start + marker.length);
    const body = stageSource.slice(start, end);
    assert.match(body, /catch\s*\(error\)/, `${marker}: catchが無い`);
    assert.match(body, /exportFailureNotice\(/, `${marker}: 失敗を画面に出していない`);
  });
});
