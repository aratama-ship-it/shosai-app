import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const i18nSource = await readFile(new URL("../stage-i18n.js", import.meta.url), "utf8");
const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
const setBuilderSource = await readFile(new URL("../stage-set-builder.js", import.meta.url), "utf8");
const zhSources = {
  "zh-Hans": await readFile(new URL("../stage-i18n.zh-Hans.js", import.meta.url), "utf8"),
  "zh-Hant": await readFile(new URL("../stage-i18n.zh-Hant.js", import.meta.url), "utf8"),
};
const zhDraftSources = {
  "zh-Hans": await readFile(new URL("../i18n-prep/stage-i18n.zh-Hans.draft.js", import.meta.url), "utf8"),
  "zh-Hant": await readFile(new URL("../i18n-prep/stage-i18n.zh-Hant.draft.js", import.meta.url), "utf8"),
};

const ALLOWED_ZH_ONLY_TEXT_KEYS = [
  "整列（一列・円・V字）",
];
const ALLOWED_ZH_ONLY_MAP_IDS = [
  ["venueNote", "proscenium"],
  ["venueNote", "thrust"],
  ["venueNote", "arena"],
  ["venueNote", "outdoor"],
  ["venueNote", "blackbox"],
];
const ALLOWED_MAP_VALUE_COLLISIONS = {
  "zh-Hans": [
    ["dimBy", "pole.h", "cane.h"],
  ],
  "zh-Hant": [],
};

const i18nContext = { window: {} };
vm.runInNewContext(i18nSource, i18nContext, { filename: "stage-i18n.js" });
const text = i18nContext.window.SHOSAI_I18N.text;
const englishPack = i18nContext.window.SHOSAI_I18N_PACKS.en;

const zhContext = { window: { SHOSAI_I18N_PACKS: { en: englishPack } } };
Object.entries(zhSources).forEach(([code, source]) => {
  vm.runInNewContext(source, zhContext, { filename: `stage-i18n.${code}.js` });
});
const zhPacks = zhContext.window.SHOSAI_I18N_PACKS;

function loadDraft(code) {
  const context = { window: {} };
  vm.runInNewContext(zhDraftSources[code], context, { filename: `stage-i18n.${code}.draft.js` });
  return context.window[code === "zh-Hans"
    ? "SHOSAI_I18N_DRAFT_ZH_HANS" : "SHOSAI_I18N_DRAFT_ZH_HANT"];
}

function plain(value) {
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  }
  return value;
}

function packSnapshot(pack) {
  return {
    text: plain(pack.text),
    maps: plain(pack.maps),
    say: Array.from(pack.say, ([pattern, replacement]) => ({
      source: pattern.source,
      flags: pattern.flags,
      replacement: typeof replacement === "function" ? String(replacement) : replacement,
    })),
    generated: plain(pack.generated),
    needsReview: plain(pack.needsReview),
  };
}

function replaceProductName(value, localName) {
  if (typeof value === "string") return value.replaceAll(localName, "Stage Sketch");
  if (Array.isArray(value)) return value.map((item) => replaceProductName(item, localName));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, replaceProductName(item, localName)]));
  }
  return value;
}

function mapIdCount(maps) {
  return Object.values(maps).reduce((count, group) => count + Object.keys(group).length, 0);
}

function resolvedPackValue(pack, section, read, japanese) {
  const current = pack[section] && read(pack[section]);
  if (current !== undefined && current !== null && current !== "") return current;
  const fallback = englishPack[section] && read(englishPack[section]);
  return fallback !== undefined && fallback !== null && fallback !== "" ? fallback : japanese;
}

function translatedSay(say, message) {
  for (const [pattern, replacement] of say || []) {
    pattern.lastIndex = 0;
    if (!pattern.test(message)) continue;
    pattern.lastIndex = 0;
    return message.replace(pattern, replacement);
  }
  return null;
}

const FUNCTION_SAY_SAMPLES = [
  "「見本」をこのショーから外します（2シーンに割当）。ページを閉じるまでは「一つ戻す」で戻せます。",
  "1分・2シーン",
  "最後のファイル書き出し: 今日（それから2回の変更）",
  "客席の広がりは方向の目安です（12mで正面）",
  "正面図の絵を書き出す",
  "プロセニアム（大）を正面から見た正面図。出演者2人。背景の線3本。",
  "プロセニアム（大）を上から見た平面図。出演者2人。",
  "2個（hang 2）",
  "舞台スケッチの説明を出す",
  "演者12",
  "机の幅を変える（いまは 1m）",
  "三点照明（3灯）",
  "「見本」から新しいショーを作りました。前のショーは一覧に残っています。",
  "生成 8シーン・D2目安 8〜12",
  "別バージョンとして複製（元の版から派生）",
  "ファイル側にだけあるシーン: A ／ B",
  "いまのショーにだけあるシーン（置き換えると消える）: A ／ B",
  "天井まで だいたい2m（天井高を超える見込み）",
];

function evaluatedSayReplacements(pack) {
  return Array.from(pack.say, ([pattern, replacement]) => {
    if (typeof replacement !== "function") return replacement;
    const sample = FUNCTION_SAY_SAMPLES.find((message) => {
      pattern.lastIndex = 0;
      return pattern.test(message);
    });
    assert.ok(sample, `関数型SAYの代表入力がない: ${pattern.source}`);
    pattern.lastIndex = 0;
    const value = sample.replace(pattern, replacement);
    assert.equal(typeof value, "string", `関数型SAYが文字列を返さない: ${pattern.source}`);
    assert.notEqual(value, sample, `関数型SAYが代表入力を置換しない: ${pattern.source}`);
    return value;
  });
}

const stageContext = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(stageSource, stageContext, { filename: "stage-sketch.js" });
const templates = stageContext.window.SHOSAI_STAGE_BEAT_TEMPLATE_MODEL.templates;
const languageModel = stageContext.window.SHOSAI_STAGE_PHONE_VIEWER_MODEL;

const translatedStageContext = {
  window: {},
  document: { getElementById: () => null },
};
vm.runInNewContext(i18nSource, translatedStageContext, { filename: "stage-i18n.js" });
Object.entries(zhSources).forEach(([code, source]) => {
  vm.runInNewContext(source, translatedStageContext, { filename: `stage-i18n.${code}.js` });
});
vm.runInNewContext(stageSource, translatedStageContext, { filename: "stage-sketch.js" });
const runtimeI18n = translatedStageContext.window.SHOSAI_STAGE_I18N_MODEL;

test("normalizeStageLanguageは11入力を4言語へ正規化する", () => {
  const cases = [
    ["ja", "ja"], ["ja-JP", "ja"],
    ["en", "en"], ["en-GB", "en"],
    ["zh", "zh-Hans"], ["zh-CN", "zh-Hans"], ["zh-SG", "zh-Hans"],
    ["zh-TW", "zh-Hant"], ["zh-Hant", "zh-Hant"], ["zh-HK", "zh-Hant"],
    ["fr", "en"],
  ];
  cases.forEach(([input, expected]) => {
    assert.equal(languageModel.normalizeLanguage(input), expected, input);
  });
});

test("初回言語は旧保存値を保ち、未読込パックの言語はenへ落ちる", () => {
  const saved = (value) => ({ getItem: () => value });
  assert.equal(languageModel.resolveInitialLanguage("", saved("en"), { language: "ja-JP" }), "en");
  assert.equal(languageModel.resolveInitialLanguage("", saved("ja"), { language: "en-US" }), "ja");
  assert.equal(languageModel.resolveInitialLanguage("zh-Hant", saved("ja"), { language: "ja-JP" }), "en");
  assert.equal(languageModel.resolveInitialLanguage("", saved("zh-Hans"), { language: "ja-JP" }), "en");
  assert.equal(languageModel.resolveInitialLanguage("", saved(null), { language: "zh-TW" }), "en");
});

test("英語辞書は互換公開とパック公開で同じ値を共有する", () => {
  assert.equal(englishPack.text, i18nContext.window.SHOSAI_I18N.text);
  assert.equal(englishPack.maps, i18nContext.window.SHOSAI_I18N.maps);
  assert.equal(englishPack.say, i18nContext.window.SHOSAI_I18N.say);
  assert.deepEqual(
    { ...englishPack.generated },
    { sceneTitle: "Scene {n}", untitledShow: "Untitled show" },
  );
});

