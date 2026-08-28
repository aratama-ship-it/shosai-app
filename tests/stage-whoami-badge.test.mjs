import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import worker, { createSessionToken, isPublicAppShellAsset } from "../worker.js";

const root = new URL("../", import.meta.url);
const [workerSource, stageSource, swSource, indexSource, styleSource, i18nSource] =
  await Promise.all([
    "worker.js", "stage-sketch.js", "stage-sw.js", "index.html", "style.css", "stage-i18n.js",
  ].map((name) => readFile(new URL(name, root), "utf8")));

const SITE = ["arata", "site-pass"];
const GUEST = ["guest1", "guest-pass"];

function workerEnv() {
  let assetCalls = 0;
  return {
    env: {
      SITE_USER: SITE[0], SITE_PASS: SITE[1],
      GUEST_USER: GUEST[0], GUEST_PASS: GUEST[1],
      ASSETS: {
        fetch: async () => {
          assetCalls += 1;
          return new Response("asset", { status: 200 });
        },
      },
    },
    assetCalls: () => assetCalls,
  };
}

const basicHeader = ([user, pass]) => ({
  Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
});

test("/whoami はクッキー認証の利用者名を no-store で返す", async () => {
  const fixture = workerEnv();
  const token = await createSessionToken(SITE[0], SITE[1], Math.floor(Date.now() / 1000));
  const response = await worker.fetch(new Request("https://shosai.example/whoami", {
    headers: { Cookie: `__Host-shosai-session=${token}` },
  }), fixture.env, {});

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(response.headers.get("Content-Type") || "", /application\/json/);
  assert.deepEqual(await response.json(), { user: SITE[0] });
  assert.equal(fixture.assetCalls(), 0, "静的アセット配信へ落とさない");
});

test("/whoami は Basic 認証でも同じ利用者名を返す", async () => {
  const fixture = workerEnv();
  const response = await worker.fetch(new Request("https://shosai.example/whoami", {
    headers: basicHeader(GUEST),
  }), fixture.env, {});

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { user: GUEST[0] });
  assert.equal(fixture.assetCalls(), 0);
});

test("/whoami は GET と HEAD だけを受け付ける", async () => {
  const fixture = workerEnv();
  const head = await worker.fetch(new Request("https://shosai.example/whoami", {
    method: "HEAD", headers: basicHeader(SITE),
  }), fixture.env, {});
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("Cache-Control"), "no-store");
  assert.equal(await head.text(), "");

  const post = await worker.fetch(new Request("https://shosai.example/whoami", {
    method: "POST", headers: basicHeader(SITE),
  }), fixture.env, {});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET, HEAD");
  assert.equal(post.headers.get("Cache-Control"), "no-store");
});

test("/whoami は PWA キャッシュにも公開リストにも入れない", async () => {
  assert.doesNotMatch(swSource, /["'](?:\.\/|\/)whoami["']/);
  assert.equal(
    isPublicAppShellAsset(new Request("https://shosai.example/whoami")),
    false,
  );

  const fixture = workerEnv();
  const response = await worker.fetch(
    new Request("https://shosai.example/whoami"), fixture.env, {},
  );
  assert.equal(response.status, 401, "未ログインでは認証の内側に留める");
  assert.equal(fixture.assetCalls(), 0);
});

test("認証済み配信関数は利用者名を受け取り、両認証経路から渡される", () => {
  assert.match(workerSource, /serveAuthenticatedRequest\(request, env, user\)/);
  assert.match(workerSource, /serveAuthenticatedRequest\(request, env, cookieUser\)/);
  assert.match(workerSource, /serveAuthenticatedRequest\(request, env, basicAccount\[0\]\)/);
});

test("利用者切り替えで消す鍵は設定とツアーだけ", () => {
  const resetList = stageSource.match(/const USER_SWITCH_RESET_KEYS = \[([^\]]+)\]/)?.[1] || "";
  assert.match(resetList, /PREFS_KEY/);
  assert.match(resetList, /TOUR_KEY/);

  for (const protectedKey of [
    "shosai-stage-shows-v1",
    "shosai-stage-sketch-v1",
    "shosai-stage-shows-broken-v1",
    "shosai-stage-models-v1",
    "shosai-stage-lang",
  ]) {
    assert.ok(!resetList.includes(protectedKey), `${protectedKey} を初期化対象へ入れない`);
  }
  assert.doesNotMatch(stageSource, /localStorage\.clear\s*\(/);
});

test("利用者切り替え時は既定配置へ戻し、全パネルを閉じる", () => {
  const closedLayout = stageSource.slice(
    stageSource.indexOf("function closedDefaultLayout()"),
    stageSource.indexOf("function normalizeLayout(raw)"),
  );
  assert.match(closedLayout, /const layout = defaultLayout\(\)/);
  assert.match(closedLayout, /PANELS\.forEach\(\(id\) => \{ layout\.collapsed\[id\] = true; \}\)/);

  const initialSetup = stageSource.slice(
    stageSource.indexOf("function finishInitialStageSetup(identity)"),
    stageSource.indexOf("window.SHOSAI_STAGE_SESSION_BRIDGE"),
  );
  assert.match(initialSetup, /if \(identity && identity\.switched\)/);
  assert.match(initialSetup, /state\.layout = closedDefaultLayout\(\)/);
  assert.ok(
    initialSetup.indexOf("state.layout = closedDefaultLayout()") < initialSetup.indexOf("render();"),
    "初回描画より前に配置を閉じる",
  );
  assert.match(stageSource, /whoamiRequest\.then\(finishInitialStageSetup/);
});

test("whoami 取得失敗時は表示を hidden のままにする", () => {
  assert.match(indexSource, /id="stage-session-whoami"[^>]*role="status"[^>]*hidden/);
  const badgeUpdate = stageSource.slice(
    stageSource.indexOf("function updateWhoamiBadge()"),
    stageSource.indexOf("/* ★開く言語はここで決める"),
  );
  assert.match(badgeUpdate, /if \(!signedInUser\)[\s\S]*?badge\.hidden = true;[\s\S]*?return;/);
  assert.match(badgeUpdate, /badge\.hidden = false/);
  assert.match(stageSource, /catch \(_\) \{\s*return null;\s*\} finally/);
});

test("ログイン者表示は既存の小さな標しの作法と端末用の移動経路を持つ", () => {
  const whoamiCss = styleSource.slice(
    styleSource.indexOf(".stage-session-whoami {", styleSource.indexOf("ログインしている人の目印")),
    styleSource.indexOf(".stage-session-host-away"),
  );
  assert.match(whoamiCss, /border-left: 2px solid/);
  assert.match(whoamiCss, /color: var\(--brass\)/);
  assert.match(whoamiCss, /font-size: 11px/);
  assert.match(whoamiCss, /letter-spacing: 0\.18em/);
  assert.match(whoamiCss, /white-space: nowrap/);
  assert.match(stageSource, /getElementById\("stage-session-whoami"\)[\s\S]{0,120}titleBar\.append/);
  assert.match(i18nSource, /"\{\{user\}\} でログイン中": "Signed in as \{\{user\}\}"/);
});
