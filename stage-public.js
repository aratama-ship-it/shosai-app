(function () {
  "use strict";

  const STORAGE_KEYS = new Set(["shosai-stage-sketch-v1", "shosai-stage-shows-v1"]);
  const storage = window.localStorage;
  STORAGE_KEYS.forEach((key) => {
    try { storage.removeItem(key); } catch (_) { /* 保存領域が使えなくても続ける */ }
  });

  const storageProto = Object.getPrototypeOf(storage);
  const originalSetItem = storageProto.setItem;
  storageProto.setItem = function (key, value) {
    if (this === storage && STORAGE_KEYS.has(String(key))) return;
    return originalSetItem.call(this, key, value);
  };

  const params = new URLSearchParams(window.location.search);
  const embed = params.get("embed") === "1";
  document.body.classList.toggle("is-public-embed", embed);

  const phonePreview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && params.has("phone-viewer-preview");
  const phoneLike = phonePreview || (navigator.maxTouchPoints > 0
    && Math.min(window.screen.width, window.screen.height) <= 600);
  const touches = new Set();
  let suppressNextClick = false;
  let selectedPerformerId = null;
  let demoFrame = 0;
  let demoStopped = false;

  const bridge = () => window.SHOSAI_STAGE_SESSION_BRIDGE;
  const readDocument = () => {
    try { return JSON.parse(bridge().exportDocumentString()); }
    catch (_) { return null; }
  };
  const applyDocument = (documentValue) => bridge().applyDocumentString(JSON.stringify(documentValue));
  const activeScene = (documentValue) => {
    const project = documentValue && documentValue.project;
    return project && project.scenes.find((scene) => scene.id === project.activeSceneId)
      || (project && project.scenes.find((scene) => scene.kind !== "section"));
  };

  /* 保存が空なので、アプリは baseState(true)（見本の駒）から始まる。
     ★ここで文書を手で組み立てないこと。必要な項目（audioTracks など）が欠けると
       applyDocumentString がその場で落ちる（2026-09-03 実測。stage-sketch.js の
       selectedAudioTrackId = state.project.audioTracks[0] で TypeError）。
       いまの文書を書き出し、要るところだけ直して戻す形にする。 */
  function resetPreview() {
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    if (!documentValue || !scene) return;
    const project = documentValue.project;
    project.venue = "proscenium";
    project.title = document.documentElement.lang === "en" ? "Preview" : "体験版";
    // 演者は3人まで。体験版は「動かす」だけの場所にする。
    const keep = new Set(
      scene.pieces.filter((piece) => piece.type === "performer").slice(0, 3).map((piece) => piece.id)
    );
    scene.pieces = scene.pieces.filter(
      (piece) => piece.type !== "performer" || keep.has(piece.id)
    );
    // シーンは1枚だけ。並べる機能は出さない。
    project.scenes = [scene];
    project.activeSceneId = scene.id;
    applyDocument(documentValue);
  }

  function addVenueBar() {
    const host = document.getElementById("stage-col-center");
    const select = document.getElementById("stage-venue-select");
    if (!host || !select) return;
    const bar = document.createElement("nav");
    bar.className = "stage-public-venue-bar";
    bar.setAttribute("aria-label", "会場を切り替える");
    const status = document.createElement("span");
    status.className = "stage-public-selection-status";
    status.id = "stage-public-selection-status";
    status.setAttribute("aria-live", "polite");
    const venues = [
      ["proscenium", "プロセニアム", "Proscenium"],
      ["thrust", "スラスト", "Thrust"],
      ["arena", "アリーナ", "Arena"],
      ["chapiteau", "シャピトー", "Chapiteau"],
    ];
    const buttons = venues.map(([value, ja, en]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.venue = value;
      button.dataset.ja = ja;
      button.dataset.en = en;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        sync();
      });
      bar.append(button);
      return button;
    });
    bar.append(status);
    host.prepend(bar);

    function sync() {
      const english = document.documentElement.lang === "en";
      bar.setAttribute("aria-label", english ? "Choose a venue" : "会場を切り替える");
      buttons.forEach((button) => {
        button.textContent = english ? button.dataset.en : button.dataset.ja;
        button.setAttribute("aria-pressed", String(button.dataset.venue === select.value));
      });
      if (!selectedPerformerId) status.textContent = "";
    }
    select.addEventListener("change", sync);
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    sync();
    return status;
  }

  function addPhoneNotice() {
    if (!phoneLike || embed) return;
    const notice = document.createElement("section");
    notice.className = "stage-public-phone-notice";
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-modal", "true");
    const message = document.createElement("p");
    const close = document.createElement("button");
    close.type = "button";
    const english = document.documentElement.lang === "en";
    message.textContent = english
      ? "This preview is limited on phones. We recommend using a computer."
      : "この体験版はスマホでは操作が限られます。PCでのご利用をお勧めします。";
    close.textContent = english ? "Continue" : "続ける";
    close.addEventListener("click", () => notice.remove());
    notice.append(message, close);
    document.body.append(notice);
    close.focus();
  }

  function movePerformer(id, u, v) {
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    const piece = scene && scene.pieces.find((item) => item.id === id && item.type === "performer");
    if (!piece) return false;
    piece.u = Math.max(0, Math.min(1, u));
    if (v !== undefined) piece.v = Math.max(0, Math.min(1, v));
    return applyDocument(documentValue);
  }

  function canvasTap(event, status) {
    if (!phoneLike || touches.size >= 2 || suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    const performers = scene ? scene.pieces.filter((piece) => piece.type === "performer") : [];
    if (!selectedPerformerId) {
      const plan = canvas.id === "stage-plan-canvas";
      const nearest = performers
        .map((piece) => ({
          piece,
          distance: plan ? Math.hypot(piece.u - u, piece.v - v) : Math.abs(piece.u - u),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!nearest || nearest.distance > (plan ? 0.2 : 0.16)) return;
      selectedPerformerId = nearest.piece.id;
      const cast = documentValue.project.cast.find((item) => item.id === nearest.piece.castId);
      const castIndex = documentValue.project.cast.findIndex((item) => item.id === nearest.piece.castId);
      const castButtons = document.querySelectorAll("#stage-cast-list .stage-cast-name");
      if (castIndex >= 0 && castButtons[castIndex]) castButtons[castIndex].click();
      const english = document.documentElement.lang === "en";
      status.textContent = english
        ? `${cast ? cast.name : "Performer"} selected`
        : `${cast ? cast.name : "演者"}を選択`;
      canvas.setAttribute("aria-describedby", "stage-public-selection-status");
      return;
    }
    movePerformer(selectedPerformerId, u, canvas.id === "stage-plan-canvas" ? v : undefined);
    selectedPerformerId = null;
    status.textContent = "";
    canvas.removeAttribute("aria-describedby");
  }

  function addPhoneTapPlacement(status) {
    [document.getElementById("stage-canvas"), document.getElementById("stage-plan-canvas")]
      .filter(Boolean)
      .forEach((canvas) => {
        canvas.addEventListener("click", (event) => canvasTap(event, status));
        canvas.addEventListener("pointerdown", (event) => {
          if (event.pointerType === "touch") touches.add(event.pointerId);
          if (touches.size >= 2) suppressNextClick = true;
        });
        canvas.addEventListener("pointerup", (event) => touches.delete(event.pointerId));
        canvas.addEventListener("pointercancel", (event) => touches.delete(event.pointerId));
      });
  }

  function stopDemo() {
    demoStopped = true;
    if (demoFrame) cancelAnimationFrame(demoFrame);
    demoFrame = 0;
  }

  function playDemo(button) {
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    const piece = scene && scene.pieces.find((item) => item.type === "performer");
    if (!piece) return;
    if (button) button.remove();
    demoStopped = false;
    const start = performance.now();
    const from = piece.u;
    const to = Math.min(0.88, from + 0.22);
    let lastDraw = 0;
    const tick = (now) => {
      if (demoStopped) return;
      const progress = Math.min(1, (now - start) / 4500);
      if (now - lastDraw >= 80 || progress === 1) {
        const eased = (1 - Math.cos(Math.PI * progress)) / 2;
        movePerformer(piece.id, from + (to - from) * eased);
        lastDraw = now;
      }
      if (progress < 1) demoFrame = requestAnimationFrame(tick);
      else demoFrame = 0;
    };
    demoFrame = requestAnimationFrame(tick);
  }

  /* デモは「画面に見えているとき」だけ再生する。
     ★requestAnimationFrame は、タブが背面のときも、LPへ iframe で置いて画面外に
       あるときも進まない。無条件に再生を始めると、利用者が見る前に終わってしまう
       （検証中に実際に起きた。2026-09-03）。見えた時点で1回だけ動かす。 */
  function whenVisible(run) {
    let done = false;
    const fire = () => {
      if (done || document.hidden) return;
      done = true;
      run();
    };
    if (!document.hidden) {
      const stack = document.querySelector(".stage-canvas-stack");
      if (stack && typeof IntersectionObserver === "function") {
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); fire(); }
        }, { threshold: 0.35 });
        observer.observe(stack);
        return;
      }
      fire();
      return;
    }
    document.addEventListener("visibilitychange", function onShow() {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onShow);
      whenVisible(run);
    });
  }

  function startDemo() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) { whenVisible(() => playDemo()); return; }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-public-motion-button";
    button.textContent = document.documentElement.lang === "en" ? "Move" : "動かす";
    button.addEventListener("click", () => playDemo(button), { once: true });
    const host = document.getElementById("stage-col-center");
    if (host) host.insertBefore(button, host.children[1] || null);
  }

  function init() {
    resetPreview();
    const selectTool = document.querySelector('[data-stage-tool="select"]');
    if (selectTool) selectTool.click();
    [document.getElementById("stage-col-left"), document.getElementById("stage-col-right")]
      .filter(Boolean).forEach((column) => { column.inert = true; });
    const status = addVenueBar();
    if (status) addPhoneTapPlacement(status);
    addPhoneNotice();
    document.addEventListener("pointerdown", stopDemo, { once: true, capture: true });
    startDemo();
    /* 検証用の取っ手。実画面で自動再生を待たずにデモを起こせる。
       画面が見えない環境（自動テスト・CI）でも動きを確かめられるようにするためのもの。 */
    window.SHOSAI_STAGE_PUBLIC = { play: () => { demoStopped = false; playDemo(); } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
