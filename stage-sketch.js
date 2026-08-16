/* 舞台スケッチ — 2Dの構図・色・距離感を試すためのローカル制作道具。
   技術図面や3D舞台設計とは分離し、状態はこのブラウザ内だけに保存する。

   劇場形式（プロセニアム／スラスト／ビッグトップ／屋外／ブラックボックス）を
   切り替えられる。形式ごとに客席の位置が変わり、それが構図の条件になる。

   座標は正規化して持つ（u: 左右 0-1、v: 奥行き 0-1）。形式や規模を変えても
   配置が保たれ、同じ配置を別の劇場で見直せるようにするため。

   規模は「舞台を画面いっぱいに描き、人の大きさを舞台に対する比率で決める」形で
   表す。18mの舞台では人が小さく見える。寸法そのものは編集させない（設計計画書 8.5節）。 */

(function () {
  "use strict";

  /* 段階0のビート骨格。作品の正解ではなく、シーン名・役割・エネルギーだけを
     作るローカルの初期値。演者、道具、照明、背景、技、装置はここへ入れない。
     内容の正本: 2026-07-28_stage-sketch-codex-round2-answer.md D2 */
  const freezeBeatTemplate = (template) => Object.freeze({
    ...template,
    roles: Array.isArray(template.roles) ? Object.freeze(template.roles) : null,
    energy: Array.isArray(template.energy) ? Object.freeze(template.energy) : null,
  });
  const BEAT_TEMPLATES = Object.freeze([
    // 出典: https://cirque-cnac.bnf.fr/fr/esthetiques/le-cirque-classique
    //       https://cirque-cnac.bnf.fr/es/infos/glossaire
    freezeBeatTemplate({ id: "classic-circus", number: 1, name: "古典サーカス・プログラム型",
      range: "8〜12", roles: [
        "全員登場／世界提示", "短い個人番号", "対照的番号", "コミックな転換",
        "主力番号", "集団番号", "全員のfinale",
      ], energy: [4, 3, 4, 2, 4, 5, 5] }),
    freezeBeatTemplate({ id: "two-part-variety", number: 2, name: "二部制ヴァラエティ・ビル型",
      range: "8〜12＋休憩", roles: [
        "短い開幕", "小編成", "対照番号", "一部の山", "休憩",
        "複雑な仕込みを要する番号", "再加速", "集団の驚き", "finale",
      ], energy: [3, 3, 4, 5, 4, 3, 4, 5, 4] }),
    freezeBeatTemplate({ id: "three-act", number: 3, name: "三幕構成",
      range: "7〜9", roles: [
        "世界と人物", "発端", "目標決定", "障害の増加", "中央反転", "危機", "決断", "結果",
      ], energy: [1, 2, 3, 3, 4, 5, 4, 2] }),
    // 出典: https://teachers.yale.edu/curriculum/units/2016/3/5/4
    freezeBeatTemplate({ id: "freytag", number: 4, name: "フライタークのピラミッド",
      range: "6〜8", roles: [
        "提示", "発端", "上昇", "危機", "クライマックス", "下降", "新しい均衡",
      ], energy: [1, 2, 3, 4, 5, 3, 1] }),
    // 出典: https://eprints.lib.hokudai.ac.jp/repo/huscap/all/38486/
    freezeBeatTemplate({ id: "kishotenketsu", number: 5, name: "起承転結",
      range: "4（または各節2シーンで8）", roles: [
        "起＝規則提示", "承＝規則を深める", "転＝別の関係を持ち込む", "結＝両者の意味を結ぶ",
      ], energy: [1, 2, 4, 2] }),
    // 出典: https://education.nsw.gov.au/teaching-and-learning/curriculum/creative-arts/creative-arts-curriculum-resources-k-12/7-10-curriculum-resources/choreographic-forms
    freezeBeatTemplate({ id: "rondo", number: 6, name: "ロンド形式 A–B–A–C–A–D–A'",
      range: "5〜7", roles: [
        "基準となる身体／道具の規則A", "対照B", "A再演", "別の対照C",
        "A再演", "最大変奏D", "意味が変わったA'",
      ], energy: [2, 3, 2, 4, 2, 5, 3] }),
    freezeBeatTemplate({ id: "theme-variations", number: 7, name: "主題と変奏",
      range: "5〜8", roles: [
        "技／関係／道具の主題提示", "速度変奏", "空間変奏", "人数変奏",
        "制約変奏", "要素を引いた版", "統合版",
      ], energy: [2, 3, 3, 4, 5, 1, 4] }),
    // 出典: https://education.nsw.gov.au/teaching-and-learning/curriculum/creative-arts/creative-arts-curriculum-resources-k-12/7-10-curriculum-resources/choreographic-forms
    freezeBeatTemplate({ id: "canon-accumulation", number: 8, name: "カノン／アキュムレーション型",
      range: "6〜9", roles: [
        "一人が短い句を提示", "二人目が時間差で入る", "人数と句を蓄積", "層が衝突",
        "全員ユニゾン", "一人ずつ抜ける", "最初の一人へ戻る",
      ], energy: [1, 2, 3, 4, 5, 3, 1] }),
    // 出典: https://cnac.fr/sites/default/files/2024-03/Dossier_de_presse_23e_promotion.pdf
    freezeBeatTemplate({ id: "cycle-spiral", number: 9, name: "循環／螺旋ドラマトゥルギー",
      range: "6〜8", roles: [
        "原型となる出来事", "同じ出来事を別人物から見る", "別の客席方向から見る",
        "逆順で再生", "原因と思ったものが結果だったと判明", "変質した原点へ戻る",
      ], energy: [2, 3, 3, 4, 5, 2] }),
    freezeBeatTemplate({ id: "single-focus-agres", number: 10,
      name: "単一フォーカス／アグレ・ドラマトゥルギー", range: "6〜9", roles: [
        "安定状態", "道具／身体の規則提示", "最初の逸脱", "能力拡張",
        "失敗または停止", "関係から回復", "最大投入", "残響",
      ], energy: [1, 2, 3, 4, 2, 3, 5, 1] }),
  ]);
  const normalizeBeat = (raw) => {
    const beat = raw && typeof raw === "object" ? raw : {};
    const energy = Number(beat.energy);
    return {
      role: typeof beat.role === "string" ? beat.role.slice(0, 160) : "",
      energy: Number.isInteger(energy) && energy >= 1 && energy <= 5 ? energy : null,
    };
  };
  const normalizeSceneBeat = (kind, raw) => kind === "scene" ? normalizeBeat(raw) : null;
  const beatTemplateRows = (templateId) => {
    const template = BEAT_TEMPLATES.find((item) => item.id === templateId);
    if (!template || template.available === false || !template.roles || !template.energy) return [];
    return template.roles.map((role, index) => ({
      kind: "scene",
      title: role,
      beat: normalizeBeat({ role, energy: template.energy[index] }),
      pieces: [],
    }));
  };
  // DOMを立ち上げずに、同じ定数と正規化経路をNodeテストから検査する。
  window.SHOSAI_STAGE_BEAT_TEMPLATE_MODEL = Object.freeze({
    templates: BEAT_TEMPLATES,
    normalizeBeat,
    normalizeSceneBeat,
    rowsForTemplate: beatTemplateRows,
  });

  /* 光の意図は「どの灯体を置くか」ではなく、観客へどう見えてほしいかを
     場面ごとに残す。照明駒やプリセットとは別の層に置き、安全承認も持たせない。 */
  const LIGHT_INTENT_LAYER_VALUES = Object.freeze([
    "unspecified", "reveal", "soften", "conceal", "silhouette", "separate", "transform",
  ]);
  const LIGHT_INTENT_TRIGGER_VALUES = Object.freeze([
    "unknown", "scene-start", "action", "line", "music", "time", "manual",
  ]);
  const LIGHT_INTENT_CHANGE_VALUES = Object.freeze([
    "unknown", "hold", "fade-in", "fade-out", "snap", "crossfade", "blackout",
  ]);
  const LIGHT_INTENT_TEMPO_VALUES = Object.freeze([
    "unspecified", "instant", "quick", "breathe", "slow", "hold",
  ]);
  const lightIntentText = (value, max) => (
    typeof value === "string" ? value.trim().slice(0, max) : ""
  );
  const lightIntentEnum = (value, values, fallback) => (
    values.includes(value) ? value : fallback
  );
  const emptyLightingIntent = () => ({
    version: 1,
    objective: "",
    audienceFocus: "",
    layers: {
      performer: { intent: "unspecified", note: "" },
      background: { intent: "unspecified", note: "" },
      space: { intent: "unspecified", note: "" },
    },
    transition: {
      triggerType: "unknown",
      triggerNote: "",
      change: "unknown",
      tempo: "unspecified",
    },
    mood: "",
    referenceNote: "",
    implementationNote: "",
    safetyStatus: "not-assessed",
    sourceRefs: [],
  });
  const normalizeLightingIntent = (kind, raw) => {
    if (kind !== "scene" || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const next = emptyLightingIntent();
    next.objective = lightIntentText(raw.objective, 160);
    next.audienceFocus = lightIntentText(raw.audienceFocus, 160);
    const layers = raw.layers && typeof raw.layers === "object" ? raw.layers : {};
    ["performer", "background", "space"].forEach((key) => {
      const layer = layers[key] && typeof layers[key] === "object" ? layers[key] : {};
      next.layers[key] = {
        intent: lightIntentEnum(layer.intent, LIGHT_INTENT_LAYER_VALUES, "unspecified"),
        note: lightIntentText(layer.note, 160),
      };
    });
    const transition = raw.transition && typeof raw.transition === "object" ? raw.transition : {};
    next.transition = {
      triggerType: lightIntentEnum(transition.triggerType, LIGHT_INTENT_TRIGGER_VALUES, "unknown"),
      triggerNote: lightIntentText(transition.triggerNote, 160),
      change: lightIntentEnum(transition.change, LIGHT_INTENT_CHANGE_VALUES, "unknown"),
      tempo: lightIntentEnum(transition.tempo, LIGHT_INTENT_TEMPO_VALUES, "unspecified"),
    };
    next.mood = lightIntentText(raw.mood, 80);
    next.referenceNote = lightIntentText(raw.referenceNote, 200);
    next.implementationNote = lightIntentText(raw.implementationNote, 300);
    next.sourceRefs = Array.isArray(raw.sourceRefs) ? raw.sourceRefs.slice(0, 8).map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const kindValue = ["book", "research", "user"].includes(item.kind) ? item.kind : "research";
      const label = lightIntentText(item.label, 120);
      if (!label) return null;
      return { kind: kindValue, label, locator: lightIntentText(item.locator, 200) };
    }).filter(Boolean) : [];
    const layerContent = Object.values(next.layers).some((layer) => (
      layer.intent !== "unspecified" || Boolean(layer.note)
    ));
    const transitionContent = next.transition.triggerType !== "unknown"
      || next.transition.change !== "unknown"
      || next.transition.tempo !== "unspecified"
      || Boolean(next.transition.triggerNote);
    const textContent = Boolean(next.objective || next.audienceFocus || next.mood
      || next.referenceNote || next.implementationNote || next.sourceRefs.length);
    return layerContent || transitionContent || textContent ? next : null;
  };
  const LIGHT_INTENT_LAYER_LABELS = Object.freeze({
    ja: { performer: "演者", background: "背景", space: "空間" },
    en: { performer: "Performer", background: "Backdrop", space: "Space" },
  });
  const LIGHT_INTENT_VALUE_LABELS = Object.freeze({
    ja: {
      reveal: "見せる", soften: "和らげる", conceal: "隠す", silhouette: "輪郭にする",
      separate: "分離する", transform: "変化させる",
    },
    en: {
      reveal: "reveal", soften: "soften", conceal: "conceal", silhouette: "silhouette",
      separate: "separate", transform: "transform",
    },
  });
  const lightingIntentSummary = (raw, en = false, max = 120) => {
    const intent = normalizeLightingIntent("scene", raw);
    if (!intent) return en ? "No lighting intention yet" : "光の意図はまだありません";
    const parts = [];
    if (intent.objective) parts.push(intent.objective);
    else if (intent.audienceFocus) {
      parts.push(en ? `Audience focus: ${intent.audienceFocus}` : `観客の視線: ${intent.audienceFocus}`);
    } else {
      const langKey = en ? "en" : "ja";
      Object.entries(intent.layers).forEach(([key, layer]) => {
        if (layer.note) parts.push(`${LIGHT_INTENT_LAYER_LABELS[langKey][key]}: ${layer.note}`);
        else if (layer.intent !== "unspecified") {
          parts.push(`${LIGHT_INTENT_LAYER_LABELS[langKey][key]}: ${LIGHT_INTENT_VALUE_LABELS[langKey][layer.intent]}`);
        }
      });
    }
    if (intent.transition.triggerNote && parts.join(" ／ ").length < max * 0.7) {
      parts.push(intent.transition.triggerNote);
    }
    const joined = parts.join(en ? " / " : " ／ ") || (en ? "Lighting intention" : "光の意図");
    return joined.length > max ? `${joined.slice(0, max - 1)}…` : joined;
  };
  window.SHOSAI_STAGE_LIGHT_INTENT_MODEL = Object.freeze({
    empty: emptyLightingIntent,
    normalize: (raw) => normalizeLightingIntent("scene", raw),
    summary: lightingIntentSummary,
    layerValues: LIGHT_INTENT_LAYER_VALUES,
    triggerValues: LIGHT_INTENT_TRIGGER_VALUES,
    changeValues: LIGHT_INTENT_CHANGE_VALUES,
    tempoValues: LIGHT_INTENT_TEMPO_VALUES,
  });

  /* 意図の値を、図の上の作図記号へ写す。明るさの再現ではないので、
     沈める表現に真っ黒を使わず、斜線ハッチなど「指定」だと読める記号を使う。 */
  const LIGHT_INTENT_MARKS = Object.freeze({
    unspecified: null,
    reveal: { fill: null, dim: "others", outline: null, tag: "reveal" },
    soften: { fill: "rgba(9,8,7,0.35)", dim: null, outline: null, tag: "soften" },
    conceal: { fill: "rgba(9,8,7,0.45)", dim: null, outline: null, hatch: true, tag: "conceal" },
    silhouette: { fill: null, dim: null, outline: { w: 2, dash: null }, tag: "silhouette" },
    separate: { fill: null, dim: null, outline: { w: 3.5, dash: null }, tag: "separate" },
    transform: { fill: null, dim: null, outline: { w: 2, dash: [6, 5] }, tag: "transform" },
  });
  const lightIntentMark = (value) => LIGHT_INTENT_MARKS[value] || null;

  /* 意図から「どのレイヤーに何を描くか」の計画を組む。canvasに触らない。
     戻り値の layers は描く順（背景→空間→演者）に並べる。 */
  const lightIntentOverlayPlan = (raw) => {
    const intent = normalizeLightingIntent("scene", raw);
    if (!intent) return null;
    const layers = ["background", "space", "performer"]
      .map((key) => ({ key, value: intent.layers[key].intent, note: intent.layers[key].note,
        mark: lightIntentMark(intent.layers[key].intent) }))
      .filter((entry) => entry.mark);
    const revealed = layers.filter((entry) => entry.value === "reveal").map((entry) => entry.key);
    return {
      layers,
      revealed,
      // reveal が1つでもあるとき、reveal されていないレイヤーを沈める
      dimmed: revealed.length
        ? ["background", "space", "performer"].filter((key) => !revealed.includes(key))
        : [],
      audienceFocus: intent.audienceFocus,
      transition: intent.transition,
      hasAnything: layers.length > 0 || Boolean(intent.audienceFocus),
    };
  };

  window.SHOSAI_STAGE_LIGHT_INTENT_OVERLAY = Object.freeze({
    marks: LIGHT_INTENT_MARKS,
    mark: lightIntentMark,
    plan: lightIntentOverlayPlan,
  });

  const venueLibrary = window.SHOSAI_VENUES && window.SHOSAI_VENUES.library;
  const projectIoClone = (value) => JSON.parse(JSON.stringify(value));
  const bundledVenueForProject = (project) => {
    if (!venueLibrary || !project || venueLibrary.isPreset(project.venue)) return null;
    return venueLibrary.venueV2ById(project.venue);
  };
  const makeProjectExportDocument = (project, includeVenue = true) => {
    const venueData = includeVenue ? bundledVenueForProject(project) : null;
    return {
      kind: "shosai-stage-sketch",
      version: 4,
      project: projectIoClone(project),
      venues: venueData ? [venueData] : [],
    };
  };
  const prepareProjectImportDocument = (document) => {
    const project = projectIoClone(document.project);
    let venueImport = { venues: [], idMap: {}, imported: 0, skipped: 0 };
    if (document.version === 4 && Array.isArray(document.venues) && venueLibrary) {
      venueImport = venueLibrary.importVenues(document.venues);
      if (venueImport.idMap[project.venue]) project.venue = venueImport.idMap[project.venue];
    }
    return { project, venueImport };
  };
  window.SHOSAI_STAGE_PROJECT_IO = Object.freeze({
    exportDocument: makeProjectExportDocument,
    prepareImportDocument: prepareProjectImportDocument,
    bundledVenueForProject,
  });

  /* MCPが書き出したeditSummaryのうち、読み込み確認に必要な公開項目だけを扱う。
     scene.stashedなどの内部状態やbefore/afterの生データは、この表示モデルへ渡さない。 */
  const normalizeImportEditSummary = (raw, en = false) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const text = (value) => typeof value === "string" ? value.trim() : "";
    const revision = (value) => (
      Number.isInteger(value) || (typeof value === "string" && /^\d+$/.test(value))
        ? String(value) : ""
    );
    const diffs = Array.isArray(raw.diff) ? raw.diff.slice(0, 40).map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const lines = Array.isArray(item.lines)
        ? item.lines.map(text).filter(Boolean).slice(0, 20) : [];
      if (!lines.length) return null;
      return {
        sceneTitle: text(item.sceneTitle) || (en ? `Scene ${index + 1}` : `場面 ${index + 1}`),
        lines,
      };
    }).filter(Boolean) : [];
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.map(text).filter(Boolean).slice(0, 40) : [];
    return {
      heading: en ? "AI edit details" : "AIの編集内容",
      request: text(raw.request),
      summary: text(raw.summary),
      baseRevision: revision(raw.baseRevision),
      appliedRevision: revision(raw.appliedRevision),
      diffs,
      warnings,
      safety: warnings.length
        ? (en
          ? "Safety has not been confirmed. Stage Sketch does not verify or guarantee safety."
          : "安全は確認されていません。舞台スケッチは安全を検証したり保証したりするものではありません。")
        : "",
    };
  };
  const importEditSummaryModalText = (raw, en = false) => {
    const details = normalizeImportEditSummary(raw, en);
    if (!details) return "";
    const lines = [details.heading];
    if (details.request) lines.push(`${en ? "Request" : "指示"}: ${details.request}`);
    if (details.summary) lines.push(`${en ? "Summary" : "概要"}: ${details.summary}`);
    if (details.baseRevision && details.appliedRevision) {
      lines.push(`Revision: ${details.baseRevision} → ${details.appliedRevision}`);
    }
    details.diffs.forEach((diff) => lines.push(diff.sceneTitle, ...diff.lines));
    if (details.warnings.length) {
      lines.push(en ? "Warnings" : "警告", ...details.warnings, details.safety);
    }
    return lines.join("\n");
  };
  // DOMを立ち上げないNodeテストも、実画面と同じ許可項目・文言を検査する。
  window.SHOSAI_STAGE_AI_EDIT_IMPORT_MODEL = Object.freeze({
    normalize: normalizeImportEditSummary,
    modalText: importEditSummaryModalText,
  });

  /* Macアプリだけに出す「AI指示」の、DOMや盤面状態に依存しない判断。
     ブラウザ版ではHTMLに同じsectionが一瞬含まれても、ここでDOMから取り除く。
     テストも実画面と同じ判定・初回確認・停止経路を使う。 */
  const STAGE_AI_PERMISSION_KEY = "shosai-stage-agent-permission-v1";
  const STAGE_AI_PERMISSION_TEXT = [
    "この欄の指示は、AIが作業フォルダのファイルを読み書きできる状態で動きます。",
    "ショーは承認するまで変わりませんが、指示の内容には注意してください。",
  ].join("\n");
  const stageAIText = (value) => typeof value === "string" ? value.trim() : "";
  const stageAIErrorDetail = (value) => {
    if (typeof value === "string") return value;
    if (value && typeof value.message === "string") return value.message;
    return value === undefined || value === null ? "" : String(value);
  };
  const stageAIErrorText = (prefix, detail) => {
    const rendered = stageAIErrorDetail(detail);
    return rendered ? `${prefix} ${rendered}` : prefix;
  };
  const stageAIMissingPlanDetail = (output, maxLength = 2000) => {
    const base = "今回の依頼に対応する編集計画を取得できませんでした。";
    const rendered = stageAIErrorDetail(output).trim();
    if (!rendered) return base;
    if (rendered.length <= maxLength) return `${base}\n\nAIの応答:\n${rendered}`;
    return `${base}\n\nAIの応答（長いため末尾${maxLength}文字だけ表示します）:\n`
      + rendered.slice(-maxLength);
  };
  const writeStageAIError = (element, message) => {
    if (!element) return;
    element.style.whiteSpace = "pre-wrap";
    element.textContent = stageAIErrorDetail(message);
    element.hidden = false;
  };
  const normalizeStageAIPlacement = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const u = Number(raw.u);
    const v = Number(raw.v);
    if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    const size = Number(raw.size);
    const facing = Number(raw.facing);
    return {
      u,
      v,
      size: Number.isFinite(size) ? size : 100,
      facing: Number.isFinite(facing) ? facing : 0,
      color: stageAIText(raw.color),
    };
  };
  const normalizeStageAIPieceDiff = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const changes = ["move", "replace", "update", "add", "remove"];
    const change = changes.includes(raw.change) ? raw.change : "";
    const assetType = raw.assetType === "performer" || raw.assetType === "set"
      ? raw.assetType : "";
    if (!change || !assetType) return null;
    const from = normalizeStageAIPlacement(raw.from);
    const to = normalizeStageAIPlacement(raw.to);
    if ((change === "add" && !to) || (change === "remove" && !from)
      || (!["add", "remove"].includes(change) && (!from || !to))) return null;
    return {
      change,
      assetType,
      label: stageAIText(raw.label),
      kind: assetType === "set" ? stageAIText(raw.kind) : "",
      from,
      to,
    };
  };
  const normalizeStageAIPlan = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)
      || raw.kind !== "stage-sketch-edit-plan" || Number(raw.version) !== 1) return null;
    const expectedRevision = Number(raw.expectedRevision);
    const status = raw.status === "proposed" || raw.status === "needs_clarification"
      ? raw.status : "";
    const planId = stageAIText(raw.planId);
    const projectId = stageAIText(raw.projectId);
    if (!status || !/^plan-[A-Za-z0-9._-]+$/.test(planId)
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(projectId)
      || !Number.isInteger(expectedRevision) || expectedRevision < 1) return null;
    const textList = (value, max) => Array.isArray(value)
      ? value.map(stageAIText).filter(Boolean).slice(0, max) : [];
    const clarifications = Array.isArray(raw.clarifications) ? raw.clarifications.slice(0, 20).map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const assetType = item.assetType === "performer" || item.assetType === "set"
        ? item.assetType : "";
      const id = stageAIText(item.id);
      const assetName = stageAIText(item.assetName);
      const text = stageAIText(item.text);
      const options = Array.isArray(item.options) ? item.options.slice(0, 20).map((option) => {
        if (!option || typeof option !== "object" || Array.isArray(option)) return null;
        const assetId = stageAIText(option.assetId);
        const label = stageAIText(option.label);
        return assetId && label ? { assetId, label } : null;
      }).filter(Boolean) : [];
      return id && assetType && assetName && text && options.length
        ? { id, assetType, assetName, text, options } : null;
    }).filter(Boolean) : [];
    const diff = Array.isArray(raw.diff) ? raw.diff.slice(0, 40).map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const lines = textList(item.lines, 20);
      const pieces = Array.isArray(item.pieces)
        ? item.pieces.slice(0, 120).map(normalizeStageAIPieceDiff).filter(Boolean) : [];
      const sceneId = stageAIText(item.sceneId);
      if (!sceneId || (!lines.length && !pieces.length)) return null;
      return {
        sceneId,
        sceneTitle: stageAIText(item.sceneTitle) || `場面 ${index + 1}`,
        lines,
        pieces,
      };
    }).filter(Boolean) : [];
    return {
      planId,
      projectId,
      expectedRevision,
      request: stageAIText(raw.request),
      status,
      summary: stageAIText(raw.summary),
      diff,
      warnings: textList(raw.warnings, 40),
      questions: textList(raw.questions, 20),
      clarifications,
    };
  };
  const STAGE_AI_PANEL_MODEL = Object.freeze({
    permissionKey: STAGE_AI_PERMISSION_KEY,
    permissionText: STAGE_AI_PERMISSION_TEXT,
    isBridgeAvailable(bridge) {
      return Boolean(bridge && [
        "runAgent", "stopAgent", "agentInfo", "writeProject", "latestPlan", "listEditExports", "readExport",
      ].every((name) => typeof bridge[name] === "function"));
    },
    removeUnsupportedSection(doc, bridge) {
      if (this.isBridgeAvailable(bridge)) return false;
      const sections = doc && typeof doc.querySelectorAll === "function"
        ? [...doc.querySelectorAll('[data-panel="ask"]')] : [];
      sections.forEach((section) => section.remove());
      return sections.length > 0;
    },
    isRunShortcut(event) {
      return Boolean(event && event.key === "Enter" && (event.metaKey || event.ctrlKey));
    },
    canAdopt(plan) {
      return Boolean(plan && plan.status === "proposed");
    },
    canReplanWithResolutions(plan, selections) {
      if (!plan || plan.status !== "needs_clarification"
        || !Array.isArray(plan.clarifications) || !plan.clarifications.length) return false;
      return plan.clarifications.every((item) => selections && selections.has(item.id));
    },
    resolutionsFromSelections(plan, selections) {
      if (!plan || !Array.isArray(plan.clarifications) || !selections) return [];
      return plan.clarifications.map((item) => {
        const assetId = selections.get(item.id);
        const option = item.options.find((candidate) => candidate.assetId === assetId);
        return option ? {
          assetType: item.assetType,
          assetName: item.assetName,
          assetId: option.assetId,
        } : null;
      }).filter(Boolean);
    },
    overlayDiff(plan, projectId, sceneId) {
      if (!plan || plan.projectId !== projectId || !sceneId || !Array.isArray(plan.diff)) return null;
      const diff = plan.diff.find((item) => item.sceneId === sceneId);
      return diff && Array.isArray(diff.pieces) && diff.pieces.length ? diff : null;
    },
    formatAgentInfo(info) {
      const model = stageAIText(info && info.model);
      if (!model) return "不明";
      const reasoningEffort = stageAIText(info && info.reasoningEffort);
      return reasoningEffort ? `${model} / 推論 ${reasoningEffort}` : model;
    },
    async renderAgentInfo(bridge, element) {
      let text = "不明";
      try {
        if (bridge && typeof bridge.agentInfo === "function") {
          text = this.formatAgentInfo(await bridge.agentInfo());
        }
      } catch (_) { /* 設定を読めなくてもAI指示そのものは使える */ }
      if (element) element.textContent = text;
      return text;
    },
    confirmPermission(storage, confirmFunction) {
      try {
        if (storage && storage.getItem(STAGE_AI_PERMISSION_KEY) === "accepted") return true;
      } catch (_) { /* 保存領域が読めなければ、この回は確認を出す */ }
      if (typeof confirmFunction !== "function" || !confirmFunction(STAGE_AI_PERMISSION_TEXT)) return false;
      try { storage?.setItem(STAGE_AI_PERMISSION_KEY, "accepted"); } catch (_) { /* 実行自体は続ける */ }
      return true;
    },
    errorText: stageAIErrorText,
    missingPlanDetail: stageAIMissingPlanDetail,
    writeError: writeStageAIError,
    async runAgent(bridge, prompt, shouldContinue, onError) {
      const isCurrent = typeof shouldContinue === "function" ? shouldContinue : () => true;
      const fail = typeof onError === "function" ? onError : () => {};
      let result;
      try {
        result = await bridge.runAgent(prompt);
      } catch (error) {
        if (isCurrent()) fail(stageAIErrorText("AIの起動に失敗しました:", error));
        return null;
      }
      if (!isCurrent()) return null;
      if (!result || result.ok !== true) {
        fail(stageAIErrorText(
          "AIの起動に失敗しました:",
          result && typeof result.output === "string" ? result.output : ""
        ));
        return null;
      }
      return result;
    },
    async requestPlan(bridge, document, request, promptFactory, shouldContinue, onError) {
      const isCurrent = typeof shouldContinue === "function" ? shouldContinue : () => true;
      const fail = typeof onError === "function" ? onError : () => {};
      let written;
      try {
        written = await bridge.writeProject(document);
      } catch (error) {
        if (isCurrent()) fail(stageAIErrorText("ショーの書き出しに失敗しました:", error));
        return null;
      }
      if (!isCurrent()) return null;
      if (!written || typeof written.projectId !== "string"
        || !Number.isInteger(Number(written.revision))) {
        fail(stageAIErrorText(
          "ショーの書き出しに失敗しました:",
          "書き出し結果を確認できませんでした。"
        ));
        return null;
      }

      let prompt;
      try {
        prompt = promptFactory(written.projectId, written.revision, request);
      } catch (error) {
        if (isCurrent()) fail(stageAIErrorText("AIの起動に失敗しました:", error));
        return null;
      }
      const result = await this.runAgent(bridge, prompt, isCurrent, fail);
      if (!result || !isCurrent()) return null;

      let rawPlan;
      let planReadError = "";
      try {
        rawPlan = await bridge.latestPlan(written.projectId);
      } catch (error) {
        planReadError = stageAIErrorDetail(error);
      }
      if (!isCurrent()) return null;
      return {
        written,
        rawPlan,
        output: typeof result.output === "string" ? result.output : "",
        planReadError,
      };
    },
    normalizePlan: normalizeStageAIPlan,
    commitAppliedExport(options) {
      const prepared = options.prepareImportDocument(options.exported);
      const next = options.normalizeState({
        ...options.currentState,
        project: prepared.project,
      });
      options.shelveCurrent();
      next.project.id = options.makeProjectId();
      next.layout = options.currentState.layout;
      options.resetDraft({ clearInput: true });
      options.applyLoadedState(next, "新しいショーとして保存しました。");
      return next;
    },
    stopAgent(bridge) {
      if (!this.isBridgeAvailable(bridge)) return Promise.resolve(false);
      return bridge.stopAgent();
    },
  });
  window.SHOSAI_STAGE_AI_PANEL_MODEL = STAGE_AI_PANEL_MODEL;
  STAGE_AI_PANEL_MODEL.removeUnsupportedSection(document, window.stageSketchBridge);

  const canvas = document.getElementById("stage-canvas");
  if (!canvas) return;
  const VENUES = window.SHOSAI_VENUES;
  if (!VENUES) return;
  // stage-pwa.js は単独版でこのスクリプトより先に読み込む。
  // 通常ブラウザ版は false のままなので、既存の三列レイアウトへ一切介入しない。
  const tabletPwaActive = window.SHOSAI_TABLET_PWA === true
    || document.documentElement.classList.contains("stage-pwa-tablet");
  let tabletUi = null;
  /* スマホは編集机ではなく、受け取ったJSONを現場で確認するための閲覧機にする。
     iPadは上の専用PWAへ任せ、短辺600px以下のタッチ端末だけを対象にする。
     localhostのpreview指定は実機を使わないブラウザ試験用。 */
  const phonePreview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).has("phone-viewer-preview");
  const phoneLike = navigator.maxTouchPoints > 0
    && Math.min(window.screen.width, window.screen.height) <= 600;
  const phoneViewerActive = !tabletPwaActive && (phonePreview || phoneLike);
  const phoneOrientation = window.matchMedia("(orientation: portrait)");
  const tabletOrientation = window.matchMedia("(orientation: portrait)");
  document.documentElement.classList.toggle("stage-phone-viewer", phoneViewerActive);
  let phoneUi = null;
  const SCENE_STUDIES = Array.isArray(window.SHOSAI_SCENE_STUDIES)
    ? window.SHOSAI_SCENE_STUDIES
    : [];
  // 同梱ショーの本文は stage-samples/index.js に集約する。
  // 読み込みに失敗しても、利用者自身のショーは引き続き開ける。
  const SHOW_LIBRARY = window.SHOSAI_STAGE_SHOW_LIBRARY || null;

  const planCanvas = document.getElementById("stage-plan-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const planCtx = planCanvas ? planCanvas.getContext("2d", { alpha: false }) : null;
  // どちらのキャンバスがどの視点かを引く
  const viewOf = (el) => (el === planCanvas ? "plan" : "front");
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = canvas.width;
  paintCanvas.height = canvas.height;
  const paintCtx = paintCanvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  // 光の意図の重ねで、演者を体の形どおりに扱うためのマスク
  const intentMaskCanvas = document.createElement("canvas");
  intentMaskCanvas.width = W;
  intentMaskCanvas.height = H;
  const intentMaskCtx = intentMaskCanvas.getContext("2d");
  let intentHatchPattern = null;
  // プレゼン（正面図だけの全画面）中か。説明の帯を出すかどうかの目印
  let presenting = false;
  let pseudoPresenting = false;
  /* ---------- 初期化（テスト用） ----------
     ?fresh を付けて開くと、舞台スケッチの持ちものだけ消して開き直す。
     初めて来た人とまったく同じ状態（案内も自動で出る）を作れるので、
     チュートリアルの通し確認や、人に見せる前の仕切り直しに使う。
     ★消すのは舞台スケッチの5つだけ。他の画面のものは触らない。
     ?tour を付けると、消さずに案内だけ出す。 */
  const STAGE_KEYS = [
    "shosai-stage-sketch-v1", "shosai-stage-shows-v1",
    "shosai-stage-tour-v1", "shosai-stage-lang", "shosai-stage-venues-v1",
  ];
  const openArgs = new URLSearchParams(window.location.search);
  /* ?lang=en / ?lang=ja … 開いた時点の言語を決める。
     英語圏の人へ「開いたら英語で、案内も英語で始まる」一本のURLとして渡せるように。
     ★選び直しは上の EN／日本語でいつでもできる。URLの指定は開くたびに効くので、
       配るリンクは常にその言語で開く（人に渡す道具なので、開き方が揺れない方を採る）。 */
  const askedLang = (openArgs.get("lang") || "").toLowerCase();
  const openLang = askedLang === "en" || askedLang === "ja" ? askedLang : "";
  if (openArgs.has("fresh")) {
    STAGE_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_) { /* 消せなくても続ける */ }
    });
    /* ?fresh を落としたところへ入り直す（読み直すたびに消えるのを避ける）。
       言語と見本の指定は持ち越す。消したあとも英語で／見本から開いてほしいため。
       ★ここを忘れると ?fresh&sample が素の舞台で開く（実際に踏んだ）。 */
    const carry = [];
    if (openLang) carry.push(`lang=${openLang}`);
    if (openArgs.has("sample")) carry.push("sample");
    if (openArgs.has("seam-sample")) carry.push("seam-sample");
    window.location.replace(window.location.pathname + (carry.length ? `?${carry.join("&")}` : ""));
    return;
  }

  const STORAGE_KEY = "shosai-stage-sketch-v1";          // いま開いているショー
  const SHOWS_KEY = "shosai-stage-shows-v1";              // 端末に置いた全ショー
  const HISTORY_LIMIT = 36;
  /* 舞台に置ける駒の型。★舞台セットの種類（SET_KINDS）を足したら、
   * ここにも足すこと。無い型は「演者」に落とされる（実際に踏んだ）。 */
  const PIECE_TYPES = {
    performer: "演者",
    block: "台・箱",
    table: "テーブル",
    chair: "椅子",
    bench: "ベンチ",
    stool: "スツール",
    wall: "壁",
    trapeze: "トラピーズ",
    cyrwheel: "シルホイール",
    diabolo: "ディアボロ",
    pole: "チャイニーズポール",
    teeter: "ティーターボード",
    tissue: "エアリアルティシュー",
    wire: "綱渡り",
    suitcase: "スーツケース",
    trampoline: "トランポリン",
    cane: "ハンドバランス用cane",
    car: "車",
    seri: "せり",
    sphere: "球",
    light: "照明",
  };
  // 実寸の目安（m）。人を基準に置くと、舞台の規模が見た目に出る
  const PIECE_METERS = {
    performer: 1.65,
    block: 1.2,
    table: 0.72,
    chair: 0.9,
    bench: 0.45,
    stool: 0.62,
    wall: 2.5,
    trapeze: 0.06, cyrwheel: 1.9, diabolo: 0.26, pole: 6, teeter: 0.75, tissue: 7,
    wire: 1.2, suitcase: 0.44, trampoline: 0.95, cane: 0.75, car: 1.45,
    seri: 2.7,
    sphere: 1.2,
    light: 2.5,
  };
  // 台・テーブル・椅子・球・光は実寸（m）で持つ。人だけが身長で決まるのに対し、
  // セットは幅・奥行き・高さがそれぞれ意味を持つので、一つの倍率では表せない。
  const PIECE_DIMS = {
    block: { w: 2.04, d: 0.66, h: 1.2 },   // 平台1枚ぶんの見当
    table: { w: 1.6, d: 0.8, h: 0.72 },    // 一般的なダイニングテーブル
    chair: { h: 0.9 },                     // 背もたれの上端まで。幅と奥行きはここから決まる
    bench: { w: 1.8, d: 0.4, h: 0.45 },    // 横長のベンチ。座面までの高さ
    stool: { w: 0.36, d: 0.36, h: 0.62 },  // スツール。座面までの高さ
    /* サーカスの道具。寸法は実物のおよその値。
     * トラピーズは吊りバーの幅、ティシューは布の長さ、綱は張る長さ。 */
    trapeze: { w: 0.7, d: 0.06, h: 0.06 },
    cyrwheel: { dia: 1.9 },
    /* 実寸は直径11.5cm・全長13cmだが、12m間口の図では点になって形が読めない。
     * 舞台の絵として「そこにディアボロがある」と伝わる大きさを優先し、
     * 既定は実寸の2倍にする（本人指定）。実寸で置きたいときはつまみで戻せる。 */
    diabolo: { dia: 0.23, w: 0.26 },
    pole: { w: 0.05, d: 0.05, h: 6 },
    teeter: { w: 3.6, d: 0.45, h: 0.75 },
    tissue: { w: 0.3, d: 0.06, h: 7 },
    wire: { w: 6, d: 0.06, h: 1.2 },
    suitcase: { w: 0.62, d: 0.24, h: 0.44 },
    trampoline: { w: 3.05, d: 1.7, h: 0.95 },
    cane: { w: 0.5, d: 0.3, h: 0.75 },
    car: { w: 4.3, d: 1.8, h: 1.45 },
    seri: { w: 2.7, d: 1.8 },
    // 壁は厚みを固定で持つ（舞台の壁は建て込みの板なので、厚みは決まっている）
    wall: { w: 3, d: 0.3, h: 2.5 },
    sphere: { dia: 1.2, lift: 0 },         // 直径と、床からの高さ
    light: { dia: 4 },                     // 床に落ちる明かりの円の直径
  };
  /* 寸法つまみの仕様。項目は種類ごとに違うので、画面はここから組み立てる。
   * HTMLへ固定で並べると、種類を足すたびに二箇所直すことになる。 */
  const DIM_META = {
    w: { label: "幅", min: 0.2, max: 12, step: 0.01 },
    d: { label: "奥行き", min: 0.2, max: 12, step: 0.01 },
    h: { label: "高さ", min: 0.1, max: 8, step: 0.01 },
    dia: { label: "直径", min: 0.3, max: 20, step: 0.01 },
    lift: { label: "床からの高さ", min: 0, max: 10, step: 0.01 },
  };
  /* 表示はcm。内部はmのまま。
   * 家具や人の寸法は「1.6m」より「160cm」のほうが体に入る。
   * 劇場の間口は m のままにする（そちらは m で語る寸法なので）。 */
  const cmText = (m) => `${Math.round(m * 100)}cm`;
  // 種類によって言い方を変えたいものだけ上書きする
  const DIM_LABELS = {
    chair: { h: "大きさ（背もたれの上端まで）" },
    wall: { w: "幅", h: "高さ" },
    bench: { h: "座面までの高さ" },
    stool: { h: "座面までの高さ" },
    trapeze: { w: "バーの幅" },
    diabolo: { dia: "カップの直径", w: "軸を含む長さ" },
    pole: { h: "ポールの高さ" },
    teeter: { w: "板の長さ", h: "支点の高さ" },
    tissue: { h: "布の長さ", w: "布の間隔" },
    wire: { w: "張る長さ", h: "綱の高さ" },
    trampoline: { h: "ベッドの高さ" },
    cane: { w: "左右の間隔", h: "cane の高さ" },
    light: { dia: "直径（床に落ちる円の広さ）" },
  };
  function dimLabel(kind, key) {
    if (isEn()) {
      return tm("dimBy", `${kind}.${key}`, null) || tm("dim", key, DIM_META[key].label);
    }
    return (DIM_LABELS[kind] && DIM_LABELS[kind][key]) || DIM_META[key].label;
  }

  // 姿勢・道具・駒・明かりの名前。言語を見て選ぶ
  const poseName = (pose) => (pose ? tm("pose", pose.id, pose.label) : "");
  const setKindName = (kind) => tm("setKind", kind, SET_KINDS[kind] || kind);
  const pieceTypeName = (type) => tm("pieceType", type, PIECE_TYPES[type] || type);
  const lightKindName = (key) => tm("lightKind", key, LIGHT_KINDS[key].label);
  const lightKindNote = (key) => tm("lightNote", key, LIGHT_KINDS[key].note);
  const venueName = (v) => tm("venue", v.id, v.label);
  const venueShortName = (v) => tm("venueShort", v.id, v.short);
  const venueNoteText = (v) => tm("venueNote", v.id, v.note);
  const sizeName = (z) => tm("size", z.id, z.label);
  const seatName = (seat) => tm("seat", seat.id, seat.label);
  const seatShortName = (seat) => tm("seatShort", seat.id, seat.short);
  const seatNoteText = (seat) => tm("seatNote", seat.id, seat.note);
  // 椅子は大きさ一つで決まる。幅と奥行きはそこから割り出す
  /* 舞台セットに登録できる形。光もここに含める。登録・出し入れ・寸法の
   * 仕組みが同じなので同じ入れ物に置き、一覧だけ「光」パネルへ分けて出す。 */
  const SET_KINDS = {
    block: "台・箱", table: "テーブル", chair: "椅子", bench: "ベンチ", stool: "スツール",
    wall: "壁", sphere: "球",
    trapeze: "トラピーズ", cyrwheel: "シルホイール", diabolo: "ディアボロ", pole: "チャイニーズポール",
    teeter: "ティーターボード", tissue: "エアリアルティシュー", wire: "綱渡り",
    suitcase: "スーツケース", trampoline: "トランポリン", cane: "ハンドバランス用cane",
    car: "車", seri: "せり",
    light: "照明",
  };
  // 吊物にしかならない道具。床に置く形を持たない
  const FLOWN_ONLY = { trapeze: true, tissue: true };
  const WALL_THICKNESS = 0.3;   // 壁の厚み（m）。触らせず固定で持つ
  /* 明かりの種類。仕込む場所と当てる高さが種類ごとに決まっているので、
   * 舞台へ出したときの既定値をここに持つ（出したあとは自由に動かせる）。
   *   hang  … 吊り。バトンから真下へ落とす
   *   ss    … サイドスポット。袖のスタンドから、舞台を横切って体へ
   *   front … 前明かり。客席の上から、顔の高さへ
   *   floor … 転がし。床置きで、下から体へ
   * dia は床（または当たる高さ）での照明の直径。 */
  const LIGHT_KINDS = {
    hang: {
      label: "吊り", note: "バトンから真下へ",
      dia: 4, h: 6, toH: 0,
      source: (u, v) => ({ u, v }),
    },
    ss: {
      label: "SS（横から）", note: "袖のスタンドから舞台を横切って",
      dia: 2.6, h: 1.7, toH: 1.3,
      // 近い側の袖から。反対側から当てたいときは左右のつまみで振る
      source: (u, v) => ({ u: u <= 0.5 ? -0.06 : 1.06, v }),
    },
    front: {
      label: "前明かり", note: "客席の上から顔へ",
      dia: 3.4, h: 8, toH: 1.5,
      source: (u) => ({ u, v: 1.35 }),
    },
    floor: {
      label: "転がし", note: "床置きから下向きに体へ",
      dia: 3, h: 0.18, toH: 1.6,
      // 舞台のツラ（手前の端）に置く。奥に置くときは奥行きのつまみで送る
      source: (u) => ({ u, v: 1 }),
    },
  };
  const LIGHT_KIND_ORDER = ["hang", "ss", "front", "floor"];
  const lightKindOf = (item) => (item && LIGHT_KINDS[item.lightKind] ? item.lightKind : "hang");
  const SET_KIND_ORDER = [
    "block", "table", "chair", "bench", "stool", "wall", "sphere",
    "trapeze", "cyrwheel", "diabolo", "pole", "teeter", "tissue", "wire",
    "suitcase", "trampoline", "cane", "car", "seri",
  ];
  /* ---------- 演者の骨格と姿勢 ----------
   * 関節を3次元（x=左右／y=上下／z=本人の正面向き）で持ち、向きの角度だけ
   * 鉛直軸まわりに回して画面へ落とす。こうすると、向きの変化・座る・逆立ちが
   * すべて同じ仕組みで扱える。2次元の絵を姿勢ごとに描き分けると、
   * 横を向いたときに破綻する。
   *
   * 単位は身長H。y=0 が床、y=1 が立ったときの頭のてっぺん。
   * x は「客席から見て正面を向いたときの画面の左右」。z は本人が向いている側。
   * 姿勢はこちらで用意したものだけを使う（利用者が形をいじるものではない）。
   */
  const BASE_JOINTS = {
    head: [0, 0.935, 0], neck: [0, 0.855, 0],
    shL: [-0.115, 0.82, 0], shR: [0.115, 0.82, 0],
    elL: [-0.135, 0.63, 0.015], elR: [0.135, 0.63, 0.015],
    wrL: [-0.145, 0.45, 0.03], wrR: [0.145, 0.45, 0.03],
    hipL: [-0.055, 0.52, 0], hipR: [0.055, 0.52, 0],
    knL: [-0.06, 0.28, 0.012], knR: [0.06, 0.28, 0.012],
    anL: [-0.058, 0.04, 0], anR: [0.058, 0.04, 0],
    toL: [-0.058, 0.012, 0.075], toR: [0.058, 0.012, 0.075],
  };
  /* wide … 胴の断面の「幅」がどちらを向くか（体の座標）。既定は左右。
   *        横向きに寝ると肩の並びが縦になるので、そこだけ上下にする。
   * face … 顔がどちらを向くか。うつ伏せと仰向けを見分けるのに使う。 */
  const makePose = (id, label, over, extra) => Object.assign(
    { id, label, joints: Object.assign({}, BASE_JOINTS, over), wide: [1, 0, 0], face: [0, 0, 1] },
    extra || {});

  /* ポールに付く姿勢（人間旗）。一覧には出さず、チャイニーズポールへ
   * 乗せたときに自動で使う。原点(y=0)は「握りの真ん中」。手はx=0（ポールの線上）、
   * 体は横一直線に浮き、脚は上下へ割る（写真の実技の形）。
   * ★胴が水平なので wide は左右[1,0,0]ではなく前後[0,0,1]にする。
   *   左右のままだと胴の軸と平行になり、断面が立たない。 */
  /* 腕は上下へ45度ずつ（合わせて約90度）開いて伸ばし、手の先だけがポールへ届く。
     肩はポールから体側へ 0.26（腕の長さ0.365のcos45度）離れるので、頭は埋もれない。
     体は握りから上向き（約25度）に反り、脚はさらに上へ割る（写真の実技の形）。
     頭は腕と重ならないよう、首からほぼ水平（ポールと垂直の向き）に出す。 */
  const POLE_FLAG_R = {
    id: "poleflag_r", label: "ポールに付く",
    wide: [0, 0, 1], face: [0, 0.25, 0.97],
    joints: {
      head: [0.145, 0.05, 0], neck: [0.215, 0.045, 0],
      shL: [0.26, 0.045, -0.05], shR: [0.26, -0.005, 0.05],
      elL: [0.14, 0.16, 0], wrL: [0.0, 0.26, 0],
      elR: [0.15, -0.14, 0], wrR: [0.0, -0.26, 0],
      hipL: [0.53, 0.165, -0.045], hipR: [0.53, 0.125, 0.045],
      knL: [0.705, 0.315, 0.01], anL: [0.86, 0.42, 0], toL: [0.90, 0.455, 0.02],
      knR: [0.765, 0.11, 0.01], anR: [0.945, 0.02, 0], toR: [0.985, 0.0, 0.02],
    },
  };
  const mirrorJoints = (joints) => {
    const out = {};
    Object.keys(joints).forEach((k) => { const j = joints[k]; out[k] = [-j[0], j[1], j[2]]; });
    return out;
  };
  const POLE_FLAG_L = {
    id: "poleflag_l", label: "ポールに付く",
    wide: [0, 0, 1], face: [0, 0.25, 0.97],
    joints: mirrorJoints(POLE_FLAG_R.joints),
  };
  /* トラピーズに乗る姿勢。一覧には出さず、吊りバーへ乗せたときに自動で使う。
     原点(y=0)は足先の高さのまま。バーとの位置合わせは refreshBases が
     base で行う（座る＝握り0.505Hがバー、ぶら下がる＝握り1.15Hがバー）。 */
  const TRAP_SIT = makePose("trapeze_sit", "ブランコに座る", {
    // 立ち姿から脚を軽く前へ流し、手は腰の脇でバーを握る
    elL: [-0.14, 0.65, 0.01], elR: [0.14, 0.65, 0.01],
    wrL: [-0.13, 0.505, 0.02], wrR: [0.13, 0.505, 0.02],
    knL: [-0.06, 0.30, 0.10], knR: [0.06, 0.30, 0.10],
    anL: [-0.058, 0.07, 0.06], anR: [0.058, 0.07, 0.06],
    toL: [-0.058, 0.03, 0.11], toR: [0.058, 0.03, 0.11],
  });
  const TRAP_HANG = makePose("trapeze_hang", "ぶら下がる", {
    // 両手を肩幅で伸ばして握り、体はまっすぐ、つま先を揃えて下へ
    elL: [-0.128, 0.99, 0.01], wrL: [-0.125, 1.15, 0.01],
    elR: [0.128, 0.99, 0.01], wrR: [0.125, 1.15, 0.01],
    knL: [-0.058, 0.28, 0.005], knR: [0.058, 0.28, 0.005],
    anL: [-0.056, 0.04, 0], anR: [0.056, 0.04, 0],
    toL: [-0.056, -0.02, 0.02], toR: [0.056, -0.02, 0.02],
  });
  // バーを握る高さ（身長比）。base の計算と姿勢の手の位置で同じ値を使う
  const TRAP_GRIP = { sit: 0.505, hang: 1.15 };
  const HIDDEN_POSES = [POLE_FLAG_R, POLE_FLAG_L, TRAP_SIT, TRAP_HANG];

  const POSES = [
    makePose("stand", "立つ", {}),
    makePose("walk", "歩く", {
      knR: [0.062, 0.30, 0.14], anR: [0.06, 0.05, 0.25], toR: [0.06, 0.015, 0.33],
      knL: [-0.06, 0.27, -0.10], anL: [-0.058, 0.055, -0.21], toL: [-0.058, 0.02, -0.14],
      elR: [0.132, 0.64, -0.10], wrR: [0.13, 0.47, -0.19],
      elL: [-0.132, 0.64, 0.11], wrL: [-0.13, 0.47, 0.20],
    }),
    makePose("reach", "両手を上げる", {
      elL: [-0.15, 0.99, 0.01], wrL: [-0.155, 1.15, 0.01],
      elR: [0.15, 0.99, 0.01], wrR: [0.155, 1.15, 0.01],
    }),
    makePose("open", "両手を広げる", {
      elL: [-0.24, 0.83, 0.01], wrL: [-0.36, 0.84, 0.01],
      elR: [0.24, 0.83, 0.01], wrR: [0.36, 0.84, 0.01],
    }),
    // 椅子の座面（およそ0.27H＝身長165cmで45cm）に腰を置く
    makePose("sit", "座る", {
      head: [0, 0.70, 0.02], neck: [0, 0.62, 0.01],
      shL: [-0.115, 0.585, 0], shR: [0.115, 0.585, 0],
      elL: [-0.128, 0.41, 0.02], elR: [0.128, 0.41, 0.02],
      wrL: [-0.125, 0.28, 0.10], wrR: [0.125, 0.28, 0.10],
      hipL: [-0.058, 0.285, -0.02], hipR: [0.058, 0.285, -0.02],
      knL: [-0.065, 0.285, 0.26], knR: [0.065, 0.285, 0.26],
      anL: [-0.06, 0.045, 0.28], anR: [0.06, 0.045, 0.28],
      toL: [-0.06, 0.012, 0.36], toR: [0.06, 0.012, 0.36],
    }),
    makePose("crouch", "しゃがむ", {
      head: [0, 0.655, 0.03], neck: [0, 0.575, 0.02],
      shL: [-0.115, 0.545, 0.015], shR: [0.115, 0.545, 0.015],
      elL: [-0.13, 0.40, 0.11], elR: [0.13, 0.40, 0.11],
      wrL: [-0.12, 0.30, 0.24], wrR: [0.12, 0.30, 0.24],
      hipL: [-0.058, 0.235, -0.08], hipR: [0.058, 0.235, -0.08],
      knL: [-0.075, 0.245, 0.17], knR: [0.075, 0.245, 0.17],
      anL: [-0.062, 0.04, 0.02], anR: [0.062, 0.04, 0.02],
      toL: [-0.062, 0.012, 0.10], toR: [0.062, 0.012, 0.10],
    }),
    makePose("kneel", "片膝立ち", {
      head: [0, 0.79, 0.01], neck: [0, 0.71, 0],
      shL: [-0.115, 0.675, 0], shR: [0.115, 0.675, 0],
      elL: [-0.132, 0.49, 0.02], elR: [0.132, 0.49, 0.02],
      wrL: [-0.13, 0.32, 0.04], wrR: [0.13, 0.32, 0.04],
      hipL: [-0.058, 0.375, -0.02], hipR: [0.058, 0.375, -0.02],
      // 左脚を前へ立て、右脚は膝を床へ
      knL: [-0.07, 0.345, 0.21], anL: [-0.065, 0.045, 0.23], toL: [-0.065, 0.012, 0.31],
      knR: [0.062, 0.045, -0.12], anR: [0.06, 0.055, -0.31], toR: [0.06, 0.03, -0.38],
    }),
    /* ---- 床に座る姿勢たち。腿0.24・脛0.24・胴0.30の実寸を保って組む ---- */
    makePose("floorsit", "体育座り", {
      // 膝を抱えて座る。膝が胸の前へ立ち、踵は尻の近く
      head: [0, 0.47, -0.03], neck: [0, 0.40, -0.045],
      shL: [-0.115, 0.36, -0.045], shR: [0.115, 0.36, -0.045],
      elL: [-0.135, 0.19, 0.01], elR: [0.135, 0.19, 0.01],
      wrL: [-0.05, 0.25, 0.14], wrR: [0.05, 0.25, 0.14],
      hipL: [-0.055, 0.07, -0.02], hipR: [0.055, 0.07, -0.02],
      knL: [-0.06, 0.28, 0.10], knR: [0.06, 0.28, 0.10],
      anL: [-0.058, 0.035, 0.13], anR: [0.058, 0.035, 0.13],
      toL: [-0.058, 0.012, 0.20], toR: [0.058, 0.012, 0.20],
    }),
    makePose("agura", "あぐら", {
      // 膝を外へ開き、足首を身体の前で組む
      head: [0, 0.47, 0.01], neck: [0, 0.40, 0],
      shL: [-0.115, 0.36, 0], shR: [0.115, 0.36, 0],
      elL: [-0.14, 0.22, 0.03], elR: [0.14, 0.22, 0.03],
      wrL: [-0.16, 0.11, 0.11], wrR: [0.16, 0.11, 0.11],
      hipL: [-0.055, 0.06, -0.01], hipR: [0.055, 0.06, -0.01],
      knL: [-0.17, 0.08, 0.15], knR: [0.17, 0.08, 0.15],
      // 足首は反対側の膝の下へ（組んだ形。左右で前後をずらす）
      anL: [0.05, 0.05, 0.185], anR: [-0.05, 0.06, 0.16],
      toL: [0.12, 0.03, 0.20], toR: [-0.12, 0.045, 0.175],
    }),
    makePose("seiza", "正座", {
      // 踵の上に尻を乗せ、背すじは立てる。つま先は後ろへ寝かせる
      head: [0, 0.55, -0.07], neck: [0, 0.48, -0.08],
      shL: [-0.115, 0.44, -0.08], shR: [0.115, 0.44, -0.08],
      elL: [-0.13, 0.27, -0.05], elR: [0.13, 0.27, -0.05],
      wrL: [-0.085, 0.17, 0.03], wrR: [0.085, 0.17, 0.03],
      hipL: [-0.055, 0.14, -0.10], hipR: [0.055, 0.14, -0.10],
      knL: [-0.06, 0.03, 0.09], knR: [0.06, 0.03, 0.09],
      anL: [-0.058, 0.05, -0.15], anR: [0.058, 0.05, -0.15],
      toL: [-0.058, 0.02, -0.22], toR: [0.058, 0.02, -0.22],
    }, { sideView: true }),
    makePose("longsit", "長座", {
      // 脚をまっすぐ前へ。手は腰の横で床を突く
      head: [0, 0.45, -0.01], neck: [0, 0.38, -0.03],
      shL: [-0.115, 0.34, -0.04], shR: [0.115, 0.34, -0.04],
      elL: [-0.14, 0.18, -0.02], elR: [0.14, 0.18, -0.02],
      wrL: [-0.15, 0.03, 0.02], wrR: [0.15, 0.03, 0.02],
      hipL: [-0.055, 0.05, -0.02], hipR: [0.055, 0.05, -0.02],
      knL: [-0.06, 0.06, 0.21], knR: [0.06, 0.06, 0.21],
      anL: [-0.058, 0.07, 0.44], anR: [0.058, 0.07, 0.44],
      toL: [-0.058, 0.10, 0.50], toR: [0.058, 0.10, 0.50],
    }, { sideView: true }),
    makePose("hizadachi", "膝立ち", {
      // 両膝を床につけて上体は立てる。片膝立ち（kneel）の両膝版
      head: [0, 0.685, 0.01], neck: [0, 0.61, 0],
      shL: [-0.115, 0.57, 0], shR: [0.115, 0.57, 0],
      elL: [-0.135, 0.38, 0.015], elR: [0.135, 0.38, 0.015],
      wrL: [-0.145, 0.21, 0.03], wrR: [0.145, 0.21, 0.03],
      hipL: [-0.055, 0.27, -0.01], hipR: [0.055, 0.27, -0.01],
      knL: [-0.06, 0.03, 0], knR: [0.06, 0.03, 0],
      anL: [-0.058, 0.045, -0.24], anR: [0.058, 0.045, -0.24],
      toL: [-0.058, 0.02, -0.31], toR: [0.058, 0.02, -0.31],
    }),
    makePose("yankee", "ヤンキー座り", {
      // 足裏を全部つけた深いしゃがみ。肘を膝に置き、手は前で垂らす
      head: [0, 0.51, 0.06], neck: [0, 0.44, 0.03],
      shL: [-0.115, 0.40, 0.02], shR: [0.115, 0.40, 0.02],
      elL: [-0.14, 0.30, 0.10], elR: [0.14, 0.30, 0.10],
      wrL: [-0.05, 0.26, 0.15], wrR: [0.05, 0.26, 0.15],
      hipL: [-0.055, 0.11, -0.06], hipR: [0.055, 0.11, -0.06],
      knL: [-0.13, 0.30, 0.08], knR: [0.13, 0.30, 0.08],
      anL: [-0.10, 0.05, 0.05], anR: [0.10, 0.05, 0.05],
      toL: [-0.10, 0.012, 0.125], toR: [0.10, 0.012, 0.125],
    }),
    makePose("allfours", "よつんばい", {
      // 手と膝が床。胴は水平、顔は進む向きへ
      head: [0, 0.36, 0.41], neck: [0, 0.335, 0.34],
      shL: [-0.115, 0.31, 0.27], shR: [0.115, 0.31, 0.27],
      elL: [-0.12, 0.17, 0.29], elR: [0.12, 0.17, 0.29],
      wrL: [-0.12, 0.03, 0.30], wrR: [0.12, 0.03, 0.30],
      hipL: [-0.055, 0.27, -0.02], hipR: [0.055, 0.27, -0.02],
      knL: [-0.06, 0.03, -0.02], knR: [0.06, 0.03, -0.02],
      anL: [-0.058, 0.045, -0.26], anR: [0.058, 0.045, -0.26],
      toL: [-0.058, 0.02, -0.33], toR: [0.058, 0.02, -0.33],
    }, { face: [0, -0.35, 0.94], sideView: true }),
    makePose("dogeza", "土下座", {
      // 正座から上体を前へ畳む。頭は床の近く、手は前の床へ
      head: [0, 0.13, 0.27], neck: [0, 0.15, 0.20],
      shL: [-0.115, 0.16, 0.14], shR: [0.115, 0.16, 0.14],
      elL: [-0.13, 0.09, 0.20], elR: [0.13, 0.09, 0.20],
      wrL: [-0.10, 0.03, 0.30], wrR: [0.10, 0.03, 0.30],
      hipL: [-0.055, 0.13, -0.14], hipR: [0.055, 0.13, -0.14],
      knL: [-0.06, 0.03, 0.05], knR: [0.06, 0.03, 0.05],
      anL: [-0.058, 0.05, -0.19], anR: [0.058, 0.05, -0.19],
      toL: [-0.058, 0.02, -0.26], toR: [0.058, 0.02, -0.26],
    }, { face: [0, -0.9, 0.44], sideView: true }),
    /* 逆立ち。手が床、頭は肩より下へ入る。
     * 高さは立ったときより高い（首と頭の代わりに腕が入るため、実測でおよそ1.15倍）。 */
    makePose("handstand", "逆立ち", {
      wrL: [-0.145, 0.02, 0.06], wrR: [0.145, 0.02, 0.06],
      elL: [-0.128, 0.21, 0.03], elR: [0.128, 0.21, 0.03],
      shL: [-0.115, 0.40, -0.01], shR: [0.115, 0.40, -0.01],
      neck: [0, 0.44, 0.01], head: [0, 0.36, 0.06],
      hipL: [-0.055, 0.70, -0.02], hipR: [0.055, 0.70, -0.02],
      knL: [-0.07, 0.94, 0.01], knR: [0.052, 0.945, -0.04],
      anL: [-0.078, 1.18, 0.03], anR: [0.046, 1.19, -0.06],
      toL: [-0.08, 1.25, 0.06], toR: [0.044, 1.26, -0.09],
    }),
    /* 側方宙返り（サイドフリップ）。体の左右の面で回るので、
     * 脚は前後ではなく左右へ開く。頭が下、腰が上を通る瞬間を採る。 */
    makePose("sideflip", "側方宙返り", {
      head: [-0.34, 0.30, 0], neck: [-0.28, 0.38, 0],
      shL: [-0.22, 0.46, -0.10], shR: [-0.20, 0.44, 0.10],
      elL: [-0.34, 0.30, -0.16], elR: [-0.32, 0.28, 0.16],
      wrL: [-0.44, 0.14, -0.20], wrR: [-0.42, 0.12, 0.20],
      hipL: [0.02, 0.66, -0.055], hipR: [0.03, 0.65, 0.055],
      knL: [0.26, 0.60, -0.10], anL: [0.46, 0.52, -0.12], toL: [0.53, 0.49, -0.12],
      knR: [0.24, 0.78, 0.10], anR: [0.44, 0.86, 0.12], toR: [0.51, 0.89, 0.12],
    }, { face: [0, -0.4, 0.9] }),
    makePose("run", "走る", {
      // 歩くより深く。前の膝を高く上げ、体をやや前へ倒す
      knR: [0.07, 0.44, 0.26], anR: [0.075, 0.24, 0.16], toR: [0.075, 0.20, 0.26],
      knL: [-0.07, 0.24, -0.20], anL: [-0.075, 0.06, -0.38], toL: [-0.075, 0.02, -0.46],
      hipL: [-0.055, 0.52, 0.02], hipR: [0.055, 0.52, 0.02],
      shL: [-0.115, 0.81, 0.05], shR: [0.115, 0.81, 0.05],
      elL: [-0.15, 0.66, 0.20], wrL: [-0.13, 0.74, 0.36],
      elR: [0.15, 0.64, -0.14], wrR: [0.13, 0.56, -0.30],
      neck: [0, 0.85, 0.06], head: [0, 0.93, 0.10],
    }),
    /* バク転の途中。腰が頂点にあり、手はまだ床に着いていない。
     * 背中側へ反っているので、胸は上を向く。 */
    makePose("backflip", "バク転", {
      wrL: [-0.13, 0.10, -0.46], wrR: [0.13, 0.10, -0.46],
      elL: [-0.14, 0.34, -0.40], elR: [0.14, 0.34, -0.40],
      shL: [-0.115, 0.58, -0.28], shR: [0.115, 0.58, -0.28],
      neck: [0, 0.50, -0.34], head: [0, 0.40, -0.40],
      hipL: [-0.055, 0.86, 0.04], hipR: [0.055, 0.86, 0.04],
      knL: [-0.08, 0.96, 0.34], knR: [0.08, 0.98, 0.30],
      anL: [-0.085, 0.86, 0.62], anR: [0.085, 0.90, 0.58],
      toL: [-0.085, 0.82, 0.70], toR: [0.085, 0.86, 0.66],
    }, { face: [0, 0.7, -0.7], sideView: true }),
    makePose("hat", "帽子をかぶる", {
      // 立ち姿で、片手をつばへ添える
      elR: [0.17, 0.64, 0.06], wrR: [0.12, 0.82, 0.14],
      elL: [-0.13, 0.63, 0.015], wrL: [-0.14, 0.45, 0.03],
    }, { props: [
      { kind: "ring", c: [0, 0.985, 0], r: 0.15, w: 0.03, tone: "dark", plane: "xz" },
      { kind: "dot", c: [0, 1.01, 0], r: 0.075, tone: "dark" },
    ] }),
    /* ---------- 芸と音楽の姿勢 ----------
     * 道具を持つものは、姿勢が小道具を一緒に持つ（人だけでは何をしているか読めない）。
     * 道具の位置は手や足の関節に合わせてあるので、向きを変えても手から離れない。 */
    makePose("sing", "歌う（マイク）", {
      // 片手をマイクへ、もう片方は開く
      elR: [0.16, 0.62, 0.08], wrR: [0.10, 0.79, 0.12],
      elL: [-0.19, 0.60, -0.02], wrL: [-0.24, 0.44, 0.02],
      head: [0, 0.945, 0.02],
    }, { props: [
      { kind: "line", a: [0.10, 0.79, 0.12], b: [0.055, 0.90, 0.10], w: 0.022, tone: "gear" },
      { kind: "dot", c: [0.05, 0.915, 0.10], r: 0.028, tone: "dark" },
    ] }),
    makePose("juggle", "ジャグリング", {
      // 両手を胸の前へ開き、玉が弧を描いて上がっている
      elL: [-0.20, 0.60, 0.10], elR: [0.20, 0.60, 0.10],
      wrL: [-0.20, 0.72, 0.20], wrR: [0.20, 0.72, 0.20],
    }, { props: [
      { kind: "dot", c: [-0.20, 0.80, 0.20], r: 0.035, tone: "ball" },
      { kind: "dot", c: [0, 1.16, 0.16], r: 0.035, tone: "ball" },
      { kind: "dot", c: [0.20, 0.80, 0.20], r: 0.035, tone: "ball" },
    ] }),
    makePose("guitar", "ギターを弾く", {
      // 左手は棹の上、右手は胴の前
      elL: [-0.22, 0.63, 0.10], wrL: [-0.30, 0.72, 0.14],
      elR: [0.17, 0.60, 0.14], wrR: [0.06, 0.60, 0.20],
    }, { props: [
      { kind: "line", a: [-0.34, 0.75, 0.15], b: [0.06, 0.58, 0.19], w: 0.028, tone: "wood" },
      { kind: "dot", c: [0.10, 0.565, 0.20], r: 0.11, tone: "wood" },
    ] }),
    makePose("trumpet", "トランペットを吹く", {
      // 両手を口元へ。ラッパは斜め上へ向く
      elL: [-0.19, 0.63, 0.10], wrL: [-0.10, 0.76, 0.16],
      elR: [0.19, 0.63, 0.10], wrR: [0.03, 0.76, 0.20],
    }, { props: [
      { kind: "line", a: [-0.02, 0.855, 0.10], b: [0.09, 0.90, 0.30], w: 0.03, tone: "gear" },
      { kind: "dot", c: [0.11, 0.91, 0.33], r: 0.06, tone: "gear" },
    ] }),
    /* 踊り。形の違いが読めることを第一にする（腕の高さ・脚の開き・体の傾きを
     * それぞれ変える）。細かな流派の再現ではなく、絵として見分けがつくこと。 */
    makePose("dance1", "踊る・両手を斜め上へ", {
      elL: [-0.24, 0.90, 0.02], wrL: [-0.34, 1.06, 0.04],
      elR: [0.24, 0.90, 0.02], wrR: [0.34, 1.06, 0.04],
      knL: [-0.10, 0.27, 0.05], anL: [-0.13, 0.04, 0.06],
      knR: [0.10, 0.27, 0.05], anR: [0.13, 0.04, 0.06],
    }),
    makePose("dance2", "踊る・踏み込む", {
      // 前へ大きく踏み込み、後ろ手を引く
      hipL: [-0.055, 0.50, 0.02], hipR: [0.055, 0.50, 0.02],
      knR: [0.09, 0.30, 0.26], anR: [0.10, 0.05, 0.42], toR: [0.10, 0.02, 0.50],
      knL: [-0.08, 0.28, -0.16], anL: [-0.08, 0.05, -0.30], toL: [-0.08, 0.02, -0.36],
      elR: [0.20, 0.66, 0.20], wrR: [0.24, 0.80, 0.34],
      elL: [-0.18, 0.60, -0.16], wrL: [-0.22, 0.48, -0.30],
    }),
    makePose("dance3", "踊る・腰を落として開く", {
      hipL: [-0.07, 0.44, 0], hipR: [0.07, 0.44, 0],
      knL: [-0.22, 0.25, 0.06], anL: [-0.30, 0.04, 0.04],
      knR: [0.22, 0.25, 0.06], anR: [0.30, 0.04, 0.04],
      shL: [-0.115, 0.75, 0], shR: [0.115, 0.75, 0],
      elL: [-0.26, 0.66, 0.06], wrL: [-0.34, 0.56, 0.12],
      elR: [0.26, 0.66, 0.06], wrR: [0.34, 0.56, 0.12],
      neck: [0, 0.79, 0], head: [0, 0.87, 0.01],
    }),
    makePose("dance4", "踊る・跳ぶ", {
      // 床から離れ、脚を左右へ開く
      hipL: [-0.055, 0.66, 0], hipR: [0.055, 0.66, 0],
      knL: [-0.24, 0.50, 0.04], anL: [-0.38, 0.36, 0.02], toL: [-0.44, 0.31, 0.04],
      knR: [0.24, 0.50, 0.04], anR: [0.38, 0.36, 0.02], toR: [0.44, 0.31, 0.04],
      shL: [-0.115, 0.96, 0], shR: [0.115, 0.96, 0],
      elL: [-0.24, 1.06, 0.02], wrL: [-0.30, 1.20, 0.04],
      elR: [0.24, 1.06, 0.02], wrR: [0.30, 1.20, 0.04],
      neck: [0, 1.00, 0], head: [0, 1.08, 0.01],
    }),
    makePose("dance5", "踊る・体をひねる", {
      // 上半身をひねり、腕を胸の前で交差させる
      shL: [-0.10, 0.82, 0.06], shR: [0.12, 0.81, -0.06],
      elL: [-0.10, 0.66, 0.18], wrL: [0.10, 0.62, 0.14],
      elR: [0.20, 0.66, 0.04], wrR: [0.02, 0.70, 0.16],
      hipL: [-0.06, 0.51, -0.02], hipR: [0.05, 0.52, 0.02],
      knL: [-0.08, 0.28, 0.06], anL: [-0.09, 0.04, 0.02],
      knR: [0.07, 0.28, -0.04], anR: [0.08, 0.05, -0.10], toR: [0.08, 0.02, -0.17],
      neck: [0, 0.86, 0.02], head: [0, 0.94, 0.06],
    }),
    /* ウィンドミル。背中と肩で床を受け、脚を大きく開いて回る。
     * 体はほぼ水平で、腰が浮いている瞬間を採る。 */
    makePose("windmill", "ウィンドミル", {
      head: [-0.16, 0.13, 0.18], neck: [-0.10, 0.16, 0.12],
      shL: [-0.06, 0.20, 0.02], shR: [-0.02, 0.14, -0.10],
      elL: [-0.10, 0.06, 0.16], wrL: [-0.14, 0.03, 0.28],
      elR: [0.10, 0.10, -0.16], wrR: [0.18, 0.05, -0.24],
      hipL: [0.10, 0.30, 0.04], hipR: [0.14, 0.26, -0.06],
      knL: [0.28, 0.46, 0.20], anL: [0.40, 0.62, 0.34], toL: [0.44, 0.68, 0.40],
      knR: [0.30, 0.34, -0.22], anR: [0.42, 0.24, -0.40], toR: [0.46, 0.20, -0.47],
    }, { wide: [0, 1, 0], face: [0, 0.2, 0.9], sideView: true }),
    makePose("skate", "ローラースケート", {
      // 滑る姿勢。膝を軽く曲げ、体をやや前へ倒す
      hipL: [-0.055, 0.50, 0.02], hipR: [0.055, 0.50, 0.02],
      knL: [-0.07, 0.28, 0.10], anL: [-0.075, 0.075, 0.12],
      knR: [0.07, 0.28, -0.02], anR: [0.075, 0.075, 0.00],
      shL: [-0.115, 0.80, 0.06], shR: [0.115, 0.80, 0.06],
      elL: [-0.18, 0.64, 0.14], wrL: [-0.20, 0.52, 0.24],
      elR: [0.18, 0.64, 0.14], wrR: [0.20, 0.52, 0.24],
      neck: [0, 0.84, 0.06], head: [0, 0.92, 0.09],
    }, { props: [
      { kind: "line", a: [-0.075, 0.035, 0.05], b: [-0.075, 0.035, 0.19], w: 0.035, tone: "dark" },
      { kind: "line", a: [0.075, 0.035, -0.07], b: [0.075, 0.035, 0.07], w: 0.035, tone: "dark" },
    ] }),
    makePose("unicycle", "一輪車", {
      // サドルに座り、脚はペダルへ。腕は左右へ開いて釣り合いを取る
      hipL: [-0.055, 0.66, 0], hipR: [0.055, 0.66, 0],
      knL: [-0.10, 0.50, 0.22], anL: [-0.10, 0.34, 0.10], toL: [-0.10, 0.31, 0.18],
      knR: [0.10, 0.46, 0.14], anR: [0.10, 0.30, -0.06], toR: [0.10, 0.27, 0.02],
      shL: [-0.115, 0.96, 0], shR: [0.115, 0.96, 0],
      elL: [-0.26, 0.94, 0.02], wrL: [-0.40, 0.98, 0.04],
      elR: [0.26, 0.94, 0.02], wrR: [0.40, 0.98, 0.04],
      neck: [0, 1.00, 0], head: [0, 1.08, 0.01],
    }, { props: [
      { kind: "line", a: [0, 0.62, 0], b: [0, 0.30, 0], w: 0.03, tone: "gear" },
      { kind: "ring", c: [0, 0.30, 0], r: 0.30, w: 0.035, tone: "dark" },
      { kind: "dot", c: [0, 0.30, 0], r: 0.03, tone: "gear" },
    ] }),
    makePose("skateboard", "スケートボード", {
      // 板の上に横向きで乗る。膝を曲げ、腕で釣り合いを取る
      hipL: [-0.055, 0.50, -0.06], hipR: [0.055, 0.50, 0.06],
      knL: [-0.09, 0.28, -0.14], anL: [-0.09, 0.10, -0.20], toL: [-0.09, 0.07, -0.27],
      knR: [0.09, 0.28, 0.14], anR: [0.09, 0.10, 0.20], toR: [0.09, 0.07, 0.27],
      elL: [-0.22, 0.66, -0.06], wrL: [-0.30, 0.74, -0.14],
      elR: [0.22, 0.66, 0.10], wrR: [0.30, 0.74, 0.18],
      neck: [0, 0.86, 0.02], head: [0, 0.94, 0.04],
    }, { props: [
      { kind: "line", a: [0, 0.05, -0.36], b: [0, 0.05, 0.36], w: 0.05, tone: "dark" },
      { kind: "dot", c: [0, 0.025, -0.24], r: 0.028, tone: "gear" },
      { kind: "dot", c: [0, 0.025, 0.24], r: 0.028, tone: "gear" },
    ] }),
    makePose("bicycle", "自転車", {
      // 前傾してハンドルを握る。脚はペダルの上下へ
      hipL: [-0.055, 0.62, -0.10], hipR: [0.055, 0.62, -0.10],
      knL: [-0.09, 0.44, 0.14], anL: [-0.09, 0.26, 0.06], toL: [-0.09, 0.23, 0.14],
      knR: [0.09, 0.40, 0.04], anR: [0.09, 0.22, -0.10], toR: [0.09, 0.19, -0.02],
      shL: [-0.11, 0.86, 0.06], shR: [0.11, 0.86, 0.06],
      elL: [-0.16, 0.80, 0.24], wrL: [-0.18, 0.78, 0.40],
      elR: [0.16, 0.80, 0.24], wrR: [0.18, 0.78, 0.40],
      neck: [0, 0.90, 0.10], head: [0, 0.96, 0.16],
    }, { props: [
      { kind: "ring", c: [0, 0.33, 0.50], r: 0.33, w: 0.03, tone: "dark" },
      { kind: "ring", c: [0, 0.33, -0.52], r: 0.33, w: 0.03, tone: "dark" },
      { kind: "line", a: [0, 0.33, -0.52], b: [0, 0.62, -0.12], w: 0.025, tone: "gear" },
      { kind: "line", a: [0, 0.62, -0.12], b: [0, 0.30, 0.04], w: 0.025, tone: "gear" },
      { kind: "line", a: [0, 0.30, 0.04], b: [0, 0.33, 0.50], w: 0.025, tone: "gear" },
      { kind: "line", a: [0, 0.62, -0.12], b: [0, 0.78, 0.40], w: 0.025, tone: "gear" },
      { kind: "line", a: [-0.20, 0.78, 0.40], b: [0.20, 0.78, 0.40], w: 0.025, tone: "gear" },
    ] }),
    /* シルホイール。輪の中に人が入り、両手両足で輪をとらえて回る道具。
     * 動力は人力だけで、輪と接しているのは両手と両足の四点。
     * 輪の直径は演者の身長＋十数cm（身長165cmで1.85m前後）が実物の目安。
     * ここでは身長の1.12倍とし、輪は床に接する（中心が半径の高さに来る）。
     * 手足はきっちり輪の上に置く（四点とも中心から半径ぴったりの位置）。 */
    makePose("cyr", "シルホイール", {
      head: [0, 0.945, 0], neck: [0, 0.86, 0],
      shL: [-0.115, 0.82, 0], shR: [0.115, 0.82, 0],
      elL: [-0.29, 0.83, 0], elR: [0.29, 0.83, 0],
      wrL: [-0.459, 0.881, 0], wrR: [0.459, 0.881, 0],     // 輪の上（斜め上）
      hipL: [-0.055, 0.52, 0], hipR: [0.055, 0.52, 0],
      knL: [-0.22, 0.33, 0], knR: [0.22, 0.33, 0],
      anL: [-0.36, 0.131, 0], anR: [0.36, 0.131, 0],       // 輪の上（斜め下）
      // つま先は輪から外へ出さず、輪に沿わせる（足の裏で輪をとらえている）
      toL: [-0.306, 0.086, 0.03], toR: [0.306, 0.086, 0.03],
    }, { wheel: { r: 0.56, cy: 0.56 } }),
    /* 抱え込み宙返り。空中で身体をひとつの塊に丸めた形。背中が床側、膝が天井側。
     * ★首は「丸める側」へ曲げる。肩より下へ出すと顎が上がった格好になり、
     *   宙返りではなく仰向けで浮いた人になる。頭は肩の上、膝の側へ。
     * ★膝はおよそ直角（本人指定）。踵を尻まで引くほど畳むと、
     *   絵として脚が消えて塊が読めなくなる。腿と脛は同じ長さで持つ。
     * 腕は脛を抱える。y の原点は床のままなので、塊ごと1m前後の高さへ浮かせる。 */
    makePose("tuck", "抱え込み宙返り", {
      // 胴は塊の下側を通す（腰＝後ろ、肩＝前でほぼ水平）
      hipL: [-0.055, 0.86, -0.13], hipR: [0.055, 0.86, -0.13],
      shL: [-0.105, 0.88, 0.13], shR: [0.105, 0.88, 0.13],
      /* 首から上は前ではなく上へ折る。前へ伸ばすと背骨と一本の棒になる。
       * 肩の中点からの距離は0.118（立ち姿0.115）。抱え込むと首は縮んで見えるので、
       * ここを伸ばすと顔だけ遠くにある人形になる。 */
      neck: [0, 0.938, 0.152],
      head: [0, 0.990, 0.172],
      /* 腿は腰から胸の側（顎の下）へ抱え込み、脛はそこで折り返して
       * 踵を尻の上へ持っていく。★膝の折り目（膝の裏）は身体の側を向く。
       * 脛を胸の前へ回すと、膝が逆へ曲がって見える。
       * 膝の曲がりは68度（元は60度）。畳みきらないぶん、抱えている腕と
       * 膝の間に隙間ができて「抱え込んでいる」ことが読める。
       * 膝はガニ股気味に外へ開く（両膝の間33cm、元は28cm）。
       * ★腿0.252・脛0.250は立ち姿と同じ長さに揃えてある。ここを崩すと、
       *   この姿勢のときだけ脚の長さが変わる。 */
      knL: [-0.100, 1.012, 0.066], knR: [0.100, 1.012, 0.066],
      anL: [-0.086, 1.138, -0.149], anR: [0.086, 1.138, -0.149],
      toL: [-0.084, 1.168, -0.217], toR: [0.084, 1.168, -0.217],
      // 腕は脛を抱える。肘は身体の外へ張り出す
      elL: [-0.215, 0.885, 0.17], elR: [0.215, 0.885, 0.17],
      wrL: [-0.10, 1.005, 0.015], wrR: [0.10, 1.005, 0.015],
      /* ★顔は「上・前」ではなく「下・後ろ」。頭は体のいちばん前(z=0.185)にあり、
       * 抱えた膝(z=0.068)はその後ろ側にある。宙返りでは顎を引いて膝を見るので、
       * 顔はそちらを向く。前向きにすると、目だけが体の反対側に付いて見える。 */
    }, { face: [0, -0.32, -0.95], sideView: true, bow: 0.045 }),
    /* 寝姿。本人の正面（z+）が頭側なので、向きを真横にすると寝姿がはっきり読める。
     * うつ伏せ・仰向け・横向きは、腕と脚の置き方と顔の向きで見分ける。 */
    makePose("lie", "うつ伏せ", {
      head: [0, 0.09, 0.50], neck: [0, 0.078, 0.42],
      shL: [-0.115, 0.07, 0.36], shR: [0.115, 0.07, 0.36],
      elL: [-0.20, 0.06, 0.35], elR: [0.20, 0.06, 0.35],
      wrL: [-0.185, 0.06, 0.49], wrR: [0.185, 0.06, 0.49],
      hipL: [-0.058, 0.07, 0.06], hipR: [0.058, 0.07, 0.06],
      knL: [-0.06, 0.07, -0.22], knR: [0.06, 0.07, -0.22],
      anL: [-0.058, 0.06, -0.48], anR: [0.058, 0.06, -0.48],
      toL: [-0.058, 0.03, -0.55], toR: [0.058, 0.03, -0.55],
    }, { face: [0, -1, 0.35] }),
    makePose("supine", "仰向け", {
      head: [0, 0.075, 0.50], neck: [0, 0.07, 0.42],
      shL: [-0.115, 0.07, 0.36], shR: [0.115, 0.07, 0.36],
      elL: [-0.145, 0.06, 0.21], elR: [0.145, 0.06, 0.21],
      wrL: [-0.14, 0.055, 0.05], wrR: [0.14, 0.055, 0.05],
      hipL: [-0.058, 0.07, 0.06], hipR: [0.058, 0.07, 0.06],
      knL: [-0.06, 0.095, -0.21], knR: [0.06, 0.095, -0.21],
      anL: [-0.058, 0.06, -0.47], anR: [0.058, 0.06, -0.47],
      toL: [-0.058, 0.11, -0.52], toR: [0.058, 0.11, -0.52],
    }, { face: [0, 1, 0.35] }),
    // 横向きは肩が縦に重なる。胴の断面の幅も上下向きにする
    makePose("sidelie", "横向き", {
      head: [0, 0.115, 0.47], neck: [0, 0.105, 0.39],
      shL: [0.012, 0.175, 0.34], shR: [-0.012, 0.055, 0.34],
      elL: [0.02, 0.14, 0.19], elR: [-0.005, 0.045, 0.21],
      wrL: [0.02, 0.10, 0.06], wrR: [-0.005, 0.04, 0.08],
      hipL: [0.012, 0.145, 0.04], hipR: [-0.012, 0.055, 0.04],
      knL: [0.022, 0.13, -0.19], knR: [-0.004, 0.055, -0.18],
      anL: [0.022, 0.075, -0.41], anR: [-0.004, 0.045, -0.40],
      toL: [0.022, 0.05, -0.48], toR: [-0.004, 0.04, -0.47],
    }, { wide: [0, 1, 0], face: [0, 0.25, 1] }),
  ];
  const poseById = (id) => POSES.find((p) => p.id === id)
    || HIDDEN_POSES.find((p) => p.id === id) || POSES[0];

  /* その姿勢が身長Hに対して占める範囲。手足の太さぶんも見込む。
   * 平面図の footprint と、選んだときの枠の大きさに使う。
   * 寝ている演者は床を長く占めるので、立っているときと同じ丸では表せない。 */
  const poseExtent = (() => {
    const cache = {};
    return (id) => {
      if (cache[id]) return cache[id];
      const pose = poseById(id);
      const j = pose.joints;
      const pad = 0.05;   // 手足の太さと胴の厚みぶん
      let x0 = Infinity; let x1 = -Infinity; let y1 = -Infinity; let z0 = Infinity; let z1 = -Infinity;
      Object.keys(j).forEach((k) => {
        x0 = Math.min(x0, j[k][0]); x1 = Math.max(x1, j[k][0]);
        y1 = Math.max(y1, j[k][1]);
        z0 = Math.min(z0, j[k][2]); z1 = Math.max(z1, j[k][2]);
      });
      // 道具を持つ姿勢は、道具の外側までが占める範囲になる（輪は人より大きい）
      if (pose.wheel) {
        x0 = Math.min(x0, -pose.wheel.r); x1 = Math.max(x1, pose.wheel.r);
        y1 = Math.max(y1, pose.wheel.cy + pose.wheel.r);
      }
      cache[id] = {
        halfX: Math.max(0.07, (x1 - x0) / 2 + pad),
        halfZ: Math.max(0.07, (z1 - z0) / 2 + pad),
        cx: (x0 + x1) / 2, cz: (z0 + z1) / 2,
        top: y1 + 0.05,
      };
      return cache[id];
    };
  })();

  const norm3 = (v) => {
    const n = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / n, v[1] / n, v[2] / n];
  };
  const cross3 = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  // 多角形の角を丸めて閉じる。辺の中点を通る二次曲線にすると、
  // 頂点が丸まって、体のような柔らかい輪郭になる
  /* 与えた点を「通る」なめらかな閉じた輪郭。
     点の間を結ぶだけの描き方だと角が丸まり、胴のくびれのような浅い凹みが消える。
     ここは各点を必ず通したいので、前後の点から接線を起こして曲線にする。 */
  function smoothClosedPath(target, pts, tension) {
    const n = pts.length;
    if (n < 3) return;
    const k = (tension === undefined ? 0.5 : tension) / 3;
    target.beginPath();
    target.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i += 1) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      target.bezierCurveTo(
        p1.x + (p2.x - p0.x) * k, p1.y + (p2.y - p0.y) * k,
        p2.x - (p3.x - p1.x) * k, p2.y - (p3.y - p1.y) * k,
        p2.x, p2.y);
    }
    target.closePath();
  }

  /* 胴の外周。断面の中心を上から下へたどり、各断面で体の軸に直交する向きへ
     張り出した点を左右に取る。張り出しは楕円断面としての見かけの半径
     √((幅·n)² + (厚み·n)²) で、向きを変えると自然に細く見える。 */
  function torsoOutline(rings) {
    const right = [];
    const left = [];
    rings.forEach((ring, i) => {
      const prev = rings[Math.max(0, i - 1)].o;
      const next = rings[Math.min(rings.length - 1, i + 1)].o;
      let ax = next.x - prev.x;
      let ay = next.y - prev.y;
      const len = Math.hypot(ax, ay) || 1;
      ax /= len; ay /= len;
      const nx = -ay;                       // 軸に直交する向き
      const ny = ax;
      const w = ring.wx * nx + ring.wy * ny;
      const d = ring.dx * nx + ring.dy * ny;
      const r = Math.hypot(w, d);
      right.push({ x: ring.o.x + nx * r, y: ring.o.y + ny * r });
      left.push({ x: ring.o.x - nx * r, y: ring.o.y - ny * r });
    });
    return right.concat(left.reverse());
  }

  // 付け根から先へ細くなる手足。節ごとに台形を置き、関節を丸で埋める
  function taperedChain(target, pts, radii) {
    /* 節を台形で結び、関節を丸で埋める。★全部を一本の path に入れて
       最後に一度だけ塗る。節ごとに塗ると、色が半透明のときに重なりが濃く出る。
       同じ向きに描いた図形どうしは nonzero で溶け合うので、継ぎ目は出ない。 */
    target.beginPath();
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const ra = radii[i];
      const rb = radii[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      /* ★点の並べ方（巻き方向）を、下の丸（arc）と必ず同じにする。
         逆向きだと nonzero で打ち消し合い、関節ごとに穴があく
         （実際に、手足が数珠つなぎの黒い丸に見えていた）。 */
      target.moveTo(a.x + nx * ra, a.y + ny * ra);
      target.lineTo(a.x - nx * ra, a.y - ny * ra);
      target.lineTo(b.x - nx * rb, b.y - ny * rb);
      target.lineTo(b.x + nx * rb, b.y + ny * rb);
      target.closePath();
    }
    pts.forEach((q, i) => {
      target.moveTo(q.x + radii[i], q.y);
      target.arc(q.x, q.y, radii[i], 0, Math.PI * 2);
    });
    target.fill();
  }

  // 二点の間を割った点。手足の中間の節（腿やふくらはぎのふくらみ）を作る
  const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  /* 手足の節を、中間のふくらみを挟んだ列に開く。
     肩→肘→手首 の3点が 肩→上腕→肘→前腕→手首 の5点になる。 */
  function limbNodes(pts, kind) {
    const mids = LIMB_MIDS[kind];
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const t = mids[Math.min(i, mids.length - 1)];
      out.push(lerpPt(pts[i], pts[i + 1], t));
      out.push(pts[i + 1]);
    }
    return out;
  }

  // 色を地の暗さへ寄せる。奥の手足を沈ませるのに使う（重ね塗りで濃くならないよう、
  // 半透明ではなく色そのものを混ぜる）
  function mixToward(hex, t) {
    const c = hex.replace("#", "");
    const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
    const r = Math.round(((n >> 16) & 255) * (1 - t) + 13 * t);
    const g = Math.round(((n >> 8) & 255) * (1 - t) + 12 * t);
    const b = Math.round((n & 255) * (1 - t) + 11 * t);
    return `rgb(${r},${g},${b})`;
  }

  // 体の部位。太さは身長に対する割合。奥にあるものから塗るために z も見る
  /* 手足。足首から先（足）と手首から先（手）は形が違うので別に描く。
     一本の細くなる線で足の甲まで通すと、足が「とがった棒の先」になる。 */
  const LIMBS = [
    { pts: ["hipL", "knL", "anL"], kind: "leg", tip: ["anL", "toL"] },
    { pts: ["hipR", "knR", "anR"], kind: "leg", tip: ["anR", "toR"] },
    { pts: ["shL", "elL", "wrL"], kind: "arm", tip: ["elL", "wrL"] },
    { pts: ["shR", "elR", "wrR"], kind: "arm", tip: ["elR", "wrR"] },
  ];

  // 首を振れる角度。見上げる側を大きく取る（吊り物や空中の演目はそこにある）
  const TILT_UP = 34;
  const TILT_DOWN = 16;
  const SOLID_TYPES = {
    block: true, table: true, chair: true, bench: true, stool: true, wall: true,
    trapeze: true, cyrwheel: true, diabolo: true, pole: true, teeter: true, tissue: true, wire: true,
    suitcase: true, trampoline: true, cane: true, car: true, seri: true,
  };
  const CHAIR_W = 0.5;
  const CHAIR_D = 0.55;
  // その駒が床でどれだけの面積を取るか（m）。平面図と当たり判定で使う
  function pieceFootprint(piece) {
    const d = pieceDims(piece);
    if (!d) return null;
    if (piece.type === "chair") return { w: d.h * CHAIR_W, d: d.h * CHAIR_D };
    // ディアボロは直径も持つので、球などの共通分岐より先に置き方を反映する
    if (piece.type === "diabolo") {
      return piece.diaboloMode === "stand" ? { w: d.dia, d: d.dia } : { w: d.w, d: d.dia };
    }
    if (d.dia !== undefined) return { w: d.dia, d: d.dia };
    return { w: d.w, d: d.d };
  }
  const DEFAULT_HEIGHT_CM = 165;
  // 名簿や舞台セットへ加えたときの色。順に配って、色でも見分けられるようにする
  const PIECE_PALETTE = ["#a84b26", "#efe7d6", "#77865f", "#8b98a1", "#d3ac59", "#6d6657"];
  function nextPieceColor(index) {
    return PIECE_PALETTE[((index % PIECE_PALETTE.length) + PIECE_PALETTE.length) % PIECE_PALETTE.length];
  }
  // 肩幅は身長のおよそ1/4。向きが変わると見かけの幅がこの間で動く
  const SHOULDER_RATIO = 0.25;
  // 体の厚み（前後）は肩幅のおよそ0.68倍。真横を向いたときの見かけの幅になる
  const BODY_DEPTH_RATIO = 0.68;
  /* 胴の断面。肩・くびれ・腰の3段で持つ。すべて身長に対する割合。
   * halfX=左右の半幅、rz=前後の半分の厚み。実測（身長165cm）でいうと
   * 肩幅0.38m・胴の厚み0.19m・腰幅0.32mあたり。
   * 肩と腰だけの2段だと台形になって、上半身が四角く見える。 */
  /* 胴の断面。肩の中点(t=0)から腰の中点(t=1)へ向かって積む。
   * t が負のところは首。halfX は左右の半幅、rz は前後の半厚（身長比）。
   * ★rz は真横から見たときの太さそのもの。薄いと横向きの姿勢（バク転・側方宙返り）が
   *   板のように見える。胸の厚み23cm・くびれ18cm・腰21cm（身長165cm）に合わせてある。
   * ★くびれ(t=0.62)を持たせてあるので、外周は凸包で取ってはいけない。
   *   凸包は凹みを埋めるので、腰のくびれが消えて胴が樽になる（実際にそうなっていた）。 */
  const TORSO_RINGS = [
    /* t は肩の中点(y=0.82)から腰の中点(y=0.52)へ引いた線の割合なので、
       0.30 動くと身長の30%動く。頭の下端は y≈0.867 → t≈-0.157。
       首の上端はそれより少し上（頭の中）まで伸ばして、頭と胴を確実につなぐ。 */
    /* 肩。★肩関節（x=±0.115）とほぼ同じ幅まで広げる。
     * ここが細いと、腕の付け根の丸だけが胴の外へ飛び出して、
     * 三角筋だけが発達した人に見える（胴との間に凹みもできる）。 */
    { t: 0.00, halfX: 0.116, rz: 0.068 },    // 肩
    { t: 0.14, halfX: 0.110, rz: 0.070 },    // 肩の下。ここを飛ばすと脇が角になる
    { t: 0.30, halfX: 0.098, rz: 0.071 },    // 胸
    { t: 0.62, halfX: 0.076, rz: 0.055 },    // くびれ
    { t: 0.90, halfX: 0.090, rz: 0.064 },    // 腰（骨盤の張り）
    { t: 1.16, halfX: 0.062, rz: 0.052 },    // 股（y≈0.47）。ここを絞らないと腿が癒着する
  ];

  /* 首の断面。★胴の軸（肩→腰）の延長ではなく、「肩の中点→頭」に沿って積む。
   * 抱え込み宙返りのように胴が水平に近い姿勢では、軸の延長は前へ伸びるだけで
   * 頭へ届かず、首が付いていないように見える（実際にそうなっていた）。
   * s は肩の中点から頭の中心までの割合。1.0を少し切る所で止めて頭の中へ差し込む。 */
  const NECK_RINGS = [
    { s: 0.18, halfX: 0.086, rz: 0.060 },   // 僧帽筋。ここを飛ばすと肩が角になる
    { s: 0.55, halfX: 0.046, rz: 0.046 },   // 首
    { s: 0.85, halfX: 0.033, rz: 0.038 },   // 頭の中まで差し込む
  ];

  /* 手足の太さ（身長比の半径）。関節の間に中間の節を挟み、
     腿・ふくらはぎ・前腕のふくらみを持たせる。ここが無いと棒に見える。 */
  const LIMB_TAPER = {
    // 腿の付け根 → 腿の中 → 膝 → ふくらはぎ → 足首
    leg: [0.050, 0.047, 0.033, 0.037, 0.019],
    // 肩 → 上腕の中 → 肘 → 前腕の太い所 → 手首
    arm: [0.029, 0.029, 0.023, 0.023, 0.014],
  };
  // 節の間に挟む中間点の位置（0=手前の関節、1=先の関節）
  const LIMB_MIDS = { leg: [0.45, 0.35], arm: [0.5, 0.35] };
  const HAND_LEN = 0.050;      // 手首から指先まで
  const HAND_R = 0.020;
  const FOOT_R = 0.020;        // 足の甲の厚み
  const HEEL_BACK = 0.026;     // 踵がくるぶしより後ろへ出る量（実寸で約4cm）
  const TOOL_HINTS = {
    select: "演者や物を選び、舞台の上で動かします。",
    paint: "奥の背景面を指やマウスで塗ります。",
    erase: "背景に描いた線だけを消します。",
    arrow: "正面図をなぞると矢印になります。床の上か空中かを選べます。Alt（option）を押しながらクリックすると、近い矢印を1本消せます。",
    route: "平面図で演者や物、明かりを掴み、離した所が行き先になります。真ん中の丸を引くと動線が曲がります。",
    note: "何もない所を押すとメモを貼れます。貼ったメモは掴んで動かせます。",
    light: "照明だけを動かします。丸い印が灯体、明るい輪が当たる場所です。",
  };

  const els = {
    undo: document.getElementById("stage-undo"),
    redo: document.getElementById("stage-redo"),
    export: document.getElementById("stage-export"),
    lang: document.getElementById("stage-lang"),
    tour: document.getElementById("stage-tour"),
    tourRing: document.getElementById("stage-tour-ring"),
    tourShadePath: document.getElementById("stage-tour-shade-path"),
    tourCard: document.getElementById("stage-tour-card"),
    tourStep: document.getElementById("stage-tour-step"),
    tourTitle: document.getElementById("stage-tour-title"),
    tourBody: document.getElementById("stage-tour-body"),
    tourPrev: document.getElementById("stage-tour-prev"),
    tourNext: document.getElementById("stage-tour-next"),
    tourClose: document.getElementById("stage-tour-close"),
    tourStart: document.getElementById("stage-tour-start"),
    aboutOpenFromPrefs: document.getElementById("stage-about-open-from-prefs"),
    aboutModal: document.getElementById("stage-about-modal"),
    aboutBackdrop: document.getElementById("stage-about-backdrop"),
    aboutClose: document.getElementById("stage-about-close"),
    feedback: document.getElementById("stage-feedback"),
    exportModal: document.getElementById("stage-export-modal"),
    exportBackdrop: document.getElementById("stage-export-backdrop"),
    exportClose: document.getElementById("stage-export-close"),
    exportRun: document.getElementById("stage-export-run"),
    exportNote: document.getElementById("stage-export-note"),
    toolHint: document.getElementById("stage-tool-hint"),
    toolHelp: document.getElementById("stage-tool-help"),
    arrowOptions: document.getElementById("stage-arrow-options"),
    arrowPlaneFloor: document.getElementById("stage-arrow-plane-floor"),
    arrowPlaneAir: document.getElementById("stage-arrow-plane-air"),
    arrowDepthControl: document.getElementById("stage-arrow-depth-control"),
    arrowDepth: document.getElementById("stage-arrow-depth"),
    arrowDepthValue: document.getElementById("stage-arrow-depth-value"),
    arrowHeadOne: document.getElementById("stage-arrow-head-one"),
    arrowHeadBoth: document.getElementById("stage-arrow-head-both"),
    arrowColor: document.getElementById("stage-arrow-color"),
    arrowClear: document.getElementById("stage-arrow-clear"),
    background: document.getElementById("stage-bg-color"),
    paintColor: document.getElementById("stage-paint-color"),
    brushSize: document.getElementById("stage-brush-size"),
    brushValue: document.getElementById("stage-brush-value"),
    clearPaint: document.getElementById("stage-clear-paint"),
    photoBlock: document.getElementById("stage-photo-block"),
    screenTextInput: document.getElementById("stage-screentext-input"),
    screenTextAdd: document.getElementById("stage-screentext-add"),
    screenTextList: document.getElementById("stage-screentext-list"),
    screenTextEdit: document.getElementById("stage-screentext-edit"),
    screenTextSize: document.getElementById("stage-screentext-size"),
    screenTextSizeValue: document.getElementById("stage-screentext-size-value"),
    screenTextOpacity: document.getElementById("stage-screentext-opacity"),
    screenTextOpacityValue: document.getElementById("stage-screentext-opacity-value"),
    screenTextAngle: document.getElementById("stage-screentext-angle"),
    screenTextAngleValue: document.getElementById("stage-screentext-angle-value"),
    screenTextFont: document.getElementById("stage-screentext-font"),
    screenTextColor: document.getElementById("stage-screentext-color"),
    screenTextVertical: document.getElementById("stage-screentext-vertical"),
    screenTextBlock: document.getElementById("stage-screentext-block"),
    photoFile: document.getElementById("stage-photo-file"),
    photoOn: document.getElementById("stage-photo-on"),
    photoBright: document.getElementById("stage-photo-bright"),
    photoBrightValue: document.getElementById("stage-photo-bright-value"),
    photoClear: document.getElementById("stage-photo-clear"),
    photoNote: document.getElementById("stage-photo-note"),
    selectionEmpty: document.getElementById("stage-selection-empty"),
    selectionControls: document.getElementById("stage-selection-controls"),
    selectedName: document.getElementById("stage-selected-name"),
    fpvOpen: document.getElementById("stage-fpv-open"),
    dimsFromSet: document.getElementById("stage-dims-from-set"),
    openSetInfo: document.getElementById("stage-open-setinfo"),
    routeClear: document.getElementById("stage-route-clear"),
    pieceLock: document.getElementById("stage-piece-lock"),
    facingControls: document.getElementById("stage-facing-controls"),
    facingLock: document.getElementById("stage-facing-lock"),
    planRoute: document.getElementById("stage-plan-route"),
    planNote: document.getElementById("stage-plan-note"),
    frontNote: document.getElementById("stage-front-note"),
    frontZoom: document.getElementById("stage-front-zoom"),
    planZoom: document.getElementById("stage-plan-zoom"),
    planZoomIn: document.getElementById("stage-plan-zoom-in"),
    planZoomOut: document.getElementById("stage-plan-zoom-out"),
    rename: document.getElementById("stage-rename"),
    renameBackdrop: document.getElementById("stage-rename-backdrop"),
    renameInput: document.getElementById("stage-rename-input"),
    renameOk: document.getElementById("stage-rename-ok"),
    renameClose: document.getElementById("stage-rename-close"),
    renameTitle: document.getElementById("stage-rename-title"),
    renameColors: document.getElementById("stage-rename-colors"),
    renameSwatches: document.getElementById("stage-rename-swatches"),
    duplicate: document.getElementById("stage-duplicate"),
    delete: document.getElementById("stage-delete"),
    clear: document.getElementById("stage-clear"),
    saveStatus: document.getElementById("stage-save-status"),
    backupNote: document.getElementById("stage-backup-note"),
    backupHint: document.getElementById("stage-backup-hint"),
    backupExport: document.getElementById("stage-backup-export"),
    askPanel: document.getElementById("stage-ask-panel"),
    askInput: document.getElementById("stage-ask-input"),
    askIdle: document.getElementById("stage-ask-idle"),
    askRun: document.getElementById("stage-ask-run"),
    askRunning: document.getElementById("stage-ask-running"),
    askElapsed: document.getElementById("stage-ask-elapsed"),
    askStop: document.getElementById("stage-ask-stop"),
    askDraft: document.getElementById("stage-ask-draft"),
    askDraftBody: document.getElementById("stage-ask-draft-body"),
    askWarning: document.getElementById("stage-ask-warning"),
    askAdopt: document.getElementById("stage-ask-adopt"),
    askResolve: document.getElementById("stage-ask-resolve"),
    askDiscard: document.getElementById("stage-ask-discard"),
    askError: document.getElementById("stage-ask-error"),
    askAgentInfo: document.getElementById("stage-ask-agent-info"),
    rehearsalExportOpen: document.getElementById("stage-rehearsal-export-open"),
    rehearsalExportModal: document.getElementById("stage-rehearsal-export-modal"),
    rehearsalExportBackdrop: document.getElementById("stage-rehearsal-export-backdrop"),
    rehearsalExportClose: document.getElementById("stage-rehearsal-export-close"),
    rehearsalExportRun: document.getElementById("stage-rehearsal-export-run"),
    rehearsalCheck: document.getElementById("stage-rehearsal-check"),
    rehearsalDefaults: document.getElementById("stage-rehearsal-defaults"),
    rehearsalDefaultHold: document.getElementById("stage-rehearsal-default-hold"),
    rehearsalDefaultTransition: document.getElementById("stage-rehearsal-default-transition"),
    rehearsalApplyDefaults: document.getElementById("stage-rehearsal-apply-defaults"),
    rehearsalSoundtrack: document.getElementById("stage-rehearsal-soundtrack"),
    rehearsalUnsupported: document.getElementById("stage-rehearsal-unsupported"),
    rehearsalAllowUnsupported: document.getElementById("stage-rehearsal-allow-unsupported"),
    rehearsalOmittedList: document.getElementById("stage-rehearsal-omitted-list"),
    live: document.getElementById("stage-live"),
    venueSelect: document.getElementById("stage-venue-select"),
    sizeSelect: document.getElementById("stage-size-select"),
    showFront: document.getElementById("stage-show-front"),
    showPlan: document.getElementById("stage-show-plan"),
    frontCell: document.getElementById("stage-front-cell"),
    planCell: document.getElementById("stage-plan-cell"),
    canvasStack: document.getElementById("stage-canvas-stack"),
    frontCaption: document.getElementById("stage-front-caption"),
    frontApprox: document.getElementById("stage-front-approx"),
    sceneDesc: document.getElementById("stage-scene-desc"),
    sceneDescLabel: document.getElementById("stage-scene-desc-label"),
    sceneDescText: document.getElementById("stage-scene-desc-text"),
    lightIntent: document.getElementById("stage-light-intent"),
    lightIntentCompare: document.getElementById("stage-light-intent-compare"),
    lightIntentCompareIntent: document.getElementById("stage-light-intent-compare-intent"),
    lightIntentCompareLights: document.getElementById("stage-light-intent-compare-lights"),
    lightIntentPresets: document.getElementById("stage-light-intent-presets"),
    lightIntentSummary: document.getElementById("stage-light-intent-summary-text"),
    lightObjective: document.getElementById("stage-light-objective"),
    lightAudienceFocus: document.getElementById("stage-light-audience-focus"),
    lightPerformerIntent: document.getElementById("stage-light-layer-performer-intent"),
    lightPerformerNote: document.getElementById("stage-light-layer-performer-note"),
    lightSpaceIntent: document.getElementById("stage-light-layer-space-intent"),
    lightSpaceNote: document.getElementById("stage-light-layer-space-note"),
    lightBackgroundIntent: document.getElementById("stage-light-layer-background-intent"),
    lightBackgroundNote: document.getElementById("stage-light-layer-background-note"),
    lightTriggerType: document.getElementById("stage-light-trigger-type"),
    lightChange: document.getElementById("stage-light-change"),
    lightTempo: document.getElementById("stage-light-tempo"),
    lightTriggerNote: document.getElementById("stage-light-trigger-note"),
    lightMood: document.getElementById("stage-light-mood"),
    lightReferenceNote: document.getElementById("stage-light-reference-note"),
    lightImplementationNote: document.getElementById("stage-light-implementation-note"),
    lightIntentClear: document.getElementById("stage-light-intent-clear"),
    venueScale: document.getElementById("stage-venue-scale"),
    venueMissing: document.getElementById("stage-venue-missing"),
    venueW: document.getElementById("stage-venue-w"),
    venueD: document.getElementById("stage-venue-d"),
    venueH: document.getElementById("stage-venue-h"),
    venueWLabel: document.getElementById("stage-venue-w-label"),
    venueDimRow: document.getElementById("stage-venue-dims"),
    venueDCell: document.getElementById("stage-venue-d-cell"),
    venueReset: document.getElementById("stage-venue-reset"),
    bgSection: document.getElementById("stage-bg-section"),
    seatList: document.getElementById("stage-seat-list"),
    projectTitle: document.getElementById("stage-project-title"),
    versionLabel: document.getElementById("stage-version-label"),
    versionCopy: document.getElementById("stage-version-copy"),
    versionNote: document.getElementById("stage-version-note"),
    exportJson: document.getElementById("stage-export-json"),
    importJson: document.getElementById("stage-import-json"),
    studyBody: document.getElementById("stage-study-body"),
    sceneList: document.getElementById("stage-scene-list"),
    sceneResize: document.getElementById("stage-scene-resize"),
    sceneGridOpen: document.getElementById("stage-scene-grid-open"),
    sceneFoldAll: document.getElementById("stage-scene-fold-all"),
    sceneGridModal: document.getElementById("stage-scene-grid-modal"),
    sceneGridBackdrop: document.getElementById("stage-scene-grid-backdrop"),
    sceneGridClose: document.getElementById("stage-scene-grid-close"),
    sceneGrid: document.getElementById("stage-scene-grid"),
    sceneGridFront: document.getElementById("stage-scene-grid-front"),
    sceneGridPlan: document.getElementById("stage-scene-grid-plan"),
    sceneGridSize: document.getElementById("stage-scene-grid-size"),
    sceneAdd: document.getElementById("stage-scene-add"),
    sceneDup: document.getElementById("stage-scene-dup"),
    sceneDel: document.getElementById("stage-scene-del"),
    scenePrev: document.getElementById("stage-scene-prev"),
    sceneNext: document.getElementById("stage-scene-next"),
    sceneNow: document.getElementById("stage-scene-now"),
    animScenes: document.getElementById("stage-anim-scenes"),
    animMs: document.getElementById("stage-anim-ms"),
    animMsValue: document.getElementById("stage-anim-ms-value"),
    castList: document.getElementById("stage-cast-list"),
    pieceFacing: document.getElementById("stage-piece-facing"),
    piecePose: document.getElementById("stage-piece-pose"),
    poleControls: document.getElementById("stage-pole-controls"),
    poleLeft: document.getElementById("stage-pole-left"),
    poleRight: document.getElementById("stage-pole-right"),
    poleH: document.getElementById("stage-pole-h"),
    poleHValue: document.getElementById("stage-pole-h-value"),
    trapControls: document.getElementById("stage-trap-controls"),
    diaboloControls: document.getElementById("stage-diabolo-controls"),
    tissueControls: document.getElementById("stage-tissue-controls"),
    tissueH: document.getElementById("stage-tissue-h"),
    tissueHValue: document.getElementById("stage-tissue-h-value"),
    showMapBtn: document.getElementById("stage-show-map-btn"),
    mapModal: document.getElementById("stage-map-modal"),
    mapBackdrop: document.getElementById("stage-map-backdrop"),
    mapClose: document.getElementById("stage-map-close"),
    mapGrid: document.getElementById("stage-map-grid"),
    importModal: document.getElementById("stage-import-modal"),
    importBackdrop: document.getElementById("stage-import-backdrop"),
    importClose: document.getElementById("stage-import-close"),
    importSummary: document.getElementById("stage-import-summary"),
    importAsNew: document.getElementById("stage-import-as-new"),
    importReplace: document.getElementById("stage-import-replace"),
    venueExportModal: document.getElementById("stage-venue-export-modal"),
    venueExportBackdrop: document.getElementById("stage-venue-export-backdrop"),
    venueExportInclude: document.getElementById("stage-venue-export-include"),
    venueExportWithout: document.getElementById("stage-venue-export-without"),
    venueExportCancel: document.getElementById("stage-venue-export-cancel"),
    venueExportStop: document.getElementById("stage-venue-export-stop"),
    printBtn: document.getElementById("stage-print-btn"),
    prefsBtn: document.getElementById("stage-prefs-btn"),
    prefsModal: document.getElementById("stage-prefs-modal"),
    prefsBackdrop: document.getElementById("stage-prefs-backdrop"),
    prefsClose: document.getElementById("stage-prefs-close"),
    prefsList: document.getElementById("stage-prefs-list"),
    presentBtn: document.getElementById("stage-present-btn"),
    presentOverlay: document.getElementById("stage-present-overlay"),
    presentPrev: document.getElementById("stage-present-prev"),
    presentNext: document.getElementById("stage-present-next"),
    presentClose: document.getElementById("stage-present-close"),
    arrangeSelect: document.getElementById("stage-arrange-select"),
    trapSit: document.getElementById("stage-trap-sit"),
    trapHang: document.getElementById("stage-trap-hang"),
    diaboloLay: document.getElementById("stage-diabolo-lay"),
    diaboloStand: document.getElementById("stage-diabolo-stand"),
    poseLabel: document.getElementById("stage-pose-label"),
    poseModal: document.getElementById("stage-pose"),
    poseBackdrop: document.getElementById("stage-pose-backdrop"),
    poseClose: document.getElementById("stage-pose-close"),
    poseGrid: document.getElementById("stage-pose-grid"),
    showsOpen: document.getElementById("stage-shows-open"),
    showNew: document.getElementById("stage-show-new"),
    showsModal: document.getElementById("stage-shows"),
    showsBackdrop: document.getElementById("stage-shows-backdrop"),
    showsClose: document.getElementById("stage-shows-close"),
    showList: document.getElementById("stage-show-list"),
    beatTemplatesOpen: document.getElementById("stage-beat-templates-open"),
    beatTemplatesModal: document.getElementById("stage-beat-templates"),
    beatTemplatesBackdrop: document.getElementById("stage-beat-templates-backdrop"),
    beatTemplatesClose: document.getElementById("stage-beat-templates-close"),
    beatTemplateList: document.getElementById("stage-beat-template-list"),
    facingValue: document.getElementById("stage-facing-value"),
    profile: document.getElementById("stage-profile"),
    profileBackdrop: document.getElementById("stage-profile-backdrop"),
    profileClose: document.getElementById("stage-profile-close"),
    profileName: document.getElementById("stage-profile-name"),
    profileHeight: document.getElementById("stage-profile-height"),
    profileHeightValue: document.getElementById("stage-profile-height-value"),
    profileColor: document.getElementById("stage-profile-color"),
    profileNote: document.getElementById("stage-profile-note"),
    rosterName: document.getElementById("stage-roster-name"),
    rosterKind: document.getElementById("stage-roster-kind"),
    rosterKindLabel: document.getElementById("stage-roster-kind-label"),
    kindModal: document.getElementById("stage-kind"),
    kindBackdrop: document.getElementById("stage-kind-backdrop"),
    kindClose: document.getElementById("stage-kind-close"),
    kindGrid: document.getElementById("stage-kind-grid"),
    rosterAdd: document.getElementById("stage-roster-add"),
    rosterEmpty: document.getElementById("stage-roster-empty"),
    groupCast: document.getElementById("stage-group-cast"),
    groupSets: document.getElementById("stage-group-sets"),
    lightName: document.getElementById("stage-light-name"),
    lightAdd: document.getElementById("stage-light-add"),
    lightKind: document.getElementById("stage-light-kind"),
    lightPresetOpen: document.getElementById("stage-light-preset-open"),
    lightPresetModal: document.getElementById("stage-light-preset-modal"),
    lightPresetBackdrop: document.getElementById("stage-light-preset-backdrop"),
    lightPresetClose: document.getElementById("stage-light-preset-close"),
    lightPresetTiles: document.getElementById("stage-light-preset-tiles"),
    lightPresetIntentNote: document.getElementById("stage-light-preset-intent-note"),
    beamControls: document.getElementById("stage-beam-controls"),
    beamDia: document.getElementById("stage-beam-dia"),
    beamDiaValue: document.getElementById("stage-beam-dia-value"),
    beamGlow: document.getElementById("stage-beam-glow"),
    beamGlowValue: document.getElementById("stage-beam-glow-value"),
    groupControls: document.getElementById("stage-group-controls"),
    groupDia: document.getElementById("stage-group-dia"),
    groupDiaValue: document.getElementById("stage-group-dia-value"),
    groupGlow: document.getElementById("stage-group-glow"),
    groupGlowValue: document.getElementById("stage-group-glow-value"),
    groupSplit: document.getElementById("stage-group-split"),
    beamU: document.getElementById("stage-beam-u"),
    beamUValue: document.getElementById("stage-beam-u-value"),
    beamV: document.getElementById("stage-beam-v"),
    beamVValue: document.getElementById("stage-beam-v-value"),
    beamFrom: document.getElementById("stage-beam-from"),
    beamFromValue: document.getElementById("stage-beam-from-value"),
    beamTo: document.getElementById("stage-beam-to"),
    beamToValue: document.getElementById("stage-beam-to-value"),
    beamReset: document.getElementById("stage-beam-reset"),
    setList: document.getElementById("stage-set-list"),
    lightList: document.getElementById("stage-light-list"),
    rigList: document.getElementById("stage-rig-list"),
    rigName: document.getElementById("stage-rig-name"),
    rigSave: document.getElementById("stage-rig-save"),
    sceneAddRig: document.getElementById("stage-scene-add-rig"),
    sceneSection: document.getElementById("stage-scene-section"),
    setInfo: document.getElementById("stage-setinfo"),
    setInfoBackdrop: document.getElementById("stage-setinfo-backdrop"),
    setInfoClose: document.getElementById("stage-setinfo-close"),
    setInfoTitle: document.getElementById("stage-setinfo-title"),
    setInfoName: document.getElementById("stage-setinfo-name"),
    setInfoDims: document.getElementById("stage-setinfo-dims"),
    setInfoColor: document.getElementById("stage-setinfo-color"),
    setInfoNote: document.getElementById("stage-setinfo-note"),
    setInfoKind: document.getElementById("stage-setinfo-kind"),
    setInfoFlown: document.getElementById("stage-setinfo-flown"),
    setInfoFlownRow: document.getElementById("stage-setinfo-flown-row"),
    setInfoFlownNote: document.getElementById("stage-setinfo-flown-note"),
    setInfoWires: document.getElementById("stage-setinfo-wires"),
    setInfoFramed: document.getElementById("stage-setinfo-framed"),
    setInfoFramedRow: document.getElementById("stage-setinfo-framed-row"),
    setInfoWiresRow: document.getElementById("stage-setinfo-wires-row"),
    liftControls: document.getElementById("stage-lift-controls"),
    pieceLift: document.getElementById("stage-piece-lift"),
    pieceLiftValue: document.getElementById("stage-piece-lift-value"),
    seriControls: document.getElementById("stage-seri-controls"),
    pieceSeri: document.getElementById("stage-piece-seri"),
    pieceSeriValue: document.getElementById("stage-piece-seri-value"),
    seriWarning: document.getElementById("stage-seri-warning"),
    showFlown: document.getElementById("stage-show-flown"),
    frontLights: document.getElementById("stage-front-lights"),
    frontLightIntent: document.getElementById("stage-front-light-intent"),
    planLights: document.getElementById("stage-plan-lights"),
    planRoutesCast: document.getElementById("stage-plan-routes-cast"),
    planRoutesLight: document.getElementById("stage-plan-routes-light"),
    planRoutesSet: document.getElementById("stage-plan-routes-set"),
    setInfoKindRow: document.getElementById("stage-setinfo-lightkind"),
    frontInner: document.getElementById("stage-front-inner"),
    planInner: document.getElementById("stage-plan-inner"),
    showNames: document.getElementById("stage-show-names"),
    showSetNames: document.getElementById("stage-show-set-names"),
    showLightNames: document.getElementById("stage-show-light-names"),
    showSeatMap: document.getElementById("stage-show-seatmap"),
    seatMapToggle: document.getElementById("stage-seatmap-toggle"),
    depthLabelBack: document.getElementById("stage-depth-back"),
    depthLabelFront: document.getElementById("stage-depth-front"),
  };

  const LANG_KEY = "shosai-stage-lang";

  /* ---------- 拡大（二本指） ----------
     絵そのものを拡大する。舞台の作りは変えず、見ている窓だけを動かす。
     描くときは canvas へ一枚の変換をかけ、掴むときはその逆をかける。
     ここを別々に持つと、指の下と駒がずれる。
     覚えておく必要のない一時の状態なので、保存はしない。 */
  const zoomState = {
    front: { z: 1, ox: 0, oy: 0 },
    plan: { z: 1, ox: 0, oy: 0 },
  };
  let sceneGridView = "front";
  const sceneGridThumbs = new Map();
  let sceneGridGeneration = 0;
  let sceneGridFrame = 0;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 5;

  const zoomOf = (view) => zoomState[view === "plan" ? "plan" : "front"];

  // 拡大しても、絵の外側が見えないように寄せ幅を丸める
  function clampZoom(zs) {
    zs.z = clamp(zs.z, ZOOM_MIN, ZOOM_MAX);
    const maxX = W - W / zs.z;
    const maxY = H - H / zs.z;
    zs.ox = clamp(zs.ox, 0, Math.max(0, maxX));
    zs.oy = clamp(zs.oy, 0, Math.max(0, maxY));
  }

  /* ---------- 言語 ----------
     日本語が正本。英語は stage-i18n.js の対訳から引く。
     画面に固定で置いてある文言は、切り替えのときだけ文字を差し替える
     （静的な文言は書き換わらないので、これで足りる）。
     中で組み立てる名前（姿勢・道具・劇場・席）は、作るたびに言語を見て選ぶ。 */
  const I18N = window.SHOSAI_I18N || { text: {}, maps: {} };
  let lang = "ja";
  const isEn = () => lang === "en";
  // 固定文言。日本語そのものを鍵にする
  const tx = (ja) => (isEn() && I18N.text[ja]) || ja;
  // 組み立てる名前。id を鍵にする
  const tm = (group, id, ja) => (isEn() && I18N.maps[group] && I18N.maps[group][id]) || ja;

  /* ★開く言語はここで決める。loadState() より前であること——
   * 初めて開いた人へ出す見本の駒と場面の名前を、その言語で作るため。
   * あとから決めると「Performer A」であるべき駒が「演者A」で焼き付く。 */
  try { lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "ja"; } catch (_) { lang = "ja"; }
  if (openLang) {
    lang = openLang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* 覚えられなくても動く */ }
  }
  // 見本と場面の名前。作った時点の言語で決まり、そのまま持ち物として残る
  const sceneTitle = (n) => (isEn() ? `Scene ${n}` : `シーン ${n}`);
  /* 表記を「場面」から「シーン」へ揃えたので、前に自動で付いた名前も直す。
     手で付けた名前は「場面 3」のような形をしていないので巻き込まない。 */
  const renameAuto = (title) => String(title).replace(/^場面 (\d+)$/, "シーン $1");
  const untitledShow = () => (isEn() ? "Untitled show" : "無題のショー");

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const validColor = (value, fallback) =>
    typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  // 印刷ページなどHTML文字列へ差し込むときの逃がし
  const escapeHtml = (t) => String(t).replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ---------- 環境設定（機能の出し入れ） ----------
     端末ごとの設定。ショーのデータには入れない（共有・書き出しに混ざらない）。
     新しい機能は原則ここに並べ、切れるようにしておく（本人の方針）。 */
  const PREFS_KEY = "shosai-stage-prefs-v1";
  const FEATURES = [
    { key: "presentation", label: "プレゼンモード",
      hint: "上部の「プレゼン」で正面図だけを全画面に。矢印キーでシーン送り、Escで戻る" },
    { key: "presentCaption", label: "プレゼンの説明",
      hint: "全画面のプレゼンで、絵の下にシーン名と説明を出す" },
    { key: "blackout", label: "暗転で始まるシーン",
      hint: "シーンの欄に「暗転」の印が出て、その転換は一度真っ暗になってから明ける" },
    { key: "sceneTiming", label: "シーンの時間", def: false,
      hint: "各シーンに「見せる時間」と「次のシーンへの移動時間」を表示する" },
    { key: "lightIntent", label: "光の意図", def: false,
      hint: "「光で何を起こしたい？」のカードと、図へ重ねる作図の印。OFFでも書いた内容は消えない" },
    { key: "lineup", label: "整列（一列・円・V字）",
      hint: "平面図の「動線を描く」の横に整列のプルダウンが出て、舞台上の演者を並べ直す" },
    { key: "busyness", label: "転換の忙しさ診断", def: false,
      hint: "ショー地図に、転換ごとの移動量・動く人数・出入りの数を出す" },
    { key: "crossing", label: "動線の交差警告", def: false,
      hint: "同時に動く演者の動線がぶつかりそうな所に、平面図で印を出す" },
    { key: "highwarn", label: "高所の下の注意", def: false,
      hint: "ポールやトラピーズの真下に人が居るとき、平面図に印を出す" },
    { key: "bamiri", label: "バミリ図（印刷）",
      hint: "印刷用ページに、演者の立ち位置の実寸表を足す" },
    { key: "cuesheet", label: "明かりのキューシート（印刷）",
      hint: "印刷用ページに、シーンごとの明かりの点き消え表を足す" },
  ];
  const FEATURES_PLANNED = [
    "転換アニメの動画書き出し", "見えない席の検査（遮蔽）", "複数選択と整形", "資料棚からの場面引用",
  ];
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch (_) { prefs = {}; }
  const FEATURE_DEFAULTS = {};
  FEATURES.forEach((f) => { FEATURE_DEFAULTS[f.key] = f.def === undefined ? true : f.def; });
  const featureOn = (key) => (prefs[key] === undefined
    ? (FEATURE_DEFAULTS[key] === undefined ? true : FEATURE_DEFAULTS[key])
    : Boolean(prefs[key]));
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) { /* 保存できなくても動く */ }
  }
  const rehearsalSeconds = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.min(number, 86400) : null;
  };
  const normalizeProjectRehearsal = (raw) => ({
    version: 1,
    primaryMode: raw && raw.primaryMode === "ordered" ? "ordered" : "ordered",
    soundtrack: raw && raw.soundtrack === "bundled-demo" ? "bundled-demo" : null,
  });
  const normalizeSceneRehearsal = (raw) => ({
    holdDurationSeconds: rehearsalSeconds(raw && raw.holdDurationSeconds),
    transitionToNextSeconds: rehearsalSeconds(raw && raw.transitionToNextSeconds),
  });

  let idCounter = 0;
  function nextId() {
    idCounter += 1;
    return `stage-piece-${Date.now().toString(36)}-${idCounter.toString(36)}`;
  }

  const nowIso = () => new Date().toISOString();
  const rid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

  /* 場面の並びは「順番＋字下げ」で持つ。親のidを持たせるより、前後の入れ替えと
   * 入れ子の付け外しが素直に書ける（箇条書きと同じ考え方）。
   * 親は「自分より前にある、自分より浅い最初の行」。
   * kind:"section" は入れ物だけで、絵は持たない。 */
  const MAX_DEPTH = 4;
  const SECTION_COLORS = Object.freeze([
    "#d3ac59", "#a84b26", "#77865f", "#5f7386",
    "#7a5a6e", "#4f7a72", "#b98d5a", "#8a8177",
  ]);

  // 未指定なら変わらないidから決め、指定済みなら並べ替えても本人が選んだ色を保つ。
  function sectionColor(scene) {
    if (scene && scene.color) return scene.color;
    let hash = 2166136261;
    String(scene && scene.id || "").split("").forEach((letter) => {
      hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
    });
    return SECTION_COLORS[hash % SECTION_COLORS.length];
  }

  /* 最初から置いてある見本。★駒だけでなく「出るもの」にも登録する。
     一覧に無いものが舞台に出ていると、「追加したものが一覧に載る」という
     この画面の約束と食い違い、案内の2段目（人を足す）で話が通らなくなる。 */
  const FALLBACK_STARTER = {
    cast: [
      { id: "stage-sample-cast-1", pieceId: "stage-sample-performer-1",
        ja: "演者A", en: "Performer A", color: "#a84b26", u: 0.36, v: 0.62, size: 105 },
      { id: "stage-sample-cast-2", pieceId: "stage-sample-performer-2",
        ja: "演者B", en: "Performer B", color: "#77865f", u: 0.66, v: 0.48, size: 92 },
    ],
    sets: [
      { id: "stage-sample-set-1", pieceId: "stage-sample-block-1", kind: "block",
        ja: "台", en: "Platform", color: "#efe7d6", u: 0.51, v: 0.7, size: 88 },
    ],
  };
  const SAMPLE = (SHOW_LIBRARY && SHOW_LIBRARY.starter) || FALLBACK_STARTER;
  const sampleName = (s) => (isEn() ? s.en : s.ja);
  const sampleCast = () => SAMPLE.cast.map((s) => ({
    id: s.id, name: sampleName(s), color: s.color,
    heightCm: DEFAULT_HEIGHT_CM, note: "", locked: false,
  }));
  const sampleSets = () => SAMPLE.sets.map((s) => ({
    id: s.id, kind: s.kind, name: sampleName(s), color: s.color,
    dims: normalizeDims(s.kind, { size: s.size }), note: "", locked: false,
    flown: false, wires: 2, framed: false, lightKind: "hang",
  }));
  // 並び順は重なりの順でもあるので、演者→装置の順を保つ
  const samplePieces = () => [
    ...SAMPLE.cast.map((s) => ({ id: s.pieceId, type: "performer", castId: s.id,
      u: s.u, v: s.v, size: s.size, color: s.color, name: "" })),
    ...SAMPLE.sets.map((s) => ({ id: s.pieceId, type: s.kind, setId: s.id,
      u: s.u, v: s.v, size: s.size, color: s.color, name: "" })),
  ];

  /* 前の版で作ったスケッチには、見本の駒はあるのに登録が無い。
     開いたときに結び直す。何度通しても同じ結果になる。 */
  function adoptSamples(next) {
    const project = next && next.project;
    if (!project) return next;
    sweepPhotos(project);
    sweepStashes(project);
    const pieces = [];
    (project.scenes || []).forEach((scene) => (scene.pieces || []).forEach((p) => pieces.push(p)));
    SAMPLE.cast.forEach((s) => {
      const hit = pieces.filter((p) => p.id === s.pieceId && !p.castId);
      if (!hit.length) return;
      if (!project.cast.some((c) => c.id === s.id)) project.cast.push(sampleCast().find((c) => c.id === s.id));
      hit.forEach((p) => { p.castId = s.id; p.name = ""; });
    });
    SAMPLE.sets.forEach((s) => {
      const hit = pieces.filter((p) => p.id === s.pieceId && !p.setId);
      if (!hit.length) return;
      if (!project.sets.some((x) => x.id === s.id)) project.sets.push(sampleSets().find((x) => x.id === s.id));
      hit.forEach((p) => { p.setId = s.id; p.name = ""; });
    });
    return next;
  }

  function newScene(title, withExample, kind, depth) {
    const sceneKind = kind === "section" ? "section" : "scene";
    return {
      id: rid(sceneKind === "section" ? "sect" : "scene"),
      kind: sceneKind,
      depth: clamp(finite(depth, 0), 0, MAX_DEPTH),
      color: null,
      title: title || sceneTitle(1),
      note: "",
      background: "#40362d",
      notes: [],
      pieces: withExample ? samplePieces() : [],
      strokes: [],
      arrows: [],
      beat: normalizeSceneBeat(sceneKind, null),
      rehearsal: sceneKind === "scene" ? normalizeSceneRehearsal(null) : null,
      lightingIntent: null,
      facingLock: false,
    };
  }

  function baseState(withExample) {
    const scene = newScene(sceneTitle(1), withExample);
    return {
      version: 3,
      // ショー一つ分。劇場はショー単位で共通に持つ
      project: {
        id: rid("proj"),
        title: untitledShow(),
        versionLabel: "v1",
        parentVersionId: null,
        branchReason: "",
        createdAt: nowIso(),
        venue: "proscenium",
        venueSize: "mid",
        rehearsal: normalizeProjectRehearsal(null),
        // このショーに出る人。場面ごとの在／不在は pieces 側で決まる
        cast: withExample ? sampleCast() : [],
        // このショーで使う台や道具。寸法はここが正本で、置いた分はこれを参照する
        sets: withExample ? sampleSets() : [],
        // 舞台装置の並びを、名前をつけて残したもの。場面をまたいで使い回す
        rigs: [],
        // 背景に貼った写真の置き場（id → データURL）。シーンは id で指す
        photos: {},
        scenes: [scene],
        activeSceneId: scene.id,
      },
      // 画面の状態。プロジェクトの内容ではないので、共有や書き出しには含めない
      showFront: true,
      showPlan: true,
      showNames: true,
      // 名前は演者・舞台装置・照明で別々に出し入れする
      showSetNames: true,
      showLightNames: true,
      // 正面図の隅に「客席のどこから見ているか」の小図を出すか
      showSeatMap: true,
      // 平面図で吊物（宙に吊ってあるもの）まで出すか
      showFlown: false,
      /* 照明と動線の出し入れ。図ごとに別。
         「照明を消して立ち位置だけ読む」「動線を隠して今の形だけ見る」ため */
      showLightsFront: true,
      // 光の意図の重ね。作図注記なので保存も書き出しもしない
      showLightIntent: false,
      showLightsPlan: true,
      // 動線の出し入れは演者・照明・装置で別（本人指定）
      showRoutesCast: true,
      showRoutesLight: true,
      showRoutesSet: true,
      // 場面が変わるとき、動線に沿って動かして見せるか。秒数も持つ
      animateScenes: true,
      sceneAnimMs: 2000,
      // 舞台が一度に入らない席での見回し（-1〜1）。左右と上下
      frontPan: 0,
      frontPanY: 0,
      // 畳んだセクション（idごと）。場面の入れ子を折りたたむのに使う
      closedSections: {},
      // 並べ替えや追加の起点になる行。セクションも起点になれる
      cursorRowId: null,
      // 場面の欄の高さ(px)。引いて変えたら覚えておく
      sceneListHeight: 320,
      seat: "center",
      // パネルの置き場所と開閉。中央は絵の順序だけを持つ
      layout: defaultLayout(),
      // 名簿にも舞台セットにも属さない駒を置いたときの色
      pieceColor: "#a84b26",
      paintColor: "#efe7d6",
      brushSize: 42,
      /* ファイル書き出しの記録。ブラウザの保存は設定や容量で消え得るので、
         「最後にファイルへ残したのはいつか」を正直に見せるための持ち物 */
      lastExportAt: "",
      editsSinceExport: 0,
    };
  }

  /* ---------- パネルの配置 ----------
     どの道具をどちら側へ置くかは人によって違う。列を移せるようにし、
     使わないものは畳めるようにする。中央は絵だけで、上下の入れ替えのみ。 */
  /* 演者・舞台セット・光は「出るもの」一枚にまとめた（cast）。
   * 登録・出し入れ・寸法の仕組みが同じものを三つに割ると、目が三度行き来する。 */
  const PANELS = ["project", "cast", "rigs", "light", "background", "study", "scenes", "inspector", "save", "ask"];

  function defaultLayout() {
    return {
      // 場面は絵のすぐ右に置く（順番を見ながら描くため）
      cols: {
        project: "left", cast: "left", rigs: "left", light: "left", background: "left",
        study: "right", scenes: "right", inspector: "right", save: "right", ask: "right",
      },
      order: {
        project: 0, cast: 1, rigs: 2, light: 3, background: 4,
        study: -1, scenes: 0, inspector: 1, save: 2, ask: 3,
      },
      collapsed: {},
      centerOrder: ["front", "plan"],
    };
  }

  function normalizeLayout(raw) {
    const base = defaultLayout();
    if (!raw || typeof raw !== "object") return base;
    const cols = {};
    const order = {};
    const collapsed = {};
    PANELS.forEach((id) => {
      const c = raw.cols && raw.cols[id];
      cols[id] = c === "left" || c === "right" ? c : base.cols[id];
      const o = raw.order && Number(raw.order[id]);
      order[id] = Number.isFinite(o) ? o : base.order[id];
      collapsed[id] = Boolean(raw.collapsed && raw.collapsed[id]);
    });
    const co = Array.isArray(raw.centerOrder) ? raw.centerOrder.filter((x) => x === "front" || x === "plan") : [];
    const centerOrder = co.length === 2 ? co : base.centerOrder;
    return { cols, order, collapsed, centerOrder };
  }

  // 向きを言葉にする。角度そのものより、どちらを向いているかが読みたい
  function facingLabel(deg) {
    const d = ((Number(deg) || 0) % 360 + 360) % 360;
    const ja = ["客席", "客席・上手寄り", "上手", "奥・上手寄り", "奥（背中）", "奥・下手寄り", "下手", "客席・下手寄り"];
    const en = ["house", "house / stage left", "stage left", "upstage / stage left",
      "upstage (back)", "upstage / stage right", "stage right", "house / stage right"];
    const words = isEn() ? en : ja;
    if (d < 23 || d >= 338) return words[0];
    if (d < 68) return words[1];
    if (d < 113) return words[2];
    if (d < 158) return words[3];
    if (d < 203) return words[4];
    if (d < 248) return words[5];
    if (d < 293) return words[6];
    return words[7];
  }


  // その演者の身長（m）。名簿に登録があればそれを使う。
  // 身長は演者の持ちもので、同じ舞台でも人によって見え方が変わる。
  function pieceHeightM(piece) {
    if (piece.type !== "performer") return PIECE_METERS[piece.type];
    const member = piece.castId ? state.project.cast.find((c) => c.id === piece.castId) : null;
    const cm = member && Number(member.heightCm) ? Number(member.heightCm) : DEFAULT_HEIGHT_CM;
    return cm / 100;
  }

  // 舞台に出す名前。登録した演者なら名簿から引き、そうでなければ個別の名前
  // 頭上に出す名前。名簿・舞台セットに登録したものは、そちらの名前を引く
  function pieceLabel(piece) {
    if (piece.castId) {
      const member = state.project.cast.find((c) => c.id === piece.castId);
      if (member) return member.name;
    }
    const registered = pieceSet(piece);
    if (registered) return registered.name;
    return piece.name || "";
  }

  // いま開いている場面
  function sc() {
    const p = state.project;
    return p.scenes.find((x) => x.id === p.activeSceneId) || p.scenes[0];
  }

  // v1（画面ピクセル座標）で保存されたものを、正規化座標へ引き上げる
  const V1 = { floorY: 510, backdrop: { x: 70, y: 48, w: 1140, h: 462 } };

  function migratePiece(piece) {
    const x = finite(piece.x, W / 2);
    const y = finite(piece.y, 590);
    return {
      u: clamp((x - 88) / (W - 176), 0, 1),
      v: clamp((y - (V1.floorY + 24)) / (H - 35 - (V1.floorY + 24)), 0, 1),
    };
  }

  const BEAM_DEFAULT_H = 6;      // 灯体の高さ(m)。中劇場のバトンのおよその高さ
  const BEAM_MAX_H = 18;

  function normalizeBeam(raw, piece) {
    const baseU = clamp(finite(piece && piece.u, 0.5), 0, 1);
    const baseV = clamp(finite(piece && piece.v, 0.6), 0, 1);
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      // 灯体の平面位置。既定は落とす場所の真上（＝直下型）
      u: clamp(finite(src.u, baseU), -0.3, 1.3),
      v: clamp(finite(src.v, baseV), -0.3, 1.3),
      h: clamp(finite(src.h, BEAM_DEFAULT_H), 0, BEAM_MAX_H),
      // 当たる高さ。0で床。下から上への明かりは、ここを上げて灯体を下げる
      toH: clamp(finite(src.toH, 0), 0, BEAM_MAX_H),
    };
  }

  const VENUE_LIMITS = { width: [3, 60], depth: [3, 60], height: [2, 40] };

  function normalizeVenueDims(raw, size) {
    if (!raw || typeof raw !== "object") return null;
    const out = {};
    Object.keys(VENUE_LIMITS).forEach((key) => {
      if (raw[key] === undefined || raw[key] === null) return;
      const lim = VENUE_LIMITS[key];
      const value = clamp(finite(raw[key], size[key] || lim[0]), lim[0], lim[1]);
      out[key] = Math.round(value * 10) / 10;
    });
    return Object.keys(out).length ? out : null;
  }

  function normalizePiece(piece, index) {
    // 「円形の物」は輪なのか円盤なのか読めなかったので球に置き換えた。古い保存を読み替える
    const raw = piece && piece.type === "ring" ? "sphere" : piece && piece.type;
    const type = PIECE_TYPES[raw] ? raw : "performer";
    const legacy = piece && piece.u === undefined && piece.x !== undefined ? migratePiece(piece) : null;
    const normalized = {
      id: typeof piece.id === "string" ? piece.id : `stage-restored-${index}`,
      type,
      // 袖に置けるので、枠の外も少しだけ許す（実際の枠は fromScreen が締める）
      u: clamp(finite(legacy ? legacy.u : piece.u, 0.5), -0.5, 1.5),
      v: clamp(finite(legacy ? legacy.v : piece.v, 0.6), -0.5, 1),
      size: clamp(finite(piece.size, 100), 55, 180),
      color: validColor(piece.color, "#a84b26"),
      name: typeof piece.name === "string" ? piece.name.slice(0, 24) : "",
      castId: typeof piece.castId === "string" ? piece.castId : null,
      setId: typeof piece.setId === "string" ? piece.setId : null,
      /* 写したもとの駒の札。場面を写すと札は配り直されるので、
       * 登録の無い駒（最初から置いてある例など）は、これが無いと
       * 前の場面の自分と結び付けられない（転換で動かせない）。 */
      originId: typeof piece.originId === "string" ? piece.originId : null,
      // 体の向き（度）。0=客席を向く、90=上手を向く、180=背中
      facing: clamp(finite(piece.facing, 0), 0, 359),
      dims: normalizeDims(type, piece),
      // ポールに付いたときの持ち場（左右と握りの高さ）。付いていない間も持ち歩く
      poleSide: piece.poleSide === "L" ? "L" : "R",
      poleH: clamp(finite(piece.poleH, 2.5), 0.8, 9),
      // 布のどの高さを掴むか（床から・m）。掴んでいない間も持ち歩く
      tissueH: clamp(finite(piece.tissueH, 4), 0, 10),
      // トラピーズの乗り方（座る／ぶら下がる）。降りている間も持ち歩く
      trapMode: piece.trapMode === "hang" ? "hang" : "sit",
      // ディアボロの置き方。古い保存や未指定は、舞台で形が読みやすい横置きに揃える
      diaboloMode: piece.diaboloMode === "stand" ? "stand" : "lay",
      // 姿勢。用意したものの中から選ぶ（形そのものは編集させない）
      pose: POSES.some((p) => p.id === piece.pose) ? piece.pose : "stand",
      /* 動線。この場面のあいだに、その駒がどこへ動くか。
       * 始点は駒そのものなので持たない（駒を動かせば矢印もついてくる）。
       * u,v が行き先、bu,bv が曲がり具合の control 点。真ん中に置けば直線になる。 */
      route: normalizeRoute(piece && piece.route),
      // 床からの高さ(m)と、支えている駒。どちらも置き場所から毎回引き直す派生値
      base: clamp(finite(piece.base, 0), 0, 40),
      supportId: null,
      /* 明かりの当て方。どこから出て、どこへ落ちるか。
       * 落ちる場所は駒そのもの（u,v）。ここには灯体の側だけを持つ。
       * 真上から落とす明かりが既定だが、斜めも、下から上へも同じ形で書ける。 */
      beam: normalizeBeam(piece && piece.beam, piece),
      /* 光の強さ（1=標準）。シーンごとの駒に持つので、場面で明暗を変えられる */
      glow: clamp(finite(piece.glow, 1), 0.1, 1.5),
      /* 錠。掛けているあいだは掴んでも動かない。
       * 登録のあるもの（演者・セット・光）は登録側で持つので、ここは
       * 登録を持たない駒（最初から置いてある例など）のための控え。 */
      locked: Boolean(piece && piece.locked),
    };
    // せりの高さは登録寸法ではなく、シーンごとの上がり具合として持つ
    if (type === "seri") normalized.seriH = clamp(finite(piece.seriH, 0), 0, 4);
    return normalized;
  }

  // 台と球の実寸。dims を持たない古い保存は、size（倍率）から見た目が
  // 変わらないように割り戻す。それ以外の種類は寸法を持たない。
  /* 付箋。舞台の絵の上へ貼る覚え書き。
   * 貼る場所はその絵の上の一点で、掴んで動かす。
   * pieceId は前の版で駒に紐づけて貼れたときの名残。いま作るものは持たないが、
   * すでに貼ってあるものは駒についてまわる（勝手に置き場所を変えない）。
   * 場所は 1280×720 の絵の中の画素で持つ（絵の大きさは変わらないので素直）。 */
  function normalizeNote(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = typeof raw.text === "string" ? raw.text.slice(0, 200) : "";
    return {
      id: typeof raw.id === "string" ? raw.id : rid("note"),
      view: raw.view === "plan" ? "plan" : "front",
      x: clamp(finite(raw.x, 100), -200, 1480),
      y: clamp(finite(raw.y, 100), -200, 920),
      pieceId: typeof raw.pieceId === "string" ? raw.pieceId : null,
      text,
    };
  }

  function normalizeRoute(raw) {
    if (!raw || typeof raw !== "object") return null;
    const u = clamp(finite(raw.u, 0.5), -0.5, 1.5);   // 行き先は袖でもよい
    const v = clamp(finite(raw.v, 0.5), -0.5, 1);
    return {
      u, v,
      bu: clamp(finite(raw.bu, 0.5), -0.2, 1.2),
      bv: clamp(finite(raw.bv, 0.5), -0.2, 1.2),
    };
  }

  function normalizeDims(type, piece) {
    const base = PIECE_DIMS[type];
    if (!base) return null;
    const fixed = type === "wall" ? { d: WALL_THICKNESS } : null;
    const old = piece && piece.dims ? piece.dims : null;
    const k = clamp(finite(piece && piece.size, 100), 55, 180) / 100;
    const out = {};
    Object.keys(base).forEach((key) => {
      const meta = dimMeta(type, key);
      const fallback = key === "lift" ? base[key] : base[key] * k;
      out[key] = clamp(finite(old ? old[key] : fallback, base[key]), meta.min, meta.max);
    });
    if (fixed) Object.assign(out, fixed);
    return out;
  }

  /* ディアボロは一般的な家具より小さい。共通下限を下げると既存道具の
   * つまみの範囲まで変わるため、この種類だけ実寸を保持できる下限にする。 */
  function dimMeta(kind, key) {
    const meta = DIM_META[key];
    return kind === "diabolo" ? Object.assign({}, meta, { min: 0.05, max: 0.5 }) : meta;
  }

  // 寸法の正本。舞台セットに登録したものは、そちらを引く。
  // 登録側を直せば、置いてある全ての場面の見え方が同時に変わる。
  /* 寸法つまみを組み立てる。項目は種類ごとに違うので、HTMLへ固定で並べず
   * ここから作る。dims オブジェクトへ直に書き込むので、
   * 「駒そのもの」でも「舞台セットの正本」でも同じ関数で使える。 */
  function buildDimControls(host, prefix, kind, dims, onChange, flown) {
    if (!host) return;
    host.innerHTML = "";
    if (!dims) return;
    Object.keys(dims).forEach((key) => {
      const meta = dimMeta(kind, key);
      if (!meta) return;
      // 壁の厚みは固定。触らせないので、つまみも出さない
      if (kind === "wall" && key === "d") return;
      // 地上高は、吊っているものと浮いている球にだけ意味がある
      if (key === "lift" && SOLID_TYPES[kind] && !flown) return;
      const label = document.createElement("label");
      label.className = "stage-control-label stage-range-label";
      label.htmlFor = `${prefix}-${key}`;
      const name = document.createElement("span");
      name.textContent = dimLabel(kind, key);
      const value = document.createElement("span");
      value.textContent = cmText(dims[key]);
      label.append(name, value);

      const input = document.createElement("input");
      input.type = "range";
      input.id = `${prefix}-${key}`;
      input.min = String(meta.min);
      input.max = String(meta.max);
      input.step = String(meta.step);
      input.value = String(dims[key]);
      input.addEventListener("input", () => {
        dims[key] = clamp(Number(input.value), meta.min, meta.max);
        value.textContent = cmText(dims[key]);
        onChange();
      });
      host.append(label, input);
    });
  }

  function pieceDims(piece) {
    const registered = pieceSet(piece);
    if (registered) return registered.dims;
    return (piece && piece.dims) || PIECE_DIMS[piece && piece.type] || null;
  }

  function pieceSet(piece) {
    if (!piece || !piece.setId || !state.project) return null;
    return (state.project.sets || []).find((t) => t.id === piece.setId) || null;
  }

  // その奥行きでの「実寸1mあたりの画素」。横と縦で尺が違う（正面図のみ）
  function perMetre(pos, L) {
    if (L.plan) return { x: L.pxPerM, y: L.pxPerM };
    return { x: L.pxPerM * pos.scale, y: L.pxPerMv * pos.scale * (pos.stretch || 1) };
  }

  /* 背景スクリーンの文字。舞台の奥のスクリーンへ映す字（技名・擬音・字幕・タイトル）。
     位置は背景の壁の中の割合(0..1)で持つので、劇場の大きさや席を変えても同じ所に出る。
     大きさは壁の高さに対する割合。縦書きは字を一つずつ下へ積む。 */
  const SCREEN_FONTS = {
    brush: { label: "筆書き", css: '"Hiragino Mincho ProN", "Yu Mincho", serif', weight: "700" },
    gothic: { label: "太ゴシック", css: '"Hiragino Sans", "Yu Gothic", sans-serif', weight: "800" },
    mincho: { label: "明朝", css: '"Hiragino Mincho ProN", "Yu Mincho", serif', weight: "400" },
  };
  function normalizeScreenText(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = typeof raw.text === "string" ? raw.text.slice(0, 60) : "";
    if (!text) return null;
    return {
      id: typeof raw.id === "string" ? raw.id : rid("sctext"),
      text,
      u: clamp(finite(raw.u, 0.5), 0, 1),          // 壁の中の割合
      v: clamp(finite(raw.v, 0.4), 0, 1),
      size: clamp(finite(raw.size, 0.18), 0.03, 0.9),   // 壁の高さに対する割合
      color: validColor(raw.color, "#efe7d6"),
      font: SCREEN_FONTS[raw.font] ? raw.font : "brush",
      vertical: Boolean(raw.vertical),
      opacity: clamp(finite(raw.opacity, 1), 0.1, 1),
      angle: clamp(finite(raw.angle, 0), -45, 45),
    };
  }

  function normalizeStroke(stroke) {
    const legacy = stroke && Array.isArray(stroke.points) && stroke.points.length
      && stroke.points[0] && stroke.points[0].u === undefined;
    const points = Array.isArray(stroke && stroke.points)
      ? stroke.points
          .map((p) => {
            if (!legacy) return { u: finite(p.u, 0.5), v: finite(p.v, 0.5) };
            return {
              u: (finite(p.x, 0) - V1.backdrop.x) / V1.backdrop.w,
              v: (finite(p.y, 0) - V1.backdrop.y) / V1.backdrop.h,
            };
          })
          .filter((p) => Number.isFinite(p.u) && Number.isFinite(p.v))
          .slice(-1800)
          .map((p) => ({ u: clamp(p.u, 0, 1), v: clamp(p.v, 0, 1) }))
      : [];
    return {
      color: validColor(stroke && stroke.color, "#efe7d6"),
      width: clamp(finite(stroke && stroke.width, 42), 12, 120),
      erase: Boolean(stroke && stroke.erase),
      points,
    };
  }

  /* 自由描画の矢印は背景の塗りと混ぜない。床では左右・奥行き、空中では
   * 左右・高さを持つため、同じ点でも面に応じて b の上限が変わる。 */
  function normalizeArrow(raw) {
    const plane = raw && raw.plane === "air" ? "air" : "floor";
    const points = Array.isArray(raw && raw.points)
      ? raw.points.slice(-400).map((point) => ({
          a: clamp(finite(point && point.a, 0.5), 0, 1),
          b: clamp(finite(point && point.b, plane === "air" ? 1 : 0.5), 0,
            plane === "air" ? 12 : 1),
        }))
      : [];
    return {
      id: raw && typeof raw.id === "string" ? raw.id : rid("arrow"),
      plane,
      depth: clamp(finite(raw && raw.depth, 0.5), 0, 1),
      points,
      heads: raw && raw.heads === "both" ? "both" : "one",
      color: validColor(raw && raw.color, "#d3ac59"),
      width: clamp(finite(raw && raw.width, 3), 1, 8),
    };
  }

  function normalizeScene(raw, index) {
    const fallbackBg = "#40362d";
    const kind = raw.kind === "section" ? "section" : "scene";
    return {
      id: typeof raw.id === "string" ? raw.id : rid("scene"),
      kind,
      depth: clamp(finite(raw.depth, 0), 0, MAX_DEPTH),
      color: kind === "section" ? validColor(raw.color, "") || null : null,
      title: typeof raw.title === "string" && raw.title.trim() ? renameAuto(raw.title) : sceneTitle(index + 1),
      studyBeatId: typeof raw.studyBeatId === "string" ? raw.studyBeatId : null,
      note: typeof raw.note === "string" ? raw.note : "",
      background: validColor(raw.background, fallbackBg),
      pieces: Array.isArray(raw.pieces) ? raw.pieces.slice(-80).map(normalizePiece) : [],
      notes: Array.isArray(raw.notes) ? raw.notes.slice(0, 60).map(normalizeNote).filter(Boolean) : [],
      strokes: Array.isArray(raw.strokes)
        ? raw.strokes.slice(-240).map(normalizeStroke).filter((stroke) => stroke.points.length)
        : [],
      arrows: Array.isArray(raw.arrows)
        ? raw.arrows.slice(-60).map(normalizeArrow).filter((arrow) => arrow.points.length >= 2)
        : [],
      photo: normalizePhoto(raw.photo),
      // 背景スクリーンへ映す文字（技名・擬音・字幕）
      screenTexts: Array.isArray(raw.screenTexts)
        ? raw.screenTexts.slice(0, 12).map(normalizeScreenText).filter(Boolean) : [],
      beat: normalizeSceneBeat(kind, raw.beat),
      rehearsal: kind === "scene" ? normalizeSceneRehearsal(raw.rehearsal) : null,
      lightingIntent: normalizeLightingIntent(kind, raw.lightingIntent),
      // 誤ってホイールへ触れても向きが変わらないよう、シーンごとに持つ
      facingLock: kind === "scene" ? Boolean(raw.facingLock) : false,
      // 暗転で始まるシーン（転換が一度真っ暗になってから明ける）
      blackout: kind === "scene" ? Boolean(raw.blackout) : false,
      /* 舞台から下げたものの置き場所の控え（setId ごとに一つ）。
       * 「舞台上／舞台裏」を往復しても、既定位置へ飛ばずに元の場所へ戻すために持つ。 */
      stashed: normalizeStash(raw.stashed),
    };
  }

  /* 控えるのは「登録から引き直せないものだけ」。
   * 寸法・色・種類は舞台セットの登録側が持っていて、出し直すときにそちらを見る。
   * 床からの高さ（base）と支えている駒（supportId）は置き場所から毎回引き直す。
   * 丸ごと控えると、シーンの数だけ同じ値の写しが保存に溜まる。 */
  const STASH_KEYS = ["type", "u", "v", "size", "facing", "pose",
    "poleSide", "poleH", "tissueH", "trapMode", "diaboloMode", "seriH", "glow", "beam", "route", "locked", "name"];

  function normalizeStash(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    Object.keys(raw).slice(0, 120).forEach((setId) => {
      const piece = raw[setId];
      if (!piece || typeof piece !== "object") return;
      /* 一度きちんとした駒として通してから、控える分だけを抜き直す。
         前の版が丸ごと控えていた保存も、ここで同じ形に揃う。 */
      const full = normalizePiece(piece, 0);
      const kept = {};
      STASH_KEYS.forEach((key) => { if (full[key] !== undefined) kept[key] = full[key]; });
      out[setId] = kept;
    });
    return out;
  }

  /* 背景に貼る写真。シーンが持つのは「どの写真か」と明るさだけで、
   * 画そのものは project.photos に一枚だけ置く。
   * ★シーンごとに実体を持たせると、同じ写真を使う20シーンで20枚分の
   *   容量を食い、端末の保存枠（5MB前後）をこれだけで使い切る。 */
  function normalizePhoto(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = typeof raw.id === "string" && raw.id ? raw.id : "";
    if (!id) return null;
    return { id, bright: clamp(finite(raw.bright, 100), 20, 180) };
  }

  const PHOTO_MAX_BYTES = 1.6 * 1024 * 1024;   // 1枚あたりの上限
  function normalizePhotoStore(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    Object.keys(raw).slice(0, 12).forEach((id) => {
      const src = raw[id];
      if (typeof src === "string" && src.startsWith("data:image/") && src.length <= PHOTO_MAX_BYTES) {
        out[id] = src;
      }
    });
    return out;
  }

  /* 登録の無くなった装置の「置き場所の控え」を捨てる。
   * 控えは舞台裏へ下げたときに残るので、そのあと登録ごと外されたり、
   * 別のショーのJSONを読み込んだりすると、行き場のない控えだけが残る。
   * 消しても失うのは「もう出せないものの、昔の置き場所」だけ。 */
  function sweepStashes(project) {
    if (!project) return;
    // 控えの鍵は、舞台セットの登録id か 名簿の演者id
    const live = new Set([
      ...(project.sets || []).map((t) => t.id),
      ...(project.cast || []).map((c) => c.id),
    ]);
    (project.scenes || []).forEach((scene) => {
      if (!scene.stashed) return;
      Object.keys(scene.stashed).forEach((key) => {
        if (!live.has(key)) delete scene.stashed[key];
      });
    });
  }

  // どのシーンからも指されなくなった写真は捨てる（外したぶんが残り続けないように）
  function sweepPhotos(project) {
    if (!project || !project.photos) return;
    const used = new Set();
    (project.scenes || []).forEach((scene) => {
      if (scene.photo && scene.photo.id) used.add(scene.photo.id);
    });
    Object.keys(project.photos).forEach((id) => {
      if (!used.has(id)) delete project.photos[id];
    });
    (project.scenes || []).forEach((scene) => {
      if (scene.photo && !project.photos[scene.photo.id]) scene.photo = null;
    });
  }

  /* 区切りとして置かれたセクションを、一度だけ入れ物へ引き上げる。
   * 以前は「セクション行の下に、同じ深さの場面を並べる」ことで幕を表せた。
   * だが畳む・色バー・合計時間はどれも「中身を持っている」ことが前提なので、
   * 中身が空のまま下に同じ深さの場面が続くセクションは、その並びを抱える形へ直す。
   * ★すでに中身のあるセクションには触らない。直したら印（sectionsNested）を残し、
   *   以後は本人が組んだ形をそのままにする（毎回の読み込みで作り替えない）。 */
  function nestLooseSections(scenes) {
    scenes.forEach((section, i) => {
      if (section.kind !== "section") return;
      const next = scenes[i + 1];
      if (!next || next.depth > section.depth) return;   // 既に中身がある／後ろが無い
      if (section.depth + 1 > MAX_DEPTH) return;
      for (let j = i + 1; j < scenes.length; j += 1) {
        // 次の区切り（セクション）か、より浅い行に当たったら、そこまでが中身
        if (scenes[j].kind !== "scene" || scenes[j].depth !== section.depth) break;
        scenes[j].depth += 1;
      }
    });
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return baseState(true);
    const fallback = baseState(false);

    // v2以前は「1枚のスケッチ」だった。1場面のプロジェクトとして引き上げる
    const legacyFlat = !raw.project && (Array.isArray(raw.pieces) || raw.version === 2 || raw.version === 1);
    const rawProject = legacyFlat
      ? {
          title: untitledShow(),
          venue: raw.venue, venueSize: raw.venueSize,
          scenes: [{ title: sceneTitle(1), background: raw.background, pieces: raw.pieces, strokes: raw.strokes }],
        }
      : (raw.project && typeof raw.project === "object" ? raw.project : fallback.project);

    const venue = VENUES.byId(typeof rawProject.venue === "string" ? rawProject.venue : fallback.project.venue);
    const size = VENUES.sizeById(venue, typeof rawProject.venueSize === "string" ? rawProject.venueSize : "");
    let scenes = Array.isArray(rawProject.scenes) ? rawProject.scenes.slice(0, 60).map(normalizeScene) : [];
    if (!scenes.length) scenes = [newScene(sceneTitle(1), false)];
    // 字下げは「前の行より2段以上深い」ことがないように詰める
    let prevDepth = -1;
    scenes.forEach((scene) => {
      scene.depth = Math.min(scene.depth, prevDepth + 1);
      prevDepth = scene.depth;
    });
    if (!rawProject.sectionsNested) nestLooseSections(scenes);
    if (!scenes.some((x) => x.kind === "scene")) scenes.push(newScene(sceneTitle(1), false));
    const wanted = scenes.find((x) => x.id === rawProject.activeSceneId && x.kind === "scene");
    const activeId = wanted ? wanted.id : scenes.find((x) => x.kind === "scene").id;

    return adoptSamples({
      version: 3,
      project: {
        id: typeof rawProject.id === "string" ? rawProject.id : rid("proj"),
        title: typeof rawProject.title === "string" && rawProject.title.trim() ? rawProject.title : untitledShow(),
        versionLabel: typeof rawProject.versionLabel === "string" && rawProject.versionLabel.trim()
          ? rawProject.versionLabel : "v1",
        parentVersionId: typeof rawProject.parentVersionId === "string" ? rawProject.parentVersionId : null,
        // 区切り型セクションの引き上げ済みの印。付いていれば以後は組んだ形をそのままにする
        sectionsNested: true,
        branchReason: typeof rawProject.branchReason === "string" ? rawProject.branchReason : "",
        createdAt: typeof rawProject.createdAt === "string" ? rawProject.createdAt : nowIso(),
        sceneStudyId: typeof rawProject.sceneStudyId === "string" ? rawProject.sceneStudyId : null,
        sceneStudySourceVersion: typeof rawProject.sceneStudySourceVersion === "string"
          ? rawProject.sceneStudySourceVersion : null,
        venue: venue.id,
        venueSize: size.id,
        rehearsal: normalizeProjectRehearsal(rawProject.rehearsal),
        /* 規模の実寸。選んだ規模の値を土台に、ここで上書きした分だけ差し替える。
         * 実際の劇場は「中劇場」で括れない（間口12.4m・高さ7.2mのような値になる）。 */
        venueDims: normalizeVenueDims(rawProject.venueDims, size),
        cast: Array.isArray(rawProject.cast)
          ? rawProject.cast.slice(0, 60).map((c, i) => ({
              id: typeof c.id === "string" ? c.id : rid("cast"),
              name: typeof c.name === "string" && c.name.trim() ? c.name.slice(0, 24) : `演者 ${i + 1}`,
              color: validColor(c.color, "#a84b26"),
              heightCm: clamp(finite(c.heightCm, DEFAULT_HEIGHT_CM), 120, 210),
              note: typeof c.note === "string" ? c.note.slice(0, 200) : "",
              locked: Boolean(c.locked),
            }))
          : [],
        sets: Array.isArray(rawProject.sets)
          ? rawProject.sets.slice(0, 60).map((t, i) => {
              const kind = SET_KINDS[t && t.kind] ? t.kind : (t && t.kind === "ring" ? "sphere" : "block");
              return {
                id: typeof t.id === "string" ? t.id : rid("set"),
                kind,
                name: typeof t.name === "string" && t.name.trim() ? t.name.slice(0, 24) : `セット ${i + 1}`,
                color: validColor(t.color, "#8b98a1"),
                dims: (() => {
                  const d = normalizeDims(kind, t);
                  // 吊物にできる形は、地上高の置き場を必ず持つ
                  if (d && SOLID_TYPES[kind] && d.lift === undefined) {
                    d.lift = clamp(finite(t && t.dims && t.dims.lift, 0), 0, 10);
                  }
                  return d;
                })(),
                note: typeof t.note === "string" ? t.note.slice(0, 200) : "",
                locked: Boolean(t.locked),
                /* 吊物。天井からワイヤーで吊り下がっているもの。
                 * 何かの上に乗ることも、何かを乗せることもない。
                 * 代わりに地上高（dims.lift）で高さを決める。 */
                flown: Boolean(t.flown),
                // 吊りのワイヤーの本数。1本なら中央から、2本なら両端から
                wires: t && Number(t.wires) === 1 ? 1 : 2,
                // 壁を枠にする（穴の空いた壁＝フレーム）
                framed: Boolean(t.framed),
                lightKind: kind === "light" && LIGHT_KINDS[t && t.lightKind] ? t.lightKind : "hang",
                /* 照明プリセットの組。同じ lightGroup を持つ明かりは一体で扱う。
                   presetDia は組んだときの直径（倍率スライダーの基準）、
                   preset は組んだときの置き場（組をONに戻すときの復元用）。 */
                lightGroup: kind === "light" && typeof t.lightGroup === "string" ? t.lightGroup : null,
                groupLabel: typeof t.groupLabel === "string" ? t.groupLabel.slice(0, 24) : "",
                presetDia: t.presetDia === undefined ? undefined : clamp(finite(t.presetDia, 4), 0.3, 20),
                preset: (t.preset && typeof t.preset === "object")
                  ? { u: clamp(finite(t.preset.u, 0.5), -0.5, 1.5),
                    v: clamp(finite(t.preset.v, 0.5), -0.5, 1),
                    beam: normalizeBeam(t.preset.beam, t.preset) }
                  : undefined,
              };
            })
          : [],
        rigs: Array.isArray(rawProject.rigs)
          ? rawProject.rigs.slice(0, 40).map((r, i) => ({
              id: typeof r.id === "string" ? r.id : rid("rig"),
              name: typeof r.name === "string" && r.name.trim() ? r.name.slice(0, 24) : `セット登録 ${i + 1}`,
              pieces: Array.isArray(r.pieces)
                ? r.pieces.slice(0, 120).map((piece, k) => normalizePiece(piece, k))
                : [],
            }))
          : [],
        scenes,
        photos: normalizePhotoStore(rawProject.photos),
        activeSceneId: activeId,
      },
      showFront: raw.showFront === undefined ? true : Boolean(raw.showFront),
      showPlan: raw.showPlan === undefined ? true : Boolean(raw.showPlan),
      showNames: raw.showNames === undefined ? true : Boolean(raw.showNames),
      showSetNames: raw.showSetNames === undefined ? true : Boolean(raw.showSetNames),
      showLightNames: raw.showLightNames === undefined ? true : Boolean(raw.showLightNames),
      showSeatMap: raw.showSeatMap === undefined ? true : Boolean(raw.showSeatMap),
      showFlown: Boolean(raw.showFlown),
      showLightsFront: raw.showLightsFront === undefined ? true : Boolean(raw.showLightsFront),
      showLightsPlan: raw.showLightsPlan === undefined ? true : Boolean(raw.showLightsPlan),
      showLightIntent: Boolean(raw.showLightIntent),
      showRoutesCast: raw.showRoutesCast === undefined
        ? (raw.showRoutes === undefined ? true : Boolean(raw.showRoutes)) : Boolean(raw.showRoutesCast),
      showRoutesLight: raw.showRoutesLight === undefined
        ? (raw.showRoutes === undefined ? true : Boolean(raw.showRoutes)) : Boolean(raw.showRoutesLight),
      showRoutesSet: raw.showRoutesSet === undefined
        ? (raw.showRoutes === undefined ? true : Boolean(raw.showRoutes)) : Boolean(raw.showRoutesSet),
      animateScenes: raw.animateScenes === undefined ? true : Boolean(raw.animateScenes),
      /* 既定は2秒（本人指定）。以前の既定620msのまま保存されたショーは、
         触っていない印なので新しい既定へ引き上げる */
      sceneAnimMs: finite(raw.sceneAnimMs, 2000) === 620 ? 2000 : clamp(finite(raw.sceneAnimMs, 2000), 200, 3000),
      frontPan: clamp(finite(raw.frontPan, 0), -1, 1),
      frontPanY: clamp(finite(raw.frontPanY, 0), -1, 1),
      closedSections: (raw.closedSections && typeof raw.closedSections === "object" && !Array.isArray(raw.closedSections))
        ? raw.closedSections : {},
      cursorRowId: typeof raw.cursorRowId === "string" ? raw.cursorRowId : null,
      sceneListHeight: clamp(finite(raw.sceneListHeight, 320), 120, 1200),
      layout: normalizeLayout(raw.layout),
      seat: (typeof raw.seat === "string" && raw.seat.startsWith("approx-"))
        ? raw.seat
        : VENUES.seatById(typeof raw.seat === "string" ? raw.seat : "").id,
      pieceColor: validColor(raw.pieceColor, fallback.pieceColor),
      paintColor: validColor(raw.paintColor, fallback.paintColor),
      brushSize: clamp(finite(raw.brushSize, fallback.brushSize), 12, 120),
      lastExportAt: typeof raw.lastExportAt === "string" ? raw.lastExportAt : "",
      editsSinceExport: clamp(finite(raw.editsSinceExport, 0), 0, 99999),
    });
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { value: normalizeState(JSON.parse(saved)), restored: true };
    } catch (_) {
      // 保存領域が使えなくても、舞台スケッチ自体はそのまま利用できる。
    }
    return { value: baseState(true), restored: false };
  }

  /* ---------- ショーの棚 ----------
     ショーは端末の中に何本でも置ける。いま開いているものは STORAGE_KEY に、
     全ての控えは SHOWS_KEY に「id → 中身」で持つ。開き直すときは控えから戻す。
     保存は自動。ファイルへ出したいときは従来どおり「書き出す」。 */

  function readShows() {
    try {
      const raw = JSON.parse(localStorage.getItem(SHOWS_KEY) || "{}");
      return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
    } catch (_) {
      return {};
    }
  }

  /* 棚への保存が入りきらないことがある（localStorageは5MB前後）。
     ★以前はここで黙って諦めていて、「保存しました」と出るのに棚は古いまま、
     という嘘の状態が起きていた。成否を返し、表示（persistSoon）で正直に伝える。 */
  let shelfFailed = false;
  function writeShows(shows) {
    try {
      localStorage.setItem(SHOWS_KEY, JSON.stringify(shows));
      shelfFailed = false;
      return true;
    } catch (_) {
      shelfFailed = true;
      return false;
    }
  }

  // いまのショーを棚へ書き戻す。保存のたびに呼ぶので、一覧は常に最新になる
  function shelveCurrent() {
    const shows = readShows();
    shows[state.project.id] = {
      savedAt: nowIso(),
      state: JSON.parse(snapshot()),
    };
    writeShows(shows);
  }

  /* 読み込んだファイルは、同じ project.id を持っていても別の内容なら
     既存の棚を上書きしない。書き出し元が同じ雛形を複製している場合にも、
     読み込んだショーをそれぞれ一覧に残せるようにする。
     内容まで同じファイルだけは、同じショーとして開き直す。 */
  function reserveImportedShowId(next) {
    const project = next && next.project;
    if (!project) return;
    const requestedId = typeof project.id === "string" ? project.id : "";
    const shows = readShows();
    const existing = requestedId && shows[requestedId] && shows[requestedId].state;
    if (!requestedId || !existing) {
      if (!requestedId) project.id = rid("show");
      return;
    }
    const savedProject = existing.state.project || {};
    const importedProject = { ...project };
    const savedComparable = { ...savedProject };
    delete importedProject.id;
    delete savedComparable.id;
    if (JSON.stringify(importedProject) !== JSON.stringify(savedComparable)) {
      project.id = rid("show");
    }
  }

  function showSummary(entry) {
    const pj = entry && entry.state && entry.state.project;
    if (!pj) return null;
    return {
      id: pj.id,
      title: pj.title || untitledShow(),
      version: pj.versionLabel || "v1",
      scenes: (pj.scenes || []).filter((x) => x.kind !== "section").length,
      savedAt: entry.savedAt || "",
    };
  }

  const loaded = loadState();
  let state = loaded.value;
  let tool = "select";
  let selectedId = null;
  let selectedNoteId = null;
  // いま選んでいるスクリーンの文字（掴んで動かす・つまみで直す対象）
  let selectedTextId = null;
  let pointerAction = null;
  // 確定前の自由矢印。ショーの保存やUndoへは、指を離した時点で初めて入れる。
  let arrowDraft = null;
  let history = [];
  let future = [];
  let saveTimer = null;
  let controlBefore = null;

  /* ---------- 固定 SceneStudy ----------
   * 知識ベース全体とは接続しない。同梱した固定データだけを読み、
   * 8ビートを通常の「場面」へ変換する。配置は初期仮説で、以後は
   * 他のショーと同じく端末内で編集・保存される。 */

  const studyById = (id) => SCENE_STUDIES.find((item) => item.id === id) || null;
  const currentStudy = () => studyById(state.project.sceneStudyId);

  function studyNode(tag, className, textValue) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  }

  function studyDetail(summaryText, className) {
    const details = studyNode("details", className || "stage-study-detail");
    const summary = studyNode("summary", "", summaryText);
    const body = studyNode("div", "stage-study-detail-body");
    details.append(summary, body);
    return { details, body };
  }

  function appendStudyList(host, heading, items) {
    host.append(studyNode("p", "stage-study-minihead", heading));
    const list = studyNode("ul", "stage-study-list");
    items.forEach((item) => list.append(studyNode("li", "", item)));
    host.append(list);
  }

  function renderSceneStudy() {
    if (!els.studyBody) return;
    els.studyBody.innerHTML = "";
    const available = SCENE_STUDIES[0];
    if (!available) {
      els.studyBody.append(studyNode("p", "stage-study-empty",
        isEn() ? "No fixed SceneStudy is bundled." : "同梱された固定SceneStudyはありません。"));
      return;
    }

    const study = currentStudy();
    if (!study) {
      els.studyBody.append(
        studyNode("p", "stage-study-status",
          isEn()
            ? `FIXED STUDY / ${available.scope.targetDurationSeconds}s / ${available.scope.performers} performer`
            : `固定スタディ / ${available.scope.targetDurationSeconds}秒 / ${available.scope.performers}人`),
        studyNode("h3", "stage-study-title", available.title),
        studyNode("p", "stage-study-input", available.fixedInput)
      );
      const button = studyNode("button", "stage-study-open",
        isEn() ? "Open the 8 beats as another show" : "8ビートを別ショーとして開く");
      button.type = "button";
      button.addEventListener("click", () => openFixedSceneStudy(available));
      els.studyBody.append(button);
      els.studyBody.append(studyNode("p", "stage-study-save-note",
        isEn()
          ? "Your current show stays in All shows. The study opens separately and saves only in this browser."
          : "現在のショーは一覧に残します。固定案は別ショーで開き、配置変更はこのブラウザ内だけに保存します。"));

      const source = studyDetail(isEn() ? "What is fixed?" : "何が固定されているか");
      appendStudyList(source.body,
        isEn() ? "FROM THE EXISTING PLAN" : "既存計画から",
        available.factsFromExistingPlan);
      source.body.append(studyNode("p", "stage-study-source",
        isEn() ? `Bundled from: ${available.sourceJson}` : `同梱元: ${available.sourceJson}`));
      els.studyBody.append(source.details);
      return;
    }

    const activeScene = sc();
    const activeBeat = study.beats.find((beat) => beat.id === activeScene.studyBeatId) || null;
    const scenesByBeat = new Map(
      state.project.scenes
        .filter((scene) => scene.kind === "scene" && scene.studyBeatId)
        .map((scene) => [scene.studyBeatId, scene])
    );

    els.studyBody.append(
      studyNode("p", "stage-study-status",
        isEn()
          ? `FIXED STUDY / ${study.scope.targetDurationSeconds}s / PLACEMENT DRAFT`
          : `固定案 / ${study.scope.targetDurationSeconds}秒 / 配置は初期仮説`),
      studyNode("h3", "stage-study-title", study.title)
    );

    const rail = studyNode("div", "stage-study-rail");
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", isEn() ? "Switch study beat" : "スタディのビートを切り替える");
    study.beats.forEach((beat) => {
      const scene = scenesByBeat.get(beat.id);
      const button = studyNode("button", "stage-study-beat-button", beat.id);
      button.type = "button";
      button.disabled = !scene;
      button.title = `${beat.label} / ${beat.durationSeconds}${isEn() ? "s" : "秒"}`;
      button.setAttribute("aria-pressed", String(Boolean(activeBeat && activeBeat.id === beat.id)));
      if (scene) button.addEventListener("click", () => openScene(scene.id));
      rail.append(button);
    });
    els.studyBody.append(rail);

    if (!activeBeat) {
      els.studyBody.append(studyNode("p", "stage-study-empty",
        isEn()
          ? "This scene is outside the fixed 8 beats. Choose a beat above to return."
          : "このシーンは固定8ビートの外です。上の番号を押すとスタディへ戻れます。"));
    } else {
      const heading = studyNode("div", "stage-study-beat-head");
      const number = studyNode("span", "stage-study-beat-number",
        `${activeBeat.id} / ${study.beats.length}　${activeBeat.durationSeconds}${isEn() ? "s" : "秒"}`);
      heading.append(number, studyNode("h4", "", activeBeat.label));
      els.studyBody.append(heading);

      [
        [isEn() ? "ACTION" : "行為", activeBeat.action],
        [isEn() ? "VISIBLE RULE" : "観客に見える規則", activeBeat.visibleRule],
        [isEn() ? "CHANGE" : "このビートで変わること", activeBeat.change],
      ].forEach(([label, value]) => {
        const field = studyNode("div", "stage-study-field");
        field.append(studyNode("span", "", label), studyNode("p", "", value));
        els.studyBody.append(field);
      });

      const cards = studyDetail(
        isEn()
          ? `Direction cards (${activeBeat.appliedCardIds.length})`
          : `適用した演出カード（${activeBeat.appliedCardIds.length}件）`
      );
      const cardList = studyNode("ul", "stage-study-card-list");
      activeBeat.appliedCardIds.forEach((id) => {
        const item = studyNode("li", "", study.cardTitles[id] || id);
        item.title = id;
        cardList.append(item);
      });
      cards.body.append(cardList);
      els.studyBody.append(cards.details);
    }

    const boundary = studyDetail(isEn() ? "Facts, interpretation, open choices" : "事実・解釈・未決定");
    appendStudyList(boundary.body,
      isEn() ? "FROM THE EXISTING PLAN" : "既存計画から",
      study.factsFromExistingPlan);
    appendStudyList(boundary.body,
      isEn() ? "CREATIVE INTERPRETATION" : "今回の制作解釈",
      [
        `目的: ${study.creativeInterpretation.objective}`,
        `障害: ${study.creativeInterpretation.obstacle}`,
        `葛藤: ${study.creativeInterpretation.conflict}`,
      ]);
    appendStudyList(boundary.body,
      isEn() ? "OPEN" : "本人確認待ち",
      study.unknownsForUserReview);
    els.studyBody.append(boundary.details);

    els.studyBody.append(studyNode("p", "stage-study-save-note",
      isEn()
        ? "Switch beats to compare positions. Every beat is a separate scene; edits auto-save only in this browser."
        : "番号を切り替えて配置差を見ます。各ビートは別シーンで、変更はこのブラウザ内へ自動保存されます。"));
  }

  function openFixedSceneStudy(study) {
    if (!study || !Array.isArray(study.beats) || !study.beats.length) return;
    shelveCurrent();

    const fresh = baseState(false);
    const researcherId = `study-${study.id}-researcher`;
    const tableId = `study-${study.id}-table`;
    const noteId = `study-${study.id}-note`;
    const diaboloId = `study-${study.id}-diabolo`;
    const poses = {
      "4-1": "stand", "4-2": "stand", "4-3": "reach", "4-4": "open",
      "4-5": "reach", "4-6": "open", "4-7": "stand", "4-8": "walk",
    };

    fresh.project.title = "時をほどく研究室：未来サンプル";
    fresh.project.versionLabel = "Study A";
    fresh.project.sceneStudyId = study.id;
    fresh.project.sceneStudySourceVersion = study.schemaVersion;
    fresh.project.cast = [
      {
        id: researcherId,
        name: "研究者",
        color: "#a84b26",
        heightCm: DEFAULT_HEIGHT_CM,
        note: "固定SceneStudyの1人版。配置と姿勢は稽古前の初期仮説。",
        locked: false,
      },
    ];
    fresh.project.sets = [
      {
        id: tableId, kind: "table", name: "実験机", color: "#766a59",
        dims: { w: 1.4, d: 0.7, h: 0.72 }, note: "", locked: false,
        flown: false, wires: 2, framed: false,
      },
      {
        id: noteId, kind: "block", name: "ノート（位置札）", color: "#efe7d6",
        dims: { w: 0.3, d: 0.22, h: 0.05 }, note: "実物形状ではなく位置を比較する札。", locked: false,
        flown: false, wires: 2, framed: false,
      },
      {
        id: diaboloId, kind: "sphere", name: "ディアボロ（位置札）", color: "#77865f",
        dims: { dia: 0.3, lift: 0 }, note: "実物形状ではなく位置を比較する札。", locked: false,
        flown: false, wires: 2, framed: false,
      },
    ];
    fresh.project.scenes = study.beats.map((beat) => {
      const placement = beat.placement;
      const scene = newScene(beat.label, false);
      scene.studyBeatId = beat.id;
      scene.note = `${beat.action}\n変化: ${beat.change}`.slice(0, 200);
      scene.pieces = [
        {
          id: nextId(), type: "performer", castId: researcherId,
          u: placement.performer[0], v: placement.performer[1],
          facing: placement.performer[2], pose: poses[beat.id] || "stand",
          size: 100, color: "#a84b26", name: "",
        },
        {
          id: nextId(), type: "table", setId: tableId,
          u: placement.table[0], v: placement.table[1],
          facing: 0, size: 100, color: "#766a59", name: "",
        },
        {
          id: nextId(), type: "block", setId: noteId,
          u: placement.note[0], v: placement.note[1],
          facing: 0, size: 100, color: "#efe7d6", name: "",
        },
        {
          id: nextId(), type: "sphere", setId: diaboloId,
          u: placement.diabolo[0], v: placement.diabolo[1],
          facing: 0, size: 100, color: "#77865f", name: "",
        },
      ];
      return scene;
    });
    fresh.project.activeSceneId = fresh.project.scenes[0].id;
    fresh.layout = state.layout;
    applyLoadedState(normalizeState(fresh),
      "固定SceneStudyを別ショーとして開きました。8ビートの配置は自由に直せます。");
  }

  /* 同梱ショーは stage-samples/index.js のデータ棚からだけ読む。 */
  function bundledSampleById(id) {
    const samples = SHOW_LIBRARY && Array.isArray(SHOW_LIBRARY.samples)
      ? SHOW_LIBRARY.samples : [];
    return samples.find((sample) => sample && sample.id === id) || null;
  }

  function buildSampleShow() {
    const source = bundledSampleById("sample-eight-circus-v1");
    if (!source) return null;
    const SAMPLE_CAST = source.cast || [];
    const SAMPLE_SETS = source.sets || [];
    const SAMPLE_LIGHTS = source.lights || [];
    const SAMPLE_SCENES = source.scenes || [];
    const fresh = baseState(false);
    const p = fresh.project;
    p.id = source.id;
    p.title = isEn() && source.titleEn ? source.titleEn : source.title;
    p.versionLabel = source.versionLabel;
    p.venue = source.venue;
    p.venueSize = source.venueSize;
    p.sampleSource = source.sourceMarkdown || "";
    p.sampleBoundaries = Array.isArray(source.boundaries) ? source.boundaries.slice() : [];
    const castId = {}; const setId = {}; const lightId = {};
    p.cast = SAMPLE_CAST.map((c) => {
      castId[c.key] = `sample-cast-${c.key}`;
      return { id: castId[c.key], name: c.name, color: c.color,
        heightCm: c.h, note: "", locked: false };
    });
    p.sets = SAMPLE_SETS.map((x) => {
      setId[x.key] = `sample-set-${x.key}`;
      return { id: setId[x.key], kind: x.kind, name: x.name, color: x.color,
        dims: normalizeDims(x.kind, { dims: x.dims }), note: "", locked: false,
        flown: Boolean(x.flown), wires: 2, framed: false, lightKind: "hang" };
    }).concat(SAMPLE_LIGHTS.map((x) => {
      lightId[x.key] = `sample-light-${x.key}`;
      return { id: lightId[x.key], kind: "light", name: x.name, color: "#d3ac59",
        dims: normalizeDims("light", { dims: { dia: x.dia } }), note: "",
        locked: false, flown: false, wires: 2, framed: false, lightKind: x.kind };
    }));

    p.scenes = SAMPLE_SCENES.map((row, i) => {
      const scene = newScene(row.title, false);
      scene.note = row.note;
      const pieces = [];
      Object.keys(row.cast || {}).forEach((key) => {
        const [u, v, facing, pose] = row.cast[key];
        const c = SAMPLE_CAST.find((x) => x.key === key);
        pieces.push(normalizePiece({ id: `sample-${key}-${i}`, type: "performer",
          castId: castId[key], originId: `sample-origin-${key}`,
          u, v, facing, pose, size: 100, color: c.color, name: "" }, 0));
      });
      Object.keys(row.sets || {}).forEach((key) => {
        const [u, v] = row.sets[key];
        const x = SAMPLE_SETS.find((y) => y.key === key);
        pieces.push(normalizePiece({ id: `sample-${key}-${i}`, type: x.kind,
          setId: setId[key], originId: `sample-origin-${key}`,
          u, v, facing: 0, size: 100, color: x.color, dims: x.dims, name: "" }, 0));
      });
      Object.keys(row.lights || {}).forEach((key) => {
        const [u, v] = row.lights[key];
        const x = SAMPLE_LIGHTS.find((y) => y.key === key);
        const spec = LIGHT_KINDS[x.kind];
        const src = spec.source(u, v);
        pieces.push(normalizePiece({ id: `sample-${key}-${i}`, type: "light",
          setId: lightId[key], originId: `sample-origin-${key}`,
          u, v, facing: 0, size: 100, color: "#d3ac59", name: "",
          beam: { u: src.u, v: x.srcV !== undefined ? x.srcV : src.v,
            h: x.h !== undefined ? x.h : spec.h, toH: spec.toH } }, 0));
      });
      scene.pieces = pieces;
      return scene;
    });
    p.activeSceneId = p.scenes[0].id;
    return normalizeState(fresh);
  }

  /* 「継ぎ目の庭」は8個の入れ物＋32場面を持つ60分の第二サンプル。
     データ本体は stage-samples/index.js に集約し、ここでは通常の
     Project > Scene > Piece へ変換する。セクション行には絵も時間も持たせない。 */
  function buildSeamGardenSampleShow() {
    const source = bundledSampleById("sample-seam-garden-v1");
    if (!source) return null;
    const fresh = baseState(false);
    const p = fresh.project;
    p.id = source.id;
    p.title = isEn() && source.titleEn ? source.titleEn : source.title;
    p.versionLabel = source.versionLabel;
    p.venue = source.venue;
    p.venueSize = source.venueSize;
    p.rehearsal = normalizeProjectRehearsal(null);
    p.sampleSource = source.sourceMarkdown;
    p.sampleBoundaries = Array.isArray(source.boundaries) ? source.boundaries.slice() : [];

    const castId = {};
    const setId = {};
    const lightId = {};
    p.cast = source.cast.map((member) => {
      castId[member.key] = `seam-cast-${member.key}`;
      return {
        id: castId[member.key],
        name: isEn() && member.nameEn ? member.nameEn : member.name,
        color: member.color,
        heightCm: member.h,
        note: "",
        locked: false,
      };
    });
    p.sets = source.sets.map((item) => {
      setId[item.key] = `seam-set-${item.key}`;
      return {
        id: setId[item.key], kind: item.kind, name: item.name, color: item.color,
        dims: normalizeDims(item.kind, { dims: item.dims }), note: "", locked: false,
        flown: Boolean(item.flown), wires: 2, framed: false, lightKind: "hang",
      };
    }).concat(source.lights.map((item) => {
      lightId[item.key] = `seam-light-${item.key}`;
      return {
        id: lightId[item.key], kind: "light", name: item.name, color: "#d3ac59",
        dims: normalizeDims("light", { dims: { dia: item.dia } }), note: "",
        locked: false, flown: false, wires: 2, framed: false, lightKind: item.kind,
      };
    }));

    const rows = [];
    source.sections.forEach((section) => {
      const sectionScene = newScene(`${section.id}. ${section.title}`, false, "section", 0);
      sectionScene.id = `seam-section-${section.id}`;
      sectionScene.note = section.summary || "";
      sectionScene.pieces = [];
      sectionScene.beat = null;
      sectionScene.rehearsal = null;
      rows.push(sectionScene);

      section.scenes.forEach((row) => {
        const scene = newScene(`${row.id} ${row.title}`, false, "scene", 1);
        scene.id = `seam-scene-${row.id}`;
        scene.note = row.note;
        scene.beat = normalizeSceneBeat("scene", { role: row.role, energy: row.energy });
        scene.rehearsal = normalizeSceneRehearsal({
          holdDurationSeconds: row.durationSeconds,
          transitionToNextSeconds: 0,
        });
        scene.sampleSectionId = section.id;
        scene.sampleSceneId = row.id;
        const pieces = [];
        Object.keys(row.cast || {}).forEach((key) => {
          const [u, v, facing, pose] = row.cast[key];
          const member = source.cast.find((item) => item.key === key);
          if (!member || !castId[key]) return;
          pieces.push(normalizePiece({
            id: `seam-${key}-${row.id}`, type: "performer", castId: castId[key],
            originId: `seam-origin-${key}`, u, v, facing, pose, size: 100,
            color: member.color, name: "",
          }, 0));
        });
        Object.keys(row.sets || {}).forEach((key) => {
          const [u, v, facing] = row.sets[key];
          const item = source.sets.find((candidate) => candidate.key === key);
          if (!item || !setId[key]) return;
          pieces.push(normalizePiece({
            id: `seam-${key}-${row.id}`, type: item.kind, setId: setId[key],
            originId: `seam-origin-${key}`, u, v, facing, size: 100,
            color: item.color, dims: item.dims, name: "",
          }, 0));
        });
        Object.keys(row.lights || {}).forEach((key) => {
          const [u, v] = row.lights[key];
          const item = source.lights.find((candidate) => candidate.key === key);
          if (!item || !lightId[key]) return;
          const spec = LIGHT_KINDS[item.kind];
          const src = spec.source(u, v);
          pieces.push(normalizePiece({
            id: `seam-${key}-${row.id}`, type: "light", setId: lightId[key],
            originId: `seam-origin-${key}`, u, v, facing: 0, size: 100,
            color: "#d3ac59", name: "",
            beam: {
              u: src.u, v: item.srcV !== undefined ? item.srcV : src.v,
              h: item.h !== undefined ? item.h : spec.h, toH: spec.toH,
            },
          }, 0));
        });
        scene.pieces = pieces;
        rows.push(scene);
      });
    });
    p.scenes = rows;
    const firstScene = rows.find((row) => row.kind === "scene");
    p.activeSceneId = firstScene ? firstScene.id : rows[0].id;
    return normalizeState(fresh);
  }

  /* 見本の動線。隣り合うシーンの差から起こす（手で書くと位置とずれる）。
     movedPairs と同じ判定を使うので、0.25m未満の差では引かれない。 */
  function drawSampleRoutes(next) {
    const size = VENUES.sizeById(VENUES.byId(next.project.venue), next.project.venueSize);
    const scenes = next.project.scenes.filter((scene) => scene.kind === "scene");
    for (let i = 0; i < scenes.length - 1; i += 1) {
      (scenes[i].pieces || []).forEach((piece) => {
        const twin = (scenes[i + 1].pieces || []).find((q) =>
          (piece.castId && q.castId === piece.castId)
          || (piece.setId && q.setId === piece.setId));
        if (!twin) return;
        const dx = (twin.u - piece.u) * size.width;
        const dz = (twin.v - piece.v) * size.depth;
        if (Math.hypot(dx, dz) < 0.25) return;
        piece.route = { u: twin.u, v: twin.v,
          bu: (piece.u + twin.u) / 2, bv: (piece.v + twin.v) / 2 };
      });
    }
    return next;
  }

  // 棚へ入れておく。ショー一覧から開ける（開いた瞬間には出さない）
  function shelveSample() {
    const built = buildSampleShow();
    if (!built) return;
    drawSampleRoutes(built);
    const shows = readShows();
    if (shows[built.project.id]) return;
    shows[built.project.id] = { savedAt: nowIso(), state: built };
    writeShows(shows);
  }

  function openSampleShow() {
    const built = buildSampleShow();
    if (!built) {
      announce("同梱の見本を読み込めませんでした。ページを再読み込みしてください。");
      return;
    }
    applyLoadedState(drawSampleRoutes(built),
      "見本のショーを開きました。元のショーはショー一覧に残っています。");
  }

  // 新しいサンプルは既存利用者の棚にも一度だけ追加する。同じidを利用者が
  // 編集済みなら上書きしないため、配置変更はそのまま残る。
  function shelveSeamGardenSample() {
    const built = buildSeamGardenSampleShow();
    if (!built) return;
    drawSampleRoutes(built);
    const shows = readShows();
    if (shows[built.project.id]) return;
    shows[built.project.id] = { savedAt: nowIso(), state: built };
    writeShows(shows);
  }

  function openSeamGardenSampleShow() {
    const built = buildSeamGardenSampleShow();
    if (!built) return;
    applyLoadedState(drawSampleRoutes(built),
      "『継ぎ目の庭』を開きました。元のショーはショー一覧に残っています。");
  }

  const venue = () => VENUES.byId(state.project.venue);
  let approxFrontSeatCache = { venueId: null, seats: null };
  function approxFrontSeatsForVenue(v) {
    if (!v || !v.custom || !v.venueV2) return null;
    /* idだけだと同じ会場を編集し直したとき古い近似が残るので、
       近似に効く中身（観客領域・床の輪郭）もキーに含める */
    const venueId = (v.id || "") + "|" +
      JSON.stringify(v.venueV2.audience || []) + "|" +
      JSON.stringify((v.venueV2.floor && v.venueV2.floor.outline) || []);
    if (approxFrontSeatCache.venueId !== venueId) {
      const lines = window.SHOSAI_VENUE_LINES;
      const seats = lines && typeof lines.approxFrontSeats === "function"
        ? lines.approxFrontSeats(v.venueV2, VENUES.seats)
        : [];
      approxFrontSeatCache = { venueId, seats: Array.isArray(seats) ? seats : Array.from(seats || []) };
    }
    return approxFrontSeatCache.seats;
  }
  function frontSeatById(id) {
    const v = venue();
    const approx = approxFrontSeatsForVenue(v);
    if (approx) return approx.find((seat) => seat.id === id) || approx[0] || VENUES.seatById("center");
    return VENUES.seatById(id);
  }
  /* 実効の寸法。選んだ規模に、手で入れた実寸を重ねたもの。
   * 円形（リング）は間口・奥行きと同じ値を持たせる（真円なので一つの数で決まる）。 */
  const venueSize = () => {
    const base = VENUES.sizeById(venue(), state.project.venueSize);
    const over = state.project.venueDims;
    if (!over) return base;
    const merged = Object.assign({}, base, over);
    if (base.ring !== undefined) merged.ring = merged.width;
    return merged;
  };

  /* ---------- 袖（平面図だけにある置き場） ----------
     舞台の枠の外に、駒を置ける帯を持つ。演者の「はけ」を絵にするための場所。
     プロセニアム＝左右、スラスト＝奥（左右は客席なので置けない）、
     それ以外＝当面は左右。正面図には描かない（額縁の外は見えない）。 */
  const WING_M = 2.5;   // 袖の奥行き（m）
  function planBounds() {
    const v = venue();
    const size = venueSize();
    const du = WING_M / (size.width || 12);
    const dv = WING_M / (size.depth || 9);
    if (v.audience === "three") return { uMin: 0, uMax: 1, vMin: -dv, vMax: 1 };
    return { uMin: -du, uMax: 1 + du, vMin: 0, vMax: 1 };
  }

  // 駒が舞台の枠の中に居るか。正面図はこの枠の中だけを描く
  const onStageArea = (u, v) => u >= -0.02 && u <= 1.02 && v >= -0.02 && v <= 1.02;

  /* ---------- レイアウト ----------
     舞台は常に画面いっぱいに描く。実寸の違いは「人の小ささ」として出る。 */

  function layout(view) {
    const v = venue();
    const size = venueSize();
    const plan = view === "plan";

    if (plan) {
      // 平面図: 上が奥、下が客席側。舞台の縦横比を保って収める。
      // 全周形式は客席が四方に要るので、舞台の取り分を減らす。
      const pad = v.audience === "round" ? 176 : 104;
      const availW = W - pad * 2;
      const availH = H - pad * 2;
      const ratio = size.depth / size.width;
      let sw = availW;
      let sh = sw * ratio;
      if (sh > availH) { sh = availH; sw = sh / ratio; }
      // 客席のある形式は舞台を少し上へ寄せ、下に客席の余地を残す
      const shift = v.audience === "none" ? 0 : (v.audience === "round" ? 0 : -28);
      return {
        plan: true, venue: v, size,
        stage: { x: (W - sw) / 2, y: (H - sh) / 2 + shift, w: sw, h: sh },
        pxPerM: sw / size.width,
      };
    }

    // 正面図: 奥のラインと手前のラインの間で擬似パースを作る。
    // 客席の位置（席）によって、床の厚み・幅の開き・消失点の左右が変わる。
    const seat = frontSeatById(state.seat);

    /* 尺は縦と横で同じにする。
     * 床の1m枡、演者の身長、セットの実寸が同じものさしで測られていないと、
     * 寸法を持たせた意味がない（幅1m×高さ2.4mの塔が正方形に見える）。
     * 以前は横を間口から、縦を奥の壁の高さから別々に取っていたため、
     * 同じ1mが2.5倍ずれていた。
     *
     * 尺は「間口が画面に収まる値」と「舞台の高さが収まる値」の小さい方。
     * seat.backW / seat.frontW は絶対値ではなく、手前と奥の倍率差として使う。
     */
    const span = seat.frontW / seat.backW;              // 手前は奥の何倍に見えるか
    const headroom = Math.max(24, seat.floorY - 22);     // 奥の壁の上に残す余白
    const byWidth = (W * seat.frontW) / size.width;
    const byHeight = headroom / ((size.height || 8) / span);
    const pxPerM = Math.min(byWidth, byHeight);
    const frontW = pxPerM * size.width;

    /* 舞台が一度に画面へ入らない席では、掴んで視線を動かせるようにする。
     *
     * 左右は像をずらす（客席の中で少し身体をずらす感じ）。
     * 上下は「その場で首を上げ下げする」。像を平行移動させるのではなく、
     * 目の位置は変えずに視線の角度だけ変える。見上げれば足元が詰まって
     * 頭上が伸びる——これは平行移動では出ない。
     *
     * やり方は、いったん水平に見たときの画面をこしらえてから、
     * それをピンホールの式で傾け直す。目の高さ（＝床の線）を原点に取り、
     *   t  = (y - 目の高さ) / 焦点距離
     *   y' = 目の高さ + 焦点距離 ×(t·cosφ + sinφ) / (cosφ − t·sinφ)
     * 焦点距離は「舞台までの距離 × 1mあたりの画素」。席が近いほど
     * 焦点距離が長くなり、同じ角度でも見え方が大きく動く。 */
    const panRange = Math.max(0, (frontW - W) / 2);
    const height = size.height || 8;
    const horizon = seat.floorY;
    const focal = Math.max(120, (seat.eye || 10) * pxPerM);
    const panY = clamp(state.frontPanY || 0, -1, 1);
    const phi = (panY > 0 ? panY * TILT_UP : panY * TILT_DOWN) * Math.PI / 180;
    const cs = Math.cos(phi);
    const sn = Math.sin(phi);

    const tilt = (y) => {
      if (!phi) return y;
      const t = (y - horizon) / focal;
      const den = cs - t * sn;
      // 地平線の向こうへ回り込んだ点は、画面の外へ飛ばす
      if (den <= 0.02) return sn > 0 ? -1e5 : 1e5;
      return horizon + (focal * (t * cs + sn)) / den;
    };
    const untilt = (y) => {
      if (!phi) return y;
      const u = (y - horizon) / focal;
      const den = cs + u * sn;
      if (Math.abs(den) < 1e-4) return y;
      return horizon + (focal * (u * cs - sn)) / den;
    };

    return {
      plan: false, venue: v, size, seat,
      // 傾けた後の位置。舞台の枠や床の帯はこれを見る
      backY: tilt(seat.floorY - (height * pxPerM) / span),
      floorY: tilt(seat.floorY),
      bottomY: tilt(seat.bottomY),
      apronBottom: tilt(seat.bottomY + (seat.apron || 0)),
      // 傾ける前の位置。駒はここから実寸で積み上げてから傾ける
      rawFloorY: seat.floorY,
      rawBottomY: seat.bottomY,
      // 奥の壁の天井の線（傾ける前）。灯体の高さはこの線と釣り合わせる
      rawCeilY: seat.floorY - (height * pxPerM) / span,
      tilt,
      untilt,
      backW: frontW / span,
      frontW,
      shift: (seat.shift || 0) * W * 0.5,
      centerX: W / 2 + clamp(state.frontPan || 0, -1, 1) * panRange,
      panRange,
      panRangeY: 1,
      pxPerM,
      pxPerMv: pxPerM,   // 縦横で同じ。名前は呼び出し側の互換のために残す
    };
  }

  // 正規化座標 → 画面座標。奥行き v で幅とスケールが変わる。
  // v=0 が最奥、v=1 が最前。正面図でも平面図でも「画面の下ほど手前」で揃える。
  function place(u, v, L) {
    if (L.plan) {
      return {
        x: L.stage.x + u * L.stage.w,
        y: L.stage.y + v * L.stage.h,
        scale: 1,
        stretch: 1,
      };
    }
    // 首振りは最後にかける。実寸を積み上げるのは「傾ける前」の座標の上で行う
    const rawY = L.rawFloorY + v * (L.rawBottomY - L.rawFloorY);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    // 横の席では、奥ほど横へ流れる。手前は席の正面なのでずれない
    const slide = (L.shift || 0) * (1 - v);
    const rise = (L.seat && L.seat.rise) || 0;
    return {
      x: L.centerX + slide + (u - 0.5) * halfW * 2,
      y: L.tilt(rawY),
      rawY,
      scale: (L.backW + v * (L.frontW - L.backW)) / L.frontW,
      // 煽りも見下ろしも、近いものほど強く効く。正で縦に伸び、負で縦に詰まる
      stretch: 1 + rise * v,
    };
  }

  function fromScreen(x, y, L) {
    if (L.plan) {
      /* 平面図では袖まで掴める（SSの灯体や当たる先も舞台の外に置ける）。
         正面図は舞台の枠までのまま。 */
      const b = planBounds();
      return {
        u: clamp((x - L.stage.x) / L.stage.w, b.uMin, b.uMax),
        v: clamp((y - L.stage.y) / L.stage.h, b.vMin, b.vMax),
      };
    }
    const raw = L.untilt(y);
    const v = clamp((raw - L.rawFloorY) / (L.rawBottomY - L.rawFloorY), 0, 1);
    const halfW = (L.backW + v * (L.frontW - L.backW)) / 2;
    const slide = (L.shift || 0) * (1 - v);
    return { u: clamp((x - L.centerX - slide) / (halfW * 2) + 0.5, 0, 1), v };
  }

  /* 舞台の点（左右u・奥行きv・高さhメートル）を画面へ落とす。
   * 床の1m枡と同じ道（place → perMetre → tilt）を通るので遠近が一致する。 */
  function stagePoint(u, v, h, L) {
    const p = place(u, v, L);
    if (L.plan || !h) return { x: p.x, y: p.y };
    return { x: p.x, y: L.tilt(p.rawY - h * perMetre(p, L).y) };
  }

  // 実寸（m）から画面上の高さを出す。size は基準に対する倍率
  function pieceScale(piece, pos, L) {
    const meters = pieceHeightM(piece) * (piece.size / 100);
    // 尺は縦横で同じ。床の1m枡と同じものさしで測る
    const px = meters * L.pxPerM * (L.plan ? 1 : pos.scale);
    // 元の描画は「人物=約155px」で描かれているので、それに合わせる
    return px / (piece.type === "performer" ? 155 : piece.type === "block" ? 84 : piece.type === "sphere" ? 118 : 170);
  }

  function snapshot() { return JSON.stringify(state); }

  function recordBefore(value) {
    if (!value) return;
    if (history[history.length - 1] !== value) history.push(value);
    if (history.length > HISTORY_LIMIT) history.shift();
    future = [];
    updateHistoryButtons();
  }

  function checkpoint() {
    recordBefore(snapshot());
    // ファイル書き出しからの変更数。閾値を超えたら保存欄で書き出しを勧める
    state.editsSinceExport = (state.editsSinceExport || 0) + 1;
    updateBackupNote();
  }

  function restore(value) {
    state = normalizeState(JSON.parse(value));
    if (!sc().pieces.some((piece) => piece.id === selectedId)) selectedId = null;
    detachOrphanNotes();
    syncInputs();
    applyLayout();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
  }

  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    updateHistoryButtons();
    announce("一つ前の状態へ戻しました。");
  }

  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    updateHistoryButtons();
    announce("やり直しました。");
  }

  function updateHistoryButtons() {
    els.undo.disabled = history.length === 0;
    els.redo.disabled = future.length === 0;
  }

  /* ファイル書き出しの記録を保存欄に出す。ブラウザ内の保存は設定・容量次第で
     消え得るので、「最後にファイルへ残したのはいつか」を常に見せ、
     変更が一定数たまったら書き出しを勧める。お願いの文章より仕組みで促す。 */
  const BACKUP_HINT_AFTER = 30;
  function updateBackupNote() {
    if (!els.backupNote) return;
    const n = state.editsSinceExport || 0;
    if (!state.lastExportAt) {
      els.backupNote.textContent = isEn()
        ? "No file export yet."
        : "ファイルへの書き出しはまだありません。";
    } else {
      const at = new Date(state.lastExportAt);
      const stamp = isNaN(at) ? "?" : `${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
      els.backupNote.textContent = isEn()
        ? `Last file export: ${stamp} (${n} ${n === 1 ? "change" : "changes"} since)`
        : `最後のファイル書き出し: ${stamp}（それから${n}回の変更）`;
    }
    if (els.backupHint) els.backupHint.hidden = n < BACKUP_HINT_AFTER;
  }

  function persistSoon() {
    clearTimeout(saveTimer);
    els.saveStatus.textContent = isEn() ? "Saving\u2026" : "変更を保存しています…";
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, snapshot());
        shelveCurrent();
        /* 現在ショーと棚は別の保存。棚だけ失敗することがあるので分けて伝える */
        els.saveStatus.textContent = shelfFailed
          ? (isEn()
            ? `Saved \u201c${state.project.title}\u201d, but the show shelf is out of space \u2014 export to a file to keep a copy.`
            : `「${state.project.title}」を保存しましたが、ショー一覧の控えは容量不足で更新できていません。ファイルへ書き出してください。`)
          : (isEn() ? `Saved \u201c${state.project.title}\u201d.` : `「${state.project.title}」を保存しました。`);
        updateBackupNote();
      } catch (_) {
        els.saveStatus.textContent = isEn()
          ? "Could not save on this device. Export an image to keep your work."
          : "この端末へ保存できませんでした。画像を書き出して残してください。";
      }
    }, 180);
  }

  function announce(message) {
    /* 英語モードでは、文の「枠」を型変換表（stage-i18n.js の say）で訳す。
     * 名前や数は捕捉して埋め直す。呼び出し77箇所へ三項演算子を撒くより、
     * 出口一箇所で変える方が漏れが出ない。合わない文はそのまま出す
     * （日本語が出たら、それが「表に無い」という印になる）。 */
    if (isEn() && I18N.say) {
      for (const [re, en] of I18N.say) {
        if (re.test(message)) { message = message.replace(re, en); break; }
      }
    }
    els.live.textContent = "";
    requestAnimationFrame(() => { els.live.textContent = message; });
  }

  function rgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  /* ---------- 背景の塗り ---------- */

  // 舞台の奥に当たる領域。背景を描くにも客席を描くにも使う
  function backAreaRect(L) {
    if (L.plan) return null;
    const halfBack = L.backW / 2;
    // 奥は消失点と一緒に動く（横の席からは奥も斜めに見える）
    return { x: L.centerX + (L.shift || 0) - halfBack, y: L.backY, w: L.backW, h: L.floorY - L.backY };
  }

  // 筆で塗れる背景の壁。全周形式（ビッグトップ）は奥も客席なので壁が無い
  function backdropRect(L) {
    if (L.plan || L.venue.audience === "round") return null;
    return backAreaRect(L);
  }

  // リングの楕円。舞台面に描かれた円なので、床の台形の中に収まる
  function ringEllipse(L) {
    if (!L.size.ring) return null;
    const vRing = 0.5;
    const center = place(0.5, vRing, L);
    const widthAtRing = L.backW + vRing * (L.frontW - L.backW);
    return {
      x: center.x, y: center.y,
      rx: (L.size.ring / L.size.width) * widthAtRing / 2,
      ry: (L.size.ring / L.size.depth) * (L.bottomY - L.floorY) / 2,
    };
  }

  /* 読み込んだ写真の控え。同じデータURLを何度も復号しないため。
     読み終わった時点で一度だけ描き直す（それまでは地の色のまま出る）。 */
  const photoCache = new Map();
  function photoImage(src) {
    if (!src) return null;
    const hit = photoCache.get(src);
    if (hit) return hit.complete && hit.naturalWidth ? hit : null;
    const img = new Image();
    img.onload = () => render();
    img.src = src;
    photoCache.set(src, img);
    return null;
  }

  /* 壁の枠を覆うように置く（縦横比は保ち、はみ出した分は切る）。
     引き伸ばすと人の顔や柱が歪むので、切る方を選ぶ。 */
  function paintPhoto(target, rect, photo) {
    const img = photoImage(state.project.photos && state.project.photos[photo.id]);
    if (!img) return;
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    target.save();
    target.beginPath();
    target.rect(rect.x, rect.y, rect.w, rect.h);
    target.clip();
    const bright = photo.bright / 100;
    if (bright !== 1) target.filter = `brightness(${bright})`;
    target.drawImage(img, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h);
    target.restore();
  }

  /* スクリーンの文字を描く。壁の矩形の中の割合で置き、大きさも壁の高さ基準。
     縦書きは一文字ずつ下へ積む（回転させると読みにくいので字は立てたまま）。 */
  function screenTextBox(t, rect) {
    const px = Math.max(8, t.size * rect.h);
    const chars = [...t.text];
    const w = t.vertical ? px : px * chars.length * 0.92;
    const h = t.vertical ? px * chars.length * 1.02 : px * 1.12;
    return { x: rect.x + t.u * rect.w - w / 2, y: rect.y + t.v * rect.h - h / 2, w, h, px, chars };
  }

  function drawScreenTexts(target, rect) {
    const list = sc().screenTexts || [];
    if (!list.length) return;
    list.forEach((t) => {
      const box = screenTextBox(t, rect);
      const spec = SCREEN_FONTS[t.font] || SCREEN_FONTS.brush;
      target.save();
      target.beginPath();
      target.rect(rect.x, rect.y, rect.w, rect.h);
      target.clip();
      target.globalAlpha = t.opacity;
      target.fillStyle = t.color;
      target.font = `${spec.weight} ${Math.round(box.px)}px ${spec.css}`;
      target.textAlign = "center";
      target.textBaseline = "middle";
      const cx = rect.x + t.u * rect.w;
      const cy = rect.y + t.v * rect.h;
      if (t.angle) {
        target.translate(cx, cy);
        target.rotate((t.angle * Math.PI) / 180);
        target.translate(-cx, -cy);
      }
      if (t.vertical) {
        const top = cy - (box.chars.length - 1) * box.px * 0.51;
        box.chars.forEach((ch, i) => target.fillText(ch, cx, top + i * box.px * 1.02));
      } else {
        target.fillText(t.text, cx, cy);
      }
      target.restore();
      // 選んでいる文字は枠を出す（掴んで動かせることを示す）
      if (t.id === selectedTextId) {
        target.save();
        target.strokeStyle = "#d3ac59";
        target.setLineDash([6, 5]);
        target.lineWidth = 1.5;
        target.strokeRect(box.x - 6, box.y - 6, box.w + 12, box.h + 12);
        target.restore();
      }
    });
  }

  // 背景スクリーンの文字の当たり判定（正面図のみ）
  function screenTextAt(point, L) {
    if (L.plan) return null;
    const rect = backdropRect(L);
    if (!rect) return null;
    const list = sc().screenTexts || [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const box = screenTextBox(list[i], rect);
      if (point.x >= box.x - 6 && point.x <= box.x + box.w + 6
        && point.y >= box.y - 6 && point.y <= box.y + box.h + 6) return list[i];
    }
    return null;
  }

  /* スクリーンの文字の一覧と、選んだ文字のつまみ。
     写真や塗りと同じ「背景」の欄に置く（映すもの＝背景という括り）。 */
  function selectedScreenText() {
    return (sc().screenTexts || []).find((t) => t.id === selectedTextId) || null;
  }

  function renderScreenTexts() {
    const host = els.screenTextList;
    if (!host) return;
    const list = sc().screenTexts || [];
    host.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = isEn()
        ? "No screen text yet. Type a word and press Project."
        : "まだありません。言葉を入れて〈映す〉を押してください。";
      host.append(empty);
    }
    list.forEach((t) => {
      const row = document.createElement("div");
      row.className = `stage-cast-row${t.id === selectedTextId ? " is-selected" : ""}`;
      const dot = document.createElement("span");
      dot.className = "stage-kind-swatch";
      dot.style.background = t.color;
      dot.style.pointerEvents = "none";
      const name = document.createElement("button");
      name.type = "button";
      name.className = "stage-cast-name";
      name.style.textAlign = "left";
      name.textContent = t.text;
      name.addEventListener("click", () => {
        selectedTextId = t.id;
        syncScreenTextControls();
        renderScreenTexts();
        render();
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "stage-cast-remove";
      del.textContent = "✕";
      del.setAttribute("aria-label", isEn() ? "Remove this text" : "この文字を消す");
      del.addEventListener("click", () => {
        checkpoint();
        sc().screenTexts = (sc().screenTexts || []).filter((x) => x.id !== t.id);
        if (selectedTextId === t.id) selectedTextId = null;
        renderScreenTexts();
        syncScreenTextControls();
        render();
        persistSoon();
      });
      row.append(dot, name, del);
      host.append(row);
    });
    // 背景の壁を持たない形式では、映す面が無いので欄ごと隠す
    if (els.screenTextBlock) els.screenTextBlock.hidden = venue().audience === "round";
  }

  function syncScreenTextControls() {
    const t = selectedScreenText();
    if (els.screenTextEdit) els.screenTextEdit.hidden = !t;
    if (!t) return;
    if (els.screenTextSize && document.activeElement !== els.screenTextSize) {
      els.screenTextSize.value = String(Math.round(t.size * 100));
    }
    if (els.screenTextSizeValue) els.screenTextSizeValue.textContent = `${Math.round(t.size * 100)}%`;
    if (els.screenTextOpacity && document.activeElement !== els.screenTextOpacity) {
      els.screenTextOpacity.value = String(Math.round(t.opacity * 100));
    }
    if (els.screenTextOpacityValue) els.screenTextOpacityValue.textContent = `${Math.round(t.opacity * 100)}%`;
    if (els.screenTextAngle && document.activeElement !== els.screenTextAngle) {
      els.screenTextAngle.value = String(Math.round(t.angle));
    }
    if (els.screenTextAngleValue) els.screenTextAngleValue.textContent = `${Math.round(t.angle)}°`;
    if (els.screenTextFont) els.screenTextFont.value = t.font;
    if (els.screenTextColor) els.screenTextColor.value = t.color;
    if (els.screenTextVertical) els.screenTextVertical.checked = t.vertical;
  }

  function addScreenText() {
    const input = els.screenTextInput;
    const raw = (input && input.value || "").trim();
    if (!raw) { announce("映す言葉を入れてください。"); return; }
    if (venue().audience === "round") {
      announce(`${venueName(venue())}には映す面がありません。奥も客席です。`);
      return;
    }
    checkpoint();
    const t = normalizeScreenText({ text: raw, u: 0.5, v: 0.4, size: 0.18,
      color: "#efe7d6", font: "brush", vertical: false, opacity: 1, angle: 0 });
    if (!sc().screenTexts) sc().screenTexts = [];
    sc().screenTexts.push(t);
    selectedTextId = t.id;
    if (input) input.value = "";
    renderScreenTexts();
    syncScreenTextControls();
    render();
    persistSoon();
    announce(`「${raw}」をスクリーンへ映しました。絵の上で掴んで動かせます。`);
  }

  function buildPaintLayer(L) {
    paintCtx.clearRect(0, 0, W, H);
    const rect = backdropRect(L);
    if (!rect) return;
    paintCtx.save();
    paintCtx.beginPath();
    paintCtx.rect(rect.x, rect.y, rect.w, rect.h);
    paintCtx.clip();
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";

    sc().strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      const pt = (p) => ({ x: rect.x + p.u * rect.w, y: rect.y + p.v * rect.h });
      paintCtx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      paintCtx.strokeStyle = stroke.color;
      paintCtx.fillStyle = stroke.color;
      paintCtx.lineWidth = stroke.width;
      paintCtx.beginPath();
      const first = pt(stroke.points[0]);
      if (stroke.points.length === 1) {
        paintCtx.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
        paintCtx.fill();
        return;
      }
      paintCtx.moveTo(first.x, first.y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        const p = pt(stroke.points[i]);
        paintCtx.lineTo(p.x, p.y);
      }
      paintCtx.stroke();
    });
    paintCtx.restore();
    paintCtx.globalCompositeOperation = "source-over";
  }

  /* ---------- 演者と物の描画 ---------- */

  /* ---------- 物の上に乗る ----------
     台やテーブルの上へ置いたものは、その上面の高さから立ち上がる。
     床からの高さ（base, m）は置き場所から決まる派生値なので、状態として
     持ち回さず、描く前に毎回引き直す。 */

  /* その駒の「上面」の高さ（自分の足元から、m）。
   * 何の上にでも物を置けるようにするので、演者の頭の上も上面として扱う。 */
  function pieceTopLocal(piece) {
    if (piece.type === "light") return 0;
    if (piece.type === "seri") return clamp(finite(piece.seriH, 0), 0, 4);
    if (piece.type === "performer") {
      return poseExtent(piece.pose).top * pieceHeightM(piece) * (piece.size / 100);
    }
    const d = pieceDims(piece);
    if (!d) return 0;
    if (piece.type === "chair") return d.h * 0.5;      // 座面
    if (piece.type === "sphere") return d.lift + d.dia;
    return d.h;
  }

  // 床でどれだけの面積を取るか（m）。中心のずれも返す（寝ている演者などで効く）
  function supportFootprint(piece) {
    if (piece.type === "light") return null;
    if (piece.type === "performer") {
      const H = pieceHeightM(piece) * (piece.size / 100);
      const ext = poseExtent(piece.pose);
      return { w: ext.halfX * 2 * H, d: ext.halfZ * 2 * H, cx: ext.cx * H, cz: ext.cz * H };
    }
    const foot = pieceFootprint(piece);
    return foot ? { w: foot.w, d: foot.d, cx: 0, cz: 0 } : null;
  }

  /* (u,v) の真下にあるもののうち、いちばん高い上面。
   * 候補は「自分より先に並んでいるもの」だけ。互いを支えにすると高さが
   * 際限なく積み上がるので、並び順で循環を断つ。
   * 動かしている駒は並びの最後へ回すので、必ず重なった相手の上に乗る。 */
  function supportUnder(piece, size, candidates) {
    let top = 0;
    let holder = null;
    candidates.forEach((other) => {
      if (other === piece) return;
      // ポールの上には立てない（付き方が特別なので refreshBases で別に扱う）
      if (other.type === "pole") return;
      const foot = supportFootprint(other);
      if (!foot) return;
      const rad = ((other.facing || 0) * Math.PI) / 180;
      const dw = (piece.u - other.u) * size.width;
      const dd = -(piece.v - other.v) * size.depth;   // 奥へ行くほど v は小さい
      const lx = dw * Math.cos(rad) + dd * Math.sin(rad) - foot.cx;
      const ly = -dw * Math.sin(rad) + dd * Math.cos(rad) - foot.cz;
      if (Math.abs(lx) > foot.w / 2 || Math.abs(ly) > foot.d / 2) return;
      const t = (other.base || 0) + pieceTopLocal(other);
      if (t > top) { top = t; holder = other.id; }
    });
    return { top, holder };
  }

  // 全部の駒の床からの高さを引き直す。先に並んでいるものから順に決めるので一巡で足りる
  /* 吊物か。天井からワイヤーで吊り下がっているものは、
   * 何かの上に乗ることも、何かを乗せることもない。高さは地上高で決まる。 */
  function isFlown(piece) {
    if (!piece || !SOLID_TYPES[piece.type]) return false;
    if (piece.type === "seri") return false;
    const owner = pieceSet(piece);
    return Boolean(owner ? owner.flown : piece.flown);
  }

  /* 上がっているせりの縁を、一部だけまたいでいる駒。
   * 駒の足元の四隅を舞台座標へ出してから、せりの向きへ逆回転する。
   * supportUnder と同じく、舞台の奥方向は v が小さくなる座標で扱う。 */
  function seriStraddlers(pieces, size) {
    const raised = pieces.filter((p) => p.type === "seri"
      && clamp(finite(p.seriH, 0), 0, 4) > 0.02);
    const checked = pieces.filter((piece) => piece.type !== "seri"
      && piece.type !== "light" && !isFlown(piece));
    const found = [];
    raised.forEach((seri) => {
      const dims = pieceDims(seri);
      if (!dims) return;
      const seriRad = (finite(seri.facing, 0) * Math.PI) / 180;
      const seriCos = Math.cos(seriRad);
      const seriSin = Math.sin(seriRad);
      checked.forEach((piece) => {
        const foot = supportFootprint(piece);
        if (!foot) return;
        const pieceRad = (finite(piece.facing, 0) * Math.PI) / 180;
        const pieceCos = Math.cos(pieceRad);
        const pieceSin = Math.sin(pieceRad);
        const dw = (piece.u - seri.u) * size.width;
        const dd = -(piece.v - seri.v) * size.depth;
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
          const px = foot.cx + (sx * foot.w) / 2;
          const pz = foot.cz + (sz * foot.d) / 2;
          const worldX = dw + px * pieceCos - pz * pieceSin;
          const worldZ = dd + px * pieceSin + pz * pieceCos;
          return {
            x: worldX * seriCos + worldZ * seriSin,
            z: -worldX * seriSin + worldZ * seriCos,
          };
        });
        const xs = corners.map((corner) => corner.x);
        const zs = corners.map((corner) => corner.z);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minZ = Math.min(...zs);
        const maxZ = Math.max(...zs);
        const halfW = dims.w / 2;
        const halfD = dims.d / 2;
        const overlaps = maxX > -halfW && minX < halfW && maxZ > -halfD && minZ < halfD;
        const fullyInside = minX >= -halfW && maxX <= halfW && minZ >= -halfD && maxZ <= halfD;
        if (overlaps && !fullyInside) found.push({ piece, seri });
      });
    });
    return found;
  }

  function flownLift(piece) {
    const dims = pieceDims(piece);
    return clamp(finite(dims && dims.lift, 0), 0, 10);
  }

  function refreshBases(size, pieces = sc().pieces) {
    pieces.forEach((piece, i) => {
      if (piece.type === "light") { piece.base = 0; piece.supportId = null; return; }
      /* ポールは常に床から立てる。人の近くへ置くと、人の描画範囲（旗の姿勢は
         横に1m以上広がる）に「乗って」宙に浮いてしまうため、積み重ねの対象にしない。 */
      if (piece.type === "pole") { piece.base = 0; piece.supportId = null; return; }
      // せりは床の一部。ほかの駒に乗らず、上がっても床との接続を保つ
      if (piece.type === "seri") { piece.base = 0; piece.supportId = null; return; }
      if (isFlown(piece)) { piece.base = flownLift(piece); piece.supportId = null; return; }
      // 吊っているものの上には乗れない（宙に浮いた板の上に立たせない）
      /* せりだけは並び順を超えて支えの候補に入れる。駒は動かすと並びの
         最後へ回るため、順だけに頼ると「先に立たせた演者の下でせりを
         動かす・上げる」で演者が乗れなくなる。せりは床の一部で、
         高さ（seriH）が他の駒に依存しないので、循環は起きない。 */
      const candidates = pieces.slice(0, i).filter((p) => !isFlown(p))
        .concat(pieces.slice(i + 1).filter((p) => p.type === "seri"));
      const found = supportUnder(piece, size, candidates);
      piece.base = found.top;
      piece.supportId = found.holder;
      if (piece.type !== "performer") return;

      /* ポール。上に立つのではなく、手で付いて浮く（人間旗）。
         近く（0.55m以内）へ置いた演者は、握りの高さ poleH でポールへ付く。 */
      const pole = pieces.find((other) => other !== piece && other.type === "pole"
        && !isFlown(other)
        && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
      if (pole) {
        const top = (pieceDims(pole) || {}).h || 6;
        piece.supportId = pole.id;
        piece.base = clamp(finite(piece.poleH, 2.5), 0.8, Math.max(1, top - 0.4));
        return;
      }

      /* トラピーズ。バーの近く（0.55m以内）へ置いた演者はバーへ乗る。
         座る＝腰の握り(0.505H)がバー、ぶら下がる＝伸ばした手(1.15H)がバー。
         バーの地上高は吊りの lift から取る（並び順に依存させない）。
         低いバーで手が届いてしまう場合は base が0で止まり、
         床に立ったままバーを握る形になる（それで正しい）。 */
      const trap = pieces.find((other) => other !== piece && other.type === "trapeze"
        && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
      if (trap) {
        const H = pieceHeightM(piece) * (piece.size / 100);
        const grip = TRAP_GRIP[piece.trapMode === "hang" ? "hang" : "sit"];
        piece.supportId = trap.id;
        piece.base = Math.max(0, flownLift(trap) - grip * H);
        return;
      }

      /* エアリアルティシュー。布の近く（0.55m以内）へ置いた演者は布へ掴まる。
         掴む高さ（tissueH）は布の範囲へ収める。布は lift から下へ h だけ垂れている。
         体は握りの下へぶら下がるので、base は握りから身長比 1.15 を引いた高さ。
         低い位置を掴むと base が 0 で止まり、床に立って布を握る形になる（それで正しい）。 */
      const tissue = pieces.find((other) => other !== piece && other.type === "tissue"
        && Math.hypot((piece.u - other.u) * size.width, (piece.v - other.v) * size.depth) < 0.55);
      if (tissue) {
        const top = flownLift(tissue);
        const bottom = Math.max(0, top - ((pieceDims(tissue) || {}).h || 0));
        const grip = clamp(finite(piece.tissueH, 4), bottom, Math.max(bottom, top - 0.2));
        const H = pieceHeightM(piece) * (piece.size / 100);
        piece.supportId = tissue.id;
        piece.base = Math.max(0, grip - TRAP_GRIP.hang * H);
        return;
      }

      /* 椅子。座面の上に「立つ」と背もたれへ足が乗った絵になるので、
         腰が座面へ来る高さまで下げる（座る姿勢は refreshBases では変えず、
         描くときに performerRig が差し替える）。 */
      if (found.holder) {
        const holder = pieces.find((other) => other.id === found.holder);
        if (holder && holder.type === "chair") {
          const sitHip = 0.285 * pieceHeightM(piece) * (piece.size / 100);
          piece.base = Math.max(0, found.top - sitHip);
        }
      }
    });
  }

  /* 動かし始めた駒を並びのいちばん後ろへ回す。重なった相手の上に乗るため。
   * ただし、その駒に乗っているものは一緒に連れていく。
   * 連れていかないと、下の台をずらしただけで台が上の演者へ乗ってしまう。 */
  function bringToTop(piece) {
    const arr = sc().pieces;
    const carried = new Set([piece.id]);
    const load = [];
    arr.forEach((p) => {
      if (p === piece) return;
      if (p.supportId && carried.has(p.supportId)) { carried.add(p.id); load.push(p); }
    });
    const rest = arr.filter((p) => p !== piece && !carried.has(p.id));
    sc().pieces = rest.concat([piece], load);
  }

  // 駒の足元の画面位置。台に乗っていればその分だけ持ち上げる
  /* 描くときの居場所。転換の途中は途中の値を返す。
   * ★絵を描くところは全部ここを通す。駒の u/v を直に読むと、
   *   その経路だけ転換で瞬間移動する（実際に正面図の台がそうなっていた）。 */
  const pieceU = (piece) => (piece && piece.animU !== undefined ? piece.animU : piece.u);
  const pieceV = (piece) => (piece && piece.animV !== undefined ? piece.animV : piece.v);

  function placePiece(piece, L) {
    const pos = place(pieceU(piece), pieceV(piece), L);
    // 転換アニメの途中は、床からの高さも途中の値で描く（降りる・登るの表現）
    const base = piece.animBase !== undefined ? piece.animBase : (piece.base || 0);
    if (!base || L.plan) return pos;
    const rawY = pos.rawY - base * perMetre(pos, L).y;
    return Object.assign({}, pos, { rawY, y: L.tilt(rawY) });
  }

  /* 演者の関節を、画面の座標へ落とす。
   * 向きの角度だけ鉛直軸まわりに回してから、正射影で潰す。
   *   画面横 = x·cosθ + z·sinθ
   *   奥行き = -x·sinθ + z·cosθ （大きいほど客席に近い。重なりの順に使う）
   * θ=0 で客席を向く。 */
  /* 骨格を画面の座標へ落とす。姿勢・向き・尺・原点を渡せば、舞台の絵でも
   * 見本の絵でも同じ手順で組める。
   *   画面横 = x·cosθ + z·sinθ
   *   奥行き = -x·sinθ + z·cosθ （大きいほど手前。重なりの順に使う）
   * zDrop は「手前へ出た部位ほど少し下に来る」ぶん。舞台では床と同じ傾きを使う。 */
  function buildRig(poseId, originX, originY, ux, uy, yaw, zDrop, tilt) {
    const bend = tilt || ((y) => y);
    const pose = poseById(poseId);
    const joints = pose.joints;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const project = (jx, jy, jz) => {
      const wz = -jx * sin + jz * cos;
      // 実寸ぶんを積み上げてから傾ける。順を逆にすると、見上げても人の丈が変わらない
      return { x: originX + (jx * cos + jz * sin) * ux, y: bend(originY - jy * uy + wz * zDrop), z: wz };
    };
    const P = {};
    Object.keys(joints).forEach((k) => { P[k] = project(joints[k][0], joints[k][1], joints[k][2]); });

    /* 胴の厚み。肩・くびれ・腰の3段の断面を体の軸に沿って積み、その角を全部
     * 投影して外側をなぞる。断面の面は体の軸に直交させるので、寝ている姿勢では
     * 厚みが上下方向に出る。幅がどちらを向くかは姿勢が持つ（横向きは上下）。 */
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const shMid = mid(joints.shL, joints.shR);
    const hipMid = mid(joints.hipL, joints.hipR);
    const axis = norm3([hipMid[0] - shMid[0], hipMid[1] - shMid[1], hipMid[2] - shMid[2]]);
    const w0 = pose.wide;
    const dot = w0[0] * axis[0] + w0[1] * axis[1] + w0[2] * axis[2];
    let wide = norm3([w0[0] - axis[0] * dot, w0[1] - axis[1] * dot, w0[2] - axis[2] * dot]);
    if (!isFinite(wide[0])) wide = [0, 0, 1];
    const deep = norm3(cross3(axis, wide));

    /* 断面ごとに、中心と「幅」「厚み」の2本を画面へ落とす。
       外周はこの2本から楕円断面の張り出しとして出す（→ torsoOutline）。 */
    const ringAt = (c, ring) => {
      const at = (m) => project(c[0] + m[0], c[1] + m[1], c[2] + m[2]);
      const o = at([0, 0, 0]);
      const w = at([wide[0] * ring.halfX, wide[1] * ring.halfX, wide[2] * ring.halfX]);
      const d = at([deep[0] * ring.rz, deep[1] * ring.rz, deep[2] * ring.rz]);
      return { o, wx: w.x - o.x, wy: w.y - o.y, dx: d.x - o.x, dy: d.y - o.y };
    };
    // 首は肩→頭、胴は肩→腰。別々の軸に沿って積み、上から順に並べる
    const headJ = joints.head;
    const neckRings = NECK_RINGS.slice().reverse().map((ring) => ringAt([
      shMid[0] + (headJ[0] - shMid[0]) * ring.s,
      shMid[1] + (headJ[1] - shMid[1]) * ring.s,
      shMid[2] + (headJ[2] - shMid[2]) * ring.s,
    ], ring));
    /* 背中の丸み。断面の中心を、体の前後方向（deep の逆＝背中側）へ
       弓なりにずらす。肩と腰では0、真ん中でいちばん出る。
       ★背骨を折らずに丸みを出す唯一の手。姿勢が bow を持つときだけ効く。 */
    const bow = finite(pose.bow, 0);
    const rings = neckRings.concat(TORSO_RINGS.map((ring) => {
      const t = ring.t;
      const arc = bow ? Math.sin(Math.PI * clamp(t, 0, 1)) * bow : 0;
      return ringAt([
        shMid[0] + (hipMid[0] - shMid[0]) * t - deep[0] * arc,
        shMid[1] + (hipMid[1] - shMid[1]) * t - deep[1] * arc,
        shMid[2] + (hipMid[2] - shMid[2]) * t - deep[2] * arc,
      ], ring);
    }));

    /* 小道具。関節と同じ変換に通すので、向きを変えれば道具も一緒に回る。
     *   line … 2点を結ぶ棒（マイク、ギターの棹、自転車の骨組み）
     *   ring … 体の正面の面に立つ輪（車輪、フープ）
     *   dot  … 玉（ジャグリングの玉、車輪の芯）
     * 位置は関節と同じ体の座標（x=左右／y=上下／z=正面向き）。 */
    let props = null;
    if (pose.props && pose.props.length) {
      props = pose.props.map((prop) => {
        const out = { kind: prop.kind, r: prop.r || 0, w: prop.w || 0.02, tone: prop.tone || "gear" };
        if (prop.kind === "line") {
          out.a = project(prop.a[0], prop.a[1], prop.a[2]);
          out.b = project(prop.b[0], prop.b[1], prop.b[2]);
        } else {
          out.c = project(prop.c[0], prop.c[1], prop.c[2]);
          if (prop.kind === "ring") {
            const steps = 28;
            out.pts = [];
            for (let i = 0; i <= steps; i += 1) {
              const a = (i / steps) * Math.PI * 2;
              // 既定は体の正面の面に立つ輪。plane:"xz" は床と平行な輪（帽子のつばなど）
              out.pts.push(prop.plane === "xz"
                ? project(prop.c[0] + Math.cos(a) * prop.r, prop.c[1], prop.c[2] + Math.sin(a) * prop.r)
                : project(prop.c[0] + Math.cos(a) * prop.r, prop.c[1] + Math.sin(a) * prop.r, prop.c[2]));
            }
          }
        }
        return out;
      });
    }

    /* 道具の輪。体の正面の面（z=0）に立つ円なので、向きを変えると
     * 楕円につぶれ、真横からは一本の線になる。関節と同じ変換に通す。 */
    let wheel = null;
    if (pose.wheel) {
      const steps = 48;
      wheel = [];
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        wheel.push(project(Math.cos(a) * pose.wheel.r, pose.wheel.cy + Math.sin(a) * pose.wheel.r, 0));
      }
    }

    /* 目。顔の向きへ少し進んだ所から、耳と耳を結ぶ向き（wide）へ左右に開く。
       点を二つ置くと、一つのときより顔の向きがはっきり読める。
       離れ具合は瞳孔間63mmを身長で割った値（身長165cmで約6.3cm）。 */
    const f = pose.face;
    const head = joints.head;
    const faceAt = project(head[0] + f[0] * 0.05, head[1] + f[1] * 0.05, head[2] + f[2] * 0.05);
    const EYE_SEP = 0.019;
    const eyes = [-1, 1].map((side) => project(
      head[0] + f[0] * 0.048 + wide[0] * EYE_SEP * side,
      head[1] + f[1] * 0.048 + wide[1] * EYE_SEP * side,
      head[2] + f[2] * 0.048 + wide[2] * EYE_SEP * side));
    return { P, rings, ux, uy, faceAt, eyes, facing: f, wheel, props };
  }

  /* 何に乗っているか。"pole"＝ポールに付く／"chair"＝椅子に座る／null＝普通 */
  function mountKindOf(piece) {
    if (!piece || piece.type !== "performer" || !piece.supportId) return null;
    const holder = sc().pieces.find((other) => other.id === piece.supportId);
    if (!holder) return null;
    if (holder.type === "pole") return "pole";
    if (holder.type === "chair") return "chair";
    if (holder.type === "trapeze") return "trapeze";
    if (holder.type === "tissue") return "tissue";
    return null;
  }

  function performerRig(piece, pos, L) {
    const H = pieceHeightM(piece) * (piece.size / 100);
    const per = perMetre(pos, L);
    const zDrop = L.plan ? 0 : ((L.bottomY - L.floorY) / (L.size.depth || 9)) * H;
    /* ポールに付いている・椅子に座っているあいだは、姿勢は選べない。
       体の使い方が乗り物側で決まっているため（写真の実技と同じ形にする）。 */
    const mount = mountKindOf(piece);
    // 転換アニメの床の区間は歩く姿勢。乗り物の強制姿勢より優先する
    const poseId = piece.animPose ? piece.animPose
      : mount === "pole"
        ? (piece.poleSide === "L" ? "poleflag_l" : "poleflag_r")
        : mount === "trapeze"
          ? (piece.trapMode === "hang" ? "trapeze_hang" : "trapeze_sit")
          : mount === "tissue"
            ? "trapeze_hang"
          : (mount === "chair" ? "sit" : piece.pose);
    const rig = buildRig(poseId, pos.x, pos.rawY === undefined ? pos.y : pos.rawY,
      H * per.x, H * per.y, ((piece.facing || 0) * Math.PI) / 180, zDrop, L.plan ? null : L.tilt);
    rig.per = per;
    rig.H = H;
    return rig;
  }

  /* 骨格から体を塗る。手足は付け根から先へ細くなる線、胴は肩・くびれ・腰の
   * 断面を積んだ立体の外周。奥にあるものから塗り、奥の手足は色を沈ませる。
   * 舞台の絵でも姿勢の見本でも、ここを通す。 */
  function paintBody(target, rig, color) {
    const P = rig.P;
    const ux = rig.ux;
    const uy = rig.uy;

    /* 道具の輪は体より先に、輪の向こう側だけ塗る。手前側は体のあとに塗る。
     * 一本の線で一度に塗ると、人が輪の手前にいるのか奥にいるのか読めない。 */
    if (rig.wheel) paintWheel(target, rig, "far");

    const parts = LIMBS.map((limb) => ({
      kind: "limb", limb,
      z: limb.pts.reduce((t, k) => t + P[k].z, 0) / limb.pts.length,
    }));
    parts.push({ kind: "torso", z: (P.shL.z + P.shR.z + P.hipL.z + P.hipR.z) / 4 });
    parts.push({ kind: "head", z: P.head.z + 0.002 });
    parts.sort((a, b) => a.z - b.z);

    parts.forEach((part) => {
      if (part.kind === "limb") {
        const far = part.z < -0.02;
        target.fillStyle = far ? mixToward(color, 0.26) : color;
        const taper = LIMB_TAPER[part.limb.kind];
        const nodes = limbNodes(part.limb.pts.map((k) => P[k]), part.limb.kind);
        taperedChain(target, nodes, taper.map((r) => Math.max(0.8, r * ux)));
        // 手首から先／足首から先
        const from = P[part.limb.tip[0]];
        const to = P[part.limb.tip[1]];
        if (part.limb.kind === "arm") {
          /* 手。前腕の延長へ短く伸ばす。関節を持たないので、
             握りの形までは作らず、手のひらの塊として置く。 */
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const tip = { x: to.x + (dx / len) * HAND_LEN * ux, y: to.y + (dy / len) * HAND_LEN * ux };
          taperedChain(target, [to, lerpPt(to, tip, 0.55), tip],
            [Math.max(0.8, HAND_R * ux), Math.max(0.8, HAND_R * 1.05 * ux), Math.max(0.6, HAND_R * 0.62 * ux)]);
        } else {
          /* 足。踵をくるぶしより後ろへ出す。真正面からはつま先が
             こちらを向いて短く見え、真横からは足の長さが出る。 */
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const heel = { x: from.x - (dx / len) * HEEL_BACK * ux, y: from.y - (dy / len) * HEEL_BACK * ux * 0.35 };
          taperedChain(target, [heel, from, to],
            [Math.max(0.8, FOOT_R * 0.9 * ux), Math.max(0.8, FOOT_R * ux), Math.max(0.6, FOOT_R * 0.62 * ux)]);
        }
        return;
      }
      if (part.kind === "torso") {
        /* 胴。首から股まで断面を積んだ外周をそのままなぞる。
           ★凸包で取ってはいけない（くびれが埋まって樽になる）。 */
        target.fillStyle = color;
        smoothClosedPath(target, torsoOutline(rig.rings));
        target.fill();
        return;
      }
      /* 頭は首から頭への向きに沿った楕円。立っているときだけ縦長にしていたので、
       * 寝たり抱え込んだりすると形が崩れていた。長い方は顎から頭頂、
       * 短い方は耳から耳。首と頭がほぼ重なる姿勢では、そのまま立てておく。 */
      const nx = P.head.x - P.neck.x;
      const ny = P.head.y - P.neck.y;
      const len = Math.hypot(nx, ny);
      const angle = len > 0.4 ? Math.atan2(ny, nx) : -Math.PI / 2;
      /* 頭。長い方が顎から頭頂（身長の13.6%）、短い方が耳から耳（9.2%）。
         首は胴の一部として描いてあるので、ここに輪郭線は引かない。 */
      target.fillStyle = color;
      target.beginPath();
      target.ellipse(P.head.x, P.head.y,
        Math.max(1.2, 0.068 * ux), Math.max(1.1, 0.046 * ux), angle, 0, Math.PI * 2);
      target.fill();
      /* 目。こちら側にある方だけ出すので、横を向けば自然に一つになる。
         小さすぎて点にしか見えない大きさのときは、はじめから描かない。 */
      if (rig.eyes && 0.05 * ux > 3) {
        target.fillStyle = rgba("#0d0c0b", 0.5);
        target.beginPath();
        rig.eyes.forEach((eye) => {
          if (eye.z < P.head.z - 0.004) return;
          const r = Math.max(0.9, 0.0095 * ux);
          target.moveTo(eye.x + r, eye.y);
          target.arc(eye.x, eye.y, r, 0, Math.PI * 2);
        });
        target.fill();
      }
    });

    if (rig.wheel) paintWheel(target, rig, "near");
    if (rig.props) paintProps(target, rig);
  }

  /* 小道具。人の色ではなく道具の色で描く（人と持ち物を見分けるため）。
   * 玉だけは投げているものなので、少し明るく置く。 */
  const PROP_TONES = {
    gear: "rgba(214,220,226,0.85)",     // 金属・器具
    wood: "rgba(196,158,104,0.9)",      // 木・ギター
    ball: "rgba(233,220,180,0.95)",     // 投げている玉
    dark: "rgba(38,34,30,0.85)",        // タイヤ・板
  };

  function paintProps(target, rig) {
    const ux = rig.ux;
    target.save();
    target.lineCap = "round";
    target.lineJoin = "round";
    rig.props.forEach((prop) => {
      const tone = PROP_TONES[prop.tone] || PROP_TONES.gear;
      if (prop.kind === "line") {
        target.strokeStyle = tone;
        target.lineWidth = Math.max(1.2, prop.w * ux);
        target.beginPath();
        target.moveTo(prop.a.x, prop.a.y);
        target.lineTo(prop.b.x, prop.b.y);
        target.stroke();
        return;
      }
      if (prop.kind === "ring") {
        target.strokeStyle = tone;
        target.lineWidth = Math.max(1.2, prop.w * ux);
        target.beginPath();
        prop.pts.forEach((p, i) => { if (i) target.lineTo(p.x, p.y); else target.moveTo(p.x, p.y); });
        target.stroke();
        return;
      }
      target.fillStyle = tone;
      target.beginPath();
      target.arc(prop.c.x, prop.c.y, Math.max(1.5, prop.r * ux), 0, Math.PI * 2);
      target.fill();
    });
    target.restore();
  }

  /* 輪（シルホイール）。金属の輪なので人の色ではなく鈍い銀で描く。
   * 演者と同じ色にすると、人と道具の区別がつかなくなる。 */
  function paintWheel(target, rig, side) {
    const pts = rig.wheel;
    const width = Math.max(1.4, 0.022 * rig.ux);
    target.save();
    target.lineCap = "round";
    target.lineJoin = "round";
    target.lineWidth = width;
    target.strokeStyle = side === "far" ? "rgba(198,204,210,0.42)" : "rgba(222,228,234,0.86)";
    target.beginPath();
    let drawing = false;
    pts.forEach((p) => {
      const here = side === "far" ? p.z < 0 : p.z >= 0;
      if (!here) { drawing = false; return; }
      if (!drawing) { target.moveTo(p.x, p.y); drawing = true; } else { target.lineTo(p.x, p.y); }
    });
    target.stroke();
    target.restore();
  }

  // 正面から見た演者
  function drawPerformer(target, piece, pos, scale, L) {
    const rig = performerRig(piece, pos, L);
    const P = rig.P;
    target.save();

    // ポールやトラピーズで宙に浮いている間は、影を落とさない（床に居ないため）
    // 転換アニメで床を歩いている間（animBaseあり）は普通に影を落とす
    const mountHere = mountKindOf(piece);
    if ((mountHere === "pole" || mountHere === "trapeze") && piece.animBase === undefined) {
      paintBody(target, rig, piece.color);
      target.restore();
      return;
    }

    // 影。いちばん低い関節の真下へ落とす
    let low = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    Object.keys(P).forEach((k) => {
      low = Math.max(low, P[k].y);
      minX = Math.min(minX, P[k].x);
      maxX = Math.max(maxX, P[k].x);
    });
    target.fillStyle = "rgba(0,0,0,0.26)";
    target.beginPath();
    target.ellipse((minX + maxX) / 2, low + 0.012 * rig.uy,
      Math.max(3, (maxX - minX) / 2 + 0.03 * rig.ux), Math.max(1.2, 0.022 * rig.uy), 0, 0, Math.PI * 2);
    target.fill();

    paintBody(target, rig, piece.color);
    target.restore();
  }


  /* 舞台の床の上のある一点を、画面のどこに置くかを実寸で引く。
   * 駒の中心 (u,v) から、間口方向へ dw メートル、奥方向へ dd メートル
   * ずれた床の点を返す。place() をそのまま通すので、床の1m枡と必ず一致する。
   * 以前は固定の斜めベクトル一本で奥行きを表していたため、舞台の左右どちらに
   * 置いても同じ角度に倒れてしまい、平面図と食い違っていた。 */
  function floorPoint(piece, dw, dd, L) {
    const u = pieceU(piece) + dw / L.size.width;
    const v = pieceV(piece) - dd / L.size.depth;      // 奥へ行くほど v は小さい
    const p = place(u, v, L);
    // 台の上に乗っていれば、四隅ごとその高さから立ち上げる
    const base = piece.base || 0;
    if (!base || L.plan) return p;
    const rawY = p.rawY - base * perMetre(p, L).y;
    return Object.assign({}, p, { rawY, y: L.tilt(rawY) });
  }

  /* 直方体の部品をひとつ塗る。部品の中心は駒の中心から (ox, oz) メートルずれ、
   * 床から lift メートル浮いた位置に、幅 w・奥行き d・高さ h で立つ。
   * 四隅は place() で床の点として引くので、床の1m枡と遠近が一致する。 */
  function paintBox(target, piece, L, part) {
    const rad = ((piece.facing || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const at = (ux, uy) => {
      const lx = part.ox + ux;
      const ly = part.oz + uy;
      const dw = lx * cos - ly * sin;
      const dd = lx * sin + ly * cos;
      const p = floorPoint(piece, dw, dd, L);
      const per = perMetre(p, L);
      const bend = L.plan ? ((y) => y) : L.tilt;
      const raw = p.rawY === undefined ? p.y : p.rawY;
      return {
        x: p.x,
        y: bend(raw - part.lift * per.y),
        top: bend(raw - (part.lift + part.h) * per.y),
        depth: dd,
      };
    };
    const hw = part.w / 2;
    const hd = part.d / 2;
    const base = [at(-hw, -hd), at(hw, -hd), at(hw, hd), at(-hw, hd)];
    const top = base.map((c) => ({ x: c.x, y: c.top }));
    const tint = part.tint === undefined ? 1 : part.tint;

    target.strokeStyle = rgba(piece.color, 0.28 * tint);
    target.lineWidth = 1.5;

    /* 側面のうち、客席へ顔を向けている面だけを塗る。
     * 面 i→j の外向き法線は、辺ベクトル e に対して (e.y, -e.x)。
     * その y 成分が負（＝客席側を向く）なら見えている。 */
    const faces = [];
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      const ex = base[j].x - base[i].x;
      const ey = base[j].depth - base[i].depth;
      const len = Math.hypot(ex, ey) || 1;
      const lit = ex / len;                       // 1=真正面、0=真横、負=裏
      if (lit <= 0.001) continue;
      faces.push({ i, j, lit, mid: (base[i].depth + base[j].depth) / 2 });
    }
    faces.sort((a, b) => b.mid - a.mid);          // 奥の面から先に塗る

    faces.forEach((f) => {
      target.fillStyle = rgba(piece.color, (0.46 + f.lit * 0.54) * tint);
      target.beginPath();
      target.moveTo(base[f.i].x, base[f.i].y);
      target.lineTo(base[f.j].x, base[f.j].y);
      target.lineTo(top[f.j].x, top[f.j].y);
      target.lineTo(top[f.i].x, top[f.i].y);
      target.closePath();
      target.fill();
      target.stroke();
    });

    // 天面
    target.fillStyle = rgba(piece.color, 0.78 * tint);
    target.beginPath();
    top.forEach((c, i) => (i ? target.lineTo(c.x, c.y) : target.moveTo(c.x, c.y)));
    target.closePath();
    target.fill();
    target.stroke();
  }

  /* 台・テーブル・椅子は、直方体の部品の組み合わせとして持つ。
   * 部品はそれぞれ実寸なので、天板の厚みや脚の太さも寸法に連動して変わる。 */
  function pieceParts(piece) {
    const d = pieceDims(piece);
    if (!d) return null;
    if (piece.type === "seri") {
      const seriH = clamp(finite(piece.seriH, 0), 0, 4);
      // 床と同じ高さでは立体を作らない。床面の輪郭は drawSolid が描く
      if (seriH < 0.02) return [];
      return [{ ox: 0, oz: 0, w: d.w, d: d.d, h: seriH, lift: 0, tint: 1 }];
    }
    if (piece.type === "block") {
      return [{ ox: 0, oz: 0, w: d.w, d: d.d, h: d.h, lift: 0, tint: 1 }];
    }
    if (piece.type === "wall") {
      const owner = pieceSet(piece);
      /* フレーム＝穴の空いた壁。上下と左右の4本の枠で作る。
       * 中を人がくぐれる大きさにしたいので、枠は幅・高さの2割ほどに収める。 */
      if (owner && owner.framed) {
        const b = clamp(Math.min(d.w, d.h) * 0.16, 0.08, 0.5);
        const inner = Math.max(0.1, d.h - b * 2);
        return [
          { ox: 0, oz: 0, w: d.w, d: d.d, h: b, lift: 0, tint: 0.9 },
          { ox: 0, oz: 0, w: d.w, d: d.d, h: b, lift: Math.max(0, d.h - b), tint: 1 },
          { ox: -(d.w - b) / 2, oz: 0, w: b, d: d.d, h: inner, lift: b, tint: 0.95 },
          { ox: (d.w - b) / 2, oz: 0, w: b, d: d.d, h: inner, lift: b, tint: 0.95 },
        ];
      }
      return [{ ox: 0, oz: 0, w: d.w, d: d.d, h: d.h, lift: 0, tint: 1 }];
    }
    if (piece.type === "table") {
      const top = clamp(d.h * 0.09, 0.03, 0.08);              // 天板の厚み
      const leg = clamp(Math.min(d.w, d.d) * 0.07, 0.04, 0.1); // 脚の太さ
      const inset = leg * 1.2;
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (d.w / 2 - inset - leg / 2),
        oz: sy * (d.d / 2 - inset - leg / 2),
        w: leg, d: leg, h: Math.max(0.05, d.h - top), lift: 0, tint: 0.7,
      }));
      parts.push({ ox: 0, oz: 0, w: d.w, d: d.d, h: top, lift: Math.max(0, d.h - top), tint: 1 });
      return parts;
    }
    /* ---------- サーカスの道具 ---------- */
    if (piece.type === "trapeze") {
      // バー一本。吊りのロープは吊物の描画（drawSolid）が引く
      return [{ kind: "line", a: [-d.w / 2, 0.03, 0], b: [d.w / 2, 0.03, 0], w: 0.05, tone: "gear" }];
    }
    if (piece.type === "tissue") {
      /* 二本の布。吊り点（駒の位置＝床からの高さ）から下へ垂れる。
       * 上は一点に集まってすぼまり、裾は床の手前でわずかに流れる。
       * まっすぐな平行線二本だと布ではなく棒に見える。 */
      const drop = d.h;
      const parts = [];
      [-1, 1].forEach((s) => {
        const x = (s * d.w) / 2;
        parts.push({ kind: "line", a: [x * 0.25, 0, 0], b: [x, -drop * 0.12, 0], w: 0.09, tone: "cloth" });
        parts.push({ kind: "line", a: [x, -drop * 0.12, 0], b: [x, -drop * 0.92, 0], w: 0.13, tone: "cloth" });
        parts.push({ kind: "line", a: [x, -drop * 0.92, 0], b: [x + s * 0.1, -drop, 0], w: 0.15, tone: "cloth" });
      });
      return parts;
    }
    if (piece.type === "cyrwheel") {
      // 床に立った輪。転がる道具なので、床に触れる位置に置く
      const r = d.dia / 2;
      return [{ kind: "ring", c: [0, r, 0], r, w: 0.05, tone: "gear" }];
    }
    if (piece.type === "pole") {
      /* 床から立つ一本のポール。足元の台座と、頂部の受けを持つ。
       * 太さは0.05mまでに抑える（前の既定0.06で保存された駒にも効かせる）。
       * 頂部を切りっぱなしにすると、描き終わっていない線に見える。 */
      const pw = Math.min(d.w, 0.05);
      return [
        { kind: "disc", c: [0, 0, 0], r: 0.22, h: 0.05, tint: 0.8 },
        { kind: "line", a: [0, 0.04, 0], b: [0, d.h, 0], w: pw, tone: "gear" },
        { kind: "line", a: [-0.07, d.h, 0], b: [0.07, d.h, 0], w: pw * 0.9, tone: "gear" },
      ];
    }
    if (piece.type === "teeter") {
      /* コリアン・ティーターボード。A字の架台（4本脚と軸）の頂点を
       * 支点にして板がかしぎ、両端に踏み台が浮いて付く。
       * 板は必ず支点の頂点を通す（箱を斜線が貫くと道具に見えない）。 */
      const h = Math.max(0.2, d.h);
      const half = Math.max(0.6, d.w / 2);
      const boardW = 0.07;                                  // 板の厚み
      const spread = clamp(h * 0.8, 0.25, 0.7);             // 脚の開き（板と同じ向き）
      const zleg = Math.max(0.08, d.d / 2 - 0.02);          // 脚の開き（奥行き）
      const lowY = 0.12;                                    // 下がった端の高さ
      const pivotY = h + boardW / 2;
      const slope = (pivotY - lowY) / half;
      const highY = pivotY + slope * half;
      const parts = [];
      // 架台。前後2枚のA字と、頂点をつなぐ軸
      [-zleg, zleg].forEach((z) => {
        parts.push({ kind: "line", a: [-spread, 0, z], b: [0, h, z], w: 0.055, tone: "gear" });
        parts.push({ kind: "line", a: [spread, 0, z], b: [0, h, z], w: 0.055, tone: "gear" });
      });
      parts.push({ kind: "line", a: [0, h, -zleg], b: [0, h, zleg], w: 0.07, tone: "gear" });
      // 板。支点の上を通る一枚
      parts.push({ kind: "line", a: [-half, lowY, 0], b: [half, highY, 0], w: boardW, tone: "wood" });
      /* 両端の踏み台。板と平行の踏み板を小さな柱（ライザー）で持ち上げる。
       * 柱なしで浮かせると、離れて見たとき踏み板が宙に漂って見える。 */
      const unit = Math.hypot(1, slope);
      const nx = (-slope / unit) * 0.08;
      const ny = (1 / unit) * 0.08;
      const pad = Math.min(0.5, half * 0.28);
      [-1, 1].forEach((s) => {
        const outer = s * half;                    // 板の端
        const inner = s * (half - pad);            // 踏み板の内側の端
        const yOuter = s < 0 ? lowY : highY;
        const yInner = yOuter - slope * (outer - inner);
        parts.push({ kind: "line", a: [inner + nx, yInner + ny, 0], b: [outer + nx, yOuter + ny, 0], w: 0.05, tone: "wood" });
        // 踏み板を支える柱。内外の2本で板とつなぐ
        [[inner, yInner], [outer, yOuter]].forEach(([bx, by]) => {
          parts.push({ kind: "line", a: [bx, by, 0], b: [bx + nx, by + ny, 0], w: 0.035, tone: "wood" });
        });
      });
      return parts;
    }
    if (piece.type === "wire") {
      /* 綱と、両端の支柱。支柱は前後へ脚を開いて立ち、
       * 綱の張りを受ける控えを外側の床へ取る（棒2本では自立して見えない）。 */
      const h = d.h;
      const parts = [{ kind: "line", a: [-d.w / 2, h, 0], b: [d.w / 2, h, 0], w: 0.03, tone: "gear" }];
      [-1, 1].forEach((s) => {
        const x = (s * d.w) / 2;
        parts.push({ kind: "line", a: [x, 0, 0], b: [x, h, 0], w: 0.055, tone: "dark" });
        parts.push({ kind: "line", a: [x, h * 0.4, 0], b: [x, 0, -0.32], w: 0.04, tone: "dark" });
        parts.push({ kind: "line", a: [x, h * 0.4, 0], b: [x, 0, 0.32], w: 0.04, tone: "dark" });
        parts.push({ kind: "line", a: [x, h, 0], b: [x + s * h * 0.55, 0.02, 0], w: 0.02, tone: "gear" });
      });
      return parts;
    }
    if (piece.type === "suitcase") {
      // 箱と、上の取っ手
      return [
        { ox: 0, oz: 0, w: d.w, d: d.d, h: d.h, lift: 0, tint: 1 },
        { kind: "line", a: [-d.w * 0.16, d.h + 0.09, 0], b: [d.w * 0.16, d.h + 0.09, 0], w: 0.035, tone: "dark" },
        { kind: "line", a: [-d.w * 0.16, d.h, 0], b: [-d.w * 0.16, d.h + 0.09, 0], w: 0.03, tone: "dark" },
        { kind: "line", a: [d.w * 0.16, d.h, 0], b: [d.w * 0.16, d.h + 0.09, 0], w: 0.03, tone: "dark" },
      ];
    }
    if (piece.type === "trampoline") {
      /* 枠・跳ぶ面・脚。枠と面を一枚の板にすると、脚の付いた天板＝テーブルと
       * 見分けがつかない。四辺の枠を残し、その内側の面を一段下げる。
       * 脚は外へ開く（実物も八の字に踏ん張っている）。 */
      const rail = clamp(Math.min(d.w, d.d) * 0.07, 0.08, 0.16);   // 枠の幅
      const railH = 0.1;                                            // 枠の厚み
      const legH = Math.max(0.1, d.h - railH);
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        parts.push({ kind: "line",
          a: [sx * (d.w / 2 - rail / 2), legH, sz * (d.d / 2 - rail / 2)],
          b: [sx * (d.w / 2 + 0.1), 0, sz * (d.d / 2 + 0.1)],
          w: 0.055, tone: "gear" });
      });
      // 跳ぶ面。枠の内側で、枠の上面より下げて張る
      parts.push({
        ox: 0, oz: 0,
        w: Math.max(0.1, d.w - rail * 2), d: Math.max(0.1, d.d - rail * 2),
        h: 0.03, lift: legH + railH * 0.35, tint: 0.55,
      });
      // 四辺の枠
      [[0, -1], [0, 1]].forEach(([, sz]) => parts.push({
        ox: 0, oz: sz * (d.d - rail) / 2, w: d.w, d: rail, h: railH, lift: legH, tint: 1,
      }));
      [[-1, 0], [1, 0]].forEach(([sx]) => parts.push({
        ox: sx * (d.w - rail) / 2, oz: 0, w: rail, d: Math.max(0.1, d.d - rail * 2),
        h: railH, lift: legH, tint: 0.92,
      }));
      return parts;
    }
    if (piece.type === "cane") {
      // 二本の cane。それぞれ丸い台座の上に立ち、頂部は手で握るT字
      const parts = [];
      [-1, 1].forEach((sx) => {
        const x = (sx * d.w) / 2;
        parts.push({ kind: "disc", c: [x, 0, 0], r: 0.1, h: 0.04, tint: 0.7 });
        parts.push({ kind: "line", a: [x, 0.04, 0], b: [x, d.h, 0], w: 0.045, tone: "gear" });
        parts.push({ kind: "line", a: [x - 0.06, d.h, 0], b: [x + 0.06, d.h, 0], w: 0.05, tone: "gear" });
      });
      return parts;
    }
    if (piece.type === "car") {
      // 車体と客室、両側の車輪
      const bodyH = d.h * 0.52;
      const wheelR = Math.min(d.h * 0.24, 0.36);
      const parts = [
        { ox: 0, oz: 0, w: d.w, d: d.d, h: bodyH, lift: wheelR * 0.6, tint: 1 },
        { ox: 0, oz: -d.w * 0.04, w: d.w * 0.52, d: d.d * 0.92, h: d.h - bodyH - wheelR * 0.6, lift: bodyH + wheelR * 0.6, tint: 0.8 },
      ];
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => parts.push({
        kind: "ring", c: [sx * (d.w / 2 - wheelR * 1.1), wheelR, sz * (d.d / 2 - 0.02)],
        r: wheelR, w: 0.12, tone: "dark",
      })));
      return parts;
    }
    if (piece.type === "stool") {
      /* 丸い座面と、外へ開いた3本の脚。椅子より小さく、背もたれを持たない。
       * 座面を角の板、脚を真下の角材にすると、小さなベンチと同じ形になって
       * 見分けがつかない。丸い面と開いた脚が、この道具の分かりやすい印。 */
      const top = clamp(d.h * 0.09, 0.025, 0.06);
      const seatR = Math.max(0.1, d.w / 2);
      const legTop = Math.max(0.05, d.h - top);
      const parts = [];
      [[0, -1], [-0.87, 0.5], [0.87, 0.5]].forEach(([sx, sz]) => {
        // 上は座面の内寄り、下は座面より外へ開く（据わりの良い形）
        parts.push({ kind: "line",
          a: [sx * seatR * 0.55, legTop, sz * seatR * 0.55],
          b: [sx * seatR * 1.05, 0, sz * seatR * 1.05],
          w: 0.035, tone: "gear" });
      });
      // 脚をつなぐ貫。3本脚が横へ泳がないように、足元の少し上で結ぶ
      parts.push({ kind: "ring", plane: "xz",
        c: [0, Math.max(0.06, d.h * 0.28), 0], r: seatR * 0.8, w: 0.022, tone: "gear" });
      parts.push({ kind: "disc", c: [0, legTop, 0], r: seatR, h: top, tint: 1 });
      return parts;
    }
    if (piece.type === "bench") {
      // 横長の座面と、両端に寄せた脚。背もたれは持たない
      const top = clamp(d.h * 0.14, 0.03, 0.07);
      const leg = clamp(Math.min(d.w, d.d) * 0.12, 0.04, 0.09);
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (d.w / 2 - leg * 1.6),
        oz: sy * (d.d / 2 - leg * 0.9),
        w: leg, d: leg, h: Math.max(0.05, d.h - top), lift: 0, tint: 0.7,
      }));
      parts.push({ ox: 0, oz: 0, w: d.w, d: d.d, h: top, lift: Math.max(0, d.h - top), tint: 1 });
      return parts;
    }
    if (piece.type === "chair") {
      const H = d.h;                       // 背もたれの上端まで
      const w = H * CHAIR_W;
      const dp = H * CHAIR_D;
      const seatH = H * 0.5;               // 座面の高さ
      const slab = clamp(H * 0.055, 0.025, 0.06);
      const leg = clamp(H * 0.05, 0.022, 0.055);
      const parts = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => parts.push({
        ox: sx * (w / 2 - leg / 2), oz: sy * (dp / 2 - leg / 2),
        w: leg, d: leg, h: Math.max(0.05, seatH - slab), lift: 0, tint: 0.66,
      }));
      // 座面
      parts.push({ ox: 0, oz: 0, w, d: dp, h: slab, lift: Math.max(0, seatH - slab), tint: 0.95 });
      // 背もたれ。facing=0 で客席を向くので、背は奥側（oz が正）へ置く
      parts.push({ ox: 0, oz: dp / 2 - slab / 2, w, d: slab, h: Math.max(0.05, H - seatH), lift: seatH, tint: 0.84 });
      return parts;
    }
    return null;
  }

  /* 正面図の右上に、客席のどこから見ているかを小さな平面で出す。
   * 正面の絵だけでは「どこから見た絵か」が字でしか分からないので、図で示す。
   * 額縁のある劇場（客席が正面だけ）でのみ意味を持つので、そこに限る。 */
  function drawSeatMap(target, L) {
    const seat = L.seat;
    if (!seat || !seat.plan) return;
    const pad = 22;
    const w = 214;
    const h = 152;
    const x = W - w - pad;
    const y = pad;

    target.save();
    // 下の絵が透けないよう、いったん敷く
    target.fillStyle = "rgba(9,8,7,0.82)";
    target.fillRect(x, y, w, h);
    target.strokeStyle = "rgba(156,130,63,0.34)";
    target.lineWidth = 1;
    target.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const inX = x + 14;
    const inW = w - 28;
    const stageH = 30;
    const stageY = y + 14;
    const houseY = stageY + stageH + 8;
    const balconyH = 26;
    const houseH = h - (houseY - y) - balconyH - 20;

    // 舞台
    target.fillStyle = "rgba(168,75,38,0.3)";
    target.fillRect(inX, stageY, inW, stageH);
    target.strokeStyle = "rgba(168,75,38,0.55)";
    target.strokeRect(inX + 0.5, stageY + 0.5, inW - 1, stageH - 1);
    target.fillStyle = "rgba(239,231,214,0.62)";
    target.font = "11px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = "center";
    target.textBaseline = "middle";
    target.fillText(tx("舞台"), inX + inW / 2, stageY + stageH / 2);

    // 1階席と2階席
    target.fillStyle = "rgba(239,231,214,0.06)";
    target.fillRect(inX, houseY, inW, houseH);
    target.strokeStyle = "rgba(239,231,214,0.16)";
    target.strokeRect(inX + 0.5, houseY + 0.5, inW - 1, houseH - 1);
    const balconyY = houseY + houseH + 6;
    target.fillStyle = "rgba(239,231,214,0.04)";
    target.fillRect(inX, balconyY, inW, balconyH);
    target.strokeRect(inX + 0.5, balconyY + 0.5, inW - 1, balconyH - 1);
    target.fillStyle = "rgba(239,231,214,0.3)";
    target.font = "9.5px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.fillText(tx("2階"), inX + inW / 2, balconyY + balconyH / 2);

    // 見ている位置
    const onBalcony = seat.plan.tier === "balcony";
    const px = inX + seat.plan.x * inW;
    const py = onBalcony
      ? balconyY + balconyH / 2
      : houseY + seat.plan.y * houseH;

    // 視線。舞台の中心へ向かう三角で、どちらを向いているかを出す。
    // 見回している席では、振ったぶんだけ狙いをずらす
    const aim = L.panRange > 0 ? -clamp(state.frontPan || 0, -1, 1) : 0;
    /* ★aimX を tx と名付けてはいけない。外の tx（訳語引き）を関数まるごと
     * 影で隠し、上の fillText(tx("舞台")) がTDZで落ちる（実際に落とした）。 */
    const aimX = inX + inW * (0.5 + aim * 0.42);
    const aimY = stageY + stageH / 2;
    const ang = Math.atan2(aimY - py, aimX - px);
    const spread = 0.34;
    const reach = Math.hypot(aimX - px, aimY - py);
    const cone = target.createLinearGradient(px, py, aimX, aimY);
    cone.addColorStop(0, "rgba(211,172,89,0.3)");
    cone.addColorStop(1, "rgba(211,172,89,0.02)");
    target.fillStyle = cone;
    target.beginPath();
    target.moveTo(px, py);
    target.lineTo(px + Math.cos(ang - spread) * reach, py + Math.sin(ang - spread) * reach);
    target.lineTo(px + Math.cos(ang + spread) * reach, py + Math.sin(ang + spread) * reach);
    target.closePath();
    target.fill();

    target.fillStyle = "#d3ac59";
    target.beginPath();
    target.arc(px, py, 4.5, 0, Math.PI * 2);
    target.fill();

    // 席の名前
    target.fillStyle = "rgba(239,231,214,0.72)";
    target.font = "10.5px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textBaseline = "top";
    target.fillText(seatName(seat), x + w / 2, balconyY + balconyH + 5);
    target.restore();
  }

  // 台・テーブル・椅子。部品を奥から順に塗る
  function drawSolid(target, piece, pos, scale, L) {
    const diabolo = piece.type === "diabolo";
    const parts = diabolo ? null : pieceParts(piece);
    if (!diabolo && !parts) return;
    const flown = isFlown(piece);
    target.save();

    // 下がり切ったせりは床面の継ぎ目だけ。高さのある板を置かない
    if (piece.type === "seri" && parts.length === 0) {
      const foot = pieceFootprint(piece);
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      target.strokeStyle = rgba(piece.color, 0.62);
      target.lineWidth = 1;
      target.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
        const lx = (sx * foot.w) / 2;
        const ly = (sy * foot.d) / 2;
        const p = floorPoint(piece, lx * cos - ly * sin, lx * sin + ly * cos, L);
        if (i) target.lineTo(p.x, p.y); else target.moveTo(p.x, p.y);
      });
      target.closePath();
      target.stroke();
      target.restore();
      return;
    }

    /* 吊物はワイヤーで天井から下がっている。上へ伸びる2本の線で吊りを示す。
     * 取り付く場所は道具ごとに違うので flownRig から取る（駒の向きにも従う）。
     * 影は落とさない（床に触れていないので、接地の影は嘘になる）。 */
    if (flown && !L.plan) {
      const dim = pieceDims(piece);
      const centre = floorPoint(piece, 0, 0, L);
      const rig = flownRig(piece, dim);
      const owner = pieceSet(piece);
      const wires = owner && Number(owner.wires) === 1 ? 1 : 2;
      const ceilY = Math.max(0, L.backY - 6);
      target.strokeStyle = "rgba(226,232,238,0.5)";
      target.lineWidth = 1;
      (wires === 1 ? [0] : [-1, 1]).forEach((s) => {
        const foot = riggingPoint(piece, s * rig.half, rig.y, 0, L);
        target.beginPath();
        target.moveTo(foot.x, foot.y);
        target.lineTo(centre.x + (foot.x - centre.x) * rig.converge, ceilY);
        target.stroke();
      });
    }

    // 影は床の占有面積そのまま。吊物には落とさない
    const foot = flown ? null : pieceFootprint(piece);
    if (foot) {
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      target.fillStyle = "rgba(0,0,0,0.3)";
      target.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
        const lx = (sx * foot.w) / 2;
        const ly = (sy * foot.d) / 2;
        const p = floorPoint(piece, lx * cos - ly * sin, lx * sin + ly * cos, L);
        if (i) target.lineTo(p.x, p.y + 3); else target.moveTo(p.x, p.y + 3);
      });
      target.closePath();
      target.fill();
    }

    if (diabolo) {
      drawDiabolo(target, piece, L);
      target.restore();
      return;
    }

    parts.forEach((part) => {
      if (part.kind === "disc") paintDisc(target, piece, L, part);
      else if (part.kind === "line" || part.kind === "ring") paintRigging(target, piece, L, part);
      else paintBox(target, piece, L, part);
    });
    target.restore();
  }

  /* 吊りのロープが道具のどこへ取り付き、上でどれだけ寄るか。
   * half=取り付く左右の位置（m）、y=その高さ（m）、converge=天井での寄り具合。
   * トラピーズはバーの両端から真上へ平行に上がる。内側へ寄せて描くと
   * バーが宙に浮いた別の吊物に見え、人がバーへ乗る絵とも合わない。
   * ティシューは一点で吊るので、布の集まる位置から上で絞る。 */
  function flownRig(piece, dim) {
    const w = (dim && dim.w) || 1;
    if (piece.type === "trapeze") return { half: w / 2, y: 0.03, converge: 1 };
    if (piece.type === "tissue") return { half: w * 0.25, y: 0, converge: 0.25 };
    return { half: Math.max(0.12, (w / 2) * 0.62), y: (dim && dim.h) || 0, converge: 0.55 };
  }

  /* 駒の座標（左右lx・高さly・奥行きlz、メートル）を画面へ落とす。
   * 箱の四隅と同じ道（floorPoint）を通るので、床の1m枡と遠近が一致する。 */
  function riggingPoint(piece, lx, ly, lz, L) {
    const rad = ((piece.facing || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const p = floorPoint(piece, lx * cos - lz * sin, lx * sin + lz * cos, L);
    if (L.plan) return { x: p.x, y: p.y };
    return { x: p.x, y: L.tilt(p.rawY - ly * perMetre(p, L).y) };
  }

  /* ディアボロ。軸に沿って実寸の断面円を並べ、その外形を一枚の曲面として塗る。
   * 輪だけではなく、くびれからカップの縁へ広がる量感を見せる。 */
  function drawDiabolo(target, piece, L) {
    const d = pieceDims(piece);
    if (!d) return;
    const R = d.dia / 2;
    const len = d.w;
    const AX = Math.max(0.006, R * 0.13);
    const WAIST = 0.14;
    const HALF_SAMPLES = 16;
    const radiusAt = (t) => {
      const a = Math.abs(t);
      if (a <= WAIST) return AX;
      const k = (a - WAIST) / (1 - WAIST);
      /* 指数を小さくするほど、くびれのすぐ横で一気に開いて縁の手前で寝る。
       * 0.62では側面がほぼ直線になり、お椀ではなく漏斗に見えた（実機で確認）。
       * 実物のカップは直径11.5cmに対し深さが6cm程度の浅い椀なので、この速さで開く。 */
      return AX + (R - AX) * Math.pow(k, 0.38);
    };
    const sections = [];
    for (let i = -HALF_SAMPLES; i <= HALF_SAMPLES; i += 1) {
      const t = i / HALF_SAMPLES;
      sections.push({ t, r: radiusAt(t) });
    }
    const traceClosed = (first, second) => {
      target.beginPath();
      first.forEach((p, i) => (i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y)));
      second.forEach((p) => target.lineTo(p.x, p.y));
      target.closePath();
    };
    const strokeAxis = (a, b) => {
      const per = perMetre(floorPoint(piece, 0, 0, L), L);
      target.save();
      target.strokeStyle = rgba(piece.color, 1);
      target.lineWidth = Math.max(1, AX * 2 * per.x);
      target.lineCap = "round";
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
      target.restore();
    };
    const strokeRing = (pointAt, color, from = 0, to = Math.PI * 2) => {
      const steps = 32;
      target.strokeStyle = color;
      target.lineWidth = 1;
      target.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const a = from + ((to - from) * i) / steps;
        const p = pointAt(a);
        if (i) target.lineTo(p.x, p.y); else target.moveTo(p.x, p.y);
      }
      if (to - from >= Math.PI * 2 - 0.001) target.closePath();
      target.stroke();
    };

    target.save();
    target.lineJoin = "round";
    target.strokeStyle = "rgba(0,0,0,0.35)";
    target.lineWidth = 1;

    if (piece.diaboloMode === "stand") {
      const left = sections.map(({ t, r }) => riggingPoint(piece, -r, ((t + 1) / 2) * len, 0, L));
      const right = sections.map(({ t, r }) => riggingPoint(piece, r, ((t + 1) / 2) * len, 0, L));
      const axis = sections.map(({ t }) => riggingPoint(piece, 0, ((t + 1) / 2) * len, 0, L));

      target.fillStyle = rgba(piece.color, 0.82);
      traceClosed(left, right.slice().reverse());
      target.fill();
      target.stroke();

      target.fillStyle = "rgba(0,0,0,0.16)";
      traceClosed(left, axis.slice().reverse());
      target.fill();

      strokeAxis(
        riggingPoint(piece, 0, ((-WAIST + 1) / 2) * len, 0, L),
        riggingPoint(piece, 0, ((WAIST + 1) / 2) * len, 0, L));

      const ringPoint = (ly) => (a) => riggingPoint(piece,
        Math.cos(a) * R, ly, Math.sin(a) * R, L);
      const topRing = ringPoint(len);
      target.fillStyle = "rgba(0,0,0,0.22)";
      target.beginPath();
      for (let i = 0; i <= 32; i += 1) {
        const p = topRing((i / 32) * Math.PI * 2);
        if (i) target.lineTo(p.x, p.y); else target.moveTo(p.x, p.y);
      }
      target.closePath();
      target.fill();
      strokeRing(topRing, rgba(piece.color, 0.95));
      strokeRing(ringPoint(0), rgba(piece.color, 0.95));
      target.restore();
      return;
    }

    const top = sections.map(({ t, r }) => riggingPoint(piece, (t * len) / 2, R + r, 0, L));
    const bottom = sections.map(({ t, r }) => riggingPoint(piece, (t * len) / 2, R - r, 0, L));
    const axis = sections.map(({ t }) => riggingPoint(piece, (t * len) / 2, R, 0, L));

    target.fillStyle = rgba(piece.color, 0.82);
    traceClosed(top, bottom.slice().reverse());
    target.fill();
    target.stroke();

    target.fillStyle = "rgba(0,0,0,0.16)";
    traceClosed(axis, bottom.slice().reverse());
    target.fill();

    strokeAxis(
      riggingPoint(piece, (-WAIST * len) / 2, R, 0, L),
      riggingPoint(piece, (WAIST * len) / 2, R, 0, L));

    const rad = ((piece.facing || 0) * Math.PI) / 180;
    const nearStart = Math.cos(rad) >= 0 ? Math.PI / 2 : -Math.PI / 2;
    [-1, 1].forEach((side) => {
      const rim = (a) => riggingPoint(piece,
        (side * len) / 2, R + Math.sin(a) * R, Math.cos(a) * R, L);
      strokeRing(rim, rgba(piece.color, 0.5));
      strokeRing(rim, rgba(piece.color, 0.95), nearStart, nearStart + Math.PI);
    });
    target.restore();
  }

  /* 綱・ロープ・輪など、箱では表せない部品。
   * 舞台の道具は板とパイプと布と綱でできているので、箱だけでは足りない。 */
  /* 床と平行の円板。丸い座面・丸い台座など、角を持たない面に使う。
   * 箱で代えると、小さな丸物が四角い塊にしか見えない（スツールの座面が
   * ベンチの天板と同じ形になっていた）。
   * 厚み h があれば、下の面をひとつ暗く敷いて縁の立ち上がりを出す。 */
  function paintDisc(target, piece, L, part) {
    const tint = part.tint === undefined ? 1 : part.tint;
    const steps = 28;
    const ring = (y) => {
      target.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * Math.PI * 2;
        const q = riggingPoint(piece,
          part.c[0] + Math.cos(t) * part.r, y, part.c[2] + Math.sin(t) * part.r, L);
        if (i) target.lineTo(q.x, q.y); else target.moveTo(q.x, q.y);
      }
      target.closePath();
    };
    target.save();
    target.lineWidth = 1.5;
    target.strokeStyle = rgba(piece.color, 0.28 * tint);
    const h = part.h || 0;
    if (h > 0) {
      // 縁。上の面より暗くして、板に厚みがあることを示す
      target.fillStyle = rgba(piece.color, 0.5 * tint);
      ring(part.c[1]);
      target.fill();
      target.stroke();
    }
    target.fillStyle = rgba(piece.color, 0.78 * tint);
    ring(part.c[1] + h);
    target.fill();
    target.stroke();
    target.restore();
  }

  function paintRigging(target, piece, L, part) {
    const per = perMetre(floorPoint(piece, 0, 0, L), L);
    const width = Math.max(1, (part.w || 0.04) * per.x);
    const tone = part.tone === "wood" ? "rgba(196,158,104,0.95)"
      : part.tone === "cloth" ? rgba(piece.color, 0.85)
      // 暗い床の上でも輪郭が読める程度に、真っ黒から半歩持ち上げる
      : part.tone === "dark" ? "rgba(64,57,50,0.95)"
      : "rgba(214,220,226,0.9)";
    target.save();
    target.lineCap = part.kind === "ring" ? "butt" : "round";
    target.lineJoin = "round";
    target.strokeStyle = tone;
    target.lineWidth = width;
    target.beginPath();
    if (part.kind === "line") {
      const a = riggingPoint(piece, part.a[0], part.a[1], part.a[2], L);
      const b = riggingPoint(piece, part.b[0], part.b[1], part.b[2], L);
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
    } else {
      const steps = 32;
      for (let i = 0; i <= steps; i += 1) {
        const t = (i / steps) * Math.PI * 2;
        // 既定は正面に立つ輪。xz は床と平行、yz は横向きの輪
        const q = part.plane === "xz"
          ? riggingPoint(piece, part.c[0] + Math.cos(t) * part.r, part.c[1], part.c[2] + Math.sin(t) * part.r, L)
          : part.plane === "yz"
            ? riggingPoint(piece, part.c[0], part.c[1] + Math.sin(t) * part.r, part.c[2] + Math.cos(t) * part.r, L)
          : riggingPoint(piece, part.c[0] + Math.cos(t) * part.r, part.c[1] + Math.sin(t) * part.r, part.c[2], L);
        if (i) target.lineTo(q.x, q.y); else target.moveTo(q.x, q.y);
      }
    }
    target.stroke();
    target.restore();
  }

  // 球。直径と、床からの高さを実寸（m）で持つ。
  // 床から離れている場合は、どれだけ浮いているかを破線の目安で示す。
  function drawSphere(target, piece, pos, scale, L) {
    const dim = pieceDims(piece);
    const per = perMetre(pos, L);
    const bend = L.plan ? ((y) => y) : L.tilt;
    const raw = pos.rawY === undefined ? pos.y : pos.rawY;
    const rx = Math.max(4, (dim.dia / 2) * per.x);
    const ry = Math.max(4, (dim.dia / 2) * per.y);
    // 中心の高さを傾ける前に決めてから傾ける。上下の半径は傾け後の差から取る
    const cy = bend(raw - dim.lift * per.y - ry);
    const ryTilt = Math.max(3, Math.abs(bend(raw - dim.lift * per.y) - cy));

    target.save();
    target.fillStyle = "rgba(0,0,0,0.3)";
    target.beginPath();
    target.ellipse(pos.x, pos.y + 5, rx * 1.02, Math.max(3, ry * 0.22), 0, 0, Math.PI * 2);
    target.fill();

    if (dim.lift > 0.05) {
      target.strokeStyle = rgba(piece.color, 0.34);
      target.lineWidth = 1.5;
      target.setLineDash([5, 5]);
      target.beginPath();
      target.moveTo(pos.x, pos.y);
      target.lineTo(pos.x, cy + ryTilt);
      target.stroke();
      target.setLineDash([]);
    }

    // 丸みは陰影で出す。左上から光が当たっているものとして、右下へ落とす
    const shade = target.createRadialGradient(
      pos.x - rx * 0.36, cy - ryTilt * 0.4, Math.max(1, rx * 0.08),
      pos.x, cy, Math.max(rx, ryTilt));
    shade.addColorStop(0, rgba(piece.color, 1));
    shade.addColorStop(0.55, rgba(piece.color, 0.88));
    shade.addColorStop(1, rgba(piece.color, 0.42));
    target.fillStyle = shade;
    target.strokeStyle = rgba(piece.color, 0.3);
    target.lineWidth = 1.5;
    target.beginPath();
    target.ellipse(pos.x, cy, rx, ryTilt, 0, 0, Math.PI * 2);
    target.fill();
    target.stroke();
    target.restore();
  }

  /* 明かりの高さのある点の縦位置（傾ける前）。
     床の線は奥行きで動くが、奥の壁の天井の線は一本の横線で動かない。
     実寸のまま v ごとの縮尺で持ち上げると、同じ高さの灯体が奥行きの操作で
     上下に泳いで見える（本人の指摘）。床と天井の線の間を高さの割合で埋め、
     h=会場の高さなら、どの奥行きでも天井の線の上に乗るようにする。 */
  function raiseRaw(rawFloor, hMetres, L) {
    return rawFloor + (L.rawCeilY - rawFloor) * ((hMetres || 0) / (L.size.height || 8));
  }

  /* 明かりの灯体の位置を画面へ落とす。平面ならその点、正面なら床から h だけ持ち上げる。 */
  function beamSource(piece, L) {
    const b = piece.beam || normalizeBeam(null, piece);
    // 転換の途中は灯体も一緒に動かす。当たる場所だけ動くと光が伸び縮みして見える
    const p = place(
      piece.animBeamU === undefined ? b.u : piece.animBeamU,
      piece.animBeamV === undefined ? b.v : piece.animBeamV, L);
    if (L.plan) return { x: p.x, y: p.y };
    return { x: p.x, y: L.tilt(raiseRaw(p.rawY, b.h, L)) };
  }

  // 明かりが当たる点。床とは限らない（下から上への明かりでは宙にある）
  function beamTarget(piece, pos, L) {
    const b = piece.beam || normalizeBeam(null, piece);
    if (L.plan || !b.toH) return { x: pos.x, y: pos.y };
    return { x: pos.x, y: L.tilt(raiseRaw(pos.rawY, b.toH, L)) };
  }

  /* 光の実際の終点。灯体(高さh)→当たる点(高さtoH)の線を実寸のまま延長し、
     床（高さ0）に着く所を終点にする。床より先に袖の幕・奥や手前・天井に
     着くならそこで止める（hh>0＝幕などへの丸い当たり）。
     ★正面と平面の両方がこれを使う。片方だけだと二つの図で終点が食い違う。 */
  function beamLanding(piece, size) {
    const b = piece.beam || normalizeBeam(null, piece);
    const su = piece.animBeamU === undefined ? b.u : piece.animBeamU;
    const sv = piece.animBeamV === undefined ? b.v : piece.animBeamV;
    const au = pieceU(piece);
    const av = pieceV(piece);
    let tEnd = Infinity;
    if (b.h > b.toH + 0.01) tEnd = b.h / (b.h - b.toH);                          // 床に着く倍率
    else if (b.toH > b.h + 0.01) tEnd = ((size.height || 8) - b.h) / (b.toH - b.h);  // 下から上は天井まで
    // 幕より外へは延ばさない。横（袖幕）と奥・手前で手前に丸める
    const cutAt = (from, to, limit) => (Math.abs(to - from) < 1e-6 ? Infinity : (limit - from) / (to - from));
    [cutAt(su, au, au > su ? 1.12 : -0.12), cutAt(sv, av, av > sv ? 1.12 : -0.02)]
      .forEach((t) => { if (t > 0 && t < tEnd) tEnd = t; });
    if (!isFinite(tEnd)) tEnd = 1;
    tEnd = Math.max(1, tEnd);   // 少なくとも当たる点までは届く（終点を袖の外へ引いた明かりなど）
    return { tEnd,
      eu: su + (au - su) * tEnd,
      ev: sv + (av - sv) * tEnd,
      hh: Math.max(0, b.h + (b.toH - b.h) * tEnd) };
  }

  /* 光の帯の縁。実物の明かりは切り口が硬くならず、外側に薄い光（半影）が残る。
   * 出しかたは「帯の断面（進む向きと直角）にグラデーションを当てる」一手だけ。
   * 塗りは今までどおり一枚で済むので、灯体が増えても描く手間は変わらない。
   *   ・filter:"blur()" … 一枚ごとに画面外の絵を作り直すので転換で目に見えて重い
   *   ・太さ違いの帯を重ねる … 塗る面積が枚数ぶん増える。GPUが効かない機械で
   *     1フレームの予算を超えた（実測: 灯体9台で 8.9ms → 28.5ms）
   * 断面の濃さ。0=帯の左端 / 0.5=芯 / 1=右端。芯を濃く、両端で消す。 */
  const BEAM_EDGE = [[0, 0], [0.18, 0.30], [0.5, 1], [0.82, 0.30], [1, 0]];
  // 芯の外側に半影を持たせるぶん、帯の幅そのものを少し広げる
  const BEAM_SOFT = 1.26;

  function drawLight(target, piece, pos, scale, L) {
    // 照明の円の直径を実寸（m）で持つ。床の1m枡で広さを読めるようにするため
    const dim = pieceDims(piece);
    const per = perMetre(pos, L);
    const spread = Math.max(6, ((dim && dim.dia) || 4) / 2 * per.x);
    const src = beamSource(piece, L);
    const hit = beamTarget(piece, pos, L);
    const lit = tool === "light";
    const picked = piece.id === selectedId;
    /* 光の強さ。塗りの濃さをまとめて割り増し・割り引きする。
       輪郭線（当たる点の輪・出どころの線）は操作の印なので強さに連動させない */
    // 転換フェードの途中は途中の強さで塗る（0まで許す＝消えゆく明かり）
    const glow = piece.animGlow !== undefined
      ? clamp(finite(piece.animGlow, 1), 0, 1.5)
      : clamp(finite(piece.glow, 1), 0.1, 1.5);
    const ga = (a) => Math.min(1, a * glow);

    if (L.plan) {
      /* 平面でも、光の落ちる円は「実際の終点」に描く（beamLanding）。
         ★以前は当たる点（toHの高さ）で円を描いていたため、SSのように途中の
           高さを狙う明かりで、正面図は反対側の幕まで光が伸びるのに、
           平面図は途中で止まる——二つの図の終点が食い違っていた（本人の指摘）。 */
      const land = beamLanding(piece, L.size);
      const endPos = place(land.eu, land.ev, L);
      const spreadEnd = Math.max(6, ((dim && dim.dia) || 4) / 2 * L.pxPerM * land.tEnd);
      target.save();
      // 幕・壁への当たり（宙で終わる光）は床の円より薄く描く
      const pool = target.createRadialGradient(endPos.x, endPos.y, 0, endPos.x, endPos.y, spreadEnd);
      pool.addColorStop(0, rgba(piece.color, ga(land.hh > 0.05 ? 0.2 : 0.34)));
      pool.addColorStop(1, rgba(piece.color, 0));
      target.fillStyle = pool;
      target.beginPath();
      target.arc(endPos.x, endPos.y, spreadEnd, 0, Math.PI * 2);
      target.fill();
      // 灯体が真上にないときだけ、出どころを見せる（真上なら線が点になる）
      const off = Math.hypot(src.x - endPos.x, src.y - endPos.y) > 6;
      if (off || lit || picked) {
        target.strokeStyle = rgba(piece.color, lit || picked ? 0.7 : 0.34);
        target.lineWidth = 1.2;
        target.setLineDash([5, 5]);
        target.beginPath();
        target.moveTo(src.x, src.y);
        target.lineTo(endPos.x, endPos.y);
        target.stroke();
        target.setLineDash([]);
        drawFixture(target, src, piece, lit || picked);
      }
      /* 掴む場所の輪。掴むのは必ず「光の終着点」（本人の指定）。
         道具が明かりのときと選択中に、終着点へ破線の輪で示す */
      if (lit || picked) {
        target.strokeStyle = rgba(piece.color, 0.55);
        target.setLineDash([4, 4]);
        target.lineWidth = 1.2;
        target.beginPath();
        target.arc(endPos.x, endPos.y, Math.max(10, ((dim && dim.dia) || 4) / 2 * L.pxPerM), 0, Math.PI * 2);
        target.stroke();
        target.setLineDash([]);
      }
      target.restore();
      return;
    }

    /* 正面では、灯体から当たる場所へ広がる帯として描く。
     * ★帯の裾は「光の進む向きと直角」ではなく、床に落ちた円の左右の端へ着ける。
     *   直角に取ると、斜めから差し込むほど裾が床の下へ潜り込み、
     *   光が床を突き抜けたり、逆に床まで届いていないように見える。 */
    /* 灯体は点として扱い、そこから床の円の左右の端へ広がる三角で描く。
     * ★灯体側にも幅を持たせて四角で描くと、光源側の左右と床側の左右が
     *   逆に繋がる角度があり、面が捻れて✗の形になっていた。
     *   点から広がる三角なら、どの角度でも捻れようがない。 */
    /* ★帯と床の円を、一つの輪郭として塗る。
     * 別々に塗ると、帯の裾の水平な線が円を上下に切ってしまい、
     * 「半円が二つ繋がっている」ように見えていた（上半分だけ帯が重なるため）。
     * 帯の裾を円の下半分の弧でつなぎ、帯は着地の手前で薄れさせる。 */
    /* ★光は「当たる高さ」で止まらない。顔向け・体向けの明かり（toH>0）も、
     *   体を過ぎた光は床か幕まで進んで、そこに落ちる。当たる高さで帯を切ると
     *   光の輪が宙に浮いて見える（実際にそう見えていた）。
     *   終点の計算は平面と共通（beamLanding）。二つの図で同じ場所に落とす。 */
    const land = beamLanding(piece, L.size);
    const endPos = place(land.eu, land.ev, L);
    const perEnd = perMetre(endPos, L);
    const end = { x: endPos.x, y: L.tilt(raiseRaw(endPos.rawY, land.hh, L)) };
    // 光の円錐は灯体から先へ行くほど開く。終点の広さは距離の倍率で伸ばす
    const spreadEnd = Math.max(6, ((dim && dim.dia) || 4) / 2 * perEnd.x * land.tEnd);
    const onFloor = land.hh < 0.05;
    const ry = Math.max(3, 32 * scale);
    /* 帯の断面に濃さの山を作る。芯が濃く、左右の縁で消えるので、
       輪郭が線で切れずにふわっと終わる。塗りは一枚のまま。 */
    const halfW = spreadEnd * BEAM_SOFT;
    const bx = end.x - src.x;
    const by = end.y - src.y;
    const blen = Math.hypot(bx, by) || 1;
    const nx = (-by / blen) * halfW;      // 進む向きと直角
    const ny = (bx / blen) * halfW;
    const gradient = target.createLinearGradient(
      end.x - nx, end.y - ny, end.x + nx, end.y + ny);
    BEAM_EDGE.forEach(([at, weight]) => {
      gradient.addColorStop(at, rgba(piece.color, ga(0.15 * weight)));
    });
    target.save();
    target.globalCompositeOperation = "screen";
    target.fillStyle = gradient;
    target.beginPath();
    target.moveTo(src.x, src.y);
    target.lineTo(end.x + halfW, end.y);
    if (onFloor) {
      // 円の下半分をなぞって左端へ回り込む。ここで輪郭が一続きになる
      target.ellipse(end.x, end.y, halfW, ry * BEAM_SOFT, 0, 0, Math.PI);
    } else {
      // 幕・壁・天井で終わる帯。裾はまっすぐ切る（面に当たって止まる）
      target.lineTo(end.x - halfW, end.y);
    }
    target.closePath();
    target.fill();
    /* 明るいのは床に落ちた円そのもの。帯はそこへ吸い込まれる。
       ★横や上へ抜けて床に着かない光（幕・壁・天井で終わる）は、円を作らない。
         丸い当たりを描くと光る玉に見えて不自然だった（本人の指定）。
         帯が薄れて終わるだけにする。 */
    if (onFloor) {
      /* 床の円も、いちばん外の帯と同じところまで薄く伸ばす。
         中心の明るさと大きさは変えず、外側に半影だけを足す
         （帯の裾だけ柔らかく、円の縁は硬いままだと、境目が線で出てしまう）。 */
      const poolR = spreadEnd * BEAM_SOFT;
      const pool = target.createRadialGradient(end.x, end.y, 0, end.x, end.y, poolR);
      pool.addColorStop(0, rgba(piece.color, ga(0.34)));
      pool.addColorStop(0.55 / BEAM_SOFT, rgba(piece.color, ga(0.16)));
      pool.addColorStop(1 / BEAM_SOFT, rgba(piece.color, ga(0.05)));
      pool.addColorStop(1, rgba(piece.color, 0));
      target.fillStyle = pool;
      target.beginPath();
      target.ellipse(end.x, end.y, poolR, ry * BEAM_SOFT, 0, 0, Math.PI * 2);
      target.fill();
    }
    /* 正面には「当たる点」の輪を出さない（何の印か分からないと言われた）。
       狙いの調整は平面図の終着点の輪と、選んだもののスライダーで行う。 */
    target.globalCompositeOperation = "source-over";
    if (lit || picked) drawFixture(target, src, piece, true);
    target.restore();
  }

  // 灯体そのもの。光を動かすときだけ出す小さな印
  function drawFixture(target, at, piece, strong) {
    target.save();
    target.fillStyle = rgba(piece.color, strong ? 0.9 : 0.45);
    target.strokeStyle = "rgba(13,12,11,0.65)";
    target.lineWidth = 1;
    target.beginPath();
    target.arc(at.x, at.y, 7, 0, Math.PI * 2);
    target.fill();
    target.stroke();
    target.restore();
  }

  // 平面図。上から見るので、肩幅と向きが読めるように描く。
  // 実寸で描く: 肩幅は身長のおよそ1/4、厚みはその半分ほど。
  function drawPlanPiece(target, piece, pos, scale, L) {
    target.save();
    if (piece.type === "performer") {
      // 姿勢ごとの実際の占有範囲で描く。寝ていれば床を長く取る
      // 転換アニメの途中は、表示中の姿勢（前の姿勢や歩き）の広さで描く
      const H = pieceHeightM(piece) * (piece.size / 100);
      const ext = poseExtent(piece.animPose || piece.pose);
      const halfW = Math.max(4, ext.halfX * H * L.pxPerM);
      const halfD = Math.max(4, ext.halfZ * H * L.pxPerM);
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      target.translate(pos.x, pos.y);
      /* 0度＝客席（画面の下）を向く。
       * 平面は「上が奥・下が客席」なので、正面図と同じ回り方にするには符号が逆になる。
       * rotate(+θ) にすると、向き90°の演者が正面図では右を向くのに
       * 平面図の三角は左を指す。 */
      target.rotate(-rad);
      target.translate(ext.cx * H * L.pxPerM, ext.cz * H * L.pxPerM);
      target.fillStyle = piece.color;
      target.strokeStyle = "rgba(0,0,0,0.4)";
      target.lineWidth = 1.4;
      target.beginPath();
      target.ellipse(0, 0, halfW, halfD, 0, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      // 向きの印。体の前側へ出す
      target.fillStyle = "rgba(13,12,11,0.55)";
      target.beginPath();
      target.moveTo(-halfW * 0.3, halfD * 0.4);
      target.lineTo(halfW * 0.3, halfD * 0.4);
      target.lineTo(0, halfD * 1.35);
      target.closePath();
      target.fill();
    } else if (piece.type === "diabolo") {
      /* 実寸だけでは指で掴めないため、形を保ったまま画面上の下限を設ける。
         向きは正面図と同じ符号で回し、置き方を替えても一緒に追従させる。 */
      const d = pieceDims(piece);
      const stand = piece.diaboloMode === "stand";
      const r = Math.max(stand ? 6 : 5, (d.dia / 2) * L.pxPerM);
      target.translate(pos.x, pos.y);
      target.rotate(-((piece.facing || 0) * Math.PI) / 180);
      target.fillStyle = piece.color;
      target.strokeStyle = "rgba(0,0,0,0.4)";
      target.lineWidth = 1.4;
      if (stand) {
        target.beginPath();
        target.arc(0, 0, r, 0, Math.PI * 2);
        target.fill();
        target.stroke();
        target.fillStyle = "rgba(13,12,11,0.58)";
        target.beginPath();
        target.arc(0, 0, r * 0.3, 0, Math.PI * 2);
        target.fill();
      } else {
        const half = Math.max(7, (d.w / 2) * L.pxPerM);
        target.strokeStyle = piece.color;
        target.lineWidth = 3;
        target.beginPath();
        target.moveTo(-half, 0);
        target.lineTo(half, 0);
        target.stroke();
        target.fillStyle = piece.color;
        target.strokeStyle = "rgba(0,0,0,0.4)";
        target.lineWidth = 1.4;
        [-half, half].forEach((x) => {
          target.beginPath();
          target.arc(x, 0, r, 0, Math.PI * 2);
          target.fill();
          target.stroke();
        });
      }
    } else if (piece.type === "trapeze") {
      /* 吊りバー。真上からは0.06mの線にしかならず、見えない・掴めないと
         言われた。バーを太い丸端の線で、ロープの吊り点を両端の丸で描く。 */
      const foot = pieceFootprint(piece);
      const w = Math.max(24, foot.w * L.pxPerM);
      target.translate(pos.x, pos.y);
      target.rotate(-((piece.facing || 0) * Math.PI) / 180);
      target.strokeStyle = piece.color;
      target.lineCap = "round";
      target.lineWidth = 5;
      target.beginPath();
      target.moveTo(-w / 2, 0);
      target.lineTo(w / 2, 0);
      target.stroke();
      target.fillStyle = piece.color;
      target.strokeStyle = "rgba(0,0,0,0.4)";
      target.lineWidth = 1.4;
      [-w / 2, w / 2].forEach((x) => {
        target.beginPath();
        target.arc(x, 0, 5, 0, Math.PI * 2);
        target.fill();
        target.stroke();
      });
    } else if (SOLID_TYPES[piece.type]) {
      // 真上から見るので、幅と奥行きがそのまま床の占有面積になる。向きも効く
      const foot = pieceFootprint(piece);
      const w = Math.max(5, foot.w * L.pxPerM);
      const d = Math.max(5, foot.d * L.pxPerM);
      target.translate(pos.x, pos.y);
      target.rotate(-((piece.facing || 0) * Math.PI) / 180);   // 演者と同じ回り方にそろえる
      target.fillStyle = piece.color;
      target.fillRect(-w / 2, -d / 2, w, d);
      target.strokeStyle = "rgba(0,0,0,0.3)";
      target.lineWidth = 1.5;
      if (piece.type === "seri") target.setLineDash([6, 4]);
      target.strokeRect(-w / 2, -d / 2, w, d);
      if (piece.type === "seri") target.setLineDash([]);
      // 椅子は背もたれの側を濃くして、座る向きを分かるようにする。背は正面の反対側
      if (piece.type === "chair") {
        target.fillStyle = "rgba(13,12,11,0.4)";
        target.fillRect(-w / 2, -d / 2, w, d * 0.2);
      }
      // どちらが正面かの印
      target.fillStyle = "rgba(13,12,11,0.45)";
      target.beginPath();
      target.moveTo(-w * 0.13, d / 2);
      target.lineTo(w * 0.13, d / 2);
      target.lineTo(0, d / 2 + Math.min(w, d) * 0.32);
      target.closePath();
      target.fill();
    } else if (piece.type === "sphere") {
      const dim = pieceDims(piece);
      const r = Math.max(5, (dim.dia / 2) * L.pxPerM);
      target.fillStyle = rgba(piece.color, 0.9);
      target.strokeStyle = "rgba(0,0,0,0.3)";
      target.lineWidth = 1.5;
      target.beginPath();
      target.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      target.fill();
      target.stroke();
      // 浮いている球は、床に落ちる位置だけを点線で示す
      if (dim.lift > 0.05) {
        target.strokeStyle = rgba(piece.color, 0.4);
        target.lineWidth = 1;
        target.setLineDash([4, 4]);
        target.beginPath();
        target.arc(pos.x, pos.y, r * 1.28, 0, Math.PI * 2);
        target.stroke();
        target.setLineDash([]);
      }
    }
    target.restore();
  }

  function selectionBounds(piece, L) {
    const pos = placePiece(piece, L);
    const scale = pieceScale(piece, pos, L);
    const dim = pieceDims(piece);
    if (L.plan) {
      if (SOLID_TYPES[piece.type]) {
        const rad = ((piece.facing || 0) * Math.PI) / 180;
        const foot = pieceFootprint(piece);
        const w = foot.w * L.pxPerM;
        const d = foot.d * L.pxPerM;
        /* 細いもの（トラピーズのバー、綱）は箱の中心を保ったまま最小幅まで
           太らせる。以前は w/h だけ広げていたため、箱が中心から下へずれていた。 */
        const pad = piece.type === "trapeze" ? 13 : 6;
        const ex = Math.max(pad, (Math.abs(w * Math.cos(rad)) + Math.abs(d * Math.sin(rad))) / 2);
        const ey = Math.max(pad, (Math.abs(w * Math.sin(rad)) + Math.abs(d * Math.cos(rad))) / 2);
        return { x: pos.x - ex, y: pos.y - ey, w: ex * 2, h: ey * 2 };
      }
      if (piece.type === "sphere") {
        const r = Math.max(10, (dim.dia / 2) * L.pxPerM);
        return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
      }
      if (piece.type === "performer") {
        const H = pieceHeightM(piece) * (piece.size / 100);
        const ext = poseExtent(piece.pose);
        const rad = ((piece.facing || 0) * Math.PI) / 180;
        const c = Math.abs(Math.cos(rad));
        const sn = Math.abs(Math.sin(rad));
        const ex = Math.max(10, (ext.halfX * c + ext.halfZ * sn) * H * L.pxPerM);
        const ey = Math.max(10, (ext.halfX * sn + ext.halfZ * c) * H * L.pxPerM);
        return { x: pos.x - ex, y: pos.y - ey, w: ex * 2, h: ey * 2 };
      }
      /* 明かりは「光の終着点」を掴む（本人の指定）。当たる点が途中の高さでも、
         掴む場所は必ず光が実際に落ちる所。掴んだときの差分は駒(当たる点)との
         ずれとして保たれるので、引けば終着点が指に付いてくる。 */
      if (piece.type === "light") {
        const land = beamLanding(piece, L.size);
        const at = place(land.eu, land.ev, L);
        const r = Math.max(10, (((dim && dim.dia) || 4) / 2) * L.pxPerM);
        return { x: at.x - r, y: at.y - r, w: r * 2, h: r * 2 };
      }
      const r = Math.max(10, (((dim && dim.dia) || 2) / 2) * L.pxPerM);
      return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
    }
    const st = pos.stretch || 1;
    const per = perMetre(pos, L);
    if (piece.type === "light") {
      const r = Math.max(10, (((dim && dim.dia) || 4) / 2) * per.x);
      return { x: pos.x - r, y: pos.y - r * 0.32, w: r * 2, h: r * 0.64 };
    }
    if (SOLID_TYPES[piece.type]) {
      // 描画と同じ手順で四隅を引き、その外接矩形を枠にする
      const foot = pieceFootprint(piece);
      const height = piece.type === "seri" ? pieceTopLocal(piece) : dim.h;
      const rad = ((piece.facing || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const xs = [];
      const ys = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const ux = (sx * foot.w) / 2;
        const uy = (sy * foot.d) / 2;
        const p = floorPoint(piece, ux * cos - uy * sin, ux * sin + uy * cos, L);
        xs.push(p.x);
        ys.push(p.y, p.y - height * perMetre(p, L).y);
      });
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      return { x: x0, y: y0, w: Math.max(14, Math.max(...xs) - x0), h: Math.max(14, Math.max(...ys) - y0) };
    }
    if (piece.type === "sphere") {
      const rx = Math.max(7, (dim.dia / 2) * per.x);
      const ry = Math.max(7, (dim.dia / 2) * per.y);
      const top = pos.y - dim.lift * per.y - ry * 2;
      return { x: pos.x - rx, y: top, w: rx * 2, h: pos.y - top };
    }
    // 演者。描画と同じ手順で関節を投影し、その外接に手足の太さを足す
    const rig = performerRig(piece, pos, L);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    Object.keys(rig.P).forEach((k) => {
      x0 = Math.min(x0, rig.P[k].x); x1 = Math.max(x1, rig.P[k].x);
      y0 = Math.min(y0, rig.P[k].y); y1 = Math.max(y1, rig.P[k].y);
    });
    const padX = 0.04 * rig.ux;
    const padY = 0.04 * rig.uy;
    return { x: x0 - padX, y: y0 - padY, w: Math.max(12, x1 - x0 + padX * 2), h: Math.max(12, y1 - y0 + padY * 2) };
  }

  /* 動線。始点（駒）から行き先へ、二次曲線で引いて先に矢を付ける。
   * 曲がり具合は真ん中の control 点ひとつで決まる。直線から始めて、
   * 掴んで曲げれば回り込みになる——舞台で人が動く道はたいてい弧を描く。 */
  /* route を外から渡せる形。はけの自動動線（まだ piece.route に無い仮の線）にも
     同じ取っ手・同じ当たり判定を使うため。 */
  function routePointsFor(piece, route, L) {
    const at = place(pieceU(piece), pieceV(piece), L);
    const to = place(route.u, route.v, L);
    const ctrl = place(route.bu, route.bv, L);
    /* 演者の足元からいきなり線を出すと、駒と矢印がくっついて読みにくい。
     * 出だしの向きへ少しだけ離してから引き始める。 */
    const gap = 13;
    const dx = ctrl.x - at.x;
    const dy = ctrl.y - at.y;
    const len = Math.hypot(dx, dy);
    const from = len > gap * 1.6
      ? { x: at.x + (dx / len) * gap, y: at.y + (dy / len) * gap }
      : at;
    return { from, to, ctrl, at };
  }
  const routePoints = (piece, L) => routePointsFor(piece, piece.route, L);

  // 二次曲線の上の点。矢の向きを出すのに使う
  function quadAt(a, c, b, t) {
    const k = 1 - t;
    return {
      x: k * k * a.x + 2 * k * t * c.x + t * t * b.x,
      y: k * k * a.y + 2 * k * t * c.y + t * t * b.y,
    };
  }

  // 一本の動線を描く。picked のときは取っ手つき。route は piece.route でも仮の線でもよい
  function drawOneRoute(target, L, piece, route, picked) {
    const { from, to, ctrl } = routePointsFor(piece, route, L);
    {
      target.save();
      target.strokeStyle = rgba(piece.color, picked ? 0.95 : 0.62);
      target.lineWidth = picked ? 4 : 3.2;
      target.lineCap = "round";
      target.setLineDash(picked ? [] : [9, 6]);
      target.beginPath();
      target.moveTo(from.x, from.y);
      target.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y);
      target.stroke();
      target.setLineDash([]);

      // 矢。終点の少し手前の向きで向きを決める
      const near = quadAt(from, ctrl, to, 0.94);
      const ang = Math.atan2(to.y - near.y, to.x - near.x);
      const head = picked ? 17 : 15;
      target.fillStyle = rgba(piece.color, picked ? 0.95 : 0.66);
      target.beginPath();
      target.moveTo(to.x, to.y);
      target.lineTo(to.x - Math.cos(ang - 0.42) * head, to.y - Math.sin(ang - 0.42) * head);
      target.lineTo(to.x - Math.cos(ang + 0.42) * head, to.y - Math.sin(ang + 0.42) * head);
      target.closePath();
      target.fill();

      // 選んでいるあいだは、曲げる取っ手と行き先の取っ手を出す
      if (picked) {
        const mid = quadAt(from, ctrl, to, 0.5);
        [[mid, 6.5, "曲げる"], [to, 5.5, "行き先"]].forEach(([pt, r]) => {
          target.fillStyle = "#0d0c0b";
          target.strokeStyle = "#d3ac59";
          target.lineWidth = 2;
          target.beginPath();
          target.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          target.fill();
          target.stroke();
        });
      }
      target.restore();
    }
  }

  function arrowPlanePref() {
    return prefs.arrowPlane === "air" ? "air" : "floor";
  }

  function arrowDepthPref() {
    return clamp(finite(prefs.arrowDepth, 0.5), 0, 1);
  }

  function arrowHeadsPref() {
    return prefs.arrowHeads === "both" ? "both" : "one";
  }

  function arrowColorPref() {
    return validColor(prefs.arrowColor, "#d3ac59");
  }

  // 保存された点を、正面／平面それぞれで実際に描く線へ変える。
  function arrowScreenPoints(arrow, L) {
    if (L.plan && arrow.plane === "air") {
      const values = arrow.points.map((point) => point.a);
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const tail = arrow.points[arrow.points.length - 1];
      const near = arrow.points[Math.max(0, arrow.points.length - 4)];
      const forward = tail.a - near.a || tail.a - arrow.points[0].a;
      const left = place(lo, arrow.depth, L);
      const right = place(hi, arrow.depth, L);
      return forward < 0 ? [right, left] : [left, right];
    }
    return arrow.points.map((point) => arrow.plane === "air"
      ? stagePoint(point.a, arrow.depth, point.b, L)
      : stagePoint(point.a, point.b, 0, L));
  }

  function drawArrowHead(target, tip, inner, color, width) {
    const dx = tip.x - inner.x;
    const dy = tip.y - inner.y;
    if (Math.hypot(dx, dy) < 0.5) return;
    const angle = Math.atan2(dy, dx);
    const size = 9 + width * 2;
    target.fillStyle = color;
    target.beginPath();
    target.moveTo(tip.x, tip.y);
    target.lineTo(tip.x - Math.cos(angle - 0.46) * size,
      tip.y - Math.sin(angle - 0.46) * size);
    target.lineTo(tip.x - Math.cos(angle + 0.46) * size,
      tip.y - Math.sin(angle + 0.46) * size);
    target.closePath();
    target.fill();
  }

  function drawOneArrow(target, arrow, L) {
    const points = arrowScreenPoints(arrow, L);
    if (points.length < 2) return;
    const color = validColor(arrow.color, "#d3ac59");
    const width = clamp(finite(arrow.width, 3), 1, 8);
    target.save();

    /* 空中の始点から床へ細い補助線を落とす。矢印そのものより弱くして、
     * 高さを読む手掛かりだけを残す。 */
    if (!L.plan && arrow.plane === "air") {
      const first = arrow.points[0];
      const floor = stagePoint(first.a, arrow.depth, 0, L);
      target.strokeStyle = rgba(color, 0.25);
      target.lineWidth = 1;
      target.setLineDash([3, 5]);
      target.beginPath();
      target.moveTo(points[0].x, points[0].y);
      target.lineTo(floor.x, floor.y);
      target.stroke();
    }

    target.strokeStyle = color;
    target.lineWidth = width;
    target.lineJoin = "round";
    target.lineCap = "round";
    target.setLineDash(L.plan && arrow.plane === "air" ? [8, 6] : []);
    target.beginPath();
    points.forEach((point, index) => {
      if (index) target.lineTo(point.x, point.y); else target.moveTo(point.x, point.y);
    });
    target.stroke();
    target.setLineDash([]);

    const endNear = points[Math.max(0, points.length - Math.min(4, points.length - 1) - 1)];
    drawArrowHead(target, points[points.length - 1], endNear, color, width);
    if (arrow.heads === "both") {
      const startNear = points[Math.min(points.length - 1, Math.min(4, points.length - 1))];
      drawArrowHead(target, points[0], startNear, color, width);
    }
    target.restore();
  }

  function drawArrows(target, L) {
    /* 空中面の奥行きは描き始める前にも必要なので、編集中の正面図だけ床へ示す。
     * 印刷やサムネイルへは操作中のガイドを焼き付けない。 */
    if (target === ctx && !L.plan && tool === "arrow" && arrowPlanePref() === "air") {
      const left = stagePoint(0, arrowDepthPref(), 0, L);
      const right = stagePoint(1, arrowDepthPref(), 0, L);
      target.save();
      target.strokeStyle = "rgba(211,172,89,0.35)";
      target.lineWidth = 1.5;
      target.setLineDash([7, 6]);
      target.beginPath();
      target.moveTo(left.x, left.y);
      target.lineTo(right.x, right.y);
      target.stroke();
      target.restore();
    }
    (sc().arrows || []).forEach((arrow) => drawOneArrow(target, arrow, L));
    if (target === ctx && !L.plan && arrowDraft) drawOneArrow(target, arrowDraft, L);
  }

  function pointToSegmentDistance(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    if (!length2) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length2, 0, 1);
    return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
  }

  function arrowAt(point, L, view) {
    const arrows = sc().arrows || [];
    const limit = 12 / zoomOf(view).z;
    let best = -1;
    let bestDistance = limit;
    for (let index = arrows.length - 1; index >= 0; index -= 1) {
      const points = arrowScreenPoints(arrows[index], L);
      for (let i = 1; i < points.length; i += 1) {
        const distance = pointToSegmentDistance(point, points[i - 1], points[i]);
        if (distance < bestDistance) { best = index; bestDistance = distance; }
      }
    }
    return best;
  }

  function drawRoutes(target, L, showSelection) {
    sc().pieces.forEach((piece) => {
      if (!piece.route || !routesShownFor(piece)) return;
      drawOneRoute(target, L, piece, piece.route, showSelection && piece.id === selectedId);
    });

    /* ---- 入り・はけの動線 ----
       舞台と舞台裏をまたぐ移動は、手で引かなくても必ず見せる（本人の指定）。
       はけ＝いま居て次のシーンに居ない人は、次のシーンでの舞台裏の立ち位置へ。
       入り＝いま舞台裏で次のシーンに居る人は、袖の立ち位置から次の場所へ。
       手で引いた動線（曲げられる）が同じ人にあれば、そちらを描く。
       ★はけの線は、選んでいる間は本物と同じ取っ手を出す。掴んだ瞬間に
         piece.route へ実体化して、袖のどちら側・どの深さへはけるかを
         手で決められる（本人の指定）。触らなければ毎回の計算のまま。 */
    const scene = sc();
    const next = nextSceneOf(scene);
    if (!next || !state.showRoutesCast) return;   // 入り・はけは演者の動線
    const transit = (a, b, color) => {
      const gap = 13;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      if (len < gap * 2) return;
      const from = { x: a.x + (dx / len) * gap, y: a.y + (dy / len) * gap };
      target.save();
      target.strokeStyle = rgba(color, 0.5);
      target.lineWidth = 2.6;
      target.lineCap = "round";
      target.setLineDash([5, 6]);
      target.beginPath();
      target.moveTo(from.x, from.y);
      target.lineTo(b.x, b.y);
      target.stroke();
      target.setLineDash([]);
      const ang = Math.atan2(dy, dx);
      target.fillStyle = rgba(color, 0.56);
      target.beginPath();
      target.moveTo(b.x, b.y);
      target.lineTo(b.x - Math.cos(ang - 0.42) * 13, b.y - Math.sin(ang - 0.42) * 13);
      target.lineTo(b.x - Math.cos(ang + 0.42) * 13, b.y - Math.sin(ang + 0.42) * 13);
      target.closePath();
      target.fill();
      target.restore();
    };
    scene.pieces.forEach((piece) => {
      const auto = exitRouteFor(piece, next);
      if (!auto) return;
      // 選んでいる間は本物の動線と同じ見た目・取っ手で出す（掴めば実体化）
      if (showSelection && piece.id === selectedId) {
        drawOneRoute(target, L, piece, auto, true);
        return;
      }
      transit(place(pieceU(piece), pieceV(piece), L), place(auto.u, auto.v, L), piece.color);
    });
    backstageGhostsFor(scene).forEach((g) => {
      const tw = (next.pieces || []).find((q) => q.castId === g.member.id && onStageArea(q.u, q.v));
      if (!tw) return;
      transit(place(g.u, g.v, L), place(tw.u, tw.v, L), g.member.color || "#a84b26");
    });

    /* 動線の交差警告。同じ転換で動く演者どうしの道を同じ時刻で刻み、
       すれ違いが0.45mを切る所に印を出す（衝突しかけの発見） */
    if (featureOn("crossing") && state.showRoutesCast) {
      const size2 = L.size;
      const paths = [];
      scene.pieces.forEach((piece) => {
        if (piece.type !== "performer" || !piece.route) return;
        const r = piece.route;
        const pts = [];
        for (let i2 = 0; i2 <= 12; i2 += 1) {
          const p2 = i2 / 12;
          const k = 1 - p2;
          pts.push({
            u: k * k * piece.u + 2 * k * p2 * r.bu + p2 * p2 * r.u,
            v: k * k * piece.v + 2 * k * p2 * r.bv + p2 * p2 * r.v,
          });
        }
        paths.push(pts);
      });
      for (let i2 = 0; i2 < paths.length; i2 += 1) {
        for (let j2 = i2 + 1; j2 < paths.length; j2 += 1) {
          let best = 1e9;
          let at2 = null;
          for (let k2 = 0; k2 <= 12; k2 += 1) {
            const a = paths[i2][k2];
            const b2 = paths[j2][k2];
            const d = Math.hypot((a.u - b2.u) * (size2.width || 12), (a.v - b2.v) * (size2.depth || 9));
            if (d < best) { best = d; at2 = { u: (a.u + b2.u) / 2, v: (a.v + b2.v) / 2 }; }
          }
          if (best < 0.45 && at2) {
            const pos2 = place(at2.u, at2.v, L);
            target.save();
            target.font = "16px sans-serif";
            target.textAlign = "center";
            target.textBaseline = "middle";
            target.fillText("⚠", pos2.x, pos2.y);
            target.restore();
          }
        }
      }
    }
  }

  // その駒の動線を表示しているか（演者・照明・装置で別のつまみ）
  const routesShownFor = (piece) => (piece && piece.type === "performer" ? state.showRoutesCast
    : piece && piece.type === "light" ? state.showRoutesLight : state.showRoutesSet);
  const anyRoutesShown = () => state.showRoutesCast || state.showRoutesLight || state.showRoutesSet;

  // 動線の取っ手に当たっているか。曲げる取っ手を優先する
  // 動線を隠している間は取っ手も無い（見えないものを掴ませない）
  function routeHandleAtFor(point, piece, route, L) {
    if (!piece || !route || !L.plan || !routesShownFor(piece)) return null;
    const { from, to, ctrl } = routePointsFor(piece, route, L);
    const mid = quadAt(from, ctrl, to, 0.5);
    if (Math.hypot(point.x - mid.x, point.y - mid.y) <= 11) return "bend";
    if (Math.hypot(point.x - to.x, point.y - to.y) <= 11) return "end";
    return null;
  }
  const routeHandleAt = (point, piece, L) => routeHandleAtFor(point, piece, piece && piece.route, L);

  /* はけの動線の行き先（自動で描く線と同じ計算）。
     取っ手を掴まれたら、この形のまま piece.route へ実体化する。 */
  function exitRouteFor(piece, next) {
    if (!next || piece.type !== "performer" || !piece.castId || piece.route) return null;
    if (!onStageArea(piece.u, piece.v)) return null;
    if (twinOf(piece, next.pieces || [])) return null;
    const g = backstageGhostsFor(next).find((x) => x.member.id === piece.castId);
    const dest = g ? { u: g.u, v: g.v } : wingDest(piece);
    return { u: dest.u, v: dest.v, bu: (piece.u + dest.u) / 2, bv: (piece.v + dest.v) / 2 };
  }

  /* ---------- 付箋 ---------- */

  const NOTE_W = 188;
  const NOTE_PAD = 11;
  const NOTE_LINE = 22;
  /* 付箋の字。絵の上に小さく置くものだが、13pxでは読むのに近寄る必要があった。
   * ★行の高さも一緒に上げること。字だけ上げると行が重なる。
   * 書き込み窓（.stage-note-editor textarea）も同じ大きさに揃えてある。 */
  const NOTE_FONT = "15px 'Hiragino Kaku Gothic ProN', sans-serif";

  // 紐づけた駒があれば、その駒の位置を足して置き場所を出す
  /* 付箋の置き場所。数でない値が一度でも入ると絵から消えて二度と掴めなくなるので、
   * ここで必ず数に均す（画面が組まれる前に押されたときなどに起きる）。 */
  function notePos(note, L) {
    note.x = finite(note.x, 100);
    note.y = finite(note.y, 100);
    if (!note.pieceId) return { x: note.x, y: note.y };
    const piece = sc().pieces.find((p) => p.id === note.pieceId);
    if (!piece) return { x: note.x, y: note.y };
    const pos = placePiece(piece, L);
    return { x: pos.x + note.x, y: pos.y + note.y };
  }

  // 幅で折り返した行。書いた改行も活かす
  function noteLines(target, text) {
    const out = [];
    const limit = NOTE_W - NOTE_PAD * 2;
    String(text || "").split("\n").forEach((paragraph) => {
      if (!paragraph) { out.push(""); return; }
      let line = "";
      for (const ch of paragraph) {
        const next = line + ch;
        if (target.measureText(next).width > limit && line) { out.push(line); line = ch; }
        else line = next;
      }
      out.push(line);
    });
    return out.slice(0, 8);
  }

  function noteBox(target, note, L) {
    target.font = NOTE_FONT;
    const lines = noteLines(target, note.text || "メモ");
    const pos = notePos(note, L);
    return {
      x: pos.x, y: pos.y, w: NOTE_W,
      h: NOTE_PAD * 2 + Math.max(1, lines.length) * NOTE_LINE,
      lines,
    };
  }

  function drawNotes(target, L, view, showSelection) {
    const notes = (sc().notes || []).filter((note) => note.view === view);
    notes.forEach((note) => {
      const box = noteBox(target, note, L);
      const picked = showSelection && note.id === selectedNoteId;
      target.save();
      // 紐づけた駒とは細い線でつなぐ。どれについての覚え書きかが読めるように
      if (note.pieceId) {
        const piece = sc().pieces.find((p) => p.id === note.pieceId);
        if (piece) {
          const at = placePiece(piece, L);
          target.strokeStyle = "rgba(211,172,89,0.32)";
          target.lineWidth = 1;
          target.setLineDash([4, 4]);
          target.beginPath();
          target.moveTo(at.x, at.y);
          target.lineTo(box.x + box.w / 2, box.y + box.h / 2);
          target.stroke();
          target.setLineDash([]);
        }
      }
      /* 付箋は覚え書きであって、絵の主役ではない。
       * 明るい紙色だと舞台より先に目へ入るので、道具立てと同じ暗い面に置き、
       * 選んでいるときだけ縁を起こす。 */
      target.fillStyle = picked ? "rgba(38,34,30,0.95)" : "rgba(28,25,22,0.88)";
      target.strokeStyle = picked ? "rgba(211,172,89,0.9)" : "rgba(211,172,89,0.4)";
      target.lineWidth = picked ? 1.6 : 1;
      target.beginPath();
      target.rect(box.x, box.y, box.w, box.h);
      target.fill();
      target.stroke();
      // 上辺に細い線を一本だけ。付箋の向きが分かればよい
      target.fillStyle = "rgba(211,172,89,0.32)";
      target.fillRect(box.x, box.y, box.w, 2);

      target.fillStyle = "rgba(240,231,214,0.86)";
      target.font = NOTE_FONT;
      target.textAlign = "left";
      target.textBaseline = "top";
      box.lines.forEach((line, i) => {
        target.fillText(line, box.x + NOTE_PAD, box.y + NOTE_PAD + i * NOTE_LINE);
      });
      target.restore();
    });
  }

  function noteAt(point, L, view) {
    const notes = (sc().notes || []).filter((note) => note.view === view);
    for (let i = notes.length - 1; i >= 0; i -= 1) {
      const box = noteBox(ctx, notes[i], L);
      if (point.x >= box.x && point.x <= box.x + box.w
        && point.y >= box.y && point.y <= box.y + box.h) return notes[i];
    }
    return null;
  }

  /* メモの中身を書く小窓。絵の上の付箋と同じ場所へ重ねて出すので、
   * 「どの付箋を書いているか」を探さなくて済む。書いた端から絵にも反映する。 */
  let noteEditor = null;

  function closeNoteEditor() {
    if (!noteEditor) return;
    noteEditor.remove();
    noteEditor = null;
  }

  function removeNote(id) {
    checkpoint();
    sc().notes = (sc().notes || []).filter((note) => note.id !== id);
    if (selectedNoteId === id) selectedNoteId = null;
    closeNoteEditor();
    render();
    persistSoon();
  }

  function openNoteEditor(note, view) {
    closeNoteEditor();
    const host = view === "plan" ? planCanvas : canvas;
    if (!host || !host.parentElement) return;
    const box = noteBox(ctx, note, layout(view));
    const wrap = document.createElement("div");
    wrap.className = "stage-note-editor";
    /* ★この窓は自分で訳す。まとめて差し替える方に任せると、
       対訳表が日本語そのものを鍵にしているせいで「保存」が
       項目名の Saving に化ける（同じ字で別の意味の語がある）。 */
    wrap.dataset.noI18n = "";
    wrap.style.left = `${(box.x / W) * 100}%`;
    wrap.style.top = `${(box.y / H) * 100}%`;
    wrap.style.width = `${(NOTE_W / W) * 100}%`;

    const area = document.createElement("textarea");
    area.rows = 3;
    area.value = note.text || "";
    area.placeholder = tm("misc", "notePlaceholder", "覚え書き");
    area.addEventListener("input", () => {
      note.text = area.value.slice(0, 200);
      render();
      persistSoon();
    });
    area.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeNoteEditor(); host.focus(); }
    });

    const bar = document.createElement("div");
    bar.className = "stage-note-editor-bar";
    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "btn-quiet";
    drop.textContent = tm("misc", "noteDrop", "はがす");
    drop.addEventListener("click", () => removeNote(note.id));
    const done = document.createElement("button");
    done.type = "button";
    done.className = "btn-quiet";
    /* 書いた字は打つそばから保存されているので、この札は本来「閉じる」だが、
       書き手には保存したのか分からない。押せば残ると読める言葉にする。
       ★対訳表は日本語そのものを鍵にしていて「保存」は項目名（Saving）で
         埋まっているので、こちらは id を鍵にする tm() で引く。 */
    done.textContent = tm("misc", "noteSave", "保存");
    done.addEventListener("click", () => { closeNoteEditor(); host.focus(); });
    bar.append(drop, done);

    wrap.append(area, bar);
    host.parentElement.appendChild(wrap);
    noteEditor = wrap;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }

  function drawSelection(target, piece, L) {
    /* 明かり単体は破線の枠を出さない。印は drawLight 側が持つ
       （平面＝終着点の輪、正面＝灯体の点）。床に出る四角い破線が
       「何の印か分からない」と言われたため。組だけは一体で選ばれることを
       伝えるために、全体を囲む枠を出す。 */
    let b = selectionBounds(piece, L);
    const gsel = piece.type === "light" ? lightGroupOf(piece) : null;
    if (piece.type === "light" && !gsel) return;
    if (gsel) {
      let x0 = b.x; let y0 = b.y; let x1 = b.x + b.w; let y1 = b.y + b.h;
      groupScenePieces(gsel).forEach((p) => {
        const c = selectionBounds(p, L);
        x0 = Math.min(x0, c.x);
        y0 = Math.min(y0, c.y);
        x1 = Math.max(x1, c.x + c.w);
        y1 = Math.max(y1, c.y + c.h);
      });
      b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    const locked = isLocked(piece);
    target.save();
    // 錠が掛かっているものは掴んでも動かない。掴む前に分かるよう、枠の色でも示す
    target.strokeStyle = locked ? "rgba(211,172,89,0.5)" : "#d3ac59";
    target.lineWidth = 2;
    target.setLineDash(locked ? [3, 6] : [8, 7]);
    target.strokeRect(b.x - 7, b.y - 7, b.w + 14, b.h + 14);
    target.setLineDash([]);
    if (locked) {
      target.font = "15px 'Hiragino Kaku Gothic ProN', sans-serif";
      target.textAlign = "left";
      target.textBaseline = "bottom";
      target.fillText("🔒", b.x - 6, b.y - 11);
    } else {
      target.fillStyle = "#d3ac59";
      [[b.x - 7, b.y - 7], [b.x + b.w + 7, b.y - 7], [b.x - 7, b.y + b.h + 7], [b.x + b.w + 7, b.y + b.h + 7]]
        .forEach(([x, y]) => target.fillRect(x - 3, y - 3, 6, 6));
    }
    target.restore();
  }

  /* 絵の中へ組み立てて描く文。語順が言語で変わるので、鍵引きでは足りない。 */
  const ringLabel = (dia) => (isEn() ? `Ring — ${dia}m across` : `リング 直径${dia}m`);
  const sightLabel = (limit) => (isEn()
    ? `The house shows direction, not distance (${limit.m}m ≈ ${tx(limit.label)})`
    : `客席の広がりは方向の目安です（${limit.m}mで${limit.label}）`);

  function label(target, text, x, y, align) {
    target.save();
    target.fillStyle = "rgba(239,231,214,0.5)";
    target.font = "13px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = align || "center";
    target.textBaseline = "middle";
    // 絵の中の字はあとから差し替えられないので、描くときに言語を見る
    target.fillText(tx(text), x, y);
    target.restore();
  }

  /* ---------- 舞台そのものの描画（形式ごと） ---------- */

  function drawFrontVenue(target, L) {
    const v = L.venue;
    const back = backAreaRect(L);
    const wall = backdropRect(L);          // 塗れる背景の壁。全周形式には無い
    const ring = ringEllipse(L);
    const roundHouse = v.audience === "round";

    // ---- 奥 ----
    if (wall) {
      target.fillStyle = sc().background;
      target.fillRect(wall.x, wall.y, wall.w, wall.h);
      // 写真は地の色の上、手描きの塗りの下。塗りは写真への描き込みとして残る
      if (sc().photo) paintPhoto(target, wall, sc().photo);
      target.drawImage(paintCanvas, 0, 0);
      // スクリーンの文字は、写真と手描きの上（＝いちばん手前の投影）
      drawScreenTexts(target, wall);

      const wallShade = target.createLinearGradient(wall.x, 0, wall.x + wall.w, 0);
      wallShade.addColorStop(0, "rgba(0,0,0,0.18)");
      wallShade.addColorStop(0.18, "rgba(0,0,0,0)");
      wallShade.addColorStop(0.82, "rgba(0,0,0,0)");
      wallShade.addColorStop(1, "rgba(0,0,0,0.18)");
      target.fillStyle = wallShade;
      target.fillRect(wall.x, wall.y, wall.w, wall.h);

      // 屋外は奥が空になる
      if (v.audience === "none") {
        const sky = target.createLinearGradient(0, wall.y, 0, L.floorY);
        sky.addColorStop(0, "rgba(28,38,48,0.85)");
        sky.addColorStop(1, "rgba(28,38,48,0)");
        target.fillStyle = sky;
        target.fillRect(wall.x, wall.y, wall.w, wall.h);
      }
    }

    // 全周形式は奥も客席。背景の壁を持たないので、客席の段だけを描く
    if (roundHouse) {
      target.save();
      target.fillStyle = "rgba(18,15,13,0.95)";
      target.fillRect(0, back.y, W, L.floorY - back.y);
      target.strokeStyle = "rgba(239,231,214,0.1)";
      target.lineWidth = 1;
      const rows = 7;
      for (let i = 1; i <= rows; i += 1) {
        const t = i / rows;
        const y = back.y + (L.floorY - back.y) * t;
        // 奥の段ほど幅が狭い（すり鉢状に見せる）
        const inset = (1 - t) * W * 0.16;
        target.beginPath();
        target.moveTo(inset, y);
        target.lineTo(W - inset, y);
        target.stroke();
      }
      label(target, "向こう側の客席", L.centerX, back.y + (L.floorY - back.y) * 0.34);
      // テントの傾斜
      target.strokeStyle = "rgba(156,130,63,0.3)";
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(back.x - 60, back.y + 40);
      target.lineTo(L.centerX, back.y - 80);
      target.lineTo(back.x + back.w + 60, back.y + 40);
      target.stroke();
      target.restore();
    }

    // スラストは左右にも客席がある
    if (v.audience === "three") {
      target.save();
      target.fillStyle = "rgba(20,17,14,0.55)";
      target.fillRect(0, L.floorY - 30, back.x - 4, H - L.floorY + 30);
      target.fillRect(back.x + back.w + 4, L.floorY - 30, W - back.x - back.w, H - L.floorY + 30);
      label(target, "客席", back.x / 2, L.floorY + 90);
      label(target, "客席", back.x + back.w + (W - back.x - back.w) / 2, L.floorY + 90);
      target.restore();
    }

    // ---- 床 ----
    // 全周形式の舞台面はリングの内側だけ。その外は客席なので床を敷かない。
    // fresh=false のときは今のパスへ足すだけにする（切り抜きの内側として使うため）。
    // ここで beginPath を呼ぶと、外枠ごと捨てて領域が反転してしまう。
    const floorPath = (fresh = true) => {
      if (fresh) target.beginPath();
      if (roundHouse && ring) {
        target.ellipse(ring.x, ring.y, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      } else {
        const shiftBack = L.shift || 0;
        target.moveTo(L.centerX + shiftBack - L.backW / 2, L.floorY);
        target.lineTo(L.centerX + shiftBack + L.backW / 2, L.floorY);
        target.lineTo(L.centerX + L.frontW / 2, L.bottomY);
        target.lineTo(L.centerX - L.frontW / 2, L.bottomY);
        target.closePath();
      }
    };

    target.save();
    target.fillStyle = "#211b17";
    floorPath();
    target.fill();

    // 床の目盛りは実寸1mごと。平面図と同じ刻みにして、二つの図で同じ枡を数えられるようにする。
    // 広い舞台では線が混むので2mごとに間引く（平面図と同じ判断）。
    floorPath();
    target.clip();
    target.strokeStyle = "rgba(239,231,214,0.09)";
    target.lineWidth = 1;
    const stepW = L.size.width > 14 ? 2 : 1;
    const stepD = L.size.depth > 14 ? 2 : 1;
    for (let m = stepD; m < L.size.depth; m += stepD) {   // 奥行きの線（横に走る）
      const v = m / L.size.depth;
      const a = place(0, v, L);
      const b = place(1, v, L);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
    }
    for (let m = stepW; m < L.size.width; m += stepW) {   // 間口の線（奥へ走る）
      const u = m / L.size.width;
      const a = place(u, 0, L);
      const b = place(u, 1, L);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.stroke();
    }
    target.restore();

    // ---- 舞台の立ち上がりとピット ----
    // 目線が床と同じ高さの席では、床が線に潰れるぶん、視界の下半分を
    // 舞台の立ち上がり（エプロンの前面）とその下の暗がりが占める。
    // ここを描かないと「床の上に人が並んだ絵」になり、見上げている感じが出ない。
    const apron = (L.seat && L.seat.apron) || 0;
    if (apron > 0 && !roundHouse) {
      const faceBottom = Math.min(H, L.apronBottom);
      const face = target.createLinearGradient(0, L.bottomY, 0, faceBottom);
      face.addColorStop(0, "#1b1512");
      face.addColorStop(1, "#0c0908");
      target.fillStyle = face;
      target.fillRect(0, L.bottomY, W, faceBottom - L.bottomY);
      target.strokeStyle = "rgba(239,231,214,0.18)";
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(0, L.bottomY);
      target.lineTo(W, L.bottomY);
      target.stroke();
      if (faceBottom < H - 2) {
        target.fillStyle = "#070606";
        target.fillRect(0, faceBottom, W, H - faceBottom);
      }
      label(target, "舞台の立ち上がり", 96, Math.min(faceBottom - 16, H - 14));
    }

    // リングの縁
    if (ring) {
      target.save();
      target.strokeStyle = "rgba(168,75,38,0.55)";
      target.lineWidth = 3;
      target.beginPath();
      target.ellipse(ring.x, ring.y, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      target.stroke();
      label(target, ringLabel(L.size.ring), ring.x, Math.min(ring.y + ring.ry + 17, H - 12));
      target.restore();
    }

    // ---- 枠 ----
    // 近い席では奥の面が画面の上へ抜ける（back.y が負）。その場合は天を塗らない。
    target.fillStyle = "#11100f";
    if (back.y > 0) target.fillRect(0, 0, W, back.y);
    if (v.frame) {
      /* 額縁はいちばん手前（v=1）の面にある。奥の壁の幅で描いていたころは、
       * 横の席にすると床が額縁の外へはみ出して、絵として破綻していた。
       * 手前の間口いっぱいに開いた枠として描く。横にずれる席でも、
       * 額縁だけは動かない（動くのは奥の壁と床の奥側）。 */
      const archX = L.centerX - L.frontW / 2;
      const archW = L.frontW;
      target.fillRect(0, 0, Math.max(0, archX), L.bottomY);
      const rightX = archX + archW;
      if (rightX < W) target.fillRect(rightX, 0, W - rightX, L.bottomY);
      // 額縁の輪郭は、額縁そのものが画面に収まっているときだけ引く。
      // 最前列のように額縁の外まで入り込んだ席では、引いても画面の外になる。
      if (archX > 2) {
        target.strokeStyle = "rgba(156,130,63,0.42)";
        target.lineWidth = 3;
        const frameTop = Math.max(back.y, -4);
        target.strokeRect(archX, frameTop, archW, L.bottomY - frameTop);
      }
    } else if (!roundHouse) {
      target.strokeStyle = "rgba(156,130,63,0.2)";
      target.lineWidth = 1;
      target.strokeRect(back.x, back.y, back.w, L.floorY - back.y);
    }

    // 袖は額縁より後に描く。額縁の塗りは奥の壁の幅で引いてあるため、
    // 先に描くと間口の外にある袖幕がそのまま覆われて見えなくなる。
    // ---- 舞台袖 ----
    // 袖は舞台の外側の空間。袖幕（レッグ）は間口の縁から外へ向かって垂れ、
    // その陰に舞台裏を隠す。内側の縁が間口の縁（u=0 と u=1）にそろうので、
    // 舞台の上に置いた演者が袖幕に食われることはない。
    // 幕は宙から吊るもので、天はボーダー幕に隠れて見えない。高さを奥行きごとに
    // 測って途中で切ると、床から生えた柱に見えてしまう。
    if (v.frame) {
      // 舞台の床にも背景の幕にも一切かからないようにする。
      // 画面全体から床の台形と奥の幕を抜いた残り＝袖の空間、が描画範囲になる。
      target.save();
      target.beginPath();
      target.rect(0, 0, W, H);
      floorPath(false);
      target.rect(back.x, back.y, back.w, L.floorY - back.y);
      target.clip("evenodd");

      const legTop = Math.min(back.y, L.floorY) - 2;
      const wingU = 2.2 / L.size.width;      // 袖幕1枚の見かけの幅は約2.2m

      // 袖の空間。作業灯がわずかに回る程度の明るさで、外へ行くほど闇に沈む
      [-1, 1].forEach((side) => {
        const edge = side < 0 ? 0 : W;
        const space = target.createLinearGradient(L.centerX, 0, edge, 0);
        space.addColorStop(0, "rgba(62,52,42,0.95)");
        space.addColorStop(0.55, "rgba(26,22,18,0.95)");
        space.addColorStop(1, "rgba(10,9,8,0.95)");
        target.fillStyle = space;
        target.fillRect(Math.min(L.centerX, edge), legTop, Math.abs(edge - L.centerX), L.bottomY - legTop);
      });

      // 袖幕。奥の対から順に重ね、手前の対が奥の対を隠していく。
      // 残った内側の縁が階段状に並び、それが袖の奥行きになる。
      for (let i = 0; i < 3; i += 1) {
        const vAt = 0.1 + i * 0.32;          // i=0 が最も奥
        const floorAt = place(0, vAt, L).y;  // その奥行きでの裾
        const shade = 0.72 + i * 0.14;       // 手前の対ほど濃い（奥は暗がりに霞む）

        [-1, 1].forEach((side) => {
          const inner = place(side < 0 ? 0 : 1, vAt, L).x;              // 間口の縁
          const outer = place(side < 0 ? -wingU : 1 + wingU, vAt, L).x; // その外側

          const cloth = target.createLinearGradient(outer, 0, inner, 0);
          cloth.addColorStop(0, `rgba(11,10,9,${0.97 * shade})`);
          cloth.addColorStop(0.7, `rgba(16,14,12,${0.95 * shade})`);
          cloth.addColorStop(1, `rgba(31,26,22,${0.93 * shade})`);
          target.fillStyle = cloth;
          target.fillRect(Math.min(outer, inner), legTop, Math.abs(inner - outer), floorAt - legTop);

          // 布の縦じわ
          target.strokeStyle = `rgba(0,0,0,${0.3 * shade})`;
          target.lineWidth = 1;
          for (let f = 1; f < 4; f += 1) {
            const x = outer + (inner - outer) * (f / 4);
            target.beginPath();
            target.moveTo(x, legTop);
            target.lineTo(x, floorAt);
            target.stroke();
          }

          // 内側の縁。舞台の明かりを拾って光るので、ここだけが袖の輪郭になる
          target.strokeStyle = `rgba(196,172,132,${0.16 + i * 0.06})`;
          target.lineWidth = 2;
          target.beginPath();
          target.moveTo(inner, legTop);
          target.lineTo(inner, floorAt);
          target.stroke();

          // 裾。床との接地を見せる
          target.strokeStyle = `rgba(0,0,0,${0.55 * shade})`;
          target.lineWidth = 1;
          target.beginPath();
          target.moveTo(Math.min(outer, inner), floorAt);
          target.lineTo(Math.max(outer, inner), floorAt);
          target.stroke();
        });
      }
      target.restore();
    }

    // 屋外は前端の外側に柵がある。奥行きを描けないので境界の線1本と注記にとどめる。
    if (v.audience === "none") {
      target.save();
      target.strokeStyle = "rgba(168,75,38,0.4)";
      target.setLineDash([6, 6]);
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(0, L.bottomY + 8);
      target.lineTo(W, L.bottomY + 8);
      target.stroke();
      target.setLineDash([]);
      label(target, "この先は柵と観客エリア（客席という囲いは無い）", L.centerX, H - 20);
      target.restore();
    }

    // 舞台面の奥のライン。全周形式はリングが境界なので引かない
    if (!roundHouse) {
      target.strokeStyle = "rgba(239,231,214,0.18)";
      target.lineWidth = 1;
      target.beginPath();
      target.moveTo(L.centerX + (L.shift || 0) - L.backW / 2, L.floorY);
      target.lineTo(L.centerX + (L.shift || 0) + L.backW / 2, L.floorY);
      target.stroke();
    }
  }

  function drawCustomPlanVenue(target, L) {
    const v = L.venue;
    const s = L.stage;
    const outline = v.outline;
    const xs = outline.map((point) => point[0]);
    const ys = outline.map((point) => point[1]);
    const bounds = {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    };
    const width = Math.max(0.001, bounds.maxX - bounds.minX);
    const depth = Math.max(0.001, bounds.maxY - bounds.minY);
    const pointAt = (point) => ({
      x: s.x + (((point[0] - bounds.minX) / width) * s.w),
      y: s.y + (((point[1] - bounds.minY) / depth) * s.h),
    });
    const polygonPath = (points) => {
      target.beginPath();
      points.forEach((point, index) => {
        const at = pointAt(point);
        if (index) target.lineTo(at.x, at.y);
        else target.moveTo(at.x, at.y);
      });
      target.closePath();
    };

    target.save();
    target.fillStyle = "rgba(32,27,22,0.9)";
    (v.audienceAreas || []).forEach((area) => {
      if (!area || !Array.isArray(area.polygon) || area.polygon.length < 3) return;
      polygonPath(area.polygon);
      target.fill();
      const center = area.polygon.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
        .map((value) => value / area.polygon.length);
      const at = pointAt(center);
      label(target, area.mode === "seated" ? "客席（座り）" : "客席（立ち見）", at.x, at.y);
    });
    target.restore();

    target.save();
    polygonPath(outline);
    target.fillStyle = "#241d18";
    target.fill();
    target.strokeStyle = "rgba(156,130,63,0.55)";
    target.lineWidth = 2;
    target.stroke();
    polygonPath(outline);
    target.clip();
    const step = L.size.width > 14 ? 2 : 1;
    target.strokeStyle = "rgba(239,231,214,0.07)";
    target.lineWidth = 1;
    for (let m = step; m < L.size.width; m += step) {
      const x = s.x + (m / L.size.width) * s.w;
      target.beginPath();
      target.moveTo(x, s.y);
      target.lineTo(x, s.y + s.h);
      target.stroke();
    }
    for (let m = step; m < L.size.depth; m += step) {
      const y = s.y + (m / L.size.depth) * s.h;
      target.beginPath();
      target.moveTo(s.x, y);
      target.lineTo(s.x + s.w, y);
      target.stroke();
    }
    target.restore();

    label(target, `${tx("間口")} ${L.size.width}m`, s.x + s.w / 2, s.y - 22);
    label(target, `${tx("奥行")} ${L.size.depth}m`, s.x - 46, s.y + s.h / 2);
    if ((v.audienceAreas || []).length) {
      const limit = VENUES.sightLimits[0];
      label(target, sightLabel(limit), W / 2, H - 16);
    }
  }

  function drawPlanVenue(target, L) {
    const v = L.venue;
    const s = L.stage;

    target.fillStyle = "#141210";
    target.fillRect(0, 0, W, H);

    if (v.custom && Array.isArray(v.outline) && v.outline.length >= 3) {
      drawCustomPlanVenue(target, L);
      return;
    }

    /* 袖。舞台の枠のすぐ外に、駒を置ける帯として描く。
       濃さは舞台より一段沈め、破線で「舞台面ではない」ことを示す。 */
    {
      const b = planBounds();
      const wingRects = [];
      const wingWord = backstageGhosts().length ? "舞台裏" : "袖";
      if (b.uMin < 0) {
        const w = -b.uMin * s.w;
        wingRects.push({ x: s.x - w, y: s.y, w, h: s.h, label: wingWord });
        wingRects.push({ x: s.x + s.w, y: s.y, w, h: s.h, label: wingWord });
      }
      if (b.vMin < 0) {
        const d = -b.vMin * s.h;
        wingRects.push({ x: s.x, y: s.y - d, w: s.w, h: d, label: wingWord });
      }
      target.save();
      wingRects.forEach((r) => {
        target.fillStyle = "rgba(24,20,17,0.9)";
        target.fillRect(r.x, r.y, r.w, r.h);
        target.strokeStyle = "rgba(239,231,214,0.16)";
        target.setLineDash([5, 5]);
        target.lineWidth = 1;
        target.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        target.setLineDash([]);
        label(target, r.label, r.x + r.w / 2, r.y + Math.min(r.h - 8, 16));
      });
      target.restore();
    }

    // 客席
    target.save();
    target.fillStyle = "rgba(32,27,22,0.9)";
    if (v.audience === "front") {
      target.fillRect(s.x - 40, s.y + s.h + 14, s.w + 80, H - (s.y + s.h) - 30);
      label(target, "客席", W / 2, s.y + s.h + 58);
    } else if (v.audience === "three") {
      target.fillRect(s.x - 96, s.y + s.h * 0.25, 78, s.h * 0.75 + 60);
      target.fillRect(s.x + s.w + 18, s.y + s.h * 0.25, 78, s.h * 0.75 + 60);
      target.fillRect(s.x - 40, s.y + s.h + 14, s.w + 80, 76);
      label(target, "客席", W / 2, s.y + s.h + 52);
      label(target, "客席", s.x - 57, s.y + s.h * 0.6);
      label(target, "客席", s.x + s.w + 57, s.y + s.h * 0.6);
    } else if (v.audience === "round") {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const base = Math.max(s.w, s.h) / 2;
      target.strokeStyle = "rgba(239,231,214,0.12)";
      target.lineWidth = 1;
      for (let i = 1; i <= 5; i += 1) {
        target.beginPath();
        target.arc(cx, cy, base + i * 19, 0, Math.PI * 2);
        target.stroke();
      }
      label(target, "客席が全周を囲む", cx, Math.min(cy + base + 5 * 19 + 16, H - 44));
    }
    target.restore();

    // 舞台面
    target.save();
    if (v.audience === "round") {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const r = Math.min(s.w, s.h) / 2;
      target.fillStyle = "#241d18";
      target.beginPath();
      target.arc(cx, cy, r, 0, Math.PI * 2);
      target.fill();
      if (L.size.ring) {
        target.strokeStyle = "rgba(168,75,38,0.55)";
        target.lineWidth = 3;
        target.beginPath();
        target.arc(cx, cy, (L.size.ring * L.pxPerM) / 2, 0, Math.PI * 2);
        target.stroke();
        label(target, ringLabel(L.size.ring), cx, cy + (L.size.ring * L.pxPerM) / 2 + 18);
      }
    } else {
      target.fillStyle = "#241d18";
      target.fillRect(s.x, s.y, s.w, s.h);
      target.strokeStyle = "rgba(156,130,63,0.4)";
      target.lineWidth = 2;
      target.strokeRect(s.x, s.y, s.w, s.h);
    }
    target.restore();

    // 舞台のグリッド（1mごと。細かすぎるときは間引く）
    const step = L.size.width > 14 ? 2 : 1;
    target.save();
    target.strokeStyle = "rgba(239,231,214,0.07)";
    target.lineWidth = 1;
    for (let m = step; m < L.size.width; m += step) {
      const x = s.x + (m / L.size.width) * s.w;
      target.beginPath();
      target.moveTo(x, s.y);
      target.lineTo(x, s.y + s.h);
      target.stroke();
    }
    for (let m = step; m < L.size.depth; m += step) {
      const y = s.y + (m / L.size.depth) * s.h;
      target.beginPath();
      target.moveTo(s.x, y);
      target.lineTo(s.x + s.w, y);
      target.stroke();
    }
    target.restore();

    // 寸法の目安
    label(target, `${tx("間口")} ${L.size.width}m`, s.x + s.w / 2, s.y - 22);
    label(target, `${tx("奥行")} ${L.size.depth}m`, s.x - 46, s.y + s.h / 2);

    // 屋外は柵とFOHの距離
    if (v.audience === "none") {
      target.save();
      VENUES.outdoorMarks.forEach((mark) => {
        const y = s.y + s.h + (H - s.y - s.h) * mark.ratio;
        target.strokeStyle = "rgba(168,75,38,0.4)";
        target.setLineDash([7, 6]);
        target.lineWidth = 2;
        target.beginPath();
        target.moveTo(s.x - 60, y);
        target.lineTo(s.x + s.w + 60, y);
        target.stroke();
        target.setLineDash([]);
        label(target, mark.label, s.x + s.w / 2, y - 13);
      });
      target.restore();
    }

    // 客席は「どちらを向いているか」を示すためのもので、実距離では描いていない
    // （20m先まで実寸で描くと舞台が小さくなりすぎ、置けなくなる）。
    // 距離の目安は言葉で添える。
    if (v.audience !== "none") {
      const limit = VENUES.sightLimits[0];
      label(target, sightLabel(limit), W / 2, H - 16);
    }
  }

  /* 重ねを出すか。カードを開いている間は自動で出し、加えてトグルで
     カードを閉じたまま出し続けられる（照明担当者へ見せるため）。
     ★スマホの見る専用画面では出さない。あちらは書く側の道具を全部隠すので、
       重ねだけ残ると切る手段が無くなる（作図注記は書く側の記法）。
     ★カードは display:none でも hidden 属性は false のままなので、
       実際に画面に出ているか（矩形を持つか）で見る。 */
  const lightIntentOverlayOn = () => {
    if (!featureOn("lightIntent")) return false;
    if (document.documentElement.classList.contains("stage-phone-viewer")) return false;
    if (state.showLightIntent) return true;
    const card = els.lightIntent;
    return Boolean(card && card.open && !card.hidden && card.getClientRects().length);
  };

  /* 重ね用の床の形。drawFrontVenue の floorPath と同じ形をなぞる。
     既存側を書き換えると描画順に影響するので、ここでは別に持つ。 */
  function intentFloorPath(target, L) {
    target.beginPath();
    const ring = ringEllipse(L);
    if (L.venue.audience === "round" && ring) {
      target.ellipse(ring.x, ring.y, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      return;
    }
    const shiftBack = L.shift || 0;
    target.moveTo(L.centerX + shiftBack - L.backW / 2, L.floorY);
    target.lineTo(L.centerX + shiftBack + L.backW / 2, L.floorY);
    target.lineTo(L.centerX + L.frontW / 2, L.bottomY);
    target.lineTo(L.centerX - L.frontW / 2, L.bottomY);
    target.closePath();
  }

  function beginLightIntentRegion(target, key, L) {
    target.beginPath();
    if (key === "background") {
      if (L.plan) {
        target.rect(L.stage.x, L.stage.y, L.stage.w, 14);
        return true;
      }
      const wall = backdropRect(L);
      if (!wall) return false;
      target.rect(wall.x, wall.y, wall.w, wall.h);
      return true;
    }
    if (key === "space") {
      if (L.plan) {
        target.rect(L.stage.x, L.stage.y, L.stage.w, L.stage.h);
      } else {
        intentFloorPath(target, L);
      }
      return true;
    }
    return false;
  }

  function lightIntentRegionCentroid(key, L) {
    if (key === "background") {
      if (L.plan) return { x: L.stage.x + L.stage.w / 2, y: L.stage.y + 7 };
      const wall = backdropRect(L);
      return wall ? { x: wall.x + wall.w / 2, y: wall.y + wall.h / 2 } : null;
    }
    if (key === "space") {
      if (L.plan) return { x: L.stage.x + L.stage.w / 2, y: L.stage.y + L.stage.h / 2 };
      const ring = ringEllipse(L);
      if (L.venue.audience === "round" && ring) return { x: ring.x, y: ring.y };
      return {
        x: L.centerX + (L.shift || 0) / 2,
        y: (L.floorY + L.bottomY) / 2,
      };
    }
    return null;
  }

  function lightIntentHatch(target) {
    if (intentHatchPattern) return intentHatchPattern;
    const tile = document.createElement("canvas");
    tile.width = 9;
    tile.height = 9;
    const tileCtx = tile.getContext("2d");
    tileCtx.strokeStyle = "rgba(239,231,214,0.16)";
    tileCtx.lineWidth = 1;
    tileCtx.beginPath();
    tileCtx.moveTo(0, 9);
    tileCtx.lineTo(9, 0);
    tileCtx.stroke();
    intentHatchPattern = target.createPattern(tile, "repeat");
    return intentHatchPattern;
  }

  function fillLightIntentRegion(target, key, L, fill, hatch = false) {
    if (!beginLightIntentRegion(target, key, L)) return false;
    target.save();
    if (fill) {
      target.fillStyle = fill;
      target.fill();
    }
    if (hatch) {
      target.fillStyle = lightIntentHatch(target);
      target.fill();
    }
    target.restore();
    return true;
  }

  function outlineLightIntentRegion(target, key, L, outline) {
    if (!outline || !beginLightIntentRegion(target, key, L)) return false;
    target.save();
    target.strokeStyle = outline.color || "rgba(211,172,89,0.85)";
    target.lineWidth = outline.w;
    target.setLineDash(outline.dash || []);
    target.stroke();
    target.restore();
    return true;
  }

  const lightIntentPerformers = (L) => sc().pieces.filter((piece) => (
    piece.type === "performer" && (L.plan || onStageArea(pieceU(piece), pieceV(piece)))
  ));

  /* 舞台装置の駒。どのレイヤーにも属さないが、他が沈むときに等倍で残ると
     画面で一番明るいものになり、意図と逆へ視線を引く（本人確認のうえ沈める）。
     吊物は正面図の対象外にしない——奥に吊ってある物も客席からは見えている。 */
  const lightIntentSetPieces = (L) => sc().pieces.filter((piece) => (
    piece.type !== "performer" && piece.type !== "light"
    && (L.plan || onStageArea(pieceU(piece), pieceV(piece)))
  ));

  function drawIntentPerformerShapes(performers, L) {
    intentMaskCtx.save();
    intentMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
    performers.forEach((piece) => {
      const pos = placePiece(piece, L);
      const scale = pieceScale(piece, pos, L);
      const tilt = (L.seat && L.seat.tilt) || 0;
      const lean = !L.plan && tilt ? tilt * ((pos.x - L.centerX) / (W / 2)) : 0;
      if (lean) {
        intentMaskCtx.save();
        intentMaskCtx.translate(pos.x, pos.y);
        intentMaskCtx.transform(1, 0, lean, 1, 0, 0);
        intentMaskCtx.translate(-pos.x, -pos.y);
      }
      /* 駒の種類で描き分ける。演者だけでなく舞台装置もマスクに取れるようにする
         （沈めるとき、装置だけが等倍で残ると画面で一番明るくなってしまう）。 */
      if (L.plan) drawPlanPiece(intentMaskCtx, piece, pos, scale, L);
      else if (piece.type === "performer") drawPerformer(intentMaskCtx, piece, pos, scale, L);
      else if (SOLID_TYPES[piece.type]) drawSolid(intentMaskCtx, piece, pos, scale, L);
      else if (piece.type === "sphere") drawSphere(intentMaskCtx, piece, pos, scale, L);
      if (lean) intentMaskCtx.restore();
    });
    intentMaskCtx.restore();
  }

  function drawIntentPerformersToMask(performers, L) {
    intentMaskCtx.save();
    intentMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
    intentMaskCtx.clearRect(0, 0, W, H);
    intentMaskCtx.restore();
    drawIntentPerformerShapes(performers, L);
  }

  function fillIntentPerformerMask(target, performers, L, fill, hatch = false) {
    if (!performers.length) return;
    if (fill) {
      drawIntentPerformersToMask(performers, L);
      intentMaskCtx.save();
      intentMaskCtx.globalCompositeOperation = "source-in";
      intentMaskCtx.fillStyle = fill;
      intentMaskCtx.fillRect(0, 0, W, H);
      intentMaskCtx.restore();
      target.drawImage(intentMaskCanvas, 0, 0);
    }
    if (hatch) {
      drawIntentPerformersToMask(performers, L);
      intentMaskCtx.save();
      intentMaskCtx.globalCompositeOperation = "source-in";
      intentMaskCtx.fillStyle = lightIntentHatch(intentMaskCtx);
      intentMaskCtx.fillRect(0, 0, W, H);
      intentMaskCtx.restore();
      target.drawImage(intentMaskCanvas, 0, 0);
    }
  }

  function intentPerformerBounds(performers, L, pad) {
    const boxes = performers.map((piece) => selectionBounds(piece, L));
    if (!boxes.length) return null;
    const minX = Math.min(...boxes.map((box) => box.x)) - pad;
    const minY = Math.min(...boxes.map((box) => box.y)) - pad;
    const maxX = Math.max(...boxes.map((box) => box.x + box.w)) + pad;
    const maxY = Math.max(...boxes.map((box) => box.y + box.h)) + pad;
    const x = Math.max(0, Math.floor(minX));
    const y = Math.max(0, Math.floor(minY));
    return {
      x,
      y,
      w: Math.max(1, Math.min(W, Math.ceil(maxX)) - x),
      h: Math.max(1, Math.min(H, Math.ceil(maxY)) - y),
    };
  }

  function outlineIntentPerformerMask(target, performers, L, outline) {
    if (!performers.length || !outline) return;
    drawIntentPerformersToMask(performers, L);
    const radius = Math.max(1, Math.round(outline.w));
    const bounds = intentPerformerBounds(performers, L, radius + 3);
    if (!bounds) return;
    const source = intentMaskCtx.getImageData(bounds.x, bounds.y, bounds.w, bounds.h);
    const ring = intentMaskCtx.createImageData(bounds.w, bounds.h);
    const offsets = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      return [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)];
    });
    for (let y = 0; y < bounds.h; y += 1) {
      for (let x = 0; x < bounds.w; x += 1) {
        const sourceAt = (y * bounds.w + x) * 4;
        const alpha = source.data[sourceAt + 3];
        if (!alpha) continue;
        offsets.forEach(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= bounds.w || ny < 0 || ny >= bounds.h) return;
          const at = (ny * bounds.w + nx) * 4;
          ring.data[at] = 211;
          ring.data[at + 1] = 172;
          ring.data[at + 2] = 89;
          const opacity = outline.alpha === undefined ? 0.85 : outline.alpha;
          ring.data[at + 3] = Math.max(ring.data[at + 3], Math.round(alpha * opacity));
        });
      }
    }
    intentMaskCtx.clearRect(0, 0, W, H);
    intentMaskCtx.putImageData(ring, bounds.x, bounds.y);
    // 8方向へ広げたあと、中心の体形を destination-out で抜いて外側の環だけを残す。
    intentMaskCtx.save();
    intentMaskCtx.globalCompositeOperation = "destination-out";
    drawIntentPerformerShapes(performers, L);
    intentMaskCtx.restore();
    if (outline.dash) {
      // transform は環を作ったあと、45度の破線を destination-out で抜く。
      intentMaskCtx.save();
      intentMaskCtx.globalCompositeOperation = "destination-out";
      intentMaskCtx.strokeStyle = "rgba(0,0,0,1)";
      intentMaskCtx.lineWidth = 2;
      intentMaskCtx.setLineDash(outline.dash);
      for (let offset = bounds.x - bounds.h; offset < bounds.x + bounds.w; offset += 7) {
        intentMaskCtx.beginPath();
        intentMaskCtx.moveTo(offset, bounds.y + bounds.h);
        intentMaskCtx.lineTo(offset + bounds.h, bounds.y);
        intentMaskCtx.stroke();
      }
      intentMaskCtx.restore();
    }
    target.drawImage(intentMaskCanvas, 0, 0);
  }

  function drawLightIntentTag(target, text, x, y, align = "left") {
    target.save();
    target.font = "10px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = "left";
    target.textBaseline = "top";
    const width = target.measureText(text).width + 12;
    const height = 16;
    const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    target.fillStyle = "rgba(13,12,11,0.72)";
    target.fillRect(left, y, width, height);
    target.fillStyle = "rgba(239,231,214,0.9)";
    target.fillText(text, left + 6, y + 3);
    target.restore();
  }

  function lightIntentTagPosition(key, performers, L) {
    if (key === "background") {
      if (L.plan) return { x: L.stage.x + 8, y: L.stage.y + 1, align: "left" };
      const wall = backdropRect(L);
      return wall ? { x: wall.x + 8, y: wall.y + 8, align: "left" } : null;
    }
    if (key === "space") {
      return L.plan
        ? { x: L.stage.x + 8, y: L.stage.y + 18, align: "left" }
        : { x: L.centerX, y: L.bottomY - 30, align: "center" };
    }
    if (key === "performer" && performers.length) {
      const boxes = performers.map((piece) => ({ piece, box: selectionBounds(piece, L) }));
      if (L.plan) {
        const rightmost = boxes.reduce((best, item) => (
          item.box.x + item.box.w > best.box.x + best.box.w ? item : best
        ));
        return {
          x: rightmost.box.x + rightmost.box.w + 8,
          y: rightmost.box.y + rightmost.box.h / 2 - 8,
          align: "left",
        };
      }
      /* 札は演者ひとりの頭上ではなく、演者全体の上へ置く。
         ひとりに付けると、隣に出ている演者名と対になって見えて
         「この人だけの指定」と読まれてしまう。これはレイヤー全体の指定。
         演者名の帯（駒の上端 −25〜−7px）より上へ逃がす。 */
      const centerX = boxes.reduce((sum, item) => sum + placePiece(item.piece, L).x, 0) / boxes.length;
      const topY = Math.min(...boxes.map((item) => item.box.y));
      return { x: centerX, y: topY - 34, align: "center" };
    }
    return null;
  }

  function drawLightIntentFocus(target, plan, centroids, L) {
    if (L.plan || !plan.audienceFocus) return;

    /* 視線の線は、見てほしい相手が演者のときだけ引く。
       床や背景のような広い面へ引くと、線はその重心へ向かって伸びるだけで、
       「どこを見るか」を何も言っていない（実機で確認）。
       面が対象のときは、線を引かずに文だけを客席側へ置く。 */
    const end = plan.revealed.includes("performer") ? centroids.performer : null;
    const start = { x: L.centerX, y: H - 6 };
    if (end) {
      target.save();
      target.strokeStyle = "rgba(211,172,89,0.55)";
      target.fillStyle = "rgba(211,172,89,0.55)";
      target.lineWidth = 1.2;
      target.beginPath();
      target.moveTo(start.x, start.y);
      target.lineTo(end.x, end.y);
      target.stroke();
      [start, end].forEach((point) => {
        target.beginPath();
        target.arc(point.x, point.y, 3, 0, Math.PI * 2);
        target.fill();
      });
      target.restore();
    }

    const chars = Array.from(plan.audienceFocus);
    const lines = [chars.slice(0, 28).join("")];
    if (chars.length > 28) {
      const second = chars.slice(28, 56);
      if (chars.length > 56 && second.length) second[second.length - 1] = "…";
      lines.push(second.join(""));
    }
    target.save();
    target.font = "10px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = "left";
    target.textBaseline = "top";
    const width = Math.max(...lines.map((line) => target.measureText(line).width)) + 12;
    const height = lines.length * 14 + 6;
    /* 線があるときは線の脇へ。無いときは客席側の中央へ置く
       （「観客はどこを見るか」の文なので、客席の側に置くのが読み筋に合う）。 */
    const boxX = end ? (start.x + end.x) / 2 + 10 : start.x - width / 2;
    const boxY = end ? (start.y + end.y) / 2 - height / 2 : L.bottomY + 10;
    target.fillStyle = "rgba(13,12,11,0.72)";
    target.fillRect(boxX, boxY, width, height);
    target.fillStyle = "rgba(239,231,214,0.9)";
    lines.forEach((line, index) => target.fillText(line, boxX + 6, boxY + 3 + index * 14));
    target.restore();
  }

  function drawLightIntentOverlay(target, L) {
    // 書き出し・印刷・プレゼンには作図注記を焼き付けない
    if (target !== ctx && target !== planCtx) return;
    if (presenting) return;
    const plan = lightIntentOverlayPlan(sc().lightingIntent);
    if (!plan || !plan.hasAnything) return;

    const performers = lightIntentPerformers(L);
    const entries = Object.fromEntries(plan.layers.map((entry) => [entry.key, entry]));
    const tags = [];
    const centroids = {};
    ["background", "space", "performer"].forEach((key) => {
      const entry = entries[key] || null;
      const dimmed = plan.dimmed.includes(key);
      if (key === "performer") {
        if (!L.plan && dimmed) {
          fillIntentPerformerMask(target, performers, L, "rgba(9,8,7,0.55)");
        }
        if (entry && !L.plan) {
          if (entry.mark.fill || entry.mark.hatch) {
            fillIntentPerformerMask(target, performers, L, entry.mark.fill, Boolean(entry.mark.hatch));
          }
          const outline = entry.value === "reveal"
            ? { w: 1.5, dash: null, alpha: 0.6 }
            : entry.mark.outline;
          if (outline) outlineIntentPerformerMask(target, performers, L, outline);
        }
        if (entry && L.plan && entry.value === "reveal") {
          target.save();
          target.strokeStyle = "rgba(211,172,89,0.6)";
          target.lineWidth = 1.5;
          performers.forEach((piece) => {
            const pos = placePiece(piece, L);
            target.beginPath();
            target.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
            target.stroke();
          });
          target.restore();
        }
        if (performers.length) {
          const boxes = performers.map((piece) => selectionBounds(piece, L));
          centroids.performer = {
            x: boxes.reduce((sum, box) => sum + box.x + box.w / 2, 0) / boxes.length,
            y: boxes.reduce((sum, box) => sum + box.y + box.h / 2, 0) / boxes.length,
          };
        }
      } else {
        if (dimmed) fillLightIntentRegion(target, key, L, "rgba(9,8,7,0.55)");
        if (entry) {
          if (entry.mark.fill || entry.mark.hatch) {
            fillLightIntentRegion(target, key, L, entry.mark.fill, Boolean(entry.mark.hatch));
          }
          const outline = entry.value === "reveal"
            ? { w: 1.5, dash: null, color: "rgba(211,172,89,0.6)" }
            : entry.mark.outline;
          if (outline) outlineLightIntentRegion(target, key, L, outline);
        }
        centroids[key] = lightIntentRegionCentroid(key, L);
      }
      if (entry) {
        const at = lightIntentTagPosition(key, performers, L);
        if (at) {
          const lang = isEn() ? "en" : "ja";
          tags.push({
            ...at,
            text: `「${LIGHT_INTENT_LAYER_LABELS[lang][key]}: ${LIGHT_INTENT_VALUE_LABELS[lang][entry.value]}」`,
          });
        }
      }
    });
    /* 装置駒も、沈むレイヤーがあるときは一緒に沈める。
       レイヤーの塗りより後に重ねるのは、背景のハッチが装置の上へ乗ったままだと
       「装置も背景の一部」に見えてしまうため。札や輪郭より前に置く。 */
    if (plan.dimmed.length) {
      const setPieces = lightIntentSetPieces(L);
      if (setPieces.length) {
        fillIntentPerformerMask(target, setPieces, L, "rgba(9,8,7,0.55)");
      }
    }

    tags.forEach((tag) => drawLightIntentTag(target, tag.text, tag.x, tag.y, tag.align));
    drawLightIntentFocus(target, plan, centroids, L);
  }

  /* 通常の駒もAI下書きの駒も、必ずこの一本を通して描く。
     下書き側で座標変換や種類別描画を複製すると、正面と平面でずれる。 */
  function drawStagePiece(target, piece, L, leanAt) {
    /* 袖に居るものは正面図に出さない。額縁の外は客席から見えない。
       アニメーション中は動きの途中の値で判定するので、はけていく駒は
       枠を出た瞬間に消える（＝袖へ入って見えなくなる）。 */
    if (!L.plan && !onStageArea(pieceU(piece), pieceV(piece))) return;
    const pos = placePiece(piece, L);
    const scale = pieceScale(piece, pos, L);
    const lean = leanAt(pos);
    if (lean) {
      target.save();
      target.translate(pos.x, pos.y);
      target.transform(1, 0, lean, 1, 0, 0);   // 足元を軸に、上へ行くほど内側へ
      target.translate(-pos.x, -pos.y);
    }
    if (piece.type === "light") drawLight(target, piece, pos, scale, L);
    else if (L.plan) drawPlanPiece(target, piece, pos, scale, L);
    else if (piece.type === "performer") drawPerformer(target, piece, pos, scale, L);
    else if (SOLID_TYPES[piece.type]) drawSolid(target, piece, pos, scale, L);
    else if (piece.type === "sphere") drawSphere(target, piece, pos, scale, L);
    if (lean) target.restore();
  }

  function stageAskCurrentPiece(pieceDiff, usedIds) {
    const from = pieceDiff.from;
    const candidates = sc().pieces.filter((piece) => {
      if (usedIds.has(piece.id)) return false;
      const assetType = piece.type === "performer" ? "performer" : "set";
      if (assetType !== pieceDiff.assetType) return false;
      if (pieceDiff.change !== "replace" && pieceDiff.kind && piece.type !== pieceDiff.kind) return false;
      return true;
    });
    if (!candidates.length) return null;
    const label = pieceDiff.change === "replace" ? "" : pieceDiff.label;
    const score = (piece) => {
      const labelPenalty = label && pieceLabel(piece) !== label ? 100 : 0;
      if (!from) return labelPenalty;
      return labelPenalty
        + Math.abs(finite(piece.u, 0.5) - from.u) * 10
        + Math.abs(finite(piece.v, 0.6) - from.v) * 10
        + Math.abs(finite(piece.size, 100) - from.size) / 100
        + Math.abs(finite(piece.facing, 0) - from.facing) / 360;
    };
    return candidates.slice().sort((a, b) => score(a) - score(b))[0];
  }

  function stageAskDraftPiece(pieceDiff, current, index) {
    const placement = pieceDiff.to;
    if (!placement) return null;
    const base = current ? { ...current } : {};
    const changesAsset = pieceDiff.change === "add" || pieceDiff.change === "replace";
    if (!changesAsset && current) {
      return normalizePiece({
        ...base,
        u: placement.u,
        v: placement.v,
        size: placement.size,
        facing: placement.facing,
        color: placement.color || base.color,
      }, index);
    }
    let asset = null;
    if (pieceDiff.assetType === "performer") {
      asset = (state.project.cast || []).find((item) => item.name === pieceDiff.label) || null;
      base.type = "performer";
      base.castId = asset ? asset.id : null;
      base.setId = null;
      base.name = asset ? "" : pieceDiff.label;
      base.dims = null;
    } else {
      asset = (state.project.sets || []).find((item) => item.name === pieceDiff.label
        && (!pieceDiff.kind || item.kind === pieceDiff.kind)) || null;
      base.type = asset ? asset.kind : (pieceDiff.kind || base.type || "block");
      base.castId = null;
      base.setId = asset ? asset.id : null;
      base.name = asset ? "" : pieceDiff.label;
      if (asset && asset.dims) base.dims = asset.dims;
    }
    return normalizePiece({
      ...base,
      id: current ? current.id : `stage-ask-draft-${index}`,
      u: placement.u,
      v: placement.v,
      size: placement.size,
      facing: placement.facing,
      color: placement.color || base.color,
    }, index);
  }

  function drawStageAskOverlay(target, L, leanAt) {
    // 下書きは編集画面だけ。画像・印刷へ「まだ保存していません」を焼き付けない。
    if (target !== ctx && target !== planCtx) return;
    if (target === ctx && window.__stageAdoptDiagnosis) {
      window.__stageAdoptDiagnosis.draftBadgeVisible = false;
    }
    const diff = STAGE_AI_PANEL_MODEL.overlayDiff(
      stageAskPlan,
      state.project.id,
      state.project.activeSceneId
    );
    if (!diff) return;
    if (target === ctx && window.__stageAdoptDiagnosis) {
      window.__stageAdoptDiagnosis.draftBadgeVisible = true;
    }

    const usedIds = new Set();
    const previewPieces = sc().pieces.map((piece) => ({ ...piece }));
    const entries = [];
    diff.pieces.forEach((pieceDiff, index) => {
      const current = pieceDiff.change === "add" ? null : stageAskCurrentPiece(pieceDiff, usedIds);
      if (current) usedIds.add(current.id);
      if (pieceDiff.change === "remove") {
        if (current) {
          const at = previewPieces.findIndex((piece) => piece.id === current.id);
          if (at >= 0) previewPieces.splice(at, 1);
        }
        entries.push({ pieceDiff, current, draft: null });
        return;
      }
      const draft = stageAskDraftPiece(pieceDiff, current, index);
      if (!draft) return;
      const at = current ? previewPieces.findIndex((piece) => piece.id === current.id) : -1;
      if (at >= 0) previewPieces.splice(at, 1, draft); else previewPieces.push(draft);
      entries.push({ pieceDiff, current, draft });
    });
    refreshBases(L.size, previewPieces);

    entries.forEach(({ pieceDiff, current, draft }) => {
      if (pieceDiff.change === "remove") {
        if (!current) return;
        const bounds = selectionBounds(current, L);
        target.save();
        target.globalAlpha = 0.45;
        target.strokeStyle = "#9c823f";
        target.lineWidth = 1;
        target.beginPath();
        target.moveTo(bounds.x, bounds.y + bounds.h);
        target.lineTo(bounds.x + bounds.w, bounds.y);
        target.stroke();
        target.restore();
        return;
      }
      if (!draft) return;
      if (current && ["move", "replace", "update"].includes(pieceDiff.change)) {
        const from = placePiece(current, L);
        const to = placePiece(draft, L);
        target.save();
        target.strokeStyle = "#9c823f";
        target.lineWidth = 1;
        target.setLineDash([3, 3]);
        target.beginPath();
        target.moveTo(from.x, from.y);
        target.lineTo(to.x, to.y);
        target.stroke();
        target.restore();
      }
      if (L.plan && !state.showFlown && isFlown(draft)) return;
      target.save();
      target.globalAlpha = 0.45;
      drawStagePiece(target, draft, L, leanAt);
      target.restore();
    });

    target.save();
    const S = target.canvas ? target.canvas.width / W : 1;
    target.setTransform(S, 0, 0, S, 0, 0);
    const label = tx("下書き — まだ保存していません");
    target.font = "10px 'Hiragino Kaku Gothic ProN', sans-serif";
    target.textAlign = "right";
    target.textBaseline = "top";
    const width = target.measureText(label).width + 12;
    target.fillStyle = "rgba(13,12,11,0.68)";
    target.fillRect(W - width - 10, 10, width, 18);
    target.fillStyle = "rgba(214,190,132,0.82)";
    target.fillText(label, W - 16, 13);
    target.restore();
  }

  function drawStage(target, showSelection, view) {
    const L = layout(view);
    refreshBases(L.size);
    buildPaintLayer(L);
    const S = target.canvas ? target.canvas.width / W : 1;
    target.save();
    target.setTransform(S, 0, 0, S, 0, 0);
    target.clearRect(0, 0, W, H);
    target.fillStyle = "#0d0c0b";
    target.fillRect(0, 0, W, H);
    // 二本指で拡大しているぶんを、ここで一度だけかける
    const zs = zoomOf(view);
    if (zs.z !== 1 || zs.ox || zs.oy) {
      target.setTransform(zs.z * S, 0, 0, zs.z * S, -zs.ox * zs.z * S, -zs.oy * zs.z * S);
    }

    if (L.plan) drawPlanVenue(target, L);
    else drawFrontVenue(target, L);

    // 煽りの席では、垂直だったはずの線が画面の上へ向かって集まる（三点透視）。
    // 見上げていることが絵として伝わるのは、人を大きく描くからではなく、この傾きによる。
    // 画面の中心から離れた演者ほど、頭が内側へ倒れる。
    const leanAt = (pos) => {
      const tilt = (L.seat && L.seat.tilt) || 0;
      if (!tilt || L.plan) return 0;
      return tilt * ((pos.x - L.centerX) / (W / 2));
    };

    // 演者と物。光は先に（奥に）描く
    const draw = (piece) => drawStagePiece(target, piece, L, leanAt);
    // 照明の出し入れは図ごと。消している図では描かず、掴めもしない
    const lightsOn = L.plan ? state.showLightsPlan : state.showLightsFront;
    const lightPieces = lightsOn ? sc().pieces.filter((p) => p.type === "light") : [];
    // 平面では、落ちる円は床の印なので駒の下に敷く
    if (L.plan) lightPieces.forEach(draw);
    /* 平面図は「床に何がどう置いてあるか」の図なので、宙に吊ってあるものは
     * 既定では出さない。要るときだけ出せるように入り切りを持つ。 */
    const shown = sc().pieces.filter((p) => !(L.plan && !state.showFlown && isFlown(p)));
    /* 正面図では奥から描く（重なりが自然になる）。
     * 平面図は真上から見た図なので、床から高い順に上へ重ねる。
     * ★並べ替えないと、盆や台をあとから足しただけで、その上に立っている人が
     *   台の下に隠れて見えなくなる（上から見ているのに関係が逆になる）。 */
    const solid = shown.filter((p) => p.type !== "light");
    /* 平面の重ね順。まず床に近いものから高いものへ。
     * 演者は、その上でさらに最後に描く。上から見た図で人が装置に埋もれると、
     * 誰がどこに立っているかという平面図の一番の用が果たせなくなる。 */
    const planLayer = (p) => (p.type === "performer" ? 1 : 0);
    const topH = (p) => finite(p.base, 0) + pieceTopLocal(p);
    (L.plan
      ? solid.slice().sort((a, b) => (planLayer(a) - planLayer(b)) || (topH(a) - topH(b)))
      : solid.slice().sort((a, b) => a.v - b.v)).forEach(draw);
    /* ★正面では光を物のあとに描く。物のあとに描かないと、台や人が
     *   光の帯を四角く切り抜いて、光が途中で切れて見える。
     *   光は物で消えない——帯は物の手前を横切り、当たった物が明るくなる。 */
    if (!L.plan) lightPieces.forEach(draw);

    /* はけていく途中の人。もうシーンの駒ではないので、ここで別に描く。
       袖へ近づくにつれて、待っている「舞台裏」の薄さ（0.55）へ溶かし込む。 */
    if (sceneAnim && sceneAnim.exits && sceneAnim.exits.length) {
      target.save();
      target.globalAlpha = 1 - 0.45 * (sceneAnim.progress || 0);
      sceneAnim.exits.forEach((entry) => draw(entry.piece));
      target.restore();
    }

    // 名前。頭上（平面では点の脇）に小さく置く。演者・装置・照明は別々に出し入れする
    if (state.showNames || state.showSetNames || state.showLightNames) {
      shown.forEach((piece) => {
        const wanted = piece.type === "performer" ? state.showNames
          : piece.type === "light" ? state.showLightNames
          : state.showSetNames;
        if (!wanted) return;
        const labelText = pieceLabel(piece);
        if (!labelText) return;
        const pos = placePiece(piece, L);
        const scale = pieceScale(piece, pos, L);
        const b = selectionBounds(piece, L);
        const x = L.plan ? pos.x : pos.x;
        const y = L.plan ? b.y - 9 : b.y - 10;
        target.save();
        target.font = `${Math.max(10, Math.round(13 * (L.plan ? 1 : Math.min(1.4, scale))))}px 'Hiragino Kaku Gothic ProN', sans-serif`;
        target.textAlign = "center";
        target.textBaseline = "bottom";
        const w = target.measureText(labelText).width;
        target.fillStyle = "rgba(13,12,11,0.66)";
        target.fillRect(x - w / 2 - 6, y - 15, w + 12, 18);
        target.fillStyle = "rgba(239,231,214,0.9)";
        target.fillText(labelText, x, y);
        target.restore();
      });
    }

    /* 動線は平面図だけ。上から見た床の上の道筋なので、正面図には出しようがない。
       ★転換アニメの最中は出さない（本人指定）。動いている駒の足元に
       「次の動線」が先回りして見えると、どちらが今の動きか分からなくなる */
    if (L.plan && anyRoutesShown() && !sceneAnim) drawRoutes(target, L, showSelection);
    // 自由矢印は作図の印なので、駒より手前へ置き、正面・平面の両方へ出す。
    drawArrows(target, L);
    drawNotes(target, L, view, showSelection);

    // 上がっているせりの縁をまたぐ駒は、操作を妨げない赤い破線だけで知らせる
    const warned = new Set();
    target.save();
    target.strokeStyle = "rgba(192,57,43,0.9)";
    target.setLineDash([5, 4]);
    target.lineWidth = 1.5;
    seriStraddlers(sc().pieces, L.size).forEach(({ piece }) => {
      if (warned.has(piece.id)) return;
      warned.add(piece.id);
      if (!L.plan && !onStageArea(pieceU(piece), pieceV(piece))) return;
      const foot = supportFootprint(piece);
      if (!foot) return;
      const rad = (finite(piece.facing, 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      target.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => {
        const lx = foot.cx + (sx * foot.w) / 2;
        const lz = foot.cz + (sz * foot.d) / 2;
        const p = floorPoint(piece, lx * cos - lz * sin, lx * sin + lz * cos, L);
        if (i) target.lineTo(p.x, p.y); else target.moveTo(p.x, p.y);
      });
      target.closePath();
      target.stroke();
    });
    target.setLineDash([]);
    target.restore();

    if (lightIntentOverlayOn()) drawLightIntentOverlay(target, L);

    if (showSelection) {
      const selected = sc().pieces.find((piece) => piece.id === selectedId);
      if (selected) drawSelection(target, selected, L);
    }

    /* 暗転で始まるシーンへの転換。前半で落ちて後半で明ける（山なりの黒幕）。
       動きの中身は幕の裏で起きるのが、暗転転換の本来の姿 */
    if (!L.plan && sceneAnim && sceneAnim.blackout) {
      const a = Math.sin(Math.PI * clamp(sceneAnim.progress || 0, 0, 1));
      target.fillStyle = `rgba(0,0,0,${(a * 0.96).toFixed(3)})`;
      target.fillRect(0, 0, W, H);
    }
    if (!L.plan) {
      const edgeShade = target.createRadialGradient(W / 2, H * 0.55, 180, W / 2, H * 0.55, W * 0.72);
      edgeShade.addColorStop(0.64, "rgba(0,0,0,0)");
      edgeShade.addColorStop(1, "rgba(0,0,0,0.3)");
      target.fillStyle = edgeShade;
      target.fillRect(0, 0, W, H);
      /* 見る位置の小図。客席が正面だけの劇場でしか意味を持たない。
         プレゼン中は出さない（見せる相手に必要なのは場面であって、
         いまどの席から描いているかという作り手側の道具ではない）。 */
      if (state.showSeatMap && L.venue.audience === "front" && !(presenting && target === ctx) && !L.venue.custom) drawSeatMap(target, L);
    }

    /* 高所の下の注意。ポールやトラピーズに居る人の真下（0.7m以内）に
       床の人が居たら、平面図に印を出す。安全の保証ではなく気づきのため */
    if (L.plan && featureOn("highwarn")) {
      const size3 = L.size;
      const highs = sc().pieces.filter((q) => q.type === "performer" && (q.base || 0) > 1.5);
      const lows = sc().pieces.filter((q) => q.type === "performer" && (q.base || 0) < 0.3);
      highs.forEach((hp) => {
        lows.forEach((lp) => {
          const d = Math.hypot((hp.u - lp.u) * (size3.width || 12), (hp.v - lp.v) * (size3.depth || 9));
          if (d < 0.7) {
            const pos3 = place(lp.u, lp.v, L);
            target.save();
            target.font = "15px sans-serif";
            target.textAlign = "center";
            target.fillText("⚠", pos3.x, pos3.y - 16);
            target.restore();
          }
        });
      });
    }

    /* 舞台裏の演者。袖に立たせ、薄く描いて「まだ出ていない」ことを示す。
       掴んで舞台へ引き入れると、その場でこのシーンに出る。 */
    if (L.plan) {
      backstageGhosts().forEach((g) => {
        // はけの途中の人は、まだ袖に着いていない。歩いている方だけを描く
        if (sceneAnim && sceneAnim.exits
          && sceneAnim.exits.some((e) => e.piece.castId === g.member.id)) return;
        const pos = place(g.u, g.v, L);
        target.save();
        target.globalAlpha = 0.55;
        const ghost = normalizePiece({
          id: `ghost-${g.member.id}`, type: "performer", castId: g.member.id,
          u: g.u, v: g.v, size: 100, color: g.member.color, name: "",
        }, 0);
        drawPlanPiece(target, ghost, pos, 1, L);
        target.restore();
        if (state.showNames) {
          target.save();
          target.globalAlpha = 0.7;
          target.fillStyle = "rgba(13,12,11,0.85)";
          const nm = g.member.name;
          target.font = "12px 'Hiragino Kaku Gothic ProN', sans-serif";
          const w = target.measureText(nm).width + 10;
          target.fillRect(pos.x - w / 2, pos.y - 30, w, 17);
          target.fillStyle = "rgba(240,231,214,0.8)";
          target.textAlign = "center";
          target.textBaseline = "middle";
          target.fillText(nm, pos.x, pos.y - 21);
          target.restore();
        }
      });
    }
    // 通常の駒・注記・操作表示を描き終えたあと、保存前のAI下書きを最後に重ねる。
    drawStageAskOverlay(target, L, leanAt);
    /* プレゼン中のシーンの説明。全画面になるのは canvas だけなので、
       HTMLで置いた欄は出てこない。見せている絵の中へ字で描く。
       ★描くのは全画面の正面図だけ。編集中の画面と、書き出す画像には出さない
         （絵の上に字が焼き付いてしまうため）。 */
    if (!L.plan && presenting && target === ctx) drawSceneCaption(target);
    target.restore();
  }

  /* 絵の下側に敷く説明の帯。暗い舞台の絵の上でも読めるよう、
     字の下だけを薄く落とす（絵全体を曇らせない）。 */
  function drawSceneCaption(target) {
    if (!featureOn("presentCaption")) return;
    const scene = sc();
    const text = (scene.note || "").trim();
    if (!text) return;
    /* 見出しはシーン名にする。〈シーンの説明〉という札は画面の道具の名前で、
       人に見せている絵の中では意味を持たない。見ている側が知りたいのは
       「いまどの場面か」なので、そこをシーン名で埋める。 */
    const title = (scene.title || "").trim();
    const pad = 34;
    const captionSizes = { small: 15, medium: 19, large: 25 };
    const captionSize = ["small", "medium", "large"].includes(prefs.presentCaptionSize)
      ? prefs.presentCaptionSize : "medium";
    const size = captionSizes[captionSize];
    const kick = Math.floor(size * 0.62);
    target.save();
    /* 説明の帯は絵の一部ではないので、拡大・移動には付き合わせない。
       付き合わせると、二本指で寄せたときに字だけ巨大になって枠から出る。 */
    const S = target.canvas ? target.canvas.width / W : 1;
    target.setTransform(S, 0, 0, S, 0, 0);
    target.font = `${size}px 'Hiragino Kaku Gothic ProN', sans-serif`;
    const lines = wrapCaption(target, text, W - pad * 2);
    const lineH = Math.round(size * 1.5);
    const kickH = title ? kick + 12 : 0;
    const boxH = lines.length * lineH + kickH + 30;
    const scrim = target.createLinearGradient(0, H - boxH - 40, 0, H);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(1, "rgba(0,0,0,0.78)");
    target.fillStyle = scrim;
    target.fillRect(0, H - boxH - 40, W, boxH + 40);
    target.textAlign = "left";
    target.textBaseline = "alphabetic";
    const ink = (line, x, y) => {
      // 影を先に置く。明るい背景の場面でも字が沈まない
      target.fillStyle = "rgba(0,0,0,0.55)";
      target.fillText(line, x + 1, y + 1);
      target.fillStyle = "rgba(244,238,226,0.96)";
      target.fillText(line, x, y);
    };
    const bottom = H - 22;
    lines.forEach((line, i) => ink(line, pad, bottom - (lines.length - 1 - i) * lineH));
    if (title) {
      target.font = `${kick}px 'Hiragino Kaku Gothic ProN', sans-serif`;
      target.fillStyle = "rgba(0,0,0,0.55)";
      target.fillText(title, pad + 1, bottom - (lines.length - 1) * lineH - lineH + 5);
      // シーン名は本文より一段落として、説明の方を主にする
      target.fillStyle = "rgba(214,190,132,0.86)";
      target.fillText(title, pad, bottom - (lines.length - 1) * lineH - lineH + 4);
    }
    target.restore();
  }

  /* 幅に収まるところで折り返す。日本語は単語の切れ目が無いので一文字ずつ測り、
     空白のある書き方（英語）は語の切れ目を優先する。
     ★上限は5行。説明は200字までなので、この幅なら普通は全部入る。
       それでも溢れたときだけ、末尾を「…」にして絵を潰さないようにする。 */
  const CAPTION_MAX_LINES = 5;
  function wrapCaption(target, text, maxW) {
    const out = [];
    text.split("\n").forEach((para) => {
      let line = "";
      const units = /\s/.test(para) ? para.split(/(\s+)/) : Array.from(para);
      units.forEach((unit) => {
        const next = line + unit;
        if (line && target.measureText(next).width > maxW) {
          out.push(line.trim());
          line = /^\s+$/.test(unit) ? "" : unit;
        } else {
          line = next;
        }
      });
      if (line.trim()) out.push(line.trim());
    });
    if (out.length <= CAPTION_MAX_LINES) return out;
    const kept = out.slice(0, CAPTION_MAX_LINES);
    const last = kept[CAPTION_MAX_LINES - 1];
    kept[CAPTION_MAX_LINES - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`;
    return kept;
  }

  function render() {
    enforceTabletSingleView();
    enforcePhoneViews();
    syncArrowOptions();
    syncLightIntentCard();
    syncLightIntentDock();
    syncLightIntentCompare();
    const v = venue();
    const size = venueSize();
    const counts = Object.keys(PIECE_TYPES)
      .map((type) => `${pieceTypeName(type)} ${sc().pieces.filter((piece) => piece.type === type).length}`)
      .join(isEn() ? ", " : "、");

    // 閉じてもバーは残す。ここから開き直せるので「見る向き」の項目は要らない。
    // セル自体は隠さない（隠すとバーごと消え、開き直す入口が無くなる）
    if (els.frontCell) els.frontCell.hidden = false;
    if (els.planCell) els.planCell.hidden = false;
    if (els.frontInner) els.frontInner.hidden = !state.showFront;
    if (els.planInner) els.planInner.hidden = !state.showPlan;
    if (els.frontCell) els.frontCell.classList.toggle("is-closed", !state.showFront);
    if (els.planCell) els.planCell.classList.toggle("is-closed", !state.showPlan);
    document.querySelectorAll("[data-toggle-view]").forEach((b) => {
      const open = b.dataset.toggleView === "front" ? state.showFront : state.showPlan;
      // 開閉であることが記号で分かるように三角にする（✕だと消去に見える）
      b.textContent = open ? "▾" : "▸";
      b.setAttribute("aria-expanded", String(open));
      b.setAttribute("aria-label", isEn()
        ? `${open ? "Close" : "Open"} the ${b.dataset.toggleView === "front" ? "front" : "plan"} view`
        : `${b.dataset.toggleView === "front" ? "正面" : "平面"}の絵を${open ? "閉じる" : "開く"}`);
    });

    if (state.showFront) {
      drawStage(ctx, true, "front");
      canvas.setAttribute("aria-label", isEn()
        ? `Front view of ${venueName(v)} (${sizeName(size)}) from ${seatName(VENUES.seatById(state.seat))}. ${counts}. ${sc().strokes.length} backdrop strokes.`
        : `${v.label}（${size.label}）を${VENUES.seatById(state.seat).label}から見た正面図。${counts}。背景の線${sc().strokes.length}本。`);
    }
    if (state.showPlan && planCtx) {
      drawStage(planCtx, true, "plan");
      planCanvas.setAttribute("aria-label", isEn()
        ? `Plan view of ${venueName(v)} (${sizeName(size)}) from above. ${counts}.`
        : `${v.label}（${size.label}）を上から見た平面図。${counts}。`);
    }
    if (els.frontCaption) {
      const L = layout("front");
      const pannable = L.panRange > 0 || L.panRangeY > 0;
      /* 席の札が同じ行に並ぶので、見出しは絵の名前だけでよい。
         「何もない所を掴むと視線を振れる」ことは、掴んだときの手の形（カーソル）で伝える。 */
      els.frontCaption.textContent = tx("正面");
      canvas.dataset.pannable = pannable ? "true" : "false";
    }
    syncSceneBar();
    syncSceneDesc();
    syncPhoneViewer();
  }

  /* 絵の上の送り。いま何場面目かを添えて、端では押せなくする。
     一覧を畳んでいても、ここだけで前後へ行けるようにするための行。 */
  function syncSceneBar() {
    // 章の見出し（section）は場面ではないので、送りの数には入れない
    const scenes = (state.project.scenes || []).filter((row) => row.kind === "scene");
    const index = Math.max(0, scenes.findIndex((row) => row.id === state.project.activeSceneId));
    if (els.scenePrev) els.scenePrev.disabled = index <= 0;
    if (els.sceneNext) els.sceneNext.disabled = index >= scenes.length - 1;
    if (els.sceneNow) {
      const scene = scenes[index] || sc();
      els.sceneNow.textContent = scene
        ? `${index + 1} / ${Math.max(1, scenes.length)}　${sceneNavigationTitle(scene, index)}`.trimEnd()
        : "";
    }
  }

  /* シーンのメモを正面の絵の真上に出す。ここでそのまま書き直せる。
     ★打っている最中は value を書き換えない。書き換えると変換中の文字が飛び、
       カーソルも末尾へ跳ねる（シーン一覧側の欄と同じ扱い）。 */
  function syncSceneDesc() {
    if (!els.sceneDesc) return;
    const scene = sc();
    const text = scene && scene.note ? scene.note : "";
    if (els.sceneDescLabel) els.sceneDescLabel.textContent = tx("シーンの説明");
    const box = els.sceneDescText;
    if (box) {
      box.placeholder = tm("misc", "sceneNoteHint", "この場面で何が起きるか");
      box.setAttribute("aria-label", tx("シーンの説明"));
      // セクション（章の見出し）には場面の中身が無いので、書く欄も出さない
      const editable = !scene || scene.kind !== "section";
      els.sceneDesc.hidden = !editable;
      if (!editable) return;
      if (document.activeElement !== box && box.value !== text) box.value = text;
      growSceneDesc();
    }
  }

  /* 行数に合わせて高さを詰める。既定の2行分を空けておくと、
     一行しか書いていない場面で絵の上に空白の帯ができる。 */
  const SCENE_DESC_LINE = 19;   // 一行ぶんの高さ(px)。空の欄はこれで確定させる

  function growSceneDesc() {
    const box = els.sceneDescText;
    if (!box) return;
    /* 空のときは測らない。字も組み方も決まっていない読み込み途中に測ると、
       伸び縮みする器（flex の行）の空き高さを拾って、一行も書いていない場面で
       欄だけ厚くなる。実際それで帯が96pxのまま固まっていた。 */
    if (!box.value) { box.style.height = `${SCENE_DESC_LINE}px`; return; }
    // 書いてあるときは、いったん0まで潰してから中身の高さを測る
    box.style.height = "0px";
    box.style.height = `${Math.min(96, Math.max(SCENE_DESC_LINE, box.scrollHeight))}px`;
  }

  /* 幅が決まってから測り直す。
     読み込みの途中は欄の幅がまだ決まっておらず、そこで測った高さのまま
     固まると、一行しか書いていない場面でも帯が厚いままになる。
     幅が変わったときだけ測り直す（高さを変えた分で呼び返さないため）。 */
  if (typeof ResizeObserver === "function" && els.sceneDesc) {
    let lastWidth = -1;
    new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width);
      if (width === lastWidth) return;
      lastWidth = width;
      growSceneDesc();
    }).observe(els.sceneDesc);
  }

  if (els.sceneDescText) {
    els.sceneDescText.addEventListener("input", () => {
      const scene = sc();
      if (!scene) return;
      scene.note = els.sceneDescText.value.slice(0, 200);
      growSceneDesc();
      /* シーン一覧側の同じ欄も合わせる（二つの欄が食い違って見えないように）。
         一覧ごと組み直すと打つたびに作り直しになるので、その欄だけ書き換える。 */
      const twin = document.getElementById("stage-scene-note-input");
      if (twin && twin !== document.activeElement) twin.value = scene.note;
      // プレゼン中は絵の中に字で描いているので、そちらも描き直す
      if (presenting) render();
      persistSoon();
    });
  }

  /* ---------- 光の意図カード ----------
     フォームへ打っている間に state から値を書き戻すと、日本語変換中の文字が飛ぶ。
     フォーカス中の欄は触らず、最初の入力前だけ履歴へ積んで、その後は即時保存する。 */
  function syncLightIntentCard() {
    if (!els.lightIntent) return;
    const scene = sc();
    const editable = featureOn("lightIntent") && Boolean(scene && scene.kind === "scene");
    els.lightIntent.hidden = !editable;
    if (!editable) return;
    const saved = normalizeLightingIntent("scene", scene.lightingIntent);
    const intent = saved || emptyLightingIntent();
    if (els.lightIntentSummary) {
      els.lightIntentSummary.textContent = saved
        ? lightingIntentSummary(saved, isEn(), 150)
        : tx("光で何を起こしたい？");
    }
    const setValue = (element, value) => {
      if (element && document.activeElement !== element && element.value !== value) element.value = value;
    };
    setValue(els.lightObjective, intent.objective);
    setValue(els.lightAudienceFocus, intent.audienceFocus);
    setValue(els.lightPerformerIntent, intent.layers.performer.intent);
    setValue(els.lightPerformerNote, intent.layers.performer.note);
    setValue(els.lightSpaceIntent, intent.layers.space.intent);
    setValue(els.lightSpaceNote, intent.layers.space.note);
    setValue(els.lightBackgroundIntent, intent.layers.background.intent);
    setValue(els.lightBackgroundNote, intent.layers.background.note);
    setValue(els.lightTriggerType, intent.transition.triggerType);
    setValue(els.lightChange, intent.transition.change);
    setValue(els.lightTempo, intent.transition.tempo);
    setValue(els.lightTriggerNote, intent.transition.triggerNote);
    setValue(els.lightMood, intent.mood);
    setValue(els.lightReferenceNote, intent.referenceNote);
    setValue(els.lightImplementationNote, intent.implementationNote);
    if (els.lightIntentClear) els.lightIntentClear.disabled = !saved;
    els.lightIntent.classList.toggle("has-value", Boolean(saved));
  }

  const syncLightIntentDock = () => {
    const area = document.getElementById("stage-work-area");
    if (!area || !els.lightIntent) return;
    area.classList.toggle("is-docked", els.lightIntent.open && !els.lightIntent.hidden);
  };

  const lightIntentCompareText = () => {
    const intent = normalizeLightingIntent("scene", sc().lightingIntent);
    if (!intent) return tx("指定なし");
    const lang = isEn() ? "en" : "ja";
    const parts = ["performer", "space", "background"].flatMap((key) => {
      const value = intent.layers[key].intent;
      if (value === "unspecified") return [];
      return [`${LIGHT_INTENT_LAYER_LABELS[lang][key]}=${LIGHT_INTENT_VALUE_LABELS[lang][value]}`];
    });
    return parts.join(isEn() ? " / " : " ／ ") || tx("指定なし");
  };

  const lightIntentLightsText = () => {
    const order = ["hang", "ss", "front", "floor"];
    const counts = Object.fromEntries(order.map((key) => [key, 0]));
    const lights = sc().pieces.filter((piece) => piece.type === "light");
    lights.forEach((piece) => { counts[lightKindOf(pieceSet(piece))] += 1; });
    if (!lights.length) return isEn() ? "0 lights" : "0個";
    const names = isEn()
      ? { hang: "hang", ss: "SS", front: "front", floor: "floor" }
      : { hang: "吊り", ss: "SS", front: "前明かり", floor: "転がし" };
    const detail = order.filter((key) => counts[key])
      .map((key) => `${names[key]}${isEn() ? " " : ""}${counts[key]}`)
      .join(isEn() ? ", " : "・");
    return isEn()
      ? `${lights.length} ${lights.length === 1 ? "light" : "lights"} (${detail})`
      : `${lights.length}個（${detail}）`;
  };

  function syncLightIntentCompare() {
    if (!els.lightIntentCompare) return;
    const visible = lightIntentOverlayOn();
    els.lightIntentCompare.hidden = !visible;
    if (!visible) return;
    if (els.lightIntentCompareIntent) els.lightIntentCompareIntent.textContent = lightIntentCompareText();
    if (els.lightIntentCompareLights) els.lightIntentCompareLights.textContent = lightIntentLightsText();
  }

  if (els.lightIntent) {
    els.lightIntent.addEventListener("toggle", () => {
      syncLightIntentDock();
      render();
    });
  }

  /* 光の意図が変わったら、重ねを出している間は図も描き直す。
     Phase 1では意図は図に影響しなかったのでカードの再描画だけで足りたが、
     Phase 2では「選び直した瞬間に図が変わる」ことがこの機能の要になる。
     重ねを出していないときは描き直さない（無駄な再描画を増やさない）。 */
  const redrawForLightIntent = () => {
    if (lightIntentOverlayOn()) render();
  };

  function mutateLightingIntent(mutator, message = "光の意図を更新しました。") {
    const scene = sc();
    if (!scene || scene.kind !== "scene") return;
    const before = normalizeLightingIntent("scene", scene.lightingIntent);
    const draft = projectIoClone(before || emptyLightingIntent());
    mutator(draft);
    const next = normalizeLightingIntent("scene", draft);
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    checkpoint();
    scene.lightingIntent = next;
    renderScenes();
    syncLightIntentCard();
    redrawForLightIntent();
    persistSoon();
    announce(message);
  }

  const lightIntentTextSessions = new WeakMap();
  const bindLightIntentText = (element, updater) => {
    if (!element) return;
    const begin = () => {
      if (!lightIntentTextSessions.has(element)) {
        lightIntentTextSessions.set(element, { before: snapshot(), changed: false });
      }
    };
    element.addEventListener("focus", begin);
    element.addEventListener("input", () => {
      const scene = sc();
      if (!scene || scene.kind !== "scene") return;
      begin();
      const session = lightIntentTextSessions.get(element);
      const before = normalizeLightingIntent("scene", scene.lightingIntent);
      const draft = projectIoClone(before || emptyLightingIntent());
      updater(draft, element.value);
      const next = normalizeLightingIntent("scene", draft);
      if (JSON.stringify(before) === JSON.stringify(next)) return;
      if (!session.changed) {
        recordBefore(session.before);
        state.editsSinceExport = (state.editsSinceExport || 0) + 1;
        updateBackupNote();
        session.changed = true;
      }
      scene.lightingIntent = next;
      renderScenes();
      syncLightIntentCard();
      redrawForLightIntent();
      persistSoon();
    });
    element.addEventListener("change", () => {
      const session = lightIntentTextSessions.get(element);
      if (session?.changed) announce("光の意図を更新しました。");
      lightIntentTextSessions.delete(element);
      syncLightIntentCard();
    });
    element.addEventListener("blur", () => lightIntentTextSessions.delete(element));
  };
  const bindLightIntentSelect = (element, updater) => {
    if (!element) return;
    element.addEventListener("change", () => {
      mutateLightingIntent((intent) => updater(intent, element.value));
    });
  };

  bindLightIntentText(els.lightObjective, (intent, value) => { intent.objective = value; });
  bindLightIntentText(els.lightAudienceFocus, (intent, value) => { intent.audienceFocus = value; });
  bindLightIntentSelect(els.lightPerformerIntent, (intent, value) => { intent.layers.performer.intent = value; });
  bindLightIntentText(els.lightPerformerNote, (intent, value) => { intent.layers.performer.note = value; });
  bindLightIntentSelect(els.lightSpaceIntent, (intent, value) => { intent.layers.space.intent = value; });
  bindLightIntentText(els.lightSpaceNote, (intent, value) => { intent.layers.space.note = value; });
  bindLightIntentSelect(els.lightBackgroundIntent, (intent, value) => { intent.layers.background.intent = value; });
  bindLightIntentText(els.lightBackgroundNote, (intent, value) => { intent.layers.background.note = value; });
  bindLightIntentSelect(els.lightTriggerType, (intent, value) => { intent.transition.triggerType = value; });
  bindLightIntentSelect(els.lightChange, (intent, value) => { intent.transition.change = value; });
  bindLightIntentSelect(els.lightTempo, (intent, value) => { intent.transition.tempo = value; });
  bindLightIntentText(els.lightTriggerNote, (intent, value) => { intent.transition.triggerNote = value; });
  bindLightIntentText(els.lightMood, (intent, value) => { intent.mood = value; });
  bindLightIntentText(els.lightReferenceNote, (intent, value) => { intent.referenceNote = value; });
  bindLightIntentText(els.lightImplementationNote, (intent, value) => { intent.implementationNote = value; });
  if (els.lightIntentClear) {
    els.lightIntentClear.addEventListener("click", () => {
      const scene = sc();
      if (!scene || !scene.lightingIntent) return;
      checkpoint();
      scene.lightingIntent = null;
      renderScenes();
      syncLightIntentCard();
      persistSoon();
      announce("光の意図を消しました。一つ戻すで復元できます。");
    });
  }

  /* ---------- 劇場のUI ---------- */

  /* ---------- パネルの組み立てと並べ替え ---------- */

  const colEls = {
    left: document.getElementById("stage-col-left"),
    right: document.getElementById("stage-col-right"),
    center: document.getElementById("stage-col-center"),
  };

  function panelEl(id) {
    return document.querySelector(`[data-panel="${id}"]`);
  }

  /* ---------- スマホ専用の閲覧ワークスペース ----------
     編集用の三列UIは見せず、JSON読込・場面送り・情報・付箋だけを残す。
     縦は二面、横は一面なので、端末を回しても最後に見ていた向きを覚えておく。 */
  function makePhoneButton(text, label, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stage-phone-button${className ? ` ${className}` : ""}`;
    button.textContent = text;
    button.setAttribute("aria-label", label);
    return button;
  }

  function phoneIsPortrait() {
    return phoneOrientation.matches;
  }

  function sceneNavigationTitle(scene, index) {
    const title = String((scene && scene.title) || "");
    return title.replace(new RegExp(`^\\s*${index + 1}\\s+`), "");
  }

  function enforcePhoneViews(preferred) {
    if (!phoneViewerActive) return;
    if (phoneUi && (preferred === "front" || preferred === "plan")) {
      phoneUi.singleView = preferred;
    }
    if (phoneIsPortrait()) {
      state.showFront = true;
      state.showPlan = true;
      return;
    }
    const which = phoneUi && phoneUi.singleView === "plan" ? "plan" : "front";
    state.showFront = which === "front";
    state.showPlan = which === "plan";
  }

  function syncPhoneViewer() {
    if (!phoneUi) return;
    const scenes = state.project.scenes.filter((row) => row.kind === "scene");
    const found = scenes.findIndex((row) => row.id === state.project.activeSceneId);
    const index = found < 0 ? 0 : found;
    const scene = scenes[index] || sc();
    const navigationTitle = sceneNavigationTitle(scene, index);
    phoneUi.sceneCurrent.textContent = `${index + 1} / ${Math.max(1, scenes.length)}  ${navigationTitle}`;
    phoneUi.scenePrev.disabled = index <= 0;
    phoneUi.sceneNext.disabled = index >= scenes.length - 1;
    phoneUi.projectName.textContent = state.project.title || "舞台スケッチ";
    phoneUi.infoProject.textContent = `${state.project.title || "舞台スケッチ"}  ${state.project.versionLabel || ""}`.trim();
    phoneUi.infoScene.textContent = `${index + 1} / ${Math.max(1, scenes.length)}  ${navigationTitle}`;
    if (document.activeElement !== phoneUi.sceneNote) phoneUi.sceneNote.value = scene.note || "";
    phoneUi.noteToggle.textContent = tool === "note" ? "メモ終了" : "メモ";
    phoneUi.noteToggle.setAttribute("aria-pressed", String(tool === "note"));
    phoneUi.infoToggle.setAttribute("aria-pressed", String(phoneUi.infoOpen));
    phoneUi.load.setAttribute("aria-pressed", String(phoneUi.sourceOpen));
    phoneUi.infoPanel.hidden = !phoneUi.infoOpen;
    phoneUi.sourcePanel.hidden = !phoneUi.sourceOpen;
    phoneUi.board.classList.toggle("is-phone-info-open", phoneUi.infoOpen);
    phoneUi.viewToggle.hidden = phoneIsPortrait();
    const nextView = state.showFront ? "plan" : "front";
    phoneUi.viewToggle.dataset.phoneView = nextView;
    phoneUi.viewToggle.textContent = nextView === "plan" ? "平面図へ" : "正面図へ";
    phoneUi.viewToggle.setAttribute("aria-label", `${phoneUi.viewToggle.textContent}切り替える`);
  }

  function initPhoneViewerWorkspace() {
    if (!phoneViewerActive || phoneUi) return;
    const board = document.getElementById("stage-col-center");
    if (!board) return;

    const toolbar = document.createElement("div");
    toolbar.className = "stage-phone-toolbar";
    toolbar.setAttribute("aria-label", "スマホ閲覧用の操作");

    const actions = document.createElement("div");
    actions.className = "stage-phone-actions";
    const load = makePhoneButton("読込", "開くショーを選ぶ", "stage-phone-load");
    load.setAttribute("aria-pressed", "false");
    const projectName = document.createElement("strong");
    projectName.className = "stage-phone-project";
    const infoToggle = makePhoneButton("情報", "シーン情報を表示する", "stage-phone-info-toggle");
    infoToggle.setAttribute("aria-pressed", "false");
    const noteToggle = makePhoneButton("メモ", "図にメモを追加する", "stage-phone-note-toggle");
    noteToggle.setAttribute("aria-pressed", "false");
    const viewToggle = makePhoneButton("平面図へ", "平面図へ切り替える", "stage-phone-view-toggle");
    actions.append(load, projectName, infoToggle, noteToggle, viewToggle);

    const sceneBar = document.createElement("div");
    sceneBar.className = "stage-phone-scene-bar";
    const scenePrev = makePhoneButton("‹", "前のシーンへ", "stage-phone-scene-prev");
    const sceneCurrent = document.createElement("div");
    sceneCurrent.className = "stage-phone-scene-current";
    sceneCurrent.setAttribute("aria-live", "polite");
    const sceneNext = makePhoneButton("›", "次のシーンへ", "stage-phone-scene-next");
    sceneBar.append(scenePrev, sceneCurrent, sceneNext);
    toolbar.append(actions, sceneBar);

    const infoPanel = document.createElement("section");
    infoPanel.className = "stage-phone-info";
    infoPanel.setAttribute("aria-label", "読み込んだシーンの情報");
    infoPanel.hidden = true;
    const infoProject = document.createElement("strong");
    const infoScene = document.createElement("span");
    const sceneNote = document.createElement("textarea");
    sceneNote.rows = 2;
    sceneNote.maxLength = 200;
    sceneNote.placeholder = "このシーンのメモ";
    sceneNote.setAttribute("aria-label", "シーンのメモ");
    infoPanel.append(infoProject, infoScene, sceneNote);

    const sourcePanel = document.createElement("section");
    sourcePanel.className = "stage-phone-source";
    sourcePanel.setAttribute("aria-label", "開くショーを選ぶ");
    sourcePanel.hidden = true;
    const sourceTitle = document.createElement("strong");
    sourceTitle.textContent = "ショーを開く";
    const fileButton = makePhoneButton("JSONファイル", "JSONファイルからショーを開く");
    const seamSampleButton = makePhoneButton("継ぎ目の庭", "継ぎ目の庭のサンプルを開く");
    const sampleButton = makePhoneButton("サンプルショー", "サンプルショーを開く");
    const sourceClose = makePhoneButton("閉じる", "ショー選択を閉じる");
    sourcePanel.append(sourceTitle, fileButton, seamSampleButton, sampleButton, sourceClose);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.className = "stage-phone-file-input";
    fileInput.hidden = true;
    fileInput.setAttribute("aria-hidden", "true");
    toolbar.append(fileInput);
    board.prepend(sourcePanel);
    board.prepend(infoPanel);
    board.prepend(toolbar);

    phoneUi = {
      board, toolbar, actions, load, projectName, infoToggle, noteToggle, viewToggle,
      scenePrev, sceneCurrent, sceneNext, infoPanel, infoProject, infoScene,
      sceneNote, sourcePanel, fileButton, seamSampleButton, sampleButton, sourceClose, fileInput,
      infoOpen: false, sourceOpen: false,
      singleView: state.showPlan && !state.showFront ? "plan" : "front",
    };

    load.addEventListener("click", () => {
      phoneUi.sourceOpen = !phoneUi.sourceOpen;
      if (phoneUi.sourceOpen) phoneUi.infoOpen = false;
      syncPhoneViewer();
    });
    fileButton.addEventListener("click", () => fileInput.click());
    seamSampleButton.addEventListener("click", () => {
      phoneUi.sourceOpen = false;
      phoneUi.singleView = "front";
      openSeamGardenSampleShow();
    });
    sampleButton.addEventListener("click", () => {
      phoneUi.sourceOpen = false;
      phoneUi.singleView = "front";
      openSampleShow();
    });
    sourceClose.addEventListener("click", () => {
      phoneUi.sourceOpen = false;
      syncPhoneViewer();
    });
    fileInput.addEventListener("change", () => {
      phoneUi.sourceOpen = false;
      importProject(fileInput.files && fileInput.files[0]);
      fileInput.value = "";
    });
    scenePrev.addEventListener("click", () => stepScene(-1));
    sceneNext.addEventListener("click", () => stepScene(1));
    infoToggle.addEventListener("click", () => {
      phoneUi.infoOpen = !phoneUi.infoOpen;
      if (phoneUi.infoOpen) phoneUi.sourceOpen = false;
      syncPhoneViewer();
    });
    noteToggle.addEventListener("click", () => {
      setTool(tool === "note" ? "select" : "note");
      syncPhoneViewer();
    });
    viewToggle.addEventListener("click", () => {
      enforcePhoneViews(viewToggle.dataset.phoneView);
      applyLayout();
      syncViewSwitch();
      render();
      persistSoon();
    });
    sceneNote.addEventListener("input", () => {
      sc().note = sceneNote.value.slice(0, 200);
      syncSceneDesc();
      persistSoon();
    });

    const orient = () => {
      closeNoteEditor();
      enforcePhoneViews();
      applyLayout();
      syncViewSwitch();
      render();
    };
    if (phoneOrientation.addEventListener) phoneOrientation.addEventListener("change", orient);
    else if (phoneOrientation.addListener) phoneOrientation.addListener(orient);
    enforcePhoneViews();
    syncPhoneViewer();
  }

  /* ---------- iPad PWA専用ワークスペース ----------
     デスクトップのパネルを複製せず、PWAでだけ左ドロワーへ移して使う。
     同じinput/buttonを動かすので、保存や描画の処理は一系統のまま保てる。 */
  const TABLET_MENU_GROUPS = [
    { id: "show", icon: "▣", label: "ショー", panels: ["project", "study"] },
    { id: "cast", icon: "●", label: "出演・装置", panels: ["cast", "rigs"] },
    { id: "look", icon: "☀", label: "照明・背景", panels: ["light", "background"] },
    { id: "scenes", icon: "◫", label: "シーン", panels: ["scenes"] },
    { id: "inspect", icon: "◎", label: "選んだもの", panels: ["inspector"] },
    { id: "settings", icon: "⚙", label: "保存・設定", panels: ["save"], special: "display" },
  ];

  function makeTabletButton(iconText, label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    const icon = document.createElement("span");
    icon.className = "stage-tablet-rail-icon";
    icon.textContent = iconText;
    icon.setAttribute("aria-hidden", "true");
    const word = document.createElement("span");
    word.className = "stage-tablet-rail-label";
    word.textContent = label;
    button.append(icon, word);
    return button;
  }

  function prepareTabletPanelPages(id, store) {
    const panel = panelEl(id);
    if (!panel) return [];
    panel.classList.add("stage-tablet-drawer-panel");
    const body = panel.querySelector(":scope > .stage-panel-body");
    if (!body) return [];
    body.hidden = false;

    const existing = [...body.querySelectorAll(":scope > .stage-tablet-panel-page")];
    if (existing.length) {
      store.append(panel);
      return existing.map((content, index) => ({
        host: panel, content,
        title: `${panel.dataset.title || id}${existing.length > 1 ? ` ${index + 1}` : ""}`,
      }));
    }

    const groups = [];
    let current = [];
    [...body.children].forEach((child) => {
      if (child.hasAttribute("data-tablet-break-before") && current.length) {
        groups.push(current);
        current = [];
      }
      current.push(child);
    });
    if (current.length) groups.push(current);
    if (!groups.length) groups.push([]);

    const pages = groups.map((nodes, index) => {
      const page = document.createElement("div");
      page.className = "stage-tablet-panel-page";
      page.hidden = index !== 0;
      nodes.forEach((node) => page.append(node));
      body.append(page);
      const pageTitle = nodes.find((node) => node.dataset && node.dataset.tabletPageTitle);
      return {
        host: panel,
        content: page,
        title: pageTitle
          ? pageTitle.dataset.tabletPageTitle
          : `${panel.dataset.title || id}${groups.length > 1 ? ` ${index + 1}` : ""}`,
      };
    });
    store.append(panel);
    return pages;
  }

  function prepareTabletSpecialPage(id, title, node, store) {
    if (!node) return [];
    const host = document.createElement("section");
    host.className = `stage-tablet-special-panel stage-tablet-special-${id}`;
    const page = document.createElement("div");
    page.className = "stage-tablet-panel-page";
    page.append(node);
    host.append(page);
    store.append(host);
    return [{ host, content: page, title }];
  }

  function enforceTabletSingleView(preferred) {
    if (!tabletPwaActive) return;
    if (tabletOrientation.matches) {
      if (state.showFront !== state.showPlan) {
        const current = state.showFront ? "front" : "plan";
        try { localStorage.setItem("shosai-stage-tablet-view", current); } catch (_) { /* 続ける */ }
      }
      state.showFront = true;
      state.showPlan = true;
      return;
    }
    let which = preferred;
    if (which !== "front" && which !== "plan") {
      if (state.showFront !== state.showPlan) which = state.showFront ? "front" : "plan";
      else {
        try { which = localStorage.getItem("shosai-stage-tablet-view") || "front"; }
        catch (_) { which = "front"; }
      }
    }
    if (which !== "plan") which = "front";
    state.showFront = which === "front";
    state.showPlan = which === "plan";
    try { localStorage.setItem("shosai-stage-tablet-view", which); } catch (_) { /* 続ける */ }
  }

  function syncTabletSceneBar() {
    if (!tabletUi) return;
    const scenes = state.project.scenes.filter((row) => row.kind === "scene");
    const index = Math.max(0, scenes.findIndex((row) => row.id === state.project.activeSceneId));
    const scene = scenes[index] || sc();
    tabletUi.sceneCurrent.textContent = `${index + 1} / ${Math.max(1, scenes.length)}  ${sceneNavigationTitle(scene, index)}`;
    tabletUi.scenePrev.disabled = index <= 0;
    tabletUi.sceneNext.disabled = index >= scenes.length - 1;
  }

  function syncTabletWorkspace() {
    if (!tabletUi) return;
    tabletUi.viewToggle.hidden = tabletOrientation.matches;
    const nextView = state.showFront ? "plan" : "front";
    const nextLabel = nextView === "plan" ? "平面図へ" : "正面図へ";
    tabletUi.viewToggle.dataset.tabletView = nextView;
    tabletUi.viewToggle.querySelector(".stage-tablet-rail-icon").textContent = nextView === "plan" ? "▦" : "▤";
    tabletUi.viewToggle.querySelector(".stage-tablet-rail-label").textContent = nextLabel;
    tabletUi.viewToggle.setAttribute("aria-label", `${nextLabel}切り替える`);
    tabletUi.groupButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(
        !tabletUi.drawer.hidden && button.dataset.tabletGroup === tabletUi.groupId
      ));
    });
    syncTabletSceneBar();
  }

  function showTabletDrawerPage() {
    if (!tabletUi) return;
    const group = tabletUi.groups.find((item) => item.id === tabletUi.groupId);
    if (!group || !group.pages.length) return;
    tabletUi.pageIndex = clamp(tabletUi.pageIndex, 0, group.pages.length - 1);
    const page = group.pages[tabletUi.pageIndex];
    tabletUi.drawerBody.replaceChildren(page.host);
    page.host.hidden = false;
    const body = page.host.querySelector(":scope > .stage-panel-body");
    if (body) body.hidden = false;
    page.host.querySelectorAll(".stage-tablet-panel-page").forEach((candidate) => {
      candidate.hidden = candidate !== page.content;
    });
    tabletUi.drawerTitle.textContent = page.title;
    tabletUi.pageCount.textContent = `${tabletUi.pageIndex + 1} / ${group.pages.length}`;
    tabletUi.pagePrev.disabled = tabletUi.pageIndex <= 0;
    tabletUi.pageNext.disabled = tabletUi.pageIndex >= group.pages.length - 1;
    syncTabletWorkspace();
  }

  function closeTabletDrawer() {
    if (!tabletUi) return;
    tabletUi.drawer.hidden = true;
    tabletUi.grid.classList.remove("is-tablet-drawer-open");
    syncTabletWorkspace();
  }

  function openTabletGroup(id) {
    if (!tabletUi) return;
    if (!tabletUi.drawer.hidden && tabletUi.groupId === id) {
      closeTabletDrawer();
      return;
    }
    const group = tabletUi.groups.find((item) => item.id === id);
    if (!group || !group.pages.length) return;
    tabletUi.groupId = id;
    tabletUi.pageIndex = 0;
    tabletUi.drawer.hidden = false;
    tabletUi.grid.classList.add("is-tablet-drawer-open");
    showTabletDrawerPage();
  }

  function initTabletPwaWorkspace() {
    if (!tabletPwaActive || tabletUi) return;
    const grid = document.querySelector(".stage-sketch-grid");
    const board = document.getElementById("stage-col-center");
    const centerBar = board && board.querySelector(":scope > .stage-center-bar");
    const header = document.querySelector(".stage-sketch-head");
    const toolGrid = centerBar && centerBar.querySelector(".stage-tool-grid");
    const nameToggles = centerBar ? [...centerBar.querySelectorAll(".stage-name-toggle")] : [];
    const historyActions = document.querySelector(".stage-sketch-head .stage-history-actions");
    if (!grid || !board || !header) return;

    const topControls = document.createElement("div");
    topControls.className = "stage-tablet-top-controls";
    if (toolGrid) topControls.append(toolGrid);
    if (historyActions) topControls.append(historyActions);
    header.append(topControls);

    const displayMenu = document.createElement("div");
    displayMenu.className = "stage-tablet-display-menu";
    nameToggles.forEach((toggle) => displayMenu.append(toggle));

    const rail = document.createElement("nav");
    rail.className = "stage-tablet-rail";
    rail.setAttribute("aria-label", "舞台スケッチの道具");
    const viewBox = document.createElement("div");
    viewBox.className = "stage-tablet-view-buttons";
    const viewToggle = makeTabletButton("▦", "平面図へ", "stage-tablet-rail-button");
    viewToggle.dataset.tabletView = "plan";
    viewBox.append(viewToggle);
    const separator = document.createElement("span");
    separator.className = "stage-tablet-rail-separator";
    separator.setAttribute("aria-hidden", "true");
    rail.append(viewBox, separator);

    const drawer = document.createElement("aside");
    drawer.className = "stage-tablet-drawer";
    drawer.setAttribute("aria-label", "選んだ道具の内容");
    drawer.hidden = true;
    const drawerHead = document.createElement("header");
    drawerHead.className = "stage-tablet-drawer-head";
    const drawerTitle = document.createElement("h2");
    const drawerClose = document.createElement("button");
    drawerClose.type = "button";
    drawerClose.textContent = "×";
    drawerClose.setAttribute("aria-label", "メニューを閉じる");
    drawerHead.append(drawerTitle, drawerClose);
    const drawerBody = document.createElement("div");
    drawerBody.className = "stage-tablet-drawer-body";
    const store = document.createElement("div");
    store.className = "stage-tablet-panel-store";
    store.hidden = true;
    const drawerFoot = document.createElement("footer");
    drawerFoot.className = "stage-tablet-drawer-foot";
    const pagePrev = document.createElement("button");
    pagePrev.type = "button";
    pagePrev.textContent = "前へ";
    const pageCount = document.createElement("span");
    pageCount.setAttribute("aria-live", "polite");
    const pageNext = document.createElement("button");
    pageNext.type = "button";
    pageNext.textContent = "次へ";
    drawerFoot.append(pagePrev, pageCount, pageNext);
    drawer.append(drawerHead, drawerBody, drawerFoot, store);

    const sceneBar = document.createElement("div");
    sceneBar.className = "stage-tablet-scene-bar";
    const scenePrev = document.createElement("button");
    scenePrev.type = "button";
    scenePrev.textContent = "‹";
    scenePrev.setAttribute("aria-label", "前のシーンへ");
    const sceneCurrent = document.createElement("button");
    sceneCurrent.type = "button";
    sceneCurrent.className = "stage-tablet-scene-current";
    sceneCurrent.setAttribute("aria-label", "シーンの操作を開く");
    const sceneNext = document.createElement("button");
    sceneNext.type = "button";
    sceneNext.textContent = "›";
    sceneNext.setAttribute("aria-label", "次のシーンへ");
    sceneBar.append(scenePrev, sceneCurrent, sceneNext);

    grid.prepend(drawer);
    grid.prepend(rail);
    board.prepend(sceneBar);

    const groups = TABLET_MENU_GROUPS.map((definition) => {
      const pages = (definition.panels || []).flatMap((id) => prepareTabletPanelPages(id, store));
      if (definition.special === "display" && nameToggles.length) {
        pages.push(...prepareTabletSpecialPage("display", "表示", displayMenu, store));
      }
      const button = makeTabletButton(definition.icon, definition.label, "stage-tablet-rail-button");
      button.dataset.tabletGroup = definition.id;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => openTabletGroup(definition.id));
      rail.append(button);
      return { ...definition, pages, button };
    });

    tabletUi = {
      grid, rail, drawer, drawerTitle, drawerBody, store,
      drawerClose, pagePrev, pageCount, pageNext,
      scenePrev, sceneCurrent, sceneNext,
      groups, groupId: "show", pageIndex: 0,
      viewToggle,
      groupButtons: groups.map((group) => group.button),
    };

    viewToggle.addEventListener("click", () => {
      enforceTabletSingleView(viewToggle.dataset.tabletView);
      applyLayout();
      syncViewSwitch();
      renderVenueControls();
      render();
      persistSoon();
      syncTabletWorkspace();
    });
    drawerClose.addEventListener("click", closeTabletDrawer);
    pagePrev.addEventListener("click", () => { tabletUi.pageIndex -= 1; showTabletDrawerPage(); });
    pageNext.addEventListener("click", () => { tabletUi.pageIndex += 1; showTabletDrawerPage(); });
    scenePrev.addEventListener("click", () => { if (els.scenePrev) els.scenePrev.click(); });
    sceneNext.addEventListener("click", () => { if (els.sceneNext) els.sceneNext.click(); });
    sceneCurrent.addEventListener("click", () => openTabletGroup("scenes"));

    const orient = () => {
      closeTabletDrawer();
      enforceTabletSingleView();
      applyLayout();
      syncViewSwitch();
      render();
      persistSoon();
    };
    if (tabletOrientation.addEventListener) tabletOrientation.addEventListener("change", orient);
    else if (tabletOrientation.addListener) tabletOrientation.addListener(orient);

    enforceTabletSingleView();
    applyLayout();
    syncViewSwitch();
    syncTabletWorkspace();
  }

  // 各パネルの頭にタイトル・畳むボタン・つまみを付ける（初回だけ）
  function buildPanelHeads() {
    PANELS.forEach((id) => {
      const el = panelEl(id);
      if (!el || el.querySelector(".stage-panel-head")) return;
      const head = document.createElement("button");
      head.type = "button";
      head.className = "stage-panel-head";
      head.dataset.panelHead = id;
      head.setAttribute("aria-expanded", "true");

      const grip = document.createElement("span");
      grip.className = "stage-panel-grip";
      grip.textContent = "⠿";
      grip.setAttribute("aria-hidden", "true");

      const title = document.createElement("span");
      title.className = "stage-panel-title";
      title.textContent = el.dataset.title || id;

      const mark = document.createElement("span");
      mark.className = "stage-panel-mark";
      mark.setAttribute("aria-hidden", "true");

      head.append(grip, title, mark);
      head.addEventListener("click", (e) => {
        // 掴んで動かした直後は、指を離した勢いで畳まないようにする
        if (justDragged) { e.preventDefault(); return; }
        togglePanel(id);
      });
      el.prepend(head);

      /* 説明文は畳んでおき、「?」を押したときだけ出す。
       * 道具の数が多く、説明が常に見えていると、道具そのものが下へ押し出される。
       * 初めて触るときだけ要る文章なので、要るときに引き出せればよい。 */
      // 説明として畳むもの。状態を伝える文（保存の様子など）は畳まない
      const hints = [...el.querySelectorAll(".stage-cast-hint, .stage-selection-empty")];
      if (hints.length) {
        hints.forEach((hint) => { hint.hidden = true; });
        const help = document.createElement("button");
        help.type = "button";
        help.className = "stage-panel-help";
        help.textContent = "?";
        help.setAttribute("aria-pressed", "false");
        help.setAttribute("aria-label", isEn() ? `About ${tx(el.dataset.title || id)}` : `${el.dataset.title || id}の説明を出す`);
        help.title = tx("この項目の説明");
        help.addEventListener("click", (e) => {
          e.stopPropagation();
          const show = hints[0].hidden;
          hints.forEach((hint) => { hint.hidden = !show; });
          help.setAttribute("aria-pressed", String(show));
        });
        el.append(help);
      }

      // つまみからドラッグする。パネル全体を掴むと中の操作ができなくなる。
      // HTML5のドラッグはタッチで動かないので、ポインタイベントで自前に持つ。
      el.draggable = false;
      grip.draggable = false;
      grip.addEventListener("pointerdown", (e) => startGrip(e, id, el));
    });
  }

  /* ---------- パネルの並べ替え ----------
     iPhoneのアイコン移動と同じ手触りにする。掴んだパネルは指について動き、
     残りはその場で滑って隙間を空ける。掴んだ跡には同じ高さの空き（hole）を
     差し込み、それを動かすことで他のパネルが動く。
     動きは FLIP で出す——並べ替える前の位置を控え、並べ替えた後に
     「元の位置へ戻す transform」を当ててから外すと、差分だけが滑って見える。 */

  let drag = null;
  let justDragged = false;

  function flipMove(mutate, skip) {
    const items = [...document.querySelectorAll("[data-panel], .stage-panel-hole")]
      .filter((el) => el !== skip);
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect()]));
    mutate();
    items.forEach((el) => {
      const b = before.get(el);
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 170ms cubic-bezier(0.2, 0.7, 0.3, 1)";
        el.style.transform = "";
      });
    });
  }

  function clearFlip(el) {
    const done = (e) => {
      if (e.propertyName !== "transform") return;
      el.style.transition = "";
      el.style.transform = "";
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
  }

  function startGrip(e, id, el) {
    if (e.button !== undefined && e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        active = true;
        beginDrag(id, el, ev);
      }
      ev.preventDefault();
      moveDrag(ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (active) endDrag();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function beginDrag(id, el, ev) {
    const rect = el.getBoundingClientRect();
    const hole = document.createElement("div");
    hole.className = "stage-panel-hole";
    hole.style.height = `${rect.height}px`;
    el.parentElement.insertBefore(hole, el);

    drag = { id, el, hole, dx: ev.clientX - rect.left, dy: ev.clientY - rect.top };
    el.classList.add("is-dragging");
    el.style.transition = "";
    el.style.transform = "";
    el.style.width = `${rect.width}px`;
    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.zIndex = "600";
    el.style.pointerEvents = "none";
    document.body.classList.add("is-panel-dragging");
  }

  // 指の位置がどちらの列にあるか。列から離れすぎていたら動かさない
  function columnAt(x) {
    let best = null;
    let near = Infinity;
    ["left", "right"].forEach((col) => {
      const host = colEls[col];
      if (!host) return;
      const r = host.getBoundingClientRect();
      const d = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
      if (d < near) { near = d; best = col; }
    });
    return near > 240 ? null : best;
  }

  // その列で、いまの高さならどのパネルの前へ入るか
  function insertionRef(host, y) {
    const kids = [...host.children].filter((el) =>
      el.dataset && el.dataset.panel && el !== drag.el);
    for (let i = 0; i < kids.length; i += 1) {
      const r = kids[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return kids[i];
    }
    return null;
  }

  function moveDrag(ev) {
    if (!drag) return;
    drag.el.style.left = `${ev.clientX - drag.dx}px`;
    drag.el.style.top = `${ev.clientY - drag.dy}px`;
    const col = columnAt(ev.clientX);
    if (!col || !colEls[col]) return;
    const host = colEls[col];
    const ref = insertionRef(host, ev.clientY);
    if (drag.hole.parentElement === host && drag.hole.nextElementSibling === ref) return;
    flipMove(() => host.insertBefore(drag.hole, ref), drag.el);
  }

  function endDrag() {
    if (!drag) return;
    const { el, hole, id } = drag;
    const from = el.getBoundingClientRect();
    hole.parentElement.insertBefore(el, hole);
    hole.remove();

    el.classList.remove("is-dragging");
    ["position", "left", "top", "width", "zIndex", "pointerEvents"].forEach((k) => {
      el.style[k] = "";
    });
    document.body.classList.remove("is-panel-dragging");

    // 指を離した場所から、収まる場所へ滑らせる
    const to = el.getBoundingClientRect();
    el.style.transition = "none";
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    requestAnimationFrame(() => {
      el.style.transition = "transform 170ms cubic-bezier(0.2, 0.7, 0.3, 1)";
      el.style.transform = "";
    });
    clearFlip(el);

    const col = el.parentElement === colEls.right ? "right" : "left";
    drag = null;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 60);
    commitLayoutFromDom();
    announce(`${el.dataset.title || id}を${col === "left" ? "左" : "右"}の列へ移しました。`);
  }

  // 並びの正本は画面。動かし終えたら、そのまま状態へ書き戻す
  function commitLayoutFromDom() {
    ["left", "right"].forEach((col) => {
      const host = colEls[col];
      if (!host) return;
      [...host.children]
        .filter((el) => el.dataset && el.dataset.panel)
        .forEach((el, i) => {
          state.layout.cols[el.dataset.panel] = col;
          state.layout.order[el.dataset.panel] = i;
        });
    });
    persistSoon();
  }

  function togglePanel(id) {
    state.layout.collapsed[id] = !state.layout.collapsed[id];
    applyLayout();
    persistSoon();
  }

  // 状態に従って、パネルを列へ並べ直す
  function applyLayout() {
    const L = state.layout;
    // iPad PWAではパネルの置き場所は左ドロワーが正本。
    // デスクトップ時だけ、従来どおり左右の列へ並べる。
    if (!tabletUi) {
      ["left", "right"].forEach((col) => {
        const ids = PANELS.filter((id) => L.cols[id] === col).sort((a, b) => L.order[a] - L.order[b]);
        ids.forEach((id) => {
          const el = panelEl(id);
          if (el && colEls[col]) colEls[col].append(el);
        });
      });
    }
    PANELS.forEach((id) => {
      const el = panelEl(id);
      if (!el) return;
      const collapsed = tabletUi ? false : Boolean(L.collapsed[id]);
      el.classList.toggle("is-collapsed", collapsed);
      const head = el.querySelector(".stage-panel-head");
      if (head) head.setAttribute("aria-expanded", String(!collapsed));
      const body = el.querySelector(".stage-panel-body");
      if (body) body.hidden = collapsed;
    });
    // 中央は絵の順序だけ
    const stack = els.canvasStack;
    if (stack) {
      L.centerOrder.forEach((which) => {
        const cell = which === "front" ? els.frontCell : els.planCell;
        if (cell) stack.append(cell);
      });
    }
    syncTabletWorkspace();
  }

  function swapCenter() {
    state.layout.centerOrder = state.layout.centerOrder.slice().reverse();
    applyLayout();
    persistSoon();
    announce(`${state.layout.centerOrder[0] === "front" ? "正面" : "平面"}を上にしました。`);
  }

  /* ---------- 登場人物 ----------
     ショーに出る演者を名簿で持ち、場面ごとに舞台の上か裏かが決まる。
     名簿で名前を直すと、その人が出ている全場面の表示が変わる。 */

  function castOnStage(castId) {
    return sc().pieces.some((piece) => piece.castId === castId);
  }

  /* その人が「どこへはけたか」。このシーンより前をさかのぼり、最後に舞台に居た
     シーンで袖へのはけ動線が手で引いてあれば、その行き先を舞台裏の立ち位置にする。
     引いていなければ null（＝既定の並びに立つ）。袖のどちら側・どの深さに
     居るかを本人が決められるようにするため。 */
  function backstageSpotFor(member, scene) {
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    for (let i = rows.indexOf(scene) - 1; i >= 0; i -= 1) {
      const p = (rows[i].pieces || []).find((q) => q.castId === member.id);
      if (!p) continue;   // このシーンにも居ない。さらに前を見る
      if (p.route && !onStageArea(p.route.u, p.route.v)) return { u: p.route.u, v: p.route.v };
      return null;        // 直近の登場に、袖への指定が無い＝既定の並び
    }
    return null;
  }

  /* 舞台裏の演者。平面図では袖に立たせて、全員が図の中に居るようにする。
     プロセニアム等は上手袖の奥から順に並べ、あふれたら下手袖へ。
     スラストは奥の袖に左から並べる。描く側と掴む側で同じ計算を使う。
     シーンを渡せば「そのシーンでの舞台裏」を出す（入り・はけの動線の両端に使う）。
     はけ先を手で決めた人は、その場所に立つ（既定の並びから外す）。 */
  function backstageGhostsFor(scene) {
    const off = state.project.cast.filter((member) =>
      !(scene.pieces || []).some((piece) => piece.castId === member.id));
    if (!off.length) return [];
    const b = planBounds();
    const out = [];
    let slot = 0;   // 既定の並びの席。手で決めた人は席を使わない
    off.forEach((member) => {
      const spot = backstageSpotFor(member, scene);
      if (spot) {
        out.push({
          member,
          u: clamp(spot.u, b.uMin + 0.015, b.uMax - 0.015),
          v: clamp(spot.v, Math.min(b.vMin + 0.015, 0), 0.97),
        });
        return;
      }
      const i = slot;
      slot += 1;
      if (b.vMin < 0) {
        // 奥の袖: 左から等間隔
        const u = 0.08 + (i % 10) * 0.095;
        out.push({ member, u: Math.min(u, 0.94), v: b.vMin * 0.55 });
        return;
      }
      // 左右の袖: 上手の奥から。7人を超えたら下手側へ
      const side = i < 7 ? -1 : 1;
      const at = i < 7 ? i : i - 7;
      out.push({
        member,
        u: side < 0 ? b.uMin * 0.55 : 1 + (b.uMax - 1) * 0.55,
        v: 0.10 + at * 0.115,
      });
    });
    return out;
  }
  const backstageGhosts = () => backstageGhostsFor(sc());

  // 舞台裏の演者の当たり判定（平面図のみ）。掴んだら舞台へ出す
  function ghostAt(point, L) {
    if (!L.plan) return null;
    const hitR = 16;
    const list = backstageGhosts();
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const g = list[i];
      const pos = place(g.u, g.v, L);
      if (Math.hypot(point.x - pos.x, point.y - pos.y) <= hitR + 6) return g;
    }
    return null;
  }

  function renderCast() {
    syncRosterGroups();
    if (!els.castList) return;
    const cast = state.project.cast;
    els.castList.innerHTML = "";
    if (!cast.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = isEn()
        ? "No one registered yet. Enter a name and add them."
        : "まだ誰も登録していません。名前を入れて追加してください。";
      els.castList.append(empty);
      return;
    }
    cast.forEach((member) => {
      const row = document.createElement("div");
      row.className = "stage-cast-row";

      const swatch = kindSwatch(member, "performer", member.name, (value) => {
        member.color = value;
        // 舞台に出ている分にも色を反映する
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.castId === member.id) piece.color = member.color;
          });
        });
        render();
        persistSoon();
      });

      const name = nameButton(member.name,
        () => pickOnStage((piece) => piece.castId === member.id, member.name),
        () => openProfile(member.id));

      const onStage = castOnStage(member.id);
      const status = document.createElement("button");
      status.type = "button";
      status.className = `stage-cast-status ${onStage ? "is-on" : "is-off"}`;
      status.textContent = onStage ? tm("misc", "onStage", "舞台上") : tm("misc", "offStage", "舞台裏");
      status.title = tx(onStage ? "押すと舞台から引っ込めます" : "押すとこのシーンの舞台へ出します");
      status.addEventListener("click", () => toggleCastOnStage(member.id));

      const profile = document.createElement("button");
      profile.type = "button";
      profile.className = "stage-cast-profile";
      profile.textContent = "…";
      profile.title = isEn() ? `${member.name} — profile (height and notes)` : `${member.name}のプロフィール（身長など）`;
      profile.setAttribute("aria-label", isEn() ? `Open ${member.name}\u2019s profile` : `${member.name}のプロフィールを開く`);
      profile.addEventListener("click", () => openProfile(member.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", isEn() ? `Remove ${member.name} from the cast` : `${member.name}を名簿から外す`);
      remove.addEventListener("click", () => removeCastMember(member.id));

      row.append(swatch, name, status, lockButton(member, member.name), profile, remove);
      els.castList.append(row);
    });
  }

  /* 一覧の錠。掛けているあいだ、そのものは舞台の上で掴んでも動かない。
   * 「置き場所は決まったので、もう触りたくない」ときに使う。 */
  /* 種類の絵と色を一つにまとめた見本。押すと色を選べる。
   * 色だけの四角と種類名の文字を別々に並べると、狭い列で二段になってしまう。
   * 絵は輪郭ではなく塗りで持つ（小さいので線だと潰れる）。 */
  const KIND_ICONS = {
    performer: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<circle cx="8" cy="3.5" r="2.4"/>'
      + '<path d="M8 6.5c2 0 3.1 1.2 3.3 3l.5 4.4H9.8l-.3-3.1h-.3l-.3 3.1H6.8l-.3-3.1h-.3l-.3 3.1H4.2l.5-4.4c.2-1.8 1.3-3 3.3-3z"/></svg>',
    light: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<path d="M5.6 1.5h4.8l1 3.1H4.6z"/>'
      + '<path d="M4.8 5.6h6.4L13.5 14.3H2.5z" opacity=".45"/></svg>',
    object: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
      + '<path d="M8 1.6 14.3 4.9 8 8.2 1.7 4.9z" opacity=".55"/>'
      + '<path d="M1.7 6 7.4 9v5.4L1.7 11.4zM14.3 6v5.4L8.6 14.4V9z"/></svg>',
  };

  function kindSwatch(item, kind, label, onPick) {
    const wrap = document.createElement("label");
    wrap.className = "stage-kind-swatch";
    wrap.title = isEn() ? `Change the colour of ${label}` : `${label}の色を変える`;
    wrap.style.color = item.color;
    const glyph = document.createElement("span");
    glyph.className = "stage-kind-glyph";
    glyph.innerHTML = KIND_ICONS[kind] || KIND_ICONS.object;
    const input = document.createElement("input");
    input.type = "color";
    input.className = "stage-kind-input";
    input.value = item.color;
    input.setAttribute("aria-label", isEn() ? `Colour of ${label}` : `${label}の色`);
    input.addEventListener("input", () => {
      wrap.style.color = input.value;
      onPick(input.value);
    });
    wrap.append(glyph, input);
    return wrap;
  }

  /* 一覧の名前。押すと舞台の上のそれを選び、二度押しで詳しい窓を開く。
   * 以前は名前が入力欄で、選ぶつもりで押すと文字を打つ構えになっていた。
   * 名前を直すのは詳しい窓（プロフィール／寸法）の中でできる。 */
  function nameButton(label, onPick, onOpen) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-cast-name";
    button.textContent = label;
    button.title = tx("押すと舞台の上で選びます。二度押しで詳しい窓が開きます");
    button.addEventListener("click", onPick);
    button.addEventListener("dblclick", (e) => { e.preventDefault(); onOpen(); });
    return button;
  }

  /* 一覧から舞台の上のものを選ぶ。舞台裏なら選べないので、その旨だけ伝える。 */
  function pickOnStage(findPiece, name, light) {
    const piece = sc().pieces.find(findPiece);
    if (!piece) {
      announce(light
        ? `${name}はこのシーンではOFFです。「OFF」を押すと点きます。`
        : `${name}はいま舞台裏です。「舞台裏」を押すと舞台へ出ます。`);
      return;
    }
    selectedId = piece.id;
    selectedNoteId = null;
    // 照明は照明の道具、それ以外は動かす道具でないと掴めない
    const want = piece.type === "light" ? "light" : "select";
    if ((tool === "light") !== (want === "light")) setTool(want);
    updateInspector();
    render();
    announce(`${name}を選びました。`);
  }

  function lockButton(item, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-cast-lock";
    button.textContent = item.locked ? "🔒" : "🔓";
    button.setAttribute("aria-pressed", String(Boolean(item.locked)));
    button.title = isEn()
      ? (item.locked ? `Unlock ${label} (it can move again)` : `Lock ${label} (it stops moving)`)
      : (item.locked ? `${label}の錠を外す（動かせるようになります）` : `${label}に錠を掛ける（動かなくなります）`);
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", () => {
      checkpoint();
      item.locked = !item.locked;
      renderCast();
      renderSets();
      renderLights();
      updateInspector();
      render();
      persistSoon();
      announce(`${label}${item.locked ? "に錠を掛けました。" : "の錠を外しました。"}`);
    });
    return button;
  }

  /* 名前を入れずに〈追加〉したときの名。「演者3」のように種類＋番号にする。
   * 番号は空いている一番小さいものを採るので、消して足し直しても被らない。
   * 名前は思いついてから付ければよく、そこで手を止めさせないため。
   * 「台・箱」のような並びの名は先頭だけ使う（「台・箱1」は読みにくい）。 */
  function autoName(base) {
    const head = String(base).split(/[・/]/)[0].trim() || base;
    const used = new Set();
    (state.project.cast || []).forEach((c) => used.add(c.name));
    (state.project.sets || []).forEach((s) => used.add(s.name));
    // 英語では語と数字の間に空白を入れる（Performer 2）。日本語は詰める（演者2）
    const join = (n) => (isEn() ? `${head} ${n}` : `${head}${n}`);
    let n = 1;
    while (used.has(join(n))) n += 1;
    return join(n);
  }

  /* 名簿タブから送られたキャスト候補を受け取る。
     名簿は別モジュール（roster.js）なので、橋は localStorage の受け渡し札。
     舞台スケッチを開いた時と、タブが#stageへ切り替わった時に読む。 */
  const CAST_HANDOFF_KEY = "shosai-cast-handoff-v1";
  function consumeCastHandoff() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(CAST_HANDOFF_KEY) || "[]"); } catch (_) { return; }
    if (!Array.isArray(list) || !list.length) return;
    try { localStorage.removeItem(CAST_HANDOFF_KEY); } catch (_) { /* 消せなくても続行 */ }
    const added = [];
    list.forEach((entry) => {
      const name = entry && typeof entry.name === "string" ? entry.name.trim().slice(0, 24) : "";
      if (!name) return;
      if ((state.project.cast || []).some((c) => c.name === name)) return;   // 同名は二重登録しない
      const member = {
        id: rid("cast"), name, color: nextPieceColor(state.project.cast.length),
        heightCm: DEFAULT_HEIGHT_CM, note: "", locked: false,
      };
      state.project.cast.push(member);
      added.push(name);
    });
    if (!added.length) return;
    checkpoint();
    renderCast();
    renderScenes();
    render();
    persistSoon();
    announce(`名簿から${added.length}人をキャストへ加えました（${added.join("・")}）。舞台へ出すには一覧の「舞台裏」を押してください。`);
  }

  function addCastMember(nameInput) {
    const input = nameInput || els.rosterName;
    const raw = (input && input.value || "").trim() || autoName(pieceTypeName("performer"));
    checkpoint();
    const member = {
      id: rid("cast"), name: raw.slice(0, 24), color: nextPieceColor(state.project.cast.length),
      heightCm: DEFAULT_HEIGHT_CM, note: "", locked: false,
    };
    state.project.cast.push(member);
    // 登録したものは、そのままこの場面の舞台へ出す（出すのが普通で、裏に置くのが例外）
    placeCastPiece(member);
    if (input) input.value = "";
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    /* ★絵と場面の欄も描き直す。ここを忘れると、データには入っているのに
     * 舞台に出てこない（札は「舞台上」なのに姿がない、という食い違いになる）。 */
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${raw}を名簿へ加え、このシーンの舞台へ出しました。`);
  }

  // 演者をこの場面の舞台へ置く。登録した直後にも、あとから出すときにも通す
  function placeCastPiece(member) {
    const scene = sc();
    const count = scene.pieces.filter((p) => p.type === "performer").length;
    // 正規化を通す。手で作ると、あとから足した持ち物（明かりの当て方など）が抜ける
    const piece = normalizePiece({
      id: nextId(), type: "performer", castId: member.id,
      u: clamp(0.5 + ((count % 5) - 2) * 0.09, 0.06, 0.94),
      v: clamp(0.6 + (count % 3) * 0.07, 0.05, 0.95),
      size: 100, color: member.color || state.pieceColor, name: "",
    }, 0);
    scene.pieces.push(piece);
    selectedId = piece.id;
    return piece;
  }

  function toggleCastOnStage(castId) {
    checkpoint();
    const scene = sc();
    const existing = scene.pieces.find((piece) => piece.castId === castId);
    const member = state.project.cast.find((c) => c.id === castId);
    if (existing) {
      /* 装置と同じで、引っ込める前に立ち位置を控える。控えないと、
         もう一度出したときに既定の並びへ飛んで、組んだ立ち位置が壊れる。 */
      stashPiece(scene, castId, existing);
      scene.pieces = scene.pieces.filter((piece) => piece.id !== existing.id);
      if (selectedId === existing.id) selectedId = null;
      announce(`${member ? member.name : "この人"}を舞台から引っ込めました。`);
    } else if (member) {
      const shape = { castId, type: "performer", color: member.color || state.pieceColor };
      if (!restoreStashed(scene, castId, shape)) placeCastPiece(member);
      announce(`${member.name}を舞台へ出しました。`);
    }
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
  }

  function removeCastMember(castId) {
    const member = state.project.cast.find((c) => c.id === castId);
    if (!member) return;
    const scenesWith = state.project.scenes.filter((scene) =>
      scene.pieces.some((piece) => piece.castId === castId)).length;
    const warning = scenesWith
      ? `「${member.name}」を名簿から外します。${scenesWith}つのシーンから、この人も消えます。`
      : `「${member.name}」を名簿から外します。`;
    if (!window.confirm(warning)) return;
    checkpoint();
    state.project.cast = state.project.cast.filter((c) => c.id !== castId);
    state.project.scenes.forEach((scene) => {
      scene.pieces = scene.pieces.filter((piece) => piece.castId !== castId);
      // 名簿から外した人の控えも捨てる（もう出せない人の立ち位置は要らない）
      if (scene.stashed) delete scene.stashed[castId];
    });
    selectedId = null;
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${member.name}を名簿から外しました。`);
  }

  /* ---------- 舞台セット ---------- */


  function setOnStage(setId) {
    return sc().pieces.some((piece) => piece.setId === setId);
  }

  // 一覧に出す寸法の要約。数字を見て「あの平台だ」と分かる程度に短く
  function setDimLabel(item) {
    const d = item.dims;
    if (item.kind === "sphere") {
      return d.lift > 0.05 ? `⌀${cmText(d.dia)} ／ 床上${cmText(d.lift)}` : `⌀${cmText(d.dia)}`;
    }
    if (item.kind === "light") return `⌀${cmText(d.dia)}`;
    if (item.kind === "chair") return `高さ${cmText(d.h)}`;
    // せりは高さの寸法を持たない（上がり具合はシーンごとの駒側にある）
    if (item.kind === "seri") return `${Math.round(d.w * 100)}×${Math.round(d.d * 100)}cm`;
    return `${Math.round(d.w * 100)}×${Math.round(d.d * 100)}×${Math.round(d.h * 100)}cm`;
  }

  function renderSets() {
    renderSetList(els.setList, (item) => item.kind !== "light",
      isEn() ? "Nothing registered yet. Enter a name, pick a kind, and add it."
        : "まだ何も登録していません。名前と形を選んで追加してください。");
    syncRosterGroups();
  }

  /* 照明の一覧は種類ごとに枠を分ける。吊りとSSと前明かりと転がしは、
   * 仕込む場所も役目も別物なので、ひと続きに並べると読み分けられない。 */
  function renderLights() {
    const host = els.lightList;
    if (!host) return;
    host.innerHTML = "";
    const lights = (state.project.sets || []).filter((item) => item.kind === "light");
    if (!lights.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = isEn()
        ? "No lights yet. Pick a type, enter a name, and add it."
        : "まだ登録していません。種類を選び、名前を入れて追加してください。";
      host.append(empty);
      syncRosterGroups();
      return;
    }
    /* プリセットの組は一行にまとめる。8灯が8行並ぶと、一体で扱う意図が伝わらない */
    const groupsSeen = [];
    lights.forEach((item) => {
      if (item.lightGroup && !groupsSeen.includes(item.lightGroup)) groupsSeen.push(item.lightGroup);
    });
    if (groupsSeen.length) {
      const head = document.createElement("p");
      head.className = "stage-roster-head";
      head.textContent = isEn() ? "Preset rigs" : "プリセットの組";
      const box = document.createElement("div");
      box.className = "stage-cast-list";
      host.append(head, box);
      groupsSeen.forEach((gid) => {
        const items = groupItems(gid);
        const row = document.createElement("div");
        row.className = "stage-cast-row";
        const dot = document.createElement("span");
        dot.className = "stage-kind-swatch";
        dot.style.background = (items[0] && items[0].color) || "#d3ac59";
        dot.style.pointerEvents = "none";
        const name = document.createElement("span");
        name.className = "stage-cast-name";
        name.textContent = groupTitle(gid);
        const on = groupScenePieces(gid).length > 0;
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = `stage-onstage${on ? " is-on" : ""}`;
        toggle.textContent = on ? "ON" : "OFF";
        toggle.addEventListener("click", () => toggleLightGroup(gid));
        const split = document.createElement("button");
        split.type = "button";
        split.className = "stage-icon-action";
        split.textContent = tx("ばらす");
        split.title = tx("組をやめて、一つずつの明かりに戻す");
        split.addEventListener("click", () => splitLightGroup(gid));
        const del = document.createElement("button");
        del.type = "button";
        del.className = "stage-cast-remove";
        del.textContent = "✕";
        del.setAttribute("aria-label", isEn() ? "Remove this rig" : "この組を外す");
        del.addEventListener("click", () => removeLightGroup(gid));
        row.append(dot, name, toggle, split, del);
        box.append(row);
      });
    }
    LIGHT_KIND_ORDER.forEach((key) => {
      const keep = (item) => item.kind === "light" && !item.lightGroup && lightKindOf(item) === key;
      if (!lights.some(keep)) return;
      const head = document.createElement("p");
      head.className = "stage-roster-head";
      head.textContent = lightKindName(key);
      head.title = lightKindNote(key);
      const box = document.createElement("div");
      box.className = "stage-cast-list";
      host.append(head, box);
      renderSetList(box, keep, "");
    });
    syncRosterGroups();
  }

  /* 組ごとの点け消し。点けるときは、組んだときの置き場へ戻す
     （ばらばらの既定位置に散らばると、組の形が壊れるため）。 */
  function toggleLightGroup(groupId) {
    checkpoint();
    const scene = sc();
    const pieces = groupScenePieces(groupId);
    if (pieces.length) {
      const ids = new Set(pieces.map((p) => p.id));
      // 動かしたあとの置き場所を控えてから消す（組んだ形のまま戻せるように）
      pieces.forEach((p) => { if (p.setId) stashPiece(scene, p.setId, p); });
      scene.pieces = scene.pieces.filter((p) => !ids.has(p.id));
      if (ids.has(selectedId)) selectedId = null;
      announce(`${groupTitle(groupId)}をOFFにしました。`);
    } else {
      groupItems(groupId).forEach((item) => {
        // 控え（前に消したときの場所）が第一。無ければ組んだときの置き場へ
        if (restoreStashed(scene, item.id, { setId: item.id, type: "light", color: item.color })) return;
        const at = item.preset || { u: 0.5, v: 0.5, beam: null };
        scene.pieces.push(normalizePiece({
          id: nextId(), type: "light", setId: item.id,
          u: at.u, v: at.v, size: 100, color: item.color, name: "", facing: 0,
          beam: at.beam,
        }, 0));
      });
      announce(`${groupTitle(groupId)}をONにしました。`);
    }
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
  }

  function removeLightGroup(groupId) {
    const items = groupItems(groupId);
    if (!items.length) return;
    const ids = new Set(items.map((t) => t.id));
    if (!window.confirm(isEn()
      ? `Remove ${groupTitle(groupId)}? The lights disappear from every scene.`
      : `${groupTitle(groupId)}を外します。全てのシーンからこの組の明かりが消えます。`)) return;
    checkpoint();
    state.project.sets = state.project.sets.filter((t) => !ids.has(t.id));
    state.project.scenes.forEach((scene) => {
      scene.pieces = scene.pieces.filter((piece) => !ids.has(piece.setId));
      if (scene.stashed) ids.forEach((id) => delete scene.stashed[id]);
    });
    selectedId = null;
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
  }

  /* 一枚にまとめた以上、空の見出しが三つ並ぶのは邪魔になる。
   * 中身のある組だけ出し、全部空のときだけ一行の案内を出す。 */
  function syncRosterGroups() {
    const sets = state.project.sets || [];
    const counts = {
      cast: (state.project.cast || []).length,
      sets: sets.filter((item) => item.kind !== "light").length,
    };
    if (els.groupCast) els.groupCast.hidden = counts.cast === 0;
    if (els.groupSets) els.groupSets.hidden = counts.sets === 0;
    if (els.rosterEmpty) els.rosterEmpty.hidden = counts.cast + counts.sets > 0;
  }

  function renderSetList(host, keep, emptyText) {
    if (!host) return;
    const sets = (state.project.sets || []).filter(keep);
    host.innerHTML = "";
    if (!sets.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = emptyText;
      host.append(empty);
      return;
    }
    sets.forEach((item) => {
      const row = document.createElement("div");
      row.className = "stage-cast-row";

      const swatch = kindSwatch(item, item.kind === "light" ? "light" : "object", item.name, (value) => {
        item.color = value;
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.setId === item.id) piece.color = item.color;
          });
        });
        render();
        persistSoon();
      });

      const name = nameButton(item.name,
        () => pickOnStage((piece) => piece.setId === item.id, item.name, light),
        () => openSetInfo(item.id));

      /* 寸法は行に出さず、行の title と「…」の窓へ回す。
       * 狭い列で名前と寸法を並べると、どちらも数文字で切れて読めなくなる。 */
      const summary = item.kind === "light"
        ? `${lightKindName(lightKindOf(item))}（${lightKindNote(lightKindOf(item))}）／${setDimLabel(item)}`
        : `${setKindName(item.kind)}／${setDimLabel(item)}`;

      const onStage = setOnStage(item.id);
      const light = item.kind === "light";
      const status = document.createElement("button");
      status.type = "button";
      status.className = `stage-cast-status ${onStage ? "is-on" : "is-off"}`;
      status.textContent = onStageWord(item, onStage);
      status.title = tx(light
        ? (onStage ? "押すとこのシーンでは消します" : "押すとこのシーンで点けます")
        : (onStage ? "押すと舞台から下げます" : "押すとこのシーンの舞台へ出します"));
      status.addEventListener("click", () => toggleSetOnStage(item.id));

      const detail = document.createElement("button");
      detail.type = "button";
      detail.className = "stage-cast-profile";
      detail.textContent = "…";
      const what = item.kind === "light" ? tx("直径") : tx("寸法");
      detail.title = isEn()
        ? `Change the ${item.kind === "light" ? "pool diameter" : "size"} of ${item.name} (now ${setDimLabel(item)})`
        : `${item.name}の${what}を変える（いまは ${setDimLabel(item)}）`;
      detail.setAttribute("aria-label", isEn() ? `Open the size of ${item.name}` : `${item.name}の${what}を開く`);
      detail.addEventListener("click", () => openSetInfo(item.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", isEn() ? `Remove ${item.name} from the set list` : `${item.name}を舞台セットから外す`);
      remove.addEventListener("click", () => removeSetItem(item.id));

      /* 一段にまとめる。名前の右へ寸法を小さく置き、名前が長ければそちらを詰める。
       * 段を分けると、十数個並べたときに一覧が縦に伸びて見渡せなくなる。 */
      row.className = "stage-cast-row";
      row.title = summary;
      row.append(swatch, name, status, lockButton(item, item.name), detail, remove);
      host.append(row);
    });
  }

  function addSetItem(kind, nameInput, lightKind) {
    const raw = (nameInput && nameInput.value || "").trim() || autoName(setKindName(kind));
    checkpoint();
    const lk = kind === "light" && LIGHT_KINDS[lightKind] ? lightKind : "hang";
    const dims = normalizeDims(kind, {});
    // 吊物にしたときのために、地上高の場所を作っておく（既定は床）
    if (SOLID_TYPES[kind] && kind !== "seri" && dims && dims.lift === undefined) dims.lift = 0;
    if (kind === "light") dims.dia = LIGHT_KINDS[lk].dia;
    const flownOnly = Boolean(FLOWN_ONLY[kind]);
    if (flownOnly && dims) dims.lift = kind === "tissue" ? 7.4 : 2.6;
    const item = {
      id: rid("set"), kind, name: raw.slice(0, 24),
      color: kind === "light" ? "#d3ac59" : nextPieceColor(state.project.sets.length + 2),
      dims, note: "", locked: false, flown: flownOnly, wires: 2, framed: false, lightKind: lk,
    };
    state.project.sets.push(item);
    placeSetPiece(item);
    if (nameInput) nameInput.value = "";
    renderSets();
    renderLights();
    // 同上。登録しただけで絵が変わらないと、置いたことが伝わらない
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(kind === "light"
      ? `${raw}を${lightKindName(lk)}へ加えてONにしました。`
      : `${raw}を舞台セットへ加え、このシーンの舞台へ出しました。`);
  }

  // 舞台セット・明かりをこの場面へ置く。登録した直後にも、あとから出すときにも通す
  function placeSetPiece(item) {
    const scene = sc();
    /* 置き場所を少しずつずらすための数。明かりも数に入れる。
     * 外していたので、明かりを二つ出すと同じ場所に重なって出ていた。 */
    const count = scene.pieces.filter((p) => p.type !== "performer").length;
    const piece = normalizePiece({
      id: nextId(), type: item.kind, setId: item.id,
      u: clamp(0.5 + ((count % 5) - 2) * 0.11, 0.06, 0.94),
      v: clamp(0.5 + (count % 3) * 0.09, 0.05, 0.95),
      size: 100, color: item.color || state.pieceColor, name: "", facing: 0,
    }, 0);
    // 明かりは種類ごとの仕込み位置から始める。出したあとは自由に動かせる
    if (piece.type === "light") {
      const spec = LIGHT_KINDS[lightKindOf(item)];
      const src = spec.source(piece.u, piece.v);
      piece.beam = normalizeBeam({ u: src.u, v: src.v, h: spec.h, toH: spec.toH }, piece);
    }
    scene.pieces.push(piece);
    selectedId = piece.id;
    return piece;
  }

  /* ---------- 照明プリセット ----------
     蔵書『ステージ・舞台照明入門』実践編PART3「照明プラン実例集」を下敷きにした
     定番の組み方。1回押すと、その組の明かりを登録して現在のシーンへ点ける。
       ・基本の3照明（本p199）: 地明かり＝真上からダークブルー（影を作るベース）、
         バック＝奥から濃い色で輪郭と距離感、ブッチ＝袖から斜め交差の薄ピンクで幅を出す
       ・バック8台＋AC（本p201 図②）: 奥バトンのストレート＋前寄りのACで立体感
       ・トップサス（本p200）: 立ち位置の真上に1人分だけ。むやみに大きくしない
       ・ライトカーテン（本p217）: 奥に並んだ真下向きの列が光の幕になる
     色も本の記述に合わせた（地明かり＝ダークブルー、バック＝濃色、ブッチ＝薄ピンク、生）。
     灯体の高さは会場の高さ＝バトンとして組む（宙に浮いた灯体を作らない）。 */
  const LIGHT_PRESETS = {
    basic3: {
      label: "基本の3照明",
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        [0.15, 0.38, 0.62, 0.85].forEach((u, i) => out.push({
          name: `地明かり${i + 1}`, color: "#31518f", dia: 4, kind: "hang",
          u, v: 0.5, beam: { u, v: 0.5, h: H, toH: 0 },
        }));
        [0.38, 0.62].forEach((u, i) => out.push({
          name: `バック${i + 1}`, color: "#a03428", dia: 3, kind: "hang",
          u, v: 0.5, beam: { u, v: 0.06, h: H, toH: 1.0 },
        }));
        out.push({ name: "ブッチ上手", color: "#d98ca0", dia: 2.6, kind: "ss",
          u: 0.62, v: 0.55, beam: { u: -0.06, v: 0.78, h: 1.7, toH: 1.2 } });
        out.push({ name: "ブッチ下手", color: "#d98ca0", dia: 2.6, kind: "ss",
          u: 0.38, v: 0.55, beam: { u: 1.06, v: 0.78, h: 1.7, toH: 1.2 } });
        return out;
      },
    },
    backac: {
      label: "バック8台＋AC",
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        for (let i = 0; i < 8; i += 1) {
          const u = 0.11 + i * (0.78 / 7);
          out.push({ name: `バック${i + 1}`, color: "#e8e0cc", dia: 2.2, kind: "hang",
            u, v: 0.55, beam: { u, v: 0.05, h: H, toH: 1.0 } });
        }
        out.push({ name: "AC センター", color: "#f0dfb6", dia: 3.4, kind: "hang",
          u: 0.5, v: 0.62, beam: { u: 0.5, v: 0.33, h: H, toH: 1.4 } });
        out.push({ name: "AC 上手", color: "#f0dfb6", dia: 3.4, kind: "hang",
          u: 0.65, v: 0.6, beam: { u: 0.8, v: 0.78, h: H, toH: 1.4 } });
        out.push({ name: "AC 下手", color: "#f0dfb6", dia: 3.4, kind: "hang",
          u: 0.35, v: 0.6, beam: { u: 0.2, v: 0.78, h: H, toH: 1.4 } });
        return out;
      },
    },
    topsus: {
      label: "トップサス（1人分）",
      build: (size) => [{
        name: "トップサス", color: "#f2ead6", dia: 1.6, kind: "hang",
        u: 0.5, v: 0.6, beam: { u: 0.5, v: 0.6, h: size.height || 8, toH: 0 },
      }],
    },
    side3: {
      label: "サイド（体を立体に）",
      /* 袖から横切る光を三段。上からの明かりだけだと、人は平たい影になる。
         上手と下手で色温度を変えると、回っても体の向きが読める（踊り・アクロバット向け）。 */
      build: () => {
        const out = [];
        [0.28, 0.5, 0.72].forEach((v, i) => {
          out.push({ name: `SS上手${i + 1}`, color: "#9fb6d8", dia: 2.4, kind: "ss",
            u: 0.7, v, beam: { u: -0.06, v, h: 1.7, toH: 1.4 } });
          out.push({ name: `SS下手${i + 1}`, color: "#e6d3ad", dia: 2.4, kind: "ss",
            u: 0.3, v, beam: { u: 1.06, v, h: 1.7, toH: 1.4 } });
        });
        return out;
      },
    },
    follow2: {
      label: "フォロースポット2台",
      /* 客席の上から2台で追う。左右に振り分けて当てると、
         人の輪郭に影が出にくく、動いても顔が落ちない。 */
      build: (size) => {
        const H = size.height || 8;
        return [
          { name: "ピン上手", color: "#f4ecd8", dia: 1.6, kind: "front",
            u: 0.5, v: 0.55, beam: { u: 0.68, v: 1.35, h: H, toH: 1.6 } },
          { name: "ピン下手", color: "#f4ecd8", dia: 1.6, kind: "front",
            u: 0.5, v: 0.55, beam: { u: 0.32, v: 1.35, h: H, toH: 1.6 } },
        ];
      },
    },
    bar3: {
      label: "3台口バーライト",
      /* 本p205 図③: 3灯つなぎのバーライトを、奥のバトンに3組＋中のバトンに2組。
         舞台全体を均一に均す基本の地明かり群 */
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        [0.2, 0.5, 0.8].forEach((u, i) => out.push({
          name: `バー奥${i + 1}`, color: "#e8e0cc", dia: 3.2, kind: "hang",
          u, v: 0.18, beam: { u, v: 0.18, h: H, toH: 0 },
        }));
        [0.35, 0.65].forEach((u, i) => out.push({
          name: `バー中${i + 1}`, color: "#e8e0cc", dia: 3.2, kind: "hang",
          u, v: 0.52, beam: { u, v: 0.52, h: H, toH: 0 },
        }));
        return out;
      },
    },
    enka: {
      label: "演歌（ホリ染め）",
      /* 本p218 図⑲: ホリゾント幕をローホリ（床置き）で赤く染め、
         ブッチは青、バックは夕焼けのアンバー、前明かりとピンで人を綺麗に出す。
         バーライトは使わないスタンダードな組み方 */
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        [0.25, 0.5, 0.75].forEach((u, i) => out.push({
          name: `ローホリ${i + 1}`, color: "#a03428", dia: 2.6, kind: "floor",
          u, v: 0.02, beam: { u, v: 0.06, h: 0.15, toH: 5 },
        }));
        out.push({ name: "ブッチ上手", color: "#3d5a9e", dia: 2.6, kind: "ss",
          u: 0.6, v: 0.55, beam: { u: -0.06, v: 0.78, h: 1.7, toH: 1.2 } });
        out.push({ name: "ブッチ下手", color: "#3d5a9e", dia: 2.6, kind: "ss",
          u: 0.4, v: 0.55, beam: { u: 1.06, v: 0.78, h: 1.7, toH: 1.2 } });
        [0.38, 0.62].forEach((u, i) => out.push({
          name: `バック${i + 1}`, color: "#c87d33", dia: 3, kind: "hang",
          u, v: 0.5, beam: { u, v: 0.06, h: H, toH: 1.0 },
        }));
        out.push({ name: "前明かり", color: "#f0dfb6", dia: 3.4, kind: "hang",
          u: 0.5, v: 0.62, beam: { u: 0.5, v: 1.02, h: H, toH: 1.4 } });
        out.push({ name: "ピン", color: "#f2ead6", dia: 1.8, kind: "hang",
          u: 0.5, v: 0.6, beam: { u: 0.5, v: 0.6, h: H, toH: 0 } });
        return out;
      },
    },
    silhouette: {
      label: "シルエット（逆光だけ）",
      /* 前明かりを一切置かず、奥のホリを染めて後ろからだけ当てる。
         顔を消して形だけを見せる組み方。人数や隊形を読ませたい場面に効く。 */
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        [0.2, 0.4, 0.6, 0.8].forEach((u, i) => out.push({
          name: `ローホリ${i + 1}`, color: "#2f6fa8", dia: 2.8, kind: "floor",
          u, v: 0.02, beam: { u, v: 0.06, h: 0.15, toH: 6 },
        }));
        [0.35, 0.5, 0.65].forEach((u, i) => out.push({
          name: `バック${i + 1}`, color: "#cfe0f0", dia: 3, kind: "hang",
          u, v: 0.42, beam: { u, v: 0.06, h: H, toH: 1.9 },
        }));
        return out;
      },
    },
    foot: {
      label: "フットライト（足元から）",
      /* 舞台のツラに並べて下から煽る。影が上へ伸びるので、
         同じ立ち位置でも普段と違う顔になる（古典・見世物の質感）。 */
      build: () => [0.15, 0.32, 0.5, 0.68, 0.85].map((u, i) => ({
        name: `フット${i + 1}`, color: "#f0d9a8", dia: 2.4, kind: "floor",
        u, v: 0.78, beam: { u, v: 1.0, h: 0.2, toH: 1.7 },
      })),
    },
    curtain: {
      label: "ライトカーテン",
      build: (size) => {
        const H = size.height || 8;
        return [0, 1, 2, 3, 4, 5].map((i) => {
          const u = 0.13 + i * (0.74 / 5);
          return { name: `カーテン${i + 1}`, color: "#4a6ab8", dia: 1.2, kind: "hang",
            u, v: 0.1, beam: { u, v: 0.1, h: H, toH: 0 } };
        });
      },
    },
    aerial: {
      label: "空中芸（宙を切る）",
      /* トラピーズ・ティシューなど、床にいない演者のための組み方。
         当てる高さ（toH）を宙で止めるので、光が床まで抜けず、
         演者のいる高さだけが浮かぶ。袖の高い所からの横は体の厚みを出す。 */
      build: (size) => {
        const H = size.height || 8;
        const at = Math.min(3.4, H * 0.45);        // 演者のいるおよその高さ
        const out = [
          { name: "トップ（宙）", color: "#f2ead6", dia: 1.4, kind: "hang",
            u: 0.5, v: 0.5, beam: { u: 0.5, v: 0.5, h: H, toH: at } },
          { name: "ハイサイド上手", color: "#9fb6d8", dia: 2, kind: "ss",
            u: 0.58, v: 0.5, beam: { u: -0.04, v: 0.5, h: at + 1.8, toH: at } },
          { name: "ハイサイド下手", color: "#9fb6d8", dia: 2, kind: "ss",
            u: 0.42, v: 0.5, beam: { u: 1.04, v: 0.5, h: at + 1.8, toH: at } },
        ];
        // 奥を沈んだ色で埋めて、宙の人を前へ引き出す
        [0.3, 0.5, 0.7].forEach((u, i) => out.push({
          name: `ローホリ${i + 1}`, color: "#243a6b", dia: 2.6, kind: "floor",
          u, v: 0.02, beam: { u, v: 0.06, h: 0.15, toH: 5 },
        }));
        return out;
      },
    },
    /* 参照写真（コンサート・サーカス系の床置きビーム演出）を下敷き */
    beamx: {
      label: "ビームクロス（床から交差）",
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        [0.30, 0.38, 0.46].forEach((u, i) => out.push({
          name: `クロス上手${i + 1}`, color: "#dce6f2", dia: 0.9, kind: "floor",
          u, v: 0.08, beam: { u: [0.72, 0.80, 0.88][i], v: 0.10, h: 0.15, toH: H },
        }));
        [0.70, 0.62, 0.54].forEach((u, i) => out.push({
          name: `クロス下手${i + 1}`, color: "#dce6f2", dia: 0.9, kind: "floor",
          u, v: 0.08, beam: { u: [0.12, 0.20, 0.28][i], v: 0.10, h: 0.15, toH: H },
        }));
        [0.2, 0.4, 0.6, 0.8].forEach((u, i) => out.push({
          name: `ローホリ${i + 1}`, color: "#a03428", dia: 2.6, kind: "floor",
          u, v: 0.02, beam: { u, v: 0.06, h: 0.15, toH: 5 },
        }));
        return out;
      },
    },
    beamfan: {
      label: "ビーム扇（床から放射）",
      build: (size) => {
        const H = size.height || 8;
        const targets = [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92];
        return targets.map((targetU, i) => {
          const u = 0.44 + i * 0.02;
          return {
            name: `扇${i + 1}`, color: "#dce6f2", dia: 0.9, kind: "floor",
            u, v: 0.10,
            beam: { u: targetU, v: 0.10, h: 0.15, toH: i === 3 ? H * 1.05 : H },
          };
        });
      },
    },
    ring: {
      label: "円形（ビッグトップ）",
      /* 全周から客が見る小屋のための組み方。どこから見ても影の向きが
         偏らないよう、円を描いて外から中へ落とす。真ん中に一台だけ強い光を残す。 */
      build: (size) => {
        const H = size.height || 8;
        const out = [];
        for (let i = 0; i < 8; i += 1) {
          const t = (i / 8) * Math.PI * 2;
          const u = 0.5 + Math.cos(t) * 0.3;
          const v = 0.5 + Math.sin(t) * 0.3;
          out.push({
            name: `リング${i + 1}`, color: i % 2 ? "#f0dfb6" : "#dfe6ee",
            dia: 2.6, kind: "hang", u, v, beam: { u, v, h: H, toH: 0 },
          });
        }
        out.push({ name: "センター", color: "#f2ead6", dia: 3, kind: "hang",
          u: 0.5, v: 0.5, beam: { u: 0.5, v: 0.5, h: H, toH: 0 } });
        return out;
      },
    },
  };

  function drawPresetPreview(canvas, key) {
    const preset = LIGHT_PRESETS[key];
    if (!canvas || !preset) return;
    const size = venueSize();
    const specs = preset.build(size);
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const floorY = h * 0.88;
    const maxH = size.height || 8;
    const venueW = size.width || 12;
    const yAt = (metres) => floorY - (metres / maxH) * floorY;

    // 絵の大きさを変えても線の太さの比が変わらないよう、元の132pxを基準に倍率を持つ
    const s = w / 132;

    ctx.fillStyle = "#0d0c0b";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(240, 231, 214, 0.22)";
    ctx.lineWidth = s;
    ctx.beginPath();
    ctx.moveTo(0, floorY + 0.5);
    ctx.lineTo(w, floorY + 0.5);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = "lighter";
    specs.forEach((spec) => {
      const beam = spec.beam || {};
      const sourceX = spec.u * w;
      const sourceY = yAt(beam.h || 0);
      const targetX = finite(beam.u, spec.u) * w;
      const targetY = yAt(finite(beam.toH, 0));
      const targetHalfWidth = Math.max(1.5, (finite(spec.dia, 1) / venueW) * w * 0.5);
      /* 当たる先の広がりは、光の進む向きに対して直角に取る。
         いつも水平に取ると、横へ走る光（サイド・ブッチ）が線一本に潰れて
         見本では何も置いていないように見える。 */
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const len = Math.hypot(dx, dy) || 1;
      // 縁のふわつきは舞台の絵と同じ作り方（断面のグラデーション）に揃える
      const nx = (-dy / len) * targetHalfWidth * BEAM_SOFT;
      const ny = (dx / len) * targetHalfWidth * BEAM_SOFT;
      const cross = ctx.createLinearGradient(
        targetX - nx, targetY - ny, targetX + nx, targetY + ny);
      BEAM_EDGE.forEach(([at, weight]) => {
        cross.addColorStop(at, rgba(spec.color, weight));
      });
      ctx.fillStyle = cross;
      ctx.beginPath();
      ctx.moveTo(sourceX - s, sourceY);
      ctx.lineTo(sourceX + s, sourceY);
      ctx.lineTo(targetX + nx, targetY + ny);
      ctx.lineTo(targetX - nx, targetY - ny);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    specs.forEach((spec) => {
      const beam = spec.beam || {};
      ctx.fillStyle = spec.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(spec.u * w, yAt(beam.h || 0), 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function openLightPresetModal(fromIntent = false) {
    if (!els.lightPresetModal || !els.lightPresetTiles) return;
    if (els.lightPresetIntentNote) {
      els.lightPresetIntentNote.hidden = !fromIntent;
      if (fromIntent) {
        const intent = lightIntentCompareText();
        els.lightPresetIntentNote.textContent = isEn()
          ? `Lighting intention: ${intent} — This is a list of candidates. It is not guaranteed to match the intention. The intention stays after you build.`
          : `光の意図: ${intent} — これは候補の一覧です。意図と一致する保証はありません。組んだあとも光の意図は残ります。`;
      }
    }
    els.lightPresetTiles.innerHTML = "";
    Object.keys(LIGHT_PRESETS).forEach((key) => {
      const preset = LIGHT_PRESETS[key];
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "stage-pose-tile";
      /* 見本は光の重なりと角度を読む絵なので、駒の見本より大きく取る。
         小さいと、灯体の数と色の違いが潰れて見分けがつかない。 */
      const canvas = document.createElement("canvas");
      canvas.width = 264;
      canvas.height = 176;
      const label = document.createElement("span");
      label.textContent = tm("lightPreset", key, preset.label);
      tile.setAttribute("aria-label", label.textContent);
      tile.append(canvas, label);
      tile.addEventListener("click", () => {
        buildLightPreset(key);
        closeLightPresetModal();
      });
      els.lightPresetTiles.append(tile);
      drawPresetPreview(canvas, key);
    });
    els.lightPresetModal.hidden = false;
    els.lightPresetBackdrop.hidden = false;
  }

  function closeLightPresetModal() {
    if (!els.lightPresetModal) return;
    els.lightPresetModal.hidden = true;
    els.lightPresetBackdrop.hidden = true;
  }

  function buildLightPreset(key) {
    const preset = LIGHT_PRESETS[key];
    if (!preset) return;
    checkpoint();
    const scene = sc();
    const specs = preset.build(venueSize());
    /* 組の札。同じ札を持つ明かりは一体で動き、一体で選ばれる。
       「ばらす」で札を消せば、以後は普通の明かりに戻る。 */
    const groupId = rid("lgroup");
    specs.forEach((spec) => {
      const item = {
        id: rid("set"), kind: "light", name: spec.name.slice(0, 24), color: spec.color,
        dims: normalizeDims("light", { dims: { dia: spec.dia } }), note: "",
        locked: false, flown: false, wires: 2, framed: false, lightKind: spec.kind,
        lightGroup: groupId, groupLabel: preset.label, presetDia: spec.dia,
        preset: { u: spec.u, v: spec.v, beam: spec.beam },
      };
      state.project.sets.push(item);
      scene.pieces.push(normalizePiece({
        id: nextId(), type: "light", setId: item.id,
        u: spec.u, v: spec.v, size: 100, color: spec.color, name: "", facing: 0,
        beam: spec.beam,
      }, 0));
    });
    renderSets();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    // 文はそのまま日本語で言う。英語は say の対訳表が文ごと差し替える
    announce(`${preset.label}を組みました（明かり${specs.length}個）。個々の明かりはあとから自由に動かせます。`);
  }

  /* ---------- 照明プリセットの組 ----------
     組（lightGroup）を持つ明かりは一体で扱う: 一つを掴めば全部が同じだけ動き、
     選べば組として選ばれる。調整できるのは直径（倍率）と光の強さだけ。
     「ばらす」で札を消せば、それぞれ普通の明かりに戻る（本人の指定）。 */
  function lightGroupOf(piece) {
    if (!piece || piece.type !== "light" || !piece.setId) return null;
    const item = (state.project.sets || []).find((t) => t.id === piece.setId);
    return item && item.lightGroup ? item.lightGroup : null;
  }
  function groupItems(groupId) {
    return (state.project.sets || []).filter((t) => t.lightGroup === groupId);
  }
  // その組の、いまのシーンに出ている駒
  function groupScenePieces(groupId) {
    const ids = new Set(groupItems(groupId).map((t) => t.id));
    return sc().pieces.filter((p) => p.type === "light" && ids.has(p.setId));
  }
  // 組を一体で動かす。当てる先も灯体も、同じだけ平行移動する
  function moveLightGroup(groupId, du, dv) {
    groupScenePieces(groupId).forEach((p) => {
      p.u = clamp(p.u + du, -0.5, 1.5);
      p.v = clamp(p.v + dv, -0.5, 1);
      if (p.beam) {
        p.beam.u = clamp(p.beam.u + du, -0.3, 1.3);
        p.beam.v = clamp(p.beam.v + dv, -0.3, 1.3);
      }
    });
  }
  function splitLightGroup(groupId) {
    checkpoint();
    groupItems(groupId).forEach((t) => { t.lightGroup = null; t.groupLabel = ""; });
    renderLights();
    updateInspector();
    render();
    persistSoon();
    announce("組をばらしました。それぞれ普通の明かりとして動かせます。");
  }
  const groupTitle = (groupId) => {
    const items = groupItems(groupId);
    const label = (items[0] && items[0].groupLabel) || "照明の組";
    return isEn() ? `${tx(label)} (${items.length} lights)` : `${label}（${items.length}灯）`;
  };

  // 明かりは「舞台の上か裏か」ではなく、点いているか消えているかで言う
  const onStageWord = (item, on) => (item && item.kind === "light"
    ? (on ? "ON" : "OFF")
    : (on ? tm("misc", "onStage", "舞台上") : tm("misc", "offStage", "舞台裏")));

  /* 舞台から下げた駒の置き場所を、そのシーンに控える／控えから戻す。
     控えはシーンごとに持つ（同じ装置でも、シーンによって居場所が違うため）。 */
  // 鍵は舞台セットの登録id か 名簿の演者id。登録の無い駒は控えない（戻す先が無い）
  function stashPiece(scene, key, piece) {
    if (!scene || !key || !piece) return;
    if (!scene.stashed || typeof scene.stashed !== "object") scene.stashed = {};
    const kept = {};
    STASH_KEYS.forEach((key) => { if (piece[key] !== undefined) kept[key] = piece[key]; });
    scene.stashed[key] = kept;
  }

  /* 控えから駒を起こす。控えは「どこに、どんな格好で居たか」だけなので、
     何者であるか（種類・色・どの登録のものか）は shape で被せる。 */
  function restoreStashed(scene, key, shape) {
    const kept = scene && scene.stashed && scene.stashed[key];
    if (!kept) return null;
    const piece = normalizePiece({ ...kept, ...shape, id: nextId() }, 0);
    scene.pieces.push(piece);
    selectedId = piece.id;
    delete scene.stashed[key];
    return piece;
  }

  function toggleSetOnStage(setId) {
    checkpoint();
    const scene = sc();
    const existing = scene.pieces.find((piece) => piece.setId === setId);
    const item = (state.project.sets || []).find((t) => t.id === setId);
    const light = item && item.kind === "light";
    if (existing) {
      /* 下げる前に、いまの置き場所を控える。控えないと、出し直したときに
         placeSetPiece の既定位置へ飛んで、組んだ配置が崩れる。 */
      stashPiece(scene, setId, existing);
      scene.pieces = scene.pieces.filter((piece) => piece.id !== existing.id);
      if (selectedId === existing.id) selectedId = null;
      announce(light
        ? `${item.name}をOFFにしました。`
        : `${item ? item.name : "これ"}を舞台から下げました。`);
    } else if (item) {
      // 控えがあればそこへ戻す。無いときだけ既定位置へ出す
      const shape = { setId, type: item.kind, color: item.color };
      if (!restoreStashed(scene, setId, shape)) placeSetPiece(item);
      announce(light ? `${item.name}をONにしました。` : `${item.name}を舞台へ出しました。`);
    }
    renderSets();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
  }

  function removeSetItem(setId) {
    const item = (state.project.sets || []).find((t) => t.id === setId);
    if (!item) return;
    const scenesWith = state.project.scenes.filter((scene) =>
      scene.pieces.some((piece) => piece.setId === setId)).length;
    const warning = scenesWith
      ? `「${item.name}」を舞台セットから外します。${scenesWith}つのシーンから、これも消えます。`
      : `「${item.name}」を舞台セットから外します。`;
    if (!window.confirm(warning)) return;
    checkpoint();
    state.project.sets = state.project.sets.filter((t) => t.id !== setId);
    state.project.scenes.forEach((scene) => {
      scene.pieces = scene.pieces.filter((piece) => piece.setId !== setId);
      // 控えも捨てる。登録の無いものの置き場所が残り続けないように
      if (scene.stashed) delete scene.stashed[setId];
    });
    selectedId = null;
    renderSets();
    renderLights();
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${item.name}を舞台セットから外しました。`);
  }

  /* ---------- ショーの新規・切り替え ---------- */

  function applyLoadedState(next, message) {
    // 場面IDが別ショーで偶然重なっても、前のショーの下書きを出さない。
    resetStageAskDraft({ clearInput: true, invalidate: true });
    state = next;
    selectedId = null;
    history.length = 0;
    future.length = 0;
    // 読み込み・新規作成・ショー切替はいずれも即時に棚へ置く。
    // 180ms後の自動保存を待つ間に画面を閉じても、一覧から開き直せる。
    shelveCurrent();
    renderVenueControls();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    syncInputs();
    applyLayout();
    updateInspector();
    updateHistoryButtons();
    render();
    persistSoon();
    announce(message);
  }

  function newShow() {
    if (!window.confirm("新しいショーを作ります。いま開いているショーは一覧に残ります。")) return;
    shelveCurrent();
    const fresh = baseState(false);
    fresh.project.title = untitledShow();
    fresh.layout = state.layout;                 // 道具の並びは持ち越す
    applyLoadedState(normalizeState(fresh), "新しいショーを作りました。");
    closeShows();
    renderShows();
  }

  function openShow(id) {
    const shows = readShows();
    const entry = shows[id];
    if (!entry) return;
    if (id === state.project.id) { closeShows(); return; }
    shelveCurrent();
    const next = normalizeState(entry.state);
    next.layout = state.layout;
    applyLoadedState(next, `${next.project.title}を開きました。`);
    closeShows();
  }

  function deleteShow(id) {
    const shows = readShows();
    const info = showSummary(shows[id]);
    if (!info) return;
    if (id === state.project.id) {
      window.alert("いま開いているショーは消せません。別のショーへ切り替えてから消してください。");
      return;
    }
    if (!window.confirm(`「${info.title}」を端末から消します。戻せません。`)) return;
    delete shows[id];
    writeShows(shows);
    renderShows();
    announce(`${info.title}を消しました。`);
  }

  function renderShows() {
    if (!els.showList) return;
    const shows = readShows();
    shelveCurrent();                              // いまのショーも必ず一覧へ出す
    const rows = Object.keys(readShows())
      .map((id) => showSummary(readShows()[id]))
      .filter(Boolean)
      .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
    els.showList.innerHTML = "";
    rows.forEach((info) => {
      const row = document.createElement("div");
      row.className = `stage-show-row${info.id === state.project.id ? " is-current" : ""}`;

      const open = document.createElement("button");
      open.type = "button";
      open.className = "stage-show-open";
      const title = document.createElement("span");
      title.className = "stage-show-title";
      title.textContent = info.title;
      const meta = document.createElement("span");
      meta.className = "stage-show-meta";
      const when = info.savedAt ? info.savedAt.slice(0, 10).replace(/-/g, "/") : "";
      meta.textContent = `${info.version}・${info.scenes}シーン${when ? `・${when}` : ""}`
        + (info.id === state.project.id ? "・開いています" : "");
      open.append(title, meta);
      open.addEventListener("click", () => openShow(info.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${info.title}を消す`);
      remove.disabled = info.id === state.project.id;
      remove.addEventListener("click", () => deleteShow(info.id));

      row.append(open, remove);
      els.showList.append(row);
    });
  }

  function openShows() {
    if (!els.showsModal) return;
    renderShows();
    els.showsModal.hidden = false;
    els.showsBackdrop.hidden = false;
  }

  function closeShows() {
    if (els.showsModal) els.showsModal.hidden = true;
    if (els.showsBackdrop) els.showsBackdrop.hidden = true;
  }

  /* ---------- 段階0: ビート骨格テンプレート ----------
     適用先は常に別の新規ショー。いまのショーを棚へ残したうえで切り替えるので、
     既存シーンへの上書き・追記という危険な分岐を持たない。 */
  function createShowFromBeatTemplate(templateId) {
    const template = BEAT_TEMPLATES.find((item) => item.id === templateId);
    const rows = beatTemplateRows(templateId);
    if (!template || template.available === false || !rows.length) return;
    shelveCurrent();
    const fresh = baseState(false);
    fresh.project.title = tx(template.name);
    fresh.project.scenes = rows.map((row) => {
      const role = tx(row.beat.role);
      const scene = newScene(role, false);
      scene.beat = normalizeBeat({ ...row.beat, role });
      return scene;
    });
    fresh.project.activeSceneId = fresh.project.scenes[0].id;
    fresh.layout = state.layout;
    applyLoadedState(normalizeState(fresh), isEn()
      ? `Created a new show from “${tx(template.name)}”. The previous show is still in All shows.`
      : `「${template.name}」から新しいショーを作りました。前のショーは一覧に残っています。`);
    closeBeatTemplates();
    renderShows();
  }

  function renderBeatTemplates() {
    if (!els.beatTemplateList) return;
    els.beatTemplateList.innerHTML = "";
    BEAT_TEMPLATES.forEach((template) => {
      const available = template.available !== false;
      const card = document.createElement("article");
      card.className = `stage-beat-template-card${available ? "" : " is-held"}`;

      const copy = document.createElement("div");
      copy.className = "stage-beat-template-copy";
      const heading = document.createElement("h3");
      heading.className = "stage-beat-template-heading";
      const number = document.createElement("span");
      number.className = "stage-beat-template-number";
      number.textContent = String(template.number).padStart(2, "0");
      const name = document.createElement("span");
      name.textContent = tx(template.name);
      heading.append(number, name);

      const count = document.createElement("p");
      count.className = "stage-beat-template-count";
      count.textContent = isEn()
        ? `Creates ${template.roles.length} scenes · D2 guide ${tx(template.range)}`
        : `生成 ${template.roles.length}シーン・D2目安 ${template.range}`;
      const roles = document.createElement("p");
      roles.className = "stage-beat-template-roles";
      roles.textContent = template.roles.map((role) => tx(role)).join(" → ");
      copy.append(heading, count, roles);

      const side = document.createElement("div");
      side.className = "stage-beat-template-side";
      if (available) {
        const energy = document.createElement("div");
        energy.className = "stage-beat-energy";
        energy.setAttribute("aria-label", isEn()
          ? `Energy ${template.energy.join(", ")}`
          : `エネルギー ${template.energy.join("、")}`);
        template.energy.forEach((value) => {
          const step = document.createElement("span");
          step.className = "stage-beat-energy-step";
          step.dataset.energy = String(value);
          step.textContent = `E${value}`;
          energy.append(step);
        });
        side.append(energy);
      }

      const apply = document.createElement("button");
      apply.type = "button";
      apply.className = "stage-beat-template-apply";
      apply.disabled = !available;
      apply.textContent = tx("この骨格で新しいショーを作る");
      apply.addEventListener("click", () => createShowFromBeatTemplate(template.id));
      side.append(apply);
      card.append(copy, side);
      els.beatTemplateList.append(card);
    });
  }

  function openBeatTemplates() {
    if (!els.beatTemplatesModal) return;
    renderBeatTemplates();
    els.beatTemplatesModal.hidden = false;
    if (els.beatTemplatesBackdrop) els.beatTemplatesBackdrop.hidden = false;
  }

  function closeBeatTemplates() {
    if (els.beatTemplatesModal) els.beatTemplatesModal.hidden = true;
    if (els.beatTemplatesBackdrop) els.beatTemplatesBackdrop.hidden = true;
  }

  /* ---------- 姿勢を選ぶ ----------
     名前だけでは「片膝立ち」と「しゃがむ」の違いが伝わらないので、
     実際の形を小さく描いて並べる。舞台の絵と同じ骨格・同じ塗りを通すので、
     見本と本番がずれない。 */

  /* 種類の見本。正面から見た形（左右と高さ）だけを描き、奥行きは捨てる。
   * 舞台の道具は左右に広く奥行きが浅いので、正面図がいちばん特徴的な輪郭を見せる
   * （真横から起こすと、車も綱渡りもティーターボードも細い板に潰れて見分けがつかない）。
   * 舞台の絵と同じ部品（pieceParts）から起こすので、
   * 一覧の絵と実際に置かれる物が食い違わない。 */
  function drawKindPreview(canvas, kind, color) {
    const ctx2 = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx2.clearRect(0, 0, w, h);
    if (kind === "performer") {
      // 人だけは骨格を持っているので、立ち姿をそのまま使う
      drawPosePreview(canvas, "stand", color);
      return;
    }
    if (kind === "light") {
      ctx2.save();
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(w * 0.5, h * 0.16);
      ctx2.lineTo(w * 0.22, h * 0.8);
      ctx2.lineTo(w * 0.78, h * 0.8);
      ctx2.closePath();
      ctx2.globalAlpha = 0.35;
      ctx2.fillStyle = color;
      ctx2.fill();
      ctx2.globalAlpha = 1;
      ctx2.stroke();
      ctx2.restore();
      return;
    }
    const dims = normalizeDims(kind, {});
    if (kind === "sphere") {
      // 球は部品を持たない（円ひとつで決まる）ので、ここで描く
      const r = Math.min(w, h) * 0.32;
      ctx2.save();
      ctx2.fillStyle = color;
      ctx2.beginPath();
      ctx2.arc(w / 2, h * 0.62, r, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
      return;
    }
    if (kind === "seri") {
      // 下がり切った既定状態。登録時の見本も床面の継ぎ目として見せる
      ctx2.save();
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 1.5;
      ctx2.setLineDash([5, 4]);
      ctx2.strokeRect(w * 0.16, h * 0.42, w * 0.68, h * 0.34);
      ctx2.restore();
      return;
    }
    const parts = pieceParts({ type: kind, dims, facing: 0 });
    if (!parts) return;
    /* トラピーズの吊りロープは、舞台では吊物の描画が引くので pieceParts に無い。
       見本ではバー一本になり、床に置いた板と見分けがつかないので、ここで足す。 */
    if (kind === "trapeze") {
      const half = (dims.w || 0.7) / 2;
      [-half, half].forEach((x) => parts.push({
        kind: "line", a: [x, 0.03, 0], b: [x, 0.62, 0], w: 0.018, tone: "gear",
      }));
    }
    // 幅と高さの範囲を測る
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const scan = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    parts.forEach((part) => {
      if (part.kind === "line") { scan(part.a[0], part.a[1]); scan(part.b[0], part.b[1]); return; }
      if (part.kind === "ring") { scan(part.c[0] - part.r, part.c[1] - part.r); scan(part.c[0] + part.r, part.c[1] + part.r); return; }
      // 円板は床と平行なので、見本では幅2rの薄い板として測る
      if (part.kind === "disc") {
        scan(part.c[0] - part.r, part.c[1]);
        scan(part.c[0] + part.r, part.c[1] + (part.h || 0));
        return;
      }
      scan(part.ox - part.w / 2, part.lift); scan(part.ox + part.w / 2, part.lift + part.h);
    });
    const pad = 14;
    const bw = Math.max(0.01, x1 - x0);
    const bh = Math.max(0.01, y1 - y0);
    const k = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const ox = (w - bw * k) / 2 - x0 * k;
    const oy = h - pad - (0 - y0) * k;          // 床（y=0）を下端に置く
    const px = (x) => ox + x * k;
    const py = (y) => oy - y * k;

    ctx2.save();
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    parts.forEach((part) => {
      if (part.kind === "line") {
        // 見本でも布・木・金属を描き分ける（実際の舞台上の見えと揃える）
        ctx2.strokeStyle = part.tone === "cloth" ? color
          : part.tone === "wood" ? "rgba(196,158,104,0.95)"
          : part.tone === "dark" ? "rgba(126,116,106,0.95)"
          : "rgba(214,220,226,0.9)";
        ctx2.lineWidth = Math.max(1.5, (part.w || 0.04) * k);
        ctx2.beginPath();
        ctx2.moveTo(px(part.a[0]), py(part.a[1]));
        ctx2.lineTo(px(part.b[0]), py(part.b[1]));
        ctx2.stroke();
        return;
      }
      if (part.kind === "ring") {
        ctx2.strokeStyle = part.tone === "dark" ? "rgba(60,54,48,0.95)" : "rgba(214,220,226,0.9)";
        ctx2.lineWidth = Math.max(1.5, (part.w || 0.04) * k);
        ctx2.beginPath();
        if (part.plane === "xz") {
          // 床と平行の輪。真横から見れば一本の横線になる（真円で描くと別物に見える）
          ctx2.moveTo(px(part.c[0] - part.r), py(part.c[1]));
          ctx2.lineTo(px(part.c[0] + part.r), py(part.c[1]));
        } else {
          ctx2.arc(px(part.c[0]), py(part.c[1]), part.r * k, 0, Math.PI * 2);
        }
        ctx2.stroke();
        return;
      }
      if (part.kind === "disc") {
        // 見本は正面から見た形なので、床と平行の円板は幅2rの薄い板として出す
        ctx2.fillStyle = part.tint >= 1 ? color : mixToward(color, 1 - (part.tint || 1));
        ctx2.fillRect(px(part.c[0] - part.r), py(part.c[1] + (part.h || 0)),
          Math.max(1.5, part.r * 2 * k), Math.max(1.5, (part.h || 0.03) * k));
        return;
      }
      ctx2.fillStyle = part.tint >= 1 ? color : mixToward(color, 1 - (part.tint || 1));
      ctx2.fillRect(px(part.ox - part.w / 2), py(part.lift + part.h),
        Math.max(1.5, part.w * k), Math.max(1.5, part.h * k));
    });
    ctx2.restore();
  }

  function drawPosePreview(canvas, poseId, color) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    /* 見る角度は姿勢で変える。斜め前から見ると前後と左右の両方が読めるが、
     * 宙返りや寝姿のように「横から見る形」は、斜めから見ると
     * 手前と奥が重なって塊にしか見えない。そういう姿勢は真横から見せる。 */
    const pose = poseById(poseId);
    const yaw = pose && pose.sideView ? Math.PI * 0.5 : Math.PI * 0.24;

    // まず等倍で組んで、外に出る範囲を測る
    const probe = buildRig(poseId, 0, 0, 1, 1, yaw, 0, null);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const scan = (q) => {
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    };
    Object.keys(probe.P).forEach((k) => scan(probe.P[k]));
    // 胴は断面の中心から左右へ張り出すので、その分も入れて測る
    probe.rings.forEach((ring) => {
      const r = Math.hypot(ring.wx, ring.wy) + Math.hypot(ring.dx, ring.dy);
      scan({ x: ring.o.x - r, y: ring.o.y - r });
      scan({ x: ring.o.x + r, y: ring.o.y + r });
    });

    const pad = 14;
    const bw = Math.max(0.001, x1 - x0);
    const bh = Math.max(0.001, y1 - y0);
    const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const ox = pad - x0 * s + ((w - pad * 2) - bw * s) / 2;
    const oy = pad - y0 * s + ((h - pad * 2) - bh * s) / 2;
    paintBody(ctx, buildRig(poseId, ox, oy, s, s, yaw, 0, null), color);
  }

  const ROSTER_KINDS = ["performer"].concat(SET_KIND_ORDER);
  let rosterKind = "performer";

  function openKindModal() {
    if (!els.kindModal) return;
    const grid = els.kindGrid;
    grid.innerHTML = "";
    ROSTER_KINDS.forEach((kind) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `stage-pose-tile${kind === rosterKind ? " is-on" : ""}`;
      const canvas = document.createElement("canvas");
      canvas.width = 132;
      canvas.height = 132;
      const label = document.createElement("span");
      label.textContent = kind === "performer" ? tx("演者") : setKindName(kind);
      tile.append(canvas, label);
      tile.addEventListener("click", () => {
        rosterKind = kind;
        if (els.rosterKindLabel) els.rosterKindLabel.textContent = label.textContent;
        closeKindModal();
        if (els.rosterName) els.rosterName.focus();
      });
      grid.append(tile);
      drawKindPreview(canvas, kind, kind === "performer" ? "#a84b26" : "#8b98a1");
    });
    els.kindModal.hidden = false;
    els.kindBackdrop.hidden = false;
  }

  function closeKindModal() {
    if (!els.kindModal) return;
    els.kindModal.hidden = true;
    els.kindBackdrop.hidden = true;
  }

  function openPoseModal() {
    const piece = selectedPiece();
    if (!piece || piece.type !== "performer" || !els.poseModal) return;
    const grid = els.poseGrid;
    grid.innerHTML = "";
    POSES.forEach((pose) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `stage-pose-tile${pose.id === piece.pose ? " is-on" : ""}`;
      tile.setAttribute("aria-pressed", String(pose.id === piece.pose));
      const canvas = document.createElement("canvas");
      canvas.width = 132;
      canvas.height = 148;
      const label = document.createElement("span");
      label.textContent = poseName(pose);
      tile.append(canvas, label);
      grid.append(tile);
      drawPosePreview(canvas, pose.id, piece.color);
      tile.addEventListener("click", () => {
        checkpoint();
        piece.pose = pose.id;
        closePoseModal();
        updateInspector();
        render();
        persistSoon();
        announce(`姿勢を「${poseName(pose)}」にしました。`);
      });
    });
    els.poseModal.hidden = false;
    els.poseBackdrop.hidden = false;
  }

  function closePoseModal() {
    if (els.poseModal) els.poseModal.hidden = true;
    if (els.poseBackdrop) els.poseBackdrop.hidden = true;
  }

  /* ---------- セット登録（画面の名前。コード上は rig） ----------
     舞台装置の並びに名前をつけて残し、別のシーンで呼び出す。
     残すのは演者以外。演者は場面ごとに出入りするものなので、装置と一緒に
     持ち回すと「前の場面の人がそのまま立っている」ことになる。 */

  const isRigPiece = (piece) => piece.type !== "performer";

  // 型に入れる／型から出すときの写し。id は必ず作り直す（同じ場面に二重で置けるように）
  function copyPiece(piece) {
    const clone = JSON.parse(JSON.stringify(piece));
    clone.id = nextId();
    clone.base = 0;
    clone.supportId = null;
    return clone;
  }

  function renderRigs() {
    if (!els.rigList) return;
    const rigs = state.project.rigs || [];
    els.rigList.innerHTML = "";
    if (!rigs.length) {
      const empty = document.createElement("p");
      empty.className = "stage-cast-empty";
      empty.textContent = isEn()
        ? "Nothing saved yet. Lay out the set, then save it under a name."
        : "まだ残していません。並べ終えたら名前をつけて残してください。";
      els.rigList.append(empty);
      return;
    }
    rigs.forEach((rig) => {
      const row = document.createElement("div");
      row.className = "stage-set-row";

      const head = document.createElement("div");
      head.className = "stage-set-head stage-rig-head";
      const name = document.createElement("input");
      name.type = "text";
      name.className = "stage-cast-name-input";
      name.value = rig.name;
      name.maxLength = 24;
      name.setAttribute("aria-label", tx("セット登録の名前"));
      name.addEventListener("input", () => {
        rig.name = name.value.slice(0, 24);
        persistSoon();
      });
      head.append(name);

      const foot = document.createElement("div");
      foot.className = "stage-set-foot stage-rig-foot";
      const count = document.createElement("span");
      count.className = "stage-set-dims";
      count.textContent = `${rig.pieces.length}点`;

      const swap = document.createElement("button");
      swap.type = "button";
      swap.className = "stage-cast-status is-off";
      swap.textContent = "置き換え";
      swap.title = "いまのシーンの装置を、この型にそっくり入れ替えます";
      swap.addEventListener("click", () => applyRig(rig.id, "replace"));

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "stage-cast-status is-off";
      plus.textContent = "足す";
      plus.title = "いまのシーンへ、この型の装置を足します";
      plus.addEventListener("click", () => applyRig(rig.id, "add"));

      const update = document.createElement("button");
      update.type = "button";
      update.className = "stage-cast-profile";
      update.textContent = "↺";
      update.title = "いまの並びで、この型を上書きします";
      update.setAttribute("aria-label", `${rig.name}をいまの並びで上書き`);
      update.addEventListener("click", () => overwriteRig(rig.id));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "stage-cast-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", `${rig.name}を消す`);
      remove.addEventListener("click", () => removeRig(rig.id));

      foot.append(count, swap, plus, update, remove);
      row.append(head, foot);
      els.rigList.append(row);
    });
  }

  function currentRigPieces() {
    return sc().pieces.filter(isRigPiece);
  }

  function saveRig() {
    const raw = (els.rigName && els.rigName.value || "").trim();
    if (!raw) {
      announce("名前を入れてから残してください。");
      if (els.rigName) els.rigName.focus();
      return;
    }
    const pieces = currentRigPieces();
    if (!pieces.length) {
      announce("舞台に装置がありません。");
      return;
    }
    checkpoint();
    state.project.rigs.push({ id: rid("rig"), name: raw.slice(0, 24), pieces: pieces.map(copyPiece) });
    if (els.rigName) els.rigName.value = "";
    renderRigs();
    persistSoon();
    announce(`${raw}として${pieces.length}点を残しました。`);
  }

  function overwriteRig(rigId) {
    const rig = (state.project.rigs || []).find((r) => r.id === rigId);
    if (!rig) return;
    const pieces = currentRigPieces();
    if (!window.confirm(`「${rig.name}」を、いまの並び（${pieces.length}点）で上書きしますか。`)) return;
    checkpoint();
    rig.pieces = pieces.map(copyPiece);
    renderRigs();
    persistSoon();
    announce(`${rig.name}を上書きしました。`);
  }

  function applyRig(rigId, mode) {
    const rig = (state.project.rigs || []).find((r) => r.id === rigId);
    if (!rig) return;
    checkpoint();
    const scene = sc();
    if (mode === "replace") scene.pieces = scene.pieces.filter((piece) => !isRigPiece(piece));
    rig.pieces.forEach((piece) => scene.pieces.push(copyPiece(piece)));
    selectedId = null;
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    announce(`${rig.name}の${rig.pieces.length}点を${mode === "replace" ? "置き換えました" : "足しました"}。`);
  }

  function removeRig(rigId) {
    const rig = (state.project.rigs || []).find((r) => r.id === rigId);
    if (!rig) return;
    if (!window.confirm(`「${rig.name}」を消します。置いてある装置はそのままです。`)) return;
    checkpoint();
    state.project.rigs = state.project.rigs.filter((r) => r.id !== rigId);
    renderRigs();
    persistSoon();
    announce(`${rig.name}を消しました。`);
  }

  /* ---------- 舞台セットの寸法（モーダル） ---------- */

  let setInfoId = null;

  function currentSetItem() {
    return setInfoId ? (state.project.sets || []).find((t) => t.id === setInfoId) : null;
  }

  function openSetInfo(setId) {
    const item = (state.project.sets || []).find((t) => t.id === setId);
    if (!item || !els.setInfo) return;
    setInfoId = setId;
    els.setInfoTitle.textContent = `${item.name}（${setKindName(item.kind)}）`;
    els.setInfoName.value = item.name;
    els.setInfoColor.value = item.color;
    if (els.setInfoKindRow) {
      els.setInfoKindRow.hidden = item.kind !== "light";
      if (item.kind === "light" && els.setInfoKind) els.setInfoKind.value = lightKindOf(item);
    }
    if (els.setInfoFlownRow) {
      // 吊れるのは形のあるもの（台・テーブル・椅子・壁）だけ
      const canFly = Boolean(SOLID_TYPES[item.kind] && item.kind !== "seri");
      const onlyFlown = Boolean(FLOWN_ONLY[item.kind]);
      els.setInfoFlownRow.hidden = !canFly;
      if (els.setInfoFlown) {
        // 吊物にしかならない道具は、床置きへ戻せない
        els.setInfoFlown.disabled = onlyFlown;
        els.setInfoFlownRow.title = onlyFlown ? "この道具は吊物にしかなりません" : "";
      }
      if (els.setInfoFlownNote) els.setInfoFlownNote.hidden = !canFly || !item.flown;
      if (els.setInfoFlown) els.setInfoFlown.checked = Boolean(item.flown);
      if (els.setInfoFramedRow) {
        els.setInfoFramedRow.hidden = item.kind !== "wall";
        if (els.setInfoFramed) els.setInfoFramed.checked = Boolean(item.framed);
      }
      if (els.setInfoWiresRow) els.setInfoWiresRow.hidden = !canFly || !item.flown;
      if (els.setInfoWires) els.setInfoWires.value = String(Number(item.wires) === 1 ? 1 : 2);
    }
    els.setInfoNote.value = item.note || "";
    buildDimControls(els.setInfoDims, "stage-setinfo", item.kind, item.dims, () => {
      renderSets();
      renderLights();
      render();
      persistSoon();
    }, Boolean(item.flown));
    els.setInfo.hidden = false;
    els.setInfoBackdrop.hidden = false;
    els.setInfoName.focus();
  }

  function closeSetInfo() {
    setInfoId = null;
    if (els.setInfo) els.setInfo.hidden = true;
    if (els.setInfoBackdrop) els.setInfoBackdrop.hidden = true;
  }

  /* ---------- 演者プロフィール ---------- */

  let profileId = null;

  function openProfile(castId) {
    const member = state.project.cast.find((c) => c.id === castId);
    if (!member || !els.profile) return;
    profileId = castId;
    els.profileName.value = member.name;
    els.profileHeight.value = String(member.heightCm || DEFAULT_HEIGHT_CM);
    els.profileHeightValue.textContent = String(member.heightCm || DEFAULT_HEIGHT_CM);
    els.profileColor.value = member.color;
    els.profileNote.value = member.note || "";
    els.profile.hidden = false;
    els.profileBackdrop.hidden = false;
    els.profileName.focus();
  }

  function closeProfile() {
    profileId = null;
    if (els.profile) els.profile.hidden = true;
    if (els.profileBackdrop) els.profileBackdrop.hidden = true;
  }

  function profileMember() {
    return profileId ? state.project.cast.find((c) => c.id === profileId) : null;
  }

  // 身長が変わると、その演者が出ている場面すべてで見え方が変わる
  function applyProfileChange(fn) {
    const member = profileMember();
    if (!member) return;
    fn(member);
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    render();
    persistSoon();
  }

  if (els.profileClose) els.profileClose.addEventListener("click", closeProfile);
  if (els.profileBackdrop) els.profileBackdrop.addEventListener("click", closeProfile);
  if (els.profileName) {
    els.profileName.addEventListener("input", (e) =>
      applyProfileChange((m) => { m.name = e.target.value.slice(0, 24); }));
  }
  if (els.profileHeight) {
    els.profileHeight.addEventListener("input", (e) => {
      els.profileHeightValue.textContent = e.target.value;
      applyProfileChange((m) => { m.heightCm = clamp(Number(e.target.value), 120, 210); });
    });
  }
  if (els.profileColor) {
    els.profileColor.addEventListener("input", (e) => {
      applyProfileChange((m) => {
        m.color = e.target.value;
        state.project.scenes.forEach((scene) => {
          scene.pieces.forEach((piece) => {
            if (piece.castId === m.id) piece.color = m.color;
          });
        });
      });
    });
  }
  if (els.profileNote) {
    els.profileNote.addEventListener("input", (e) =>
      applyProfileChange((m) => { m.note = e.target.value.slice(0, 200); }));
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && profileId) closeProfile();
  });

  /* ---------- 場面とプロジェクト ---------- */

  /* 並べ替え・追加・削除の起点になる行。セクションを押したときは、
   * 絵を持たないので「開く」ことはできないが、操作の起点にはなる。 */
  function cursorIndex() {
    const list = state.project.scenes;
    const byCursor = list.findIndex((x) => x.id === state.cursorRowId);
    if (byCursor >= 0) return byCursor;
    return list.findIndex((x) => x.id === state.project.activeSceneId);
  }

  // その行に属する子（自分より深い行が続くあいだ）
  function sceneChildren(index) {
    const list = state.project.scenes;
    const base = list[index].depth;
    let end = index + 1;
    while (end < list.length && list[end].depth > base) end += 1;
    return list.slice(index + 1, end);
  }

  // どの入口から深さを変えても、飛び級の入れ子を保存しない。
  function tidySceneDepths() {
    let prev = -1;
    state.project.scenes.forEach((sceneRow) => {
      sceneRow.depth = Math.min(sceneRow.depth, prev + 1);
      prev = sceneRow.depth;
    });
  }

  function canShiftSceneDepth(scene, step) {
    const list = state.project.scenes;
    const index = list.indexOf(scene);
    if (index < 0) return false;
    if (step === -1) return scene.depth > 0;
    if (step !== 1 || scene.depth + 1 > MAX_DEPTH || index === 0) return false;
    return scene.depth <= list[index - 1].depth;
  }

  function shiftSceneDepth(scene, step) {
    if (!canShiftSceneDepth(scene, step)) return false;
    const index = state.project.scenes.indexOf(scene);
    const moving = [scene, ...sceneChildren(index)];
    // 親だけ動いて子が上限に取り残される状態は作らない。
    if (step > 0 && moving.some((row) => row.depth + step > MAX_DEPTH)) {
      announce("これ以上内側へは入れられません。");
      return false;
    }
    checkpoint();
    const list = state.project.scenes;
    if (step < 0) {
      /* 外へ出すときは、元の親に残る後ろの兄弟の手前から抜けてはいけない。
       * その場で浅くすると、後ろに続く場面がこの行の中身に化けてしまう
       * （幕の途中の場面を出すと、それ以降が幕から丸ごと抜けていた）。
       * 元の親の終わりまで送ってから浅くする。 */
      const parentDepth = scene.depth - 1;
      let end = index + moving.length;
      while (end < list.length && list[end].depth > parentDepth) end += 1;
      if (end > index + moving.length) {
        list.splice(index, moving.length);
        list.splice(end - moving.length, 0, ...moving);
      }
    }
    moving.forEach((row) => { row.depth += step; });
    tidySceneDepths();
    state.cursorRowId = scene.id;
    renderScenes();
    renderSceneGrid();
    persistSoon();
    announce(step > 0 ? "一段内側へ入れました。" : "一段外へ出しました。");
    return true;
  }

  function focusSceneChip(sceneId) {
    if (!els.sceneList) return;
    const renderedRow = [...els.sceneList.querySelectorAll("[data-scene-id]")]
      .find((row) => row.dataset.sceneId === sceneId);
    const chip = renderedRow && renderedRow.querySelector(".stage-scene-chip");
    if (chip) chip.focus();
  }

  // セクション内は直下だけでなく、さらに入れ子になった場面も同じまとまりとして数える。
  function sectionTotals(index) {
    const scenes = sceneChildren(index).filter((row) => row.kind === "scene");
    const seconds = scenes.reduce((sum, scene) => {
      const rehearsal = scene.rehearsal || {};
      return sum + finite(rehearsal.holdDurationSeconds, 0)
        + finite(rehearsal.transitionToNextSeconds, 0);
    }, 0);
    return { scenes: scenes.length, seconds };
  }

  function sectionDurationText(seconds) {
    if (seconds < 60) return isEn() ? `${Math.round(seconds)} sec` : `${Math.round(seconds)}秒`;
    return isEn() ? `~${Math.round(seconds / 60)} min` : `約${Math.round(seconds / 60)}分`;
  }

  function sectionSummary(totals, place) {
    const showTime = featureOn("sceneTiming") && totals.seconds > 0;
    const duration = showTime ? sectionDurationText(totals.seconds) : "";
    if (place === "list") return showTime ? `${totals.scenes}・${duration}` : `${totals.scenes}`;
    if (isEn()) {
      const scenes = `${totals.scenes} ${totals.scenes === 1 ? "scene" : "scenes"}`;
      if (!showTime) return scenes;
      return place === "title" ? `${scenes} · total ${duration}` : `${scenes} · ${duration}`;
    }
    if (!showTime) return `${totals.scenes}場面`;
    return place === "title"
      ? `${totals.scenes}場面・合計 ${duration}`
      : `${totals.scenes}場面・${duration}`;
  }

  // 畳んだセクションの中にいるか
  function sceneHidden(index) {
    const list = state.project.scenes;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (list[i].depth < list[index].depth) {
        if (list[i].kind === "section" && state.closedSections[list[i].id]) return true;
        if (sceneHidden(i)) return true;
        return false;
      }
    }
    return false;
  }

  // 一覧とグリッドで同じ数え札を使う。深さが戻ったら内側の札は捨てる。
  function sceneNumberMap(rows) {
    const counters = [];
    const numbers = new Map();
    (rows || []).forEach((scene) => {
      counters[scene.depth] = (counters[scene.depth] || 0) + 1;
      counters.length = scene.depth + 1;
      numbers.set(scene.id, counters.join("-"));
    });
    return numbers;
  }

  // 「後からまとめる」の開始行。プロジェクトの内容ではないためstateへ保存しない。
  let wrapPickStartId = null;

  function clearWrapPick() {
    wrapPickStartId = null;
    if (!els.sceneList) return;
    els.sceneList.classList.remove("is-wrap-picking");
    els.sceneList.querySelectorAll(".is-wrap-start").forEach((row) => row.classList.remove("is-wrap-start"));
  }

  function cancelWrapPick(message) {
    clearWrapPick();
    renderScenes();
    announce(message || "まとめるのを中止しました。");
  }

  function beginWrapPick(sceneId) {
    wrapPickStartId = sceneId;
    renderScenes();
    announce("まとめる最後のシーンをクリックしてください。同じシーンを押すと1つだけまとめます。Escで中止。");
  }

  function finishWrapPick(endId) {
    const list = state.project.scenes;
    const start = list.findIndex((row) => row.id === wrapPickStartId);
    const end = list.findIndex((row) => row.id === endId);
    const startRow = list[start];
    const endRow = list[end];
    const depth = startRow && startRow.depth;
    const valid = start >= 0 && end >= start
      && startRow.kind === "scene" && endRow.kind === "scene"
      && endRow.depth === depth
      && list.slice(start, end + 1).every((row) => row.depth >= depth);
    if (!valid) {
      cancelWrapPick();
      return;
    }

    const chosen = list.slice(start, end + 1);
    if (chosen.some((row) => row.depth + 1 > MAX_DEPTH)) {
      clearWrapPick();
      renderScenes();
      announce("深さの上限に達するため、ここではまとめられません。");
      return;
    }

    checkpoint();
    const count = list.filter((row) => row.kind === "section").length;
    const section = newScene(isEn() ? `Section ${count + 1}` : `セクション ${count + 1}`,
      false, "section", depth);
    const sceneCount = chosen.filter((row) => row.kind === "scene").length;
    chosen.forEach((row) => { row.depth += 1; });
    list.splice(start, 0, section);
    state.cursorRowId = section.id;
    clearWrapPick();
    renderScenes();
    persistSoon();
    openRename(section);
    announce(`${sceneCount}シーンをまとめました。`);
  }

  /* 色バーは行の中の一列ではなく、行の左端に敷いた溝へ置く。
   * 見出しの中に入れると、開いている行（メモや動線のボタンを抱えた背の高い行）で
   * 上の数十pxしか塗られず、幕の線がそこで切れて見える。 */
  function makeSceneBars(scene, ancestors) {
    const bars = document.createElement("span");
    bars.className = "stage-scene-bars";
    bars.setAttribute("aria-hidden", "true");
    for (let depth = 0; depth < scene.depth; depth += 1) {
      const section = ancestors[depth];
      if (!section || section.kind !== "section") continue;
      const mark = document.createElement("i");
      mark.className = "stage-scene-bar-mark";
      mark.style.setProperty("--bar-slot", depth);
      mark.style.backgroundColor = sectionColor(section);
      bars.append(mark);
    }
    if (scene.kind === "section") {
      const own = document.createElement("i");
      own.className = "stage-scene-bar-mark is-own";
      own.style.setProperty("--bar-slot", scene.depth);
      own.style.backgroundColor = sectionColor(scene);
      bars.append(own);
    }
    return bars;
  }

  /* 行と行の隙間でバーが切れないよう、下の行へ続く分だけ伸ばす。
   * 「次に見えている行が、その溝より深いか」で判断する。深くなければ
   * そこがその幕の終わりなので伸ばさない（次の幕の頭まで線が垂れない）。 */
  function linkSceneBars() {
    if (!els.sceneList) return;
    const rows = [...els.sceneList.children].filter((row) => row.dataset && row.dataset.sceneId);
    rows.forEach((row, i) => {
      const next = rows[i + 1];
      const nextDepth = next ? Number(next.dataset.depth) : -1;
      row.querySelectorAll(".stage-scene-bar-mark").forEach((mark) => {
        const slot = Number(mark.style.getPropertyValue("--bar-slot"));
        mark.classList.toggle("is-linked", nextDepth > slot);
      });
    });
  }

  function renderScenes() {
    const p = state.project;
    if (els.sceneList) {
      els.sceneList.innerHTML = "";
      if (wrapPickStartId && !p.scenes.some((row) => row.id === wrapPickStartId)) wrapPickStartId = null;
      els.sceneList.classList.toggle("is-wrap-picking", Boolean(wrapPickStartId));
      /* 番号は入れ子に沿って振る。セクションの中の場面は「4-1」のようになる。
       * 深さごとの数え札を持ち、浅い所へ戻ったら深い側は捨てる。 */
      const sceneNumbers = sceneNumberMap(p.scenes);
      const sectionStack = [];
      p.scenes.forEach((scene, i) => {
        const numberText = sceneNumbers.get(scene.id) || String(i + 1);
        sectionStack.length = scene.depth;
        const ancestors = sectionStack.slice();
        sectionStack[scene.depth] = scene.kind === "section" ? scene : null;
        sectionStack.length = scene.depth + 1;
        if (sceneHidden(i)) return;
        const isCursor = scene.id === (state.cursorRowId || p.activeSceneId);
        const isOpen = scene.kind === "scene" && scene.id === p.activeSceneId;

        const row = document.createElement("div");
        row.className = `stage-scene-row${isOpen ? " is-open" : ""}${scene.id === wrapPickStartId ? " is-wrap-start" : ""}`;
        row.dataset.sceneId = scene.id;
        row.dataset.depth = String(scene.depth);
        // 左端に空ける溝。バーはこの中へ、行の高さいっぱいに敷く
        const slots = scene.depth + (scene.kind === "section" ? 1 : 0);
        row.style.setProperty("--scene-gutter", `${slots * 14}px`);

        const head = document.createElement("div");
        head.className = "stage-scene-head";
        const bars = makeSceneBars(scene, ancestors);

        // 掴んで動かす取っ手。行そのものを掴むと中の編集ができなくなる
        const grip = document.createElement("span");
        grip.className = "stage-scene-grip";
        grip.textContent = "⠿";
        grip.setAttribute("aria-hidden", "true");
        grip.addEventListener("pointerdown", (e) => startSceneDrag(e, scene.id, row));

        const button = document.createElement("button");
        button.type = "button";
        button.className = `stage-scene-chip${scene.kind === "section" ? " is-section" : ""}${isOpen ? " is-open" : ""}`;
        button.setAttribute("aria-pressed", String(isCursor));

        const num = document.createElement("span");
        num.className = "stage-scene-num";
        if (scene.kind === "section") {
          const shut = Boolean(state.closedSections[scene.id]);
          num.textContent = `${shut ? "▸" : "▾"} ${numberText}`;
          button.setAttribute("aria-expanded", String(!shut));
        } else {
          num.textContent = scene.studyBeatId || numberText;
        }

        const name = document.createElement("span");
        name.className = "stage-scene-name";
        if (scene.kind === "section") {
          const colorChip = document.createElement("i");
          colorChip.className = "stage-scene-section-color";
          colorChip.style.backgroundColor = sectionColor(scene);
          colorChip.setAttribute("aria-hidden", "true");
          name.append(colorChip, document.createTextNode(scene.title));
        } else {
          name.textContent = scene.title;
        }

        const count = document.createElement("span");
        count.className = "stage-scene-count";
        if (scene.kind === "section") {
          const totals = sectionTotals(i);
          count.textContent = sectionSummary(totals, "list");
          count.title = sectionSummary(totals, "title");
        } else {
          count.textContent = scene.beat && scene.beat.energy !== null
            ? `E${scene.beat.energy}・${scene.pieces.length}` : `${scene.pieces.length}`;
        }
        if (scene.kind === "scene" && scene.beat && scene.beat.energy !== null) {
          count.title = `エネルギー ${scene.beat.energy}・配置 ${scene.pieces.length}`;
        }

        button.append(num, name, count);
        /* 名前を直す入口は鉛筆。行そのものを入力欄にすると、
         * 掴んで並べ替える手つきと取り合いになる（実際に効かなくなっていた）。 */
        button.title = tx(scene.kind === "section" ? "押すと開閉します" : "押すと開きます");
        button.addEventListener("dblclick", (e) => {
          e.preventDefault();
          openRename(scene);
        });
        button.addEventListener("click", () => {
          if (wrapPickStartId) {
            finishWrapPick(scene.id);
            return;
          }
          if (scene.kind === "section") {
            if (state.cursorRowId === scene.id) {
              state.closedSections[scene.id] = !state.closedSections[scene.id];
            }
            state.cursorRowId = scene.id;
            renderScenes();
            renderSceneGrid();
            persistSoon();
            focusSceneChip(scene.id);
            return;
          }
          openScene(scene.id);
          focusSceneChip(scene.id);
        });
        head.append(grip, button);
        // 深さと名前の操作は選んでいる行にだけ。全行に出すと並びが読みにくくなる
        if (isCursor && !wrapPickStartId) {
          const outdent = document.createElement("button");
          outdent.type = "button";
          outdent.className = "stage-scene-outdent";
          outdent.textContent = "⇤";
          outdent.title = tx("一段外へ出す");
          outdent.setAttribute("aria-label", outdent.title);
          outdent.disabled = !canShiftSceneDepth(scene, -1);
          outdent.addEventListener("click", (event) => {
            event.stopPropagation();
            shiftSceneDepth(scene, -1);
          });
          const indent = document.createElement("button");
          indent.type = "button";
          indent.className = "stage-scene-indent";
          indent.textContent = "⇥";
          indent.title = tx("一段内側へ入れる");
          indent.setAttribute("aria-label", indent.title);
          indent.disabled = !canShiftSceneDepth(scene, 1);
          indent.addEventListener("click", (event) => {
            event.stopPropagation();
            shiftSceneDepth(scene, 1);
          });
          const pen = document.createElement("button");
          pen.type = "button";
          pen.className = "stage-scene-pen";
          pen.textContent = "✎";
          pen.title = tx("名前を変える");
          pen.setAttribute("aria-label", isEn() ? `Rename ${scene.title}` : `${scene.title} の名前を変える`);
          pen.addEventListener("click", (e) => { e.stopPropagation(); openRename(scene); });
          head.append(outdent, indent, pen);
          if (scene.kind === "scene") {
            const wrap = document.createElement("button");
            wrap.type = "button";
            wrap.className = "stage-scene-wrap";
            wrap.textContent = "⊂";
            wrap.title = tx("ここから範囲をまとめて新しいセクションにする");
            wrap.setAttribute("aria-label", wrap.title);
            wrap.addEventListener("click", (event) => {
              event.stopPropagation();
              beginWrapPick(scene.id);
            });
            head.append(wrap);
          }
        }
        row.append(bars, head);

        if (scene.kind === "scene" && scene.lightingIntent) {
          const lightSummary = document.createElement("div");
          lightSummary.className = "stage-scene-light-summary";
          lightSummary.textContent = lightingIntentSummary(scene.lightingIntent, isEn(), 96);
          lightSummary.title = lightingIntentSummary(scene.lightingIntent, isEn(), 220);
          row.append(lightSummary);
        }

        /* 開いている場面だけ、名前とメモをその場で開く。
         * 閉じている行は名前だけ。並びを見渡すときに邪魔にならない。 */
        if (isOpen && scene.kind === "scene") {
          const body = document.createElement("div");
          body.className = "stage-scene-body";
          if (scene.beat && (scene.beat.role || scene.beat.energy !== null)) {
            const beat = document.createElement("div");
            beat.className = "stage-scene-beat";
            const energy = document.createElement("span");
            energy.className = "stage-scene-beat-energy";
            energy.textContent = scene.beat.energy === null ? "E—" : `E${scene.beat.energy}`;
            const role = document.createElement("span");
            role.textContent = scene.beat.role;
            beat.append(energy, role);
            body.append(beat);
          }
          const timing = document.createElement("div");
          timing.className = "stage-rehearsal-time-grid stage-scene-rehearsal-times";
          const makeTimingInput = (labelJa, key) => {
            const label = document.createElement("label");
            const title = document.createElement("span");
            title.textContent = tx(labelJa);
            const value = document.createElement("span");
            const input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.max = "86400";
            input.step = "0.1";
            input.inputMode = "decimal";
            input.value = scene.rehearsal && scene.rehearsal[key] !== null
              ? String(scene.rehearsal[key]) : "";
            input.setAttribute("aria-label", tx(`${labelJa}（秒）`));
            input.addEventListener("input", () => {
              if (!scene.rehearsal) scene.rehearsal = normalizeSceneRehearsal(null);
              scene.rehearsal[key] = rehearsalSeconds(input.value);
              persistSoon();
              if (els.rehearsalExportModal && !els.rehearsalExportModal.hidden) {
                refreshRehearsalExport();
              }
            });
            input.addEventListener("change", () => {
              renderScenes();
              renderSceneGrid();
            });
            const unit = document.createTextNode(` ${tx("秒")}`);
            value.append(input, unit);
            label.append(title, value);
            return label;
          };
          if (featureOn("sceneTiming")) {
            timing.append(
              makeTimingInput("見せる時間", "holdDurationSeconds"),
              makeTimingInput("次のシーンへの移動時間", "transitionToNextSeconds"),
            );
          }
          if (featureOn("blackout")) {
            const dark = document.createElement("label");
            dark.className = "stage-canvas-toggle";
            dark.title = tx("このシーンへの転換を、一度真っ暗にしてから明ける");
            const darkBox = document.createElement("input");
            darkBox.type = "checkbox";
            darkBox.checked = Boolean(scene.blackout);
            darkBox.addEventListener("change", () => {
              checkpoint();
              scene.blackout = darkBox.checked;
              persistSoon();
              announce(scene.blackout ? "暗転で始まるシーンにしました。" : "暗転をやめました。");
            });
            const darkWord = document.createElement("span");
            darkWord.textContent = tx("暗転");
            dark.append(darkBox, darkWord);
            timing.append(dark);
          }
          const note = document.createElement("textarea");
          note.className = "stage-text-input";
          note.rows = 2;
          note.maxLength = 200;
          note.value = scene.note || "";
          note.placeholder = tm("misc", "sceneNoteHint", "このシーンのメモ（何が起きるか）");
          note.setAttribute("aria-label", tx("シーンのメモ"));
          /* 開いているのがいまの場面なら、絵の上の欄と対になる。
             片方を打ったときに、もう片方だけを書き換えるための目印。 */
          if (scene.id === state.project.activeSceneId) note.id = "stage-scene-note-input";
          note.addEventListener("input", () => {
            scene.note = note.value.slice(0, 200);
            // 絵の上の「シーンの説明」も打ちながら追いかける
            if (scene.id === state.project.activeSceneId) {
              syncSceneDesc();
              if (presenting) render();
            }
            persistSoon();
          });
          const apply = document.createElement("button");
          apply.type = "button";
          apply.className = "btn-quiet stage-scene-apply";
          apply.textContent = tm("misc", "applyRoute", "動線の先へ動かしたシーンを作る");
          apply.title = tx("このシーンを写し、動線を引いた演者を行き先へ移したシーンを次に作ります");
          apply.disabled = !(scene.pieces || []).some((piece) => piece.route);
          apply.addEventListener("click", () => applyRoutes(scene));
          /* 逆向きの操作。次のシーンで動かしてあるものから動線を起こす。
             次のシーンが無ければ押せない（押しても何も起きない札を出さない）。 */
          const derive = document.createElement("button");
          derive.type = "button";
          derive.className = "btn-quiet stage-scene-apply";
          derive.textContent = tm("misc", "deriveRoute", "次のシーンとの差から動線を引く");
          derive.title = tx("次のシーンで動いているものに、いまの位置から行き先までの動線を引きます");
          const nextScene = nextSceneOf(scene);
          derive.disabled = !nextScene
            || (!movedPairs(scene, nextScene).length && !exitPieces(scene, nextScene).length);
          derive.addEventListener("click", () => deriveRoutes(scene));
          if (timing.childElementCount) body.append(timing);
          body.append(note, apply, derive);
          row.append(body);
        }
        els.sceneList.append(row);
      });
      linkSceneBars();
    }
    if (els.projectTitle && document.activeElement !== els.projectTitle) els.projectTitle.value = p.title;
    if (els.versionLabel && document.activeElement !== els.versionLabel) els.versionLabel.value = p.versionLabel;
    if (els.versionNote) {
      els.versionNote.textContent = p.parentVersionId
        ? (isEn() ? `${p.branchReason || "Duplicated as another version"} (derived from an earlier version)`
          : `${p.branchReason || "別バージョンとして複製"}（元の版から派生）`)
        : (isEn() ? "The first version of this show." : "このショーの最初の版です。");
    }
    const idx = cursorIndex();
    if (els.sceneDel) els.sceneDel.disabled = p.scenes.filter((x) => x.kind === "scene").length <= 1;
    if (els.sceneFoldAll) {
      const sections = p.scenes.filter((row) => row.kind === "section");
      const hasOpen = sections.some((section) => !state.closedSections[section.id]);
      els.sceneFoldAll.hidden = sections.length === 0;
      els.sceneFoldAll.textContent = tx(hasOpen ? "▸ 畳む" : "▾ 開く");
      els.sceneFoldAll.title = tx(hasOpen ? "セクションをすべて畳む" : "セクションをすべて開く");
    }
    renderSceneStudy();
    syncTabletSceneBar();
    syncPhoneViewer();
    /* 並べ替えと入れ子は、掴んで動かす方に一本化した。
     * 矢印のボタンは同じことを二通りに増やすだけなので置かない。 */
  }

  function stopSceneGridGeneration() {
    sceneGridGeneration += 1;
    if (sceneGridFrame) cancelAnimationFrame(sceneGridFrame);
    sceneGridFrame = 0;
  }

  /* 一枚を撮るあいだだけ場面と拡大を差し替える。途中で画像化に失敗しても、
   * いま編集している絵へ必ず戻す。 */
  function sceneGridThumbnail(scene, view) {
    const keepScene = state.project.activeSceneId;
    const keepFront = Object.assign({}, zoomState.front);
    const keepPlan = Object.assign({}, zoomState.plan);
    try {
      state.project.activeSceneId = scene.id;
      zoomState.front = { z: 1, ox: 0, oy: 0 };
      zoomState.plan = { z: 1, ox: 0, oy: 0 };
      const source = document.createElement("canvas");
      source.width = W;
      source.height = H;
      drawStage(source.getContext("2d"), false, view);
      const thumb = document.createElement("canvas");
      // カードをフェーダーで最大420pxまで広げられるため、拡大してもぼけない幅で撮る
      thumb.width = 480;
      thumb.height = Math.round((H / W) * thumb.width);
      thumb.getContext("2d").drawImage(source, 0, 0, thumb.width, thumb.height);
      return thumb.toDataURL("image/jpeg", 0.82);
    } finally {
      state.project.activeSceneId = keepScene;
      zoomState.front = keepFront;
      zoomState.plan = keepPlan;
    }
  }

  function renderSceneGrid() {
    if (!els.sceneGrid || !els.sceneGridModal || els.sceneGridModal.hidden) return;
    stopSceneGridGeneration();
    const generation = sceneGridGeneration;
    els.sceneGrid.innerHTML = "";
    if (els.sceneGridFront) els.sceneGridFront.setAttribute("aria-pressed", String(sceneGridView === "front"));
    if (els.sceneGridPlan) els.sceneGridPlan.setAttribute("aria-pressed", String(sceneGridView === "plan"));
    const numbers = sceneNumberMap(state.project.scenes);
    const jobs = [];

    state.project.scenes.forEach((scene, index) => {
      const numberText = numbers.get(scene.id) || String(index + 1);
      if (sceneHiddenIn(state.project.scenes, index)) return;
      if (scene.kind === "section") {
        const heading = document.createElement("h3");
        heading.className = "stage-scene-grid-section";
        heading.style.setProperty("--scene-indent", `${8 + scene.depth * 14}px`);
        heading.style.setProperty("--section-color", sectionColor(scene));
        const shut = Boolean(state.closedSections[scene.id]);
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "stage-scene-grid-section-button";
        toggle.setAttribute("aria-expanded", String(!shut));
        toggle.title = tx("押すと開閉します");
        const title = document.createElement("span");
        title.textContent = `${shut ? "▸" : "▾"} ${numberText} ${scene.title}`.trim();
        const totals = document.createElement("span");
        totals.className = "stage-scene-grid-section-total";
        totals.textContent = sectionSummary(sectionTotals(index), "grid");
        toggle.append(title, totals);
        toggle.addEventListener("click", () => {
          state.closedSections[scene.id] = !state.closedSections[scene.id];
          renderSceneGrid();
          renderScenes();
          persistSoon();
        });
        heading.append(toggle);
        els.sceneGrid.append(heading);
        return;
      }

      const card = document.createElement("button");
      card.type = "button";
      card.className = `stage-scene-grid-card${scene.id === state.project.activeSceneId ? " is-current" : ""}`;
      card.setAttribute("aria-label", isEn()
        ? `Open ${numberText} ${scene.title}, ${scene.pieces.length} placed`
        : `${numberText} ${scene.title}、配置 ${scene.pieces.length}、開く`);
      card.addEventListener("click", () => {
        openScene(scene.id);
        closeSceneGrid();
      });

      const picture = document.createElement("span");
      picture.className = "stage-scene-grid-thumb";
      const image = document.createElement("img");
      image.alt = "";
      image.hidden = true;
      picture.append(image);

      const caption = document.createElement("span");
      caption.className = "stage-scene-grid-caption";
      const title = document.createElement("strong");
      title.textContent = `${scene.studyBeatId || numberText} ${scene.title}`.trim();
      const count = document.createElement("span");
      count.textContent = isEn() ? `${scene.pieces.length} placed` : `配置 ${scene.pieces.length}`;
      caption.append(title, count);
      card.append(picture, caption);
      els.sceneGrid.append(card);

      const key = `${scene.id}:${sceneGridView}`;
      const cached = sceneGridThumbs.get(key);
      if (cached) {
        image.src = cached;
        image.hidden = false;
      } else {
        jobs.push({ scene, view: sceneGridView, key, image });
      }
    });

    let at = 0;
    const drawChunk = () => {
      if (generation !== sceneGridGeneration || els.sceneGridModal.hidden) return;
      const end = Math.min(at + 3, jobs.length);
      while (at < end) {
        const job = jobs[at];
        at += 1;
        try {
          const src = sceneGridThumbnail(job.scene, job.view);
          sceneGridThumbs.set(job.key, src);
          if (generation === sceneGridGeneration && job.image.isConnected) {
            job.image.src = src;
            job.image.hidden = false;
          }
        } catch (_) {
          // 一枚が画像化できなくても、空枠のまま残して次のシーンへ進む
        }
      }
      if (at < jobs.length) sceneGridFrame = requestAnimationFrame(drawChunk);
      else sceneGridFrame = 0;
    };
    if (jobs.length) sceneGridFrame = requestAnimationFrame(drawChunk);
  }

  // カードの列幅。プレゼン字幕サイズと同じく prefs に覚えさせる
  function applySceneGridSize() {
    const size = clamp(finite(prefs.sceneGridSize, 220), 150, 420);
    if (els.sceneGrid) els.sceneGrid.style.setProperty("--scene-grid-size", `${size}px`);
    if (els.sceneGridSize) els.sceneGridSize.value = String(size);
  }

  function openSceneGrid() {
    if (!els.sceneGridModal || !els.sceneGridBackdrop) return;
    sceneGridThumbs.clear();
    applySceneGridSize();
    els.sceneGridModal.hidden = false;
    els.sceneGridBackdrop.hidden = false;
    renderSceneGrid();
    if (els.sceneGridClose) els.sceneGridClose.focus();
  }

  function closeSceneGrid() {
    stopSceneGridGeneration();
    if (els.sceneGridModal) els.sceneGridModal.hidden = true;
    if (els.sceneGridBackdrop) els.sceneGridBackdrop.hidden = true;
  }

  function setSceneGridView(view) {
    const next = view === "plan" ? "plan" : "front";
    if (sceneGridView === next) return;
    sceneGridView = next;
    renderSceneGrid();
  }

  /* 行の名前をその場で書き換える。
   * 入力欄はボタンの外へ出す。ボタンの中へ入れると、押した先がボタンに
   * 吸われて文字を打てない（実際それで動かなかった）。 */
  /* 名前を変える小窓。場面にもセクションにも同じものを使う。 */
  let renameTarget = null;

  function openRename(scene) {
    if (!scene || !els.rename) return;
    renameTarget = scene;
    els.renameTitle.textContent = tx(scene.kind === "section" ? "セクションの名前と色" : "シーンの名前");
    els.renameInput.value = scene.title;
    if (els.renameColors) els.renameColors.hidden = scene.kind !== "section";
    if (els.renameSwatches) {
      els.renameSwatches.innerHTML = "";
      if (scene.kind === "section") {
        const choices = [{ color: null, label: "自動" },
          ...SECTION_COLORS.map((color, index) => ({ color, label: `色 ${index + 1}` }))];
        choices.forEach((choice) => {
          const swatch = document.createElement("button");
          swatch.type = "button";
          swatch.className = `stage-rename-swatch${choice.color === null ? " is-auto" : ""}`;
          swatch.setAttribute("aria-label", tx(choice.label));
          swatch.setAttribute("aria-pressed", String(choice.color === null
            ? scene.color === null : sectionColor(scene) === choice.color));
          if (choice.color === null) {
            swatch.textContent = tx("自動");
            swatch.title = tx("idから決まる既定の色に戻す");
          } else {
            swatch.style.backgroundColor = choice.color;
          }
          swatch.addEventListener("click", () => {
            if (!renameTarget || renameTarget.kind !== "section") return;
            checkpoint();
            renameTarget.color = choice.color;
            els.renameSwatches.querySelectorAll(".stage-rename-swatch").forEach((button) => {
              button.setAttribute("aria-pressed", String(button === swatch));
            });
            renderScenes();
            renderSceneGrid();
            persistSoon();
          });
          els.renameSwatches.append(swatch);
        });
      }
    }
    els.rename.hidden = false;
    els.renameBackdrop.hidden = false;
    els.renameInput.focus();
    els.renameInput.select();
  }

  function closeRename() {
    renameTarget = null;
    if (!els.rename) return;
    els.rename.hidden = true;
    els.renameBackdrop.hidden = true;
  }

  function commitRename() {
    if (!renameTarget) return;
    const next = els.renameInput.value.trim().slice(0, 40);
    if (next && next !== renameTarget.title) {
      checkpoint();
      renameTarget.title = next;
      renderScenes();
      persistSoon();
    }
    closeRename();
  }

  if (els.renameOk) els.renameOk.addEventListener("click", commitRename);
  if (els.renameClose) els.renameClose.addEventListener("click", closeRename);
  if (els.renameBackdrop) els.renameBackdrop.addEventListener("click", closeRename);
  if (els.renameInput) {
    els.renameInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); commitRename(); }
      if (e.key === "Escape") { e.preventDefault(); closeRename(); }
    });
  }

  /* ---------- 場面を掴んで並べ替える ----------
     写真の道具でレイヤーを入れ替えるのと同じ手つき。掴んだ行は指について動き、
     残りは滑って隙間を空ける。落とす場所は「どの行の間か」と「どの深さか」の
     二つで決まる。横へ引くと深さが変わり、セクションの中へ入る。 */

  let sceneDrag = null;

  function startSceneDrag(e, id, row) {
    if (e.button !== undefined && e.button > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        active = true;
        beginSceneDrag(id, row, ev);
      }
      ev.preventDefault();
      moveSceneDrag(ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (active) endSceneDrag();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function beginSceneDrag(id, row, ev) {
    const list = state.project.scenes;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    const rect = row.getBoundingClientRect();
    const hole = document.createElement("div");
    hole.className = "stage-scene-hole";
    hole.style.height = `${rect.height}px`;
    row.parentElement.insertBefore(hole, row);
    sceneDrag = {
      id, row, hole, index: i,
      block: 1 + sceneChildren(i).length,
      baseDepth: list[i].depth,
      dx: ev.clientX - rect.left,
      dy: ev.clientY - rect.top,
      startX: ev.clientX,
      before: snapshot(),
    };
    row.classList.add("is-dragging");
    row.style.width = `${rect.width}px`;
    row.style.position = "fixed";
    row.style.left = `${rect.left}px`;
    row.style.top = `${rect.top}px`;
    row.style.zIndex = "600";
    row.style.pointerEvents = "none";
    document.body.classList.add("is-panel-dragging");
  }

  function moveSceneDrag(ev) {
    if (!sceneDrag) return;
    const row = sceneDrag.row;
    row.style.left = `${ev.clientX - sceneDrag.dx}px`;
    row.style.top = `${ev.clientY - sceneDrag.dy}px`;

    const host = els.sceneList;
    if (!host) return;
    const kids = [...host.children].filter((el) => el !== row);
    let ref = null;
    for (let k = 0; k < kids.length; k += 1) {
      if (kids[k] === sceneDrag.hole) continue;
      const r = kids[k].getBoundingClientRect();
      if (ev.clientY < r.top + r.height / 2) { ref = kids[k]; break; }
    }
    if (sceneDrag.hole.nextElementSibling !== ref) {
      flipMove(() => host.insertBefore(sceneDrag.hole, ref), row);
    }
    // 横へ引いた量で深さを決める。セクションの中へ入れるための操作
    const step = Math.round((ev.clientX - sceneDrag.startX) / 22);
    const want = clamp(sceneDrag.baseDepth + step, 0, MAX_DEPTH);
    if (want !== sceneDrag.depth) {
      sceneDrag.depth = want;
      sceneDrag.hole.style.marginLeft = `${want * 14}px`;
    }
  }

  function endSceneDrag() {
    if (!sceneDrag) return;
    const { row, hole, id, block } = sceneDrag;
    const host = els.sceneList;
    // 落とした場所が、並びの何番目に当たるか
    // 掴んでいる行そのものは並びの数に入れない（浮いているだけで場所は取っていない）
    const order = [...host.children].filter((el) => (el.dataset.sceneId && el !== row) || el === hole);
    const at = order.indexOf(hole);
    hole.remove();
    row.classList.remove("is-dragging");
    ["position", "left", "top", "width", "zIndex", "pointerEvents"].forEach((k) => { row.style[k] = ""; });
    document.body.classList.remove("is-panel-dragging");

    const list = state.project.scenes;
    const from = list.findIndex((x) => x.id === id);
    if (from >= 0 && at >= 0) {
      recordBefore(sceneDrag.before);
      const moving = list.splice(from, block);
      // 見えている行の並びから、実際の差し込み位置を割り出す
      let target = list.length;
      let seen = 0;
      for (let k = 0; k < list.length; k += 1) {
        if (sceneHiddenIn(list, k)) continue;
        if (seen === at) { target = k; break; }
        seen += 1;
      }
      const diff = clamp(sceneDrag.depth === undefined ? sceneDrag.baseDepth : sceneDrag.depth, 0, MAX_DEPTH)
        - moving[0].depth;
      moving.forEach((m) => { m.depth = clamp(m.depth + diff, 0, MAX_DEPTH); });
      list.splice(target, 0, ...moving);
      tidySceneDepths();
      state.cursorRowId = id;
    }
    sceneDrag = null;
    renderScenes();
    persistSoon();
  }

  // 与えられた配列の上で「畳んだセクションの中か」を見る
  function sceneHiddenIn(list, index) {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (list[i].depth < list[index].depth) {
        if (list[i].kind === "section" && state.closedSections[list[i].id]) return true;
        return sceneHiddenIn(list, i);
      }
    }
    return false;
  }

  /* ---------- 場面転換の動き ----------
     前の場面で同じものが居た場所から、次の場面の場所へ動かして見せる。
     前の場面で動線を引いてあれば、その曲線に沿って動く（引いた線のとおりに動く）。
     保存されるのは行き先の値だけ。途中の位置は animU/animV に持ち、
     終わったら消す（途中で保存されても、絵の途中の位置は残らない）。 */
  let sceneAnim = null;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // 前の場面の同じもの。登録があればその札で、無ければ駒の札で照合する
  function twinOf(piece, pieces) {
    if (piece.castId) return pieces.find((p) => p.castId === piece.castId) || null;
    if (piece.setId) return pieces.find((p) => p.setId === piece.setId) || null;
    const mine = piece.originId || piece.id;
    return pieces.find((p) => (p.originId || p.id) === mine) || null;
  }

  function stopSceneAnim() {
    if (!sceneAnim) return;
    cancelAnimationFrame(sceneAnim.raf);
    sceneAnim.pieces.forEach((entry) => {
      delete entry.piece.animU;
      delete entry.piece.animV;
      delete entry.piece.animBeamU;
      delete entry.piece.animBeamV;
      delete entry.piece.animBase;
      delete entry.piece.animPose;
      delete entry.piece.animGlow;
    });
    // はけの駒は描くためだけの写しなので、捨てるだけでよい
    sceneAnim = null;
  }

  /* 動かすのは「次へ進むとき」だけ。前の場面へ戻るのは、作っている途中に
   * 見比べる動きなので、そのたびに動かれると邪魔になる（本人の指定）。 */
  function beginSceneAnim(fromScene) {
    stopSceneAnim();
    if (!state.animateScenes || !fromScene) return;
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    const wasAt = rows.findIndex((row) => row.id === fromScene.id);
    const nowAt = rows.findIndex((row) => row.id === state.project.activeSceneId);
    if (wasAt < 0 || nowAt < 0 || nowAt <= wasAt) return;
    const pieces = [];
    sc().pieces.forEach((piece) => {
      const twin = twinOf(piece, fromScene.pieces || []);
      if (!twin) return;
      const sameSpot = Math.abs(twin.u - piece.u) < 0.004 && Math.abs(twin.v - piece.v) < 0.004;
      const sameBeam = !(piece.type === "light" && piece.beam && twin.beam)
        || (Math.abs(twin.beam.u - piece.beam.u) < 0.004 && Math.abs(twin.beam.v - piece.beam.v) < 0.004);
      // 明かりは強さの変化もフェードで見せる（場所が同じでも動かす対象になる）
      const sameGlow = piece.type !== "light"
        || Math.abs(finite(twin.glow, 1) - finite(piece.glow, 1)) < 0.01;
      if (sameSpot && sameBeam && sameGlow) return;
      /* 動線があれば、その二次曲線をたどる。行き先が動線の終点と違っていても、
       * 曲がり方だけ借りて向かう（曲線の形は残しつつ、着地は次の場面の場所）。 */
      const route = twin.route;
      pieces.push({
        piece,
        from: { u: twin.u, v: twin.v },
        ctrl: route ? { u: route.bu, v: route.bv } : null,
        to: { u: piece.u, v: piece.v },
        // 出発地点の床からの高さ（前のシーンで台やポールに乗っていた分）
        startBase: piece.type === "performer" ? finite(twin.base, 0) : 0,
        /* 移動中は前のシーンの姿勢のまま。着いてから新しい姿勢へ切り替える
           （本人指定＝動きながら姿勢が変わると、どこで決めたのか読めない）。 */
        fromPose: piece.type === "performer" && twin.pose && twin.pose !== piece.pose
          ? twin.pose : null,
        // 明かりは灯体の側も動かす（当たる場所だけ動くと光が伸び縮みして見える）
        beam: piece.type === "light" && piece.beam && twin.beam
          ? { from: { u: twin.beam.u, v: twin.beam.v }, to: { u: piece.beam.u, v: piece.beam.v } }
          : null,
        // 前のシーンの強さ。違えばフェードで新しい強さへ
        glowFrom: piece.type === "light" ? finite(twin.glow, 1) : null,
      });
    });
    /* はける人。前のシーンには居て、このシーンには居ない演者は、
     * 消えるのではなく袖まで歩いて入る。シーンの駒ではないので、
     * 描くためだけの写しをこしらえ、舞台裏の立ち位置（backstageGhosts と
     * 同じ場所）まで動かす。着いた所には薄い「舞台裏」の駒が待っている。 */
    const exits = [];
    const ghosts = backstageGhosts();
    (fromScene.pieces || []).forEach((old) => {
      if (old.type !== "performer" || !old.castId) return;   // 登録の無い駒の消滅は「削除」なので歩かせない
      if (!onStageArea(old.u, old.v)) return;
      if (twinOf(old, sc().pieces)) return;
      const g = ghosts.find((x) => x.member.id === old.castId);
      const dest = g ? { u: g.u, v: g.v } : wingDest(old);
      const walker = normalizePiece(Object.assign({}, old, { id: `exit-${old.id}` }), 0);
      exits.push({
        piece: walker,
        from: { u: old.u, v: old.v },
        // 袖へのはけ動線が引いてあれば、その曲がり方を借りる
        ctrl: old.route ? { u: old.route.bu, v: old.route.bv } : null,
        to: dest,
        startBase: finite(old.base, 0),
        exit: true,   // 写しの駒は床（袖）で終わる。高さの計算に本体の base を使わない
        fromPose: "walk",   // はけは歩いて出る
      });
    });
    /* 入り。前のシーンに居なかった演者が、このシーンで舞台に居るなら、
       前のシーンでの舞台裏の立ち位置（袖）から歩いて入る。
       はけと対になる動き。駒はこのシーンに実在するので、写しではなく本物を動かす。
       正面図では枠の外から入ってくる間、onStageArea の決まりで自然に現れる。 */
    const ghostsBefore = backstageGhostsFor(fromScene);
    sc().pieces.forEach((piece) => {
      if (piece.type !== "performer" || !piece.castId) return;
      if (!onStageArea(piece.u, piece.v)) return;
      if (twinOf(piece, fromScene.pieces || [])) return;
      const g = ghostsBefore.find((x) => x.member.id === piece.castId);
      if (!g) return;   // 前のシーンに登録ごと無い＝その場に出現。歩かせようがない
      pieces.push({
        piece,
        from: { u: g.u, v: g.v },
        ctrl: null,
        to: { u: piece.u, v: piece.v },
        beam: null,
        startBase: 0,   // 袖は床
        fromPose: "walk",   // 入りは歩いて入る
      });
    });
    /* 明かりの点き消え。新しく点く明かりは0からフェードイン、
       消える明かりは写しをこしらえてフェードアウト（本人指定の「照明フェード」）。 */
    sc().pieces.forEach((piece) => {
      if (piece.type !== "light") return;
      if (twinOf(piece, fromScene.pieces || [])) return;
      pieces.push({ piece, from: { u: piece.u, v: piece.v }, ctrl: null,
        to: { u: piece.u, v: piece.v }, beam: null, glowFrom: 0 });
    });
    (fromScene.pieces || []).forEach((old_) => {
      if (old_.type !== "light") return;
      if (twinOf(old_, sc().pieces)) return;
      const ghost = normalizePiece(Object.assign({}, old_, { id: `lightout-${old_.id}` }), 0);
      exits.push({ piece: ghost, from: { u: old_.u, v: old_.v }, ctrl: null,
        to: { u: old_.u, v: old_.v }, exit: true,
        glowFrom: finite(old_.glow, 1), glowTo: 0 });
    });
    /* 暗転で始まるシーンへの転換は、動きが無くても暗転の幕だけは掛ける */
    const blackout = featureOn("blackout") && Boolean(sc().blackout);
    if (!pieces.length && !exits.length && !blackout) return;
    const movers = pieces.concat(exits);
    const span = clamp(finite(state.sceneAnimMs, 2000), 200, 3000);
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / span, 0, 1);
      const e = easeInOut(t);
      if (sceneAnim) sceneAnim.progress = e;
      movers.forEach((entry) => {
        const piece = entry.piece;
        // 道のりの補間（0..1）。曲がりがあれば二次曲線をたどる
        const along = (p2) => {
          const k = 1 - p2;
          if (entry.ctrl) {
            piece.animU = k * k * entry.from.u + 2 * k * p2 * entry.ctrl.u + p2 * p2 * entry.to.u;
            piece.animV = k * k * entry.from.v + 2 * k * p2 * entry.ctrl.v + p2 * p2 * entry.to.v;
          } else {
            piece.animU = entry.from.u + (entry.to.u - entry.from.u) * p2;
            piece.animV = entry.from.v + (entry.to.v - entry.from.v) * p2;
          }
        };
        /* 高さのある始点・終点（ポール・トラピーズ・椅子・台の上）は、
           降りる→床を歩く→着いてから登る、の三区間で動かす（本人の指定）。
           宙に浮いたまま水平に滑ると、実技としてありえない絵になるため。
           終点の高さは refreshBases が最終位置から出し続ける piece.base を読む。 */
        const sb = piece.type === "performer" ? (entry.startBase || 0) : 0;
        const eb = piece.type === "performer" && !entry.exit ? (piece.base || 0) : 0;
        if (sb > 0.05 || eb > 0.05) {
          const down = sb > 0.05 ? 0.25 : 0;
          const up = eb > 0.05 ? 0.3 : 0;
          const walkSpan = Math.max(0.05, 1 - down - up);
          if (t < down) {
            const p2 = easeInOut(t / down);
            piece.animU = entry.from.u;
            piece.animV = entry.from.v;
            piece.animBase = sb * (1 - p2);   // まず降りる（前の姿勢のまま）
            if (entry.fromPose) piece.animPose = entry.fromPose; else delete piece.animPose;
          } else if (t < down + walkSpan) {
            along(easeInOut((t - down) / walkSpan));
            piece.animBase = 0;
            piece.animPose = "walk";          // 床は歩く
          } else {
            const p2 = easeInOut((t - down - walkSpan) / (up || 1));
            piece.animU = entry.to.u;
            piece.animV = entry.to.v;
            piece.animBase = eb * p2;         // 着いてから登る（乗り物の姿勢で）
            delete piece.animPose;
          }
        } else {
          along(e);
          // 移動中は前のシーンの姿勢のまま。終わったら stopSceneAnim が消して新しい姿勢になる
          if (entry.fromPose) piece.animPose = entry.fromPose;
        }
        if (entry.beam) {
          piece.animBeamU = entry.beam.from.u + (entry.beam.to.u - entry.beam.from.u) * e;
          piece.animBeamV = entry.beam.from.v + (entry.beam.to.v - entry.beam.from.v) * e;
        }
        // 明かりの強さのフェード（点く=0から、消える=0へ、変化=前の値から）
        if (entry.glowFrom !== null && entry.glowFrom !== undefined) {
          const gt = entry.glowTo !== undefined ? entry.glowTo : finite(piece.glow, 1);
          piece.animGlow = entry.glowFrom + (gt - entry.glowFrom) * e;
        }
      });
      render();
      if (t < 1) { sceneAnim.raf = requestAnimationFrame(step); return; }
      stopSceneAnim();
      render();
    };
    sceneAnim = { pieces, exits, blackout, progress: 0, raf: requestAnimationFrame(step) };
  }

  /* ---------- ショー地図 ----------
     全シーンの平面を小さく並べて一枚で見渡す。押すとそのシーンへ移る。
     絵は簡略（舞台の枠＋駒の点だけ）。本物の描画を流用すると重いので、
     地図は地図のための軽い描き方を持つ。 */
  function drawMiniPlan(canvas, scene) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#171310";
    ctx.fillRect(0, 0, w, h);
    const size = venueSize();
    const ratio = (size.depth || 9) / (size.width || 12);
    let sw = w * 0.78;
    let sh = sw * ratio;
    if (sh > h * 0.82) { sh = h * 0.82; sw = sh / ratio; }
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;
    ctx.strokeStyle = "rgba(211,172,89,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sw, sh);
    const at = (u, v) => [sx + u * sw, sy + v * sh];
    (scene.pieces || []).forEach((piece) => {
      const [x, y] = at(clamp(piece.u, -0.18, 1.18), clamp(piece.v, -0.1, 1.05));
      if (piece.type === "performer") {
        ctx.fillStyle = piece.color;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (piece.type === "light") {
        ctx.strokeStyle = rgba(piece.color, 0.8);
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(piece.color, 0.85);
        ctx.fillRect(x - 3.5, y - 2.5, 7, 5);
      }
    });
  }

  /* ---------- 環境設定の窓 ---------- */
  function renderPrefs() {
    const host = els.prefsList;
    if (!host) return;
    host.innerHTML = "";
    FEATURES.forEach((f) => {
      const row = document.createElement(f.key === "presentCaption" ? "div" : "label");
      row.className = "stage-pref-row";
      const box = document.createElement("input");
      box.type = "checkbox";
      if (f.key === "presentCaption") box.id = "stage-pref-present-caption";
      box.checked = featureOn(f.key);
      const captionSizeInputs = [];
      box.addEventListener("change", () => {
        prefs[f.key] = box.checked;
        savePrefs();
        captionSizeInputs.forEach((radio) => { radio.disabled = !box.checked; });
        applyFeatureFlags();
        renderScenes();
        render();
        announce(box.checked ? `設定「${f.label}」をONにしました。` : `設定「${f.label}」をOFFにしました。`);
      });
      const body = document.createElement("span");
      const name = document.createElement(f.key === "presentCaption" ? "label" : "span");
      name.className = "stage-pref-name";
      if (f.key === "presentCaption") name.htmlFor = box.id;
      name.textContent = tx(f.label);
      const hint = document.createElement("p");
      hint.className = "stage-pref-hint";
      hint.textContent = tx(f.hint);
      body.append(name, hint);
      if (f.key === "presentCaption") {
        const sizeRow = document.createElement("span");
        sizeRow.className = "stage-pref-caption-size";
        const sizeTitle = document.createElement("span");
        sizeTitle.className = "stage-pref-caption-size-title";
        sizeTitle.textContent = tx("文字サイズ");
        sizeRow.append(sizeTitle);
        const currentSize = ["small", "medium", "large"].includes(prefs.presentCaptionSize)
          ? prefs.presentCaptionSize : "medium";
        [["small", "小"], ["medium", "中"], ["large", "大"]].forEach(([value, label]) => {
          const option = document.createElement("label");
          option.className = "stage-pref-caption-size-option";
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "stage-present-caption-size";
          radio.value = value;
          radio.checked = currentSize === value;
          radio.disabled = !box.checked;
          radio.addEventListener("change", () => {
            if (!radio.checked) return;
            prefs.presentCaptionSize = value;
            savePrefs();
            render();
          });
          captionSizeInputs.push(radio);
          option.append(radio, document.createTextNode(tx(label)));
          sizeRow.append(option);
        });
        body.append(sizeRow);
      }
      row.append(box, body);
      host.append(row);
    });
    FEATURES_PLANNED.forEach((label) => {
      const row = document.createElement("div");
      row.className = "stage-pref-row is-planned";
      const tag = document.createElement("span");
      tag.className = "stage-pref-tag";
      tag.textContent = tx("準備中");
      const name = document.createElement("span");
      name.className = "stage-pref-name";
      name.textContent = tx(label);
      row.append(tag, name);
      host.append(row);
    });
  }
  function openPrefs() {
    renderPrefs();
    if (els.prefsModal) els.prefsModal.hidden = false;
    if (els.prefsBackdrop) els.prefsBackdrop.hidden = false;
  }
  function closePrefs() {
    if (els.prefsModal) els.prefsModal.hidden = true;
    if (els.prefsBackdrop) els.prefsBackdrop.hidden = true;
  }

  function openAbout() {
    if (els.aboutModal) els.aboutModal.hidden = false;
    if (els.aboutBackdrop) els.aboutBackdrop.hidden = false;
  }

  function closeAbout() {
    if (els.aboutModal) els.aboutModal.hidden = true;
    if (els.aboutBackdrop) els.aboutBackdrop.hidden = true;
  }

  function openAboutFromPrefs() {
    closePrefs();
    openAbout();
  }
  // 機能の出し入れをボタンの表示へ反映する
  function applyFeatureFlags() {
    if (els.presentBtn) els.presentBtn.hidden = !featureOn("presentation");
    if (els.arrangeSelect) els.arrangeSelect.hidden = !featureOn("lineup");
    // 光の意図: カード・重ねのトグル・照らし合わせをまとめて出し入れする
    if (els.frontLightIntent) {
      const on = featureOn("lightIntent");
      const holder = els.frontLightIntent.closest("label");
      if (holder) holder.hidden = !on;
      if (!on && state.showLightIntent) {
        state.showLightIntent = false;
        els.frontLightIntent.checked = false;
      }
    }
    syncLightIntentCard();
    syncLightIntentDock();
    syncLightIntentCompare();
  }

  /* ---------- プレゼンモード ----------
     正面のキャンバスをそのまま全画面へ。矢印キーのシーン送りは
     いつもの割り当てが効き、Escで戻る（ブラウザの全画面をそのまま使う）。 */
  function enterPseudoPresentation() {
    pseudoPresenting = true;
    presenting = true;
    document.body.classList.add("stage-pseudo-present");
    if (els.presentOverlay) els.presentOverlay.setAttribute("aria-hidden", "false");
    syncCanvasResolution();
    render();
    announce("プレゼンモードです。左右のタップでシーン送り、✕で戻ります。");
  }

  function exitPseudoPresentation() {
    pseudoPresenting = false;
    presenting = false;
    document.body.classList.remove("stage-pseudo-present");
    if (els.presentOverlay) els.presentOverlay.setAttribute("aria-hidden", "true");
    syncCanvasResolution();
    render();
    announce("プレゼンを終えました。");
  }

  function startPresentation() {
    const cv = canvas;
    if (!cv || !cv.requestFullscreen) {
      enterPseudoPresentation();
      return;
    }
    cv.requestFullscreen().then(() => {
      cv.focus();
      announce("プレゼンモードです。矢印キーでシーン送り、Escで戻ります。");
    }).catch(() => {
      announce("この環境では全画面にできませんでした。");
      enterPseudoPresentation();
    });
  }

  /* 大きな表示では内部解像度も追従させ、線や文字の粗さを抑える。
     論理座標は変えず、過大な描画負荷を避けるため3倍を上限とする。 */
  const BACKING_MAX_SCALE = 3;
  function syncCanvasResolution() {
    let changed = false;
    for (const el of [canvas, planCanvas]) {
      if (!el) continue;
      const cssW = el.getBoundingClientRect().width;
      if (!cssW) continue;
      const want = Math.min(BACKING_MAX_SCALE, Math.max(1, (cssW * (window.devicePixelRatio || 1)) / W));
      const cur = el.width / W;
      if (Math.abs(want - cur) > 0.15) {
        el.width = Math.round(W * want);
        el.height = Math.round(H * want);
        changed = true;
      }
    }
    if (changed) render();
  }
  const canvasResObserver = new ResizeObserver(() => syncCanvasResolution());
  canvasResObserver.observe(canvas);
  if (planCanvas) canvasResObserver.observe(planCanvas);
  window.addEventListener("resize", syncCanvasResolution);
  /* ResizeObserverの初回通知は環境により来ないことがある（実際に来ない環境を確認済み）。
     読み込み直後の一度は自分で合わせる */
  requestAnimationFrame(syncCanvasResolution);

  /* 全画面かどうか。プレゼン中だけ、シーンの説明を絵の中へ描く。
     入るときも出るときも描き直しがいる（出たあと字が残らないように）。 */
  document.addEventListener("fullscreenchange", () => {
    if (pseudoPresenting) return;
    const now = document.fullscreenElement === canvas;
    if (now === presenting) return;
    presenting = now;
    syncCanvasResolution();
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (!pseudoPresenting) return;
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    exitPseudoPresentation();
  });

  /* ---------- 整列（舞台上の演者全員） ----------
     ★いまの位置関係をなるべく保つ（本人指定）。誰がどこへ行くかが
       席替えのように入れ替わると、並べた瞬間に配置の意味が壊れるため。
       一列とV字は左右の順、円はいまの重心から見た角度の順をそのまま使う。 */
  function lineupPerformers(shape) {
    const people = (sc().pieces || []).filter((piece) =>
      piece.type === "performer" && onStageArea(piece.u, piece.v));
    if (people.length < 2) { announce("並べ替える演者が足りません（舞台上に2人以上）。"); return; }
    checkpoint();
    const n = people.length;
    if (shape === "row") {
      // 左右の順を保ち、奥行きはいまの平均へ
      const ordered = people.slice().sort((a, b) => a.u - b.u);
      const v = ordered.reduce((t, piece) => t + piece.v, 0) / n;
      ordered.forEach((piece, i) => {
        piece.u = n === 1 ? 0.5 : 0.15 + (0.7 * i) / (n - 1);
        piece.v = clamp(v, 0.1, 0.95);
      });
      announce("舞台上の演者を等間隔の一列に並べました。");
    } else if (shape === "circle") {
      /* いまの重心から見た角度の順で、等間隔の円に置き直す。
         始まりの角度も一人目のいまの角度に合わせるので、全員が「近くの席」へ入る */
      const cu = people.reduce((t, piece) => t + piece.u, 0) / n;
      const cv2 = people.reduce((t, piece) => t + piece.v, 0) / n;
      const ordered = people.slice().sort((a, b) =>
        Math.atan2(a.v - cv2, a.u - cu) - Math.atan2(b.v - cv2, b.u - cu));
      const startA = Math.atan2(ordered[0].v - cv2, ordered[0].u - cu);
      const r = Math.min(0.3, 0.1 + n * 0.03);
      ordered.forEach((piece, i) => {
        const a = startA + (Math.PI * 2 * i) / n;
        piece.u = clamp(0.5 + Math.cos(a) * r, 0.05, 0.95);
        piece.v = clamp(0.5 + Math.sin(a) * r * 0.8, 0.08, 0.95);
      });
      announce("舞台上の演者を円に並べました。");
    } else {
      // V字。左右の順のまま、左側の人は左の腕へ・真ん中の人が頂点へ
      const ordered = people.slice().sort((a, b) => a.u - b.u);
      const mid = (n - 1) / 2;
      ordered.forEach((piece, i) => {
        const off = i - mid;
        piece.u = clamp(0.5 + off * 0.09, 0.05, 0.95);
        piece.v = clamp(0.35 + Math.abs(off) * 0.1, 0.08, 0.95);
      });
      announce("舞台上の演者をV字に並べました。");
    }
    render();
    persistSoon();
  }

  /* ---------- 転換の忙しさ ---------- */
  function transitionStats(prev, row) {
    const size = venueSize();
    let dist = 0;
    let movers = 0;
    let inout = 0;
    (row.pieces || []).forEach((piece) => {
      if (piece.type === "light") return;
      const twin = twinOf(piece, prev.pieces || []);
      if (!twin) {
        if (piece.type === "performer" && piece.castId) inout += 1;
        return;
      }
      const d = Math.hypot((piece.u - twin.u) * (size.width || 12), (piece.v - twin.v) * (size.depth || 9));
      if (d >= 0.25) { movers += 1; dist += d; }
    });
    (prev.pieces || []).forEach((old_) => {
      if (old_.type === "performer" && old_.castId && !twinOf(old_, row.pieces || [])) inout += 1;
    });
    return { dist, movers, inout };
  }

  /* ---------- 印刷用ページ ----------
     全シーンの正面と平面を一枚ずつ並べた、印刷のためのページを別タブに開く。
     ブラウザの「印刷」からPDFにして、稽古場へ紙で持っていける。
     絵は本物の描画（drawStage）を場面ごとに退避・切替して撮る。 */
  function openPrintPage() {
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    if (!rows.length) { announce("印刷するシーンがありません。"); return; }
    const keepScene = state.project.activeSceneId;
    const keepFront = Object.assign({}, zoomState.front);
    const keepPlan = Object.assign({}, zoomState.plan);
    zoomState.front = { z: 1, ox: 0, oy: 0 };
    zoomState.plan = { z: 1, ox: 0, oy: 0 };
    const fc = document.createElement("canvas"); fc.width = W; fc.height = H;
    const pc = document.createElement("canvas"); pc.width = W; pc.height = H;
    const fctx = fc.getContext("2d");
    const pctx = pc.getContext("2d");
    const en = isEn();
    const parts = [];
    // セクション見出しも順番どおりに差し込む
    let sceneN = 0;
    (state.project.scenes || []).forEach((row) => {
      if (row.kind === "section") {
        parts.push(`<h2 class="section">${escapeHtml(row.title || "")}</h2>`);
        return;
      }
      sceneN += 1;
      state.project.activeSceneId = row.id;
      drawStage(fctx, false, "front");
      drawStage(pctx, false, "plan");
      const cast = (row.pieces || []).filter((q) => q.type === "performer")
        .map((q) => pieceLabel(q)).filter(Boolean);
      const rh = row.rehearsal || {};
      const times = [];
      if (featureOn("sceneTiming")) {
        if (finite(rh.holdDurationSeconds, -1) >= 0) times.push(en ? `show ${rh.holdDurationSeconds}s` : `見せる ${rh.holdDurationSeconds}秒`);
        if (finite(rh.transitionToNextSeconds, -1) >= 0) times.push(en ? `move ${rh.transitionToNextSeconds}s` : `次へ移動 ${rh.transitionToNextSeconds}秒`);
      }
      parts.push(`<section class="scene">
  <header><span class="no">${sceneN}</span><h3>${escapeHtml(row.title || "")}</h3>
    <span class="times">${escapeHtml(times.join(" / "))}</span></header>
  ${row.note ? `<p class="desc"><span class="desc-label">${en ? "Scene description" : "シーンの説明"}</span>${escapeHtml(row.note)}</p>` : ""}
  <div class="pics">
    <img class="front" src="${fc.toDataURL("image/jpeg", 0.85)}" alt="">
    <img class="plan" src="${pc.toDataURL("image/jpeg", 0.85)}" alt="">
  </div>
  <div class="meta">
    ${cast.length ? `<p class="cast">${en ? "On stage" : "舞台上"}: ${escapeHtml(cast.join(" / "))}</p>` : ""}
    ${bamiriTable(row)}
  </div>
</section>`);
    });
    /* バミリ図: 立ち位置の実寸表。床にテープを貼る作業へそのまま持っていける */
    function bamiriTable(row) {
      if (!featureOn("bamiri")) return "";
      const size = venueSize();
      const people = (row.pieces || []).filter((q) => q.type === "performer" && onStageArea(q.u, q.v));
      if (!people.length) return "";
      const cells = people.map((q) => {
        const off = (q.u - 0.5) * (size.width || 12);
        const side = Math.abs(off) < 0.15
          ? (en ? "centre" : "中央")
          : (en
            ? `${Math.abs(off).toFixed(1)}m ${off > 0 ? "SL" : "SR"}`
            : `${off > 0 ? "上手" : "下手"}${Math.abs(off).toFixed(1)}m`);
        const front = ((1 - q.v) * (size.depth || 9)).toFixed(1);
        return `<tr><td>${escapeHtml(pieceLabel(q) || "?")}</td><td>${escapeHtml(side)}</td><td>${front}m</td></tr>`;
      }).join("");
      return `<table class="bamiri"><thead><tr><th>${en ? "Who" : "誰"}</th><th>${en ? "Across" : "左右"}</th><th>${en ? "From DS edge" : "ツラから"}</th></tr></thead><tbody>${cells}</tbody></table>`;
    }

    /* 明かりのキューシート: シーンごとの点き・消え・強さの変化 */
    let cuesheetHtml = "";
    if (featureOn("cuesheet")) {
      const sceneRows = state.project.scenes.filter((r2) => r2.kind === "scene");
      const lines = [];
      sceneRows.forEach((row, i2) => {
        const prev = i2 > 0 ? sceneRows[i2 - 1] : { pieces: [] };
        const cur = (row.pieces || []).filter((q) => q.type === "light");
        const before = (prev.pieces || []).filter((q) => q.type === "light");
        const on = cur.filter((q) => !twinOf(q, before)).map((q) => pieceLabel(q));
        const off = before.filter((q) => !twinOf(q, cur)).map((q) => pieceLabel(q));
        const changed = cur.map((q) => {
          const twin = twinOf(q, before);
          if (!twin) return null;
          const a = finite(twin.glow, 1);
          const b2 = finite(q.glow, 1);
          if (Math.abs(a - b2) < 0.01) return null;
          return `${pieceLabel(q)} ${Math.round(a * 100)}→${Math.round(b2 * 100)}%`;
        }).filter(Boolean);
        if (!on.length && !off.length && !changed.length) return;
        lines.push(`<tr><td>${i2 + 1} ${escapeHtml(row.title || "")}</td><td>${escapeHtml(on.join(" / "))}</td><td>${escapeHtml(off.join(" / "))}</td><td>${escapeHtml(changed.join(" / "))}</td></tr>`);
      });
      if (lines.length) {
        cuesheetHtml = `<section class="scene"><header><h3>${en ? "Light cue sheet" : "明かりのキューシート"}</h3></header>
<table class="cues"><thead><tr><th>${en ? "Scene" : "シーン"}</th><th>${en ? "On" : "点く"}</th><th>${en ? "Off" : "消える"}</th><th>${en ? "Level" : "強さ"}</th></tr></thead><tbody>${lines.join("")}</tbody></table></section>`;
      }
    }

    state.project.activeSceneId = keepScene;
    zoomState.front = keepFront;
    zoomState.plan = keepPlan;
    render();
    const title = escapeHtml(state.project.title || "");
    const html = `<!DOCTYPE html><html lang="${en ? "en" : "ja"}"><head><meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: 'Hiragino Kaku Gothic ProN', sans-serif; color: #1c1a17; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .stamp { color: #777; font-size: 12px; margin: 0 0 18px; }
  .print-toggle { font-size: 12px; color: #555; margin: 0 0 14px; }
  h2.section { font-size: 15px; letter-spacing: 0.1em; border-bottom: 1px solid #999; padding-bottom: 4px; margin: 26px 0 10px; page-break-after: avoid; }
  .scene { page-break-inside: avoid; margin: 0 0 26px; }
  .scene header { display: flex; align-items: baseline; gap: 10px; border-bottom: 2px solid #1c1a17; padding-bottom: 4px; margin-bottom: 8px; }
  .scene .no { font-size: 18px; font-weight: bold; }
  .scene h3 { font-size: 16px; margin: 0; flex: 1; }
  .scene .times { font-size: 12px; color: #555; }
  .pics { display: flex; gap: 10px; }
  .pics img { display: block; border: 1px solid #ccc; }
  .pics .front { width: 58%; height: auto; }
  .pics .plan { width: 40%; height: auto; }
  body.two-up .pics .front { width: 44%; }
  body.two-up .pics .plan { width: 30%; }
  .meta { margin-top: 6px; }
  /* シーンの説明は絵の前に置く。何が起きる場面かを読んでから図を見る順番になる */
  .desc { font-size: 13px; line-height: 1.6; margin: 0 0 8px; white-space: pre-wrap; }
  .desc-label { display: inline-block; font-size: 10px; letter-spacing: 0.08em; color: #666;
                border: 1px solid #bbb; border-radius: 2px; padding: 1px 5px; margin-right: 8px;
                vertical-align: 1px; white-space: nowrap; }
  .cast { font-size: 12px; color: #555; margin: 0; }
  table.bamiri, table.cues { border-collapse: collapse; font-size: 11px; margin-top: 6px; }
  table.bamiri th, table.bamiri td, table.cues th, table.cues td {
    border: 1px solid #bbb; padding: 2px 8px; text-align: left; }
  table.bamiri th, table.cues th { background: #eee; }
  @media print {
    body { margin: 10mm; }
    .print-toggle { display: none; }
    .scene { page-break-after: always; margin-bottom: 0; }
    .scene:last-of-type { page-break-after: auto; }
    body.two-up .scene { page-break-after: auto; }
    body.two-up .scene.pb { page-break-after: always; }
  }
</style></head><body>
<h1>${title}</h1>
<p class="stamp">${escapeHtml(state.project.versionLabel || "v1")} · ${new Date().toLocaleDateString(en ? "en-US" : "ja-JP")} · ${en ? "Stage Sketch print sheet" : "舞台スケッチ 印刷用"}</p>
<div class="print-toggle">
  <label><input type="radio" name="print-layout" value="1" checked> ${en ? "1 scene / page" : "1シーン/ページ"}</label>
  <label><input type="radio" name="print-layout" value="2"> ${en ? "2 scenes / page" : "2シーン/ページ"}</label>
</div>
${parts.join("\n")}
${cuesheetHtml}
<script>
(function () {
  var radios = document.querySelectorAll('.print-toggle input[type="radio"]');
  function applyPrintLayout() {
    var selected = document.querySelector('.print-toggle input[type="radio"]:checked');
    var twoUp = selected && selected.value === '2';
    document.body.classList.toggle('two-up', twoUp);
    var scenes = document.querySelectorAll('section.scene');
    scenes.forEach(function (scene, index) {
      scene.classList.toggle('pb', twoUp && (index + 1) % 2 === 0);
    });
  }
  radios.forEach(function (radio) {
    radio.addEventListener('change', applyPrintLayout);
  });
  applyPrintLayout();
})();
</script>
</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const win = window.open(url, "_blank");
    if (!win) {
      announce("印刷用ページを開けませんでした。ポップアップの許可を確認してください。");
      return;
    }
    announce("印刷用ページを開きました。ブラウザの印刷からPDFにできます。");
  }

  function openShowMap() {
    const grid = els.mapGrid;
    if (!grid) return;
    grid.innerHTML = "";
    (state.project.scenes || []).forEach((row) => {
      if (row.kind === "section") {
        const head = document.createElement("p");
        head.className = "stage-map-section";
        head.textContent = row.title || "";
        grid.append(head);
        return;
      }
      const rows = state.project.scenes.filter((r) => r.kind === "scene");
      const n = rows.indexOf(row) + 1;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `stage-map-cell${row.id === state.project.activeSceneId ? " is-current" : ""}`;
      const cv = document.createElement("canvas");
      cv.width = 220;
      cv.height = 128;
      drawMiniPlan(cv, row);
      const title = document.createElement("p");
      title.className = "stage-map-title";
      title.textContent = `${n} ${row.title || ""}`;
      const meta = document.createElement("p");
      meta.className = "stage-map-meta";
      const cast = (row.pieces || []).filter((p) => p.type === "performer").length;
      const lights = (row.pieces || []).filter((p) => p.type === "light").length;
      meta.textContent = isEn() ? `${cast} on stage · ${lights} lights` : `舞台上${cast}人 · 明かり${lights}`;
      cell.append(cv, title, meta);
      /* 転換の忙しさ。前のシーンからこのシーンへ移るときの、
         移動量・動く数・出入りの数。多い転換ほど稽古で崩れやすい */
      if (featureOn("busyness")) {
        const at = rows.indexOf(row);
        if (at > 0) {
          const st2 = transitionStats(rows[at - 1], row);
          const busy = document.createElement("p");
          busy.className = "stage-map-meta";
          const heavy = st2.movers + st2.inout >= 6 || st2.dist >= 25;
          if (heavy) busy.style.color = "#d3844a";
          busy.textContent = isEn()
            ? `Change: ${st2.dist.toFixed(0)}m · ${st2.movers} move · ${st2.inout} in/out${heavy ? " ⚠" : ""}`
            : `転換: ${st2.dist.toFixed(0)}m・動く${st2.movers}・出入り${st2.inout}${heavy ? " ⚠" : ""}`;
          cell.append(busy);
        }
      }
      cell.addEventListener("click", () => {
        closeShowMap();
        openScene(row.id);
      });
      grid.append(cell);
    });
    if (els.mapModal) els.mapModal.hidden = false;
    if (els.mapBackdrop) els.mapBackdrop.hidden = false;
  }

  function closeShowMap() {
    if (els.mapModal) els.mapModal.hidden = true;
    if (els.mapBackdrop) els.mapBackdrop.hidden = true;
  }

  // 場面を前後へ送る。上下キーの割り当て先でもある
  function stepScene(dir) {
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    if (rows.length < 2) { announce("シーンがひとつしかありません。"); return; }
    const at = rows.findIndex((row) => row.id === state.project.activeSceneId);
    const next = rows[clamp((at < 0 ? 0 : at) + dir, 0, rows.length - 1)];
    if (!next || next.id === state.project.activeSceneId) {
      announce(dir > 0 ? "最後のシーンです。" : "最初のシーンです。");
      return;
    }
    openScene(next.id);
  }

  function openScene(id) {
    closeNoteEditor();
    selectedNoteId = null;
    state.cursorRowId = id;
    if (state.project.activeSceneId === id) { renderScenes(); return; }
    const before = sc();
    state.project.activeSceneId = id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    renderBeatTemplates();
    selectedTextId = null;
    renderScreenTexts();
    syncScreenTextControls();
    updateInspector();
    render();
    beginSceneAnim(before);
    persistSoon();
    announce(`${sc().title}を開きました。`);
  }

  function addScene(carryRig) {
    checkpoint();
    const p = state.project;
    const carried = carryRig ? currentRigPieces().map(copyPiece) : [];
    const i = cursorIndex();
    // セクションを起点にしたときは、その中身として一段内側へ入れる
    const depth = i >= 0 ? p.scenes[i].depth + (p.scenes[i].kind === "section" ? 1 : 0) : 0;
    const count = p.scenes.filter((x) => x.kind === "scene").length;
    const scene = newScene(sceneTitle(count + 1), false, "scene", depth);
    scene.background = sc().background;      // 劇場は変えず、いまの背景色だけ引き継ぐ
    carried.forEach((piece) => scene.pieces.push(piece));
    // いまの行（とその中身）のすぐ後ろへ入れる
    const at = i >= 0 ? i + 1 + sceneChildren(i).length : p.scenes.length;
    p.scenes.splice(at, 0, scene);
    p.activeSceneId = scene.id;
    state.cursorRowId = scene.id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    selectedTextId = null;
    renderScreenTexts();
    syncScreenTextControls();
    updateInspector();
    render();
    persistSoon();
    announce(`${scene.title}を足しました。`);
  }

  /* セクションを足す。いまの行のすぐ後ろへ、同じ深さで入れる。
   * 入れ物だけなので絵は持たず、押すと開閉する。 */
  function addSection() {
    checkpoint();
    const p = state.project;
    const i = cursorIndex();
    const depth = i >= 0 ? p.scenes[i].depth : 0;
    const count = p.scenes.filter((x) => x.kind === "section").length;
    const section = newScene(isEn() ? `Section ${count + 1}` : `セクション ${count + 1}`, false, "section", depth);
    const at = i >= 0 ? i + 1 + sceneChildren(i).length : p.scenes.length;
    p.scenes.splice(at, 0, section);
    state.cursorRowId = section.id;
    renderScenes();
    persistSoon();
    announce(`${section.title}を足しました。下のシーンを一段内側へ入れると、中身になります。`);
  }

  // セクションを起点にしたときは、中身ごと複製する
  /* 場面をまるごと写す。駒には新しい札を配り、
   * 付箋が指している駒の札も新しい方へ付け替える（付け替えないと写した瞬間に紐が切れる）。 */
  function cloneScene(row) {
    const copy = JSON.parse(JSON.stringify(row));
    copy.id = rid(row.kind === "section" ? "sect" : "scene");
    const swap = new Map();
    copy.pieces = (copy.pieces || []).map((piece) => {
      const id = nextId();
      swap.set(piece.id, id);
      return { ...piece, id, originId: piece.originId || piece.id };
    });
    copy.notes = (copy.notes || []).map((note) => ({
      ...note,
      id: rid("note"),
      pieceId: note.pieceId ? (swap.get(note.pieceId) || null) : null,
    }));
    copy.arrows = (copy.arrows || []).map((arrow) => ({ ...arrow, id: rid("arrow") }));
    return copy;
  }

  /* 動線の先へ演者を動かした場面を、この場面の次に作る。
   * 「引いた線のとおりに動いた後」を確かめるのが動線を引く目的なので、
   * 手で置き直させない。写した先では動線は消える（もう済んだ動きなので）。 */
  /* ---------- 次のシーンから動線を起こす ----------
     applyRoutes（動線 → 次のシーン）のちょうど逆。
     先に次のシーンを作ってから並べ替えることの方が多いので、
     「もう動かしてある差」から動線を引き直せると、置き直す手間が要らない。
     同じものが次のシーンでどれかは twinOf で照合する（登録の札→写しの元）。 */

  // シーンの並びの中で、その次のシーン。セクションの行は飛ばす
  function nextSceneOf(scene) {
    const rows = state.project.scenes.filter((row) => row.kind === "scene");
    const at = rows.indexOf(scene);
    return at >= 0 && at + 1 < rows.length ? rows[at + 1] : null;
  }

  /* これ未満しか動いていないものは、動線を引かない。
     立ち位置の微調整まで矢印になると、平面図が線だらけで読めなくなる。 */
  const ROUTE_MIN_M = 0.25;

  /* 次のシーンに居ない演者。舞台上に居て、向こうでは舞台裏＝はける人。
     装置は対象にしない（装置は「消える」のが転換として普通のため）。 */
  function exitPieces(scene, next) {
    return (scene.pieces || []).filter((piece) => piece.type === "performer"
      && onStageArea(piece.u, piece.v)
      && !twinOf(piece, next.pieces || []));
  }

  // はけ先。近い側の袖の中ほど（スラストは奥の袖）
  function wingDest(piece) {
    const b = planBounds();
    if (b.vMin < 0) return { u: clamp(piece.u, 0.06, 0.94), v: b.vMin * 0.6 };
    return {
      u: piece.u <= 0.5 ? b.uMin * 0.6 : 1 + (b.uMax - 1) * 0.6,
      v: clamp(piece.v, 0.08, 0.92),
    };
  }

  function movedPairs(scene, next) {
    const size = venueSize();
    const out = [];
    (scene.pieces || []).forEach((piece) => {
      const twin = twinOf(piece, next.pieces || []);
      if (!twin) return;
      const dx = (twin.u - piece.u) * (size.width || 12);
      const dz = (twin.v - piece.v) * (size.depth || 9);
      if (Math.hypot(dx, dz) < ROUTE_MIN_M) return;
      out.push({ piece, twin });
    });
    return out;
  }

  function deriveRoutes(scene) {
    const next = nextSceneOf(scene);
    if (!next) { announce("次のシーンがありません。"); return; }
    const pairs = movedPairs(scene, next);
    const exits = exitPieces(scene, next).filter((piece) => !piece.route);
    // すでに引いてある動線は残す。手で曲げた線を黙って捨てない
    const fresh = pairs.filter((pair) => !pair.piece.route);
    const kept = pairs.length - fresh.length;
    if (!fresh.length && !exits.length) {
      announce(kept
        ? "動いたものには、すでに動線が引いてあります。"
        : "次のシーンとの差がありません。向こうで動かしてから引いてください。");
      return;
    }
    checkpoint();
    fresh.forEach(({ piece, twin }) => {
      /* 曲がりの制御点は、いまと行き先のちょうど中間。まっすぐな線になる。
         曲げたいときは、平面図で真ん中の丸を掴んで引く。 */
      piece.route = {
        u: clamp(twin.u, -0.5, 1.5),
        v: clamp(twin.v, -0.5, 1),
        bu: (piece.u + twin.u) / 2,
        bv: (piece.v + twin.v) / 2,
      };
    });
    // 次のシーンで舞台裏の人は、近い側の袖へはける動線にする
    exits.forEach((piece) => {
      const dest = wingDest(piece);
      piece.route = { u: dest.u, v: dest.v,
        bu: (piece.u + dest.u) / 2, bv: (piece.v + dest.v) / 2 };
    });
    // 隠したまま引くと「押したのに何も起きない」に見えるので、表示に戻す
    if (!(state.showRoutesCast && state.showRoutesLight && state.showRoutesSet)) {
      state.showRoutesCast = true;
      state.showRoutesLight = true;
      state.showRoutesSet = true;
      if (els.planRoutesCast) els.planRoutesCast.checked = true;
      if (els.planRoutesLight) els.planRoutesLight.checked = true;
      if (els.planRoutesSet) els.planRoutesSet.checked = true;
    }
    renderScenes();
    updateInspector();
    render();
    persistSoon();
    const total = fresh.length + exits.length;
    announce(exits.length
      ? `${total}本の動線を引きました。${exits.length}本は袖へのはけです。`
      : (kept
        ? `${total}本の動線を引きました。${kept}本はすでにあるので残しました。`
        : `${total}本の動線を引きました。`));
  }

  function applyRoutes(scene) {
    const p = state.project;
    const i = p.scenes.indexOf(scene);
    if (i < 0) return;
    if (!(scene.pieces || []).some((piece) => piece.route)) {
      announce("このシーンには動線がありません。平面図で行き先を引いてください。");
      return;
    }
    checkpoint();
    const copy = cloneScene(scene);
    copy.title = `${scene.title} の続き`;
    copy.note = "";
    let moved = 0;
    copy.pieces.forEach((piece) => {
      if (!piece.route) return;
      /* 動かすのは駒の居場所だけ。明かりの場合、これは「当てる先」であって
       * 灯体（beam.u/v）ではない。灯体はその場に残り、光が振られる。 */
      piece.u = clamp(piece.route.u, -0.5, 1.5);   // 袖へはける動線もそのまま実る
      piece.v = clamp(piece.route.v, -0.5, 1);
      piece.route = null;
      moved += 1;
    });
    p.scenes.splice(i + 1, 0, copy);
    p.activeSceneId = copy.id;
    state.cursorRowId = copy.id;
    selectedId = null;
    selectedNoteId = null;
    closeNoteEditor();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    selectedTextId = null;
    renderScreenTexts();
    syncScreenTextControls();
    updateInspector();
    render();
    persistSoon();
    announce(`${moved}名（点）を動線の先へ動かしたシーンを作りました。`);
  }

  function duplicateScene() {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    checkpoint();
    const cur = p.scenes[i];
    const block = [cur].concat(sceneChildren(i));
    const copies = block.map((row) => cloneScene(row));
    copies[0].title = `${cur.title} の複製`;
    p.scenes.splice(i + block.length, 0, ...copies);
    const firstScene = copies.find((x) => x.kind === "scene");
    if (firstScene) p.activeSceneId = firstScene.id;
    state.cursorRowId = copies[0].id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    selectedTextId = null;
    renderScreenTexts();
    syncScreenTextControls();
    updateInspector();
    render();
    persistSoon();
    announce(`${cur.title}を複製しました。前のシーンから少しずつ動かすときに使えます。`);
  }


  // セクションを消すときは、中に入れた場面ごと消える
  function deleteScene() {
    const p = state.project;
    const i = cursorIndex();
    if (i < 0) return;
    const cur = p.scenes[i];
    const kids = sceneChildren(i);
    const kidScenes = kids.filter((x) => x.kind === "scene").length;
    if (p.scenes.filter((x) => x.kind === "scene").length - 1 - kidScenes < 1) return;
    const warn = kids.length
      ? `「${cur.title}」を、中に入れた${kids.length}件ごと削除します。置いたものと塗りは戻せません。`
      : `「${cur.title}」を削除します。このシーンに置いたものと塗りは戻せません。`;
    if (!window.confirm(warn)) return;
    checkpoint();
    p.scenes.splice(i, 1 + kids.length);
    const nextScene = p.scenes.slice(i).find((x) => x.kind === "scene")
      || p.scenes.slice(0, i).reverse().find((x) => x.kind === "scene");
    p.activeSceneId = nextScene.id;
    state.cursorRowId = nextScene.id;
    selectedId = null;
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    selectedTextId = null;
    renderScreenTexts();
    syncScreenTextControls();
    updateInspector();
    render();
    persistSoon();
    announce(`${cur.title}を削除しました。`);
  }

  // バージョン複製: いまのプロジェクトを丸ごと写し、別の版として続ける。
  // 設計計画書6.5節の派生（親ID＋一行の理由）に合わせ、完全な版管理は作らない。
  function duplicateVersion() {
    const reason = window.prompt(
      "別バージョンとして複製します。何を変えるための版か、一行で残してください。",
      "");
    if (reason === null) return;
    checkpoint();
    const p = state.project;
    const copy = JSON.parse(JSON.stringify(p));
    copy.id = rid("proj");
    copy.parentVersionId = p.id;
    copy.branchReason = reason.trim();
    copy.createdAt = nowIso();
    copy.versionLabel = nextVersionLabel(p.versionLabel);
    copy.scenes = copy.scenes.map((scene) => ({
      ...scene,
      id: rid("scene"),
      pieces: scene.pieces.map((piece) => ({ ...piece, id: nextId() })),
    }));
    copy.activeSceneId = copy.scenes[0].id;
    state.project = copy;
    selectedId = null;
    renderScenes();
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
    announce(`${copy.versionLabel}として複製しました。元の版は書き出したファイルの中に残ります。`);
  }

  // v1 → v2 のように末尾の数を繰り上げる。数が無ければ「 の改訂」を足す
  function nextVersionLabel(label) {
    const m = String(label || "").match(/^(.*?)(\d+)$/);
    if (m) return `${m[1]}${Number(m[2]) + 1}`;
    return `${label || "v1"} の改訂`;
  }

  function closeVenueExportConfirm() {
    if (els.venueExportModal) els.venueExportModal.hidden = true;
    if (els.venueExportBackdrop) els.venueExportBackdrop.hidden = true;
  }

  function writeProjectExport(includeVenue) {
    const document = makeProjectExportDocument(state.project, includeVenue);
    const data = JSON.stringify(document, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safe = (state.project.title || "show").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
    link.download = `${safe}-${state.project.versionLabel}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    state.lastExportAt = nowIso();
    state.editsSinceExport = 0;
    persistSoon();
    updateBackupNote();
    announce(includeVenue || !bundledVenueForProject(state.project)
      ? "このショーをファイルへ書き出しました。チームへ渡せます。"
      : "会場データを含めず、元の会場IDを残してショーを書き出しました。");
  }

  function exportProject() {
    const venueData = bundledVenueForProject(state.project);
    if (venueData && venueData.provenance && venueData.provenance.sharing === "internal-only") {
      if (els.venueExportModal) els.venueExportModal.hidden = false;
      if (els.venueExportBackdrop) els.venueExportBackdrop.hidden = false;
      if (els.venueExportInclude) els.venueExportInclude.focus();
      return;
    }
    writeProjectExport(true);
  }

  function rehearsalIssueText(item) {
    if (!isEn()) return item.messageJa;
    const text = {
      invalid_project: "The project data is invalid.",
      invalid_stage_dimensions: "Stage width and depth must be numbers greater than zero.",
      unsupported_venue: "This venue form is not supported by the Vision Pro app.",
      no_scenes: "There are no scenes to export.",
      no_cast: "There are no performers to export.",
      invalid_cast_id: "A performer has an empty or invalid ID.",
      duplicate_cast_id: "A performer ID is duplicated.",
      invalid_scene_id: "A scene has an empty ID.",
      duplicate_scene_id: "A scene ID is duplicated.",
      ignored_performer_reference: "A placement that is not linked to the cast will be omitted.",
      duplicate_cast_placement: "The same performer is placed twice in one scene.",
      invalid_placement: "A performer placement has an invalid position or facing.",
      empty_formation: "A scene has no performer placement to export.",
      invalid_duration: "A rehearsal duration is invalid.",
      missing_rehearsal_timing: "Some scenes do not have rehearsal durations yet.",
    };
    return text[item.code] || item.messageJa;
  }

  function rehearsalOmittedText(item) {
    const ja = {
      sets: "舞台セット・装置",
      rigs: "セット登録",
      lighting: "照明",
      poses: "演者の姿勢",
      piece_sizes: "駒の大きさ",
      curved_routes: "曲線動線の制御点",
      routes: "動線",
      scene_notes: "シーンのメモ・付箋",
      backgrounds: "背景・写真・描画",
    };
    const en = {
      sets: "Set pieces and apparatus",
      rigs: "Saved set layouts",
      lighting: "Lighting",
      poses: "Performer poses",
      piece_sizes: "Piece sizes",
      curved_routes: "Curve control points",
      routes: "Routes",
      scene_notes: "Scene notes and sticky notes",
      backgrounds: "Backdrops, photos and drawing",
    };
    return `${(isEn() ? en : ja)[item.code] || item.code} (${item.count})`;
  }

  function rehearsalExporter() {
    return window.SHOSAI_STAGE_REHEARSAL_EXPORT || null;
  }

  function refreshRehearsalExport() {
    const api = rehearsalExporter();
    if (!api || !els.rehearsalCheck) {
      if (els.rehearsalCheck) {
        els.rehearsalCheck.textContent = isEn()
          ? "The rehearsal JSON converter could not be loaded."
          : "稽古用JSONの変換器を読み込めませんでした。";
        els.rehearsalCheck.className = "stage-rehearsal-check has-errors";
      }
      if (els.rehearsalExportRun) els.rehearsalExportRun.disabled = true;
      return null;
    }
    const allowUnsupported = Boolean(els.rehearsalAllowUnsupported?.checked);
    const inspection = api.inspectStageSketchProject(
      state.project,
      { allowUnsupportedVenue: allowUnsupported },
    );
    const unsupported = state.project.venue !== "proscenium";
    if (els.rehearsalUnsupported) els.rehearsalUnsupported.hidden = !unsupported;
    if (!unsupported && els.rehearsalAllowUnsupported) {
      els.rehearsalAllowUnsupported.checked = false;
    }

    els.rehearsalCheck.innerHTML = "";
    els.rehearsalCheck.className = `stage-rehearsal-check${
      inspection.errors.length ? " has-errors" : " is-ready"}`;
    const summary = document.createElement("p");
    summary.className = "stage-rehearsal-check-summary";
    if (inspection.errors.length) {
      summary.textContent = isEn()
        ? `${inspection.errors.length} issue(s) must be fixed before export.`
        : `書き出し前に直す項目が${inspection.errors.length}件あります。`;
    } else if (inspection.missingTimingScenes.length) {
      summary.textContent = isEn()
        ? `${inspection.missingTimingScenes.length} scene(s) still need durations.`
        : `${inspection.missingTimingScenes.length}シーンの時間が未入力です。`;
    } else {
      summary.textContent = isEn()
        ? "The project passed the rehearsal JSON checks."
        : "稽古用JSONの検査に通りました。";
    }
    els.rehearsalCheck.append(summary);

    const messages = [
      ...inspection.errors.map((item) => ({ ...item, level: "error" })),
      ...inspection.warnings.map((item) => ({ ...item, level: "warning" })),
    ];
    if (messages.length) {
      const list = document.createElement("ul");
      messages.forEach((item) => {
        const row = document.createElement("li");
        row.className = `is-${item.level}`;
        row.textContent = rehearsalIssueText(item);
        list.append(row);
      });
      els.rehearsalCheck.append(list);
    }

    if (els.rehearsalDefaults) {
      els.rehearsalDefaults.hidden = !inspection.missingTimingScenes.length;
    }
    if (els.rehearsalOmittedList) {
      els.rehearsalOmittedList.innerHTML = "";
      if (!inspection.omittedFeatures.length) {
        const row = document.createElement("li");
        row.textContent = isEn()
          ? "No omitted features are currently used in this show."
          : "現在のショーで該当するものはありません。";
        els.rehearsalOmittedList.append(row);
      } else {
        inspection.omittedFeatures.forEach((item) => {
          const row = document.createElement("li");
          row.textContent = rehearsalOmittedText(item);
          els.rehearsalOmittedList.append(row);
        });
      }
    }
    if (els.rehearsalExportRun) {
      els.rehearsalExportRun.disabled = Boolean(
        inspection.errors.length || inspection.missingTimingScenes.length,
      );
    }
    return inspection;
  }

  function openRehearsalExport() {
    if (!els.rehearsalExportModal) return;
    if (els.rehearsalSoundtrack) {
      els.rehearsalSoundtrack.value =
        state.project.rehearsal?.soundtrack === "bundled-demo" ? "bundled-demo" : "none";
    }
    if (els.rehearsalAllowUnsupported) els.rehearsalAllowUnsupported.checked = false;
    els.rehearsalExportModal.hidden = false;
    if (els.rehearsalExportBackdrop) els.rehearsalExportBackdrop.hidden = false;
    refreshRehearsalExport();
  }

  function closeRehearsalExport() {
    if (els.rehearsalExportModal) els.rehearsalExportModal.hidden = true;
    if (els.rehearsalExportBackdrop) els.rehearsalExportBackdrop.hidden = true;
  }

  function applyRehearsalDefaults() {
    const hold = rehearsalSeconds(els.rehearsalDefaultHold?.value);
    const transition = rehearsalSeconds(els.rehearsalDefaultTransition?.value);
    if (hold === null || transition === null) {
      announce("留まる時間と次へ移動の時間を0以上で入れてください。");
      return;
    }
    checkpoint();
    state.project.scenes.forEach((scene) => {
      if (scene.kind !== "scene") return;
      if (!scene.rehearsal) scene.rehearsal = normalizeSceneRehearsal(null);
      if (scene.rehearsal.holdDurationSeconds === null) {
        scene.rehearsal.holdDurationSeconds = hold;
      }
      if (scene.rehearsal.transitionToNextSeconds === null) {
        scene.rehearsal.transitionToNextSeconds = transition;
      }
    });
    persistSoon();
    renderScenes();
    refreshRehearsalExport();
    announce("未入力のシーンへ共通の時間を入れました。");
  }

  function exportRehearsalProject() {
    const api = rehearsalExporter();
    const inspection = refreshRehearsalExport();
    if (!api || !inspection || inspection.errors.length || inspection.missingTimingScenes.length) {
      announce("検査に通っていないため書き出せません。");
      return;
    }
    const allowUnsupported = Boolean(els.rehearsalAllowUnsupported?.checked);
    const result = api.convertStageSketchProject(
      state.project,
      { allowUnsupportedVenue: allowUnsupported },
    );
    const data = JSON.stringify(result.document, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safe = (state.project.title || "show").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
    const version = (state.project.versionLabel || "v1")
      .replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24);
    link.download = `${safe}-${version}.rehearsal.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    closeRehearsalExport();
    announce("稽古用JSONを書き出しました。Vision Proで読み込む前に警告を確認してください。");
  }

  /* 読み込み失敗の理由は aria-live（視覚的には隠れている）だけに流れていて、
     目で見ると「選んでも何も起きない」ように見えていた。失敗のときだけ、
     画面にも同じ文を短時間出す。成功時は比較モーダル自体が見えるので出さない。 */
  function importFailureNotice(message) {
    announce(message);
    let box = document.getElementById("stage-import-notice");
    if (!box) {
      box = document.createElement("div");
      box.id = "stage-import-notice";
      box.setAttribute("role", "alert");
      box.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);"
        + "z-index:120;max-width:min(520px,calc(100vw - 40px));padding:10px 16px;"
        + "background:#3a2222;color:#f2e6e6;border:1px solid #7a4040;font-size:13px;"
        + "box-shadow:0 12px 30px rgba(0,0,0,.45)";
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.hidden = false;
    clearTimeout(importFailureNotice._t);
    importFailureNotice._t = setTimeout(() => { box.hidden = true; }, 8000);
  }

  function importProject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      console.error("stage import: ファイルを読めませんでした", reader.error);
      importFailureNotice("ファイルを読めませんでした。iCloudの場合は一度ダウンロードしてから選んでください。");
    };
    reader.onload = () => {
      const text = String(reader.result);
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        console.error("stage import: JSONとして読めませんでした", error, { fileName: file.name, fileSize: file.size, readLength: text.length, head: text.slice(0, 80) });
        /* 中身が空＝iCloudの未ダウンロード（プレースホルダ）をファイルとして
           選んだときの典型。原因が全く違うので、文言を分けて出す。 */
        if (!text.trim()) {
          importFailureNotice(`「${file.name}」は中身が空のまま読めました（iCloudから未ダウンロードの可能性）。`
            + "ファイルアプリ／Finderで一度開いて中身が見えることを確認してから、もう一度選んでください。");
        } else {
          importFailureNotice(`「${file.name}」をJSONとして読めませんでした（${text.length}文字・先頭「${text.slice(0, 20)}…」）。`
            + "書き出したJSONファイル（.json）を選んでください。");
        }
        return;
      }
      const incoming = parsed && parsed.project ? parsed : { project: parsed };
      if (!incoming.project || !Array.isArray(incoming.project.scenes)) {
        console.error("stage import: project.scenes がありません", parsed && Object.keys(parsed));
        importFailureNotice("このファイルにはシーンが入っていません。");
        return;
      }
      const editSummary = incoming.editSummary;
      const prepared = prepareProjectImportDocument(incoming);
      incoming.project = prepared.project;
      /* いきなり置き換えず、まず見比べる（本人指定の差分プレビュー）。
         既定の出口は「別のショーとして開く」＝いまのショーを壊さない。 */
      /* JSON はショーの内容だけを持つ。画面の列幅・開閉・表示トグルまで
         ファイル側の既定へ戻すと、読み込んだ瞬間に操作画面が崩れて見える。
         いま使っている端末の画面状態を丸ごと残し、project だけ差し替える。 */
      const next = normalizeState({ ...state, project: incoming.project });
      // スマホは読み込んだデータを閲覧するだけなので、編集用の比較モーダルを挟まない。
      if (phoneViewerActive) {
        if (phoneUi) phoneUi.singleView = "front";
        shelveCurrent();
        reserveImportedShowId(next);
        applyLoadedState(next, `「${next.project.title}」を読み込み、ショー一覧へ保存しました。`);
        return;
      }
      pendingImport = next;
      renderImportSummary(next, editSummary);
      if (els.importModal) els.importModal.hidden = false;
      if (els.importBackdrop) els.importBackdrop.hidden = false;
    };
    reader.readAsText(file);
  }

  /* 読み込み候補。窓を閉じたら捨てる */
  let pendingImport = null;

  function importCounts(st) {
    const scenes = (st.project.scenes || []).filter((r) => r.kind === "scene");
    return {
      scenes: scenes.length,
      cast: (st.project.cast || []).length,
      sets: (st.project.sets || []).filter((t) => t.kind !== "light").length,
      lights: (st.project.sets || []).filter((t) => t.kind === "light").length,
      titles: scenes.map((r) => r.title || ""),
    };
  }

  function renderImportSummary(next, editSummary = null) {
    const host = els.importSummary;
    if (!host) return;
    host.innerHTML = "";
    const a = importCounts(state);
    const b = importCounts(next);
    const head = document.createElement("p");
    head.className = "stage-profile-hint";
    head.textContent = isEn()
      ? `File: “${next.project.title}” (${next.project.versionLabel || "v1"}) — currently open: “${state.project.title}”`
      : `ファイル:「${next.project.title}」（${next.project.versionLabel || "v1"}） ／ いま開いているのは「${state.project.title}」`;
    host.append(head);
    const table = document.createElement("p");
    table.className = "stage-profile-hint";
    table.textContent = isEn()
      ? `Scenes ${a.scenes}→${b.scenes} · Cast ${a.cast}→${b.cast} · Sets ${a.sets}→${b.sets} · Lights ${a.lights}→${b.lights}`
      : `シーン ${a.scenes}→${b.scenes} ／ 演者 ${a.cast}→${b.cast} ／ セット ${a.sets}→${b.sets} ／ 照明 ${a.lights}→${b.lights}`;
    host.append(table);
    // シーン名の見比べ: ファイルに新しく入っている名前と、置き換えると消える名前
    const mine = new Set(a.titles);
    const theirs = new Set(b.titles);
    const added = b.titles.filter((t2) => !mine.has(t2));
    const lost = a.titles.filter((t2) => !theirs.has(t2));
    if (added.length) {
      const line = document.createElement("p");
      line.className = "stage-profile-hint";
      line.textContent = isEn()
        ? `New in file: ${added.join(" / ")}`
        : `ファイル側にだけあるシーン: ${added.join(" ／ ")}`;
      host.append(line);
    }
    if (lost.length) {
      const line = document.createElement("p");
      line.className = "stage-profile-hint";
      line.textContent = isEn()
        ? `Only in the current show (lost if replaced): ${lost.join(" / ")}`
        : `いまのショーにだけあるシーン（置き換えると消える）: ${lost.join(" ／ ")}`;
      host.append(line);
    }
    const editDetails = normalizeImportEditSummary(editSummary, isEn());
    if (editDetails) {
      const section = document.createElement("section");
      section.setAttribute("aria-label", editDetails.heading);
      const heading = document.createElement("h3");
      heading.textContent = editDetails.heading;
      section.append(heading);
      const appendDetail = (label, value) => {
        if (!value) return;
        const line = document.createElement("p");
        line.className = "stage-profile-hint";
        line.textContent = `${label}: ${value}`;
        section.append(line);
      };
      appendDetail(isEn() ? "Request" : "指示", editDetails.request);
      appendDetail(isEn() ? "Summary" : "概要", editDetails.summary);
      if (editDetails.baseRevision && editDetails.appliedRevision) {
        appendDetail("Revision", `${editDetails.baseRevision} → ${editDetails.appliedRevision}`);
      }
      editDetails.diffs.forEach((diff) => {
        const scene = document.createElement("h4");
        scene.textContent = diff.sceneTitle;
        section.append(scene);
        const list = document.createElement("ul");
        diff.lines.forEach((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          list.append(item);
        });
        section.append(list);
      });
      if (editDetails.warnings.length) {
        const warningHeading = document.createElement("h4");
        warningHeading.textContent = isEn() ? "Warnings" : "警告";
        section.append(warningHeading);
        const warnings = document.createElement("ul");
        editDetails.warnings.forEach((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          warnings.append(item);
        });
        section.append(warnings);
        const safety = document.createElement("p");
        safety.className = "stage-profile-hint";
        safety.setAttribute("role", "alert");
        safety.textContent = editDetails.safety;
        section.append(safety);
      }
      host.append(section);
    }
  }

  function closeImportPreview() {
    pendingImport = null;
    if (els.importModal) els.importModal.hidden = true;
    if (els.importBackdrop) els.importBackdrop.hidden = true;
  }

  function confirmImport(asNew) {
    const next = pendingImport;
    if (!next) return;
    closeImportPreview();
    if (asNew) {
      // いまのショーは棚に残したまま、別のショーとして開く（idを新しくする）
      shelveCurrent();
      next.project.id = rid("show");
      applyLoadedState(next, `「${next.project.title}」を別のショーとして開き、ショー一覧へ保存しました。`);
      return;
    }
    // 「置き換える」場合も、直前に開いていたショーを先に棚へ残す。
    // 取り込み元と同じIDでも、内容が違えば新しいIDを割り当てて共存させる。
    shelveCurrent();
    reserveImportedShowId(next);
    checkpoint();
    resetStageAskDraft({ clearInput: true, invalidate: true });
    state = next;
    selectedId = null;
    syncInputs();
    renderScenes();
    renderVenueControls();
    updateInspector();
    render();
    shelveCurrent();
    renderShows();
    persistSoon();
    announce(`${state.project.title}（${state.project.versionLabel}）を読み込み、ショー一覧へ保存しました。`);
  }

  /* ---------- Macアプリ「AI指示」 ----------
     AIは現在のショーをMCP下書きとして読み、計画を作るところで一度止まる。
     「採る」もMCPのconfirmed経路を使い、JS側で差分適用を作り直さない。
     plan.diffの座標差分は保存データへ混ぜず、render時だけ盤面へ重ねる。 */
  let stageAskPlan = null;
  let stageAskClarificationSelections = new Map();
  let stageAskTimer = null;
  let stageAskStartedAt = 0;
  let stageAskRunToken = 0;

  function stopStageAskTimer() {
    if (stageAskTimer !== null) clearInterval(stageAskTimer);
    stageAskTimer = null;
  }

  function setStageAskMode(mode) {
    if (!els.askPanel) return;
    if (els.askIdle) els.askIdle.hidden = mode !== "idle";
    if (els.askRunning) els.askRunning.hidden = mode !== "running";
    if (els.askDraft) els.askDraft.hidden = mode !== "draft";
    if (els.askInput) els.askInput.readOnly = mode !== "idle";
  }

  function resetStageAskDraft(options = {}) {
    if (options.invalidate) stageAskRunToken += 1;
    stopStageAskTimer();
    stageAskPlan = null;
    stageAskClarificationSelections = new Map();
    if (options.clearInput && els.askInput) els.askInput.value = "";
    setStageAskMode("idle");
  }

  function clearStageAskError() {
    if (!els.askError) return;
    els.askError.textContent = "";
    els.askError.hidden = true;
  }

  function showStageAskError(output) {
    resetStageAskDraft();
    // 接頭辞の後ろは、bridgeが返した改行とエラー文を丸めずに保つ。
    STAGE_AI_PANEL_MODEL.writeError(els.askError, output);
    render();
  }

  function updateStageAskElapsed() {
    if (!els.askElapsed) return;
    const seconds = Math.max(0, Math.floor((Date.now() - stageAskStartedAt) / 1000));
    els.askElapsed.textContent = `考えています ${seconds}秒`;
  }

  function beginStageAskRun() {
    clearStageAskError();
    stopStageAskTimer();
    stageAskStartedAt = Date.now();
    updateStageAskElapsed();
    stageAskTimer = setInterval(updateStageAskElapsed, 1000);
    setStageAskMode("running");
  }

  function appendStageAskList(host, headingText, items) {
    if (!items.length) return;
    const heading = document.createElement("h3");
    heading.textContent = headingText;
    const list = document.createElement("ul");
    items.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.append(item);
    });
    host.append(heading, list);
  }

  function renderStageAskClarifications(plan) {
    if (!els.askDraftBody || !Array.isArray(plan.clarifications) || !plan.clarifications.length) return false;
    const heading = document.createElement("h3");
    heading.textContent = "確認が必要です";
    els.askDraftBody.append(heading);
    plan.clarifications.forEach((clarification) => {
      const block = document.createElement("div");
      block.className = "stage-ai-clarification";
      const text = document.createElement("p");
      text.className = "stage-profile-hint";
      text.textContent = clarification.text;
      const row = document.createElement("div");
      row.className = "stage-action-row";
      clarification.options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-quiet";
        button.textContent = option.label;
        button.setAttribute(
          "aria-pressed",
          String(stageAskClarificationSelections.get(clarification.id) === option.assetId)
        );
        button.addEventListener("click", () => {
          stageAskClarificationSelections.set(clarification.id, option.assetId);
          renderStageAskPlan(plan, { keepSelections: true });
        });
        row.append(button);
      });
      block.append(text, row);
      els.askDraftBody.append(block);
    });
    return true;
  }

  function renderStageAskPlan(plan, options = {}) {
    stopStageAskTimer();
    stageAskPlan = plan;
    if (!options.keepSelections) stageAskClarificationSelections = new Map();
    clearStageAskError();
    if (els.askDraftBody) {
      els.askDraftBody.innerHTML = "";
      if (plan.summary) {
        const summary = document.createElement("p");
        summary.className = "stage-profile-hint";
        summary.textContent = plan.summary;
        els.askDraftBody.append(summary);
      }
      plan.diff.forEach((diff) => appendStageAskList(
        els.askDraftBody,
        diff.sceneTitle,
        diff.lines
      ));
      if (plan.status === "needs_clarification") {
        if (!renderStageAskClarifications(plan)) {
          appendStageAskList(els.askDraftBody, "確認が必要です", plan.questions);
        }
      }
    }
    if (els.askWarning) {
      els.askWarning.hidden = plan.warnings.length === 0;
      els.askWarning.textContent = plan.warnings.length
        ? `${plan.warnings.join(" ")} 安全は確認されていません。舞台スケッチは安全を検証したり保証したりするものではありません。`
        : "";
    }
    if (els.askAdopt) els.askAdopt.hidden = !STAGE_AI_PANEL_MODEL.canAdopt(plan);
    if (els.askResolve) {
      const canResolve = STAGE_AI_PANEL_MODEL.canReplanWithResolutions(
        plan,
        stageAskClarificationSelections
      );
      els.askResolve.hidden = !(plan.status === "needs_clarification"
        && Array.isArray(plan.clarifications) && plan.clarifications.length);
      els.askResolve.disabled = !canResolve;
    }
    setStageAskMode("draft");
    render();
  }

  function stageAskPlanPrompt(projectId, revision, request, resolutions = []) {
    return [
      "舞台スケッチの現在ショーに対する編集計画を1件作成してください。",
      `projectId: ${projectId}`,
      `expectedRevision: ${revision}`,
      `本人の指示（この文字列をrequestへそのまま入れる）: ${JSON.stringify(request)}`,
      ...(resolutions.length
        ? [`本人の答え（この配列を plan_edit の resolutions へそのまま入れる）: ${JSON.stringify(resolutions)}`]
        : []),
      "stage_sketch MCPだけを使い、必要なproject/sceneを読んで指示をoperationsへ構造化し、",
      "stage_sketch_plan_edit を呼んでください。",
      "入力検証エラーで失敗した場合は、エラー文に従って入力を直し、最大3回まで再試行してください。",
      "指示に含まれない値は、舞台スケッチの既定値で埋めて必ず operations を作ってください。",
      "名前・位置・姿勢・向き・大きさ・色が未指定でも質問せず、既定値で配置してください。",
      "questions で止まるのは、既存の演者・セットのどれを指すか複数候補があり、取り違えると既存の配置を壊す場合だけです。",
      `自動名の言語は現在の表示に合わせ、add_placementのplacement.languageを${isEn() ? "en" : "ja"}にしてください。`,
      "成功した計画が返った時点で必ず終了してください。",
      "stage_sketch_apply_edit_plan は決して呼ばないでください。",
      "ソースコードや作業フォルダ内の他ファイルは編集しないでください。",
    ].join("\n");
  }

  function stageAskApplyPrompt(plan) {
    return [
      "確認済みの舞台スケッチ編集計画を適用してください。",
      `planId: ${plan.planId}`,
      `projectId: ${plan.projectId}`,
      `expectedRevision: ${plan.expectedRevision}`,
      "stage_sketch_apply_edit_planをconfirmed: trueで1回だけ呼んでください。",
      "別の計画を作らず、ツールの結果が返った時点で終了してください。",
      "MCPツール自身が行うprojects/history/plans/exportsの更新以外は、ファイルを編集しないでください。",
    ].join("\n");
  }

  async function requestStageAskPlan(resolutions = []) {
    const bridge = window.stageSketchBridge;
    const request = els.askInput ? els.askInput.value.trim() : "";
    if (!request || !STAGE_AI_PANEL_MODEL.isBridgeAvailable(bridge)) return;
    const allowed = STAGE_AI_PANEL_MODEL.confirmPermission(
      window.localStorage,
      window.confirm.bind(window)
    );
    if (!allowed) {
      showStageAskError("取り消しました");
      return;
    }

    const token = ++stageAskRunToken;
    beginStageAskRun();
    try {
      const currentDocument = {
        kind: "shosai-stage-sketch",
        version: 3,
        project: projectIoClone(state.project),
      };
      const outcome = await STAGE_AI_PANEL_MODEL.requestPlan(
        bridge,
        currentDocument,
        request,
        (projectId, revision, promptRequest) => stageAskPlanPrompt(
          projectId,
          revision,
          promptRequest,
          resolutions
        ),
        () => token === stageAskRunToken,
        showStageAskError
      );
      if (!outcome || token !== stageAskRunToken) return;
      const plan = STAGE_AI_PANEL_MODEL.normalizePlan(outcome.rawPlan);
      if (!plan || plan.projectId !== outcome.written.projectId
        || plan.expectedRevision !== Number(outcome.written.revision)) {
        const missingDetail = STAGE_AI_PANEL_MODEL.missingPlanDetail(outcome.output);
        showStageAskError(STAGE_AI_PANEL_MODEL.errorText(
          "計画を読めませんでした:",
          outcome.planReadError ? `${outcome.planReadError}\n\n${missingDetail}` : missingDetail
        ));
        return;
      }
      renderStageAskPlan(plan);
    } catch (error) {
      if (token !== stageAskRunToken) return;
      showStageAskError(STAGE_AI_PANEL_MODEL.errorText(
        "AI指示の処理に失敗しました:",
        error
      ));
    }
  }

  function replanStageAskWithResolutions() {
    const plan = stageAskPlan;
    if (!STAGE_AI_PANEL_MODEL.canReplanWithResolutions(plan, stageAskClarificationSelections)) return;
    const resolutions = STAGE_AI_PANEL_MODEL.resolutionsFromSelections(
      plan,
      stageAskClarificationSelections
    );
    stageAskClarificationSelections = new Map();
    requestStageAskPlan(resolutions);
  }

  async function stageAskExportForPlan(bridge, planId) {
    const entries = await bridge.listEditExports();
    diagnoseStageAskAdopt("exports-listed", {
      count: Array.isArray(entries) ? entries.length : null,
    });
    if (!Array.isArray(entries)) return null;
    for (const entry of entries.slice(0, 60)) {
      if (!entry || entry.hasEditSummary !== true || typeof entry.name !== "string") continue;
      const document = await bridge.readExport(entry.name);
      diagnoseStageAskAdopt("export-read", {
        name: entry.name,
        planId: document && document.editSummary && document.editSummary.planId,
      });
      if (document && document.editSummary && document.editSummary.planId === planId) {
        diagnoseStageAskAdopt("export-matched", { name: entry.name, planId });
        return document;
      }
    }
    return null;
  }

  function diagnoseStageAskAdopt(stage, detail = {}) {
    const diagnosis = window.__stageAdoptDiagnosis;
    if (!diagnosis || !Array.isArray(diagnosis.stages)) return;
    diagnosis.stages.push({
      stage,
      millisecondsSinceInstall: Date.now() - diagnosis.startedAt,
      ...detail,
    });
  }

  async function adoptStageAskPlan() {
    const bridge = window.stageSketchBridge;
    const plan = stageAskPlan;
    if (!STAGE_AI_PANEL_MODEL.canAdopt(plan)
      || !STAGE_AI_PANEL_MODEL.isBridgeAvailable(bridge)) return;
    const token = ++stageAskRunToken;
    diagnoseStageAskAdopt("adopt-started", { planId: plan.planId, token });
    beginStageAskRun();
    try {
      let reportAgentErrors = true;
      let agentFinished = false;
      let agentResult = null;
      const agentPromise = STAGE_AI_PANEL_MODEL.runAgent(
        bridge,
        stageAskApplyPrompt(plan),
        () => reportAgentErrors && token === stageAskRunToken,
        showStageAskError
      ).then((result) => {
        agentFinished = true;
        agentResult = result;
        diagnoseStageAskAdopt("apply-agent-finished", {
          ok: Boolean(result && result.ok === true),
          tokenCurrent: token === stageAskRunToken,
        });
        return result;
      });
      let exported = null;
      try {
        while (token === stageAskRunToken && !exported && !agentFinished) {
          exported = await stageAskExportForPlan(bridge, plan.planId);
          if (!exported && !agentFinished) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        if (!exported && agentFinished) {
          if (!agentResult || token !== stageAskRunToken) return;
          exported = await stageAskExportForPlan(bridge, plan.planId);
        }
      } catch (error) {
        if (token === stageAskRunToken) {
          showStageAskError(STAGE_AI_PANEL_MODEL.errorText(
            "適用結果を読めませんでした:",
            error
          ));
        }
        return;
      }
      if (token !== stageAskRunToken) return;
      if (exported && !agentFinished) {
        // MCPのexportは適用完了後にatomicで書かれる。planIdまで読めた時点で
        // 保存へ進み、ツール実行後も残っているCLIだけを止める。
        reportAgentErrors = false;
        diagnoseStageAskAdopt("export-detected-before-agent-exit", { planId: plan.planId });
        STAGE_AI_PANEL_MODEL.stopAgent(bridge).then((didStop) => {
          diagnoseStageAskAdopt("agent-stop-after-export", { didStop });
        }).catch((error) => {
          diagnoseStageAskAdopt("agent-stop-after-export-error", {
            message: error && typeof error.message === "string" ? error.message : String(error),
          });
        });
      } else {
        await agentPromise;
      }
      if (!exported || exported.kind !== "shosai-stage-sketch"
        || Number(exported.version) !== 3 || !exported.project
        || !Array.isArray(exported.project.scenes)) {
        showStageAskError(STAGE_AI_PANEL_MODEL.errorText(
          "適用結果を読めませんでした:",
          "適用済み計画の読み込み用JSONを取得できませんでした。"
        ));
        return;
      }
      diagnoseStageAskAdopt("export-validated", {
        castCount: Array.isArray(exported.project.cast) ? exported.project.cast.length : null,
        sceneCount: exported.project.scenes.length,
      });
      const next = STAGE_AI_PANEL_MODEL.commitAppliedExport({
        currentState: state,
        exported,
        prepareImportDocument: prepareProjectImportDocument,
        normalizeState,
        shelveCurrent: () => {
          shelveCurrent();
          diagnoseStageAskAdopt("original-shelved", { projectId: state.project.id });
        },
        makeProjectId: () => rid("show"),
        resetDraft: (options) => {
          resetStageAskDraft(options);
          diagnoseStageAskAdopt("draft-reset", {});
        },
        applyLoadedState,
      });
      diagnoseStageAskAdopt("adoption-complete", {
        projectId: state.project.id,
        castCount: state.project.cast.length,
      });
    } catch (error) {
      diagnoseStageAskAdopt("adoption-error", {
        message: error && typeof error.message === "string" ? error.message : String(error),
      });
      if (token !== stageAskRunToken) return;
      showStageAskError(STAGE_AI_PANEL_MODEL.errorText(
        "AI指示の処理に失敗しました:",
        error
      ));
    }
  }

  function discardStageAskPlan() {
    resetStageAskDraft({ clearInput: true, invalidate: true });
    clearStageAskError();
    render();
    announce("下書きを捨てました。");
  }

  async function stopStageAskRun() {
    const bridge = window.stageSketchBridge;
    const token = ++stageAskRunToken;
    stopStageAskTimer();
    try {
      await STAGE_AI_PANEL_MODEL.stopAgent(bridge);
      if (token !== stageAskRunToken) return;
      resetStageAskDraft();
      render();
      announce("AIの実行を止めました。");
    } catch (error) {
      if (token !== stageAskRunToken) return;
      showStageAskError(STAGE_AI_PANEL_MODEL.errorText(
        "AIの停止に失敗しました:",
        error
      ));
    }
  }

  function initStageAskPanel() {
    if (!els.askPanel || !STAGE_AI_PANEL_MODEL.isBridgeAvailable(window.stageSketchBridge)) return;
    setStageAskMode("idle");
    STAGE_AI_PANEL_MODEL.renderAgentInfo(window.stageSketchBridge, els.askAgentInfo);
    els.askRun?.addEventListener("click", () => requestStageAskPlan());
    els.askStop?.addEventListener("click", stopStageAskRun);
    els.askResolve?.addEventListener("click", replanStageAskWithResolutions);
    els.askAdopt?.addEventListener("click", adoptStageAskPlan);
    els.askDiscard?.addEventListener("click", discardStageAskPlan);
    els.askInput?.addEventListener("keydown", (event) => {
      if (!STAGE_AI_PANEL_MODEL.isRunShortcut(event)) return;
      event.preventDefault();
      requestStageAskPlan();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !stageAskPlan || !els.askDraft || els.askDraft.hidden) return;
      event.preventDefault();
      discardStageAskPlan();
    });
  }

  function renderVenueControls() {
    // 形式によっては貼る壁が無い。写真の欄の出入りもここで合わせる
    syncPhotoControls();
    const current = venue();
    const size = venueSize();

    /* 形式の選択肢は毎回組み直す。一度だけ作る作りだと、
     * 言語を変えても中の名前が日本語のまま残る。 */
    if (els.venueSelect) {
      els.venueSelect.innerHTML = "";
      VENUES.list.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = isEn() ? `${venueName(v)} (${venueShortName(v)})` : `${venueName(v)}（${venueShortName(v)}）`;
        els.venueSelect.append(opt);
      });
      if (current.missing) {
        const opt = document.createElement("option");
        opt.value = current.id;
        opt.textContent = `${current.label}（${current.id}）`;
        els.venueSelect.append(opt);
      }
    }
    if (els.venueSelect) els.venueSelect.value = current.id;

    if (els.venueMissing) {
      els.venueMissing.hidden = !current.missing;
      els.venueMissing.textContent = current.missing
        ? `この会場データが見つかりません（元のID: ${current.id}）` : "";
    }

    if (els.sizeSelect) {
      els.sizeSelect.innerHTML = "";
      current.sizes.forEach((s2) => {
        const opt = document.createElement("option");
        opt.value = s2.id;
        const bits = current.audience === "round"
          ? (isEn() ? `⌀${s2.width}m` : `直径${s2.width}m`)
          : `${s2.width}×${s2.depth}m`;
        opt.textContent = `${sizeName(s2)} — ${bits}`;
        els.sizeSelect.append(opt);
      });
      /* 決め打ちの規模と同じ並びに「カスタム」を置く。
       * 実寸を手で入れることは、規模を選ぶことと同じ層の決めごとなので、
       * 別の欄へ追い出さない。 */
      const custom = document.createElement("option");
      custom.value = "custom";
      const dims = state.project.venueDims;
      const bits = dims
        ? (current.audience === "round"
          ? (isEn() ? `⌀${size.width}m` : `直径${size.width}m`)
          : `${size.width}×${size.depth}m`)
        : (isEn() ? "enter sizes" : "寸法を入れる");
      custom.textContent = `${isEn() ? "Custom" : "カスタム"} — ${bits}`;
      els.sizeSelect.append(custom);
      els.sizeSelect.value = state.project.venueDims ? "custom" : size.id;
    }

    /* 実寸の欄。円形は一つの数（直径）で決まるので、奥行きの欄は畳む。
     * ★プリセットを選んでいるあいだは欄ごと出さない。触れない欄を灰色で
     *   並べておくより、カスタムを選んだときに現れる方が用が分かる。 */
    if (els.venueW) {
      const custom = Boolean(state.project.venueDims);
      if (els.venueDimRow) els.venueDimRow.hidden = !custom;
      [els.venueW, els.venueD, els.venueH].forEach((input) => {
        if (input) input.disabled = !custom;
      });
      const round = current.audience === "round";
      if (els.venueWLabel) {
        els.venueWLabel.textContent = round
          ? (isEn() ? "Diameter" : "直径")
          : (isEn() ? "Width" : "間口");
      }
      if (els.venueDCell) els.venueDCell.hidden = round;
      const put = (input, value) => {
        if (input && document.activeElement !== input) input.value = String(value);
      };
      put(els.venueW, size.width);
      put(els.venueD, size.depth);
      put(els.venueH, size.height || 6);
      if (els.venueReset) els.venueReset.hidden = !state.project.venueDims;
    }

    if (els.venueScale) {
      const en = isEn();
      const bits = current.audience === "round"
        ? [`${en ? "Diameter" : "直径"} ${size.width}m`]
        : [`${en ? "Width" : "間口"} ${size.width}m`, `${en ? "Depth" : "奥行"} ${size.depth}m`];
      if (size.height) bits.push(`${en ? "Height" : "高さ"} ${size.height}m`);
      if (size.seats) bits.push(en ? `about ${size.seats} seats` : `客席 約${size.seats}席`);
      if (size.crowd) bits.push(en ? `up to ${size.crowd.toLocaleString()} people` : `観客 〜${size.crowd.toLocaleString()}人`);
      els.venueScale.textContent = bits.join(en ? " · " : " ・ ") + (en ? "" : `（${current.source}）`);
    }

    // 見る位置の小図は、客席が正面だけの劇場でしか意味を持たない
    if (els.showSeatMap) {
      const box = els.showSeatMap.closest("label");
      if (box) box.hidden = current.audience !== "front";
    }

    // 背景の壁が無い形式では、塗りの道具立てを畳む
    const hasWall = current.audience !== "round";
    if (els.bgSection) els.bgSection.hidden = !hasWall;
    document.querySelectorAll('[data-stage-tool="paint"], [data-stage-tool="erase"]').forEach((b) => {
      b.disabled = !hasWall;
      b.title = hasWall ? "" : `${current.label}には背景の壁がありません`;
    });

    // 席は正面図を出しているときだけ意味を持つ
    const approxSeats = approxFrontSeatsForVenue(current);
    const seats = approxSeats || VENUES.seats;
    const seat = frontSeatById(state.seat);
    if (els.seatList) els.seatList.hidden = !state.showFront;
    if (els.frontApprox) {
      els.frontApprox.hidden = !(current.custom && state.showFront);
      els.frontApprox.textContent = current.custom && state.showFront ? tx("客席からの見え方は近似です") : "";
    }
    if (els.seatList) {
      els.seatList.innerHTML = "";
      seats.forEach((s2) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stage-seat";
        button.setAttribute("aria-pressed", String(s2.id === seat.id));
        button.textContent = tabletPwaActive ? seatShortName(s2) : seatName(s2);
        button.setAttribute("aria-label", seatName(s2));
        button.addEventListener("click", () => setSeat(s2.id));
        els.seatList.append(button);
      });
    }
  }

  function setSeat(id) {
    if (state.seat === id) return;
    state.seat = id;
    renderVenueControls();
    render();
    persistSoon();
    announce(`${seatName(frontSeatById(id))}から見た絵に切り替えました。配置は変わりません。`);
  }

  // 正面と平面はそれぞれ独立に開閉する。ただし両方閉じることはできない
  function setViewShown(which, shown) {
    const other = which === "front" ? "showPlan" : "showFront";
    const key = which === "front" ? "showFront" : "showPlan";
    if (!shown && !state[other]) {
      renderVenueControls();
      announce("どちらか一方は開いたままにします。");
      return;
    }
    state[key] = shown;
    if (!state.showFront && tool !== "select") setTool("select");
    selectedId = null;
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
    announce(shown
      ? `${which === "front" ? "正面" : "平面"}を開きました。`
      : `${which === "front" ? "正面" : "平面"}を閉じました。`);
  }

  /* 見る位置の小図は、客席が正面だけの劇場でしか描かれない。
   * 描かれない劇場で入り切りだけ残ると、押しても何も起きない札になる。 */
  function syncSeatMapToggle() {
    if (!els.seatMapToggle) return;
    els.seatMapToggle.hidden = venue().audience !== "front";
  }

  function setVenue(id) {
    if (state.project.venue === id) return;
    checkpoint();
    state.project.venue = id;
    state.project.venueSize = VENUES.sizeById(VENUES.byId(id), state.project.venueSize).id;
    state.project.venueDims = null;
    if (venue().audience === "round" && tool !== "select") setTool("select");
    renderVenueControls();
    syncSeatMapToggle();
    render();
    persistSoon();
    announce(`${venueName(venue())}へ切り替えました。配置はそのまま残ります。`);
  }

  function setVenueSize(id) {
    if (id === "custom") {
      // いまの見た目のまま手入力へ移る。数字が飛ばないように、いまの値を写す
      if (state.project.venueDims) return;
      checkpoint();
      const now = venueSize();
      state.project.venueDims = normalizeVenueDims(
        { width: now.width, depth: now.depth, height: now.height }, now);
      renderVenueControls();
      render();
      persistSoon();
      announce(isEn() ? "Custom sizes. Enter the numbers." : "カスタムにしました。寸法を入れてください。");
      return;
    }
    if (state.project.venueSize === id && !state.project.venueDims) return;
    checkpoint();
    state.project.venueSize = id;
    // 規模を選び直したら、手で入れた実寸は捨てる（選んだ規模の値が出るべき）
    state.project.venueDims = null;
    renderVenueControls();
    render();
    persistSoon();
    announce(`規模を${sizeName(venueSize())}にしました。`);
  }


  /* ---------- 操作 ---------- */

  function pointFromEvent(event) {
    const el = event.currentTarget || event.target;
    const rect = el.getBoundingClientRect();
    const zs = zoomOf(viewOf(el));
    // 画面の点 → 絵の中の点。拡大しているぶんを戻す
    return {
      x: (event.clientX - rect.left) * (W / rect.width) / zs.z + zs.ox,
      y: (event.clientY - rect.top) * (H / rect.height) / zs.z + zs.oy,
    };
  }

  function onBackdrop(point, L) {
    const rect = backdropRect(L);
    if (!rect) return false;
    return point.x >= rect.x && point.x <= rect.x + rect.w &&
      point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  // 正面図の点を、選んだ床面／空中面の保存座標へ戻す。
  function arrowPointFromScreen(point, L, arrow) {
    if (arrow.plane === "floor") {
      const floor = fromScreen(point.x, point.y, L);
      return { a: floor.u, b: floor.v };
    }
    const base = place(0.5, arrow.depth, L);
    // 左右は固定した奥行きの床面で逆算し、高さは傾ける前の縦座標で測る。
    const across = fromScreen(point.x, base.y, L);
    const metre = perMetre(base, L).y || 1;
    const height = (base.rawY - L.untilt(point.y)) / metre;
    return { a: across.u, b: clamp(height, 0, 12) };
  }

  /* 拾えるものは道具で変わる。明かりは物と重なって置くのが普通なので、
   * 同じ手つきで両方を掴めるようにすると、狙ったほうが取れない。
   * 「動かす」では物だけ、「照明を動かす」では照明だけを拾う。 */
  function hitTest(point, L) {
    const wantLight = tool === "light";
    /* 動線は明かりにも引ける。灯体はその場に残したまま、
     * 当てる先だけが動く（追い掛ける明かり）。 */
    const anyKind = tool === "route";
    /* ★錠が掛かっているものは、当たり判定ごと消す（本人の指定）。
       固定した台や壁の上で、演者だけを掴みたいときのため。
       掴めないので、錠を外す口は「出るもの」の一覧にある。
       ★重なっているときは、囲いの面積が小さいものを優先して掴む。
       広い台の上の演者が、台に負けて掴めないことがないように。
       同じ面積なら、上に描かれている方（並びの後ろ）を取る。 */
    let best = null;
    let bestArea = Infinity;
    for (let i = sc().pieces.length - 1; i >= 0; i -= 1) {
      const piece = sc().pieces[i];
      if (!anyKind && (piece.type === "light") !== wantLight) continue;
      // 平面図で隠している吊物は掴めない（見えないものを掴むことになるため）
      if (L.plan && !state.showFlown && isFlown(piece)) continue;
      // 消している図の照明も同じ（見えないものを掴ませない）
      if (piece.type === "light"
        && !(L.plan ? state.showLightsPlan : state.showLightsFront)) continue;
      if (isLocked(piece)) continue;
      const b = selectionBounds(piece, L);
      if (point.x < b.x || point.x > b.x + b.w || point.y < b.y || point.y > b.y + b.h) continue;
      const area = b.w * b.h;
      if (area < bestArea) { best = piece; bestArea = area; }
    }
    return best;
  }

  // 灯体の印を掴んだか。当たる場所より先に見る（重なることがあるため）
  // 錠が掛かった明かりは灯体ごと素通しにする（当たり判定を持たない）
  function fixtureAt(point, L) {
    if (!(L.plan ? state.showLightsPlan : state.showLightsFront)) return null;
    const lights = sc().pieces.filter((piece) => piece.type === "light" && !isLocked(piece));
    for (let i = lights.length - 1; i >= 0; i -= 1) {
      const at = beamSource(lights[i], L);
      if (Math.hypot(point.x - at.x, point.y - at.y) <= 13) return lights[i];
    }
    return null;
  }

  /* 紐づけていた駒が消えたメモは、消さずにその場へ置き直す。
   * 覚え書きを勝手に捨てない。ただし持ち主が居ないので、絵の内側へ寄せておく */
  function detachOrphanNotes() {
    // 場面は state.project.scenes にある。ここを取り違えると restore() が
    // 途中で落ち、「戻す」が黙って効かなくなる（実際にそうなっていた）
    (state.project.scenes || []).forEach((scene) => {
      (scene.notes || []).forEach((note) => {
        if (!note.pieceId) return;
        if ((scene.pieces || []).some((piece) => piece.id === note.pieceId)) return;
        note.pieceId = null;
        note.x = clamp(note.x, 20, W - NOTE_W - 20);
        note.y = clamp(note.y, 20, H - 80);
      });
    });
  }

  /* 光源の左右・奥行きを言葉にする。0〜1の割合のままでは場所が読めないので、
   * 舞台の実寸に直して「中央から◯m」「奥から◯m」で言う。 */
  function sideText(u) {
    const width = venueSize().width || 12;
    const off = (u - 0.5) * width;
    if (Math.abs(off) < 0.15) return tm("misc", "centre", "中央");
    if (isEn()) return `${Math.abs(off).toFixed(1)} m ${off > 0 ? "stage left" : "stage right"}`;
    return `${off > 0 ? "上手" : "下手"}へ${Math.abs(off).toFixed(1)}m`;
  }

  function depthText(v) {
    const depth = venueSize().depth || 9;
    return isEn() ? `${(v * depth).toFixed(1)} m from upstage` : `奥から${(v * depth).toFixed(1)}m`;
  }

  function selectedNote() {
    return (sc().notes || []).find((note) => note.id === selectedNoteId) || null;
  }

  /* 錠は「そのもの」に掛ける。登録があれば登録側、無ければ駒そのものに持つ。
   * 二か所に別々の錠を置くと、どちらで外すのか分からなくなる。 */
  // announce で名指しするときの呼び名。登録名があればそれを使う
  function pieceLabel(piece) {
    const owner = lockOwner(piece);
    if (owner && owner.name) return owner.name;
    if (piece && piece.name) return piece.name;
    return piece ? pieceTypeName(piece.type) : "これ";
  }

  function lockOwner(piece) {
    if (!piece) return null;
    if (piece.castId) {
      return (state.project.cast || []).find((c) => c.id === piece.castId) || null;
    }
    if (piece.setId) {
      return (state.project.sets || []).find((t) => t.id === piece.setId) || null;
    }
    return null;
  }

  function isLocked(piece) {
    const owner = lockOwner(piece);
    return Boolean(owner ? owner.locked : (piece && piece.locked));
  }

  function setLocked(piece, value) {
    const owner = lockOwner(piece);
    if (owner) owner.locked = value; else if (piece) piece.locked = value;
  }

  function selectedPiece() {
    return sc().pieces.find((piece) => piece.id === selectedId) || null;
  }

  function syncArrowOptions() {
    if (!els.arrowOptions) return;
    const plane = arrowPlanePref();
    const depth = arrowDepthPref();
    const heads = arrowHeadsPref();
    els.arrowOptions.hidden = tool !== "arrow";
    if (els.arrowPlaneFloor) els.arrowPlaneFloor.setAttribute("aria-pressed", String(plane === "floor"));
    if (els.arrowPlaneAir) els.arrowPlaneAir.setAttribute("aria-pressed", String(plane === "air"));
    if (els.arrowDepthControl) els.arrowDepthControl.hidden = plane !== "air";
    if (els.arrowDepth && document.activeElement !== els.arrowDepth) els.arrowDepth.value = String(depth);
    if (els.arrowDepthValue) {
      els.arrowDepthValue.textContent = `${((1 - depth) * (venueSize().depth || 9)).toFixed(1)}m`;
    }
    if (els.arrowHeadOne) els.arrowHeadOne.setAttribute("aria-pressed", String(heads === "one"));
    if (els.arrowHeadBoth) els.arrowHeadBoth.setAttribute("aria-pressed", String(heads === "both"));
    if (els.arrowColor && document.activeElement !== els.arrowColor) els.arrowColor.value = arrowColorPref();
    if (els.arrowClear) els.arrowClear.disabled = !(sc().arrows || []).length;
  }

  function setTool(nextTool) {
    // スマホ閲覧版で持てる道具は、見るための選択状態とメモだけ。
    if (phoneViewerActive && nextTool !== "note") nextTool = "select";
    const painting = nextTool === "paint" || nextTool === "erase";
    if (!state.showFront && painting) {
      announce("背景の塗りは正面図で行います。正面を開いてください。");
      return;
    }
    // 全周形式には塗れる背景の壁が無い（奥も客席）
    if (venue().audience === "round" && painting) {
      announce(`${venueName(venue())}には背景の壁がありません。奥も客席です。`);
      return;
    }
    if (nextTool === "route" && !state.showPlan) {
      announce("動線は平面図で引きます。平面を開いてください。");
      return;
    }
    if (nextTool === "arrow" && !state.showFront) {
      announce("矢印は正面図で描きます。正面を開いてください。");
      return;
    }
    if (arrowDraft) {
      arrowDraft = null;
      pointerAction = null;
    }
    tool = nextTool;
    /* 見えないものは掴めない決まりなので、道具を持ったら対象を出す。
       明かりの道具→両図の照明ON、動線の道具→動線ON（つまみも合わせる）。 */
    if (tool === "light" && (!state.showLightsFront || !state.showLightsPlan)) {
      state.showLightsFront = true;
      state.showLightsPlan = true;
      if (els.frontLights) els.frontLights.checked = true;
      if (els.planLights) els.planLights.checked = true;
    }
    if (tool === "route" && !(state.showRoutesCast && state.showRoutesLight && state.showRoutesSet)) {
      state.showRoutesCast = true;
      state.showRoutesLight = true;
      state.showRoutesSet = true;
      if (els.planRoutesCast) els.planRoutesCast.checked = true;
      if (els.planRoutesLight) els.planRoutesLight.checked = true;
      if (els.planRoutesSet) els.planRoutesSet.checked = true;
    }
    canvas.dataset.tool = tool;
    // 平面図で使うのは「動かす」と「動線」だけ
    if (planCanvas) {
      planCanvas.dataset.tool = tool === "route" || tool === "note" || tool === "light" ? tool : "select";
    }
    document.querySelectorAll("[data-stage-tool]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stageTool === tool));
    });
    els.toolHint.textContent = tm("tool", tool, TOOL_HINTS[tool]);
    if (els.planRoute) els.planRoute.setAttribute("aria-pressed", String(tool === "route"));
    [els.planNote, els.frontNote].forEach((button) => {
      if (button) button.setAttribute("aria-pressed", String(tool === "note"));
    });
    syncArrowOptions();
    render();
  }

  function updateInspector() {
    const piece = selectedPiece();
    if (els.facingLock) {
      const locked = Boolean(sc().facingLock);
      els.facingLock.textContent = locked ? "🔒" : "🔓";
      els.facingLock.setAttribute("aria-pressed", String(locked));
    }
    if (els.seriWarning) {
      const involved = piece && seriStraddlers(sc().pieces, venueSize())
        .some((entry) => entry.piece === piece || entry.seri === piece);
      els.seriWarning.hidden = !involved;
    }
    /* 「何も選んでいないときの案内」は説明文なので「?」の側で出し入れする。
     * ここで勝手に出すと、畳んだはずの文が選ぶたびに戻ってくる。 */
    els.selectionControls.hidden = !piece;
    if (els.fpvOpen) els.fpvOpen.hidden = !(piece && piece.type === "performer");
    if (!piece) return;
    const sameType = sc().pieces.filter((candidate) => candidate.type === piece.type);
    els.selectedName.textContent = `${pieceTypeName(piece.type)} ${sameType.indexOf(piece) + 1}`;
    syncDimControls(piece);
    const mount = mountKindOf(piece);
    if (els.piecePose) {
      const isPerformer = piece.type === "performer";
      /* 乗り物の上では姿勢を選べない。何で決まっているかが読めるよう、
         札には乗り方をそのまま出す。 */
      if (els.poseLabel) {
        els.poseLabel.textContent = mount === "pole" ? tx("ポールに付く")
          : mount === "chair" ? tx("椅子に座る")
          : mount === "trapeze"
            ? poseName(poseById(piece.trapMode === "hang" ? "trapeze_hang" : "trapeze_sit"))
            : mount === "tissue" ? tx("布に掴まる")
            : poseName(poseById(piece.pose));
      }
      els.piecePose.disabled = !isPerformer || Boolean(mount);
      els.piecePose.hidden = !isPerformer;
      const row = els.piecePose.previousElementSibling;
      if (row) row.hidden = !isPerformer;
    }
    if (els.poleControls) {
      const onPole = mount === "pole";
      els.poleControls.hidden = !onPole;
      if (onPole) {
        const holder = sc().pieces.find((other) => other.id === piece.supportId);
        const top = (holder && (pieceDims(holder) || {}).h) || 6;
        els.poleH.max = String(Math.max(1, top - 0.4));
        els.poleH.value = String(clamp(finite(piece.poleH, 2.5), 0.8, Math.max(1, top - 0.4)));
        els.poleHValue.textContent = `${Number(els.poleH.value).toFixed(1)}m`;
        els.poleLeft.setAttribute("aria-pressed", String(piece.poleSide === "L"));
        els.poleRight.setAttribute("aria-pressed", String(piece.poleSide !== "L"));
      }
    }
    if (els.trapControls) {
      const onTrap = mount === "trapeze";
      els.trapControls.hidden = !onTrap;
      if (onTrap) {
        els.trapSit.setAttribute("aria-pressed", String(piece.trapMode !== "hang"));
        els.trapHang.setAttribute("aria-pressed", String(piece.trapMode === "hang"));
      }
    }
    if (els.diaboloControls) {
      const onDiabolo = piece.type === "diabolo";
      els.diaboloControls.hidden = !onDiabolo;
      if (onDiabolo) {
        els.diaboloLay.setAttribute("aria-pressed", String(piece.diaboloMode !== "stand"));
        els.diaboloStand.setAttribute("aria-pressed", String(piece.diaboloMode === "stand"));
      }
    }
    if (els.tissueControls) {
      const onTissue = mount === "tissue";
      els.tissueControls.hidden = !onTissue;
      if (onTissue) {
        const holder = sc().pieces.find((other) => other.id === piece.supportId);
        const top = holder ? flownLift(holder) : 0;
        const bottom = Math.max(0, top - (((holder && pieceDims(holder)) || {}).h || 0));
        const max = Math.max(bottom, top - 0.2);
        const value = clamp(finite(piece.tissueH, 4), bottom, max);
        els.tissueH.min = String(bottom);
        els.tissueH.max = String(max);
        els.tissueH.value = String(value);
        els.tissueHValue.textContent = `${value.toFixed(1)}m`;
      }
    }
    if (els.pieceFacing) {
      // 向きは演者と台に効く。球は回しても見た目が変わらない
      const isPerformer = piece.type === "performer" || Boolean(SOLID_TYPES[piece.type]);
      // フェーダーは中央が客席向き。保存は0〜359なので、180を超える分は負へ折り返す
      const deg = ((Number(piece.facing) || 0) % 360 + 360) % 360;
      els.pieceFacing.value = String(deg > 180 ? deg - 360 : deg);
      els.pieceFacing.disabled = !isPerformer;
      // 効かないつまみは出さない。明かりや球を選ぶたび、灰色の「向き」が場所を取る
      if (els.facingControls) els.facingControls.hidden = !isPerformer;
      if (els.facingValue) {
        els.facingValue.textContent = isPerformer ? facingLabel(piece.facing) : "―";
      }
    }
  }

  function syncInputs() {
    if (els.sceneList && state.sceneListHeight) {
      els.sceneList.style.height = `${state.sceneListHeight}px`;
    }
    els.background.value = sc().background;
    syncPhotoControls();
    els.paintColor.value = state.paintColor;
    els.brushSize.value = String(state.brushSize);
    els.brushValue.textContent = String(state.brushSize);
    if (els.showNames) els.showNames.checked = state.showNames;
    if (els.showSetNames) els.showSetNames.checked = state.showSetNames;
    if (els.showLightNames) els.showLightNames.checked = state.showLightNames;
    if (els.showSeatMap) els.showSeatMap.checked = state.showSeatMap;
    if (els.showFlown) els.showFlown.checked = state.showFlown;
    if (els.frontLights) els.frontLights.checked = state.showLightsFront;
    if (els.frontLightIntent) els.frontLightIntent.checked = state.showLightIntent;
    if (els.planLights) els.planLights.checked = state.showLightsPlan;
    if (els.planRoutesCast) els.planRoutesCast.checked = state.showRoutesCast;
    if (els.planRoutesLight) els.planRoutesLight.checked = state.showRoutesLight;
    if (els.planRoutesSet) els.planRoutesSet.checked = state.showRoutesSet;
    if (els.animScenes) els.animScenes.checked = state.animateScenes;
    if (els.animMs) {
      if (document.activeElement !== els.animMs) els.animMs.value = String(state.sceneAnimMs / 1000);
      els.animMs.disabled = !state.animateScenes;
      if (els.animMsValue) els.animMsValue.textContent = `${(state.sceneAnimMs / 1000).toFixed(1)}秒`;
    }
    syncSeatMapToggle();
  }

  function addPiece(type) {
    checkpoint();
    const count = sc().pieces.length;
    const piece = normalizePiece({
      id: nextId(),
      type,
      u: clamp(0.5 + ((count % 5) - 2) * 0.07, 0.06, 0.94),
      v: clamp(0.55 + (count % 3) * 0.08, 0.05, 0.95),
      size: type === "light" ? 115 : 100,
      color: state.pieceColor,
      name: "",
    }, 0);
    sc().pieces.push(piece);
    selectedId = piece.id;
    setTool("select");
    updateInspector();
    renderScenes();
    render();
    persistSoon();
    announce(`${pieceTypeName(type)}を舞台へ置きました。`);
    canvas.focus();
  }

  function removeSelected() {
    const piece = selectedPiece();
    if (!piece) return;
    // 組の明かりは一体で消える（TURN OFFも組ごと）
    const gid = piece.type === "light" ? lightGroupOf(piece) : null;
    if (gid) { toggleLightGroup(gid); return; }
    checkpoint();
    /* 登録のあるもの（名簿の演者・舞台セット）は、消しても登録は残るので
       一覧では「舞台裏」になるだけ。トグルで下げたときと同じ扱いにして、
       立ち位置を控える。ここで控えないと、消してから出し直したときだけ
       既定位置へ飛ぶという、同じ結果に二つの筋道ができてしまう。 */
    stashPiece(sc(), piece.setId || piece.castId, piece);
    sc().pieces = sc().pieces.filter((candidate) => candidate.id !== piece.id);
    selectedId = null;
    updateInspector();
    renderScenes();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    render();
    persistSoon();
    announce(piece.type === "light"
      ? `${pieceLabel(piece)}をOFFにしました。`
      : `${pieceTypeName(piece.type)}を舞台から外しました。`);
  }

  function duplicateSelected() {
    const piece = selectedPiece();
    if (!piece) return;
    checkpoint();
    const copy = { ...piece, id: nextId(), u: clamp(piece.u + 0.06, 0, 1), v: clamp(piece.v + 0.04, 0, 1) };
    sc().pieces.push(copy);
    selectedId = copy.id;
    updateInspector();
    renderScenes();
    render();
    persistSoon();
    announce(`${pieceTypeName(piece.type)}を複製しました。`);
  }

  /* 重なりの上下を手で入れ替える仕組みは置かない。
   * 動かしている駒が、重なった相手の上に乗る（bringToTop）で決まるため。 */

  /* ---------- 前のシーンの動線の追従 ----------
     前のシーンでこの駒へ引いてあった動線は、駒を動かしたら先も付いてくる。
     「動線を引いてから、次のシーンで置き直す」手順で、線が置き去りにならないため。
     ★付いてくるのは、動線の先が「動かす前のこの駒」を指していたときだけ。
       わざと別の場所へ引いてある線は触らない。その代わり、ずれが大きければ知らせる
       （知らせるだけ。直すかどうかは本人が決める）。 */
  const FOLLOW_M = 0.6;   // 「この駒を指していた」とみなす誤差
  const WARN_M = 2.5;     // これ以上ずれたら知らせる
  function syncRouteFromPrev(piece, oldU, oldV) {
    if (oldU === undefined || oldV === undefined) return;
    const rows = state.project.scenes.filter((r) => r.kind === "scene");
    const at = rows.findIndex((r) => r.id === state.project.activeSceneId);
    if (at <= 0) return;
    const twin = twinOf(piece, rows[at - 1].pieces || []);
    if (!twin || !twin.route) return;
    const size = venueSize();
    const dist = (au, av, bu, bv) => Math.hypot((au - bu) * (size.width || 12), (av - bv) * (size.depth || 9));
    if (dist(twin.route.u, twin.route.v, oldU, oldV) <= FOLLOW_M) {
      const straight = Math.abs(twin.route.bu - (twin.u + twin.route.u) / 2) < 0.001
        && Math.abs(twin.route.bv - (twin.v + twin.route.v) / 2) < 0.001;
      twin.route.u = piece.u;
      twin.route.v = piece.v;
      if (straight) {
        twin.route.bu = (twin.u + piece.u) / 2;
        twin.route.bv = (twin.v + piece.v) / 2;
      }
      persistSoon();
      announce("前のシーンの動線も、この位置へ合わせました。");
      return;
    }
    const miss = dist(twin.route.u, twin.route.v, piece.u, piece.v);
    if (miss >= WARN_M) {
      announce(`前のシーンの動線の先と${miss.toFixed(1)}mずれています。そのままでも構いません。`);
    }
  }

  function finishPointer(event) {
    if (touches.has(event.pointerId)) {
      touches.delete(event.pointerId);
      if (pinch && touches.size < 2) pinch = null;
    }
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const el = pointerAction.el || canvas;
    try { if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId); } catch (_) { /* 同上 */ }
    if (pointerAction.kind === "arrow") {
      const action = pointerAction;
      if (event.type !== "pointercancel" && arrowDraft && arrowDraft.points.length < 400) {
        const point = pointFromEvent(event);
        const previous = action.screenPoints[action.screenPoints.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) * zoomOf(action.view).z >= 4) {
          action.screenPoints.push(point);
          arrowDraft.points.push(arrowPointFromScreen(point, layout(action.view), arrowDraft));
        }
      }
      const draft = arrowDraft;
      pointerAction = null;
      arrowDraft = null;
      el.dataset.dragging = "false";
      const zoom = zoomOf(action.view).z;
      const length = action.screenPoints.slice(1).reduce((sum, point, index) => (
        sum + Math.hypot(point.x - action.screenPoints[index].x,
          point.y - action.screenPoints[index].y) * zoom
      ), 0);
      if (event.type !== "pointercancel" && draft && draft.points.length >= 2 && length >= 12) {
        checkpoint();
        sc().arrows.push(normalizeArrow({ ...draft, id: rid("arrow") }));
        render();
        persistSoon();
        announce("矢印を描きました。");
      } else {
        // 誤タップの下書きだけを消し、シーンや履歴には何も残さない。
        render();
      }
      return;
    }
    const changed = pointerAction.kind === "stroke" || pointerAction.kind === "pan"
      || pointerAction.kind === "route" || pointerAction.moved;
    const tapped = pointerAction.kind === "note"
      && (pointerAction.fresh || !pointerAction.moved)
      ? { id: pointerAction.id, view: pointerAction.view } : null;
    const drewRoute = pointerAction.kind === "route";
    const dragSync = pointerAction.kind === "drag" && pointerAction.moved
      ? { id: pointerAction.id, u: pointerAction.startU, v: pointerAction.startV } : null;
    // 動線は一本引けば用が済む。引いたらそのまま動かす手に戻す
    const backToSelect = Boolean(pointerAction.fromRouteTool);
    pointerAction = null;
    el.dataset.dragging = "false";
    if (changed) persistSoon();
    if (dragSync) {
      const piece = sc().pieces.find((candidate) => candidate.id === dragSync.id);
      if (piece) {
        syncRouteFromPrev(piece, dragSync.u, dragSync.v);
        if (piece.type === "seri") {
          setLocked(piece, true);
          renderSets();
          updateInspector();
          render();
          persistSoon();
          announce("せりを置きました。錠を掛けました（せりの位置は動きません）。動かすには一覧の🔒を外します。");
        }
      }
    }
    // 動線を引き終えたら、場面の欄の「動線の先へ動かした場面を作る」が押せるようになる
    if (drewRoute) renderScenes();
    if (backToSelect) setTool("select");
    // 掴んだだけで離した＝書き直したい、と読む
    if (tapped) {
      const note = (sc().notes || []).find((candidate) => candidate.id === tapped.id);
      if (note) openNoteEditor(note, tapped.view);
    }
  }

  // 掴みの捕捉。取り損ねても操作は続けられるので、例外で止めない
  function capture(el, pointerId) {
    try { el.setPointerCapture(pointerId); } catch (_) { /* 取れなくても支障はない */ }
  }

  // メモを掴む。道具が「動かす」でも「メモ」でも同じ手つきで動かせる
  function grabNote(note, point, L, el, event, fresh) {
    const base = notePos(note, L);
    selectedId = null;
    selectedNoteId = note.id;
    capture(el, event.pointerId);
    el.dataset.dragging = "true";
    pointerAction = {
      kind: "note", pointerId: event.pointerId, id: note.id, el, view: viewOf(el),
      offsetX: point.x - base.x, offsetY: point.y - base.y,
      before: snapshot(), moved: Boolean(fresh), fresh: Boolean(fresh),
    };
    updateInspector();
    render();
  }

  /* ---------- 二本指 ----------
     二本置かれたら、その間の距離で拡大率、真ん中の動きで寄せ幅を決める。
     一本目の操作（駒を掴んでいるなど）は取り消してから始める。 */
  const touches = new Map();   // pointerId → { view, x, y }
  let pinch = null;

  function pinchPair(view) {
    const list = [...touches.values()].filter((t) => t.view === view);
    return list.length >= 2 ? list.slice(0, 2) : null;
  }

  function beginPinch(view) {
    const pair = pinchPair(view);
    if (!pair) return;
    const zs = zoomOf(view);
    pinch = {
      view,
      dist: Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) || 1,
      cx: (pair[0].x + pair[1].x) / 2,
      cy: (pair[0].y + pair[1].y) / 2,
      z: zs.z, ox: zs.ox, oy: zs.oy,
    };
    // 駒を掴んでいたら手を離す（二本目が置かれた時点で、拡大の操作へ移る）
    if (pointerAction) {
      pointerAction.el.dataset.dragging = "false";
      if (pointerAction.kind === "arrow") arrowDraft = null;
      pointerAction = null;
      render();
    }
  }

  function movePinch(view) {
    if (!pinch || pinch.view !== view) return;
    const pair = pinchPair(view);
    if (!pair) return;
    const zs = zoomOf(view);
    const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) || 1;
    const cx = (pair[0].x + pair[1].x) / 2;
    const cy = (pair[0].y + pair[1].y) / 2;
    const next = clamp(pinch.z * (dist / pinch.dist), ZOOM_MIN, ZOOM_MAX);
    /* 指の真ん中に来ている絵の点を、動かさずに保つ。
     * 保たないと、拡げるたびに絵が指から逃げていく。 */
    const worldX = pinch.ox + pinch.cx / pinch.z;
    const worldY = pinch.oy + pinch.cy / pinch.z;
    zs.z = next;
    zs.ox = worldX - cx / next;
    zs.oy = worldY - cy / next;
    clampZoom(zs);
    render();
    syncZoomButtons();
  }

  /* 押しボタンでの拡大。絵の真ん中を保って寄る（ピンチと同じ計算）。 */
  function zoomBy(view, factor) {
    const zs = zoomOf(view);
    const cx = W / 2;
    const cy = H / 2;
    const worldX = zs.ox + cx / zs.z;
    const worldY = zs.oy + cy / zs.z;
    zs.z = clamp(zs.z * factor, ZOOM_MIN, ZOOM_MAX);
    zs.ox = worldX - cx / zs.z;
    zs.oy = worldY - cy / zs.z;
    clampZoom(zs);
    render();
    syncZoomButtons();
  }

  function resetZoom(view) {
    const zs = zoomOf(view);
    zs.z = 1; zs.ox = 0; zs.oy = 0;
    render();
    syncZoomButtons();
  }

  function syncZoomButtons() {
    [["front", els.frontZoom], ["plan", els.planZoom]].forEach(([view, button]) => {
      if (!button) return;
      const zs = zoomOf(view);
      const on = zs.z > 1.01;
      button.hidden = !on;
      button.textContent = `${zs.z.toFixed(1)}× ⟲`;
      if (els.planZoomOut) els.planZoomOut.disabled = zoomOf("plan").z <= ZOOM_MIN + 0.001;
    // 拡大中は、何もない所を掴んで見える場所を動かせる
    if (planCanvas) planCanvas.dataset.pannable = zoomOf("plan").z > 1.001 ? "true" : "false";
  });
    if (els.planZoomOut) els.planZoomOut.disabled = zoomOf("plan").z <= ZOOM_MIN + 0.001;
    // 拡大中は、何もない所を掴んで見える場所を動かせる
    if (planCanvas) planCanvas.dataset.pannable = zoomOf("plan").z > 1.001 ? "true" : "false";
  }

  function onPointerDown(event) {
    closeNoteEditor();
    const el = event.currentTarget;
    const view = viewOf(el);
    if (event.pointerType === "touch") {
      const rect = el.getBoundingClientRect();
      touches.set(event.pointerId, {
        view,
        x: (event.clientX - rect.left) * (W / rect.width),
        y: (event.clientY - rect.top) * (H / rect.height),
      });
      if (touches.size >= 2) { beginPinch(view); return; }
    }
    const L = layout(view);
    const point = pointFromEvent(event);
    el.focus();

    // 閲覧中の一指タップでは駒・明かり・背景を変更しない。付箋モードだけ下へ通す。
    // 二指ピンチはこの分岐より前に始まるので、図の確認用拡大は利用できる。
    if (phoneViewerActive && tool !== "note") return;

    /* 自由矢印は正面図でだけ描く。平面図側では下の「動かす」と同じ分岐へ通し、
     * 既存の駒操作を変えない。Alt（option）クリックは線を増やさず一本だけ消す。 */
    if (tool === "arrow" && view === "front") {
      if (event.altKey) {
        const index = arrowAt(point, L, view);
        if (index >= 0) {
          checkpoint();
          sc().arrows.splice(index, 1);
          render();
          persistSoon();
          announce("矢印を1本消しました。");
        }
        return;
      }
      arrowDraft = {
        plane: arrowPlanePref(),
        depth: arrowDepthPref(),
        heads: arrowHeadsPref(),
        color: arrowColorPref(),
        width: 3,
        points: [],
      };
      arrowDraft.points.push(arrowPointFromScreen(point, L, arrowDraft));
      capture(el, event.pointerId);
      el.dataset.dragging = "true";
      pointerAction = {
        kind: "arrow", pointerId: event.pointerId, el, view, moved: false,
        screenPoints: [point],
      };
      render();
      return;
    }

    /* メモ。何もない所を押すと、そこに付箋が生まれてすぐ書ける。
     * すでに貼ってある付箋を押したときは、作らずにそれを掴んで動かす。 */
    if (tool === "note") {
      const existing = noteAt(point, L, view);
      if (existing) { grabNote(existing, point, L, el, event, false); return; }
      checkpoint();
      const note = normalizeNote({
        view,
        x: clamp(point.x + 16, 8, W - NOTE_W - 8),
        y: clamp(point.y - 34, 8, H - 60),
        text: "",
      });
      sc().notes.push(note);
      grabNote(note, point, L, el, event, true);
      persistSoon();
      return;
    }

    /* 動線を引く。平面図で駒を掴んで、離した所が行き先になる。
     * 曲がり具合は真ん中に置いて直線から始める。あとから掴んで曲げられる。 */
    if (tool === "route") {
      if (view !== "plan") {
        announce("動線は平面図で引きます。");
        return;
      }
      const hit = hitTest(point, L);
      if (!hit) { announce("動かしたい演者・物・明かりを掴んでください。"); return; }
      selectedId = hit.id;
      checkpoint();
      hit.route = { u: hit.u, v: hit.v, bu: hit.u, bv: hit.v };
      capture(el, event.pointerId);
      el.dataset.dragging = "true";
      pointerAction = {
        kind: "route", pointerId: event.pointerId, id: hit.id, el, view,
        moved: true, handle: "end", fromRouteTool: true,
      };
      updateInspector();
      render();
      return;
    }

    /* 明かりを動かす。灯体の印を掴めば出どころが、明るい輪を掴めば当たる場所が動く。
     * 二つを別々に動かせないと、斜めの明かりも、下から上への明かりも作れない。 */
    if (tool === "light") {
      const fixture = fixtureAt(point, L);
      if (fixture) {
        selectedId = fixture.id;
        selectedNoteId = null;
        capture(el, event.pointerId);
        el.dataset.dragging = "true";
        pointerAction = {
          kind: "beam", pointerId: event.pointerId, id: fixture.id, el, view,
          before: snapshot(), moved: false,
        };
        updateInspector();
        render();
        return;
      }
      const hit = hitTest(point, L);
      selectedId = hit ? hit.id : null;
      selectedNoteId = null;
      updateInspector();
      render();
      if (!hit) return;
      // 錠が掛かった明かりは hitTest がもう返さない（当たり判定ごと素通し）
      const at = beamTarget(hit, placePiece(hit, L), L);
      capture(el, event.pointerId);
      el.dataset.dragging = "true";
      /* 真上から落としている明かりは、灯体と当たる場所が同じ真上・真下にある。
       * この状態で当たる場所だけ動かすと、掴むたびに勝手に斜めになる。
       * 真下に落ちているあいだは、灯体も一緒に連れて動かす。 */
      const b = hit.beam;
      const linked = Math.abs(b.u - hit.u) < 0.005 && Math.abs(b.v - hit.v) < 0.005;
      pointerAction = {
        kind: "drag", pointerId: event.pointerId, id: hit.id, el, view,
        offsetX: point.x - at.x, offsetY: point.y - at.y,
        before: snapshot(), moved: false, linked,
        startU: hit.u, startV: hit.v,
      };
      return;
    }

    if (tool === "select" || (tool === "arrow" && view === "plan")) {
      // メモは絵の一番上に乗っているので、駒より先に拾う
      const note = noteAt(point, L, view);
      if (note) { grabNote(note, point, L, el, event, false); return; }
      /* 背景スクリーンの文字。舞台の奥に映っているものなので、
         駒より後ろ＝メモの次、駒より先に拾う（駒に隠れて掴めないと直せない）。 */
      const stext = screenTextAt(point, L);
      if (stext) {
        selectedTextId = stext.id;
        selectedNoteId = null;
        const rect = backdropRect(L);
        capture(el, event.pointerId);
        el.dataset.dragging = "true";
        pointerAction = {
          kind: "screentext", pointerId: event.pointerId, id: stext.id, el, view,
          before: snapshot(), moved: false, rect,
          offsetU: (point.x - (rect.x + stext.u * rect.w)) / rect.w,
          offsetV: (point.y - (rect.y + stext.v * rect.h)) / rect.h,
        };
        renderScreenTexts();
        syncScreenTextControls();
        render();
        return;
      }
      selectedNoteId = null;
      // 選んでいる駒の動線の取っ手は、駒そのものより先に拾う
      const current = selectedPiece();
      let handle = view === "plan" ? routeHandleAt(point, current, L) : null;
      let already = false;
      /* はけの自動動線の取っ手。掴んだ瞬間に piece.route へ実体化して、
         袖のどちら側・どの深さへはけるかを手で決められる（本人の指定）。
         checkpoint は実体化の前に一度だけ（掴む→戻す、で線ごと消える）。 */
      if (!handle && view === "plan" && current && !current.route) {
        const auto = exitRouteFor(current, nextSceneOf(sc()));
        const grabbed = auto ? routeHandleAtFor(point, current, auto, L) : null;
        if (grabbed) {
          checkpoint();
          already = true;
          current.route = auto;
          handle = grabbed;
        }
      }
      if (handle) {
        if (!already) checkpoint();
        capture(el, event.pointerId);
        el.dataset.dragging = "true";
        pointerAction = { kind: "route", pointerId: event.pointerId, id: current.id, el, view, moved: true, handle };
        return;
      }
      let hit = hitTest(point, L);
      /* 舞台裏の演者を掴んだら、その場でこのシーンへ出して、そのまま掴んで動かす。
         袖から舞台へ引き入れる手つきが、そのまま「出す」操作になる。 */
      if (!hit && view === "plan") {
        const ghost = ghostAt(point, L);
        if (ghost) {
          checkpoint();
          const piece = normalizePiece({
            id: nextId(), type: "performer", castId: ghost.member.id,
            u: ghost.u, v: ghost.v, size: 100,
            color: ghost.member.color || state.pieceColor, name: "",
          }, 0);
          sc().pieces.push(piece);
          renderCast();
          renderScenes();
          announce(`${ghost.member.name}を舞台へ出しました。`);
          hit = piece;
        }
      }
      selectedId = hit ? hit.id : null;
      updateInspector();
      render();
      if (!hit) {
        /* 平面図を拡大しているときは、何もない所を掴むと見える場所が動く。
           等倍では全体が見えているので、掴んでも何も起きない。 */
        if (view === "plan" && zoomOf("plan").z > 1.001) {
          const rect = el.getBoundingClientRect();
          const zs = zoomOf("plan");
          capture(el, event.pointerId);
          el.dataset.dragging = "true";
          pointerAction = {
            kind: "planpan", pointerId: event.pointerId, el, view,
            sx: event.clientX, sy: event.clientY, ox: zs.ox, oy: zs.oy,
            k: (W / rect.width) / zs.z,
          };
          return;
        }
        // 舞台が一度に入らない席では、何もない所を掴むと視線を左右に振れる
        if (view === "front" && (L.panRange > 0 || L.panRangeY > 0)) {
          capture(el, event.pointerId);
          el.dataset.dragging = "true";
          pointerAction = {
            kind: "pan", pointerId: event.pointerId, el, view,
            startX: point.x, startY: point.y,
            startPan: state.frontPan || 0, startPanY: state.frontPanY || 0,
            range: L.panRange,
          };
        }
        return;
      }
      /* 錠が掛かっているものは hitTest がもう返さない（当たり判定ごと素通し、
         本人の指定）。外す口は「出るもの」の一覧にある。 */
      const pos = placePiece(hit, L);
      capture(el, event.pointerId);
      el.dataset.dragging = "true";
      pointerAction = {
        kind: "drag", pointerId: event.pointerId, id: hit.id, el, view,
        offsetX: point.x - pos.x, offsetY: point.y - pos.y,
        before: snapshot(), moved: false,
        startU: hit.u, startV: hit.v,
      };
      return;
    }

    // 背景の塗りは正面図だけ（平面図に背景面は無い）
    if (view === "plan") {
      announce("背景の塗りは正面図で行います。");
      return;
    }

    if (!onBackdrop(point, L)) {
      announce("背景の枠内から塗り始めてください。");
      return;
    }
    const rect = backdropRect(L);
    checkpoint();
    const stroke = {
      color: state.paintColor,
      width: state.brushSize,
      erase: tool === "erase",
      points: [{ u: (point.x - rect.x) / rect.w, v: (point.y - rect.y) / rect.h }],
    };
    sc().strokes.push(stroke);
    capture(el, event.pointerId);
    pointerAction = { kind: "stroke", pointerId: event.pointerId, stroke, el, view, moved: true };
    render();
  }

  /* 手の形で「掴める」を伝える。写真の道具と同じ作法。
   * 触っているものを毎回当てて決めるので、駒の上と何もない所で形が変わる。 */
  function cursorFor(el, event) {
    if (pointerAction) return "grabbing";
    if (tool === "paint") return "crosshair";
    if (tool === "erase") return "cell";
    const view = viewOf(el);
    const L = layout(view);
    const point = pointFromEvent(event);
    if (tool === "arrow" && view === "front") {
      return event.altKey && arrowAt(point, L, view) >= 0 ? "not-allowed" : "crosshair";
    }
    if (tool === "note") return noteAt(point, L, view) ? "grab" : "copy";
    if (tool === "route") return hitTest(point, L) ? "crosshair" : "default";
    if (tool === "light") {
      if (fixtureAt(point, L)) return "grab";
      return hitTest(point, L) ? "grab" : "default";
    }
    // 動かす道具。メモ→スクリーンの文字→動線の取っ手→駒→（何もなければ）視線を振る
    if (noteAt(point, L, view)) return "grab";
    if (screenTextAt(point, L)) return "grab";
    const current = selectedPiece();
    if (view === "plan" && routeHandleAt(point, current, L)) return "grab";
    // はけの自動動線の取っ手にも指の形を出す（掴めば実体化する）
    if (view === "plan" && current && !current.route) {
      const auto = exitRouteFor(current, nextSceneOf(sc()));
      if (auto && routeHandleAtFor(point, current, auto, L)) return "grab";
    }
    // 錠が掛かったものは hitTest が返さないので、指の形も変わらない
    const hit = hitTest(point, L);
    if (hit) return "grab";
    if (view === "plan" && ghostAt(point, L)) return "grab";
    if (view === "front" && (L.panRange > 0 || L.panRangeY > 0)) return "grab";
    if (view === "plan" && zoomOf("plan").z > 1.001) return "grab";
    return "default";
  }

  function onHover(event) {
    if (event.pointerType === "touch") return;
    const el = event.currentTarget;
    let next = "default";
    try { next = cursorFor(el, event); } catch (_) { next = "default"; }
    if (el.dataset.cursor !== next) {
      el.dataset.cursor = next;
      el.style.cursor = next;
    }
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch" && touches.has(event.pointerId)) {
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      touches.set(event.pointerId, {
        view: viewOf(el),
        x: (event.clientX - rect.left) * (W / rect.width),
        y: (event.clientY - rect.top) * (H / rect.height),
      });
      if (pinch) { movePinch(viewOf(el)); return; }
    }
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const L = layout(pointerAction.view);
    const point = pointFromEvent(event);

    if (pointerAction.kind === "arrow") {
      if (!arrowDraft || arrowDraft.points.length >= 400) return;
      const points = pointerAction.screenPoints;
      const previous = points[points.length - 1];
      // 拡大中も実際の画面で4pxごとになるよう、表示倍率を掛けて測る。
      if (Math.hypot(point.x - previous.x, point.y - previous.y) * zoomOf(pointerAction.view).z >= 4) {
        points.push(point);
        arrowDraft.points.push(arrowPointFromScreen(point, L, arrowDraft));
        pointerAction.moved = true;
        render();
      }
      return;
    }

    if (pointerAction.kind === "planpan") {
      const zs = zoomOf("plan");
      zs.ox = pointerAction.ox - (event.clientX - pointerAction.sx) * pointerAction.k;
      zs.oy = pointerAction.oy - (event.clientY - pointerAction.sy) * pointerAction.k;
      clampZoom(zs);
      render();
      return;
    }

    if (pointerAction.kind === "pan") {
      // 掴んだ絵がついてくる向き。右へ引けば舞台の下手側が、下へ引けば上の方が見えてくる
      if (pointerAction.range > 0) {
        const moved = (point.x - pointerAction.startX) / pointerAction.range;
        state.frontPan = clamp(pointerAction.startPan + moved, -1, 1);
      }
      // 上下は首の角度。画面の高さいっぱいの引きで、振れる角度いっぱいになる
      const dy = point.y - pointerAction.startY;
      state.frontPanY = clamp(pointerAction.startPanY + dy / (H * 0.55), -1, 1);
      render();
      return;
    }

    if (pointerAction.kind === "route") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece || !piece.route) return;
      const next = fromScreen(point.x, point.y, L);
      if (pointerAction.handle === "end") {
        // 行き先を動かすあいだは、曲がり具合を真ん中に保って直線のままにする
        const straight = piece.route.bu === (piece.u + piece.route.u) / 2
          && piece.route.bv === (piece.v + piece.route.v) / 2;
        piece.route.u = next.u;
        piece.route.v = next.v;
        if (straight || pointerAction.fresh !== false) {
          piece.route.bu = (piece.u + next.u) / 2;
          piece.route.bv = (piece.v + next.v) / 2;
        }
      } else {
        /* 掴んだ所が曲線の真ん中を通るように control 点を置く。
         * 二次曲線の t=0.5 は control 点そのものではなく、
         * 始点・control・終点の平均に寄るので、その分を戻す。 */
        piece.route.bu = clamp(2 * next.u - (piece.u + piece.route.u) / 2, -0.2, 1.2);
        piece.route.bv = clamp(2 * next.v - (piece.v + piece.route.v) / 2, -0.2, 1.2);
      }
      render();
      return;
    }

    if (pointerAction.kind === "note") {
      const note = (sc().notes || []).find((candidate) => candidate.id === pointerAction.id);
      if (!note) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      const x = finite(point.x - pointerAction.offsetX, note.x);
      const y = finite(point.y - pointerAction.offsetY, note.y);
      if (note.pieceId) {
        const piece = sc().pieces.find((candidate) => candidate.id === note.pieceId);
        const at = piece ? placePiece(piece, L) : { x: 0, y: 0 };
        note.x = x - at.x;
        note.y = y - at.y;
      } else {
        note.x = clamp(x, -60, W - 40);
        note.y = clamp(y, -20, H - 30);
      }
      render();
      return;
    }

    if (pointerAction.kind === "screentext") {
      const t = (sc().screenTexts || []).find((x) => x.id === pointerAction.id);
      if (!t) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      const rect = pointerAction.rect;
      t.u = clamp((point.x - rect.x) / rect.w - pointerAction.offsetU, 0, 1);
      t.v = clamp((point.y - rect.y) / rect.h - pointerAction.offsetV, 0, 1);
      render();
      return;
    }

    if (pointerAction.kind === "beam") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
      }
      /* 灯体は宙にあるので、画面の点をそのまま床の座標に読み替えると
       * 高さのぶんだけ奥へずれる。持ち上げたぶんを戻してから読む
       * （raiseRaw の逆算。天井に付いた灯体は縦で奥行きが決まらないので横だけ動かす）。 */
      const b = piece.beam;
      let x = point.x;
      let y = point.y;
      if (!L.plan) {
        const k = (b.h || 0) / (L.size.height || 8);
        if (Math.abs(1 - k) > 0.05) {
          y = L.tilt((L.untilt(point.y) - L.rawCeilY * k) / (1 - k));
        } else {
          y = place(b.u, b.v, L).y;
        }
      }
      const next = fromScreen(x, y, L);
      // 組の明かりは一体で動く。灯体を掴んでも組ごと平行移動する
      const group = lightGroupOf(piece);
      if (group) {
        moveLightGroup(group, next.u - b.u, next.v - b.v);
      } else {
        b.u = next.u;
        b.v = next.v;
      }
      render();
      return;
    }

    if (pointerAction.kind === "drag") {
      const piece = sc().pieces.find((candidate) => candidate.id === pointerAction.id);
      if (!piece) return;
      if (!pointerAction.moved) {
        recordBefore(pointerAction.before);
        pointerAction.moved = true;
        bringToTop(piece);   // 動かしたものが、重なった相手の上に乗る
      }
      let px = point.x - pointerAction.offsetX;
      let py = point.y - pointerAction.offsetY;
      if (piece.type === "light" && !L.plan && piece.beam && piece.beam.toH) {
        // 宙で受けている明かりは、その高さのぶんを戻してから床の座標に読む（raiseRawの逆算）
        const k2 = piece.beam.toH / (L.size.height || 8);
        if (Math.abs(1 - k2) > 0.05) {
          py = L.tilt((L.untilt(py) - L.rawCeilY * k2) / (1 - k2));
        } else {
          py = placePiece(piece, L).y;
        }
      }
      const next = fromScreen(px, py, L);
      // 組の明かりは一体で動く。どの一つを掴んでも組ごと平行移動する
      const dragGroup = piece.type === "light" ? lightGroupOf(piece) : null;
      if (dragGroup) {
        moveLightGroup(dragGroup, next.u - piece.u, next.v - piece.v);
        render();
        return;
      }
      piece.u = next.u;
      piece.v = next.v;
      // 真下に落ちている明かりは、灯体もついてくる
      if (pointerAction.linked && piece.type === "light" && piece.beam) {
        piece.beam.u = next.u;
        piece.beam.v = next.v;
      }
      render();
      return;
    }

    const rect = backdropRect(L);
    if (!rect) return;
    const bounded = {
      u: clamp((point.x - rect.x) / rect.w, 0, 1),
      v: clamp((point.y - rect.y) / rect.h, 0, 1),
    };
    const points = pointerAction.stroke.points;
    const previous = points[points.length - 1];
    if (Math.hypot((bounded.u - previous.u) * rect.w, (bounded.v - previous.v) * rect.h) >= 3) {
      points.push(bounded);
      render();
    }
  }

  function onKeyDown(event) {
    const note = selectedNote();
    if (note && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      removeNote(note.id);
      return;
    }
    if (phoneViewerActive) return;
    const piece = selectedPiece();
    if (!piece) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSelected();
      return;
    }
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!moves[event.key]) return;
    event.preventDefault();
    if (isLocked(piece)) {
      announce(`${pieceLabel(piece)}には錠が掛かっています。`);
      return;
    }
    checkpoint();
    const amount = event.shiftKey ? 0.05 : 0.016;
    bringToTop(piece);   // 動かしたものが、重なった相手の上に乗る
    const kb = planBounds();
    const wasU = piece.u;
    const wasV = piece.v;
    piece.u = clamp(piece.u + moves[event.key][0] * amount, kb.uMin, kb.uMax);
    // 上キーで画面の上＝奥へ。正面図でも平面図でも同じ向きになる
    piece.v = clamp(piece.v + moves[event.key][1] * amount, kb.vMin, kb.vMax);
    syncRouteFromPrev(piece, wasU, wasV);
    render();
    persistSoon();
  }

  let facingWheelDelta = 0;
  let facingWheelLastAt = 0;
  let facingWheelContext = "";
  let facingWheelCheckpointed = false;
  const facingLockNotices = new Set();

  function resetFacingWheelGesture() {
    facingWheelDelta = 0;
    facingWheelLastAt = 0;
    facingWheelContext = "";
    facingWheelCheckpointed = false;
  }

  /* 選んだ駒の上か、その少し外側にカーソルがあるときだけ回す。
   * 選んでいれば絵のどこでも回っていたため、離れた所を送るつもりの
   * スクロールで向きが変わってしまっていた（本人指摘）。 */
  const FACING_WHEEL_PAD = 28;

  function onFacingWheelTarget(event, piece) {
    const el = event.currentTarget || event.target;
    if (!el || !el.getBoundingClientRect) return false;
    const L = layout(viewOf(el));
    const point = pointFromEvent(event);
    const b = selectionBounds(piece, L);
    if (!b) return false;
    return point.x >= b.x - FACING_WHEEL_PAD && point.x <= b.x + b.w + FACING_WHEEL_PAD
      && point.y >= b.y - FACING_WHEEL_PAD && point.y <= b.y + b.h + FACING_WHEEL_PAD;
  }

  function onFacingWheel(event) {
    const piece = selectedPiece();
    if (!piece || (piece.type !== "performer" && !SOLID_TYPES[piece.type])) return;
    // 近くに居ないうちは、向きロックの知らせも出さずに素通しする
    if (!onFacingWheelTarget(event, piece)) return;
    const scene = sc();
    if (scene.facingLock) {
      if (!facingLockNotices.has(scene.id)) {
        facingLockNotices.add(scene.id);
        announce("向きロック中です");
      }
      return;
    }

    const now = performance.now();
    const context = `${scene.id}:${piece.id}`;
    if (context !== facingWheelContext || now - facingWheelLastAt >= 600) {
      facingWheelDelta = 0;
      facingWheelCheckpointed = false;
      facingWheelContext = context;
    }
    facingWheelLastAt = now;
    facingWheelDelta += Number(event.deltaY) || 0;
    /* ノッチに満たない細かいdeltaも消費する。ここで素通しすると、
     * 回転の合間にページが一緒にスクロールしてしまう（実際に起きた）。 */
    event.preventDefault();
    // 1ノッチ=±20。40では回りが鈍かったので半分にした（2026-08-16 本人指定）
    const notches = Math.trunc(Math.abs(facingWheelDelta) / 20) * Math.sign(facingWheelDelta);
    if (!notches) return;

    if (!facingWheelCheckpointed) {
      checkpoint();
      facingWheelCheckpointed = true;
    }
    facingWheelDelta -= notches * 20;
    const amount = event.shiftKey ? 5 : 15;
    // 平面図は向きを負角で描くため、下スクロールは値を引くと見た目が時計回りになる
    piece.facing = (((Number(piece.facing) || 0) - notches * amount) % 360 + 360) % 360;
    if (els.pieceFacing) {
      const deg = piece.facing > 180 ? piece.facing - 360 : piece.facing;
      els.pieceFacing.value = String(deg);
    }
    if (els.facingValue) els.facingValue.textContent = facingLabel(piece.facing);
    render();
    persistSoon();
  }

  [canvas, planCanvas].filter(Boolean).forEach((el) => {
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onHover);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", finishPointer);
    el.addEventListener("pointercancel", finishPointer);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("wheel", onFacingWheel, { passive: false });
    el.addEventListener("dblclick", (event) => {
      if (tabletPwaActive || phoneViewerActive) event.preventDefault();
    });
  });

  document.querySelectorAll("[data-stage-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.stageTool));
  });
  [[els.arrowPlaneFloor, "floor"], [els.arrowPlaneAir, "air"]].forEach(([button, plane]) => {
    if (!button) return;
    button.addEventListener("click", () => {
      prefs.arrowPlane = plane;
      savePrefs();
      syncArrowOptions();
      render();
    });
  });
  if (els.arrowDepth) {
    els.arrowDepth.addEventListener("input", (event) => {
      prefs.arrowDepth = clamp(finite(event.target.value, 0.5), 0, 1);
      savePrefs();
      syncArrowOptions();
      render();
    });
  }
  [[els.arrowHeadOne, "one"], [els.arrowHeadBoth, "both"]].forEach(([button, heads]) => {
    if (!button) return;
    button.addEventListener("click", () => {
      prefs.arrowHeads = heads;
      savePrefs();
      syncArrowOptions();
    });
  });
  if (els.arrowColor) {
    els.arrowColor.addEventListener("input", (event) => {
      prefs.arrowColor = validColor(event.target.value, "#d3ac59");
      savePrefs();
      syncArrowOptions();
    });
  }
  if (els.arrowClear) {
    els.arrowClear.addEventListener("click", () => {
      if (!(sc().arrows || []).length) return;
      checkpoint();
      sc().arrows = [];
      render();
      persistSoon();
      announce("矢印を消しました。");
    });
  }
  // 演者・台・光はすべて、それぞれの一覧から舞台へ出し入れする
  if (els.showFront) {
    els.showFront.addEventListener("change", (e) => setViewShown("front", e.target.checked));
  }
  if (els.showPlan) {
    els.showPlan.addEventListener("change", (e) => setViewShown("plan", e.target.checked));
  }
  /* 実寸の手入力。選んだ規模を土台に、触った値だけ上書きする。
   * 尺は全部ここから引かれるので、変えた瞬間に人も道具も一緒に縮む。 */
  [["venueW", "width"], ["venueD", "depth"], ["venueH", "height"]].forEach(([key, field]) => {
    const input = els[key];
    if (!input) return;
    const apply = () => {
      const size = VENUES.sizeById(venue(), state.project.venueSize);
      const lim = VENUE_LIMITS[field];
      const value = Math.round(clamp(finite(input.value, size[field] || lim[0]), lim[0], lim[1]) * 10) / 10;
      const next = Object.assign({}, state.project.venueDims || {});
      next[field] = value;
      state.project.venueDims = normalizeVenueDims(next, size);
      input.value = String(value);
      renderVenueControls();
      render();
      persistSoon();
    };
    input.addEventListener("change", () => { checkpoint(); apply(); });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    });
  });
  if (els.venueReset) {
    els.venueReset.addEventListener("click", () => {
      if (!state.project.venueDims) return;
      checkpoint();
      state.project.venueDims = null;
      renderVenueControls();
      render();
      persistSoon();
      announce(`${sizeName(venueSize())}の寸法に戻しました。`);
    });
  }

  if (els.venueSelect) {
    els.venueSelect.addEventListener("change", (e) => setVenue(e.target.value));
  }
  window.addEventListener("stage-venue-library-changed", renderVenueControls);
  window.addEventListener("stage-venue-saved", (event) => {
    const saved = event.detail && event.detail.venue;
    if (saved && typeof saved.id === "string") setVenue(saved.id);
  });
  document.querySelectorAll("[data-toggle-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const which = button.dataset.toggleView;
      const open = which === "front" ? state.showFront : state.showPlan;
      setViewShown(which, !open);
      syncViewSwitch();
      syncCanvasResolution();
    });
  });
  /* 道具の説明も畳んでおき、「?」で出す。中央のバーは道具そのものが並ぶ場所なので、
   * 説明が居座ると道具の列が押し出される（項目の説明と同じ扱いにそろえる）。 */
  if (els.toolHelp) {
    els.toolHelp.addEventListener("click", () => {
      const texts = [els.toolHint, ...document.querySelectorAll(".stage-canvas-help")].filter(Boolean);
      const show = texts[0].hidden;
      texts.forEach((el) => { el.hidden = !show; });
      els.toolHelp.setAttribute("aria-pressed", String(show));
    });
  }

  if (els.frontZoom) els.frontZoom.addEventListener("click", () => resetZoom("front"));
  if (els.planZoom) els.planZoom.addEventListener("click", () => resetZoom("plan"));

  /* 正面と平面の出し分け。狭い画面では二つ並べると絵が小さくなるので、
   * タップで一枚ずつ見られるようにする。 */
  document.querySelectorAll("[data-show-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const which = button.dataset.showView;
      if (which === "both") { state.showFront = true; state.showPlan = true; }
      else { state.showFront = which === "front"; state.showPlan = which === "plan"; }
      applyLayout();
      syncViewSwitch();
      render();
      persistSoon();
    });
  });

  function syncViewSwitch() {
    document.querySelectorAll("[data-show-view]").forEach((button) => {
      const which = button.dataset.showView;
      const on = which === "both"
        ? (state.showFront && state.showPlan)
        : (which === "front" ? state.showFront && !state.showPlan : state.showPlan && !state.showFront);
      button.setAttribute("aria-pressed", String(on));
    });
  }

  const swapBtn = document.getElementById("stage-swap-center");
  if (swapBtn) swapBtn.addEventListener("click", swapCenter);

  if (els.showNames) {
    els.showNames.addEventListener("change", (e) => {
      state.showNames = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "演者名を出しました。" : "演者名を隠しました。");
    });
  }
  if (els.showSetNames) {
    els.showSetNames.addEventListener("change", (e) => {
      state.showSetNames = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "装置名を出しました。" : "装置名を隠しました。");
    });
  }
  if (els.showLightNames) {
    els.showLightNames.addEventListener("change", (e) => {
      state.showLightNames = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "照明名を出しました。" : "照明名を隠しました。");
    });
  }
  if (els.showSeatMap) {
    els.showSeatMap.addEventListener("change", (e) => {
      state.showSeatMap = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? "見る位置の図を出しました。" : "見る位置の図を隠しました。");
    });
  }
  if (els.piecePose) els.piecePose.addEventListener("click", openPoseModal);
  if (els.showsOpen) els.showsOpen.addEventListener("click", openShows);
  if (els.showNew) els.showNew.addEventListener("click", newShow);
  if (els.showsClose) els.showsClose.addEventListener("click", closeShows);
  if (els.showsBackdrop) els.showsBackdrop.addEventListener("click", closeShows);
  if (els.sceneGridOpen) els.sceneGridOpen.addEventListener("click", openSceneGrid);
  if (els.sceneFoldAll) {
    els.sceneFoldAll.addEventListener("click", () => {
      const sections = state.project.scenes.filter((row) => row.kind === "section");
      const hasOpen = sections.some((section) => !state.closedSections[section.id]);
      if (hasOpen) sections.forEach((section) => { state.closedSections[section.id] = true; });
      else state.closedSections = {};
      renderScenes();
      renderSceneGrid();
      persistSoon();
    });
  }
  if (els.sceneGridClose) els.sceneGridClose.addEventListener("click", closeSceneGrid);
  if (els.sceneGridBackdrop) els.sceneGridBackdrop.addEventListener("click", closeSceneGrid);
  if (els.sceneGridFront) els.sceneGridFront.addEventListener("click", () => setSceneGridView("front"));
  if (els.sceneGridPlan) els.sceneGridPlan.addEventListener("click", () => setSceneGridView("plan"));
  if (els.sceneGridSize) {
    els.sceneGridSize.addEventListener("input", (e) => {
      prefs.sceneGridSize = clamp(finite(Number(e.target.value), 220), 150, 420);
      savePrefs();
      applySceneGridSize();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.sceneGridModal && !els.sceneGridModal.hidden) closeSceneGrid();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !wrapPickStartId) return;
    event.preventDefault();
    cancelWrapPick();
  });
  if (els.beatTemplatesOpen) els.beatTemplatesOpen.addEventListener("click", openBeatTemplates);
  if (els.beatTemplatesClose) els.beatTemplatesClose.addEventListener("click", closeBeatTemplates);
  if (els.beatTemplatesBackdrop) els.beatTemplatesBackdrop.addEventListener("click", closeBeatTemplates);
  if (els.poseClose) els.poseClose.addEventListener("click", closePoseModal);
  if (els.poseBackdrop) els.poseBackdrop.addEventListener("click", closePoseModal);
  if (els.pieceFacing) {
    els.pieceFacing.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || (piece.type !== "performer" && !SOLID_TYPES[piece.type])) return;
      piece.facing = ((Number(e.target.value) % 360) + 360) % 360;   // フェーダーは-180〜180
      if (els.facingValue) els.facingValue.textContent = facingLabel(piece.facing);
      render();
    });
  }
  if (els.facingLock) {
    els.facingLock.addEventListener("click", () => {
      const scene = sc();
      if (!scene || scene.kind !== "scene") return;
      checkpoint();
      scene.facingLock = !scene.facingLock;
      resetFacingWheelGesture();
      updateInspector();
      persistSoon();
      announce(scene.facingLock
        ? "向きをロックしました。スクロールでは回りません。"
        : "向きロックを外しました。");
    });
  }
  /* 追加の口は一つ。種類だけ選ばせる。演者と物と光で入り口を分けると、
   * 「これはどこから足すのか」を毎回思い出すことになる。 */
  const addFromRoster = () => {
    if (rosterKind === "performer") { addCastMember(els.rosterName); return; }
    if (rosterKind === "light") { addSetItem("light", els.rosterName, "hang"); return; }
    addSetItem(SET_KINDS[rosterKind] ? rosterKind : "block", els.rosterName);
  };
  if (els.rosterKind) els.rosterKind.addEventListener("click", openKindModal);
  if (els.kindClose) els.kindClose.addEventListener("click", closeKindModal);
  if (els.kindBackdrop) els.kindBackdrop.addEventListener("click", closeKindModal);
  if (els.lightPresetOpen) els.lightPresetOpen.addEventListener("click", () => openLightPresetModal(false));
  if (els.lightIntentPresets) els.lightIntentPresets.addEventListener("click", () => openLightPresetModal(true));
  if (els.lightPresetClose) els.lightPresetClose.addEventListener("click", closeLightPresetModal);
  if (els.lightPresetBackdrop) els.lightPresetBackdrop.addEventListener("click", closeLightPresetModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.lightPresetModal && !els.lightPresetModal.hidden) {
      closeLightPresetModal();
    }
  });
  if (els.rosterAdd) els.rosterAdd.addEventListener("click", addFromRoster);
  const addLight = () => addSetItem("light", els.lightName, els.lightKind && els.lightKind.value);
  if (els.lightAdd) els.lightAdd.addEventListener("click", addLight);
  if (els.lightName) {
    els.lightName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addLight(); }
    });
  }
  if (els.rosterName) {
    els.rosterName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addFromRoster(); }
    });
  }
  // 平面図のバーからも動線の入り切りができる。平面を見ながら手を伸ばす距離を短くする
  if (els.planRoute) {
    els.planRoute.addEventListener("click", () => setTool(tool === "route" ? "select" : "route"));
  }
  // メモは正面にも平面にも貼れるので、入り切りは両方の絵の上に置く
  [els.planNote, els.frontNote].forEach((button) => {
    if (button) button.addEventListener("click", () => setTool(tool === "note" ? "select" : "note"));
  });
  /* 照明の直径。登録した明かりそのものの寸法なので、置いてある全ての場面に効く
   * （「…」の窓と同じ値を、選んだ場所からも触れるようにしたもの）。 */
  if (els.beamDia) {
    els.beamDia.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      const dia = clamp(finite(e.target.value, 4), 0.3, 20);
      const owner = pieceSet(piece);
      if (owner) owner.dims.dia = dia; else piece.dims = Object.assign({}, piece.dims, { dia });
      if (els.beamDiaValue) els.beamDiaValue.textContent = cmText(dia);
      renderLights();
      render();
      persistSoon();
    });
    els.beamDia.addEventListener("pointerdown", checkpoint);
  }
  /* 光の強さ。シーンごとの駒に持つので、場面で明暗を変えられる */
  if (els.beamGlow) {
    els.beamGlow.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.glow = clamp(finite(e.target.value, 100) / 100, 0.1, 1.5);
      if (els.beamGlowValue) els.beamGlowValue.textContent = `${Math.round(piece.glow * 100)}%`;
      render();
      persistSoon();
    });
    els.beamGlow.addEventListener("pointerdown", checkpoint);
  }
  /* 組の操作。直径は組んだときの値に対する倍率、強さは組の全駒へ同じ値 */
  if (els.groupDia) {
    els.groupDia.addEventListener("input", (e) => {
      const piece = selectedPiece();
      const gid = piece ? lightGroupOf(piece) : null;
      if (!gid) return;
      const factor = clamp(finite(e.target.value, 100), 50, 200) / 100;
      groupItems(gid).forEach((t) => {
        if (t.presetDia && t.dims) t.dims.dia = clamp(t.presetDia * factor, 0.3, 20);
      });
      if (els.groupDiaValue) els.groupDiaValue.textContent = `${Math.round(factor * 100)}%`;
      render();
      persistSoon();
    });
    els.groupDia.addEventListener("pointerdown", checkpoint);
  }
  if (els.groupGlow) {
    els.groupGlow.addEventListener("input", (e) => {
      const piece = selectedPiece();
      const gid = piece ? lightGroupOf(piece) : null;
      if (!gid) return;
      const glow = clamp(finite(e.target.value, 100) / 100, 0.1, 1.5);
      groupScenePieces(gid).forEach((p) => { p.glow = glow; });
      if (els.groupGlowValue) els.groupGlowValue.textContent = `${Math.round(glow * 100)}%`;
      render();
      persistSoon();
    });
    els.groupGlow.addEventListener("pointerdown", checkpoint);
  }
  if (els.groupSplit) {
    els.groupSplit.addEventListener("click", () => {
      const piece = selectedPiece();
      const gid = piece ? lightGroupOf(piece) : null;
      if (gid) splitLightGroup(gid);
    });
  }

  /* 光源の左右と奥行き。斜め上から中央へ差し込む明かりは、
   * 灯体を上手奥・下手奥へ振り分けて作る。正面図では差し込む角度が変わる。 */
  [["beamU", "u", "beamUValue", sideText], ["beamV", "v", "beamVValue", depthText]].forEach(
    ([key, field, labelKey, toText]) => {
      const input = els[key];
      if (!input) return;
      input.addEventListener("input", (e) => {
        const piece = selectedPiece();
        if (!piece || piece.type !== "light") return;
        piece.beam[field] = clamp(finite(e.target.value, 0.5), -0.3, 1.3);
        if (els[labelKey]) els[labelKey].textContent = toText(piece.beam[field]);
        render();
        persistSoon();
      });
      input.addEventListener("pointerdown", checkpoint);
    });

  /* 明かりの高さ。灯体を下げて当たる高さを上げれば、下から上への明かりになる。 */
  if (els.beamFrom) {
    els.beamFrom.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.beam.h = clamp(finite(e.target.value, BEAM_DEFAULT_H), 0, BEAM_MAX_H);
      els.beamFromValue.textContent = `${piece.beam.h.toFixed(1)}m`;
      render();
      persistSoon();
    });
    els.beamFrom.addEventListener("pointerdown", checkpoint);
  }
  if (els.beamTo) {
    els.beamTo.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      piece.beam.toH = clamp(finite(e.target.value, 0), 0, BEAM_MAX_H);
      els.beamToValue.textContent = piece.beam.toH < 0.05 ? "床" : `${piece.beam.toH.toFixed(1)}m`;
      render();
      persistSoon();
    });
    els.beamTo.addEventListener("pointerdown", checkpoint);
  }
  if (els.beamReset) {
    els.beamReset.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "light") return;
      checkpoint();
      piece.beam.u = piece.u;
      piece.beam.v = piece.v;
      piece.beam.toH = 0;
      piece.beam.h = BEAM_DEFAULT_H;
      updateInspector();
      render();
      persistSoon();
      announce("真上から床へ落とす明かりに戻しました。");
    });
  }
  if (els.pieceLock) {
    els.pieceLock.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece) return;
      checkpoint();
      const next = !isLocked(piece);
      setLocked(piece, next);
      renderCast();
      renderSets();
      renderLights();
      updateInspector();
      render();
      persistSoon();
      announce(`${pieceLabel(piece)}${next ? "に錠を掛けました。" : "の錠を外しました。"}`);
    });
  }
  if (els.routeClear) {
    els.routeClear.addEventListener("click", () => {
      const piece = selectedPiece();
      if (!piece || !piece.route) return;
      checkpoint();
      piece.route = null;
      updateInspector();
      renderScenes();
      render();
      persistSoon();
      announce("動線を消しました。");
    });
  }
  if (els.openSetInfo) {
    els.openSetInfo.addEventListener("click", () => {
      const piece = selectedPiece();
      const registered = pieceSet(piece);
      if (registered) { openSetInfo(registered.id); return; }
      if (piece && piece.castId) openProfile(piece.castId);
    });
  }
  if (els.setInfoClose) els.setInfoClose.addEventListener("click", closeSetInfo);
  if (els.setInfoBackdrop) els.setInfoBackdrop.addEventListener("click", closeSetInfo);
  if (els.setInfoName) {
    els.setInfoName.addEventListener("input", (e) => {
      const item = currentSetItem();
      if (!item) return;
      item.name = e.target.value.slice(0, 24);
      renderSets();
      renderLights();
      render();
      persistSoon();
    });
  }
  if (els.setInfoKind) {
    els.setInfoKind.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item || item.kind !== "light") return;
      checkpoint();
      item.lightKind = LIGHT_KINDS[e.target.value] ? e.target.value : "hang";
      renderLights();
      persistSoon();
      announce(`${item.name}を${lightKindName(item.lightKind)}にしました。`);
    });
  }
  if (els.setInfoFlown) {
    els.setInfoFlown.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item || !SOLID_TYPES[item.kind]) return;
      checkpoint();
      item.flown = e.target.checked;
      if (item.flown && !(item.dims.lift > 0)) item.dims.lift = 2.5;   // まずは頭より上へ
      openSetInfo(item.id);   // 地上高のつまみを出し直す
      renderSets();
      render();
      persistSoon();
      announce(`${item.name}を${item.flown ? "吊物にしました" : "床置きに戻しました"}。`);
    });
  }
  if (els.setInfoFramed) {
    els.setInfoFramed.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item || item.kind !== "wall") return;
      checkpoint();
      item.framed = e.target.checked;
      render();
      persistSoon();
      announce(`${item.name}を${item.framed ? "フレーム（穴の空いた壁）" : "壁"}にしました。`);
    });
  }
  if (els.setInfoWires) {
    els.setInfoWires.addEventListener("change", (e) => {
      const item = currentSetItem();
      if (!item) return;
      checkpoint();
      item.wires = Number(e.target.value) === 1 ? 1 : 2;
      render();
      persistSoon();
    });
  }
  /* 地上高は「選んだもの」からも触れる。吊り位置は場面の中で動くものなので、
   * 一覧の窓を開き直さずに合わせられた方がよい（値は登録側に効く）。 */
  if (els.pieceLift) {
    els.pieceLift.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || !isFlown(piece)) return;
      const value = clamp(finite(e.target.value, 2.5), 0, 10);
      const owner = pieceSet(piece);
      const dims = owner ? owner.dims : piece.dims;
      if (dims) dims.lift = value;
      if (els.pieceLiftValue) els.pieceLiftValue.textContent = cmText(value);
      renderSets();
      render();
      persistSoon();
    });
    els.pieceLift.addEventListener("pointerdown", checkpoint);
  }
  if (els.pieceSeri) {
    els.pieceSeri.addEventListener("input", (e) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "seri") return;
      const previous = clamp(finite(piece.seriH, 0), 0, 4);
      const value = clamp(finite(e.target.value, 0), 0, 4);
      piece.seriH = value;
      if (els.pieceSeriValue) els.pieceSeriValue.textContent = cmText(value);
      render();
      updateInspector();
      if (previous <= 0.02 && value > 0.02) {
        const straddling = seriStraddlers(sc().pieces, venueSize())
          .filter((entry) => entry.seri === piece)
          .map((entry) => entry.piece)
          .filter((item, index, all) => all.indexOf(item) === index);
        if (straddling.length) {
          const shownNames = straddling.slice(0, 3).map((item) => pieceLabel(item));
          const others = straddling.length > 3 ? `、ほか${straddling.length - 3}件` : "";
          announce(`せりの縁をまたぐものがあります: ${shownNames.join("、")}${others}（上がると落ちます）`);
        }
      }
      persistSoon();
    });
    els.pieceSeri.addEventListener("pointerdown", checkpoint);
  }
  if (els.showFlown) {
    els.showFlown.addEventListener("change", (e) => {
      state.showFlown = e.target.checked;
      render();
      persistSoon();
      announce(state.showFlown ? "平面にも吊物を出します。" : "平面では吊物を隠します。");
    });
  }
  if (els.frontLights) {
    els.frontLights.addEventListener("change", (e) => {
      state.showLightsFront = e.target.checked;
      render();
      persistSoon();
      announce(state.showLightsFront ? "正面の照明を点けました。" : "正面の照明を消しました。");
    });
  }
  if (els.frontLightIntent) {
    els.frontLightIntent.addEventListener("change", (e) => {
      state.showLightIntent = e.target.checked;
      persistSoon();
      render();
      announce(state.showLightIntent
        ? "光の意図を図に重ねました。作図の印で、本番の見え方ではありません。"
        : "光の意図の重ねを消しました。");
    });
  }
  if (els.planLights) {
    els.planLights.addEventListener("change", (e) => {
      state.showLightsPlan = e.target.checked;
      render();
      persistSoon();
      announce(state.showLightsPlan ? "平面の照明を出しました。" : "平面の照明を隠しました。");
    });
  }
  [["planRoutesCast", "showRoutesCast", "演者の動線"],
   ["planRoutesLight", "showRoutesLight", "照明の動線"],
   ["planRoutesSet", "showRoutesSet", "装置の動線"]].forEach(([key, field, word]) => {
    if (!els[key]) return;
    els[key].addEventListener("change", (e) => {
      state[field] = e.target.checked;
      render();
      persistSoon();
      announce(e.target.checked ? `${word}を出しました。` : `${word}を隠しました。引いた線は消えていません。`);
    });
  });
  if (els.setInfoColor) {
    els.setInfoColor.addEventListener("input", (e) => {
      const item = currentSetItem();
      if (!item) return;
      item.color = e.target.value;
      state.project.scenes.forEach((scene) => {
        scene.pieces.forEach((piece) => {
          if (piece.setId === item.id) piece.color = item.color;
        });
      });
      renderSets();
      renderLights();
      render();
      persistSoon();
    });
  }
  if (els.setInfoNote) {
    els.setInfoNote.addEventListener("input", (e) => {
      const item = currentSetItem();
      if (item) { item.note = e.target.value.slice(0, 200); persistSoon(); }
    });
  }
  if (els.scenePrev) els.scenePrev.addEventListener("click", () => stepScene(-1));
  if (els.sceneNext) els.sceneNext.addEventListener("click", () => stepScene(1));
  if (els.presentPrev) els.presentPrev.addEventListener("click", () => stepScene(-1));
  if (els.presentNext) els.presentNext.addEventListener("click", () => stepScene(1));
  if (els.presentClose) els.presentClose.addEventListener("click", exitPseudoPresentation);
  if (els.fpvOpen) {
    els.fpvOpen.addEventListener("click", () => {
      const piece = selectedPiece();
      const fpv = window.SHOSAI_STAGE_FPV;
      if (!piece || piece.type !== "performer" || !fpv) return;
      fpv.open({
        initialPieceId: piece.id,
        read: () => {
          const current = sc();
          const rows = state.project.scenes;
          const at = rows.indexOf(current);
          const scenes = rows.filter((row) => row.kind === "scene");
          const size = venueSize();
          refreshBases(size);
          let actTitle = "";
          for (let index = at - 1; index >= 0; index -= 1) {
            if (rows[index].kind === "section" && rows[index].depth < current.depth) {
              actTitle = rows[index].title || "";
              break;
            }
          }
          return {
            pieces: current.pieces.map((candidate) => ({ ...candidate, dims: pieceDims(candidate) })),
            showTitle: state.project.title || "",
            sceneTitle: current.title || "",
            actTitle,
            sceneIndex: scenes.indexOf(current),
            sceneCount: scenes.length,
            venue: { width: size.width, depth: size.depth, height: size.height, type: state.project.venue },
            lang,
          };
        },
        heightMOf: (candidate) => pieceHeightM(candidate) * (candidate.size / 100),
        labelOf: pieceLabel,
        stepScene,
        onClose: () => els.fpvOpen.focus(),
      });
    });
  }
  if (els.animScenes) {
    els.animScenes.addEventListener("change", (e) => {
      state.animateScenes = e.target.checked;
      if (!state.animateScenes) { stopSceneAnim(); render(); }
      if (els.animMs) els.animMs.disabled = !state.animateScenes;
      persistSoon();
      announce(state.animateScenes ? "アニメーションを入れました。" : "アニメーションを切りました。");
    });
  }

  if (els.animMs) {
    els.animMs.addEventListener("input", (e) => {
      state.sceneAnimMs = clamp(finite(e.target.value, 2) * 1000, 200, 3000);
      if (els.animMsValue) els.animMsValue.textContent = `${(state.sceneAnimMs / 1000).toFixed(1)}秒`;
      persistSoon();
    });
  }

  /* 上下キーで場面を送る。ただし
   *  ・文字を打っている最中は触らない
   *  ・絵の上で駒を選んでいるときは、駒の微調整が先（そちらが既に受け取っている）
   * の二つは守る。 */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (!els.sceneList || !els.sceneList.contains(document.activeElement)) return;
    if (isTyping(event.target)) return;
    const row = document.activeElement && document.activeElement.closest("[data-scene-id]");
    const scene = row && state.project.scenes.find((item) => item.id === row.dataset.sceneId);
    if (!scene) return;
    event.preventDefault();
    shiftSceneDepth(scene, event.key === "ArrowRight" ? 1 : -1);
    // 描き直しで消えたボタンの代わりに同じ行のチップへ戻し、続けて操作できるようにする。
    focusSceneChip(scene.id);
  });

  document.addEventListener("keydown", (event) => {
    /* 左右も同じ送りにする。絵の上の送りが「◀ 前のシーン／次のシーン ▶」と
     * 横に並んでいるので、左右で送れないほうが探しにくい。
     * 先に走る二つ（駒の微調整・一覧での深さ変え）が preventDefault するので、
     * そちらに用があるときはここへ来ない。 */
    const STEPS = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
    if (!STEPS[event.key]) return;
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const view = document.getElementById("view-stage");
    if (!view || view.hidden) return;
    if (isTyping(event.target)) return;
    event.preventDefault();
    stepScene(STEPS[event.key]);
  });

  if (els.sceneAdd) els.sceneAdd.addEventListener("click", () => addScene(false));
  if (els.sceneAddRig) els.sceneAddRig.addEventListener("click", () => addScene(true));
  /* 場面の欄の高さ。下の取っ手を引いて変える。
     ブラウザ既定の掴み手は地の色に沈んで見えないので、自前で持つ。 */
  if (els.sceneResize && els.sceneList) {
    els.sceneResize.addEventListener("pointerdown", (e) => {
      const startY = e.clientY;
      const startH = els.sceneList.getBoundingClientRect().height;
      const move = (ev) => {
        ev.preventDefault();
        const next = clamp(startH + (ev.clientY - startY), 120, window.innerHeight * 0.8);
        els.sceneList.style.height = `${Math.round(next)}px`;
        state.sceneListHeight = Math.round(next);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        persistSoon();
      };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
    });
  }

  if (els.sceneSection) els.sceneSection.addEventListener("click", addSection);
  if (els.rigSave) els.rigSave.addEventListener("click", saveRig);
  if (els.rigName) {
    els.rigName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveRig(); }
    });
  }
  if (els.sceneDup) els.sceneDup.addEventListener("click", duplicateScene);
  if (els.sceneDel) els.sceneDel.addEventListener("click", deleteScene);
  if (els.projectTitle) {
    els.projectTitle.addEventListener("input", (e) => {
      state.project.title = e.target.value.slice(0, 60);
      persistSoon();
    });
  }
  if (els.versionLabel) {
    els.versionLabel.addEventListener("input", (e) => {
      state.project.versionLabel = e.target.value.slice(0, 16);
      persistSoon();
    });
  }
  if (els.versionCopy) els.versionCopy.addEventListener("click", duplicateVersion);
  if (els.exportJson) els.exportJson.addEventListener("click", exportProject);
  if (els.backupExport) els.backupExport.addEventListener("click", exportProject);
  if (els.venueExportInclude) {
    els.venueExportInclude.addEventListener("click", () => {
      closeVenueExportConfirm();
      writeProjectExport(true);
    });
  }
  if (els.venueExportWithout) {
    els.venueExportWithout.addEventListener("click", () => {
      closeVenueExportConfirm();
      writeProjectExport(false);
    });
  }
  [els.venueExportCancel, els.venueExportStop, els.venueExportBackdrop].filter(Boolean)
    .forEach((element) => element.addEventListener("click", closeVenueExportConfirm));
  if (els.rehearsalExportOpen) {
    els.rehearsalExportOpen.addEventListener("click", openRehearsalExport);
  }
  if (els.rehearsalExportClose) {
    els.rehearsalExportClose.addEventListener("click", closeRehearsalExport);
  }
  if (els.rehearsalExportBackdrop) {
    els.rehearsalExportBackdrop.addEventListener("click", closeRehearsalExport);
  }
  if (els.rehearsalApplyDefaults) {
    els.rehearsalApplyDefaults.addEventListener("click", applyRehearsalDefaults);
  }
  if (els.rehearsalAllowUnsupported) {
    els.rehearsalAllowUnsupported.addEventListener("change", refreshRehearsalExport);
  }
  if (els.rehearsalSoundtrack) {
    els.rehearsalSoundtrack.addEventListener("change", () => {
      checkpoint();
      state.project.rehearsal = normalizeProjectRehearsal({
        ...state.project.rehearsal,
        soundtrack: els.rehearsalSoundtrack.value === "bundled-demo" ? "bundled-demo" : null,
      });
      persistSoon();
    });
  }
  if (els.rehearsalExportRun) {
    els.rehearsalExportRun.addEventListener("click", exportRehearsalProject);
  }
  if (els.importJson) {
    els.importJson.addEventListener("change", (e) => {
      importProject(e.target.files && e.target.files[0]);
      e.target.value = "";
    });
  }
  if (els.sizeSelect) {
    els.sizeSelect.addEventListener("change", (e) => setVenueSize(e.target.value));
  }

  document.querySelectorAll("[data-stage-bg]").forEach((button) => {
    button.addEventListener("click", () => {
      if (sc().background === button.dataset.stageBg) return;
      checkpoint();
      sc().background = button.dataset.stageBg;
      els.background.value = sc().background;
      render();
      persistSoon();
    });
  });

  document.querySelectorAll("[data-stage-paint-color]").forEach((button) => {
    button.addEventListener("click", () => {
      state.paintColor = button.dataset.stagePaintColor;
      els.paintColor.value = state.paintColor;
      persistSoon();
    });
  });

  els.paintColor.addEventListener("input", (event) => {
    state.paintColor = event.target.value;
    persistSoon();
  });
  els.brushSize.addEventListener("input", (event) => {
    state.brushSize = Number(event.target.value);
    els.brushValue.textContent = event.target.value;
    persistSoon();
  });

  function beginControlEdit() {
    if (controlBefore === null) controlBefore = snapshot();
  }
  function finishControlEdit() {
    if (controlBefore !== null && controlBefore !== snapshot()) recordBefore(controlBefore);
    controlBefore = null;
    persistSoon();
  }

  [els.background, els.pieceFacing].filter(Boolean).forEach((control) => {
    control.addEventListener("pointerdown", beginControlEdit);
    control.addEventListener("focus", beginControlEdit);
    control.addEventListener("change", finishControlEdit);
    control.addEventListener("blur", () => {
      if (controlBefore !== null) finishControlEdit();
    });
  });

  els.background.addEventListener("input", (event) => {
    sc().background = event.target.value;
    render();
  });
  /* 選んだものの欄は「ショーの中で動くもの」だけを持つ。
   * 名前・色・寸法・身長はショーを通して変わらないので、
   * 演者／舞台セット／照明の一覧側で決める。ここからはそこへ飛べるようにする。 */
  function syncDimControls(piece) {
    const registered = pieceSet(piece);
    const member = piece && piece.castId
      ? state.project.cast.find((c) => c.id === piece.castId) : null;
    const owner = registered || member;
    if (els.dimsFromSet) {
      els.dimsFromSet.hidden = !owner;
      if (owner) {
        els.dimsFromSet.textContent = registered
          ? (isEn()
            ? `Name, colour and size come from \u201c${registered.name}\u201d (${setDimLabel(registered)}).`
            : `名前・色・寸法は「${registered.name}」で決めます（${setDimLabel(registered)}）。`)
          : (isEn()
            ? `Name, colour and height come from \u201c${member.name}\u201d (${member.heightCm}cm).`
            : `名前・色・身長は「${member.name}」で決めます（${member.heightCm}cm）。`);
      }
    }
    if (els.liftControls) {
      const flown = Boolean(piece && isFlown(piece));
      els.liftControls.hidden = !flown;
      if (flown) {
        const lift = flownLift(piece);
        if (document.activeElement !== els.pieceLift) els.pieceLift.value = String(lift);
        if (els.pieceLiftValue) els.pieceLiftValue.textContent = cmText(lift);
      }
    }
    if (els.seriControls) {
      const isSeri = Boolean(piece && piece.type === "seri");
      els.seriControls.hidden = !isSeri;
      if (isSeri) {
        const seriH = clamp(finite(piece.seriH, 0), 0, 4);
        if (document.activeElement !== els.pieceSeri) els.pieceSeri.value = String(seriH);
        if (els.pieceSeriValue) els.pieceSeriValue.textContent = cmText(seriH);
      }
    }
    /* プリセットの組。一体で扱うので、名前は組の名で出し、
       個別の位置スライダーは隠して「直径（全体）と強さ」だけ出す */
    const lgroup = piece && piece.type === "light" ? lightGroupOf(piece) : null;
    if (lgroup && els.selectedName) els.selectedName.textContent = groupTitle(lgroup);
    if (els.groupControls) {
      els.groupControls.hidden = !lgroup;
      if (lgroup) {
        const items = groupItems(lgroup);
        const base = items[0];
        const factor = base && base.presetDia
          ? Math.round((((base.dims && base.dims.dia) || base.presetDia) / base.presetDia) * 100)
          : 100;
        if (els.groupDia && document.activeElement !== els.groupDia) {
          els.groupDia.value = String(clamp(factor, 50, 200));
        }
        if (els.groupDiaValue) els.groupDiaValue.textContent = `${factor}%`;
        const gPct = Math.round(clamp(finite(piece.glow, 1), 0.1, 1.5) * 100);
        if (els.groupGlow && document.activeElement !== els.groupGlow) {
          els.groupGlow.value = String(clamp(gPct, 10, 150));
        }
        if (els.groupGlowValue) els.groupGlowValue.textContent = `${gPct}%`;
      }
    }
    if (els.beamControls) {
      const isLight = Boolean(piece && piece.type === "light") && !lgroup;
      els.beamControls.hidden = !isLight;
      if (isLight) {
        const b = piece.beam || (piece.beam = normalizeBeam(null, piece));
        const dim = pieceDims(piece);
        if (els.beamDia && document.activeElement !== els.beamDia) {
          els.beamDia.value = String((dim && dim.dia) || 4);
        }
        if (els.beamDiaValue) els.beamDiaValue.textContent = cmText((dim && dim.dia) || 4);
        const glowPct = Math.round(clamp(finite(piece.glow, 1), 0.1, 1.5) * 100);
        if (els.beamGlow && document.activeElement !== els.beamGlow) {
          els.beamGlow.value = String(clamp(glowPct, 10, 150));
        }
        if (els.beamGlowValue) els.beamGlowValue.textContent = `${glowPct}%`;
        if (document.activeElement !== els.beamU) els.beamU.value = String(b.u);
        if (document.activeElement !== els.beamV) els.beamV.value = String(b.v);
        if (els.beamUValue) els.beamUValue.textContent = sideText(b.u);
        if (els.beamVValue) els.beamVValue.textContent = depthText(b.v);
        if (document.activeElement !== els.beamFrom) els.beamFrom.value = String(b.h);
        if (document.activeElement !== els.beamTo) els.beamTo.value = String(b.toH);
        els.beamFromValue.textContent = `${b.h.toFixed(1)}m`;
        els.beamToValue.textContent = b.toH < 0.05 ? tm("misc", "floor", "床") : `${b.toH.toFixed(1)}m`;
      }
    }
    if (els.delete) {
      // 明かりを舞台から外すのは「消す」こと。道具立てを片づける話ではない
      const light = Boolean(piece && piece.type === "light");
      els.delete.textContent = light ? "TURN OFF" : tx("舞台から外す");
      els.delete.title = light ? tx("このシーンではこの明かりを消します") : "";
    }
    if (els.routeClear) els.routeClear.hidden = !(piece && piece.route);
    /* ★ここにあった beamDia/beamU/beamV/beamFrom/beamTo/beamReset の
       addEventListener 群は削除した。syncDimControls は選ぶたびに呼ばれるため、
       ここで登録すると同じ聞き手が選ぶたびに積み上がっていた（実害）。
       登録は起動時に一度だけ、初期化部の同名ブロックで行う。 */
  if (els.pieceLock) {
      const locked = isLocked(piece);
      /* 錠は鍵の絵だけ。並ぶボタンが全部同じ長さの文字だと、目が滑って読めない。
       * 何ができるかは、押す前に触れたとき（title）と読み上げで伝える。 */
      els.pieceLock.setAttribute("aria-pressed", String(locked));
      els.pieceLock.textContent = locked ? "🔒" : "🔓";
      const lockWord = locked ? tx("錠を外す") : tx("動かないようにする");
      els.pieceLock.setAttribute("aria-label", lockWord);
      els.pieceLock.title = isEn()
        ? (owner
          ? `${lockWord} (the lock of \u201c${owner.name}\u201d. While locked it will not move in any scene)`
          : `${lockWord} (while locked, dragging will not move it)`)
        : (owner
          ? `${lockWord}（「${owner.name}」の錠。掛けているあいだ、どのシーンでも動きません）`
          : `${lockWord}（掛けているあいだ、掴んでも動きません）`);
    }
    if (els.openSetInfo) {
      els.openSetInfo.hidden = !owner;
      els.openSetInfo.textContent = registered ? tm("misc", "dims", "寸法") : tm("misc", "profile", "身長");
      els.openSetInfo.title = isEn()
        ? (registered ? `Open the size of \u201c${registered.name}\u201d` : (member ? `Open \u201c${member.name}\u201d\u2019s profile` : ""))
        : (registered ? `「${registered.name}」の寸法を開く` : (member ? `「${member.name}」のプロフィールを開く` : ""));
    }
  }



  /* 写真の欄。奥に壁のある劇場でだけ出す（全周形式には貼る面が無い）。
     明るさは描くときに brightness() で掛けるので、元の画は減らさない。 */
  function syncPhotoControls() {
    if (!els.photoBlock) return;
    const wall = Boolean(backdropRect(layout("front")));
    els.photoBlock.hidden = !wall;
    const photo = sc().photo;
    if (els.photoOn) els.photoOn.hidden = !photo;
    if (photo && els.photoBright) {
      els.photoBright.value = String(photo.bright);
      if (els.photoBrightValue) els.photoBrightValue.textContent = `${photo.bright}%`;
      if (els.photoNote) {
        const src = (state.project.photos || {})[photo.id] || "";
        const kb = Math.round(src.length / 1024);
        els.photoNote.textContent = isEn()
          ? `About ${kb} KB, kept in this browser with the show.`
          : `およそ${kb}KB。ショーと一緒にこの端末へ保存されます。`;
      }
    }
  }

  /* 取り込んだ画像は、そのまま持たずに壁の大きさへ縮めて焼き直す。
     ★写真1枚が数MBあると、端末の保存枠（5MB前後）をこれだけで使い切る。 */
  const PHOTO_MAX_W = 1400;
  function loadPhotoFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_W / img.naturalWidth);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const off = document.createElement("canvas");
        off.width = w; off.height = h;
        off.getContext("2d").drawImage(img, 0, 0, w, h);
        const src = off.toDataURL("image/jpeg", 0.82);
        if (src.length > PHOTO_MAX_BYTES) {
          announce("この画像は大きすぎます。もう少し小さいものを選んでください。");
          return;
        }
        checkpoint();
        const store = state.project.photos || (state.project.photos = {});
        // 同じ画をもう一度選んだときは、置き場のものを使い回す
        const already = Object.keys(store).find((key) => store[key] === src);
        const id = already || rid("photo");
        store[id] = src;
        sc().photo = { id, bright: sc().photo ? sc().photo.bright : 100 };
        sweepPhotos(state.project);
        syncPhotoControls();
        render();
        persistSoon();
        announce("背景に写真を貼りました。");
      };
      img.onerror = () => announce("この画像は読み込めませんでした。");
      img.src = String(reader.result || "");
    };
    reader.onerror = () => announce("この画像は読み込めませんでした。");
    reader.readAsDataURL(file);
  }

  if (els.screenTextAdd) els.screenTextAdd.addEventListener("click", addScreenText);
  if (els.screenTextInput) {
    els.screenTextInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addScreenText(); }
    });
  }
  [["screenTextSize", "size", 100, "screenTextSizeValue", (v) => `${Math.round(v * 100)}%`],
   ["screenTextOpacity", "opacity", 100, "screenTextOpacityValue", (v) => `${Math.round(v * 100)}%`],
   ["screenTextAngle", "angle", 1, "screenTextAngleValue", (v) => `${Math.round(v)}°`]].forEach(
    ([key, field, div, labelKey, fmt]) => {
      const input = els[key];
      if (!input) return;
      input.addEventListener("input", (e) => {
        const t = selectedScreenText();
        if (!t) return;
        t[field] = finite(e.target.value, 0) / div;
        if (field === "size") t.size = clamp(t.size, 0.03, 0.9);
        if (field === "opacity") t.opacity = clamp(t.opacity, 0.1, 1);
        if (field === "angle") t.angle = clamp(t.angle, -45, 45);
        if (els[labelKey]) els[labelKey].textContent = fmt(t[field]);
        render();
        persistSoon();
      });
      input.addEventListener("pointerdown", checkpoint);
    });
  if (els.screenTextFont) {
    els.screenTextFont.addEventListener("change", (e) => {
      const t = selectedScreenText();
      if (!t) return;
      checkpoint();
      t.font = SCREEN_FONTS[e.target.value] ? e.target.value : "brush";
      render();
      persistSoon();
    });
  }
  if (els.screenTextColor) {
    els.screenTextColor.addEventListener("input", (e) => {
      const t = selectedScreenText();
      if (!t) return;
      t.color = validColor(e.target.value, "#efe7d6");
      renderScreenTexts();
      render();
      persistSoon();
    });
    els.screenTextColor.addEventListener("pointerdown", checkpoint);
  }
  if (els.screenTextVertical) {
    els.screenTextVertical.addEventListener("change", (e) => {
      const t = selectedScreenText();
      if (!t) return;
      checkpoint();
      t.vertical = e.target.checked;
      render();
      persistSoon();
    });
  }
  if (els.photoFile) {
    els.photoFile.addEventListener("change", (event) => {
      loadPhotoFile(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
  }
  if (els.photoBright) {
    els.photoBright.addEventListener("input", (event) => {
      const photo = sc().photo;
      if (!photo) return;
      photo.bright = clamp(finite(event.target.value, 100), 20, 180);
      if (els.photoBrightValue) els.photoBrightValue.textContent = `${photo.bright}%`;
      render();
      persistSoon();
    });
  }
  if (els.photoClear) {
    els.photoClear.addEventListener("click", () => {
      if (!sc().photo) return;
      checkpoint();
      sc().photo = null;
      sweepPhotos(state.project);
      syncPhotoControls();
      render();
      persistSoon();
      announce("背景の写真を外しました。");
    });
  }

  els.clearPaint.addEventListener("click", () => {
    if (!sc().strokes.length) {
      announce("消す背景の塗りはありません。");
      return;
    }
    checkpoint();
    sc().strokes = [];
    render();
    persistSoon();
    announce("背景の塗りを消しました。");
  });

  els.duplicate.addEventListener("click", duplicateSelected);
  els.delete.addEventListener("click", removeSelected);
  /* 画面に固定で置いてある文言を、まとめて差し替える。
   * 対訳表は日本語そのものを鍵にしているので、元の日本語を各要素へ覚えさせておき、
   * 日本語へ戻すときはそれを書き戻す（訳し戻しの表を持たずに済む）。 */
  function applyLang() {
    /* 文字そのものを差し替える。要素ではなく文字の節（テキストノード）を回すので、
     * 「向き <span>客席</span>」のように中に別の要素を抱えた札も拾える。
     * 元の日本語は節に覚えさせておき、戻すときはそれを書き戻す。 */
    const swapText = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (node.parentNode && node.parentNode.closest("[data-no-i18n]")) return;
        const raw = node.__ja === undefined ? node.nodeValue : node.__ja;
        // HTMLの改行や字下げで空白が入るので、鍵を引くときは詰めてから照らす
        const key = raw.trim().replace(/\s+/g, " ");
        if (!key || !I18N.text[key]) return;
        if (node.__ja === undefined) node.__ja = raw;
        node.nodeValue = isEn() ? I18N.text[key] : raw;
      });
    };
    const swapAttr = (root, attr, store) => {
      root.querySelectorAll(`[${attr}]`).forEach((el) => {
        if (!el.dataset[store]) {
          const now = el.getAttribute(attr);
          if (!now || !now.trim()) return;
          el.dataset[store] = now;
        }
        const ja = el.dataset[store];
        el.setAttribute(attr, isEn() ? (I18N.text[ja.trim()] || ja) : ja);
      });
    };
    const roots = [
      document.getElementById("view-stage"),
      ...document.querySelectorAll(".stage-modal, .stage-present-overlay"),
    ].filter(Boolean);
    // 読み上げや行分けのために、文書そのものの言語も合わせる
    document.documentElement.lang = isEn() ? "en" : "ja";
    roots.forEach((root) => {
      swapText(root);
      swapAttr(root, "placeholder", "jaPh");
      swapAttr(root, "title", "jaTitle");
      swapAttr(root, "aria-label", "jaAria");
    });
    if (els.lang) {
      els.lang.textContent = isEn() ? "日本語" : "EN";
      els.lang.setAttribute("aria-pressed", String(isEn()));
    }
    updateBackupNote();
    document.documentElement.lang = isEn() ? "en" : "ja";
  }

  // 言語を変えると、中で組み立てている名前も作り直す必要がある
  function setLang(next) {
    lang = next === "en" ? "en" : "ja";
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* 保存できなくても動く */ }
    applyLang();
    renderVenueControls();
    renderScenes();
    if (els.sceneGridModal && !els.sceneGridModal.hidden) renderSceneGrid();
    renderCast();
    renderSets();
    renderLights();
    renderRigs();
    selectedTextId = null;
    renderScreenTexts();
    syncScreenTextControls();
    updateInspector();
    setTool(tool);
    render();
  }

  if (els.lang) {
    els.lang.addEventListener("click", () => setLang(isEn() ? "ja" : "en"));
  }

  /* ---------- 使い方の案内 ----------
     読ませるのではなく、7つの場所を順に見せて「何ができるか」を掴んでもらう。
     操作は強制しない（次へはいつでも押せる）。初めて開いたときだけ自動で出し、
     あとは上の「使い方」からいつでも呼べる。
     ★勝手にデータを作らない。いま置いてあるものの上で説明する。 */
  /* ★テスターの感想の送り先。Googleフォームのアドレスをここへ入れる。
   * 空のあいだは、押しても開かず、その旨だけ伝える（黙って何も起きないより良い）。 */
  const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc-ibjOBVL5HbPC9xpjmcD-TTK3VoCmVJiGA6ouCZvGR9rW4Q/viewform";

  const TOUR_KEY = "shosai-stage-tour-v1";

  /* 手を動かしてもらう案内。読ませるより、実際に一場面を作ってもらう。
   * 各段は「やること」を一つだけ持ち、できたら自分で次へ進む。
   * できたかどうかは done() で見る（押した瞬間を捕まえるのではなく、
   * 結果を見に行く。どの入口から操作しても拾えるようにするため）。
   * 次へはいつでも押せるので、詰まっても止まらない。 */
  const tourMark = {};
  const lightCount = () => (state.project.sets || []).filter((x) => x.kind === "light").length;
  const posSum = () => sc().pieces.reduce((t, p) => t + p.u * 1000 + p.v, 0);

  const TOUR = [
    {
      at: "#stage-canvas-stack",
      begin: () => { tourMark.pos = posSum(); },
      done: () => Math.abs(posSum() - tourMark.pos) > 0.5,
      ja: ["まず動かしてみる", "上が客席から見た絵、下が真上から見た図で、同じ舞台です。正面図の演者を掴んで、どこかへ動かしてください。平面図でも一緒に動きます。"],
      en: ["Move something first", "The top is what the house sees; the bottom is the same stage from above. Drag a performer in the front view — it moves in the plan too."],
    },
    {
      at: '[data-panel="cast"]',
      begin: () => { tourMark.cast = (state.project.cast || []).length; },
      done: () => (state.project.cast || []).length > tourMark.cast,
      ja: ["人を足す", "「出るもの」に名前を入れて〈追加〉を押してください。登録するとそのまま舞台に出ます。"],
      en: ["Add a person", "Type a name in Cast & set and press Add. Registering puts them on stage right away."],
    },
    {
      at: "#stage-piece-pose",
      begin: () => { tourMark.pose = sc().pieces.filter((p) => p.type === "performer" && p.pose !== "stand").length; },
      done: () => sc().pieces.filter((p) => p.type === "performer" && p.pose !== "stand").length > tourMark.pose,
      ja: ["姿勢を変える", "いま足した人が選ばれています。〈姿勢〉を押して、30種類から一つ選んでください（宙返り、シルホイール、一輪車など）。"],
      en: ["Change the pose", "The person you just added is selected. Press Pose and pick one of 30 (somersault, Cyr wheel, unicycle and more)."],
    },
    {
      at: "#stage-plan-route",
      lit: "#stage-plan-cell",  // 動線は平面図にしか引けない
      begin: () => { tourMark.route = sc().pieces.filter((p) => p.route).length; },
      done: () => sc().pieces.filter((p) => p.route).length > tourMark.route,
      ja: ["動線を引く", "平面図の〈動線を描く〉を押し、動かしたい人を掴んで、行き先で離してください。矢印が出ます。"],
      en: ["Draw a route", "Press Draw route above the plan, grab the person you want to move, and let go at the destination. An arrow appears."],
    },
    {
      at: '[data-panel="scenes"]',
      begin: () => { tourMark.scenes = state.project.scenes.length; },
      done: () => state.project.scenes.length > tourMark.scenes,
      ja: ["次のシーンを作る", "シーンの欄の〈動線の先へ動かしたシーンを作る〉を押してください。動線の先へ動いた状態が、次のシーンとして作られます。"],
      en: ["Make the next scene", "Press “Make a scene at the end of the routes”. The state after the move becomes the next scene."],
    },
    {
      at: ".stage-scene-move",
      begin: () => { tourMark.scene = state.project.activeSceneId; },
      done: () => state.project.activeSceneId !== tourMark.scene,
      ja: ["転換を見る", "〈◀ 前のシーン〉で戻り、〈次のシーン ▶〉で進んでください（↑↓キーでも動きます）。進むときだけ、動線に沿って動いて見えます。"],
      en: ["Watch the change", "Go back with ◀ Previous and forward with Next ▶ (the ↑↓ keys work too). Moving forward plays the travel along the routes."],
    },
    {
      at: '[data-panel="light"]',
      begin: () => { tourMark.light = lightCount(); },
      done: () => lightCount() > tourMark.light,
      ja: ["照明を足す", "「照明」に名前を入れて〈追加〉。吊り・SS・前明かり・転がしの4種類から選べます。道具を〈照明を動かす〉に替えると、灯体と当たる場所を別々に掴めます。"],
      en: ["Add a light", "Enter a name under Lights and press Add. Four types: overhead, side, front, floor. Switch the tool to Move lights to drag the fixture and the pool separately."],
    },
    {
      at: "#stage-front-note",
      lit: "#stage-front-cell",  // 案内しているのは正面の〈メモ〉
      begin: () => { tourMark.notes = (sc().notes || []).length; },
      done: () => (sc().notes || []).length > tourMark.notes,
      ja: ["メモを貼る", "〈メモ〉を押して、絵の何もない所を押してください。付箋が出て、その場で書けます。演者の脇でも、床の上でも。書き出した画像にも残ります。"],
      en: ["Pin a note", "Press Note, then press an empty spot on the picture. A sticky note appears and you can type right there. It stays in the exported image."],
    },
    {
      at: "#stage-export",
      ja: ["持ち出す", "〈画像を書き出す〉で、正面・平面・全シーンを画像にできます。作ったものはこの端末のブラウザにだけ保存されます。以上です、あとは自由に。"],
      en: ["Take it with you", "Export image saves the front view, the plan, or every scene. Your work lives only in this browser. That's it — go ahead."],
    },
  ];

  let tourAt = -1;
  let tourTimer = null;


  function tourTarget(step) {
    const el = document.querySelector(step.at);
    return el && el.offsetParent !== null ? el : null;
  }

  /* 穴どうしの重なりを先に取り除く。★塗り方（nonzero も evenodd も）では
   * 重なった所が塗り戻されて、かえって暗くなる。実際「まず動かしてみる」の段で、
   * 枠と絵の面が丸ごと重なって中央が暗くなった。
   * 後から足す矩形を、すでに決まった矩形で削って、重ならない形に分ける。 */
  function rectMinus(r, cut) {
    const l = Math.max(r.left, cut.left);
    const t = Math.max(r.top, cut.top);
    const rr = Math.min(r.right, cut.right);
    const b = Math.min(r.bottom, cut.bottom);
    if (rr <= l || b <= t) return [r];
    const out = [];
    if (r.top < t) out.push({ left: r.left, top: r.top, right: r.right, bottom: t });
    if (b < r.bottom) out.push({ left: r.left, top: b, right: r.right, bottom: r.bottom });
    if (r.left < l) out.push({ left: r.left, top: t, right: l, bottom: b });
    if (rr < r.right) out.push({ left: rr, top: t, right: r.right, bottom: b });
    return out;
  }

  function mergeHoles(rects) {
    const out = [];
    rects.forEach((r) => {
      let parts = [r];
      out.forEach((done) => { parts = parts.reduce((all, p) => all.concat(rectMinus(p, done)), []); });
      parts.forEach((p) => { if (p.right > p.left && p.bottom > p.top) out.push(p); });
    });
    return out;
  }

  /* 暗幕にあける穴。外枠は時計回り、穴は反時計回りに描く。
   * 同じ向きで描くと穴にならない。 */
  function shadePath(holes) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const clipped = holes.map((r) => ({
      left: Math.max(0, r.left),
      top: Math.max(0, r.top),
      right: Math.min(w, r.right),
      bottom: Math.min(h, r.bottom),
    })).filter((r) => r.right > r.left && r.bottom > r.top);
    let d = `M0 0 H${w} V${h} H0 Z`;
    mergeHoles(clipped).forEach((r) => {
      d += ` M${r.left} ${r.top} V${r.bottom} H${r.right} V${r.top} Z`;
    });
    return d;
  }

  function padRect(el, pad) {
    const r = el.getBoundingClientRect();
    return { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad };
  }

  function placeTour() {
    if (tourAt < 0 || !els.tourRing) return;
    const target = tourTarget(TOUR[tourAt]);
    const holes = [];
    if (target) {
      const r = padRect(target, 6);
      els.tourRing.hidden = false;
      els.tourRing.style.left = `${r.left}px`;
      els.tourRing.style.top = `${r.top}px`;
      els.tourRing.style.width = `${r.right - r.left}px`;
      els.tourRing.style.height = `${r.bottom - r.top}px`;
      holes.push(r);
    } else {
      els.tourRing.hidden = true;
    }
    /* 手を動かす面も明るいままにする。案内の多くは「欄のボタンを押して、
     * そのあと絵の上で手を動かす」形なので、絵が暗いと肝心の所が見えない。
     * ★ただし明るくするのは、その段で本当に触る面だけ。動線は平面図にしか
     * 引けないので、正面図まで明るくすると触れる所を見誤る。 */
    const lit = document.querySelector(TOUR[tourAt].lit || "#stage-canvas-stack");
    if (lit && lit.offsetParent !== null) holes.push(padRect(lit, 4));
    if (els.tourShadePath) els.tourShadePath.setAttribute("d", shadePath(holes));
  }

  function watchTour() {
    clearInterval(tourTimer);
    const step = TOUR[tourAt];
    if (!step || !step.done) return;
    tourTimer = setInterval(() => {
      if (tourAt < 0 || !step.done()) return;
      clearInterval(tourTimer);
      // できた合図だけを出し、次へ進むのは本人のボタン操作に任せる。
      // iPad では操作開始のタップ時点で done() が成立する場合があるため、
      // ここから自動で showTour() を呼ぶと、指を離す前に案内が切り替わってしまう。
      els.tourCard.classList.add("is-done");
    }, 320);
  }

  function showTour(index) {
    if (!els.tour) return;
    els.tourCard.classList.remove("is-done");
    tourAt = clamp(index, 0, TOUR.length - 1);
    const step = TOUR[tourAt];
    if (step.begin) step.begin();
    const words = isEn() ? step.en : step.ja;
    els.tour.hidden = false;
    els.tourStep.textContent = `${tourAt + 1} / ${TOUR.length}`;
    els.tourTitle.textContent = words[0];
    els.tourBody.textContent = words[1];
    els.tourPrev.disabled = tourAt === 0;
    els.tourNext.textContent = tourAt === TOUR.length - 1
      ? (isEn() ? "Done" : "はじめる")
      : (isEn() ? "Next" : "次へ");
    els.tourClose.textContent = isEn() ? "Close" : "閉じる";
    els.tourPrev.textContent = isEn() ? "Back" : "戻る";
    const target = tourTarget(step);
    if (target) target.scrollIntoView({ block: "center", behavior: "smooth" });
    // 巻き終わるのを待ってから枠を当てる
    setTimeout(placeTour, 260);
    placeTour();
    watchTour();
  }

  function hideTour() {
    if (!els.tour) return;
    clearInterval(tourTimer);
    els.tour.hidden = true;
    tourAt = -1;
  }

  function endTour() {
    hideTour();
    seenTour = true;
    tourRequested = false;
    try { localStorage.setItem(TOUR_KEY, "done"); } catch (_) { /* 覚えられなくても動く */ }
  }

  if (els.feedback) {
    els.feedback.addEventListener("click", () => {
      closePrefs();
      if (FEEDBACK_URL) { window.open(FEEDBACK_URL, "_blank", "noopener"); return; }
      const words = isEn()
        ? "The feedback form is not set up yet. Please tell the maker directly for now."
        : "感想の送り先（フォーム）はまだ用意できていません。いまは直接お知らせください。";
      els.saveStatus.textContent = words;
      announce(words);
    });
  }
  if (els.tourStart) {
    els.tourStart.addEventListener("click", () => {
      closePrefs();
      showTour(0);
    });
  }
  if (els.tourClose) els.tourClose.addEventListener("click", endTour);
  if (els.tourPrev) els.tourPrev.addEventListener("click", () => showTour(tourAt - 1));
  if (els.tourNext) {
    els.tourNext.addEventListener("click", () => {
      if (tourAt >= TOUR.length - 1) { endTour(); return; }
      showTour(tourAt + 1);
    });
  }
  window.addEventListener("resize", placeTour);
  window.addEventListener("scroll", placeTour, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (tourAt < 0) return;
    if (event.key === "Escape") { event.preventDefault(); endTour(); }
  });

  els.undo.addEventListener("click", undo);
  els.redo.addEventListener("click", redo);

  /* ⌘Z で戻す、⇧⌘Z でやり直す（WindowsではCtrl）。
   * 絵を描く道具なので、手が離れないことが効く。ただし
   *  ・舞台スケッチを開いていないときは何もしない（他のタブの邪魔をしない）
   *  ・名前やメモを打っている最中は、ブラウザ本来の文字の取り消しに任せる
   * の二つは必ず守る。取り違えると、打っている文章ではなく舞台の配置が消える。 */
  function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "z" && event.key !== "Z") return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const view = document.getElementById("view-stage");
    if (!view || view.hidden) return;
    if (isTyping(event.target)) return;
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  });

  els.clear.addEventListener("click", () => {
    if (!window.confirm(`「${sc().title}」に置いたものと背景の塗りをすべて消しますか？（他のシーンはそのままです）`)) return;
    checkpoint();
    const cur = sc();
    cur.pieces = [];
    cur.strokes = [];
    selectedId = null;
    syncInputs();
    renderScenes();
    renderVenueControls();
    updateInspector();
    render();
    persistSoon();
    announce("舞台を空にしました。");
  });

  /* ---------- 画像の書き出し ----------
     正面と平面のどちらを、どの範囲の場面ぶん出すかを選んでから書き出す。
     複数になるときは1枚ずつ続けて落とす（束ねる形式を持たない代わりに、
     名前へ場面の番号と絵の種類を入れて並び順が分かるようにする）。 */

  let exportView = "front";
  let exportScope = "current";

  function exportTargets() {
    const p = state.project;
    const i = p.scenes.findIndex((x) => x.id === p.activeSceneId);
    if (exportScope === "all") return p.scenes.filter((x) => x.kind === "scene");
    if (exportScope === "section") {
      // いまの場面が入っているいちばん内側のセクションと、その中身
      for (let k = i - 1; k >= 0; k -= 1) {
        if (p.scenes[k].depth < p.scenes[i].depth) {
          if (p.scenes[k].kind === "section") {
            return sceneChildren(k).filter((x) => x.kind === "scene");
          }
          break;
        }
      }
      return [p.scenes[i]];
    }
    return [p.scenes[i]];
  }

  function exportViews() {
    return exportView === "both" ? ["front", "plan"] : [exportView];
  }

  function updateExportNote() {
    document.querySelectorAll("[data-export-view]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.exportView === exportView));
    });
    document.querySelectorAll("[data-export-scope]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.exportScope === exportScope));
    });
    if (!els.exportNote) return;
    const scenes = exportTargets().length;
    const views = exportViews().length;
    const total = scenes * views;
    els.exportNote.textContent = total > 1
      ? `${scenes}シーン × ${views === 2 ? "正面と平面" : "1枚"} ＝ 合計${total}枚を続けて落とします。`
      : "1枚を落とします。";
  }

  function stampNow() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"), "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
  }

  const safeName = (text) => String(text || "").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24) || "scene";

  function runExport() {
    const scenes = exportTargets();
    const views = exportViews();
    if (!scenes.length) { announce("書き出すシーンがありません。"); return; }
    const keepScene = state.project.activeSceneId;
    const keepSelected = selectedId;
    const stamp = stampNow();
    const jobs = [];
    scenes.forEach((scene, index) => {
      views.forEach((view) => jobs.push({ scene, view, index }));
    });

    selectedId = null;
    jobs.forEach((job, k) => {
      // 場面を切り替えて描く。描き終えたら元の場面へ戻す
      state.project.activeSceneId = job.scene.id;
      const output = document.createElement("canvas");
      output.width = W;
      output.height = H;
      /* 書き出しは等倍。手元で拡大して見ていても、渡すのは絵の全体。 */
      const zs = zoomOf(job.view);
      const keep = { z: zs.z, ox: zs.ox, oy: zs.oy };
      zs.z = 1; zs.ox = 0; zs.oy = 0;
      drawStage(output.getContext("2d", { alpha: false }), false, job.view);
      Object.assign(zs, keep);
      const link = document.createElement("a");
      link.href = output.toDataURL("image/png");
      const no = String(job.index + 1).padStart(2, "0");
      link.download = `${safeName(state.project.title)}-${no}_${safeName(job.scene.title)}`
        + `-${job.view === "front" ? VENUES.seatById(state.seat).short : "平面"}-${stamp}.png`;
      // 続けて落とすと弾く browser があるので、少しずつ間を置く
      setTimeout(() => { link.click(); }, k * 220);
    });

    setTimeout(() => {
      state.project.activeSceneId = keepScene;
      selectedId = keepSelected;
      renderScenes();
      updateInspector();
      render();
    }, jobs.length * 220 + 60);

    closeExport();
    announce(`${jobs.length}枚を書き出しました。`);
  }

  function openExport() {
    if (!els.exportModal) return;
    if (!state.showFront && exportView !== "plan") exportView = "plan";
    if (!state.showPlan && exportView === "plan") exportView = "front";
    updateExportNote();
    els.exportModal.hidden = false;
    els.exportBackdrop.hidden = false;
  }

  function closeExport() {
    if (els.exportModal) els.exportModal.hidden = true;
    if (els.exportBackdrop) els.exportBackdrop.hidden = true;
  }

  els.export.addEventListener("click", openExport);
  if (els.exportClose) els.exportClose.addEventListener("click", closeExport);
  if (els.exportBackdrop) els.exportBackdrop.addEventListener("click", closeExport);
  if (els.exportRun) els.exportRun.addEventListener("click", runExport);
  document.querySelectorAll("[data-export-view]").forEach((b) => {
    b.addEventListener("click", () => { exportView = b.dataset.exportView; updateExportNote(); });
  });
  document.querySelectorAll("[data-export-scope]").forEach((b) => {
    b.addEventListener("click", () => { exportScope = b.dataset.exportScope; updateExportNote(); });
  });

  initStageAskPanel();
  buildPanelHeads();
  syncViewSwitch();
  // 言語は loadState() より前に決めてある（見本の駒の名前がそこで決まるため）
  applyLayout();
  initTabletPwaWorkspace();
  initPhoneViewerWorkspace();
  syncInputs();
  renderScenes();
  renderCast();
  renderSets();
  renderLights();
  renderRigs();
  renderVenueControls();
  setTool("select");
  updateInspector();
  updateHistoryButtons();
  updateBackupNote();
  render();
  els.saveStatus.textContent = loaded.restored
    ? "この端末に保存した前回のスケッチを開きました。"
    : "変更はこの端末のブラウザ内へ自動保存します。";
  applyLang();

  /* 初めて開いた人には、こちらから声をかける。
   * 一度でも見た（または閉じた）ら、次からは上の「使い方」からだけ。 */
  let seenTour = true;
  try { seenTour = localStorage.getItem(TOUR_KEY) === "done"; } catch (_) { seenTour = true; }
  if (els.poleLeft) {
    const setSide = (side) => {
      const piece = selectedPiece();
      if (!piece || mountKindOf(piece) !== "pole") return;
      checkpoint();
      piece.poleSide = side;
      updateInspector();
      render();
      persistSoon();
    };
    els.poleLeft.addEventListener("click", () => setSide("L"));
    els.poleRight.addEventListener("click", () => setSide("R"));
  }
  if (els.poleH) {
    els.poleH.addEventListener("input", (event) => {
      const piece = selectedPiece();
      if (!piece || mountKindOf(piece) !== "pole") return;
      piece.poleH = clamp(finite(event.target.value, 2.5), 0.8, 9);
      if (els.poleHValue) els.poleHValue.textContent = `${piece.poleH.toFixed(1)}m`;
      render();
      persistSoon();
    });
  }
  if (els.tissueH) {
    els.tissueH.addEventListener("input", (event) => {
      const piece = selectedPiece();
      if (!piece || mountKindOf(piece) !== "tissue") return;
      piece.tissueH = clamp(finite(event.target.value, 4), 0, 10);
      if (els.tissueHValue) els.tissueHValue.textContent = `${piece.tissueH.toFixed(1)}m`;
      render();
      persistSoon();
    });
  }
  if (els.showMapBtn) els.showMapBtn.addEventListener("click", openShowMap);
  if (els.printBtn) els.printBtn.addEventListener("click", openPrintPage);
  if (els.prefsBtn) els.prefsBtn.addEventListener("click", openPrefs);
  if (els.prefsClose) els.prefsClose.addEventListener("click", closePrefs);
  if (els.prefsBackdrop) els.prefsBackdrop.addEventListener("click", closePrefs);
  if (els.aboutOpenFromPrefs) els.aboutOpenFromPrefs.addEventListener("click", openAboutFromPrefs);
  if (els.aboutClose) els.aboutClose.addEventListener("click", closeAbout);
  if (els.aboutBackdrop) els.aboutBackdrop.addEventListener("click", closeAbout);
  if (els.presentBtn) els.presentBtn.addEventListener("click", startPresentation);
  if (els.arrangeSelect) {
    els.arrangeSelect.addEventListener("change", (e) => {
      const shape = e.target.value;
      e.target.selectedIndex = 0;   // 「押すたびに選ぶ」道具として使う
      if (shape) lineupPerformers(shape);
    });
  }
  applyFeatureFlags();
  if (els.importClose) els.importClose.addEventListener("click", closeImportPreview);
  if (els.importBackdrop) els.importBackdrop.addEventListener("click", closeImportPreview);
  if (els.importAsNew) els.importAsNew.addEventListener("click", () => confirmImport(true));
  if (els.importReplace) els.importReplace.addEventListener("click", () => confirmImport(false));
  if (els.mapClose) els.mapClose.addEventListener("click", closeShowMap);
  if (els.mapBackdrop) els.mapBackdrop.addEventListener("click", closeShowMap);
  if (els.trapSit) {
    const setTrapMode = (mode) => {
      const piece = selectedPiece();
      if (!piece || mountKindOf(piece) !== "trapeze") return;
      checkpoint();
      piece.trapMode = mode;
      updateInspector();
      render();
      persistSoon();
    };
    els.trapSit.addEventListener("click", () => setTrapMode("sit"));
    els.trapHang.addEventListener("click", () => setTrapMode("hang"));
  }
  if (els.diaboloLay) {
    const setDiaboloMode = (mode) => {
      const piece = selectedPiece();
      if (!piece || piece.type !== "diabolo") return;
      checkpoint();
      piece.diaboloMode = mode;
      updateInspector();
      render();
      persistSoon();
      announce(mode === "stand" ? "ディアボロを縦置きにしました。" : "ディアボロを横置きにしました。");
    };
    els.diaboloLay.addEventListener("click", () => setDiaboloMode("lay"));
    els.diaboloStand.addEventListener("click", () => setDiaboloMode("stand"));
  }
  if (els.planZoomIn) els.planZoomIn.addEventListener("click", () => zoomBy("plan", 1.35));
  if (els.planZoomOut) els.planZoomOut.addEventListener("click", () => zoomBy("plan", 1 / 1.35));
  /* 「見本のショーを開く」ボタンは撤去した（本人の指示）。
     見本は棚（ショー一覧）と ?sample リンクから開く。 */
  /* 初めて開いた端末には、見本のショーを棚へ入れておく（開いているショーは変えない）。
     ★state を組み終わってから通すこと。let state より前で呼ぶと
       TDZ で落ち、try/catch が握り潰して「棚に入らない」だけになる（実際に踏んだ）。 */
  renderScreenTexts();
  syncScreenTextControls();
  if (!loaded.restored) shelveSample();
  shelveSeamGardenSample();
  // 名簿タブから送られたキャスト候補。開いた時と、#stageへ切り替わった時に受け取る
  consumeCastHandoff();
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#stage")) consumeCastHandoff();
  });
  // ?sample を付けて開くと、見本から始まる（人へ渡すリンク用）
  if (openArgs.has("sample")) openSampleShow();
  // ?seam-sample は8セクション／32シーンの「継ぎ目の庭」を直接開く。
  if (openArgs.has("seam-sample")) openSeamGardenSampleShow();

  /* 案内は舞台スケッチの中だけで起動する。
   * index.html の資料棚や舞台技術を開いた時には出さず、初回の人が #stage へ
   * 入った時、または単独の stage.html を開いた時だけ始める。案内中に総合ページの
   * 別タブへ移った場合も、舞台スケッチの暗幕をそこへ持ち越さない。 */
  let tourRequested = openArgs.has("tour");
  let tourLaunchTimer = null;
  function stageTourContextActive() {
    if (phoneViewerActive) return false;
    const stageView = document.getElementById("view-stage");
    return document.body.classList.contains("is-standalone")
      || (location.hash === "#stage" && stageView && !stageView.hidden);
  }
  function syncStageTourContext() {
    clearTimeout(tourLaunchTimer);
    tourLaunchTimer = null;
    if (!stageTourContextActive()) {
      if (tourAt >= 0) hideTour();
      return;
    }
    if (tourAt >= 0 || (seenTour && !tourRequested)) return;
    tourLaunchTimer = setTimeout(() => {
      tourLaunchTimer = null;
      if (!stageTourContextActive() || tourAt >= 0) return;
      tourRequested = false;
      showTour(0);
    }, 700);
  }
  // app.js の画面切替が同じ hashchange で終わった後に、表示中の画面を判定する。
  window.addEventListener("hashchange", () => setTimeout(syncStageTourContext, 0));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncStageTourContext);
  } else {
    syncStageTourContext();
  }
})();
