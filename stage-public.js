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
  /* 体験版の内部処理が、錠の掛かった要素をわざと押すことがある
     （タップで演者を選ぶとき、左列の名前ボタンを押して選択を同期している）。
     そのとき錠の知らせが出ると、舞台を触っただけで「製品版で使えます」と
     出てしまう。内部からの操作だけは錠を素通しする。 */
  let internalClick = false;
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
    /* 小劇場にする。舞台が小さいほど演者が大きく描かれ、指で選びやすい
       （スマホで選びにくいという本人の指摘。2026-09-03）。 */
    project.venueSize = "small";
    delete project.venueDims;
    project.title = document.documentElement.lang === "en" ? "Preview" : "体験版";
    // 演者は3人まで。体験版は「動かす」だけの場所にする。
    const keep = new Set(
      scene.pieces.filter((piece) => piece.type === "performer").slice(0, 3).map((piece) => piece.id)
    );
    scene.pieces = scene.pieces.filter(
      (piece) => piece.type !== "performer" || keep.has(piece.id)
    );
    /* 場面は3つ仕込む（本人指示 2026-09-03: 切替と転換の動きで利用イメージが湧くように）。
       ★足す・消すはできない。★駒のidは場面間で同じにする——転換アニメは同じidの駒を
         前の場面の位置から動かすので、idが違うと消えて現れるだけになる。 */
    const english = document.documentElement.lang === "en";
    const performers = scene.pieces.filter((piece) => piece.type === "performer");
    const cloneScene = (title, mutate) => {
      const copy = JSON.parse(JSON.stringify(scene));
      copy.id = `public-scene-${title.index}`;
      copy.title = english ? `Scene ${title.index}` : `場面 ${title.index}`;
      copy.pieces.forEach((piece, order) => { if (piece.type === "performer") mutate(piece, order); });
      return copy;
    };
    scene.id = "public-scene-1";
    scene.title = english ? "Scene 1" : "場面 1";
    const second = cloneScene({ index: 2 }, (piece, order) => {
      // 左右を入れ替え、少し奥へ
      piece.u = Math.max(0.12, Math.min(0.88, 1 - piece.u));
      piece.v = Math.max(0.3, Math.min(0.85, piece.v - 0.14));
      if (order === 0) piece.pose = "seiza";
    });
    const third = cloneScene({ index: 3 }, (piece, order) => {
      // 前へ出て横に広がる
      piece.u = order % 2 === 0 ? 0.24 : 0.76;
      piece.v = 0.78;
      piece.pose = order % 2 === 0 ? "kneel" : "walk";
    });
    if (performers.length) project.scenes = [scene, second, third];
    else project.scenes = [scene];
    project.activeSceneId = scene.id;
    applyDocument(documentValue);
  }

  /* ---- 人を足す（スマホの体験版・本人指示 2026-09-03） ----
     本体の「追加」は左列の欄にあり、スマホでは届かない。文書を直して戻す形で足す。
     いまの場面にだけ置く（本体の addCastMember と同じ）。上限6人。 */
  const PUBLIC_MAX_PERFORMERS = 6;
  const PUBLIC_PALETTE = ["#a84b26", "#efe7d6", "#77865f", "#8b98a1", "#d3ac59", "#6d6657"];
  function addPerformer() {
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    if (!documentValue || !scene) return false;
    const project = documentValue.project;
    const here = scene.pieces.filter((piece) => piece.type === "performer");
    if (here.length >= PUBLIC_MAX_PERFORMERS) {
      showLockedNote(document.documentElement.lang === "en"
        ? `The preview holds up to ${PUBLIC_MAX_PERFORMERS} performers.`
        : `体験版で置けるのは${PUBLIC_MAX_PERFORMERS}人までです。`);
      return false;
    }
    const english = document.documentElement.lang === "en";
    const n = (project.cast || []).length;
    const letter = String.fromCharCode(65 + (n % 26));
    const castId = `public-cast-${n + 1}`;
    const color = PUBLIC_PALETTE[n % PUBLIC_PALETTE.length];
    project.cast = (project.cast || []).concat([{
      id: castId, name: english ? `Performer ${letter}` : `演者${letter}`,
      color, heightCm: 170, note: "", locked: false,
    }]);
    const sample = here[0] || {};
    scene.pieces.push({
      id: `public-performer-${n + 1}`, type: "performer", castId,
      u: 0.5 + ((here.length % 3) - 1) * 0.12, v: 0.55, size: sample.size || 105,
      color, name: "", pose: "stand",
    });
    return applyDocument(documentValue);
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

  /* スマホ体験版の道具列。会場の帯の下に「人を足す」と「客席の位置」を置く。
     客席は本体の .stage-seat ボタン（スマホでは隠れている）を裏で押す。 */
  function addPhoneTools() {
    const stack = document.querySelector(".stage-canvas-stack");
    if (!stack || document.querySelector(".stage-public-phone-tools")) return;
    const english = document.documentElement.lang === "en";
    const tools = document.createElement("div");
    tools.className = "stage-public-phone-tools";

    const add = document.createElement("button");
    add.type = "button";
    add.className = "stage-public-add-performer";
    add.textContent = english ? "+ Performer" : "＋ 人を足す";
    add.addEventListener("click", () => { stopDemo(); addPerformer(); });

    const seatLabel = document.createElement("label");
    seatLabel.className = "stage-public-seat";
    const seatText = document.createElement("span");
    seatText.textContent = english ? "Seen from" : "客席";
    const seat = document.createElement("select");
    seat.setAttribute("aria-label", english ? "Which seat the stage is seen from" : "どの席から舞台を見るか");
    seatLabel.append(seatText, seat);

    const rebuild = () => {
      const buttons = [...document.querySelectorAll("#stage-seat-list .stage-seat")];
      seat.innerHTML = "";
      buttons.forEach((button, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = button.getAttribute("aria-label") || button.textContent.trim();
        option.selected = button.getAttribute("aria-pressed") === "true";
        seat.append(option);
      });
      seatLabel.hidden = buttons.length === 0;
    };
    seat.addEventListener("change", () => {
      const buttons = [...document.querySelectorAll("#stage-seat-list .stage-seat")];
      const target = buttons[Number(seat.value)];
      if (!target) return;
      internalClick = true;
      try { target.click(); } finally { internalClick = false; }
    });
    rebuild();
    const seatList = document.getElementById("stage-seat-list");
    if (seatList && typeof MutationObserver === "function") {
      new MutationObserver(rebuild).observe(seatList, { childList: true, attributes: true, subtree: true });
    }

    tools.append(add, seatLabel);
    stack.parentNode.insertBefore(tools, stack);
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
      if (castIndex >= 0 && castButtons[castIndex]) {
        internalClick = true;
        try { castButtons[castIndex].click(); }
        finally { internalClick = false; }
      }
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
      /* 1回動かすごとに文書の書き出し・読み込みと全再描画が走る。
         80msごとに回すとスマホで重い（2026-09-03 本人指摘）。
         ゆっくり動く演出なので、間隔を空けても見た目は変わらない。 */
      if (now - lastDraw >= 160 || progress === 1) {
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


  /* ---- 錠（2026-09-03 本人決定） ----------------------------------------
     体験版は製品版と同じ画面を見せ、使えない機能へ錠を出す。隠さない。
     ★許可したものだけを開ける「fail-closed」で組む。あとから本体へ機能が
       増えたとき、既定で錠が掛かる側に倒れるようにするため。 */
  const UNLOCKED_IDS = new Set([
    "stage-venue-select", "stage-venue-scale", "stage-venue-reset",
    "stage-venue-w", "stage-venue-h", "stage-venue-d",
    "stage-undo", "stage-redo",
    // 場面の切替と転換の再生は開ける。足す・消す・複製は閉じたまま（2026-09-03）
    "stage-scene-prev", "stage-scene-next", "stage-scene-replay",
  ]);
  const UNLOCKED_CLOSEST = [
    // 欄の見出しは開閉のボタン。錠が掛かっていても畳めるようにする（本人指示 2026-09-03）。
    ".stage-panel-head",
    ".stage-phone-scene-prev", ".stage-phone-scene-next", ".stage-phone-scene-current",
    "#stage-phone-scene-list",     // スマホの場面一覧（行と閉じるだけ。足す操作は無い）
    ".stage-public-phone-tools",   // スマホ用に足す道具（人を足す・客席）
    ".stage-view-switch",          // 正面 / 平面 / 両方
    ".stage-public-venue-bar",     // 埋め込みで足す会場の帯
    ".stage-public-phone-notice",  // PCを勧める帯の「続ける」
    ".stage-public-locked-note",
  ];

  function lockLabel() {
    return document.documentElement.lang === "en"
      ? 'This is available in the full version. The preview lets you move performers and change the venue.'
      : 'この機能は製品版（β）で使えます。体験版では、演者を動かすことと会場を変えることができます。';
  }

  function showLockedNote(message) {
    let note = document.querySelector(".stage-public-locked-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "stage-public-locked-note";
      note.setAttribute("role", "status");
      document.body.append(note);
    }
    note.textContent = message || lockLabel();
    clearTimeout(showLockedNote.timer);
    showLockedNote.timer = setTimeout(() => note.remove(), 4200);
  }

  function isUnlocked(el) {
    if (UNLOCKED_IDS.has(el.id)) return true;
    if (el.dataset && el.dataset.stageTool === "select") return true;
    return UNLOCKED_CLOSEST.some((selector) => el.closest(selector));
  }

  /* 錠を掛ける単位は「欄（.stage-panel）」を基本にする。
     ★操作要素を一つずつ暗くすると、画面全体が灰色になって「壊れている」ように見える
       （240個に錠が付いた。2026-09-03 実測）。欄ごとに一つの錠を出し、
       「この欄は製品版」と読める形にする。
     ★会場の欄だけは中身が混在する（劇場サイズは開ける／ショー操作は閉じる）ので、
       そこだけ個別に掛ける。 */
  function lockElement(el, kind) {
    if (el.dataset.publicLock) return;
    el.dataset.publicLock = kind;
    el.setAttribute("aria-disabled", "true");
    const english = document.documentElement.lang === "en";
    const base = el.getAttribute("aria-label") || (el.textContent || "").trim().slice(0, 24);
    if (base) el.setAttribute("aria-label", `${base}（${english ? "full version" : "製品版で使えます"}）`);
  }

  /* 会場の帯を出さないときの「いま選んでいる人」の表示。
     スマホのタップ操作は、選んだことが分からないと使えない。 */
  function standaloneSelectionStatus() {
    const host = document.getElementById("stage-col-center");
    if (!host) return null;
    const status = document.createElement("p");
    status.className = "stage-public-selection-status stage-public-selection-solo";
    status.id = "stage-public-selection-status";
    status.setAttribute("role", "status");
    host.insertBefore(status, host.firstChild);
    return status;
  }

  /* ---- 「体験版」であることを明示する（2026-09-03 本人指示） ------------
     ★ヘッダーの版の札は既定で「β版」と出る。これは招待制の製品版βを指す言葉で、
       誰でも開けるこの公開版に出ていると取り違えのもとになる。「体験版」へ差し替える。
     ★言語は設定（錠が掛かる）から変えられないので、起動時の一度きりでよい。
       共有の stage-i18n.js には足さない——足すと版上げが全ページへ波及し、
       βのテスターのPWAまで作り直しになる。 */
  function previewLabels() {
    const english = (() => {
      try { const b = bridge(); if (b && typeof b.isEnglish === "function") return b.isEnglish(); }
      catch (_) { /* 読めなければ lang 属性で判断する */ }
      return document.documentElement.lang === "en";
    })();
    return english
      ? {
        badge: "Preview",
        title: "Stage Sketch (Preview)",
        note: "This is a preview. You can move the performers and change the venue. Features with a lock are available in the full version.",
        betaLink: "Ask about the full beta version here",
      }
      : {
        badge: "体験版",
        title: "舞台スケッチ（体験版）",
        note: "これは体験版です。演者を動かすことと、会場を変えることができます。錠のついた機能は製品版（β）で使えます。",
        betaLink: "製品版ベータ版はコチラからお問い合わせください",
      };
  }

  /* ---- 姿勢は5つだけ（本人指示 2026-09-03） --------------------------
     本体は41種を持つ。体験版で出すのは 立つ／歩く／片膝立ち／正座／うつ伏せ。
     残りは錠にする。「まだこんなにある」ことが見えるので、隠すより伝わる。
     ★姿勢の帯は演者を選ぶたびに作り直される。掛けっぱなしにはできないので、
       中身の入れ替わりを見張って掛け直す。 */
  const PUBLIC_POSES = new Set(["stand", "walk", "kneel", "seiza", "lie"]);

  function lockPoseTiles(strip) {
    strip.querySelectorAll("[data-pose]").forEach((tile) => {
      if (PUBLIC_POSES.has(tile.dataset.pose)) {
        delete tile.dataset.publicLock;
        tile.removeAttribute("aria-disabled");
        return;
      }
      lockElement(tile, "control");
    });
  }

  function watchPoseStrip() {
    const strip = document.getElementById("stage-pose-strip");
    if (!strip) return;
    lockPoseTiles(strip);
    if (typeof MutationObserver !== "function") return;
    new MutationObserver(() => lockPoseTiles(strip)).observe(strip, { childList: true });
  }

  function markAsPreview() {
    const text = previewLabels();
    // ヘッダーの札と、スマホの題の札（stage-sketch.js が写した方）の両方
    document.querySelectorAll(".stage-beta, .stage-phone-title-beta").forEach((el) => {
      el.textContent = text.badge;
      el.classList.add("stage-public-badge");
    });
    document.title = text.title;

    // 埋め込みは帯の中へ小さく出す。iframe を切り取った絵にも「体験版」が残るように。
    if (embed) {
      const bar = document.querySelector(".stage-public-venue-bar");
      if (bar && !bar.querySelector(".stage-public-badge-chip")) {
        const chip = document.createElement("span");
        chip.className = "stage-public-badge-chip";
        chip.textContent = text.badge;
        bar.prepend(chip);
      }
      return;
    }

    // 体験版そのものには、何ができるかを1行で置く
    const head = document.querySelector(".stage-sketch-head");
    const grid = document.querySelector(".stage-sketch-grid");
    if (!head || !grid || document.querySelector(".stage-public-note")) return;
    /* 製品版ベータへの問い合わせ。別ページ（beta.html）へ送る。
       画面のいちばん上に置く（本人指示 2026-09-03）。 */
    const link = document.createElement("a");
    link.className = "stage-public-beta-link";
    link.href = "beta.html";
    link.textContent = text.betaLink;

    const note = document.createElement("p");
    note.className = "stage-public-note";
    note.textContent = text.note;

    grid.parentNode.insertBefore(note, grid);
    grid.parentNode.insertBefore(link, note);
  }

  function applyLocks() {
    const root = document.getElementById("view-stage");
    if (!root) return;

    const venuePanel = root.querySelector("#stage-venue-select")
      && root.querySelector("#stage-venue-select").closest(".stage-panel");

    // 1) 欄ごと。会場の欄だけ除く
    root.querySelectorAll(".stage-panel").forEach((panel) => {
      if (panel === venuePanel) return;
      lockElement(panel, "panel");
    });

    // 2) 会場の欄の中は、会場に関わらないものだけ閉じる
    if (venuePanel) {
      venuePanel.querySelectorAll("button, select, input, a[href]").forEach((el) => {
        if (isUnlocked(el)) return;
        lockElement(el, "control");
      });
    }

    // 3) 欄に入っていないもの（シーンの帯・上の並び・図の上の道具）
    [".stage-canvas-tools", ".stage-seat-list", ".stage-zoom-fab",
     ".stage-light-intent", ".stage-light-intent-compare", ".stage-phone-info"]
      .forEach((selector) => root.querySelectorAll(selector).forEach((el) => lockElement(el, "panel")));

    /* 上部のボタン列は「開けるもの（一つ戻す・やり直す）以外は全部錠」にする。
       ★以前は錠にするものを名指ししていたため、あとから足した「感想を送る」が
         素通りした（2026-09-03 実測）。欄と同じく fail-closed へ。 */
    root.querySelectorAll([
      ".stage-history-actions button", ".stage-history-actions a[href]",
      // シーンの帯は「送り・転換」だけ開け、足す・消す・複製・一覧などは閉じる
      "#stage-scene-bar button", "#stage-scene-bar select", "#stage-scene-bar input",
      // スマホの上下の帯（ショー・情報・設定は閉じる。送りと現在の場面は開ける）
      // ★ショーと情報は場面帯の外にある別のボタン（2026-09-03 実測で素通りしていた）
      ".stage-phone-scene-bar button", ".stage-phone-title button",
      ".stage-phone-load", ".stage-phone-info-toggle",
    ].join(", ")).forEach((el) => {
      if (isUnlocked(el)) return;
      lockElement(el, "control");
    });
    ["#stage-export", "#stage-present-btn", "#stage-prefs-btn", "#stage-freecam-open"]
      .forEach((selector) => root.querySelectorAll(selector).forEach((el) => lockElement(el, "control")));

    // 道具は「ものを動かす」だけ開ける
    root.querySelectorAll("[data-stage-tool]").forEach((el) => {
      if (el.dataset.stageTool === "select") return;
      lockElement(el, "control");
    });

    /* 押した瞬間に本体の処理が走らないよう、捕捉段階で止める。 */
    const swallow = (event) => {
      if (internalClick) return;
      // 錠の掛かった欄でも、見出しを押して開け閉めはできる。
      if (event.target.closest(".stage-panel-head")) return;
      const control = event.target.closest("button, select, input, textarea, a[href], summary");
      if (control && isUnlocked(control) && !control.dataset.publicLock) return;
      const el = event.target.closest("[data-public-lock]");
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      showLockedNote();
    };
    ["click", "pointerdown", "mousedown", "keydown"].forEach((type) => {
      root.addEventListener(type, (event) => {
        if (type === "keydown" && !["Enter", " ", "Spacebar"].includes(event.key)) return;
        swallow(event);
      }, true);
    });
  }

  function init() {
    resetPreview();
    const selectTool = document.querySelector('[data-stage-tool="select"]');
    if (selectTool) selectTool.click();
    [document.getElementById("stage-col-left"), document.getElementById("stage-col-right")]
      .filter(Boolean).forEach((column) => { column.inert = true; });
    // 会場の帯は埋め込み専用。体験版本体には本来の「劇場サイズ」の欄がある。
    // ただし「タップで選んで置く」はスマホでどちらの形でも要るので、
    // 帯を出さないときは、選択中の表示だけ別に作って渡す。
    const status = (embed || phoneLike) ? addVenueBar() : standaloneSelectionStatus();
    if (status) addPhoneTapPlacement(status);
    if (phoneLike && !embed) {
      // スマホ本体では帯を図の直前に置く（画面上部の案内やリンクに被せない）
      const bar = document.querySelector(".stage-public-venue-bar");
      const stack = document.querySelector(".stage-canvas-stack");
      if (bar && stack) stack.parentNode.insertBefore(bar, stack);
      addPhoneTools();
    }
    // 埋め込み（LPの帯）は絞り込んだ画面なので錠は要らない。体験版本体だけに掛ける。
    if (!embed) {
      applyLocks();
      watchPoseStrip();
    }
    markAsPreview();
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
