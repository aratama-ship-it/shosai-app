import { usageAdminResponse } from "./usage-admin-page.js";

export const DAY_MS = 86400000;
export const RETENTION_DAYS = 90;
const JST_MS = 9 * 3600000;
const MAX_ACTIVE_MS = 30000;
export const dayNumber = (now) => Math.floor((now + JST_MS) / DAY_MS);
const dateLabel = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store",
    "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff" },
});
const enabled = (env) => env.STAGE_USAGE_ENABLED === "true" && env.STAGE_BETA_ACTIVE !== "false" && !!env.USAGE_METRICS;

// クライアントは量だけを申告する。誰の記録かは認証済みのWorkerが決める。
async function smallJson(request) {
  if ((request.headers.get("Content-Type") || "").split(";")[0].trim() !== "application/json") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2048) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch (_) { return null; }
}

function validEvent(event) {
  return event && event.v === 1 && ["open", "active"].includes(event.kind)
    && typeof event.id === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(event.id)
    && Number.isInteger(event.activeMs) && event.activeMs >= 0 && event.activeMs <= MAX_ACTIVE_MS
    && (event.kind === "open" ? event.activeMs === 0 : event.activeMs > 0);
}

export async function handleUsageRequest(request, env, user) {
  const url = new URL(request.url);
  if (url.pathname !== "/usage" && !url.pathname.startsWith("/usage/")) return null;
  if (!user) return json({ error: "authentication-required" }, 401);
  const canAdmin = user === env.SITE_USER;
  if (url.pathname === "/usage/config" && request.method === "GET") {
    return json({ enabled: enabled(env), user, canAdmin, retentionDays: RETENTION_DAYS });
  }
  if (url.pathname === "/usage" || url.pathname === "/usage/report") {
    if (!canAdmin) return json({ error: "owner-only" }, 403);
    if (request.method !== "GET") return json({ error: "method-not-allowed" }, 405);
    if (url.pathname === "/usage") return usageAdminResponse(url.searchParams.get("lang") === "en");
    const days = Number(url.searchParams.get("days") || 30);
    if (![7, 30, 90].includes(days)) return json({ error: "invalid-period" }, 400);
    if (!env.USAGE_METRICS) return json({ error: "storage-unavailable" }, 503);
    try {
      const room = env.USAGE_METRICS.get(env.USAGE_METRICS.idFromName("beta-usage-v1"));
      const response = await room.fetch(`https://usage/report?days=${days}`);
      if (!response.ok) return json({ error: "storage-unavailable" }, 503);
      return json({ ...await response.json(), enabled: enabled(env), owner: user });
    } catch (_) { return json({ error: "storage-unavailable" }, 503); }
  }
  if (url.pathname !== "/usage/event") return json({ error: "not-found" }, 404);
  if (request.method !== "POST") return json({ error: "method-not-allowed" }, 405);
  if (request.headers.get("Origin") !== url.origin
    || request.headers.get("Sec-Fetch-Site") === "cross-site") return json({ error: "same-origin-required" }, 403);
  if (!enabled(env)) return json({ error: "measurement-disabled" }, 503);
  let event;
  try { event = await smallJson(request); } catch (_) { return json({ error: "invalid-event" }, 400); }
  if (!validEvent(event)) return json({ error: "invalid-event" }, 400);
  // 古いタブで計測中に別口座へログインしても、旧利用分を新口座へ足さない。
  if (event.user !== user) return json({ error: "account-changed" }, 409);
  try {
    const room = env.USAGE_METRICS.get(env.USAGE_METRICS.idFromName("beta-usage-v1"));
    const response = await room.fetch("https://usage/record", {
      method: "POST", body: JSON.stringify({ user, v: 1, kind: event.kind, id: event.id, activeMs: event.activeMs }),
    });
    return response.ok ? json({ ok: true }) : json({ error: "storage-unavailable" }, 503);
  } catch (_) { return json({ error: "storage-unavailable" }, 503); }
}

