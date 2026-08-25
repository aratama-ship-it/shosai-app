(() => {
  "use strict";

  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const tablet = navigator.maxTouchPoints > 1
    && Math.min(window.screen.width, window.screen.height) >= 600;
  // 実機PWAをデスクトップの検証ブラウザで再現する入口。localhost限定なので
  // 公開URLへクエリを付けても専用画面へ切り替わらない。
  const localTabletPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).has("tablet-pwa-preview");
  const tabletPwa = (standalone && tablet) || localTabletPreview;
  window.SHOSAI_TABLET_PWA = tabletPwa;
  document.documentElement.classList.toggle("stage-pwa-tablet", tabletPwa);

  // file:// では Service Worker を登録できない。公開URLやローカルHTTPでは
  // 同じ stage.html をそのままPWAとして使える。
  if (window.stageSketchBridge
    || !("serviceWorker" in navigator)
    || window.location.protocol === "file:") return;

  /* Service Worker文脈の取得にはBasic認証が乗らないことがある。ホーム画面へ追加したPWAで
     実際に起き、app shellを一件も保存できずオフラインが死んでいた（2026-08-24 実機で確認）。
     一方、ページ文脈の取得には認証が効いている——この画面が表示できている時点で、
     style.css も stage-sketch.js も200で取れた証拠になる。
     そこで足りない分をページ側で取り、Service Workerと同じキャッシュへ入れる。

     ★一覧と保存先は stage-sw.js から受け取る。こちらへ書き写すと版がずれるため。 */
  async function warmAppShellCache() {
    if (!("caches" in window)) return;
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    if (!worker) return;

    const shell = await new Promise((resolve) => {
      const channel = new MessageChannel();
      // 返事が来ない環境でも、ここで止まらないようにする
      const timer = setTimeout(() => resolve(null), 3000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        resolve(event.data);
      };
      worker.postMessage({ type: "app-shell" }, [channel.port2]);
    });
    if (!shell || !shell.cacheName || !Array.isArray(shell.urls)) return;

    const cache = await caches.open(shell.cacheName);
    let filled = 0;
    for (const url of shell.urls) {
      try {
        /* 画面本体だけは毎回入れ直す。ほかは版番号つきのURLなので、
           内容が変われば別のURLになり自然に取り直される。
           stage.html には版番号が付かないため、ここで更新しないと古いままになる
           （Service Worker側はオンライン時に横取りしなくなったので、更新の役はこちらが持つ）。 */
        const alwaysRefresh = url === "./stage.html";
        if (!alwaysRefresh && await cache.match(url)) continue;
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) continue;
        /* /stage.html は配信層が /stage へ307で送るため、素のまま保存すると
           redirected の印が付く。ブラウザは画面遷移への応答に印付きの保存物を
           使うことを拒むので、印を剥がした写しにしてから入れる
           （剥がさずに保存していたとき、オフラインで「ページを開けません」になった）。 */
        if (response.redirected) {
          const body = await response.arrayBuffer();
          await cache.put(url, new Response(body, {
            status: 200,
            statusText: "OK",
            headers: response.headers,
          }));
        } else {
          await cache.put(url, response);
        }
        filled += 1;
      } catch (_) {
        // 一件の失敗で残りを止めない。取れたものだけでも保存しておく。
      }
    }
    return filled;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./stage-sw.js", { scope: "./" })
      .then(() => warmAppShellCache())
      .catch((error) => {
        console.warn("舞台スケッチのオフライン準備に失敗しました。", error);
      });
  });
})();