for (const [code, localName] of [["zh-Hans", "舞台速写"], ["zh-Hant", "舞台速寫"]]) {
  test(`${code}パックはドラフトを保ち、画像・印刷・全画面表記・打楽器2種・仮面を反映する`, () => {
    const draft = loadDraft(code);
    const pack = zhPacks[code];
    const customVenueLabels = code === "zh-Hans"
      ? {
        "カスタム": "自定义",
        "劇場セットアップ": "剧场设置",
        "必須": "必填",
        "1. ステージの形式を選択してください": "1. 选择舞台形式",
        "2. メインの形を選択してください": "2. 选择主要形状",
        "3. 追加のステージを選択してください": "3. 选择追加舞台形状",
        "4. 天井の高さを指定してください": "4. 指定天花板高度",
        "5. 客席を配置してください": "5. 配置观众区",
        "6. 舞台袖を配置してください": "6. 配置侧台区域",
        "四角または丸を選び、右の平面図でドラッグしてください。": "请选择矩形或圆形，然后在右侧平面图中拖动。",
        "既存の舞台につながる位置へ追加できます。": "可添加在与现有舞台相连的位置。",
        "追加した四角・丸はドラッグで動かせます。重なる部分は合成できます。": "可拖动已添加的矩形和圆形。重叠部分可以合并。",
        "重なりを合成": "合并重叠部分",
        "既存の舞台につながる位置へ追加できます。合成後は一体の舞台面になり、戻すで解除できます。": "可添加在与现有舞台相连的位置。合并后将成为一个舞台面，可通过撤销恢复。",
        "四角": "矩形",
        "丸": "圆形",
        "選択して、右の平面図で四角を描いてください。": "选择此步骤，然后在右侧平面图上拖动画出矩形。",
        "カスタム会場の平面。客席と舞台袖を描きます": "自定义场地平面图，用于绘制观众区和侧台区域",
        "カスタム会場の平面。追加ステージ、客席、舞台袖を描きます": "自定义场地平面图，用于绘制追加舞台、观众区和侧台区域",
        "3番で追加ステージ、5番または6番で客席・舞台袖を描けます。": "第3步可绘制追加舞台，第5步或第6步可绘制观众区和侧台。",
        "配置モードを選択してください": "请选择配置模式",
        "5番または6番を選択してください": "请选择第5步或第6步",
        "4番または5番を選んで、右の平面図で四角を描いてください。": "请选择第4步或第5步，然后在右侧平面图上拖动画出矩形。",
        "選択した四角を削除": "删除选中的矩形",
        "錆色：客席": "锈色：观众区",
        "舞台の辺をタップして客席を配置します。置ける方向はステージ形式によって変わります。": "轻点舞台边缘来配置观众区。可配置的方向取决于舞台形式。",
        "形式に応じて、客席を置ける方向を正面・三方向・全周に切り替えます。": "舞台形式决定观众区可放在正面、三面或四周。",
        "劇場式": "剧场式",
        "張り出し式": "伸出式",
        "360度ステージ": "360度舞台",
        "形式を切り替えると、作成中の客席だけを初期化します。": "切换舞台形式时，仅清除正在制作的观众区。",
        "長方形・L字・円・台形、または自由に作る、から選択してください。": "请选择长方形、L形、圆形、梯形或自由制作。",
        "選択後、辺は一方向、角は二方向へ動かします。角の長押しで欠き取れます。": "选择后，边沿单方向移动，角沿两个方向移动。长按角可以切掉一块。",
        "長方形": "长方形",
        "自由に作る": "自由制作",
      }
      : {
        "カスタム": "自訂",
        "劇場セットアップ": "劇場設定",
        "必須": "必填",
        "1. ステージの形式を選択してください": "1. 選擇舞台形式",
        "2. メインの形を選択してください": "2. 選擇主要形狀",
        "3. 追加のステージを選択してください": "3. 選擇追加舞台形狀",
        "4. 天井の高さを指定してください": "4. 指定天花板高度",
        "5. 客席を配置してください": "5. 配置觀眾區",
        "6. 舞台袖を配置してください": "6. 配置側台區域",
        "四角または丸を選び、右の平面図でドラッグしてください。": "請選擇矩形或圓形，然後在右側平面圖中拖曳。",
        "既存の舞台につながる位置へ追加できます。": "可新增在與現有舞台相連的位置。",
        "追加した四角・丸はドラッグで動かせます。重なる部分は合成できます。": "可拖曳已新增的矩形和圓形。重疊部分可以合併。",
        "重なりを合成": "合併重疊部分",
        "既存の舞台につながる位置へ追加できます。合成後は一体の舞台面になり、戻すで解除できます。": "可新增在與現有舞台相連的位置。合併後將成為一個舞台面，可透過復原還原。",
        "四角": "矩形",
        "丸": "圓形",
        "選択して、右の平面図で四角を描いてください。": "選擇此步驟，然後在右側平面圖上拖曳畫出矩形。",
        "カスタム会場の平面。客席と舞台袖を描きます": "自訂場地平面圖，用於繪製觀眾區和側台區域",
        "カスタム会場の平面。追加ステージ、客席、舞台袖を描きます": "自訂場地平面圖，用於繪製追加舞台、觀眾區和側台區域",
        "3番で追加ステージ、5番または6番で客席・舞台袖を描けます。": "第3步可繪製追加舞台，第5步或第6步可繪製觀眾區和側台。",
        "配置モードを選択してください": "請選擇配置模式",
        "5番または6番を選択してください": "請選擇第5步或第6步",
        "4番または5番を選んで、右の平面図で四角を描いてください。": "請選擇第4步或第5步，然後在右側平面圖上拖曳畫出矩形。",
        "選択した四角を削除": "刪除選取的矩形",
        "錆色：客席": "鏽色：觀眾區",
        "舞台の辺をタップして客席を配置します。置ける方向はステージ形式によって変わります。": "點一下舞台邊緣來配置觀眾區。可配置的方向取決於舞台形式。",
        "形式に応じて、客席を置ける方向を正面・三方向・全周に切り替えます。": "舞台形式決定觀眾區可放在正面、三面或四周。",
        "劇場式": "劇場式",
        "張り出し式": "伸出式",
        "360度ステージ": "360度舞台",
        "形式を切り替えると、作成中の客席だけを初期化します。": "切換舞台形式時，只會清除正在製作的觀眾區。",
        "長方形・L字・円・台形、または自由に作る、から選択してください。": "請選擇長方形、L形、圓形、梯形或自由製作。",
        "選択後、辺は一方向、角は二方向へ動かします。角の長押しで欠き取れます。": "選擇後，邊沿單方向移動，角沿兩個方向移動。長按角可以切掉一塊。",
        "長方形": "長方形",
        "自由に作る": "自由製作",
      };
    // 2026-09-12 本人承認により会場3種を追加
    const wideVenueTextLabels = code === "zh-Hans"
      ? { "フロア前方": "场地前区", "フロア後方": "场地后区", "下段中央": "下层看台中央", "上段中央": "上层看台中央", "最上段": "看台最高层" }
      : { "フロア前方": "場地前區", "フロア後方": "場地後區", "下段中央": "下層看台中央", "上段中央": "上層看台中央", "最上段": "看台最高層" };
    const wideVenueMaps = code === "zh-Hans"
      ? {
        venue: { "arena-concert": "体育馆（暂定尺寸）", "dome-concert": "穹顶场馆（暂定尺寸）", "festival-field": "户外音乐节（暂定尺寸）" },
        venueShort: { "arena-concert": "体育馆", "dome-concert": "穹顶场馆", "festival-field": "户外音乐节" },
        venueNote: { "arena-concert": "暂定尺寸（未对照图纸）。并非实际场馆。", "dome-concert": "暂定尺寸（未对照图纸）。并非实际场馆。", "festival-field": "暂定尺寸（未对照图纸）。并非实际场馆。" },
        size: { "arena-concert-provisional": "暂定尺寸（未对照图纸）", "dome-concert-provisional": "暂定尺寸（未对照图纸）", "festival-field-provisional": "暂定尺寸（未对照图纸）" },
      }
      : {
        venue: { "arena-concert": "體育館（暫定尺寸）", "dome-concert": "巨蛋場館（暫定尺寸）", "festival-field": "戶外音樂祭（暫定尺寸）" },
        venueShort: { "arena-concert": "體育館", "dome-concert": "巨蛋場館", "festival-field": "戶外音樂祭" },
        venueNote: { "arena-concert": "暫定尺寸（未核對圖面）。並非實際場館。", "dome-concert": "暫定尺寸（未核對圖面）。並非實際場館。", "festival-field": "暫定尺寸（未核對圖面）。並非實際場館。" },
        size: { "arena-concert-provisional": "暫定尺寸（未核對圖面）", "dome-concert-provisional": "暫定尺寸（未核對圖面）", "festival-field-provisional": "暫定尺寸（未核對圖面）" },
      };
    const wideVenueNeedsReview = [
      "text.フロア前方", "text.フロア後方", "text.下段中央", "text.上段中央", "text.最上段",
      "maps.venue.arena-concert", "maps.venue.dome-concert", "maps.venue.festival-field",
      "maps.venueShort.arena-concert", "maps.venueShort.dome-concert", "maps.venueShort.festival-field",
      "maps.venueNote.arena-concert", "maps.venueNote.dome-concert", "maps.venueNote.festival-field",
      "maps.size.arena-concert-provisional", "maps.size.dome-concert-provisional", "maps.size.festival-field-provisional",
    ];
    const venueTypeLabels = code === "zh-Hans"
      ? { "劇場形式プリセット": "剧场形式预设" }
      : { "劇場形式プリセット": "劇場形式預設" };
    const transitionLabels = code === "zh-Hans"
      ? {
        "転換": "换场",
        "転換情報": "换场信息",
        "選択中のシーンの上下に、転換の長さ・暗転・メモを表示する。OFFでも内容は消えません": "在所选场景的上下显示换场时长、暗场和备注。关闭后内容不会被删除",
        "転換メモ": "换场备注",
        "演者・舞台セット・きっかけなど、この転換で行うこと": "本次换场要做的事，如演员、舞台布景、提示等",
        "空欄は設定の転換時間": "留空则使用设置中的换场时长",
      }
      : {
        "転換": "換場",
        "転換情報": "換場資訊",
        "選択中のシーンの上下に、転換の長さ・暗転・メモを表示する。OFFでも内容は消えません": "在所選場景的上下顯示換場時長、暗場和備註。關閉後內容不會被刪除",
        "転換メモ": "換場備註",
        "演者・舞台セット・きっかけなど、この転換で行うこと": "本次換場要做的事，如演員、舞台佈景、提示等",
        "空欄は設定の転換時間": "留白則使用設定中的換場時長",
      };
    const sceneToolHintLabels = code === "zh-Hans"
      ? {
        sceneGrid: "以卡片形式排列所有场景，便于总览。",
        sceneSection: "添加一个用于归拢场景的段落。",
        sceneAdd: "添加一个全新的空白场景。",
        deriveRoute: "从当前位置画到下一场中各对象所在位置的走位线。",
      }
      : {
        sceneGrid: "以卡片形式排列所有場景，方便總覽。",
        sceneSection: "新增一個用來歸整場景的段落。",
        sceneAdd: "新增一個全新的空白場景。",
        deriveRoute: "從目前位置畫到下一場中各物件所在位置的走位線。",
      };
    const viewSelectLabels = code === "zh-Hans"
      ? {
        "両方①": "两者①",
        "両方②": "两者②",
        "表示する図。両方①は正面が上、両方②は平面が上": "选择显示的视图。两者①为正视图在上，两者②为平面图在上。",
      }
      : {
        "両方①": "兩者①",
        "両方②": "兩者②",
        "表示する図。両方①は正面が上、両方②は平面が上": "選擇顯示的視圖。兩者①為正視圖在上，兩者②為平面圖在上。",
      };
    const exportLabels = code === "zh-Hans"
      ? { "画像・印刷": "图片与打印", "印刷・PDF": "打印 / PDF" }
      : { "画像・印刷": "圖片與列印", "印刷・PDF": "列印 / PDF" };
    const projectExportLabels = code === "zh-Hans"
      ? {
        "ショーを書き出す": "导出演出",
        "ファイル名": "文件名",
        "キャンセル": "取消",
        "この名前は書き出すファイルだけに使います。ショー名は変わりません。": "此名称仅用于导出的文件，不会更改演出名称。",
        "書き出すと、次に保存先を選べます。": "选择“导出”后，可以选择保存位置。",
        "このブラウザで設定されているダウンロード先へ書き出します。": "文件将导出到此浏览器设置的下载位置。",
      }
      : {
        "ショーを書き出す": "匯出演出",
        "ファイル名": "檔案名稱",
        "キャンセル": "取消",
        "この名前は書き出すファイルだけに使います。ショー名は変わりません。": "此名稱僅用於匯出的檔案，不會變更演出名稱。",
        "書き出すと、次に保存先を選べます。": "選擇「匯出」後，可以選擇儲存位置。",
        "このブラウザで設定されているダウンロード先へ書き出します。": "檔案將匯出到此瀏覽器設定的下載位置。",
      };
    const projectSettingsLabels = code === "zh-Hans"
      ? { "詳細設定": "详细设置", "ショーの詳細設定": "演出详细设置" }
      : { "詳細設定": "詳細設定", "ショーの詳細設定": "演出詳細設定" };
    const batchUiLabels = code === "zh-Hans"
      ? {
        "背景を編集": "编辑背景",
        "背景を描く": "绘制背景",
        "アニメ": "动画",
        "転換アニメーション": "换场动画",
        "転換時間": "换场时长",
        "ショーごとの設定": "演出设置",
        "設定には、この端末に保存されるものと、現在のショーに保存されるものがあります。": "此页面的设置中，有些保存在此设备，有些保存在当前演出中。",
        "シーンを切り替えるとき、演者を動線に沿って動かして表示します。ON/OFFと転換時間は現在のショーに保存されます。": "切换场景时，按走位线显示演员移动。开关和换场时长会保存在当前演出中。",
        "次のシーンから動線を引く": "从下一场景绘制走位线",
        "その他のシーン操作": "更多场景操作",
        "地の色、描画、スクリーンの文字、写真をまとめて設定します。": "在这里集中设置底色、绘制、屏幕文字和照片。",
      }
      : {
        "背景を編集": "編輯背景",
        "背景を描く": "繪製背景",
        "アニメ": "動畫",
        "転換アニメーション": "換場動畫",
        "転換時間": "換場時長",
        "ショーごとの設定": "演出設定",
        "設定には、この端末に保存されるものと、現在のショーに保存されるものがあります。": "此頁面的設定中，有些保存在此裝置，有些保存在目前演出中。",
        "シーンを切り替えるとき、演者を動線に沿って動かして表示します。ON/OFFと転換時間は現在のショーに保存されます。": "切換場景時，依照走位線顯示演員移動。開關和換場時長會保存在目前演出中。",
        "次のシーンから動線を引く": "從下一場景繪製走位線",
        "その他のシーン操作": "更多場景操作",
        "地の色、描画、スクリーンの文字、写真をまとめて設定します。": "在這裡集中設定底色、繪製、螢幕文字和照片。",
      };
    const sceneCreateLabels = code === "zh-Hans"
      ? {
        "次のシーンをつくる": "创建下一场景",
        "次のシーンをつくる方法を選んでください。": "请选择如何创建下一场景。",
        "まっさらなシーン": "空白场景",
        "演者や舞台セットを置かない状態から始めます。": "从没有演员或舞台装置的状态开始。",
        "現在のシーンから引き継ぐ": "从当前场景继承",
        "引き継ぐものを個別またはまとめて選べます。": "可逐项或按组选择要继承的内容。",
        "動線があるものは次のシーンで行き先へ移動": "在下一场景中将有走位线的项目移动到终点",
        "引き継ぐもの": "要继承的内容",
        "まとめて選ぶ": "批量选择",
        "すべて選ぶ": "全选",
        "すべて選択を外す": "取消全选",
        "すべての演者": "所有演员",
        "すべての舞台セット": "所有舞台装置",
        "すべての小道具": "所有小道具",
        "すべての照明": "所有灯光",
        "つくる": "创建",
        "このシーンを削除": "删除此场景",
        "次から引く": "从下一场绘制",
        "シーンを削除": "删除场景",
        "削除したものは元に戻せません。": "删除的内容无法恢复。",
        "削除することを確認しました": "我确认要删除",
        "削除する": "删除",
        "まっさらなシーン、または現在のシーンから引き継いだシーンを次に作ります": "创建空白的下一场景，或从当前场景继承所选内容",
        "引き継ぐものを1つ以上選んでください。": "请至少选择一项要继承的内容。",
        "次のシーンを作りました。": "已创建下一场景。",
      }
      : {
        "次のシーンをつくる": "建立下一場景",
        "次のシーンをつくる方法を選んでください。": "請選擇如何建立下一場景。",
        "まっさらなシーン": "空白場景",
        "演者や舞台セットを置かない状態から始めます。": "從沒有演員或舞台裝置的狀態開始。",
        "現在のシーンから引き継ぐ": "從目前場景繼承",
        "引き継ぐものを個別またはまとめて選べます。": "可逐項或按組選擇要繼承的內容。",
        "動線があるものは次のシーンで行き先へ移動": "在下一場景中將有走位線的項目移動到終點",
        "引き継ぐもの": "要繼承的內容",
        "まとめて選ぶ": "批次選擇",
        "すべて選ぶ": "全選",
        "すべて選択を外す": "取消全選",
        "すべての演者": "所有演員",
        "すべての舞台セット": "所有舞台裝置",
        "すべての小道具": "所有小道具",
        "すべての照明": "所有燈光",
        "つくる": "建立",
        "このシーンを削除": "刪除此場景",
        "次から引く": "從下一場繪製",
        "シーンを削除": "刪除場景",
        "削除したものは元に戻せません。": "刪除的內容無法復原。",
        "削除することを確認しました": "我確認要刪除",
        "削除する": "刪除",
        "まっさらなシーン、または現在のシーンから引き継いだシーンを次に作ります": "建立空白的下一場景，或從目前場景繼承所選內容",
        "引き継ぐものを1つ以上選んでください。": "請至少選擇一項要繼承的內容。",
        "次のシーンを作りました。": "已建立下一場景。",
      };
    const sectionUiLabels = code === "zh-Hans"
      ? { "新規セクション": "新段落", "このセクションを削除": "删除此段落", "色を選ぶ": "选择颜色", "保存する": "保存", "セクションの詳細": "段落详情" }
      : { "新規セクション": "新段落", "このセクションを削除": "刪除此段落", "色を選ぶ": "選擇顏色", "保存する": "儲存", "セクションの詳細": "段落詳細資料" };
    const sceneSubtitleLabels = code === "zh-Hans"
      ? {
        "シーンのサブタイトル": "场景副标题",
        "シーン一覧に構成上の役割をサブタイトルとして表示する。OFFでも内容は消えません": "在场景列表中以副标题显示结构作用。关闭后内容不会被删除",
        "シーンの詳細": "场景详情",
        "サブタイトル": "副标题",
        "未設定": "未设置",
        "表示は設定の「シーンのサブタイトル」から切り替えられます。": "可在设置中的“场景副标题”切换显示。",
        "変更を保存": "保存更改",
      }
      : {
        "シーンのサブタイトル": "場景副標題",
        "シーン一覧に構成上の役割をサブタイトルとして表示する。OFFでも内容は消えません": "在場景清單中以副標題顯示結構作用。關閉後內容不會被刪除",
        "シーンの詳細": "場景詳細資料",
        "サブタイトル": "副標題",
        "未設定": "未設定",
        "表示は設定の「シーンのサブタイトル」から切り替えられます。": "可在設定中的「場景副標題」切換顯示。",
        "変更を保存": "儲存變更",
      };
    const shortcutNoteLabels = code === "zh-Hans"
      ? { "文字入力中も⌘Sは使えます。ほかの舞台操作は、文字入力を優先します。WindowsとLinuxでは⌘をCtrlに読み替えてください。": "输入文字时也可以使用⌘S。其他舞台操作会优先文字输入。Windows和Linux上请把⌘读作Ctrl。" }
      : { "文字入力中も⌘Sは使えます。ほかの舞台操作は、文字入力を優先します。WindowsとLinuxでは⌘をCtrlに読み替えてください。": "輸入文字時也可以使用⌘S。其他舞台操作會優先文字輸入。Windows和Linux上請把⌘讀作Ctrl。" };
    const drawerLabels = code === "zh-Hans"
      ? { "パネルを開く": "打开面板", "パネルを閉じる": "关闭面板" }
      : { "パネルを開く": "開啟面板", "パネルを閉じる": "關閉面板" };
    const drumLabels = code === "zh-Hans"
      ? { "ドラムセット": "架子鼓", "大太鼓": "大鼓" }
      : { "ドラムセット": "爵士鼓", "大太鼓": "大鼓" };
    // 登る大道具4種（2026-09-11）。訳語の正本は i18n-prep/GLOSSARY.md 5a。
    const climbLabels = code === "zh-Hans"
      ? { ladder: "梯子", stepladder: "人字梯", stairs: "台阶（4级）", stairs6: "台阶（6级）",
        door: "门", window: "窗（带窗的墙片）", column: "柱", railing: "栏杆", bridge: "桥（天桥）",
        platform: "高台（脚手架）", truss: "桁架", cage: "笼子", torii: "鸟居", screen: "屏风", frameportal: "方框（立式）", framepicture: "画框（立式）", framehang: "方框（吊挂）", framecube: "立方体框架", slope: "斜坡",
        sofa: "沙发", bed: "床", bookshelf: "书架", dresser: "五斗柜", mirror: "穿衣镜",
        desk: "书桌", counter: "吧台", fireplace: "壁炉", phonebooth: "电话亭", clothesrack: "衣架",
        tree: "树", rock: "岩石", streetlamp: "路灯", signboard: "招牌", barrel: "木桶",
        planter: "花盆", well: "水井", tent: "帐篷骨架",
        broom: "扫帚", bucket: "水桶", rope: "绳子", bouquet: "花束", glassbottle: "杯子／瓶子",
        tray: "托盘", telephone: "电话", newspaper: "报纸／信", clock: "时钟", fan: "折扇",
        scarf: "布／面纱／围巾", torch: "火把", candle: "烛台", treasurechest: "宝箱", cane: "手杖",
        handbag: "手提包", wagasa: "和伞", guitar: "吉他", bassguitar: "贝斯", violin: "小提琴", trumpet: "小号",
        accordion: "手风琴", cigarbox: "雪茄盒", devilstick: "魔杖", poi: "poi流星球", hoop: "呼啦圈",
        grandpiano: "三角钢琴", grandpianoopen: "三角钢琴（开盖）", uprightpiano: "立式钢琴", micstand: "麦克风架", musicstand: "谱架",
        speaker: "音箱", keyboardstand: "电子琴（带架）", djbooth: "DJ台",
        rolabola: "圆筒平衡板", germanwheel: "德式轮", minitramp: "迷你蹦床", rollingglobe: "大球",
        russianbar: "俄式杠", crashmat: "保护垫", crashmatround: "保护垫（圆形）", russianswing: "俄式秋千", slackline: "扁带",
        walljump: "跳墙", unicycle: "独轮车", spiralstairs: "旋转楼梯", stilts: "高跷",
        cart: "手推车", bicycle: "自行车", aerialhoop: "空中圆环", aerialstraps: "吊带",
        aerialhammock: "空中吊床", spanishweb: "西班牙绳", swingpole: "摆动杆",
        cello: "大提琴", doublebass: "低音提琴" }
      : { ladder: "梯子", stepladder: "A字梯", stairs: "樓梯（4階）", stairs6: "樓梯（6階）",
        door: "門", window: "窗（帶窗的牆片）", column: "柱", railing: "欄杆", bridge: "橋（天橋）",
        platform: "高台（鷹架）", truss: "桁架", cage: "籠子", torii: "鳥居", screen: "屏風", frameportal: "方框（立式）", framepicture: "畫框（立式）", framehang: "方框（吊掛）", framecube: "立方體框架", slope: "斜坡",
        sofa: "沙發", bed: "床", bookshelf: "書架", dresser: "五斗櫃", mirror: "穿衣鏡",
        desk: "書桌", counter: "吧台", fireplace: "壁爐", phonebooth: "電話亭", clothesrack: "衣架",
        tree: "樹", rock: "岩石", streetlamp: "路燈", signboard: "招牌", barrel: "木桶",
        planter: "花盆", well: "水井", tent: "帳篷骨架",
        broom: "掃帚", bucket: "水桶", rope: "繩子", bouquet: "花束", glassbottle: "杯子／瓶子",
        tray: "托盤", telephone: "電話", newspaper: "報紙／信", clock: "時鐘", fan: "摺扇",
        scarf: "布／面紗／圍巾", torch: "火把", candle: "燭台", treasurechest: "寶箱", cane: "手杖",
        handbag: "手提包", wagasa: "和傘", guitar: "吉他", bassguitar: "貝斯", violin: "小提琴", trumpet: "小號",
        accordion: "手風琴", cigarbox: "雪茄盒", devilstick: "魔杖", poi: "poi流星球", hoop: "呼拉圈",
        grandpiano: "平台鋼琴", grandpianoopen: "平台鋼琴（開蓋）", uprightpiano: "直立式鋼琴", micstand: "麥克風架", musicstand: "譜架",
        speaker: "音箱", keyboardstand: "電子琴（附架）", djbooth: "DJ台",
        rolabola: "圓筒平衡板", germanwheel: "德式輪", minitramp: "迷你彈簧床", rollingglobe: "大球",
        russianbar: "俄式槓", crashmat: "保護墊", crashmatround: "保護墊（圓形）", russianswing: "俄式鞦韆", slackline: "扁帶",
        walljump: "跳牆", unicycle: "獨輪車", spiralstairs: "旋轉樓梯", stilts: "高蹺",
        cart: "手推車", bicycle: "腳踏車", aerialhoop: "空中圓環", aerialstraps: "吊帶",
        aerialhammock: "空中吊床", spanishweb: "西班牙繩", swingpole: "擺動桿",
        cello: "大提琴", doublebass: "低音提琴" };
    // 形のプルダウンの分類見出し（2026-09-11 案A）
    const shapeGroupLabels = code === "zh-Hans"
      ? { "手に持つもの": "手持道具", "楽器": "乐器", "登る・上がる": "攀登", "建て込み": "布景搭建", "その他の形": "其他形状", "家具": "家具", "屋外・情景": "户外／情景", "サーカス器具": "杂技器械" }
      : { "手に持つもの": "手持道具", "楽器": "樂器", "登る・上がる": "攀登", "建て込み": "佈景搭建", "その他の形": "其他形狀", "家具": "家具", "屋外・情景": "戶外／情景", "サーカス器具": "雜技器械" };
    const maskLabels = code === "zh-Hans"
      ? { "マスク（仮面）": "面具", "顔につける仮面": "戴在脸上的面具", "顔につける…": "戴上面具…", "顔につける": "戴在脸上", "手に持つ": "拿在手中", "外す": "取下", "顔にはすでに仮面がついています。": "脸上已经戴着面具。", "仮面を顔につけました。": "已戴上面具。", "仮面を外しました。": "已取下面具。" }
      : { "マスク（仮面）": "面具", "顔につける仮面": "戴在臉上的面具", "顔につける…": "戴上面具…", "顔につける": "戴在臉上", "手に持つ": "拿在手中", "外す": "取下", "顔にはすでに仮面がついています。": "臉上已經戴著面具。", "仮面を顔につけました。": "已戴上面具。", "仮面を外しました。": "已取下面具。" };
    const skinLabels = code === "zh-Hans"
      ? { "画面のスキン": "界面皮肤", "背景とパネルの配色を切り替えます。": "切换背景和面板的配色。", "赤みの黒": "暖黑", "青みの黒": "蓝黑" }
      : { "画面のスキン": "介面外觀", "背景とパネルの配色を切り替えます。": "切換背景和面板的配色。", "赤みの黒": "暖黑", "青みの黒": "藍黑" };
    const aboutFeedbackLabels = code === "zh-Hans"
      ? { "ご意見・ご感想・ご要望を送る ↗": "发送意见、反馈或需求 ↗" }
      : { "ご意見・ご感想・ご要望を送る ↗": "傳送意見、回饋或需求 ↗" };
    const releaseHistoryLabels = code === "zh-Hans"
      ? {
        "アップデート履歴": "更新记录",
        "公開済みのアップデートを、新しい順に記録しています。": "已发布的更新按最新优先记录。",
        "パネルUIと、正面図・平面図・客席視点の切り替えを改善しました。": "改进了面板界面以及正视图、平面图和观众视角之间的切换。",
        "シーンの作成・複製、背景・会場設定、Undo／Redo、複数選択・整列を整理しました。": "优化了场景创建与复制、背景与场地设置、撤销／重做、多选和对齐。",
        "演者がショーの動きを確認できる、演者向けViewerリンクを追加しました。": "新增了表演者Viewer链接，方便表演者确认演出动作。",
        "演者・舞台セット・照明の名前をダブルクリックして、詳細から直接変更できるようにしました。": "现在可以双击表演者、舞台布景或灯光的名称，并在详情中直接修改。",
        "全画面表示で、正面図と平面図を見比べられるようにしました。": "现在可在全屏模式下对照正面图与平面图。",
        "画像・印刷を一つの入口にまとめました。": "图片导出和打印现已集中到同一个入口。",
        "左右のパネル幅を調整できるようにしました。": "现在可以调整左右面板的宽度。",
      }
      : {
        "アップデート履歴": "更新紀錄",
        "公開済みのアップデートを、新しい順に記録しています。": "已發布的更新按最新優先記錄。",
        "パネルUIと、正面図・平面図・客席視点の切り替えを改善しました。": "改善了面板介面以及正視圖、平面圖和觀眾視角之間的切換。",
        "シーンの作成・複製、背景・会場設定、Undo／Redo、複数選択・整列を整理しました。": "優化了場景建立與複製、背景與場地設定、復原／重做、多選和對齊。",
        "演者がショーの動きを確認できる、演者向けViewerリンクを追加しました。": "新增了表演者Viewer連結，方便表演者確認演出動作。",
        "演者・舞台セット・照明の名前をダブルクリックして、詳細から直接変更できるようにしました。": "現在可以雙擊表演者、舞台布景或燈光的名稱，並在詳細資料中直接修改。",
        "全画面表示で、正面図と平面図を見比べられるようにしました。": "現在可在全螢幕模式下對照正面圖與平面圖。",
        "画像・印刷を一つの入口にまとめました。": "圖片匯出和列印現已集中到同一個入口。",
        "左右のパネル幅を調整できるようにしました。": "現在可以調整左右面板的寬度。",
      };
    const releaseNotificationLabels = code === "zh-Hans"
      ? { "アップデート履歴（新着あり）": "更新记录（有新内容）" }
      : { "アップデート履歴（新着あり）": "更新紀錄（有新內容）" };
    const panelWidthLabels = code === "zh-Hans"
      ? {"左パネルの幅": "左侧面板宽度", "右パネルの幅": "右侧面板宽度", "引き出しの幅": "抽屉面板宽度", "ドラッグで幅を変更。左右キーで調整、ダブルクリックまたはEnterで元に戻す": "拖动调整宽度。用左右方向键微调，双击或按Enter恢复默认"}
      : {"左パネルの幅": "左側面板寬度", "右パネルの幅": "右側面板寬度", "引き出しの幅": "抽屜面板寬度", "ドラッグで幅を変更。左右キーで調整、ダブルクリックまたはEnterで元に戻す": "拖曳調整寬度。用左右方向鍵微調，按兩下或按Enter恢復預設"};
    const panelLayoutLabels = code === "zh-Hans"
      ? { "パネルの表示スタイル": "面板显示样式", "表示スタイル": "显示样式", "2列表示、1列表示、iPad表示モードをこの端末ごとに切り替えます。": "在此设备上切换双栏显示、单栏显示和iPad显示模式。", "2列表示": "双栏显示", "1列表示": "单栏显示", "1列・左": "单栏・左侧", "1列・右": "单栏・右侧", "2列表示では左右に分け、1列表示では全パネルを一方の列へ並べます。": "双栏显示时面板分列左右；单栏显示时所有面板排在同一侧。", "1列の位置": "单栏位置", "左側": "左侧", "右側": "右侧", "1列表示のパネル列を左側か右側へ置きます。": "将单栏面板放在左侧或右侧。", "iPad表示モード": "iPad显示模式", "iPad用の左アイコン列と引き出しで操作します。切り替え後に画面を読み込み直します。": "使用iPad的左侧图标栏和抽屉操作。切换后会重新加载页面。", "このiPad PWAでは常に有効です。": "此iPad PWA中始终启用。" }
      : { "パネルの表示スタイル": "面板顯示樣式", "表示スタイル": "顯示樣式", "2列表示、1列表示、iPad表示モードをこの端末ごとに切り替えます。": "在此裝置上切換雙欄顯示、單欄顯示和iPad顯示模式。", "2列表示": "雙欄顯示", "1列表示": "單欄顯示", "1列・左": "單欄・左側", "1列・右": "單欄・右側", "2列表示では左右に分け、1列表示では全パネルを一方の列へ並べます。": "雙欄顯示時面板分列左右；單欄顯示時所有面板排在同一側。", "1列の位置": "單欄位置", "左側": "左側", "右側": "右側", "1列表示のパネル列を左側か右側へ置きます。": "將單欄面板放在左側或右側。", "iPad表示モード": "iPad顯示模式", "iPad用の左アイコン列と引き出しで操作します。切り替え後に画面を読み込み直します。": "使用iPad的左側圖示欄和抽屜操作。切換後會重新載入頁面。", "このiPad PWAでは常に有効です。": "此iPad PWA中始終啟用。" };
    const panelLayoutResetLabels = code === "zh-Hans"
      ? { "パネル配置を初期状態に戻す": "恢复面板初始布局", "今開いているショーの位置・並び・開閉と、この端末のパネル幅・表示スタイルだけを戻します。ショーの内容や他の設定は残ります。": "只恢复当前演出的面板位置、顺序、展开状态，以及本设备的面板宽度和显示样式。演出内容和其他设置会保留。", "配置を戻す": "恢复布局", "パネル配置を初期状態に戻しますか？ショーの内容、スキン、機能設定は変わりません。": "要恢复面板的初始布局吗？演出内容、皮肤和功能设置不会改变。" }
      : { "パネル配置を初期状態に戻す": "恢復面板初始配置", "今開いているショーの位置・並び・開閉と、この端末のパネル幅・表示スタイルだけを戻します。ショーの内容や他の設定は残ります。": "只恢復目前演出的面板位置、順序、展開狀態，以及本裝置的面板寬度和顯示樣式。演出內容和其他設定會保留。", "配置を戻す": "恢復配置", "パネル配置を初期状態に戻しますか？ショーの内容、スキン、機能設定は変わりません。": "要恢復面板的初始配置嗎？演出內容、外觀和功能設定不會改變。" };
    const betaAudioLabels = code === "zh-Hans"
      ? { "ベータ版ではMP3またはM4A/AAC（1ファイル50MBまで）を使用してください。WAVは容量が大きくなりやすく、ブラウザの保存領域を圧迫して読み込み失敗につながるため使用できません。": "此测试版请使用MP3或M4A/AAC（每个文件不超过50MB）。WAV文件通常容量较大，容易占用浏览器存储空间并导致导入失败，因此不支持。", "ベータ版ではWAV音源を読み込めません。MP3またはM4A/AACへ変換してください。": "此测试版无法导入WAV音频。请转换为MP3或M4A/AAC。", "ベータ版では音源を50MB以下にしてください。MP3またはM4A/AACへ変換すると容量を抑えられます。": "此测试版的音频文件必须小于或等于50MB。转换为MP3或M4A/AAC可以减小文件容量。", "ベータ版で読み込める音源はMP3またはM4A/AACです。": "此测试版支持导入MP3或M4A/AAC音频。" }
      : { "ベータ版ではMP3またはM4A/AAC（1ファイル50MBまで）を使用してください。WAVは容量が大きくなりやすく、ブラウザの保存領域を圧迫して読み込み失敗につながるため使用できません。": "此測試版請使用MP3或M4A/AAC（每個檔案不超過50MB）。WAV檔通常容量較大，容易占用瀏覽器儲存空間並導致匯入失敗，因此不支援。", "ベータ版ではWAV音源を読み込めません。MP3またはM4A/AACへ変換してください。": "此測試版無法載入WAV音訊。請轉換為MP3或M4A/AAC。", "ベータ版では音源を50MB以下にしてください。MP3またはM4A/AACへ変換すると容量を抑えられます。": "此測試版的音訊檔必須小於或等於50MB。轉換為MP3或M4A/AAC可以減少檔案容量。", "ベータ版で読み込める音源はMP3またはM4A/AACです。": "此測試版支援載入MP3或M4A/AAC音訊。" };
    const multiSelectLabels = code === "zh-Hans"
      ? { "複数選択と整列": "多选与排列", "平面図でドラッグまたはShiftクリックして選び、選択したものだけを並べ直す": "在平面图中拖框或按住Shift点击选择，只重新排列所选项目", "複数選択あり": "可多选", "ドラッグで囲うか、Shiftを押しながら選択": "拖框圈选，或按住Shift点击选择", "選択だけ整列": "排列所选", "選択したものだけ整列": "仅排列所选项目", "平面図で選択したものだけ整列": "仅排列平面图中选中的项目", "整列するものを2つ以上選択してください": "请选择两个或更多要排列的项目", "横1列": "横向一排", "縦1列": "纵向一列", "斜め1列（／）": "斜向一列（／）", "斜め1列（＼）": "斜向一列（＼）", "逆V字": "倒V形" }
      : { "複数選択と整列": "多選與排列", "平面図でドラッグまたはShiftクリックして選び、選択したものだけを並べ直す": "在平面圖中拖框或按住Shift點擊選取，只重新排列所選項目", "複数選択あり": "可多選", "ドラッグで囲うか、Shiftを押しながら選択": "拖框圈選，或按住Shift點擊選取", "選択だけ整列": "排列所選", "選択したものだけ整列": "僅排列所選項目", "平面図で選択したものだけ整列": "僅排列平面圖中選取的項目", "整列するものを2つ以上選択してください": "請選取兩個或更多要排列的項目", "横1列": "橫向一排", "縦1列": "縱向一列", "斜め1列（／）": "斜向一列（／）", "斜め1列（＼）": "斜向一列（＼）", "逆V字": "倒V形" };
    const rosterResizeLabels = code === "zh-Hans"
      ? { "ドラッグで高さを変更。上下キーで調整、ダブルクリックまたはEnterで元に戻す": "拖动调整高度。用上下方向键微调，双击或按Enter恢复默认", "演者の一覧の高さ": "演员列表高度", "舞台セットの一覧の高さ": "布景装置列表高度", "大道具の一覧の高さ": "布景装置列表高度", "小道具の一覧の高さ": "小道具列表高度" }
      : { "ドラッグで高さを変更。上下キーで調整、ダブルクリックまたはEnterで元に戻す": "拖曳調整高度。用上下方向鍵微調，按兩下或按Enter恢復預設", "演者の一覧の高さ": "演員列表高度", "舞台セットの一覧の高さ": "佈景裝置列表高度", "大道具の一覧の高さ": "佈景裝置列表高度", "小道具の一覧の高さ": "小道具列表高度" };
    const timelineLabels = code === "zh-Hans"
      ? { "編集モード": "编辑模式", "通常モード": "常规模式", "タイムラインモード": "时间轴模式", "3Dモード": "3D模式", "タイムラインを再生": "播放时间轴", "タイムラインを一時停止": "暂停时间轴", "タイムラインの音源": "时间轴音源", "タイムラインの単位": "时间轴单位", "タイムラインの拡大率": "时间轴缩放", "音楽とシーンのタイムライン": "音乐与场景时间轴", "表示する図。正面または平面": "选择显示的视图：正视图或平面图", "セクションなし": "无段落", "タイミング未設定": "未设置时间", "タイミング未設定・仮の間隔で表示": "未设置时间・按临时间隔显示", "音源未設定": "未设置音源", "ショー全体": "整个演出", "無題のセクション": "未命名段落", "カウント": "计数", "カウント式": "计数式", "時間式": "时间式", "シーン時間": "场景时长", "シーン時間を調整": "调整场景时长", "シーン時間（秒）": "场景时长（秒）", "シーン時間で再生": "按场景时长播放", "音源なし・シーン時間で再生": "无音源・按场景时长播放", "再生位置へキューを追加": "在播放位置添加提示", "キューを追加": "添加提示", "ライトキュー": "灯光提示", "音楽キュー": "音乐提示", "セリフキュー": "台词提示", "選択してDeleteで削除": "选择后按Delete删除", "演者がショーの動きを確認するためのViewerのリンクです。": "这是供演员确认演出走位的Viewer链接。" }
      : { "編集モード": "編輯模式", "通常モード": "一般模式", "タイムラインモード": "時間軸模式", "3Dモード": "3D模式", "タイムラインを再生": "播放時間軸", "タイムラインを一時停止": "暫停時間軸", "タイムラインの音源": "時間軸音源", "タイムラインの単位": "時間軸單位", "タイムラインの拡大率": "時間軸縮放", "音楽とシーンのタイムライン": "音樂與場景時間軸", "表示する図。正面または平面": "選擇顯示的視圖：正視圖或平面圖", "セクションなし": "無段落", "タイミング未設定": "未設定時間", "タイミング未設定・仮の間隔で表示": "未設定時間・按臨時間隔顯示", "音源未設定": "未設定音源", "ショー全体": "整個演出", "無題のセクション": "未命名段落", "カウント": "計數", "カウント式": "計數式", "時間式": "時間式", "シーン時間": "場景時長", "シーン時間を調整": "調整場景時長", "シーン時間（秒）": "場景時長（秒）", "シーン時間で再生": "按場景時長播放", "音源なし・シーン時間で再生": "無音源・按場景時長播放", "再生位置へキューを追加": "在播放位置新增提示", "キューを追加": "新增提示", "ライトキュー": "燈光提示", "音楽キュー": "音樂提示", "セリフキュー": "台詞提示", "選択してDeleteで削除": "選取後按Delete刪除", "演者がショーの動きを確認するためのViewerのリンクです。": "這是供演員確認演出走位的Viewer連結。" };
    Object.assign(timelineLabels, code === "zh-Hans"
      ? { "セクション時間": "分段时长", "セクション時間を調整": "调整分段时长", "セクション時間（秒）": "分段时长（秒）", "セクション時間で再生": "按分段时长播放", "音源なし・セクション時間で再生": "无音源・按分段时长播放", "数値を左右へドラッグして変更。Shiftキーで10秒刻み": "左右拖动数字进行更改。按住Shift以10秒为单位调整", "タイムラインの単位を切り替える": "切换时间轴单位", "カウント式と時間式を切り替える": "切换计数式和时间式", "順番を変える": "更改顺序", "行の高さを変える": "调整行高", "ドラッグして順番を変える": "拖动以更改顺序", "タイムライン表示設定": "时间轴显示设置", "表示するレーン": "显示的轨道", "この端末": "此设备" }
      : { "セクション時間": "段落時長", "セクション時間を調整": "調整段落時長", "セクション時間（秒）": "段落時長（秒）", "セクション時間で再生": "按段落時長播放", "音源なし・セクション時間で再生": "無音源・按段落時長播放", "数値を左右へドラッグして変更。Shiftキーで10秒刻み": "左右拖曳數字進行變更。按住Shift以10秒為單位調整", "タイムラインの単位を切り替える": "切換時間軸單位", "カウント式と時間式を切り替える": "切換計數式和時間式", "順番を変える": "變更順序", "行の高さを変える": "調整列高", "ドラッグして順番を変える": "拖曳以變更順序", "タイムライン表示設定": "時間軸顯示設定", "表示するレーン": "顯示的軌道", "この端末": "此裝置" });
    Object.assign(timelineLabels, code === "zh-Hans"
      ? { "スナップ": "吸附", "スナップ単位": "吸附间隔" }
      : { "スナップ": "吸附", "スナップ単位": "吸附間隔" });
    Object.assign(timelineLabels, code === "zh-Hans"
      ? { "カウント合わせ": "计数对齐", "開始位置": "开始位置", "第": "第", "押すとこの位置を固定します": "按下可固定此位置", "押すと鍵を開きます": "按下可解锁", "横へドラッグして調整。押すと鍵を閉じます": "横向拖动调整；按下可锁定", "横へドラッグして調整。押すと丸へ戻します": "横向拖动调整；按下可恢复为未设定圆点", "まとまりの頭に近い位置で押してください": "请在更接近乐句开头的位置按下", "丸 → 閉じた鍵 → 開いた鍵。開いた鍵は横へドラッグして時刻を合わせます": "未设定圆点 → 闭锁 → 开锁。横向拖动开锁可对齐时间" }
      : { "カウント合わせ": "計數對齊", "開始位置": "開始位置", "第": "第", "押すとこの位置を固定します": "按下可固定此位置", "押すと鍵を開きます": "按下可解鎖", "横へドラッグして調整。押すと鍵を閉じます": "橫向拖曳調整；按下可鎖定", "横へドラッグして調整。押すと丸へ戻します": "橫向拖曳調整；按下可恢復為未設定圓點", "まとまりの頭に近い位置で押してください": "請在更接近樂句開頭的位置按下", "丸 → 閉じた鍵 → 開いた鍵。開いた鍵は横へドラッグして時刻を合わせます": "未設定圓點 → 閉鎖 → 開鎖。橫向拖曳開鎖可對齊時間" });
    Object.assign(timelineLabels, code === "zh-Hans"
      ? { "固定しない": "不固定", "開始時刻を固定": "固定开始时间", "終了時刻を固定": "固定结束时间", "キューポイントを固定": "固定提示点", "時刻の固定": "时间固定", "キューポイントの固定": "提示点固定", "固定された時刻に影響するため調整できません": "此调整会移动已固定的时间，因此无法调整" }
      : { "固定しない": "不固定", "開始時刻を固定": "固定開始時間", "終了時刻を固定": "固定結束時間", "キューポイントを固定": "固定提示點", "時刻の固定": "時間固定", "キューポイントの固定": "提示點固定", "固定された時刻に影響するため調整できません": "此調整會移動已固定的時間，因此無法調整" });
    // 選択灯「型」UIの固定ラベル23件を中国語パックにも明示している。
    assert.equal(Object.keys(pack.text).length, 1050 + Object.keys(viewSelectLabels).length + Object.keys(panelWidthLabels).length + Object.keys(skinLabels).length + Object.keys(aboutFeedbackLabels).length + Object.keys(releaseHistoryLabels).length + Object.keys(releaseNotificationLabels).length + Object.keys(exportLabels).length + Object.keys(projectExportLabels).length + Object.keys(projectSettingsLabels).length + Object.keys(drumLabels).length + Object.keys(drawerLabels).length + Object.keys(maskLabels).length + Object.keys(batchUiLabels).length + Object.keys(shapeGroupLabels).length + Object.keys(sceneCreateLabels).length + Object.keys(sectionUiLabels).length + Object.keys(sceneSubtitleLabels).length + Object.keys(transitionLabels).length + Object.keys(panelLayoutLabels).length + Object.keys(panelLayoutResetLabels).length + Object.keys(multiSelectLabels).length + Object.keys(rosterResizeLabels).length + Object.keys(wideVenueTextLabels).length + Object.keys(timelineLabels).length + Object.keys(betaAudioLabels).length + 35);
    assert.equal(Object.keys(pack.maps).length, 20);
    assert.equal(mapIdCount(pack.maps), 259 + Object.keys(climbLabels).length + Object.keys(sceneToolHintLabels).length + 12);
    assert.equal(pack.say.length, 245);
    const expected = replaceProductName(packSnapshot(draft), localName);
    delete expected.text["この部屋を作る"];
    delete expected.text["劇場サイズ"];
    delete expected.text["近い形から始め、辺は一方向、角は二方向へ動かします。角の長押しで欠き取れます。"];
    delete expected.text["矩形"];
    delete expected.text["1. メインの形を選択してください"];
    delete expected.text["2. 天井の高さを指定してください"];
    delete expected.text["文字を打っている最中は効きません。WindowsとLinuxでは⌘をCtrlに読み替えてください。"];
    Object.assign(expected.text, customVenueLabels, viewSelectLabels, wideVenueTextLabels);
    Object.assign(expected.text, venueTypeLabels, transitionLabels);
    Object.assign(expected.text, exportLabels, projectExportLabels, projectSettingsLabels, shortcutNoteLabels, drawerLabels, batchUiLabels, sceneCreateLabels, sectionUiLabels, sceneSubtitleLabels);
    Object.assign(expected.text, drumLabels, maskLabels, skinLabels, aboutFeedbackLabels, releaseHistoryLabels, releaseNotificationLabels, panelWidthLabels, shapeGroupLabels, panelLayoutLabels, panelLayoutResetLabels, multiSelectLabels);
    Object.assign(expected.text, timelineLabels, betaAudioLabels, rosterResizeLabels);
    Object.assign(expected.text, code === "zh-Hans"
      ? {
        "劇場": "剧场",
        "劇場形式を選び、カスタムステージを制作する": "选择剧场形式并制作自定义舞台",
        "音源情報": "音源信息",
        "ダブルクリックで音源情報": "双击查看音源信息",
        "ゲイン": "增益",
        "長さ": "时长",
        "0 dB が元の音量です。ヘッダーの音量とは別に、この音源だけへ適用されます。": "0 dB 保持原始电平。此设置仅应用于该音源，与页眉音量分开。",
      }
      : {
        "劇場": "劇場",
        "劇場形式を選び、カスタムステージを制作する": "選擇劇場形式並製作自訂舞台",
        "音源情報": "音源資訊",
        "ダブルクリックで音源情報": "按兩下查看音源資訊",
        "ゲイン": "增益",
        "長さ": "時長",
        "0 dB が元の音量です。ヘッダーの音量とは別に、この音源だけへ適用されます。": "0 dB 保持原始電平。此設定僅套用於該音源，與頁首音量分開。",
      });
    Object.assign(expected.text, code === "zh-Hans" ? {
      "劇場を書き出す": "导出剧场", "劇場を読み込む": "导入剧场", "劇場情報": "剧场信息",
      "カスタム劇場の平面。追加ステージ、客席、舞台袖を描きます": "自定义剧场平面图，用于绘制追加舞台、观众区和侧台区域",
      "劇場名": "剧场名称", "この劇場を反映する": "应用此剧场", "劇場ライブラリの取り込み": "导入剧场库",
      "内容を確認してから、取り込む劇場を確定してください。": "请先确认内容，再确定要导入的剧场。",
      "取り込みを確認する劇場": "待确认导入的剧场", "劇場データの共有確認": "剧场数据共享确认",
      "この劇場の資料は外部共有不可の設定です。": "该剧场的资料被设为不可对外共享。",
      "劇場データを含めます": "包含剧场数据", "劇場は含めず書き出します": "不含剧场导出",
      "劇場セットアップを戻しますか？": "要退出剧场设置吗？", "まだ反映していない劇場データは消えます。": "尚未应用的剧场数据将会丢失。",
      "編集を続ける": "继续编辑", "変更を破棄して戻る": "放弃更改并返回", "劇場から導く3本の線": "由剧场推导的3条线",
    } : {
      "劇場を書き出す": "匯出劇場", "劇場を読み込む": "匯入劇場", "劇場情報": "劇場資訊",
      "カスタム劇場の平面。追加ステージ、客席、舞台袖を描きます": "自訂劇場平面圖，用於繪製追加舞台、觀眾區和側台區域",
      "劇場名": "劇場名稱", "この劇場を反映する": "套用此劇場", "劇場ライブラリの取り込み": "匯入劇場庫",
      "内容を確認してから、取り込む劇場を確定してください。": "請先確認內容，再確定要匯入的劇場。",
      "取り込みを確認する劇場": "待確認匯入的劇場", "劇場データの共有確認": "劇場資料共享確認",
      "この劇場の資料は外部共有不可の設定です。": "該劇場的資料被設為不可對外共享。",
      "劇場データを含めます": "包含劇場資料", "劇場は含めず書き出します": "不含劇場匯出",
      "劇場セットアップを戻しますか？": "要離開劇場設定嗎？", "まだ反映していない劇場データは消えます。": "尚未套用的劇場資料將會遺失。",
      "編集を続ける": "繼續編輯", "変更を破棄して戻る": "捨棄變更並返回", "劇場から導く3本の線": "由劇場推導的3條線",
    });
    Object.assign(expected.maps.propShape, { drumset: drumLabels["ドラムセット"], taiko: drumLabels["大太鼓"], mask: maskLabels["マスク（仮面）"] }, climbLabels);
    Object.assign(expected.maps.tool, sceneToolHintLabels);
    Object.entries(wideVenueMaps).forEach(([group, values]) => Object.assign(expected.maps[group], values));
    const venueTemplateSayIndex = expected.say.findIndex((item) =>
      item.source === "^(.+)（(.+)）を読み込みました。$");
    assert.ok(venueTemplateSayIndex >= 0);
    expected.say.splice(venueTemplateSayIndex + 1, 0, {
      source: "^(.+)をカスタム編集の初期形に読み込みました。$",
      flags: "",
      replacement: code === "zh-Hans"
        ? "已将“$1”载入为自定义编辑的初始形状。"
        : "已將「$1」載入為自訂編輯的初始形狀。",
    });
    const maskSayIndex = expected.say.findIndex((item) => item.source === "^両手がふさがっています。$");
    assert.ok(maskSayIndex >= 0);
    expected.say.splice(maskSayIndex + 1, 0, ...["顔にはすでに仮面がついています。", "仮面を顔につけました。", "仮面を外しました。"].map((key) => ({ source: `^${key}$`, flags: "", replacement: maskLabels[key] })));
    const sceneCreateSayIndex = expected.say.findIndex((item) => item.source === "^仮面を外しました。$");
    expected.say.splice(sceneCreateSayIndex + 1, 0,
      ...["引き継ぐものを1つ以上選んでください。", "次のシーンを作りました。"].map((key) => ({
        source: `^${key}$`, flags: "", replacement: sceneCreateLabels[key],
      })));
    const multiSelectSay = code === "zh-Hans"
      ? [["^(\\d+)件を選択しました。$", "已选择$1项。"], ["^(\\d+)件選択中$", "已选择$1项"], ["^(\\d+)人の演者$", "$1名演员"], ["^(\\d+)件を選択$", "已选择$1项"], ["^ドラッグで全員の位置を動かせます。姿勢と向きの変更は、選んだ全員に反映します。$", "拖动可移动所有人的位置。姿势和朝向会应用到所有已选演员。"], ["^ドラッグで、選んだものの位置をまとめて動かせます。$", "拖动可一起移动所有已选项目。"], ["^複数の姿勢$", "多种姿势"], ["^複数の向き$", "多个朝向"], ["^(\\d+)人の姿勢を「(.+)」にしました。$", "已将$1名演员的姿势改为“$2”。"], ["^複数選択を解除しました。$", "已取消多选。"], ["^囲いの中に選択できるものがありません。$", "框内没有可选择的项目。"], ["^整列するものを2つ以上選択してください。$", "请选择两个或更多要排列的项目。"], ["^選択したものを等間隔の横1列に並べました。$", "已将所选项目排成等距横排。"], ["^選択したものを等間隔の縦1列に並べました。$", "已将所选项目排成等距纵列。"], ["^選択したものを斜め1列（／）に並べました。$", "已将所选项目排成斜列（／）。"], ["^選択したものを斜め1列（＼）に並べました。$", "已将所选项目排成斜列（＼）。"], ["^選択したものを円に並べました。$", "已将所选项目排成圆形。"], ["^選択したものをV字に並べました。$", "已将所选项目排成V形。"], ["^選択したものを逆V字に並べました。$", "已将所选项目排成倒V形。"]]
      : [["^(\\d+)件を選択しました。$", "已選取$1項。"], ["^(\\d+)件選択中$", "已選取$1項"], ["^(\\d+)人の演者$", "$1名演員"], ["^(\\d+)件を選択$", "已選取$1項"], ["^ドラッグで全員の位置を動かせます。姿勢と向きの変更は、選んだ全員に反映します。$", "拖曳可移動所有人的位置。姿勢和朝向會套用到所有已選演員。"], ["^ドラッグで、選んだものの位置をまとめて動かせます。$", "拖曳可一起移動所有已選項目。"], ["^複数の姿勢$", "多種姿勢"], ["^複数の向き$", "多個朝向"], ["^(\\d+)人の姿勢を「(.+)」にしました。$", "已將$1名演員的姿勢改為「$2」。"], ["^複数選択を解除しました。$", "已取消多選。"], ["^囲いの中に選択できるものがありません。$", "框內沒有可選取的項目。"], ["^整列するものを2つ以上選択してください。$", "請選取兩個或更多要排列的項目。"], ["^選択したものを等間隔の横1列に並べました。$", "已將所選項目排成等距橫排。"], ["^選択したものを等間隔の縦1列に並べました。$", "已將所選項目排成等距縱列。"], ["^選択したものを斜め1列（／）に並べました。$", "已將所選項目排成斜列（／）。"], ["^選択したものを斜め1列（＼）に並べました。$", "已將所選項目排成斜列（＼）。"], ["^選択したものを円に並べました。$", "已將所選項目排成圓形。"], ["^選択したものをV字に並べました。$", "已將所選項目排成V形。"], ["^選択したものを逆V字に並べました。$", "已將所選項目排成倒V形。"]];
    const multiSelectSayIndex = expected.say.findIndex((item) => item.source === "^舞台上の演者をV字に並べました。$");
    expected.say.splice(multiSelectSayIndex + 1, 0,
      ...multiSelectSay.map(([source, replacement]) => ({ source, flags: "", replacement })));
    // 名前だけが変わった8鍵と全画面の操作案内3文型を明示して照合する。
    const fullscreenLabels = [
      ["プレゼン", "全画面", "全屏", "全螢幕"],
      ["正面図だけを全画面で見せる。矢印キーでシーン送り、Escで戻る", "図を全画面表示（F）。矢印キーでシーン送り、FまたはEscで戻る", "全屏显示当前视图（F）。方向键切换场景，F或Esc退出", "全螢幕顯示目前視圖（F）。方向鍵切換場景，F或Esc離開"],
      ["プレゼンモード", "全画面表示", "全屏显示", "全螢幕顯示"],
      ["上部の「プレゼン」で正面図だけを全画面に。矢印キーでシーン送り、Escで戻る", "上部の「全画面」またはFキーで図を全画面に。右下の小窓で正面と平面を入れ替えられます", "点击顶部的“全屏”或按F键。点击右下角的小窗可切换正视图和平面图", "點選上方的「全螢幕」或按F鍵。點選右下角的小視窗可切換正視圖和平面圖"],
      ["プレゼンの説明", "全画面の説明", "全屏说明文字", "全螢幕說明文字"],
      ["全画面のプレゼンで、絵の下にシーン名と説明を出す", "全画面表示で、絵の下にシーン名と説明を出す", "全屏显示时，在画面下方显示场景名和说明", "全螢幕顯示時，在畫面下方顯示場景名和說明"],
      ["プレゼンを終える", "全画面を終了", "退出全屏", "離開全螢幕"],
      ["窓を閉じる・プレゼンを終える", "窓を閉じる・全画面を終了", "关闭窗口・退出全屏", "關閉視窗・離開全螢幕"],
    ];
    const translationIndex = code === "zh-Hans" ? 2 : 3;
    fullscreenLabels.forEach((row) => {
      assert.ok(row[0] in expected.text, row[0]);
      delete expected.text[row[0]];
      expected.text[row[1]] = row[translationIndex];
    });
    const fullscreenSay = [
      ["^プレゼンモードです。矢印キーでシーン送り、Escで戻ります。$", "^全画面表示です。矢印キーでシーン送り、FまたはEscで戻ります。$", "已全屏显示。方向键切换场景，F或Esc退出。", "已全螢幕顯示。方向鍵切換場景，F或Esc離開。"],
      ["^プレゼンモードです。左右のタップでシーン送り、✕で戻ります。$", "^全画面表示です。下の矢印でシーン送り、右上のボタン・F・Escで戻ります。$", "已全屏显示。使用下方箭头切换场景，点击右上角按钮或按F、Esc返回。", "已全螢幕顯示。使用下方箭頭切換場景，點選右上角按鈕或按F、Esc返回。"],
      ["^プレゼンを終えました。$", "^全画面表示を終了しました。$", "已退出全屏显示。", "已離開全螢幕顯示。"],
    ];
    fullscreenSay.forEach((row) => {
      const message = expected.say.find((item) => item.source === row[0]);
      assert.ok(message, row[0]);
      message.source = row[1];
      message.replacement = row[translationIndex];
    });
    expected.needsReview = expected.needsReview.map((key) => key === "text.プレゼン" ? "text.全画面" : key);
    expected.needsReview.unshift(...wideVenueNeedsReview);

    // ドラフトを起点にしつつ、公開パックには後続UIの翻訳が追加される。
    // 完全一致ではなく、現行パックがドラフト時点より後退していないことを守る。
    assert.ok(Object.keys(pack.text).length >= Object.keys(expected.text).length);
    assert.ok(Object.keys(pack.maps).length >= Object.keys(expected.maps).length);
    assert.ok(pack.say.length >= expected.say.length);
    assert.equal(JSON.stringify(packSnapshot(pack)).includes(localName), false);
  });

  test(`${code}パックの鍵・群・id・SAY sourceは英語パックの部分集合`, () => {
    const pack = zhPacks[code];
    assert.deepEqual(Object.keys(pack.text).filter((key) => (
      !(key in englishPack.text) && !ALLOWED_ZH_ONLY_TEXT_KEYS.includes(key)
    )), []);
    assert.deepEqual(Object.keys(pack.maps).filter((group) => !(group in englishPack.maps)), []);
    for (const [group, values] of Object.entries(pack.maps)) {
      assert.deepEqual(Object.keys(values).filter((id) => (
        !(id in englishPack.maps[group])
        && !ALLOWED_ZH_ONLY_MAP_IDS.some(([allowedGroup, allowedId]) => (
          allowedGroup === group && allowedId === id
        ))
      )), [], group);
    }
    const englishSaySources = new Set(Array.from(englishPack.say, ([pattern]) => pattern.source));
    assert.deepEqual(Array.from(pack.say, ([pattern]) => pattern.source)
      .filter((source) => !englishSaySources.has(source)), []);
  });

  test(`${code}は欠落値をTEXT・MAPS・SAY・generatedの順で英語へ落とす`, () => {
    const pack = zhPacks[code];
    assert.equal(resolvedPackValue(pack, "text", (values) => values["楽曲"], "楽曲"), "Music");
    assert.equal(resolvedPackValue(pack, "maps", (maps) => maps.setBuilder?.["箱"], "箱"), "box");
    const message = "ショー一覧を更新できなかったため、消していません。";
    assert.equal(resolvedPackValue(pack, "say", (say) => translatedSay(say, message), message),
      "Could not update the show shelf, so nothing was deleted.");
    assert.equal(resolvedPackValue({ ...pack, generated: {} }, "generated",
      (generated) => generated.sceneTitle?.replace("{n}", "3"), "シーン 3"), "Scene 3");
  });

  test(`${code}は重複鍵・引用符の系統違い・同一MAPS群内の訳語衝突がない`, () => {
    const pack = zhPacks[code];
    const duplicateMapValues = [];
    for (const [group, values] of Object.entries(pack.maps)) {
      const entries = Object.entries(values);
      entries.forEach(([id, value], index) => {
        const prior = entries.findIndex(([priorId, candidate]) => (
          candidate === value && englishPack.maps[group][priorId] !== englishPack.maps[group][id]
        ));
        if (prior === -1 || prior === index) return;
        const priorId = entries[prior][0];
        const allowed = ALLOWED_MAP_VALUE_COLLISIONS[code].some(([allowedGroup, firstId, secondId]) => (
          allowedGroup === group
          && ((firstId === priorId && secondId === id) || (firstId === id && secondId === priorId))
        ));
        if (!allowed) duplicateMapValues.push(`${group}.${id} = ${value}`);
      });
    }
    assert.deepEqual(duplicateMapValues, []);
    const values = [
      ...Object.values(pack.text),
      ...Object.values(pack.maps).flatMap((group) => Object.values(group)),
      ...evaluatedSayReplacements(pack),
      ...Object.values(pack.generated),
    ].join("\n");
    if (code === "zh-Hant") assert.doesNotMatch(values, /[“”]/);
    else assert.doesNotMatch(values, /[「」]/);

    const source = zhSources[code];
    const textStart = source.indexOf("const TEXT = {");
    const textEnd = source.indexOf("\n  const MAPS =", textStart);
    assert.ok(textStart >= 0 && textEnd > textStart);
    const keys = [...source.slice(textStart, textEnd).matchAll(/^\s*"((?:\\.|[^"])*)"\s*:/gm)]
      .map((match) => JSON.parse(`"${match[1]}"`));
    assert.deepEqual(keys.filter((key, index) => keys.indexOf(key) !== index), []);
  });
}

