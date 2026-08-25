const MAX_CONNECTIONS = 20;
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;
const MAX_OP_BYTES = 64 * 1024;
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const COLORS = [
  "#d3ac59",
  "#7fb3d5",
  "#c39bd3",
  "#7dcea0",
  "#f1948a",
  "#85c1e9",
  "#f8c471",
  "#a3e4d7",
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function byteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}

function sanitizeName(value) {
  const withoutControls = String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
  return Array.from(withoutControls).slice(0, 50).join("");
}

function readAttachment(ws) {
  try {
    const attachment = ws.deserializeAttachment();
    return attachment && typeof attachment === "object" ? attachment : null;
  } catch (_) {
    return null;
  }
}

function participantFrom(attachment) {
  return {
    clientId: attachment.clientId,
    name: attachment.name,
    role: attachment.role,
    color: attachment.color,
  };
}

function senderFrom(attachment) {
  return {
    clientId: attachment.clientId,
    name: attachment.name,
    color: attachment.color,
  };
}

function isOpen(ws) {
  return ws.readyState !== 2 && ws.readyState !== 3;
}

function safeSend(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (_) {
    // 切断と競合した送信は破棄する。
  }
}

export class SessionRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/new") {
      const hostKey = crypto.randomUUID();
      await this.ctx.storage.put("hostKey", hostKey);
      return jsonResponse({ ok: true, hostKey });
    }

    if (request.method === "GET" && url.pathname === "/ws") {
      return this.upgradeWebSocket(request, url);
    }

    return jsonResponse({ ok: false, error: "not-found" }, 404);
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
      if (!expectedHostKey || url.searchParams.get("key") !== expectedHostKey) {
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
      color: COLORS[colorIndex % COLORS.length],
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    const doc = (await this.ctx.storage.get("doc")) ?? null;
    safeSend(server, {
      t: "welcome",
      clientId: attachment.clientId,
      role: attachment.role,
      color: attachment.color,
      participants: this.participants(),
      doc,
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
    return this.ctx.getWebSockets()
      .filter((socket) => socket !== excludedSocket && isOpen(socket))
      .map(readAttachment)
      .filter((attachment) => attachment && (attachment.role === "host" || attachment.role === "guest"))
      .map(participantFrom);
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

      await this.ctx.storage.put("doc", data.doc);
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
      if (!data.op || typeof data.op !== "object" ||
          (data.op.kind !== "piece.move" && data.op.kind !== "arrows.add")) {
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

      /* 送信者以外のゲストへも中継する。
         以前はホストにだけ送り、ホストが全文書を配り直すことで他のゲストへ伝えていた。
         しかしその配り直しは、まだ動かしている送信元ゲストの位置まで巻き戻すため、
         3人で使うと「自分の操作がリセットされ続ける」状態になった（2026-08-24 実機）。
         opを直接回せば、配り直しを待たずに参加者同士の操作が見える。 */
      for (const socket of this.ctx.getWebSockets()) {
        if (socket === ws || !isOpen(socket)) continue;
        const target = readAttachment(socket);
        if (target && target.role === "guest") safeSend(socket, payload);
      }
      return;
    }

    if (data.t === "activity") {
      /* 「いま操作中」の合図。送信者以外の全員へ名前・色つきで中継する */
      const payload = { t: "activity", from: senderFrom(attachment) };
      for (const socket of this.ctx.getWebSockets()) {
        if (socket !== ws && isOpen(socket)) safeSend(socket, payload);
      }
      return;
    }

    if (data.t === "pointer") {
      if (typeof data.view !== "string" ||
          typeof data.x !== "number" || !Number.isFinite(data.x) || data.x < 0 || data.x > 1 ||
          typeof data.y !== "number" || !Number.isFinite(data.y) || data.y < 0 || data.y > 1 ||
          typeof data.on !== "boolean") {
        return;
      }

      const payload = {
        t: "pointer",
        view: data.view,
        x: data.x,
        y: data.y,
        on: data.on,
        from: senderFrom(attachment),
      };
      for (const socket of this.ctx.getWebSockets()) {
        if (socket !== ws && isOpen(socket)) safeSend(socket, payload);
      }
    }
  }

  async handleDisconnect(ws) {
    this.broadcastPresence(ws);
    const remaining = this.ctx.getWebSockets()
      .filter((socket) => socket !== ws && isOpen(socket));
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
      // すでに閉じている場合は後処理だけを続ける。
    }
    await this.handleDisconnect(ws);
  }

  async alarm() {
    if (this.ctx.getWebSockets().filter(isOpen).length === 0) {
      await this.ctx.storage.deleteAll();
    }
  }
}
