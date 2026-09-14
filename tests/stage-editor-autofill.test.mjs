import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [html, sketch, setBuilder, session, serviceWorker] = await Promise.all([
  readFile(new URL("stage.html", root), "utf8"),
  readFile(new URL("stage-sketch.js", root), "utf8"),
  readFile(new URL("stage-set-builder.js", root), "utf8"),
  readFile(new URL("stage-session.js", root), "utf8"),
  readFile(new URL("stage-sw.js", root), "utf8"),
]);

const textTypes = new Set(["text", "search", "url", "email", "tel"]);

function editorTextFields(source) {
  const inputs = source.match(/<input\b[^>]*>/gs) || [];
  const textInputs = inputs.filter((tag) => {
    const type = tag.match(/\btype="([^"]+)"/)?.[1] || "text";
    return textTypes.has(type);
  });
  return textInputs.concat(source.match(/<textarea\b[^>]*>/gs) || []);
}

test("舞台編集用の文字欄はブラウザと1Passwordへ認証欄ではないと明示する", () => {
  const fields = editorTextFields(html);
  assert.ok(fields.length > 20, "舞台編集用の文字欄を列挙できる");
  const missing = fields.filter((tag) => (
    !/\bautocomplete="off"/.test(tag) || !/\bdata-1p-ignore(?:\s|=|>)/.test(tag)
  ));
  assert.deepEqual(missing, []);
});

test("動的に作る名前欄も自動入力の対象から外す", () => {
  assert.match(sketch, /name\.autocomplete = "off";\s*name\.setAttribute\("data-1p-ignore", "true"\);/);
  assert.match(sketch, /note\.autocomplete = "off";\s*note\.setAttribute\("data-1p-ignore", "true"\);/);
  assert.match(setBuilder, /name\.autocomplete = "off"; name\.setAttribute\("data-1p-ignore", "true"\);/);
  assert.match(session, /id="stage-session-name-input"[\s\S]*?autocomplete="off" data-1p-ignore required/);
});

test("入力欄修正のJavaScriptは新しいPWAキャッシュ参照で配る", () => {
  for (const asset of [
    "stage-set-builder.js?v=3",
    "stage-sketch.js?v=478",
    "stage-session.js?v=19",
  ]) {
    assert.ok(html.includes(asset), `${asset} が画面から参照される`);
    assert.ok(serviceWorker.includes(`./${asset}`), `${asset} がPWAキャッシュと一致する`);
  }
  assert.match(serviceWorker, /stage-sketch-pwa-v482/);
});
