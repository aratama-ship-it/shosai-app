const CACHE_NAME = "stage-sketch-pwa-v143";
const APP_SHELL = [
  "./stage.html",
  "./style.css?v=195",
  "./stage-venues.js?v=20",
  "./stage-venue-lines.js?v=4",
  "./stage-i18n.js?v=75",
  "./stage-prompt-i18n.js?v=2",
  "./stage-rehearsal-export.js?v=1",
  "./stage-samples/index.js?v=1",
  "./stage-set-model.js?v=1",
  "./stage-set-builder.js?v=1",
  "./stage-machinery.js?v=2",
  "./stage-first-person.js?v=16",
  "./stage-audio-store.js?v=2",
  "./stage-sketch.js?v=291",
  "./stage-session.js?v=7",
  "./stage-venue-editor.js?v=6",
  "./stage-pwa.js?v=6",
  "./stage-sketch.webmanifest",
  "./icons/stage-sketch-180.png",
  "./icons/stage-sketch-192.png",
  "./icons/stage-sketch-512.png",
  "./icons/stage-sketch-maskable-512.png"
];
/* 配信層（Cloudflareの静的アセット）は /stage.html を /stage へ307で送る。
   PWAの入口は /stage.html だが、リダイレクト後の姿 /stage も同じ画面として扱う。 */
const STAGE_PATHS = new Set([
  new URL("./stage.html", self.location.href).pathname,
  new URL("./stage", self.location.href).pathname,
]);
const APP_SHELL_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));

/* 保存するときは「リダイレクトを経ていない素の応答」に写し直す。
   /stage.html は配信層が /stage へ307で送るため、素直に保存すると redirected の印が
   付いた応答が残る。ブラウザは**画面遷移への応答にリダイレクト済みの保存物を使うことを
   仕様で拒む**ので、印が付いたままだとオフラインで「ページを開けません」になる
   （2026-08-24 実機で発生。キャッシュは有るのに開けない、という症状のときはまずこれを疑う）。 */
async function putCleanCopy(cache, url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) return;
  if (!response.redirected) {
    await cache.put(url, response);
    return;
  }
  const body = await response.arrayBuffer();
  await cache.put(url, new Response(body, {
    status: 200,
    statusText: "OK",
    headers: response.headers,
  }));
}

/* かつては cache.addAll(APP_SHELL) を使っていた。addAll は1件でも失敗すると全体を拒否し、
   Service Workerのインストールごと落ちる。ホーム画面へ追加したPWAでは、Service Worker文脈の
   取得にBasic認証が乗らず全件401になり、オフラインが一切効かなかった（2026-08-24 実機で確認。
   同じ端末のSafariタブでは動いていたので、PWA固有の文脈差と判明）。

   そこで install では「取れたものだけ保存する」に変えた（クッキー方式へ移行した今は
   SW文脈の取得にもクッキーが乗るので、ここで全件取れる見込み）。取りこぼしは
   ページ側の warmAppShellCache() が後で補う。
   ★ここを addAll へ戻さないこと。addAll は redirected の印も剥がせない。 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => putCleanCopy(cache, url))))
      .then(() => self.skipWaiting())
  );
});

/* ページ側がキャッシュを補うために、保存先と一覧を教える。
   一覧をページ側へ書き写すと版がずれていくので、ここを唯一の出どころにする。 */
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "app-shell") return;
  const port = event.ports && event.ports[0];
  if (!port) return;
  port.postMessage({ cacheName: CACHE_NAME, urls: APP_SHELL });
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
    if (!STAGE_PATHS.has(url.pathname)) return;

    /* ★self.navigator.onLine では判定しないこと（2026-08-24 に一度これで壊した）。
       navigator.onLine はネットワークインターフェースの有無を見るだけで、実際に
       通信できるかを保証しない。iOSの実機で、Wi-Fiを繋いだままの機内モードでは
       正しく動いたが、Wi-Fiまで切った本当のオフラインでは true のままと判断され、
       Service Workerが何もせず、ブラウザの標準オフライン画面が出て開けなかった。

       代わりに、実際にネットワークを試し、失敗したときだけ保存版を返す。
       クッキー方式へ移行した今、Worker側は未認証でも401ではなく302
       （ログイン画面への誘導）を返すので、ここでの取得結果をそのまま渡しても
       認証を尋ねる機会を奪う心配はない（401を横取りする問題はクッキー移行で消えた）。

       保存するのは redirected の印が無い応答だけ（/stage への307を経ていない、
       素の200）。印付きを保存すると、オフラインで返したとき遷移が拒まれる。 */
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok && !response.redirected) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("./stage.html", copy)));
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
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }))
  );
});
