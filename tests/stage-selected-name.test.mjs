import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} が見つかる`);
  let depth = 0;
  let opened = false;
  for (let i = source.indexOf("{", start); i < source.length; i += 1) {
    if (source[i] === "{") { depth += 1; opened = true; }
    if (source[i] === "}") depth -= 1;
    if (opened && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} を最後まで読めません`);
}

function selectedTitle(piece, pieces, owner = null) {
  const deps = {
    lockOwner: () => owner,
    sc: () => ({ pieces }),
    pieceTypeName: (type) => ({ performer: "演者", chair: "椅子" })[type] || type,
  };
  return new Function("deps", `with (deps) { return (${functionSource("selectedPieceTitle")}); }`)(deps)(piece);
}

test("選んだものには対象番号ではなく登録名を表示する", () => {
  const yuki = { id: "performer-6", type: "performer", castId: "cast-yuki" };
  const pieces = [{ id: "performer-1", type: "performer" }, yuki];
  assert.equal(selectedTitle(yuki, pieces, { id: "cast-yuki", name: "ユキ" }), "ユキ");
  assert.equal(selectedTitle({ id: "chair-1", type: "chair", name: "白い椅子" }, pieces), "白い椅子");
  assert.equal(selectedTitle(pieces[0], pieces), "演者 1");
  assert.match(source, /els\.selectedName\.textContent = selectedPieceTitle\(piece\)/);
});
