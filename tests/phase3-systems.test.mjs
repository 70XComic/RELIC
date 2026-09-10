import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

const systems = await vite.ssrLoadModule("/app/game-systems.ts");

after(async () => {
  await vite.close();
});

test("equipment catalog covers every unit type with unique IDs", () => {
  const ids = systems.EQUIPMENT_ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);

  const expectedTypes = [
    "人間",
    "獣",
    "龍",
    "機械",
    "魔族",
    "天使",
    "精霊",
    "不明",
  ];
  const actualTypes = new Set(
    systems.EQUIPMENT_ITEMS.map((item) => item.type),
  );
  assert.equal(actualTypes.size, expectedTypes.length);
  expectedTypes.forEach((type) => assert.ok(actualTypes.has(type), type));
});

test("equipment compatibility accepts either character type but no unrelated type", () => {
  const dragonClaw = systems.EQUIPMENT_BY_ID.get("dragonking-talon");
  const machineRifle = systems.EQUIPMENT_BY_ID.get(
    "machina-precision-rifle",
  );
  const angelFeather = systems.EQUIPMENT_BY_ID.get("seraph-feather");
  const unknownRelic = systems.EQUIPMENT_BY_ID.get("nameless-relic-cube");

  assert.ok(dragonClaw);
  assert.ok(machineRifle);
  assert.ok(angelFeather);
  assert.ok(unknownRelic);

  const mechanicalDragon = ["機械", "龍"];
  assert.equal(
    systems.isEquipmentCompatible(mechanicalDragon, dragonClaw),
    true,
  );
  assert.equal(
    systems.isEquipmentCompatible(mechanicalDragon, machineRifle),
    true,
  );
  assert.equal(
    systems.isEquipmentCompatible(mechanicalDragon, angelFeather),
    false,
  );
  assert.equal(
    systems.isEquipmentCompatible(mechanicalDragon, unknownRelic),
    false,
  );
  assert.equal(
    systems.isEquipmentCompatible(["不明"], unknownRelic),
    true,
  );
});

test("equipment bonuses affect only the wearer without mutating base stats", () => {
  const item = systems.EQUIPMENT_BY_ID.get("ignis-knightblade");
  assert.ok(item);

  const party = [
    { hp: 100, atk: 80, def: 60, spd: 20, crit: 5 },
    { hp: 120, atk: 101, def: 70, spd: 24, crit: 49 },
    { hp: 140, atk: 90, def: 85, spd: 18, crit: 8 },
  ];
  const original = structuredClone(party);
  const equipped = party.map((stats, index) =>
    systems.applyEquipmentBonuses(stats, index === 1 ? item : undefined),
  );

  assert.deepEqual(party, original);
  assert.deepEqual(equipped[0], original[0]);
  assert.deepEqual(equipped[2], original[2]);
  assert.deepEqual(equipped[1], {
    hp: 120,
    atk: 111,
    def: 70,
    spd: 24,
    crit: 50,
  });
  assert.notStrictEqual(equipped[1], party[1]);
});

test("daily shop changes exactly at midnight JST", () => {
  const beforeMidnight = Date.parse("2026-09-08T14:59:59.999Z");
  const atMidnight = Date.parse("2026-09-08T15:00:00.000Z");

  assert.equal(systems.getDailyShopKey(beforeMidnight), "2026-09-08");
  assert.equal(systems.getDailyShopKey(atMidnight), "2026-09-09");
  assert.equal(
    systems.getNextDailyShopRefresh(beforeMidnight),
    atMidnight,
  );
});

