import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sources = await Promise.all([
  "stage-venue-lines.js", "stage-venues.js", "stage-i18n.js",
  "stage-i18n.zh-Hans.js", "stage-i18n.zh-Hant.js", "stage-first-person.js",
].map((name) => readFile(new URL(name, root), "utf8")));

function load() {
  const storage = new Map();
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    dispatchEvent() {},
    CustomEvent: class { constructor(type) { this.type = type; } },
  };
  window.window = window;
  const context = vm.createContext({ window, console });
  sources.forEach((source, index) => vm.runInContext(source, context, {
    filename: ["stage-venue-lines.js", "stage-venues.js", "stage-i18n.js",
      "stage-i18n.zh-Hans.js", "stage-i18n.zh-Hant.js", "stage-first-person.js"][index],
  }));
  return window;
}

test("器なし会場の移動範囲と既存6視点は変わらない", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const theatre = window.SHOSAI_VENUES.byId("proscenium");
  assert.deepEqual(
    JSON.parse(JSON.stringify(geom.clampFree({ x: 999, y: 999, z: 999 }, 12, 9, 8, theatre))),
    { x: 18, y: 14, z: 26.5 },
  );
  assert.deepEqual(Array.from(geom.freePresets(12, 9, 8, theatre), (preset) => preset.id), [
    "audience-center", "front-row", "stage-right-wing", "stage-left-wing", "overhead", "upstage",
  ]);
});

test("ドームの器から120m後方・約32.8m高の最上段と移動範囲を作る", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const size = dome.sizes[0];
  const bounded = geom.clampFree({ x: 999, y: 999, z: 999 }, size.width, size.depth, size.height, dome);
  assert.deepEqual(JSON.parse(JSON.stringify(bounded)), { x: 141, y: 62, z: 142 });

  const derived = Array.from(geom.freePresets(size.width, size.depth, size.height, dome))
    .filter((preset) => preset.id.startsWith("bowl-"));
  assert.deepEqual(derived.map((preset) => preset.name),
    ["フロア前方", "フロア後方", "下段中央", "上段中央", "最上段"]);
  const top = derived.at(-1);
  assert.equal(top.z, 120);
  assert.ok(Math.abs(top.y - 32.76120221907102) < 1e-9, `最上段 y=${top.y}`);
  assert.ok(Math.abs(top.pitch - (-Math.atan((top.y - 1.6) / 120) * 180 / Math.PI)) < 1e-9);
  assert.equal(top.yaw, 180);
  assert.ok(Object.values(top).filter((value) => typeof value === "number").every(Number.isFinite));
});

test("段席を持たない野外フェスでは存在するフロア2視点だけを作る", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const field = window.SHOSAI_VENUES.byId("festival-field");
  const size = field.sizes[0];
  const derived = Array.from(geom.freePresets(size.width, size.depth, size.height, field))
    .filter((preset) => preset.id.startsWith("bowl-"));
  assert.deepEqual(derived.map((preset) => preset.name), ["フロア前方", "フロア後方"]);
});

test("会場3種と器由来5視点は英語・簡体字・繁体字の訳鍵を持つ", () => {
  const window = load();
  const packs = window.SHOSAI_I18N_PACKS;
  const venueIds = ["arena-concert", "dome-concert", "festival-field"];
  const roles = ["フロア前方", "フロア後方", "下段中央", "上段中央", "最上段"];
  for (const code of ["en", "zh-Hans", "zh-Hant"]) {
    const pack = packs[code];
    venueIds.forEach((id) => {
      assert.ok(pack.maps.venue[id], `${code} venue.${id}`);
      assert.ok(pack.maps.venueShort[id], `${code} venueShort.${id}`);
      assert.ok(pack.maps.venueNote[id], `${code} venueNote.${id}`);
      assert.ok(pack.maps.size[`${id}-provisional`], `${code} size.${id}`);
    });
    roles.forEach((role) => assert.ok(pack.text[role], `${code} text.${role}`));
  }
});

test("中国語の新しい会場・視点訳はNEEDS_REVIEWに残す", () => {
  const window = load();
  for (const code of ["zh-Hans", "zh-Hant"]) {
    const pending = new Set(window.SHOSAI_I18N_PACKS[code].needsReview);
    for (const key of [
      "text.フロア前方", "text.フロア後方", "text.下段中央", "text.上段中央", "text.最上段",
      "maps.venue.arena-concert", "maps.venue.dome-concert", "maps.venue.festival-field",
      "maps.venueShort.arena-concert", "maps.venueShort.dome-concert", "maps.venueShort.festival-field",
      "maps.venueNote.arena-concert", "maps.venueNote.dome-concert", "maps.venueNote.festival-field",
      "maps.size.arena-concert-provisional", "maps.size.dome-concert-provisional",
      "maps.size.festival-field-provisional",
    ]) assert.ok(pending.has(key), `${code} ${key}`);
  }
});

