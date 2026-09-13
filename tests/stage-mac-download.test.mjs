import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const stageHtml = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const macHtml = await readFile(new URL("../mac.html", import.meta.url), "utf8");
const assetsIgnore = await readFile(new URL("../.assetsignore", import.meta.url), "utf8");
const buildSource = await readFile(new URL("../build_stage.py", import.meta.url), "utf8");

test("書斎のヘッダーは舞台スケッチ用Mac版の入口を持たない", () => {
  assert.doesNotMatch(indexSource, /href="mac\.html"/);
  assert.doesNotMatch(indexSource, /topnav-app/);
});

/* ★配る製品（stage.html）と身内の机（index.html）は別物。
   制作の書斎.app は机の道具なので、配布版へ混ぜない。
   （そもそもこのアプリは手元の作業フォルダが無いと起動しないため、
     渡した相手の手元では動かない。） */
test("配布する単独版にはMac版の入口が入らない", () => {
  assert.doesNotMatch(stageHtml, /mac\.html/);
  assert.doesNotMatch(stageHtml, /topnav-app/);
});

test("舞台スケッチはstage.htmlを正本とし、書斎から再生成しない", () => {
  assert.match(stageHtml, /<main id="view-stage"/);
  assert.doesNotMatch(indexSource, /<main id="view-stage"/);
  assert.match(buildSource, /舞台スケッチのHTMLは ``stage\.html`` を直接編集/);
  assert.doesNotMatch(buildSource, /OUT\.write_text|STAGE\.write_text/);
});

test("単独版が本体と同じくらいの大きさで書き出されている", () => {
  // 抽出が壊れると半分以下になる。桁で見張れば十分。
  assert.ok(stageHtml.length > 90000,
    `stage.html が ${stageHtml.length} 文字しかない。build_stage.py の抽出が壊れている`);
});

test("Mac版のページは配布物と、動かすための条件を正しく書いている", () => {
  assert.match(macHtml, /downloads\/shosai-desk-mac\.zip/);
  // 署名していないので Gatekeeper に止められる。開き方を書いていないと詰まる。
  assert.match(macHtml, /右クリック/);
  // 手元の作業フォルダを読む造り。無い Mac では起動しない。この事実を隠さない。
  assert.match(macHtml, /そのフォルダが無い Mac では起動しません/);
  assert.match(macHtml, /defaults write local\.shosai\.desk WebRootPath/);
  // arm64 のみ・macOS 13 以降（Info.plist と codesign の実測から）
  assert.match(macHtml, /arm64/);
  assert.match(macHtml, /macOS 13/);
  // 本体のCSSに依存させない（版の付け替えを一枚増やさないため）
  assert.doesNotMatch(macHtml, /href="style\.css/);
});

test("配布物と受け取り口が配信対象から外れていない", () => {
  // .assetsignore に載ると 404 になり、ページのボタンが空振りする。
  assert.doesNotMatch(assetsIgnore, /^downloads\//m);
  assert.doesNotMatch(assetsIgnore, /^mac\.html$/m);
});

test("配布するzipが実在して、空でない", async () => {
  const info = await stat(new URL("../downloads/shosai-desk-mac.zip", import.meta.url));
  assert.ok(info.size > 100000, `zip が ${info.size} バイトしかない`);
});
