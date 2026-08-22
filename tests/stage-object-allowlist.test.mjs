import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { allowlistKey, loadAllowlistSet, partitionByAllowlist } from "../tools/check-object-on-performer.mjs";

const root = new URL("../", import.meta.url);

test("allowlistKeyはbaseを含まず、file/sceneId/pieceType/pieceName/holderNameだけで組み立てる", () => {
  const key = allowlistKey({
    file: "a.json", sceneId: "s1", sceneTitle: "無視される", pieceType: "block",
    pieceName: "木箱2", holderName: "網", base: 1.2,
  });
  assert.equal(key, "a.json|s1|block|木箱2|網");
});

test("allowlistKeyはファイル名のNFC/NFD差を同じ許可項目として扱う", () => {
  const nfc = "11_スタンドイン_舞台スケッチ_v2.json";
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfc, nfd);

  const shared = { sceneId: "s1", pieceType: "block", pieceName: "道具・カメラ", holderName: "演者（本人）" };
  assert.equal(allowlistKey({ ...shared, file: nfc }), allowlistKey({ ...shared, file: nfd }));
});

test("loadAllowlistSetは同梱の許可リストJSONを読み、2026-08-20レビュー済みの33件を持つ", async () => {
  const set = loadAllowlistSet();
  assert.equal(set.size, 33);
  const raw = JSON.parse(await readFile(new URL("tools/check-object-on-performer.allowlist.json", root), "utf8"));
  assert.equal(raw.entries.length, 33);
  raw.entries.forEach((entry) => assert.ok(set.has(allowlistKey(entry))));
});

test("partitionByAllowlistは許可リストにある組み合わせだけをknownへ振り分け、baseの違いは無視する", () => {
  const allowSet = new Set([allowlistKey({
    file: "a.json", sceneId: "s1", pieceType: "block", pieceName: "木箱2", holderName: "網",
  })]);
  const all = [
    { file: "a.json", sceneId: "s1", pieceType: "block", pieceName: "木箱2", holderName: "網", base: 1.2 },
    { file: "a.json", sceneId: "s1", pieceType: "block", pieceName: "木箱2", holderName: "網", base: 9.9 },
    { file: "a.json", sceneId: "s2", pieceType: "chair", pieceName: "椅子", holderName: "演者", base: 1.0 },
  ];
  const { known, fresh } = partitionByAllowlist(all, allowSet);
  assert.equal(known.length, 2);
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].pieceType, "chair");
});
