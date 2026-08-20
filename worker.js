import { SessionRoom } from "./session-room.js";

export { SessionRoom };

// サイト全体をBasic認証で保護する（制作の書斎、全タブ共通）。
//
// wrangler.toml の run_worker_first により、静的アセットより必ず先にここを通る。
// 正しければ env.ASSETS.fetch(request) で通常の静的ファイル配信へ渡す。
// IDとパスワードは Cloudflare の環境変数（Secret）SITE_USER / SITE_PASS に置き、
// このファイルやリポジトリには平文で残さない。
//
// 名簿タブの合言葉（scout_pass）とは別物。あちらはブラウザ内で名簿データを
// 復号するための鍵、こちらはサイトそのものへ入る前の関所。
//
// functions/_middleware.js（Cloudflare Pages Functions版）からの移植。
// このアカウントではPagesも内部的にWorkers化されており、静的アセットの配信が
// Pages Functionsより先に処理されて認証が一度も実行されなかったため、
// run_worker_firstを明示できるこちらの形式へ移した（2026-08-19）。

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

const ROOM_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function createRoomId() {
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (value) => ROOM_ID_ALPHABET[value % ROOM_ID_ALPHABET.length]).join("");
}

async function handleSessionRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/session/")) return null;

  if (request.method === "POST" && url.pathname === "/session/new") {
    const roomId = createRoomId();
    const room = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(roomId));
    const initialized = await room.fetch("https://do/new", { method: "POST" });
    if (!initialized.ok) return initialized;

    const result = await initialized.json();
    if (!result || result.ok !== true || typeof result.hostKey !== "string") {
      return jsonResponse({ ok: false, error: "room-initialization-failed" }, 502);
    }
    return jsonResponse({ roomId, hostKey: result.hostKey });
  }

  const match = url.pathname.match(/^\/session\/([^/]+)\/ws$/);
  if (request.method === "GET" && match) {
    const roomId = match[1];
    const room = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(roomId));
    const forwarded = new Request(`https://do/ws${url.search}`, {
      method: "GET",
      headers: request.headers,
    });
    return room.fetch(forwarded);
  }

  return jsonResponse({ ok: false, error: "not-found" }, 404);
}

async function serveAuthenticatedRequest(request, env) {
  const sessionResponse = await handleSessionRequest(request, env);
  if (sessionResponse) return sessionResponse;
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    // 本人用（SITE_USER/SITE_PASS）とゲスト用（GUEST_USER/GUEST_PASS）の2組を受け付ける。
    // ゲスト用が未設定ならゲスト入口は存在しないのと同じ。
    const accounts = [
      [env.SITE_USER, env.SITE_PASS],
      [env.GUEST_USER, env.GUEST_PASS],
    ].filter(([u, p]) => u && p);

    // 環境変数が未設定なら認証をかけない（設定忘れでロックアウトするより、
    // 意図的に外から確認しやすい状態を優先する）。
    if (accounts.length === 0) {
      return serveAuthenticatedRequest(request, env);
    }

    const authHeader = request.headers.get("Authorization") || "";
    const [scheme, encoded] = authHeader.split(" ");

    if (scheme === "Basic" && encoded) {
      let decoded = "";
      try {
        decoded = atob(encoded);
      } catch (error) {
        decoded = "";
      }
      const sep = decoded.indexOf(":");
      if (sep !== -1) {
        const user = decoded.slice(0, sep);
        const pass = decoded.slice(sep + 1);
        const ok = accounts.some(([expectedUser, expectedPass]) =>
          timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass));
        if (ok) {
          return serveAuthenticatedRequest(request, env);
        }
      }
    }

    return new Response("認証が必要です。", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="制作の書斎", charset="UTF-8"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  },
};
