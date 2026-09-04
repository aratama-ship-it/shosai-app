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

  /* ---- 体験版で置ける数（本人指示 2026-09-04） ----------------------
     演者3人・舞台セット2つ。並べ方を試すには足りて、作品を作り切ることはできない量。
     ★数える先は「名簿（project.cast）」であって、いまの場面に出ている駒ではない。
       舞台裏にいる人も一人として数える。人数の話は名簿の話なので。
     ★小道具と照明には上限を置いていない（指示になかったため）。 */
  const PUBLIC_MAX_PERFORMERS = 3;
  const PUBLIC_MAX_SETS = 2;

  function limitNote(group) {
    const english = document.documentElement.lang === "en";
    if (group === "cast") {
      return english
        ? `The preview holds up to ${PUBLIC_MAX_PERFORMERS} performers. The full version (beta) lets you add more.`
        : `体験版で置ける演者は${PUBLIC_MAX_PERFORMERS}人までです。製品版（β）ではもっと足せます。`;
    }
    return english
      ? `The preview holds up to ${PUBLIC_MAX_SETS} set pieces. The full version (beta) lets you add more.`
      : `体験版で置ける舞台セットは${PUBLIC_MAX_SETS}つまでです。製品版（β）ではもっと足せます。`;
  }

  /* ---- 人を足す（スマホの体験版・本人指示 2026-09-03） ----
     本体の「追加」は左列の欄にあり、スマホでは届かない。文書を直して戻す形で足す。
     いまの場面にだけ置く（本体の addCastMember と同じ）。 */
  const PUBLIC_PALETTE = ["#a84b26", "#efe7d6", "#77865f", "#8b98a1", "#d3ac59", "#6d6657"];
  function addPerformer() {
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    if (!documentValue || !scene) return false;
    const project = documentValue.project;
    const here = scene.pieces.filter((piece) => piece.type === "performer");
    if ((project.cast || []).length >= PUBLIC_MAX_PERFORMERS) {
      showLockedNote(limitNote("cast"));
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

  /* スマホ体験版の道具列（2026-09-03 本人指示で作り直し）。
     ★会場の種類（プロセニアム等）の切替は出さない。求められたのは
       「客席からの見え方」の切替。本体の .stage-seat ボタン（スマホでは隠れている）を
       裏で押す札を並べ、同じ列に「人を足す」を置く。1列にして縦の場所を取らない。 */
  /* 客席の札を container の中へ並べる。本体の .stage-seat（スマホでは隠れている）を裏で押す。
     会場が変わると本体が札を作り直すので、見張って作り直す。 */
  function buildSeatButtons(container, onPick) {
    const rebuild = () => {
      const buttons = [...document.querySelectorAll("#stage-seat-list .stage-seat")];
      container.innerHTML = "";
      buttons.forEach((source, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = source.getAttribute("aria-label") || source.textContent.trim();
        button.setAttribute("aria-pressed", source.getAttribute("aria-pressed") === "true" ? "true" : "false");
        button.addEventListener("click", () => {
          const live = document.querySelectorAll("#stage-seat-list .stage-seat")[index];
          if (!live) return;
          internalClick = true;
          try { live.click(); } finally { internalClick = false; }
          if (onPick) onPick();
        });
        container.append(button);
      });
      container.hidden = buttons.length === 0;
    };
    rebuild();
    const seatList = document.getElementById("stage-seat-list");
    if (seatList && typeof MutationObserver === "function") {
      new MutationObserver(rebuild).observe(seatList, { childList: true, attributes: true, subtree: true });
    }
  }

  function railLabels() {
    const english = document.documentElement.lang === "en";
    return english
      ? { add: "+1", addLabel: "Add a performer", seat: "Seat", seatLabel: "Which seat the stage is seen from", settings: "Settings", settingsLabel: "Open settings", close: "Close" }
      : { add: "＋人", addLabel: "人を足す", seat: "客席", seatLabel: "どの席から舞台を見るか", settings: "設定", settingsLabel: "設定を開く", close: "閉じる" };
  }

  /* 縦向き: 図の上に一列（＋人・客席の札）。 */
  function addPhoneSeatBar() {
    const stack = document.querySelector(".stage-canvas-stack");
    if (!stack || document.querySelector(".stage-public-phone-tools")) return null;
    const text = railLabels();
    const tools = document.createElement("div");
    tools.className = "stage-public-phone-tools";
    tools.setAttribute("role", "group");
    tools.setAttribute("aria-label", text.seatLabel);

    const add = document.createElement("button");
    add.type = "button";
    add.className = "stage-public-add-performer";
    add.textContent = text.add;
    add.setAttribute("aria-label", text.addLabel);
    add.addEventListener("click", () => { stopDemo(); addPerformer(); });

    const seats = document.createElement("div");
    seats.className = "stage-public-seat-buttons";
    buildSeatButtons(seats, null);

    const status = document.createElement("span");
    status.className = "stage-public-selection-status";
    status.id = "stage-public-selection-status";
    status.setAttribute("role", "status");

    tools.append(add, seats, status);
    stack.parentNode.insertBefore(tools, stack);
    addPhoneRail();
    return status;
  }

  /* 横向き: 右のレール（本体の .stage-phone-toolbar）へ「＋人」「客席」「設定」を足す。
     下に帯を重ねると図の床を隠す（2026-09-03 本人指摘）。
     「客席」と「設定」はタップで選択肢が出る。縦向きでは CSS で隠す。 */
  function addPhoneRail() {
    const toolbar = document.querySelector(".stage-phone-toolbar");
    const sceneBar = toolbar && toolbar.querySelector(".stage-phone-scene-bar");
    if (!toolbar || document.querySelector(".stage-public-rail")) return;
    const text = railLabels();
    const rail = document.createElement("div");
    rail.className = "stage-public-rail";

    const make = (label, aria, cls) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `stage-phone-button ${cls}`;
      button.textContent = label;
      button.setAttribute("aria-label", aria);
      return button;
    };
    const add = make(text.add, text.addLabel, "stage-public-rail-add");
    add.addEventListener("click", () => { stopDemo(); addPerformer(); });

    const seat = make(text.seat, text.seatLabel, "stage-public-rail-seat");
    seat.setAttribute("aria-haspopup", "true");
    seat.setAttribute("aria-expanded", "false");

    const settings = make(text.settings, text.settingsLabel, "stage-public-rail-settings");
    settings.addEventListener("click", () => {
      closePopover();
      const toggle = document.querySelector(".stage-phone-title-settings");
      if (!toggle) return;
      internalClick = true;
      try { toggle.click(); } finally { internalClick = false; }
    });

    // 客席の選択肢（ポップオーバー）
    const popover = document.createElement("div");
    popover.className = "stage-public-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", text.seatLabel);
    popover.hidden = true;
    const head = document.createElement("div");
    head.className = "stage-public-popover-head";
    const title = document.createElement("strong");
    title.textContent = text.seatLabel;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "stage-public-popover-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", text.close);
    head.append(title, close);
    const list = document.createElement("div");
    list.className = "stage-public-seat-buttons stage-public-popover-list";
    buildSeatButtons(list, () => closePopover());
    popover.append(head, list);
    document.body.append(popover);

    function closePopover() {
      popover.hidden = true;
      seat.setAttribute("aria-expanded", "false");
    }
    seat.addEventListener("click", () => {
      const open = popover.hidden;
      popover.hidden = !open;
      seat.setAttribute("aria-expanded", String(open));
    });
    close.addEventListener("click", closePopover);
    document.addEventListener("pointerdown", (event) => {
      if (popover.hidden) return;
      if (popover.contains(event.target) || seat.contains(event.target)) return;
      closePopover();
    }, true);

    rail.append(add, seat, settings);
    if (sceneBar) toolbar.insertBefore(rail, sceneBar);
    else toolbar.append(rail);
    rail.__labels = { add, seat, settings, title, close };
  }

  /* 正面図の右上に描かれる「どの席から見ているか」の小さな地図（drawSeatMap）は、
     スマホでは図を隠すだけなので出さない（本人指示 2026-09-03）。
     canvas に直接描かれるので、本体の切替（#stage-show-seatmap）を裏で外す。 */
  /* スマホの設定パネルを体験版向けに組み直す（本人指示 2026-09-03）。
     ・「端末による違い」は出さない
     ・閉じるは ✕ にして、日本語 / English と同じ一列の右端へ
     ★本体は言語を切り替えるたびに札の文字を貼り直す（setPhoneButtonLang）。
       ✕ も「閉じる」に戻されるので、言語が変わったら呼び直すこと。 */
  function markPhoneSettings() {
    const panel = document.querySelector(".stage-phone-settings");
    if (!panel) return;
    const english = document.documentElement.lang === "en";
    const buttons = [...panel.querySelectorAll("button")];
    if (!buttons.length) return;

    const langs = buttons.filter((el) => el.hasAttribute("aria-pressed")).slice(0, 2);
    const close = buttons[buttons.length - 1];
    langs.forEach((el) => el.classList.add("stage-public-lang"));

    // 言語でも閉じるでもないもの（＝端末による違い）は出さない
    buttons.forEach((el) => {
      if (el === close || langs.includes(el)) return;
      el.classList.add("stage-public-off");
      el.hidden = true;
    });

    if (close) {
      close.classList.add("stage-public-lang", "stage-public-close");
      const label = english ? "Close settings" : "設定を閉じる";
      // ★同じ値でも書けば変化として見張りに拾われる。必要なときだけ書く
      if (close.textContent !== "✕") close.textContent = "✕";
      if (close.getAttribute("aria-label") !== label) close.setAttribute("aria-label", label);
    }
  }

  /* 本体は表示を整えるたびに札の文字を貼り直す（setPhoneButtonLang）。
     一度きりの書き換えでは元に戻るので、パネルの変化を見張って掛け直す。 */
  function watchPhoneSettings() {
    const panel = document.querySelector(".stage-phone-settings");
    if (!panel || typeof MutationObserver !== "function") return;
    new MutationObserver(() => markPhoneSettings())
      .observe(panel, { childList: true, subtree: true, characterData: true });
  }

  /* 正面図の右上に描かれる「どの席から見ているか」の小さな地図（drawSeatMap）は、
     スマホでは図を隠すだけなので出さない（本人指示 2026-09-03）。
     canvas に直接描かれるので、本体の切替（#stage-show-seatmap）を裏で外す。 */
  function hideSeatMapOnPhone() {
    const box = document.getElementById("stage-show-seatmap");
    if (!box || !box.checked) return;
    box.checked = false;
    internalClick = true;
    try { box.dispatchEvent(new Event("change", { bubbles: true })); }
    finally { internalClick = false; }
  }

  function addPhoneNotice() {
    if (!phoneLike || embed) return;
    const notice = document.createElement("section");
    notice.className = "stage-public-phone-notice";
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-modal", "true");
    /* ★日本語と英語を並べて出す（本人指示 2026-09-03）。
       この帯は言語の切替へ触れる前に、いちばん最初に出る。端末の言語だけで
       選ぶと、日本語の端末を使う英語話者には英文が届かない。両方見せて迷いを無くす。
       先に出すのは端末の言語の方。 */
    const english = document.documentElement.lang === "en";
    const JA = "この体験版はスマホでは操作が限られます。PCでのご利用をお勧めします。";
    const EN = "This preview is limited on phones. We recommend using a computer.";
    const message = document.createElement("p");
    message.textContent = english ? EN : JA;
    const sub = document.createElement("p");
    sub.className = "stage-public-phone-notice-sub";
    sub.textContent = english ? JA : EN;
    sub.lang = english ? "ja" : "en";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = english ? "Continue ／ 続ける" : "続ける ／ Continue";
    close.addEventListener("click", () => notice.remove());
    notice.append(message, sub, close);
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

  /* ---- 平面図の座標換算（2026-09-03 本人指摘: 思ったところへ動かせない） ----
     以前は canvas 全体の比率をそのまま u,v にしていた。だが平面図の床は canvas の
     余白の内側に描かれる矩形（本体 planFit）なので、床の中央を突いても u,v は 0.5 にならない。
     本体の planFit をそのまま移し、床の矩形で換算する。
     ★本体の planFit（stage-sketch.js の @planFit）と同じ式であること。向こうが変わったらここも直す。 */
  const PUBLIC_W = 1280;
  const PUBLIC_WING_M = 2.5;
  function publicPlanFit(input) {
    const { W, H, audience, width, depth, wingM } = input;
    const M = 24;
    const ratio = depth / width;
    const wingRatio = wingM / width;
    let sw, top, bottom;
    if (audience === "round") {
      sw = (Math.min(W, H) - 2 * (95 + 28 + M)) / Math.max(1, ratio);
      const sh = sw * ratio;
      const outside = Math.max(sw, sh) / 2 + 95 + 28 + M;
      top = outside - sh / 2;
      bottom = top;
    } else if (audience === "three") {
      const byWidth = W - 2 * (96 + M);
      const byHeight = (H - (96 + 2 * M)) / (ratio + wingRatio);
      sw = Math.min(byWidth, byHeight);
      top = wingRatio * sw + M;
      bottom = 96 + M;
    } else {
      const byWidth = (W - 2 * M) / (1 + 2 * wingRatio);
      bottom = audience === "none" ? M : 96 + M;
      const byHeight = (H - M - bottom) / ratio;
      sw = Math.min(byWidth, byHeight);
      top = M;
    }
    const sh = sw * ratio;
    return { x: (W - sw) / 2, y: top + (H - top - bottom - sh) / 2, w: sw, h: sh };
  }

  /* 画面上の点 → 平面図の u,v。会場と規模は文書から、寸法は本体の VENUES から引く。
     ピンチ拡大中の補正はしない（拡大したまま置くと少しずれる。仕様として割り切る）。 */
  function planUVFromClient(canvas, clientX, clientY, documentValue) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const VENUES = window.SHOSAI_VENUES;
    const project = documentValue && documentValue.project;
    if (!VENUES || !project) return null;
    let stage = null;
    try {
      const venue = VENUES.byId(project.venue);
      const size = VENUES.sizeById(venue, project.venueSize);
      // 論理座標の高さ。backing の倍率（canvas.width / 1280）で割り戻す
      const H = canvas.height / (canvas.width / PUBLIC_W);
      stage = publicPlanFit({
        W: PUBLIC_W, H, audience: venue.audience,
        width: size.width, depth: size.depth, wingM: PUBLIC_WING_M,
      });
    } catch (_) { return null; }
    const x = (clientX - rect.left) * (PUBLIC_W / rect.width);
    const y = (clientY - rect.top) * ((canvas.height / (canvas.width / PUBLIC_W)) / rect.height);
    return {
      u: Math.max(0, Math.min(1, (x - stage.x) / stage.w)),
      v: Math.max(0, Math.min(1, (y - stage.y) / stage.h)),
    };
  }

  /* ---- 正面図のタップ換算（2026-09-03 本人指摘: 端でずれる） ----
     以前は canvas 全体の比率で u を出していた。正面図は擬似パースがあり、
     手前ほど幅が広く奥ほど狭い（本体 layout() の front 枝）ので、線形の比率のまま
     だと中央から離れるほどずれる（実測: 1階中央・端で画面比9%）。

     ★v はタップのY座標から逆算しない。「駒の既存の奥行き」を使う。
       Y座標から逆算する式（本体の fromScreen と同じ）も一度実装したが、
       客席が近い席（1階最前列）では floorY〜bottomY の幅がとても狭く、
       CSS 1px のタップのぶれが v を大きく動かし、u が実測で最大0.03ずれた
       （指の太さを思えばもっと動く）。正面図のタップは元々「左右だけ動かし、
       奥行きは変えない」設計なので、その変えない奥行き（駒の v）をそのまま
       使う方が、式としても、指のぶれへの強さとしても正しい。 */
  function publicFrontHalfWidth(canvas, documentValue) {
    const VENUES = window.SHOSAI_VENUES;
    const project = documentValue && documentValue.project;
    if (!VENUES || !project) return null;
    let seat;
    try {
      const seatButtons = [...document.querySelectorAll("#stage-seat-list .stage-seat")];
      const index = seatButtons.findIndex((el) => el.getAttribute("aria-pressed") === "true");
      seat = (index >= 0 && VENUES.seats[index]) || VENUES.seatById(project.seat || "center");
    } catch (_) { return null; }
    let venue, size;
    try {
      venue = VENUES.byId(project.venue);
      size = VENUES.sizeById(venue, project.venueSize);
    } catch (_) { return null; }

    const BASE_H = 720;
    const H = canvas.height / (canvas.width / PUBLIC_W);
    const k = H / BASE_H;
    const floorY = seat.floorY * k;

    const span = seat.frontW / seat.backW;
    const headroom = Math.max(24, floorY - 22);
    const byWidth = (PUBLIC_W * seat.frontW) / size.width;
    const byHeight = headroom / ((size.height || 8) / span);
    const pxPerM = Math.min(byWidth, byHeight);
    const frontW = pxPerM * size.width;
    const backW = frontW / span;
    const panRange = Math.max(0, (frontW - PUBLIC_W) / 2);
    const centerX = PUBLIC_W / 2 + Math.max(-1, Math.min(1, project.frontPan || 0)) * panRange;
    const shift = (seat.shift || 0) * PUBLIC_W * 0.5;
    return { frontW, backW, centerX, shift };
  }

  /* 与えた奥行き v（駒の既存の値）での幅を使って、タップの画面x → u。 */
  function publicFrontU(canvas, clientX, v, documentValue) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const geom = publicFrontHalfWidth(canvas, documentValue);
    if (!geom) return null;
    const { frontW, backW, centerX, shift } = geom;
    const x = (clientX - rect.left) * (PUBLIC_W / rect.width);
    const halfW = (backW + v * (frontW - backW)) / 2;
    const slide = shift * (1 - v);
    return Math.max(0, Math.min(1, (x - centerX - slide) / (halfW * 2) + 0.5));
  }

  function canvasTap(event, status) {
    if (!phoneLike || touches.size >= 2 || suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const documentValue = readDocument();
    const scene = activeScene(documentValue);
    const isPlan = canvas.id === "stage-plan-canvas";
    const performers = scene ? scene.pieces.filter((piece) => piece.type === "performer") : [];

    // 正面図は、駒ごとの奥行き（既存の v）で幅が変わるため、候補ごとに u を出し直す。
    // 単一の u を先に決めて全員へ当てはめると、手前と奥の駒で誤差の意味が変わる。
    const frontUFor = (v) => publicFrontU(canvas, event.clientX, v, documentValue);

    if (!selectedPerformerId) {
      const mappedPlan = isPlan ? planUVFromClient(canvas, event.clientX, event.clientY, documentValue) : null;
      const nearest = performers
        .map((piece) => {
          if (isPlan) {
            const u = mappedPlan ? mappedPlan.u : null;
            const v = mappedPlan ? mappedPlan.v : null;
            return u === null ? null : { piece, distance: Math.hypot(piece.u - u, piece.v - v) };
          }
          const u = frontUFor(piece.v);
          return u === null ? null : { piece, distance: Math.abs(piece.u - u) };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!nearest || nearest.distance > (isPlan ? 0.2 : 0.16)) return;
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

    const selected = performers.find((piece) => piece.id === selectedPerformerId);
    if (isPlan) {
      const mapped = planUVFromClient(canvas, event.clientX, event.clientY, documentValue);
      if (mapped) movePerformer(selectedPerformerId, mapped.u, mapped.v);
    } else if (selected) {
      // 左右だけ動かし、奥行き（selected.v）は変えない。浮かせない。
      const u = frontUFor(selected.v);
      if (u !== null) movePerformer(selectedPerformerId, u, undefined);
    }
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
    /* 設定は開ける。中身は錠だが、日本語⇄英語の切替だけは使えるようにする
       （本人指示 2026-09-03）。 */
    "stage-prefs-btn", "stage-prefs-close", "stage-lang",
  ]);
  const UNLOCKED_CLOSEST = [
    // 欄の見出しは開閉のボタン。錠が掛かっていても畳めるようにする（本人指示 2026-09-03）。
    ".stage-panel-head",
    ".stage-phone-scene-prev", ".stage-phone-scene-next", ".stage-phone-scene-current",
    "#stage-phone-scene-list",     // スマホの場面一覧（行と閉じるだけ。足す操作は無い）
    ".stage-public-phone-tools",   // スマホ用に足す道具（人を足す・客席）
    ".stage-public-rail",          // 横向きの右レールに足した札（＋人・客席・設定）
    ".stage-public-popover",       // その選択肢
    ".stage-phone-title-settings", // スマホの歯車（設定を開く）
    ".stage-public-lang",          // スマホ設定の中の 日本語 / English
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
        betaLink: "Ask about the full beta version here",
      }
      : {
        badge: "体験版",
        title: "舞台スケッチ（体験版）",
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

  /* 言語を切り替えると本体が html の lang を書き換える（stage-sketch.js）。
     体験版で足した札や道具は本体の訳語の仕組みの外にあるので、ここで貼り直す。 */
  function watchLanguage() {
    if (typeof MutationObserver !== "function") return;
    let last = document.documentElement.lang;
    new MutationObserver(() => {
      const now = document.documentElement.lang;
      if (now === last) return;
      last = now;
      markAsPreview();
      // 本体が札の文字を貼り直すので、✕ と非表示を掛け直す
      markPhoneSettings();
      const text = railLabels();
      const add = document.querySelector(".stage-public-add-performer");
      if (add) { add.textContent = text.add; add.setAttribute("aria-label", text.addLabel); }
      const rail = document.querySelector(".stage-public-rail");
      if (rail && rail.__labels) {
        const l = rail.__labels;
        l.add.textContent = text.add; l.add.setAttribute("aria-label", text.addLabel);
        l.seat.textContent = text.seat; l.seat.setAttribute("aria-label", text.seatLabel);
        l.settings.textContent = text.settings; l.settings.setAttribute("aria-label", text.settingsLabel);
        l.title.textContent = text.seatLabel; l.close.setAttribute("aria-label", text.close);
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  function markAsPreview() {
    const text = previewLabels();
    // ヘッダーの札と、スマホの題の札（stage-sketch.js が写した方）の両方
    document.querySelectorAll(".stage-beta, .stage-phone-title-beta, .stage-public-badge-chip").forEach((el) => {
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
    if (!head || !grid) return;
    /* 製品版ベータへの問い合わせ。別ページ（beta.html）へ送る。
       画面のいちばん上、題より一段上の右へ置く（本人指示 2026-09-03 / 2026-09-04）。
       ★見出しの帯（.stage-sketch-head）の中には入れない。あの帯は justify-content: space-between で
         「題」と「操作の列」を両端へ振っている。三つ目を入れると操作の列が真ん中へ寄る。 */
    const existing = document.querySelector(".stage-public-beta-link");
    if (existing) { existing.textContent = text.betaLink; return; }
    const link = document.createElement("a");
    link.className = "stage-public-beta-link";
    link.href = "beta.html";
    link.textContent = text.betaLink;

    /* 「これは体験版です」の一行は出さない（本人指示 2026-09-03）。
       版の札（体験版 / Preview）と、上の問い合わせリンクで足りる。 */
    head.parentNode.insertBefore(link, head);
  }

  /* ---- 名簿の上限（本人指示 2026-09-04） ------------------------------
     「出るもの」の欄を開けたので、そこからいくらでも足せてしまう。演者3人・舞台セット2つで止める。

     二段構えにしている。
     ① 押す前に止める：足しても何も起きない、ではなく「なぜ足せないか」を出す。
     ② 足りてしまったら消す：見張って上限超過を戻す。①はいまの種類を読んで判断するので、
        読み違えたときの受け皿が要る。消すのは本体の✕（removeCastMember / removeSetItem）に任せる。
        中途半端に文書を書き換えると、その駒を指している場面の側が残る。 */
  const ROSTER_LISTS = { cast: "stage-cast-list", sets: "stage-set-list" };
  const ROSTER_MAX = { cast: PUBLIC_MAX_PERFORMERS, sets: PUBLIC_MAX_SETS };
  /* 本体の ROSTER_KINDS は ["performer"] + セットの種類。札の文字で見分ける。
     共有の stage-i18n.js を関数として読める形では持っていないので、ここに書く
     （previewLabels と同じ考え方）。 */
  const PERFORMER_LABELS = new Set(["演者", "Performer"]);

  function rosterCount(group) {
    const host = document.getElementById(ROSTER_LISTS[group]);
    return host ? host.children.length : 0;
  }

  /* いま「追加」を押すと、どの組へ入るか。
     ★小道具は本体が「形」の選択肢を出すので、それが見えているかで分かる。上限は無い。 */
  function pendingRosterGroup() {
    const shape = document.getElementById("stage-roster-prop-shape");
    if (shape && !shape.hidden) return "props";
    const label = document.getElementById("stage-roster-kind-label");
    return PERFORMER_LABELS.has(label ? label.textContent.trim() : "") ? "cast" : "sets";
  }

  function guardRosterAdd(event) {
    const group = pendingRosterGroup();
    if (group === "props") return;
    if (rosterCount(group) < ROSTER_MAX[group]) return;
    event.preventDefault();
    event.stopPropagation();
    showLockedNote(limitNote(group));
  }

  /* ★戻すのは本体の「一つ戻す」に任せる。
     行の✕（removeCastMember / removeSetItem）は window.confirm を出す。
     こちらが勝手に足したわけでもないのに確認の窓が出るのはおかしいし、
     自動では答えられないので消えない（2026-09-04 実測で3件のまま残った）。
     追加は checkpoint() を通るので、一つ戻せばその追加だけがちょうど消える。 */
  let trimFailed = false;
  function trimRoster() {
    const over = Object.keys(ROSTER_LISTS)
      .find((group) => rosterCount(group) > ROSTER_MAX[group]);
    if (!over) { trimFailed = false; return; }
    if (trimFailed) return;              // 戻せなかったら、もう押さない
    const undo = document.getElementById("stage-undo");
    if (!undo) return;
    const before = rosterCount(over);
    internalClick = true;
    try { undo.click(); } finally { internalClick = false; }
    showLockedNote(limitNote(over));
    trimFailed = rosterCount(over) >= before;
  }

  function watchRosterLimits() {
    const add = document.getElementById("stage-roster-add");
    if (add) add.addEventListener("click", guardRosterAdd, true);
    const name = document.getElementById("stage-roster-name");
    if (name) {
      name.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        guardRosterAdd(event);
      }, true);
    }
    if (typeof MutationObserver !== "function") return;
    Object.values(ROSTER_LISTS).forEach((id) => {
      const host = document.getElementById(id);
      if (host) new MutationObserver(trimRoster).observe(host, { childList: true });
    });
  }

  function applyLocks() {
    const root = document.getElementById("view-stage");
    if (!root) return;

    const venuePanel = root.querySelector("#stage-venue-select")
      && root.querySelector("#stage-venue-select").closest(".stage-panel");
    /* 開ける欄。「出るもの」と「選んだもの」は体験版でも使えるようにする（本人指示 2026-09-04）。
       この二つがあれば、人を足して姿勢と向きを決める、という一周がそのまま試せる。 */
    const openPanels = new Set([venuePanel,
      root.querySelector('.stage-panel[data-panel="cast"]'),
      root.querySelector('.stage-panel[data-panel="inspector"]'),
    ].filter(Boolean));

    // 1) 欄ごと。開ける欄だけ除く
    root.querySelectorAll(".stage-panel").forEach((panel) => {
      if (openPanels.has(panel)) return;
      lockElement(panel, "panel");
      /* 中身は inert にする。
         ★以前は左右の列ごと inert にしていた。おかげでキーボードからも触れなかったが、
           見出し（開閉のボタン）まで死んで、どの欄も畳めなかった（2026-09-04 実測）。
         ★見出しを外して「本文だけ」inert にする。畳めるようになり、
           錠の掛かった欄の中はタブでも矢印キーでも動かせないままになる。
           （押した瞬間を止めるだけだと、範囲入力や選択肢は矢印キーで値が変わってしまう） */
      const body = panel.querySelector(".stage-panel-body");
      if (body) body.inert = true;
      /* 錠の欄は畳んだ状態で始める（本人指示 2026-09-04）。見出しを押せば開く。
         ★is-collapsed を直接付けない。畳んでいるかどうかは本体が state.layout.collapsed で
           持っていて、クラスだけ付けると次に見出しを押しても何も起きない。
           本体の見出しを押して、本体の状態ごと畳ませる。 */
      const head = panel.querySelector(".stage-panel-head");
      if (head && !panel.classList.contains("is-collapsed")) {
        internalClick = true;
        try { head.click(); } finally { internalClick = false; }
      }
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
      // スマホ設定の中身（言語と閉じるは上の許可リストで残す）。
      // 「端末による違い」は窓を開くが、その窓は出さないので押しても何も起きない
      ".stage-phone-settings button",
    ].join(", ")).forEach((el) => {
      if (isUnlocked(el)) return;
      lockElement(el, "control");
    });
    // ★#stage-prefs-btn は入れない。設定は開ける（中身は上の許可リストで絞る）
    /* ★#stage-fpv-open（この人の視界）は「選んだもの」の中にある。欄ごと開けたので、
         ここで名指しして錠にする。中身は stage-first-person.js が要るが、
         軽くするために配信から外してある。押せてしまうと何も起きない。 */
    ["#stage-export", "#stage-present-btn", "#stage-freecam-open", "#stage-fpv-open"]
      .forEach((selector) => root.querySelectorAll(selector).forEach((el) => lockElement(el, "control")));

    // 道具は「ものを動かす」だけ開ける
    root.querySelectorAll("[data-stage-tool]").forEach((el) => {
      if (el.dataset.stageTool === "select") return;
      lockElement(el, "control");
    });

    /* 設定の窓は <main id="view-stage"> の外にある。上の走査は届かないので、
       ここで別に掛ける。開けるのは言語の切替と閉じるだけ。
       ★冊子・使い方は、軽くするために配信から外したスクリプトを使う。
         押せてしまうと何も起きないか壊れるので、必ず錠にする。 */
    const prefs = document.getElementById("stage-prefs-modal");
    if (prefs) {
      /* ★項目の一覧（#stage-prefs-list）は本体がJSで組み立てる。起動時に一度掛けるだけでは
         静的なボタンしか捕まらない（2026-09-03 実測: チェック21個が素通り）。組み直しを見張る。 */
      const lockInside = () => {
        prefs.querySelectorAll("button, select, input, textarea, a[href]").forEach((el) => {
          if (isUnlocked(el)) return;
          lockElement(el, "control");
        });
      };
      lockInside();
      if (typeof MutationObserver === "function") {
        new MutationObserver(lockInside).observe(prefs, { childList: true, subtree: true });
      }
      prefs.addEventListener("click", (event) => {
        if (internalClick) return;
        const control = event.target.closest("button, select, input, textarea, a[href]");
        if (control && isUnlocked(control) && !control.dataset.publicLock) return;
        if (!event.target.closest("[data-public-lock]")) return;
        event.preventDefault();
        event.stopPropagation();
        showLockedNote();
      }, true);
    }

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
    // 会場の帯は埋め込み専用。体験版本体には本来の「劇場サイズ」の欄がある。
    // ただし「タップで選んで置く」はスマホでどちらの形でも要るので、
    // 帯を出さないときは、選択中の表示だけ別に作って渡す。
    // 会場の種類の帯は埋め込み（LP）だけ。スマホ本体は客席の見え方の帯にする
    const status = embed ? addVenueBar()
      : phoneLike ? addPhoneSeatBar()
        : standaloneSelectionStatus();
    if (status) addPhoneTapPlacement(status);
    if (phoneLike && !embed) hideSeatMapOnPhone();
    // 埋め込み（LPの帯）は絞り込んだ画面なので錠は要らない。体験版本体だけに掛ける。
    if (!embed) {
      markPhoneSettings();
      watchPhoneSettings();
      applyLocks();
      watchPoseStrip();
      watchRosterLimits();
    }
    watchLanguage();
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
