import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [indexSource, stageSource, i18nSource, rosterSource] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("stage.html", root), "utf8"),
  readFile(new URL("stage-i18n.js", root), "utf8"),
  readFile(new URL("roster.js", root), "utf8"),
]);

function tagWithId(source, id) {
  const tag = source.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))?.[0];
  assert.ok(tag, `#${id} が存在する`);
  return tag;
}

test("スクリーン文字の例から黒閃を外す", () => {
  const expected = "例: 三回宙返り / ドン / 10年後";
  const placeholders = [indexSource, stageSource].map((source) => {
    const input = tagWithId(source, "stage-screentext-input");
    return input.match(/placeholder="([^"]+)"/)?.[1];
  });

  assert.deepEqual(placeholders, [expected, expected]);
  assert.doesNotMatch(placeholders.join("\n"), /黒閃/);
  assert.ok(i18nSource.includes(
    `"${expected}": "e.g. a technique name, a sound effect, a subtitle"`,
  ));
});

test("保存済み合言葉の自動解錠はfileプロトコルだけ除外する", () => {
  assert.match(
    rosterSource,
    /if \(saved && location\.protocol !== "file:"\) unlock\(saved, \{ silent: true \}\);/,
  );
  assert.doesNotMatch(rosterSource, /location\.protocol === "https:"/);
  assert.match(rosterSource, /file: では暗号データの fetch が使えず必ず失敗するため/);
});

test("合言葉欄に送信しない表示切替ボタンを置く", () => {
  const form = indexSource.match(
    /<form id="roster-gate-form"[\s\S]*?<\/form>/,
  )?.[0];
  assert.ok(form, "#roster-gate-form が存在する");

  const input = tagWithId(form, "roster-pass");
  assert.match(input, /type="password"/);
  assert.match(input, /autocomplete="current-password"/);

  const toggle = tagWithId(form, "roster-pass-toggle");
  assert.match(toggle, /type="button"/);
  assert.match(toggle, /class="[^"]*btn-quiet[^"]*"/);
  assert.match(toggle, /aria-pressed="false"/);
  assert.match(form, /aria-label="表示">表示<\/button>/);

  assert.match(rosterSource, /passInput\.type = reveal \? "text" : "password";/);
  assert.match(rosterSource, /passToggle\.setAttribute\("aria-pressed", String\(reveal\)\);/);
  assert.match(rosterSource, /passToggle\.setAttribute\("aria-label", label\);/);
  assert.match(i18nSource, /"表示": "Show"/);
  assert.match(i18nSource, /"隠す": "Hide"/);
});
