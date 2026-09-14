// A-2 再現: 「旧shell完備 → 新SWが資材取得に全失敗 → 通信復帰で stage.html だけ新キャッシュへ →
//            再びオフライン」で、新HTMLと旧JSの版ずれが起きるかを stage-sw.js の実ソースで確かめる。
// 実行: node docs/system-audit-2026-09-09/repro-a2-sw-mixed-version.mjs [new-first]
//   引数なし＝caches.keys() が挿入順（旧が先）／new-first＝新キャッシュが先に列挙される場合   （製品コードは変更しない）
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../../", import.meta.url);
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");
const CACHE = swSource.match(/CACHE_NAME = "([^"]+)"/)[1];
const shell = [...swSource.matchAll(/^\s*"(\.\/[^"]+)",?$/gm)].map((m) => m[1]);
const sketchNew = shell.find((u) => u.startsWith("./stage-sketch.js"));
const sketchOld = sketchNew.replace(/v=(\d+)/, (_, v) => `v=${Number(v) - 1}`);

const base = "https://stage.example/";
const stores = new Map();
const keyFor = (i) => new URL(typeof i === "string" ? i : i.url, base).href;
const cacheFor = (name) => {
  if (!stores.has(name)) stores.set(name, new Map());
  const s = stores.get(name);
  return { async match(i) { return s.get(keyFor(i)); }, async put(i, r) { s.set(keyFor(i), r); } };
};
let online = false;
let skipped = false;
const listeners = {};
const ctx = {
  URL, Response, Promise,
  fetch: async (req) => {
    if (!online) throw new Error("offline");
    const url = typeof req === "string" ? req : req.url;
    return new Response(url.includes("stage-sketch.js") ? `js ${url}` : `html new (refs ${sketchNew})`, { status: 200 });
  },
  caches: { open: async (n) => cacheFor(n), keys: async () => (process.argv[2] === "new-first" ? [...stores.keys()].reverse() : [...stores.keys()]), delete: async (n) => stores.delete(n) },
  self: {
    location: { href: `${base}stage-sw.js`, origin: "https://stage.example" },
    addEventListener(t, l) { listeners[t] = l; },
    skipWaiting: async () => { skipped = true; },
    clients: { claim: async () => {} },
  },
};
// 旧shell完備（HTMLは旧JSを参照）
const oldCache = cacheFor("stage-sketch-pwa-v190");
await oldCache.put("./stage.html", new Response(`html old (refs ${sketchOld})`));
await oldCache.put(sketchOld, new Response(`js ${sketchOld}`));
vm.runInNewContext(swSource, ctx);

let pending;
listeners.install({ waitUntil(v) { pending = v; } }); await pending;          // 全失敗
listeners.activate({ waitUntil(v) { pending = v; } }); await pending;         // タブ全閉じ後に有効化された想定
const fetchVia = (url, mode) => new Promise((resolve) => listeners.fetch({
  request: { method: "GET", mode, url: `${base}${url}` },
  respondWith(v) { resolve(v); }, waitUntil(p) { pending = p; },
}));

online = true;
const r1 = await fetchVia("stage", "navigate"); await pending;                  // 通信復帰: 新HTMLが新キャッシュへ
online = false;
const html = await (await fetchVia("stage", "navigate")).text();
const js = await fetchVia(sketchNew.slice(2), "no-cors");

console.log(JSON.stringify({
  keysOrder: process.argv[2] === "new-first" ? "新キャッシュが先" : "旧キャッシュが先（挿入順）",
  cacheName: CACHE, skipWaitingCalled: skipped,
  oldCacheKept: stores.has("stage-sketch-pwa-v190"),
  newCacheHasHtml: Boolean(await cacheFor(CACHE).match("./stage.html")),
  newCacheHasJs: Boolean(await cacheFor(CACHE).match(sketchNew)),
  offlineNavigateServed: html,
  offlineNewJsServed: js === undefined ? "UNDEFINED (起動不能)" : "ok",
  verdict: html.includes("new") && js === undefined ? "REPRODUCED: 新HTML＋JS欠落" : "not reproduced",
}, null, 2));
