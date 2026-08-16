const CACHE_NAME = "stage-sketch-pwa-v61";
const APP_SHELL = [
  "./stage.html",
  "./style.css?v=168",
  "./stage-venues.js?v=16",
  "./stage-venue-lines.js?v=4",
  "./stage-i18n.js?v=49",
  "./stage-rehearsal-export.js?v=1",
  "./stage-samples/index.js?v=1",
  "./stage-sketch.js?v=234",
  "./stage-venue-editor.js?v=6",
  "./stage-pwa.js?v=3",
  "./stage-sketch.webmanifest",
  "./icons/stage-sketch-180.png",
  "./icons/stage-sketch-192.png",
  "./icons/stage-sketch-512.png",
  "./icons/stage-sketch-maskable-512.png"
];
const STAGE_PATH = new URL("./stage.html", self.location.href).pathname;
const APP_SHELL_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("stage-sketch-pwa-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 画面本体はオンライン時に最新版を優先し、通信できない時だけ保存版へ戻る。
  if (request.mode === "navigate") {
    // 同じ場所にある資料棚などはこのPWAの対象にしない。
    if (url.pathname !== STAGE_PATH) return;
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./stage.html", copy));
        }
        return response;
      }).catch(() => caches.match("./stage.html"))
    );
    return;
  }

  // 版番号つきのCSS/JSは同じ版を即座に返す。版番号が上がれば別URLとして取得される。
  if (!APP_SHELL_URLS.has(request.url)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
