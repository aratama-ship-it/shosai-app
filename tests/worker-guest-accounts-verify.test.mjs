/* 発注書J（GUEST_ACCOUNTS）の独立検証（2026-08-26・Claude）。
 *
 * Codexが書いた tests/worker-session-login.test.mjs とは別に、
 * 実装者の想定に引きずられない観点だけをここへ置く。
 * ここが緩むと「外したはずの人がまだ入れる」が起きる。
 *
 * 秘密の値は入れない。すべてダミー。 */

import assert from "node:assert/strict";
import test from "node:test";

import worker from "../worker.js";

const ASSETS = {
  fetch: async (request) =>
    new Response(`asset:${new URL(request.url).pathname}`, { status: 200 }),
};
const NAV = { "Sec-Fetch-Mode": "navigate" };
const base = { SITE_USER: "owner", SITE_PASS: "owner-pass-x", ASSETS };

const list = (entries) => ({ ...base, GUEST_ACCOUNTS: JSON.stringify(entries) });
const req = (path = "/", headers = NAV, origin = "https://shosai.example") =>
  new Request(`${origin}${path}`, { method: "GET", headers });
const basic = (user, pass) => ({ Authorization: `Basic ${btoa(`${user}:${pass}`)}` });

async function status(env, headers = NAV, path = "/") {
  return (await worker.fetch(req(path, headers), env, {})).status;
}

/* 設定ミスは公開URLでもローカルでも止まること。
   ★ローカルの素通しは「設定ミスでない」ときだけ。ここが緩むと開発機が穴になる。 */
async function assertStops(env, why) {
  for (const origin of ["https://shosai.example", "http://localhost:8787"]) {
    const r = await worker.fetch(req("/", NAV, origin), env, {});
    assert.equal(r.status, 503, `${why} (${origin})`);
  }
}

test("環境変数が文字列でないときも止める（JSON.parse前の型を見ている）", async () => {
  // Secretは常に文字列で来るはずだが、来なかったときに素通ししないこと
  await assertStops({ ...base, GUEST_ACCOUNTS: [{ user: "g1", pass: "p1" }] }, "配列そのもの");
  await assertStops({ ...base, GUEST_ACCOUNTS: { user: "g1", pass: "p1" } }, "オブジェクトそのもの");
  await assertStops({ ...base, GUEST_ACCOUNTS: 12345 }, "数値");
  await assertStops({ ...base, GUEST_ACCOUNTS: null }, "null");
});

test("要素が配列やnullでも止める（typeof null === object の穴）", async () => {
  await assertStops(list([["g1", "p1"]]), "要素が配列");
  await assertStops(list([null]), "要素がnull");
  await assertStops(list(["g1"]), "要素が文字列");
});

test("空文字のuser/passは止める", async () => {
  await assertStops(list([{ user: "", pass: "p1" }]), "userが空");
  await assertStops(list([{ user: "g1", pass: "" }]), "passが空");
  await assertStops(list([{ user: "g1" }]), "passが無い");
  await assertStops(list([{ pass: "p1" }]), "userが無い");
});

test("正しい一件が混ざっていても、不正が一件あれば全体を止める", async () => {
  /* ★部分的に正しい名簿へ縮めないこと。縮めると
     「二人目の設定を間違えたのに一人目だけ通る」＝気づかないまま運用される。 */
  await assertStops(list([{ user: "g1", pass: "p1" }, { user: "g2" }]), "後ろが不正");
  await assertStops(list([{ user: "g1" }, { user: "g2", pass: "p2" }]), "前が不正");
});

test("labelや未知の項目があっても通る（前方互換）", async () => {
  const env = list([
    { user: "g1", pass: "p1", label: "◯◯さん" },
    { user: "g2", pass: "p2", note: "将来の項目", nested: { a: 1 } },
  ]);
  assert.equal(await status(env, basic("g1", "p1")), 200);
  assert.equal(await status(env, basic("g2", "p2")), 200);
});

test("旧GUEST_USERが無くGUEST_ACCOUNTSだけでも通る（移行後の姿）", async () => {
  const env = list([{ user: "g1", pass: "p1" }]);
  assert.equal(env.GUEST_USER, undefined);
  assert.equal(await status(env, basic("g1", "p1")), 200);
  assert.equal(await status(env, basic("owner", "owner-pass-x")), 200);
});

test("★名簿から外した人は入れなくなる（この機能の目的そのもの）", async () => {
  const before = list([{ user: "g1", pass: "p1" }, { user: "g2", pass: "p2" }]);
  assert.equal(await status(before, basic("g2", "p2")), 200, "外す前は入れる");

  const after = list([{ user: "g1", pass: "p1" }]);
  assert.equal(await status(after, basic("g2", "p2")), 401, "外したら入れない");
  assert.equal(await status(after, basic("g1", "p1")), 200, "残った人は影響を受けない");
});

test("外した人の古いクッキーも通らない", async () => {
  const before = list([{ user: "g1", pass: "p1" }, { user: "g2", pass: "p2" }]);
  const body = new URLSearchParams({ user: "g2", pass: "p2", next: "/db.js" });
  const signed = await worker.fetch(
    new Request("https://shosai.example/sign-in", { method: "POST", body }), before, {},
  );
  const raw = signed.headers.get("Set-Cookie") || "";
  const cookie = raw.slice(raw.indexOf("=") + 1, raw.indexOf(";") === -1 ? undefined : raw.indexOf(";"));
  assert.ok(cookie.length > 0, "ログインでクッキーが出ている");

  const after = list([{ user: "g1", pass: "p1" }]);
  const r = await worker.fetch(
    new Request("https://shosai.example/db.js", { headers: { Cookie: `shosai_session=${cookie}` } }),
    after, {},
  );
  assert.equal(r.status, 401, "名簿から消えた人のトークンは通らない");
});

test("誤ったパスワードでは入れず、クッキーも配らない", async () => {
  const env = list([{ user: "g1", pass: "p1" }]);
  const body = new URLSearchParams({ user: "g1", pass: "wrong", next: "/db.js" });
  const r = await worker.fetch(
    new Request("https://shosai.example/sign-in", { method: "POST", body }), env, {},
  );
  assert.notEqual(r.status, 302, "誤資格情報で通してはいけない");
  assert.equal(r.headers.get("Set-Cookie"), null, "クッキーを配らない");
});
