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

test("ベータ設定が未指定ならactiveを返す", async () => {
  const response = await worker.fetch(get("/beta-status"), env, {});

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    betaActive: true,
    message: null,
    productUrl: null,
  });
});

test("ベータ終了時は認証なしで案内文と製品版URLを返す", async () => {
  const betaEnv = {
    ...env,
    STAGE_BETA_ACTIVE: "false",
    STAGE_BETA_MESSAGE: "ベータ版の提供を終了しました。",
    STAGE_BETA_PRODUCT_URL: "https://product.example/stage-sketch",
  };
  const response = await worker.fetch(get("/beta-status"), betaEnv, {});

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    betaActive: false,
    message: betaEnv.STAGE_BETA_MESSAGE,
    productUrl: betaEnv.STAGE_BETA_PRODUCT_URL,
  });
});

test("期限切れCookieがあってもbeta-statusのactive状態は読める", async () => {
  const expiredToken = await createSessionToken(SITE[0], SITE[1], 0);
  const response = await worker.fetch(
    get("/beta-status", { Cookie: `__Host-shosai-session=${expiredToken}` }), env, {},
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

test("未認証で読めるのはbeta-statusだけ", async () => {
  const response = await worker.fetch(get("/stage-sketch.js"), env, {});

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("認証設定に不備があればbeta-statusも503で止まる", async () => {
  const response = await worker.fetch(get("/beta-status"), {
    ...env,
    SITE_PASS: undefined,
  }, {});

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
