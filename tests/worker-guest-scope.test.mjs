import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import worker, { createSessionToken } from "../worker.js";

const root = new URL("../", import.meta.url);
const stageHtml = await readFile(new URL("stage.html", root), "utf8");
const origin = "https://stage.example";
const OWNER = ["owner", "synthetic-owner-pass"];
const GUESTS = [["legacy", "synthetic-legacy-pass"], ["guest4", "synthetic-guest-pass"]];
const basic = ([user, pass]) => ({ Authorization: `Basic ${btoa(`${user}:${pass}`)}` });
function environment() {
  const fetched = [];
  return {
    fetched,
    SITE_USER: OWNER[0], SITE_PASS: OWNER[1],
    GUEST_USER: GUESTS[0][0], GUEST_PASS: GUESTS[0][1],
    GUEST_ACCOUNTS: JSON.stringify([{ user: GUESTS[1][0], pass: GUESTS[1][1], label: "owner", role: "owner" }]),
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        fetched.push(path);
        const html = path === "/stage" || path === "/stage.html";
        return new Response(request.method === "HEAD" ? null : (html ? stageHtml : `asset:${path}`), {
          headers: { "Content-Type": html ? "text/html; charset=utf-8" : "text/plain", "ETag": "original", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  };
}
const get = (path, headers, method = "GET") => new Request(origin + path, { method, headers });
async function credentials(account) {
  // 修正前と同じ形式の発行済みCookieも、認可は毎回サーバー側で判定する。
  const token = await createSessionToken(account[0], account[1], Math.floor(Date.now() / 1000) - 3600);
  return [basic(account), { Cookie: `__Host-shosai-session=${token}` }];
}

test("managed/legacy guest: Basicと既存Cookieで書斎・データ・未知の資源を配信しない", async () => {
  const blocked = [
    "/index", "/index.html", "/db.js", "/data.js", "/book-seeds.js", "/app.js",
    "/roster.js", "/roster-crew.js", "/roster-key.local.js", "/stage-shows.local.js?v=1",
    "/worker.js", "/stage-sketch_backup_old.js", "/stage-new-private.js",
    "/public-dist/index.html", "/public-lp/index.html", "/downloads/shosai-desk-mac.zip",
    "/manual/new-private.html", "/stage-samples/README.md", "/data/private.json",
    "/%64b.js", "/stage.html%2f..%2fdb.js", "/stage.html%252f..%252fdb.js",
    "/manual/%2e%2e/db.js", "/stage.html/../db.js", "/stage.html/", "/stage.html;private",
    "/stage.html%00", "/stage.html%5c..%5cdb.js", "/stage.html%3f/../db.js",
  ];
  for (const account of GUESTS) for (const auth of await credentials(account)) {
    const env = environment();
    for (const method of ["GET", "HEAD"]) for (const path of blocked) {
      const response = await worker.fetch(get(path, { ...auth, "X-Shosai-Session-Owner": OWNER[0] }, method), env, {});
      assert.equal(response.status, 403, `${account[0]} ${method} ${path}`);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
    }
    assert.deepEqual(env.fetched, [], "拒否対象をASSETSへ渡さない");
    for (const path of ["/style.css", "/stage.html"]) {
      assert.equal((await worker.fetch(get(path, auth, "POST"), env, {})).status, 403);
    }
  }
});

test("SITE_USERは従来の書斎・資料・個人ショーを読み、HTTPキャッシュでは共有しない", async () => {
  for (const auth of await credentials(OWNER)) {
    const env = environment();
    for (const path of ["/", "/index.html", "/db.js", "/roster-key.local.js", "/stage-shows.local.js"]) {
      const response = await worker.fetch(get(path, auth), env, {});
      assert.equal(response.status, 200, path);
      assert.equal(await response.text(), `asset:${path}`);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
    const ownerStage = await worker.fetch(get("/stage.html", auth), env, {});
    assert.equal(await ownerStage.text(), stageHtml, "本人の単独ページと自動ショー読込を保持");
  }
});

test("ゲストへ返す単独HTMLから個人ショーのscriptだけを外す", async () => {
  for (const path of ["/stage.html?lang=en", "/stage?lang=ja"]) {
    const response = await worker.fetch(get(path, basic(GUESTS[1])), environment(), {});
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.doesNotMatch(html, /<script[^>]+stage-shows\.local\.js/);
    assert.match(html, /<script src="stage-sketch\.js/);
    assert.match(html, /id="view-stage"/);
    assert.equal(response.headers.get("ETag"), null, "書換前のvalidatorを使わない");
    assert.equal(response.headers.get("Vary"), "Cookie, Authorization");
  }
});

test("指定したβ配信スコープを本人・ゲストの単独HTMLへ注入する", async () => {
  for (const account of [OWNER, GUESTS[1]]) {
    const env = environment();
    env.STAGE_RELEASE_SCOPE = "beta-20260912";
    const response = await worker.fetch(get("/stage.html", basic(account)), env, {});
    const html = await response.text();
    assert.match(html, /window\.SHOSAI_RELEASE_SCOPE="beta-20260912"/);
    assert.match(html, /document\.documentElement\.dataset\.releaseScope="beta-20260912"/);
    assert.equal((html.match(/SHOSAI_RELEASE_SCOPE/g) || []).length, 1);
  }
});

test("配信済みの旧HTMLも本人・ゲストの名称だけを更新し、本人のショーは保持する", async () => {
  const oldHtml = stageHtml.replace("<title>舞台スケッチ | Stage Sketch</title>", "<title>舞台スケッチ — 制作の書斎</title>");
  assert.notEqual(oldHtml, stageHtml);
  for (const account of [OWNER, GUESTS[1]]) for (const path of ["/stage.html", "/stage?lang=en"]) {
    const env = environment();
    env.ASSETS.fetch = async (request) => {
      assert.equal(request.headers.get("If-None-Match"), null);
      assert.equal(request.headers.get("Range"), null);
      return new Response(oldHtml, { headers: { "Content-Type": "text/html", ETag: "old-title" } });
    };
    const response = await worker.fetch(get(path, { ...basic(account), "If-None-Match": "old-title", Range: "bytes=0-500" }), env, {});
    const actual = await response.text();
    const expected = account === OWNER ? stageHtml : stageHtml.replace(/<script\s+src="stage-shows\.local\.js(?:\?[^"<>]*)?"\s*>\s*<\/script>/g, "");
    assert.equal(actual, expected, "名称とゲストの個人ショー参照以外は変更しない");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("ETag"), null);
  }
});

test("ゲストの舞台編集・PWA・ガイドの依存資源がすべて通る", async () => {
  const sandbox = { URL, self: { location: { href: origin + "/stage-sw.js" }, addEventListener() {} } };
  vm.runInNewContext((await readFile(new URL("stage-sw.js", root), "utf8")) + "\nglobalThis.shell = APP_SHELL;", sandbox);
  const paths = new Set([...sandbox.shell, "./stage-sw.js"]);
  const servedHtml = await (await worker.fetch(get("/stage.html", basic(GUESTS[1])), environment(), {})).text();
  for (const m of servedHtml.matchAll(/(?:src|href)="([^"]+)"/g)) paths.add(m[1]);
  for (const name of ["manual/manual.html", "manual/quick.html", "manual/quick-en.html"]) {
    const html = await readFile(new URL(name, root), "utf8");
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const url = new URL(m[1], origin + "/" + name);
      if (url.origin === origin) paths.add(url.pathname);
    }
  }
  paths.add("/manual/QuickGuide_2026-08-28.pdf");
  paths.add(encodeURI("/manual/クイックガイド_2026-08-28.pdf"));
  for (const path of paths) {
    const url = new URL(path, origin + "/");
    if (url.origin !== origin || url.hash && !url.pathname) continue;
    const response = await worker.fetch(new Request(url, { headers: basic(GUESTS[1]) }), environment(), {});
    assert.equal(response.status, 200, `${url.pathname} がゲストの依存から抜けている`);
  }
  for (const path of ["/stage", "/manual/manual", "/manual/quick", "/manual/quick-en"]) {
    assert.equal((await worker.fetch(get(path, basic(GUESTS[1]), "HEAD"), environment(), {})).status, 200, path);
  }
});

test("本人用のvalidator・Rangeを引き継がず、ゲスト用HTMLを必ず変換する", async () => {
  const env = environment();
  const originalFetch = env.ASSETS.fetch;
  env.ASSETS.fetch = async (request) => {
    for (const name of ["If-None-Match", "If-Modified-Since", "If-Match", "If-Unmodified-Since", "If-Range", "Range"]) {
      assert.equal(request.headers.get(name), null, name);
    }
    return originalFetch(request);
  };
  const response = await worker.fetch(get("/stage.html", {
    ...basic(GUESTS[1]), "If-None-Match": "owner-etag", "If-Modified-Since": "Tue, 08 Sep 2026 00:00:00 GMT",
    Range: "bytes=0-500", "If-Range": "owner-etag", "If-Match": "owner-etag", "If-Unmodified-Since": "Tue, 08 Sep 2026 00:00:00 GMT",
  }), env, {});
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /<script[^>]+stage-shows\.local\.js/);
});

test("ゲストのrootとログイン戻り先は舞台へ・英語指定と招待セッションを保持", async () => {
  for (const account of GUESTS) {
    const env = environment();
    const home = await worker.fetch(get("/?lang=en", basic(account)), env, {});
    assert.equal(home.status, 303);
    assert.equal(home.headers.get("Location"), "/stage.html?lang=en");
    const cases = [
      ["/db.js", "/stage.html"], ["/index.html?lang=en#desk", "/stage.html?lang=en"],
      ["/stage.html?lang=en#session=abc", "/stage.html?lang=en#session=abc"],
      ["/stage?lang=ja#session=abc", "/stage?lang=ja#session=abc"],
      ["/stage.html/../db.js", "/stage.html"], ["/\\evil.example", "/stage.html"],
      ["//evil.example/stage.html", "/stage.html"],
    ];
    for (const [next, expected] of cases) {
      const body = new URLSearchParams({ user: account[0], pass: account[1], next });
      const response = await worker.fetch(new Request(origin + "/sign-in", { method: "POST", body }), env, {});
      assert.equal(response.status, 303);
      assert.equal(response.headers.get("Location"), expected);
      assert.match(response.headers.get("Set-Cookie"), /^__Host-shosai-session=/);
    }
  }
});

test("配信層の正規URL転送は許可し、書斎・外部への転送は拒否", async () => {
  for (const [location, expected] of [["/stage?lang=en", 307], ["/index.html", 403], ["https://evil.example/stage", 403]]) {
    const env = environment();
    env.ASSETS.fetch = async () => new Response(null, { status: 307, headers: { Location: location } });
    const response = await worker.fetch(get("/stage.html?lang=en", basic(GUESTS[1])), env, {});
    assert.equal(response.status, expected, location);
  }
});

test("サインインの名称は舞台スケッチ、英語招待ではStage Sketch", async () => {
  for (const [next, title] of [["/stage.html", "舞台スケッチ"], ["/stage.html?lang=en", "Stage Sketch"]]) {
    const response = await worker.fetch(get(`/sign-in?next=${encodeURIComponent(next)}`, {}), environment(), {});
    const html = await response.text();
    assert.match(html, new RegExp(`<h1>${title}</h1>`));
    assert.match(html, new RegExp(`<title>${title}</title>`));
    assert.match(html, /Sign in to Stage Sketch/);
    assert.doesNotMatch(html, /制作の書斎|A desk and a shelf/);
  }
});

test("本人用と旧ゲスト用の同名設定を拒否して権限の取り違えを防ぐ", async () => {
  const env = { ...environment(), GUEST_USER: OWNER[0], GUEST_PASS: "different-pass" };
  const response = await worker.fetch(get("/db.js", basic([OWNER[0], "different-pass"])), env, {});
  assert.equal(response.status, 503);
  assert.deepEqual(env.fetched, []);
});
