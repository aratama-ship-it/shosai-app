/* 制作の書斎 — 名簿（スカウティングレポート）
 *
 * データは同一オリジンの scouting-report-app が配信する data.enc をそのまま読む。
 * 書斎側にコピーを置かないので、週次タスクでシートが更新されればこちらにも反映される。
 *
 * 重要: 名簿は実在の演者の氏名・写真・SNS・調査結果を含む。防御は「画面を隠すこと」では
 * なく暗号化そのものである（AES-256-GCM / PBKDF2-SHA256）。合言葉を知らなければ
 * data.enc を直接落としても読めない。したがって復号した中身は決してDOMへ残したまま
 * 共有スナップショットへ流さない。
 *
 * 合言葉の端末保存キーはスカウトアプリと共有する（同一オリジン）。どちらかで解錠すれば
 * もう一方も開く。この共有があるため、書斎アプリへ外部スクリプトを持ち込まない。
 */
(() => {
  "use strict";

  const DATA_URL = "https://aratama-ship-it.github.io/scouting-report-app/data/data.enc";
  const APP_URL = "https://aratama-ship-it.github.io/scouting-report-app/";
  const PASS_KEY = "scout_pass";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    status: "locked", // locked | loading | ready | error
    message: "",
    performers: [],
    generatedAt: "",
    rosterDate: "",
    query: "",
    base: "",
    sort: "sheet",
    selected: null,
  };

  // ---------- 復号（scouting-webapp/site/crypto.js と同じ封筒形式） ----------

  const unb64 = (s) => {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  async function decryptEnvelope(passphrase, envelope) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey(
      "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: unb64(envelope.salt), iterations: envelope.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(envelope.iv) }, key, unb64(envelope.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  // ---------- 表示の安全 ----------

  // 名簿の値はWeb調査由来の文字列を含む。HTMLとして解釈させない。
  const setText = (el, value) => { el.textContent = value == null ? "" : String(value); };

  // javascript: 等を弾く。SNSはハンドルだけの登録もあるため、その場合はURLを組み立てる。
  function externalUrl(value, kind) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[@a-z0-9._-]+$/i.test(raw)) {
      const handle = raw.replace(/^@/, "");
      if (kind === "instagram") return "https://www.instagram.com/" + encodeURIComponent(handle) + "/";
      if (kind === "youtube") return "https://www.youtube.com/@" + encodeURIComponent(handle);
    }
    return null;
  }

  const isSafePhoto = (v) => typeof v === "string" && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v);

  // ---------- 一覧の絞り込みと並び ----------

  const SORTS = [
    { id: "sheet", label: "登録順" },
    { id: "name", label: "名前順" },
    { id: "base", label: "カテゴリ順" },
    { id: "size", label: "人数の多い順" },
    { id: "detail", label: "情報の多い順" },
  ];

  const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

  const sizeOf = (p) => {
    const n = parseInt(String(p.size || "").replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  // 「情報の多い順」は、名簿として使える状態に近い順。紹介文＞写真＞連絡先＞SNS。
  const detailScore = (p) =>
    (p.bio && p.bio.fact ? 4 : 0) + (isSafePhoto(p.photo) ? 3 : 0) +
    (p.contact ? 2 : 0) + (p.instagram || p.youtube ? 1 : 0);

  function bases() {
    const seen = new Map();
    state.performers.forEach((p) => {
      const key = String(p.base || "").trim() || "未分類";
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    return Array.from(seen, ([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    const rows = state.performers.filter((p) => {
      if (state.base) {
        const b = String(p.base || "").trim() || "未分類";
        if (b !== state.base) return false;
      }
      if (!q) return true;
      return [p.name, p.base, p.skills, p.note, p.instagram, p.youtube, p.bio && p.bio.fact]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
    const sorted = rows.slice();
    if (state.sort === "name") sorted.sort((a, b) => collator.compare(a.name || "", b.name || ""));
    else if (state.sort === "base") sorted.sort((a, b) =>
      collator.compare(a.base || "", b.base || "") || collator.compare(a.name || "", b.name || ""));
    else if (state.sort === "size") sorted.sort((a, b) =>
      sizeOf(b) - sizeOf(a) || collator.compare(a.name || "", b.name || ""));
    else if (state.sort === "detail") sorted.sort((a, b) =>
      detailScore(b) - detailScore(a) || collator.compare(a.name || "", b.name || ""));
    return sorted;
  }

  // ---------- 描画 ----------

  function renderGate() {
    const gate = $("#roster-gate");
    const workspace = $("#roster-workspace");
    if (!gate || !workspace) return;
    const open = state.status === "ready";
    gate.hidden = open;
    workspace.hidden = !open;
    const note = $("#roster-gate-note");
    if (note) setText(note, state.message);
    note && note.classList.toggle("is-error", state.status === "error");
    const btn = $("#roster-unlock");
    if (btn) {
      btn.disabled = state.status === "loading";
      btn.textContent = state.status === "loading" ? "解錠しています…" : "名簿を開く";
    }
  }

  function renderList() {
    const list = $("#roster-list");
    const count = $("#roster-count");
    if (!list) return;
    const rows = filtered();
    if (count) {
      setText(count, `${state.performers.length}組中 ${rows.length}組 ・ 名簿 ${state.rosterDate || "日付不明"} 時点`);
    }
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "evidence-empty";
      setText(empty, "この条件に合う人はいません。");
      list.append(empty);
      return;
    }
    rows.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "roster-row" + (state.selected === p ? " selected" : "");
      const idx = document.createElement("span");
      idx.className = "roster-row-index";
      setText(idx, String(i + 1).padStart(2, "0"));
      const body = document.createElement("span");
      const name = document.createElement("span");
      name.className = "roster-row-name";
      setText(name, p.name || "（名前未登録）");
      const meta = document.createElement("span");
      meta.className = "roster-row-meta";
      const bits = [p.base, p.size ? `${p.size}人` : "", p.skills].filter(Boolean);
      setText(meta, bits.join(" ・ "));
      body.append(name, meta);
      btn.append(idx, body);
      btn.addEventListener("click", () => select(p));
      list.append(btn);
    });
  }

  function field(label, value) {
    const wrap = document.createElement("div");
    wrap.className = "roster-field";
    const h = document.createElement("p");
    h.className = "roster-field-label";
    setText(h, label);
    const v = document.createElement("p");
    v.className = "roster-field-value";
    setText(v, value);
    wrap.append(h, v);
    return wrap;
  }

  function renderDetail() {
    const pane = $("#roster-detail");
    if (!pane) return;
    pane.replaceChildren();
    const p = state.selected;
    if (!p) {
      const empty = document.createElement("p");
      empty.className = "evidence-empty";
      setText(empty, "一覧から選ぶと、登録内容と調べた紹介文がここに出ます。");
      pane.append(empty);
      return;
    }

    const card = document.createElement("article");
    card.className = "roster-card";

    const head = document.createElement("header");
    head.className = "roster-card-head";
    if (isSafePhoto(p.photo)) {
      const img = document.createElement("img");
      img.className = "roster-photo";
      img.src = p.photo;
      img.alt = "";
      img.loading = "lazy";
      head.append(img);
    }
    const title = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "roster-kicker";
    setText(kicker, "ROSTER");
    const h2 = document.createElement("h2");
    setText(h2, p.name || "（名前未登録）");
    const meta = document.createElement("p");
    meta.className = "roster-card-meta";
    setText(meta, [p.base, p.size ? `${p.size}人` : ""].filter(Boolean).join(" ・ "));
    title.append(kicker, h2, meta);
    head.append(title);
    card.append(head);

    /* 舞台スケッチへの結線。名簿は読み取り専用のまま、
       「キャスト候補」の受け渡しだけを橋（localStorage）越しに行う。
       舞台スケッチを開いた瞬間に、候補がキャストへ追加される。 */
    const sendRow = document.createElement("div");
    sendRow.className = "seed-actions";
    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "btn-quiet";
    sendBtn.textContent = "舞台スケッチのキャスト候補へ送る";
    sendBtn.addEventListener("click", () => {
      const KEY = "shosai-cast-handoff-v1";
      let list = [];
      try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (_) { list = []; }
      if (!Array.isArray(list)) list = [];
      const name = (p.name || "").trim();
      if (!name) return;
      if (!list.some((x) => x && x.name === name)) list.push({ name });
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) { /* 保存不可 */ }
      sendBtn.textContent = "送りました（舞台スケッチを開くと追加されます）";
      sendBtn.disabled = true;
    });
    sendRow.append(sendBtn);
    card.append(sendRow);

    const grid = document.createElement("div");
    grid.className = "roster-fields";
    if (p.skills) grid.append(field("スキル", p.skills));
    if (p.note) grid.append(field("備考", p.note));
    if (p.contact) grid.append(field("連絡先", p.contact));
    if (grid.childElementCount) card.append(grid);

    const links = [
      ["Instagram", externalUrl(p.instagram, "instagram")],
      ["YouTube", externalUrl(p.youtube, "youtube")],
    ].filter(([, url]) => url);
    if (links.length) {
      const box = document.createElement("div");
      box.className = "roster-links";
      links.forEach(([label, url]) => {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        setText(a, label + " ↗");
        box.append(a);
      });
      card.append(box);
    }

    if (p.bio && p.bio.fact) {
      const bio = document.createElement("section");
      bio.className = "roster-bio";
      const label = document.createElement("p");
      label.className = "roster-field-label";
      setText(label, "調べて確認したこと");
      const fact = document.createElement("p");
      fact.className = "roster-bio-fact";
      setText(fact, p.bio.fact);
      bio.append(label, fact);
      const foot = document.createElement("p");
      foot.className = "roster-bio-foot";
      const conf = String(p.bio.confidence || "").toLowerCase();
      const confLabel = conf === "high" ? "確度 高" : conf === "medium" ? "確度 中" : conf === "low" ? "確度 低" : "";
      const src = externalUrl(p.bio.source);
      if (src) {
        const a = document.createElement("a");
        a.href = src;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        setText(a, (p.bio.sourceLabel || "出典") + " ↗");
        foot.append(a);
      } else if (p.bio.sourceLabel) {
        const span = document.createElement("span");
        setText(span, p.bio.sourceLabel);
        foot.append(span);
      }
      if (confLabel) {
        const badge = document.createElement("span");
        badge.className = "roster-confidence";
        setText(badge, confLabel);
        foot.append(badge);
      }
      if (foot.childElementCount) bio.append(foot);
      if (p.bio.caveat) {
        const caveat = document.createElement("p");
        caveat.className = "roster-caveat";
        setText(caveat, p.bio.caveat);
        bio.append(caveat);
      }
      card.append(bio);
    }

    pane.append(card);
  }

  function renderBases() {
    const box = $("#roster-bases");
    if (!box) return;
    box.replaceChildren();
    const all = document.createElement("button");
    all.type = "button";
    all.className = "roster-base";
    all.setAttribute("aria-pressed", state.base === "" ? "true" : "false");
    const allLabel = document.createElement("span");
    setText(allLabel, "すべて");
    const allCount = document.createElement("span");
    allCount.className = "roster-base-count";
    setText(allCount, `${state.performers.length}組`);
    all.append(allLabel, allCount);
    all.addEventListener("click", () => { state.base = ""; renderBases(); renderList(); });
    box.append(all);
    bases().forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "roster-base";
      btn.setAttribute("aria-pressed", state.base === b.label ? "true" : "false");
      const label = document.createElement("span");
      setText(label, b.label);
      const count = document.createElement("span");
      count.className = "roster-base-count";
      setText(count, `${b.count}組`);
      btn.append(label, count);
      btn.addEventListener("click", () => { state.base = b.label; renderBases(); renderList(); });
      box.append(btn);
    });
  }

  function select(p) {
    state.selected = p;
    renderList();
    renderDetail();
  }

  function renderAll() {
    renderGate();
    if (state.status === "ready") {
      renderBases();
      renderList();
      renderDetail();
      const stamp = $("#roster-stamp");
      if (stamp) {
        const gen = state.generatedAt ? state.generatedAt.slice(0, 10) : "";
        setText(stamp, gen ? `データ生成 ${gen} ・ スカウティングレポートから読み取り` : "スカウティングレポートから読み取り");
      }
    }
  }

  // ---------- 解錠 ----------

  async function unlock(passphrase, { silent = false } = {}) {
    if (!passphrase) return false;
    if (!window.isSecureContext || !crypto.subtle) {
      state.status = "error";
      state.message = "この開き方では名簿を復号できません。公開URL（https）から開いてください。";
      renderGate();
      return false;
    }
    state.status = "loading";
    state.message = "名簿を読み込んでいます…";
    renderGate();
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("fetch " + res.status);
      const envelope = await res.json();
      const payload = await decryptEnvelope(passphrase, envelope);
      const roster = payload.roster || {};
      state.performers = Array.isArray(roster.performers) ? roster.performers : [];
      state.rosterDate = roster.date || "";
      state.generatedAt = payload.generatedAt || "";
      state.status = "ready";
      state.message = "";
      state.selected = null;
      try { localStorage.setItem(PASS_KEY, passphrase); } catch (e) { /* 保存できなくても続行 */ }
      renderAll();
      return true;
    } catch (err) {
      state.status = silent ? "locked" : "error";
      state.message = silent ? ""
        : /fetch/.test(String(err && err.message))
          ? "名簿データを取得できませんでした。通信状況を確認してください。"
          : "合言葉が違うようです。もう一度お試しください。";
      if (!silent) { try { localStorage.removeItem(PASS_KEY); } catch (e) { /* noop */ } }
      renderGate();
      return false;
    }
  }

  // ---------- 初期化 ----------

  function init() {
    const view = $("#view-roster");
    if (!view) return;

    const form = $("#roster-gate-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $("#roster-pass");
        unlock(input ? input.value : "");
        if (input) input.value = "";
      });
    }

    const search = $("#roster-search");
    if (search) {
      search.addEventListener("input", () => { state.query = search.value; renderList(); });
    }

    const sortSel = $("#roster-sort");
    if (sortSel) {
      SORTS.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        setText(opt, s.label);
        sortSel.append(opt);
      });
      sortSel.value = state.sort;
      sortSel.addEventListener("change", () => { state.sort = sortSel.value; renderList(); });
    }

    const link = $("#roster-app-link");
    if (link) link.href = APP_URL;

    renderGate();

    // 同一オリジンのスカウトアプリで解錠済みなら、そのまま開く。
    // 失敗しても合言葉を消さない（別アプリの解錠状態を壊さないため silent で試す）。
    let saved = null;
    try { saved = localStorage.getItem(PASS_KEY); } catch (e) { saved = null; }
    if (saved && location.protocol === "https:") unlock(saved, { silent: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