test("Set Builderの38語はTEXTと分けたMAPS群から引く", () => {
  const expected = {
    "セットビルダー": "Set Builder", "閉じる": "Close", "モデル": "Models",
    "新規": "New", "複製": "Duplicate", "名前変更": "Rename", "削除": "Delete",
    "JSONで書き出す": "Export JSON", "読み込む": "Import", "覚え書き": "Note",
    "プレビュー": "Preview", "部品": "Parts", "追加": "Add", "上へ": "Move up",
    "下へ": "Move down", "種類": "Shape", "位置": "Position", "寸法": "Dimensions",
    "幅": "Width", "奥行き": "Depth", "高さ": "Height", "直径": "Diameter",
    "回転": "Rotation", "段数": "Steps", "明暗": "Tint", "選択した部品はありません": "No part selected",
    "このモデルを削除しますか？": "Delete this model?", "部品を削除しますか？": "Delete this part?",
    "モデル名": "Model name", "読み込めるセットモデルがありません。": "No set models could be imported.",
    "新しいセット": "New set", "の複製": " copy",
    "箱": "box", "パネル": "panel", "円柱": "cylinder", "球": "sphere", "階段": "step", "斜面": "ramp",
  };
  assert.deepEqual(Object.fromEntries(Object.entries(englishPack.maps.setBuilder)), expected);
  assert.equal(Object.keys(expected).length, 38);
  assert.doesNotMatch(setBuilderSource, /\b(?:WORDS|isEn)\b/);
  assert.match(setBuilderSource, /const t = \(value\) => tm\("setBuilder", value, value\);/);
});

