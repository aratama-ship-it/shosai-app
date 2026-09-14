var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// session-room.js
var MAX_CONNECTIONS = 20;
var MAX_DOCUMENT_BYTES = 1800 * 1024;
var MAX_MESSAGE_BYTES = MAX_DOCUMENT_BYTES + 64 * 1024;
var MAX_OP_BYTES = 64 * 1024;
var EMPTY_ROOM_TTL_MS = 10 * 60 * 1e3;
var SESSION_OWNER_HEADER = "X-Shosai-Session-Owner";
var MAX_SESSION_OWNER_LENGTH = 128;
var COLORS = [
  "#d3ac59",
  "#7fb3d5",
  "#c39bd3",
  "#7dcea0",
  "#f1948a",
  "#85c1e9",
  "#f8c471",
  "#a3e4d7"
];
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function byteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}
__name(byteLength, "byteLength");
function sanitizeName(value) {
  const withoutControls = String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
  return Array.from(withoutControls).slice(0, 50).join("");
}
__name(sanitizeName, "sanitizeName");
function sessionOwnerFrom(request) {
  const owner = request.headers.get(SESSION_OWNER_HEADER) || "";
  if (owner.length > MAX_SESSION_OWNER_LENGTH || /[\u0000-\u001f\u007f-\u009f]/.test(owner)) return null;
  return owner;
}
__name(sessionOwnerFrom, "sessionOwnerFrom");
function readAttachment(ws) {
  try {
    const attachment = ws.deserializeAttachment();
    return attachment && typeof attachment === "object" ? attachment : null;
  } catch (_) {
    return null;
  }
}
__name(readAttachment, "readAttachment");
function participantFrom(attachment) {
  return {
    clientId: attachment.clientId,
    name: attachment.name,
    role: attachment.role,
    color: attachment.color
  };
}
__name(participantFrom, "participantFrom");
function senderFrom(attachment) {
  return {
    clientId: attachment.clientId,
    name: attachment.name,
    color: attachment.color
  };
}
__name(senderFrom, "senderFrom");
function isOpen(ws) {
  return ws.readyState !== 2 && ws.readyState !== 3;
}
__name(isOpen, "isOpen");
function safeSend(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (_) {
  }
}
__name(safeSend, "safeSend");
var SessionRoom = class {
  static {
    __name(this, "SessionRoom");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/new") {
      const hostOwner = sessionOwnerFrom(request);
      if (hostOwner === null) return jsonResponse({ ok: false, error: "bad-owner" }, 400);
      const hostKey = crypto.randomUUID();
      await this.ctx.storage.put("hostKey", hostKey);
      await this.ctx.storage.put("hostOwner", hostOwner);
      return jsonResponse({ ok: true, hostKey });
    }
    if (request.method === "GET" && url.pathname === "/resume") {
      return this.resumeStatus(request, url);
    }
    if (request.method === "GET" && url.pathname === "/ws") {
      return this.upgradeWebSocket(request, url);
    }
    return jsonResponse({ ok: false, error: "not-found" }, 404);
  }
  async resumeStatus(request, url) {
    const expectedHostKey = await this.ctx.storage.get("hostKey");
    const hostOwner = sessionOwnerFrom(request);
    if (!expectedHostKey || url.searchParams.get("key") !== expectedHostKey || hostOwner === null) {
      return jsonResponse({ ok: false, reason: "not-resumable" }, 403);
    }
    const expectedHostOwner = await this.ctx.storage.get("hostOwner");
    if (typeof expectedHostOwner !== "string") {
      return jsonResponse({ ok: false, reason: "session-updated" }, 409);
    }
    if (hostOwner !== expectedHostOwner) {
      return jsonResponse({ ok: false, reason: "not-resumable" }, 403);
    }
    return jsonResponse({ ok: true });
  }
  async upgradeWebSocket(request, url) {
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
      return jsonResponse({ ok: false, error: "websocket-upgrade-required" }, 426);
    }
    const role = url.searchParams.get("role");
    if (role !== "host" && role !== "guest") {
      return jsonResponse({ ok: false, error: "bad-role" }, 400);
    }
    if (role === "host") {
      const expectedHostKey = await this.ctx.storage.get("hostKey");
      const expectedHostOwner = await this.ctx.storage.get("hostOwner");
      const hostOwner = sessionOwnerFrom(request);
      if (!expectedHostKey || typeof expectedHostOwner !== "string" || hostOwner === null || url.searchParams.get("key") !== expectedHostKey || hostOwner !== expectedHostOwner) {
        return jsonResponse({ t: "bad-key" }, 403);
      }
    }
    const currentSockets = this.ctx.getWebSockets().filter(isOpen);
    if (currentSockets.length >= MAX_CONNECTIONS) {
      return this.rejectWebSocket({ t: "full" }, 1013, "Room is full");
    }
    const colorIndex = Number(await this.ctx.storage.get("nextColorIndex")) || 0;
    await this.ctx.storage.put("nextColorIndex", colorIndex + 1);
    await this.ctx.storage.deleteAlarm();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const attachment = {
      clientId: crypto.randomUUID(),
      role,
      name: sanitizeName(url.searchParams.get("name")),
      color: COLORS[colorIndex % COLORS.length]
    };
    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);
    const doc = await this.ctx.storage.get("doc") ?? null;
    safeSend(server, {
      t: "welcome",
      clientId: attachment.clientId,
      role: attachment.role,
      color: attachment.color,
      participants: this.participants(),
      doc
    });
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }
  rejectWebSocket(payload, code, reason) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    safeSend(server, payload);
    server.close(code, reason);
    return new Response(null, { status: 101, webSocket: client });
  }
  participants(excludedSocket = null) {
    return this.ctx.getWebSockets().filter((socket) => socket !== excludedSocket && isOpen(socket)).map(readAttachment).filter((attachment) => attachment && (attachment.role === "host" || attachment.role === "guest")).map(participantFrom);
  }
  broadcastPresence(excludedSocket = null) {
    const payload = { t: "presence", participants: this.participants(excludedSocket) };
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== excludedSocket && isOpen(socket)) safeSend(socket, payload);
    }
  }
  deny(ws, reason) {
    safeSend(ws, { t: "denied", reason });
  }
  async webSocketMessage(ws, message) {
    if (typeof message !== "string") return;
    const messageBytes = byteLength(message);
    if (messageBytes > MAX_MESSAGE_BYTES) return;
    let data;
    try {
      data = JSON.parse(message);
    } catch (_) {
      return;
    }
    if (!data || typeof data !== "object") return;
    const attachment = readAttachment(ws);
    if (!attachment) return;
    if (data.t === "doc") {
      if (attachment.role !== "host") {
        this.deny(ws, "host-only");
        return;
      }
      if (typeof data.doc !== "string") {
        this.deny(ws, "invalid-doc");
        return;
      }
      const documentBytes = byteLength(data.doc);
      if (documentBytes > MAX_DOCUMENT_BYTES) {
        this.deny(ws, "doc-too-large");
        return;
      }
      try {
        await this.ctx.storage.put("doc", data.doc);
      } catch (_) {
        this.deny(ws, "doc-storage-failed");
        return;
      }
      safeSend(ws, {
        t: "doc-saved",
        documentId: Number.isInteger(data.documentId) ? data.documentId : null,
        bytes: documentBytes
      });
      for (const socket of this.ctx.getWebSockets()) {
        const target = readAttachment(socket);
        if (isOpen(socket) && target && target.role !== "host") {
          safeSend(socket, { t: "doc", doc: data.doc });
        }
      }
      return;
    }
    if (data.t === "op") {
      if (attachment.role !== "guest") {
        this.deny(ws, "guest-only");
        return;
      }
      if (!data.op || typeof data.op !== "object" || data.op.kind !== "piece.move" && data.op.kind !== "arrows.add") {
        this.deny(ws, "invalid-op");
        return;
      }
      if (byteLength(JSON.stringify(data.op)) > MAX_OP_BYTES) {
        this.deny(ws, "op-too-large");
        return;
      }
      const hosts = this.ctx.getWebSockets().filter((socket) => {
        const target = readAttachment(socket);
        return isOpen(socket) && target && target.role === "host";
      });
      if (hosts.length === 0) {
        this.deny(ws, "no-host");
        return;
      }
      const payload = { t: "op", op: data.op, from: senderFrom(attachment) };
      for (const host of hosts) safeSend(host, payload);
      for (const socket of this.ctx.getWebSockets()) {
        if (socket === ws || !isOpen(socket)) continue;
        const target = readAttachment(socket);
        if (target && target.role === "guest") safeSend(socket, payload);
      }
      return;
    }
    if (data.t === "activity") {
      const payload = { t: "activity", from: senderFrom(attachment) };
      for (const socket of this.ctx.getWebSockets()) {
        if (socket !== ws && isOpen(socket)) safeSend(socket, payload);
      }
      return;
    }
    if (data.t === "pointer") {
      if (typeof data.view !== "string" || typeof data.x !== "number" || !Number.isFinite(data.x) || data.x < 0 || data.x > 1 || typeof data.y !== "number" || !Number.isFinite(data.y) || data.y < 0 || data.y > 1 || typeof data.on !== "boolean") {
        return;
      }
      const payload = {
        t: "pointer",
        view: data.view,
        x: data.x,
        y: data.y,
        on: data.on,
        from: senderFrom(attachment)
      };
      for (const socket of this.ctx.getWebSockets()) {
        if (socket !== ws && isOpen(socket)) safeSend(socket, payload);
      }
    }
  }
  async handleDisconnect(ws) {
    this.broadcastPresence(ws);
    const remaining = this.ctx.getWebSockets().filter((socket) => socket !== ws && isOpen(socket));
    if (remaining.length === 0) {
      await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    }
  }
  async webSocketClose(ws) {
    await this.handleDisconnect(ws);
  }
  async webSocketError(ws) {
    try {
      ws.close(1011, "WebSocket error");
    } catch (_) {
    }
    await this.handleDisconnect(ws);
  }
  async alarm() {
    if (this.ctx.getWebSockets().filter(isOpen).length === 0) {
      await this.ctx.storage.deleteAll();
    }
  }
};

