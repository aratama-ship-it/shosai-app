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
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./stage-sw.js", { scope: "./" }).catch((error) => {
      console.warn("舞台スケッチのオフライン準備に失敗しました。", error);
    });
  });
})();