test("TEXTに重複キーがない", () => {
  const body = i18nSource.match(/const TEXT = \{([\s\S]*?)\n  \};\n\n  \/\* 中で組み立てる名前/);
  assert.ok(body, "TEXT object source should be found");
  const keys = [...body[1].matchAll(/^\s*"((?:\\.|[^"])*)"\s*:/gm)]
    .map((match) => JSON.parse(`"${match[1]}"`));
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  assert.deepEqual(duplicates, []);
});

test("TEXTに空文字・言語コード・HTMLパスの鍵がない", () => {
  const forbidden = Object.keys(text).filter((key) => (
    key === ""
    || /^[a-z]{2}(-[A-Za-z]+)?$/.test(key)
    || key === "EN"
    || key.endsWith(".html")
  ));
  assert.deepEqual(forbidden, []);
});

test("stage-sketch.jsに日英二択のisEn()を残さない", () => {
  assert.doesNotMatch(stageSource, /\bisEn\s*\(/);
});

test("実行時ヘルパーは言語ごとの値と英語フォールバックを返す", () => {
  assert.equal(runtimeI18n.languageValue("ja", "English sample", "日本語見本"), "日本語見本");
  assert.equal(runtimeI18n.languageValue("en", "English sample", "日本語見本"), "English sample");
  assert.equal(runtimeI18n.languageValue("zh-Hant", "English sample", "日本語見本"), "English sample");
  assert.equal(runtimeI18n.map("zh-Hant", "dimBy", "pole.h", "ポールの高さ"), "竿高");
  assert.equal(runtimeI18n.textWithEnglish("en", "unknown", "不明"), "unknown");
  assert.equal(runtimeI18n.textWithEnglish("zh-Hans", "unknown", "不明"), "不明");
  assert.equal(runtimeI18n.textWithEnglish(
    "zh-Hant",
    "No screen text yet. Type a word and press Project.",
    "まだありません。言葉を入れて〈映す〉を押してください。",
  ), "還沒有內容。輸入文字後按「投影」。");
  assert.equal(runtimeI18n.text("zh-Hans", "秒"), "秒");
  assert.equal(runtimeI18n.text("zh-Hant", "上手へ"), "stage left");
  assert.equal(runtimeI18n.text("zh-Hant", "下手へ"), "stage right");
  assert.equal(runtimeI18n.say("en",
    "2シーン × 正面と平面 ＝ 合計4枚をZIP 1個にまとめます。"),
  "2 scenes × front and plan = 4 images in 1 ZIP.");
  assert.equal(runtimeI18n.say("en",
    "3シーン × 1枚 ＝ 合計3枚をZIP 1個にまとめます。"),
  "3 scenes × 1 image = 3 images in 1 ZIP.");
  assert.equal(runtimeI18n.say("en", "1枚を落とします。"),
    "1 image will be downloaded.");
});

test("関数型SAY replacementは代表入力を実行して文字列を返す", () => {
  [englishPack, zhPacks["zh-Hans"], zhPacks["zh-Hant"]].forEach((pack) => {
    evaluatedSayReplacements(pack);
  });
});

test("10種のテンプレ名・役割名・範囲に英訳がある", () => {
  templates.forEach((template) => {
    assert.ok(text[template.name], `template name: ${template.name}`);
    assert.ok(text[template.range], `template range: ${template.range}`);
    template.roles.forEach((role) => assert.ok(text[role], `template role: ${role}`));
  });
  assert.equal(text["休憩"], "Intermission");
  assert.equal(text["構成テンプレートから作る"], "Create from a structure template");
  assert.equal(text["この骨格で新しいショーを作る"], "Create a new show from this structure");
});

/* ---- 英語の書式をそろえる（2026-09-05・アプリ内英語の一巡） ----
   LP・紹介ページと同じ方針: 綴りはブリティッシュ、アポストロフィは直線、
   emダッシュは前後に空白。★Aboutモーダルの英語は「承認済み英語原稿」
   （docs/stage-sketch/2026-08-03_..._英語版.md）と完全一致させる決まりなので、
   そこに載っている文言だけは対象外にする。原稿を直すのは本人の判断。 */
const approvedEnglish = new Set(
  (await readFile(
    new URL("../../docs/stage-sketch/2026-08-03_舞台スケッチ_このアプリについて_英語版.md", import.meta.url),
    "utf8",
  ))
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
);
const allEnglishValues = Object.values(text)
  .filter((v) => typeof v === "string" && !/[぀-ヿ一-鿿]/.test(v));
const englishValues = allEnglishValues.filter((v) => !approvedEnglish.has(v.trim()));

test("英語の綴りはブリティッシュにそろえる（承認済み原稿も含む）", () => {
  /* ★綴りだけは承認済み原稿も対象にする。2026-09-05、本人承認のうえで原稿側の
     theater / realize / realizing をブリティッシュに直した（約物は著者の文章として
     そのまま残す）。原稿と stage-i18n.js は完全一致が必須なので、直すときは両方。 */
  const american = ["theater", "realize", "realizing", "organize", "recognize", "analyze", "color", "center", "meter"];
  for (const word of american) {
    const hit = allEnglishValues.filter((v) => new RegExp(`\\b${word}\\b`, "i").test(v));
    assert.equal(hit.length, 0, `アメリカ綴り「${word}」が残っている: ${hit[0]}`);
  }
  // 上演のプログラムは programme（コンピュータの program と区別する）
  assert.equal(text["古典サーカス・プログラム型"], "Classical Circus Programme");
});

test("英語の約物はLPと同じ書き方にそろえる（承認済み原稿は除く）", () => {
  const curly = englishValues.filter((v) => v.includes("’"));
  assert.equal(curly.length, 0, `カーリーのアポストロフィが残っている: ${curly[0]}`);
  const tight = englishValues.filter((v) => /\S—\S/.test(v));
  assert.equal(tight.length, 0, `emダッシュの前後に空白がない: ${tight[0]}`);
});

test("同じ英語が別の意味に使われていない（太さと間口）", () => {
  /* ★2026-09-05: 線の太さも劇場の間口もどちらも "Width" だった。
     矢印の選択肢は Thin / Medium / Thick なので、見出しは Thickness が合う。 */
  assert.equal(text["太さ"], "Thickness");
  assert.equal(text["間口"], "Width");
});

test("パネルの見出しは sentence case にそろえる", () => {
  // 12枚の見出しのうち「AI指示」だけが Title Case だった
  for (const [ja, en] of [
    ["出るもの", "Cast & set"], ["舞台機構", "Stage machinery"], ["セット登録", "Saved sets"],
    ["リアルタイム共有", "Live sharing"], ["AI指示", "AI instructions"],
  ]) {
    assert.equal(text[ja], en);
  }
});


test("スキン設定の静的ラベルを英語から日本語へ戻し、独自の名前は保つ", () => {
  const start = stageSource.indexOf("    const swapText = (root) => {", stageSource.indexOf("  function applyLang()"));
  const end = stageSource.indexOf("    const swapAttr = ", start);
  assert.ok(start >= 0 && end > start);
  const originals = ["画面のスキン", "赤みの黒", "青みの黒", " My own show "];
  const nodes = originals.map((nodeValue) => ({ nodeValue, parentNode: { closest: () => null } }));
  const context = {
    lang: "en", NodeFilter: { SHOW_TEXT: 4 },
    document: { createTreeWalker: () => {
      let at = -1;
      return { nextNode: () => ++at < nodes.length, get currentNode() { return nodes[at]; } };
    } },
    packValue: (section, read) => context.lang === "ja" ? undefined : read(englishPack[section]),
    tx: (ja) => context.lang === "ja" ? ja : (englishPack.text[ja] || ja),
  };
  vm.createContext(context);
  vm.runInContext(stageSource.slice(start, end) + "this.swapText = swapText;", context);
  context.swapText({});
  assert.deepEqual(nodes.map((node) => node.nodeValue), ["Interface skin", "Warm black", "Blue black", " My own show "]);
  context.lang = "ja";
  context.swapText({});
  assert.deepEqual(nodes.map((node) => node.nodeValue), originals);
});
