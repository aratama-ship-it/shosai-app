/* 制作の書斎 — ブラウザ間の端末データ移行
 *
 * localStorageはオリジンごとに分かれるため、shosai / stage の記録を
 * 一つのJSONへまとめる。Mac専用ブリッジには依存せず、通常ブラウザでも同じ処理を使う。
 */
(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (!root) return;

  root.SHOSAI_STORAGE_MIGRATION = Object.freeze(api);
  if (!root.document) return;

  const start = () => api.installUI({
    window: root,
    document: root.document,
    storage: root.localStorage,
  });
  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const KIND = "shosai-local-storage-backup";
  const VERSION = 1;
  // stage-sketch.js の ?fresh 用一覧を起点にする。これ以外の現在・将来の記録は
  // isManagedKey の接頭辞走査で拾う。
  const KNOWN_STAGE_KEYS = Object.freeze([
    "shosai-stage-sketch-v1",
    "shosai-stage-shows-v1",
    "shosai-stage-tour-v1",
    "shosai-stage-lang",
    "shosai-stage-venues-v1",
  ]);

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isManagedKey(key) {
    if (typeof key !== "string") return false;
    return KNOWN_STAGE_KEYS.includes(key)
      || key.startsWith("shosai")
      || key.startsWith("stage");
  }

  function managedKeys(storage) {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (isManagedKey(key)) keys.push(key);
    }
    return [...new Set(keys)].sort();
  }

  function createDocument(storage, exportedAt = new Date().toISOString()) {
    const entries = {};
    managedKeys(storage).forEach((key) => {
      const value = storage.getItem(key);
      if (value !== null) entries[key] = value;
    });
    return {
      kind: KIND,
      version: VERSION,
      exportedAt,
      entries,
    };
  }

  function invalid(message) {
    const error = new Error(message);
    error.name = "StorageMigrationError";
    throw error;
  }

  function validateDocument(document) {
    if (!isRecord(document)) invalid("JSONの最上位がオブジェクトではありません。");
    if (document.kind !== KIND) invalid("制作の書斎の端末データではありません（kindが違います）。");
    if (document.version !== VERSION) invalid("対応していない端末データの版です（versionが違います）。");
    if (!isRecord(document.entries)) invalid("端末データのentriesが壊れています。");

    const entries = {};
    Object.keys(document.entries).sort().forEach((key) => {
      if (!isManagedKey(key)) invalid(`移行対象外の保存キーが含まれています: ${key}`);
      if (typeof document.entries[key] !== "string") {
        invalid(`保存値が文字列ではありません: ${key}`);
      }
      entries[key] = document.entries[key];
    });
    return {
      kind: KIND,
      version: VERSION,
      exportedAt: typeof document.exportedAt === "string" ? document.exportedAt : "",
      entries,
    };
  }

  function parseDocument(text) {
    let document;
    try {
      document = JSON.parse(text);
    } catch (_) {
      invalid("JSONとして読み取れません。ファイルが壊れていないか確認してください。");
    }
    return validateDocument(document);
  }

  function planRestore(document, storage) {
    const valid = validateDocument(document);
    const keys = Object.keys(valid.entries);
    const overwriteCount = keys.filter((key) => storage.getItem(key) !== null).length;
    return {
      restoreCount: keys.length,
      overwriteCount,
      addCount: keys.length - overwriteCount,
      keys,
    };
  }

  function restoreDocument(document, storage) {
    const valid = validateDocument(document);
    const plan = planRestore(valid, storage);
    const before = Object.keys(valid.entries).map((key) => ({
      key,
      existed: storage.getItem(key) !== null,
      value: storage.getItem(key),
    }));
    const applied = [];
    try {
      before.forEach(({ key }) => {
        storage.setItem(key, valid.entries[key]);
        applied.push(key);
      });
    } catch (error) {
      // 容量不足などで途中まで書けた場合は、読み込み前の値へ可能な限り戻す。
      applied.reverse().forEach((key) => {
        const old = before.find((item) => item.key === key);
        try {
          if (old.existed) storage.setItem(key, old.value);
          else storage.removeItem(key);
        } catch (_) {
          // 復旧にも失敗した場合は、元の書き込みエラーを呼び出し側へ返す。
        }
      });
      throw error;
    }
    return plan;
  }

  function downloadDocument(windowObject, documentObject) {
    const text = JSON.stringify(documentObject, null, 2);
    const blob = new windowObject.Blob([text], { type: "application/json" });
    const link = windowObject.document.createElement("a");
    const day = (documentObject.exportedAt || "").slice(0, 10) || "backup";
    link.href = windowObject.URL.createObjectURL(blob);
    link.download = `制作の書斎-端末データ-${day}.json`;
    link.click();
    windowObject.URL.revokeObjectURL(link.href);
  }

  function installUI({ window: windowObject, document: documentObject, storage }) {
    const actions = documentObject.querySelector(".scrapbook-page-actions");
    if (!actions || documentObject.getElementById("btn-storage-migration-export")) return false;

    const exportButton = documentObject.createElement("button");
    exportButton.type = "button";
    exportButton.className = "btn-quiet";
    exportButton.id = "btn-storage-migration-export";
    exportButton.textContent = "端末データを書き出す";
    exportButton.title = "ショー・スクラップブックなど、この端末に保存した制作の書斎の記録を一つのJSONにします";

    const importButton = documentObject.createElement("button");
    importButton.type = "button";
    importButton.className = "btn-quiet";
    importButton.id = "btn-storage-migration-import";
    importButton.textContent = "端末データを読み込む";
    importButton.title = "別のブラウザから書き出した制作の書斎の端末データを復元します";
    const importInput = documentObject.createElement("input");
    importInput.type = "file";
    importInput.id = "storage-migration-import";
    importInput.accept = "application/json,.json";
    importInput.hidden = true;
    importButton.addEventListener("click", () => importInput.click());

    const status = documentObject.getElementById("scrapbook-save-status");
    exportButton.addEventListener("click", () => {
      try {
        const document = createDocument(storage);
        const count = Object.keys(document.entries).length;
        downloadDocument(windowObject, document);
        if (status) status.textContent = `端末データ${count}件をJSONで書き出しました。`;
      } catch (error) {
        if (status) status.textContent = "端末データを書き出せませんでした。";
        windowObject.alert(`端末データを書き出せませんでした。\n${error.message}`);
      }
    });

    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        const document = parseDocument(await file.text());
        const plan = planRestore(document, storage);
        if (!plan.restoreCount) {
          windowObject.alert("このファイルに復元できる端末データはありません。");
          return;
        }
        const confirmed = windowObject.confirm(
          `このファイルから端末データ${plan.restoreCount}件を復元します。\n`
          + `現在のデータ${plan.overwriteCount}件を上書きし、${plan.addCount}件を追加します。\n`
          + "ファイルに無いデータは削除しません。続けますか？",
        );
        if (!confirmed) return;
        restoreDocument(document, storage);
        windowObject.alert(`端末データ${plan.restoreCount}件を復元しました。画面を読み直します。`);
        windowObject.location.reload();
      } catch (error) {
        windowObject.alert(`端末データを読み込めませんでした。\n${error.message}`);
      } finally {
        importInput.value = "";
      }
    });

    actions.append(exportButton, importButton, importInput);
    return true;
  }

  return Object.freeze({
    KIND,
    VERSION,
    KNOWN_STAGE_KEYS,
    isManagedKey,
    managedKeys,
    createDocument,
    validateDocument,
    parseDocument,
    planRestore,
    restoreDocument,
    installUI,
  });
}));