// β規模の専用Durable Object。作品・共有セッションの領域には触れない。
export class UsageMetrics {
  constructor(ctx) { this.ctx = ctx; }

  async fetch(request, init) {
    if (!(request instanceof Request)) request = new Request(request, init);
    const url = new URL(request.url);
    const now = Date.now();
    if (url.pathname === "/record" && request.method === "POST") {
      const event = await request.json();
      if (!validEvent(event) || typeof event.user !== "string" || !event.user || event.user.length > 256) {
        return json({ error: "invalid-event" }, 400);
      }
      await this.ctx.storage.transaction(async (txn) => {
        const key = `user:${event.user}`;
        const previous = await txn.get(key);
        const record = previous || { user: event.user, lastSeen: 0, coveredUntil: 0, days: {}, recent: [] };
        if (record.recent.includes(event.id)) return;
        const today = dayNumber(now);
        for (const day of Object.keys(record.days)) if (Number(day) < today - RETENTION_DAYS + 1) delete record.days[day];
        record.days[today] ??= { activeMs: 0 };
        // 受信時刻で末尾をそろえる概算。並行タブ・端末の重なる時間を二重加算しない。
        // 遅延到着の細かい時系列は復元しない。クライアントの時計は信用しない。
        const start = Math.max(now - event.activeMs, record.coveredUntil);
        for (let cursor = start; cursor < now;) {
          const day = dayNumber(cursor);
          const end = Math.min(now, (day + 1) * DAY_MS - JST_MS);
          record.days[day] ??= { activeMs: 0 };
          record.days[day].activeMs += end - cursor;
          cursor = end;
        }
        if (event.activeMs > 0) record.coveredUntil = Math.max(record.coveredUntil, now);
        record.lastSeen = Math.max(record.lastSeen, now);
        record.recent = [...record.recent, event.id].slice(-64);
        await txn.put(key, record);
        if (!await txn.get("startedAt")) await txn.put("startedAt", now);
      });
      if (!await this.ctx.storage.getAlarm()) await this.ctx.storage.setAlarm(now + DAY_MS);
      return json({ ok: true });
    }
    if (url.pathname === "/report" && request.method === "GET") {
      const days = Number(url.searchParams.get("days") || 30);
      if (![7, 30, 90].includes(days)) return json({ error: "invalid-period" }, 400);
      const today = dayNumber(now);
      const since = today - days + 1;
      const records = await this.ctx.storage.list({ prefix: "user:" });
      const rows = [];
      for (const record of records.values()) {
        if (dayNumber(record.lastSeen) < today - RETENTION_DAYS + 1) continue;
        const entries = Object.entries(record.days).filter(([day]) => Number(day) >= since && Number(day) <= today);
        rows.push({ user: record.user, lastSeen: record.lastSeen, activeDays: entries.length,
          activeMs: entries.reduce((sum, [, day]) => sum + day.activeMs, 0) });
      }
      rows.sort((a, b) => b.lastSeen - a.lastSeen || a.user.localeCompare(b.user));
      return json({ asOf: now, startedAt: await this.ctx.storage.get("startedAt") || null,
        days, from: dateLabel(since), to: dateLabel(today), retentionDays: RETENTION_DAYS, rows });
    }
    return json({ error: "not-found" }, 404);
  }

  async alarm() {
    const cutoff = dayNumber(Date.now()) - RETENTION_DAYS + 1;
    await this.ctx.storage.transaction(async (txn) => {
      const records = await txn.list({ prefix: "user:" });
      for (const [key, record] of records) {
        if (dayNumber(record.lastSeen) < cutoff) { await txn.delete(key); continue; }
        let changed = false;
        for (const day of Object.keys(record.days)) if (Number(day) < cutoff) { delete record.days[day]; changed = true; }
        if (changed) await txn.put(key, record);
      }
    });
    if ((await this.ctx.storage.list({ prefix: "user:", limit: 1 })).size) await this.ctx.storage.setAlarm(Date.now() + DAY_MS);
  }
}
