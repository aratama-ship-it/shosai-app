(() => {
  "use strict";

  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const tablet = navigator.maxTouchPoints > 1
    && Math.min(window.screen.width, window.screen.height) >= 600;
  document.documentElement.classList.toggle("stage-pwa-tablet", standalone && tablet);

  // file:// では Service Worker を登録できない。公開URLやローカルHTTPでは
  // 同じ stage.html をそのままPWAとして使える。
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./stage-sw.js", { scope: "./" }).catch((error) => {
      console.warn("舞台スケッチのオフライン準備に失敗しました。", error);
    });
  });
})();
