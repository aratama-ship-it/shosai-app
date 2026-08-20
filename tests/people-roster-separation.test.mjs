/* 資料棚と名簿の役割分離の回帰テスト（2026-08-20）
 *
 * - 資料棚は「作品から読む場所」。人物での絞り込み・人物名での逆引きを持たない。
 * - 名簿は「人を探す場所」。アーティスト（暗号化）と制作・技術スタッフ（公開クレジット）を
 *   別の索引として持ち、後者は合言葉なしで読める。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const root = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);

const [indexSource, appSource, rosterSource, crewSource] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("roster.js", root), "utf8"),
  readFile(new URL("roster-crew.js", root), "utf8"),
]);

const crew = require("../roster-crew.js");

// 境界の検査はコードに対して行う。注釈で「scout_pass は要求しない」と書いてある行に
// 引っかかると、説明を書くほどテストが落ちることになる。
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const crewCode = stripComments(crewSource);

// ---------------------------------------------------------------- 資料棚

test("資料棚から人物フィルターの入口が消えている", () => {
  assert.doesNotMatch(indexSource, /id="db-person"/);
  assert.match(indexSource, /<summary>会社・調査レベル・並び順<\/summary>/);
  assert.doesNotMatch(indexSource, /会社・人物・調査レベル・並び順/);
});

test("app.js に人物フィルターの状態とbindが残っていない", () => {
  assert.doesNotMatch(appSource, /#db-person/);
  assert.doesNotMatch(appSource, /dbState\.person/);
  assert.doesNotMatch(appSource, /bindSelect\("#db-person"/);
  assert.doesNotMatch(appSource, /filters\.person/);
});

test("資料棚の全文検索に人物名を入れない", () => {
  // 検索インデックスの add("人", ...) が残っていないこと。
  assert.doesNotMatch(appSource, /add\("人",/);
});

test("作品詳細に独立した「人（N）」セクションが出ない", () => {
  assert.doesNotMatch(appSource, /人（\$\{\(w\.people \|\| \[\]\)\.length\}）/);
  assert.doesNotMatch(appSource, /peopleHtml/);
});

test("調査レベルの内訳に人物数を表示しない", () => {
  assert.doesNotMatch(appSource, /人物 \$\{depthBasis\.people_count/);
});

test("正本の people / persons は名簿のために残す", () => {
  // 資料棚のUIからは外すが、データ自体は消さない。
  assert.match(crewSource, /work\.people/);
  assert.match(crewSource, /db\.persons/);
  assert.match(indexSource, /roster-crew\.js/);
});

// ------------------------------------------------ 制作・技術スタッフの分類

const 工 = (roles, credits = []) => ({
  persons: { p1: { name: "Test Person", name_ja: "テスト", roles } },
  works: credits.map((c, i) => ({
    id: c.workId || `work_${i}`,
    title: c.title || `作品${i}`,
    company: c.company || "テスト社",
    year: c.year || "2020",
    people: [{
      person_id: "p1",
      role: c.role,
      credit_label: c.creditLabel || "",
      source: "test.md",
      confidence: c.confidence || "high",
    }],
  })),
});

const deptLabels = (entry) => entry.departments.map(crew.departmentLabel);

test("lighting_designer は照明に分類される", () => {
  const [entry] = crew.buildCrewIndex(工(["lighting_designer"], [{ role: "lighting_designer" }]));
  assert.deepEqual(deptLabels(entry), ["照明"]);
});

test("sound_designer は音響に分類される", () => {
  const [entry] = crew.buildCrewIndex(工(["sound_designer"], [{ role: "sound_designer" }]));
  assert.deepEqual(deptLabels(entry), ["音響"]);
});

test("director だけの人物は制作・技術スタッフに掲載されない", () => {
  const list = crew.buildCrewIndex(工(["director"], [{ role: "director", creditLabel: "演出" }]));
  assert.equal(list.length, 0);
});

test("performer だけの人物も掲載されない", () => {
  const list = crew.buildCrewIndex(工(["performer"], [{ role: "performer", creditLabel: "出演" }]));
  assert.equal(list.length, 0);
});

test("credit_label に舞台監督が明記されれば掲載し、元roleは書き換えない", () => {
  const list = crew.buildCrewIndex(工(["director"], [
    { role: "director", creditLabel: "演出助手・舞台監督（統制語彙上directorへ対応）" },
  ]));
  assert.equal(list.length, 1);
  assert.deepEqual(deptLabels(list[0]), ["舞台進行・制作"]);
  // 正本の role も、作品別の role も director のまま。
  assert.deepEqual(list[0].roles, ["director"]);
  assert.equal(list[0].credits[0].role, "director");
});

test("括弧内の注記は職名の明記として扱わない", () => {
  // 「Disney+映像版」のような注記で映像部門へ入れない。
  assert.deepEqual(
    crew.departmentsForCreditLabel("演出（2016トニー賞演出賞。Disney+映像版の監督も担当）"), []);
  // 括弧の外に職名があれば拾う。
  assert.deepEqual(
    crew.departmentsForCreditLabel("技術監督・照明（Technical Director / Lighting Designer）"),
    ["stage_ops", "lighting"]);
});

test("同じ人物・同じ作品・同じクレジット表記は重複しない", () => {
  const db = {
    persons: { p1: { name: "A", name_ja: "エー", roles: ["lighting_designer"] } },
    works: [{
      id: "w1", title: "作品", company: "社", year: "2020",
      people: [
        { person_id: "p1", role: "lighting_designer", credit_label: "照明", confidence: "high" },
        { person_id: "p1", role: "lighting_designer", credit_label: "照明", confidence: "high" },
      ],
    }],
  };
  const [entry] = crew.buildCrewIndex(db);
  assert.equal(entry.credits.length, 1);
  assert.equal(entry.workCount, 1);
});

test("一人が複数部門に属せる", () => {
  const [entry] = crew.buildCrewIndex(工(["lighting_designer", "sound_designer"], [
    { role: "lighting_designer", workId: "w1" },
    { role: "sound_designer", workId: "w2" },
  ]));
  assert.deepEqual(deptLabels(entry), ["照明", "音響"]);
  assert.equal(entry.workCount, 2);
});

test("設計と操作、舞台美術と大道具は職種表示で区別する", () => {
  assert.equal(crew.roleLabel("set_designer"), "舞台美術");
  assert.equal(crew.roleLabel("stage_carpenter"), "大道具・舞台作業");
  assert.notEqual(crew.roleLabel("sound_designer"), crew.roleLabel("sound_operator"));
  assert.notEqual(crew.roleLabel("lighting_designer"), crew.roleLabel("lighting_operator"));
});

test("confidence は日本語表示でも元値を失わない", () => {
  assert.equal(crew.confidenceLabel("high"), "確度 高");
  const [entry] = crew.buildCrewIndex(工(["sound_designer"], [
    { role: "sound_designer", confidence: "medium" },
  ]));
  assert.equal(entry.credits[0].confidence, "medium");
  assert.match(crewSource, /badge\.dataset\.confidence = credit\.confidence;/);
});

test("担当作品リンクは資料棚の #db/<work_id> を指す", () => {
  assert.match(crewSource, /a\.href = `#db\/\$\{credit\.workId\}`;/);
});

test("制作・技術スタッフにアーティスト名簿専用の項目が混ざらない", () => {
  const [entry] = crew.buildCrewIndex(工(["lighting_designer"], [{ role: "lighting_designer" }]));
  const keys = new Set(Object.keys(entry).concat(Object.keys(entry.credits[0])));
  ["contact", "instagram", "youtube", "photo", "bio", "size", "skills", "note", "base"]
    .forEach((forbidden) => assert.ok(!keys.has(forbidden), `${forbidden} を持たない`));
  // ソースにも連絡手段を扱う経路を持たない。
  assert.doesNotMatch(crewCode, /instagram|youtube|contact|isSafePhoto/i);
});

test("部門ごとの人数を動的に数える", () => {
  const counts = crew.departmentCounts(crew.buildCrewIndex(工(["lighting_designer"], [
    { role: "lighting_designer" },
  ])));
  assert.equal(counts.find((d) => d.id === "lighting").count, 1);
  assert.equal(counts.find((d) => d.id === "sound").count, 0);
  // 部門表は一か所にまとまっている。
  assert.equal(crew.DEPARTMENTS.length, 8);
});

// ------------------------------------------------------------ 名簿の境界

test("制作・技術スタッフは合言葉を要求しない", () => {
  assert.doesNotMatch(crewCode, /scout_pass/);
  assert.doesNotMatch(crewCode, /data\.enc/);
  assert.doesNotMatch(crewCode, /decrypt|PBKDF2|AES-GCM/);
  // ゲートの表示・解錠にも一切触らない。
  assert.doesNotMatch(crewCode, /roster-gate|roster-pass|#roster-workspace/);
});

test("アーティスト名簿の暗号化の境界は変わっていない", () => {
  assert.match(rosterSource, /const PASS_KEY = "scout_pass";/);
  assert.match(rosterSource, /scouting-report-app\/data\/data\.enc/);
  assert.match(rosterSource, /name: "PBKDF2"/);
  assert.match(rosterSource, /\{ name: "AES-GCM", length: 256 \}/);
});

test("合言葉ゲートはアーティスト側の中だけに置く", () => {
  const artistPanel = indexSource.match(
    /<div id="people-panel-artists"[\s\S]*?<!-- \/people-panel-artists -->/)?.[0];
  const crewPanel = indexSource.match(
    /<div id="people-panel-crew"[\s\S]*?<!-- \/people-panel-crew -->/)?.[0];
  assert.ok(artistPanel, "#people-panel-artists が存在する");
  assert.ok(crewPanel, "#people-panel-crew が存在する");
  assert.match(artistPanel, /id="roster-gate"/);
  assert.doesNotMatch(crewPanel, /roster-gate|roster-pass/);
  assert.match(crewPanel, /id="crew-departments"/);
  assert.match(crewPanel, /id="crew-list"/);
  assert.match(crewPanel, /id="crew-detail"/);
});

test("二つの入口は合言葉ゲートより上にあり、色以外でも状態が分かる", () => {
  const tablist = indexSource.indexOf('id="people-index-tabs"');
  const gate = indexSource.indexOf('id="roster-gate"');
  assert.ok(tablist !== -1 && gate !== -1 && tablist < gate, "入口がゲートより上にある");
  const tabs = indexSource.match(/<div id="people-index-tabs"[\s\S]*?<\/div>/)?.[0];
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /id="people-tab-artists"[^>]*role="tab"/);
  assert.match(tabs, /id="people-tab-crew"[^>]*role="tab"/);
  assert.match(tabs, /aria-selected="true"/);
  assert.match(tabs, /aria-selected="false"/);
});

test("推奨文言と注意書きを載せる", () => {
  assert.match(indexSource, /PEOPLE INDEX/);
  assert.match(indexSource, /名簿から、人をたどる/);
  assert.match(indexSource, /舞台に立つ人と、舞台を成立させる人を、別の索引として読む。/);
  assert.match(
    indexSource,
    /作品クレジットで確認できた範囲を収録しています。現在の所属、連絡先、依頼可否を示すものではありません。/);
});

test("人数の単位はアーティストが「組」、制作・技術が「人」", () => {
  assert.match(rosterSource, /組中 \$\{rows\.length\}組/);
  assert.match(crewSource, /\$\{state\.crew\.length\}人中 \$\{rows\.length\}人/);
  assert.match(crewSource, /`\$\{count\}人`/);
});

// ------------------------------- サイトのBasic認証と名簿の合言葉（2026-08-20）

test("合言葉はサイトの鍵から自動解錠し、暗号化そのものは外さない", () => {
  const rosterCode = stripComments(rosterSource);
  // 鍵は roster-key.local.js の SHOSAI_ROSTER_KEY から読む（typeof で無くても壊れない）。
  assert.match(rosterCode, /typeof SHOSAI_ROSTER_KEY !== "undefined" \? SHOSAI_ROSTER_KEY : ""/);
  assert.match(rosterCode, /if \(siteKey && location\.protocol !== "file:"\)/);
  // data.enc と復号方式は据え置き。平文化していない。
  assert.match(rosterCode, /scouting-report-app\/data\/data\.enc/);
  assert.match(rosterCode, /name: "PBKDF2"/);
  assert.match(rosterCode, /\{ name: "AES-GCM", length: 256 \}/);
  assert.match(rosterCode, /const PASS_KEY = "scout_pass";/);
});

test("自動解錠中だけ合言葉欄を隠し、失敗したら出す", () => {
  assert.match(
    stripComments(rosterSource),
    /gate\.hidden = open \|\| \(state\.autoKey && state\.status === "loading"\);/);
});

test("index.html は合言葉ファイルを roster.js より先に読む", () => {
  const keyTag = indexSource.indexOf('roster-key.local.js');
  const rosterTag = indexSource.indexOf('roster.js?v=');
  assert.ok(keyTag !== -1, "roster-key.local.js の読み込みがある");
  assert.ok(keyTag < rosterTag, "合言葉ファイルが roster.js より先にある");
});

test("合言葉が公開リポジトリへ入らないようにする", async () => {
  // 雛形は空のまま追跡し、実物は追跡しない。
  const example = await readFile(new URL("roster-key.example.js", root), "utf8");
  assert.match(example, /const SHOSAI_ROSTER_KEY = "";/);
  const ignore = await readFile(new URL(".gitignore", root), "utf8");
  assert.match(ignore, /^roster-key\.local\.js$/m);
  // 配信対象からは外さない（Cloudflareの認証の内側へは載せる必要がある）。
  const assets = await readFile(new URL(".assetsignore", root), "utf8");
  assert.doesNotMatch(assets, /roster-key/);
});
