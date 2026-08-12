/* 制作の書斎 — Phase 0 プロトタイプ
   触れるのは画面遷移・資料を置く・根拠を開く・画像比較・判断の記録（メモリ上のみ）。
   検索・AI・共有は未実装。舞台スケッチだけは別ファイルで端末内保存する。 */

(function () {
  "use strict";

  // localStorageの移行処理は単独ファイルにして、ブラウザ版とMacアプリ版で共有する。
  // index.htmlは保護対象なので、既存app.jsの入口から読み込む。
  if (!window.SHOSAI_STORAGE_MIGRATION) {
    const migrationScript = document.createElement("script");
    migrationScript.src = "storage-migration.js?v=1";
    migrationScript.dataset.shosaiStorageMigration = "1";
    document.head.append(migrationScript);
  }

  // ---------- 状態 ----------
  const state = {
    project: null,        // 現在開いているプロジェクト
    placed: new Set(),    // 置いたリファレンスID
    placedMeta: new Map(), // id -> { role, note, at }
    decisions: {},        // visualId -> { verdict, reason }
    evidenceRef: null,    // 根拠パネルに出しているリファレンスID
    deskProjects: [],
    sheetEditing: false,
    visualBriefEditing: false,
    branchEditing: false,
    directionEditing: null,
    promptOpen: {},
    pendingVisualImport: null,
    visualNotice: "",
    visualImageUrls: new Map(),
    shelfGenre: "",
    shelfPlacing: null,
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

  // ---------- スクラップブック（0→1の配りと端末内のページ保存） ----------
  // 配りは 近い3 / 少し遠い2 / 異物2 の計7枚。気になったものを12枚まで紙面へ貼り、
  // 1〜3枚を材料として、本人の補足とともに次の「場面の問い」へ組み立てる。
  const SCRAPBOOK_STORAGE_KEY = "shosai-scrapbook-v1";
  const SCRAPBOOK_PAGES_STORAGE_KEY = "shosai-scrapbook-pages-v1";
  const SCRAPBOOK_MAX_CARDS = 12;
  const SCRAPBOOK_INITIAL_SLOTS = 6;

  function defaultScrapbookTitle() {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日の紙面`;
  }

  function normalizeScrapbookClip(item) {
    if (!item || typeof item.id !== "string" || typeof item.text !== "string") return null;
    return {
      id: item.id,
      kind: item.kind === "build" ? "build" : "seed",
      title: typeof item.title === "string" ? item.title : "",
      recipe: typeof item.recipe === "string" ? item.recipe : "",
      text: item.text,
      // 紙面で本文を直しても、資料由来の元の種火は重複配布防止のため残す。
      sourceText: typeof item.sourceText === "string" ? item.sourceText : item.text,
      note: typeof item.note === "string" ? item.note : "",
      sources: Array.isArray(item.sources) ? item.sources.filter((id) => typeof id === "string") : [],
      bookSources: Array.isArray(item.bookSources)
        ? item.bookSources.filter((id) => typeof id === "string")
        : [],
      apparatusSources: Array.isArray(item.apparatusSources)
        ? item.apparatusSources.filter((id) => typeof id === "string")
        : [],
      inspiration: typeof item.inspiration === "string" ? item.inspiration : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    };
  }

  function cloneScrapbookItems(items) {
    return items.map((item) => ({
      ...item,
      sources: [...(item.sources || [])],
      bookSources: [...(item.bookSources || [])],
      apparatusSources: [...(item.apparatusSources || [])],
    }));
  }

  function loadScrapbook() {
    try {
      const saved = JSON.parse(localStorage.getItem(SCRAPBOOK_STORAGE_KEY) || "{}");
      const items = Array.isArray(saved.items)
        ? saved.items.map(normalizeScrapbookClip).filter(Boolean)
        : [];
      return {
        title: typeof saved.title === "string" && saved.title.trim() ? saved.title : defaultScrapbookTitle(),
        pageNote: typeof saved.pageNote === "string" ? saved.pageNote : "",
        activeSessionId: typeof saved.activeSessionId === "string" ? saved.activeSessionId : null,
        selectedIds: Array.isArray(saved.selectedIds) ? saved.selectedIds.filter((id) => typeof id === "string") : [],
        // 流した種火は「眠らせる」ものなので、開き直しても眠ったままにする
        discarded: Array.isArray(saved.discarded) ? saved.discarded.filter((t) => typeof t === "string") : [],
        items,
      };
    } catch (_) {
      return {
        title: defaultScrapbookTitle(),
        pageNote: "",
        activeSessionId: null,
        selectedIds: [],
        discarded: [],
        items: [],
      };
    }
  }

  function loadScrapbookPages() {
    try {
      const saved = JSON.parse(localStorage.getItem(SCRAPBOOK_PAGES_STORAGE_KEY) || "{}");
      if (!Array.isArray(saved.pages)) return [];
      return saved.pages
        .filter((page) => page && typeof page.id === "string")
        .map((page) => ({
          id: page.id,
          title: typeof page.title === "string" && page.title.trim() ? page.title : "無題の紙面",
          pageNote: typeof page.pageNote === "string" ? page.pageNote : "",
          items: Array.isArray(page.items) ? page.items.map(normalizeScrapbookClip).filter(Boolean) : [],
          selectedIds: Array.isArray(page.selectedIds) ? page.selectedIds.filter((id) => typeof id === "string") : [],
          createdAt: typeof page.createdAt === "string" ? page.createdAt : "",
          updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : "",
        }));
    } catch (_) {
      return [];
    }
  }

  function persistScrapbook() {
    try {
      localStorage.setItem(SCRAPBOOK_STORAGE_KEY, JSON.stringify({
        version: 2,
        title: seedState.pageTitle,
        pageNote: seedState.pageNote,
        activeSessionId: seedState.activeSessionId,
        selectedIds: [...seedState.selected],
        discarded: [...seedState.discarded],
        items: seedState.kept,
      }));
    } catch (_) {
      // ブラウザ保存が使えない場合も、開いている間の操作は続ける。
    }
  }

  function persistScrapbookPages() {
    try {
      localStorage.setItem(SCRAPBOOK_PAGES_STORAGE_KEY, JSON.stringify({
        version: 1,
        pages: seedState.pages,
      }));
    } catch (_) {
      // 保存済みページの一覧に書き込めない場合も、現在の紙面は開いている間は使える。
    }
  }

  function clipId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------- 制作机プロジェクト（端末内保存） ----------
  const DESK_PROJECTS_STORAGE_KEY = "shosai-desk-projects-v1";
  const SCENE_RELATION_LABELS = Object.freeze(["人物", "物", "光", "音", "背景"]);
  const TRANSFORM_ROW_LABELS = Object.freeze(["元の構造", "残す機能", "変更する条件", "避ける表面", "生まれた案"]);
  const BRIEF_FIELD_LABELS = Object.freeze([
    { key: "subject", label: "主題" },
    { key: "viewpoint", label: "視点と構図" },
    { key: "people", label: "人物数と距離" },
    { key: "objects", label: "主要な物" },
    { key: "background", label: "背景" },
    { key: "color", label: "色" },
    { key: "light", label: "光" },
    { key: "material", label: "素材感" },
    { key: "era", label: "時代感" },
    { key: "moment", label: "動きの瞬間" },
    { key: "lettering", label: "文字の有無" },
    { key: "avoid", label: "避けたい要素" },
  ]);
  const VISUAL_DIR_KEYS = Object.freeze(["A", "B", "C"]);
  const VISUAL_DIRECTION_PLACEHOLDERS = Object.freeze({
    A: "人物と物の関係を中心にする",
    B: "光と空間の変化を中心にする",
    C: "観客の視点と発見を中心にする",
  });
  const VISUAL_KIND_LABELS = Object.freeze({
    ai: "AI生成",
    self: "本人添付",
    external: "外部資料",
  });
  const FIRST_LOOK_STORAGE_KEY = "shosai-first-look-v1";
  const VISUAL_PROMPT_CAUTION =
    "実在作品の意匠・キャラクター・象徴を再現しない。構図上の機能・関係・光・時間・観客体験へ分解して扱う。";

  function stringOrEmpty(value) {
    return typeof value === "string" ? value : "";
  }

  function nullableString(value) {
    return typeof value === "string" && value.trim() ? value : null;
  }

  function validIso(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function normalizeStringArray(value) {
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  }

  function normalizePlacedEntries(value, fallbackAt) {
    const at = validIso(fallbackAt, new Date().toISOString());
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (typeof item === "string") {
        return { id: item, role: "near", note: "", at };
      }
      if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string") return null;
      return {
        id: item.id,
        role: item.role === "contrast" ? "contrast" : "near",
        note: stringOrEmpty(item.note),
        at: validIso(item.at, at),
      };
    }).filter(Boolean);
  }

  function normalizeDeskOrigin(origin) {
    if (!origin || typeof origin !== "object" || Array.isArray(origin)) return null;
    return {
      recipe: stringOrEmpty(origin.recipe),
      sources: normalizeStringArray(origin.sources),
      bookSources: normalizeStringArray(origin.bookSources),
      apparatusSources: normalizeStringArray(origin.apparatusSources),
      inspiration: stringOrEmpty(origin.inspiration),
    };
  }

  function normalizeScene(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const relations = SCENE_RELATION_LABELS.map((label, i) => {
      const row = Array.isArray(raw.relations) ? raw.relations[i] : null;
      return [label, Array.isArray(row) ? stringOrEmpty(row[1]) : ""];
    });
    const scene = {
      audience: stringOrEmpty(raw.audience),
      entry: stringOrEmpty(raw.entry),
      exit: stringOrEmpty(raw.exit),
      relations,
      removed: stringOrEmpty(raw.removed),
      undecided: stringOrEmpty(raw.undecided),
      next: stringOrEmpty(raw.next),
    };
    const hasText = [
      scene.audience,
      scene.entry,
      scene.exit,
      scene.removed,
      scene.undecided,
      scene.next,
      ...relations.map((row) => row[1]),
    ].some((text) => text.trim());
    return hasText ? scene : null;
  }

  function normalizeTransformation(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const rows = TRANSFORM_ROW_LABELS.map((label, i) => {
      const row = Array.isArray(raw.rows) ? raw.rows[i] : null;
      return [label, Array.isArray(row) ? stringOrEmpty(row[1]) : ""];
    });
    const transformation = {
      fromLabel: stringOrEmpty(raw.fromLabel),
      rows,
    };
    const hasText = [transformation.fromLabel, ...rows.map((row) => row[1])]
      .some((text) => text.trim());
    return hasText ? transformation : null;
  }

  function normalizeBrief(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const brief = {};
    BRIEF_FIELD_LABELS.forEach(({ key }) => {
      brief[key] = stringOrEmpty(raw[key]);
    });
    return BRIEF_FIELD_LABELS.some(({ key }) => brief[key].trim()) ? brief : null;
  }

  function normalizeDirections(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const directions = {};
    VISUAL_DIR_KEYS.forEach((key) => {
      const item = source[key] && typeof source[key] === "object" && !Array.isArray(source[key])
        ? source[key]
        : {};
      directions[key] = {
        label: stringOrEmpty(item.label),
        intent: stringOrEmpty(item.intent),
      };
    });
    return directions;
  }

  function normalizeFirstImpression(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || typeof raw.text !== "string") return null;
    return { text: raw.text, at: validIso(raw.at, new Date().toISOString()) };
  }

  function normalizeVisualMeta(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const visualMeta = {};
    VISUAL_DIR_KEYS.forEach((key) => {
      const item = source[key];
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        visualMeta[key] = null;
        return;
      }
      visualMeta[key] = {
        importedAt: validIso(item.importedAt, new Date().toISOString()),
        kind: Object.prototype.hasOwnProperty.call(VISUAL_KIND_LABELS, item.kind) ? item.kind : "ai",
        method: stringOrEmpty(item.method),
        prompt: stringOrEmpty(item.prompt),
        firstImpression: normalizeFirstImpression(item.firstImpression),
        revealed: item.revealed === true,
      };
    });
    return visualMeta;
  }

  function deepCopyJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeBranchOrigin(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (
      typeof raw.parentId !== "string" || !raw.parentId ||
      typeof raw.parentTitle !== "string" || !raw.parentTitle.trim() ||
      typeof raw.branchReason !== "string" || !raw.branchReason.trim() ||
      typeof raw.branchedAt !== "string" || !raw.branchedAt ||
      !raw.parentSnapshot || typeof raw.parentSnapshot !== "object" || Array.isArray(raw.parentSnapshot)
    ) return null;
    const snapshot = normalizeDeskProject(raw.parentSnapshot);
    if (!snapshot || snapshot.id !== raw.parentId) return null;
    return {
      parentId: raw.parentId,
      parentTitle: raw.parentTitle.trim(),
      branchReason: raw.branchReason.trim(),
      branchedAt: raw.branchedAt,
      parentSnapshot: deepCopyJson(snapshot),
    };
  }

  function firstLookEnabled() {
    try {
      return localStorage.getItem(FIRST_LOOK_STORAGE_KEY) !== "off";
    } catch (_) {
      return true;
    }
  }

  function setFirstLookEnabled(enabled) {
    try {
      localStorage.setItem(FIRST_LOOK_STORAGE_KEY, enabled ? "on" : "off");
    } catch (_) {
      // 設定保存ができない場合も、その場の表示は続ける。
    }
  }

  function hasBriefText(project) {
    const brief = normalizeBrief(project && project.brief);
    return !!brief;
  }

  function visualPromptText(project, dirKey) {
    const p = normalizeDeskProject(project);
    if (!p || !VISUAL_DIR_KEYS.includes(dirKey)) return "";
    const lines = [];
    if (p.sceneLine) lines.push(p.sceneLine);
    const dir = p.directions[dirKey] || { label: "", intent: "" };
    const directionText = [dir.label, dir.intent].filter((text) => text.trim()).join(" — ");
    if (directionText) lines.push(`方向: ${directionText}`);
    const brief = normalizeBrief(p.brief);
    if (brief) {
      BRIEF_FIELD_LABELS.forEach(({ key, label }) => {
        if (brief[key] && brief[key].trim()) lines.push(`${label}: ${brief[key]}`);
      });
    }
    const avoid = brief && brief.avoid && brief.avoid.trim() ? ` ${brief.avoid}` : "";
    lines.push(`${VISUAL_PROMPT_CAUTION}${avoid}`);
    return lines.join("\n");
  }

  function revealVisualSlot(project, dirKey, text) {
    if (!project || !VISUAL_DIR_KEYS.includes(dirKey)) return null;
    project.visualMeta = normalizeVisualMeta(project.visualMeta);
    const meta = project.visualMeta[dirKey];
    if (!meta) return null;
    const impression = stringOrEmpty(text);
    meta.firstImpression = impression.trim()
      ? { text: impression, at: new Date().toISOString() }
      : null;
    meta.revealed = true;
    project.visualMeta[dirKey] = meta;
    return meta;
  }

  function rowValue(rows, label) {
    const row = Array.isArray(rows) ? rows.find((item) => Array.isArray(item) && item[0] === label) : null;
    return row ? stringOrEmpty(row[1]) : "";
  }

  function briefDraftFromStudy(project) {
    const scene = normalizeScene(project && project.scene);
    const transformation = normalizeTransformation(project && project.transformation);
    const removed = scene ? stringOrEmpty(scene.removed) : "";
    const avoidSurface = transformation ? rowValue(transformation.rows, "避ける表面") : "";
    const avoid = [removed, avoidSurface].filter((text) => text.trim()).join("／");
    return {
      subject: "",
      viewpoint: "",
      people: scene ? rowValue(scene.relations, "人物") : "",
      objects: scene ? rowValue(scene.relations, "物") : "",
      background: scene ? rowValue(scene.relations, "背景") : "",
      color: "",
      light: scene ? rowValue(scene.relations, "光") : "",
      material: "",
      era: "",
      moment: "",
      lettering: "",
      avoid,
    };
  }

  function normalizeDeskProject(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const now = new Date().toISOString();
    const question = raw.question && typeof raw.question === "object" && !Array.isArray(raw.question)
      ? raw.question
      : {};
    const current = stringOrEmpty(question.current).trim() || stringOrEmpty(raw.title).trim() || "無題の問い";
    const sceneLineHistory = Array.isArray(raw.sceneLineHistory)
      ? raw.sceneLineHistory
          .filter((item) => item && typeof item === "object" && typeof item.text === "string")
          .map((item) => ({ text: item.text, at: validIso(item.at, now) }))
      : [];
    const constraints = Array.isArray(raw.constraints)
      ? raw.constraints
          .filter((item) => item && typeof item === "object" && typeof item.label === "string" && item.label.trim())
          .map((item) => ({ label: item.label.trim(), hard: item.hard === true }))
      : [];
    const decisions = {};
    if (raw.decisions && typeof raw.decisions === "object" && !Array.isArray(raw.decisions)) {
      Object.keys(raw.decisions).forEach((id) => {
        const decision = raw.decisions[id];
        if (!decision || typeof decision !== "object" || Array.isArray(decision)) return;
        decisions[id] = {
          verdict: typeof decision.verdict === "string" ? decision.verdict : null,
          reason: stringOrEmpty(decision.reason),
        };
      });
    }
    const createdAt = validIso(raw.createdAt, now);
    const placed = normalizePlacedEntries(raw.placed, createdAt);
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : clipId("proj"),
      title: stringOrEmpty(raw.title).trim() || (current.length > 14 ? current.slice(0, 14) + "…" : current),
      subtitle: stringOrEmpty(raw.subtitle),
      question: {
        previous: nullableString(question.previous),
        current,
      },
      sceneLine: nullableString(raw.sceneLine),
      sceneLineHistory,
      constraints,
      scene: normalizeScene(raw.scene),
      transformation: normalizeTransformation(raw.transformation),
      brief: normalizeBrief(raw.brief),
      directions: normalizeDirections(raw.directions),
      visualMeta: normalizeVisualMeta(raw.visualMeta),
      origin: normalizeDeskOrigin(raw.origin),
      branchOrigin: normalizeBranchOrigin(raw.branchOrigin),
      placed,
      decisions,
      createdAt,
      updatedAt: validIso(raw.updatedAt, createdAt),
    };
  }

  function buildBranchProject(parent, reason) {
    const normalizedParent = normalizeDeskProject(parent);
    const branchReason = stringOrEmpty(reason).trim();
    if (!normalizedParent || !branchReason) return null;
    const now = new Date().toISOString();
    const parentSnapshot = deepCopyJson(normalizedParent);
    const branch = deepCopyJson(normalizedParent);
    branch.id = clipId("proj");
    branch.createdAt = now;
    branch.updatedAt = now;
    branch.branchOrigin = {
      parentId: normalizedParent.id,
      parentTitle: normalizedParent.title,
      branchReason,
      branchedAt: now,
      parentSnapshot,
    };
    return normalizeDeskProject(branch);
  }

  function confidenceLabel(raw) {
    const value = stringOrEmpty(raw).toLowerCase();
    if (value.startsWith("high")) return "高";
    if (value.startsWith("medium")) return "中";
    if (value.startsWith("low")) return "低";
    return "不明";
  }

  const SHELF_SEARCH_FIELDS = Object.freeze([
    "title",
    "original_title",
    "company",
    "genre",
    "summary",
    "themes",
    "tone",
    "structure",
    "signature_scenes",
    "show_type",
  ]);

  function searchTextParts(work, field) {
    const value = work ? work[field] : null;
    if (Array.isArray(value)) return value.map((item) => stringOrEmpty(item));
    return [stringOrEmpty(value)];
  }

  function searchShelfWorks(works, query) {
    const terms = stringOrEmpty(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!Array.isArray(works) || !terms.length) return [];
    return works.map((work) => {
      const fieldTexts = SHELF_SEARCH_FIELDS.map((field) => searchTextParts(work, field).join(" ").toLowerCase());
      const termMatched = terms.every((term) => fieldTexts.some((text) => text.includes(term)));
      if (!termMatched) return null;
      const hits = fieldTexts.reduce((count, text) => count + (terms.some((term) => text.includes(term)) ? 1 : 0), 0);
      return { work, hits };
    }).filter(Boolean).sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return (Number(b.work.year) || 0) - (Number(a.work.year) || 0);
    });
  }

  function loadDeskProjects() {
    try {
      const saved = JSON.parse(localStorage.getItem(DESK_PROJECTS_STORAGE_KEY) || "{}");
      return Array.isArray(saved.projects)
        ? saved.projects.map(normalizeDeskProject).filter(Boolean)
        : [];
    } catch (_) {
      return [];
    }
  }

  function persistDeskProjects() {
    try {
      localStorage.setItem(DESK_PROJECTS_STORAGE_KEY, JSON.stringify({
        version: 1,
        projects: state.deskProjects,
      }));
    } catch (_) {
      // ブラウザ保存が使えない場合も、開いている間の操作は続ける。
    }
  }

  function syncCurrentDeskProject() {
    if (!state.project || state.project.kind !== "new") return;
    const now = new Date().toISOString();
    const data = state.project.data;
    data.placed = [...state.placed].map((id) => {
      const meta = state.placedMeta.get(id) || {};
      return {
        id,
        role: meta.role === "contrast" ? "contrast" : "near",
        note: stringOrEmpty(meta.note),
        at: validIso(meta.at, now),
      };
    });
    data.decisions = state.decisions;
    data.directions = normalizeDirections(data.directions);
    data.visualMeta = normalizeVisualMeta(data.visualMeta);
    data.updatedAt = now;
    const normalized = normalizeDeskProject(data);
    if (!normalized) return;
    state.project.data = normalized;
    const i = state.deskProjects.findIndex((p) => p.id === normalized.id);
    if (i >= 0) state.deskProjects[i] = normalized;
    else state.deskProjects.unshift(normalized);
    persistDeskProjects();
    renderDeskProjectList();
  }

  state.deskProjects = loadDeskProjects();

  const loadedScrapbook = loadScrapbook();
  const seedState = {
    dealt: [],      // いま左側にめくられているカード
    kept: loadedScrapbook.items, // 右側の紙面。端末内に保存する。
    discarded: new Set(loadedScrapbook.discarded), // 流した種火。眠らせたまま保存する
    wakePool: new Set(), // 眠りから起こした資料の「別の読み方」。次の配布で先に配る
    selected: new Set(loadedScrapbook.selectedIds.filter((id) => loadedScrapbook.items.some((item) => item.id === id)).slice(0, 3)),
    pageTitle: loadedScrapbook.title,
    pageNote: loadedScrapbook.pageNote,
    activeSessionId: loadedScrapbook.activeSessionId,
    pages: loadScrapbookPages(),
    newClipId: null,
    notice: "",
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- 種火の自動生成 ----------
   *
   * 設計計画書 5節の10レシピを、実際の変換として実装する。以前はテーマ語（"記憶"
   * "childhood" 等の概念名詞）をテンプレートへ流し込んでいたため、どのレシピも同じ
   * 穴埋め文になっていた。レシピ名がラベルにすぎない状態だった。
   *
   * 素材を具体的な像へ入れ替えた。正本の中で像を持つのは次の4つ:
   *   elements[].facets.movement       身体の動き。「→」で手順を書いたものが特に強い
   *   elements[].facets.visual_grammar 物・視覚
   *   works[].signature_scenes         すでに一行場面の形をしている
   *   works[].set_mechanics            物と機構。数値・部材名まで入る
   * テーマ・トーン・useful_for は概念語しか持たないので使わない。
   *
   * 各レシピは異なる素材と異なる操作を持つ。文末には必ず介入の余白を1か所残す
   * （完成させない。本人が「ここを変えたい」と入れる場所を作る）。
   * 生成は決定論的にする（同じ正本なら同じ種火。再現できないと出どころを辿れない）。
   */
  let expandedSeedCache = null;

  // 正本は事実と解釈を分ける方針なので、具体系フィールドにも「〜は未確認」「公式の入口」
  // のような索引側のメタ記述が混ざる。像ではないので種火の素材からは落とす。
  const SEED_HEDGE = new RegExp([
    "未確認", "未詳", "未調査", "確認しない", "確認できない", "確定できない",
    "not_checked", "not_applicable", "unconfirmed", "official",
    "公式", "しない", "仕様", "はない", "は無い",
    "分けて記録", "として記録", "本索引", "credit", "記述はない", "になし", "は不明",
  ].join("|"));

  // 索引としての補足（「（…はMDになし）」「（Michel Crête）」）が末尾に付く項目がある。
  // 場面の像ではないので、長い括弧書きは落としてから使う。短い括弧は意味を担うので残す。
  const stripAside = (s) => s
    .replace(/[（(][^）)]{12,}[）)]/g, "")
    .replace(/^[A-Za-z][A-Za-z ]{2,}[:：]\s*/, "")   // "Structure: ..." のような索引側のラベル
    .replace(/\s{2,}/g, " ").trim();

  // 日本語の文へ埋める素材なので、日本語を含まない統制語彙（"dance" "noh acting"
  // "opera staging"）は落とす。そのまま埋めると読める文にならない。
  const HAS_JA = /[ぁ-んァ-ヶ一-龠]/;

  // 正本には配列で入る項目とまれに文字列で入る項目が混在する（set_mechanics 等）。
  // 生成側で吸収する。正本は読み取り専用なので、こちらで直す。
  const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  // 日本語の中に英語句がまとまって残っている素材（"授賞式telecastをunderground
  // clubへ変える"）は、日本語の一行場面として読めない。固有名詞程度なら残す。
  const LONG_ENGLISH = /[A-Za-z][A-Za-z ]{9,}/;

  function seedUsable(value, minLen) {
    const s = stripAside(String(value || "").replace(/\s+/g, " ").trim());
    if (s.length < minLen || s.length > 120) return "";
    if (!HAS_JA.test(s) || LONG_ENGLISH.test(s)) return "";
    return SEED_HEDGE.test(s) ? "" : s;
  }

  // 「→」手順の一段として自立しているか。断片や英語だけの段は組み替えに使えない
  const usableStep = (s) => s.length >= 4 && s.length <= 60 && HAS_JA.test(s) && !SEED_HEDGE.test(s);

  // 物を扱うレシピ（素材起点・機能の継承・制約強化・関係再配線）は、触れる物が
  // 見えていないと成立しない。「サーカスと劇場の接続」のような関係の要約ではなく、
  // 「100脚のデッキチェア」の側だけを通すための足切り。
  const OBJECT_WORD = new RegExp([
    "椅子", "机", "テーブル", "台", "板", "箱", "扉", "窓", "壁", "床", "天井", "階段",
    "水", "水面", "布", "糸", "紐", "縄", "ロープ", "網", "鏡", "梯子", "はしご", "棒", "ポール",
    "球", "ボール", "輪", "車", "紙", "石", "砂", "火", "煙", "霧", "雪", "羽", "花",
    "木", "鉄", "金属", "ガラス", "陶", "人形", "パペット", "楽器", "食器", "皿", "鍋",
    "ベッド", "パイプ", "歯車", "機械", "装置", "ブランコ", "スイング", "プール", "噴水",
    "衣装", "帽子", "靴", "傘", "旗", "本", "手紙", "写真", "照明", "灯", "ランプ", "幕",
  ].join("|"));

  // 決定論的に配列から選ぶ。index と塩で散らす
  const pick = (arr, i, salt) => arr[(i * 31 + salt * 17) % arr.length];

  // 文末の介入余白。ここを本人が触る前提で開けておく
  // 文末に足す介入の余白。付箋に収める前提なので短く保つ。
  // 入る余地があるときだけ足す（fit）。文自体が既に未完成なら無くてよい。
  const OPENINGS = [
    "何で見せるかは未定。",
    "どちらを残すかは未定。",
    "終わり方は未定。",
    "人数は未定。",
    "物は替えてよい。",
    "気づく位置は動かせる。",
  ];

  // 付箋の本文欄はおよそ3行。手書きの種火60件も27〜68字（中央58字）に収まっている。
  // 同じ幅に合わせる。長い素材は句読点で切り、細部を落として抽象度を上げる。
  const SEED_MAX = 62;

  // 長い素材は句読点の位置で詰める。日本語は語の途中で切ると壊れる（「互いへ近。」
  // 「持ちながらを反転させる」）ので、切れる位置が無ければその素材は使わない。
  // 素材の在庫は足りているので、無理に詰めるより捨てた方がよい。
  // 読点で切ると助詞で終わることがある（「新曲を」「準備と」）。名詞止めへ直す。
  const trim助詞 = (s) => s.replace(/[。、：:・]+$/, "").replace(/[とをがはへでにもや]$/, "");

  function brief(text, max) {
    const t = trim助詞(String(text || "").replace(/\s+/g, " ").trim());
    if (t.length <= max) return t;
    const head = t.slice(0, max + 1);
    const at = Math.max(head.lastIndexOf("。"), head.lastIndexOf("、"));
    if (at < Math.floor(max * 0.5)) throw new Error("skip");
    const cut = trim助詞(t.slice(0, at));
    if (cut.length < Math.floor(max * 0.4)) throw new Error("skip");
    return cut;
  }

  // 余白句は、足しても付箋からはみ出さないときだけ付ける
  const fit = (body, opening) => {
    const b = String(body).replace(/\s+/g, " ").trim();
    return opening && b.length + opening.length <= SEED_MAX ? `${b}${opening}` : b;
  };

  function seedMaterials() {
    const db = typeof SHOSAI_DB !== "undefined" ? SHOSAI_DB : null;
    if (!db || !Array.isArray(db.works)) return null;

    const workById = new Map(db.works.map((w) => [w.id, w]));
    const byId = (id) => workById.get(id);
    // 要素から参照作品を引く（出どころを必ず辿れるようにする）
    const elementWork = (el) => {
      const links = asList(el.work_links);
      for (const l of links) {
        const w = byId(l.work_id);
        if (w) return w;
      }
      return null;
    };

    const els = (Array.isArray(db.elements) ? db.elements : [])
      .filter((e) => e && e.facets)
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const withMovement = [];
    const withArrow = [];   // 「→」で手順が書かれたもの。時間の組み替えに直結する
    const withObject = [];
    const withThing = [];   // 触れる物が見えているもの
    els.forEach((e) => {
      const w = elementWork(e);
      if (!w) return;
      const mv = asList(e.facets.movement).map((v) => seedUsable(v, 12)).filter(Boolean);
      const vg = asList(e.facets.visual_grammar).map((v) => seedUsable(v, 10)).filter(Boolean);
      const label = e.label_ja || e.label || "";
      if (mv.length) {
        const entry = { el: e, work: w, label, mv, vg, type: e.type };
        // 手順（→）は時間の組み替え専用にする。単発の動きと混ぜると文が長くなりすぎる
        if (mv.some((m) => m.includes("→"))) withArrow.push(entry);
        else withMovement.push(entry);
      }
      if (vg.length) withObject.push({ el: e, work: w, label, mv, vg, type: e.type });

      // 触れる物が見えている記述を、物を扱うレシピへ回す。
      // visual_grammar は英語の統制語彙が多く日本語のものが少ないため、要素の概要
      // （日本語で書かれ、物と動作を含む）も同じ資格で拾う。
      const summary = seedUsable(e.summary, 16);
      const thing = vg.find((v) => OBJECT_WORD.test(v))
        || (summary && OBJECT_WORD.test(summary) ? summary : "");
      if (thing) {
        withThing.push({
          el: e, work: w, label, mv, type: e.type,
          vg: [thing].concat(vg.filter((v) => v !== thing)),
        });
      }
    });

    const scenes = [];      // すでに一行場面の形をしている
    const mechanics = [];   // 物と機構
    const apparatus = [];   // 器具・技法の名詞
    const learnings = [];   // 変換規則として使える操作の指示
    db.works.forEach((w) => {
      if (!w || !w.id || !w.title) return;
      asList(w.signature_scenes).forEach((v) => {
        const s = seedUsable(v, 24);
        if (s) scenes.push({ work: w, text: s });
      });
      asList(w.set_mechanics).forEach((v) => {
        const s = seedUsable(v, 20);
        if (s && OBJECT_WORD.test(s)) mechanics.push({ work: w, text: s });
      });
      asList(w.apparatus_or_disciplines).forEach((v) => {
        const s = seedUsable(v, 4);
        if (s && s.length <= 40) apparatus.push({ work: w, text: s });
      });
      asList(w.production_learning).forEach((v) => {
        const s = seedUsable(v, 20);
        if (s) learnings.push({ work: w, text: s });
      });
    });

    const rel = (Array.isArray(db.element_relations) ? db.element_relations : [])
      .filter((r) => r && r.different_axes && r.different_axes.length)
      .map((r) => {
        const from = els.find((e) => e.id === r.from) || null;
        const to = els.find((e) => e.id === r.to) || null;
        return { r, from, to };
      })
      .filter((x) => x.from && x.to && elementWork(x.from) && elementWork(x.to));

    return { withMovement, withArrow, withObject, withThing, scenes, mechanics, apparatus, learnings, rel, elementWork };
  }

  // 10レシピ。各要素は { name, stock, make }。make は素材から1件の種火を作る
  // 10レシピ。各要素は { name, dist, stock, make }。make は素材から1件の種火を作る。
  // 文は付箋に収める（SEED_MAX）。レシピ名はカード上に別途出るので、文中で操作を
  // 長く説明しない。素材は brief で詰め、細部を落として想像の余地を残す。
  function seedRecipes(m) {
    // 「→」の手順を段へ分ける。自立していない段が混じる行は使わない
    const arrowSteps = (entry) => {
      const line = entry.mv.find((x) => x.includes("→")) || "";
      const raw = line.split("→").map((s) => s.trim()).filter(Boolean);
      if (raw.length < 2 || !raw.every(usableStep)) throw new Error("skip");
      return raw;
    };

    return [
      {
        // 観客に起こす効果だけ残し、手段を別作品の物へ交換する
        name: "機能保存・手段交換",
        dist: "near",
        stock: () => Math.min(m.scenes.length, m.withThing.length),
        make: (i) => {
          const s = pick(m.scenes, i, 1);
          let a = pick(m.withThing, i, 7);
          if (a.work.id === s.work.id) a = pick(m.withThing, i + 1, 7);
          return {
            text: fit(`${brief(s.text, 28)}。効果だけ残し、${brief(a.vg[0], 14)}へ替える。`, pick(OPENINGS, i, 2)),
            sources: [s.work.id, a.work.id],
            inspiration: `「${s.work.title}」の場面から観客に起こる効果だけを抽出し、手段を「${a.work.title}」の${a.label}が持つ物の側へ交換した。`,
          };
        },
      },
      {
        // 対照軸を1つだけ反転する
        name: "軸反転",
        dist: "alien",
        stock: () => m.rel.length,
        make: (i) => {
          const x = pick(m.rel, i, 3);
          const wa = m.elementWork(x.from);
          const wb = m.elementWork(x.to);
          const axis = asList(x.r.different_axes)
            .map((v) => stripAside(String(v || "").replace(/\s+/g, " ").trim()))
            .find((v) => usableStep(v) && !v.includes(wa.title) && !v.includes(wb.title));
          if (!axis) throw new Error("skip");
          const la = brief(stripAside(x.from.label_ja || x.from.label || ""), 16);
          const lb = brief(stripAside(x.to.label_ja || x.to.label || ""), 16);
          if (!la || !lb) throw new Error("skip");
          return {
            text: fit(`「${la}」と「${lb}」。${brief(axis, 24)}を反転させる。`, pick(OPENINGS, i, 4)),
            sources: [wa.id, wb.id],
            inspiration: `正本の要素関係（${x.r.relation_type}）が記録している対照軸を、そのまま反転の指示に読み替えた。反転するのはこの軸1本だけで、人数・空間・道具は据え置く。`,
          };
        },
      },
      {
        // 共通の動作の中で二つの動きを衝突させる
        name: "異種衝突",
        dist: "alien",
        stock: () => Math.floor(m.withMovement.length / 2),
        make: (i) => {
          const a = pick(m.withMovement, i, 5);
          let b = pick(m.withMovement, i, 23);
          if (b.work.id === a.work.id) b = pick(m.withMovement, i + 1, 23);
          return {
            text: `${brief(a.mv[0], 20)}と${brief(b.mv[0], 20)}を同時に起こす。片方が進むと片方が壊れる。`,
            sources: [a.work.id, b.work.id],
            inspiration: `「${a.work.title}」の${a.label}と「${b.work.title}」の${b.label}から、動きだけを取り出して衝突させた。作品の世界観や意匠は引き継がない。`,
          };
        },
      },
      {
        // 極端な制約を課し、制約が生む見え方を主役にする
        name: "制約強化",
        dist: "mid",
        stock: () => m.withThing.length,
        make: (i) => {
          const a = pick(m.withThing, i, 11);
          const limits = [
            "床から足を離さない", "音を出さない", "同じ場所から動かない",
            "両手を使えない", "明かりは一つ", "背を向けたまま",
          ];
          return {
            text: fit(`${brief(a.vg[0], 30)}。ただし${pick(limits, i, 9)}。`, pick(OPENINGS, i, 5)),
            sources: [a.work.id],
            inspiration: `「${a.work.title}」の${a.label}が持つ物の配置を、極端な制約の下に置いた。制約を克服する話ではなく、制約が生む見え方を主役にする。`,
          };
        },
      },
      {
        // 観客の誤解から始め、遅れて意味が反転する
        name: "認識遅延",
        dist: "mid",
        stock: () => m.scenes.length,
        make: (i) => {
          const s = pick(m.scenes, i, 13);
          const delays = ["終わった後", "二度目", "誰かが去った後", "明かりが変わる瞬間"];
          return {
            text: fit(`${brief(s.text, 32)}。意味が反転するのは${pick(delays, i, 3)}。`, pick(OPENINGS, i, 3)),
            sources: [s.work.id],
            inspiration: `「${s.work.title}」の場面の構造だけを借り、観客の理解が遅れて反転する形へ組み替えた。元の物語や人物は使わない。`,
          };
        },
      },
      {
        // 見た目ではなく物の挙動から始める
        name: "素材起点",
        dist: "near",
        stock: () => m.mechanics.length,
        make: (i) => {
          const k = pick(m.mechanics, i, 17);
          return {
            text: fit(`${brief(k.text, 36)}。この挙動だけから始める。`, pick(OPENINGS, i, 0)),
            sources: [k.work.id],
            inspiration: `「${k.work.title}」の舞台機構から、物がどう振る舞うかだけを抽出した。同じ規模・同じ形で作ることは目的にしない。`,
          };
        },
      },
      {
        // 「AがBを操る」を組み替える
        name: "関係再配線",
        dist: "alien",
        stock: () => m.withThing.length,
        make: (i) => {
          const e = pick(m.withThing, i, 19);
          const wires = [
            "操る側と操られる側を入れ替える",
            "第三のものを介してしか触れられなくする",
            "観客の動きが関係を決める",
            "関係を一方向にしか進ませない",
          ];
          return {
            text: fit(`${brief(e.vg[0], 28)}。${pick(wires, i, 7)}。`, pick(OPENINGS, i, 4)),
            sources: [e.work.id],
            inspiration: `「${e.work.title}」の${e.label}が持つ物と身体の配置から、関係の線だけを取り出して繋ぎ直した。`,
          };
        },
      },
      {
        // 同じ手順を、遅延・反復・逆順・欠落で組み直す
        name: "時間再編集",
        dist: "near",
        stock: () => m.withArrow.length,
        make: (i) => {
          const e = pick(m.withArrow, i, 29);
          const steps = arrowSteps(e).map((x) => brief(x, 20));
          const seq = steps.join(" → ");
          const edits = [
            () => `${seq}。毎回どれか一つが欠ける。何が欠けたかは言わない。`,
            () => `${seq}。5回繰り返し、回ごとに一つずつ遅れていく。`,
            () => (steps.length >= 3
              ? `${steps.slice().reverse().join(" → ")}。逆から進み、原因が最後に来る。`
              : `${seq}。この間を引き伸ばし、待つ時間を本体にする。`),
            () => `${seq}。10秒に圧縮し、次は3分かけて同じことをする。`,
          ];
          return {
            text: pick(edits, i, 5)(),
            sources: [e.work.id],
            inspiration: `「${e.work.title}」の${e.label}に記録された手順を、時間の操作だけで組み直した。動作そのものは変えていない。`,
          };
        },
      },
      {
        // 中心の物を消し、役割を別の担い手へ渡す
        name: "機能の継承",
        dist: "mid",
        stock: () => m.withThing.length,
        make: (i) => {
          const e = pick(m.withThing, i, 31);
          const heirs = ["身体", "光", "音", "床", "布", "視線"];
          return {
            text: fit(`${brief(e.vg[0], 26)}を消し、役割を${pick(heirs, i, 11)}へ渡す。無くなったことに触れない。`, ""),
            sources: [e.work.id],
            inspiration: `「${e.work.title}」の${e.label}から中心の物を取り除き、その機能だけを別の担い手へ移した。`,
          };
        },
      },
      {
        // 痕跡や結果を先に見せ、原因を後から発見させる
        name: "結果先出し",
        dist: "mid",
        stock: () => m.withArrow.length,
        make: (i) => {
          const e = pick(m.withArrow, i, 37);
          const steps = arrowSteps(e);
          return {
            text: fit(`「${brief(steps[steps.length - 1], 18)}」の後から始める。原因の「${brief(steps[0], 16)}」は後で起きる。`, pick(OPENINGS, i, 1)),
            sources: [e.work.id],
            inspiration: `「${e.work.title}」の${e.label}の手順から、結果を先頭へ、原因を後半へ入れ替えた。`,
          };
        },
      },
    ];
  }

  function expandedSeedCatalog() {
    if (expandedSeedCache) return expandedSeedCache;
    const m = seedMaterials();
    if (!m) return (expandedSeedCache = []);
    const recipes = seedRecipes(m);

    // レシピごとに、素材の在庫に応じて作る。素材が薄いレシピは無理に埋めない。
    // 詰められない素材（句読点が無く語の途中でしか切れないもの）は捨てて次を試すため、
    // 目標に届くまで別の素材を引き直す。上限を置いて空回りを防ぐ。
    const PER_RECIPE_MAX = 22;
    const out = [];
    recipes.forEach((recipe, ri) => {
      const stock = recipe.stock();
      const target = Math.max(0, Math.min(PER_RECIPE_MAX, stock));
      let made = 0;
      for (let i = 0; made < target && i < target * 8 + 40; i++) {
        let built = null;
        try {
          built = recipe.make(i * 3 + ri);
        } catch (e) {
          continue; // 詰められない・形が想定と違う素材は飛ばして次を引く
        }
        if (!built || !built.text) continue;
        const sources = (built.sources || []).filter(Boolean);
        out.push({
          id: `expanded-seed-${String(ri + 1).padStart(2, "0")}-${String(made + 1).padStart(2, "0")}`,
          recipe: recipe.name,
          dist: recipe.dist,
          text: built.text.replace(/\s+/g, " ").trim(),
          sources: Array.from(new Set(sources)),
          inspiration: built.inspiration,
        });
        made++;
      }
    });

    // 同じ文面が二度配られないようにする
    const seen = new Set();
    expandedSeedCache = out.filter((s) => {
      if (seen.has(s.text)) return false;
      seen.add(s.text);
      return true;
    });
    return expandedSeedCache;
  }

  function seedCatalog() {
    const bookSeeds = typeof SHOSAI_BOOK_SEEDS !== "undefined" && Array.isArray(SHOSAI_BOOK_SEEDS)
      ? SHOSAI_BOOK_SEEDS
      : [];
    return (Array.isArray(SHOSAI.seeds) ? SHOSAI.seeds : [])
      .concat(bookSeeds, expandedSeedCatalog());
  }

  function seedProvenanceHtml(seed) {
    const workSources = Array.isArray(seed.sources) ? seed.sources : [];
    const bookSources = Array.isArray(seed.bookSources) ? seed.bookSources : [];
    const apparatusSources = Array.isArray(seed.apparatusSources) ? seed.apparatusSources : [];
    if (!workSources.length && !bookSources.length && !apparatusSources.length) return "";

    const sourceLinks = workSources
      .map((id) => {
        const work = DB && DB.works.find((w) => w.id === id);
        if (!work) return `<li><span class="seed-source-missing">${esc(id)}（正本内で未解決）</span></li>`;
        const meta = [work.company, work.year].filter(Boolean).join(" / ");
        return `<li>
          <a href="#db/${encodeURIComponent(work.id)}">${esc(work.title)}</a>
          ${meta ? `<span>${esc(meta)}</span>` : ""}
        </li>`;
      })
      .join("");
    const books = typeof SHOSAI_BOOK_SOURCES !== "undefined" ? SHOSAI_BOOK_SOURCES : {};
    const bookLinks = bookSources
      .map((id) => {
        const book = books[id];
        if (!book) return `<li><span class="seed-source-missing">${esc(id)}（蔵書要約内で未解決）</span></li>`;
        return `<li>
          <strong>${esc(book.title)}</strong>
          <span>${esc(book.category)} / 確認済みの内容要約から抽象化</span>
        </li>`;
      })
      .join("");
    const workSection = sourceLinks
      ? `<p class="seed-provenance-label">参照作品（正本DB）</p><ul>${sourceLinks}</ul>`
      : "";
    const bookSection = bookLinks
      ? `<p class="seed-provenance-label">参照した自炊本</p><ul>${bookLinks}</ul>`
      : "";
    const apparatusLinks = apparatusSources
      .map((id) => {
        const card = apparatusCards().find((item) => item.id === id);
        if (!card) return `<li><span class="seed-source-missing">${esc(id)}（舞台技術DB内で未解決）</span></li>`;
        return `<li><a href="#apparatus/${encodeURIComponent(card.id)}">${esc(card.name_ja)}</a><span>${esc(card.family)} / 調査ドラフト</span></li>`;
      })
      .join("");
    const apparatusSectionHtml = apparatusLinks
      ? `<p class="seed-provenance-label">参照した舞台技術</p><ul>${apparatusLinks}</ul>`
      : "";
    return `
      <details class="seed-provenance">
        <summary>資料からの変形を見る</summary>
        <div class="seed-provenance-body">
          ${workSection}
          ${bookSection}
          ${apparatusSectionHtml}
          <p class="seed-transform"><span>変形メモ（解釈）</span>${esc(seed.inspiration || "変形メモは未記入です。")}</p>
        </div>
      </details>`;
  }

  function addToScrapbook(seed, notice) {
    if (!seed || !seed.text) return null;
    const existing = seedState.kept.find((item) => item.kind === "seed" && (item.sourceText || item.text) === seed.text);
    if (existing) {
      seedState.selected.add(existing.id);
      seedState.notice = "すでに紙面にあります。材料として選びました。";
      persistScrapbook();
      return { id: existing.id, existing: true };
    }
    if (seedState.kept.length >= SCRAPBOOK_MAX_CARDS) {
      seedState.notice = "この紙面は12枚までです。不要な付箋を外すか、新しいページを始めてください。";
      return null;
    }
    const clip = {
      id: clipId("clip"),
      kind: "seed",
      title: "",
      recipe: seed.recipe || "資料から変形したアイデア",
      text: seed.text,
      sourceText: seed.text,
      note: "",
      sources: Array.isArray(seed.sources) ? seed.sources : [],
      bookSources: Array.isArray(seed.bookSources) ? seed.bookSources : [],
      apparatusSources: Array.isArray(seed.apparatusSources) ? seed.apparatusSources : [],
      inspiration: seed.inspiration || "",
      createdAt: new Date().toISOString(),
    };
    seedState.kept.unshift(clip);
    seedState.selected.add(clip.id);
    seedState.notice = notice || "紙面へ貼りました。材料として選ばれています。";
    persistScrapbook();
    return { id: clip.id, existing: false };
  }

  function flashScrapbookCard(id) {
    if (!id) return;
    seedState.newClipId = id;
    const card = $$('[data-scrap-card]').find((item) => item.dataset.scrapCard === id);
    if (card) card.classList.add("is-new");
    window.setTimeout(() => {
      const current = $$('[data-scrap-card]').find((item) => item.dataset.scrapCard === id);
      if (current) current.classList.remove("is-new");
      if (seedState.newClipId === id) seedState.newClipId = null;
    }, 720);
  }

  function sessionDateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "日時未記録";
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function setScrapbookPagePicker(open, focusToggle = false) {
    const picker = $("#scrapbook-page-picker");
    const toggle = $("#btn-scrapbook-pages");
    if (!picker || !toggle) return;
    picker.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (focusToggle) toggle.focus();
  }

  function saveScrapbookPage() {
    const now = new Date().toISOString();
    const title = seedState.pageTitle.trim() || defaultScrapbookTitle();
    const current = seedState.pages.find((page) => page.id === seedState.activeSessionId);
    const page = {
      id: current ? current.id : clipId("page"),
      title,
      pageNote: seedState.pageNote,
      items: cloneScrapbookItems(seedState.kept),
      selectedIds: [...seedState.selected],
      createdAt: current ? current.createdAt : now,
      updatedAt: now,
    };
    const index = seedState.pages.findIndex((item) => item.id === page.id);
    if (index >= 0) seedState.pages.splice(index, 1, page);
    else seedState.pages.unshift(page);
    seedState.activeSessionId = page.id;
    seedState.pageTitle = title;
    seedState.notice = `「${title}」を保存しました。`;
    persistScrapbook();
    persistScrapbookPages();
    renderSeeds();
  }

  /* 紙面をJSONへ書き出す。localStorageの中はAIから読めないので、
     ファイルにして渡す（2026-07-30 種火→演目構成 設計メモの段階0）。
     変換の決めごとは設計メモが正本。ここは事実（貼った・組んだ・書いた）だけを出す。 */
  function exportScrapbookPage() {
    const items = seedState.kept.slice(0, SCRAPBOOK_MAX_CARDS);
    const status = $("#scrapbook-save-status");
    if (!items.length) {
      if (status) status.textContent = "書き出す付箋がありません。まず紙面に貼ってください。";
      return;
    }
    const title = seedState.pageTitle.trim() || "無題の紙面";
    const payload = {
      format: "shosai-scrapbook-page",
      version: 1,
      exportedAt: new Date().toISOString(),
      title,
      pageNote: seedState.pageNote || "",
      // 変換規則の正本。AIはこのPLAYBOOKの決めごとに従ってビート表へ変換する
      conversionGuide: "shosai-app/mcp-server/PLAYBOOK.md",
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind === "build" ? "combined" : "seed",   // combined=組んだアイデア（転の候補）
        recipe: item.recipe || "",
        title: item.title || "",
        text: item.text || "",
        note: item.note || "",
        sources: Array.isArray(item.sources) ? item.sources : [],
        bookSources: Array.isArray(item.bookSources) ? item.bookSources : [],
        apparatusSources: Array.isArray(item.apparatusSources) ? item.apparatusSources : [],
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `紙面-${title}.json`.replace(/[\\/:*?"<>|]/g, "_");
    a.click();
    URL.revokeObjectURL(a.href);
    if (status) status.textContent = `「${title}」をJSONで書き出しました。AIに渡すと演目構成の下書きに変換できます。`;
  }

  function openScrapbookPage(id) {
    const page = seedState.pages.find((item) => item.id === id);
    if (!page) return;
    seedState.kept = cloneScrapbookItems(page.items).slice(0, SCRAPBOOK_MAX_CARDS);
    seedState.selected = new Set(page.selectedIds.filter((item) => seedState.kept.some((clip) => clip.id === item)).slice(0, 3));
    seedState.pageTitle = page.title;
    seedState.pageNote = page.pageNote;
    seedState.activeSessionId = page.id;
    seedState.dealt = [];
    seedState.notice = `保存済みページ「${page.title}」を開きました。`;
    setScrapbookPagePicker(false);
    persistScrapbook();
    renderSeeds();
  }

  // 保存していない紙面が消えるときだけ確認する。空の紙面や保存済みの紙面では聞かない。
  function scrapbookHasUnsavedWork() {
    if (!seedState.kept.length) return false;
    const saved = seedState.pages.find((page) => page.id === seedState.activeSessionId);
    if (!saved) return true; // 一度も保存していない
    return JSON.stringify(saved.items) !== JSON.stringify(seedState.kept)
      || saved.title !== seedState.pageTitle
      || saved.pageNote !== seedState.pageNote;
  }

  function startNewScrapbookPage() {
    if (scrapbookHasUnsavedWork()
      && !window.confirm(`いまの紙面（付箋${seedState.kept.length}枚）は保存されていません。\n新しいページを始めると、この紙面は消えます。`)) {
      return;
    }
    seedState.kept = [];
    seedState.selected = new Set();
    seedState.pageTitle = defaultScrapbookTitle();
    seedState.pageNote = "";
    seedState.activeSessionId = null;
    seedState.dealt = [];
    seedState.notice = "新しい空の紙面を始めました。前のページは保存済み一覧から開けます。";
    setScrapbookPagePicker(false);
    persistScrapbook();
    renderSeeds();
  }

  function deleteScrapbookPage(id) {
    const page = seedState.pages.find((item) => item.id === id);
    if (!page) return;
    if (!window.confirm(`保存済みページ「${page.title}」（付箋${page.items.length}枚）を一覧から削除します。\nこの操作は元に戻せません。`)) return;
    seedState.pages = seedState.pages.filter((item) => item.id !== id);
    if (seedState.activeSessionId === id) seedState.activeSessionId = null;
    seedState.notice = `保存済みページ「${page.title}」を一覧から外しました。現在の紙面は残っています。`;
    persistScrapbook();
    persistScrapbookPages();
    renderSeeds();
  }

  function selectedScrapbookItems() {
    return seedState.kept.filter((item) => seedState.selected.has(item.id));
  }

  function toggleScrapbookMaterial(id, checked) {
    if (checked && !seedState.selected.has(id) && seedState.selected.size >= 3) {
      seedState.notice = "一度に組める材料は3枚までです。";
      renderSeeds();
      return;
    }
    if (checked) seedState.selected.add(id);
    else seedState.selected.delete(id);
    seedState.notice = "";
    renderSeeds();
  }

  function buildScrapbookIdea() {
    const materials = selectedScrapbookItems();
    if (!materials.length) return;
    if (seedState.kept.length >= SCRAPBOOK_MAX_CARDS) {
      seedState.notice = "この紙面は12枚までです。組み立てた問いを貼るには、付箋を一枚外してください。";
      renderSeeds();
      return;
    }
    const note = $("#scrapbook-build-note").value.trim();
    const materialTexts = materials.map((item) => `「${item.text}」`);
    const question = `${materialTexts.join("と")}を同じ場面に置く。${note || "二つの条件が同時に変わる瞬間をつくる。"}`;
    const sources = [...new Set(materials.flatMap((item) => item.sources || []))];
    const bookSources = [...new Set(materials.flatMap((item) => item.bookSources || []))];
    const apparatusSources = [...new Set(materials.flatMap((item) => item.apparatusSources || []))];
    const built = {
      id: clipId("build"),
      kind: "build",
      title: `${materials.length}枚から組んだ場面の問い`,
      recipe: "スクラップブックから組み立て",
      text: question,
      sourceText: "",
      note: "",
      sources,
      bookSources,
      apparatusSources,
      inspiration: `材料: ${materials.map((item) => item.text).join(" / ")}`,
      createdAt: new Date().toISOString(),
    };
    seedState.kept.unshift(built);
    seedState.selected = new Set([built.id]);
    seedState.notice = "新しい場面の問いを紙面へ加えました。さらに材料にして育てられます。";
    $("#scrapbook-build-note").value = "";
    persistScrapbook();
    renderSeeds();
    flashScrapbookCard(built.id);
  }

  function dealSeeds() {
    const catalog = seedCatalog();
    const pool = (dist, needed) => {
      const eligible = catalog.filter(
        (s) => s.dist === dist && !seedState.discarded.has(s.text));
      // 眠りから起こした資料の「別の読み方」を先に配る（resetDiscardedSeeds）
      const woken = shuffle(eligible.filter((s) => seedState.wakePool.has(s.text)));
      const rest = shuffle(eligible.filter((s) => !seedState.wakePool.has(s.text)));
      return woken.concat(rest).slice(0, needed);
    };
    const near = pool("near", 3);
    const mid = pool("mid", 2);
    const alien = pool("alien", 2);
    seedState.dealt = shuffle(near.concat(mid, alien));
    // 配った分は優先枠から外す。次は通常の束から引く
    seedState.dealt.forEach((s) => seedState.wakePool.delete(s.text));
    renderSeeds();
  }

  // 眠らせた種火を起こす。同じ文面で戻すと、同じ理由でまた流されるだけなので
  // （設計計画書 リスク8）、まず「同じ資料を別のレシピで読んだ種火」を探して、
  // そちらを次の配布へ回す。元の形は眠らせたままにする。
  function resetDiscardedSeeds() {
    const asleep = [...seedState.discarded];
    if (!asleep.length) {
      seedState.notice = "まだ流した種火はありません。";
      renderSeeds();
      return;
    }
    const catalog = seedCatalog();
    const byText = new Map(catalog.map((seed) => [seed.text, seed]));

    // 眠っていた種火が見ていた資料と、その読み方（レシピ）
    const sources = new Set();
    const bookSources = new Set();
    const recipes = new Set();
    asleep.forEach((text) => {
      const seed = byText.get(text);
      if (!seed) return;
      (seed.sources || []).forEach((id) => sources.add(id));
      (seed.bookSources || []).forEach((id) => bookSources.add(id));
      if (seed.recipe) recipes.add(seed.recipe);
    });

    // 同じ資料を、違う読み方で組み立てた種火
    const transformed = catalog.filter((seed) =>
      !seedState.discarded.has(seed.text)
      && !recipes.has(seed.recipe)
      && (
        (seed.sources || []).some((id) => sources.has(id))
        || (seed.bookSources || []).some((id) => bookSources.has(id))
      ));

    if (transformed.length) {
      seedState.wakePool = new Set(transformed.map((seed) => seed.text));
      seedState.notice = `流した${asleep.length}件はそのままにして、同じ資料を別のレシピで読んだ${transformed.length}件を次の7枚へ回します。`;
    } else {
      // 別の読み方が残っていない資料は、そのまま起こす
      seedState.discarded.clear();
      seedState.wakePool = new Set();
      seedState.notice = `流した${asleep.length}件を束へ戻しました。別の読み方が残っていないため、同じ形で戻ります。`;
    }
    persistScrapbook();
    renderSeeds();
  }

  function scrapbookTone(item) {
    const sum = [...item.id].reduce((total, char) => total + char.charCodeAt(0), 0);
    return ["amber", "rose", "moss", "blue"][sum % 4];
  }

  function moveDealtSeedToScrapbook(index, notice) {
    const seed = seedState.dealt[index];
    if (!seed) return;
    const result = addToScrapbook(seed, notice);
    if (!result) {
      renderSeeds();
      return;
    }
    seedState.dealt.splice(index, 1);
    persistScrapbook();
    renderSeeds();
    flashScrapbookCard(result.id);
  }

  function renderSeeds() {
    const wrap = $("#seed-dealt");
    const keptWrap = $("#seed-kept");
    const dealBtn = $("#btn-deal");
    const status = $("#seed-pool-status");
    const catalog = seedCatalog();
    const catalogTexts = new Set(catalog.map((s) => s.text));
    const boardItems = seedState.kept.slice(0, SCRAPBOOK_MAX_CARDS);
    const visibleSlots = boardItems.length >= SCRAPBOOK_INITIAL_SLOTS
      ? SCRAPBOOK_MAX_CARDS
      : SCRAPBOOK_INITIAL_SLOTS;

    dealBtn.textContent = seedState.dealt.length ? "別の7枚をめくる" : "アイデアを7枚めくる";
    const discardedCount = [...seedState.discarded].filter((text) => catalogTexts.has(text)).length;
    $("#btn-reset-seed-history").disabled = discardedCount === 0;
    status.textContent =
      `資料棚と蔵書を横断した ${catalog.length}種 ・ 同じ種火も何度でも配る ・ 紙面 ${boardItems.length}/12 ・ 流した ${discardedCount}`;

    wrap.innerHTML = seedState.dealt.length
      ? seedState.dealt
          .map(
            (s, i) => `
            <article class="seed-card" draggable="true" data-seed-index="${i}" data-seed-dist="${esc(s.dist)}">
              <p class="seed-recipe">${esc(s.recipe)}</p>
              <p class="seed-text">${esc(s.text)}</p>
              ${seedProvenanceHtml(s)}
              <div class="seed-actions">
                <button type="button" class="seed-keep" data-keep="${i}">付箋で貼る</button>
                <button type="button" class="seed-pass" data-pass="${i}">流す</button>
              </div>
            </article>`)
          .join("")
      : `<p class="seed-empty">まだめくられていません。気になる案だけを12枚の紙面に残し、組み立てることに集中します。</p>`;

    keptWrap.classList.toggle("is-expanded", visibleSlots > SCRAPBOOK_INITIAL_SLOTS);
    keptWrap.innerHTML = Array.from({ length: visibleSlots }, (_, index) => {
      const item = boardItems[index];
      if (!item) {
        return `<div class="scrapbook-slot" aria-hidden="true"><span>${String(index + 1).padStart(2, "0")}</span><p>ここへ付箋を貼る</p></div>`;
      }
      const textId = `scrap-text-${item.id}`;
      const noteId = `scrap-note-${item.id}`;
      return `
        <article class="seed-chip scrapbook-clip sticky-note sticky-note-${scrapbookTone(item)} ${item.kind === "build" ? "scrapbook-built" : ""} ${seedState.newClipId === item.id ? "is-new" : ""}" data-scrap-card="${esc(item.id)}">
          <div class="scrapbook-clip-head">
            <p class="seed-recipe">${esc(item.recipe || "スクラップ")}</p>
            <label class="scrapbook-select">
              <input type="checkbox" data-scrap-select="${esc(item.id)}" ${seedState.selected.has(item.id) ? "checked" : ""}>
              <span>材料にする</span>
            </label>
          </div>
          ${item.title ? `<h4>${esc(item.title)}</h4>` : ""}
          <label class="scrapbook-card-text" for="${esc(textId)}"><span>付箋の本文</span>
            <textarea id="${esc(textId)}" rows="3" data-scrap-text="${esc(item.id)}" aria-label="付箋の本文を編集">${esc(item.text)}</textarea>
          </label>
          <label class="scrapbook-card-note" for="${esc(noteId)}"><span>自分のメモ</span>
            <textarea id="${esc(noteId)}" rows="2" data-scrap-note="${esc(item.id)}" placeholder="気づき、組み合わせ、次に試すこと…">${esc(item.note || "")}</textarea>
          </label>
          ${seedProvenanceHtml(item)}
          <div class="seed-actions">
            <button type="button" class="seed-start" data-start-scrap="${esc(item.id)}">制作机で続ける</button>
            <button type="button" class="seed-return" data-remove-scrap="${esc(item.id)}">紙面から外す</button>
          </div>
        </article>`;
    }).join("");

    $("#scrapbook-board-count").textContent = `${boardItems.length} / ${SCRAPBOOK_MAX_CARDS} 枚`;
    $("#scrapbook-board-title").textContent = seedState.pageTitle.trim() || "いま開いているページ";
    $("#scrapbook-saved-count").textContent = String(seedState.pages.length);
    $("#scrapbook-page-title").value = seedState.pageTitle;
    $("#scrapbook-page-note").value = seedState.pageNote;
    const activePage = seedState.pages.find((page) => page.id === seedState.activeSessionId);
    $("#scrapbook-save-status").textContent = activePage
      ? `保存済み: ${sessionDateLabel(activePage.updatedAt)}。変更後は「このページを保存」で更新します。`
      : "いまの紙面はこのブラウザに下書き保存中です。残したい状態で「このページを保存」してください。";

    const selected = selectedScrapbookItems();
    const buildStatus = $("#scrapbook-build-status");
    const materialsWrap = $("#scrapbook-materials");
    const buildButton = $("#scrapbook-build");
    buildStatus.textContent = seedState.notice || (selected.length
      ? `${selected.length}枚を材料に選択中。補足を書いて、次の場面の問いにします。`
      : "付箋を1〜3枚、材料として選んでください。");
    materialsWrap.innerHTML = selected.length
      ? selected.map((item) => `<span>${esc(item.title || item.text)}</span>`).join("")
      : `<span class="scrapbook-materials-empty">材料を選ぶと、ここに並びます。</span>`;
    buildButton.disabled = !selected.length;

    const sessionWrap = $("#scrapbook-sessions");
    sessionWrap.innerHTML = seedState.pages.length
      ? seedState.pages.map((page, index) => `
          <article class="scrapbook-session ${page.id === seedState.activeSessionId ? "is-active" : ""}">
            <button type="button" class="scrapbook-page-open" data-open-session="${esc(page.id)}" ${page.id === seedState.activeSessionId ? "aria-current=\"page\"" : ""}>
              <span class="scrapbook-page-number">${String(index + 1).padStart(2, "0")}</span>
              <span class="scrapbook-page-tab-copy">
                <strong>${esc(page.title)}</strong>
                <small>${esc(sessionDateLabel(page.updatedAt))} ・ 付箋 ${Math.min(page.items.length, SCRAPBOOK_MAX_CARDS)}枚</small>
              </span>
            </button>
            <button type="button" class="scrapbook-page-delete" data-delete-session="${esc(page.id)}" aria-label="${esc(page.title)} の保存を外す">×</button>
          </article>`).join("")
      : `<p class="scrapbook-sessions-empty">まだ保存したページはありません。紙面を残したい時に「このページを保存」を選んでください。</p>`;

    $$("[data-keep]", wrap).forEach((button) =>
      button.addEventListener("click", () =>
        moveDealtSeedToScrapbook(Number(button.dataset.keep), "付箋を紙面へ貼りました。材料として選ばれています。")));
    $$("[data-pass]", wrap).forEach((button) =>
      button.addEventListener("click", () => {
        const seed = seedState.dealt.splice(Number(button.dataset.pass), 1)[0];
        if (seed) {
          seedState.discarded.add(seed.text);
          persistScrapbook(); // 眠りを持ち越す
        }
        renderSeeds();
      }));
    $$("[data-seed-index]", wrap).forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-shosai-seed-index", card.dataset.seedIndex);
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
    });
    $$("[data-scrap-select]", keptWrap).forEach((input) =>
      input.addEventListener("change", () =>
        toggleScrapbookMaterial(input.dataset.scrapSelect, input.checked)));
    $$("[data-scrap-note]", keptWrap).forEach((input) =>
      input.addEventListener("input", () => {
        const item = seedState.kept.find((clip) => clip.id === input.dataset.scrapNote);
        if (!item) return;
        item.note = input.value;
        persistScrapbook();
      }));
    $$("[data-scrap-text]", keptWrap).forEach((input) =>
      input.addEventListener("input", () => {
        const item = seedState.kept.find((clip) => clip.id === input.dataset.scrapText);
        if (!item) return;
        item.text = input.value;
        persistScrapbook();
      }));
    $$("[data-start-scrap]", keptWrap).forEach((button) =>
      button.addEventListener("click", () => {
        const item = seedState.kept.find((clip) => clip.id === button.dataset.startScrap);
        if (item) {
          openProject(buildNewProject(item.text, {
            recipe: item.recipe,
            sources: item.sources,
            bookSources: item.bookSources,
            apparatusSources: item.apparatusSources,
            inspiration: item.inspiration,
          }));
        }
      }));
    $$("[data-remove-scrap]", keptWrap).forEach((button) =>
      button.addEventListener("click", () => {
        seedState.kept = seedState.kept.filter((item) => item.id !== button.dataset.removeScrap);
        seedState.selected.delete(button.dataset.removeScrap);
        seedState.notice = "付箋を紙面から外しました。";
        persistScrapbook();
        renderSeeds();
      }));
    $$("[data-open-session]", sessionWrap).forEach((button) =>
      button.addEventListener("click", () => openScrapbookPage(button.dataset.openSession)));
    $$("[data-delete-session]", sessionWrap).forEach((button) =>
      button.addEventListener("click", () => deleteScrapbookPage(button.dataset.deleteSession)));
  }

  function initScrapbook() {
    const drop = $("#scrapbook-drop");
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      drop.classList.add("is-dragover");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("is-dragover");
      const index = Number(event.dataTransfer.getData("application/x-shosai-seed-index"));
      if (!Number.isInteger(index) || !seedState.dealt[index]) return;
      moveDealtSeedToScrapbook(index, "ドラッグして付箋を紙面へ貼りました。材料として選ばれています。");
    });
    $("#scrapbook-builder").addEventListener("submit", (event) => {
      event.preventDefault();
      buildScrapbookIdea();
    });
    $("#scrapbook-page-title").addEventListener("input", (event) => {
      seedState.pageTitle = event.target.value;
      $("#scrapbook-board-title").textContent = seedState.pageTitle.trim() || "いま開いているページ";
      persistScrapbook();
    });
    $("#scrapbook-page-note").addEventListener("input", (event) => {
      seedState.pageNote = event.target.value;
      persistScrapbook();
    });
    $("#btn-scrapbook-save").addEventListener("click", saveScrapbookPage);
    $("#btn-scrapbook-export").addEventListener("click", exportScrapbookPage);
    $("#btn-scrapbook-new").addEventListener("click", startNewScrapbookPage);
    $("#btn-scrapbook-pages").addEventListener("click", () => {
      const picker = $("#scrapbook-page-picker");
      setScrapbookPagePicker(picker.hidden);
    });
    $("#btn-scrapbook-pages-close").addEventListener("click", () => setScrapbookPagePicker(false, true));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("#scrapbook-page-picker").hidden) {
        setScrapbookPagePicker(false, true);
      }
    });
  }

  // ---------- 場面問答（判断のエクササイズ） ----------
  // 先に自分で答える → 匿名の解法 → 条件 → 出典 の順で開く。採点しない。
  const mondoState = {
    index: 0,
    revealed: false,
    answers: {},   // fieldKey -> text（現在の問のみ・保存されない）
  };

  /* ---------- 問答帳（Phase 1） ----------
     自分の答えを日付つきで残す。採点はしない。「あのとき何を優先したか」を
     あとから読み返すための記録で、この端末のブラウザにだけ保存する。 */
  const MONDO_LOG_KEY = "shosai-mondo-log-v1";
  function readMondoLog() {
    try {
      const raw = JSON.parse(localStorage.getItem(MONDO_LOG_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
  }
  function writeMondoLog(log) {
    try { localStorage.setItem(MONDO_LOG_KEY, JSON.stringify(log)); } catch (_) { /* 保存不可でも動く */ }
  }

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

  function bindMondoLogDeletes(wrap) {
    $$("[data-del-log]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        writeMondoLog(readMondoLog().filter((entry) => entry.id !== b.dataset.delLog));
        const list = $("#mondo-log-list");
        if (list) list.innerHTML = renderMondoLogList();
        bindMondoLogDeletes(wrap);
      }));
  }

  function renderMondoLogList() {
    const log = readMondoLog();
    if (!log.length) {
      return `<p class="scrapbook-sessions-empty">まだ何も残していません。答えて照らしたら「問答帳に残す」で記録できます。</p>`;
    }
    return log.map((entry) => `
      <article class="mondo-log-entry">
        <header>
          <strong>${esc(entry.qTitle)}</strong>
          <span>${esc(new Date(entry.at).toLocaleDateString("ja-JP"))}</span>
          <button type="button" class="link-btn" data-del-log="${esc(entry.id)}">消す</button>
        </header>
        <p>${esc(entry.text)}</p>
        ${entry.axis ? `<p class="mondo-log-axis">照合: ${esc(entry.axis)}</p>` : ""}
      </article>`).join("");
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
            <button type="button" class="seed-keep" id="mondo-to-seed">この答えをスクラップブックに貼る</button>
            <button type="button" class="seed-keep" id="mondo-save-log">問答帳に残す</button>
          </div>
          <p class="save-note-dark">問答帳に残した答えは、この端末のブラウザに日付つきで保存されます。</p>
        </div>
      </div>

      <section class="mondo-log" aria-label="問答帳">
        <p class="mondo-answer-label">問答帳 — これまでの自分の答え</p>
        <div id="mondo-log-list">${renderMondoLogList()}</div>
      </section>`;

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

    const saveLog = $("#mondo-save-log");
    if (saveLog)
      saveLog.addEventListener("click", () => {
        const text = mondoAnswerText();
        if (!text) return;
        const log = readMondoLog();
        log.unshift({
          id: `mlog-${Date.now().toString(36)}`,
          qIndex: mondoState.index,
          qTitle: q.title,
          text,
          axis: (mondoState.answers.axis || "").trim(),
          mine: (mondoState.answers.mine || "").trim(),
          at: new Date().toISOString(),
        });
        writeMondoLog(log.slice(0, 200));
        const list = $("#mondo-log-list");
        if (list) list.innerHTML = renderMondoLogList();
        bindMondoLogDeletes(wrap);
        saveLog.textContent = "残しました（問答帳へ）";
        saveLog.disabled = true;
      });
    bindMondoLogDeletes(wrap);

    const toSeed = $("#mondo-to-seed");
    if (toSeed)
      toSeed.addEventListener("click", () => {
        const text = mondoAnswerText();
        if (!text) return;
        const result = addToScrapbook({
          recipe: `場面問答「${q.title}」の自分の答え`,
          text,
          sources: [],
          inspiration: "場面問答で記した本人の答え。",
        }, "場面問答の答えをスクラップブックへ貼りました。");
        renderSeeds();
        if (!result) return;
        flashScrapbookCard(result.id);
        toSeed.textContent = "貼りました（スクラップブックへ）";
        toSeed.disabled = true;
      });
  }

  // ---------- 机（ホーム） ----------
  function initDesk() {
    $("#btn-deal").addEventListener("click", dealSeeds);
    $("#btn-reset-seed-history").addEventListener("click", resetDiscardedSeeds);
    initScrapbook();
    renderSeeds();
    renderMondo();
    const thumbs = $("#desk-thumbs");
    thumbs.innerHTML = SHOSAI.visuals
      .map((v) => `<span class="thumb" aria-hidden="true">${ART[v.art]()}</span>`)
      .join("");
    ensureDeskProjectList();
    renderDeskProjectList();

    const card = $("#resume-card");
    const kicker = $(".paper-kicker", card);
    if (kicker && !$(".k", kicker)) kicker.insertAdjacentHTML("beforeend", `<span class="k">見本</span>`);
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

  function buildNewProject(text, origin) {
    const now = new Date().toISOString();
    const data = normalizeDeskProject({
      id: clipId("proj"),
      title: text.length > 14 ? text.slice(0, 14) + "…" : text,
      subtitle: origin ? "種火から始めた問い" : "新しい問い",
      question: { previous: null, current: text },
      sceneLine: null,
      sceneLineHistory: [],
      constraints: [],
      scene: null,
      transformation: null,
      directions: normalizeDirections(null),
      visualMeta: normalizeVisualMeta(null),
      // 元にした作品・レシピ・変形メモ。ここで捨てると出どころを辿れなくなる
      origin: origin || null,
      placed: [],
      decisions: {},
      createdAt: now,
      updatedAt: now,
    });
    if (data) {
      const i = state.deskProjects.findIndex((p) => p.id === data.id);
      if (i >= 0) state.deskProjects[i] = data;
      else state.deskProjects.unshift(data);
      persistDeskProjects();
      renderDeskProjectList();
    }
    return {
      kind: "new",
      data,
    };
  }

  function ensureDeskProjectList() {
    if ($("#desk-projects")) return;
    const resume = $("#resume-card");
    if (!resume) return;
    resume.insertAdjacentHTML("beforebegin", `
      <section class="desk-projects" id="desk-projects" hidden>
        <h2>進行中の問い</h2>
        <div class="desk-project-list" id="desk-project-list"></div>
      </section>`);
  }

  function deskDateLabel(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function renderDeskProjectList() {
    const section = $("#desk-projects");
    const list = $("#desk-project-list");
    if (!section || !list) return;
    const projects = state.deskProjects
      .map(normalizeDeskProject)
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    state.deskProjects = projects;
    if (!projects.length) {
      section.hidden = true;
      list.innerHTML = "";
      return;
    }
    section.hidden = false;
    list.innerHTML = projects.map((p) => `
      <article class="paper-card desk-project-card" data-desk-project="${esc(p.id)}" tabindex="0" role="button"
               aria-label="${esc(p.title)}を開く">
        <p class="paper-kicker">進行中<span class="k">${esc(deskDateLabel(p.updatedAt))}</span></p>
        <h2>${esc(p.title)}</h2>
        <p class="paper-sub">${esc(p.subtitle || "新しい問い")}</p>
        ${p.branchOrigin ? `<p class="desk-branch-line">${esc(p.branchOrigin.parentTitle)}から派生｜${esc(p.branchOrigin.branchReason)}</p>` : ""}
        <div class="paper-next">
          <span class="label">場面の一行</span>
          ${esc(p.sceneLine || p.question.current)}
        </div>
        <button type="button" class="desk-project-delete" data-delete-desk-project="${esc(p.id)}">削除</button>
      </article>`).join("");

    $$("[data-desk-project]", list).forEach((card) => {
      const open = () => {
        const project = state.deskProjects.find((p) => p.id === card.dataset.deskProject);
        if (project) openProject({ kind: "new", data: normalizeDeskProject(project) });
      };
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete-desk-project]")) return;
        open();
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
    $$("[data-delete-desk-project]", list).forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("この問いを削除しますか。")) return;
        if (window.SHOSAI_DESK_MEDIA && typeof window.SHOSAI_DESK_MEDIA.removeProject === "function") {
          window.SHOSAI_DESK_MEDIA.removeProject(button.dataset.deleteDeskProject).catch(() => {});
        }
        state.deskProjects = state.deskProjects.filter((p) => p.id !== button.dataset.deleteDeskProject);
        persistDeskProjects();
        renderDeskProjectList();
      });
    });
  }

  // ---------- 制作机 ----------
  function openProject(project) {
    revokeDeskVisualUrls();
    if (project.kind === "new") {
      project.data = normalizeDeskProject(project.data);
      if (!project.data) return;
    }
    state.project = project;
    state.sheetEditing = false;
    state.branchEditing = false;
    state.visualBriefEditing = false;
    state.directionEditing = null;
    state.promptOpen = {};
    state.pendingVisualImport = null;
    state.visualNotice = "";
    if (project.kind === "new") {
      const placedEntries = normalizePlacedEntries(project.data.placed, project.data.createdAt);
      state.placed = new Set(placedEntries.map((item) => item.id));
      state.placedMeta = new Map(placedEntries.map((item) => [item.id, {
        role: item.role,
        note: item.note,
        at: item.at,
      }]));
      state.decisions = { ...(project.data.decisions || {}) };
      loadDeskVisualImages(project.data);
    } else {
      if (!project.placed) project.placed = new Set();
      if (!project.decisions) project.decisions = {};
      state.placed = project.placed;
      state.placedMeta = new Map();
      state.decisions = project.decisions;
    }
    state.evidenceRef = null;
    state.shelfPlacing = null;
    // 検索語とジャンル選択は前のプロジェクトから持ち越さない
    state.shelfGenre = "";
    const shelfInput = $("#shelf-input");
    if (shelfInput) shelfInput.value = "";
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
    renderVisualBrief(p, isNew);
    renderVisuals(isNew);
  }

  function renderSheet(p, isNew) {
    const sheet = $("#sheet");
    if (isNew && state.sheetEditing) {
      renderSheetEditor(sheet, p);
      return;
    }
    const shift = p.question.previous
      ? `<span class="label">問いの変化</span>
         ${esc(p.question.previous)}<span class="arrow">→</span><span class="now">${esc(p.question.current)}</span>`
      : `<span class="label">問い</span><span class="now">${esc(p.question.current)}</span>`;
    const branchLine = branchOriginHtml(p);

    const chips = p.constraints.length
      ? p.constraints
          .map((c) =>
            `<span class="chip${c.hard ? " hard" : ""}">${esc(c.label)}<span class="k">${c.hard ? "固定" : "調整可"}</span></span>`)
          .join("")
      : `<span class="chip">制約ピンはまだありません<span class="k">書き込むから追加</span></span>`;

    // 変換メモは設計書Step 5の項目順どおり「関係」と「意図的に外したもの」の間に置く
    const transform = p.transformation ? renderTransformationDisplay(p.transformation) : "";
    let body = "";
    if (p.scene) {
      const s = p.scene;
      const relations = (s.relations || []).filter((r) => r && r[1] && r[1].trim());
      body = `
        ${s.audience ? `<section class="study-section">
          <h3>この場面が観客に起こすこと</h3>
          <p>${esc(s.audience)}</p>
        </section>` : ""}
        ${s.entry || s.exit ? `<section class="study-section">
          <h3>入口と出口</h3>
          <div class="entry-exit">
            <div class="ee"><b>入口</b><span>${esc(s.entry)}</span></div>
            <div class="ee"><b>出口</b><span>${esc(s.exit)}</span></div>
          </div>
        </section>` : ""}
        ${relations.length ? `<section class="study-section">
          <h3>人物・物・光・音・背景の関係</h3>
          <div class="relations">
            ${relations.map((r) => `<div class="rel"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}
          </div>
        </section>` : ""}
        ${transform}
        ${s.removed ? `<section class="study-section">
          <h3>意図的に外したもの</h3>
          <p>${esc(s.removed)}</p>
        </section>` : ""}
        ${s.undecided ? `<section class="study-section">
          <h3>未決定事項</h3>
          <p>${esc(s.undecided)}</p>
        </section>` : ""}
        ${s.next ? `<section class="study-section">
          <h3>次に試すこと</h3>
          <p class="next-action">${esc(s.next)}</p>
        </section>` : ""}`;
    } else {
      body = `
        <section class="study-section">
          <h3>場面スタディ</h3>
          <p class="placeholder">この問いの場面スタディはまだ書かれていません。右上の「書き込む」から場面スタディを書けます。</p>
        </section>
        ${transform}`;
    }

    sheet.innerHTML = `
      ${isNew ? `<div class="sheet-top-actions">
        <button type="button" class="sheet-write" id="sheet-write">書き込む</button>
        <button type="button" class="sheet-write sheet-branch-open" id="sheet-branch-open">枝分かれ</button>
      </div>` : ""}
      <span class="scene-line-label">場面の一行</span>
      <p class="scene-line">${p.sceneLine ? esc(p.sceneLine) : "（まだ書かれていない — ブリーフ前にここを言い切る）"}</p>
      <div class="question-shift">${shift}</div>
      ${branchLine}
      ${isNew && state.branchEditing ? renderBranchForm() : ""}
      <div class="constraints" aria-label="制約ピン">${chips}</div>
      ${originHtml(p.origin)}
      ${body}`;
    const write = $("#sheet-write", sheet);
    if (write) write.addEventListener("click", () => {
      state.sheetEditing = true;
      renderSheet(p, true);
      $("#sheet-scene-line").focus();
    });
    const branchOpen = $("#sheet-branch-open", sheet);
    if (branchOpen) branchOpen.addEventListener("click", () => {
      state.branchEditing = true;
      renderSheet(p, true);
      const input = $("#branch-reason", sheet);
      if (input) input.focus();
    });
    bindBranchOriginLink(sheet);
    bindBranchForm(sheet, p);
  }

  function branchOriginHtml(project) {
    const origin = project && project.branchOrigin;
    if (!origin) return "";
    const text = `${origin.parentTitle}から派生｜${origin.branchReason}`;
    const parentExists = state.deskProjects.some((item) => item && item.id === origin.parentId);
    return parentExists
      ? `<p class="branch-origin-line"><button type="button" data-open-branch-parent="${esc(origin.parentId)}">${esc(text)}</button></p>`
      : `<p class="branch-origin-line">${esc(text)} <small>（親は削除済み）</small></p>`;
  }

  function renderBranchForm() {
    return `
      <form class="branch-form transform-memo" id="branch-form" novalidate>
        <label class="sheet-field">
          <span>枝分かれの理由</span>
          <input id="branch-reason" name="branchReason" type="text" placeholder="例: 身体性を強めるため" required>
        </label>
        <p class="branch-error" id="branch-error" hidden></p>
        <div class="sheet-edit-actions">
          <button type="submit" class="sheet-save">枝を作る</button>
          <button type="button" class="sheet-cancel" id="branch-cancel">やめる</button>
        </div>
      </form>`;
  }

  function bindBranchOriginLink(scope) {
    $$("[data-open-branch-parent]", scope).forEach((button) => {
      button.addEventListener("click", () => {
        const parent = state.deskProjects.find((item) => item.id === button.dataset.openBranchParent);
        if (parent) openProject({ kind: "new", data: normalizeDeskProject(parent) });
      });
    });
  }

  function bindBranchForm(sheet, project) {
    const form = $("#branch-form", sheet);
    if (!form) return;
    $("#branch-cancel", form).addEventListener("click", () => {
      state.branchEditing = false;
      renderSheet(project, true);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const reason = stringOrEmpty(new FormData(form).get("branchReason")).trim();
      const error = $("#branch-error", form);
      if (!reason) {
        if (error) {
          error.textContent = "枝の理由を一行だけ書いてください";
          error.hidden = false;
        }
        const input = $("#branch-reason", form);
        if (input) input.focus();
        return;
      }
      createBranchFromCurrent(project, reason);
    });
  }

  function projectHasVisualImages(project) {
    const meta = normalizeVisualMeta(project && project.visualMeta);
    return VISUAL_DIR_KEYS.some((dir) => !!meta[dir]);
  }

  function copyBranchMedia(parentId, branchId, parentProject) {
    const media = window.SHOSAI_DESK_MEDIA;
    if (!media || typeof media.get !== "function" || typeof media.put !== "function") {
      return Promise.resolve(!projectHasVisualImages(parentProject));
    }
    return Promise.all(VISUAL_DIR_KEYS.map((dir) =>
      media.get(parentId, dir)
        .then((blob) => {
          if (!blob) return true;
          return media.put(branchId, dir, blob).then(() => true);
        })
        .catch(() => false)
    )).then((results) => results.every(Boolean));
  }

  function createBranchFromCurrent(project, reason) {
    if (!state.project || state.project.kind !== "new") return;
    syncCurrentDeskProject();
    const parent = normalizeDeskProject(state.project.data || project);
    const branch = buildBranchProject(parent, reason);
    if (!branch) return;
    state.deskProjects = state.deskProjects.filter((p) => p.id !== branch.id);
    state.deskProjects.unshift(branch);
    persistDeskProjects();
    renderDeskProjectList();
    copyBranchMedia(parent.id, branch.id, parent)
      .then((ok) => {
        openProject({ kind: "new", data: branch });
        if (!ok) {
          state.visualNotice = "画像は引き継げませんでした";
          renderVisuals(true);
        }
      })
      .catch(() => {
        openProject({ kind: "new", data: branch });
        state.visualNotice = "画像は引き継げませんでした";
        renderVisuals(true);
      });
  }

  function renderTransformationDisplay(t) {
    const rows = (t.rows || []).filter((row) => row && row[1] && row[1].trim());
    if (!t.fromLabel && !rows.length) return "";
    return `
      <section class="study-section">
        <h3>参考にした構造</h3>
        <div class="transform-memo">
          ${t.fromLabel ? `<p class="from">変換メモ — <b>${esc(t.fromLabel)}</b></p>` : ""}
          ${rows.length ? `<dl>
            ${rows
              .map((row) =>
                `<div class="tr${row[0] === "生まれた案" ? " born" : ""}"><dt>${esc(row[0])}</dt><dd>${esc(row[1])}</dd></div>`)
              .join("")}
          </dl>` : ""}
        </div>
      </section>`;
  }

  function renderSheetEditor(sheet, p) {
    const scene = normalizeScene(p.scene) || {
      audience: "",
      entry: "",
      exit: "",
      relations: SCENE_RELATION_LABELS.map((label) => [label, ""]),
      removed: "",
      undecided: "",
      next: "",
    };
    const transformation = normalizeTransformation(p.transformation) || {
      fromLabel: "",
      rows: TRANSFORM_ROW_LABELS.map((label) => [label, ""]),
    };
    const field = (name, label, value, rows = 3) => `
      <label class="sheet-field">
        <span>${label}</span>
        <textarea name="${name}" rows="${rows}">${esc(value)}</textarea>
      </label>`;
    sheet.innerHTML = `
      <form class="sheet-editor" id="sheet-editor">
        <label class="sheet-field">
          <span>場面の一行</span>
          <input id="sheet-scene-line" name="sceneLine" type="text" value="${esc(p.sceneLine || "")}">
        </label>
        <label class="sheet-field">
          <span>問い</span>
          <input name="questionCurrent" type="text" value="${esc(p.question.current)}">
        </label>
        <section class="study-section">
          <h3>制約ピン</h3>
          <div class="constraint-editor" id="constraint-editor">
            ${(p.constraints || []).map((c) => renderConstraintEditorRow(c)).join("")}
          </div>
          <button type="button" class="sheet-small-button" id="constraint-add">追加</button>
        </section>
        <section class="study-section">
          <h3>場面スタディ</h3>
          ${field("sceneAudience", "この場面が観客に起こすこと", scene.audience)}
          <div class="sheet-field-grid">
            ${field("sceneEntry", "入口", scene.entry, 2)}
            ${field("sceneExit", "出口", scene.exit, 2)}
          </div>
          <div class="sheet-fixed-rows">
            ${SCENE_RELATION_LABELS.map((label, i) => `
              <label class="sheet-row-field">
                <span>${esc(label)}</span>
                <textarea name="relation-${i}" rows="1">${esc((scene.relations[i] || [label, ""])[1])}</textarea>
              </label>`).join("")}
          </div>
          ${field("sceneRemoved", "意図的に外したもの", scene.removed, 2)}
          ${field("sceneUndecided", "未決定事項", scene.undecided, 2)}
          ${field("sceneNext", "次に試すこと", scene.next, 2)}
        </section>
        <section class="study-section">
          <h3>参考にした構造</h3>
          <div class="transform-memo">
            <label class="sheet-field">
              <span>参考にした構造</span>
              <input name="transformFrom" type="text" value="${esc(transformation.fromLabel)}">
            </label>
            <div class="sheet-fixed-rows">
              ${TRANSFORM_ROW_LABELS.map((label, i) => `
                <label class="sheet-row-field${label === "生まれた案" ? " born" : ""}">
                  <span>${esc(label)}</span>
                  <textarea name="transform-${i}" rows="2">${esc((transformation.rows[i] || [label, ""])[1])}</textarea>
                </label>`).join("")}
            </div>
          </div>
        </section>
        <div class="sheet-edit-actions">
          <button type="submit" class="sheet-save">保存</button>
          <button type="button" class="sheet-cancel" id="sheet-cancel">取り消す</button>
        </div>
      </form>`;
    $("#constraint-add", sheet).addEventListener("click", () => {
      $("#constraint-editor", sheet).insertAdjacentHTML("beforeend", renderConstraintEditorRow({ label: "", hard: false }));
    });
    sheet.addEventListener("click", (e) => {
      const remove = e.target.closest("[data-remove-constraint]");
      if (remove) remove.closest(".constraint-row").remove();
    });
    $("#sheet-cancel", sheet).addEventListener("click", () => {
      state.sheetEditing = false;
      renderSheet(p, true);
    });
    $("#sheet-editor", sheet).addEventListener("submit", (e) => {
      e.preventDefault();
      applySheetEdit(p, e.currentTarget);
      state.sheetEditing = false;
      syncCurrentDeskProject();
      renderStudio();
    });
  }

  function renderConstraintEditorRow(constraint) {
    return `
      <div class="constraint-row">
        <input name="constraintLabel" type="text" value="${esc(constraint.label || "")}" aria-label="制約ピン">
        <label><input name="constraintHard" type="checkbox" ${constraint.hard ? "checked" : ""}>固定</label>
        <button type="button" data-remove-constraint>削除</button>
      </div>`;
  }

  function applySheetEdit(project, form) {
    const data = new FormData(form);
    const value = (name) => stringOrEmpty(data.get(name)).trim();
    const constraints = $$(".constraint-row", form).map((row) => {
      const text = stringOrEmpty($('input[name="constraintLabel"]', row).value).trim();
      return text ? { label: text, hard: $('input[name="constraintHard"]', row).checked } : null;
    }).filter(Boolean);
    applySheetValues(project, {
      sceneLine: value("sceneLine"),
      questionCurrent: value("questionCurrent"),
      constraints,
      sceneAudience: value("sceneAudience"),
      sceneEntry: value("sceneEntry"),
      sceneExit: value("sceneExit"),
      relations: SCENE_RELATION_LABELS.map((label, i) => [label, value(`relation-${i}`)]),
      sceneRemoved: value("sceneRemoved"),
      sceneUndecided: value("sceneUndecided"),
      sceneNext: value("sceneNext"),
      transformFrom: value("transformFrom"),
      transformRows: TRANSFORM_ROW_LABELS.map((label, i) => [label, value(`transform-${i}`)]),
    });
  }

  function applySheetValues(project, values) {
    const value = (name) => stringOrEmpty(values[name]).trim();
    const sceneLine = value("sceneLine") || null;
    if ((project.sceneLine || null) !== sceneLine && project.sceneLine) {
      project.sceneLineHistory.push({ text: project.sceneLine, at: new Date().toISOString() });
    }
    project.sceneLine = sceneLine;
    const nextQuestion = value("questionCurrent") || project.question.current;
    if (nextQuestion !== project.question.current) {
      project.question.previous = project.question.current;
      project.question.current = nextQuestion;
      project.title = project.title || (nextQuestion.length > 14 ? nextQuestion.slice(0, 14) + "…" : nextQuestion);
    }
    project.constraints = Array.isArray(values.constraints)
      ? values.constraints
          .filter((item) => item && typeof item.label === "string" && item.label.trim())
          .map((item) => ({ label: item.label.trim(), hard: item.hard === true }))
      : [];
    project.scene = normalizeScene({
      audience: value("sceneAudience"),
      entry: value("sceneEntry"),
      exit: value("sceneExit"),
      relations: Array.isArray(values.relations) ? values.relations : [],
      removed: value("sceneRemoved"),
      undecided: value("sceneUndecided"),
      next: value("sceneNext"),
    });
    project.transformation = normalizeTransformation({
      fromLabel: value("transformFrom"),
      rows: Array.isArray(values.transformRows) ? values.transformRows : [],
    });
  }

  // 種火から始めた問いには、元にした作品と変形の理由を必ず添える。
  // ここを落とすと、元作品を知らないまま場面が育ち、表面をなぞる危険に気づけなくなる
  // （設計計画書 リスク3）。スクラップブックから制作机へ渡す唯一の開示点。
  function originHtml(origin) {
    if (!origin) return "";
    const works = (origin.sources || [])
      .map((id) => (DB ? DB.works.find((w) => w.id === id) : null))
      .filter(Boolean);
    const bookCatalog = typeof SHOSAI_BOOK_SOURCES !== "undefined" ? SHOSAI_BOOK_SOURCES : {};
    const books = (origin.bookSources || []).map((id) => bookCatalog[id]).filter(Boolean);
    const apparatus = (origin.apparatusSources || [])
      .map((id) => apparatusCards().find((card) => card.id === id))
      .filter(Boolean);
    const workLinks = works.length
      ? `<ul class="origin-works">${works.map((w) => {
          const meta = [w.company, w.year].filter(Boolean).join(" / ");
          return `<li><a href="#db/${encodeURIComponent(w.id)}">${esc(w.title)}</a>${meta ? `<span>${esc(meta)}</span>` : ""}</li>`;
        }).join("")}</ul>`
      : "";
    const bookLinks = books.length
      ? `<ul class="origin-works">${books.map((book) =>
          `<li><strong>${esc(book.title)}</strong><span>${esc(book.category)} / 自炊本の内容要約</span></li>`
        ).join("")}</ul>`
      : "";
    const apparatusLinks = apparatus.length
      ? `<ul class="origin-works">${apparatus.map((card) =>
          `<li><a href="#apparatus/${encodeURIComponent(card.id)}">${esc(card.name_ja)}</a><span>${esc(card.family)} / 舞台技術調査ドラフト</span></li>`
        ).join("")}</ul>`
      : "";
    const links = workLinks || bookLinks || apparatusLinks
      ? `${workLinks}${bookLinks}${apparatusLinks}`
      : `<p class="origin-none">元にした資料は記録されていません（手で書いた種火、または場面問答の答え）。</p>`;
    return `
      <section class="origin" aria-label="この問いの出どころ">
        <p class="origin-head">この問いの出どころ${origin.recipe ? ` <span class="origin-recipe">${esc(origin.recipe)}</span>` : ""}</p>
        ${links}
        ${origin.inspiration ? `<p class="origin-memo">${esc(origin.inspiration)}</p>` : ""}
        <p class="origin-caution">参照資料の意匠・文章・キャラクター・象徴をそのまま持ち込まない。使うのは仕組みと関係だけ。</p>
      </section>`;
  }

  // ---------- 置いた資料（左レール） ----------
  function renderPlaced() {
    if (state.project && state.project.kind === "new") {
      renderPlacedDb();
      return;
    }
    renderPlacedFixed();
  }

  function shelfWorkById(id) {
    if (DB && Array.isArray(DB.works)) {
      const found = DB.works.find((work) => work.id === id);
      if (found) return { kind: "db", work: found };
    }
    const fixed = SHOSAI.references.find((ref) => ref.id === id);
    return fixed ? { kind: "fixed", work: fixed } : null;
  }

  function workMetaLine(work, includeGenre = false) {
    // ジャンル表示は正本の英語スラッグ(genre)ではなく日本語のcategoryを使う
    return [work.company, work.year, includeGenre ? work.category : ""].filter((value) => value != null && value !== "").join(" ・ ");
  }

  function renderPlacedDb() {
    const wrap = $("#placed-list");
    const ids = [...state.placed];
    if (!ids.length) {
      wrap.innerHTML = `<p class="placed-empty">まだ資料を置いていません。<br>「資料棚」を開き、「この制作へ置く」で机へ運びます。</p>`;
      return;
    }
    wrap.innerHTML = ids.map((id) => {
      const resolved = shelfWorkById(id);
      const meta = state.placedMeta.get(id) || { role: "near", note: "", at: "" };
      if (!resolved) {
        return `<div class="placed-card" data-ref="${esc(id)}">
          <p class="t">資料棚で見つかりません</p>
          <p class="m">${esc(id)}</p>
          <div class="row"><button type="button" class="link-btn" data-remove="${esc(id)}">外す</button></div>
        </div>`;
      }
      if (resolved.kind === "fixed") {
        const r = resolved.work;
        return `<div class="placed-card" data-ref="${esc(id)}">
          <p class="t">${esc(r.title)}</p>
          <p class="m">${esc(r.company)} ・ ${esc(r.year)}</p>
          ${meta.role === "contrast" ? `<span class="axis-tag">対照</span>` : ""}
          ${meta.note ? `<p class="placed-note">${esc(meta.note)}</p>` : `<p class="placed-note empty">なぜ置くかを書き添える</p>`}
          <div class="row">
            <button type="button" class="link-btn" data-ev="${esc(id)}">根拠を見る</button>
            <button type="button" class="link-btn" data-remove="${esc(id)}">外す</button>
          </div>
        </div>`;
      }
      const work = resolved.work;
      return `<div class="placed-card" data-ref="${esc(id)}">
        <p class="t">${esc(work.title)}</p>
        <p class="m">${esc(workMetaLine(work))}</p>
        ${meta.role === "contrast" ? `<span class="axis-tag">対照</span>` : ""}
        ${meta.note ? `<p class="placed-note">${esc(meta.note)}</p>` : `<p class="placed-note empty">なぜ置くかを書き添える</p>`}
        <div class="row">
          <button type="button" class="link-btn" data-ev="${esc(id)}">根拠を見る</button>
          <button type="button" class="link-btn" data-remove="${esc(id)}">外す</button>
        </div>
      </div>`;
    }).join("");

    $$("[data-ev]", wrap).forEach((b) =>
      b.addEventListener("click", () => showEvidence(b.dataset.ev)));
    $$("[data-remove]", wrap).forEach((b) =>
      b.addEventListener("click", () => {
        state.placed.delete(b.dataset.remove);
        state.placedMeta.delete(b.dataset.remove);
        if (state.evidenceRef === b.dataset.remove) state.evidenceRef = null;
        syncCurrentDeskProject();
        renderPlaced();
        renderEvidence();
        renderShelf();
      }));
  }

  function renderPlacedFixed() {
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
        syncCurrentDeskProject();
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
    if (state.project && state.project.kind === "new") {
      renderEvidenceDb();
      return;
    }
    renderEvidenceFixed();
  }

  function renderEvidenceDb() {
    const body = $("#evidence-body");
    const resolved = shelfWorkById(state.evidenceRef);
    if (!resolved) {
      body.innerHTML = `<p class="evidence-empty">置いた資料の「根拠を見る」を選ぶと、出典・確信度・未確認事項がここに出ます。<br><br>制作メモ（紙の上）と根拠（この棚側）は混ぜずに保ちます。</p>`;
      return;
    }
    if (resolved.kind === "fixed") {
      renderEvidenceFixed();
      return;
    }
    const w = resolved.work;
    const meta = state.placedMeta.get(w.id) || { role: "near", note: "", at: "" };
    const list = (items) => Array.isArray(items)
      ? items.filter((item) => stringOrEmpty(item).trim()).slice(0, 3)
      : [];
    body.innerHTML = `
      <div class="evidence-body">
        <p class="work">${esc(w.title)}</p>
        <p class="meta">${esc(workMetaLine(w, true))}</p>
        <div class="ev-block fact">
          <h4>▪ 事実</h4>
          <p>${esc([w.company, w.year, w.category].filter((value) => value != null && value !== "").join(" ・ "))}</p>
          ${w.summary ? `<p>${esc(w.summary)}</p>` : ""}
        </div>
        ${(list(w.themes).length || list(w.signature_scenes).length) ? `<div class="ev-block interp">
          <h4>資料からの解釈（正本メモ）</h4>
          ${list(w.themes).length ? `<p><b>themes</b><br>${list(w.themes).map(esc).join("<br>")}</p>` : ""}
          ${list(w.signature_scenes).length ? `<p><b>signature_scenes</b><br>${list(w.signature_scenes).map(esc).join("<br>")}</p>` : ""}
        </div>` : ""}
        <div class="ev-block fact">
          <h4>確信度</h4>
          <p><span title="${esc(w.confidence || "")}">${esc(confidenceLabel(w.confidence))}</span></p>
        </div>
        <div class="ev-block unverified">
          <h4>未確認事項</h4>
          <p class="db-status">${esc(w.status || "未記録")}</p>
        </div>
        <div class="ev-block interp">
          <h4>本人の判断 — なぜ置くか</h4>
          <textarea class="evidence-note" rows="4" data-evidence-note="${esc(w.id)}" placeholder="なぜ置くか — 空でも置けます。あとから書けます">${esc(meta.note || "")}</textarea>
        </div>
        <p><a href="#db/${encodeURIComponent(w.id)}" data-close-shelf>作品ページを読む →</a></p>
        <p class="ev-legend">区分 — <span style="color:var(--brass)">▪ 事実</span> ／ <span style="color:var(--slate)">解釈</span> ／ 点線＝未確認。AIの提案はPhase 2から。本人の判断は紙の上にだけ残します。</p>
      </div>`;
    const note = $("[data-evidence-note]", body);
    if (note) note.addEventListener("input", (e) => {
      const current = state.placedMeta.get(w.id) || { role: "near", note: "", at: new Date().toISOString() };
      current.note = e.target.value;
      state.placedMeta.set(w.id, current);
      syncCurrentDeskProject();
      renderPlaced();
    });
  }

  function renderEvidenceFixed() {
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
  function renderVisualBrief(p, isNew) {
    const wrap = $("#visual-brief");
    if (!wrap) return;
    if (!isNew) {
      wrap.innerHTML = "";
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    if (state.visualBriefEditing) {
      renderVisualBriefEditor(wrap, p);
      return;
    }
    const criterion = p.sceneLine
      ? `場面の一行 — ${esc(p.sceneLine)}`
      : `まず紙面の「場面の一行」を言い切ると、ブリーフと3案比較の判定基準になります（暫定でよい）。`;
    const brief = normalizeBrief(p.brief);
    const rows = brief
      ? BRIEF_FIELD_LABELS
          .filter(({ key }) => brief[key] && brief[key].trim())
          .map(({ key, label }) => `<div class="tr"><dt>${esc(label)}</dt><dd>${esc(brief[key])}</dd></div>`)
          .join("")
      : "";
    wrap.innerHTML = `
      <div class="transform-memo visual-brief-paper">
        <button type="button" class="sheet-write" id="visual-brief-write">書き込む</button>
        <p class="from">${criterion}</p>
        ${brief
          ? `<dl>${rows}</dl>`
          : `<p class="placeholder">ブリーフはまだ書かれていません。場面スタディの条件を、画像試作に渡せる形へまとめます。</p>`}
      </div>`;
    $("#visual-brief-write", wrap).addEventListener("click", () => {
      state.visualBriefEditing = true;
      renderVisualBrief(p, true);
      const first = $('[name="brief-subject"]', wrap);
      if (first) first.focus();
    });
  }

  function renderVisualBriefEditor(wrap, p) {
    const brief = normalizeBrief(p.brief) || briefDraftFromStudy(p);
    const scene = normalizeScene(p.scene);
    const refRows = scene
      ? [
          ["この場面が観客に起こすこと", scene.audience],
          ["関係の埋まっている行（人物・物・光・音・背景）", (scene.relations || [])
            .filter((row) => row && row[1] && row[1].trim())
            .map((row) => `${row[0]}: ${row[1]}`)
            .join("／")],
          ["意図的に外したもの", scene.removed],
        ].filter((row) => row[1] && row[1].trim())
      : [];
    const field = ({ key, label }) => {
      const value = brief[key] || "";
      if (key === "lettering") {
        return `<label class="sheet-field">
          <span>${esc(label)}</span>
          <input name="brief-${esc(key)}" type="text" value="${esc(value)}">
        </label>`;
      }
      return `<label class="sheet-field">
        <span>${esc(label)}</span>
        <textarea name="brief-${esc(key)}" rows="2">${esc(value)}</textarea>
      </label>`;
    };
    wrap.innerHTML = `
      <form class="transform-memo visual-brief-editor" id="visual-brief-editor">
        ${refRows.length ? `<div class="visual-brief-reference">
          <p class="from">場面スタディから写す元</p>
          <dl>
            ${refRows.map((row) => `<div class="tr"><dt>${esc(row[0])}</dt><dd>${esc(row[1])}</dd></div>`).join("")}
          </dl>
        </div>` : ""}
        <div class="visual-brief-fields">
          ${BRIEF_FIELD_LABELS.map(field).join("")}
        </div>
        <div class="sheet-edit-actions">
          <button type="submit" class="sheet-save">保存</button>
          <button type="button" class="sheet-cancel" id="visual-brief-cancel">取り消す</button>
        </div>
      </form>`;
    $("#visual-brief-cancel", wrap).addEventListener("click", () => {
      state.visualBriefEditing = false;
      renderVisualBrief(p, true);
    });
    $("#visual-brief-editor", wrap).addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const next = {};
      BRIEF_FIELD_LABELS.forEach(({ key }) => {
        next[key] = stringOrEmpty(data.get(`brief-${key}`)).trim();
      });
      p.brief = normalizeBrief(next);
      state.visualBriefEditing = false;
      syncCurrentDeskProject();
      renderStudio();
    });
  }

  function revokeDeskVisualUrls() {
    if (!state.visualImageUrls) return;
    state.visualImageUrls.forEach((url) => {
      try {
        if (window.URL && typeof window.URL.revokeObjectURL === "function") window.URL.revokeObjectURL(url);
      } catch (_) {}
    });
    state.visualImageUrls = new Map();
  }

  function loadDeskVisualImages(project) {
    if (!window.SHOSAI_DESK_MEDIA || typeof window.SHOSAI_DESK_MEDIA.get !== "function") return;
    VISUAL_DIR_KEYS.forEach((dir) => {
      if (!project.visualMeta || !project.visualMeta[dir]) return;
      window.SHOSAI_DESK_MEDIA.get(project.id, dir)
        .then((blob) => {
          if (!blob || !state.project || state.project.kind !== "new" || state.project.data.id !== project.id) return;
          const old = state.visualImageUrls.get(dir);
          if (old && window.URL && typeof window.URL.revokeObjectURL === "function") window.URL.revokeObjectURL(old);
          if (window.URL && typeof window.URL.createObjectURL === "function") {
            state.visualImageUrls.set(dir, window.URL.createObjectURL(blob));
            renderVisuals(true);
          }
        })
        .catch(() => {});
    });
  }

  function visualMetaDateLabel(value) {
    return deskDateLabel(value);
  }

  function visualImageButton(dir, url) {
    if (!url) return "";
    return `<button type="button" class="visual-art visual-imported-art" data-lb-image="${esc(dir)}" aria-label="案${esc(dir)}を拡大して見る">
      <img src="${esc(url)}" alt="案${esc(dir)}の持ち込み画像">
    </button>`;
  }

  function renderDirectionEditor(project, dir, direction) {
    return `
      <form class="direction-editor transform-memo" data-direction-form="${esc(dir)}">
        <label class="sheet-field">
          <span>方向ラベル</span>
          <input name="label" type="text" value="${esc(direction.label)}" placeholder="${esc(VISUAL_DIRECTION_PLACEHOLDERS[dir])}">
        </label>
        <label class="sheet-field">
          <span>この考え方の意図</span>
          <textarea name="intent" rows="2" placeholder="${esc(VISUAL_DIRECTION_PLACEHOLDERS[dir])}">${esc(direction.intent)}</textarea>
        </label>
        <div class="sheet-edit-actions">
          <button type="submit" class="sheet-save">保存</button>
          <button type="button" class="sheet-cancel" data-direction-cancel>取り消す</button>
        </div>
      </form>`;
  }

  function renderPromptExport(project, dir) {
    if (!hasBriefText(project)) {
      return `<p class="visual-empty visual-brief-required">先にビジュアルブリーフを書くと、ここから生成条件を書き出せます</p>`;
    }
    if (!state.promptOpen[dir]) {
      return `<button type="button" class="sheet-small-button visual-prompt-open" data-prompt-open="${esc(dir)}">生成条件を書き出す</button>`;
    }
    const text = visualPromptText(project, dir);
    return `<div class="visual-prompt-box">
      <textarea readonly rows="8">${esc(text)}</textarea>
      <button type="button" class="sheet-small-button" data-copy-prompt="${esc(dir)}">コピー</button>
    </div>`;
  }

  function renderDropArea(dir) {
    return `<label class="visual-drop" data-drop-dir="${esc(dir)}">
      <input type="file" accept="image/png,image/jpeg,image/webp" data-file-dir="${esc(dir)}">
      <span class="dir">${esc(dir)}</span>
      <span>画像をドラッグ&ドロップ、またはクリックして選ぶ</span>
    </label>`;
  }

  function renderImportForm(dir) {
    const pending = state.pendingVisualImport;
    if (!pending || pending.dir !== dir) return "";
    return `<form class="visual-import-form transform-memo" data-import-form="${esc(dir)}">
      <p class="from">生成履歴</p>
      <label class="sheet-field">
        <span>区分</span>
        <select name="kind">
          <option value="ai">AI生成</option>
          <option value="self">本人添付</option>
          <option value="external">外部資料</option>
        </select>
      </label>
      <label class="sheet-field">
        <span>方法</span>
        <input name="method" type="text" placeholder="使用したモデルまたは方法">
      </label>
      <label class="sheet-field">
        <span>生成条件</span>
        <textarea name="prompt" rows="4" placeholder="書き出した生成条件を貼り戻す"></textarea>
      </label>
      <div class="sheet-edit-actions">
        <button type="submit" class="sheet-save">確定</button>
        <button type="button" class="sheet-cancel" data-import-cancel>取り消す</button>
      </div>
    </form>`;
  }

  function renderFirstLookGate(dir, meta) {
    const value = meta.firstImpression ? meta.firstImpression.text : "";
    return `<form class="first-look-gate" data-first-look="${esc(dir)}">
      <label class="sheet-field">
        <span>第一印象 — 違和感・興味・身体感覚を先に書く</span>
        <input name="firstImpression" type="text" value="${esc(value)}">
      </label>
      <div class="first-look-actions">
        <button type="submit" class="sheet-save">書いて開く</button>
        <button type="button" class="sheet-cancel" data-reveal-empty="${esc(dir)}">書かずに開く</button>
      </div>
    </form>`;
  }

  function renderVisualHistory(meta) {
    if (!meta) return "";
    return `<div class="visual-history">
      <span class="chip">${esc(VISUAL_KIND_LABELS[meta.kind] || VISUAL_KIND_LABELS.ai)}</span>
      ${meta.method ? `<span>${esc(meta.method)}</span>` : ""}
      <span>${esc(visualMetaDateLabel(meta.importedAt))}</span>
      ${meta.prompt ? `<details><summary>生成条件</summary><p>${esc(meta.prompt)}</p></details>` : ""}
    </div>`;
  }

  function renderDecisionUi(id, dir) {
    const dec = state.decisions[id] || {};
    const verdicts = ["採用", "一部採用", "保留", "不採用"];
    return `<div class="judge">
      <p class="j-label">判断</p>
      <div class="judge-row" role="group" aria-label="案${esc(dir)}の判断">
        ${verdicts.map((vd) =>
          `<button type="button" class="judge-btn" data-verdict="${vd}" aria-pressed="${dec.verdict === vd}">${vd}</button>`)
          .join("")}
      </div>
      <textarea rows="2" placeholder="理由を短く残す" aria-label="案${esc(dir)}の判断理由">${esc(dec.reason || "")}</textarea>
      <p class="save-note">判断はこの制作の紙面に残ります。</p>
    </div>`;
  }

  function renderNewVisuals(grid) {
    const project = state.project.data;
    project.directions = normalizeDirections(project.directions);
    project.visualMeta = normalizeVisualMeta(project.visualMeta);
    const firstLook = firstLookEnabled();
    grid.innerHTML = `
      <div class="visual-first-look-control">
        <label><input type="checkbox" id="first-look-toggle" ${firstLook ? "checked" : ""}>初見モード</label>
        ${state.visualNotice ? `<p>${esc(state.visualNotice)}</p>` : ""}
      </div>
      ${VISUAL_DIR_KEYS.map((dir) => {
        const direction = project.directions[dir];
        const meta = project.visualMeta[dir];
        const imageUrl = state.visualImageUrls.get(dir);
        const hiddenByFirstLook = firstLook && meta && meta.revealed === false;
        return `<article class="visual-card visual-card-new" data-visual="${esc(dir)}">
          <div class="dir-row">
            <span class="dir">${esc(dir)}</span>
            <span class="dir-label">案${esc(dir)}${hiddenByFirstLook ? "" : ` — ${esc(direction.label || VISUAL_DIRECTION_PLACEHOLDERS[dir])}`}</span>
            ${!hiddenByFirstLook ? `<button type="button" class="sheet-write visual-direction-write" data-direction-edit="${esc(dir)}">書き込む</button>` : ""}
          </div>
          ${!hiddenByFirstLook && state.directionEditing === dir ? renderDirectionEditor(project, dir, direction) : ""}
          ${imageUrl ? visualImageButton(dir, imageUrl) : renderDropArea(dir)}
          ${renderImportForm(dir)}
          ${meta && imageUrl ? `<button type="button" class="sheet-small-button visual-remove" data-remove-visual="${esc(dir)}">画像を外す</button>` : ""}
          ${hiddenByFirstLook ? renderFirstLookGate(dir, meta) : `
            ${direction.intent ? `<div class="visual-meta"><div class="vm"><b>意図</b><span>${esc(direction.intent)}</span></div></div>` : ""}
            ${meta && meta.firstImpression ? `<p class="first-impression">第一印象 — ${esc(meta.firstImpression.text)}</p>` : ""}
            ${renderPromptExport(project, dir)}
            ${renderVisualHistory(meta)}
            ${meta && imageUrl ? renderDecisionUi(dir, dir) : ""}
          `}
        </article>`;
      }).join("")}`;

    const toggle = $("#first-look-toggle", grid);
    if (toggle) toggle.addEventListener("change", (e) => {
      setFirstLookEnabled(e.target.checked);
      renderVisuals(true);
    });
    bindNewVisualEvents(grid, project);
  }

  function bindNewVisualEvents(grid, project) {
    $$("[data-direction-edit]", grid).forEach((button) => {
      button.addEventListener("click", () => {
        state.directionEditing = button.dataset.directionEdit;
        renderVisuals(true);
      });
    });
    $$("[data-direction-form]", grid).forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const dir = form.dataset.directionForm;
        const data = new FormData(form);
        project.directions[dir] = {
          label: stringOrEmpty(data.get("label")).trim(),
          intent: stringOrEmpty(data.get("intent")).trim(),
        };
        state.directionEditing = null;
        syncCurrentDeskProject();
        renderVisuals(true);
      });
    });
    $$("[data-direction-cancel]", grid).forEach((button) =>
      button.addEventListener("click", () => {
        state.directionEditing = null;
        renderVisuals(true);
      }));
    $$("[data-prompt-open]", grid).forEach((button) =>
      button.addEventListener("click", () => {
        state.promptOpen[button.dataset.promptOpen] = true;
        renderVisuals(true);
      }));
    $$("[data-copy-prompt]", grid).forEach((button) =>
      button.addEventListener("click", () => copyPromptText(project, button.dataset.copyPrompt, button)));
    $$("[data-file-dir]", grid).forEach((input) =>
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (file) queueVisualImport(input.dataset.fileDir, file);
      }));
    $$("[data-drop-dir]", grid).forEach((drop) => {
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("dragging");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("dragging");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) queueVisualImport(drop.dataset.dropDir, file);
      });
    });
    $$("[data-import-form]", grid).forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        commitVisualImport(project, form);
      });
    });
    $$("[data-import-cancel]", grid).forEach((button) =>
      button.addEventListener("click", () => {
        state.pendingVisualImport = null;
        renderVisuals(true);
      }));
    $$("[data-remove-visual]", grid).forEach((button) =>
      button.addEventListener("click", () => removeVisualImage(project, button.dataset.removeVisual)));
    $$("[data-first-look]", grid).forEach((form) =>
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        revealVisualSlot(project, form.dataset.firstLook, new FormData(form).get("firstImpression"));
        syncCurrentDeskProject();
        renderVisuals(true);
      }));
    $$("[data-reveal-empty]", grid).forEach((button) =>
      button.addEventListener("click", () => {
        revealVisualSlot(project, button.dataset.revealEmpty, "");
        syncCurrentDeskProject();
        renderVisuals(true);
      }));
    $$("[data-lb-image]", grid).forEach((button) =>
      button.addEventListener("click", () => openLightbox(button.dataset.lbImage)));
    $$(".visual-card-new", grid).forEach((card) => bindDecisionEvents(card, card.dataset.visual));
  }

  function bindDecisionEvents(card, id) {
    const textarea = $(".judge textarea", card);
    if (!textarea) return;
    $$(".judge-btn", card).forEach((btn) =>
      btn.addEventListener("click", () => {
        const d = state.decisions[id] || {};
        d.verdict = d.verdict === btn.dataset.verdict ? null : btn.dataset.verdict;
        state.decisions[id] = d;
        syncCurrentDeskProject();
        $$(".judge-btn", card).forEach((b2) =>
          b2.setAttribute("aria-pressed", String(d.verdict === b2.dataset.verdict)));
        if (d.verdict) textarea.focus();
      }));
    textarea.addEventListener("input", (e) => {
      const d = state.decisions[id] || {};
      d.reason = e.target.value;
      state.decisions[id] = d;
      syncCurrentDeskProject();
    });
  }

  function copyPromptText(project, dir, button) {
    const text = visualPromptText(project, dir);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        button.textContent = "コピーしました";
      }).catch(() => selectPromptTextarea(button));
      return;
    }
    selectPromptTextarea(button);
  }

  function selectPromptTextarea(button) {
    const textarea = $("textarea", button.closest(".visual-prompt-box"));
    if (textarea) textarea.select();
  }

  function queueVisualImport(dir, file) {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      state.visualNotice = "画像はPNG、JPEG、WebPだけ持ち込めます。";
      renderVisuals(true);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      state.visualNotice = "10MBを超える画像は保存できません。";
      renderVisuals(true);
      return;
    }
    state.visualNotice = "";
    state.pendingVisualImport = { dir, file };
    renderVisuals(true);
  }

  function commitVisualImport(project, form) {
    const pending = state.pendingVisualImport;
    if (!pending || pending.dir !== form.dataset.importForm) return;
    if (!window.SHOSAI_DESK_MEDIA || typeof window.SHOSAI_DESK_MEDIA.put !== "function") {
      state.visualNotice = "この端末では画像を保存できません";
      renderVisuals(true);
      return;
    }
    const data = new FormData(form);
    const dir = pending.dir;
    window.SHOSAI_DESK_MEDIA.put(project.id, dir, pending.file)
      .then(() => {
        const old = state.visualImageUrls.get(dir);
        if (old && window.URL && typeof window.URL.revokeObjectURL === "function") window.URL.revokeObjectURL(old);
        if (window.URL && typeof window.URL.createObjectURL === "function") {
          state.visualImageUrls.set(dir, window.URL.createObjectURL(pending.file));
        }
        project.visualMeta = normalizeVisualMeta(project.visualMeta);
        project.visualMeta[dir] = {
          importedAt: new Date().toISOString(),
          kind: Object.prototype.hasOwnProperty.call(VISUAL_KIND_LABELS, data.get("kind")) ? data.get("kind") : "ai",
          method: stringOrEmpty(data.get("method")).trim(),
          prompt: stringOrEmpty(data.get("prompt")).trim(),
          firstImpression: null,
          revealed: !firstLookEnabled(),
        };
        state.pendingVisualImport = null;
        state.visualNotice = "";
        syncCurrentDeskProject();
        renderVisuals(true);
      })
      .catch(() => {
        state.visualNotice = "この端末では画像を保存できません";
        renderVisuals(true);
      });
  }

  function removeVisualImage(project, dir) {
    const finish = () => {
      const old = state.visualImageUrls.get(dir);
      if (old && window.URL && typeof window.URL.revokeObjectURL === "function") window.URL.revokeObjectURL(old);
      state.visualImageUrls.delete(dir);
      project.visualMeta = normalizeVisualMeta(project.visualMeta);
      project.visualMeta[dir] = null;
      delete state.promptOpen[dir];
      syncCurrentDeskProject();
      renderVisuals(true);
    };
    if (window.SHOSAI_DESK_MEDIA && typeof window.SHOSAI_DESK_MEDIA.remove === "function") {
      window.SHOSAI_DESK_MEDIA.remove(project.id, dir).then(finish).catch(finish);
    } else {
      finish();
    }
  }

  function renderVisuals(isNew) {
    const grid = $("#visual-grid");
    if (isNew) {
      renderNewVisuals(grid);
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
            <p class="save-note">判断はこの制作の紙面に残ります。</p>
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
          syncCurrentDeskProject();
          $$(".judge-btn", card).forEach((b2) =>
            b2.setAttribute("aria-pressed", String(d.verdict === b2.dataset.verdict)));
          if (d.verdict) $("textarea", card).focus();
        }));
      $("textarea", card).addEventListener("input", (e) => {
        const d = state.decisions[id] || {};
        d.reason = e.target.value;
        state.decisions[id] = d;
        syncCurrentDeskProject();
      });
    });
  }

  // ---------- ライトボックス ----------
  const LB_ORDER = ["vA", "vA2", "vB", "vC"];

  function lbItem(id) {
    if (state.project && state.project.kind === "new" && VISUAL_DIR_KEYS.includes(id)) {
      const p = state.project.data;
      const direction = (p.directions && p.directions[id]) || { label: "", intent: "" };
      const url = state.visualImageUrls.get(id);
      if (url) return { dir: id, label: direction.label || VISUAL_DIRECTION_PLACEHOLDERS[id], intent: direction.intent, imageUrl: url };
    }
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
    $("#lb-art").innerHTML = item.imageUrl
      ? `<img src="${esc(item.imageUrl)}" alt="案${esc(item.dir)}の持ち込み画像">`
      : ART[item.art]();
    $("#lb-dir").textContent = `案${item.dir} — ${item.label}`;
    $("#lb-intent").textContent = item.intent;
    $("#lightbox").hidden = false;
    $("#lb-close").focus();
  }

  function stepLightbox(delta) {
    if (!lbCurrent) return;
    const order = state.project && state.project.kind === "new"
      ? VISUAL_DIR_KEYS.filter((dir) => state.visualImageUrls.has(dir))
      : LB_ORDER;
    const i = order.indexOf(lbCurrent);
    if (i < 0 || !order.length) return;
    const next = order[(i + delta + order.length) % order.length];
    openLightbox(next);
  }

  function closeLightbox() {
    $("#lightbox").hidden = true;
    lbCurrent = null;
    if (lbReturnFocus) lbReturnFocus.focus();
  }

  // ---------- 資料棚 ----------
  function openShelf() {
    state.shelfPlacing = null;
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
    if (state.project && state.project.kind === "new") {
      renderShelfDb();
      return;
    }
    renderShelfFixed();
  }

  function shelfGenreOptions(works) {
    const counts = new Map();
    (works || []).forEach((work) => {
      // チップは日本語のcategoryで作る（genreは英語スラッグで読めない）
      const genre = stringOrEmpty(work.category).trim();
      if (!genre) return;
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([genre]) => genre);
  }

  function truncateText(text, limit) {
    const value = stringOrEmpty(text).trim();
    return value.length > limit ? `${value.slice(0, limit)}…` : value;
  }

  function renderShelfDb() {
    const input = $("#shelf-input");
    const body = $("#shelf-body");
    const works = DB && Array.isArray(DB.works) ? DB.works : [];
    const q = (input.value || "").trim();
    const p = state.project.data;
    const genres = shelfGenreOptions(works);
    if (state.shelfGenre && !genres.includes(state.shelfGenre)) state.shelfGenre = "";
    const chips = [`<button type="button" class="shelf-chip" data-shelf-genre="" aria-pressed="${state.shelfGenre === ""}">すべて</button>`]
      .concat(genres.map((genre) =>
        `<button type="button" class="shelf-chip" data-shelf-genre="${esc(genre)}" aria-pressed="${state.shelfGenre === genre}">${esc(genre)}</button>`))
      .join("");
    let results = q ? searchShelfWorks(works, q) : [];
    if (state.shelfGenre) results = results.filter(({ work }) => work.category === state.shelfGenre);
    const shown = results.slice(0, 30);
    const resultHtml = q
      ? `
        <p class="shelf-count">全${results.length}件中${shown.length}件を表示</p>
        ${shown.map(({ work }) => renderShelfDbCard(work)).join("")}
        ${!results.length ? `<p class="evidence-empty" style="padding:20px 0">該当なし。検索語を変えて探してください。</p>` : ""}`
      : `<p class="evidence-empty" style="padding:20px 0">問いの中の言葉や、作品名・会社名・ジャンルで探せます。</p>`;

    body.innerHTML = `
      <div class="shelf-context">
        <p>この問いに効く資料を探す — ${esc(p.question.current)}</p>
        ${p.sceneLine ? `<p>場面の一行 — ${esc(p.sceneLine)}</p>` : ""}
      </div>
      <div class="shelf-chips">${chips}</div>
      ${resultHtml}`;

    $$("[data-shelf-genre]", body).forEach((button) => {
      button.addEventListener("click", () => {
        state.shelfGenre = button.dataset.shelfGenre || "";
        state.shelfPlacing = null;
        renderShelf();
      });
    });
    $$("[data-read-work]", body).forEach((link) =>
      link.addEventListener("click", closeShelf));
    $$("[data-place-open]", body).forEach((button) => {
      button.addEventListener("click", () => {
        state.shelfPlacing = button.dataset.placeOpen;
        renderShelf();
      });
    });
    $$("[data-place-db]", body).forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".ref-card");
        const id = button.dataset.placeDb;
        const role = ($('input[type="radio"]:checked', card) || {}).value || "near";
        const noteInput = $("input[data-place-note]", card);
        state.placed.add(id);
        state.placedMeta.set(id, {
          role: role === "contrast" ? "contrast" : "near",
          note: noteInput ? noteInput.value : "",
          at: new Date().toISOString(),
        });
        state.shelfPlacing = null;
        syncCurrentDeskProject();
        renderPlaced();
        renderShelf();
      });
    });
  }

  function renderShelfDbCard(work) {
    const placed = state.placed.has(work.id);
    const confidence = `<span title="${esc(work.confidence || "")}">${esc(confidenceLabel(work.confidence))}</span>`;
    const placing = state.shelfPlacing === work.id;
    return `
      <article class="ref-card">
        <p class="t">${esc(work.title)}</p>
        <p class="meta"><span class="k-fact">▪</span> ${esc(workMetaLine(work, true))}</p>
        ${work.summary ? `<p class="shelf-summary">${esc(truncateText(work.summary, 120))}</p>` : ""}
        <div class="ref-foot">
          <span class="conf">確信度: ${confidence}</span>
          <a href="#db/${encodeURIComponent(work.id)}" data-read-work>作品ページを読む →</a>
        </div>
        <div class="ref-foot">
          ${placed ? `<button type="button" class="btn-place" disabled>置きました</button>` : `
            <button type="button" class="btn-place" data-place-open="${esc(work.id)}">この制作へ置く</button>`}
        </div>
        ${placing && !placed ? `<div class="shelf-place-editor">
          <div class="shelf-role" role="group" aria-label="置き方">
            <label><input type="radio" name="role-${esc(work.id)}" value="near" checked>近い</label>
            <label><input type="radio" name="role-${esc(work.id)}" value="contrast">対照</label>
          </div>
          <label class="sheet-field">
            <span>一行理由</span>
            <input data-place-note type="text" placeholder="なぜ置くか — 空でも置けます。あとから書けます">
          </label>
          <button type="button" class="btn-place" data-place-db="${esc(work.id)}">置く</button>
        </div>` : ""}
      </article>`;
  }

  function renderShelfFixed() {
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
        syncCurrentDeskProject();
        renderPlaced();
      }));
  }

  // ---------- 舞台技術（調査ドラフトの読み取り専用カード） ----------
  const apparatusLibrary = window.STAGE_APPARATUS_LIBRARY || null;
  const apparatusState = { query: "", family: "", scale: "", selected: null };

  const APPARATUS_BUDGET_LABELS = {
    entry: "小規模な入口",
    entry_illusion: "小規模な錯視",
    study: "縮小スタディ",
    existing_venue_use: "既設設備を使う",
    study_model: "縮小スタディ",
    small_event: "小規模イベント",
    small_drop: "小規模な幕落とし",
    lab_collaboration: "研究機関等との共同実験",
    professional: "本格実装",
    custom_stage_unit: "舞台用カスタム機",
    temporary_custom: "仮設カスタム",
    temporary_full_water: "本格的な仮設水舞台",
    touring_professional: "巡演向け本格実装",
    full_scale: "フルスケール",
    permanent: "常設",
    permanent_multiple: "複数基の常設",
    permanent_residency: "専用常設",
    flagship: "大型・常設",
    arena: "アリーナ級",
    arena_custom: "アリーナ用カスタム造形",
    acrobatic_multi_unit: "複数台・アクロバット仕様",
    large_sniffer_system: "大型高速巻上げ",
    large_kinetic: "大型可動鏡面",
    large_grid_or_arena: "大型グリッド／アリーナ",
    multi_wagon_arena: "複数ワゴン／アリーナ",
    passenger_or_multi_robot: "人搭乗／複数ロボット",
    permanent_or_stadium: "常設／スタジアム",
    stadium_tour: "スタジアムツアー",
    venue_installation: "会場常設",
    simulation: "安全な模擬実験",
    large_installation: "大型設備",
    large_venue: "大規模会場",
    stadium: "スタジアム級",
    multi_unit_arena: "複数台・アリーナ級",
    large_kinetic_fabric: "大型キネティック布",
    seat_level_multi_scent: "座席別・多香調システム",
  };

  const APPARATUS_ROLE_LABELS = {
    automation_operator: "オートメーション・オペレーター",
    automation_engineer: "オートメーション設計",
    automation_programmer: "オートメーション・プログラマー",
    operator: "装置オペレーター",
    rigger: "リガー",
    video_engineer: "映像エンジニア",
    media_server_operator: "メディアサーバー・オペレーター",
    projectionist: "映写担当",
    projection_designer: "プロジェクション・デザイナー",
    tracking_engineer: "トラッキング・エンジニア",
    lighting_programmer: "照明プログラマー",
    lighting_designer: "照明デザイナー",
    flying_director: "フライング・ディレクター",
    flying_operator: "フライング・オペレーター",
    spotter: "安全監視",
    safety_spotter: "安全監視",
    stage_manager: "舞台監督",
    stage_carpenter: "舞台機構・大道具",
    structural_engineer: "構造設計",
    stunt_or_acrobatic_coordinator: "アクロバット／スタント調整",
    water_system_engineer: "水処理・水機構設計",
    water_effect_engineer: "ウォーターエフェクト設計",
    diver: "潜水技術者",
    lifeguard: "水上安全担当",
    maintenance_technician: "保守技術者",
    wardrobe_maintenance: "衣装メンテナンス",
    electrician: "電気担当",
    kinetic_programmer: "キネティック・プログラマー",
    drone_show_designer: "ドローンショー・デザイナー",
    flight_safety_manager: "飛行安全管理",
    drone_operator: "ドローン・オペレーター",
    automation_designer: "オートメーション・デザイナー",
    scenic_engineer: "舞台美術エンジニア",
    scenic_designer: "舞台美術デザイナー",
    wireless_engineer: "無線エンジニア",
    mechanical_engineer: "機械設計",
    movement_coach: "ムーブメント・コーチ",
    robotics_engineer: "ロボティクス・エンジニア",
    safety_plc_engineer: "安全PLCエンジニア",
    robot_programmer: "ロボット・プログラマー",
    choreographer: "振付家",
    inflatable_designer: "インフレータブル・デザイナー",
    fabrication_engineer: "製作エンジニア",
    blower_technician: "送風機技術者",
    fire_safety_manager: "防火安全管理",
    drapery_specialist: "舞台幕スペシャリスト",
    mirror_installation_specialist: "大型鏡面施工",
    laser_safety_officer: "レーザー安全管理者",
    laser_programmer: "レーザー・プログラマー",
    show_control_programmer: "ショーコントロール・プログラマー",
    venue_safety_manager: "会場安全管理",
    audience_lighting_designer: "客席照明デザイナー",
    rf_or_ir_technician: "RF／IR技術者",
    front_of_house_manager: "フロント運営責任者",
    sustainability_manager: "サステナビリティ管理",
    sound_designer: "音響デザイナー",
    system_engineer: "音響システム・エンジニア",
    network_audio_engineer: "ネットワーク音響エンジニア",
    mix_engineer: "ミックス・エンジニア",
    accessibility_consultant: "アクセシビリティ監修",
    acoustician: "音響設計者",
    aerial_director: "エアリアル・ディレクター",
    aerial_robotics_engineer: "飛行ロボティクス設計",
    air_quality_monitor: "空気環境監視",
    airflow_engineer: "気流設計",
    anamorphic_content_designer: "アナモルフィック映像デザイナー",
    animatronics_engineer: "アニマトロニクス設計",
    architect: "建築設計",
    atmospherics_technician: "大気演出技術者",
    audio_dsp_engineer: "音響DSPエンジニア",
    audio_system_engineer: "音響システム設計",
    balloon_system_engineer: "気球システム設計",
    biomedical_signal_engineer: "生体信号エンジニア",
    black_light_director: "ブラックライト演出監修",
    broadcast_engineer: "映像伝送エンジニア",
    bubble_artist: "シャボン膜アーティスト",
    cable_camera_pilot: "ケーブルカメラ・パイロット",
    camera_operator: "カメラ・オペレーター",
    camera_shading_operator: "カメラ色調整",
    caption_operator: "字幕オペレーター",
    character_technical_director: "キャラクター技術監督",
    chemical_safety_advisor: "化学物質安全監修",
    cleaning_crew: "清掃クルー",
    compressed_air_technician: "圧縮空気技術者",
    content_designer: "コンテンツ・デザイナー",
    content_safety_editor: "生成コンテンツ安全編集",
    control_system_engineer: "制御システム設計",
    costume_designer: "衣装デザイナー",
    creature_designer: "クリーチャー・デザイナー",
    creature_operator: "クリーチャー・オペレーター",
    crowd_safety_manager: "群集安全管理",
    display_engineer: "ディスプレイ・エンジニア",
    electrical_safety_engineer: "電気安全設計",
    electromagnetics_engineer: "電磁気設計",
    electronics_engineer: "電子回路エンジニア",
    eye_tracking_engineer: "視線計測エンジニア",
    fall_protection_supervisor: "墜落防止監督",
    floor_technician: "舞台床技術者",
    flying_system_engineer: "フライング機構設計",
    fountain_programmer: "噴水プログラマー",
    gas_safety_technician: "ガス安全技術者",
    giant_puppet_engineer: "巨大パペット設計",
    ground_handler: "地上誘導員",
    haptic_designer: "触覚演出デザイナー",
    head_rigger: "チーフ・リガー",
    ice_show_director: "アイスショー監督",
    illusion_designer: "イリュージョン・デザイナー",
    interaction_designer: "インタラクション・デザイナー",
    interaction_engineer: "インタラクション設計",
    interactive_designer: "インタラクティブ演出設計",
    interactive_system_engineer: "インタラクティブ・システム設計",
    kinetic_artist: "キネティック・アーティスト",
    kinetic_rigging_designer: "キネティック吊物設計",
    led_engineer: "LEDエンジニア",
    lidar_engineer: "LiDARエンジニア",
    lighting_system_engineer: "照明システム設計",
    mechanical_safety_engineer: "機械安全設計",
    mechatronics_engineer: "メカトロニクス設計",
    miniature_artist: "ミニチュア美術家",
    mist_system_engineer: "ミスト設備設計",
    mobile_stage_engineer: "移動舞台設計",
    motion_capture_supervisor: "モーションキャプチャ監修",
    motion_control_operator: "モーション制御オペレーター",
    motion_programmer: "モーション・プログラマー",
    network_engineer: "ネットワーク・エンジニア",
    plumber: "給排水技術者",
    privacy_lead: "プライバシー管理責任者",
    prop_designer: "小道具デザイナー",
    ptz_operator: "PTZカメラ・オペレーター",
    puppet_builder: "パペット製作者",
    puppet_designer: "パペット・デザイナー",
    puppet_director: "パペット演出監督",
    puppeteer: "パペティア",
    pyrotechnician: "火薬・炎効果技術者",
    real_time_ai_engineer: "リアルタイムAIエンジニア",
    real_time_engineer: "リアルタイム映像エンジニア",
    ride_operator: "ライド・オペレーター",
    ride_system_engineer: "ライドシステム設計",
    scenic_artist: "舞台美術ペインター",
    scenic_fabricator: "舞台美術製作",
    scent_designer: "香りデザイナー",
    scent_system_technician: "香りシステム技術者",
    seating_system_engineer: "客席機構設計",
    sfx_operator: "特殊効果オペレーター",
    site_manager: "施工現場責任者",
    skating_coach: "スケーティング指導",
    sound_artist: "サウンド・アーティスト",
    sound_engineer: "音響エンジニア",
    spatial_audio_engineer: "空間音響エンジニア",
    special_effects_designer: "特殊効果デザイナー",
    stage_machinery_engineer: "舞台機構設計",
    stage_safety_manager: "舞台安全管理",
    stilt_performer: "スティルト・パフォーマー",
    structural_acoustician: "建築音響設計",
    swarm_programmer: "群制御プログラマー",
    system_tuner: "システム調整技術者",
    theatre_consultant: "劇場コンサルタント",
    translator: "翻訳者",
    venue_technician: "会場技術者",
    video_designer: "映像デザイナー",
    video_system_engineer: "映像システム設計",
    vision_director: "カメラ映像監督",
    volumetric_capture_engineer: "ボリュメトリック撮影エンジニア",
    wardrobe_supervisor: "衣装管理責任者",
    water_effects_engineer: "水演出エンジニア",
    wearable_technology_designer: "ウェアラブル技術デザイナー",
    weather_safety_manager: "気象安全管理",
    web_realtime_engineer: "Webリアルタイム通信エンジニア",
    levitation_vendor: "浮遊システム・ベンダー",
    show_control_engineer: "ショーコントロール設計",
    science_demonstrator: "科学実演担当",
    printmaker: "版画・印刷作家",
    graphic_designer: "グラフィック・デザイナー",
    circus_rigger: "サーカス・リガー",
    circus_coach: "サーカス指導者",
    acrobatic_performer: "アクロバット出演者",
    high_voltage_engineer: "高電圧技術者",
    electrical_safety_officer: "電気安全管理者",
    quick_change_dresser: "早替え衣裳係",
    science_historian: "科学史監修",
    biological_safety_advisor: "生物安全監修",
    book_artist: "ブック・アーティスト",
    botanical_advisor: "植物監修",
    cultural_context_advisor: "文化的文脈監修",
    fluid_system_engineer: "流体システム設計",
    furniture_designer: "家具デザイナー",
    granular_materials_specialist: "粒体材料専門家",
    instrument_builder: "楽器製作者",
    materials_specialist: "材料専門家",
    mathematics_communicator: "数学コミュニケーター",
    occupational_therapist: "作業療法・身体知覚監修",
    optical_designer: "光学設計",
    optical_illusion_designer: "視覚錯視デザイナー",
    paper_engineer: "ペーパー・エンジニア",
    rope_specialist: "ロープ・結索専門家",
    shadow_theatre_designer: "影絵・影演出デザイナー",
    thermal_system_engineer: "熱システム設計",
    audience_operations: "客席運営",
    audience_safety_steward: "観客安全係",
    conservator_advisor: "保存修復アドバイザー",
    crowd_steward: "群集誘導係",
    cultural_consultant: "文化的文脈監修",
    electrical_safety_lead: "電気安全責任者",
    fire_safety_lead: "防火安全責任者",
    four_fabric_performers: "布操演者4名",
    image_artist: "イメージ・アーティスト",
    inflatable_scenic_engineer: "インフレータブル美術設計",
    kinetic_sculpture_fabricator: "運動彫刻製作者",
    licensed_apparatus_provider: "認定装置提供者",
    licensed_operator: "認定オペレーター",
    lighting_operator: "照明オペレーター",
    maintenance_team: "保守チーム",
    musician: "演奏家",
    object_designer: "オブジェクト・デザイナー",
    optical_prop_maker: "光学小道具製作者",
    outside_facilitator: "客席側ファシリテーター",
    performer: "出演者",
    production_manager: "プロダクション・マネージャー",
    prop_maker: "小道具製作者",
    proprietary_trained_operator: "メーカー訓練済み操作者",
    puppet_maker: "人形製作者",
    qualified_rigger: "有資格リガー",
    rescue_team: "救助チーム",
    rigging_engineer: "リギング設計",
    safety_reviewer: "安全審査担当",
    scenic_carpenter: "舞台美術大工",
    scenic_mechanical_designer: "舞台美術機械設計",
    scenographer: "セノグラファー",
    shadow_performer: "影絵操演者",
    show_designer: "ショー・デザイナー",
    sound_operator: "音響オペレーター",
    spotter_team: "安全監視チーム",
    textile_fabricator: "舞台布製作者",
    textile_scenic_designer: "テキスタイル舞台美術設計",
    theatre_machinery_engineer: "劇場機構設計",
    touring_automation_engineer: "巡演オートメーション設計",
    touring_carpenter: "巡演舞台大工",
    trained_puppeteer: "訓練を受けた人形操演者",
    venue_engineer: "会場設備設計",
    venue_facilities: "会場施設担当",
    venue_maintenance: "会場保守担当",
    venue_safety_lead: "会場安全責任者",
    venue_technical_manager: "会場技術責任者",
    water_effects_specialist: "水演出専門家",
    water_stage_technician: "水上舞台技術者",
  };

  function apparatusCards() {
    return apparatusLibrary && Array.isArray(apparatusLibrary.cards) ? apparatusLibrary.cards : [];
  }

  function apparatusFiltered() {
    const query = apparatusState.query.trim().toLowerCase();
    return apparatusCards().filter((card) => {
      if (apparatusState.family && card.family !== apparatusState.family) return false;
      if (apparatusState.scale && card.planning_scale !== apparatusState.scale) return false;
      if (!query) return true;
      return JSON.stringify(card).toLowerCase().includes(query);
    });
  }

  function apparatusMoney(value) {
    if (typeof value === "number") {
      if (value >= 100000000) return `${value / 100000000}億円`;
      if (value >= 10000) return `${value / 10000}万円`;
      return `${value.toLocaleString("ja-JP")}円`;
    }
    const plus = String(value || "").match(/^(\d+)_plus$/);
    return plus ? `${apparatusMoney(Number(plus[1]))}〜` : String(value || "要見積");
  }

  function apparatusBudgetRows(card) {
    return Object.entries(card.budget_jpy_inferred || {}).map(([key, value]) => {
      const range = Array.isArray(value)
        ? `${apparatusMoney(value[0])}〜${apparatusMoney(value[1])}`
        : apparatusMoney(value);
      return `<li><span>${esc(APPARATUS_BUDGET_LABELS[key] || key)}</span><b>${esc(range)}</b></li>`;
    }).join("");
  }

  function apparatusListHtml(items) {
    return items.map((card, index) => `
      <button type="button" class="apparatus-row${card.id === apparatusState.selected ? " selected" : ""}"
              data-apparatus="${esc(card.id)}">
        <span class="apparatus-row-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="apparatus-row-copy">
          <span class="apparatus-row-name">${esc(card.name_ja)}</span>
          <span class="apparatus-row-meta">${esc(card.family)} ・ ${esc(card.planning_scale)}${card.digital_dependency === "none" ? " ・ 非デジタル" : ""}</span>
          <span class="apparatus-row-effect">${esc((card.creative_capability || [])[0] || "")}</span>
        </span>
      </button>`).join("");
  }

  function renderApparatusList() {
    if (!apparatusLibrary) return;
    const visible = apparatusFiltered();
    $("#apparatus-count").textContent = `${apparatusCards().length}件中 ${visible.length}件 ・ 調査ドラフト`;
    $("#apparatus-list").innerHTML = apparatusListHtml(visible)
      || `<p class="evidence-empty">条件に合う舞台技術はありません。</p>`;
    $$('[data-apparatus]', $("#apparatus-list")).forEach((button) =>
      button.addEventListener("click", () => {
        const hash = `#apparatus/${encodeURIComponent(button.dataset.apparatus)}`;
        if (location.hash === hash) selectApparatus(button.dataset.apparatus);
        else location.hash = hash;
      }));
  }

  function apparatusSection(title, inner, className) {
    return `<section class="apparatus-section${className ? ` ${className}` : ""}"><h3>${esc(title)}</h3>${inner}</section>`;
  }

  function apparatusList(values) {
    return `<ul>${(values || []).map((value) => `<li>${esc(value)}</li>`).join("")}</ul>`;
  }

  function apparatusIdeaSeed(card, mode, context) {
    const subject = context.trim() || "いま考えている場面";
    const effect = (card.creative_capability || [])[0] || card.name_ja;
    const mechanism = (card.mechanism || []).slice(0, 2).join("と");
    const failure = (card.failure_modes || [])[0] || "成立条件が崩れること";
    const variants = {
      scene: `${subject}で、${effect}。${mechanism}を、装置の説明ではなく場面の変化として見せるにはどうするか。`,
      body: `${subject}で、${card.name_ja}を人物の動きと結びつける。人物が操作しているのか、装置に動かされているのかが途中で反転する場面をつくる。`,
      reverse: `${subject}で、${card.name_ja}が期待どおりに成立しないことを演出にする。${failure}を事故ではなく、安全な代替表現へ置き換えて何を語れるか。`,
      prototype: `${subject}を、まず「${card.minimum_viable_version}」から試す。本格装置を作る前に、観客へ伝わる因果を一つだけ確かめる。`,
    };
    return {
      recipe: `舞台技術から変形・${mode === "body" ? "身体" : mode === "reverse" ? "反転" : mode === "prototype" ? "小さく試す" : "場面"}`,
      text: variants[mode] || variants.scene,
      apparatusSources: [card.id],
      inspiration: `参照技術: ${card.name_ja}。表面を再現せず、${mechanism || "内部原理"}という関係を別の場面へ変形する。`,
    };
  }

  function renderApparatusDetail(card) {
    if (!card) {
      $("#apparatus-detail").innerHTML = `<p class="evidence-empty">条件に合う舞台技術はありません。</p>`;
      return;
    }
    const sources = (card.examples || []).map((example) => `
      <li>
        <a href="${esc(example.source)}" target="_blank" rel="noopener noreferrer">${esc(example.title)} <span>外部資料 ↗</span></a>
        <small>${esc(example.evidence_status)}</small>
      </li>`).join("");
    const canonical = (card.canonical_links || [])
      .filter((id) => id.startsWith("show_"))
      .map((id) => `<a class="apparatus-canonical-link" href="#db/${encodeURIComponent(id)}">資料棚の作品を読む →</a>`)
      .join("");
    const roles = (card.crew_roles || []).map((role) => APPARATUS_ROLE_LABELS[role] || role.replaceAll("_", " "));
    $("#apparatus-detail").innerHTML = `
      <article class="apparatus-card">
        <header class="apparatus-card-head">
          <button type="button" class="apparatus-mobile-back" id="apparatus-mobile-back">← 一覧へ</button>
          <p class="apparatus-card-kicker">${esc(card.family)} ／ ${esc(card.planning_scale)}</p>
          <h2>${esc(card.name_ja)}</h2>
          <div class="apparatus-status-line">
            <span>調査ドラフト</span>
            <span>見積前</span>
            <span>安全設計前</span>
            ${card.digital_dependency === "none" ? "<span>デジタル依存なし</span>" : ""}
          </div>
        </header>
        <div class="apparatus-card-body">
          ${apparatusSection("この装置で作れること", apparatusList(card.creative_capability), "apparatus-creative")}
          <div class="apparatus-pair">
            ${apparatusSection("内部の仕組み", apparatusList(card.mechanism))}
            ${apparatusSection("最小構成で試す", `<p>${esc(card.minimum_viable_version)}</p>`, "apparatus-prototype")}
          </div>
          ${card.control_chain ? apparatusSection("信号と制御の流れ", `<p class="apparatus-control-chain">${esc(card.control_chain)}</p>`) : ""}
          ${apparatusSection("企画初期の予算レンジ", `<ul class="apparatus-budget">${apparatusBudgetRows(card)}</ul><p class="apparatus-budget-note">公開価格と実例から置いたAI推定。会場・出演料・旅費・コンテンツ制作・税を原則含みません。</p>`, "apparatus-budget-section")}
          <div class="apparatus-pair">
            ${apparatusSection("会場に必要な条件", apparatusList(card.venue_requirements))}
            ${apparatusSection("必要になる専門職", apparatusList(roles))}
          </div>
          ${apparatusSection("先に潰す事故要因", apparatusList(card.failure_modes), "apparatus-danger")}
          ${apparatusSection("確認した実例・技術資料", `<ul class="apparatus-sources">${sources}</ul>${canonical}`)}
          <section class="apparatus-idea-maker" aria-labelledby="apparatus-idea-title">
            <div>
              <p class="apparatus-idea-kicker">IDEA SEED</p>
              <h3 id="apparatus-idea-title">この技術を、場面のアイデアに変える</h3>
              <p>作品名や扱いたい感情を書き、変形の方向を選びます。元カードへのリンクを保ったまま、端末内のスクラップブックへ保存できます。</p>
            </div>
            <label for="apparatus-idea-context">いま考えている場面・テーマ</label>
            <textarea id="apparatus-idea-context" rows="3" maxlength="240" placeholder="例：誰にも見つからずに部屋を出たい人物／祝祭が少しずつ崩れていく終幕"></textarea>
            <label for="apparatus-idea-mode">変形の方向</label>
            <select id="apparatus-idea-mode">
              <option value="scene">装置の因果を、場面の変化にする</option>
              <option value="body">人物の身体と結びつける</option>
              <option value="reverse">期待どおりに動かないことから考える</option>
              <option value="prototype">最小構成から試す</option>
            </select>
            <div class="apparatus-idea-actions">
              <button type="button" id="apparatus-to-scrapbook">スクラップブックに貼る</button>
              <button type="button" id="apparatus-start-project">この問いで制作机を始める</button>
            </div>
            <p id="apparatus-idea-status" class="apparatus-idea-status" aria-live="polite"></p>
          </section>
          <footer class="apparatus-card-foot">
            <p>このカードは構想と問い合わせ準備のための資料です。構造、リギング、水、人体吊りの施工図や安全判断には使えません。</p>
            <a href="#stage">舞台スケッチで配置を考える →</a>
          </footer>
        </div>
      </article>`;
    $("#apparatus-mobile-back").addEventListener("click", () =>
      scrollApparatusMobileTarget($(".apparatus-index")));
    const ideaSeed = () => apparatusIdeaSeed(card, $("#apparatus-idea-mode").value, $("#apparatus-idea-context").value);
    $("#apparatus-to-scrapbook").addEventListener("click", () => {
      const result = addToScrapbook(ideaSeed(), `「${card.name_ja}」から作った問いを紙面へ貼りました。`);
      renderSeeds();
      if (result) {
        flashScrapbookCard(result.id);
        location.hash = "#seeds";
      } else {
        $("#apparatus-idea-status").textContent = seedState.notice;
      }
    });
    $("#apparatus-start-project").addEventListener("click", () => {
      const seed = ideaSeed();
      openProject(buildNewProject(seed.text, seed));
    });
  }

  function scrollApparatusMobileTarget(target) {
    target.scrollIntoView({ block: "start" });
    window.scrollBy(0, -56);
  }

  function selectApparatus(id) {
    const card = apparatusCards().find((item) => item.id === id);
    if (!card) return;
    apparatusState.selected = id;
    renderApparatusList();
    renderApparatusDetail(card);
    if (window.matchMedia("(max-width: 820px)").matches)
      scrollApparatusMobileTarget($("#apparatus-detail"));
    else window.scrollTo(0, 0);
  }

  function initApparatus() {
    if (!apparatusLibrary) {
      $("#apparatus-list").innerHTML = `<p class="evidence-empty">舞台技術カードを読み込めません。</p>`;
      return;
    }
    const cards = apparatusCards();
    const families = [...new Set(cards.map((card) => card.family))];
    const scales = ["数百万円", "数千万円", "億円以上"].filter((scale) =>
      cards.some((card) => card.planning_scale === scale));
    $("#apparatus-family").innerHTML = `<option value="">すべての系統（${families.length}）</option>`
      + families.map((family) => `<option value="${esc(family)}">${esc(family)}</option>`).join("");
    $("#apparatus-scale").innerHTML = `<option value="">すべての予算規模</option>`
      + scales.map((scale) => `<option value="${esc(scale)}">本格実装: ${esc(scale)}</option>`).join("");
    $("#apparatus-search").addEventListener("input", (event) => {
      apparatusState.query = event.target.value;
      const visible = apparatusFiltered();
      if (!visible.some((card) => card.id === apparatusState.selected))
        apparatusState.selected = visible[0] ? visible[0].id : null;
      renderApparatusList();
      renderApparatusDetail(visible.find((card) => card.id === apparatusState.selected));
    });
    $("#apparatus-family").addEventListener("change", (event) => {
      apparatusState.family = event.target.value;
      const visible = apparatusFiltered();
      apparatusState.selected = visible[0] ? visible[0].id : null;
      renderApparatusList();
      renderApparatusDetail(visible[0]);
    });
    $("#apparatus-scale").addEventListener("change", (event) => {
      apparatusState.scale = event.target.value;
      const visible = apparatusFiltered();
      apparatusState.selected = visible[0] ? visible[0].id : null;
      renderApparatusList();
      renderApparatusDetail(visible[0]);
    });
    apparatusState.selected = cards[0] ? cards[0].id : null;
    renderApparatusList();
    renderApparatusDetail(cards[0]);
  }

  // ---------- 画面切り替え（ハッシュルーター） ----------
  const VIEWS = ["db", "apparatus", "companies", "roster", "desk", "stage", "seeds", "mondo"];

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
    if (h.startsWith("#companies/")) {
      showView("companies");
      selectCompanyRadar(decodeURIComponent(h.slice(11)));
      return;
    }
    if (h.startsWith("#apparatus/")) {
      showView("apparatus");
      selectApparatus(decodeURIComponent(h.slice(11)));
      return;
    }
    const name = h.slice(1);
    showView(VIEWS.includes(name) ? name : "db");
  }

  // ---------- 資料棚（作品データベース・正本読み取り） ----------
  const DB = typeof SHOSAI_DB !== "undefined" ? SHOSAI_DB : null;
  const companyRadarData = DB && DB.event_show_company_radar ? DB.event_show_company_radar : null;
  const companyRadarState = {
    query: "",
    type: "",
    selected: null,
  };

  function companyRadarTypes() {
    return companyRadarData && Array.isArray(companyRadarData.types) ? companyRadarData.types : [];
  }

  function companyRadarCompanies() {
    return companyRadarData && Array.isArray(companyRadarData.companies) ? companyRadarData.companies : [];
  }

  function companyTypeLabel(typeId) {
    const item = companyRadarTypes().find((type) => type.id === typeId);
    return item ? item.label : typeId;
  }

  function companyStatusLabel(status) {
    return companyRadarData && companyRadarData.catalog_statuses
      ? companyRadarData.catalog_statuses[status] || status
      : status;
  }

  function companyRadarFiltered() {
    const q = companyRadarState.query.trim().toLowerCase();
    return companyRadarCompanies().filter((company) => {
      if (companyRadarState.type && company.type_id !== companyRadarState.type) return false;
      if (!q) return true;
      return [company.name, company.research_region, company.evidence_statement, company.domains, companyTypeLabel(company.type_id)]
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }

  function openCompanyRadar(id) {
    const nextHash = "#companies/" + encodeURIComponent(id);
    if (location.hash === nextHash) selectCompanyRadar(id);
    else location.hash = nextHash;
  }

  function renderCompanyRadarDetail(company) {
    const detail = $("#company-radar-detail");
    if (!company) {
      detail.innerHTML = `<p class="evidence-empty">現在の条件に該当する制作会社はありません。</p>`;
      return;
    }
    // このレーダーから直接つないだ作品と、既にある会社台帳（company_catalogs）から
    // 引ける作品を合わせて出す。台帳を持つ会社に「接続なし」と表示していたのを直した。
    const catalog = (DB.company_catalog_links || {})[company.existing_catalog_company_id];
    const workIds = (company.catalog_work_ids || []).concat(catalog ? catalog.work_ids : []);
    const connectedWorks = Array.from(new Set(workIds))
      .map((id) => DB.works.find((work) => work.id === id))
      .filter(Boolean)
      .sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
    const CATALOG_PREVIEW = 12;
    const shown = connectedWorks.slice(0, CATALOG_PREVIEW);
    const rest = connectedWorks.length - shown.length;
    const catalogNote = catalog
      ? `<p class="company-dossier-muted">会社台帳から ${connectedWorks.length}件（公式カタログの想定 ${esc(String(catalog.expected ?? "—"))}件）。`
        + (rest > 0 ? `下に${CATALOG_PREVIEW}件だけ出しています。` : "")
        + `資料棚の会社で絞り込むと全件を読めます。</p>`
      : "";
    const connectedWorksHtml = connectedWorks.length
      ? catalogNote + `<ul class="company-dossier-work-list">${shown.map((work) => `
          <li><a class="company-dossier-work" href="#db/${encodeURIComponent(work.id)}">${esc(work.title)} <small>${esc(String(work.year || "年未確認"))} ↗</small></a></li>`).join("")}</ul>`
      : `<p class="company-dossier-muted">このレーダーから新規に接続した作品はまだありません。外部の公式ページを確認してから追加します。</p>`;
    detail.innerHTML = `
      <article class="company-dossier">
        <header class="company-dossier-head">
          <p class="company-dossier-kicker">COMPANY DOSSIER ／ ${esc(companyTypeLabel(company.type_id))}</p>
          <h2>${esc(company.name)}</h2>
          <p class="company-dossier-meta">探索上の地域: ${esc(company.research_region)} ・ 優先度 ${esc(company.priority)}</p>
        </header>
        <div class="company-dossier-grid">
          <section class="company-dossier-wide">
            <h3>公式に確認した制作範囲</h3>
            <p>${esc(company.evidence_statement)}</p>
          </section>
          <section>
            <h3>探索する領域</h3>
            <ul class="company-domain-list">${(company.domains || []).map((domain) => `<li>${esc(domain)}</li>`).join("")}</ul>
          </section>
          <section>
            <h3>台帳の状態</h3>
            <p class="company-dossier-status">${esc(companyStatusLabel(company.catalog_status))}</p>
          </section>
          <section>
            <h3>会社の公式根拠</h3>
            <a class="company-dossier-link" href="${esc(company.official_url)}" target="_blank" rel="noopener noreferrer">
              ${esc(company.source_label)} <small>外部サイト ↗</small>
            </a>
          </section>
          <section>
            <h3>次に追う作品</h3>
            <a class="company-dossier-link" href="${esc(company.next_collection_url)}" target="_blank" rel="noopener noreferrer">
              ${esc(company.next_collection_label)} <small>外部サイト ↗</small>
            </a>
          </section>
          <section class="company-dossier-wide">
            <h3>書斎に接続済みの作品</h3>
            ${connectedWorksHtml}
          </section>
        </div>
      </article>`;
  }

  function renderCompanyRadar() {
    if (!companyRadarData) return;
    const companies = companyRadarCompanies();
    const visible = companyRadarFiltered();
    const typeCounts = new Map(companyRadarTypes().map((type) => [
      type.id,
      companies.filter((company) => company.type_id === type.id).length,
    ]));
    $("#company-radar-boundary").textContent = companyRadarData.boundary || "";
    $("#company-radar-types").innerHTML = `
      <button type="button" class="company-radar-type" data-company-type="" aria-pressed="${!companyRadarState.type}">
        <span>すべて</span><span class="company-radar-type-count">${companies.length}社</span>
      </button>` + companyRadarTypes().map((type) => `
      <button type="button" class="company-radar-type" data-company-type="${esc(type.id)}" aria-pressed="${companyRadarState.type === type.id}">
        <span>${esc(type.label)}</span><span class="company-radar-type-count">${typeCounts.get(type.id) || 0}社</span>
      </button>`).join("");
    $("#company-radar-count").textContent = `${companies.length}社中 ${visible.length}社 ・ 公式に公開された制作範囲を入口にした索引`;
    $("#company-radar-list").innerHTML = visible.map((company, index) => `
      <button type="button" class="company-radar-row${companyRadarState.selected === company.id ? " selected" : ""}" data-company-radar="${esc(company.id)}">
        <span class="company-radar-row-index">${String(index + 1).padStart(2, "0")}</span>
        <span>
          <span class="company-radar-row-name">${esc(company.name)}</span>
          <span class="company-radar-row-meta">${esc(companyTypeLabel(company.type_id))} ・ ${esc(company.research_region)}</span>
        </span>
      </button>`).join("") || `<p class="evidence-empty">該当する会社はありません。</p>`;
    $$("[data-company-type]", $("#company-radar-types")).forEach((button) =>
      button.addEventListener("click", () => {
        companyRadarState.type = button.dataset.companyType;
        const nextVisible = companyRadarFiltered();
        if (!nextVisible.some((company) => company.id === companyRadarState.selected))
          companyRadarState.selected = nextVisible[0] ? nextVisible[0].id : null;
        renderCompanyRadar();
        renderCompanyRadarDetail(nextVisible.find((company) => company.id === companyRadarState.selected));
      }));
    $$("[data-company-radar]", $("#company-radar-list")).forEach((button) =>
      button.addEventListener("click", () => openCompanyRadar(button.dataset.companyRadar)));
  }

  function selectCompanyRadar(id) {
    if (!companyRadarData) return;
    const company = companyRadarCompanies().find((item) => item.id === id);
    if (!company) return;
    companyRadarState.selected = id;
    renderCompanyRadar();
    renderCompanyRadarDetail(company);
    if (window.matchMedia("(max-width: 899px)").matches)
      $("#company-radar-detail").scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }

  function initCompanyRadar() {
    if (!companyRadarData) {
      $("#company-radar-list").innerHTML = `<p class="evidence-empty">制作会社レーダーの正本が読み込めません。</p>`;
      return;
    }
    companyRadarState.selected = companyRadarCompanies()[0] ? companyRadarCompanies()[0].id : null;
    $("#company-radar-search").addEventListener("input", (event) => {
      companyRadarState.query = event.target.value;
      const visible = companyRadarFiltered();
      if (!visible.some((company) => company.id === companyRadarState.selected))
        companyRadarState.selected = visible[0] ? visible[0].id : null;
      renderCompanyRadar();
      renderCompanyRadarDetail(visible.find((company) => company.id === companyRadarState.selected));
    });
    renderCompanyRadar();
    renderCompanyRadarDetail(companyRadarCompanies().find((company) => company.id === companyRadarState.selected));
  }

  const dbState = {
    shelf: "all",
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
  const dbShelves = window.SHOSAI_SHELVES;

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

  function dbShelfDefinition() {
    return dbShelves.definitionFor(dbState.shelf);
  }

  function dbShelfWorks(shelfId) {
    return dbShelves.worksForShelf(DB.works, shelfId || dbState.shelf);
  }

  function matchesDbType(w, type) {
    if (!type) return true;
    if (type.startsWith("sub:")) return w.subcategory === type.slice(4);
    return w.category === type;
  }

  function updateDbTypeOptions() {
    const works = dbShelfWorks();
    const catCount = new Map();
    const subCount = new Map();
    for (const w of works) {
      if (w.category) catCount.set(w.category, (catCount.get(w.category) || 0) + 1);
      if (w.subcategory) subCount.set(w.subcategory, (subCount.get(w.subcategory) || 0) + 1);
    }
    const cats = [...catCount.entries()].sort((a, b) => b[1] - a[1]);
    const subs = [...subCount.entries()].sort((a, b) => b[1] - a[1]);
    const optionValues = new Set(["", ...cats.map(([category]) => category), ...subs.map(([subcategory]) => `sub:${subcategory}`)]);
    if (!optionValues.has(dbState.type)) dbState.type = "";
    $("#db-type").innerHTML =
      `<option value="">すべてのジャンル（${works.length}）</option>` +
      cats
        .map(([category, count]) => {
          let html = `<option value="${esc(category)}">${esc(category)}（${count}）</option>`;
          if (category === "サーカス・アクロバット")
            html += subs
              .map(([subcategory, subcount]) => `<option value="sub:${esc(subcategory)}">　└ ${esc(subcategory)}（${subcount}）</option>`)
              .join("");
          return html;
        })
        .join("");
    $("#db-type").value = dbState.type;
  }

  function renderDbShelfSwitcher() {
    const shelf = dbShelfDefinition();
    const works = dbShelfWorks();
    $$("[data-db-shelf]").forEach((button) => {
      const checked = button.dataset.dbShelf === shelf.id;
      button.setAttribute("aria-checked", String(checked));
      button.tabIndex = checked ? 0 : -1;
    });
    $("#db-shelf-description").textContent =
      `${shelf.label}: ${works.length}件（全体 ${DB.works.length}件）。${shelf.description}`;
  }

  function setDbShelf(shelfId) {
    if (!dbShelves.definitions.some((shelf) => shelf.id === shelfId)) return;
    dbState.shelf = shelfId;
    updateDbTypeOptions();
    renderDbShelfSwitcher();
    renderStagingLenses();
    renderDbList();
    if (dbState.detailMode === "lens") renderLensDigest();
  }

  function bindDbShelfSwitcher() {
    const buttons = $$("[data-db-shelf]");
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => setDbShelf(button.dataset.dbShelf));
      button.addEventListener("keydown", (event) => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
          (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
        setDbShelf(buttons[nextIndex].dataset.dbShelf);
      });
    });
  }

  function dbFilter(overrides) {
    const filters = { ...dbState, ...(overrides || {}) };
    const q = filters.query.trim().toLowerCase();
    return dbShelfWorks(filters.shelf).filter((w) => {
      if (filters.type && !matchesDbType(w, filters.type)) return false;
      if (filters.company && (w.company || "") !== filters.company) return false;
      if (filters.person && !(w.people || []).some((p) => p.person_id === filters.person))
        return false;
      if (filters.depth && String(depthMeta(w).amount_level) !== filters.depth) return false;
      if (filters.lens && !(w.staging_lenses || []).some((lens) => lens.id === filters.lens))
        return false;
      if (!q) return true;
      const idx = searchIdx.get(w.id);
      return q.split(/\s+/).every((term) => idx.hay.includes(term));
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
    const shelf = dbShelfDefinition();
    const shelfWorks = dbShelfWorks();
    const lens = lensMap.get(dbState.lens);
    const depth = (DB.research_depth_levels || []).find((item) => item.id === dbState.depth);
    $("#db-count").textContent =
      `${shelf.label} ${shelfWorks.length}件中 ${list.length}件（全体 ${DB.works.length}件）${lens ? ` ・ 型: ${lens.label}` : ""}${depth ? ` ・ ${depth.label}` : ""} ・ 索引生成 ${DB.generated}（正本は読み取りのみ）`;
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
        <span class="db-lens-count">${esc(dbFilter({ lens: lens.id }).length)}件</span>
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

  // 作品 → 制作会社レーダーへの逆リンク。会社から作品へは降りられるのに、作品から
  // 会社の全体像へ戻る道が無かった。works に company_id は無いので、会社台帳の
  // 作品ID索引から逆引きする（会社名の文字列は表記揺れがあり照合に使えない）。
  let workToRadarCache = null;

  function workToRadar() {
    if (workToRadarCache) return workToRadarCache;
    workToRadarCache = new Map();
    const links = (DB && DB.company_catalog_links) || {};
    const radar = companyRadarCompanies();
    Object.keys(links).forEach((catalogId) => {
      const company = radar.find((c) => c.existing_catalog_company_id === catalogId);
      if (!company) return;
      links[catalogId].work_ids.forEach((wid) => workToRadarCache.set(wid, company));
    });
    // レーダーから直接つないだ作品も辿れるようにする
    radar.forEach((company) => {
      (company.catalog_work_ids || []).forEach((wid) => {
        if (!workToRadarCache.has(wid)) workToRadarCache.set(wid, company);
      });
    });
    return workToRadarCache;
  }

  function companyRadarLink(w) {
    const company = workToRadar().get(w.id);
    if (!company) return "";
    return ` ・ <a class="dbd-radar-link" href="#companies/${encodeURIComponent(company.id)}">制作会社をたどる ↗</a>`;
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
        <p class="dbd-meta">${esc(w.company || "会社不明")} ・ ${esc(w.year || "年不明")}${companyRadarLink(w)}</p>
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
    if (!DB || !dbShelves) {
      $("#db-list").innerHTML =
        `<p class="evidence-empty" style="padding:16px">資料棚の索引または入口分類を読み込めません。</p>`;
      return;
    }
    buildDbMaps();
    buildSearchIndex();
    const initialLens = new URLSearchParams(location.search).get("lens") || "";
    if (lensMap.has(initialLens)) {
      dbState.lens = initialLens;
      dbState.detailMode = "lens";
    }
    updateDbTypeOptions();
    renderDbShelfSwitcher();
    bindDbShelfSwitcher();
    renderStagingLenses();

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

  window.SHOSAI_DESK_PROJECTS_API = Object.freeze({
    DESK_PROJECTS_STORAGE_KEY,
    SCENE_RELATION_LABELS,
    TRANSFORM_ROW_LABELS,
    BRIEF_FIELD_LABELS,
    VISUAL_DIR_KEYS,
    VISUAL_PROMPT_CAUTION,
    normalizeDeskProject,
    normalizeBranchOrigin,
    buildBranchProject,
    normalizeScene,
    normalizeTransformation,
    normalizeBrief,
    normalizeDirections,
    normalizeVisualMeta,
    briefDraftFromStudy,
    visualPromptText,
    revealVisualSlot,
    normalizePlacedEntries,
    searchShelfWorks,
    confidenceLabel,
    loadDeskProjects,
    persistDeskProjects,
    syncCurrentDeskProject,
    applySheetEdit,
    applySheetValues,
    state,
  });

  // ---------- 初期化 ----------
  function init() {
    initDesk();
    initDb();
    initApparatus();
    initCompanyRadar();
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
