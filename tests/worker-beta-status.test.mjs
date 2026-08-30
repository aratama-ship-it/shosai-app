import assert from "node:assert/strict";
import test from "node:test";

import worker, { createSessionToken } from "../worker.js";

const SITE = ["arata", "site-pass-123"];
const GUEST = ["guest", "guest-pass-456"];

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

const get = (path, headers = {}) =>
  new Request(`https://shosai.example${path}`, { method: "GET", headers });

const basicHeader = ([user, pass]) => ({ Authorization: `Basic ${btoa(`${user}:${pass}`)}` });

test("ベータ設定が未指定ならCookie認証後にactiveを返す", async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken(SITE[0], SITE[1], now);
  const response = await worker.fetch(
    get("/beta-status", { Cookie: `__Host-shosai-session=${token}` }), env, {},
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    betaActive: true,
    message: null,
    productUrl: null,
  });
});

test("ベータ終了時はBasic認証後に案内文と製品版URLを返す", async () => {
  const betaEnv = {
    ...env,
    STAGE_BETA_ACTIVE: "false",
    STAGE_BETA_MESSAGE: "ベータ版の提供を終了しました。",
    STAGE_BETA_PRODUCT_URL: "https://product.example/stage-sketch",
  };
  const response = await worker.fetch(
    get("/beta-status", basicHeader(SITE)), betaEnv, {},
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    betaActive: false,
    message: betaEnv.STAGE_BETA_MESSAGE,
    productUrl: betaEnv.STAGE_BETA_PRODUCT_URL,
  });
});

test("未認証ではbeta-statusへ到達できない", async () => {
  const response = await worker.fetch(get("/beta-status"), env, {});

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
