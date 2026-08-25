// クッキーによるログインの回帰テスト（2026-08-24）。
//
// なぜ入れたか: iOSではBasic認証の資格情報がセッション中しかメモリに残らず、
// Safariを終了すると消える。ホーム画面のPWAはその保管庫を共有するため
// 「Safariが開いているときしか動かない」状態だった。クッキーなら再起動をまたいで残り、
// Service Workerからの取得にも付く。
//
// ここは認証の境界そのもの。緩んだら即座に落ちるよう、厚めに固定する。

import assert from "node:assert/strict";
import test from "node:test";

import worker, { createSessionToken, readSessionToken, safeNextPath } from "../worker.js";

const SITE = ["arata", "site-pass-123"];
const GUEST = ["guest", "guest-pass-456"];
const ACCOUNTS = [SITE, GUEST];
/* 固定値の NOW はトークン単体の検査に使う。
   Worker を通す検査では、Worker が Date.now() を見るので実時刻を使うこと。 */
const NOW = 1_800_000_000;
const SESSION_MAX_AGE = 60 * 60 * 24 * 90;
const realNow = () => Math.floor(Date.now() / 1000);

const env = {
  SITE_USER: SITE[0], SITE_PASS: SITE[1],
  GUEST_USER: GUEST[0], GUEST_PASS: GUEST[1],
  ASSETS: {
    fetch: async (request) =>
      new Response(`asset:${new URL(request.url).pathname}`, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
  },
};

const NAV = { "Sec-Fetch-Mode": "navigate" };
const SUBRESOURCE = { "Sec-Fetch-Mode": "no-cors" };

const get = (path, headers = {}) =>
  new Request(`https://shosai.example${path}`, { method: "GET", headers });

const basicHeader = ([user, pass]) => ({ Authorization: `Basic ${btoa(`${user}:${pass}`)}` });

function cookieFrom(response) {
  const raw = response.headers.get("Set-Cookie") || "";
  const eq = raw.indexOf("=");
  const semi = raw.indexOf(";");
  return raw.slice(eq + 1, semi === -1 ? undefined : semi);
}

// ---------- トークンそのもの ----------

test("正しいトークンは利用者名を返す", async () => {
  const token = await createSessionToken(SITE[0], SITE[1], NOW);
  assert.equal(await readSessionToken(token, ACCOUNTS, NOW + 60), SITE[0]);
});

test("中身を書き換えたトークンは通さない", async () => {
  const token = await createSessionToken(GUEST[0], GUEST[1], NOW);
  const [payload, signature] = token.split(".");
  // ゲストのトークンを本人名義へ書き換える細工
  const forged = Buffer.from(JSON.stringify({ u: SITE[0], e: NOW + 99999 }))
    .toString("base64url");
  assert.equal(await readSessionToken(`${forged}.${signature}`, ACCOUNTS, NOW), null);
  // 署名だけ差し替えても通らない
  assert.equal(await readSessionToken(`${payload}.${"A".repeat(43)}`, ACCOUNTS, NOW), null);
});

test("期限が切れたトークンは通さない", async () => {
  const token = await createSessionToken(SITE[0], SITE[1], NOW);
  const past = NOW + 60 * 60 * 24 * 90 + 10;   // 90日+10秒後
  assert.equal(await readSessionToken(token, ACCOUNTS, past), null);
});

test("パスワードを変えると、その口座のトークンだけが無効になる", async () => {
  const token = await createSessionToken(SITE[0], SITE[1], NOW);
  const changed = [[SITE[0], "new-password"], GUEST];
  assert.equal(await readSessionToken(token, changed, NOW + 60), null);
  // ゲストのトークンは影響を受けない
  const guestToken = await createSessionToken(GUEST[0], GUEST[1], NOW);
  assert.equal(await readSessionToken(guestToken, changed, NOW + 60), GUEST[0]);
});

test("知らない利用者名のトークンは通さない", async () => {
  const token = await createSessionToken("stranger", "whatever", NOW);
  assert.equal(await readSessionToken(token, ACCOUNTS, NOW + 60), null);
});

test("壊れた値で例外を投げず、必ず拒否する", async () => {
  const junk = [
    null, undefined, 42, "", ".", "a.", ".b", "no-dot",
    "!!!.???", "eyJhIjoxfQ", "%%%.%%%", "a".repeat(5000),
  ];
  for (const value of junk) {
    assert.equal(await readSessionToken(value, ACCOUNTS, NOW), null, `${String(value)} は拒否`);
  }
});

// ---------- 戻り先の検証 ----------

test("戻り先は同一オリジンのパスだけ許す", () => {
  assert.equal(safeNextPath("/stage.html"), "/stage.html");
  assert.equal(safeNextPath("/stage.html?x=1#y"), "/stage.html?x=1#y");
  for (const bad of [
    "//evil.example/steal",        // protocol-relative で外部へ飛べる
    "https://evil.example",
    "http://evil.example",
    "evil.example",
    "",
    null,
    undefined,
    42,
    "/ok\nLocation: https://evil.example",   // 制御文字でヘッダを割る細工
    "/ok\r\nSet-Cookie: x=y",
  ]) {
    assert.equal(safeNextPath(bad), "/", `${JSON.stringify(bad)} は / へ落とす`);
  }
});

// ---------- 入口の振る舞い ----------

test("未認証の画面遷移はログイン画面へ送る", async () => {
  const response = await worker.fetch(get("/stage.html?a=1", NAV), env, {});
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("Location"),
    `/sign-in?next=${encodeURIComponent("/stage.html?a=1")}`,
  );
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("未認証の副資源は401（HTMLを返さない）", async () => {
  const response = await worker.fetch(get("/stage-sketch.js", SUBRESOURCE), env, {});
  assert.equal(response.status, 401);
  assert.match(response.headers.get("Content-Type") || "", /text\/plain/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  // ダイアログがログイン画面と競合しないよう、あえて付けない
  assert.equal(response.headers.get("WWW-Authenticate"), null);
});

test("ログイン画面は認証なしで開ける", async () => {
  const response = await worker.fetch(get("/sign-in", NAV), env, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type") || "", /text\/html/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const html = await response.text();
  assert.match(html, /制作の書斎/);
  assert.match(html, /name="user"/);
  assert.match(html, /name="pass"/);
  assert.match(html, /中へ入る/);
});

test("ログイン画面は外部の資源を一切読まない", async () => {
  // 認証の外に出る画面なので、外を参照すると壊れるか情報が漏れる
  const html = await (await worker.fetch(get("/sign-in", NAV), env, {})).text();
  const urls = [...html.matchAll(/(?:src|href|url\()\s*=?\s*["']?([^"')\s>]+)/gi)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith("data:"));
  for (const u of urls) {
    assert.ok(u.startsWith("/icons/"), `外部参照が混ざっている: ${u}`);
  }
});

test("戻り先はログイン画面の中で逃がさない", async () => {
  const response = await worker.fetch(
    get(`/sign-in?next=${encodeURIComponent("//evil.example")}`, NAV), env, {},
  );
  const html = await response.text();
  assert.match(html, /name="next" value="\/"/);
  assert.ok(!html.includes("evil.example"), "外部URLを埋め込まない");
});

test("名前かパスワードが違えば入れない", async () => {
  const body = new URLSearchParams({ user: SITE[0], pass: "wrong", next: "/" });
  const response = await worker.fetch(
    new Request("https://shosai.example/sign-in", { method: "POST", body }), env, {},
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Set-Cookie"), null, "クッキーを配らない");
  assert.match(await response.text(), /違うようです/);
});

test("正しく入れるとクッキーを配り、元の場所へ戻す", async () => {
  const body = new URLSearchParams({ user: SITE[0], pass: SITE[1], next: "/stage.html" });
  const response = await worker.fetch(
    new Request("https://shosai.example/sign-in", { method: "POST", body }), env, {},
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), "/stage.html");

  const cookie = response.headers.get("Set-Cookie") || "";
  assert.match(cookie, /^__Host-shosai-session=/, "__Host- で置き場所を狭める");
  assert.match(cookie, /HttpOnly/, "スクリプトから読めないこと");
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=\d{6,}/, "再起動をまたいで残ること（これが今回の肝）");

  /* 配られたクッキーで実際に通れる。
     ★ここは実時刻で確かめること。トークンはWorkerが Date.now() で作るので、
       固定値のNOW（未来の時刻）で検証すると「もう期限切れ」と判定されてしまう。 */
  const token = cookieFrom(response);
  assert.equal(await readSessionToken(token, ACCOUNTS, realNow()), SITE[0]);
});

test("ログインの戻り先も外部へは飛ばさない", async () => {
  const body = new URLSearchParams({
    user: SITE[0], pass: SITE[1], next: "//evil.example/steal",
  });
  const response = await worker.fetch(
    new Request("https://shosai.example/sign-in", { method: "POST", body }), env, {},
  );
  assert.equal(response.headers.get("Location"), "/");
});

test("有効なクッキーがあれば中身が返る", async () => {
  const token = await createSessionToken(SITE[0], SITE[1], Math.floor(Date.now() / 1000));
  const response = await worker.fetch(
    get("/db.js", { ...SUBRESOURCE, Cookie: `__Host-shosai-session=${token}` }), env, {},
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset:/db.js");
});

test("期限切れのクッキーは中身を返さない", async () => {
  // 実時刻から見て確実に切れている時刻で発行する
  const stale = await createSessionToken(SITE[0], SITE[1], realNow() - SESSION_MAX_AGE - 100);
  const response = await worker.fetch(
    get("/db.js", { ...SUBRESOURCE, Cookie: `__Host-shosai-session=${stale}` }), env, {},
  );
  assert.equal(response.status, 401);
});

test("Basic認証は引き続き使えて、通ればクッキーも配る", async () => {
  // curl や既存の道具の入口を壊さないための保険
  const response = await worker.fetch(get("/db.js", basicHeader(SITE)), env, {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset:/db.js");
  assert.match(response.headers.get("Set-Cookie") || "", /^__Host-shosai-session=/);
});

test("誤ったBasic認証は通さない", async () => {
  const response = await worker.fetch(
    get("/db.js", { ...SUBRESOURCE, ...basicHeader([SITE[0], "wrong"]) }), env, {},
  );
  assert.equal(response.status, 401);
});

test("ゲスト口座でも入れる", async () => {
  const response = await worker.fetch(get("/stage.html", basicHeader(GUEST)), env, {});
  assert.equal(response.status, 200);
});

test("出るとクッキーが消える", async () => {
  const response = await worker.fetch(get("/sign-out", NAV), env, {});
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), "/sign-in");
  assert.match(response.headers.get("Set-Cookie") || "", /Max-Age=0/);
});

// ---------- 境界が緩んでいないか ----------

test("中身のあるファイルは、クッキーもBasicも無ければ出さない", async () => {
  for (const path of [
    "/", "/index.html", "/stage.html", "/db.js", "/roster.js", "/roster-crew.js",
    "/data.js", "/worker.js", "/wrangler.toml", "/stage-shows.local.js",
  ]) {
    const response = await worker.fetch(get(path, SUBRESOURCE), env, {});
    assert.equal(response.status, 401, `${path} は認証の内側`);
  }
});

test("アイコンとmanifestは今までどおり認証なしで返る", async () => {
  for (const path of ["/icons/stage-sketch-180.png", "/stage-sketch.webmanifest"]) {
    const response = await worker.fetch(get(path), env, {});
    assert.equal(response.status, 200, `${path} は公開`);
    assert.equal(response.headers.get("Set-Cookie"), null, "公開資源でクッキーを配らない");
  }
});

test("設定が片側だけなら止める", async () => {
  const broken = { ...env, GUEST_PASS: "" };
  const response = await worker.fetch(get("/", NAV), broken, {});
  assert.equal(response.status, 503);
});