test("daily shop is deterministic, has six unique slots, and rotates next day", () => {
  const sameDayMorning = Date.parse("2026-09-08T00:00:00.000Z");
  const sameDayEvening = Date.parse("2026-09-08T14:59:59.999Z");
  const nextDay = Date.parse("2026-09-08T15:00:00.000Z");
  const first = systems.getDailyEquipmentOffers(sameDayMorning);
  const repeated = systems.getDailyEquipmentOffers(sameDayEvening);
  const following = systems.getDailyEquipmentOffers(nextDay);
  const itemIds = (offers) => offers.map((offer) => offer.item.id);

  assert.equal(first.length, 6);
  assert.equal(new Set(first.map((offer) => offer.id)).size, 6);
  assert.equal(new Set(itemIds(first)).size, 6);
  assert.deepEqual(itemIds(repeated), itemIds(first));
  assert.notDeepEqual(itemIds(following), itemIds(first));
  assert.ok(first.every((offer, index) => offer.slot === index));
  assert.ok(first.every((offer) => offer.dayKey === "2026-09-08"));
});

test("equipment drop rates stay between one and two percent", () => {
  const cases = [
    [undefined, 1, 0.01],
    ["normal", 119, 0.01],
    ["normal", 120, 0.015],
    ["event", 1, 0.015],
    ["strong", 1, 0.02],
    ["abyss", 225, 0.02],
  ];

  cases.forEach(([kind, level, expected]) => {
    const rate = systems.getEquipmentDropChance(kind, level);
    assert.equal(rate, expected);
    assert.ok(rate >= 0.01 && rate <= 0.02);
  });
});

test("synergy definitions use unique IDs and three existing characters", async () => {
  const page = await vite.ssrLoadModule("/app/page.tsx");
  assert.equal(typeof page.default, "function");

  const ids = systems.PARTY_SYNERGIES.map((synergy) => synergy.id);
  assert.equal(new Set(ids).size, ids.length);
  systems.PARTY_SYNERGIES.forEach((synergy) => {
    assert.equal(synergy.memberIds.length, 3, synergy.id);
    assert.equal(new Set(synergy.memberIds).size, 3, synergy.id);
    synergy.memberIds.forEach((memberId) => {
      assert.equal(typeof memberId, "string");
      assert.ok(memberId.length > 0, synergy.id);
    });
  });

  const beginning = systems.PARTY_SYNERGY_BY_ID.get("all-beginnings");
  assert.ok(beginning);
  assert.equal(beginning.name, "夢幕の三重奏");
  assert.deepEqual(new Set(beginning.memberIds), new Set([
    "p4-revelle",
    "p4-somnia",
    "p4-masquerade",
  ]));
});

test("synergy matching ignores order and rejects incomplete parties", () => {
  const ordered = systems.getActivePartySynergy([
    "p4-revelle",
    "p4-somnia",
    "p4-masquerade",
  ]);
  const reordered = systems.getActivePartySynergy([
    "p4-masquerade",
    "p4-revelle",
    "p4-somnia",
  ]);

  assert.equal(ordered?.id, "all-beginnings");
  assert.equal(reordered?.id, "all-beginnings");
  assert.equal(
    systems.getActivePartySynergy(["p4-revelle", "p4-somnia"]),
    null,
  );
  assert.equal(
    systems.getActivePartySynergy(["p4-revelle", "p4-somnia", "unrelated"]),
    null,
  );
});

test("ultimate gauge exposes normal at 100, extreme at 200, and none without a tag", () => {
  const synergy = systems.PARTY_SYNERGY_BY_ID.get("all-beginnings");
  assert.ok(synergy);

  assert.equal(systems.getUltimateGaugeMax(synergy), 200);
  assert.equal(systems.getUltimateGaugeMax(null), 100);
  assert.equal(systems.getUltimateTier(99, synergy), "none");
  assert.equal(systems.getUltimateTier(100, synergy), "normal");
  assert.equal(systems.getUltimateTier(199, synergy), "normal");
  assert.equal(systems.getUltimateTier(200, synergy), "extreme");
  assert.equal(systems.getUltimateTier(100, null), "none");
  assert.equal(systems.getUltimateTier(200, null), "none");
});
