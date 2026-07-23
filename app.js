/* 制作の書斎 — Phase 0 プロトタイプ
   触れるのは画面遷移・資料を置く・根拠を開く・画像比較・判断の記録（メモリ上のみ）。
   検索・AI・保存・共有は未実装。 */

(function () {
  "use strict";

  // ---------- 状態（Phase 0: メモリ上のみ・保存されない） ----------
  const state = {
    project: null,        // 現在開いているプロジェクト
    placed: new Set(),    // 置いたリファレンスID
    decisions: {},        // visualId -> { verdict, reason }
    evidenceRef: null,    // 根拠パネルに出しているリファレンスID
  };

  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  // ---------- ダミー画像（習作スケッチ風のSVG） ----------
  const P = "#efe7d6", INK = "#33302a", RUST = "#a84b26", BRASS = "#9c823f", DARK = "#221d18";

  function svgA(tilt) {
    // 人物と物の関係: 糸の張力で引かれる身体
    const lean = tilt || 14;
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="習作A: 糸に引かれる人物とディアボロ">
      <rect width="400" height="300" fill="${P}"/>
      <line x1="24" y1="236" x2="376" y2="236" stroke="${INK}" stroke-width="2.5"/>
      <g transform="rotate(${lean} 268 160)">
        <circle cx="268" cy="92" r="15" fill="none" stroke="${INK}" stroke-width="5"/>
        <path d="M268 108 C 266 140, 262 168, 256 204" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        <path d="M256 204 L 244 236 M256 204 L 274 236" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
        <path d="M264 126 L 208 150" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      </g>
      <path d="M118 214 L 132 228 L 104 228 Z" fill="${INK}"/>
      <path d="M118 242 L 132 228 L 104 228 Z" fill="none" stroke="${INK}" stroke-width="3"/>
      <line x1="120" y1="226" x2="206" y2="151" stroke="${RUST}" stroke-width="2.5"/>
      <line x1="158" y1="182" x2="166" y2="190" stroke="${RUST}" stroke-width="2"/>
      <line x1="168" y1="173" x2="176" y2="181" stroke="${RUST}" stroke-width="2"/>
      <path d="M40 62 h56 M40 74 h38" stroke="${INK}" stroke-width="2" opacity="0.35"/>
    </svg>`;
  }

  function svgB() {
    // 光と空間: 局所光の中の物、半影の人物
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="習作B: 机上の局所光に照らされたディアボロ">
      <rect width="400" height="300" fill="${DARK}"/>
      <polygon points="252,0 148,246 356,246" fill="${P}" opacity="0.12"/>
      <polygon points="252,0 188,246 316,246" fill="${P}" opacity="0.16"/>
      <line x1="30" y1="246" x2="370" y2="246" stroke="${P}" stroke-width="1.5" opacity="0.5"/>
      <path d="M252 210 L 268 230 L 236 230 Z" fill="${P}"/>
      <path d="M252 250 L 268 230 L 236 230 Z" fill="none" stroke="${P}" stroke-width="2.5"/>
      <path d="M96 96 C 100 140, 96 190, 90 246" fill="none" stroke="${P}" stroke-width="6" stroke-linecap="round" opacity="0.2"/>
      <circle cx="99" cy="78" r="13" fill="none" stroke="${P}" stroke-width="4" opacity="0.2"/>
      <line x1="110" y1="120" x2="234" y2="226" stroke="${RUST}" stroke-width="1.8" opacity="0.85"/>
    </svg>`;
  }

  function svgC() {
    // 観客の視点: 記録装置のフレーム越しに見る場面
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="習作C: 記録装置のフレーム越しに見た机の場面">
      <rect width="400" height="300" fill="${P}"/>
      <rect x="26" y="24" width="348" height="252" fill="none" stroke="${INK}" stroke-width="2"/>
      <path d="M26 46 h18 M26 24 v18 M374 46 h-18 M374 24 v18 M26 254 h18 M26 276 v-18 M374 254 h-18 M374 276 v-18" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="52" cy="52" r="4" fill="${RUST}"/>
      <rect x="92" y="84" width="216" height="140" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <line x1="104" y1="196" x2="296" y2="196" stroke="${INK}" stroke-width="1.8"/>
      <path d="M232 178 L 240 188 L 224 188 Z" fill="${INK}"/>
      <path d="M232 196 L 240 188 L 224 188 Z" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <circle cx="164" cy="128" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <path d="M164 136 C 163 152, 161 166, 158 182 M158 182 L 152 196 M158 182 L 166 196 M163 146 L 186 158" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <line x1="188" y1="158" x2="228" y2="184" stroke="${RUST}" stroke-width="1.5"/>
      <line x1="200" y1="150" x2="200" y2="158" stroke="${BRASS}" stroke-width="1.5"/>
      <line x1="196" y1="154" x2="204" y2="154" stroke="${BRASS}" stroke-width="1.5"/>
    </svg>`;
  }

  const ART = {
    svgA: () => svgA(14),
    svgA2: () => svgA(26),
    svgB,
    svgC,
  };

  // ---------- 種火（0→1の配り） ----------
  // 配りは 近い3 / 少し遠い2 / 異物2 の計7枚。得意な方向だけに寄らないよう異物枠は必ず残す。
  const seedState = {
    dealt: [],      // いま机に配られている種火
    kept: [],       // 拾った種火（紙側へ移る）
    discarded: new Set(), // このセッション中に流した種火（再配しない）
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function dealSeeds() {
    const pool = (dist) =>
      shuffle(SHOSAI.seeds.filter(
        (s) => s.dist === dist && !seedState.discarded.has(s.text) &&
               !seedState.kept.some((k) => k.text === s.text)));
    const near = pool("near").slice(0, 3);
    const mid = pool("mid").slice(0, 2);
    const alien = pool("alien").slice(0, 2);
    seedState.dealt = shuffle(near.concat(mid, alien));
    renderSeeds();
  }

  function renderSeeds() {
    const wrap = $("#seed-dealt");
    const keptWrap = $("#seed-kept");
    const dealBtn = $("#btn-deal");

    dealBtn.textContent = seedState.dealt.length ? "配り直す" : "種火を7枚配る";

    wrap.innerHTML = seedState.dealt.length
      ? seedState.dealt
          .map(
            (s, i) => `
            <article class="seed-card">
              <p class="seed-recipe">${esc(s.recipe)}</p>
              <p class="seed-text">${esc(s.text)}</p>
              <div class="seed-actions">
                <button type="button" class="seed-keep" data-keep="${i}">拾う</button>
                <button type="button" class="seed-pass" data-pass="${i}">流す</button>
              </div>
            </article>`)
          .join("")
      : `<p class="seed-empty">まだ配られていません。0→1はここに任せて、拾う・育てるに集中します。</p>`;

    keptWrap.innerHTML = seedState.kept.length
      ? `<p class="rail-heading">拾った種火</p>` +
        seedState.kept
          .map(
            (s, i) => `
            <div class="seed-chip">
              <p class="seed-chip-text">${esc(s.text)}</p>
              <div class="seed-actions">
                <button type="button" class="seed-start" data-start="${i}">机に置いて始める</button>
                <button type="button" class="seed-return" data-return="${i}">戻す</button>
              </div>
            </div>`)
          .join("")
      : "";

    $$("[data-keep]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        const s = seedState.dealt.splice(Number(b.dataset.keep), 1)[0];
        seedState.kept.push(s);
        renderSeeds();
      }));
    $$("[data-pass]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        const s = seedState.dealt.splice(Number(b.dataset.pass), 1)[0];
        seedState.discarded.add(s.text);
        renderSeeds();
      }));
    $$("[data-start]", keptWrap).forEach((b) =>
      b.addEventListener("click", () => {
        const s = seedState.kept[Number(b.dataset.start)];
        openProject(buildNewProject(s.text));
      }));
    $$("[data-return]", keptWrap).forEach((b) =>
      b.addEventListener("click", () => {
        seedState.kept.splice(Number(b.dataset.return), 1);
        renderSeeds();
      }));
  }

  // ---------- 場面問答（判断のエクササイズ） ----------
  // 先に自分で答える → 匿名の解法 → 条件 → 出典 の順で開く。採点しない。
  const mondoState = {
    index: 0,
    revealed: false,
    answers: {},   // fieldKey -> text（現在の問のみ・保存されない）
  };

  const MONDO_FIELDS = [
    ["first", "最初に何をするか"],
    ["feel", "観客に何を感じさせたいか"],
    ["means", "どの手段・時間の変化で実現するか"],
    ["cost", "何を諦めるか・何が危険か"],
  ];

  function mondoAnswerText() {
    return MONDO_FIELDS
      .map(([k]) => (mondoState.answers[k] || "").trim())
      .filter(Boolean)
      .join("。");
  }

  function renderMondo() {
    const q = SHOSAI.mondo[mondoState.index];
    const wrap = $("#mondo-body");
    const answered = mondoAnswerText().length > 0;

    const solutionCards = q.solutions
      .map((s, i) => {
        const src = s.source;
        const sourceLine = src.work
          ? [src.work, src.company, src.year].filter((item) => item != null && item !== "").map(esc).join(" ・ ")
          : "（特定作品に帰属しない）";
        const sourceWork = src.workId
          ? `<a class="mondo-source-work" href="#db/${encodeURIComponent(src.workId)}">${sourceLine}<span>資料棚で読む →</span></a>`
          : `<span>${sourceLine}</span>`;
        return `
        <article class="mondo-sol" data-sol="${i}">
          <p class="mondo-sol-label">参照実例 ${i + 1}</p>
          <div class="mondo-sol-rows">
            <div class="vm"><b>優先した効果</b><span>${esc(s.effect)}</span></div>
            <div class="vm"><b>仕組み</b><span>${esc(s.mechanism)}</span></div>
            <div class="vm"><b>代償</b><span>${esc(s.cost)}</span></div>
          </div>
          <div class="mondo-sol-more" data-stage="cond" hidden>
            <div class="vm"><b>成立条件</b><span>${esc(s.conditions)}</span></div>
          </div>
          <div class="mondo-sol-more" data-stage="src" hidden>
            <div class="vm"><b>出典</b>${sourceWork}</div>
            <div class="vm"><b>注記</b><span>${esc(src.note)}</span></div>
            <div class="vm"><b>確信度</b><span>${esc(src.confidence)}</span></div>
            ${src.reconstructed ? `<p class="mondo-recon">※ 資料を基に再構成した出題（因果は推測を含む）</p>` : `<p class="mondo-recon ok">確認済みの実例</p>`}
          </div>
          <div class="seed-actions">
            <button type="button" class="link-btn" data-open-cond="${i}">条件を見る</button>
            <button type="button" class="link-btn" data-open-src="${i}">出典を開く</button>
          </div>
        </article>`;
      })
      .join("");

    wrap.innerHTML = `
      <nav class="mondo-map" aria-label="場面問答を選ぶ">
        ${SHOSAI.mondo.map((item, index) => `
          <button type="button" data-mondo-index="${index}" aria-pressed="${index === mondoState.index}"
                  title="${esc(item.title)}">${String(index + 1).padStart(2, "0")}</button>`).join("")}
      </nav>
      <article class="mondo-q">
        <p class="mondo-type">${esc(q.type)} ・ 第${mondoState.index + 1}問／${SHOSAI.mondo.length}問</p>
        <h3 class="mondo-title">${esc(q.title)}</h3>
        <p class="mondo-situation">${esc(q.situation)}</p>
        <div class="constraints">
          ${q.hard.map((h) => `<span class="chip-dark hard">${esc(h)}<span class="k">固定</span></span>`).join("")}
          <span class="chip-dark conflict">${esc(q.conflict)}<span class="k">衝突</span></span>
        </div>
        ${q.basis ? `<p class="mondo-basis"><span>比較の根拠</span>${esc(q.basis)}</p>` : ""}
        <p class="mondo-assumption">出題用仮定: ${esc(q.assumption)}</p>
      </article>

      <div class="mondo-answer">
        <p class="mondo-answer-label">自分の答え — 一行でも書けば実例を開けます</p>
        ${MONDO_FIELDS.map(
          ([k, label]) => `
          <label class="mondo-field">
            <span>${esc(label)}</span>
            <textarea rows="1" data-mf="${k}">${esc(mondoState.answers[k] || "")}</textarea>
          </label>`).join("")}
        <div class="seed-actions">
          <button type="button" class="seed-keep" id="mondo-reveal" ${answered ? "" : "disabled"}>参照実例と照らす</button>
          <button type="button" class="seed-pass" id="mondo-next">次の問答へ</button>
        </div>
      </div>

      <div class="mondo-reveal" ${mondoState.revealed ? "" : "hidden"}>
        <div class="mondo-sols">${solutionCards}</div>
        <div class="mondo-compare">
          <p class="mondo-answer-label">照合 — 採点ではなく、判断軸の差を言葉にする</p>
          <label class="mondo-field"><span>自分と実例は、どの軸が違うか（一行）</span><textarea rows="1" data-mf="axis"></textarea></label>
          <label class="mondo-field"><span>実例にない、自分の案の部分</span><textarea rows="1" data-mf="mine"></textarea></label>
          <div class="seed-actions">
            <button type="button" class="seed-keep" id="mondo-to-seed">この答えを種火として拾う</button>
          </div>
          <p class="save-note-dark">Phase 0: 問答はこの画面の間だけ保持され、保存されません。</p>
        </div>
      </div>`;

    $$("[data-mf]", wrap).forEach((t) =>
      t.addEventListener("input", (e) => {
        mondoState.answers[e.target.dataset.mf] = e.target.value;
        const btn = $("#mondo-reveal");
        if (btn) btn.disabled = mondoAnswerText().length === 0;
      }));

    const revealBtn = $("#mondo-reveal");
    if (revealBtn)
      revealBtn.addEventListener("click", () => {
        mondoState.revealed = true;
        $(".mondo-reveal", wrap).hidden = false;
        revealBtn.disabled = true;
      });

    $("#mondo-next").addEventListener("click", () => {
      mondoState.index = (mondoState.index + 1) % SHOSAI.mondo.length;
      mondoState.revealed = false;
      mondoState.answers = {};
      renderMondo();
    });

    $$("[data-mondo-index]", wrap).forEach((button) =>
      button.addEventListener("click", () => {
        const nextIndex = Number(button.dataset.mondoIndex);
        if (nextIndex === mondoState.index) return;
        mondoState.index = nextIndex;
        mondoState.revealed = false;
        mondoState.answers = {};
        renderMondo();
      }));

    $$("[data-open-cond]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        const card = wrap.querySelector(`[data-sol="${b.dataset.openCond}"]`);
        card.querySelector('[data-stage="cond"]').hidden = false;
        b.hidden = true;
      }));
    $$("[data-open-src]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        const card = wrap.querySelector(`[data-sol="${b.dataset.openSrc}"]`);
        card.querySelector('[data-stage="cond"]').hidden = false;
        card.querySelector('[data-stage="src"]').hidden = false;
        b.hidden = true;
      }));

    const toSeed = $("#mondo-to-seed");
    if (toSeed)
      toSeed.addEventListener("click", () => {
        const text = mondoAnswerText();
        if (!text) return;
        seedState.kept.push({ recipe: `場面問答「${q.title}」の自分の答え`, dist: "near", text });
        renderSeeds();
        toSeed.textContent = "拾いました（上の種火欄へ）";
        toSeed.disabled = true;
      });
  }

  // ---------- 机（ホーム） ----------
  function initDesk() {
    $("#btn-deal").addEventListener("click", dealSeeds);
    renderSeeds();
    renderMondo();
    const thumbs = $("#desk-thumbs");
    thumbs.innerHTML = SHOSAI.visuals
      .map((v) => `<span class="thumb" aria-hidden="true">${ART[v.art]()}</span>`)
      .join("");

    const card = $("#resume-card");
    const open = () => openProject(buildFixedProject());
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });

    $("#new-question-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = $("#new-question").value.trim();
      if (!text) { $("#new-question").focus(); return; }
      openProject(buildNewProject(text));
      $("#new-question").value = "";
    });
  }

  let fixedProject = null;
  function buildFixedProject() {
    if (!fixedProject) fixedProject = { kind: "fixed", data: SHOSAI.project };
    return fixedProject;
  }

  function buildNewProject(text) {
    return {
      kind: "new",
      data: {
        title: text.length > 14 ? text.slice(0, 14) + "…" : text,
        subtitle: "新しい問い",
        question: { previous: null, current: text },
        sceneLine: null,
        constraints: [],
        scene: null,
        transformation: null,
      },
    };
  }

  // ---------- 制作机 ----------
  function openProject(project) {
    state.project = project;
    // 置いた資料と判断はプロジェクトごとに保持する（Phase 0: セッション中のみ）
    if (!project.placed) project.placed = new Set();
    if (!project.decisions) project.decisions = {};
    state.placed = project.placed;
    state.decisions = project.decisions;
    state.evidenceRef = null;
    renderStudio();
    $$(".view").forEach((v) => (v.hidden = true));
    $("#view-studio").hidden = false;
    window.scrollTo(0, 0);
    $("#btn-back").focus();
  }

  function backToDesk() {
    closeShelf();
    closeEvidence();
    if (location.hash === "#desk") showView("desk");
    else location.hash = "#desk";
    window.scrollTo(0, 0);
  }

  function renderStudio() {
    const p = state.project.data;
    const isNew = state.project.kind === "new";

    $("#studio-title").innerHTML =
      `${esc(p.title)}<small>${esc(p.subtitle || "")}</small>`;

    renderSheet(p, isNew);
    renderPlaced();
    renderEvidence();
    renderVisuals(isNew);
  }

  function renderSheet(p, isNew) {
    const sheet = $("#sheet");
    const shift = p.question.previous
      ? `<span class="label">問いの変化</span>
         ${esc(p.question.previous)}<span class="arrow">→</span><span class="now">${esc(p.question.current)}</span>`
      : `<span class="label">問い</span><span class="now">${esc(p.question.current)}</span>`;

    const chips = p.constraints.length
      ? p.constraints
          .map((c) =>
            `<span class="chip${c.hard ? " hard" : ""}">${esc(c.label)}<span class="k">${c.hard ? "固定" : "調整可"}</span></span>`)
          .join("")
      : `<span class="chip">制約ピンはまだありません<span class="k">Phase 1で編集</span></span>`;

    let body = "";
    if (p.scene) {
      const s = p.scene;
      const t = p.transformation;
      body = `
        <section class="study-section">
          <h3>この場面が観客に起こすこと</h3>
          <p>${esc(s.audience)}</p>
        </section>
        <section class="study-section">
          <h3>入口と出口</h3>
          <div class="entry-exit">
            <div class="ee"><b>入口</b><span>${esc(s.entry)}</span></div>
            <div class="ee"><b>出口</b><span>${esc(s.exit)}</span></div>
          </div>
        </section>
        <section class="study-section">
          <h3>人物・物・光・音・背景の関係</h3>
          <div class="relations">
            ${s.relations.map((r) => `<div class="rel"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}
          </div>
        </section>
        <section class="study-section">
          <h3>参考にした構造</h3>
          <div class="transform-memo">
            <p class="from">変換メモ — <b>${esc(t.fromLabel)}</b></p>
            <dl>
              ${t.rows
                .map((row, i) =>
                  `<div class="tr${i === t.rows.length - 1 ? " born" : ""}"><dt>${esc(row[0])}</dt><dd>${esc(row[1])}</dd></div>`)
                .join("")}
            </dl>
          </div>
        </section>
        <section class="study-section">
          <h3>意図的に外したもの</h3>
          <p>${esc(s.removed)}</p>
        </section>
        <section class="study-section">
          <h3>未決定事項</h3>
          <p>${esc(s.undecided)}</p>
        </section>
        <section class="study-section">
          <h3>次に試すこと</h3>
          <p class="next-action">${esc(s.next)}</p>
        </section>`;
    } else {
      body = `
        <section class="study-section">
          <h3>場面スタディ</h3>
          <p class="placeholder">この問いの場面スタディはまだ書かれていません。右上の資料棚から近い例・対照の例を置き、場面案へ育てます。（Phase 0では入力・保存は未実装）</p>
        </section>`;
    }

    sheet.innerHTML = `
      <span class="scene-line-label">場面の一行</span>
      <p class="scene-line">${p.sceneLine ? esc(p.sceneLine) : "（まだ書かれていない — ブリーフ前にここを言い切る）"}</p>
      <div class="question-shift">${shift}</div>
      <div class="constraints" aria-label="制約ピン">${chips}</div>
      ${body}`;
  }

  // ---------- 置いた資料（左レール） ----------
  function renderPlaced() {
    const wrap = $("#placed-list");
    const refs = SHOSAI.references.filter((r) => state.placed.has(r.id));
    if (!refs.length) {
      wrap.innerHTML = `<p class="placed-empty">まだ資料を置いていません。<br>「資料棚」を開き、「この制作へ置く」で机へ運びます。</p>`;
      return;
    }
    wrap.innerHTML = refs
      .map(
        (r) => `
        <div class="placed-card" data-ref="${r.id}">
          <p class="t">${esc(r.title)}</p>
          <p class="m">${esc(r.company)} ・ ${esc(r.year)}</p>
          ${r.axis ? `<span class="axis-tag">対照: ${esc(r.axis.name)}</span>` : ""}
          <div class="row">
            <button type="button" class="link-btn" data-ev="${r.id}">根拠を見る</button>
            <button type="button" class="link-btn" data-remove="${r.id}">外す</button>
          </div>
        </div>`)
      .join("");

    $$("[data-ev]", wrap).forEach((b) =>
      b.addEventListener("click", () => showEvidence(b.dataset.ev)));
    $$("[data-remove]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        state.placed.delete(b.dataset.remove);
        if (state.evidenceRef === b.dataset.remove) state.evidenceRef = null;
        renderPlaced();
        renderEvidence();
        renderShelf();
      }));
  }

  // ---------- 根拠パネル ----------
  function showEvidence(refId) {
    state.evidenceRef = refId;
    renderEvidence();
    const panel = $("#evidence-panel");
    if (window.matchMedia("(max-width: 1119px)").matches) {
      panel.classList.add("open");
    }
    panel.scrollTop = 0;
  }

  function closeEvidence() {
    $("#evidence-panel").classList.remove("open");
  }

  function renderEvidence() {
    const body = $("#evidence-body");
    const r = SHOSAI.references.find((x) => x.id === state.evidenceRef);
    if (!r) {
      body.innerHTML = `<p class="evidence-empty">置いた資料の「根拠を見る」を選ぶと、出典・確信度・未確認事項がここに出ます。<br><br>制作メモ（紙の上）と根拠（この棚側）は混ぜずに保ちます。</p>`;
      return;
    }
    body.innerHTML = `
      <div class="evidence-body">
        <p class="work">${esc(r.title)}</p>
        <p class="meta">${esc(r.company)} ・ ${esc(r.year)} ・ ${esc(r.kind)}</p>
        <div class="ev-block fact">
          <h4>出典（事実）</h4>
          <ul>${r.evidence.sources.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        </div>
        <div class="ev-block fact">
          <h4>確信度</h4>
          <p>${esc(r.evidence.confidence)}</p>
        </div>
        <div class="ev-block interp">
          <h4>資料からの解釈</h4>
          <p>${esc(r.reason)}</p>
        </div>
        <div class="ev-block unverified">
          <h4>未確認事項</h4>
          <p>${esc(r.evidence.unverified)}</p>
        </div>
        <div class="ev-block risk">
          <h4>既視感リスク</h4>
          <p>${esc(r.familiarRisk)}</p>
        </div>
        <p class="ev-legend">区分 — <span style="color:var(--brass)">▪ 事実</span> ／ <span style="color:var(--slate)">解釈</span> ／ 点線＝未確認。AIの提案はPhase 2から。本人の判断は紙の上にだけ残します。</p>
      </div>`;
  }

  // ---------- ビジュアルスタディ ----------
  function renderVisuals(isNew) {
    const grid = $("#visual-grid");
    if (isNew) {
      grid.innerHTML = ["A", "B", "C"]
        .map(
          (d) => `
          <div class="visual-empty">
            <span class="dir">${d}</span>
            方向の異なる試作をここに置く<br>（場面の一行を書いてから作る）
          </div>`)
        .join("");
      return;
    }

    grid.innerHTML = SHOSAI.visuals
      .map((v) => {
        const dec = state.decisions[v.id] || {};
        const verdicts = ["採用", "一部採用", "保留", "不採用"];
        return `
        <article class="visual-card" data-visual="${v.id}">
          <div class="dir-row"><span class="dir">${esc(v.dir)}</span><span class="dir-label">${esc(v.dirLabel)}</span></div>
          <button type="button" class="visual-art" data-lb="${v.id}" aria-label="案${esc(v.dir)}を拡大して見る">${ART[v.art]()}</button>
          <div class="visual-meta">
            <div class="vm"><b>意図</b><span>${esc(v.intent)}</span></div>
            <div class="vm"><b>参考構造</b><span>${esc(v.structure)}</span></div>
            <div class="vm"><b>避けた表現</b><span>${esc(v.avoided)}</span></div>
          </div>
          ${v.derived ? `
          <div class="derived">
            <p class="branch-note">${esc(v.derived.branchNote)}</p>
            <div class="derived-inner">
              <button type="button" class="visual-art" data-lb="${v.derived.id}" aria-label="派生案${esc(v.derived.dir)}を拡大して見る">${ART[v.derived.art]()}</button>
              <p>${esc(v.derived.intent)}</p>
            </div>
          </div>` : ""}
          <div class="judge">
            <p class="j-label">判断</p>
            <div class="judge-row" role="group" aria-label="案${esc(v.dir)}の判断">
              ${verdicts
                .map(
                  (vd) =>
                    `<button type="button" class="judge-btn" data-verdict="${vd}" aria-pressed="${dec.verdict === vd}">${vd}</button>`)
                .join("")}
            </div>
            <textarea rows="2" placeholder="理由を短く残す（例: 糸の角度は良い。頭部の向きだけ直したい）" aria-label="案${esc(v.dir)}の判断理由">${esc(dec.reason || "")}</textarea>
            <p class="save-note">Phase 0: 判断はこの画面の間だけ保持され、保存されません。</p>
          </div>
        </article>`;
      })
      .join("");

    $$("[data-lb]", grid).forEach((b) =>
      b.addEventListener("click", () => openLightbox(b.dataset.lb)));

    $$(".visual-card", grid).forEach((card) => {
      const id = card.dataset.visual;
      $$(".judge-btn", card).forEach((btn) =>
        btn.addEventListener("click", () => {
          const d = state.decisions[id] || {};
          d.verdict = d.verdict === btn.dataset.verdict ? null : btn.dataset.verdict;
          state.decisions[id] = d;
          $$(".judge-btn", card).forEach((b2) =>
            b2.setAttribute("aria-pressed", String(d.verdict === b2.dataset.verdict)));
          if (d.verdict) $("textarea", card).focus();
        }));
      $("textarea", card).addEventListener("input", (e) => {
        const d = state.decisions[id] || {};
        d.reason = e.target.value;
        state.decisions[id] = d;
      });
    });
  }

  // ---------- ライトボックス ----------
  const LB_ORDER = ["vA", "vA2", "vB", "vC"];

  function lbItem(id) {
    for (const v of SHOSAI.visuals) {
      if (v.id === id) return { dir: v.dir, label: v.dirLabel, intent: v.intent, art: v.art };
      if (v.derived && v.derived.id === id)
        return { dir: v.derived.dir, label: v.derived.branchNote, intent: v.derived.intent, art: v.derived.art };
    }
    return null;
  }

  let lbCurrent = null;
  let lbReturnFocus = null;

  function openLightbox(id) {
    const item = lbItem(id);
    if (!item) return;
    lbCurrent = id;
    lbReturnFocus = document.activeElement;
    $("#lb-art").innerHTML = ART[item.art]();
    $("#lb-dir").textContent = `案${item.dir} — ${item.label}`;
    $("#lb-intent").textContent = item.intent;
    $("#lightbox").hidden = false;
    $("#lb-close").focus();
  }

  function stepLightbox(delta) {
    if (!lbCurrent) return;
    const i = LB_ORDER.indexOf(lbCurrent);
    const next = LB_ORDER[(i + delta + LB_ORDER.length) % LB_ORDER.length];
    openLightbox(next);
  }

  function closeLightbox() {
    $("#lightbox").hidden = true;
    lbCurrent = null;
    if (lbReturnFocus) lbReturnFocus.focus();
  }

  // ---------- 資料棚 ----------
  function openShelf() {
    renderShelf();
    $("#shelf").hidden = false;
    $("#shelf-backdrop").hidden = false;
    $("#shelf-input").focus();
  }

  function closeShelf() {
    $("#shelf").hidden = true;
    $("#shelf-backdrop").hidden = true;
  }

  function renderShelf() {
    const q = ($("#shelf-input").value || "").trim().toLowerCase();
    const match = (r) =>
      !q ||
      [r.title, r.company, r.reason, r.difference, r.kind, r.axis && r.axis.name]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q));

    const near = SHOSAI.references.filter((r) => r.type === "near" && match(r));
    const contrast = SHOSAI.references.filter((r) => r.type === "contrast" && match(r));

    const card = (r) => `
      <article class="ref-card">
        <p class="t">${esc(r.title)}</p>
        <p class="meta"><span class="k-fact">▪</span> ${esc(r.company)} ・ ${esc(r.year)} ・ ${esc(r.kind)}</p>
        <div class="ref-field">
          <h4 class="interp">いまの問いとつながる理由（解釈）</h4>
          <p>${esc(r.reason)}</p>
        </div>
        <div class="ref-field">
          <h4>異なる点</h4>
          <p>${esc(r.difference)}</p>
        </div>
        ${r.axis ? `
        <div class="axis">
          <span class="axis-name">対照軸: ${esc(r.axis.name)}</span>
          <div class="axis-line">
            <span class="axis-end current">${esc(r.axis.current)}<em>いまの問い</em></span>
            <span class="axis-track" aria-hidden="true"></span>
            <span class="axis-end opposite">${esc(r.axis.opposite)}<em>この作品</em></span>
          </div>
          <p class="axis-why">${esc(r.axis.why)}</p>
        </div>` : ""}
        ${r.familiarRisk && !r.familiarRisk.startsWith("低") ? `
        <div class="ref-field">
          <h4 class="risk">既視感リスク</h4>
          <p>${esc(r.familiarRisk)}</p>
        </div>` : ""}
        <div class="ref-foot">
          <span class="conf">確信度: ${esc(r.evidence.confidence)}</span>
          <button type="button" class="btn-place" data-place="${r.id}" ${state.placed.has(r.id) ? "disabled" : ""}>
            ${state.placed.has(r.id) ? "置きました" : "この制作へ置く"}
          </button>
        </div>
      </article>`;

    $("#shelf-body").innerHTML = `
      ${near.length ? `<p class="shelf-group">いまの問いに近い</p>${near.map(card).join("")}` : ""}
      ${contrast.length ? `<p class="shelf-group contrast">対照（軸で見る逆方向）</p>${contrast.map(card).join("")}` : ""}
      ${!near.length && !contrast.length ? `<p class="evidence-empty" style="padding:20px 0">該当なし。Phase 0の棚は固定サンプル5件のみです。</p>` : ""}`;

    $$("[data-place]", $("#shelf-body")).forEach((b) =>
      b.addEventListener("click", () => {
        state.placed.add(b.dataset.place);
        b.disabled = true;
        b.textContent = "置きました";
        renderPlaced();
      }));
  }

  // ---------- 画面切り替え（ハッシュルーター） ----------
  const VIEWS = ["db", "desk", "seeds", "mondo"];

  function showView(name) {
    $$(".view").forEach((v) => (v.hidden = true));
    const el = $("#view-" + name);
    if (el) el.hidden = false;
    $$("[data-nav]").forEach((a) =>
      a.setAttribute("aria-current", a.dataset.nav === name ? "page" : "false"));
    closeShelf();
    closeEvidence();
  }

  function route() {
    const h = location.hash || "#db";
    if (h.startsWith("#db/")) {
      showView("db");
      selectWork(decodeURIComponent(h.slice(4)));
      return;
    }
    const name = h.slice(1);
    showView(VIEWS.includes(name) ? name : "db");
  }

  // ---------- 資料棚（作品データベース・正本読み取り） ----------
  const DB = typeof SHOSAI_DB !== "undefined" ? SHOSAI_DB : null;
  const dbState = {
    query: "",
    type: "",
    company: "",
    person: "",
    depth: "",
    lens: "",
    sort: "company",
    selected: null,
    detailMode: "work"
  };
  let workMap, elMap, featMap, elsByWork, lensMap;

  function buildDbMaps() {
    workMap = new Map(DB.works.map((w) => [w.id, w]));
    elMap = new Map(DB.elements.map((e) => [e.id, e]));
    featMap = new Map(DB.features.map((f) => [f.feature_id, f]));
    lensMap = new Map((DB.staging_lenses || []).map((lens) => [lens.id, lens]));
    elsByWork = new Map();
    for (const e of DB.elements)
      for (const l of e.work_links || []) {
        if (!elsByWork.has(l.work_id)) elsByWork.set(l.work_id, []);
        elsByWork.get(l.work_id).push(e);
      }
  }

  function personName(pid) {
    const p = DB.persons[pid];
    if (!p) return pid;
    return p.name_ja && p.name_ja !== p.name ? `${p.name_ja}（${p.name}）` : p.name || pid;
  }

  const featLabel = (fid) => (featMap.get(fid) ? featMap.get(fid).label_ja : fid);
  const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const ul = (v) => arr(v).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("");
  const depthMeta = (w) => w.research_depth || {
    level: "outline",
    label: "状態未生成",
    amount_level: 1,
    amount_label: "調査レベル1",
    amount_description: "概要・基礎情報を中心に記録",
    cause: "再生成が必要",
    reason: "調査レベルがまだ生成されていません。",
    next_step: "build_db.pyを再実行する。",
    score: 0,
    max_score: 11,
    basis: {},
  };
  const depthBadge = (w) => {
    const d = depthMeta(w);
    const amountLevel = d.amount_level || (d.score >= 9 ? 3 : d.score >= 6 ? 2 : 1);
    const amountLabel = d.amount_label || `調査レベル${amountLevel}`;
    return `<span class="db-depth-mark research-level-${esc(amountLevel)} depth-${esc(d.level)}" title="${esc(`${d.cause} — ${d.reason}`)}">${esc(amountLabel)}</span>`;
  };

  // 全文検索索引: 作品の全項目＋人名＋演出特徴＋リンクされた要素まで対象にする
  let searchIdx;

  function buildSearchIndex() {
    searchIdx = new Map();
    for (const w of DB.works) {
      const fields = [];
      const add = (label, v) => {
        const items = arr(v).filter(Boolean).map(String);
        if (items.length) fields.push({ label, text: items.join("　") });
      };
      add("基本情報", [w.title, w.original_title, w.company, w.genre, w.category, w.subcategory,
        w.media_type, w.year, w.show_type, w.venue_type, w.tour_or_resident, w.status, w.id]);
      add("概要", w.summary);
      add("テーマ", w.themes);
      add("世界観", w.worldview);
      add("トーン", w.tone);
      add("構造", w.structure);
      add("観客体験", w.audience_experience);
      add("象徴的な場面", w.signature_scenes);
      add("種目・道具", w.apparatus_or_disciplines);
      add("規模", w.cast_scale);
      add("アクロバット", w.acrobatics_role);
      add("クラウン", w.clown_or_comedy_role);
      add("音楽", w.music_style);
      add("装置・機構", w.set_mechanics);
      add("衣装", w.costume_features);
      add("照明", w.lighting_features);
      add("使える点", w.useful_for);
      add("既視感リスク", w.risk_of_cliche);
      add("学び", w.production_learning);
      add("出典メモ", w.source_notes);
      add("未確認事項", w.unverified_notes);
      add("解釈メモ", w.interpretation_notes);
      add("キーワード", w.similarity_keywords);
      add("調査レベル", [
        depthMeta(w).amount_label,
        depthMeta(w).amount_description,
        depthMeta(w).cause,
        depthMeta(w).reason,
        depthMeta(w).next_step,
      ]);
      add("人", (w.people || []).map((p) => {
        const per = DB.persons[p.person_id];
        return `${per ? `${per.name || ""} ${per.name_ja || ""}` : p.person_id} ${p.credit_label || p.role || ""}`;
      }));
      add("演出特徴", (w.staging_features || []).map((f) => {
        const ft = featMap.get(f.feature_id);
        return `${ft ? `${ft.label_ja} ${ft.description || ""}` : f.feature_id} ${f.note || ""}`;
      }));
      add("演出の型", (w.staging_lenses || []).flatMap((lens) => {
        const meta = lensMap.get(lens.id);
        return [meta ? `${meta.label} ${meta.description || ""}` : lens.id]
          .concat((lens.evidence || []).map((item) => `${item.label || ""} ${item.text || ""}`));
      }));
      add("要素", (elsByWork.get(w.id) || []).map(
        (e) => `${e.label || ""} ${e.label_ja || ""} ${e.subtype || ""} ${e.summary || ""}`));
      searchIdx.set(w.id, { fields, hay: fields.map((f) => f.text).join("\n").toLowerCase() });
    }
  }

  // 一致した場所のスニペット（タイトル・会社での一致は自明なので出さない）
  function matchSnippet(w, q) {
    const term = q.split(/\s+/)[0];
    if (!term) return "";
    if ((w.title || "").toLowerCase().includes(term) ||
        (w.company || "").toLowerCase().includes(term)) return "";
    const idx = searchIdx.get(w.id);
    for (const f of idx.fields) {
      const pos = f.text.toLowerCase().indexOf(term);
      if (pos >= 0) {
        const start = Math.max(0, pos - 14);
        const end = Math.min(f.text.length, pos + term.length + 26);
        return `${f.label}: ${start > 0 ? "…" : ""}${f.text.slice(start, end)}${end < f.text.length ? "…" : ""}`;
      }
    }
    return "";
  }

  function dbFilter() {
    const q = dbState.query.trim().toLowerCase();
    return DB.works.filter((w) => {
      if (dbState.type) {
        if (dbState.type.startsWith("sub:")) {
          if (w.subcategory !== dbState.type.slice(4)) return false;
        } else if (w.category !== dbState.type) return false;
      }
      if (dbState.company && (w.company || "") !== dbState.company) return false;
      if (dbState.person && !(w.people || []).some((p) => p.person_id === dbState.person))
        return false;
      if (dbState.depth && String(depthMeta(w).amount_level) !== dbState.depth) return false;
      if (dbState.lens && !(w.staging_lenses || []).some((lens) => lens.id === dbState.lens))
        return false;
      if (!q) return true;
      const idx = searchIdx.get(w.id);
      return q.split(/\s+/).every((t) => idx.hay.includes(t));
    });
  }

  function dbSort(list) {
    const yearNum = (w) => {
      const n = parseInt(w.year, 10);
      return isNaN(n) ? null : n;
    };
    const byTitle = (a, b) => String(a.title).localeCompare(String(b.title), "ja");
    if (dbState.sort === "title") {
      list.sort(byTitle);
    } else if (dbState.sort === "year_desc" || dbState.sort === "year_asc") {
      const dir = dbState.sort === "year_desc" ? -1 : 1;
      list.sort((a, b) => {
        const ya = yearNum(a), yb = yearNum(b);
        if (ya == null && yb == null) return byTitle(a, b);
        if (ya == null) return 1;   // 年不明は常に最後
        if (yb == null) return -1;
        return (ya - yb) * dir || byTitle(a, b);
      });
    } else {
      list.sort(
        (a, b) =>
          String(a.company || "～").localeCompare(String(b.company || "～"), "ja") ||
          String(a.year || "9999").localeCompare(String(b.year || "9999")) ||
          byTitle(a, b));
    }
    return list;
  }

  function openDbWork(id) {
    const nextHash = "#db/" + encodeURIComponent(id);
    if (location.hash === nextHash) selectWork(id);
    else location.hash = nextHash;
  }

  function syncLensQuery(lensId) {
    const url = new URL(location.href);
    if (lensId) url.searchParams.set("lens", lensId);
    else url.searchParams.delete("lens");
    history.replaceState(null, "", url);
  }

  function renderDbList() {
    const list = dbSort(dbFilter());
    const lens = lensMap.get(dbState.lens);
    const depth = (DB.research_depth_levels || []).find((item) => item.id === dbState.depth);
    $("#db-count").textContent =
      `${DB.works.length}件中 ${list.length}件${lens ? ` ・ 型: ${lens.label}` : ""}${depth ? ` ・ ${depth.label}` : ""} ・ 索引生成 ${DB.generated}（正本は読み取りのみ）`;
    const q = dbState.query.trim().toLowerCase();
    $("#db-list").innerHTML = list
      .map((w) => {
        const snippet = q ? matchSnippet(w, q) : "";
        return `
      <button type="button" class="db-row${dbState.selected === w.id ? " selected" : ""}" data-work="${esc(w.id)}">
        <span class="db-row-titleline"><span class="t">${esc(w.title)}</span>${depthBadge(w)}</span>
        <span class="m">${esc(w.company || "会社不明")} ・ ${esc(w.year || "年不明")} ・ ${esc(w.subcategory || w.category || w.media_type || "")}</span>
        ${snippet ? `<span class="hit">${esc(snippet)}</span>` : ""}
      </button>`;
      })
      .join("");
    $$("[data-work]", $("#db-list")).forEach((b) =>
      b.addEventListener("click", () => {
        openDbWork(b.dataset.work);
      }));
  }

  function renderStagingLenses() {
    const lenses = DB.staging_lenses || [];
    $("#db-lens-list").innerHTML = lenses.map((lens, index) => `
      <button type="button" class="db-lens" data-lens="${esc(lens.id)}" aria-pressed="${dbState.lens === lens.id}">
        <span class="db-lens-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="db-lens-copy"><span class="db-lens-label">${esc(lens.label)}</span><span class="db-lens-desc">${esc(lens.description || "")}</span></span>
        <span class="db-lens-count">${esc(lens.works_count)}件</span>
      </button>`).join("");
    $("#db-lens-clear").hidden = !dbState.lens;
    $$('[data-lens]', $("#db-lens-list")).forEach((button) =>
      button.addEventListener("click", () => {
        dbState.lens = button.dataset.lens;
        dbState.detailMode = "lens";
        syncLensQuery(dbState.lens);
        renderStagingLenses();
        renderDbList();
        renderLensDigest();
        if (window.matchMedia("(max-width: 899px)").matches)
          $("#db-detail").scrollIntoView({ block: "start" });
        else window.scrollTo(0, 0);
      }));
  }

  function renderLensDigest() {
    const lens = lensMap.get(dbState.lens);
    if (!lens) return;

    const works = dbSort(dbFilter());
    const excerptCount = works.reduce((total, w) => {
      const match = (w.staging_lenses || []).find((item) => item.id === lens.id);
      return total + (match ? (match.evidence || []).length : 0);
    }, 0);

    const rows = works.map((w, index) => {
      const match = (w.staging_lenses || []).find((item) => item.id === lens.id);
      const evidence = match ? match.evidence || [] : [];
      const evidenceHtml = evidence.map((item) => `
        <p class="db-lens-result-evidence">
          <span>${esc(item.label || "根拠")}</span>
          ${esc(item.text || "")}
        </p>`).join("");
      return `
        <article class="db-lens-result">
          <div class="db-lens-result-index">${String(index + 1).padStart(2, "0")}</div>
          <div class="db-lens-result-body">
            <button type="button" class="db-lens-result-title" data-work="${esc(w.id)}">
              <span>${esc(w.title)}<span aria-hidden="true"> →</span></span>${depthBadge(w)}
            </button>
            <p class="db-lens-result-meta">${esc(w.company || "会社不明")} ・ ${esc(w.year || "年不明")}</p>
            ${evidenceHtml}
          </div>
        </article>`;
    }).join("");

    $("#db-detail").setAttribute("aria-label", `${lens.label} 関連記述一覧`);
    $("#db-detail").innerHTML = `
      <button type="button" class="db-mobile-back" id="db-mobile-back">← 作品一覧へ戻る</button>
      <header class="db-lens-digest-head">
        <p class="dbd-kicker">演出の型からめくる ／ 正本メモの該当箇所</p>
        <h2 class="db-lens-digest-title">${esc(lens.label)}</h2>
        <p class="db-lens-digest-desc">${esc(lens.description || "")}</p>
        <p class="db-lens-digest-count">${works.length}作品 ・ ${excerptCount}箇所</p>
      </header>
      <p class="db-lens-digest-note">各作品の正本にある関連記述だけを抜き出しています。作品名を押すと、その作品の全データへ移動します。</p>
      <div class="db-lens-results">
        ${rows || `<p class="evidence-empty">現在の検索・絞り込み条件に該当する作品はありません。</p>`}
      </div>`;

    $$("[data-work]", $("#db-detail")).forEach((button) =>
      button.addEventListener("click", () => {
        openDbWork(button.dataset.work);
      }));
    $("#db-mobile-back").addEventListener("click", () =>
      $(".db-list-pane").scrollIntoView({ block: "start" }));
  }

  function relatedWorks(w) {
    const scores = new Map();
    const add = (id, pts, reason, front) => {
      if (id === w.id || !workMap.has(id)) return;
      const e = scores.get(id) || { score: 0, reasons: [] };
      e.score += pts;
      if (reason) front ? e.reasons.unshift(reason) : e.reasons.push(reason);
      scores.set(id, e);
    };
    const myFeatures = new Set((w.staging_features || []).map((f) => f.feature_id));
    const myPeople = new Set((w.people || []).map((p) => p.person_id));
    for (const o of DB.works) {
      if (o.id === w.id) continue;
      const sharedF = (o.staging_features || []).map((f) => f.feature_id).filter((id) => myFeatures.has(id));
      if (sharedF.length)
        add(o.id, sharedF.length * 2,
          `演出特徴を共有: ${sharedF.slice(0, 3).map(featLabel).join("、")}${sharedF.length > 3 ? " ほか" : ""}`);
      const sharedP = (o.people || []).filter((p) => myPeople.has(p.person_id));
      if (sharedP.length)
        add(o.id, sharedP.length * 3,
          `人を共有: ${sharedP.slice(0, 2).map((p) => personName(p.person_id)).join("、")}${sharedP.length > 2 ? " ほか" : ""}`);
      if (scores.has(o.id) && o.company && o.company === w.company)
        add(o.id, 1, "同じカンパニー");
    }
    for (const r of DB.work_relations || []) {
      const other = r.from === w.id ? r.to : r.to === w.id ? r.from : null;
      if (other) add(other, 10, `明示された関係（${r.relation_type}）: ${r.reason || ""}`, true);
    }
    const myEls = (elsByWork.get(w.id) || []).map((e) => e.id);
    const myElSet = new Set(myEls);
    for (const r of DB.element_relations || []) {
      const a = elMap.get(r.from), b = elMap.get(r.to);
      if (!a || !b) continue;
      const aIn = myElSet.has(a.id), bIn = myElSet.has(b.id);
      if (aIn === bIn) continue;
      const mine = aIn ? a : b, theirs = aIn ? b : a;
      for (const l of theirs.work_links || [])
        if (l.work_id !== w.id)
          add(l.work_id, 2,
            `要素の関係（${r.relation_type}）: ${mine.label_ja || mine.label} ↔ ${theirs.label_ja || theirs.label}`);
    }
    return [...scores.entries()]
      .map(([id, v]) => ({ work: workMap.get(id), ...v }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 8);
  }

  function selectWork(id) {
    if (!DB) return;
    const w = workMap.get(id);
    if (!w) return;
    dbState.selected = id;
    dbState.detailMode = "work";
    renderDbList();
    renderDbDetail(w);
    if (window.matchMedia("(max-width: 899px)").matches)
      $("#db-detail").scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }

  function renderDbDetail(w) {
    const sec = (title, inner, cls) =>
      inner ? `<section class="dbd-sec ${cls || ""}"><h3>${title}</h3>${inner}</section>` : "";
    const listSec = (title, v, cls) => {
      const li = ul(v);
      return li ? sec(title, `<ul>${li}</ul>`, cls) : "";
    };

    const peopleHtml = (w.people || [])
      .map((p) =>
        `<li>${esc(personName(p.person_id))}<span class="dim"> — ${esc(p.credit_label || p.role || "")}</span></li>`)
      .join("");

    const sfHtml = (w.staging_features || [])
      .map((f) => {
        const ft = featMap.get(f.feature_id);
        return `<div class="dbd-item">
          <p class="ft">${esc(ft ? ft.label_ja : f.feature_id)}<span class="dim"> ・ ${esc(ft ? ft.category : "")}</span></p>
          ${ft && ft.description ? `<p class="fd">${esc(ft.description)}</p>` : ""}
          ${f.note ? `<p class="fn">この作品での現れ方: ${esc(f.note)}</p>` : ""}
          ${f.confidence ? `<p class="fc">確信度: ${esc(f.confidence)}</p>` : ""}
        </div>`;
      })
      .join("");

    const els = elsByWork.get(w.id) || [];
    const elHtml = els
      .map(
        (e) => `<div class="dbd-item">
        <p class="ft">${esc(e.label_ja || e.label)}<span class="dim"> ・ ${esc(e.type || "")}${e.subtype ? "／" + esc(e.subtype) : ""}</span></p>
        ${e.summary ? `<p class="fd">${esc(e.summary)}</p>` : ""}
      </div>`)
      .join("");

    const elIds = new Set(els.map((e) => e.id));
    const relHtml = (DB.element_relations || [])
      .filter((r) => elIds.has(r.from) || elIds.has(r.to))
      .map((r) => {
        const a = elMap.get(r.from), b = elMap.get(r.to);
        if (!a || !b) return "";
        const both = elIds.has(r.from) && elIds.has(r.to);
        const theirs = elIds.has(r.from) ? b : a;
        const otherWorks = both
          ? ""
          : (theirs.work_links || [])
              .map((l) => (workMap.get(l.work_id) || {}).title)
              .filter((t) => t && t !== w.title)
              .join("、");
        return `<div class="dbd-item">
          <p class="ft">${esc(a.label_ja || a.label)} ↔ ${esc(b.label_ja || b.label)}<span class="dim"> ・ ${esc(r.relation_type)}${otherWorks ? " ・ 相手側: " + esc(otherWorks) : ""}</span></p>
          ${(r.different_axes || []).length ? `<p class="fd">異なる軸: ${esc(r.different_axes.join("／"))}</p>` : ""}
          ${(r.similar_axes || []).length ? `<p class="fd">似ている軸: ${esc(r.similar_axes.join("／"))}</p>` : ""}
          ${r.reason ? `<p class="fn">${esc(r.reason)}</p>` : ""}
        </div>`;
      })
      .join("");

    const related = relatedWorks(w);
    const rwHtml = related
      .map(
        (r) => `
      <button type="button" class="dbd-work-link" data-work="${esc(r.work.id)}">
        <span class="t">${esc(r.work.title)}</span>
        <span class="m">${esc(r.work.company || "")} ・ ${esc(r.work.year || "年不明")}</span>
        <span class="why">${esc(r.reasons.slice(0, 2).join(" ／ "))}</span>
      </button>`)
      .join("");

    const metaRow = [w.genre, w.show_type, w.venue_type, w.tour_or_resident, w.status]
      .filter(Boolean)
      .map((x) => `<span>${esc(x)}</span>`)
      .join("");

    const lensHtml = (w.staging_lenses || [])
      .map((lens) => {
        const meta = lensMap.get(lens.id);
        if (!meta) return "";
        const evidence = (lens.evidence || [])
          .map((item) => `<p><span class="dbd-lens-field">${esc(item.label || "根拠")}</span>${esc(item.text || "")}</p>`)
          .join("");
        return `<div class="dbd-lens-item"><h4>${esc(meta.label)}</h4>${evidence}</div>`;
      })
      .join("");

    const lensReturn = dbState.lens && lensMap.has(dbState.lens)
      ? `<button type="button" class="dbd-lens-return" id="dbd-lens-return">← ${esc(lensMap.get(dbState.lens).label)}の一覧へ</button>`
      : "";
    const depth = depthMeta(w);
    const amountLevel = depth.amount_level || (depth.score >= 9 ? 3 : depth.score >= 6 ? 2 : 1);
    const amountLabel = depth.amount_label || `調査レベル${amountLevel}`;
    const depthBasis = depth.basis || {};
    const depthBasisText = [
      `個別URL ${depthBasis.source_url_count || 0}`,
      `人物 ${depthBasis.people_count || 0}`,
      `演出特徴 ${depthBasis.staging_feature_count || 0}`,
      `再利用要素 ${depthBasis.element_count || 0}`,
      `制作項目 ${depthBasis.technical_field_count || 0}/6`,
      `分析項目 ${depthBasis.analysis_field_count || 0}/4`,
    ].join(" ・ ");

    $("#db-detail").setAttribute("aria-label", "作品データ");
    $("#db-detail").innerHTML = `
      <button type="button" class="db-mobile-back" id="db-mobile-back">← 作品一覧へ戻る</button>
      ${lensReturn}
      <header class="dbd-head">
        <p class="dbd-kicker">${esc(w.category || "")}${w.subcategory ? " ／ " + esc(w.subcategory) : ""}${w.media_type ? " ・ " + esc(w.media_type) : ""}</p>
        <h2 class="dbd-title">${esc(w.title)}</h2>
        ${w.original_title && w.original_title !== w.title ? `<p class="dbd-orig">${esc(w.original_title)}</p>` : ""}
        <p class="dbd-meta">${esc(w.company || "会社不明")} ・ ${esc(w.year || "年不明")}</p>
        <section class="dbd-depth research-level-${esc(amountLevel)} depth-${esc(depth.level)}" aria-label="この作品の調査レベル">
          <div class="dbd-depth-head">
            <p class="dbd-depth-label">${esc(amountLabel)}</p>
            <p class="dbd-depth-score">調査記録 ${esc(depth.score)}/${esc(depth.max_score)} ・ ${esc(depth.cause)}</p>
          </div>
          <p class="dbd-depth-reason">${esc(depth.reason)}</p>
          <p class="dbd-depth-next">${esc(depth.next_step)}</p>
          <p class="dbd-depth-basis">${esc(depthBasisText)}</p>
          <p class="dbd-depth-caveat">※ 作品の価値や外部情報の総量ではなく、このDB内で確認・接続できている記録の厚みです。</p>
        </section>
        <details class="dbd-technical">
          <summary>分類・データ情報</summary>
          ${metaRow ? `<div class="dbd-tags">${metaRow}</div>` : ""}
          <p>データID: ${esc(w.id)}</p>
        </details>
        <div class="dbd-links">
          ${(w.links || [])
            .map((u, index) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="src">出典${(w.links || []).length > 1 ? ` ${index + 1}` : ""}を開く<span>${esc(u.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))}</span></a>`)
            .join("")}
          <a class="utility" href="https://www.youtube.com/results?search_query=${encodeURIComponent([w.title, (w.company || "").split("/")[0].trim()].filter(Boolean).join(" "))}"
             target="_blank" rel="noopener">YouTubeで探す</a>
          <a class="utility" href="https://www.google.com/search?q=${encodeURIComponent([w.title, (w.company || "").split("/")[0].trim()].filter(Boolean).join(" "))}"
             target="_blank" rel="noopener">公式情報を探す</a>
        </div>
      </header>
      <div class="dbd-reading-mark" aria-hidden="true"><span>READING NOTES</span><i></i></div>
      ${listSec("概要", w.summary)}
      ${listSec("テーマ", w.themes)}
      ${listSec("世界観", w.worldview)}
      ${listSec("トーン", w.tone)}
      ${listSec("構造", w.structure)}
      ${listSec("観客体験", w.audience_experience)}
      ${listSec("象徴的な場面", w.signature_scenes)}
      ${listSec("種目・道具", w.apparatus_or_disciplines)}
      ${listSec("規模", w.cast_scale)}
      ${listSec("アクロバットの役割", w.acrobatics_role)}
      ${listSec("クラウン・コメディの役割", w.clown_or_comedy_role)}
      ${listSec("音楽", w.music_style)}
      ${listSec("装置・機構", w.set_mechanics)}
      ${listSec("衣装", w.costume_features)}
      ${listSec("照明", w.lighting_features)}
      ${lensHtml ? sec("横断の手がかり（正本メモからの抽出）", `<p class="dbd-lens-note">ここにある型は、既存の構造・場面・観客体験などの記述を手がかりにした資料棚上の読み方です。作品の因果や意図を新たに断定するものではありません。</p>${lensHtml}`) : ""}
      ${peopleHtml ? sec(`人（${(w.people || []).length}）`, `<ul>${peopleHtml}</ul>`) : ""}
      ${sfHtml ? sec(`演出特徴（${(w.staging_features || []).length}）`, sfHtml) : ""}
      ${elHtml ? sec(`関連表現 — この作品の要素（${els.length}）`, elHtml) : ""}
      ${relHtml ? sec("関連表現 — 要素どうしの関係", relHtml) : ""}
      ${rwHtml ? sec(`関連作品（${related.length}）`, rwHtml) : ""}
      ${listSec("制作に使える点", w.useful_for)}
      ${listSec("既視感リスク", w.risk_of_cliche)}
      ${listSec("制作からの学び", w.production_learning)}
      ${listSec("出典メモ（事実）", w.source_notes, "fact")}
      ${listSec("未確認事項", w.unverified_notes, "unv")}
      ${listSec("解釈メモ", w.interpretation_notes, "interp")}
      ${sec("確信度と出所", `<ul>
        ${w.confidence ? `<li>確信度: ${esc(w.confidence)}</li>` : ""}
        ${w.source_file ? `<li>深掘り元: ${esc(w.source_file)}</li>` : ""}
        ${w.last_verified ? `<li>最終確認: ${esc(w.last_verified)}</li>` : ""}
        ${w.review_status ? `<li>レビュー状態: ${esc(w.review_status)}</li>` : ""}
      </ul>`)}
    `;

    $$("[data-work]", $("#db-detail")).forEach((b) =>
      b.addEventListener("click", () => {
        openDbWork(b.dataset.work);
      }));
    $("#db-mobile-back").addEventListener("click", () =>
      $(".db-list-pane").scrollIntoView({ block: "start" }));
    if (lensReturn)
      $("#dbd-lens-return").addEventListener("click", () => {
        dbState.detailMode = "lens";
        renderLensDigest();
      });
  }

  function initDb() {
    if (!DB) {
      $("#db-list").innerHTML =
        `<p class="evidence-empty" style="padding:16px">db.js が読み込めません。shosai-app フォルダで python3 build_db.py を実行してください。</p>`;
      return;
    }
    buildDbMaps();
    buildSearchIndex();
    const initialLens = new URLSearchParams(location.search).get("lens") || "";
    if (lensMap.has(initialLens)) {
      dbState.lens = initialLens;
      dbState.detailMode = "lens";
    }
    renderStagingLenses();
    // ジャンル大分類（build_db.pyで生成）: 件数の多い順。サーカスはサブ分類を字下げで続ける
    const catCount = new Map();
    const subCount = new Map();
    for (const w of DB.works) {
      if (w.category) catCount.set(w.category, (catCount.get(w.category) || 0) + 1);
      if (w.subcategory) subCount.set(w.subcategory, (subCount.get(w.subcategory) || 0) + 1);
    }
    const cats = [...catCount.entries()].sort((a, b) => b[1] - a[1]);
    const subs = [...subCount.entries()].sort((a, b) => b[1] - a[1]);
    $("#db-type").innerHTML =
      `<option value="">すべてのジャンル（${DB.works.length}）</option>` +
      cats
        .map(([c, n]) => {
          let html = `<option value="${esc(c)}">${esc(c)}（${n}）</option>`;
          if (c === "サーカス・アクロバット")
            html += subs
              .map(([s, m]) => `<option value="sub:${esc(s)}">　└ ${esc(s)}（${m}）</option>`)
              .join("");
          return html;
        })
        .join("");

    // 会社: 作品数の多い順
    const compCount = new Map();
    for (const w of DB.works)
      if (w.company) compCount.set(w.company, (compCount.get(w.company) || 0) + 1);
    const comps = [...compCount.entries()].sort(
      (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ja"));
    $("#db-company").innerHTML =
      `<option value="">すべての会社（${comps.length}）</option>` +
      comps.map(([c, n]) => `<option value="${esc(c)}">${esc(c)}（${n}）</option>`).join("");

    // 人: 2作品以上に関わる人だけ、作品数の多い順（ディレクター・デザイナー等）
    const perCount = new Map();
    for (const w of DB.works)
      for (const p of new Set((w.people || []).map((x) => x.person_id)))
        perCount.set(p, (perCount.get(p) || 0) + 1);
    const pers = [...perCount.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || personName(a[0]).localeCompare(personName(b[0]), "ja"));
    $("#db-person").innerHTML =
      `<option value="">すべての人（2作品以上: ${pers.length}名）</option>` +
      pers
        .map(([pid, n]) => {
          const roles = (DB.persons[pid] ? DB.persons[pid].roles : []).slice(0, 2).join("・");
          return `<option value="${esc(pid)}">${esc(personName(pid))}（${n}）${roles ? " — " + esc(roles) : ""}</option>`;
        })
        .join("");

    $("#db-depth").innerHTML =
      `<option value="">すべての調査レベル（${DB.works.length}）</option>` +
      (DB.research_depth_levels || [])
        .map((level) => `<option value="${esc(level.id)}">${esc(level.label)}｜${esc(level.description)}（${level.works_count}）</option>`)
        .join("");

    $("#db-search").addEventListener("input", (e) => {
      dbState.query = e.target.value;
      renderDbList();
      if (dbState.detailMode === "lens") renderLensDigest();
    });
    const bindSelect = (sel, key) =>
      $(sel).addEventListener("change", (e) => {
        dbState[key] = e.target.value;
        renderDbList();
        if (dbState.detailMode === "lens") renderLensDigest();
      });
    bindSelect("#db-type", "type");
    bindSelect("#db-company", "company");
    bindSelect("#db-person", "person");
    bindSelect("#db-depth", "depth");
    bindSelect("#db-sort", "sort");
    $("#db-lens-clear").addEventListener("click", () => {
      dbState.lens = "";
      dbState.detailMode = "work";
      syncLensQuery("");
      renderStagingLenses();
      renderDbList();
      if (dbState.selected && workMap.has(dbState.selected))
        renderDbDetail(workMap.get(dbState.selected));
      else {
        $("#db-detail").setAttribute("aria-label", "作品データ");
        $("#db-detail").innerHTML =
          `<p class="evidence-empty">一覧から作品を選ぶと、正本データと、関連作品・関連表現がここに出ます。</p>`;
      }
    });
    renderDbList();
    if (dbState.detailMode === "lens") renderLensDigest();
  }

  // ---------- 初期化 ----------
  function init() {
    initDesk();
    initDb();
    window.addEventListener("hashchange", route);
    route();

    $("#btn-back").addEventListener("click", backToDesk);
    $("#btn-shelf").addEventListener("click", openShelf);
    $("#shelf-close").addEventListener("click", closeShelf);
    $("#shelf-backdrop").addEventListener("click", closeShelf);
    $("#shelf-input").addEventListener("input", renderShelf);
    $("#ev-close").addEventListener("click", closeEvidence);

    $("#lb-close").addEventListener("click", closeLightbox);
    $("#lb-prev").addEventListener("click", () => stepLightbox(-1));
    $("#lb-next").addEventListener("click", () => stepLightbox(1));
    $("#lightbox").addEventListener("click", (e) => {
      if (e.target === $("#lightbox")) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!$("#lightbox").hidden) return closeLightbox();
        if (!$("#shelf").hidden) return closeShelf();
        closeEvidence();
      }
      if (!$("#lightbox").hidden) {
        if (e.key === "ArrowLeft") stepLightbox(-1);
        if (e.key === "ArrowRight") stepLightbox(1);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
