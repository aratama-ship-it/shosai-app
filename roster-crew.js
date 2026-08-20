/* 制作の書斎 — 名簿: 制作・技術スタッフ索引
 *
 * 名簿は二冊ある。
 *   I  アーティスト        … roster.js。暗号化されたスカウティングレポート由来。合言葉で解錠する。
 *   II 制作・技術スタッフ  … このファイル。db.js が既に配信している公開クレジットだけを組み立てる。
 *
 * 重要な境界:
 * - このファイルは SHOSAI_DB.persons と SHOSAI_DB.works[*].people しか読まない。
 *   連絡先・SNS・写真・調査文はアーティスト名簿側の資産であり、ここへは決して混ぜない。
 * - 正本の role は書き換えない。作品別 credit_label に職名が明記されている場合だけ、
 *   その部門にも「表示」する。判定は role と credit_label に限定し、
 *   人物ノート・名前・会社・作品ジャンルから職種を推測しない。
 * - 合言葉（scout_pass）を要求しない。ここに出るのは既に db.js で配信済みの情報だけ。
 *
 * node からもテストできるよう、判定と組み立ては純粋関数にして module.exports へ出す。
 * DOM 初期化は document があるときだけ走る。
 */
(() => {
  "use strict";

  // ---------- 部門表（判定はここ一か所に集約する。将来の職種追加もここへ） ----------
  //
  // roles       … 正本 role がこれなら、その部門に属する。
  // creditHints … 作品別 credit_label にこの語が明記されている場合だけ、その部門にも表示する。
  //               正本 role の暫定対応（舞台監督が director、Props Master が set_designer など）を
  //               書き換えずに救い上げるための経路。
  const DEPARTMENTS = Object.freeze([
    {
      id: "stage_ops",
      label: "舞台進行・制作",
      roles: ["stage_manager", "production_manager", "technical_director",
              "production_consultant", "company_manager", "producer"],
      creditHints: ["舞台監督", "Stage Manager", "技術監督", "Technical Director",
                    "制作監督", "Production Manager", "Production Consultant"],
    },
    {
      id: "scenic",
      label: "舞台美術・大道具・小道具",
      roles: ["set_designer", "theatre_designer", "scenic_designer", "scenic_fabricator",
              "stage_carpenter", "props_master", "property_master", "prop_designer",
              "puppet_designer"],
      creditHints: ["大道具", "Scenic", "Carpenter", "Fabrication",
                    "小道具", "Props Master", "Property Master"],
    },
    {
      id: "lighting",
      label: "照明",
      roles: ["lighting_designer", "lighting_programmer", "lighting_operator",
              "lighting_system_engineer"],
      creditHints: ["照明", "Lighting"],
    },
    {
      id: "sound",
      label: "音響",
      roles: ["sound_designer", "sound_engineer", "sound_operator", "system_engineer",
              "audio_system_engineer", "network_audio_engineer", "spatial_audio_engineer",
              "acoustician", "structural_acoustician"],
      creditHints: ["音響", "Sound Designer", "Sound Engineer", "Audio"],
    },
    {
      id: "video",
      label: "映像・投影",
      roles: ["projection_designer", "video_designer", "projectionist",
              "media_server_programmer", "video_operator"],
      creditHints: ["映像", "Projection", "Video"],
    },
    {
      id: "rigging",
      label: "リギング・機構・自動化",
      roles: ["rigging_designer", "rigger", "automation_designer", "automation_programmer",
              "automation_operator", "stage_machinery_engineer"],
      creditHints: ["リギング", "Rigging", "自動化", "Automation"],
    },
    {
      id: "costume",
      label: "衣装・ヘア・メイク",
      roles: ["costume_designer", "wardrobe_supervisor", "makeup_designer", "hair_designer",
              "fashion_designer"],
      creditHints: ["衣装", "Wardrobe", "Costume"],
    },
    {
      id: "effects",
      label: "特殊効果・専門設計",
      roles: ["special_effects_designer", "pyrotechnician", "magic_designer", "aerial_designer",
              "acrobatic_designer", "stage_safety_manager"],
      creditHints: ["特殊効果", "Special Effects", "Pyro"],
    },
  ]);

  // 掲載しない職種。これしか持たず、技術系の credit_label も無い人物は索引に入れない。
  // （同じ人物が技術職も兼ねる場合、または credit_label に技術職が明記される場合は掲載する）
  const CREATIVE_ONLY_ROLES = Object.freeze([
    "performer", "clown", "director", "writer", "creative_director",
    "artistic_director", "choreographer", "composer", "lyricist", "music_director",
  ]);

  // 職種の日本語表示。同じ部門に置く職種でも、設計と操作、舞台美術と大道具は区別する。
  const ROLE_LABELS = Object.freeze({
    stage_manager: "舞台監督",
    production_manager: "制作監督",
    technical_director: "技術監督",
    production_consultant: "制作コンサルタント",
    company_manager: "カンパニーマネージャー",
    producer: "プロデューサー",
    set_designer: "舞台美術",
    theatre_designer: "劇場デザイン",
    scenic_designer: "背景美術",
    scenic_fabricator: "背景製作",
    stage_carpenter: "大道具・舞台作業",
    props_master: "小道具責任者",
    property_master: "小道具責任者",
    prop_designer: "小道具デザイン",
    puppet_designer: "パペットデザイン",
    lighting_designer: "照明デザイン",
    lighting_programmer: "照明プログラマー",
    lighting_operator: "照明オペレーター",
    lighting_system_engineer: "照明システムエンジニア",
    sound_designer: "音響デザイン",
    sound_engineer: "音響エンジニア",
    sound_operator: "音響オペレーター",
    system_engineer: "システムエンジニア",
    audio_system_engineer: "音響システムエンジニア",
    network_audio_engineer: "ネットワーク音響エンジニア",
    spatial_audio_engineer: "立体音響エンジニア",
    acoustician: "音響設計",
    structural_acoustician: "構造音響設計",
    projection_designer: "映像デザイン",
    video_designer: "ビデオデザイン",
    projectionist: "映写",
    media_server_programmer: "メディアサーバープログラマー",
    video_operator: "映像オペレーター",
    rigging_designer: "リギング設計",
    rigger: "リガー",
    automation_designer: "自動化設計",
    automation_programmer: "自動化プログラマー",
    automation_operator: "自動化オペレーター",
    stage_machinery_engineer: "舞台機構エンジニア",
    costume_designer: "衣装デザイン",
    wardrobe_supervisor: "衣装統括",
    makeup_designer: "メイクデザイン",
    hair_designer: "ヘアデザイン",
    fashion_designer: "ファッションデザイン",
    special_effects_designer: "特殊効果デザイン",
    pyrotechnician: "火工・特殊効果技術",
    magic_designer: "マジック設計",
    aerial_designer: "エアリアル設計",
    acrobatic_designer: "アクロバット設計",
    stage_safety_manager: "舞台安全管理",
    // 部門には入らない職種。分類には使わないが、詳細で正本の職種を並べるとき
    // snake_case のまま出さないために表記だけ持っておく。
    director: "演出",
    performer: "出演",
    writer: "脚本",
    choreographer: "振付",
    composer: "作曲",
    lyricist: "作詞",
    music_director: "音楽監督",
    creative_director: "クリエイティブディレクション",
    artistic_director: "芸術監督",
    clown: "クラウン",
    collaborating_artist: "共同アーティスト",
  });

  const CONFIDENCE_LABELS = Object.freeze({
    high: "確度 高", medium: "確度 中", low: "確度 低",
  });

  const roleLabel = (role) => ROLE_LABELS[role] || role || "";
  const confidenceLabel = (value) =>
    CONFIDENCE_LABELS[String(value || "").toLowerCase()] || "";

  const ROLE_TO_DEPARTMENTS = (() => {
    const map = new Map();
    DEPARTMENTS.forEach((dept) => {
      dept.roles.forEach((role) => {
        if (!map.has(role)) map.set(role, []);
        map.get(role).push(dept.id);
      });
    });
    return map;
  })();

  const departmentsForRole = (role) => ROLE_TO_DEPARTMENTS.get(role) || [];

  /* 括弧の中は職名の明記ではなく注記なので、判定から外す。
     「演出（2016トニー賞演出賞。Disney+映像版の監督も担当）」を映像部門に入れないため。
     「技術監督・照明（Technical Director / Lighting Designer）」は括弧の外で判定できる。 */
  function creditLabelForMatching(creditLabel) {
    return String(creditLabel || "")
      .replace(/（[^（）]*）/g, " ")
      .replace(/\([^()]*\)/g, " ");
  }

  // credit_label に職名が「明記されている場合だけ」拾う。名前・会社・ジャンルは見ない。
  function departmentsForCreditLabel(creditLabel) {
    const text = creditLabelForMatching(creditLabel);
    if (!text.trim()) return [];
    const hits = [];
    DEPARTMENTS.forEach((dept) => {
      const matched = dept.creditHints.some((hint) => {
        if (!/[a-z]/i.test(hint)) return text.includes(hint);
        // 英字の職名は語として現れたときだけ拾う（Audiovisual の Audio 等を避ける）。
        const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(text);
      });
      if (matched) hits.push(dept.id);
    });
    return hits;
  }

  const departmentLabel = (id) => {
    const dept = DEPARTMENTS.find((d) => d.id === id);
    return dept ? dept.label : id;
  };

  // ---------- 索引の組み立て ----------

  /* SHOSAI_DB から、人物ID単位の制作・技術スタッフ索引を作る。
     戻り値の各要素が持つのは、氏名・職種・部門・作品別クレジットだけ。 */
  function buildCrewIndex(db) {
    const persons = (db && db.persons) || {};
    const works = (db && db.works) || [];
    const byPerson = new Map();

    const ensure = (personId) => {
      if (byPerson.has(personId)) return byPerson.get(personId);
      const person = persons[personId] || {};
      const entry = {
        id: personId,
        name: person.name || "",
        nameJa: person.name_ja || "",
        roles: Array.isArray(person.roles) ? person.roles.slice() : [],
        departments: [],
        credits: [],
        creditKeys: new Set(),
      };
      // 正本 role からの部門。credit_label より前に置く（正本を主、明記を補助とする）。
      entry.roles.forEach((role) => {
        departmentsForRole(role).forEach((id) => {
          if (!entry.departments.includes(id)) entry.departments.push(id);
        });
      });
      byPerson.set(personId, entry);
      return entry;
    };

    works.forEach((work) => {
      (work.people || []).forEach((credit) => {
        const personId = credit && credit.person_id;
        if (!personId) return;
        const entry = ensure(personId);
        // 同じ人物・同じ作品・同じクレジット表記は一つにまとめる。
        const key = `${work.id} ${credit.role || ""} ${credit.credit_label || ""}`;
        if (entry.creditKeys.has(key)) return;
        entry.creditKeys.add(key);

        const creditDepartments = [];
        departmentsForRole(credit.role).forEach((id) => creditDepartments.push(id));
        departmentsForCreditLabel(credit.credit_label).forEach((id) => {
          if (!creditDepartments.includes(id)) creditDepartments.push(id);
        });
        creditDepartments.forEach((id) => {
          if (!entry.departments.includes(id)) entry.departments.push(id);
        });

        entry.credits.push({
          workId: work.id,
          title: work.title || "",
          company: work.company || "",
          year: work.year || "",
          role: credit.role || "",
          creditLabel: credit.credit_label || "",
          source: credit.source || "",
          confidence: credit.confidence || "",
          departments: creditDepartments,
        });
      });
    });

    // 部門が一つも付かない人物（performer・director だけ等）は索引に入れない。
    const crew = [];
    byPerson.forEach((entry) => {
      if (!entry.departments.length) return;
      delete entry.creditKeys;
      entry.departments.sort(
        (a, b) => DEPARTMENTS.findIndex((d) => d.id === a) - DEPARTMENTS.findIndex((d) => d.id === b));
      entry.workCount = new Set(entry.credits.map((c) => c.workId)).size;
      crew.push(entry);
    });
    return crew;
  }

  function departmentCounts(crew) {
    return DEPARTMENTS.map((dept) => ({
      id: dept.id,
      label: dept.label,
      count: crew.filter((c) => c.departments.includes(dept.id)).length,
    }));
  }

  const api = {
    DEPARTMENTS, ROLE_LABELS, CREATIVE_ONLY_ROLES, CONFIDENCE_LABELS,
    roleLabel, confidenceLabel, departmentLabel, creditLabelForMatching,
    departmentsForRole, departmentsForCreditLabel,
    buildCrewIndex, departmentCounts,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.SHOSAI_CREW = api;
  if (typeof document === "undefined") return;

  // ---------- 画面 ----------

  const $ = (sel, root = document) => root.querySelector(sel);
  const setText = (el, value) => { el.textContent = value == null ? "" : String(value); };

  const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

  const SORTS = [
    { id: "name", label: "名前順" },
    { id: "works", label: "担当作品数の多い順" },
    { id: "department", label: "部門順" },
  ];

  const state = {
    status: "idle",   // idle | ready | error
    crew: [],
    department: "",
    query: "",
    sort: "name",
    selected: null,
  };

  const displayName = (c) => c.nameJa || c.name || c.id;

  /* 一覧行に出す職種は、この索引の対象である制作・技術の職種にしぼる。
     演出・出演しか正本に無く credit_label で拾った人は、代わりに部門名を出す。 */
  const indexedRoles = (c) => c.roles.filter((r) => departmentsForRole(r).length);
  const rowRoleText = (c) => {
    const roles = indexedRoles(c);
    return roles.length
      ? roles.map(roleLabel).join(" ・ ")
      : c.departments.map(departmentLabel).join(" ・ ");
  };

  /* 検索の対象は、名前・職種・クレジット表記・作品名・会社名。
     部門名は入れない。入れると「大道具」で舞台美術部門の全員が返り、
     実際に大道具としてクレジットされた人を探せなくなる。部門で絞るのは左の索引の役目。 */
  function haystack(c) {
    return [
      c.name, c.nameJa, c.id,
      ...c.roles.map(roleLabel), ...c.roles,
      ...c.credits.map((x) => `${x.creditLabel} ${x.title} ${x.company} ${roleLabel(x.role)}`),
    ].join(" ").toLowerCase();
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    const rows = state.crew.filter((c) => {
      if (state.department && !c.departments.includes(state.department)) return false;
      if (!terms.length) return true;
      const hay = haystack(c);
      return terms.every((t) => hay.includes(t));
    });
    const sorted = rows.slice();
    if (state.sort === "works") {
      sorted.sort((a, b) => b.workCount - a.workCount
        || collator.compare(displayName(a), displayName(b)));
    } else if (state.sort === "department") {
      const rank = (c) => DEPARTMENTS.findIndex((d) => d.id === c.departments[0]);
      sorted.sort((a, b) => rank(a) - rank(b)
        || collator.compare(displayName(a), displayName(b)));
    } else {
      sorted.sort((a, b) => collator.compare(displayName(a), displayName(b)));
    }
    return sorted;
  }

  function renderDepartments() {
    const box = $("#crew-departments");
    if (!box) return;
    box.replaceChildren();
    const make = (id, label, count) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "crew-department";
      btn.setAttribute("aria-pressed", state.department === id ? "true" : "false");
      const name = document.createElement("span");
      setText(name, label);
      const num = document.createElement("span");
      num.className = "crew-department-count";
      setText(num, `${count}人`);
      btn.append(name, num);
      btn.addEventListener("click", () => {
        state.department = id;
        state.selected = null;
        renderDepartments();
        renderList();
        renderDetail();
      });
      return btn;
    };
    box.append(make("", "すべての部門", state.crew.length));
    departmentCounts(state.crew).forEach((d) => {
      if (!d.count) return;
      box.append(make(d.id, d.label, d.count));
    });
  }

  function renderList() {
    const list = $("#crew-list");
    const count = $("#crew-count");
    if (!list) return;
    const rows = filtered();
    if (count) setText(count, `${state.crew.length}人中 ${rows.length}人`);
    list.replaceChildren();
    if (!state.crew.length) {
      const empty = document.createElement("p");
      empty.className = "evidence-empty";
      setText(empty, state.status === "error"
        ? "作品クレジットのデータを読み込めませんでした。資料棚を一度開いてから、もう一度お試しください。"
        : "作品クレジットから索引できる制作・技術スタッフがまだありません。");
      list.append(empty);
      return;
    }
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "evidence-empty";
      setText(empty, "この条件に合う人はいません。");
      list.append(empty);
      return;
    }
    rows.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "crew-row" + (state.selected === c ? " selected" : "");
      const idx = document.createElement("span");
      idx.className = "crew-row-index";
      setText(idx, String(i + 1).padStart(3, "0"));
      const body = document.createElement("span");
      const name = document.createElement("span");
      name.className = "crew-row-name";
      setText(name, displayName(c));
      body.append(name);
      if (c.nameJa && c.name && c.nameJa !== c.name) {
        const orig = document.createElement("span");
        orig.className = "crew-row-orig";
        setText(orig, c.name);
        body.append(orig);
      }
      const meta = document.createElement("span");
      meta.className = "crew-row-meta";
      setText(meta, rowRoleText(c));
      body.append(meta);
      const works = document.createElement("span");
      works.className = "crew-row-works";
      setText(works, `${c.workCount}作品`);
      btn.append(idx, body, works);
      btn.addEventListener("click", () => {
        state.selected = c;
        renderList();
        renderDetail();
        const detail = $("#crew-detail");
        if (detail) detail.scrollIntoView({ block: "start" });
      });
      list.append(btn);
    });
  }

  function renderDetail() {
    const pane = $("#crew-detail");
    if (!pane) return;
    pane.replaceChildren();
    const c = state.selected;
    if (!c) {
      const empty = document.createElement("p");
      empty.className = "evidence-empty";
      setText(empty, "一覧から選ぶと、作品ごとのクレジット表記がここに出ます。");
      pane.append(empty);
      return;
    }

    // 一列になる幅では、一覧と詳細を行き来する手がかりが要る（資料棚と同じ作り）。
    const back = document.createElement("button");
    back.type = "button";
    back.className = "db-mobile-back";
    back.textContent = "← 一覧へ戻る";
    back.addEventListener("click", () => {
      const listPane = document.querySelector(".crew-list-pane");
      if (listPane) listPane.scrollIntoView({ block: "start" });
    });
    pane.append(back);

    const card = document.createElement("article");
    card.className = "crew-card";

    const head = document.createElement("header");
    head.className = "crew-card-head";
    const kicker = document.createElement("p");
    kicker.className = "crew-kicker";
    setText(kicker, "CREW");
    const h2 = document.createElement("h2");
    setText(h2, displayName(c));
    head.append(kicker, h2);
    if (c.name && c.nameJa && c.name !== c.nameJa) {
      const orig = document.createElement("p");
      orig.className = "crew-card-orig";
      setText(orig, c.name);
      head.append(orig);
    }
    const depts = document.createElement("p");
    depts.className = "crew-card-meta";
    setText(depts, c.departments.map(departmentLabel).join(" ／ "));
    head.append(depts);
    // 詳細では正本の職種をすべて並べる。この索引の外の職種（演出・出演等）も隠さない。
    const roles = document.createElement("p");
    roles.className = "crew-card-roles";
    setText(roles, c.roles.length
      ? `正本の職種: ${c.roles.map(roleLabel).filter(Boolean).join(" ・ ")}`
      : "");
    if (roles.textContent) head.append(roles);
    card.append(head);

    const creditsSec = document.createElement("section");
    creditsSec.className = "crew-credits";
    const label = document.createElement("p");
    label.className = "crew-field-label";
    setText(label, `作品別のクレジット（${c.credits.length}）`);
    creditsSec.append(label);

    const sorted = c.credits.slice().sort((a, b) =>
      String(b.year || "").localeCompare(String(a.year || ""))
      || collator.compare(a.title || "", b.title || ""));

    const listEl = document.createElement("ul");
    listEl.className = "crew-credit-list";
    sorted.forEach((credit) => {
      const li = document.createElement("li");
      li.className = "crew-credit";
      const a = document.createElement("a");
      a.className = "crew-credit-work";
      a.href = `#db/${credit.workId}`;
      setText(a, credit.title || credit.workId);
      li.append(a);
      const meta = document.createElement("p");
      meta.className = "crew-credit-meta";
      setText(meta, [credit.company, credit.year].filter(Boolean).join(" ・ "));
      if (meta.textContent) li.append(meta);
      // 公式掲載に近い credit_label を優先して出し、正本 role は補助として添える。
      const cl = document.createElement("p");
      cl.className = "crew-credit-label";
      setText(cl, credit.creditLabel || roleLabel(credit.role));
      li.append(cl);
      if (credit.creditLabel && credit.role) {
        const roleNote = document.createElement("p");
        roleNote.className = "crew-credit-role";
        setText(roleNote, `正本の職種: ${roleLabel(credit.role)}`);
        li.append(roleNote);
      }
      const foot = document.createElement("p");
      foot.className = "crew-credit-foot";
      const conf = confidenceLabel(credit.confidence);
      if (conf) {
        const badge = document.createElement("span");
        badge.className = "crew-confidence";
        badge.dataset.confidence = credit.confidence;  // 元値は失わない
        setText(badge, conf);
        foot.append(badge);
      }
      if (credit.source) {
        const src = document.createElement("span");
        src.className = "crew-credit-source";
        setText(src, credit.source);
        foot.append(src);
      }
      if (foot.childElementCount) li.append(foot);
      listEl.append(li);
    });
    creditsSec.append(listEl);
    card.append(creditsSec);

    const caveat = document.createElement("p");
    caveat.className = "crew-caveat";
    setText(caveat, "作品クレジットで確認できた範囲です。現在の所属、連絡先、依頼可否は分かりません。");
    card.append(caveat);

    pane.append(card);
  }

  function renderAll() {
    renderDepartments();
    renderList();
    renderDetail();
  }

  let started = false;

  // 資料棚と同じ db.js を読む。名簿タブを開いた時点で組み立てる（初回だけ）。
  function start() {
    if (started) return;
    const panel = $("#people-panel-crew");
    if (!panel) return;
    started = true;
    // db.js は `const SHOSAI_DB = …` で宣言するので window のプロパティにはならない。
    // app.js と同じく、素のグローバルを typeof で確かめてから読む。
    const db = typeof SHOSAI_DB !== "undefined" ? SHOSAI_DB : null;
    if (!db || !db.works || !db.persons) {
      state.status = "error";
      renderAll();
      return;
    }
    state.crew = buildCrewIndex(db);
    state.status = "ready";
    renderAll();
  }

  /* 二冊の索引の切り替え。合言葉ゲートより上に置き、
     「制作・技術スタッフ」側は解錠を一切要求しない。
     選択状態は色だけでなく、罫線・「いま開いている」の文字・aria-selected で示す。 */
  function initTabs() {
    const tablist = $("#people-index-tabs");
    if (!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    const activate = (tab, { focus = true } = {}) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        const panelEl = document.getElementById(t.getAttribute("aria-controls"));
        if (panelEl) panelEl.hidden = !on;
      });
      if (focus) tab.focus();
      // 制作・技術スタッフを開いた時点で索引を組み立てる（合言葉は要らない）。
      if (tab.getAttribute("aria-controls") === "people-panel-crew") start();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => activate(tab, { focus: false }));
      tab.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (step) {
          e.preventDefault();
          activate(tabs[(i + step + tabs.length) % tabs.length]);
        } else if (e.key === "Home") {
          e.preventDefault();
          activate(tabs[0]);
        } else if (e.key === "End") {
          e.preventDefault();
          activate(tabs[tabs.length - 1]);
        }
      });
    });
  }

  function init() {
    const panel = $("#people-panel-crew");
    if (!panel) return;

    initTabs();

    const search = $("#crew-search");
    if (search) {
      search.addEventListener("input", () => {
        state.query = search.value;
        renderList();
      });
    }

    const sortSel = $("#crew-sort");
    if (sortSel) {
      SORTS.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        setText(opt, s.label);
        sortSel.append(opt);
      });
      sortSel.value = state.sort;
      sortSel.addEventListener("change", () => {
        state.sort = sortSel.value;
        renderList();
      });
    }

    // 索引の組み立ては「制作・技術スタッフ」を開いたときまで遅らせる。
    window.SHOSAI_CREW.start = start;
    if (!panel.hidden) start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