test("器由来の客席は劇場固定席より多く、120mの段まで生成する", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const theatre = window.SHOSAI_VENUES.byId("proscenium");
  const domeSize = dome.sizes[0];
  const theatreSize = theatre.sizes[0];
  const bowl = geom.bowlHouseUnits(dome, domeSize.width, domeSize.depth, 1);
  const legacyCount = geom.houseSeats(theatreSize.width, theatreSize.depth, theatreSize.height,
    theatre.audience, 1).length +
    geom.houseRiserRows(theatreSize.width, theatreSize.depth).length +
    geom.houseBalconyRows(theatreSize.width, theatreSize.depth, theatreSize.height).length;
  assert.ok(bowl.units.length > legacyCount * 5,
    `器=${bowl.units.length} / 劇場固定=${legacyCount}`);
  assert.equal(Math.max(...bowl.units.map((unit) => unit.distanceM)), 120);
  assert.ok(bowl.units.some((unit) => unit.type === "tier" && unit.floorM > 30));
});

test("threeは左右、frontは正面だけ、roundは奥にも客席を作る", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const field = window.SHOSAI_VENUES.byId("festival-field");
  const domeSize = dome.sizes[0];
  const fieldSize = field.sizes[0];
  assert.deepEqual(Array.from(geom.bowlHouseUnits(dome, domeSize.width, domeSize.depth, 1).orientations),
    ["front", "left", "right"]);
  assert.deepEqual(Array.from(geom.bowlHouseUnits(field, fieldSize.width, fieldSize.depth, 1).orientations),
    ["front"]);

  const round = JSON.parse(JSON.stringify(dome));
  round.audience = "round";
  round.bowl.wrap = "round";
  const roundHouse = geom.bowlHouseUnits(round, domeSize.width, domeSize.depth, 1);
  assert.deepEqual(Array.from(roundHouse.orientations), ["front", "left", "right", "rear"]);
  assert.ok(roundHouse.units.some((unit) => unit.orientation === "rear" && unit.center.z < 0));
});

test("器の満席・空席切替は立ち見の人影と着席の椅子にも効く", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const size = dome.sizes[0];
  const full = geom.bowlHouseUnits(dome, size.width, size.depth, 1).units
    .filter((unit) => unit.type === "person");
  const empty = geom.bowlHouseUnits(dome, size.width, size.depth, 0).units
    .filter((unit) => unit.type === "person");
  assert.ok(full.some((unit) => unit.person.mode === "standing" && unit.person.occupied));
  assert.ok(!empty.some((unit) => unit.person.mode === "standing"));
  assert.ok(empty.some((unit) => unit.person.mode === "seated" && !unit.person.occupied));
  assert.ok(empty.every((unit) => !unit.person.occupied));
});

test("ドームは弧7本と放射16本、openは天井リブなし、床は5×3に割る", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const field = window.SHOSAI_VENUES.byId("festival-field");
  const arena = window.SHOSAI_VENUES.byId("arena-concert");
  const domeSize = dome.sizes[0];
  const fieldSize = field.sizes[0];
  const arenaSize = arena.sizes[0];
  const domeRoof = geom.bowlRoofRibs(dome, domeSize.width, domeSize.depth);
  assert.equal(domeRoof.arcs.length, 7);
  assert.equal(domeRoof.radials.length, 16);
  assert.equal(geom.bowlRoofRibs(arena, arenaSize.width, arenaSize.depth).beams.length, 8);
  assert.deepEqual(JSON.parse(JSON.stringify(geom.bowlRoofRibs(field, fieldSize.width, fieldSize.depth))),
    { kind: "open", arcs: [], radials: [], beams: [] });
  assert.equal(geom.bowlFloorGrid(dome, domeSize.width, domeSize.depth).strips.length, 6);
});

test("器なし劇場は従来の固定13列・2階6列・客席生成をそのまま通る", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const theatre = window.SHOSAI_VENUES.byId("proscenium");
  const size = theatre.sizes[0];
  assert.equal(geom.bowlHouseUnits(theatre, size.width, size.depth, 1), null);
  assert.equal(geom.bowlRoofRibs(theatre, size.width, size.depth), null);
  assert.equal(geom.bowlFloorGrid(theatre, size.width, size.depth), null);
  const stalls = geom.houseRiserRows(size.width, size.depth);
  const balcony = geom.houseBalconyRows(size.width, size.depth, size.height);
  assert.equal(stalls.length, 13);
  assert.equal(balcony.length, size.height >= 7.5 ? 6 : 0);
  assert.deepEqual(JSON.parse(JSON.stringify(stalls[0])), {
    z: size.depth / 2 + 1.6,
    height: -0.86,
  });
  assert.ok(geom.houseSeats(size.width, size.depth, size.height, theatre.audience, 1).length > 0);
});

test("ヘッドレス最上段視点でも客席とドーム天井の描画計画が存在する", () => {
  const window = load();
  const geom = window.SHOSAI_STAGE_FPV._geom;
  const dome = window.SHOSAI_VENUES.byId("dome-concert");
  const size = dome.sizes[0];
  const top = geom.freePresets(size.width, size.depth, size.height, dome)
    .find((preset) => preset.id === "bowl-top-tier");
  const house = geom.bowlHouseUnits(dome, size.width, size.depth, 1);
  const roof = geom.bowlRoofRibs(dome, size.width, size.depth);
  assert.equal(top.z, 120);
  assert.ok(Math.abs(top.y - 32.76120221907102) < 1e-9);
  assert.ok(house.units.some((unit) => unit.type === "tier"));
  assert.ok(house.units.some((unit) => unit.type === "person"));
  assert.equal(roof.arcs.length + roof.radials.length, 23);
});
