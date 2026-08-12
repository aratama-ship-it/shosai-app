(function () {
  "use strict";

  const DB_NAME = "shosai-desk-media";
  const STORE = "images";
  const VERSION = 1;

  function key(projectId, dir) {
    return `${projectId}/${dir}`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
      req.onsuccess = () => resolve(req.result);
    });
  }

  function withStore(mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error("IndexedDB transaction failed"));
      };
      result = fn(store);
    }));
  }

  function put(projectId, dir, blob) {
    return withStore("readwrite", (store) => {
      store.put(blob, key(projectId, dir));
      return true;
    });
  }

  function get(projectId, dir) {
    return withStore("readonly", (store) => new Promise((resolve, reject) => {
      const req = store.get(key(projectId, dir));
      req.onerror = () => reject(req.error || new Error("Failed to read image"));
      req.onsuccess = () => resolve(req.result || null);
    }));
  }

  function remove(projectId, dir) {
    return withStore("readwrite", (store) => {
      store.delete(key(projectId, dir));
      return true;
    });
  }

  function removeProject(projectId) {
    return withStore("readwrite", (store) => new Promise((resolve, reject) => {
      const prefix = `${projectId}/`;
      const req = store.openCursor();
      req.onerror = () => reject(req.error || new Error("Failed to scan images"));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(true);
          return;
        }
        if (String(cursor.key).startsWith(prefix)) cursor.delete();
        cursor.continue();
      };
    }));
  }

  window.SHOSAI_DESK_MEDIA = Object.freeze({ put, get, remove, removeProject });
})();
