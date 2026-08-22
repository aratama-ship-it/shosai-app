(() => {
  "use strict";

  const bridge = window.SHOSAI_STAGE_SESSION_BRIDGE;
  if (!bridge) return;

  const $ = (id) => document.getElementById(id);
  const els = {
    panel: $("stage-session-panel"),
    summary: $("stage-session-summary"),
    hostControls: $("stage-session-host-controls"),
    hostNameLabel: $("stage-session-host-name-label"),
    hostName: $("stage-session-host-name"),
    start: $("stage-session-start"),
    invite: $("stage-session-invite"),
    urlLabel: $("stage-session-url-label"),
    url: $("stage-session-url"),
    copy: $("stage-session-copy"),
    participantsLabel: $("stage-session-participants-label"),
    participants: $("stage-session-participants"),
    status: $("stage-session-status"),
    guestNote: $("stage-session-guest-note"),
    clearGuestArrows: $("stage-session-clear-guest-arrows"),
    reconnect: $("stage-session-reconnect"),
    planCanvas: $("stage-plan-canvas"),
  };
  if (!els.panel || !els.start || !els.status || !els.participants) return;

  const NAME_KEY = "shosai-session-name";
  const RECONNECT_LIMIT = 5;
  const RECONNECT_DELAY_MS = 3000;
  const HOST_SEND_DEBOUNCE_MS = 300;
  const POINTER_THROTTLE_MS = 100;
  const POINTER_TTL_MS = 3000;

  let role = "";
  let roomId = "";
  let hostKey = "";
  let displayName = "";
  let socket = null;
  let reconnectAttempts = 0;
  let reconnectAllowed = true;
  let reconnectTimer = null;
  let hostSendTimer = null;
  let lastSentDocument = null;
  let lastReceivedDocument = null;
  let applyingRemoteDocument = false;
  let applyReleaseTimer = null;
  let applyGeneration = 0;
  const sentArrowOps = new Set();
  const sentPieceOps = new Set();
  const remotePointers = new Map();

  function setJapaneseLabels() {
    els.panel.hidden = false;
    if (els.summary) els.summary.textContent = "リアルタイム共有（会議用）";
    if (els.hostNameLabel) els.hostNameLabel.textContent = "表示名";
    els.start.textContent = "セッションを開始";
    if (els.urlLabel) els.urlLabel.textContent = "招待URL";
    if (els.copy) els.copy.textContent = "コピー";
    if (els.guestNote) els.guestNote.textContent = "ゲスト参加中: 演者・道具の移動と矢印だけが全員へ共有されます。他の編集は次の更新で元に戻ります。";
    if (els.participantsLabel) els.participantsLabel.textContent = "参加者";
    if (els.clearGuestArrows) els.clearGuestArrows.textContent = "ゲスト注釈を一括消去";
    if (els.reconnect) els.reconnect.textContent = "再接続";
  }

  function setStatus(message, isError = false) {
    els.status.textContent = message;
    els.status.classList.toggle("is-error", isError);
  }

  function normalizeName(value, fallback) {
    const clean = Array.from(String(value || "").replace(/[\u0000-\u001f\u007f-\u009f]/g, ""))
      .slice(0, 50).join("").trim();
    return clean || fallback;
  }

  function readStoredName(fallback) {
    try { return normalizeName(localStorage.getItem(NAME_KEY), fallback); }
    catch (_) { return fallback; }
  }

  function rememberName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (_) { /* 名前の保存だけ失敗しても参加は続ける */ }
  }

  function invitedRoomId() {
    const match = location.hash.match(/^#session=([a-z0-9]{1,64})$/i);
    return match ? match[1].toLowerCase() : "";
  }

  function revealStageView() {
    if (document.body.classList.contains("is-standalone")) return;
    const stageView = $("view-stage");
    if (!stageView) return;
    document.querySelectorAll(".view").forEach((view) => { view.hidden = true; });
    stageView.hidden = false;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.setAttribute("aria-current", link.dataset.nav === "stage" ? "page" : "false");
    });
  }

  function socketIsOpen() {
    return Boolean(socket && socket.readyState === WebSocket.OPEN);
  }

  function sendMessage(message) {
    if (!socketIsOpen()) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (_) {
      return false;
    }
  }

  function sessionSocketUrl() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(`${protocol}//${location.host}/session/${encodeURIComponent(roomId)}/ws`);
    url.searchParams.set("role", role);
    url.searchParams.set("name", displayName);
    if (role === "host") url.searchParams.set("key", hostKey);
    return url.href;
  }

  function roleLabel(value) {
    return value === "host" ? "ホスト" : "ゲスト";
  }

  function removeRemotePointer(clientId) {
    const entry = remotePointers.get(clientId);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.node.remove();
    remotePointers.delete(clientId);
  }

  function clearRemotePointers() {
    Array.from(remotePointers.keys()).forEach(removeRemotePointer);
  }

  function renderParticipants(rawParticipants) {
    const participants = Array.isArray(rawParticipants) ? rawParticipants : [];
    els.participants.replaceChildren();
    participants.forEach((participant) => {
      if (!participant || typeof participant !== "object") return;
      const item = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = "stage-session-participant-dot";
      dot.style.backgroundColor = typeof participant.color === "string" ? participant.color : "#d3ac59";
      const name = normalizeName(participant.name, "名前なし");
      item.append(dot, document.createTextNode(`${name}（${roleLabel(participant.role)}）`));
      els.participants.append(item);
    });
    if (!els.participants.childElementCount) {
      const empty = document.createElement("li");
      empty.textContent = "まだ参加者はいません。";
      els.participants.append(empty);
    }
    const activeIds = new Set(participants.map((participant) => participant && participant.clientId).filter(Boolean));
    Array.from(remotePointers.keys()).forEach((clientId) => {
      if (!activeIds.has(clientId)) removeRemotePointer(clientId);
    });
  }

  function updateRoleUi() {
    els.panel.open = Boolean(role);
    els.start.disabled = Boolean(role);
    if (els.hostName) els.hostName.disabled = Boolean(role);
    if (els.invite) els.invite.hidden = role !== "host" || !roomId;
    if (els.guestNote) els.guestNote.hidden = role !== "guest";
    if (els.clearGuestArrows) els.clearGuestArrows.hidden = role !== "host";
  }

  function parsedProjectDocument(text) {
    try {
      const documentValue = JSON.parse(text);
      if (!documentValue || documentValue.kind !== "shosai-stage-sketch" ||
          !documentValue.project || !Array.isArray(documentValue.project.scenes)) return null;
      return documentValue;
    } catch (_) {
      return null;
    }
  }

  function coordinate(piece, key) {
    const value = Number(piece && piece[key]);
    return Number.isFinite(value) ? value : 0;
  }

  function sendGuestDifferences() {
    if (role !== "guest" || applyingRemoteDocument || !socketIsOpen() || !lastReceivedDocument) return;
    let currentText;
    try { currentText = bridge.exportDocumentString(); }
    catch (_) { return; }
    const currentDocument = parsedProjectDocument(currentText);
    if (!currentDocument) return;

    const receivedScenes = new Map(lastReceivedDocument.project.scenes.map((scene) => [scene.id, scene]));
    currentDocument.project.scenes.forEach((currentScene) => {
      const receivedScene = receivedScenes.get(currentScene.id);
      if (!receivedScene) return;

      const receivedArrowIds = new Set((receivedScene.arrows || []).map((arrow) => arrow && arrow.id).filter(Boolean));
      (currentScene.arrows || []).forEach((arrow) => {
        if (!arrow || receivedArrowIds.has(arrow.id)) return;
        const signature = `${currentScene.id}\u001f${arrow.id || ""}\u001f${JSON.stringify(arrow)}`;
        if (sentArrowOps.has(signature)) return;
        if (sendMessage({
          t: "op",
          op: { kind: "arrows.add", sceneId: currentScene.id, arrows: [arrow] },
        })) sentArrowOps.add(signature);
      });

      const receivedPieces = new Map((receivedScene.pieces || []).map((piece) => [piece.id, piece]));
      (currentScene.pieces || []).forEach((piece) => {
        const receivedPiece = receivedPieces.get(piece.id);
        if (!receivedPiece) return;
        const u = coordinate(piece, "u");
        const v = coordinate(piece, "v");
        const base = coordinate(piece, "base");
        if (u === coordinate(receivedPiece, "u") &&
            v === coordinate(receivedPiece, "v") &&
            base === coordinate(receivedPiece, "base")) return;
        const signature = `${currentScene.id}\u001f${piece.id}\u001f${u}\u001f${v}\u001f${base}`;
        if (sentPieceOps.has(signature)) return;
        if (sendMessage({
          t: "op",
          op: { kind: "piece.move", sceneId: currentScene.id, pieceId: piece.id, u, v, base },
        })) sentPieceOps.add(signature);
      });
    });
  }

  function releaseRemoteApply(generation) {
    if (generation !== applyGeneration) return;
    applyingRemoteDocument = false;
    applyReleaseTimer = null;
    sendGuestDifferences();
  }

  function applyRemoteDocument(text) {
    const parsed = parsedProjectDocument(text);
    if (!parsed) {
      setStatus("共有内容を読み込めませんでした。", true);
      return false;
    }
    /* 上書き前に、まだ送っていない自分の変更（矢印・移動）を先に送り出す。
       これが無いと、ホストの更新と同時に操作したときゲストの変更が黙って消える
       （2026-08-20 照明の移動が反映されない不具合として実際に発生）。 */
    if (role === "guest" && !applyingRemoteDocument) sendGuestDifferences();
    applyingRemoteDocument = true;
    applyGeneration += 1;
    const generation = applyGeneration;
    clearTimeout(applyReleaseTimer);
    let applied = false;
    try { applied = bridge.applyDocumentString(text); }
    catch (_) { applied = false; }
    if (!applied) {
      applyingRemoteDocument = false;
      setStatus("共有内容を舞台へ反映できませんでした。", true);
      return false;
    }
    lastReceivedDocument = parsed;
    sentArrowOps.clear();
    sentPieceOps.clear();
    applyReleaseTimer = setTimeout(() => releaseRemoteApply(generation), 260);
    setStatus("ホストの共有内容を反映しました。");
    return true;
  }

  function sendHostDocument(force = false) {
    if (role !== "host" || !socketIsOpen()) return;
    let documentText;
    try { documentText = bridge.exportDocumentString(); }
    catch (_) {
      setStatus("共有する舞台データを作れませんでした。", true);
      return;
    }
    if (!force && documentText === lastSentDocument) return;
    if (sendMessage({ t: "doc", doc: documentText })) lastSentDocument = documentText;
  }

  function scheduleHostDocument() {
    if (role !== "host" || !socketIsOpen()) return;
    clearTimeout(hostSendTimer);
    hostSendTimer = setTimeout(() => {
      hostSendTimer = null;
      sendHostDocument(false);
    }, HOST_SEND_DEBOUNCE_MS);
  }

  /* 「いま操作中: ◯◯」の大きな表示。同時に動かして変更がぶつかるのを、
     互いの操作が見えるようにして避ける（2026-08-20 本人提案）。 */
  let activityBanner = null;
  let activityHideTimer = null;
  let lastActivitySentAt = 0;

  function sendActivity() {
    if (!socketIsOpen()) return;
    const now = Date.now();
    if (now - lastActivitySentAt < 1000) return;
    lastActivitySentAt = now;
    sendMessage({ t: "activity" });
  }

  function showActivity(from) {
    if (!from || typeof from.name !== "string") return;
    if (!activityBanner) {
      activityBanner = document.createElement("div");
      activityBanner.className = "stage-session-activity";
      activityBanner.setAttribute("role", "status");
      activityBanner.setAttribute("aria-live", "polite");
      const dot = document.createElement("span");
      dot.className = "stage-session-activity-dot";
      const text = document.createElement("span");
      text.className = "stage-session-activity-text";
      activityBanner.append(dot, text);
      document.body.append(activityBanner);
    }
    const color = typeof from.color === "string" ? from.color : "#d3ac59";
    activityBanner.querySelector(".stage-session-activity-dot").style.backgroundColor = color;
    activityBanner.style.setProperty("--stage-session-activity-color", color);
    activityBanner.querySelector(".stage-session-activity-text").textContent =
      `いま操作中: ${normalizeName(from.name, "参加者")}`;
    activityBanner.classList.add("is-visible");
    clearTimeout(activityHideTimer);
    activityHideTimer = setTimeout(() => {
      if (activityBanner) activityBanner.classList.remove("is-visible");
    }, 3000);
  }

  function onLocalChange() {
    if (applyingRemoteDocument) return;
    if (role) sendActivity();
    if (role === "host") scheduleHostDocument();
    else if (role === "guest") sendGuestDifferences();
  }

  window.SHOSAI_STAGE_SESSION_HOOKS = { onLocalChange };

  function pointerHost() {
    return els.planCanvas && els.planCanvas.parentElement;
  }

  function renderRemotePointer(message) {
    const from = message && message.from;
    if (!from || typeof from.clientId !== "string") return;
    if (message.view !== "top" || message.on !== true) {
      removeRemotePointer(from.clientId);
      return;
    }
    if (!Number.isFinite(message.x) || !Number.isFinite(message.y) ||
        message.x < 0 || message.x > 1 || message.y < 0 || message.y > 1) return;
    const host = pointerHost();
    if (!host) return;
    let entry = remotePointers.get(from.clientId);
    if (!entry) {
      const node = document.createElement("div");
      const label = document.createElement("span");
      node.className = "stage-session-pointer";
      node.setAttribute("aria-hidden", "true");
      node.append(label);
      host.append(node);
      entry = { node, label, timer: null };
      remotePointers.set(from.clientId, entry);
    }
    const color = typeof from.color === "string" ? from.color : "#d3ac59";
    entry.node.style.left = `${message.x * 100}%`;
    entry.node.style.top = `${message.y * 100}%`;
    entry.node.style.backgroundColor = color;
    entry.node.style.setProperty("--stage-session-pointer-color", color);
    entry.label.textContent = normalizeName(from.name, "ゲスト");
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => removeRemotePointer(from.clientId), POINTER_TTL_MS);
  }

  function handleWelcome(message) {
    reconnectAttempts = 0;
    reconnectAllowed = true;
    if (els.reconnect) els.reconnect.hidden = true;
    renderParticipants(message.participants);
    updateRoleUi();
    if (role === "guest") {
      document.body.classList.add("stage-session-guest");
      if (typeof message.doc === "string") applyRemoteDocument(message.doc);
      else setStatus("接続しました。ホストからの共有を待っています。");
    } else {
      setStatus("ホストとして接続しました。");
    }
  }

  function handleSocketMessage(event) {
    if (typeof event.data !== "string") return;
    let message;
    try { message = JSON.parse(event.data); } catch (_) { return; }
    if (!message || typeof message !== "object") return;
    if (message.t === "welcome") {
      handleWelcome(message);
    } else if (message.t === "doc" && role === "guest" && typeof message.doc === "string") {
      applyRemoteDocument(message.doc);
    } else if (message.t === "op" && role === "host") {
      try { bridge.applyGuestOp(message.op); } catch (_) { /* 不正なopは無視する */ }
    } else if (message.t === "activity") {
      showActivity(message.from);
    } else if (message.t === "pointer") {
      renderRemotePointer(message);
    } else if (message.t === "presence") {
      renderParticipants(message.participants);
    } else if (message.t === "full") {
      reconnectAllowed = false;
      setStatus("このセッションは満員です。", true);
      if (els.reconnect) els.reconnect.hidden = false;
    } else if (message.t === "bad-key") {
      reconnectAllowed = false;
      setStatus("ホスト用の接続情報が一致しません。", true);
      if (els.reconnect) els.reconnect.hidden = false;
    } else if (message.t === "denied") {
      const reason = message.reason === "no-host" ? "ホストが接続していません。" : "この操作は共有できません。";
      setStatus(reason, true);
    }
  }

  function scheduleReconnect() {
    if (!role || !reconnectAllowed) return;
    if (reconnectAttempts >= RECONNECT_LIMIT) {
      setStatus("切断しました。再接続してください。", true);
      if (els.reconnect) els.reconnect.hidden = false;
      return;
    }
    reconnectAttempts += 1;
    setStatus(`切断しました。3秒後に再接続します（${reconnectAttempts}/${RECONNECT_LIMIT}）。`, true);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectSocket, RECONNECT_DELAY_MS);
  }

  function handleSocketClose(ws) {
    if (socket !== ws) return;
    socket = null;
    clearTimeout(hostSendTimer);
    hostSendTimer = null;
    clearRemotePointers();
    if (!reconnectAllowed) {
      if (els.reconnect) els.reconnect.hidden = false;
      return;
    }
    scheduleReconnect();
  }

  function connectSocket() {
    if (!role || !roomId) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (els.reconnect) els.reconnect.hidden = true;
    setStatus(reconnectAttempts ? "再接続しています…" : "接続しています…");
    let ws;
    try { ws = new WebSocket(sessionSocketUrl()); }
    catch (_) {
      socket = null;
      scheduleReconnect();
      return;
    }
    socket = ws;
    ws.addEventListener("open", () => {
      if (socket !== ws) return;
      if (role === "host") sendHostDocument(true);
      else setStatus("接続しました。共有内容を待っています…");
    });
    ws.addEventListener("message", (event) => {
      if (socket === ws) handleSocketMessage(event);
    });
    ws.addEventListener("error", () => {
      if (socket === ws) setStatus("接続エラーが発生しました。", true);
    });
    ws.addEventListener("close", () => handleSocketClose(ws));
  }

  function closeGuestNameModal() {
    const backdrop = $("stage-session-name-backdrop");
    const modal = $("stage-session-name-modal");
    if (backdrop) backdrop.remove();
    if (modal) modal.remove();
  }

  function showGuestNameModal(invitedRoom) {
    closeGuestNameModal();
    const backdrop = document.createElement("div");
    backdrop.className = "stage-modal-backdrop";
    backdrop.id = "stage-session-name-backdrop";
    const modal = document.createElement("div");
    modal.className = "stage-modal stage-session-name-modal";
    modal.id = "stage-session-name-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "stage-session-name-title");
    modal.innerHTML = `
      <header class="stage-modal-head">
        <h2 id="stage-session-name-title">共有セッションへ参加</h2>
        <button type="button" class="stage-modal-close" id="stage-session-name-close" aria-label="閉じる">✕</button>
      </header>
      <div class="stage-modal-body">
        <form class="stage-session-name-form" id="stage-session-name-form">
          <label class="stage-session-field" for="stage-session-name-input">
            <span>表示名</span>
            <input type="text" id="stage-session-name-input" maxlength="50" autocomplete="name" required>
          </label>
          <button type="submit" class="stage-minor-action" id="stage-session-join">参加する</button>
        </form>
      </div>`;
    document.body.append(backdrop, modal);
    const input = $("stage-session-name-input");
    const form = $("stage-session-name-form");
    const cancel = () => {
      closeGuestNameModal();
      setStatus("参加を中止しました。");
    };
    $("stage-session-name-close").addEventListener("click", cancel);
    backdrop.addEventListener("click", cancel);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = normalizeName(input.value, "ゲスト");
      let shelved = false;
      try { shelved = bridge.shelveNow() !== false; }
      catch (_) { shelved = false; }
      if (!shelved) {
        setStatus("現在の作業を退避できなかったため、参加を止めました。ショーを書き出すか、使っていないショーを整理してから、もう一度お試しください。", true);
        return;
      }
      rememberName(name);
      role = "guest";
      roomId = invitedRoom;
      displayName = name;
      reconnectAttempts = 0;
      reconnectAllowed = true;
      document.body.classList.add("stage-session-guest");
      closeGuestNameModal();
      updateRoleUi();
      connectSocket();
    });
    input.value = readStoredName("");
    setTimeout(() => input.focus(), 0);
  }

  async function startHostSession() {
    if (role) return;
    const name = normalizeName(els.hostName && els.hostName.value, "ホスト");
    if (els.hostName) els.hostName.value = name;
    rememberName(name);
    els.start.disabled = true;
    setStatus("セッションを準備しています…");
    try {
      const response = await fetch("session/new", { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result || typeof result.roomId !== "string" || typeof result.hostKey !== "string") {
        throw new Error("ルーム情報がありません");
      }
      role = "host";
      roomId = result.roomId;
      hostKey = result.hostKey;
      displayName = name;
      reconnectAttempts = 0;
      reconnectAllowed = true;
      const inviteUrl = `${location.origin}${location.pathname}#session=${roomId}`;
      if (els.url) els.url.value = inviteUrl;
      updateRoleUi();
      connectSocket();
    } catch (error) {
      role = "";
      roomId = "";
      hostKey = "";
      els.start.disabled = false;
      setStatus(`セッションを開始できませんでした（${error && error.message ? error.message : "不明なエラー"}）。`, true);
    }
  }

  async function copyInviteUrl() {
    if (!els.url || !els.url.value) return;
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(els.url.value);
      setStatus("招待URLをコピーしました。");
    } catch (_) {
      els.url.focus();
      els.url.select();
      els.url.setSelectionRange(0, els.url.value.length);
      setStatus("コピーできなかったため、招待URLを選択しました。");
    }
  }

  function reconnectNow() {
    reconnectAllowed = true;
    reconnectAttempts = 0;
    connectSocket();
  }

  let lastPointerSentAt = 0;
  let lastPointerPosition = { x: 0, y: 0 };
  function sendPointer(on, x = lastPointerPosition.x, y = lastPointerPosition.y) {
    if (!role || !socketIsOpen()) return;
    lastPointerPosition = { x, y };
    sendMessage({ t: "pointer", view: "top", x, y, on });
  }

  function handlePointerMove(event) {
    if (!els.planCanvas || !role || !socketIsOpen()) return;
    const now = performance.now();
    if (now - lastPointerSentAt < POINTER_THROTTLE_MS) return;
    const rect = els.planCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    lastPointerSentAt = now;
    sendPointer(true, x, y);
  }

  els.start.addEventListener("click", startHostSession);
  if (els.copy) els.copy.addEventListener("click", copyInviteUrl);
  if (els.reconnect) els.reconnect.addEventListener("click", reconnectNow);
  if (els.clearGuestArrows) {
    els.clearGuestArrows.addEventListener("click", () => {
      if (role !== "host") return;
      try { bridge.clearGuestArrows(); } catch (_) { setStatus("ゲスト注釈を消去できませんでした。", true); }
    });
  }
  if (els.planCanvas) {
    const host = pointerHost();
    if (host && getComputedStyle(host).position === "static") host.style.position = "relative";
    els.planCanvas.addEventListener("pointermove", handlePointerMove);
    els.planCanvas.addEventListener("pointerleave", () => sendPointer(false));
    els.planCanvas.addEventListener("pointercancel", () => sendPointer(false));
  }

  if (els.hostName) els.hostName.value = readStoredName("ホスト");
  setJapaneseLabels();
  renderParticipants([]);
  setStatus("未接続です。");
  try { els.panel.dataset.sessionLanguage = bridge.isEnglish() ? "en" : "ja"; } catch (_) { /* v2用 */ }
  const invitedRoom = invitedRoomId();
  if (invitedRoom) {
    revealStageView();
    els.panel.open = true;
    setStatus("表示名を入力して参加してください。");
    showGuestNameModal(invitedRoom);
  }
})();
