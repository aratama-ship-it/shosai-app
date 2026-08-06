/* 資料棚の入口分類。正本データには書き戻さない、画面上の読み方だけを定義する。 */
(function () {
  "use strict";

  // 文字列の部分一致は使わない。例えば film を含む別の種別を映画として広げない。
  const SCREEN_CATEGORIES = new Set(["ミュージックビデオ", "映画・映像"]);
  const SCREEN_MEDIA_TYPES = new Set(["music_video", "film", "brand_film"]);

  // 作品が舞台・ライブとして記録されている確定の media_type だけを採用する。
  // 将来、hybrid を追加したい場合は shelf_memberships に両方のIDを置ける。
  const STAGING_MEDIA_TYPES = new Set([
    "academy_showcase", "arena_show", "artist_showcase_event", "ballet_show",
    "ceremony", "circus", "commissioned_event", "commissioned_event_series",
    "commissioned_performance", "community_event_show", "community_learning_circus_project",
    "concert_show", "dance_show", "event_show", "installation_performance", "live_concert",
    "multimedia_stage_and_digital_production", "musical", "opera",
    "participatory_outdoor_circus_event", "resident_show", "show", "stage_work",
    "theme_park_parade", "traditional_performance", "water_show",
  ]);
  const STAGING_CATEGORIES = new Set([
    "オペラ", "クラウン・道化", "コント・お笑い", "サーカス・アクロバット",
    "ダンス・フィジカルシアター・サーカス", "ダンス・舞踊", "バラエティ・キャバレー",
    "ファッションショー", "マジック・イリュージョン", "ミュージカル", "伝統芸能",
    "式典・イベントショー", "水上・氷上ショー", "演劇", "音楽・コンサート",
  ]);

  function memberships(work) {
    return Array.isArray(work && work.shelf_memberships) ? work.shelf_memberships : [];
  }

  function hasMembership(work, shelfId) {
    return memberships(work).includes(shelfId);
  }

  function isScreenWork(work) {
    return hasMembership(work, "screen") ||
      SCREEN_CATEGORIES.has(work && work.category) ||
      SCREEN_MEDIA_TYPES.has(work && work.media_type);
  }

  function isPureScreenWork(work) {
    return SCREEN_MEDIA_TYPES.has(work && work.media_type) && !hasMembership(work, "staging");
  }

  function isStagingWork(work) {
    if (hasMembership(work, "staging")) return true;
    // 明示的に両方へ置かれていない映画・MVは、舞台系カテゴリー語があっても混ぜない。
    if (isPureScreenWork(work)) return false;
    return STAGING_MEDIA_TYPES.has(work && work.media_type) ||
      STAGING_CATEGORIES.has(work && work.category);
  }

  const definitions = Object.freeze([
    Object.freeze({
      id: "all",
      label: "全体",
      description: "映像、舞台、展示・資料を横断して読む。",
      matches: () => true,
    }),
    Object.freeze({
      id: "screen",
      label: "映像演出",
      description: "MV・映画・ブランド映像を、画面・カメラ・編集の手がかりから読む。",
      matches: isScreenWork,
    }),
    Object.freeze({
      id: "staging",
      label: "ステージング",
      description: "舞台・ライブ・式典を、空間・客席・登退場・転換の手がかりから読む。",
      matches: isStagingWork,
    }),
  ]);

  function definitionFor(id) {
    return definitions.find((definition) => definition.id === id) || definitions[0];
  }

  function worksForShelf(works, id) {
    return (Array.isArray(works) ? works : []).filter(definitionFor(id).matches);
  }

  function shelfIdsForWork(work) {
    return definitions.filter((definition) => definition.matches(work)).map((definition) => definition.id);
  }

  window.SHOSAI_SHELVES = Object.freeze({
    definitions,
    definitionFor,
    worksForShelf,
    shelfIdsForWork,
    isScreenWork,
    isStagingWork,
  });
})();