// worker.js
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function isLocalHost(request) {
  let hostname = "";
  try {
    hostname = new URL(request.url).hostname;
  } catch (_) {
    return false;
  }
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname.endsWith(".localhost");
}
__name(isLocalHost, "isLocalHost");
var ROOM_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
var SESSION_OWNER_HEADER2 = "X-Shosai-Session-Owner";
function jsonResponse2(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(jsonResponse2, "jsonResponse");
function createRoomId() {
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (value) => ROOM_ID_ALPHABET[value % ROOM_ID_ALPHABET.length]).join("");
}
__name(createRoomId, "createRoomId");
async function handleSessionRequest(request, env, user) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/session/")) return null;
  if (request.method === "POST" && url.pathname === "/session/new") {
    const roomId = createRoomId();
    const room = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(roomId));
    const initialized = await room.fetch("https://do/new", {
      method: "POST",
      headers: { [SESSION_OWNER_HEADER2]: user || "" }
    });
    if (!initialized.ok) return initialized;
    const result = await initialized.json();
    if (!result || result.ok !== true || typeof result.hostKey !== "string") {
      return jsonResponse2({ ok: false, error: "room-initialization-failed" }, 502);
    }
    return jsonResponse2({ roomId, hostKey: result.hostKey, user: user || "" });
  }
  const resumeMatch = url.pathname.match(/^\/session\/([^/]+)\/resume$/);
  if (request.method === "GET" && resumeMatch) {
    const roomId = resumeMatch[1];
    const room = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(roomId));
    const headers = new Headers(request.headers);
    headers.set(SESSION_OWNER_HEADER2, user || "");
    const key = url.searchParams.get("key") || "";
    return room.fetch(new Request(`https://do/resume?key=${encodeURIComponent(key)}`, {
      method: "GET",
      headers
    }));
  }
  const match = url.pathname.match(/^\/session\/([^/]+)\/ws$/);
  if (request.method === "GET" && match) {
    const roomId = match[1];
    const room = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(roomId));
    const headers = new Headers(request.headers);
    headers.set(SESSION_OWNER_HEADER2, user || "");
    const forwarded = new Request(`https://do/ws${url.search}`, {
      method: "GET",
      headers
    });
    return room.fetch(forwarded);
  }
  return jsonResponse2({ ok: false, error: "not-found" }, 404);
}
__name(handleSessionRequest, "handleSessionRequest");
function handleWhoamiRequest(request, user) {
  const { pathname } = new URL(request.url);
  if (pathname !== "/whoami") return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: {
        "Allow": "GET, HEAD",
        "Cache-Control": "no-store"
      }
    });
  }
  return new Response(request.method === "HEAD" ? null : JSON.stringify({ user: user || "" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(handleWhoamiRequest, "handleWhoamiRequest");
function handleBetaStatusRequest(request, env) {
  const { pathname } = new URL(request.url);
  if (pathname !== "/beta-status") return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: {
        "Allow": "GET, HEAD",
        "Cache-Control": "no-store"
      }
    });
  }
  const betaActive = env.STAGE_BETA_ACTIVE !== "false";
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
  return jsonResponse2({
    ok: true,
    betaActive,
    message: !betaActive && env.STAGE_BETA_MESSAGE ? env.STAGE_BETA_MESSAGE : null,
    productUrl: !betaActive && env.STAGE_BETA_PRODUCT_URL ? env.STAGE_BETA_PRODUCT_URL : null
  });
}
__name(handleBetaStatusRequest, "handleBetaStatusRequest");
var GUEST_STAGE_DOCUMENTS = /* @__PURE__ */ new Set(["/stage.html", "/stage"]);
var GUEST_STAGE_ASSETS = new Set([
  ...GUEST_STAGE_DOCUMENTS,
  "/style.css",
  "/stage-sw.js",
  "/stage-pwa.js",
  "/stage-sketch.js",
  "/stage-venues.js",
  "/stage-venue-lines.js",
  "/stage-i18n.js",
  "/stage-prompt-i18n.js",
  "/stage-rehearsal-export.js",
  "/stage-samples/index.js",
  "/stage-set-model.js",
  "/stage-set-builder.js",
  "/stage-machinery.js",
  "/stage-first-person.js",
  "/stage-audio-store.js",
  "/stage-session.js",
  "/stage-venue-editor.js",
  "/stage-sketch.webmanifest",
  "/manual/manual-content.js",
  "/manual/manual.html",
  "/manual/manual",
  "/manual/quick.html",
  "/manual/quick",
  "/manual/quick-en.html",
  "/manual/quick-en",
  "/manual/QuickGuide_2026-08-28.pdf",
  "/manual/GuideBooklet_2026-08-29.pdf",
  "/manual/\u30AF\u30A4\u30C3\u30AF\u30AC\u30A4\u30C9_2026-08-28.pdf",
  "/manual/\u4F7F\u3044\u304B\u305F\u306E\u518A\u5B50_2026-08-29.pdf",
  ...["cover-trapeze", "duo-front", "duo-plan", "cast-poses-props", "scene-map"].flatMap((name) => [`/manual/img/${name}.png`, `/manual/img/${name}-en.png`])
].map((path) => encodeURI(path)));
function isGuestAccount(user, env) {
  return user !== null && user !== env.SITE_USER;
}
__name(isGuestAccount, "isGuestAccount");
function isGuestStageAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return GUEST_STAGE_ASSETS.has(new URL(request.url).pathname);
}
__name(isGuestStageAsset, "isGuestStageAsset");
function guestStageEntry(value) {
  const url = new URL(safeNextPath(value), "https://stage.invalid");
  if (GUEST_STAGE_DOCUMENTS.has(url.pathname)) return url.pathname + url.search + url.hash;
  const lang = url.searchParams.get("lang");
  return "/stage.html" + (lang === "en" || lang === "ja" ? `?lang=${lang}` : "");
}
__name(guestStageEntry, "guestStageEntry");
function guestForbidden() {
  return new Response("\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u306F\u821E\u53F0\u30B9\u30B1\u30C3\u30C1\u306E\u307F\u5229\u7528\u3067\u304D\u307E\u3059\u3002\nThis account can access Stage Sketch only.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}
__name(guestForbidden, "guestForbidden");
function stageAssetRequest(request) {
  if (!GUEST_STAGE_DOCUMENTS.has(new URL(request.url).pathname) && !["/stage-venues.js", "/stage-sw.js"].includes(new URL(request.url).pathname)) return request;
  const headers = new Headers(request.headers);
  for (const name of ["If-None-Match", "If-Modified-Since", "If-Match", "If-Unmodified-Since", "If-Range", "Range"]) headers.delete(name);
  return new Request(request, { headers });
}
__name(stageAssetRequest, "stageAssetRequest");
async function authenticatedAssetResponse(response, request, guest = false) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Cookie, Authorization");
  // 2026-09-09: 実在3会場はベータの選択肢から一時非表示。配信素材と保存済みIDは保持する。
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && response.status === 200
    && ["/stage-venues.js", "/stage-sw.js"].includes(path)
    && /(?:javascript|ecmascript)/i.test(headers.get("Content-Type") || "")) {
    let script = await response.text();
    if (path === "/stage-venues.js") {
      script += `
;(() => {
  const hidden = new Set(["theatre-tram", "tohu", "cirque-dhiver"]);
  const venues = window.SHOSAI_VENUES;
  for (const catalog of [venues, venues && venues.v2]) {
    if (!catalog) continue;
    const descriptor = Object.getOwnPropertyDescriptor(catalog, "list");
    if (!descriptor || typeof descriptor.get !== "function") continue;
    Object.defineProperty(catalog, "list", { ...descriptor,
      get() { return descriptor.get.call(this).filter(venue => !hidden.has(venue.id)); }
    });
  }
})();
`;
    } else {
      // PWAにも新しい会場一覧を取得させる。元のキャッシュ世代に追随する。
      script = script.replace(/(const CACHE_NAME = ")([^"]+)(";)/,
        '$1$2-hide-real-venues-20260909$3');
    }
    for (const name of ["Content-Length", "Content-Encoding", "ETag", "Last-Modified"]) headers.delete(name);
    return new Response(script, { status: 200, headers });
  }
  if (request.method === "GET" && response.status === 200 && GUEST_STAGE_DOCUMENTS.has(new URL(request.url).pathname) && (headers.get("Content-Type") || "").includes("text/html")) {
    let html = (await response.text()).replace(/<title>[^<]*<\/title>/, "<title>\u821E\u53F0\u30B9\u30B1\u30C3\u30C1 | Stage Sketch</title>");
    if (guest) {
      html = html.replace(/<script\s+src="stage-shows\.local\.js(?:\?[^"<>]*)?"\s*>\s*<\/script>/g, "");
    }
    for (const name of ["Content-Length", "Content-Encoding", "ETag", "Last-Modified"]) headers.delete(name);
    return new Response(html, { status: 200, headers });
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(authenticatedAssetResponse, "authenticatedAssetResponse");
async function serveStageGuestAsset(request, env) {
  const url = new URL(request.url);
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
    return new Response(null, {
      status: 303,
      headers: { "Location": guestStageEntry(url.pathname + url.search), "Cache-Control": "no-store" }
    });
  }
  if (!isGuestStageAsset(request)) return guestForbidden();
  const response = await env.ASSETS.fetch(stageAssetRequest(request));
  const location = response.headers.get("Location");
  if (location) {
    const destination = new URL(location, request.url);
    if (destination.origin !== url.origin || !(GUEST_STAGE_ASSETS.has(destination.pathname) || isPublicAppShellAsset(new Request(destination)))) {
      return guestForbidden();
    }
  }
  return authenticatedAssetResponse(response, request, true);
}
__name(serveStageGuestAsset, "serveStageGuestAsset");
async function serveAuthenticatedRequest(request, env, user) {
  const whoamiResponse = handleWhoamiRequest(request, user);
  if (whoamiResponse) return whoamiResponse;
  const betaStatusResponse = handleBetaStatusRequest(request, env);
  if (betaStatusResponse) return betaStatusResponse;
  const sessionResponse = await handleSessionRequest(request, env, user);
  if (sessionResponse) return sessionResponse;
  if (isGuestAccount(user, env)) return serveStageGuestAsset(request, env);
  return authenticatedAssetResponse(await env.ASSETS.fetch(stageAssetRequest(request)), request);
}
__name(serveAuthenticatedRequest, "serveAuthenticatedRequest");
var PUBLIC_ICON_PATH = /^\/icons\/[A-Za-z0-9._-]+\.(?:png|svg)$/;
var PUBLIC_MANIFEST_PATH = /^\/[A-Za-z0-9._-]+\.webmanifest$/;
function isPublicAppShellAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname } = new URL(request.url);
  return PUBLIC_ICON_PATH.test(pathname) || PUBLIC_MANIFEST_PATH.test(pathname);
}
__name(isPublicAppShellAsset, "isPublicAppShellAsset");
var SESSION_COOKIE = "__Host-shosai-session";
var SESSION_MAX_AGE = 60 * 60 * 24 * 90;
var SIGN_IN_PATH = "/sign-in";
var SIGN_OUT_PATH = "/sign-out";
var textEncoder = new TextEncoder();
function base64UrlFromBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64UrlFromBytes, "base64UrlFromBytes");
function bytesFromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - text.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(bytesFromBase64Url, "bytesFromBase64Url");
async function sessionKey(user, pass) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(`shosai-session\0${user}\0${pass}`)
  );
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(sessionKey, "sessionKey");
async function createSessionToken(user, pass, nowSeconds) {
  const claims = JSON.stringify({ u: user, e: nowSeconds + SESSION_MAX_AGE });
  const payload = base64UrlFromBytes(textEncoder.encode(claims));
  const key = await sessionKey(user, pass);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return `${payload}.${base64UrlFromBytes(new Uint8Array(signature))}`;
}
__name(createSessionToken, "createSessionToken");
async function readSessionToken(token, accounts, nowSeconds) {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let claims = null;
  try {
    claims = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(payload)));
  } catch (_) {
    return null;
  }
  if (!claims || typeof claims.u !== "string" || typeof claims.e !== "number") return null;
  if (!Number.isFinite(claims.e) || claims.e <= nowSeconds) return null;
  const account = accounts.find(([user]) => user === claims.u);
  if (!account) return null;
  let signatureBytes = null;
  try {
    signatureBytes = bytesFromBase64Url(signature);
  } catch (_) {
    return null;
  }
  const key = await sessionKey(account[0], account[1]);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    textEncoder.encode(payload)
  );
  return valid ? claims.u : null;
}
__name(readSessionToken, "readSessionToken");
function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
__name(readCookie, "readCookie");
function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}
__name(sessionCookie, "sessionCookie");
function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}
__name(clearedSessionCookie, "clearedSessionCookie");
function safeNextPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}
__name(safeNextPath, "safeNextPath");
function wantsTopLevelPage(request) {
  if (request.method !== "GET") return false;
  const mode = request.headers.get("Sec-Fetch-Mode");
  if (mode) return mode === "navigate";
  return (request.headers.get("Accept") || "").includes("text/html");
}
__name(wantsTopLevelPage, "wantsTopLevelPage");
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtml, "escapeHtml");
var SIGN_IN_ERROR_EN = {
  "\u5165\u529B\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u9858\u3044\u3057\u307E\u3059\u3002": "The form could not be read. Please try again.",
  "\u304A\u540D\u524D\u304B\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3046\u3088\u3046\u3067\u3059\u3002": "The name or password does not look right.",
  "\u8A8D\u8A3C\u8A2D\u5B9A\u304C\u672A\u5B8C\u4E86\u306E\u305F\u3081\u505C\u6B62\u3057\u3066\u3044\u307E\u3059\u3002": "Sign-in is paused because authentication is not fully configured."
};
function signInPage({ next = "/", error = "" } = {}) {
  const english = new URL(safeNextPath(next), "https://stage.invalid").searchParams.get("lang") === "en";
  const title = english ? "Stage Sketch" : "\u821E\u53F0\u30B9\u30B1\u30C3\u30C1";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="icon" href="/icons/stage-sketch-192.png" sizes="192x192" type="image/png">
<style>
  :root {
    --desk: #191512;
    --paper: #efe7d6;
    --paper-line: #d8c9ab;
    --ink: #2b2620;
    --ink-soft: #6a604e;
    --rust: #a84b26;
    --rust-deep: #8f3e1e;
    --brass: #9c823f;
    --serif: "Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", serif;
    --sans: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { height: 100%; }
  body {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 28px 18px calc(28px + env(safe-area-inset-bottom));
    background: var(--desk);
    color: var(--paper);
    font-family: var(--sans);
    -webkit-text-size-adjust: 100%;
  }

  /* \u6697\u3044\u5BA2\u5E2D\u306B\u3001\u7D19\u306E\u4E0A\u3060\u3051\u660E\u304B\u308A\u304C\u843D\u3061\u3066\u3044\u308B\u3002
     \u7DDE\u5E33\u306E\u7D75\u67C4\u306F\u30A2\u30A4\u30B3\u30F3\u304C\u62C5\u3046\u306E\u3067\u3001\u80CC\u666F\u306F\u895E\u3092\u3054\u304F\u8584\u304F\u6577\u304F\u3060\u3051\u306B\u7559\u3081\u308B\u2014\u2014
     \u306F\u3063\u304D\u308A\u63CF\u304F\u3068\u5E2F\u3068\u3057\u3066\u4E3B\u5F35\u3057\u3001\u8AAD\u307E\u305B\u305F\u3044\u7D19\u3088\u308A\u76EE\u7ACB\u3063\u3066\u3057\u307E\u3046\u3002 */
  .curtain {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 62% 46% at 50% 34%,
        rgba(240, 231, 214, .085), rgba(240, 231, 214, .028) 45%, transparent 76%),
      repeating-linear-gradient(90deg,
        rgba(240, 231, 214, .022) 0 9px,
        rgba(0, 0, 0, .05) 9px 19px);
    pointer-events: none;
  }

  .stand { position: relative; width: min(384px, 100%); }

  .sheet {
    position: relative;
    padding: 34px 30px 28px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 2px 0 rgba(0,0,0,.34), 0 18px 40px rgba(0,0,0,.5);
  }

  .mark { display: block; width: 54px; height: 54px; margin: 0 auto 16px; }

  h1 {
    font-family: var(--serif);
    font-size: 23px;
    font-weight: 600;
    letter-spacing: .1em;
    text-align: center;
  }
  .lede {
    margin-top: 7px;
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.85;
    letter-spacing: .02em;
    text-align: center;
  }

  .rule { margin: 22px 0 4px; border: 0; border-top: 1px solid var(--paper-line); }

  label { display: block; margin-top: 17px; }
  label span {
    display: block;
    margin-bottom: 5px;
    color: var(--ink-soft);
    font-size: 11px;
    letter-spacing: .08em;
  }
  /* \u67A0\u3067\u56F2\u308F\u305A\u4E0B\u7DDA\u3060\u3051\u3002\u7D19\u306B\u66F8\u304F\u611F\u89E6\u306B\u5BC4\u305B\u308B */
  input {
    width: 100%;
    min-height: 44px;
    padding: 6px 2px;
    border: 0;
    border-bottom: 1px solid var(--ink-soft);
    border-radius: 0;
    background: none;
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;           /* iOS\u3067\u62E1\u5927\u3055\u308C\u306A\u3044\u3088\u3046\u306B16px\u4EE5\u4E0A\u3092\u4FDD\u3064 */
    letter-spacing: .04em;
  }
  input:focus { outline: 0; border-bottom: 2px solid var(--rust); padding-bottom: 5px; }

  button {
    width: 100%;
    min-height: 48px;
    margin-top: 26px;
    border: 1px solid var(--rust-deep);
    border-radius: 0;
    background: var(--rust);
    color: #fdf6e8;
    font-family: var(--sans);
    font-size: 14px;
    letter-spacing: .18em;
    cursor: pointer;
    transition: background .15s;
  }
  button:hover { background: var(--rust-deep); }
  button:active { transform: translateY(1px); }

  /* \u82F1\u8A9E\u306E\u6DFB\u3048\u66F8\u304D\u3002\u62DB\u304B\u308C\u305F\u4EBA\u306B\u82F1\u8A9E\u8A71\u8005\u304C\u3044\u308B\u305F\u3081\u3001\u4E3B\u8981\u306A\u8A00\u8449\u306B\u5C0F\u3055\u304F\u4E26\u8A18\u3059\u308B\u3002
     \u548C\u6587\u304C\u4E3B\u30FB\u82F1\u6587\u304C\u5F93\u306E\u95A2\u4FC2\u3092\u5D29\u3055\u306A\u3044\u5927\u304D\u3055\u3068\u8272\u306B\u3068\u3069\u3081\u308B\u3002 */
  .en { color: var(--ink-soft); font-weight: normal; }
  .lede .en { display: block; font-size: 11px; letter-spacing: 0.04em; margin-top: 3px; }
  label .en { font-size: 10px; margin-left: 7px; letter-spacing: 0.05em; }
  button[type="submit"] .en { font-size: 11px; margin-left: 8px; color: inherit; opacity: 1; }
  .note .en { display: block; margin-top: 4px; }
  .alert .en { display: block; margin-top: 3px; font-size: 10.5px; }
  .note {
    margin-top: 20px;
    padding-left: 11px;
    border-left: 2px solid var(--brass);
    color: var(--ink-soft);
    font-size: 10.5px;
    line-height: 1.9;
  }

  /* \u9593\u9055\u3048\u305F\u3068\u304D\u306F\u3001\u8CAC\u3081\u308B\u8ABF\u5B50\u306B\u3057\u306A\u3044 */
  .alert {
    margin-top: 18px;
    padding: 9px 11px;
    border-left: 3px solid var(--rust);
    background: rgba(168, 75, 38, .09);
    color: var(--rust-deep);
    font-size: 12px;
    line-height: 1.7;
  }

  @media (max-width: 380px) {
    .sheet { padding: 28px 20px 24px; }
  }
</style>
</head>
<body>
  <div class="curtain" aria-hidden="true"></div>
  <main class="stand">
    <form class="sheet" method="POST" action="${escapeHtml(SIGN_IN_PATH)}">
      <img class="mark" src="/icons/stage-sketch-192.png" alt="" width="54" height="54">
      <h1>${title}</h1>
      <p class="lede">\u821E\u53F0\u30B9\u30B1\u30C3\u30C1\u3078\u30ED\u30B0\u30A4\u30F3<span class="en">Sign in to Stage Sketch.</span></p>
      <hr class="rule">
      ${error ? `<p class="alert" role="alert">${escapeHtml(error)}${SIGN_IN_ERROR_EN[error] ? `<span class="en">${escapeHtml(SIGN_IN_ERROR_EN[error])}</span>` : ""}</p>` : ""}
      <label>
        <span>\u304A\u540D\u524D<span class="en">Name</span></span>
        <input type="text" name="user" autocomplete="username"
               autocapitalize="none" autocorrect="off" spellcheck="false" required autofocus>
      </label>
      <label>
        <span>\u30D1\u30B9\u30EF\u30FC\u30C9<span class="en">Password</span></span>
        <input type="password" name="pass" autocomplete="current-password" required>
      </label>
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <button type="submit">\u4E2D\u3078\u5165\u308B<span class="en">Enter</span></button>
      <p class="note">\u62DB\u304B\u308C\u305F\u65B9\u306F\u3001\u304A\u6E21\u3057\u3057\u305F\u304A\u540D\u524D\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u3067\u304A\u5165\u308A\u304F\u3060\u3055\u3044\u3002
        \u4E00\u5EA6\u5165\u308B\u3068\u3001\u3057\u3070\u3089\u304F\u306F\u805E\u304B\u308C\u307E\u305B\u3093\u3002
        <span class="en">If you were invited, sign in with the name and password you were given.
        Once you are in, you will not be asked again for a while.</span></p>
    </form>
  </main>
  <script>
    (() => {
      const next = document.querySelector('input[name="next"]');
      if (!next || !location.hash || next.value.includes("#")) return;
      next.value += location.hash;
    })();
  <\/script>
</body>
</html>`;
}
__name(signInPage, "signInPage");
function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin"
    }
  });
}
__name(htmlResponse, "htmlResponse");
async function handleSignIn(request, url, accounts, env) {
  if (request.method === "GET" || request.method === "HEAD") {
    return htmlResponse(signInPage({ next: safeNextPath(url.searchParams.get("next")) }));
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { "Allow": "GET, POST", "Cache-Control": "no-store" }
    });
  }
  let form = null;
  try {
    form = await request.formData();
  } catch (_) {
    return htmlResponse(signInPage({ error: "\u5165\u529B\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u9858\u3044\u3057\u307E\u3059\u3002" }), 400);
  }
  const user = String(form.get("user") || "");
  const pass = String(form.get("pass") || "");
  const next = safeNextPath(String(form.get("next") || "/"));
  const matched = accounts.find(([expectedUser, expectedPass]) => timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass));
  if (!matched) {
    return htmlResponse(
      signInPage({ next, error: "\u304A\u540D\u524D\u304B\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3046\u3088\u3046\u3067\u3059\u3002" }),
      401
    );
  }
  const token = await createSessionToken(matched[0], matched[1], Math.floor(Date.now() / 1e3));
  return new Response(null, {
    status: 303,
    headers: {
      "Location": isGuestAccount(matched[0], env) ? guestStageEntry(next) : next,
      "Set-Cookie": sessionCookie(token),
      "Cache-Control": "no-store"
    }
  });
}
__name(handleSignIn, "handleSignIn");
function withSessionCookie(response, token) {
  if (response.status === 101 || response.webSocket) return response;
  const next = new Response(response.body, response);
  next.headers.append("Set-Cookie", sessionCookie(token));
  return next;
}
__name(withSessionCookie, "withSessionCookie");
function matchBasicAuth(request, accounts) {
  const authHeader = request.headers.get("Authorization") || "";
  const [scheme, encoded] = authHeader.split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch (_) {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  return accounts.find(([expectedUser, expectedPass]) => timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass)) || null;
}
__name(matchBasicAuth, "matchBasicAuth");
function parseGuestAccounts(value, siteUser, legacyGuestUser) {
  if (value === void 0 || value === "") {
    return { accounts: [], misconfigured: false };
  }
  if (typeof value !== "string") {
    return { accounts: [], misconfigured: true };
  }
  let entries = null;
  try {
    entries = JSON.parse(value);
  } catch (_) {
    return { accounts: [], misconfigured: true };
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return { accounts: [], misconfigured: true };
  }
  const accounts = [];
  const seenUsers = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { accounts: [], misconfigured: true };
    }
    const { user, pass } = entry;
    if (typeof user !== "string" || user.length === 0 || typeof pass !== "string" || pass.length === 0) {
      return { accounts: [], misconfigured: true };
    }
    if (seenUsers.has(user) || user === siteUser || user === legacyGuestUser) {
      return { accounts: [], misconfigured: true };
    }
    seenUsers.add(user);
    accounts.push([user, pass]);
  }
  return { accounts, misconfigured: false };
}
__name(parseGuestAccounts, "parseGuestAccounts");
var worker_default = {
  async fetch(request, env, ctx) {
    if (isPublicAppShellAsset(request)) {
      return env.ASSETS.fetch(request);
    }
    const pairs = [
      [env.SITE_USER, env.SITE_PASS],
      [env.GUEST_USER, env.GUEST_PASS]
    ];
    const guestConfig = parseGuestAccounts(
      env.GUEST_ACCOUNTS,
      env.SITE_USER,
      env.GUEST_USER
    );
    const misconfigured = pairs.some(([u, p]) => Boolean(u) !== Boolean(p)) || Boolean(env.SITE_USER && env.GUEST_USER && env.SITE_USER === env.GUEST_USER) || guestConfig.misconfigured;
    const accounts = [
      ...pairs.filter(([u, p]) => u && p),
      ...guestConfig.accounts
    ];
    if (accounts.length === 0 || misconfigured) {
      if (isLocalHost(request) && !misconfigured) {
        return serveAuthenticatedRequest(request, env, null);
      }
      return new Response("\u8A8D\u8A3C\u8A2D\u5B9A\u304C\u672A\u5B8C\u4E86\u306E\u305F\u3081\u505C\u6B62\u3057\u3066\u3044\u307E\u3059\u3002", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    const betaStatusResponse = handleBetaStatusRequest(request, env);
    if (betaStatusResponse) return betaStatusResponse;
    const url = new URL(request.url);
    const nowSeconds = Math.floor(Date.now() / 1e3);
    if (url.pathname === SIGN_OUT_PATH) {
      return new Response(null, {
        status: 303,
        headers: {
          "Location": SIGN_IN_PATH,
          "Set-Cookie": clearedSessionCookie(),
          "Cache-Control": "no-store"
        }
      });
    }
    if (url.pathname === SIGN_IN_PATH) {
      return handleSignIn(request, url, accounts, env);
    }
    const cookieUser = await readSessionToken(
      readCookie(request, SESSION_COOKIE),
      accounts,
      nowSeconds
    );
    if (cookieUser) {
      return serveAuthenticatedRequest(request, env, cookieUser);
    }
    const basicAccount = matchBasicAuth(request, accounts);
    if (basicAccount) {
      const response = await serveAuthenticatedRequest(request, env, basicAccount[0]);
      const token = await createSessionToken(basicAccount[0], basicAccount[1], nowSeconds);
      return withSessionCookie(response, token);
    }
    if (wantsTopLevelPage(request)) {
      const next = safeNextPath(url.pathname + url.search);
      return new Response(null, {
        status: 302,
        headers: {
          "Location": `${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`,
          "Cache-Control": "no-store"
        }
      });
    }
    return new Response("\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        /* no-store が無いと、ブラウザがこの401を自分のHTTPキャッシュへ保存し、
           あとで通信できないときに再生してしまう。実際、ホーム画面のPWAを機内モードで
           起動すると「認証が必要です。」が出た（2026-08-23 実機で確認）。
           上の503には最初から付いていて、こちらに付け忘れていた。 */
        "Cache-Control": "no-store"
      }
    });
  }
};
export {
  SessionRoom,
  createSessionToken,
  worker_default as default,
  isPublicAppShellAsset,
  readSessionToken,
  safeNextPath
};
